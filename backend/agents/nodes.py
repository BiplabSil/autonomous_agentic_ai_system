"""Agent nodes - each node is a step in the Observe -> Plan -> Think -> Execute cycle."""

import json
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from .state import AgentState
from .tools import search_web


def get_llm():
    """Get the LLM instance."""
    return ChatOpenAI(model="gpt-4o", temperature=0.7)


# ─────────────────────────────────────────────
# SYSTEM PROMPTS for each node
# ─────────────────────────────────────────────

OBSERVE_PROMPT = """You are an AI assistant's OBSERVATION module.

Your job: Understand what the user is asking and summarize it clearly.

Given the user message and conversation history, provide:
1. A clear summary of what the user wants
2. What type of task this is (research, coding, analysis, creative, general)
3. What information you already have vs what might be needed to complete the request


Output a JSON object with this exact structure:
{
    "observation": "clear summary of the user's request",
    "task_type": "research|coding|analysis|creative|general",
    "has_enough_info": true/false,
    "missing_info": ["list of missing pieces if any"]
}
"""

PLAN_PROMPT = """You are an AI assistant's PLANNING module.

Your job: Create a step-by-step plan to accomplish the task.

Given the observation, create a plan with clear actionable steps.
Include web search steps if the task needs current/real-time information.

Output a JSON object with this exact structure:
{
    "plan": [
        {"task": "step description", "status": "pending"},
        {"task": "step description", "status": "pending"}
    ],
    "needs_search": true/false,
    "search_queries": ["query1", "query2"] if search is needed
}

Keep the plan concise - max 5 steps.
"""

THINK_PROMPT = """You are an AI assistant's REASONING module.

Your job: Think through the plan and decide what to do next.

Given the plan, observation, and any tool results so far, provide:
1. Your reasoning about the current progress
2. What step you're working on
3. Whether you need more information or can proceed

Output a JSON object with this exact structure:
{
    "thinking": "your reasoning about progress and next steps",
    "current_step": 0,
    "ready_to_execute": true/false,
    "needs_search": true/false,
    "search_query": "query if search needed",
    "needs_revision": false,
    "revision_reason": "if needs_revision is true, explain why the plan needs revision",
    "needs_clarification": false
}

Set "needs_revision" to true if:
- The plan is missing important steps
- Search results revealed the approach is wrong
- A better approach was found

Set "needs_clarification" to true if:
- You cannot proceed without user input
- Critical information is missing that only the user can provide
"""

EXECUTE_PROMPT = """You are an AI assistant's EXECUTION module.

Your job: Based on all the information gathered (plan, search results, thinking),
generate a comprehensive, helpful response to the user.

Be thorough but concise. Use markdown formatting.
If you used search results, cite your sources.
Address the user's original question directly.
"""

CLARIFY_PROMPT = """You are an AI assistant's CLARIFICATION module.

Your job: When the user's request is ambiguous or needs more details,
generate a clear clarifying question.

You can ask either:
- A multiple choice question (give 2-4 options)
- An open-ended question (ask for specific details)

Output a JSON object with this exact structure:
{
    "question": "your clarifying question",
    "type": "mcq" or "text",
    "options": ["option1", "option2"] only if type is mcq,
    "reason": "why you need this clarification"
}
"""


# ─────────────────────────────────────────────
# NODE FUNCTIONS
# ─────────────────────────────────────────────

def observe_node(state: AgentState) -> dict:
    """Observe: Understand what the user is asking."""
    print("\n[OBSERVE] Understanding user request...")

    llm = get_llm()

    messages = [
        SystemMessage(content=OBSERVE_PROMPT),
        HumanMessage(content=f"User message: {state.user_message}\n\nHistory: {json.dumps(state.history[-6:])}"),
    ]

    response = llm.invoke(messages)
    content = response.content

    # Parse JSON from response
    try:
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]

        data = json.loads(content.strip())
        observation = data.get("observation", content)
        has_enough = data.get("has_enough_info", True)
        task_type = data.get("task_type", "general")
    except (json.JSONDecodeError, IndexError):
        observation = content
        has_enough = True
        task_type = "general"

    print(f"[OBSERVE] {observation[:100]}...")

    # Add step detail
    steps = list(state.steps)
    steps.append({
        "name": "observe",
        "title": "Observation",
        "detail": observation,
        "meta": {"task_type": task_type, "has_enough_info": has_enough},
    })

    return {
        "observation": observation,
        "needs_clarification": not has_enough,
        "steps": steps,
    }


