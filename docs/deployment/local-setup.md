# Local Development Setup

## Prerequisites

- Node.js 18+
- npm (or pnpm)
- PostgreSQL (local installation or local Docker container)

(S3 comes later.)

## Backend

1. From repo root: `cd backend`
2. Install dependencies: `npm install`
3. Create local DB once (example): `createdb detecting_artificial_dev`.
4. Copy `backend/.env.example` to `backend/.env`.
5. Set `DATABASE_URL` in `backend/.env` (required), and optionally set `PORT` (default 3000).
6. Run migrations to create schema: `npm run migrate:up`.
7. (Optional verify) List tables: `psql "$DATABASE_URL" -c "\dt"`.
8. Run API: `npm run dev` (with `--watch`) or `npm start`.
9. Check health: `curl http://localhost:3000/health` → `{ "success": true, "data": { "status": "ok", ... } }`.
10. Check DB-backed studies endpoint: `curl http://localhost:3000/studies`.

### Migration workflow (backend)

- Create migration file: `npm run migrate:create -- migration_name`
- Apply pending migrations: `npm run migrate:up`
- Roll back latest migration: `npm run migrate:down`

### Environment variables (backend)

| Variable   | Purpose              | Required now |
|-----------|----------------------|--------------|
| `PORT`    | Server port          | No (default 3000) |
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `AWS_*`, `S3_BUCKET` | S3/media | Later |

Never commit `.env` or real secrets; use `.env.example` as a template.

## Frontend

1. From repo root: `cd frontend`
2. Install: `npm install`
3. Run: `npm run dev` — dev server (default http://localhost:5173).
4. Build: `npm run build`; preview: `npm run preview`.

**Dev proxy:** In development, requests from the frontend to `/api/*` are proxied to the backend (see `frontend/vite.config.js`). So the app calls e.g. `fetch('/api/health')`; Vite forwards to `http://localhost:3000/health`. Run the backend while developing the frontend so the "Backend: connected" status shows.

## Related

- [AWS deployment](aws-deployment.md)
- [CI/CD](cicd.md)
- [Database migrations](database-migrations.md)
