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

### GET /admin/stimuli

**Description:** List stimuli (newest first, capped).

**Authentication:** Bearer token.

**Response (200):** `{ "success": true, "data": [ ... ] }`

---

### POST /admin/stimuli

**Description:** Create a stimulus (MVP: text stimuli with `text_content`).

**Authentication:** Bearer token.

**Request Body:** `{ "modality": "text"|"image"|"video"|"audio", "source_type": "human"|"ai", "text_content"?: string, ... }`

**Response (201):** `{ "success": true, "data": { ...stimulus row } }`

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

- **Admin responses (per study):** e.g. `GET /admin/studies/:studyId/responses` — list/filter for the **Responses** tab (UI placeholder until implemented).
- **Studies**: delete study.
- **Stimuli**: media upload to S3; pre-signed URLs; non-text modalities.
- **Admin panel**: data export, analytics (automated from stored data).

## Related

- [Backend architecture](../architecture/backend.md)
- [Response collection](../features/response-collection.md)
