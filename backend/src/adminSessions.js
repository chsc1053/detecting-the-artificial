/**
 * File: src/adminSessions.js
 * Purpose: In-memory admin session store for bearer tokens in local development.
 * Dependencies: none
 * Related: docs/architecture/backend.md, docs/api/endpoints.md
 */

const crypto = require('crypto');
const sessions = new Map();

function createSession(experimenter) {
  const token = crypto.randomUUID();
  sessions.set(token, {
    experimenter,
    createdAt: new Date().toISOString(),
  });
  return token;
}

function getSession(token) {
  return sessions.get(token);
}

module.exports = {
  createSession,
  getSession,
};
