/**
 * File: routes/adminStudies.js
 * Purpose: Authenticated admin routes for studies and study trials.
 * Dependencies: express, ../src/db, ../middleware/requireAdminSession, ../src/uuid
 * Related: docs/api/endpoints.md, docs/features/experiment-config.md
 */

const express = require('express');
const db = require('../src/db');
const { requireAdminSession } = require('../middleware/requireAdminSession');
const { isUuid } = require('../src/uuid');

const router = express.Router();

async function studyExists(studyId) {
  const r = await db.query('SELECT id FROM studies WHERE id = $1', [studyId]);
  return r.rowCount > 0;
}

async function studyHasAnyResponses(studyId) {
  const r = await db.query(
    'SELECT EXISTS(SELECT 1 FROM responses WHERE study_id = $1) AS e',
    [studyId]
  );
  return Boolean(r.rows[0]?.e);
}

/**
 * POST /studies — Create a study (experimenter only).
 */
router.post('/studies', requireAdminSession, async (req, res) => {
  const { name, description, is_active, demographics_mandatory } = req.body ?? {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({
      success: false,
      error: 'name is required',
    });
  }

  const active = typeof is_active === 'boolean' ? is_active : false;
  const demoMandatory =
    typeof demographics_mandatory === 'boolean' ? demographics_mandatory : false;

  try {
    const result = await db.query(
      `INSERT INTO studies (name, description, is_active, demographics_mandatory)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, description, is_active, demographics_mandatory, created_at, updated_at`,
      [name.trim(), description ?? null, active, demoMandatory]
    );

    return res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'failed to create study',
    });
  }
});

/**
 * GET /studies/:studyId/trials — List trials for a study.
 */
router.get('/studies/:studyId/trials', requireAdminSession, async (req, res) => {
  const { studyId } = req.params;
  if (!isUuid(studyId)) {
    return res.status(400).json({ success: false, error: 'invalid study id' });
  }

  try {
    if (!(await studyExists(studyId))) {
      return res.status(404).json({ success: false, error: 'study not found' });
    }

    const result = await db.query(
      `SELECT id, study_id, trial_index, task_type, human_stimulus_id, ai_stimulus_id, single_stimulus_id, created_at, updated_at
       FROM study_trials
       WHERE study_id = $1
       ORDER BY trial_index ASC`,
      [studyId]
    );

    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'failed to list trials',
    });
  }
});

/**
 * POST /studies/:studyId/trials — Add a trial (next trial_index if omitted).
 */
