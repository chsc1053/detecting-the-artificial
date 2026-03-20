# Backend Architecture

Node.js + Express REST API in the `backend/` directory. Initialized with `npm init -y`; dependencies added via `package.json` and `npm install`.

## Stack

- Node.js + Express.
- REST API; consistent response shape: `{ success, data, error }`.
- Environment-based config; secrets via `.env` (never committed). See `backend/.env.example`.

## Current Structure

- **Entry**: `backend/index.js` — creates Express app, mounts route modules, starts server.
- **DB module**: `src/db.js` — shared PostgreSQL pool using `DATABASE_URL`.
- **Routes**: `routes/health.js` (GET /health), `routes/studies.js` (GET /studies from PostgreSQL).
- **Migrations**: `migrations/` managed via `node-pg-migrate` scripts in `backend/package.json`.
- **Planned**: study/trial CRUD, stimuli and responses endpoints, auth for admin panel, export, analytics endpoints.

## Conventions

- Validation and sanitization on all inputs; parameterized DB queries; CORS and rate limiting as needed.
- S3 access via pre-signed URLs for secure media delivery.

## Related

- [Overview](overview.md)
- [API Endpoints](../api/endpoints.md)
- [Database](database.md)
- [Database migrations](../deployment/database-migrations.md)
