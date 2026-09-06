# 06 - routes.py Explained (Non-Streaming)

> **File:** `backend/api/routes.py`  
> **Purpose:** Handles the non-streaming chat endpoint. Runs the full agent graph and returns the complete response at once.

---

## Imports

```python
import traceback
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from agents.graph import agent_graph
```

| Import | Purpose |
|--------|---------|
| `traceback` | Print full error logs when something fails |
| `APIRouter` | Group related API endpoints |
| `HTTPException` | Return proper HTTP error responses |
| `BaseModel` | Validate request body structure |
| `agent_graph` | The compiled LangGraph workflow |

---

## Request Model

```python
class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []
```

Defines what the frontend sends:

**Example request body:**
```json
{
    "message": "What are the latest AI trends?",
    "history": [
        {"role": "user", "content": "Hello"},
        {"role": "assistant", "content": "Hi! How can I help?"}
    ]
}
```

---

## POST /api/chat

```python
@router.post("/chat")
async def chat(req: ChatRequest):
```

### Step 1: Create Initial State

```python
initial_state = {
    "user_message": req.message,
    "history": req.history,
}
```

Converts the request into a dict that LangGraph can use.

---

### Step 2: Run the Graph

```python
result = agent_graph.invoke(initial_state)
```

This runs the ENTIRE graph synchronously:
```
observe → plan → think → execute
```

The graph returns the final `AgentState` with all fields populated.

---

### Step 3: Normalize Result

```python
if hasattr(result, "model_dump"):
    result_dict = result.model_dump()
elif isinstance(result, dict):
    result_dict = result
else:
    result_dict = dict(result)
```

LangGraph might return different types depending on version. This handles all cases and converts to a plain dict.

---

### Step 4: Extract Plan

```python
raw_plan = result_dict.get("plan", [])
plan = []
for item in raw_plan:
    if isinstance(item, dict):
        plan.append({"task": item.get("task", ""), "status": item.get("status", "pending")})
    elif hasattr(item, "model_dump"):
        plan.append(item.model_dump())
    elif hasattr(item, "task"):
        plan.append({"task": item.task, "status": getattr(item, "status", "pending")})
```

Handles plan items that might be dicts or Pydantic objects.

---

### Step 5: Return Response

**If clarification needed:**
```python
if result_dict.get("needs_clarification"):
    return {
        "type": "clarification",
        "question": result_dict.get("clarification_question", ""),
        "options": result_dict.get("clarification_options", []),
        "steps": steps,
    }
```

**Example clarification response:**
```json
{
    "type": "clarification",
    "question": "Which programming language would you like?",
    "options": ["Python", "JavaScript", "TypeScript"],
    "steps": [
        {"name": "observe", "title": "Observation", "detail": "...", "meta": {...}},
        {"name": "think", "title": "Reasoning", "detail": "...", "meta": {...}}
    ]
}
```

**If normal response:**
```python
return {
    "type": "response",
    "response": result_dict.get("final_response", ""),
    "plan": plan,
    "steps": steps,
}
```

**Example normal response:**
```json
{
    "type": "response",
    "response": "## AI Trends in 2026\n\nHere are the key trends...",
    "plan": [
        {"task": "Search for AI trends", "status": "completed"},
        {"task": "Compile findings", "status": "completed"},
        {"task": "Generate response", "status": "completed"}
    ],
    "steps": [
        {"name": "observe", "title": "Observation", "detail": "...", "meta": {...}},
        {"name": "plan", "title": "Planning", "detail": "...", "meta": {...}},
        {"name": "think", "title": "Reasoning", "detail": "...", "meta": {...}},
        {"name": "execute", "title": "Execution", "detail": "...", "meta": {...}}
    ]
}
```

---

## Error Handling

```python
except Exception as e:
    traceback.print_exc()
    raise HTTPException(status_code=500, detail=str(e))
```

If anything fails:
1. Print the full error to the server console
2. Return HTTP 500 with the error message

---

## GET /api/health

```python
@router.get("/health")
async def health():
    return {"status": "ok", "message": "Agent is running!"}
```

Simple health check. Returns:
```json
{
    "status": "ok",
    "message": "Agent is running!"
}
```
