# API Endpoints

(To be updated as endpoints are added.)

## Conventions

- RESTful HTTP methods (GET, POST, PUT, DELETE).
- Response format: `{ success: boolean, data?: T, error?: string }`.
- Appropriate status codes: 200, 201, 400, 401, 404, 500.

## Planned Endpoints

- **Health**: `GET /health` — liveness/readiness.
- **Studies**: list/read studies (public or by ID for participants).
- **Stimuli**: list stimuli for a study; media URLs (e.g. pre-signed).
- **Responses**: `POST /api/responses` — submit participant response (see AGENTS.md for request/response example).
- **Admin**: study CRUD, stimulus upload, data export (authenticated).

## Related

- [Backend architecture](../architecture/backend.md)
- [Response collection](../features/response-collection.md)
