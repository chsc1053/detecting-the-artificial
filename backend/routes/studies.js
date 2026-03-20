/**
 * File: routes/studies.js
 * Purpose: Studies API — list studies from PostgreSQL.
 * Dependencies: express, ../src/db
 * Key: router — GET / returns list of studies
 * Related: docs/api/endpoints.md, docs/features/experiment-config.md
 */

const express = require('express');
const db = require('../src/db');

const router = express.Router();

/**
 * GET / — List studies.
 */
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT id, name, description, is_active, created_at, updated_at
      FROM studies
      ORDER BY created_at DESC
      `
    );

    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch studies',
    });
  }
});

module.exports = router;
