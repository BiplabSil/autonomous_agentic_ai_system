"""Streaming API routes for the agent chatbot."""

import json
import traceback
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from agents.state import AgentState
from agents.nodes import (
    get_llm,
    observe_node,
    plan_node,
    think_node,
    execute_node,
    clarify_node,
    route_after_observe,
    route_after_think,
)

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []


def format_sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


def run_observe(state: AgentState) -> dict:
    """Run observe node synchronously."""
    print("\n[OBSERVE] Understanding user request...")

    msg = state.user_message.strip().lower()

    # Quick check: simple greetings and chitchat
    simple_patterns = [
        "hi", "hello", "hey", "good morning", "good evening", "good afternoon",
        "how are you", "what's up", "sup", "yo", "thanks", "thank you", "ok",
        "sure", "cool", "nice", "great", "awesome", "bye", "goodbye", "see you",
    ]
    if msg in simple_patterns or len(msg.split()) <= 2:
        steps = list(state.steps)
        steps.append({
            "name": "observe",
            "title": "Observation",
            "detail": f"Simple conversational message: {state.user_message}",
            "meta": {"task_type": "conversational", "has_enough_info": True},
        })
        return {
            "observation": state.user_message,
            "needs_clarification": False,
            "skip_to_execute": True,
            "steps": steps,
        }

    llm = get_llm()
    from agents.nodes import OBSERVE_PROMPT
    messages = [
        SystemMessage(content=OBSERVE_PROMPT),
        HumanMessage(content=f"User message: {state.user_message}\n\nHistory: {json.dumps(state.history[-6:])}"),
    ]
    response = llm.invoke(messages)
    content = response.content
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


def run_plan(state: AgentState) -> dict:
    """Run plan node synchronously."""
    print("\n[PLAN] Creating plan...")
    llm = get_llm()
    from agents.nodes import PLAN_PROMPT
    from agents.tools import search_web

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

    tool_results = list(state.tool_results)
    search_results_text = ""
    if needs_search and search_queries:
        print(f"[PLAN] Running {len(search_queries)} search(es)...")
        all_results = []
        for query in search_queries:
            sr = search_web(query)
            tool_results.append(sr)
            all_results.append(f"Query: {query}\n{sr}")
        search_results_text = "\n\n".join(all_results)

    steps = list(state.steps)
    plan_summary = "\n".join(f"  {i+1}. {item['task']}" for i, item in enumerate(plan_items))
    step_detail = f"Created {len(plan_items)} step(s):\n{plan_summary}"
    if search_queries:
        step_detail += f"\n\nSearch queries: {', '.join(search_queries)}"
    steps.append({
        "name": "plan",
        "title": "Planning",
        "detail": step_detail,
        "meta": {"plan": plan_items, "search_queries": search_queries},
    })

    return {"plan": plan_items, "tool_results": tool_results, "steps": steps}


def run_think(state: AgentState) -> dict:
    """Run think node synchronously."""
    print("\n[THINK] Reasoning about approach...")
    llm = get_llm()
    from agents.nodes import THINK_PROMPT
    from agents.tools import search_web

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
        clarification_question = data.get("clarification_question", "")
        revision_reason = data.get("revision_reason", "")
    except (json.JSONDecodeError, IndexError):
        thinking = content

    tool_results = list(state.tool_results)
    extra_search_text = ""
    if needs_search and search_query:
        print(f"[THINK] Additional search: {search_query}")
        sr = search_web(search_query)
        tool_results.append(sr)
        extra_search_text = f"\n\nAdditional search: {search_query}"

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
        "meta": {"needs_search": needs_search, "search_query": search_query,
                 "needs_revision": needs_revision, "needs_clarification": needs_clarification},
    })

    # Build clarification question - use explicit field, then revision_reason, then fallback
    final_clarification = clarification_question or revision_reason or "Could you provide more details about what you need?"

    return {
        "thinking": thinking,
        "tool_results": tool_results,
        "steps": steps,
        "needs_revision": needs_revision,
        "needs_clarification": needs_clarification,
        "clarification_question": final_clarification,
    }


