# 05 - main.py Explained

> **File:** `backend/main.py`  
> **Purpose:** FastAPI server entry point. Sets up the web server and registers API routes.

---

## Environment Setup

```python
import os
from dotenv import load_dotenv

# Load .env file FIRST before any other imports
load_dotenv()
```

**Why load `.env` first?**
- `load_dotenv()` reads `backend/.env` and sets environment variables
- Must happen BEFORE importing modules that use `os.getenv()`
- This is how API keys (OpenAI, Tavily) get loaded

---

## App Creation

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import router
from api.stream_routes import router as stream_router

app = FastAPI(
    title="Agentic AI Chatbot",
    description="Autonomous AI agent with observe -> plan -> think -> execute workflow",
    version="1.0.0",
)
```

- Creates the FastAPI application
- These values show in the auto-generated docs at `http://localhost:8000/docs`

---

## CORS Middleware

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**What is CORS?**
- Cross-Origin Resource Sharing
- Browsers block requests from one domain to another by default
- Since React (port 5173) talks to FastAPI (port 8000), we need to allow it

**Settings:**
| Setting | Value | Meaning |
|---------|-------|---------|
| `allow_origins` | `["http://localhost:5173", "http://localhost:3000"]` | Only allow React dev servers |
| `allow_credentials` | `True` | Allow cookies/auth headers |
| `allow_methods` | `["*"]` | Allow all HTTP methods (GET, POST, etc.) |
| `allow_headers` | `["*"]` | Allow all headers |

---

## Registering Routes

```python
app.include_router(router, prefix="/api")
app.include_router(stream_router, prefix="/api")
```

- `router` → handles `POST /api/chat` (non-streaming)
- `stream_router` → handles `POST /api/chat/stream` (streaming with SSE)

---

## Health Check

```python
@app.get("/")
async def root():
    return {"message": "Agentic AI Chatbot API is running!"}
```

Simple endpoint to check if the server is running. Visit `http://localhost:8000/`.

---

## Running the Server

```python
if __name__ == "__main__":
    import uvicorn

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))

    print(f"Starting server on {host}:{port}")
    uvicorn.run("main:app", host=host, port=port, reload=True)
```

- **`uvicorn`**: ASGI server that runs FastAPI
- **`reload=True`**: Auto-restart when code changes (dev mode)
- **`0.0.0.0`**: Listen on all network interfaces
- **`port=8000`**: Listen on port 8000

---

## API Endpoints Summary

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Health check |
| GET | `/docs` | Auto-generated API docs (Swagger UI) |
| POST | `/api/chat` | Non-streaming chat |
| POST | `/api/chat/stream` | Streaming chat with SSE |
| GET | `/api/health` | Health check |
