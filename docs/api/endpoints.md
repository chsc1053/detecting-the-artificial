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

**Description:** List studies available to participants. Placeholder: returns empty array until database is connected.

**Authentication:** None.

**Response (200):**

```json
{
  "success": true,
  "data": []
}
```

---

## Planned Endpoints

- **Studies**: get single study by ID; add CRUD for experimenters.
- **Stimuli**: list stimuli for a study; media URLs (e.g. pre-signed).
- **Responses**: `POST /api/responses` — submit participant response (see AGENTS.md for request/response example).
- **Admin**: study CRUD, stimulus upload, data export (authenticated).

## Related

- [Backend architecture](../architecture/backend.md)
- [Response collection](../features/response-collection.md)