def plan_node(state: AgentState) -> dict:
    """Plan: Create a step-by-step plan."""
    print("\n[PLAN] Creating plan...")

    llm = get_llm()

    messages = [
        SystemMessage(content=PLAN_PROMPT),
        HumanMessage(content=f"Observation: {state.observation}\n\nUser message: {state.user_message}"),
    ]

    response = llm.invoke(messages)
    content = response.content

    search_queries = []
    try:
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]

        data = json.loads(content.strip())
        plan_items = [{"task": item["task"], "status": "pending"} for item in data.get("plan", [])]
        needs_search = data.get("needs_search", False)
        search_queries = data.get("search_queries", [])
    except (json.JSONDecodeError, IndexError):
        plan_items = [{"task": "Process the user request", "status": "pending"}]
        needs_search = False

    print(f"[PLAN] Created {len(plan_items)} step(s)")

    result = {"plan": plan_items}

    # Run search if needed
    search_results_text = ""
    if needs_search and search_queries:
        print(f"[PLAN] Running {len(search_queries)} search(es)...")
        all_results = []
        for query in search_queries:
            search_result = search_web(query)
            state.tool_results.append(search_result)
            all_results.append(f"Query: {query}\n{search_result}")
        result["tool_results"] = state.tool_results
        search_results_text = "\n\n".join(all_results)

    # Add step detail
    steps = list(state.steps)
    plan_summary = "\n".join(f"  {i+1}. {item['task']}" for i, item in enumerate(plan_items))
    step_detail = f"Created {len(plan_items)} step(s):\n{plan_summary}"
    if search_queries:
        step_detail += f"\n\nSearch queries: {', '.join(search_queries)}"

    steps.append({
        "name": "plan",
        "title": "Planning",
        "detail": step_detail,
        "meta": {
            "plan": plan_items,
            "search_queries": search_queries,
            "search_results": search_results_text[:500] if search_results_text else None,
        },
    })

    result["steps"] = steps
    return result


def think_node(state: AgentState) -> dict:
    """Think: Reason through the plan and decide next action."""
    print("\n[THINK] Reasoning about approach...")

    llm = get_llm()

    plan_text = "\n".join(
        f"  {i+1}. [{item.get('status', 'pending')}] {item.get('task', 'unknown')}"
        for i, item in enumerate(state.plan)
    )

    messages = [
        SystemMessage(content=THINK_PROMPT),
        HumanMessage(content=f"""
Observation: {state.observation}

Plan:
{plan_text}

Tool results so far: {state.tool_results if state.tool_results else "None yet"}

What should we do next?
"""),
    ]

    response = llm.invoke(messages)
    content = response.content

    needs_search = False
    search_query = ""
    needs_revision = False
    needs_clarification = False
    revision_reason = ""
    try:
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]

        data = json.loads(content.strip())
        thinking = data.get("thinking", content)
        needs_search = data.get("needs_search", False)
        search_query = data.get("search_query", "")
        needs_revision = data.get("needs_revision", False)
        needs_clarification = data.get("needs_clarification", False)
        revision_reason = data.get("revision_reason", "")
    except (json.JSONDecodeError, IndexError):
        thinking = content

    # Run additional search if needed
    tool_results = list(state.tool_results)
    extra_search_text = ""
    if needs_search and search_query:
        print(f"[THINK] Additional search needed: {search_query}")
        search_result = search_web(search_query)
        tool_results.append(search_result)
        extra_search_text = f"\n\nAdditional search performed: {search_query}"

    print(f"[THINK] {thinking[:100]}...")

    # Add step detail
    steps = list(state.steps)
    step_detail = thinking + extra_search_text
    if needs_revision:
        step_detail += f"\n\n-> Needs revision: {revision_reason}"
    if needs_clarification:
        step_detail += "\n\n-> Needs clarification from user"
    steps.append({
        "name": "think",
        "title": "Reasoning",
        "detail": step_detail,
        "meta": {
            "needs_search": needs_search,
            "search_query": search_query,
            "needs_revision": needs_revision,
            "needs_clarification": needs_clarification,
            "revision_reason": revision_reason,
        },
    })

    return {
        "thinking": thinking,
        "tool_results": tool_results,
        "steps": steps,
        "needs_revision": needs_revision,
        "needs_clarification": needs_clarification,
        "clarification_question": revision_reason if needs_clarification else "",
    }


