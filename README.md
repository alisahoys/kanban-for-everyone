# Kanban Project

A project management board built with Next.js, FastAPI, and SQLite. It supports drag-and-drop, editable cards with priority and due dates, saved project details, and an AI chat sidebar that can update the board.

## Run locally

Create a `.env` file in the project root with your OpenRouter key:

```text
OPENROUTER_API_KEY=your-key
```

Then run:

```bash
docker compose up --build
```

Open [http://localhost:8000](http://localhost:8000) and sign in with `user` / `password`. The board works without an API key, but AI replies require one.