router.post('/studies/:studyId/trials', requireAdminSession, async (req, res) => {
  const { studyId } = req.params;
  if (!isUuid(studyId)) {
    return res.status(400).json({ success: false, error: 'invalid study id' });
  }

  const {
    trial_index,
    task_type,
    human_stimulus_id,
    ai_stimulus_id,
    single_stimulus_id,
  } = req.body ?? {};

  if (!task_type || !['forced_choice', 'single_item'].includes(task_type)) {
    return res.status(400).json({
      success: false,
      error: 'task_type must be forced_choice or single_item',
    });
  }

  if (task_type === 'forced_choice') {
    if (!human_stimulus_id || !ai_stimulus_id) {
      return res.status(400).json({
        success: false,
        error: 'forced_choice requires human_stimulus_id and ai_stimulus_id',
      });
    }
    if (!isUuid(human_stimulus_id) || !isUuid(ai_stimulus_id)) {
      return res.status(400).json({
        success: false,
        error: 'invalid stimulus id',
      });
    }
  }

  if (task_type === 'single_item') {
    if (!single_stimulus_id) {
      return res.status(400).json({
        success: false,
        error: 'single_item requires single_stimulus_id',
      });
    }
    if (!isUuid(single_stimulus_id)) {
      return res.status(400).json({
        success: false,
        error: 'invalid stimulus id',
      });
    }
  }

  try {
    if (!(await studyExists(studyId))) {
      return res.status(404).json({ success: false, error: 'study not found' });
    }

    if (await studyHasAnyResponses(studyId)) {
      return res.status(409).json({
        success: false,
        code: 'study_has_responses',
        error:
          'Cannot add a trial while this study has responses. On the Responses tab, use Delete all responses, then add trials.',
      });
    }

    let nextIndex;
    if (trial_index !== undefined && trial_index !== null) {
      if (!Number.isInteger(trial_index) || trial_index < 0) {
        return res.status(400).json({
          success: false,
          error: 'trial_index must be a non-negative integer',
        });
      }
      nextIndex = trial_index;
    } else {
      const idx = await db.query(
        `SELECT COALESCE(MAX(trial_index), -1) + 1 AS next_index
         FROM study_trials WHERE study_id = $1`,
        [studyId]
      );
      nextIndex = idx.rows[0].next_index;
    }

    const humanId = task_type === 'forced_choice' ? human_stimulus_id : null;
    const aiId = task_type === 'forced_choice' ? ai_stimulus_id : null;
    const singleId = task_type === 'single_item' ? single_stimulus_id : null;

    const result = await db.query(
      `INSERT INTO study_trials (study_id, trial_index, task_type, human_stimulus_id, ai_stimulus_id, single_stimulus_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, study_id, trial_index, task_type, human_stimulus_id, ai_stimulus_id, single_stimulus_id, created_at, updated_at`,
      [studyId, nextIndex, task_type, humanId, aiId, singleId]
    );

    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'trial_index already exists for this study',
      });
    }
    if (error.code === '23503') {
      return res.status(400).json({
        success: false,
        error: 'invalid stimulus reference',
      });
    }
    return res.status(500).json({
      success: false,
      error: 'failed to create trial',
    });
  }
});

/**
 * DELETE /studies/:studyId/trials/:trialId — Remove a trial, then compact trial_index to 0..n-1
 * (same relative order as before). Responses for this trial are removed (FK cascade).
 */
router.delete(
  '/studies/:studyId/trials/:trialId',
  requireAdminSession,
  async (req, res) => {
    const { studyId, trialId } = req.params;
    if (!isUuid(studyId) || !isUuid(trialId)) {
      return res.status(400).json({ success: false, error: 'invalid id' });
    }

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const studyCheck = await client.query(
        'SELECT id FROM studies WHERE id = $1',
        [studyId]
      );
      if (studyCheck.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, error: 'study not found' });
      }

      const del = await client.query(
        'DELETE FROM study_trials WHERE study_id = $1 AND id = $2 RETURNING id',
        [studyId, trialId]
      );
      if (del.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, error: 'trial not found' });
      }

      await client.query(
        `WITH ranked AS (
           SELECT id,
             (ROW_NUMBER() OVER (
               ORDER BY trial_index ASC, created_at ASC, id ASC
             ) - 1)::int AS new_idx
           FROM study_trials
           WHERE study_id = $1
         )
         UPDATE study_trials t
         SET trial_index = ranked.new_idx, updated_at = now()
         FROM ranked
         WHERE t.id = ranked.id`,
        [studyId]
      );

      await client.query('COMMIT');
      return res.status(200).json({ success: true, data: { id: trialId } });
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        /* ignore */
      }
      return res.status(500).json({
        success: false,
        error: 'failed to delete trial',
      });
    } finally {
      client.release();
    }
  }
);

/**
 * GET /studies/:studyId — Get one study.
 */
router.get('/studies/:studyId', requireAdminSession, async (req, res) => {
  const { studyId } = req.params;
  if (!isUuid(studyId)) {
    return res.status(400).json({ success: false, error: 'invalid study id' });
  }

  try {
    const result = await db.query(
      `SELECT id, name, description, is_active, demographics_mandatory, created_at, updated_at
       FROM studies WHERE id = $1`,
      [studyId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'study not found' });
    }
    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'failed to fetch study',
    });
  }
});

/**
 * PATCH /studies/:studyId — Update study fields.
 */
