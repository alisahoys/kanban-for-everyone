# Code review

Date: 2026-10-15. Scope: the whole `pm/` repo (backend, frontend, Docker, scripts, docs) at Part 12 of `PLAN.md`.

Baseline before review: 38 backend tests, 27 frontend unit tests, lint, production build and 12 Playwright tests all pass.

Each finding is labelled Verified (reproduced or proven from the code) or Likely (reasoned from the code, not reproduced).

## Summary

The codebase is small, readable and well tested for an MVP. Validation is strong on the server, writes are transactional, and the API key stays server-side. The main risks are concurrent writes to the board (AI chat against manual edits), one UI input that can block all saving, and the Windows stop script leaving the server running.

| # | Severity | Finding | Status |
| --- | --- | --- | --- |
| 1 | High | `stop.ps1` / `stop.bat` leave uvicorn running on port 8000 | Verified |
| 2 | High | Edits made while an AI chat request is in flight are lost | Likely |
| 3 | Medium | Clearing a column title blocks every later save | Verified |
| 4 | Medium | API has no authentication and the server binds to all interfaces | Verified (by design, needs a decision) |
| 5 | Medium | AI board updates are unrestricted full-board replacements | Verified |
| 6 | Medium | Strict JSON schema sent to OpenRouter is likely incompatible with strict mode, patched over in `main.py` | Likely |
| 7 | Low | Board routes accept any `user_id`, chat route only `demo-user` | Verified |
| 8 | Low | No size limits on cards, titles or details | Verified |
| 9 | Low | Runtime Docker image ships dev deps and tests, runs as root | Verified |
| 10 | Low | Duplicated API base URL logic and hard-coded user ID in the frontend | Verified |
| 11 | Low | Redundant PUT after every AI board update | Likely |
| 12 | Low | Edits made within 250 ms of closing the tab are lost | Likely |
| 13 | Low | Sync SQLite calls inside the async chat handler | Verified |
| 14 | Low | Docs and housekeeping gaps | Verified |

## Remediation status (2026-10-15)

| # | Status | Change |
| --- | --- | --- |
| 1 | Fixed | `stop.ps1` kills the process tree with `taskkill /T /F`. Verified: port 8000 free and no uvicorn process left after stop. |
| 2 | Fixed for single-tab use | Board and project editor are `inert` while a chat request is pending. Multi-tab last-write-wins remains; a version column would be the next step. |
| 3 | Fixed | An empty column title stays local and reverts on blur; it is never saved. A test fails on the old code. |
| 4 | Mitigated | `start.*` bind `127.0.0.1`, Compose publishes `127.0.0.1:8000`. No auth was added. |
| 5 | Mitigated | "Undo AI change" restores the previous board until the next edit. |
| 6 | Partly fixed | Reply parsing and field back-filling moved to `chat.parse_reply` with unit tests. The schema is unchanged because the live smoke test passes with it. |
| 7 | Fixed | `/chat` no longer hard-codes `demo-user`. |
| 8 | Fixed | Limits: column title 60, card title 200, details 2000, 500 cards. Enforced server-side and mirrored as `maxLength` in the inputs. |
| 11 | Fixed | AI boards are applied with `replaceFromServer`, so there is no second PUT. |
| 13 | Fixed | The chat route runs SQLite calls in the threadpool. |
| 9, 10, 12, 14 | Open | Low severity; not addressed. |

## Findings

### 1. Windows stop script leaves the server running (High, Verified)

`scripts/start.ps1:18` starts `uv`, and records that PID. `uv run` spawns `uvicorn` as a child process. `scripts/stop.ps1:15` kills only the `uv` PID with `Stop-Process`, which does not kill children on Windows.

Reproduced during this review: after `start.ps1` then `stop.ps1`, a `python.exe ... uvicorn.exe app.main:app --port 8000` process was still listening on port 8000. Its open log handles also made `Remove-Item` in `stop.ps1` fail silently, so `backend.stdout.log` / `backend.stderr.log` were left behind. The next `start.ps1` would then fail to bind the port.

`stop.sh` is probably fine because `uv` forwards SIGTERM to its child on Unix, but this was not tested here.

Action:
- In `stop.ps1`, kill the process tree: `taskkill /PID $backendPid /T /F`.
- Alternative: start uvicorn directly from the venv (`.venv\Scripts\python.exe -m uvicorn ...`) so the recorded PID is the server itself.
- Re-run the start/stop check and confirm port 8000 is free afterwards.

### 2. AI chat can overwrite concurrent manual edits (High, Likely)

