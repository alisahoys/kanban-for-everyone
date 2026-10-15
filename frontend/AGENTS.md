# Frontend app

This directory contains the Next.js-based frontend for the project management MVP.

## Current state

- The app is a frontend demo with a sign-in gate and a Kanban board with drag-and-drop interactions
- `next.config.ts` configures a static export to `out/`
- The main entry point is `src/app/page.tsx`, which renders `SignInGate`; the board appears after entering the demo credentials (`user` / `password`)
- Board logic and state helpers live under `src/lib/kanban.ts`
- UI building blocks such as cards, columns, and forms live under `src/components/`
- The board-aware AI chat sidebar lives in `src/components/ChatSidebar.tsx`; its API client is `src/lib/chatApi.ts`
- The project already includes unit tests and Playwright smoke tests
- The demo sign-in is client-side only and stores its state in `sessionStorage`; it is not backend authentication
- The board loads from `GET /api/users/demo-user/board` and changes are saved with full-board `PUT` requests
- The prior `pm-kanban-board-v1` local-storage board is migrated once only when the backend still contains the original seed board; an already changed server board takes precedence
- The demo sign-in remains client-side only and is not authorization for the board API

## Common commands

```bash
npm install
npm run dev
npm run test:unit
npm run test:e2e
```

## Notes

The static export is served by FastAPI in the Docker image; Playwright runs against that FastAPI-served export and verifies board changes through the API.
