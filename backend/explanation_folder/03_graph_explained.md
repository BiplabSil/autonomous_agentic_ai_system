# 03 - graph.py Explained

> **File:** `backend/agents/graph.py`  
> **Purpose:** Wires all nodes together into a workflow graph using LangGraph.

---

## What is LangGraph?

LangGraph is a library for building **state machines** with AI agents. Think of it as a flowchart where:
- **Nodes** = Steps (observe, plan, think, execute)
- **Edges** = Arrows connecting steps
- **Conditional edges** = Arrows that change based on conditions

---

## Imports

```python
from langgraph.graph import StateGraph, END
from .state import AgentState
from .nodes import (
    observe_node,
    plan_node,
    think_node,
    execute_node,
    clarify_node,
    route_after_observe,
    route_after_think,
)
```

| Import | Purpose |
|--------|---------|
| `StateGraph` | The graph builder class |
| `END` | Special node that stops the graph |
| `AgentState` | The state type that flows through the graph |
| `*_node` | The actual functions that do the work |
| `route_*` | Functions that decide which path to take |

---

## The build_graph() Function

```python
def build_graph() -> StateGraph:
    graph = StateGraph(AgentState)
```
Creates a new graph that uses `AgentState` as its data structure.

---

### Adding Nodes

```python
    graph.add_node("observe", observe_node)
    graph.add_node("plan", plan_node)
    graph.add_node("think", think_node)
    graph.add_node("execute", execute_node)
    graph.add_node("clarify", clarify_node)
```

Each `add_node(name, function)` call registers:
- **name**: A string identifier (e.g., "observe")
- **function**: The Python function to call when this node runs

---

### Setting Entry Point

```python
    graph.set_entry_point("observe")
```

The graph always starts at the `observe` node.

---

### Edges After Observe (Conditional)

```python
    graph.add_conditional_edges(
        "observe",
        route_after_observe,
        {
            "plan": "plan",
            "clarify": "clarify",
            "execute": "execute",
        },
    )
```

After `observe` finishes, `route_after_observe` decides where to go next:

```python
def route_after_observe(state: AgentState) -> str:
    if state.needs_clarification:
        return "clarify"      # User needs to answer something
    if state.skip_to_execute:
        return "execute"      # Simple message, skip planning
    return "plan"             # Normal flow, start planning
```

**Decision tree:**
```
observe finishes
    ├── needs_clarification=True?  → clarify
    ├── skip_to_execute=True?      → execute
    └── otherwise                  → plan
```

---

### Edge After Plan (Fixed)

```python
    graph.add_edge("plan", "think")
```

After `plan` finishes, always go to `think`. No choice here.

---

### Edges After Think (Conditional)

```python
    graph.add_conditional_edges(
        "think",
        route_after_think,
        {
            "execute": "execute",
            "plan": "plan",
            "clarify": "clarify",
        },
    )
```

After `think` finishes, `route_after_think` decides:

```python
def route_after_think(state: AgentState) -> str:
    if state.needs_clarification:
        return "clarify"      # Need user input
    if state.needs_revision:
        return "plan"         # Plan was wrong, redo it
    return "execute"          # Good to go
```

**Decision tree:**
```
think finishes
    ├── needs_clarification=True?  → clarify
    ├── needs_revision=True?       → plan (loops back)
    └── otherwise                  → execute
```

---

### Ending Edges

```python
    graph.add_edge("execute", END)
    graph.add_edge("clarify", END)
```

Both `execute` and `clarify` are terminal nodes — they end the graph.

---

### Compiling

```python
    return graph.compile()
```

Compiles the graph into an executable form. Without this, you can't run the graph.

---

### Global Instance

```python
agent_graph = build_graph()
```

We build the graph once at import time and reuse it. This way we don't rebuild the graph on every request.

---

## Complete Flow Diagram

```
                    ┌─────────────────────────────────────┐
                    │              START                   │
                    └──────────────┬──────────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────────────┐
                    │            OBSERVE                    │
                    │  (Understand user message)           │
                    └──────────────┬───────────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
                    ▼              ▼              ▼
              needs_clarify   skip_to_execute   normal
                    │              │              │
                    ▼              ▼              ▼
            ┌──────────┐   ┌──────────┐   ┌──────────┐
            │ CLARIFY  │   │ EXECUTE  │   │   PLAN   │
            └────┬─────┘   └────┬─────┘   └────┬─────┘
                 │              │              │
                 ▼              ▼              ▼
               END            END      ┌──────────┐
                                       │  THINK   │
                                       └────┬─────┘
                                            │
                            ┌───────────────┼───────────────┐
                            │               │               │
                            ▼               ▼               ▼
                      needs_clarify   needs_revision    ready
                            │               │               │
                            ▼               ▼               ▼
                      ┌──────────┐   ┌──────────┐   ┌──────────┐
                      │ CLARIFY  │   │   PLAN   │   │ EXECUTE  │
                      └────┬─────┘   └────┬─────┘   └────┬─────┘
                           │              │              │
                           ▼              ▼              ▼
                         END          (loops back)      END
```

---

## Example Execution Paths

### Path 1: Simple greeting "hi"
```
observe → skip_to_execute=True → execute → END
```

### Path 2: Normal request "What are AI trends?"
```
observe → plan → think → execute → END
```

### Path 3: Ambiguous request "help me with code"
```
observe → plan → think (needs_clarification=True) → clarify → END
```

### Path 4: Plan needs revision
```
observe → plan → think (needs_revision=True) → plan → think → execute → END
```
