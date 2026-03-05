/**
 * File: index.js
 * Purpose: Entry point for the Detecting the Artificial REST API. Mounts routes and starts the server.
 * Dependencies: express
 * Key: app — Express app; GET /health — liveness/readiness
 * Related: docs/architecture/backend.md, docs/api/endpoints.md
 */

const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

/**
 * GET /health — Liveness/readiness for load balancers and local checks.
 * @returns {Object} { success: true, data: { status, timestamp } }
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
    },
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
