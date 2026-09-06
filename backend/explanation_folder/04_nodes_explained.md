# 04 - nodes.py Explained

> **File:** `backend/agents/nodes.py`  
> **Purpose:** Contains all node functions (observe, plan, think, execute, clarify) and routing logic.

---

## Imports

```python
import json
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from .state import AgentState
from .tools import search_web
```

| Import | Purpose |
|--------|---------|
| `json` | Parse JSON from LLM responses |
| `ChatOpenAI` | LangChain wrapper for OpenAI GPT models |
| `HumanMessage` | A message from the user (goes to LLM) |
| `SystemMessage` | A system instruction (goes to LLM) |
| `AgentState` | Our state class |
| `search_web` | Tavily search function |

---

## get_llm()

```python
def get_llm():
    return ChatOpenAI(model="gpt-4o", temperature=0.7)
```

Creates a fresh LLM instance. `temperature=0.7` means slightly creative but not random.

---

## System Prompts

Each node has a system prompt that tells the LLM its role.

### OBSERVE_PROMPT

Tells the LLM to classify the user's message:

```
Output a JSON object:
{
    "observation": "clear summary of what the user wants",
    "task_type": "research|coding|analysis|creative|general|conversational",
    "has_enough_info": true,
    "missing_info": []
}
```

**Example LLM Response:**
```json
{
    "observation": "User wants to know about the latest AI trends in 2026. This is a research task requiring current information.",
    "task_type": "research",
    "has_enough_info": true,
    "missing_info": []
}
```

---

### PLAN_PROMPT

Tells the LLM to create a step-by-step plan:

```
Output a JSON object:
{
    "plan": [
        {"task": "step description", "status": "pending"},
        {"task": "step description", "status": "pending"}
    ],
    "needs_search": true/false,
    "search_queries": ["query1", "query2"]
}
```

**Example LLM Response:**
```json
{
    "plan": [
        {"task": "Search for AI trends in 2026", "status": "pending"},
        {"task": "Search for AI industry reports and predictions", "status": "pending"},
        {"task": "Compile findings into a comprehensive summary", "status": "pending"}
    ],
    "needs_search": true,
    "search_queries": ["AI trends 2026", "AI industry report 2026"]
}
```

---

### THINK_PROMPT

Tells the LLM to reason about the plan:

```
Output a JSON object:
{
    "thinking": "your reasoning about progress and next steps",
    "current_step": 0,
    "ready_to_execute": true/false,
    "needs_search": true/false,
    "search_query": "query if search needed",
    "needs_revision": false,
    "revision_reason": "if needs_revision is true, explain why",
    "needs_clarification": false,
    "clarification_question": "if needs_clarification is true, the question to ask"
}
```

**Example LLM Response (ready to execute):**
```json
{
    "thinking": "The plan covers all necessary steps. Search results show strong trends in agentic AI, multimodal models, and AI regulation. We have enough information to generate a comprehensive response.",
    "current_step": 2,
    "ready_to_execute": true,
    "needs_search": false,
    "search_query": "",
    "needs_revision": false,
    "revision_reason": "",
    "needs_clarification": false,
    "clarification_question": ""
}
```

**Example LLM Response (needs clarification):**
```json
{
    "thinking": "The user asked for help with code but didn't specify the language. I cannot proceed without knowing which language they want.",
    "current_step": 0,
    "ready_to_execute": false,
    "needs_search": false,
    "search_query": "",
    "needs_revision": false,
    "revision_reason": "",
    "needs_clarification": true,
    "clarification_question": "Which programming language would you like me to use?"
}
```

---

### EXECUTE_PROMPT

Tells the LLM to generate the final response. Simple and direct:

```
Generate a response based on the context below.

If this is a simple conversational message (greeting, thanks, etc.), respond naturally and warmly.
For actual tasks, be thorough but concise. Use markdown formatting.
```

**Example LLM Response:**
```markdown
## AI Trends in 2026

Based on my research, here are the key trends:

1. **Agentic AI** - AI systems that can autonomously plan and execute multi-step tasks
2. **Multimodal Models** - AI that understands text, images, audio, and video together
3. **AI Regulation** - The EU AI Act and similar laws are now in effect

The adoption rate has reached 72% in enterprises...
```

---

### CLARIFY_PROMPT

Tells the LLM to ask a clarifying question:

```
Output JSON:
{
    "question": "your clarifying question",
    "type": "mcq",
    "options": ["option1", "option2"],
    "reason": "why you need this"
}
```

**Example LLM Response:**
```json
{
    "question": "I'd be happy to help with code! Which language are you using?",
    "type": "mcq",
    "options": ["Python", "JavaScript", "TypeScript", "Other"],
    "reason": "Need to know the language to write appropriate code"
}
```

---

## Node Functions

### observe_node()

```python
def observe_node(state: AgentState) -> dict:
```

**What it does:**
1. **Quick check**: If the message is a simple greeting (hi, hello, thanks), skip the LLM and set `skip_to_execute=True`
2. **Otherwise**: Call the LLM with `OBSERVE_PROMPT` to classify the message
3. **Parse** the JSON response
4. **Return** updated state fields

