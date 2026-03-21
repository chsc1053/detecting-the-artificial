/**
 * File: routes/adminStudies.js
 * Purpose: Authenticated admin routes for study management.
 * Dependencies: express, ../src/db, ../middleware/requireAdminSession
 * Key: POST /studies — create study
 * Related: docs/api/endpoints.md, docs/features/experiment-config.md
 */

const express = require('express');
const db = require('../src/db');
const { requireAdminSession } = require('../middleware/requireAdminSession');

const router = express.Router();

/**
 * POST /studies — Create a study (experimenter only).
 */
router.post('/studies', requireAdminSession, async (req, res) => {
  const { name, description, is_active } = req.body ?? {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({
      success: false,
      error: 'name is required',
    });
  }

  const active =
    typeof is_active === 'boolean' ? is_active : false;

  try {
    const result = await db.query(
      `INSERT INTO studies (name, description, is_active)
       VALUES ($1, $2, $3)
       RETURNING id, name, description, is_active, created_at, updated_at`,
      [name.trim(), description ?? null, active]
    );

    return res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'failed to create study',
    });
  }
});

module.exports = router;
