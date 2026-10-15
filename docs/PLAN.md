# High level steps for project

Part 1: Planning - COMPLETE

- [x] Document the project parts, implementation steps, tests, and success criteria.
- [x] Add `frontend/AGENTS.md` to describe the frontend and its development commands.
- [x] Review and approve the plan before implementation.

Part 2: Scaffolding - COMPLETE

Set up the Docker infrastructure, the backend in backend/ with FastAPI, and write the start and stop scripts in the scripts/ directory. This should serve example static HTML to confirm that a 'hello world' example works running locally and also make an API call.

Completed checks:
- [x] Build and start the Docker Compose service.
- [x] Serve the scaffolding HTML and expose the health and hello API routes.
- [x] Add backend unit and real-server integration tests for important API behavior; review coverage without a fixed minimum.
- [x] Add start and stop scripts for Windows, macOS, and Linux.

Part 3: Add in Frontend - COMPLETE

Checklist:
- [x] Configure Next.js to produce a static export.
- [x] Build the frontend in Docker and copy the static export into the runtime image.
- [x] Serve the exported frontend at `/` from FastAPI while preserving API routes and static asset paths.
- [x] Run Playwright against the FastAPI-served export and retain useful frontend unit tests; review coverage without a fixed minimum.
- [x] Verify the frontend build, backend tests, and browser tests.
- [x] Verify Docker Compose builds and starts the app.

Tests and success criteria:
- `npm run build` succeeds and writes the static site to `frontend/out/`.
- `npm run test:unit` passes and reports coverage to help identify meaningful untested behavior; there is no fixed coverage gate.
- `npm run test:e2e` checks the board loads and supports card creation and drag-and-drop when served by FastAPI.
- Backend tests confirm `/` serves the Kanban board, Next.js assets load, API endpoints still work, and unknown routes return 404.
- Docker Compose builds and starts the app; `http://localhost:8000/` shows the demo Kanban board.

Current verification for Part 3:
- Passed: frontend build, 11 frontend unit tests (75.85% statement coverage), frontend lint, 6 backend tests (100% coverage of `app/main.py`), and 5 browser tests against the freshly built export served by FastAPI.
- Confirmed by the user: Docker Compose build/startup and local app check succeeded.

Part 4: Add a fake user sign-in experience - COMPLETE

Require sign-in on `/` with the demo credentials (`user` / `password`) before showing the Kanban, and provide sign-out. The sign-in session is stored for the current browser tab only. Board edits are stored in browser local storage so they survive sign-out and reload; this is not backend or multi-device persistence.

- [x] Show the sign-in form before rendering the board.
- [x] Accept only the configured demo username and password, with an accessible error for invalid credentials.
- [x] Restore sign-in for the current tab session and clear it on sign-out.
- [x] Preserve board edits across sign-out and reload using browser local storage.
- [x] Cover the gate with unit tests and test sign-in, reload, sign-out, and board interactions in Playwright against the FastAPI-served export.
- [x] Run frontend unit coverage, lint, production build, and the Playwright suite.

Verification:
- Passed: 16 frontend unit tests (79.77% statement coverage), frontend lint, and production build.
- Passed: 6 Playwright tests against the freshly built static export served by FastAPI; `npm run test:e2e` exited with code 0.

Part 5: Database modeling - COMPLETE

- [x] Propose a normalized SQLite schema for users, one board per user, fixed ordered columns, and ordered cards; save the schema and board JSON shape in `docs/kanban-schema.json`.
- [x] Document initialization, identity, persistence, and transactional write approach in `docs/DATABASE.md`.
- [x] User approved the proposed schema and approach before Part 6 implementation.

Part 6: Backend - COMPLETE

- [x] Create the SQLite database and seed the demo user and five-column board when the database is absent.
- [x] Add `GET` and full-board `PUT` routes at `/api/users/{user_id}/board`.
- [x] Validate fixed columns, card references, IDs, and content before writing; save board changes transactionally.
- [x] Persist the Docker database path on a named Compose volume.
- [x] Test initialization, idempotent seeding, read/write ordering, validation errors, user scoping, and real-server HTTP persistence.
- [x] Verify database persistence across backend container recreation using the named Compose volume.

Verification:
- Passed: backend unit and real-server integration tests (17 tests, 100% coverage of backend app code).
- Confirmed by the user in Ubuntu WSL: the Compose stack runs, the backend API works, and the board change persists after recreating the backend container.

Part 7: Frontend + Backend - COMPLETE

Now have the frontend actually use the backend API, so that the app is a proper persistent Kanban board. Test very throughly.

