# Backend Architecture

Node.js + Express REST API in the `backend/` directory. Initialized with `npm init -y`; dependencies added via `package.json` and `npm install`.

## Stack

- Node.js + Express.
- REST API; consistent response shape: `{ success, data, error }`.
- Environment-based config; secrets via `.env` (never committed). See `backend/.env.example`.

## Current Structure

- **Entry**: `backend/index.js` — creates Express app, mounts route modules, starts server.
- **DB module**: `src/db.js` — shared PostgreSQL pool using `DATABASE_URL`.
- **Routes**: `routes/health.js` (GET /health), `routes/studies.js` (GET /studies), `routes/participant.js` (public participant study flow, participants, responses, results), `routes/adminAuth.js` (login/me), `routes/adminStudies.js` (admin study CRUD, trials), `routes/adminStimuli.js` (admin stimuli list/create).
- **Middleware**: `middleware/requireAdminSession.js` — Bearer token check for admin routes.
- **Session storage (MVP)**: `src/adminSessions.js` keeps in-memory bearer token sessions for local development.
- **Migrations**: `migrations/` managed via `node-pg-migrate` scripts in `backend/package.json`.
- **Planned**: persist auth sessions (or JWT), export, analytics endpoints; participant media URLs from S3 as needed.

## Conventions

- Validation and sanitization on all inputs; parameterized DB queries; CORS and rate limiting as needed.
- S3 access via pre-signed URLs for secure media delivery.

## Related

- [Overview](overview.md)
- [API Endpoints](../api/endpoints.md)
- [Database](database.md)
- [Database migrations](../deployment/database-migrations.md)
