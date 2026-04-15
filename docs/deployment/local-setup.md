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

### Admin auth setup (local MVP)

Bcrypt hashes look like `$2b$10$...`. In bash, **do not** put that string inside a double-quoted `psql -c "..."` — bash will expand **`$2`**, **`$10`**, etc. and **destroy the hash** (Postgres may store only a few characters; login then always fails).

**Use a quoted heredoc** so the hash is passed through unchanged: `<<'SQL'` (the quotes around `SQL` are required).

1. **Generate a hash** (from `backend/`):

   ```bash
   node -e "const b=require('bcryptjs'); b.hash('change-me-password', 10).then(h=>console.log('len',h.length, h))"
   ```

   Expect **len 60** and a prefix **`$2a$`**, **`$2b$`**, or **`$2y$`**.

2. **Point `psql` at your DB** — same URL as `DATABASE_URL` in `backend/.env`. If your shell has no `DATABASE_URL`, export it first or substitute the URL in place of `"$DATABASE_URL"` below.

3. **Insert or upsert the experimenter** — replace the email and paste the **full** hash from step 1 in place of the placeholder:

   ```bash
   psql "$DATABASE_URL" <<'SQL'
   INSERT INTO experimenters (email, password_hash)
   VALUES (
     'researcher@example.com',
     'complete_60_character_hash_from_step_1'
   )
   ON CONFLICT (email) DO UPDATE
   SET password_hash = EXCLUDED.password_hash;
   SQL
   ```

   `ON CONFLICT` updates `password_hash` if that email already exists (handy after a bad paste).

4. **Verify** (double-quoted `-c` is safe here — no `$` in the SQL):

   ```bash
   psql "$DATABASE_URL" -c "SELECT length(password_hash), left(password_hash, 7) FROM experimenters WHERE email = 'researcher@example.com';"
   ```

5. **Login test:**

   ```bash
   curl -X POST http://localhost:3000/admin/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"researcher@example.com","password":"change-me-password"}'
   ```

**If login still says “invalid credentials”:** Confirm step 4 shows a ~60-character hash. If not, repeat step 3 with a heredoc only — never a double-quoted `-c` that embeds the bcrypt string.

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
