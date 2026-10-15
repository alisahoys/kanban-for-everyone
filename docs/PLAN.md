# High level steps for project

Part 1: Plan

Enrich this document to plan out each of these parts in detail, with substeps listed out as a checklist to be checked off by the agent, and with tests and success critieria for each. Also create an AGENTS.md file inside the frontend directory that describes the existing code there. Ensure the user checks and approves the plan.

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
- [x] Verify the frontend build, backend tests, browser tests, and Docker startup.

Tests and success criteria:
- `npm run build` succeeds and writes the static site to `frontend/out/`.
- `npm run test:unit` passes and reports coverage to help identify meaningful untested behavior; there is no fixed coverage gate.
- `npm run test:e2e` checks the board loads and supports card creation and drag-and-drop when served by FastAPI.
- Backend tests confirm `/` serves the Kanban board, Next.js assets load, API endpoints still work, and unknown routes return 404.
- Docker Compose builds and starts the app; `http://localhost:8000/` shows the demo Kanban board.

Part 4: Add in a fake user sign in experience

Now update so that on first hitting /, you need to log in with dummy credentials ("user", "password") in order to see the Kanban, and you can log out. Comprehensive tests.

Part 5: Database modeling

Now propose a database schema for the Kanban, saving it as JSON. Document the database approach in docs/ and get user sign off.

Part 6: Backend

Now add API routes to allow the backend to read and change the Kanban for a given user; test this thoroughly with backend unit tests. The database should be created if it doesn't exist.

Part 7: Frontend + Backend

Now have the frontend actually use the backend API, so that the app is a proper persistent Kanban board. Test very throughly.

Part 8: AI connectivity

Now allow the backend to make an AI call via OpenRouter. Test connectivity with a simple "2+2" test and ensure the AI call is working.

Part 9: Now extend the backend call so that it always calls the AI with the JSON of the Kanban board, plus the user's question (and conversation history). The AI should respond with Structured Outputs that includes the response to the user and optionaly an update to the Kanban. Test thoroughly.

Part 10: Now add a beautiful sidebar widget to the UI supporting full AI chat, and allowing the LLM (as it determines) to update the Kanban based on its Structured Outputs. If the AI updates the Kanban, then the UI should refresh automatically.
