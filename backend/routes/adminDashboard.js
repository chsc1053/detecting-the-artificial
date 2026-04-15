/**
 * File: routes/adminDashboard.js
 * Purpose: Authenticated admin dashboard aggregates (activity since last login).
 * Dependencies: express, ../src/db, ../middleware/requireAdminSession
 */

const express = require('express');
const db = require('../src/db');
const { requireAdminSession } = require('../middleware/requireAdminSession');

const router = express.Router();

/**
 * GET /dashboard/activity — Counts since session.activity_since (previous last_login_at),
 * or since experimenter account creation if there was no prior login.
 */
router.get('/dashboard/activity', requireAdminSession, async (req, res) => {
  const { experimenter } = req.adminSession;
  const experimenterId = experimenter.id;

  let since = experimenter.activity_since;
  let windowKey = 'since_last_login';

  try {
    if (since == null) {
      const ex = await db.query(
        'SELECT created_at FROM experimenters WHERE id = $1',
        [experimenterId]
      );
      since = ex.rows[0]?.created_at ?? new Date(0);
      windowKey = 'since_account_created';
    }

    const totals = await db.query(
      `SELECT
         (SELECT COUNT(*)::int FROM responses WHERE created_at > $1) AS responses_total,
         (SELECT COUNT(*)::int FROM participants WHERE created_at > $1) AS participants_started,
         (SELECT COUNT(DISTINCT r.study_id)::int
            FROM responses r
            INNER JOIN studies s ON s.id = r.study_id
            WHERE r.created_at > $1 AND s.is_active = true) AS active_studies_with_responses,
         (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY confidence)
            FROM responses WHERE created_at > $1) AS median_confidence,
         (SELECT COUNT(*)::int FROM participants
            WHERE created_at > $1
              AND (age IS NOT NULL OR approx_location IS NOT NULL
                   OR education_level IS NOT NULL OR ai_literacy IS NOT NULL)
         ) AS participants_with_demographics`,
      [since]
    );

    const byStudy = await db.query(
      `SELECT s.id AS study_id, s.name AS study_name, COUNT(r.id)::int AS response_count
       FROM responses r
       INNER JOIN studies s ON s.id = r.study_id
       WHERE r.created_at > $1
       GROUP BY s.id, s.name
       ORDER BY response_count DESC, s.name ASC
       LIMIT 8`,
      [since]
    );

    const row = totals.rows[0];
    const median =
      row.median_confidence != null
        ? Number(row.median_confidence)
        : null;

    return res.status(200).json({
      success: true,
      data: {
        window_key: windowKey,
        since: since instanceof Date ? since.toISOString() : since,
        responses_total: row.responses_total,
        participants_started: row.participants_started,
        active_studies_with_responses: row.active_studies_with_responses,
        median_confidence:
          median != null && !Number.isNaN(median) ? median : null,
        participants_with_demographics: row.participants_with_demographics,
        responses_by_study: byStudy.rows,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'failed to load dashboard activity',
    });
  }
});

module.exports = router;
