"""LangGraph workflow - wires all nodes together into a graph."""

from langgraph.graph import StateGraph, END
from .state import AgentState
from .nodes import (
    observe_node,
    plan_node,
    think_node,
    execute_node,
    clarify_node,
    route_after_observe,
)


def build_graph() -> StateGraph:
    """
    Build the agent workflow graph.

    Flow:
        START -> observe -> [plan OR clarify] -> think -> execute -> END

        If clarification is needed:
        observe -> clarify -> END (waits for user response, then starts new graph run)
    """

    graph = StateGraph(AgentState)

    # Add nodes
    graph.add_node("observe", observe_node)
    graph.add_node("plan", plan_node)
    graph.add_node("think", think_node)
    graph.add_node("execute", execute_node)
    graph.add_node("clarify", clarify_node)

    # Set entry point
    graph.set_entry_point("observe")

    # Add edges
    graph.add_conditional_edges(
        "observe",
        route_after_observe,
        {
            "plan": "plan",
            "clarify": "clarify",
        },
    )

    graph.add_edge("plan", "think")
    graph.add_edge("think", "execute")
    graph.add_edge("execute", END)
    graph.add_edge("clarify", END)

    return graph.compile()


# Create the compiled graph instance
agent_graph = build_graph()
