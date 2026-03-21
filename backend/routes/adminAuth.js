/**
 * File: routes/adminAuth.js
 * Purpose: Admin authentication routes for login and current-user checks.
 * Dependencies: express, bcryptjs, ../src/db, ../src/adminSessions
 * Key: POST /auth/login, GET /me
 * Related: docs/api/endpoints.md, docs/architecture/backend.md
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../src/db');
const { createSession, getSession } = require('../src/adminSessions');
const { getBearerToken } = require('../middleware/requireAdminSession');

const router = express.Router();

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
      `SELECT id, email, password_hash
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

    const token = createSession({
      id: experimenter.id,
      email: experimenter.email,
    });

    return res.status(200).json({
      success: true,
      data: {
        token,
        experimenter: {
          id: experimenter.id,
          email: experimenter.email,
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
