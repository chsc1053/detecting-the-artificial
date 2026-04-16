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

### Admin auth — first account (recommended)

After migrations (`npm run migrate:up`), open **`http://localhost:5173/admin/login`** (with API running). If there are **no** experimenters yet, the page shows **One-time setup** — create the first account there. That calls `POST /api/admin/auth/bootstrap` and signs you in.


### Admin auth setup is one-time via UI

The supported flow is the one-time setup form on `/admin/login` when no experimenter exists.





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
5. Admin routes: open `http://localhost:5173/admin/login` and sign in with your experimenter credentials.

**Dev proxy:** In development, requests from the frontend to `/api/*` are proxied to the backend (see `frontend/vite.config.js`). For example, `fetch('/api/participant/active-studies')` is forwarded to the backend. Run the backend while developing the frontend so participant and admin API calls succeed.

The Vite proxy **strips** the `/api` prefix when forwarding to the API (same paths as the Express app: `/studies`, `/participant`, …). In production on AWS, the **web** container’s nginx does the same so browser code can keep using `/api/...` URLs.

## Docker (optional, mirrors AWS)

For a local smoke test of the same layout as Elastic Beanstalk:

1. **API:** from repo root, `docker build -t dta-api:local -f backend/Dockerfile backend` then run with `DATABASE_URL`, `AWS_REGION`, `AWS_S3_BUCKET`, etc. If port `3000` is busy, map another host port, e.g. `-p 3001:3000`.
2. **Web:** `cd frontend && npm ci && npm run build && cd ..` then `rm -rf web/dist && cp -R frontend/dist web/dist`, then `docker build -t dta-web:local -f web/Dockerfile web`. Run with `-e API_UPSTREAM=http://host.docker.internal:3001` (or the host port you chose) so nginx can proxy `/api/` to the API.

## Related

- [AWS deployment](aws-deployment.md)
- [CI/CD](cicd.md)
- [Database migrations](database-migrations.md)
