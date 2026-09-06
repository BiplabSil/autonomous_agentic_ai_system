# Autonomous Agentic AI System

An autonomous AI chatbot that observes, plans, thinks, and executes — powered by GPT-4o, LangGraph, and Tavily web search.

## Architecture

```
User Input → Observe → Plan → Think → Execute → Response
                ↓                    ↑
           Clarify (if needed) ──────┘
```

- **Observe**: Understands what the user is asking
- **Plan**: Creates a step-by-step todo list
- **Think**: Reasons through the approach, decides if web search is needed
- **Execute**: Generates the final response using gathered information
- **Clarify**: Asks follow-up questions when the request is ambiguous

## Project Structure

```
├── backend/
│   ├── .env                  # API keys (edit this file only)
│   ├── main.py               # FastAPI server
│   ├── requirements.txt      # Python dependencies
│   ├── agents/
│   │   ├── state.py          # Agent state definitions
│   │   ├── nodes.py          # Agent workflow nodes
│   │   ├── graph.py          # LangGraph workflow
│   │   └── tools.py          # Tavily web search tool
│   └── api/
│       └── routes.py         # API endpoints
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx
│       ├── components/
│       │   ├── Header.jsx
│       │   ├── Sidebar.jsx
│       │   ├── ChatInterface.jsx
│       │   ├── MessageBubble.jsx
│       │   └── InputArea.jsx
│       └── styles/
│           └── global.css    # NVIDIA theme
└── README.md
```

## Setup

### 1. Get API Keys

- **OpenAI**: https://platform.openai.com/api-keys
- **Tavily**: https://tavily.com (free tier available)

### 2. Configure Environment

Edit `backend/.env`:

```env
OPENAI_API_KEY=sk-your-openai-key
TAVILY_API_KEY=tvly-your-tavily-key
```

### 3. Start Backend

```bash
cd backend
pip install -r requirements.txt
python main.py
```

Server runs on `http://localhost:8000`

### 4. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

### 5. Open in Browser

Go to `http://localhost:5173` and start chatting!

## Tech Stack

| Layer    | Technology                     |
| -------- | ------------------------------ |
| LLM      | GPT-4o via OpenAI              |
| Agent    | LangGraph + LangChain          |
| Search   | Tavily API                     |
| Backend  | FastAPI + Python               |
| Frontend | React + Vite                   |
| Theme    | NVIDIA-inspired dark theme     |
