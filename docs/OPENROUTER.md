# OpenRouter smoke test

The backend reads `OPENROUTER_API_KEY` from its environment. Docker Compose loads it from the root `.env` file. The key stays in the backend container and is not printed by the smoke test.

Build and start the app, then run the optional live check:

```bash
docker compose up -d --build
docker compose exec backend uv run python -m app.openrouter_smoke
```

The smoke test sends `What is 2+2?` through OpenRouter's free model router and exits successfully when the answer is `4`. It reports configuration and provider errors without displaying the API key. The regular backend tests use mocked HTTP responses and do not require a key or network access.