**Input:**
```python
state.user_message = "What are the latest AI trends in 2026?"
state.history = []
state.steps = []
```

**Output dict:**
```python
{
    "observation": "User wants to know about current AI trends in 2026.",
    "needs_clarification": False,
    "steps": [
        {
            "name": "observe",
            "title": "Observation",
            "detail": "User wants to know about current AI trends in 2026.",
            "meta": {"task_type": "research", "has_enough_info": True}
        }
    ]
}
```

---

### plan_node()

```python
def plan_node(state: AgentState) -> dict:
```

**What it does:**
1. **Call LLM** with `PLAN_PROMPT` and the observation
2. **Parse** the plan steps from JSON
3. **Run searches** if `needs_search=True`
4. **Return** the plan and search results

**Input:**
```python
state.observation = "User wants to know about AI trends in 2026."
state.user_message = "What are the latest AI trends in 2026?"
state.tool_results = []
state.steps = [...]
```

**Output dict:**
```python
{
    "plan": [
        {"task": "Search for AI trends 2026", "status": "pending"},
        {"task": "Compile findings", "status": "pending"},
        {"task": "Generate response", "status": "pending"}
    ],
    "tool_results": [
        "Query: AI trends 2026\n1. **Agentic AI** - ...\n2. **Multimodal** - ..."
    ],
    "steps": [
        ...,
        {
            "name": "plan",
            "title": "Planning",
            "detail": "Created 3 step(s):\n  1. Search for AI trends 2026\n  2. Compile findings\n  3. Generate response\n\nSearch queries: AI trends 2026",
            "meta": {
                "plan": [...],
                "search_queries": ["AI trends 2026"],
                "search_results": "..."
            }
        }
    ]
}
```

---

### think_node()

```python
def think_node(state: AgentState) -> dict:
```

**What it does:**
1. **Call LLM** with `THINK_PROMPT`, observation, plan, and tool results
2. **Parse** the thinking and decision flags
3. **Run additional search** if `needs_search=True`
4. **Return** reasoning and control flags

**Output dict:**
```python
{
    "thinking": "The plan covers the main areas. Search results show strong trends. Ready to execute.",
    "tool_results": [...],
    "steps": [...],
    "needs_revision": False,
    "needs_clarification": False,
    "clarification_question": "Could you provide more details about what you need?"
}
```

---

### execute_node()

```python
def execute_node(state: AgentState) -> dict:
```

**What it does:**
1. **Call LLM** with `EXECUTE_PROMPT` and all gathered context
2. **Mark all plan items** as completed
3. **Return** the final response

**Output dict:**
```python
{
    "final_response": "## AI Trends in 2026\n\nHere are the key trends...",
    "plan": [
        {"task": "Search for AI trends 2026", "status": "completed"},
        {"task": "Compile findings", "status": "completed"},
        {"task": "Generate response", "status": "completed"}
    ],
    "is_complete": True,
    "steps": [...]
}
```

---

### clarify_node()

```python
def clarify_node(state: AgentState) -> dict:
```

**What it does:**
1. **Call LLM** with `CLARIFY_PROMPT` and the observation
2. **Parse** the question and options
3. **Return** the clarification question

**Output dict:**
```python
{
    "clarification_question": "Which programming language would you like?",
    "clarification_options": ["Python", "JavaScript", "TypeScript"],
    "needs_clarification": True,
    "steps": [...]
}
```

---

## JSON Parsing Pattern

Every node uses the same pattern to parse LLM responses:

```python
content = response.content

# Step 1: Remove markdown code blocks if present
if "```json" in content:
    content = content.split("```json")[1].split("```")[0]
elif "```" in content:
    content = content.split("```")[1].split("```")[0]

# Step 2: Parse JSON
data = json.loads(content.strip())

# Step 3: Extract fields with defaults
observation = data.get("observation", content)
has_enough = data.get("has_enough_info", True)
```

**Why this pattern?**
- LLMs sometimes wrap JSON in markdown code blocks: ` ```json ... ``` `
- We need to strip that before parsing
- `.get()` with defaults handles missing fields gracefully

---

## Routing Functions

### route_after_observe()

```python
def route_after_observe(state: AgentState) -> str:
    if state.needs_clarification:
        return "clarify"
    if state.skip_to_execute:
        return "execute"
    return "plan"
```

**Decision logic:**
| Condition | Route |
|-----------|-------|
| `needs_clarification=True` | → clarify |
| `skip_to_execute=True` | → execute |
| Default | → plan |

### route_after_think()

```python
def route_after_think(state: AgentState) -> str:
    if state.needs_clarification:
        return "clarify"
    if state.needs_revision:
        return "plan"
    return "execute"
```

**Decision logic:**
| Condition | Route |
|-----------|-------|
| `needs_clarification=True` | → clarify |
| `needs_revision=True` | → plan (retry) |
| Default | → execute |
