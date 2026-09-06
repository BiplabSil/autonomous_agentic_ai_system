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
    route_after_think,
)


def build_graph() -> StateGraph:
    """
    Build the agent workflow graph.

    Flow:
        START -> observe -> [plan OR clarify] -> think -> [execute OR revise OR clarify] -> END

        If clarification is needed at any point:
        -> clarify -> END (waits for user response, then starts new graph run)
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

    # After observe: plan or clarify
    graph.add_conditional_edges(
        "observe",
        route_after_observe,
        {
            "plan": "plan",
            "clarify": "clarify",
        },
    )

    # After plan: always think
    graph.add_edge("plan", "think")

    # After think: execute, revise plan, or clarify
    graph.add_conditional_edges(
        "think",
        route_after_think,
        {
            "execute": "execute",
            "plan": "plan",
            "clarify": "clarify",
        },
    )

    graph.add_edge("execute", END)
    graph.add_edge("clarify", END)

    return graph.compile()


# Create the compiled graph instance
agent_graph = build_graph()
