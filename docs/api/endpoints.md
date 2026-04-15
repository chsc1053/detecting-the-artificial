# API Endpoints

Reference for HTTP routes implemented by the backend.

## Conventions

- RESTful HTTP methods (GET, POST, PUT, DELETE).
- Response format: `{ success: boolean, data?: T, error?: string }`.
- Appropriate status codes: 200, 201, 400, 401, 404, 500.

## Implemented

### GET /health

**Description:** Liveness/readiness for load balancers and local checks.

**Authentication:** None.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2025-03-04T12:00:00.000Z"
  }
}
```

---

### GET /studies

**Description:** List studies available to participants from PostgreSQL.

**Authentication:** None.

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Pilot Mixed Modality Study",
      "description": "Initial pilot with mixed forced-choice and single-item trials.",
      "is_active": true,
      "demographics_mandatory": false,
      "created_at": "2026-03-04T12:00:00.000Z",
      "updated_at": "2026-03-04T12:00:00.000Z"
    }
  ]
}
```

---

### POST /admin/auth/login

**Description:** Authenticate an experimenter/admin user and create a development session token.

**Authentication:** None.

**Request Body:**

```json
{
  "email": "researcher@example.com",
  "password": "plaintext-password"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "token": "session-token",
    "experimenter": {
      "id": "uuid",
      "email": "researcher@example.com",
      "last_login_at": "2026-03-31T12:00:00.000Z",
      "activity_since": "2026-03-30T09:15:00.000Z"
    }
  }
}
```

- `last_login_at` — time of **this** successful login (ISO 8601).
- `activity_since` — `last_login_at` from before this login (nullable). The dashboard uses it as the start of “since your last sign-in”. On a first sign-in it is `null`.

**Error Responses:**

- `400`: Missing email/password
- `401`: Invalid credentials
- `500`: Login failed

---

### GET /admin/me

**Description:** Validate admin bearer token and return the signed-in experimenter.

**Authentication:** Bearer token (`Authorization: Bearer <token>`).

**Response (200):**

```json
{
  "success": true,
  "data": {
    "experimenter": {
      "id": "uuid",
      "email": "researcher@example.com",
      "last_login_at": "2026-03-31T12:00:00.000Z",
      "activity_since": "2026-03-30T09:15:00.000Z"
    }
  }
}
```

Same fields as login response for this session (including `activity_since` when present).

**Error Responses:**

- `401`: Missing/invalid token

---

### GET /admin/dashboard/activity

**Description:** Aggregated activity for the signed-in experimenter’s **current session window**: from `activity_since` (previous `last_login_at` at login) through now. If `activity_since` was `null` at login, counts run from `experimenters.created_at` instead (`window_key`: `since_account_created`).

