/**
 * File: routes/adminAuth.js
 * Purpose: Admin authentication routes for login, one-time bootstrap, and current-user checks.
 * Dependencies: express, bcryptjs, ../src/db, ../src/adminSessions
 * Key: POST /auth/login, GET /auth/bootstrap-status, POST /auth/bootstrap, GET /me
 * Related: docs/api/endpoints.md, docs/architecture/backend.md
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../src/db');
const { createSession, getSession } = require('../src/adminSessions');
const { getBearerToken } = require('../middleware/requireAdminSession');

const router = express.Router();

const MIN_PASSWORD_LENGTH = 8;

router.get('/auth/bootstrap-status', async (_req, res) => {
  try {
    const result = await db.query(
      'SELECT COUNT(*)::int AS c FROM experimenters'
    );
    const count = result.rows[0]?.c ?? 0;
    const open = count === 0;
    return res.status(200).json({
      success: true,
      data: {
        open,
      },
    });
  } catch {
    return res.status(500).json({
      success: false,
      error: 'bootstrap status failed',
    });
  }
});

router.post('/auth/bootstrap', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'email and password are required',
    });
  }
  if (String(password).length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({
      success: false,
      error: `password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    });
  }
  const emailTrim = String(email).trim();
  if (!emailTrim) {
    return res.status(400).json({
      success: false,
      error: 'email is required',
    });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('LOCK TABLE experimenters IN EXCLUSIVE MODE');
    const lock = await client.query(
      'SELECT COUNT(*)::int AS c FROM experimenters'
    );
    if ((lock.rows[0]?.c ?? 0) > 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        error: 'bootstrap already completed',
      });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    const insert = await client.query(
      `INSERT INTO experimenters (email, password_hash, last_login_at, updated_at)
       VALUES (lower($1), $2, now(), now())
       RETURNING id, email, last_login_at`,
      [emailTrim, passwordHash]
    );
    await client.query('COMMIT');

    const row = insert.rows[0];
    const token = createSession({
      id: row.id,
      email: row.email,
      last_login_at: row.last_login_at,
      activity_since: null,
    });

    return res.status(201).json({
      success: true,
      data: {
        token,
        experimenter: {
          id: row.id,
          email: row.email,
          last_login_at: row.last_login_at,
          activity_since: null,
        },
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'email already in use',
      });
    }
    return res.status(500).json({
      success: false,
      error: 'bootstrap failed',
    });
  } finally {
    client.release();
  }
});

router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'email and password are required',
    });
  }

  try {
    const result = await db.query(
      `SELECT id, email, password_hash, last_login_at
       FROM experimenters
       WHERE lower(email) = lower($1)`,
      [email.trim()]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({
        success: false,
        error: 'invalid credentials',
      });
    }

    const experimenter = result.rows[0];
    const hash = String(experimenter.password_hash ?? '').trim();
    const isValidPassword = await bcrypt.compare(password, hash);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'invalid credentials',
      });
    }

    /** Timestamp before this login — used for “activity since last sign-in”. */
    const activitySince = experimenter.last_login_at;

    const loginRow = await db.query(
      `UPDATE experimenters
       SET last_login_at = now(), updated_at = now()
       WHERE id = $1
       RETURNING id, email, last_login_at`,
      [experimenter.id]
    );
    const row = loginRow.rows[0];

    const token = createSession({
      id: row.id,
      email: row.email,
      last_login_at: row.last_login_at,
      activity_since: activitySince,
    });

    return res.status(200).json({
      success: true,
      data: {
        token,
        experimenter: {
          id: row.id,
          email: row.email,
          last_login_at: row.last_login_at,
          activity_since: activitySince,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'login failed',
    });
  }
});

router.get('/me', (req, res) => {
  const token = getBearerToken(req.headers.authorization);
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'missing bearer token',
    });
  }

  const session = getSession(token);
  if (!session) {
    return res.status(401).json({
      success: false,
      error: 'invalid or expired session',
    });
  }

  return res.status(200).json({
    success: true,
    data: {
      experimenter: session.experimenter,
    },
  });
});

module.exports = router;
