"""Tools available to the agent - Tavily web search."""

import os
from langchain_community.tools.tavily_search import TavilySearchResults


def get_search_tool():
    """Create and return the Tavily search tool."""
    api_key = os.getenv("TAVILY_API_KEY")
    if not api_key or api_key == "your_tavily_api_key_here":
        print("WARNING: TAVILY_API_KEY not set. Search tool will not work.")
        return None

    tool = TavilySearchResults(
        max_results=5,
        search_depth="advanced",
        include_answer=True,
    )
    return tool


def search_web(query: str) -> str:
    """Search the web using Tavily and return formatted results."""
    tool = get_search_tool()
    if not tool:
        return "Search tool is not configured. Please set TAVILY_API_KEY in .env file."

    try:
        results = tool.invoke(query)

        # Format results nicely
        formatted = []
        for i, result in enumerate(results, 1):
            title = result.get("title", "No title")
            url = result.get("url", "")
            content = result.get("content", "No content")
            formatted.append(f"{i}. **{title}**\n   URL: {url}\n   {content}\n")

        return "\n".join(formatted) if formatted else "No results found."
    except Exception as e:
        return f"Search error: {str(e)}"
