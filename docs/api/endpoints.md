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
  "is_active": false
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

**Description:** Update `name`, `description`, and/or `is_active`.

**Authentication:** Bearer token.

**Request Body (at least one field):** `{ "name"?, "description"?, "is_active"? }`

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

## Planned Endpoints

- **Admin responses (per study):** e.g. `GET /admin/studies/:studyId/responses` — list/filter participant responses for the **Responses** tab (UI placeholder at `/admin/studies/:studyId/responses` until implemented).
- **Studies**: delete study; study workspace routes beyond overview/trials.
- **Stimuli**: media upload to S3; pre-signed URLs; non-text modalities.
- **Responses**: `POST /api/responses` — submit participant response (see AGENTS.md for request/response example).
- **Admin panel** (all authenticated): study/trial CRUD, stimulus upload, data export, analytics (automated from stored data).

## Related

- [Backend architecture](../architecture/backend.md)
- [Response collection](../features/response-collection.md)
