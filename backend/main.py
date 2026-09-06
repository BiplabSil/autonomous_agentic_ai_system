"""Main server entry point - FastAPI application."""

import os
from dotenv import load_dotenv

# Load .env file FIRST before any other imports
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import router
from api.stream_routes import router as stream_router

app = FastAPI(
    title="Agentic AI Chatbot",
    description="Autonomous AI agent with observe -> plan -> think -> execute workflow",
    version="1.0.0",
)

# Allow CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router, prefix="/api")
app.include_router(stream_router, prefix="/api")


@app.get("/")
async def root():
    return {"message": "Agentic AI Chatbot API is running!"}


if __name__ == "__main__":
    import uvicorn

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))

    print(f"Starting server on {host}:{port}")
    uvicorn.run("main:app", host=host, port=port, reload=True)
