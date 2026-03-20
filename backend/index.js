/**
 * File: index.js
 * Purpose: Entry point for the Detecting the Artificial REST API. Mounts routes and starts the server.
 * Dependencies: express, ./routes/health, ./routes/studies
 * Key: app — Express app; mounts /health, /studies
 * Related: docs/architecture/backend.md, docs/api/endpoints.md
 */

require('dotenv').config();

const express = require('express');
const healthRouter = require('./routes/health');
const studiesRouter = require('./routes/studies');

const app = express();
const PORT = process.env.PORT;

app.use(express.json());

app.use('/health', healthRouter);
app.use('/studies', studiesRouter);

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