The flow is:
1. `ChatSidebar.tsx:35` flushes pending saves, then sends the question.
2. `main.py:83` loads the board, then waits up to 20 s for OpenRouter.
3. Meanwhile the board stays interactive. Any edit autosaves via `PUT` (`useBoardSync.ts:74`).
4. When the AI replies with `board_update`, `main.py:138` saves a board derived from the state loaded in step 2, overwriting the edit from step 3.
5. `KanbanBoard.tsx:324` then replaces the local board with the AI's board, so the edit also disappears from the screen.

The same last-write-wins problem exists between two browser tabs, but the chat path makes it easy to hit in normal single-user use.

Action (simplest first):
- Disable board editing (or show an overlay) while a chat request is pending. This removes the single-user case with a few lines of code.
- Longer term, add a board `version` column: `GET` returns it, `PUT` and chat saves must send it, and a mismatch returns `409`. The frontend reloads on `409`.
- Add a Playwright test: start a mocked slow chat, edit a card, then check the result.

### 3. Clearing a column title blocks all saving (Medium, Verified)

`KanbanColumn.tsx:58` writes every keystroke into the board, including an empty string. `ColumnData.title` has `min_length=1` (`schemas.py:23`), so the `PUT` returns `422`. The UI shows "Could not save your changes". Every later edit, of any kind, also fails because each `PUT` still carries the empty title. Retry repeats the same invalid board. Sign-out is blocked too, because `handleSignOut` aborts when `saveNow` throws (`KanbanBoard.tsx:50`).

Action:
- Keep the title in local input state and commit on blur/Enter only when `trim()` is non-empty; otherwise revert to the previous title.
- Add a `max_length` to column titles on both sides.
- Add a unit test for clearing and blurring a column title.

### 4. No authentication on the API (Medium, Verified, by design)

Sign-in is client-side only (`SignInGate.tsx:29`, credentials in the bundle). All `/api` routes are open, and the server binds `0.0.0.0` in the scripts and Docker. Anyone who can reach port 8000 on the network can read and replace the board and spend OpenRouter credits through `/chat`. `DATABASE.md` already documents that this is not authorization.

Action:
- Decide whether the app is local-only. If so, bind to `127.0.0.1` in `start.*` and publish `127.0.0.1:8000:8000` in `docker-compose.yml`.
- If it will be exposed, add real server-side auth (session cookie) and derive the user from it instead of the URL path, as `DATABASE.md` proposes.

### 5. AI board updates are unrestricted (Medium, Verified)

The model returns a whole board, and anything that passes schema validation is saved (`main.py:137`). A misunderstanding, or prompt injection from card text, can delete every card in one reply. There is no undo or history. The system prompt treating the board as data helps, but it is not a control.

Action:
- Cheap guard: reject (or ask for confirmation of) an AI update that removes more than N cards, and say so in the reply.
- Better: keep the previous board (one `board_snapshots` row per AI change) and add an "Undo AI change" button.

### 6. Structured output schema vs. strict mode (Medium, Likely)

`chat.py:5` sends `StructuredChatReply.model_json_schema()` with `strict: True`. That schema uses features OpenAI-style strict mode does not support or requires differently:
- `cards` is an `additionalProperties` map.
- It contains `minLength`, `maxLength` and `format: date`.
- It uses `$defs` references.

`DEFAULT_MODEL = "openrouter/free"` routes to varying models, so behaviour will differ by provider. The defensive patching in `main.py:106-126`, which fills in missing `project`, `priority` and `dueDate`, shows models are already returning output that does not match the schema.

Action:
- Make `cards` a list in the AI-facing schema and convert it to the map server-side, or drop `strict` and rely on server validation (which already exists).
- Move the patch-up logic out of the route into a named function in `chat.py` (for example `normalize_reply(decoded, current_board)`) with its own unit tests. That keeps `main.py` a thin router.
- Pin a specific model in `.env` for predictable results; keep `openrouter/free` only as the fallback.

### 7. Inconsistent user scoping (Low, Verified)

`GET`/`PUT /board` work for any `user_id` that has a board (`main.py:56-70`). `/chat` hard-rejects anything except `demo-user` (`main.py:80`), even though the code below it is already user-generic.

Action: remove the `DEMO_USER_ID` check from `/chat` (the `load_board` 404 already covers unknown users), or apply the same rule to all routes. Pick one.

### 8. No size limits on board content (Low, Verified)

`CardData.title`, `details`, `ColumnData.title` and the number of cards are unbounded (`schemas.py:9-24`). The whole board is also embedded in every AI prompt (`chat.py:35`). A large board can exceed the model context and inflate token costs.

