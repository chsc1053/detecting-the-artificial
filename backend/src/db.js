/**
 * File: src/db.js
 * Purpose: Shared PostgreSQL connection pool for backend routes.
 * Dependencies: pg
 * Related: docs/architecture/backend.md, docs/deployment/local-setup.md
 */

const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};