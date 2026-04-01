# API Endpoints

(To be updated as endpoints are added.)

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
      "email": "researcher@example.com"
    }
  }
}
```

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
      "email": "researcher@example.com"
    }
  }
}
```

**Error Responses:**
- `401`: Missing/invalid token

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

**Error Responses:** `400`, `404`, `409` duplicate `trial_index`, `401`, `500`

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

### GET /admin/stimuli

**Description:** List all stimuli (newest first by `created_at`).

**Authentication:** Bearer token.

**Response (200):** `{ "success": true, "data": [ { id, modality, source_type, storage_key, text_content, model_name, notes, created_at, updated_at } ] }`

---

### POST /admin/stimuli

**Description:** Create a stimulus. Text uses inline `text_content`. Image, video, and audio require a **media URL or key** in `storage_key` (participant UI treats `http`/`https` values as embeddable URLs) and a non-empty **`model_name`** (source / model description). `notes` is optional.

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

## Planned Endpoints

- **Stimuli**: authenticated upload to S3; issue pre-signed URLs for delivery (today, non-text stimuli use a URL or opaque key in `storage_key`; participants only auto-render media when `storage_key` is `http`/`https`).
- **Admin panel**: dedicated export API and analytics endpoints beyond the per-study responses CSV produced in the UI.

## Related

- [Backend architecture](../architecture/backend.md)
- [Response collection](../features/response-collection.md)
