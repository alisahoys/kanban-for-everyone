# Kanban Studio

## Run

```bash
npm install
npm run dev
```

## Tests

```bash
npm run test:unit
npm run test:e2e
```

The end-to-end command builds the static export and runs Playwright against FastAPI. It requires the backend dependencies from `backend/` to be installed with `uv sync --extra dev`.
