/**
 * File: routes/studies.js
 * Purpose: Studies API — list studies (placeholder until DB is connected).
 * Dependencies: express
 * Key: router — GET / returns list of studies
 * Related: docs/api/endpoints.md, docs/features/experiment-config.md
 */

const express = require('express');
const router = express.Router();

/**
 * GET / — List studies. Returns empty array until database is connected.
 */
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    data: [],
  });
});

module.exports = router;
