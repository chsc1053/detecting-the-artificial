/**
 * File: middleware/requireAdminSession.js
 * Purpose: Verify Bearer token against in-memory admin sessions.
 * Dependencies: ../src/adminSessions
 * Related: docs/architecture/backend.md
 */

const { getSession } = require('../src/adminSessions');

function getBearerToken(headerValue) {
  if (!headerValue || !headerValue.startsWith('Bearer ')) {
    return null;
  }
  return headerValue.slice(7);
}

function requireAdminSession(req, res, next) {
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
  req.adminSession = session;
  next();
}

module.exports = {
  getBearerToken,
  requireAdminSession,
};
