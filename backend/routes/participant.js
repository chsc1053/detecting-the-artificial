/**
 * File: routes/participant.js
 * Purpose: Public participant API — active studies, trial payloads, participants, responses, results.
 * Dependencies: express, ../src/db, ../src/uuid
 * Related: docs/api/endpoints.md, docs/features/response-collection.md
 */

const express = require('express');
const db = require('../src/db');
const { isUuid } = require('../src/uuid');

const router = express.Router();

const CONFIDENCE_MIN = 1;
const CONFIDENCE_MAX = 5;

/**
 * Load stimulus row for participant display (no admin-only fields).
 */
async function getStimulusRow(id) {
  if (!id || !isUuid(id)) return null;
  const r = await db.query(
    `SELECT id, modality, source_type, storage_key, text_content, model_name
     FROM stimuli WHERE id = $1`,
    [id]
  );
  return r.rows[0] ?? null;
}

function stimulusPayload(row) {
  if (!row) return null;
  return {
    id: row.id,
    modality: row.modality,
    source_type: row.source_type,
    storage_key: row.storage_key,
    text_content: row.text_content,
    model_name: row.model_name,
  };
}

/**
 * Forced-choice: participant marks which stimulus is AI — correct if they pick the AI stimulus.
 * Single-item: correct if choice_label matches the stimulus source_type.
 */
function computeIsCorrect(taskType, choiceLabel, humanStim, aiStim, singleStim) {
  if (taskType === 'forced_choice') {
    return choiceLabel === 'ai';
  }
  if (taskType === 'single_item' && singleStim) {
    return choiceLabel === singleStim.source_type;
  }
  return null;
}

async function assertActiveStudy(studyId) {
  const r = await db.query(
    'SELECT id, demographics_mandatory FROM studies WHERE id = $1 AND is_active = true',
    [studyId]
  );
  return r.rows[0] ?? null;
}

/**
 * GET /active-studies — List active studies (participant home).
 */