def run_execute_streaming(state: AgentState):
    """Run execute node with token streaming. Yields (type, data) tuples."""
    print("\n[EXECUTE] Generating response...")
    llm = get_llm()
    from agents.nodes import EXECUTE_PROMPT

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

    # Stream tokens from LLM
    full_response = ""
    for chunk in llm.stream(messages):
        if chunk.content:
            full_response += chunk.content
            yield ("token", chunk.content)

    # Build completed plan
    completed_plan = []
    for item in state.plan:
        if isinstance(item, dict):
            completed_plan.append({"task": item.get("task", ""), "status": "completed"})

    steps = list(state.steps)
    steps.append({
        "name": "execute",
        "title": "Execution",
        "detail": "Response generated successfully.",
        "meta": {"response_length": len(full_response)},
    })

    yield ("done", {
        "response": full_response,
        "plan": completed_plan,
        "steps": steps,
    })


@router.post("/chat/stream")
async def chat_stream(req: ChatRequest):
    """Streaming chat endpoint using SSE."""

    def event_generator():
        try:
            # Build initial state
            state = AgentState(
                user_message=req.message,
                history=req.history,
            )

            # Step 1: Observe
            result = run_observe(state)
            state.observation = result["observation"]
            state.needs_clarification = result["needs_clarification"]
            state.skip_to_execute = result.get("skip_to_execute", False)
            state.steps = result["steps"]
            yield format_sse("step", result["steps"][-1])

            # Check if clarification needed
            if state.needs_clarification:
                clarify_result = run_clarify(state)
                state.steps = clarify_result["steps"]
                yield format_sse("step", state.steps[-1])
                yield format_sse("clarification", {
                    "question": clarify_result["clarification_question"],
                    "options": clarify_result["clarification_options"],
                })
                yield format_sse("done", {})
                return

            # Skip plan/think for simple conversational messages
            if not state.skip_to_execute:
                # Step 2: Plan
                result = run_plan(state)
                state.plan = result["plan"]
                state.tool_results = result["tool_results"]
                state.steps = result["steps"]
                yield format_sse("step", state.steps[-1])
                yield format_sse("plan", {"plan": state.plan})

                # Step 3: Think
                result = run_think(state)
                state.thinking = result["thinking"]
                state.tool_results = result["tool_results"]
                state.steps = result["steps"]
                state.needs_revision = result["needs_revision"]
                state.needs_clarification = result["needs_clarification"]
                state.clarification_question = result["clarification_question"]
                yield format_sse("step", state.steps[-1])

                # Check if revision needed
                if state.needs_clarification:
                    yield format_sse("clarification", {
                        "question": state.clarification_question,
                        "options": [],
                    })
                    yield format_sse("done", {})
                    return

                if state.needs_revision:
                    result = run_plan(state)
                    state.plan = result["plan"]
                    state.tool_results = result["tool_results"]
                    state.steps = result["steps"]
                    yield format_sse("step", state.steps[-1])
                    yield format_sse("plan", {"plan": state.plan})

                    result = run_think(state)
                    state.thinking = result["thinking"]
                    state.tool_results = result["tool_results"]
                    state.steps = result["steps"]
                    yield format_sse("step", state.steps[-1])

            # Step 4: Execute with streaming
            for event_type, event_data in run_execute_streaming(state):
                if event_type == "token":
                    yield format_sse("token", {"content": event_data})
                elif event_type == "done":
                    yield format_sse("step", event_data["steps"][-1])
                    yield format_sse("final", {
                        "response": event_data["response"],
                        "plan": event_data["plan"],
                    })

            yield format_sse("done", {})

        except Exception as e:
            traceback.print_exc()
            yield format_sse("error", {"message": str(e)})

    def run_clarify(state: AgentState) -> dict:
        print("\n[CLARIFY] Asking for clarification...")
        llm = get_llm()
        from agents.nodes import CLARIFY_PROMPT
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
            question = data.get("question", "Could you clarify?")
            options = data.get("options", [])
        except (json.JSONDecodeError, IndexError):
            question = content
            options = []

        steps = list(state.steps)
        steps.append({
            "name": "clarify",
            "title": "Clarification Needed",
            "detail": question,
            "meta": {"options": options},
        })
        return {
            "clarification_question": question,
            "clarification_options": options,
            "steps": steps,
        }

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
