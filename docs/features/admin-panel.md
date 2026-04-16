# Admin Panel (Information Architecture)

Single **experimenter / admin** surface: authenticated, used to configure studies, run research, review analytics, and download response data. This document defines **what lives where** so navigation and routing stay coherent as we build.

## Design principles

- **Home = overview**, not a long configuration surface. Quick status, shortcuts, and recent activity—not the full studies table by default.
- **Deep work happens in context**: editing a study, its trials, and stimuli is scoped under **that study** (study workspace).
- **Analytics** and **per-study response export (CSV)** are first-class workflows (researchers return here often).
- **One primary navigation pattern**: persistent **sidebar** on desktop; **top bar + drawer** (or collapsible sidebar) on small screens.

## Global chrome (all authenticated admin routes)

- **Side navigation** (primary, fixed on wide viewports while main content scrolls): product name + “Admin”, **signed-in email** under the brand, nav links, **Sign out** at the bottom of the sidebar. No separate top bar.
- **Breadcrumbs** (recommended on nested pages): e.g. `Studies > [Study name] > Trials` in page content to reduce disorientation.

## First-time experimenter account

When the `experimenters` table has **no rows**, `/admin/login` shows a **one-time** form to create the first account (email + password). After any experimenter exists, only normal sign-in is shown. Setup and reset steps are documented in [Local setup](../deployment/local-setup.md).

## Route map (conceptual)

| Path | Purpose |
|------|---------|
| `/admin` | **Admin home** (dashboard) |
| `/admin/analytics` | **Analytics** — same page for **all studies** or **one study** (study scope selector); Recharts tabs: overview, performance, modalities, demographics |
| `/admin/studies` | **Studies list** — browse/search all studies; create new study (from list; no dedicated `/new` route) |
| `/admin/stimuli` | **Global stimulus library** — create and list stimuli (all modalities); reused across studies |
| `/admin/studies/:studyId` | **Study workspace** — overview + tabs for trials, stimuli pointer, responses |
| `/admin/studies/:studyId/trials` | **Trials** for this study (order, types, links to stimuli; any modality) |
| `/admin/studies/:studyId/stimuli` | **Stimuli** — shortcut copy + link to **`/admin/stimuli`** (no per-study-only library) |
| `/admin/studies/:studyId/responses` | **Responses** — table of trial responses, trial filter, **Download CSV** (client-side export) |
Exact paths can be adjusted; the important split is **dashboard vs studies list vs study workspace** and **analytics** (plus **Responses → CSV** per study).

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
  - **Responses** — live data from `GET /admin/studies/:studyId/responses`; filter by trial; **Download CSV**; **Delete invalid responses** (incomplete sessions + missing demographics when mandatory); **Delete all responses** (clears participants too). Needed before adding trials or turning on mandatory demographics if data already exists; Analytics returns `409` until invalid mixing is removed.
  - **Overview** — study metadata and demographics flag; link to **Analytics** scoped to this study (`/admin/analytics?study_id=…`).

### Analytics (`/admin/analytics`)

- **All studies** or **one study**: use **Study scope** on the analytics page (no separate study-workspace analytics tab).
- Charts: overview, performance, modalities, demographics — see [analytics](analytics.md).

### Export

- **Responses CSV** — per study, from the study workspace **Responses** tab (**Download CSV**); see [data export](data-export.md).
- **Analytics PDF / print** — **Print / PDF** on **Analytics** (`/admin/analytics`): browser print or save as PDF for the **current tab**; see [data export](data-export.md).

## Navigation behavior

- **Sidebar** items (implemented order):
  1. **Dashboard** → `/admin`
  2. **Stimuli** → `/admin/stimuli`
  3. **Studies** → `/admin/studies`
  4. **Analytics** → `/admin/analytics` (cross-study or per-study via scope; optional deep link `?study_id=` from study Overview)
- Selecting a study from the list **navigates** to `/admin/studies/:studyId` (study workspace), not the dashboard.
- **Login** remains `/admin/login`; unauthenticated users redirect to login for any `/admin/*` except login.

## Implementation notes (frontend)

- **Done:** Nested routes with `Outlet` — `AdminLayout` wraps authenticated admin routes; sidebar **Dashboard**, **Stimuli**, **Studies**, **Analytics** use `NavLink`.
- **Done:** Dashboard at **`/admin`** — **Since your last sign-in** (`GET /admin/dashboard/activity`, window from `activity_since` in session set at login), **Studies at a glance** + **Stimuli at a glance** (side by side on wide viewports), **Recent studies**; no separate quick-action card (use sidebar). **Studies** at **`/admin/studies`** — create form + list with **Edit** / **Delete**; **`DELETE /admin/studies/:studyId`** removes participants then the study (cascading trials/responses).
- **Done:** **Global Stimuli** at **`/admin/stimuli`** — modality tabs, create text (inline) or image/video/audio via **media URL** + source description; list with previews (`StimulusItemCard`). Study workspace **`stimuli`** tab is explanatory + link only.
- **Done:** Study workspace **`/admin/studies/:studyId`** — `overview`, `stimuli` (link), **`trials`** (all modalities in dropdowns), **`responses`** (table + filter + CSV; `GET /admin/studies/:studyId/responses`). Backend: `GET/PATCH/DELETE /admin/studies/:id`, `GET/POST .../trials`, `GET .../responses`, `GET/POST /admin/stimuli`.
- **Done:** **Analytics** at **`/admin/analytics`** — `GET /admin/analytics` + `GET /admin/analytics/performance`; all-time or custom date range; **Study scope** for all studies or one study; **Overview**, **Performance**, **Modalities**, and **Demographics** tabs with Recharts (see [analytics](analytics.md)). **Responses** tab labels unscored rows and notes they are excluded from global analytics.
- **Done:** Analytics **Print / PDF** — browser print / save as PDF for the active tab; print CSS (layout, colors, page breaks, credit footer); see [data export](data-export.md).
- **Next (infra, last):** S3 upload and pre-signed URLs for stimulus media when AWS is ready (see [stimulus delivery](stimulus-delivery.md)).

## Related

- [Experiment config](experiment-config.md)
- [Admin panel analytics](analytics.md)
- [Data export](data-export.md)
- [Frontend architecture](../architecture/frontend.md)