Action: add `max_length` to card title (for example 200), details (for example 2000) and column title (for example 60), and a maximum card count. Mirror the limits with `maxLength` in the inputs.

### 9. Docker runtime image (Low, Verified)

- `Dockerfile:24` and `:28` copy `tests/` and install `--extra dev` into the runtime image.
- `pip install uv` is unpinned, and the container runs as root.
- `CMD uv run ...` can re-resolve at startup; `uv sync --frozen` plus running `.venv/bin/uvicorn` directly is more predictable.
- `docker-compose.yml:8` requires `.env` to exist, so `docker compose up` fails on a fresh clone without it.

Action:
- Install without dev extras in the runtime stage and drop `COPY backend/tests`. Run the tests in a separate stage or in CI if they are needed in Docker.
- Pin the `uv` version and add a non-root `USER`.
- Use `CMD [".venv/bin/uvicorn", ...]`.
- Add a `.env.example` and mention it in the README. Optionally mark the env file `required: false` (Compose 2.24+).

### 10. Duplicated frontend API plumbing (Low, Verified)

The port-3000 check that builds the API base is copied in `boardApi.ts:16` and `chatApi.ts:13`. The user ID is `demoUserId` in one file and a literal `"demo-user"` in the other.

Action: add `src/lib/api.ts` exporting `apiUrl(path)` and the user ID, and use it in both files. Consider `NEXT_PUBLIC_API_BASE` for dev instead of sniffing the port.

### 11. Redundant save after an AI update (Low, Likely)

The server has already saved the AI board. `onBoardUpdate` then sets it locally, the sync effect (`useBoardSync.ts:63`) sees a snapshot that differs from `lastSavedSnapshot`, and it `PUT`s the same board again. This is harmless, but it is an extra write that widens the race in finding 2.

Action: give `useBoardSync` a `replaceFromServer(board)` that sets both the state and `lastSavedSnapshot`, and use it for chat results.

### 12. Pending edit lost on tab close (Low, Likely)

The 250 ms debounce timer (`useBoardSync.ts:74`) is dropped on unload, so a very recent edit is not saved.

Action: on `pagehide`, flush with `fetch(..., { keepalive: true })` when a save is pending. This is optional at MVP scale.

### 13. Blocking DB calls in an async route (Low, Verified)

`chat_with_board` is `async` but calls the synchronous `load_board` / `save_board` (`main.py:83`, `:138`), which block the event loop while SQLite runs. Impact is negligible at this scale.

Action: wrap them in `await run_in_threadpool(...)`, or leave as is and note it.

### 14. Docs and housekeeping (Low, Verified)

- There is no `pm/README.md`, although `AGENTS.md` asks for a concise one. Add a short one covering run, test, `.env` setup and the scripts.
- `/api/hello` is scaffolding left over from Part 2. Remove it and its test.
- The legacy localStorage migration (`boardApi.ts:109-158`) can be removed once no browsers hold pre-Part-7 data. Note a removal date in `PLAN.md`.
- `stop.*` deletes the logs, which loses the diagnostics needed when the server crashed. Consider keeping them (they are already git-ignored).
- Backend coverage reports 88% because `chat_smoke.py` / `openrouter_smoke.py` are counted. Add `[tool.coverage.run] omit = ["app/*_smoke.py"]` so the number reflects tested code.
- Fix the Starlette `anyio.abc.BlockingPortal` deprecation warning by upgrading `fastapi` (pinned to `0.115.1`). Also pin `pytest-cov`.

## What is in good shape

- Server-side validation of the board shape (fixed columns, card references, key and ID agreement) in `schemas.py`.
- Transactional full-board writes with parameterized SQL and enforced foreign keys.
- Idempotent schema migration for existing databases, covered by tests.
- The OpenRouter key never reaches the browser or logs. Provider errors become safe, user-facing messages, and the request timeout is bounded.
- Save status, retry and flush-before-sign-out in the UI. Accessible roles on status and error messages.
- The test suite covers unit, API, a real HTTP server and browser runs against the packaged export, with deterministic AI mocks.

## Suggested order of work

1. Fix `stop.ps1` (finding 1). Small change, verified bug.
2. Column title commit-on-blur and length limits (findings 3 and 8).
3. Lock the board while chat is pending, and add `replaceFromServer` (findings 2 and 11).
4. Decide the exposure model: bind to localhost or add auth (finding 4).
5. Clean up the AI path: normalization function, schema fix, model pin, delete guard or undo (findings 5 and 6).
6. Docker image, README and `.env.example`, and the remaining housekeeping (findings 9, 10, 14).
