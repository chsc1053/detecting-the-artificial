# Admin Panel (Information Architecture)

Single **experimenter / admin** surface: authenticated, used to configure studies, run research, review analytics, and export data. This document defines **what lives where** so navigation and routing stay coherent as we build.

## Design principles

- **Home = overview**, not a long configuration surface. Quick status, shortcuts, and recent activity—not the full studies table by default.
- **Deep work happens in context**: editing a study, its trials, and stimuli is scoped under **that study** (study workspace).
- **Analytics and export** are first-class areas (researchers return here often).
- **One primary navigation pattern**: persistent **sidebar** on desktop; **top bar + drawer** (or collapsible sidebar) on small screens.

## Global chrome (all authenticated admin routes)

- **Side navigation** (primary, fixed on wide viewports while main content scrolls): product name + “Admin”, **signed-in email** under the brand, nav links, **Sign out** at the bottom of the sidebar. No separate top bar.
- **Breadcrumbs** (recommended on nested pages): e.g. `Studies > [Study name] > Trials` in page content to reduce disorientation.

## Route map (conceptual)

| Path | Purpose |
|------|---------|
| `/admin` | **Admin home** (dashboard) |
| `/admin/studies` | **Studies list** — browse/search all studies; create new study |
| `/admin/studies/new` | **Create study** (or modal from list; route optional) |
| `/admin/stimuli` | **Global stimulus library** — create and list stimuli (all modalities); reused across studies |
| `/admin/studies/:studyId` | **Study workspace** — overview + tabs for trials, stimuli pointer, responses |
| `/admin/studies/:studyId/trials` | **Trials** for this study (order, types, links to stimuli; any modality) |
| `/admin/studies/:studyId/stimuli` | **Stimuli** — shortcut copy + link to **`/admin/stimuli`** (no per-study-only library) |
| `/admin/studies/:studyId/responses` | **Responses** — table of trial responses, trial filter, **Download CSV** (client-side export) |
| `/admin/studies/:studyId/settings` | **Study settings** — name, description, active, future: participant URL, consent copy |
| `/admin/analytics` | **Global analytics** (optional) or entry point to “pick a study” |
| `/admin/studies/:studyId/analytics` | **Study-scoped analytics** (per-study dashboards) |
| `/admin/export` | **Export hub** (optional global) or only under `/admin/studies/:studyId/export` |
| `/admin/studies/:studyId/export` | **Export** responses for this study |

Exact paths can be adjusted; the important split is **dashboard vs studies list vs study workspace** and **analytics/export** as dedicated areas.

## What should appear on the admin home (`/admin`)

**Purpose:** orient the researcher with compact **snapshots**, not duplicate full lists.

Implemented / suggested content:

1. **Lead** — short copy with links to **Stimuli** and **Studies** in the sidebar (same order as nav).
2. **Since your last sign-in** — from the previous `last_login_at` through now (`GET /admin/dashboard/activity`): new responses and participant sessions; active studies with new responses; median confidence; demographics capture rate; responses by study (links to **Responses**). First sign-in uses `experimenters.created_at` as the window start.
3. **Studies at a glance** — total studies, active count, inactive count (`GET /studies`).
4. **Stimuli at a glance** — total stimuli and counts by modality (`GET /admin/stimuli`).
5. **Recent studies** — up to five from the public studies list (same order as API) with **Edit** to workspace; link to view all on **Studies**.

Optional later: welcome line (“Signed in as …”), responses-in-7-days when analytics exist, getting-started checklist for empty deploys.

**Avoid on home:** long scrollable list of every study (that belongs on **Studies**).

## Subpages and responsibilities

### Studies list (`/admin/studies`)

- Table or cards: name, status (active/inactive), last updated, trial count (when available).
- **Create study** CTA.
- Row actions: **Open** (workspace via **Edit**), **Delete** study (with confirmation).

### Study workspace (`/admin/studies/:studyId`)

- **Header**: study name, status badge, primary actions (Activate/Deactivate, **Preview participant flow** when ready).
- **Tabs or sub-nav** (recommended):
  - **Overview** — short description, status, demographics flag, activate/deactivate, **delete study** (with confirmation), links to deeper tabs.
  - **Stimuli** — in-app pointer to the **global** Stimuli page (`/admin/stimuli`); all create/edit happens there.
  - **Trials** — ordered list; add/remove; forced-choice vs single-item; pick stimuli from the global library (all modalities).
  - **Responses** — live data from `GET /admin/studies/:studyId/responses`; filter by trial; CSV download.
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

- **Sidebar** items (implemented order):
  1. **Dashboard** → `/admin`
  2. **Stimuli** → `/admin/stimuli`
  3. **Studies** → `/admin/studies`
  - **Analytics** / **Export** global nav items are not wired yet (see [analytics](analytics.md), [data export](data-export.md)).
- Selecting a study from the list **navigates** to `/admin/studies/:studyId` (study workspace), not the dashboard.
- **Login** remains `/admin/login`; unauthenticated users redirect to login for any `/admin/*` except login.

## Implementation notes (frontend)

- **Done:** Nested routes with `Outlet` — `AdminLayout` wraps authenticated admin routes; sidebar **Dashboard**, **Stimuli**, **Studies** use `NavLink`.
- **Done:** Dashboard at **`/admin`** — **Since your last sign-in** (`GET /admin/dashboard/activity`, window from `activity_since` in session set at login), **Studies at a glance** + **Stimuli at a glance** (side by side on wide viewports), **Recent studies**; no separate quick-action card (use sidebar). **Studies** at **`/admin/studies`** — create form + list with **Edit** / **Delete**; **`DELETE /admin/studies/:studyId`** removes participants then the study (cascading trials/responses).
- **Done:** **Global Stimuli** at **`/admin/stimuli`** — modality tabs, create text (inline) or image/video/audio via **media URL** + source description; list with previews (`StimulusItemCard`). Study workspace **`stimuli`** tab is explanatory + link only.
- **Done:** Study workspace **`/admin/studies/:studyId`** — `overview`, `stimuli` (link), **`trials`** (all modalities in dropdowns), **`responses`** (table + filter + CSV; `GET /admin/studies/:studyId/responses`). Backend: `GET/PATCH/DELETE /admin/studies/:id`, `GET/POST .../trials`, `GET .../responses`, `GET/POST /admin/stimuli`.
- **Next:** S3 upload and pre-signed URLs; dedicated **Analytics** and **Export** areas/APIs; optional `/admin/studies/new`; study duplication/archival; separate **Settings** route if split from overview.

## Related

- [Experiment config](experiment-config.md)
- [Admin panel analytics](analytics.md)
- [Data export](data-export.md)
- [Frontend architecture](../architecture/frontend.md)
