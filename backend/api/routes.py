"""API routes for the agent chatbot."""

import traceback
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from agents.graph import agent_graph

router = APIRouter()


class ChatRequest(BaseModel):
    """Request body for chat endpoint."""
    message: str
    history: list[dict] = []


@router.post("/chat")
async def chat(req: ChatRequest):
    """
    Main chat endpoint.
    Runs the full agent graph: observe -> plan -> think -> execute.
    May return a clarification question instead of a final answer.
    """
    try:
        # Create initial state as dict (LangGraph works best with dicts)
        initial_state = {
            "user_message": req.message,
            "history": req.history,
        }

        # Run the graph
        result = agent_graph.invoke(initial_state)

        # LangGraph returns a dict; normalize it
        if hasattr(result, "model_dump"):
            result_dict = result.model_dump()
        elif isinstance(result, dict):
            result_dict = result
        else:
            result_dict = dict(result)

        # Safely extract plan items
        raw_plan = result_dict.get("plan", [])
        plan = []
        for item in raw_plan:
            if isinstance(item, dict):
                plan.append({"task": item.get("task", ""), "status": item.get("status", "pending")})
            elif hasattr(item, "model_dump"):
                plan.append(item.model_dump())
            elif hasattr(item, "task"):
                plan.append({"task": item.task, "status": getattr(item, "status", "pending")})

        # Extract steps
        steps = result_dict.get("steps", [])

        # Check if clarification is needed
        if result_dict.get("needs_clarification"):
            return {
                "type": "clarification",
                "question": result_dict.get("clarification_question", ""),
                "options": result_dict.get("clarification_options", []),
                "steps": steps,
            }

        # Return final response
        return {
            "type": "response",
            "response": result_dict.get("final_response", ""),
            "plan": plan,
            "steps": steps,
        }

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok", "message": "Agent is running!"}
