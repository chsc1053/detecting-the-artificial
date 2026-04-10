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
- **Admin**: `src/pages/admin/AdminLayout.jsx` — session gate, fixed left sidebar (brand, email, Dashboard / Stimuli / Studies / Analytics, Sign out at bottom), `<Outlet />` in main column (no top bar).
- **Admin dashboard** (`/admin`): `AdminDashboardHome.jsx` — activity since last sign-in (`GET /admin/dashboard/activity`), studies and stimuli at-a-glance, recent studies.
- **Studies** (`/admin/studies`): `AdminStudiesPage.jsx` — create study and full list (edit/delete per row).
- **Stimuli** (`/admin/stimuli`): `AdminStimuliPage.jsx` — global library by modality; forms for text and media URL stimuli.
- **Analytics** (`/admin/analytics`): `AdminAnalyticsPage.jsx` — Recharts (Overview, Performance, Modalities, Demographics); **Study scope** for all studies or one study; optional `?study_id=` pre-select; `GET /admin/analytics` and `GET /admin/analytics/performance`. **Print / PDF** via `window.print()` and `@media print` rules in `App.css` (see [data export](../features/data-export.md)).
- **Study workspace** (`/admin/studies/:studyId/overview|stimuli|trials|responses`): `StudyWorkspaceLayout.jsx`, `StudyOverviewTab.jsx`, `StudyStimuliTab.jsx` (link to global Stimuli), `StudyTrialsTab.jsx`, `StudyResponsesTab.jsx`.
- **Config**: `vite.config.js` — dev server proxies `/api` to the backend (see [local-setup](../deployment/local-setup.md)); `eslint.config.js`.
- **UI**: Global tokens and typography in `src/index.css` (light theme, teal accent); page and admin layouts in `src/App.css`; **Instrument Sans** from Google Fonts (`index.html`). Shared admin stimulus row: `src/components/admin/StimulusItemCard.jsx` (stimuli list + trial embeds).

## Planned / not yet routed

- **Admin**: persistent auth beyond in-memory MVP tokens if needed (see [admin panel IA](../features/admin-panel.md)).
- State management: local state where possible; lift state when shared across routes or components.

## Related

- [Overview](overview.md)
- [Backend](backend.md) — API consumed by the frontend.
