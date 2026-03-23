/**
 * File: index.js
 * Purpose: Entry point for the Detecting the Artificial REST API. Mounts routes and starts the server.
 * Dependencies: express, ./routes/health, ./routes/studies, ./routes/participant, ./routes/adminAuth, ./routes/adminStudies, ./routes/adminStimuli
 * Key: app — Express app; mounts /health, /studies, /participant, /admin
 * Related: docs/architecture/backend.md, docs/api/endpoints.md
 */

require('dotenv').config();

const express = require('express');
const healthRouter = require('./routes/health');
const studiesRouter = require('./routes/studies');
const participantRouter = require('./routes/participant');
const adminAuthRouter = require('./routes/adminAuth');
const adminStudiesRouter = require('./routes/adminStudies');
const adminStimuliRouter = require('./routes/adminStimuli');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use('/health', healthRouter);
app.use('/studies', studiesRouter);
app.use('/participant', participantRouter);
app.use('/admin', adminAuthRouter);
app.use('/admin', adminStudiesRouter);
app.use('/admin', adminStimuliRouter);

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
