# 02 - tools.py Explained

> **File:** `backend/agents/tools.py`  
> **Purpose:** Provides web search capability using the Tavily API.

---

## Imports

```python
import os
from langchain_community.tools.tavily_search import TavilySearchResults
```
- **os**: To read environment variables (API keys).
- **TavilySearchResults**: LangChain's wrapper around the Tavily search API. Returns search results as structured data.

---

## get_search_tool()

```python
def get_search_tool():
    """Create and return the Tavily search tool."""
    api_key = os.getenv("TAVILY_API_KEY")
    if not api_key or api_key == "your_tavily_api_key_here":
        print("WARNING: TAVILY_API_KEY not set. Search tool will not work.")
        return None

    tool = TavilySearchResults(
        max_results=5,          # Return up to 5 results
        search_depth="advanced", # Deep search (more thorough)
        include_answer=True,     # Include AI-generated answer
    )
    return tool
```

### What it does:
1. Reads `TAVILY_API_KEY` from the `.env` file
2. If the key is missing or still the placeholder, returns `None`
3. Otherwise creates a Tavily search tool with these settings:
   - **max_results=5**: Get top 5 search results
   - **search_depth="advanced"**: More thorough search (slower but better)
   - **include_answer=True**: Tavily generates a short answer summary

### Return value:
- Returns `TavilySearchResults` object (callable) or `None`

---

## search_web()

```python
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
```

### What it does:
1. Gets the search tool
2. If tool is unavailable, returns an error message
3. Calls `tool.invoke(query)` which sends the query to Tavily's API
4. Formats each result into readable markdown
5. Returns all results as a single string

---

## Sample Tavily API Response (raw)

When you call `tool.invoke("AI trends 2026")`, Tavily returns something like this:

```json
[
    {
        "title": "Top AI Trends to Watch in 2026",
        "url": "https://example.com/ai-trends-2026",
        "content": "The AI landscape in 2026 is dominated by agentic AI systems, multimodal models, and increased regulation..."
    },
    {
        "title": "AI Industry Report 2026",
        "url": "https://example.com/ai-report",
        "content": "Enterprise AI adoption has reached 72% in 2026, with agentic systems leading the charge..."
    }
]
```

Each result dict has:
| Key | Type | Description |
|-----|------|-------------|
| `title` | str | Page title |
| `url` | str | Source URL |
| `content` | str | Page content snippet |

---

## Formatted Output (returned by search_web)

```markdown
1. **Top AI Trends to Watch in 2026**
   URL: https://example.com/ai-trends-2026
   The AI landscape in 2026 is dominated by agentic AI systems, multimodal models, and increased regulation...

2. **AI Industry Report 2026**
   URL: https://example.com/ai-report
   Enterprise AI adoption has reached 72% in 2026, with agentic systems leading the charge...
```

---

## How It's Used in the Agent

```
plan_node decides: needs_search=True, search_queries=["AI trends 2026"]
    ↓
plan_node calls: search_web("AI trends 2026")
    ↓
search_web returns formatted results string
    ↓
Results stored in state.tool_results
    ↓
think_node and execute_node use these results to generate response
```
