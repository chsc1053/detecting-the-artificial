/**
 * File: routes/adminStimuli.js
 * Purpose: Admin CRUD for stimuli (MVP: text stimuli for trial wiring).
 * Dependencies: express, ../src/db, ../middleware/requireAdminSession
 * Related: docs/api/endpoints.md
 */

const express = require('express');
const db = require('../src/db');
const { requireAdminSession } = require('../middleware/requireAdminSession');

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

module.exports = router;