- [x] Load the demo user's board from the backend API after sign-in and save board edits through full-board `PUT` requests.
- [x] Keep the packaged static export same-origin; allow the Next.js development server on port 3000 to call the API on port 8000.
- [x] Migrate a legacy browser-saved board once when the server still has the original seed; preserve the server board if it already has changes.
- [x] Show loading, load failure/retry, and save status/retry in the board UI; flush pending changes before sign-out.
- [x] Test legacy migration and server precedence, board UI mutations, API CORS, and end-to-end persistence against FastAPI.
- [x] Confirm from the packaged Docker app that board changes persist after browser reload.

Verification:
- Passed: 18 frontend unit tests (79.51% statement coverage), frontend lint, and 18 backend tests (100% backend coverage).
- Passed: `npm.cmd run test:e2e` (production build plus 7 Playwright tests against FastAPI), including API-backed create, edit, move, rename, and delete checks. Final command exit code: 0.
- Passed against the packaged Docker app: all 7 Playwright tests against port 8000, health and board API requests, and frontend serving.
- Passed Docker persistence check: a temporary API board change survived `docker compose up -d --force-recreate backend`; the original 9-card board was restored and verified afterward. The named volume was preserved.

Part 8: AI connectivity - COMPLETE

Add a small server-side OpenRouter integration and verify that a configured model can answer a simple `2+2` prompt. Keep the API key on the backend and out of logs and browser code.

- [x] Read `OPENROUTER_API_KEY` from the backend environment and return a clear configuration error when it is missing; never expose or log its value.
- [x] Add a small backend OpenRouter client using a suitable free model and a bounded request timeout.
- [x] Add unit tests for successful responses, provider errors, timeouts, and missing configuration using mocked HTTP responses.
- [x] Add an opt-in smoke-test command that sends `2+2` to OpenRouter and checks that the returned answer is correct; do not require a live key for the normal test suite.
- [x] Document how to run the smoke test without printing the key.

Verification:
- Passed: backend test suite (25 tests, including mocked OpenRouter success, provider error, timeout, missing-key, and smoke-answer checks).
- Confirmed by the user in Docker Compose: the live OpenRouter smoke test returned `4` and passed. The check remains opt-in.

Tests and success criteria:
- Unit tests pass without network access or a configured API key.
- With a valid key and provider access, the smoke test completes and returns an answer equivalent to `4`.
- Missing keys and provider failures produce actionable errors without revealing credentials.

Part 9: Board-aware AI API - COMPLETE

Extend the backend AI request to include the persisted board, the user's question, and conversation history. Require a structured response containing user-facing text and an optional validated board update.

- [x] Define request and response schemas for a user question, bounded conversation history, response text, and optional board update.
- [x] Add a chat API route scoped to the demo user's board; load the current board from SQLite for every request and include it with the question and history in the model input.
- [x] Require structured model output and validate any returned board update with the existing board schema before saving it transactionally.
- [x] Return the assistant response and the resulting board only when an update was accepted and saved.
- [x] Add unit and API tests for responses without changes, valid updates, malformed structured output, invalid board updates, and provider failures.
- [x] Add a live smoke check using a configured API key while keeping automated tests deterministic and network independent.

Verification:
- Passed: backend test suite (33 tests), including mocked chat API responses, schema validation, persistence, and provider failure paths.
- Passed: Docker Compose image rebuild and live board-aware chat smoke test using the configured key; the test ran against a temporary SQLite database and left the persistent board untouched.

Tests and success criteria:
- The model receives the current persisted board, the user's question, and the supplied conversation history.
- Valid optional updates are persisted and returned; absent or invalid updates never alter the board.
- Automated tests cover the API contract and failure paths without calling OpenRouter.

Part 10: AI chat sidebar - COMPLETE

Add a sidebar chat interface that uses the board-aware API and applies accepted board updates to the visible board.

- [x] Add a responsive sidebar with conversation history, a question input, send action, loading state, and readable error handling.
- [x] Send the question and relevant conversation history to the backend chat API; keep OpenRouter credentials server-side.
- [x] Show the assistant response and apply a returned board update to the existing board state so the board refreshes immediately.
- [x] Add focused unit tests for chat submission, response rendering, loading/errors, and applying an updated board.
- [x] Extend Playwright coverage for a normal AI reply and an AI response that changes the board; use a deterministic mocked API for browser tests.
- [x] Verify the built Docker app with a live OpenRouter call when credentials and provider access are available.

Verification:
- Passed: frontend unit suite (23 tests, 82.32% statement coverage), lint, and production build.
- Passed: 11 Playwright tests against the FastAPI-served static export, including mocked chat replies, immediate board updates with backend persistence, narrow-screen board interaction, wide-screen sidebar layout, and drag-and-drop.
- Passed: Docker Compose image rebuild and live board-aware OpenRouter smoke check using a temporary SQLite database; the persistent board remained unchanged.

Tests and success criteria:
- Chat works at desktop and narrow viewport sizes without blocking board interactions outside the sidebar.
- A text-only reply leaves the board unchanged; a validated board update appears immediately and persists through the existing board API.
- Automated tests remain runnable without an OpenRouter key or live network access.