router.patch('/studies/:studyId', requireAdminSession, async (req, res) => {
  const { studyId } = req.params;
  if (!isUuid(studyId)) {
    return res.status(400).json({ success: false, error: 'invalid study id' });
  }

  const { name, description, is_active, demographics_mandatory } = req.body ?? {};
  const sets = [];
  const vals = [];
  let p = 1;

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'name must be a non-empty string',
      });
    }
    sets.push(`name = $${p++}`);
    vals.push(name.trim());
  }
  if (description !== undefined) {
    sets.push(`description = $${p++}`);
    vals.push(description === null ? null : String(description));
  }
  if (is_active !== undefined) {
    if (typeof is_active !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'is_active must be boolean',
      });
    }
    sets.push(`is_active = $${p++}`);
    vals.push(is_active);
  }
  if (demographics_mandatory !== undefined) {
    if (typeof demographics_mandatory !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'demographics_mandatory must be boolean',
      });
    }
    sets.push(`demographics_mandatory = $${p++}`);
    vals.push(demographics_mandatory);
  }

  if (sets.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'no fields to update',
    });
  }

  if (demographics_mandatory === true) {
    try {
      const cur = await db.query(
        'SELECT demographics_mandatory FROM studies WHERE id = $1',
        [studyId]
      );
      if (cur.rowCount > 0 && cur.rows[0].demographics_mandatory === false) {
        if (await studyHasAnyResponses(studyId)) {
          return res.status(409).json({
            success: false,
            code: 'study_has_responses',
            error:
              'Cannot turn on mandatory demographics while this study has responses. On the Responses tab, use Delete all responses, then change this setting.',
          });
        }
      }
    } catch (e) {
      return res.status(500).json({
        success: false,
        error: 'failed to validate study update',
      });
    }
  }

  sets.push('updated_at = now()');
  vals.push(studyId);

  try {
    const result = await db.query(
      `UPDATE studies SET ${sets.join(', ')}
       WHERE id = $${p}
       RETURNING id, name, description, is_active, demographics_mandatory, created_at, updated_at`,
      vals
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'study not found' });
    }
    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'failed to update study',
    });
  }
});

/**
 * DELETE /studies/:studyId — Delete a study (and related trials/responses).
 */
router.delete('/studies/:studyId', requireAdminSession, async (req, res) => {
  const { studyId } = req.params;
  if (!isUuid(studyId)) {
    return res.status(400).json({ success: false, error: 'invalid study id' });
  }

  try {
    if (!(await studyExists(studyId))) {
      return res.status(404).json({ success: false, error: 'study not found' });
    }

    // Delete participants first so responses tied to those participants can be removed via cascade.
    await db.query('DELETE FROM participants WHERE study_id = $1', [studyId]);

    const result = await db.query('DELETE FROM studies WHERE id = $1 RETURNING id', [studyId]);
    return res.status(200).json({
      success: true,
      data: { id: result.rows[0]?.id ?? studyId },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'failed to delete study',
    });
  }
});

/**
 * GET /studies/:studyId/responses — List trial responses for a study (with trial index + optional demographics).
 */
router.get('/studies/:studyId/responses', requireAdminSession, async (req, res) => {
  const { studyId } = req.params;
  if (!isUuid(studyId)) {
    return res.status(400).json({ success: false, error: 'invalid study id' });
  }

  try {
    if (!(await studyExists(studyId))) {
      return res.status(404).json({ success: false, error: 'study not found' });
    }

    const result = await db.query(
      `SELECT
         r.id,
         r.study_id,
         r.trial_id,
         r.participant_id,
         r.choice_label,
         r.confidence,
         r.explanation,
         r.is_correct,
         r.created_at,
         st.trial_index,
         st.task_type,
         p.age,
         p.approx_location,
         p.education_level,
         p.ai_literacy
       FROM responses r
       INNER JOIN study_trials st ON st.id = r.trial_id AND st.study_id = r.study_id
       LEFT JOIN participants p ON p.id = r.participant_id
       WHERE r.study_id = $1
       ORDER BY r.created_at DESC`,
      [studyId]
    );

    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'failed to list responses',
    });
  }
});

/**
 * DELETE /studies/:studyId/responses — Remove every response and participant for this study.
 */
