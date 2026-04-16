# Database Migrations

This project uses `node-pg-migrate` to version and apply PostgreSQL schema changes.

## Where migrations live

- Directory: `backend/migrations/`
- Initial migration: `1774035560378_init-schema.js` (creates core tables and enums)
- `1775000000000_add-demographics-mandatory-to-studies.js` — adds `studies.demographics_mandatory`
- `1775100000000_add-last-login-at-to-experimenters.js` — adds `experimenters.last_login_at`

## Prerequisites

- Local PostgreSQL running.
- `backend/.env` with a valid `DATABASE_URL`.

## Commands

Run these from `backend/`:

- Create migration file: `npm run migrate:create -- migration_name`
- Apply pending migrations: `npm run migrate:up`
- Roll back latest migration: `npm run migrate:down`

## Typical local flow

1. Create local DB: `createdb detecting_artificial_dev`
2. Set `DATABASE_URL` in `backend/.env`
3. Apply schema: `npm run migrate:up`
4. Verify tables: `psql "$DATABASE_URL" -c "\dt"`

## Notes

- Migration history is tracked in PostgreSQL table `pgmigrations`.
- Commit migration files to git so every environment can reproduce the same schema.
- Never edit an already-applied migration in shared history; create a new migration for incremental changes.

## RDS / Elastic Beanstalk (production)

Running `npm run migrate:up` from local environment against an RDS instance that is **only reachable inside the VPC** will fail (`ENETUNREACH` to the private IP). Typical options:

1. **Temporary access:** allow your IP on the RDS security group for port `5432`, and (if needed) set RDS **Public access** to **Yes** only long enough to migrate, then remove the rule and set Public access back to **No**.
2. **Run migrations from a host inside the VPC** (e.g. a bastion, or a one-off CI job with a secret `DATABASE_URL`).

RDS often requires TLS. If you see certificate errors when connecting with `node`/`pg`, add query parameters to `DATABASE_URL`, for example `?sslmode=no-verify` for a short-lived lab deploy, or stricter modes for production per your security requirements.

After migrations, the API EB environment should use the **same** `DATABASE_URL` (including SSL parameters) in Elastic Beanstalk **environment properties**.
