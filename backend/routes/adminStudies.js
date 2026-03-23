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

module.exports = router;
