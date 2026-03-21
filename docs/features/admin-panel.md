# Admin Panel (Information Architecture)

Single **experimenter / admin** surface: authenticated, used to configure studies, run research, review analytics, and export data. This document defines **what lives where** so navigation and routing stay coherent as we build.

## Design principles

- **Home = overview**, not a long configuration surface. Quick status, shortcuts, and recent activity—not the full studies table by default.
- **Deep work happens in context**: editing a study, its trials, and stimuli is scoped under **that study** (study workspace).
- **Analytics and export** are first-class areas (researchers return here often).
- **One primary navigation pattern**: persistent **sidebar** on desktop; **top bar + drawer** (or collapsible sidebar) on small screens.

## Global chrome (all authenticated admin routes)

- **Top bar (optional minimal)**: product name (“Detecting the Artificial · Admin”), signed-in email, **Sign out**.
- **Side navigation** (primary): links below. Current section is highlighted.
- **Breadcrumbs** (recommended on nested pages): `Studies > [Study name] > Trials` to reduce disorientation.

## Route map (conceptual)

| Path | Purpose |
|------|---------|
| `/admin` | **Admin home** (dashboard) |
| `/admin/studies` | **Studies list** — browse/search all studies; create new study |
| `/admin/studies/new` | **Create study** (or modal from list; route optional) |
| `/admin/studies/:studyId` | **Study workspace** — overview + tabs or sub-routes for trials, stimuli, settings |
| `/admin/studies/:studyId/trials` | **Trials** for this study (order, types, links to stimuli) |
| `/admin/studies/:studyId/stimuli` | **Stimulus library** for this study (upload, metadata, modality, model name) |
| `/admin/studies/:studyId/settings` | **Study settings** — name, description, active, future: participant URL, consent copy |
| `/admin/analytics` | **Global analytics** (optional) or entry point to “pick a study” |
| `/admin/studies/:studyId/analytics` | **Study-scoped analytics** (per-study dashboards) |
| `/admin/export` | **Export hub** (optional global) or only under `/admin/studies/:studyId/export` |
| `/admin/studies/:studyId/export` | **Export** responses for this study |

Exact paths can be adjusted; the important split is **dashboard vs studies list vs study workspace** and **analytics/export** as dedicated areas.

## What should appear on the admin home (`/admin`)

**Purpose:** orient the researcher and surface **actions**, not duplicate the full studies list.

Suggested content:

1. **Welcome / context** — one line: “Signed in as …” (can be minimal if also in top bar).
2. **Quick actions** (cards or buttons):
   - **Create study** → `/admin/studies/new` or open modal.
   - **View all studies** → `/admin/studies`.
   - **Open analytics** → `/admin/analytics` or latest study (optional).
3. **At a glance** (compact, not full table):
   - **Active studies** count (and optionally inactive count).
   - **Recent studies** (last 3–5 edited) with link to study workspace.
   - Optional: **Responses collected** (last 7 days) when data pipeline exists.
4. **Getting started** (empty state for first-time deployers): short checklist—create study → add trials → add stimuli → activate → share link.

**Avoid on home:** long scrollable list of every study (that belongs on **Studies**).

## Subpages and responsibilities

### Studies list (`/admin/studies`)

- Table or cards: name, status (active/inactive), last updated, trial count (when available).
- **Create study** CTA.
- Row actions: **Open** (workspace), **Duplicate** (future), **Archive** (future).

### Study workspace (`/admin/studies/:studyId`)

- **Header**: study name, status badge, primary actions (Activate/Deactivate, **Preview participant flow** when ready).
- **Tabs or sub-nav** (recommended):
  - **Overview** — short description, status, links to trials/stimuli/analytics.
  - **Trials** — ordered list; add/edit/remove; forced-choice vs single-item; assign stimulus pairs or single stimulus.
  - **Stimuli** — upload/manage assets; modality/model metadata.
  - **Analytics** — study-specific metrics.
  - **Export** — download anonymized data for this study.
  - **Settings** — rename, description, delete study (with confirmation).

### Analytics (`/admin/analytics` and/or per-study)

- **Global**: list studies → pick one → same widgets as study analytics, or aggregate (future).
- **Per study**: accuracy, confidence, calibration, breakdowns by modality/model, demographics (when collected).

### Export (`/admin/export` or per-study)

- Format (CSV/JSON), **scope** (study), date range (future), **PII warning** (should be none for anonymized export).
- Download history (optional, future).

## Navigation behavior

- **Sidebar** items (example order):
  1. **Dashboard** → `/admin`
  2. **Studies** → `/admin/studies`
  3. **Analytics** → `/admin/analytics` (or disabled until MVP)
  4. **Export** → `/admin/export` or merged under Studies until needed
- Selecting a study from the list **navigates** to `/admin/studies/:studyId` (study workspace), not the dashboard.
- **Login** remains `/admin/login`; unauthenticated users redirect to login for any `/admin/*` except login.

## Implementation notes (frontend)

- **Done:** Nested routes with `Outlet` — `AdminLayout` wraps `/admin` and `/admin/studies`; sidebar links use `NavLink`.
- **Done:** Dashboard at **`/admin`** (`AdminDashboardHome`) — quick actions + stats + recent studies; **Studies** at **`/admin/studies`** (`AdminStudiesPage`) — create form + full list.
- **Next:** Study workspace (`/admin/studies/:studyId`), analytics and export routes, optional `/admin/studies/new` if create moves to a dedicated page.

## Related

- [Experiment config](experiment-config.md)
- [Admin panel analytics](analytics.md)
- [Data export](data-export.md)
- [Frontend architecture](../architecture/frontend.md)
