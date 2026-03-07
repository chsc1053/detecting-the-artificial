# Frontend Architecture

React (Vite) app in the `frontend/` directory. Created with `npm create vite@latest frontend -- --template react`.

## Stack

- React 19 + Vite 7.
- Functional components and hooks; no class components.
- ESLint configured.

## Current Structure

- **Entry**: `index.html` → `src/main.jsx` mounts `App.jsx`.
- **Root component**: `src/App.jsx` — placeholder; fetches `/api/health` to show backend status in dev.
- **Config**: `vite.config.js` — dev server proxies `/api` to the backend (see [local-setup](../deployment/local-setup.md)); `eslint.config.js`.

## Planned

- **Participant flow**: study entry, task presentation (forced-choice and/or single-item per trial), response capture, demographics, results summary.
- **Admin panel** (single, auth-protected): study and trial creation, stimulus upload, run studies, **analytics section** with automated analytics from stored data, and data export.
- State management: local state where possible; lift state when shared across routes or components.

## Related

- [Overview](overview.md)
- [Backend](backend.md) — API consumed by the frontend.
