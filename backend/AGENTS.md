# Backend service

This folder contains the Python FastAPI API for the project management app.

## Responsibilities

- Serve the statically exported Next.js frontend at `/`
- Expose a lightweight health check and hello endpoint for startup verification
- Provide the API surface the frontend will eventually call as the Kanban backend

## Key files

- `app/main.py`: FastAPI app definition and route handlers
- `app/database.py` and `app/schemas.py`: SQLite initialization, board persistence, and API validation
- `../frontend/out/`: static Next.js export generated during frontend and Docker builds
- `tests/`: API, database, and real-server integration tests

## Local development

```bash
cd backend
uv sync --extra dev
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Build the frontend first from `frontend/` with `npm run build` so FastAPI can serve `frontend/out/`.