router.delete(
  '/studies/:studyId/responses',
  requireAdminSession,
  async (req, res) => {
    const { studyId } = req.params;
    if (!isUuid(studyId)) {
      return res.status(400).json({ success: false, error: 'invalid study id' });
    }

    const client = await db.pool.connect();
    try {
      if (!(await studyExists(studyId))) {
        return res.status(404).json({ success: false, error: 'study not found' });
      }

      await client.query('BEGIN');
      const delR = await client.query(
        'DELETE FROM responses WHERE study_id = $1',
        [studyId]
      );
      const delP = await client.query(
        'DELETE FROM participants WHERE study_id = $1',
        [studyId]
      );
      await client.query('COMMIT');

      return res.status(200).json({
        success: true,
        data: {
          responses_deleted: delR.rowCount,
          participants_deleted: delP.rowCount,
        },
      });
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        /* ignore */
      }
      return res.status(500).json({
        success: false,
        error: 'failed to delete responses',
      });
    } finally {
      client.release();
    }
  }
);

/**
 * DELETE /studies/:studyId/responses/invalid — Remove incomplete sessions and
 * sessions without demographics when demographics are mandatory.
 */
router.delete(
  '/studies/:studyId/responses/invalid',
  requireAdminSession,
  async (req, res) => {
    const { studyId } = req.params;
    if (!isUuid(studyId)) {
      return res.status(400).json({ success: false, error: 'invalid study id' });
    }

    const client = await db.pool.connect();
    try {
      if (!(await studyExists(studyId))) {
        return res.status(404).json({ success: false, error: 'study not found' });
      }

      await client.query('BEGIN');

      const pickInvalid = await client.query(
        `WITH trial_n AS (
           SELECT COUNT(*)::int AS n FROM study_trials WHERE study_id = $1
         ),
         answered AS (
           SELECT participant_id, COUNT(DISTINCT trial_id)::int AS na
           FROM responses
           WHERE study_id = $1
           GROUP BY participant_id
         ),
         incomplete AS (
           SELECT a.participant_id
           FROM answered a
           CROSS JOIN trial_n t
           WHERE t.n > 0 AND a.na < t.n
         ),
         bad_demo AS (
           SELECT p.id AS participant_id
           FROM participants p
           INNER JOIN studies s ON s.id = p.study_id
           WHERE p.study_id = $1
             AND s.demographics_mandatory = true
             AND NOT (
               p.age IS NOT NULL
               OR (
                 p.approx_location IS NOT NULL
                 AND TRIM(p.approx_location) <> ''
               )
               OR p.education_level IS NOT NULL
               OR p.ai_literacy IS NOT NULL
             )
             AND EXISTS (
               SELECT 1 FROM responses r
               WHERE r.participant_id = p.id AND r.study_id = p.study_id
             )
         ),
         invalid_ids AS (
           SELECT participant_id FROM incomplete
           UNION
           SELECT participant_id FROM bad_demo
         )
         SELECT participant_id FROM invalid_ids`,
        [studyId]
      );

      const ids = pickInvalid.rows.map((row) => row.participant_id);
      if (ids.length === 0) {
        await client.query('COMMIT');
        return res.status(200).json({
          success: true,
          data: {
            responses_deleted: 0,
            participants_deleted: 0,
            participant_ids: [],
          },
        });
      }

      const delR = await client.query(
        `DELETE FROM responses
         WHERE study_id = $1 AND participant_id = ANY($2::uuid[])`,
        [studyId, ids]
      );
      const delP = await client.query(
        `DELETE FROM participants
         WHERE study_id = $1 AND id = ANY($2::uuid[])`,
        [studyId, ids]
      );

      await client.query('COMMIT');

      return res.status(200).json({
        success: true,
        data: {
          responses_deleted: delR.rowCount,
          participants_deleted: delP.rowCount,
          participant_ids: ids,
        },
      });
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        /* ignore */
      }
      return res.status(500).json({
        success: false,
        error: 'failed to delete invalid responses',
      });
    } finally {
      client.release();
    }
  }
);

module.exports = router;
