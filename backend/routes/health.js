/**
 * File: routes/health.js
 * Purpose: Health check route for liveness/readiness.
 * Dependencies: express
 * Key: router — GET / returns status and timestamp
 * Related: docs/api/endpoints.md
 */

const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
    },
  });
});

module.exports = router;
