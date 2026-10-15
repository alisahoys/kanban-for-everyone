# Frontend app

This directory contains the Next.js-based frontend for the project management MVP.

## Current state

- The app is a frontend demo with a Kanban board and drag-and-drop interactions
- `next.config.ts` configures a static export to `out/`
- The main entry point is `src/app/page.tsx`, which renders the board
- Board logic and state helpers live under `src/lib/kanban.ts`
- UI building blocks such as cards, columns, and forms live under `src/components/`
- The project already includes unit tests and Playwright smoke tests

## Common commands

```bash
npm install
npm run dev
npm run test:unit
npm run test:e2e
```

## Notes

This frontend is not yet connected to the backend API or authentication flow. The static export is served by FastAPI in the Docker image; Playwright runs against that FastAPI-served export.
