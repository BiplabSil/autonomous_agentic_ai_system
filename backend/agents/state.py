"""State definitions for the LangGraph agent workflow."""

from pydantic import BaseModel, Field


class AgentState(BaseModel):
    """Main state that flows through the entire graph."""

    # User input
    user_message: str = ""

    # Agent's understanding of the task
    observation: str = ""

    # The plan created by the agent (list of plain dicts: {"task": str, "status": str})
    plan: list[dict] = Field(default_factory=list)

    # Current thinking / reasoning
    thinking: str = ""

    # Clarification question to ask user (if needed)
    clarification_question: str = ""
    clarification_options: list[str] = Field(default_factory=list)

    # Tool results
    tool_results: list[str] = Field(default_factory=list)

    # Final response
    final_response: str = ""

    # Control flow flags
    needs_clarification: bool = False
    needs_revision: bool = False
    is_complete: bool = False

    # Conversation history (simple list of dicts)
    history: list[dict] = Field(default_factory=list)

    # Step-by-step details collected during execution
    steps: list[dict] = Field(default_factory=list)
