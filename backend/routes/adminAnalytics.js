/**
 * File: routes/adminAnalytics.js
 * Purpose: Global admin analytics (aggregates + performance metrics).
 * Dependencies: express, jstat, ../src/db, ../middleware/requireAdminSession
 */

const express = require('express');
const jStat = require('jstat');
const db = require('../src/db');
const { requireAdminSession } = require('../middleware/requireAdminSession');
const { isUuid } = require('../src/uuid');

const router = express.Router();

function parseDateParam(value) {
  if (value == null || value === '') return null;
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/**
 * Build AND fragment for responses r: scored only (is_correct NOT NULL), optional
 * date range, optional study_id. Unscored rows are excluded from all analytics.
 */
function responseFilterClause(fromTs, toTs, studyId, startIdx = 1) {
  const parts = ['r.is_correct IS NOT NULL'];
  const params = [];
  let i = startIdx;
  if (fromTs) {
    parts.push(`r.created_at >= $${i++}`);
    params.push(fromTs);
  }
  if (toTs) {
    parts.push(`r.created_at <= $${i++}`);
    params.push(toTs);
  }
  if (studyId) {
    parts.push(`r.study_id = $${i++}`);
    params.push(studyId);
  }
  return { sql: ` AND ${parts.join(' AND ')}`, params, nextIdx: i };
}

function parseStudyIdParam(raw) {
  if (raw == null || raw === '') return { studyId: null };
  const s = String(raw).trim();
  if (!s) return { studyId: null };
  if (!isUuid(s)) return { error: 'invalid study id' };
  return { studyId: s };
}

async function assertStudyExists(studyId) {
  if (!studyId) return null;
  const r = await db.query('SELECT id FROM studies WHERE id = $1', [studyId]);
  if (r.rowCount === 0) return 'study not found';
  return null;
}

/**
 * Bound hit/false-alarm rates away from 0 and 1 for stable Φ⁻¹ (0.5/n rule).
 */
function adjustRateForNormInv(rate, n) {
  if (n <= 0) return null;
  if (rate <= 0) return 0.5 / n;
  if (rate >= 1) return 1 - 0.5 / n;
  return rate;
}

function accuracyFromCounts(correct, incorrect) {
  const d = correct + incorrect;
  if (d === 0) return null;
  return Math.round((100 * correct) / d);
}

/**
 * Point-biserial r (user formula): corr =
 * (mean_conf_correct − mean_conf_incorrect) / stddev(conf)
 *   × sqrt((n_correct × n_incorrect) / n_total²)
 */
function pointBiserialCorrelation(
  meanCor,
  meanInc,
  stdPop,
  nCor,
  nInc,
  nTot
) {
  if (
    nTot <= 0 ||
    nCor === 0 ||
    nInc === 0 ||
    meanCor == null ||
    meanInc == null ||
    stdPop == null ||
    stdPop === 0
  ) {
    return null;
  }
  const sqrtTerm = Math.sqrt((nCor * nInc) / (nTot * nTot));
  return ((meanCor - meanInc) / stdPop) * sqrtTerm;
}

/**
 * SDT d′ = Φ⁻¹(hit) − Φ⁻¹(FA); hit = P(say AI | ground truth AI), FA = P(say AI | human).
 */
function computeDPrime(hits, misses, falseAlarms, correctRejections) {
  const nSignal = hits + misses;
  const nNoise = falseAlarms + correctRejections;
  if (nSignal <= 0 || nNoise <= 0) return null;
  const hitRate = hits / nSignal;
  const faRate = falseAlarms / nNoise;
  const hitAdj = adjustRateForNormInv(hitRate, nSignal);
  const faAdj = adjustRateForNormInv(faRate, nNoise);
  if (hitAdj == null || faAdj == null) return null;
  try {
    return jStat.normal.inv(hitAdj, 0, 1) - jStat.normal.inv(faAdj, 0, 1);
  } catch {
    return null;
  }
}

function roundFixed(x, decimals) {
  if (x == null || Number.isNaN(x)) return null;
  const p = 10 ** decimals;
  return Math.round(x * p) / p;
}

/** Min / quartiles / max for confidence (1–5) by scored outcome; from SQL GROUP BY is_correct. */
function confidenceBoxStatsFromRows(rows, isCorrect) {
  const hit = rows.find((r) => r.is_correct === isCorrect);
  if (!hit || !(hit.n > 0)) return null;
  return {
    n: hit.n,
    min: roundFixed(Number(hit.min_v), 4),
    q1: roundFixed(Number(hit.q1), 4),
    median: roundFixed(Number(hit.median), 4),
    q3: roundFixed(Number(hit.q3), 4),
    max: roundFixed(Number(hit.max_v), 4),
  };
}

/**
 * GET /analytics/performance — accuracy, confidence, point-biserial r, d′ (scored responses only).
 */
router.get('/analytics/performance', requireAdminSession, async (req, res) => {
  const fromTs = parseDateParam(req.query.from);
  const toTs = parseDateParam(req.query.to);
  const parsedStudy = parseStudyIdParam(req.query.study_id);
  if (parsedStudy.error) {
    return res.status(400).json({ success: false, error: parsedStudy.error });
  }
  const studyId = parsedStudy.studyId;

  try {
    const missing = await assertStudyExists(studyId);
    if (missing) {
      return res.status(404).json({ success: false, error: missing });
    }

    const { sql: dateSql, params: dateParams } = responseFilterClause(
      fromTs,
      toTs,
      studyId,
      1
    );

    const perfResult = await db.query(
      `WITH base AS (
         SELECT
           r.is_correct,
           r.confidence,
           r.choice_label::text AS choice_label,
           st.task_type::text AS task_type,
           CASE
             WHEN st.task_type = 'forced_choice' THEN 'ai'
             WHEN st.task_type = 'single_item' AND sing.source_type IS NOT NULL
               THEN sing.source_type::text
             ELSE NULL
           END AS correct_label
         FROM responses r
         INNER JOIN study_trials st
           ON st.id = r.trial_id AND st.study_id = r.study_id
         LEFT JOIN stimuli sing ON sing.id = st.single_stimulus_id
         WHERE 1=1 ${dateSql}
       )
       SELECT
         COUNT(*)::int AS n_scored,
         COALESCE(SUM(CASE WHEN is_correct THEN 1 ELSE 0 END), 0)::int AS n_correct,
         COALESCE(SUM(CASE WHEN NOT is_correct THEN 1 ELSE 0 END), 0)::int AS n_incorrect,
         ROUND(AVG(confidence)::numeric, 6)::float AS mean_confidence,
         STDDEV_POP(confidence)::double precision AS stddev_confidence_pop,
         AVG(CASE WHEN is_correct THEN confidence END)::double precision AS mean_conf_correct,
         AVG(CASE WHEN NOT is_correct THEN confidence END)::double precision AS mean_conf_incorrect,
         COALESCE(SUM(CASE WHEN task_type = 'forced_choice' AND is_correct THEN 1 ELSE 0 END), 0)::int AS fc_correct,
         COALESCE(SUM(CASE WHEN task_type = 'forced_choice' AND NOT is_correct THEN 1 ELSE 0 END), 0)::int AS fc_incorrect,
         COALESCE(SUM(CASE WHEN task_type = 'single_item' AND is_correct THEN 1 ELSE 0 END), 0)::int AS si_correct,
         COALESCE(SUM(CASE WHEN task_type = 'single_item' AND NOT is_correct THEN 1 ELSE 0 END), 0)::int AS si_incorrect,
         COALESCE(SUM(CASE WHEN correct_label = 'ai' AND choice_label = 'ai' THEN 1 ELSE 0 END), 0)::int AS hits,
         COALESCE(SUM(CASE WHEN correct_label = 'ai' AND choice_label = 'human' THEN 1 ELSE 0 END), 0)::int AS misses,
         COALESCE(SUM(CASE WHEN correct_label = 'human' AND choice_label = 'ai' THEN 1 ELSE 0 END), 0)::int AS false_alarms,
         COALESCE(SUM(CASE WHEN correct_label = 'human' AND choice_label = 'human' THEN 1 ELSE 0 END), 0)::int AS correct_rejections,
         COALESCE(SUM(CASE WHEN correct_label = 'ai' THEN 1 ELSE 0 END), 0)::int AS n_signal,
         COALESCE(SUM(CASE WHEN correct_label = 'human' THEN 1 ELSE 0 END), 0)::int AS n_noise
       FROM base`,
      dateParams
    );
    const scatterRowsResult = await db.query(
      `SELECT
         r.id AS response_id,
         r.participant_id,
         r.confidence,
         r.is_correct,
         COALESCE(stim.modality::text, 'unknown') AS modality
       FROM responses r
       INNER JOIN study_trials st
         ON st.id = r.trial_id AND st.study_id = r.study_id
       LEFT JOIN stimuli stim ON stim.id = COALESCE(
         st.single_stimulus_id,
         st.human_stimulus_id
       )
       WHERE 1=1 ${dateSql}
       ORDER BY r.created_at ASC`,
      dateParams
    );

    const confidenceBoxResult = await db.query(
      `WITH base AS (
         SELECT r.is_correct, r.confidence::double precision AS confidence
         FROM responses r
         INNER JOIN study_trials st
           ON st.id = r.trial_id AND st.study_id = r.study_id
         WHERE 1=1 ${dateSql}
       )
       SELECT
         is_correct,
         COUNT(*)::int AS n,
         MIN(confidence)::float AS min_v,
         MAX(confidence)::float AS max_v,
         percentile_cont(0.25) WITHIN GROUP (ORDER BY confidence)::float AS q1,
         percentile_cont(0.5) WITHIN GROUP (ORDER BY confidence)::float AS median,
         percentile_cont(0.75) WITHIN GROUP (ORDER BY confidence)::float AS q3
       FROM base
       GROUP BY is_correct`,
      dateParams
    );

    const heatmapTaskModalityResult = await db.query(
      `SELECT
         st.task_type::text AS task_type,
         COALESCE(stim.modality::text, 'unknown') AS modality,
         COUNT(*)::int AS n_scored,
         COALESCE(SUM(CASE WHEN r.is_correct THEN 1 ELSE 0 END), 0)::int AS n_correct,
         COALESCE(SUM(CASE WHEN NOT r.is_correct THEN 1 ELSE 0 END), 0)::int AS n_incorrect
       FROM responses r
       INNER JOIN study_trials st
         ON st.id = r.trial_id AND st.study_id = r.study_id
       LEFT JOIN stimuli stim ON stim.id = COALESCE(
         st.single_stimulus_id,
         st.human_stimulus_id
       )
       WHERE 1=1 ${dateSql}
       GROUP BY st.task_type, COALESCE(stim.modality::text, 'unknown')`,
      dateParams
    );

    const row = perfResult.rows[0] || {};
    const nScored = row.n_scored ?? 0;
    const nCorrect = row.n_correct ?? 0;
    const nIncorrect = row.n_incorrect ?? 0;

    const overallAccuracyPct = accuracyFromCounts(nCorrect, nIncorrect);
    const forcedChoiceAccuracyPct = accuracyFromCounts(
      row.fc_correct ?? 0,
      row.fc_incorrect ?? 0
    );
    const singleItemAccuracyPct = accuracyFromCounts(
      row.si_correct ?? 0,
      row.si_incorrect ?? 0
    );

    const stdPop = row.stddev_confidence_pop;
    const rPb = pointBiserialCorrelation(
      row.mean_conf_correct,
      row.mean_conf_incorrect,
      stdPop,
      nCorrect,
      nIncorrect,
      nScored
    );

    const dPrime = computeDPrime(
      row.hits ?? 0,
      row.misses ?? 0,
      row.false_alarms ?? 0,
      row.correct_rejections ?? 0
    );

    const hitRate =
      row.n_signal > 0 ? (row.hits ?? 0) / row.n_signal : null;
    const faRate =
      row.n_noise > 0 ? (row.false_alarms ?? 0) / row.n_noise : null;

    return res.status(200).json({
      success: true,
      data: {
        range: {
          from: fromTs ? fromTs.toISOString() : null,
          to: toTs ? toTs.toISOString() : null,
          all_time: !fromTs && !toTs,
        },
        filter: {
          study_id: studyId,
          all_studies: studyId == null,
        },
        n_scored: nScored,
        overall_accuracy_pct: overallAccuracyPct,
        forced_choice_accuracy_pct: forcedChoiceAccuracyPct,
        single_item_accuracy_pct: singleItemAccuracyPct,
        mean_confidence:
          row.mean_confidence != null
            ? roundFixed(Number(row.mean_confidence), 3)
            : null,
        confidence_accuracy_correlation: roundFixed(rPb, 4),
        d_prime: roundFixed(dPrime, 4),
        sdt: {
          hits: row.hits ?? 0,
          misses: row.misses ?? 0,
          false_alarms: row.false_alarms ?? 0,
          correct_rejections: row.correct_rejections ?? 0,
          n_signal: row.n_signal ?? 0,
          n_noise: row.n_noise ?? 0,
          hit_rate: hitRate != null ? roundFixed(hitRate, 4) : null,
          false_alarm_rate: faRate != null ? roundFixed(faRate, 4) : null,
        },
        scatter_rows: scatterRowsResult.rows,
        confidence_box_by_outcome: {
          correct: confidenceBoxStatsFromRows(
            confidenceBoxResult.rows,
            true
          ),
          incorrect: confidenceBoxStatsFromRows(
            confidenceBoxResult.rows,
            false
          ),
        },
        accuracy_heatmap_task_modality: heatmapTaskModalityResult.rows.map(
          (h) => ({
            task_type: h.task_type,
            modality: h.modality,
            n_scored: h.n_scored,
            n_correct: h.n_correct,
            n_incorrect: h.n_incorrect,
            accuracy_pct: accuracyFromCounts(
              h.n_correct ?? 0,
              h.n_incorrect ?? 0
            ),
          })
        ),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'failed to load performance metrics',
    });
  }
});

/**
 * GET /analytics — summary, distributions, by-study, modality, demographics (no trial table).
 */
router.get('/analytics', requireAdminSession, async (req, res) => {
  const fromTs = parseDateParam(req.query.from);
  const toTs = parseDateParam(req.query.to);
  const parsedStudy = parseStudyIdParam(req.query.study_id);
  if (parsedStudy.error) {
    return res.status(400).json({ success: false, error: parsedStudy.error });
  }
  const studyId = parsedStudy.studyId;

  try {
    const missing = await assertStudyExists(studyId);
    if (missing) {
      return res.status(404).json({ success: false, error: missing });
    }

    const { sql: dateSql, params: dateParams } = responseFilterClause(
      fromTs,
      toTs,
      studyId,
      1
    );

    const summaryResult = await db.query(
      `SELECT
         COUNT(r.id)::int AS response_count,
         COUNT(DISTINCT r.participant_id)::int AS participant_count,
         COUNT(DISTINCT r.study_id)::int AS study_count,
         COUNT(DISTINCT r.trial_id)::int AS trial_count,
         ROUND(AVG(r.confidence)::numeric, 3)::float AS avg_confidence,
         percentile_cont(0.5) WITHIN GROUP (ORDER BY r.confidence) AS median_confidence_raw,
         COALESCE(SUM(CASE WHEN r.is_correct IS TRUE THEN 1 ELSE 0 END), 0)::int AS correct_count,
         COALESCE(SUM(CASE WHEN r.is_correct IS FALSE THEN 1 ELSE 0 END), 0)::int AS incorrect_count
       FROM responses r
       WHERE 1=1 ${dateSql}`,
      dateParams
    );

    const row = summaryResult.rows[0];
    const median =
      row.median_confidence_raw != null
        ? Number(row.median_confidence_raw)
        : null;

    const byStudy = await db.query(
      `SELECT
         s.id AS study_id,
         s.name AS study_name,
         s.is_active AS is_active,
         COUNT(r.id)::int AS response_count,
         COALESCE(SUM(CASE WHEN r.is_correct IS TRUE THEN 1 ELSE 0 END), 0)::int AS correct_count,
         COALESCE(SUM(CASE WHEN r.is_correct IS FALSE THEN 1 ELSE 0 END), 0)::int AS incorrect_count,
         ROUND(AVG(r.confidence)::numeric, 3)::float AS avg_confidence
       FROM responses r
       INNER JOIN studies s ON s.id = r.study_id
       WHERE 1=1 ${dateSql}
       GROUP BY s.id, s.name, s.is_active
       ORDER BY response_count DESC, s.name ASC`,
      dateParams
    );

    const byTaskType = await db.query(
      `SELECT
         st.task_type,
         COUNT(r.id)::int AS response_count,
         COALESCE(SUM(CASE WHEN r.is_correct IS TRUE THEN 1 ELSE 0 END), 0)::int AS correct_count,
         COALESCE(SUM(CASE WHEN r.is_correct IS FALSE THEN 1 ELSE 0 END), 0)::int AS incorrect_count
       FROM responses r
       INNER JOIN study_trials st ON st.id = r.trial_id AND st.study_id = r.study_id
       WHERE 1=1 ${dateSql}
       GROUP BY st.task_type
       ORDER BY response_count DESC`,
      dateParams
    );

    const byModality = await db.query(
      `SELECT
         stim.modality,
         COUNT(r.id)::int AS response_count,
         COALESCE(SUM(CASE WHEN r.is_correct IS TRUE THEN 1 ELSE 0 END), 0)::int AS correct_count,
         COALESCE(SUM(CASE WHEN r.is_correct IS FALSE THEN 1 ELSE 0 END), 0)::int AS incorrect_count,
         ROUND(AVG(r.confidence)::numeric, 6)::float AS avg_confidence
       FROM responses r
       INNER JOIN study_trials st ON st.id = r.trial_id AND st.study_id = r.study_id
       INNER JOIN stimuli stim ON stim.id = COALESCE(
         st.single_stimulus_id,
         st.human_stimulus_id
       )
       WHERE 1=1 ${dateSql}
       GROUP BY stim.modality
       ORDER BY response_count DESC`,
      dateParams
    );

    const byModalityTaskType = await db.query(
      `SELECT
         COALESCE(stim.modality::text, 'unknown') AS modality,
         st.task_type::text AS task_type,
         COUNT(r.id)::int AS response_count,
         COALESCE(SUM(CASE WHEN r.is_correct IS TRUE THEN 1 ELSE 0 END), 0)::int AS correct_count,
         COALESCE(SUM(CASE WHEN r.is_correct IS FALSE THEN 1 ELSE 0 END), 0)::int AS incorrect_count
       FROM responses r
       INNER JOIN study_trials st ON st.id = r.trial_id AND st.study_id = r.study_id
       LEFT JOIN stimuli stim ON stim.id = COALESCE(
         st.single_stimulus_id,
         st.human_stimulus_id
       )
       WHERE 1=1 ${dateSql}
       GROUP BY COALESCE(stim.modality::text, 'unknown'), st.task_type
       ORDER BY modality, task_type`,
      dateParams
    );

    const byModalityTaskTypeConfidence = await db.query(
      `SELECT
         COALESCE(stim.modality::text, 'unknown') AS modality,
         st.task_type::text AS task_type,
         COUNT(r.id)::int AS response_count,
         ROUND(AVG(r.confidence)::numeric, 6)::float AS mean_confidence
       FROM responses r
       INNER JOIN study_trials st ON st.id = r.trial_id AND st.study_id = r.study_id
       LEFT JOIN stimuli stim ON stim.id = COALESCE(
         st.single_stimulus_id,
         st.human_stimulus_id
       )
       WHERE 1=1 ${dateSql}
         AND r.confidence IS NOT NULL
       GROUP BY COALESCE(stim.modality::text, 'unknown'), st.task_type
       ORDER BY modality, task_type`,
      dateParams
    );

    const confusionByModality = await db.query(
      `WITH base AS (
         SELECT
           COALESCE(stim.modality::text, 'unknown') AS modality,
           r.choice_label::text AS choice_label,
           CASE
             WHEN st.task_type = 'forced_choice' THEN 'ai'
             WHEN st.task_type = 'single_item' AND sing.source_type IS NOT NULL
               THEN sing.source_type::text
             ELSE NULL
           END AS true_label
         FROM responses r
         INNER JOIN study_trials st
           ON st.id = r.trial_id AND st.study_id = r.study_id
         LEFT JOIN stimuli sing ON sing.id = st.single_stimulus_id
         LEFT JOIN stimuli stim ON stim.id = COALESCE(
           st.single_stimulus_id,
           st.human_stimulus_id
         )
         WHERE 1=1 ${dateSql}
       )
       SELECT
         modality,
         COALESCE(
           SUM(CASE WHEN true_label = 'ai' AND choice_label = 'ai' THEN 1 ELSE 0 END),
           0
         )::int AS true_ai_pred_ai,
         COALESCE(
           SUM(CASE WHEN true_label = 'ai' AND choice_label = 'human' THEN 1 ELSE 0 END),
           0
         )::int AS true_ai_pred_human,
         COALESCE(
           SUM(
             CASE
               WHEN true_label = 'human' AND choice_label = 'ai' THEN 1 ELSE 0
             END
           ),
           0
         )::int AS true_human_pred_ai,
         COALESCE(
           SUM(
             CASE
               WHEN true_label = 'human' AND choice_label = 'human' THEN 1 ELSE 0
             END
           ),
           0
         )::int AS true_human_pred_human
       FROM base
       WHERE true_label IN ('ai', 'human')
         AND choice_label IN ('ai', 'human')
       GROUP BY modality`,
      dateParams
    );

    const demographicsParticipantsByEducation = await db.query(
      `WITH eligible AS (
         SELECT DISTINCT r.participant_id
         FROM responses r
         WHERE 1=1 ${dateSql}
       )
       SELECT
         p.education_level AS bucket,
         COUNT(*)::int AS participant_count
       FROM eligible e
       INNER JOIN participants p ON p.id = e.participant_id
       WHERE p.education_level IS NOT NULL
         AND TRIM(p.education_level) <> ''
       GROUP BY p.education_level
       ORDER BY participant_count DESC, bucket ASC`,
      dateParams
    );

    const demographicsParticipantsByAiExposure = await db.query(
      `WITH eligible AS (
         SELECT DISTINCT r.participant_id
         FROM responses r
         WHERE 1=1 ${dateSql}
       )
       SELECT
         p.ai_literacy AS bucket,
         COUNT(*)::int AS participant_count
       FROM eligible e
       INNER JOIN participants p ON p.id = e.participant_id
       WHERE p.ai_literacy IS NOT NULL
         AND TRIM(p.ai_literacy) <> ''
       GROUP BY p.ai_literacy
       ORDER BY participant_count DESC, bucket ASC`,
      dateParams
    );

    const demographicsParticipantsOmitted = await db.query(
      `WITH eligible AS (
         SELECT DISTINCT r.participant_id
         FROM responses r
         WHERE 1=1 ${dateSql}
       )
       SELECT
         COUNT(*)::int AS omitted_participant_count
       FROM eligible e
       INNER JOIN participants p ON p.id = e.participant_id
       WHERE (p.education_level IS NULL OR TRIM(p.education_level) = '')
         AND (p.ai_literacy IS NULL OR TRIM(p.ai_literacy) = '')`,
      dateParams
    );

    const demographicsAccuracyByEducationModality = await db.query(
      `SELECT
         p.education_level AS education_level,
         COALESCE(stim.modality::text, 'unknown') AS modality,
         COUNT(r.id)::int AS response_count,
         COALESCE(
           SUM(CASE WHEN r.is_correct IS TRUE THEN 1 ELSE 0 END),
           0
         )::int AS correct_count,
         COALESCE(
           SUM(CASE WHEN r.is_correct IS FALSE THEN 1 ELSE 0 END),
           0
         )::int AS incorrect_count
       FROM responses r
       INNER JOIN participants p ON p.id = r.participant_id
       INNER JOIN study_trials st ON st.id = r.trial_id AND st.study_id = r.study_id
       LEFT JOIN stimuli stim ON stim.id = COALESCE(
         st.single_stimulus_id,
         st.human_stimulus_id
       )
       WHERE 1=1 ${dateSql}
         AND p.education_level IS NOT NULL
         AND TRIM(p.education_level) <> ''
         AND COALESCE(stim.modality::text, 'unknown') IN ('text', 'image', 'audio', 'video')
       GROUP BY p.education_level, COALESCE(stim.modality::text, 'unknown')
       ORDER BY p.education_level ASC, modality ASC`,
      dateParams
    );

    const demographicsAccuracyByAiExposureModality = await db.query(
      `SELECT
         p.ai_literacy AS ai_exposure_level,
         COALESCE(stim.modality::text, 'unknown') AS modality,
         COUNT(r.id)::int AS response_count,
         COALESCE(
           SUM(CASE WHEN r.is_correct IS TRUE THEN 1 ELSE 0 END),
           0
         )::int AS correct_count,
         COALESCE(
           SUM(CASE WHEN r.is_correct IS FALSE THEN 1 ELSE 0 END),
           0
         )::int AS incorrect_count
       FROM responses r
       INNER JOIN participants p ON p.id = r.participant_id
       INNER JOIN study_trials st ON st.id = r.trial_id AND st.study_id = r.study_id
       LEFT JOIN stimuli stim ON stim.id = COALESCE(
         st.single_stimulus_id,
         st.human_stimulus_id
       )
       WHERE 1=1 ${dateSql}
         AND p.ai_literacy IS NOT NULL
         AND TRIM(p.ai_literacy) <> ''
         AND COALESCE(stim.modality::text, 'unknown') IN ('text', 'image', 'audio', 'video')
       GROUP BY p.ai_literacy, COALESCE(stim.modality::text, 'unknown')
       ORDER BY p.ai_literacy ASC, modality ASC`,
      dateParams
    );

    const demographicsConfidenceByEducationModality = await db.query(
      `SELECT
         p.education_level AS education_level,
         COALESCE(stim.modality::text, 'unknown') AS modality,
         COUNT(r.id)::int AS response_count,
         ROUND(AVG(r.confidence)::numeric, 6)::float AS mean_confidence
       FROM responses r
       INNER JOIN participants p ON p.id = r.participant_id
       INNER JOIN study_trials st ON st.id = r.trial_id AND st.study_id = r.study_id
       LEFT JOIN stimuli stim ON stim.id = COALESCE(
         st.single_stimulus_id,
         st.human_stimulus_id
       )
       WHERE 1=1 ${dateSql}
         AND r.confidence IS NOT NULL
         AND p.education_level IS NOT NULL
         AND TRIM(p.education_level) <> ''
         AND COALESCE(stim.modality::text, 'unknown') IN ('text', 'image', 'audio', 'video')
       GROUP BY p.education_level, COALESCE(stim.modality::text, 'unknown')
       ORDER BY p.education_level ASC, modality ASC`,
      dateParams
    );

    const demographicsConfidenceByAiExposureModality = await db.query(
      `SELECT
         p.ai_literacy AS ai_exposure_level,
         COALESCE(stim.modality::text, 'unknown') AS modality,
         COUNT(r.id)::int AS response_count,
         ROUND(AVG(r.confidence)::numeric, 6)::float AS mean_confidence
       FROM responses r
       INNER JOIN participants p ON p.id = r.participant_id
       INNER JOIN study_trials st ON st.id = r.trial_id AND st.study_id = r.study_id
       LEFT JOIN stimuli stim ON stim.id = COALESCE(
         st.single_stimulus_id,
         st.human_stimulus_id
       )
       WHERE 1=1 ${dateSql}
         AND r.confidence IS NOT NULL
         AND p.ai_literacy IS NOT NULL
         AND TRIM(p.ai_literacy) <> ''
         AND COALESCE(stim.modality::text, 'unknown') IN ('text', 'image', 'audio', 'video')
       GROUP BY p.ai_literacy, COALESCE(stim.modality::text, 'unknown')
       ORDER BY p.ai_literacy ASC, modality ASC`,
      dateParams
    );

    const demographicsAccuracyConfidenceByAge = await db.query(
      `SELECT
         p.age::int AS age,
         COUNT(r.id)::int AS response_count,
         COALESCE(
           SUM(CASE WHEN r.is_correct IS TRUE THEN 1 ELSE 0 END),
           0
         )::int AS correct_count,
         COALESCE(
           SUM(CASE WHEN r.is_correct IS FALSE THEN 1 ELSE 0 END),
           0
         )::int AS incorrect_count,
         ROUND(AVG(r.confidence)::numeric, 6)::float AS mean_confidence
       FROM responses r
       INNER JOIN participants p ON p.id = r.participant_id
       WHERE 1=1 ${dateSql}
         AND p.age IS NOT NULL
       GROUP BY p.age
       ORDER BY p.age ASC`,
      dateParams
    );

    const byConfidence = await db.query(
      `SELECT r.confidence AS confidence, COUNT(*)::int AS count
       FROM responses r
       WHERE r.confidence IS NOT NULL ${dateSql}
       GROUP BY r.confidence
       ORDER BY r.confidence ASC`,
      dateParams
    );

    const byEducation = await db.query(
      `SELECT
         COALESCE(p.education_level, '(not provided)') AS bucket,
         COUNT(r.id)::int AS response_count,
         COALESCE(SUM(CASE WHEN r.is_correct IS TRUE THEN 1 ELSE 0 END), 0)::int AS correct_count,
         COALESCE(SUM(CASE WHEN r.is_correct IS FALSE THEN 1 ELSE 0 END), 0)::int AS incorrect_count
       FROM responses r
       INNER JOIN participants p ON p.id = r.participant_id
       WHERE 1=1 ${dateSql}
       GROUP BY COALESCE(p.education_level, '(not provided)')
       ORDER BY response_count DESC`,
      dateParams
    );

    const byAiLiteracy = await db.query(
      `SELECT
         COALESCE(p.ai_literacy, '(not provided)') AS bucket,
         COUNT(r.id)::int AS response_count,
         COALESCE(SUM(CASE WHEN r.is_correct IS TRUE THEN 1 ELSE 0 END), 0)::int AS correct_count,
         COALESCE(SUM(CASE WHEN r.is_correct IS FALSE THEN 1 ELSE 0 END), 0)::int AS incorrect_count
       FROM responses r
       INNER JOIN participants p ON p.id = r.participant_id
       WHERE 1=1 ${dateSql}
       GROUP BY COALESCE(p.ai_literacy, '(not provided)')
       ORDER BY response_count DESC`,
      dateParams
    );

    const demographicsCoverage = await db.query(
      `SELECT
         COUNT(*)::int AS response_with_participant,
         COUNT(*) FILTER (
           WHERE p.age IS NOT NULL
             OR (p.approx_location IS NOT NULL AND TRIM(p.approx_location) <> '')
             OR p.education_level IS NOT NULL
             OR p.ai_literacy IS NOT NULL
         )::int AS responses_linked_to_any_demographic
       FROM responses r
       INNER JOIN participants p ON p.id = r.participant_id
       WHERE 1=1 ${dateSql}`,
      dateParams
    );

    const cov = demographicsCoverage.rows[0] || {};

    const confusionRowByMod = Object.fromEntries(
      confusionByModality.rows.map((r) => [String(r.modality), r])
    );
    const confusion_matrix_by_modality = ['text', 'image', 'audio', 'video'].map(
      (mod) => {
        const hit = confusionRowByMod[mod];
        const a = hit?.true_ai_pred_ai ?? 0;
        const b = hit?.true_ai_pred_human ?? 0;
        const c = hit?.true_human_pred_ai ?? 0;
        const d = hit?.true_human_pred_human ?? 0;
        return {
          modality: mod,
          true_ai_pred_ai: a,
          true_ai_pred_human: b,
          true_human_pred_ai: c,
          true_human_pred_human: d,
          n: a + b + c + d,
        };
      }
    );

    return res.status(200).json({
      success: true,
      data: {
        range: {
          from: fromTs ? fromTs.toISOString() : null,
          to: toTs ? toTs.toISOString() : null,
          all_time: !fromTs && !toTs,
        },
        filter: {
          study_id: studyId,
          all_studies: studyId == null,
        },
        summary: {
          response_count: row.response_count,
          participant_count: row.participant_count,
          study_count: row.study_count,
          trial_count: row.trial_count,
          avg_confidence: row.avg_confidence,
          median_confidence:
            median != null && !Number.isNaN(median) ? median : null,
          correct_count: row.correct_count,
          incorrect_count: row.incorrect_count,
        },
        by_study: byStudy.rows,
        by_task_type: byTaskType.rows,
        by_modality: byModality.rows.map((m) => ({
          modality: m.modality,
          response_count: m.response_count,
          correct_count: m.correct_count,
          incorrect_count: m.incorrect_count,
          avg_confidence:
            m.avg_confidence != null
              ? roundFixed(Number(m.avg_confidence), 3)
              : null,
        })),
        by_modality_task_type: byModalityTaskType.rows.map((r) => ({
          modality: r.modality,
          task_type: r.task_type,
          response_count: r.response_count,
          correct_count: r.correct_count,
          incorrect_count: r.incorrect_count,
          accuracy_pct: accuracyFromCounts(
            r.correct_count ?? 0,
            r.incorrect_count ?? 0
          ),
        })),
        by_modality_task_type_confidence: byModalityTaskTypeConfidence.rows.map(
          (r) => ({
            modality: r.modality,
            task_type: r.task_type,
            response_count: r.response_count,
            mean_confidence:
              r.mean_confidence != null
                ? roundFixed(Number(r.mean_confidence), 3)
                : null,
          })
        ),
        confusion_matrix_by_modality,
        demographics_participants_by_education:
          demographicsParticipantsByEducation.rows,
        demographics_participants_by_ai_exposure:
          demographicsParticipantsByAiExposure.rows,
        demographics_participants_omitted_count:
          demographicsParticipantsOmitted.rows[0]?.omitted_participant_count ??
          0,
        demographics_accuracy_by_education_modality:
          demographicsAccuracyByEducationModality.rows,
        demographics_accuracy_by_ai_exposure_modality:
          demographicsAccuracyByAiExposureModality.rows,
        demographics_confidence_by_education_modality:
          demographicsConfidenceByEducationModality.rows,
        demographics_confidence_by_ai_exposure_modality:
          demographicsConfidenceByAiExposureModality.rows,
        demographics_accuracy_confidence_by_age:
          demographicsAccuracyConfidenceByAge.rows,
        by_confidence: byConfidence.rows,
        by_education: byEducation.rows,
        by_ai_literacy: byAiLiteracy.rows,
        demographics_coverage: {
          response_with_participant: cov.response_with_participant ?? 0,
          responses_linked_to_any_demographic:
            cov.responses_linked_to_any_demographic ?? 0,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'failed to load analytics',
    });
  }
});

module.exports = router;
