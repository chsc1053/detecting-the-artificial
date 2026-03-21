# Frontend Architecture

React (Vite) app in the `frontend/` directory. Created with `npm create vite@latest frontend -- --template react`.

## Stack

- React 19 + Vite 7.
- Functional components and hooks; no class components.
- ESLint configured.

## Current Structure

- **Entry**: `index.html` → `src/main.jsx` mounts `App.jsx`.
- **Routing**: `src/main.jsx` wraps app with `BrowserRouter`.
- **Root component**: `src/App.jsx` defines routes; admin uses nested routes under `/admin` (see [Admin panel IA](../features/admin-panel.md)).
- **Admin**: `src/pages/admin/AdminLayout.jsx` — session gate, sidebar (Dashboard, Studies), header + `<Outlet />`.
- **Admin dashboard** (`/admin`): `AdminDashboardHome.jsx` — overview, quick actions, at-a-glance counts, recent studies.
- **Studies** (`/admin/studies`): `AdminStudiesPage.jsx` — create study (`POST /api/admin/studies`) and full list (`GET /api/studies`).
- **Config**: `vite.config.js` — dev server proxies `/api` to the backend (see [local-setup](../deployment/local-setup.md)); `eslint.config.js`.
- **UI**: Global tokens and typography in `src/index.css` (light theme, teal accent); page and admin layouts in `src/App.css`; **Instrument Sans** from Google Fonts (`index.html`).

## Planned

- **Participant flow**: study entry, task presentation (forced-choice and/or single-item per trial), response capture, demographics, results summary.
- **Admin panel** (single, auth-protected): structure, routes, and navigation are described in [Admin panel IA](../features/admin-panel.md); implementation will add nested routes (dashboard vs studies list vs study workspace, analytics, export).
- State management: local state where possible; lift state when shared across routes or components.

## Related

- [Overview](overview.md)
- [Backend](backend.md) — API consumed by the frontend.
