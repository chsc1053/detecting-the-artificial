# Frontend Architecture

React (Vite) app in the `frontend/` directory. Created with `npm create vite@latest frontend -- --template react`.

## Stack

- React 19 + Vite 7.
- Functional components and hooks; no class components.
- ESLint configured.

## Current Structure

- **Entry**: `index.html` → `src/main.jsx` mounts `App.jsx`.
- **Routing**: `src/main.jsx` wraps app with `BrowserRouter`.
- **Root component**: `src/App.jsx` defines routes — **participant**: `/` (home / study picker), `/study/:studyId` (intro → trials → demographics → results); **admin** nested under `/admin` (see [Admin panel IA](../features/admin-panel.md)).
- **Participant UI**: `src/pages/participant/ParticipantHome.jsx`, `ParticipantStudyPage.jsx`; `src/components/participant/StimulusView.jsx` (modalities); `AutoTextarea.jsx` (auto-growing open-ended response field).
- **Admin**: `src/pages/admin/AdminLayout.jsx` — session gate, fixed left sidebar (brand, email, Dashboard / Studies, Sign out at bottom), `<Outlet />` in main column (no top bar).
- **Admin dashboard** (`/admin`): `AdminDashboardHome.jsx` — overview, quick actions, at-a-glance counts, recent studies.
- **Studies** (`/admin/studies`): `AdminStudiesPage.jsx` — create study and full list.
- **Study workspace** (`/admin/studies/:studyId/overview|stimuli|trials|responses`): `StudyWorkspaceLayout.jsx`, `StudyOverviewTab.jsx`, `StudyStimuliTab.jsx`, `StudyTrialsTab.jsx`, `StudyResponsesTab.jsx` (responses UI placeholder until API exists).
- **Config**: `vite.config.js` — dev server proxies `/api` to the backend (see [local-setup](../deployment/local-setup.md)); `eslint.config.js`.
- **UI**: Global tokens and typography in `src/index.css` (light theme, teal accent); page and admin layouts in `src/App.css`; **Instrument Sans** from Google Fonts (`index.html`). Shared admin stimulus row: `src/components/admin/StimulusItemCard.jsx` (stimuli list + trial embeds).

## Planned

- **Participant flow**: study entry, task presentation (forced-choice and/or single-item per trial), response capture, demographics, results summary.
- **Admin panel** (single, auth-protected): structure, routes, and navigation are described in [Admin panel IA](../features/admin-panel.md); implementation will add nested routes (dashboard vs studies list vs study workspace, analytics, export).
- State management: local state where possible; lift state when shared across routes or components.

## Related

- [Overview](overview.md)
- [Backend](backend.md) — API consumed by the frontend.
