# Local Development Setup

## Prerequisites

- Node.js 18+
- npm (or pnpm)

(PostgreSQL and S3 come later.)

## Backend

1. From repo root: `cd backend`
2. Install dependencies: `npm install`
3. Optional: copy `backend/.env.example` to `backend/.env` and set `PORT` if needed (default 3000).
4. Run: `npm run dev` (with `--watch`) or `npm start`.
5. Check: `curl http://localhost:3000/health` → `{ "success": true, "data": { "status": "ok", ... } }`.

### Environment variables (backend)

| Variable   | Purpose              | Required now |
|-----------|----------------------|--------------|
| `PORT`    | Server port          | No (default 3000) |
| `DATABASE_URL` | PostgreSQL URL  | Later |
| `AWS_*`, `S3_BUCKET` | S3/media | Later |

Never commit `.env` or real secrets; use `.env.example` as a template.

## Frontend

(To be added when the React app exists.)

## Related

- [AWS deployment](aws-deployment.md)
- [CI/CD](cicd.md)
