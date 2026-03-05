# Backend Architecture

Node.js + Express REST API in the `backend/` directory. Initialized with `npm init -y`; dependencies added via `package.json` and `npm install`.

## Stack

- Node.js + Express.
- REST API; consistent response shape: `{ success, data, error }`.
- Environment-based config; secrets via `.env` (never committed). See `backend/.env.example`.

## Current Structure

- **Entry**: `backend/index.js` — creates Express app, mounts route modules, starts server.
- **Routes**: `routes/health.js` (GET /health), `routes/studies.js` (GET /studies, placeholder).
- **Planned**: DB-backed studies, stimuli, responses, admin/auth, export.

## Conventions

- Validation and sanitization on all inputs; parameterized DB queries; CORS and rate limiting as needed.
- S3 access via pre-signed URLs for secure media delivery.

## Related

- [Overview](overview.md)
- [API Endpoints](../api/endpoints.md)
- [Database](database.md)
