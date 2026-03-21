/**
 * File: index.js
 * Purpose: Entry point for the Detecting the Artificial REST API. Mounts routes and starts the server.
 * Dependencies: express, ./routes/health, ./routes/studies, ./routes/adminAuth, ./routes/adminStudies
 * Key: app — Express app; mounts /health, /studies, /admin
 * Related: docs/architecture/backend.md, docs/api/endpoints.md
 */

require('dotenv').config();

const express = require('express');
const healthRouter = require('./routes/health');
const studiesRouter = require('./routes/studies');
const adminAuthRouter = require('./routes/adminAuth');
const adminStudiesRouter = require('./routes/adminStudies');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use('/health', healthRouter);
app.use('/studies', studiesRouter);
app.use('/admin', adminAuthRouter);
app.use('/admin', adminStudiesRouter);

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
