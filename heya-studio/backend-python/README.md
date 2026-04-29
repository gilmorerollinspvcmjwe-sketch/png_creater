# Heya Studio Backend (Python)

AI Agent backend service for Heya Studio - a personal homepage generator.

## Quick Start

### 1. Install Dependencies

```bash
cd backend-python
python -m venv .venv
.venv/Scripts/python.exe -m pip install -e ".[dev]"
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
- **Mock Mode (No API Key)**: Set `MOCK_LLM=true` for testing without real LLM
- **Production**: Set `MOCK_LLM=false` and add your LLM API keys

### 3. Start Server

```bash
# Development mode
.venv/Scripts/python.exe -m uvicorn src.main:app --reload --port 8000

# Production mode
.venv/Scripts/python.exe -m uvicorn src.main:app --host 0.0.0.0 --port 8000
```

From the repository root, the recommended command is:

```bash
npm run dev
```

The root script starts this FastAPI backend together with the Vite frontend.

### 4. Test API

```bash
curl -X POST http://localhost:8000/api/agent/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "帮我生成一个樱花风格的个人主页"}'
```

## API Endpoints

### POST /api/agent/chat

Main agent chat endpoint. Handles:
- New page generation
- Page modification
- General chat

**Request:**
```json
{
  "message": "string",
  "sessionId": "string (optional)",
  "context": {
    "pageId": "string (optional)",
    "existingConfig": { ... }
  }
}
```

**Response:**
```json
{
  "sessionId": "string",
  "response": "string",
  "action": {
    "type": "generate|modify|preview|save|ask",
    "data": { ... }
  },
  "currentConfig": {
    "version": "1.0",
    "metadata": { "title", "description" },
    "theme": { "id", "colors", "fonts" },
    "layout": { "type", "width" },
    "components": [ { "id", "type", "props", "position" } ]
  },
  "suggestions": [ ... ],
  "requiresConfirmation": false
}
```

## Frontend Integration

### Change Frontend API URL

Edit `frontend/.env` or `frontend/.env.local`:

```bash
VITE_API_URL=http://localhost:8000
```

The frontend will call:
- `POST http://localhost:8000/api/agent/chat` for agent conversations

### Response Format

The backend strictly follows the frontend's `AgentChatResponse` interface:

- `sessionId`: Session identifier
- `response`: Agent's text reply
- `action`: Action object with type and data
- `currentConfig`: Current page configuration (applied to canvas)
- `suggestions`: List of suggestions
- `requiresConfirmation`: Whether confirmation is needed

## Project Structure

```
backend-python/
├── src/
│   ├── main.py              # FastAPI entry point
│   ├── config.py            # Configuration management
│   ├── router/
│   │   └── agent.py         # Router Agent (intent classification)
│   ├── agents/
│   │   ├── base.py          # Agent base class
│   │   ├── design.py        # Design Agent (core)
│   │   ├── modify.py        # Modify Agent
│   │   ├── profile_extract.py
│   │   ├── component_search.py
│   │   ├── validation.py
│   │   └── chat.py          # Chat Agent
│   ├── tools/
│   │   ├── base.py          # Tool base + registry
│   │   ├── templates.py     # Template query (mock)
│   │   ├── components.py    # Component query (mock)
│   │   ├── config.py        # Config generation
│   │   ├── skills.py        # Skill application
│   │   └── llm_tools.py     # LLM tools
│   ├── skills/
│   │   ├── loader.py        # Skill loader
│   │   ├── sakura.yaml      # Sakura style Skill
│   │   └── cyberpunk.yaml   # Cyberpunk style Skill
│   ├── memory/
│   │   └── session.py       # Session memory (Redis/in-memory)
│   ├── llm/
│   │   ├── client.py        # Unified LLM client
│   │   ├── minimax.py       # MiniMax adapter
│   │   ├── qwen.py          # Qwen adapter
│   │   └── schemas.py       # Output schemas
│   ├── guardrails/
│   │   └── limits.py        # Generation limits
│   └── models/
│       ├── page.py          # PageConfig models
│       └── profile.py       # UserProfile models
├── tests/
│   └── test_agent.py        # Basic tests
├── .env.example
├── pyproject.toml
└── README.md
```

## Mock Mode

When `MOCK_LLM=true`, the system:
- Uses predefined responses instead of real LLM calls
- Returns mock page configurations
- Allows full testing without API keys

Example mock flow:
```bash
# Request
curl -X POST http://localhost:8000/api/agent/chat \
  -d '{"message": "帮我生成一个樱花风的个人主页"}'

# Response (mock)
{
  "sessionId": "session_001",
  "response": "好的！我来帮你生成一个樱花风格的个人主页...",
  "action": { "type": "generate", "data": { ... } },
  "currentConfig": {
    "version": "1.0",
    "theme": { "id": "sakura", ... },
    "components": [ ... ]
  }
}
```

## Skills System

Skills are YAML files defining style presets:

```yaml
# src/skills/sakura.yaml
id: sakura-style
name: 樱花萌系风格包
colors:
  primary: "#F2A7B3"
  secondary: "#FFEEF2"
triggers:
  keywords: [樱花, 粉色, 萌系]
```

Skills are matched based on:
- Keywords in user input
- User MBTI
- Explicit style preference

## Development Notes

### No Orchestration Framework

This project intentionally avoids LangGraph, AutoGen, or other orchestration frameworks. The pattern is simple:

> Main Agent decides when to spawn sub-Agents, gets results, and continues.

All agent logic is implemented with plain Python `if/else` statements.

### Frontend Compatibility

The `PageConfig` output must strictly match the frontend's `BackendPageConfig` interface:
- `component.type` must be one of: container, text, image, avatar, tag-group, social-links, oshi-card, attribute-wall, friends-list, music-player, quote, divider, spacer, hero-section, media-list
- `theme.id` must be one of: sakura, lavender, mint, cream, night, pixel, mono, millennial

### Session Management

Sessions are stored in Redis (if available) or in-memory dict (fallback):
- TTL: 24 hours
- Stores: conversation history, extracted profile, current config

## Testing

```bash
# Install test dependencies
pip install pytest pytest-asyncio

# Run tests
pytest tests/
```

## License

MIT