**Authentication:** Bearer token.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "window_key": "since_last_login",
    "since": "2026-03-30T09:15:00.000Z",
    "responses_total": 12,
    "participants_started": 4,
    "active_studies_with_responses": 2,
    "median_confidence": 3.5,
    "participants_with_demographics": 3,
    "responses_by_study": [
      { "study_id": "uuid", "study_name": "Pilot", "response_count": 10 }
    ]
  }
}
```

- `active_studies_with_responses` — distinct **active** studies that received at least one response in the window.
- `median_confidence` — median of `responses.confidence` in the window (`null` if no responses).
- `participants_with_demographics` — participants started in the window with at least one demographic field saved (age, location, education, or AI literacy).

`window_key` is `since_last_login` or `since_account_created`. `responses_by_study` is ordered by count (max 8 rows).

**Errors:** `401`, `500`

---

### GET /admin/analytics

**Description:** Analytics over **all studies** or **one study**. Optional time filter on `responses.created_at`. Only rows with `is_correct` NOT NULL (scored correct/incorrect) are included; unscored responses are omitted.

**Authentication:** Bearer token.

**Query:**

- `from` and `to` — ISO 8601 timestamps (optional). Omit both for **all time**.
- `study_id` — UUID of a study (optional). Omit or empty for **all studies**. Invalid UUID → **400** `invalid study id`. Unknown id → **404** `study not found`.

**Response (200):** `{ success, data }` with **range** (`from`, `to`, `all_time`), **filter** (`study_id`, `all_studies`), plus:

- **summary** — `response_count`, `participant_count`, `study_count`, `trial_count`, `avg_confidence`, `median_confidence`, `correct_count`, `incorrect_count` (scored responses only)
- **by_study**, **by_task_type**, **by_modality** — aggregate counts and (where noted) avg confidence per slice
- **by_modality_task_type** — per modality × task type: counts + **accuracy_pct**
- **by_modality_task_type_confidence** — per modality × task type: **mean_confidence**
- **confusion_matrix_by_modality** — per core modality (`text` / `image` / `audio` / `video`): AI vs human ground truth × response counts (`true_ai_pred_ai`, etc.) and **n**
- **demographics_participants_by_education**, **demographics_participants_by_ai_exposure** — participant counts per bucket
- **demographics_participants_omitted_count** — participants with responses in range but no demographics saved
- **demographics_accuracy_by_education_modality**, **demographics_accuracy_by_ai_exposure_modality** — accuracy-style breakdowns × modality
- **demographics_confidence_by_education_modality**, **demographics_confidence_by_ai_exposure_modality** — mean confidence × modality
- **demographics_accuracy_confidence_by_age** — per age: response counts, correct/incorrect, mean confidence
- **by_confidence** — histogram `confidence` → `count`
- **by_education**, **by_ai_literacy** — response-level aggregates by demographic bucket
- **demographics_coverage** — `response_with_participant`, `responses_linked_to_any_demographic`

**Errors:** `400`, `401`, `404`, `409`, `500`

**Conflict:** `409` with `code: "analytics_data_integrity"` when the filtered slice includes a scored response from a participant who **did not complete every trial** in their study, or (for a study with `demographics_mandatory`) a participant with **no demographic fields** saved. The UI directs experimenters to **Delete invalid responses** on the affected study’s Responses tab.

**Related (no extra route):** **Analytics print / PDF** is generated in the browser from `/admin/analytics` (print stylesheet only; same query params as on-screen filters). See [data export](../features/data-export.md).

---

### GET /admin/analytics/performance

**Description:** **Performance** metrics for the same filters as `GET /admin/analytics`: scored responses only, optional `from` / `to`, optional `study_id`.

**Authentication:** Bearer token.

**Query:** Same as `GET /admin/analytics` (`from`, `to`, `study_id`).

**Response (200):** `{ success, data: { range, filter, n_scored, overall_accuracy_pct, forced_choice_accuracy_pct, single_item_accuracy_pct, mean_confidence, confidence_accuracy_correlation, d_prime, sdt, scatter_rows, confidence_box_by_outcome, accuracy_heatmap_task_modality } }`

- **overall_accuracy_pct** / **forced_choice_accuracy_pct** / **single_item_accuracy_pct** — integers 0–100 or `null` when undefined (e.g. no responses of that task type).
- **mean_confidence** — mean rating 1–5, 3 decimal places, or `null`.
- **confidence_accuracy_correlation** — point-biserial *r*, 4 decimal places, or `null`.
- **d_prime** — SDT sensitivity (standard normal), 4 decimal places, or `null` when not computable (e.g. no human-target trials for FA).
- **sdt** — `hits`, `misses`, `false_alarms`, `correct_rejections`, `n_signal`, `n_noise`, `hit_rate`, `false_alarm_rate` (rates 4 decimals or `null`).
- **scatter_rows** — per-response points: `response_id`, `participant_id`, `confidence`, `is_correct`, `modality`.
- **confidence_box_by_outcome** — `{ correct, incorrect }` each with box stats (`n`, `min`, `q1`, `median`, `q3`, `max`) or `null` when empty.
- **accuracy_heatmap_task_modality** — rows: `task_type`, `modality`, `n_scored`, `n_correct`, `n_incorrect`, `accuracy_pct`.

*d′* uses **jStat** `normal.inv` on hit and false-alarm rates after a **0.5/n** bound away from 0 and 1.

**Errors:** `400`, `401`, `404`, `409`, `500` — same `analytics_data_integrity` `409` as `GET /admin/analytics`.

---

### POST /admin/studies

**Description:** Create a new study (experimenter only).

**Authentication:** Bearer token (`Authorization: Bearer <token>`).

**Request Body:**

```json
{
  "name": "My study",
  "description": "Optional description",
  "is_active": false,
  "demographics_mandatory": false
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "My study",
    "description": "Optional description",
    "is_active": false,
    "demographics_mandatory": false,
    "created_at": "2026-03-04T12:00:00.000Z",
    "updated_at": "2026-03-04T12:00:00.000Z"
  }
}
```

**Error Responses:**

- `400`: Missing or invalid `name`
- `401`: Missing/invalid token
- `500`: Failed to create study

---

### GET /admin/studies/:studyId

**Description:** Fetch one study by UUID.

**Authentication:** Bearer token.

**Response (200):** `{ "success": true, "data": { ...study row } }`

**Error Responses:** `400` invalid id, `404` not found, `401`, `500`

---

### PATCH /admin/studies/:studyId

**Description:** Update `name`, `description`, `is_active`, and/or `demographics_mandatory`.

**Authentication:** Bearer token.

**Request Body (at least one field):** `{ "name"?, "description"?, "is_active"?, "demographics_mandatory"? }`

**Response (200):** `{ "success": true, "data": { ...updated study } }`

**Conflict:** `409` with `code: "study_has_responses"` when the body sets `demographics_mandatory` from `false` to `true` while the study already has any `responses` rows. The experimenter must clear responses (see **DELETE** routes below) before requiring demographics.

---

### DELETE /admin/studies/:studyId

**Description:** Delete a study. Participants for that study are removed first; deleting the study cascades to `study_trials` and related `responses` per schema.

**Authentication:** Bearer token.

**Response (200):** `{ "success": true, "data": { "id": "uuid" } }`

**Errors:** `400` invalid study id, `404` study not found, `401` / `403` if not authenticated, `500` on failure.

---

### GET /admin/studies/:studyId/trials

**Description:** List trials for a study, ordered by `trial_index`.

**Authentication:** Bearer token.

**Response (200):** `{ "success": true, "data": [ ...trial rows ] }`

---

### POST /admin/studies/:studyId/trials

**Description:** Add a trial. If `trial_index` is omitted, the next index is used.

**Authentication:** Bearer token.

**Request Body:**

- Forced-choice: `{ "task_type": "forced_choice", "human_stimulus_id": "uuid", "ai_stimulus_id": "uuid", "trial_index"?: number }`
- Single-item: `{ "task_type": "single_item", "single_stimulus_id": "uuid", "trial_index"?: number }`

**Response (201):** `{ "success": true, "data": { ...trial row } }`

**Error Responses:** `400`, `404`, `401`, `409`, `500`

**Conflict (`409`):** `code: "study_has_responses"` when the study already has any `responses` rows (clear them on the **Responses** tab before adding a trial). Also `409` when `trial_index` duplicates an existing index for that study.

---

### DELETE /admin/studies/:studyId/trials/:trialId

**Description:** Delete one trial. Responses for that trial are removed (cascade). Remaining trials for the study are **renumbered** to consecutive indices `0 .. n-1` in the same order as before (by previous `trial_index`, then `created_at`, then `id`).

**Authentication:** Bearer token.

**Response (200):** `{ "success": true, "data": { "id": "trial uuid" } }`

**Errors:** `400` invalid id, `404` study or trial not found, `401`, `500`

---

### GET /admin/studies/:studyId/responses

**Description:** List all trial responses for a study, with `trial_index` / `task_type` from `study_trials` and optional demographics from `participants` (when present).

**Authentication:** Bearer token.

**Response (200):** `{ "success": true, "data": [ { id, study_id, trial_id, participant_id, choice_label, confidence, explanation, is_correct, created_at, trial_index, task_type, age, approx_location, education_level, ai_literacy } ] }`

**Errors:** `400` invalid study id, `404` study not found, `401` / `403` if not authenticated.

---

### DELETE /admin/studies/:studyId/responses

**Description:** Delete **all** `responses` rows for the study, then **all** `participants` rows for that study. Use before adding trials or turning on mandatory demographics when the study already had data.

**Authentication:** Bearer token.

**Response (200):** `{ "success": true, "data": { "responses_deleted": number, "participants_deleted": number } }`

**Errors:** `400` invalid study id, `404` study not found, `401`, `500`

---

### DELETE /admin/studies/:studyId/responses/invalid

**Description:** Delete responses (and then the participant rows) for participants who are **invalid** for analytics:

- **Incomplete session:** fewer distinct `trial_id` values in `responses` than the number of `study_trials` for that study (participant did not answer every trial).
- **Missing demographics:** study has `demographics_mandatory = true` and the participant row has no demographic fields saved (same “any demographic” rule as analytics coverage: `age`, or non-blank `approx_location`, or `education_level`, or `ai_literacy`).

**Authentication:** Bearer token.

**Response (200):** `{ "success": true, "data": { "responses_deleted": number, "participants_deleted": number, "participant_ids": uuid[] } }` — `participant_ids` lists removed participants (may be empty if nothing matched).

**Errors:** `400` invalid study id, `404` study not found, `401`, `500`

---

### GET /admin/stimuli

**Description:** List all stimuli (newest first by `created_at`).

**Authentication:** Bearer token.

**Response (200):** `{ "success": true, "data": [ { id, modality, source_type, storage_key, text_content, model_name, notes, created_at, updated_at } ] }`

---

### POST /admin/stimuli/upload/presign

**Description:** Prepare a **direct browser upload** of one media file to S3. Returns a short-lived **presigned PUT URL** and the **public HTTPS URL** to store in `storage_key` when creating an image, video, or audio stimulus. Requires S3 configuration on the server (`AWS_S3_BUCKET`, `AWS_REGION`, and credentials or an EC2/Elastic Beanstalk instance profile with `s3:PutObject` on `stimuli/*`).

**Authentication:** Bearer token.

**Request Body:**

```json
{
  "filename": "clip.mp4",
  "contentType": "video/mp4"
}
```

- `filename` — **required** (used for the S3 object suffix; path segments are stripped).
- `contentType` — optional; if omitted or not allowed, the server infers a type from the file extension. Allowed types include common image (`image/jpeg`, `image/png`, `image/webp`, `image/gif`), video (`video/mp4`, `video/quicktime`, `video/webm`), and audio (`audio/mpeg`, `audio/wav`, `audio/x-wav`, `audio/webm`, `audio/ogg`, `audio/mp4`) MIME types.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "uploadUrl": "https://...",
    "publicUrl": "https://...",
    "key": "stimuli/uuid-filename.ext",
    "contentType": "video/mp4"
  }
}
```

The client must **PUT** the raw file bytes to `uploadUrl` with header `Content-Type` exactly equal to `data.contentType`.

**Error Responses:**

- `400` — missing `filename`, or unsupported / unguessable content type
- `401` — missing/invalid token
- `503` — S3 not configured (`AWS_S3_BUCKET` / `AWS_REGION` missing)
- `500` — presign failure

**Related:** [AWS deployment](../deployment/aws-deployment.md) (bucket, IAM, CORS, public read).

---

### POST /admin/stimuli

**Description:** Create a stimulus. Text uses inline `text_content`. Image, video, and audio require a **media URL or key** in `storage_key` (participant UI treats `http`/`https` values as embeddable URLs) and a non-empty `model_name` (source / model description). `notes` is optional.

**Authentication:** Bearer token.

**Request Body:**

- **Text:** `{ "modality": "text", "source_type": "human"|"ai", "text_content": string, "model_name"?: string|null, "notes"?: string|null }` — `text_content` required (non-empty after trim).
- **Non-text:** `{ "modality": "image"|"video"|"audio", "source_type": "human"|"ai", "storage_key": string, "model_name": string, "notes"?: string|null }` — `storage_key` and `model_name` required (non-empty after trim).

**Response (201):** `{ "success": true, "data": { ...stimulus row } }`

---

### DELETE /admin/stimuli/:stimulusId

**Description:** Delete a stimulus if it is **not** referenced by any `study_trials` row (`human_stimulus_id`, `ai_stimulus_id`, or `single_stimulus_id`). Otherwise returns `409`.

**Authentication:** Bearer token.

**Response (200):** `{ "success": true, "data": { "id": "uuid" } }`

**Errors:** `400` invalid id, `404` not found, `409` in use in trials, `401`, `500`

---

## Participant (public, no auth)

Base path: `/participant` (e.g. dev: `http://localhost:3000/participant/...`).

### GET /participant/active-studies

**Description:** Active studies for the participant home (with per–task-type trial counts).

**Response (200):** `{ "success": true, "data": [ { id, name, description, created_at, trial_counts: { forced_choice, single_item }, trial_total } ] }`

---

### GET /participant/studies/:studyId/intro

**Description:** Study metadata for the consent/intro screen (`demographics_mandatory`, trial counts). Fails if study inactive.

**Response (200):** `{ "success": true, "data": { id, name, description, demographics_mandatory, trial_counts, trial_total } }`

**Errors:** `400` invalid id, `403` inactive, `404` not found

---

### GET /participant/studies/:studyId/trials

**Description:** Ordered trials with stimulus payloads (`modality`, `text_content`, `storage_key`, etc.) for rendering.

**Response (200):** `{ "success": true, "data": [ { id, trial_index, task_type, stimuli: { human?, ai? } | { single? } } ] }`

---

### POST /participant/participants

**Description:** Create a participant session for an active study.

**Request Body:** `{ "study_id": "uuid" }`

**Response (201):** `{ "success": true, "data": { id, study_id, created_at } }`

---

### POST /participant/responses

**Description:** Record one trial answer.

**Request Body:** `{ "participant_id", "trial_id", "choice_label": "human"|"ai", "confidence": 1-5, "explanation"?: string }`

**Response (201):** `{ "success": true, "data": { id, is_correct, created_at } }`

---

### PATCH /participant/participants/:participantId/demographics

**Description:** Save demographics (age, location, education, AI literacy).

**Request Body:** `{ "age"?, "approx_location"?, "education_level"?, "ai_literacy"? }` (nulls allowed)

---

### DELETE /participant/participants/:participantId/session

**Description:** When `demographics_mandatory` is true and the participant skips demographics, discard all responses and the participant row (responses cannot be used for research).

**Errors:** `400` if demographics are not mandatory for the study

---

### GET /participant/participants/:participantId/results

**Description:** Per-trial correctness and summary analytics for a completed session (responses still present).

---

## Related

- [Backend architecture](../architecture/backend.md)
- [Response collection](../features/response-collection.md)

