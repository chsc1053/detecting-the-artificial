/**
 * File: routes/adminStimuli.js
 * Purpose: Admin CRUD for stimuli (library for trials).
 * Dependencies: express, ../src/db, ../middleware/requireAdminSession, ../src/uuid, ../src/stimuliUploadS3
 * Related: docs/api/endpoints.md
 */

const express = require('express');
const db = require('../src/db');
const { requireAdminSession } = require('../middleware/requireAdminSession');
const { isUuid } = require('../src/uuid');
const {
  isStimuliUploadConfigured,
  createPresignedStimulusUpload,
} = require('../src/stimuliUploadS3');

const router = express.Router();

const MODALITIES = new Set(['text', 'image', 'video', 'audio']);
const SOURCE_TYPES = new Set(['human', 'ai']);

/**
 * GET /stimuli — List stimuli (newest first).
 */
router.get('/stimuli', requireAdminSession, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, modality, source_type, storage_key, text_content, model_name, notes, created_at, updated_at
       FROM stimuli
       ORDER BY created_at DESC`
    );
    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'failed to list stimuli',
    });
  }
});

/**
 * POST /stimuli/upload/presign — Presigned S3 PUT for a media file; use returned publicUrl as storage_key.
 */
router.post('/stimuli/upload/presign', requireAdminSession, async (req, res) => {
  if (!isStimuliUploadConfigured()) {
    return res.status(503).json({
      success: false,
      error:
        'Stimulus file upload is not configured. Set AWS_S3_BUCKET and AWS_REGION on the server (see docs/deployment/aws-deployment.md).',
    });
  }

  const { filename, contentType } = req.body ?? {};
  try {
    const data = await createPresignedStimulusUpload({ filename, contentType });
    return res.status(200).json({ success: true, data });
  } catch (err) {
    if (err.code === 'VALIDATION') {
      return res.status(400).json({ success: false, error: err.message });
    }
    if (err.code === 'S3_NOT_CONFIGURED') {
      return res.status(503).json({ success: false, error: err.message });
    }
    console.error('presign stimulus upload', err);
    return res.status(500).json({
      success: false,
      error: 'failed to prepare upload',
    });
  }
});

/**
 * POST /stimuli — Create stimulus (MVP: text-friendly fields).
 */
router.post('/stimuli', requireAdminSession, async (req, res) => {
  const { modality, source_type, text_content, model_name, notes, storage_key } =
    req.body ?? {};

  if (!modality || !MODALITIES.has(modality)) {
    return res.status(400).json({
      success: false,
      error: 'modality must be text, image, video, or audio',
    });
  }
  if (!source_type || !SOURCE_TYPES.has(source_type)) {
    return res.status(400).json({
      success: false,
      error: 'source_type must be human or ai',
    });
  }
  if (modality === 'text' && (!text_content || !String(text_content).trim())) {
    return res.status(400).json({
      success: false,
      error: 'text_content is required for text modality',
    });
  }
  if (modality !== 'text' && (!storage_key || !String(storage_key).trim())) {
    return res.status(400).json({
      success: false,
      error: 'storage_key is required for non-text modalities',
    });
  }
  if (modality !== 'text' && (!model_name || !String(model_name).trim())) {
    return res.status(400).json({
      success: false,
      error: 'model_name is required for non-text modalities',
    });
  }

  try {
    const result = await db.query(
      `INSERT INTO stimuli (modality, source_type, storage_key, text_content, model_name, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, modality, source_type, storage_key, text_content, model_name, notes, created_at, updated_at`,
      [
        modality,
        source_type,
        storage_key ? String(storage_key).trim() : null,
        modality === 'text' ? String(text_content).trim() : null,
        model_name ? String(model_name).trim() : null,
        notes ?? null,
      ]
    );
    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'failed to create stimulus',
    });
  }
});

/**
 * DELETE /stimuli/:stimulusId — Remove a stimulus if no trial references it.
 */
router.delete('/stimuli/:stimulusId', requireAdminSession, async (req, res) => {
  const { stimulusId } = req.params;
  if (!isUuid(stimulusId)) {
    return res.status(400).json({ success: false, error: 'invalid stimulus id' });
  }

  try {
    const exists = await db.query('SELECT id FROM stimuli WHERE id = $1', [
      stimulusId,
    ]);
    if (exists.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'stimulus not found' });
    }

    const inUse = await db.query(
      `SELECT 1 FROM study_trials
       WHERE human_stimulus_id = $1 OR ai_stimulus_id = $1 OR single_stimulus_id = $1
       LIMIT 1`,
      [stimulusId]
    );
    if (inUse.rowCount > 0) {
      return res.status(409).json({
        success: false,
        error:
          'stimulus is used in one or more trials; remove or change those trials first',
      });
    }

    await db.query('DELETE FROM stimuli WHERE id = $1', [stimulusId]);
    return res.status(200).json({ success: true, data: { id: stimulusId } });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'failed to delete stimulus',
    });
  }
});

module.exports = router;
