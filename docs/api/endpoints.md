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

## Planned Endpoints

- **Studies**: get single study by ID; CRUD and trial management from admin panel (authenticated).
- **Stimuli**: list stimuli for a study; media URLs (e.g. pre-signed); upload from admin panel (authenticated).
- **Responses**: `POST /api/responses` — submit participant response (see AGENTS.md for request/response example).
- **Admin panel** (all authenticated): study/trial CRUD, stimulus upload, data export, analytics (automated from stored data).

## Related

- [Backend architecture](../architecture/backend.md)
- [Response collection](../features/response-collection.md)
