# Backend Code Explanation - Index

> Complete line-by-line explanation of every backend module.

---

## File Order (read in this sequence)

| # | File | Purpose | Size |
|---|------|---------|------|
| 01 | [state.py](01_state_explained.md) | Data structure flowing through the agent | 41 lines |
| 02 | [tools.py](02_tools_explained.md) | Tavily web search integration | 41 lines |
| 03 | [graph.py](03_graph_explained.md) | LangGraph workflow wiring | 71 lines |
| 04 | [nodes.py](04_nodes_explained.md) | All agent node functions + prompts | 490 lines |
| 05 | [main.py](05_main_explained.md) | FastAPI server entry point | 46 lines |
| 06 | [routes.py](06_routes_explained.md) | Non-streaming chat endpoint | 81 lines |
| 07 | [stream_routes.py](07_stream_routes_explained.md) | Streaming chat endpoint (SSE) | 416 lines |

---

## Architecture Overview

```
backend/
├── main.py                 # 05 - Server setup, CORS, route registration
├── .env                    # API keys (you edit this)
├── requirements.txt        # Python dependencies
├── agents/
│   ├── __init__.py
│   ├── state.py            # 01 - AgentState class definition
│   ├── tools.py            # 02 - Tavily search tool
│   ├── graph.py            # 03 - LangGraph workflow
│   └── nodes.py            # 04 - Node functions + prompts
├── api/
│   ├── __init__.py
│   ├── routes.py           # 06 - POST /api/chat (non-streaming)
│   └── stream_routes.py    # 07 - POST /api/chat/stream (SSE)
└── explanation_folder/     # This folder
```

---

## Data Flow Summary

```
Frontend sends: POST /api/chat/stream
    Body: {"message": "What are AI trends?", "history": [...]}
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  stream_routes.py: event_generator()                        │
│                                                             │
│  1. run_observe(state)                                      │
│     ├── Quick check: is it a greeting?                      │
│     │   └── Yes → skip_to_execute=True                      │
│     └── No → Call LLM with OBSERVE_PROMPT                   │
│         └── LLM returns: {"observation": "...",             │
│                           "has_enough_info": true}          │
│     └── yield SSE "step" event                              │
│                                                             │
│  2. run_plan(state)  [if not skipped]                       │
│     └── Call LLM with PLAN_PROMPT                           │
│         └── LLM returns: {"plan": [...],                    │
│                           "needs_search": true,             │
│                           "search_queries": [...]}          │
│     └── Run search_web() if needed                          │
│     └── yield SSE "step" + "plan" events                    │
│                                                             │
│  3. run_think(state)  [if not skipped]                      │
│     └── Call LLM with THINK_PROMPT                          │
│         └── LLM returns: {"thinking": "...",                │
│                           "needs_revision": false,          │
│                           "needs_clarification": false}     │
│     └── yield SSE "step" event                              │
│                                                             │
│  4. run_execute_streaming(state)                            │
│     └── Call LLM with EXECUTE_PROMPT (streaming)            │
│         └── For each token chunk:                           │
│             └── yield SSE "token" event                     │
│         └── yield SSE "final" event                         │
│                                                             │
│  5. yield SSE "done" event                                  │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
Frontend receives SSE stream and updates UI in real-time
```

---

## Sample LLM Request/Response for Each Node

### Observe Node

**Request to LLM:**
```
System: You are an AI assistant's OBSERVATION module...
User: User message: What are the latest AI trends in 2026?
History: []
```

**Response from LLM:**
```json
{
    "observation": "User wants to know about current AI trends in 2026. This is a research task requiring current information.",
    "task_type": "research",
    "has_enough_info": true,
    "missing_info": []
}
```

---

### Plan Node

**Request to LLM:**
```
System: You are an AI assistant's PLANNING module...
User: Observation: User wants to know about current AI trends in 2026.

User message: What are the latest AI trends in 2026?
```

**Response from LLM:**
```json
{
    "plan": [
        {"task": "Search for latest AI trends in 2026", "status": "pending"},
        {"task": "Search for AI industry reports and predictions", "status": "pending"},
        {"task": "Compile findings into a comprehensive summary", "status": "pending"},
        {"task": "Generate well-structured response", "status": "pending"}
    ],
    "needs_search": true,
    "search_queries": ["AI trends 2026", "AI industry report 2026"]
}
```

**After search:**
```python
tool_results = [
    "Query: AI trends 2026\n1. **Agentic AI** - AI systems that can autonomously plan...\n2. **Multimodal Models** - ...",
    "Query: AI industry report 2026\n1. **Enterprise Adoption** - 72% of companies..."
]
```

---

### Think Node

**Request to LLM:**
```
System: You are an AI assistant's REASONING module...
User: Observation: User wants to know about AI trends.
Plan:
  1. [pending] Search for latest AI trends in 2026
  2. [pending] Search for AI industry reports
  3. [pending] Compile findings
  4. [pending] Generate response
Tool results so far: Query: AI trends 2026\n1. Agentic AI...
What should we do next?
```

**Response from LLM:**
```json
{
    "thinking": "The plan covers the main areas. Search results show strong trends in agentic AI, multimodal models, and AI regulation. We have comprehensive data to generate a good response.",
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

---

### Execute Node

**Request to LLM:**
```
System: You are a helpful AI assistant...
User: User's original request: What are the latest AI trends?
Observation: User wants to know about AI trends in 2026.
Plan:
  1. [completed] Search for AI trends
  2. [completed] Search for industry reports
  3. [completed] Compile findings
Thinking: Plan looks good, ready to execute.
Search Results: Query: AI trends 2026\n1. Agentic AI...
Generate a comprehensive response to the user.
```

**Response from LLM (streamed token by token):**
```markdown
## Latest AI Trends in 2026

Based on my research, here are the most significant AI trends:

### 1. Agentic AI
AI systems that can autonomously plan, reason, and execute multi-step tasks without human intervention...

### 2. Multimodal Models
Models that seamlessly understand and generate text, images, audio, and video...

### 3. AI Regulation
The EU AI Act and similar global regulations are now in effect...

### 4. Enterprise Adoption
72% of enterprises have integrated AI into their core operations...
```

---

### Clarify Node

**Request to LLM:**
```
System: You are a helpful AI assistant's CLARIFICATION module...
User: User message: help me with code
Observation: User wants help with code but language not specified.
```

**Response from LLM:**
```json
{
    "question": "I'd be happy to help with code! Which programming language are you using?",
    "type": "mcq",
    "options": ["Python", "JavaScript", "TypeScript", "Other"],
    "reason": "Need to know the language to provide appropriate code assistance"
}
```
