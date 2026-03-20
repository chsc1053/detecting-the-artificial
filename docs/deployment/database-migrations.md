# Database Migrations

This project uses `node-pg-migrate` to version and apply PostgreSQL schema changes.

## Where migrations live

- Directory: `backend/migrations/`
- Initial migration: `1774035560378_init-schema.js` (creates core tables and enums)

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
