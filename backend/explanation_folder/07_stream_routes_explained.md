# 07 - stream_routes.py Explained (Streaming)

> **File:** `backend/api/stream_routes.py`  
> **Purpose:** Handles the streaming chat endpoint. Runs each node manually and streams events via SSE (Server-Sent Events).

---

## Why Separate from routes.py?

The non-streaming version runs the entire graph at once and returns the result. The streaming version:
1. Runs each node manually (not through LangGraph)
2. Sends events to the frontend as each node completes
3. Streams the final response token-by-token from the LLM

---

## Imports

```python
import json
import traceback
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from agents.state import AgentState
from agents.nodes import (
    get_llm, observe_node, plan_node, think_node,
    execute_node, clarify_node, route_after_observe, route_after_think,
)
```

We import individual functions from `nodes.py` to call them directly.

---

## SSE Format Helper

```python
def format_sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"
```

**Server-Sent Events format:**
```
event: step
data: {"name": "observe", "title": "Observation", "detail": "..."}

event: token
data: {"content": "Hello"}

event: done
data: {}

```

Each event has:
- **event**: The event type (step, token, plan, clarification, final, done, error)
- **data**: JSON payload
- **\n\n**: Double newline separates events

---

## run_observe()

```python
def run_observe(state: AgentState) -> dict:
```

**Identical to observe_node() in nodes.py but with quick bypass for greetings.**

**Quick check for simple messages:**
```python
simple_patterns = [
    "hi", "hello", "hey", "good morning", "good evening", ...
]
if msg in simple_patterns or len(msg.split()) <= 2:
    return {
        "observation": state.user_message,
        "needs_clarification": False,
        "skip_to_execute": True,    # <-- KEY: skip plan/think
        "steps": [...],
    }
```

**If not simple, calls LLM:**
```python
llm = get_llm()
messages = [SystemMessage(content=OBSERVE_PROMPT), HumanMessage(...)]
response = llm.invoke(messages)
# Parse JSON from response...
```

**Returns:**
```python
{
    "observation": "User wants to know about AI trends.",
    "needs_clarification": False,
    "skip_to_execute": False,
    "steps": [{"name": "observe", ...}]
}
```

---

## run_plan()

```python
def run_plan(state: AgentState) -> dict:
```

Calls LLM to create a plan, runs searches if needed.

**Returns:**
```python
{
    "plan": [
        {"task": "Search for AI trends", "status": "pending"},
        {"task": "Compile findings", "status": "pending"}
    ],
    "tool_results": ["Query: AI trends\n1. Agentic AI..."],
    "steps": [{"name": "plan", ...}]
}
```

---

## run_think()

```python
def run_think(state: AgentState) -> dict:
```

Calls LLM to reason about the plan and decide next action.

**Returns:**
```python
{
    "thinking": "Plan looks good. Search results are comprehensive.",
    "tool_results": [...],
    "steps": [{"name": "think", ...}],
    "needs_revision": False,
    "needs_clarification": False,
    "clarification_question": "Could you provide more details about what you need?"
}
```

---

## run_execute_streaming()

```python
def run_execute_streaming(state: AgentState):
    """Yields (type, data) tuples."""
```

This is a **generator function** — it yields tokens one at a time instead of returning all at once.

```python
# Stream tokens from LLM
for chunk in llm.stream(messages):
    if chunk.content:
        full_response += chunk.content
        yield ("token", chunk.content)    # Send each token immediately

# After streaming is done, yield the complete result
yield ("done", {
    "response": full_response,
    "plan": completed_plan,
    "steps": steps,
})
```

**What `llm.stream()` does:**
- Instead of waiting for the full response, it yields chunks as they're generated
- Each chunk is a small piece of text (a word or a few characters)
- This allows the frontend to show text appearing in real-time

---

## event_generator() — The Main Flow

```python
def event_generator():
```

This is the core logic. It runs each step manually and sends SSE events.

### Step 1: Observe

```python
state = AgentState(user_message=req.message, history=req.history)

result = run_observe(state)
state.observation = result["observation"]
state.needs_clarification = result["needs_clarification"]
state.skip_to_execute = result.get("skip_to_execute", False)
state.steps = result["steps"]
yield format_sse("step", result["steps"][-1])   # <-- Send step event to frontend
```

**Frontend receives:**
```
event: step
data: {"name": "observe", "title": "Observation", "detail": "User wants to know about AI trends.", "meta": {...}}
```

### Check for clarification:
```python
if state.needs_clarification:
    clarify_result = run_clarify(state)
    yield format_sse("step", state.steps[-1])
    yield format_sse("clarification", {"question": "...", "options": [...]})
    yield format_sse("done", {})
    return
```

### Skip check for simple messages:
```python
if not state.skip_to_execute:
    # Step 2: Plan
    result = run_plan(state)
    state.plan = result["plan"]
    yield format_sse("step", state.steps[-1])
    yield format_sse("plan", {"plan": state.plan})

    # Step 3: Think
    result = run_think(state)
    state.thinking = result["thinking"]
    yield format_sse("step", state.steps[-1])

    # Check if revision needed
    if state.needs_revision:
        # Re-run plan and think...
```

### Step 4: Execute with streaming

```python
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
```

---

## Complete SSE Event Stream

Here's what the frontend receives for a normal request:

```
event: step
data: {"name":"observe","title":"Observation","detail":"User wants to know about AI trends.","meta":{"task_type":"research","has_enough_info":true}}

event: step
data: {"name":"plan","title":"Planning","detail":"Created 3 step(s):\n  1. Search for AI trends\n  2. Compile findings\n  3. Generate response","meta":{"plan":[...],"search_queries":["AI trends 2026"]}}

event: plan
data: {"plan":[{"task":"Search for AI trends","status":"pending"},{"task":"Compile findings","status":"pending"},{"task":"Generate response","status":"pending"}]}

event: step
data: {"name":"think","title":"Reasoning","detail":"Plan looks good. Ready to execute.","meta":{"needs_search":false,"needs_revision":false,"needs_clarification":false}}

event: token
data: {"content":"##"}

event: token
data: {"content":" AI"}

event: token
data: {"content":" Trends"}

... (more tokens) ...

event: token
data: {"content":" trends."}

event: step
data: {"name":"execute","title":"Execution","detail":"Response generated successfully.","meta":{"response_length":1523}}

event: final
data: {"response":"## AI Trends\n\nHere are the key trends...","plan":[{"task":"Search for AI trends","status":"completed"},...]}

event: done
data: {}
```

---

## How the Frontend Parses This

```javascript
// Frontend code (App.jsx)
for (const part of parts) {
    // Split into eventType and dataStr
    if (eventType === 'step') {
        allSteps = [...allSteps, data]
        setStreamingSteps(allSteps)      // Show step in UI
    } else if (eventType === 'token') {
        allTokens += data.content
        setStreamingTokens(allTokens)    // Show text appearing
    } else if (eventType === 'plan') {
        setCurrentPlan(data.plan)        // Update sidebar
    } else if (eventType === 'final') {
        allTokens = data.response        // Use complete response
    } else if (eventType === 'done') {
        // Stream finished
    }
}
```