def execute_node(state: AgentState) -> dict:
    """Execute: Generate the final response."""
    print("\n[EXECUTE] Generating response...")

    llm = get_llm()

    plan_text = "\n".join(
        f"  {i+1}. [{item.get('status', 'pending')}] {item.get('task', 'unknown')}"
        for i, item in enumerate(state.plan)
    )

    messages = [
        SystemMessage(content=EXECUTE_PROMPT),
        HumanMessage(content=f"""
User's original request: {state.user_message}

Observation: {state.observation}

Plan:
{plan_text}

Thinking: {state.thinking}

Search Results:
{state.tool_results if state.tool_results else "No search was performed"}

Generate a comprehensive response to the user.
"""),
    ]

    response = llm.invoke(messages)

    # Mark all plan items as completed
    completed_plan = []
    for item in state.plan:
        if isinstance(item, dict):
            completed_plan.append({"task": item.get("task", ""), "status": "completed"})
        elif hasattr(item, "task"):
            completed_plan.append({"task": item.task, "status": "completed"})
        else:
            completed_plan.append({"task": str(item), "status": "completed"})

    print("[EXECUTE] Response generated!")

    # Add step detail
    steps = list(state.steps)
    steps.append({
        "name": "execute",
        "title": "Execution",
        "detail": "Response generated successfully.",
        "meta": {"response_length": len(response.content)},
    })

    return {
        "final_response": response.content,
        "plan": completed_plan,
        "is_complete": True,
        "steps": steps,
    }


def clarify_node(state: AgentState) -> dict:
    """Clarify: Generate a clarification question for the user."""
    print("\n[CLARIFY] Asking for clarification...")

    llm = get_llm()

    messages = [
        SystemMessage(content=CLARIFY_PROMPT),
        HumanMessage(content=f"User message: {state.user_message}\n\nObservation: {state.observation}"),
    ]

    response = llm.invoke(messages)
    content = response.content

    try:
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]

        data = json.loads(content.strip())
        question = data.get("question", "Could you clarify what you need?")
        q_type = data.get("type", "text")
        options = data.get("options", [])
    except (json.JSONDecodeError, IndexError):
        question = content
        q_type = "text"
        options = []

    print(f"[CLARIFY] {question[:80]}...")

    # Add step detail
    steps = list(state.steps)
    steps.append({
        "name": "clarify",
        "title": "Clarification Needed",
        "detail": question,
        "meta": {"type": q_type, "options": options},
    })

    return {
        "clarification_question": question,
        "clarification_options": options,
        "needs_clarification": True,
        "steps": steps,
    }


# ─────────────────────────────────────────────
# ROUTING FUNCTIONS
# ─────────────────────────────────────────────

def route_after_observe(state: AgentState) -> str:
    """Decide whether to plan or clarify after observation."""
    if state.needs_clarification:
        return "clarify"
    return "plan"


def route_after_think(state: AgentState) -> str:
    """After thinking, decide whether to execute, revise plan, or clarify."""
    if state.needs_clarification:
        return "clarify"
    if state.needs_revision:
        return "plan"
    return "execute"