router.get('/active-studies', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT s.id, s.name, s.description, s.created_at
       FROM studies s
       WHERE s.is_active = true
       ORDER BY s.name ASC`
    );
    const studies = [];
    for (const row of result.rows) {
      const counts = await db.query(
        `SELECT task_type, COUNT(*)::int AS n
         FROM study_trials WHERE study_id = $1 GROUP BY task_type`,
        [row.id]
      );
      const byType = { forced_choice: 0, single_item: 0 };
      for (const c of counts.rows) {
        if (c.task_type in byType) byType[c.task_type] = c.n;
      }
      studies.push({
        ...row,
        trial_counts: byType,
        trial_total: byType.forced_choice + byType.single_item,
      });
    }
    return res.status(200).json({ success: true, data: studies });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'failed to list studies' });
  }
});

/**
 * GET /studies/:studyId/intro — Study metadata + counts for consent screen.
 */
router.get('/studies/:studyId/intro', async (req, res) => {
  const { studyId } = req.params;
  if (!isUuid(studyId)) {
    return res.status(400).json({ success: false, error: 'invalid study id' });
  }
  try {
    const r = await db.query(
      `SELECT id, name, description, demographics_mandatory, is_active
       FROM studies WHERE id = $1`,
      [studyId]
    );
    if (r.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'study not found' });
    }
    const study = r.rows[0];
    if (!study.is_active) {
      return res.status(403).json({ success: false, error: 'study is not active' });
    }
    const counts = await db.query(
      `SELECT task_type, COUNT(*)::int AS n
       FROM study_trials WHERE study_id = $1 GROUP BY task_type`,
      [studyId]
    );
    const byType = { forced_choice: 0, single_item: 0 };
    for (const c of counts.rows) {
      if (c.task_type in byType) byType[c.task_type] = c.n;
    }
    const { is_active: _a, ...rest } = study;
    return res.status(200).json({
      success: true,
      data: {
        ...rest,
        trial_counts: byType,
        trial_total: byType.forced_choice + byType.single_item,
      },
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'failed to load study' });
  }
});

/**
 * GET /studies/:studyId/trials — Ordered trials with stimulus payloads for UI.
 */
router.get('/studies/:studyId/trials', async (req, res) => {
  const { studyId } = req.params;
  if (!isUuid(studyId)) {
    return res.status(400).json({ success: false, error: 'invalid study id' });
  }
  try {
    const study = await assertActiveStudy(studyId);
    if (!study) {
      return res.status(404).json({ success: false, error: 'study not found or inactive' });
    }
    const tr = await db.query(
      `SELECT id, study_id, trial_index, task_type, human_stimulus_id, ai_stimulus_id, single_stimulus_id
       FROM study_trials WHERE study_id = $1 ORDER BY trial_index ASC`,
      [studyId]
    );
    const out = [];
    for (const t of tr.rows) {
      const human = t.human_stimulus_id ? await getStimulusRow(t.human_stimulus_id) : null;
      const ai = t.ai_stimulus_id ? await getStimulusRow(t.ai_stimulus_id) : null;
      const single = t.single_stimulus_id ? await getStimulusRow(t.single_stimulus_id) : null;
      out.push({
        id: t.id,
        trial_index: t.trial_index,
        task_type: t.task_type,
        stimuli:
          t.task_type === 'forced_choice'
            ? { human: stimulusPayload(human), ai: stimulusPayload(ai) }
            : { single: stimulusPayload(single) },
      });
    }
    return res.status(200).json({ success: true, data: out });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'failed to load trials' });
  }
});

/**
 * POST /participants — Start session (after intro).
 */
router.post('/participants', async (req, res) => {
  const { study_id: studyId } = req.body ?? {};
  if (!studyId || !isUuid(studyId)) {
    return res.status(400).json({ success: false, error: 'study_id is required' });
  }
  try {
    const study = await assertActiveStudy(studyId);
    if (!study) {
      return res.status(404).json({ success: false, error: 'study not found or inactive' });
    }
    const ins = await db.query(
      `INSERT INTO participants (study_id) VALUES ($1)
       RETURNING id, study_id, created_at`,
      [studyId]
    );
    return res.status(201).json({ success: true, data: ins.rows[0] });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'failed to create participant' });
  }
});

/**
 * POST /responses — One trial response.
 */
router.post('/responses', async (req, res) => {
  const {
    participant_id: participantId,
    trial_id: trialId,
    choice_label: choiceLabel,
    confidence,
    explanation,
  } = req.body ?? {};

  if (!participantId || !isUuid(participantId)) {
    return res.status(400).json({ success: false, error: 'participant_id is required' });
  }
  if (!trialId || !isUuid(trialId)) {
    return res.status(400).json({ success: false, error: 'trial_id is required' });
  }
  if (!choiceLabel || !['human', 'ai'].includes(choiceLabel)) {
    return res.status(400).json({ success: false, error: 'choice_label must be human or ai' });
  }
  if (
    typeof confidence !== 'number' ||
    confidence < CONFIDENCE_MIN ||
    confidence > CONFIDENCE_MAX
  ) {
    return res.status(400).json({
      success: false,
      error: `confidence must be ${CONFIDENCE_MIN}–${CONFIDENCE_MAX}`,
    });
  }

  try {
    const pRow = await db.query('SELECT study_id FROM participants WHERE id = $1', [
      participantId,
    ]);
    if (pRow.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'participant not found' });
    }
    const studyId = pRow.rows[0].study_id;

    const tRow = await db.query(
      `SELECT id, study_id, task_type, human_stimulus_id, ai_stimulus_id, single_stimulus_id
       FROM study_trials WHERE id = $1`,
      [trialId]
    );
    if (tRow.rowCount === 0 || tRow.rows[0].study_id !== studyId) {
      return res.status(400).json({ success: false, error: 'trial does not match participant' });
    }
    const trial = tRow.rows[0];
    const human = trial.human_stimulus_id ? await getStimulusRow(trial.human_stimulus_id) : null;
    const ai = trial.ai_stimulus_id ? await getStimulusRow(trial.ai_stimulus_id) : null;
    const single = trial.single_stimulus_id ? await getStimulusRow(trial.single_stimulus_id) : null;
    const isCorrect = computeIsCorrect(trial.task_type, choiceLabel, human, ai, single);

    const dup = await db.query(
      'SELECT id FROM responses WHERE participant_id = $1 AND trial_id = $2',
      [participantId, trialId]
    );
    if (dup.rowCount > 0) {
      return res.status(409).json({ success: false, error: 'response already recorded for trial' });
    }

    const ins = await db.query(
      `INSERT INTO responses (
        study_id, trial_id, participant_id, choice_label, confidence, explanation, is_correct
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, created_at`,
      [
        studyId,
        trialId,
        participantId,
        choiceLabel,
        Math.round(confidence),
        explanation == null || explanation === '' ? null : String(explanation),
        isCorrect,
      ]
    );

    return res.status(201).json({
      success: true,
      data: {
        id: ins.rows[0].id,
        is_correct: isCorrect,
        created_at: ins.rows[0].created_at,
      },
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'failed to save response' });
  }
});

/**
 * PATCH /participants/:participantId/demographics
 */
router.patch('/participants/:participantId/demographics', async (req, res) => {
  const { participantId } = req.params;
  if (!isUuid(participantId)) {
    return res.status(400).json({ success: false, error: 'invalid participant id' });
  }
  const { age, approx_location, education_level, ai_literacy } = req.body ?? {};

  const ageVal =
    age === null || age === undefined || age === ''
      ? null
      : typeof age === 'number'
        ? Math.round(age)
        : parseInt(String(age), 10);
  if (ageVal !== null && (Number.isNaN(ageVal) || ageVal < 0 || ageVal > 120)) {
    return res.status(400).json({ success: false, error: 'invalid age' });
  }

  try {
    const r = await db.query(
      `UPDATE participants SET
        age = $1,
        approx_location = $2,
        education_level = $3,
        ai_literacy = $4,
        updated_at = now()
       WHERE id = $5
       RETURNING id, study_id, age, approx_location, education_level, ai_literacy`,
      [
        ageVal,
        approx_location == null || approx_location === '' ? null : String(approx_location),
        education_level == null || education_level === '' ? null : String(education_level),
        ai_literacy == null || ai_literacy === '' ? null : String(ai_literacy),
        participantId,
      ]
    );
    if (r.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'participant not found' });
    }
    return res.status(200).json({ success: true, data: r.rows[0] });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'failed to update demographics' });
  }
});

/**
 * DELETE /participants/:participantId/session — Discard all responses + participant (mandatory demographics skipped).
 */
router.delete('/participants/:participantId/session', async (req, res) => {
  const { participantId } = req.params;
  if (!isUuid(participantId)) {
    return res.status(400).json({ success: false, error: 'invalid participant id' });
  }
  try {
    const p = await db.query(
      'SELECT study_id FROM participants WHERE id = $1',
      [participantId]
    );
    if (p.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'participant not found' });
    }
    const studyId = p.rows[0].study_id;
    const s = await db.query(
      'SELECT demographics_mandatory FROM studies WHERE id = $1',
      [studyId]
    );
    if (s.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'study not found' });
    }
    if (!s.rows[0].demographics_mandatory) {
      return res.status(400).json({
        success: false,
        error: 'demographics are not mandatory for this study',
      });
    }

    await db.query('DELETE FROM responses WHERE participant_id = $1', [participantId]);
    await db.query('DELETE FROM participants WHERE id = $1', [participantId]);
    return res.status(200).json({ success: true, data: { discarded: true } });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'failed to discard session' });
  }
});

/**
 * GET /participants/:participantId/results — Per-trial feedback + summary (persisted sessions only).
 */
router.get('/participants/:participantId/results', async (req, res) => {
  const { participantId } = req.params;
  if (!isUuid(participantId)) {
    return res.status(400).json({ success: false, error: 'invalid participant id' });
  }
  try {
    const p = await db.query('SELECT id, study_id FROM participants WHERE id = $1', [
      participantId,
    ]);
    if (p.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'participant not found' });
    }
    const studyId = p.rows[0].study_id;

    const resp = await db.query(
      `SELECT r.trial_id, r.choice_label, r.confidence, r.explanation, r.is_correct,
              t.trial_index, t.task_type,
              t.human_stimulus_id, t.ai_stimulus_id, t.single_stimulus_id
       FROM responses r
       JOIN study_trials t ON t.id = r.trial_id
       WHERE r.participant_id = $1
       ORDER BY t.trial_index ASC`,
      [participantId]
    );

    const trials = [];
    for (const row of resp.rows) {
      const human = row.human_stimulus_id ? await getStimulusRow(row.human_stimulus_id) : null;
      const ai = row.ai_stimulus_id ? await getStimulusRow(row.ai_stimulus_id) : null;
      const single = row.single_stimulus_id ? await getStimulusRow(row.single_stimulus_id) : null;
      const correctLabel =
        row.task_type === 'forced_choice' ? 'ai' : single ? single.source_type : null;
      trials.push({
        trial_index: row.trial_index,
        task_type: row.task_type,
        choice_label: row.choice_label,
        confidence: row.confidence,
        explanation: row.explanation,
        is_correct: row.is_correct,
        correct_label: correctLabel,
        stimuli:
          row.task_type === 'forced_choice'
            ? { human: stimulusPayload(human), ai: stimulusPayload(ai) }
            : { single: stimulusPayload(single) },
      });
    }

    const correctN = trials.filter((t) => t.is_correct === true).length;
    const summary = {
      total: trials.length,
      correct: correctN,
      accuracy_pct: trials.length ? Math.round((100 * correctN) / trials.length) : 0,
      avg_confidence:
        trials.length > 0
          ? trials.reduce((s, t) => s + t.confidence, 0) / trials.length
          : null,
    };

    return res.status(200).json({
      success: true,
      data: { study_id: studyId, trials, summary },
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'failed to load results' });
  }
});

module.exports = router;
