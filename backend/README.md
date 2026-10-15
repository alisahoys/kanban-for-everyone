# PM Backend

This backend provides the FastAPI API for the project management MVP.

## Run locally

```bash
cd frontend
npm ci
npm run build
cd ..
cd backend
uv sync --extra dev
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Verify

- Open http://localhost:8000/ to view the statically exported Kanban board
- Call http://localhost:8000/api/health
- Run the optional live OpenRouter check as described in [docs/OPENROUTER.md](../docs/OPENROUTER.md)
