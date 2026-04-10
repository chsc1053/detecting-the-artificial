/**
 * File: pages/admin/AdminAnalyticsPage.jsx
 * Purpose: Global analytics - date range, KPIs, Recharts (overview, performance, modalities, demographics).
 */

import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  ComposedChart,
  LineChart,
  Line,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Label,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts'

function authHeaders() {
  const t = localStorage.getItem('adminToken')
  return t ? { Authorization: `Bearer ${t}` } : {}
}

function toLocalDayStart(isoDate) {
  if (!isoDate) return null
  return new Date(`${isoDate}T00:00:00`)
}

function toLocalDayEnd(isoDate) {
  if (!isoDate) return null
  return new Date(`${isoDate}T23:59:59.999`)
}

function accuracyPct(correct, incorrect) {
  const d = correct + incorrect
  if (d === 0) return null
  return Math.round((100 * correct) / d)
}

function renderKpiLabel(label) {
  const words = String(label).trim().toUpperCase().split(/\s+/).filter(Boolean)
  if (words.length <= 1) {
    return (
      <span className="analytics-kpi-label analytics-kpi-label--single">
        {words[0] ?? ''}
      </span>
    )
  }
  const splitAt = Math.ceil(words.length / 2)
  const lineA = words.slice(0, splitAt).join(' ')
  const lineB = words.slice(splitAt).join(' ')
  return (
    <span className="analytics-kpi-label">
      <span>{lineA}</span>
      <span>{lineB}</span>
    </span>
  )
}

/** KPI label: uppercase text with lowercase metric suffix (r, d'). */
function renderCorrelationRKpiLabel() {
  return (
    <span className="analytics-kpi-label">
      <span>CONFIDENCE-ACCURACY</span>
      <span>
        CORRELATION{' '}
        <span className="analytics-kpi-metric-suffix">r</span>
      </span>
    </span>
  )
}

function renderDetectionDprimeKpiLabel() {
  return (
    <span className="analytics-kpi-label">
      <span>SIGNAL DETECTION</span>
      <span>
        SENSITIVITY{' '}
        <span className="analytics-kpi-metric-suffix">d'</span>
      </span>
    </span>
  )
}

function performanceCorrelationKpiDisplay(raw) {
  return raw != null ? raw : '-'
}

function performanceDprimeKpiDisplay(raw) {
  return raw != null ? raw : '-'
}

function summarizeConfidenceAccuracyCorrelation(raw) {
  if (raw == null || raw === '' || !Number.isFinite(Number(raw))) {
    return 'Correlation not available with current filters.'
  }
  const x = Number(raw)
  if (x >= 0.3) {
    return 'Good match: People who feel confident are usually right.'
  }
  if (x <= -0.3) {
    return 'Overconfident: People who feel more confident are often wrong.'
  }
  return 'Weak link: Feeling confident doesn\'t mean you\'re actually right.'
}

function summarizeDprime(raw) {
  if (raw == null || raw === '' || !Number.isFinite(Number(raw))) {
    return 'd\' is not available with current filters.'
  }
  const x = Number(raw)
  if (x > 1) {
    return 'Strong ability: People can clearly tell AI from human content.'
  }
  if (x >= 0.5) {
    return 'Moderate ability: People can somewhat tell AI from human content.'
  }
  if (x > 0) {
    return 'Weak ability: It\'s getting hard to tell AI from human content.'
  }
  return 'Near chance: AI and human content are very hard to tell apart.'
}

function PerformanceMetricHeadingWithInfo({ title, children }) {
  const tipId = useId()
  return (
    <div className="analytics-performance-metric-head">
      <h3 className="analytics-performance-info-title analytics-performance-metric-title">
        {title}
      </h3>
      <div className="analytics-performance-info-hover">
        <button
          type="button"
          className="analytics-performance-info-icon-btn"
          aria-label={`Details: ${title}`}
          aria-describedby={tipId}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
        </button>
        <div
          id={tipId}
          className="analytics-performance-info-popover"
          role="tooltip"
        >
          {children}
        </div>
      </div>
    </div>
  )
}

const PASTEL_CYAN = '#7ED6CA'
const PASTEL_YELLOW = '#F2EFC4'
const PASTEL_ORANGE = '#FFCD91'
const PASTEL_PINK = '#DF81A2'
const PASTEL_VIOLET = '#7D68AD'
const PASTEL_BLUE = '#8797D4'

const PIE_CORRECT_INCORRECT = [PASTEL_CYAN, PASTEL_PINK]
const MODALITY_COLORS = {
  text: PASTEL_CYAN,
  image: PASTEL_PINK,
  audio: PASTEL_BLUE,
  video: PASTEL_ORANGE,
  unknown: PASTEL_VIOLET,
}

/** Radar second series: warm orange - clear hue separation from teal `--color-accent`. */
const RADAR_CONFIDENCE_COLOR = PASTEL_VIOLET

/** Rows × columns = 4 × 2 heatmap (modality × task_type). */
const HEATMAP_MODALITY_ROWS = [
  { key: 'text', label: 'Text' },
  { key: 'image', label: 'Image' },
  { key: 'video', label: 'Video' },
  { key: 'audio', label: 'Audio' },
]

const HEATMAP_TASK_COLS = [
  { key: 'forced_choice', label: 'Forced choice' },
  { key: 'single_item', label: 'Single item' },
]

const ANALYTICS_TAB_PRINT_LABEL = {
  overview: 'Overview',
  performance: 'Performance',
  modalities: 'Modalities',
  demographics: 'Demographics',
}

const ANALYTICS_PROJECT_TITLE = 'Detecting the Artificial'
const ANALYTICS_PROJECT_REPO_URL =
  'https://github.com/chsc1053/detecting-the-artificial'

function heatmapAccuracyCellStyle(accuracyPct) {
  if (accuracyPct == null || Number.isNaN(accuracyPct)) {
    return {
      backgroundColor: 'transparent',
      color: '#101828',
    }
  }
  const t = clamp(accuracyPct, 0, 100) / 100
  const c0 = [255, 205, 145]
  const c1 = [242, 239, 196]
  const c2 = [126, 214, 202]
  let rgb
  if (t <= 0.5) {
    const u = t / 0.5
    rgb = c0.map((v, i) => Math.round(v + (c1[i] - v) * u))
  } else {
    const u = (t - 0.5) / 0.5
    rgb = c1.map((v, i) => Math.round(v + (c2[i] - v) * u))
  }
  return {
    backgroundColor: `rgb(${rgb.join(',')})`,
    color: '#101828',
  }
}

/** Cells from `GET /admin/analytics/performance` → `accuracy_heatmap_task_modality`. */
function TaskModalityAccuracyHeatmap({ rows }) {
  const [hover, setHover] = useState(null)

  const { lookup, unknownN, gridTotal } = useMemo(() => {
    const lookup = new Map()
    let unknownN = 0
    let gridTotal = 0
    for (const r of rows ?? []) {
      lookup.set(`${r.task_type}|${r.modality}`, r)
      if (r.modality === 'unknown') unknownN += r.n_scored ?? 0
    }
    for (const m of HEATMAP_MODALITY_ROWS) {
      for (const t of HEATMAP_TASK_COLS) {
        const c = lookup.get(`${t.key}|${m.key}`)
        if (c && (c.n_scored ?? 0) > 0) gridTotal += c.n_scored
      }
    }
    return { lookup, unknownN, gridTotal }
  }, [rows])

  const showTip = (e, cell, taskLabel, modalityLabel) => {
    if (!cell || (cell.n_scored ?? 0) <= 0) {
      setHover(null)
      return
    }
    setHover({
      fx: e.clientX,
      fy: e.clientY,
      taskLabel,
      modalityLabel,
      accuracyPct: cell.accuracy_pct,
      n: cell.n_scored,
      nCorrect: cell.n_correct,
      nIncorrect: cell.n_incorrect,
    })
  }

  const moveTip = (e) => {
    setHover((prev) =>
      prev ? { ...prev, fx: e.clientX, fy: e.clientY } : null
    )
  }

  return (
    <div className="analytics-heatmap-wrap">
      <table className="analytics-heatmap-table">
        <thead>
          <tr>
            <th scope="col" className="analytics-heatmap-corner" />
            {HEATMAP_TASK_COLS.map((t) => (
              <th key={t.key} scope="col" className="analytics-heatmap-col-head">
                {t.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {HEATMAP_MODALITY_ROWS.map((m) => (
            <tr key={m.key}>
              <th scope="row" className="analytics-heatmap-row-head">
                {m.label}
              </th>
              {HEATMAP_TASK_COLS.map((t) => {
                const cell = lookup.get(`${t.key}|${m.key}`)
                const n = cell?.n_scored ?? 0
                const pct = cell?.accuracy_pct
                const style = heatmapAccuracyCellStyle(
                  n > 0 ? pct : null
                )
                return (
                  <td
                    key={`${m.key}|${t.key}`}
                    className={`analytics-heatmap-cell ${n > 0 ? 'analytics-heatmap-cell--filled' : ''}`}
                    style={style}
                    onMouseEnter={(e) => showTip(e, cell, t.label, m.label)}
                    onMouseMove={moveTip}
                    onMouseLeave={() => setHover(null)}
                  >
                    {n > 0 ? (
                      <>
                        <span className="analytics-heatmap-pct">
                          {pct != null ? `${pct}%` : '-'}
                        </span>
                        <span className="analytics-heatmap-n">n = {n}</span>
                      </>
                    ) : (
                      <span className="analytics-heatmap-empty-cell" style={{ color: '#101828' }}>
                        -
                      </span>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="analytics-heatmap-legend" aria-hidden="true">
        <span className="analytics-heatmap-legend-label">0%</span>
        <div className="analytics-heatmap-legend-bar" />
        <span className="analytics-heatmap-legend-label">100%</span>
      </div>
      {unknownN > 0 && (
        <p className="analytics-heatmap-footnote">
          {unknownN} response{unknownN === 1 ? '' : 's'} with unknown modality
          are not shown in this grid.
        </p>
      )}
      {gridTotal === 0 && unknownN === 0 && (
        <p className="analytics-heatmap-footnote">
          No scored responses fall into these modality × task type cells for the
          current filters.
        </p>
      )}
      {hover && (
        <div
          className="analytics-stack-tooltip analytics-floating-chart-tooltip"
          style={{
            position: 'fixed',
            left: hover.fx + 14,
            top: hover.fy + 14,
            zIndex: 2000,
            pointerEvents: 'none',
          }}
        >
          <p className="analytics-stack-tooltip-title">
            {hover.modalityLabel} · {hover.taskLabel}
          </p>
          <p>Accuracy: {hover.accuracyPct ?? '-'}%</p>
          <p>
            Correct / incorrect: {hover.nCorrect} / {hover.nIncorrect}
          </p>
          <p>Total (n): {hover.n}</p>
        </div>
      )}
    </div>
  )
}

/** Box-plot summary from `GET /admin/analytics/performance` → `confidence_box_by_outcome`. */
function ConfidenceOutcomeBoxPlot({ correctBox, incorrectBox }) {
  const [hover, setHover] = useState(null)

  const VB_W = 440
  const VB_H = 320
  const padL = 48
  const padR = 18
  const padT = 14
  const padB = 48
  const plotW = VB_W - padL - padR
  const plotH = VB_H - padT - padB

  const yPix = (v) => {
    const c = clamp(Number(v), 1, 5)
    return padT + plotH - ((c - 1) / 4) * plotH
  }

  const slots = [
    { label: 'Correct', stats: correctBox, color: PIE_CORRECT_INCORRECT[0] },
    {
      label: 'Incorrect',
      stats: incorrectBox,
      color: PIE_CORRECT_INCORRECT[1],
    },
  ]

  const tickVals = [1, 2, 3, 4, 5]
  const slotW = plotW / slots.length

  const describeBox = (label, stats) => {
    if (!stats) return `${label}: no responses`
    const { n, min, q1, median, q3, max } = stats
    return `${label}, n ${n}: min ${min}, Q1 ${q1}, median ${median}, Q3 ${q3}, max ${max}`
  }

  const ariaLabel = [
    'Confidence box plots for correct versus incorrect responses.',
    describeBox('Correct', correctBox),
    describeBox('Incorrect', incorrectBox),
  ].join(' ')

  const showBoxTooltip = (e, slot) => {
    if (!slot.stats) return
    setHover({
      outcomeLabel: slot.label,
      stats: slot.stats,
      fx: e.clientX,
      fy: e.clientY,
    })
  }

  const moveBoxTooltip = (e) => {
    setHover((prev) =>
      prev ? { ...prev, fx: e.clientX, fy: e.clientY } : null
    )
  }

  function renderOneBox(cx, stats, color) {
    if (!stats) return null
    const { min, q1, median, q3, max } = stats
    const bw = Math.min(30, slotW * 0.26)
    const capW = Math.min(11, bw * 0.45)
    const yMin = yPix(min)
    const yMax = yPix(max)
    const yQ1 = yPix(q1)
    const yQ3 = yPix(q3)
    const yMed = yPix(median)
    const yTop = Math.min(yQ1, yQ3)
    let height = Math.abs(yQ1 - yQ3)
    let rectY = yTop
    if (height < 3) {
      rectY = yTop - (3 - height) / 2
      height = 3
    }
    return (
      <g>
        <line
          x1={cx}
          y1={yMin}
          x2={cx}
          y2={yMax}
          stroke={PASTEL_VIOLET}
          strokeWidth={1.5}
        />
        <line
          x1={cx - capW}
          y1={yMin}
          x2={cx + capW}
          y2={yMin}
          stroke={PASTEL_VIOLET}
          strokeWidth={1.5}
        />
        <line
          x1={cx - capW}
          y1={yMax}
          x2={cx + capW}
          y2={yMax}
          stroke={PASTEL_VIOLET}
          strokeWidth={1.5}
        />
        <rect
          x={cx - bw}
          y={rectY}
          width={bw * 2}
          height={height}
          fill={color}
          fillOpacity={0.22}
          stroke={color}
          strokeWidth={1.75}
          rx={3}
          ry={3}
        />
        <line
          x1={cx - bw}
          y1={yMed}
          x2={cx + bw}
          y2={yMed}
          stroke={PASTEL_VIOLET}
          strokeWidth={2.25}
        />
      </g>
    )
  }

  const fmt = (v) =>
    v != null && Number.isFinite(Number(v)) ? Number(v).toFixed(2) : '-'

  return (
    <div className="analytics-confidence-box-plot-wrap">
      <svg
        className="analytics-confidence-box-plot"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid meet"
        width="100%"
        height={320}
        role="img"
        aria-label={ariaLabel}
      >
      {tickVals.map((tv) => {
        const y = yPix(tv)
        return (
          <line
            key={`grid-${tv}`}
            x1={padL}
            y1={y}
            x2={VB_W - padR}
            y2={y}
            stroke={PASTEL_YELLOW}
            strokeDasharray="3 3"
          />
        )
      })}
      <line
        x1={padL}
        y1={padT}
        x2={padL}
        y2={padT + plotH}
        stroke={PASTEL_BLUE}
        strokeWidth={1}
      />
      {tickVals.map((tv) => (
        <text
          key={`yt-${tv}`}
          x={padL - 10}
          y={yPix(tv)}
          textAnchor="end"
          dominantBaseline="middle"
          fontSize={12}
          fill="#101828"
        >
          {tv}
        </text>
      ))}
      {slots.map((slot, i) => {
        const cx = padL + slotW * (i + 0.5)
        return (
          <g key={slot.label}>
            {renderOneBox(cx, slot.stats, slot.color)}
            <text
              x={cx}
              y={VB_H - 16}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={13}
              fontWeight={600}
              fill="#101828"
            >
              {slot.label}
            </text>
            {slot.stats && (
              <text
                x={cx}
                y={VB_H - 34}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={11}
                fill="#101828"
              >
                n = {slot.stats.n}
              </text>
            )}
            {!slot.stats && (
              <text
                x={cx}
                y={padT + plotH * 0.5}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={12}
                fill="#101828"
              >
                No responses
              </text>
            )}
          </g>
        )
      })}
      <text
        x={16}
        y={padT + plotH * 0.5}
        textAnchor="middle"
        dominantBaseline="middle"
        transform={`rotate(-90 16 ${padT + plotH * 0.5})`}
        fontSize={12}
        fill="#101828"
      >
        Confidence (1–5)
      </text>
        {slots.map((slot, i) => {
          if (!slot.stats) return null
          const cx = padL + slotW * (i + 0.5)
          return (
            <rect
              key={`hit-${slot.label}`}
              x={cx - slotW / 2 + 4}
              y={padT}
              width={slotW - 8}
              height={plotH}
              fill="transparent"
              cursor="crosshair"
              onMouseEnter={(e) => showBoxTooltip(e, slot)}
              onMouseMove={moveBoxTooltip}
              onMouseLeave={() => setHover(null)}
            />
          )
        })}
      </svg>
      {hover && (
        <div
          className="analytics-stack-tooltip analytics-floating-chart-tooltip analytics-confidence-box-hover-tooltip"
          style={{
            position: 'fixed',
            left: hover.fx + 14,
            top: hover.fy + 14,
            zIndex: 2000,
            pointerEvents: 'none',
          }}
        >
          <p className="analytics-stack-tooltip-title">
            {hover.outcomeLabel} responses
          </p>
          <p>n = {hover.stats.n}</p>
          <p>Min: {fmt(hover.stats.min)}</p>
          <p>Q1: {fmt(hover.stats.q1)}</p>
          <p>Median: {fmt(hover.stats.median)}</p>
          <p>Q3: {fmt(hover.stats.q3)}</p>
          <p>Max: {fmt(hover.stats.max)}</p>
        </div>
      )}
    </div>
  )
}

function hashString(s) {
  const str = String(s ?? '')
  let h = 0
  for (let i = 0; i < str.length; i += 1) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0
  }
  return h
}

function jitterFromId(id, span) {
  const h = hashString(id)
  const f = (h % 10000) / 10000
  return (f * 2 - 1) * span
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v))
}

/** Linear map mean confidence (1–5) to 0–100 to share radar scale with accuracy %. */
function confidenceToRadarScale(mean1to5) {
  if (mean1to5 == null || !Number.isFinite(Number(mean1to5))) return null
  const x = clamp(Number(mean1to5), 1, 5)
  return Math.round(((x - 1) / 4) * 100)
}

function linearRegression(points) {
  if (!points || points.length < 2) return null
  const n = points.length
  let sx = 0
  let sy = 0
  let sxy = 0
  let sxx = 0
  for (const p of points) {
    sx += p.x
    sy += p.y
    sxy += p.x * p.y
    sxx += p.x * p.x
  }
  const den = n * sxx - sx * sx
  if (den === 0) return null
  const slope = (n * sxy - sx * sy) / den
  const intercept = (sy - slope * sx) / n
  return { slope, intercept }
}

function ScatterPerfTooltip({ active, payload, viewMode }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  if (!row) return null
  return (
    <div className="analytics-stack-tooltip">
      <p className="analytics-stack-tooltip-title">
        {viewMode === 'response'
          ? `Response ${String(row.id).slice(0, 8)}…`
          : `Participant ${String(row.id).slice(0, 8)}…`}
      </p>
      <p>Modality: {row.modality}</p>
      <p>Confidence: {Number(row.rawX).toFixed(2)}</p>
      <p>Accuracy: {Number(row.rawY).toFixed(2)}</p>
      <p>Correct: {row.correctCount}</p>
      <p>Total: {row.totalCount}</p>
    </div>
  )
}

function CalibrationLineTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  if (!row) return null
  return (
    <div className="analytics-stack-tooltip">
      <p className="analytics-stack-tooltip-title">{row.binLabel}</p>
      <p>Midpoint: {Number(row.x).toFixed(1)}</p>
      <p>Responses (n): {row.n}</p>
      <p>
        Observed accuracy:{' '}
        {row.meanAccuracy != null
          ? Number(row.meanAccuracy).toFixed(3)
          : '-'}
      </p>
      <p>Perfect calibration: {Number(row.perfect).toFixed(3)}</p>
    </div>
  )
}

function StackedAccuracyTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  if (!row) return null
  const { name, accurate, notAccurate, total, accuracyPct } = row
  return (
    <div className="analytics-stack-tooltip">
      <p className="analytics-stack-tooltip-title">{name}</p>
      <p>Correct: {accurate}</p>
      <p>Incorrect: {notAccurate}</p>
      <p>Total: {total}</p>
      {accuracyPct != null && (
        <p className="analytics-stack-tooltip-accent">
          Accuracy: {accuracyPct}%
        </p>
      )}
    </div>
  )
}

function OverviewCorrectnessPieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  if (!row) return null
  return (
    <div className="analytics-stack-tooltip">
      <p className="analytics-stack-tooltip-title">{row.name}</p>
      <p>Responses: {row.value}</p>
    </div>
  )
}

function ModalityTaskGroupedTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  if (!row) return null
  return (
    <div className="analytics-stack-tooltip">
      <p className="analytics-stack-tooltip-title">{row.name}</p>
      <p>
        Forced choice:{' '}
        {row.forcedChoiceAcc != null
          ? `${row.forcedChoiceAcc}% (n=${row.fcN})`
          : '-'}
      </p>
      <p>
        Single item:{' '}
        {row.singleItemAcc != null
          ? `${row.singleItemAcc}% (n=${row.siN})`
          : '-'}
      </p>
    </div>
  )
}

function ModalityTaskGroupedConfidenceTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  if (!row) return null
  const fmt = (v) =>
    v != null && Number.isFinite(Number(v)) ? Number(v).toFixed(2) : '-'
  return (
    <div className="analytics-stack-tooltip">
      <p className="analytics-stack-tooltip-title">{row.name}</p>
      <p>
        Forced choice:{' '}
        {row.forcedChoiceConf != null
          ? `mean ${fmt(row.forcedChoiceConf)} (n=${row.fcN})`
          : '-'}
      </p>
      <p>
        Single item:{' '}
        {row.singleItemConf != null
          ? `mean ${fmt(row.singleItemConf)} (n=${row.siN})`
          : '-'}
      </p>
    </div>
  )
}

function DemographicsEducationModalityTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  if (!row) return null
  const line = (title, acc, n) => (
    <p>
      {title}:{' '}
      {acc != null ? `${acc}% (n=${n ?? 0})` : '-'}
    </p>
  )
  return (
    <div className="analytics-stack-tooltip">
      <p className="analytics-stack-tooltip-title">{label}</p>
      {line('Text', row.textAcc, row.textN)}
      {line('Image', row.imageAcc, row.imageN)}
      {line('Audio', row.audioAcc, row.audioN)}
      {line('Video', row.videoAcc, row.videoN)}
    </div>
  )
}

function DemographicsEducationModalityConfidenceTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  if (!row) return null
  const line = (title, mean, n) => (
    <p>
      {title}:{' '}
      {mean != null ? `mean ${Number(mean).toFixed(2)} (n=${n ?? 0})` : '-'}
    </p>
  )
  return (
    <div className="analytics-stack-tooltip">
      <p className="analytics-stack-tooltip-title">{label}</p>
      {line('Text', row.textConf, row.textN)}
      {line('Image', row.imageConf, row.imageN)}
      {line('Audio', row.audioConf, row.audioN)}
      {line('Video', row.videoConf, row.videoN)}
    </div>
  )
}

function DemographicsAgeLinesTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  if (!row) return null
  return (
    <div className="analytics-stack-tooltip">
      <p className="analytics-stack-tooltip-title">Age {row.age}</p>
      <p>Responses (n): {row.n}</p>
      <p>
        Accuracy:{' '}
        {row.accuracyPct != null ? `${row.accuracyPct}%` : '-'}
      </p>
      <p>
        Confidence (scaled):{' '}
        {row.confidenceScaled != null ? `${row.confidenceScaled}/100` : '-'}
      </p>
      <p>
        Mean confidence:{' '}
        {row.meanConfidenceRaw != null
          ? Number(row.meanConfidenceRaw).toFixed(2)
          : '-'}{' '}
        (1-5)
      </p>
    </div>
  )
}

function ModalityRadarTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  if (!row) return null
  const scaled =
    row.meanConfidenceRaw != null
      ? confidenceToRadarScale(row.meanConfidenceRaw)
      : null
  return (
    <div className="analytics-stack-tooltip">
      <p className="analytics-stack-tooltip-title">{row.modality}</p>
      <p>
        Accuracy:{' '}
        {row.n > 0 && row.accuracyDisplay != null
          ? `${row.accuracyDisplay}%`
          : '-'}
        {row.n > 0 ? ` (n=${row.n})` : ''}
      </p>
      <p>
        Mean confidence:{' '}
        {row.meanConfidenceRaw != null
          ? Number(row.meanConfidenceRaw).toFixed(2)
          : '-'}{' '}
        (1–5)
      </p>
      <p>
        Confidence on chart:{' '}
        {scaled != null ? `${scaled}/100` : '-'}
      </p>
    </div>
  )
}

function confusionMatrixCellStyle(count, maxInMatrix, isCorrectCell) {
  if (maxInMatrix <= 0) {
    return { backgroundColor: PASTEL_YELLOW, color: '#101828' }
  }
  if (count <= 0) {
    return { backgroundColor: PASTEL_YELLOW, color: '#101828' }
  }
  const t = count / maxInMatrix
  if (isCorrectCell) {
    return {
      backgroundColor: `rgba(126, 214, 202, ${0.22 + t * 0.38})`,
      color: '#101828',
      fontWeight: 600,
    }
  }
  return {
    backgroundColor: `rgba(223, 129, 162, ${0.2 + t * 0.34})`,
    color: '#101828',
    fontWeight: 600,
  }
}

/** Rows = ground truth; columns = participant response (choice_label). */
function ModalityConfusionMatricesBlock({ matrices }) {
  return (
    <div className="analytics-confusion-matrices">
      {matrices.map((m) => {
        const maxC = Math.max(
          m.true_ai_pred_ai ?? 0,
          m.true_ai_pred_human ?? 0,
          m.true_human_pred_ai ?? 0,
          m.true_human_pred_human ?? 0,
          1
        )
        const n = m.n ?? 0
        const title =
          m.modality?.length > 0
            ? m.modality.charAt(0).toUpperCase() + m.modality.slice(1)
            : String(m.modality ?? '')
        return (
          <div key={m.modality} className="analytics-confusion-matrix-card">
            <h4 className="analytics-confusion-matrix-title">{title}</h4>
            {n === 0 ? (
              <p className="analytics-confusion-matrix-empty">No counts</p>
            ) : (
              <table className="analytics-confusion-table">
                <thead>
                  <tr>
                    <th className="analytics-confusion-corner" scope="col">
                      <span className="analytics-confusion-corner-label">
                        Ground truth
                      </span>
                    </th>
                    <th scope="col">Chose AI</th>
                    <th scope="col">Chose human</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">True AI</th>
                    <td
                      style={confusionMatrixCellStyle(
                        m.true_ai_pred_ai ?? 0,
                        maxC,
                        true
                      )}
                    >
                      {m.true_ai_pred_ai ?? 0}
                    </td>
                    <td
                      style={confusionMatrixCellStyle(
                        m.true_ai_pred_human ?? 0,
                        maxC,
                        false
                      )}
                    >
                      {m.true_ai_pred_human ?? 0}
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">True human</th>
                    <td
                      style={confusionMatrixCellStyle(
                        m.true_human_pred_ai ?? 0,
                        maxC,
                        false
                      )}
                    >
                      {m.true_human_pred_ai ?? 0}
                    </td>
                    <td
                      style={confusionMatrixCellStyle(
                        m.true_human_pred_human ?? 0,
                        maxC,
                        true
                      )}
                    >
                      {m.true_human_pred_human ?? 0}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
            {n > 0 && (
              <p className="analytics-confusion-matrix-n">n = {n} scored</p>
            )}
          </div>
        )
      })}
    </div>
  )
}

function AnalyticsPrintFooter() {
  return (
    <footer className="analytics-print-footer" aria-hidden="true">
      <div className="analytics-print-footer__inner">
        <div className="analytics-print-footer__brand">
          <svg
            className="analytics-print-footer__icon"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            aria-hidden
            focusable="false"
          >
            <path
              fill="currentColor"
              d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"
            />
          </svg>
          <span className="analytics-print-footer__title">
            {ANALYTICS_PROJECT_TITLE}
          </span>
        </div>
        <a
          className="analytics-print-footer__link"
          href={ANALYTICS_PROJECT_REPO_URL}
        >
          <svg
            className="analytics-print-footer__icon analytics-print-footer__icon--github"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            aria-hidden
            focusable="false"
          >
            <path
              fill="currentColor"
              d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.06-.02-2.08-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.08-.74.09-.72.09-.72 1.2.08 1.83 1.23 1.83 1.23 1.07 1.83 2.81 1.3 3.5 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.17 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 5.94 0c2.28-1.55 3.29-1.23 3.29-1.23.66 1.65.24 2.87.12 3.17.77.84 1.23 1.91 1.23 3.22 0 4.61-2.8 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.69.83.57A12 12 0 0 0 24 12c0-6.63-5.37-12-12-12z"
            />
          </svg>
          <span className="analytics-print-footer__url">
            github.com/chsc1053/detecting-the-artificial
          </span>
        </a>
      </div>
    </footer>
  )
}

function EmptyAnalyticsMessage({ studyName }) {
  return (
    <div className="admin-panel-card analytics-empty-card">
      <p className="analytics-empty-title">No responses in this range</p>
      <p className="analytics-empty-detail">
        {studyName ? (
          <>
            Nothing matched for <strong>{studyName}</strong> with the current
            filters. Try all studies, widen the date range, or check that study’s{' '}
            <strong>Responses</strong> tab.
          </>
        ) : (
          <>
            Run a study and collect trial answers, pick a different study, or widen
            the date range. Open a study’s <strong>Responses</strong> tab to inspect
            rows.
          </>
        )}
      </p>
    </div>
  )
}

export function AdminAnalyticsPage() {
  const [searchParams] = useSearchParams()
  const [rangeMode, setRangeMode] = useState('all')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [appliedFrom, setAppliedFrom] = useState(null)
  const [appliedTo, setAppliedTo] = useState(null)

  const [tab, setTab] = useState('overview')
  const [load, setLoad] = useState('idle')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  const [performanceLoad, setPerformanceLoad] = useState('idle')
  const [performanceData, setPerformanceData] = useState(null)
  const [performanceError, setPerformanceError] = useState('')
  const [performanceViewMode, setPerformanceViewMode] = useState('response')

  const [studiesList, setStudiesList] = useState([])
  const [studiesLoad, setStudiesLoad] = useState('idle')
  const [appliedStudyId, setAppliedStudyId] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function run() {
      setStudiesLoad('loading')
      try {
        const res = await fetch('/api/studies')
        const payload = await res.json()
        if (cancelled) return
        if (res.ok && payload?.success) {
          const rows = payload.data ?? []
          rows.sort((a, b) =>
            String(a.name).localeCompare(String(b.name), undefined, {
              sensitivity: 'base',
            })
          )
          setStudiesList(rows)
          setStudiesLoad('ok')
        } else {
          setStudiesList([])
          setStudiesLoad('error')
        }
      } catch {
        if (!cancelled) {
          setStudiesList([])
          setStudiesLoad('error')
        }
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (studiesLoad !== 'ok') return
    const sid = searchParams.get('study_id')
    if (!sid) return
    if (!studiesList.some((s) => s.id === sid)) return
    setAppliedStudyId(sid)
  }, [studiesLoad, studiesList, searchParams])

  const selectedStudyName = useMemo(() => {
    if (!appliedStudyId) return null
    const s = studiesList.find((x) => x.id === appliedStudyId)
    return s?.name ?? null
  }, [appliedStudyId, studiesList])

  const filtersStatusText = useMemo(() => {
    const scope =
      appliedStudyId == null
        ? 'Scoped to all studies'
        : selectedStudyName
          ? `Scoped to “${selectedStudyName}”`
          : 'Scoped to one study'
    let timePart
    if (rangeMode === 'custom' && appliedFrom && appliedTo) {
      const a = appliedFrom.toLocaleDateString(undefined, {
        dateStyle: 'medium',
      })
      const b = appliedTo.toLocaleDateString(undefined, {
        dateStyle: 'medium',
      })
      timePart = `viewing ${a} – ${b} (local calendar days)`
    } else {
      timePart = 'viewing the full history'
    }
    return `${scope} and ${timePart}.`
  }, [
    appliedStudyId,
    selectedStudyName,
    rangeMode,
    appliedFrom,
    appliedTo,
  ])

  const queryString = useMemo(() => {
    const q = new URLSearchParams()
    if (appliedFrom) q.set('from', appliedFrom.toISOString())
    if (appliedTo) q.set('to', appliedTo.toISOString())
    if (appliedStudyId) q.set('study_id', appliedStudyId)
    const s = q.toString()
    return s ? `?${s}` : ''
  }, [appliedFrom, appliedTo, appliedStudyId])

  const fetchOverview = useCallback(async () => {
    setLoad('loading')
    setError('')
    try {
      const res = await fetch(`/api/admin/analytics${queryString}`, {
        headers: { ...authHeaders() },
      })
      const payload = await res.json()
      if (res.status === 404) {
        setData(null)
        setError(payload?.error || 'Study not found')
        setLoad('error')
        return
      }
      if (!res.ok || !payload?.success) {
        setData(null)
        setError(payload?.error || 'Could not load analytics')
        setLoad('error')
        return
      }
      setData(payload.data)
      setLoad('ok')
    } catch {
      setData(null)
      setError('Could not reach the server')
      setLoad('error')
    }
  }, [queryString])

  const fetchPerformance = useCallback(async () => {
    setPerformanceLoad('loading')
    setPerformanceError('')
    try {
      const res = await fetch(
        `/api/admin/analytics/performance${queryString}`,
        { headers: { ...authHeaders() } }
      )
      const payload = await res.json()
      if (res.status === 404) {
        setPerformanceData(null)
        setPerformanceError(payload?.error || 'Study not found')
        setPerformanceLoad('error')
        return
      }
      if (!res.ok || !payload?.success) {
        setPerformanceData(null)
        setPerformanceError(
          payload?.error || 'Could not load performance metrics'
        )
        setPerformanceLoad('error')
        return
      }
      setPerformanceData(payload.data)
      setPerformanceLoad('ok')
    } catch {
      setPerformanceData(null)
      setPerformanceError('Could not reach the server')
      setPerformanceLoad('error')
    }
  }, [queryString])

  useEffect(() => {
    fetchOverview()
  }, [fetchOverview])

  useEffect(() => {
    if (tab !== 'performance') return
    fetchPerformance()
  }, [tab, fetchPerformance])

  function applyAllTime() {
    setRangeMode('all')
    setAppliedFrom(null)
    setAppliedTo(null)
  }

  function applyCustom() {
    if (!customFrom || !customTo) {
      setError('Choose both start and end dates for a custom range.')
      return
    }
    const a = toLocalDayStart(customFrom)
    const b = toLocalDayEnd(customTo)
    if (a > b) {
      setError('Start date must be on or before end date.')
      return
    }
    setError('')
    setRangeMode('custom')
    setAppliedFrom(a)
    setAppliedTo(b)
  }

  const summary = data?.summary
  const hasResponses = (summary?.response_count ?? 0) > 0

  const overviewAccuracy = useMemo(() => {
    if (!summary) return null
    return accuracyPct(summary.correct_count, summary.incorrect_count)
  }, [summary])

  const overviewCorrectIncorrectPie = useMemo(() => {
    if (!summary) return []
    const rows = [
      { name: 'Correct', value: summary.correct_count },
      { name: 'Incorrect', value: summary.incorrect_count },
    ].filter((r) => r.value > 0)
    return rows
  }, [summary])

  const modalityAccuracyData = useMemo(() => {
    return (data?.by_modality ?? [])
      .filter((m) => m.response_count > 0)
      .map((m) => {
        const accurate = m.correct_count
        const notAccurate = m.incorrect_count ?? 0
        const pct = accuracyPct(m.correct_count, m.incorrect_count)
        return {
          name: m.modality,
          accurate,
          notAccurate,
          total: m.response_count,
          accuracyPct: pct,
          accuracyBar: pct ?? 0,
        }
      })
  }, [data])

  const modalityQuickAccuracyKpis = useMemo(() => {
    const byKey = Object.fromEntries(
      (data?.by_modality ?? []).map((m) => [String(m.modality), m])
    )
    return ['text', 'image', 'audio', 'video'].map((key) => {
      const row = byKey[key]
      const n = row?.response_count ?? 0
      const pct =
        row && n > 0
          ? accuracyPct(row.correct_count, row.incorrect_count)
          : null
      return {
        key,
        kpiLabel: `${key.charAt(0).toUpperCase()}${key.slice(1)} accuracy`,
        pct,
        n,
      }
    })
  }, [data])

  const modalityTaskGroupedBarData = useMemo(() => {
    const rows = data?.by_modality_task_type ?? []
    const map = new Map()
    for (const r of rows) {
      const mod = String(r.modality)
      if (!['text', 'image', 'audio', 'video'].includes(mod)) continue
      map.set(`${mod}|${r.task_type}`, r)
    }
    return ['text', 'image', 'audio', 'video'].map((mod) => {
      const fc = map.get(`${mod}|forced_choice`)
      const si = map.get(`${mod}|single_item`)
      const fcN = fc?.response_count ?? 0
      const siN = si?.response_count ?? 0
      return {
        name: mod.charAt(0).toUpperCase() + mod.slice(1),
        forcedChoiceAcc:
          fcN > 0 ? accuracyPct(fc.correct_count, fc.incorrect_count) : null,
        singleItemAcc:
          siN > 0 ? accuracyPct(si.correct_count, si.incorrect_count) : null,
        fcN,
        siN,
      }
    })
  }, [data])

  const hasModalityTaskGroupedChartData = useMemo(
    () =>
      modalityTaskGroupedBarData.some(
        (d) => d.forcedChoiceAcc != null || d.singleItemAcc != null
      ),
    [modalityTaskGroupedBarData]
  )

  const modalityTaskGroupedConfidenceData = useMemo(() => {
    const rows = data?.by_modality_task_type_confidence ?? []
    const map = new Map()
    for (const r of rows) {
      const mod = String(r.modality)
      if (!['text', 'image', 'audio', 'video'].includes(mod)) continue
      map.set(`${mod}|${r.task_type}`, r)
    }
    return ['text', 'image', 'audio', 'video'].map((mod) => {
      const fc = map.get(`${mod}|forced_choice`)
      const si = map.get(`${mod}|single_item`)
      const fcN = fc?.response_count ?? 0
      const siN = si?.response_count ?? 0
      return {
        name: mod.charAt(0).toUpperCase() + mod.slice(1),
        forcedChoiceConf:
          fcN > 0 && fc?.mean_confidence != null
            ? Number(fc.mean_confidence)
            : null,
        singleItemConf:
          siN > 0 && si?.mean_confidence != null
            ? Number(si.mean_confidence)
            : null,
        fcN,
        siN,
      }
    })
  }, [data])

  const hasModalityTaskGroupedConfidenceData = useMemo(
    () =>
      modalityTaskGroupedConfidenceData.some(
        (d) => d.forcedChoiceConf != null || d.singleItemConf != null
      ),
    [modalityTaskGroupedConfidenceData]
  )

  const modalityRadarData = useMemo(() => {
    const byKey = Object.fromEntries(
      (data?.by_modality ?? []).map((m) => [String(m.modality), m])
    )
    return ['text', 'image', 'audio', 'video'].map((key) => {
      const row = byKey[key]
      const n = row?.response_count ?? 0
      const acc =
        n > 0 ? accuracyPct(row.correct_count, row.incorrect_count) : null
      const meanConf =
        n > 0 && row?.avg_confidence != null
          ? Number(row.avg_confidence)
          : null
      const scaled =
        meanConf != null ? confidenceToRadarScale(meanConf) : null
      return {
        modality: key.charAt(0).toUpperCase() + key.slice(1),
        accuracy: acc ?? 0,
        confidenceRadar: scaled ?? 0,
        accuracyDisplay: acc,
        meanConfidenceRaw: meanConf,
        n,
      }
    })
  }, [data])

  const hasModalityRadarData = useMemo(
    () =>
      modalityRadarData.some(
        (d) =>
          d.n > 0 &&
          (d.accuracyDisplay != null || d.meanConfidenceRaw != null)
      ),
    [modalityRadarData]
  )

  const confusionMatrixByModality = useMemo(
    () => data?.confusion_matrix_by_modality ?? [],
    [data]
  )

  const hasConfusionMatrixByModality = useMemo(
    () => confusionMatrixByModality.some((m) => (m.n ?? 0) > 0),
    [confusionMatrixByModality]
  )

  const demographicsParticipantsByEducation = useMemo(
    () => data?.demographics_participants_by_education ?? [],
    [data]
  )

  const demographicsParticipantsByAiExposure = useMemo(
    () => data?.demographics_participants_by_ai_exposure ?? [],
    [data]
  )

  const demographicsParticipantsOmittedCount = useMemo(
    () => data?.demographics_participants_omitted_count ?? 0,
    [data]
  )

  const demographicsAccuracyByEducationModality = useMemo(() => {
    const rows = data?.demographics_accuracy_by_education_modality ?? []
    const map = new Map()
    for (const r of rows) {
      const edu = String(r.education_level)
      const modality = String(r.modality)
      if (!['text', 'image', 'audio', 'video'].includes(modality)) continue
      if (!map.has(edu)) {
        map.set(edu, { educationLevel: edu })
      }
      map.get(edu)[modality] = r
    }
    return [...map.values()].map((entry) => {
      const text = entry.text
      const image = entry.image
      const audio = entry.audio
      const video = entry.video
      const txtN = text?.response_count ?? 0
      const imgN = image?.response_count ?? 0
      const audN = audio?.response_count ?? 0
      const vidN = video?.response_count ?? 0
      return {
        educationLevel: entry.educationLevel,
        textAcc:
          txtN > 0 ? accuracyPct(text.correct_count, text.incorrect_count) : null,
        imageAcc:
          imgN > 0 ? accuracyPct(image.correct_count, image.incorrect_count) : null,
        audioAcc:
          audN > 0 ? accuracyPct(audio.correct_count, audio.incorrect_count) : null,
        videoAcc:
          vidN > 0 ? accuracyPct(video.correct_count, video.incorrect_count) : null,
        textN: txtN,
        imageN: imgN,
        audioN: audN,
        videoN: vidN,
      }
    })
  }, [data])

  const hasDemographicsEducationModalityChart = useMemo(
    () =>
      demographicsAccuracyByEducationModality.some(
        (r) =>
          r.textAcc != null ||
          r.imageAcc != null ||
          r.audioAcc != null ||
          r.videoAcc != null
      ),
    [demographicsAccuracyByEducationModality]
  )

  const demographicsAccuracyByAiExposureModality = useMemo(() => {
    const rows = data?.demographics_accuracy_by_ai_exposure_modality ?? []
    const map = new Map()
    for (const r of rows) {
      const level = String(r.ai_exposure_level)
      const modality = String(r.modality)
      if (!['text', 'image', 'audio', 'video'].includes(modality)) continue
      if (!map.has(level)) {
        map.set(level, { aiExposureLevel: level })
      }
      map.get(level)[modality] = r
    }
    return [...map.values()].map((entry) => {
      const text = entry.text
      const image = entry.image
      const audio = entry.audio
      const video = entry.video
      const txtN = text?.response_count ?? 0
      const imgN = image?.response_count ?? 0
      const audN = audio?.response_count ?? 0
      const vidN = video?.response_count ?? 0
      return {
        aiExposureLevel: entry.aiExposureLevel,
        textAcc:
          txtN > 0 ? accuracyPct(text.correct_count, text.incorrect_count) : null,
        imageAcc:
          imgN > 0 ? accuracyPct(image.correct_count, image.incorrect_count) : null,
        audioAcc:
          audN > 0 ? accuracyPct(audio.correct_count, audio.incorrect_count) : null,
        videoAcc:
          vidN > 0 ? accuracyPct(video.correct_count, video.incorrect_count) : null,
        textN: txtN,
        imageN: imgN,
        audioN: audN,
        videoN: vidN,
      }
    })
  }, [data])

  const hasDemographicsAiExposureModalityAccuracyChart = useMemo(
    () =>
      demographicsAccuracyByAiExposureModality.some(
        (r) =>
          r.textAcc != null ||
          r.imageAcc != null ||
          r.audioAcc != null ||
          r.videoAcc != null
      ),
    [demographicsAccuracyByAiExposureModality]
  )

  const demographicsConfidenceByEducationModality = useMemo(() => {
    const rows = data?.demographics_confidence_by_education_modality ?? []
    const map = new Map()
    for (const r of rows) {
      const edu = String(r.education_level)
      const modality = String(r.modality)
      if (!['text', 'image', 'audio', 'video'].includes(modality)) continue
      if (!map.has(edu)) {
        map.set(edu, { educationLevel: edu })
      }
      map.get(edu)[modality] = r
    }
    return [...map.values()].map((entry) => {
      const text = entry.text
      const image = entry.image
      const audio = entry.audio
      const video = entry.video
      const txtN = text?.response_count ?? 0
      const imgN = image?.response_count ?? 0
      const audN = audio?.response_count ?? 0
      const vidN = video?.response_count ?? 0
      return {
        educationLevel: entry.educationLevel,
        textConf: txtN > 0 ? Number(text.mean_confidence) : null,
        imageConf: imgN > 0 ? Number(image.mean_confidence) : null,
        audioConf: audN > 0 ? Number(audio.mean_confidence) : null,
        videoConf: vidN > 0 ? Number(video.mean_confidence) : null,
        textN: txtN,
        imageN: imgN,
        audioN: audN,
        videoN: vidN,
      }
    })
  }, [data])

  const hasDemographicsEducationModalityConfidenceChart = useMemo(
    () =>
      demographicsConfidenceByEducationModality.some(
        (r) =>
          r.textConf != null ||
          r.imageConf != null ||
          r.audioConf != null ||
          r.videoConf != null
      ),
    [demographicsConfidenceByEducationModality]
  )

  const demographicsConfidenceByAiExposureModality = useMemo(() => {
    const rows = data?.demographics_confidence_by_ai_exposure_modality ?? []
    const map = new Map()
    for (const r of rows) {
      const level = String(r.ai_exposure_level)
      const modality = String(r.modality)
      if (!['text', 'image', 'audio', 'video'].includes(modality)) continue
      if (!map.has(level)) {
        map.set(level, { aiExposureLevel: level })
      }
      map.get(level)[modality] = r
    }
    return [...map.values()].map((entry) => {
      const text = entry.text
      const image = entry.image
      const audio = entry.audio
      const video = entry.video
      const txtN = text?.response_count ?? 0
      const imgN = image?.response_count ?? 0
      const audN = audio?.response_count ?? 0
      const vidN = video?.response_count ?? 0
      return {
        aiExposureLevel: entry.aiExposureLevel,
        textConf: txtN > 0 ? Number(text.mean_confidence) : null,
        imageConf: imgN > 0 ? Number(image.mean_confidence) : null,
        audioConf: audN > 0 ? Number(audio.mean_confidence) : null,
        videoConf: vidN > 0 ? Number(video.mean_confidence) : null,
        textN: txtN,
        imageN: imgN,
        audioN: audN,
        videoN: vidN,
      }
    })
  }, [data])

  const hasDemographicsAiExposureModalityConfidenceChart = useMemo(
    () =>
      demographicsConfidenceByAiExposureModality.some(
        (r) =>
          r.textConf != null ||
          r.imageConf != null ||
          r.audioConf != null ||
          r.videoConf != null
      ),
    [demographicsConfidenceByAiExposureModality]
  )

  const demographicsAccuracyConfidenceByAge = useMemo(() => {
    const rows = data?.demographics_accuracy_confidence_by_age ?? []
    return rows
      .map((r) => {
        const n = r.response_count ?? 0
        const accuracyPctValue =
          n > 0 ? accuracyPct(r.correct_count ?? 0, r.incorrect_count ?? 0) : null
        const meanConf =
          r.mean_confidence != null ? Number(r.mean_confidence) : null
        return {
          age: Number(r.age),
          n,
          accuracyPct: accuracyPctValue,
          confidenceScaled:
            meanConf != null ? confidenceToRadarScale(meanConf) : null,
          meanConfidenceRaw: meanConf,
        }
      })
      .filter((r) => Number.isFinite(r.age))
      .sort((a, b) => a.age - b.age)
  }, [data])

  const hasDemographicsAgeLineChart = useMemo(
    () =>
      demographicsAccuracyConfidenceByAge.some(
        (r) => r.accuracyPct != null || r.confidenceScaled != null
      ),
    [demographicsAccuracyConfidenceByAge]
  )

  const taskAccuracyData = useMemo(() => {
    return (data?.by_task_type ?? [])
      .filter((t) => t.response_count > 0)
      .map((t) => {
        const name =
          t.task_type === 'forced_choice' ? 'Forced choice' : 'Single item'
        const accurate = t.correct_count
        const notAccurate = t.incorrect_count ?? 0
        const pct = accuracyPct(t.correct_count, t.incorrect_count)
        return {
          name,
          accurate,
          notAccurate,
          total: t.response_count,
          accuracyPct: pct,
          accuracyBar: pct ?? 0,
        }
      })
  }, [data])

  const scatterResponsePoints = useMemo(() => {
    const rows = performanceData?.scatter_rows ?? []
    return rows
      .filter((r) => typeof r.confidence === 'number' && r.is_correct != null)
      .map((r) => {
        const rawX = Number(r.confidence)
        const rawY = r.is_correct ? 1 : 0
        const id = r.response_id
        return {
          id,
          participantId: r.participant_id,
          modality: r.modality ?? 'unknown',
          rawX,
          rawY,
          x: clamp(rawX + jitterFromId(id, 0.16), 1, 5),
          y: clamp(rawY + jitterFromId(`y-${id}`, 0.08), 0, 1),
          correctCount: r.is_correct ? 1 : 0,
          totalCount: 1,
        }
      })
  }, [performanceData])

  const scatterParticipantPoints = useMemo(() => {
    const rows = performanceData?.scatter_rows ?? []
    const byParticipant = new Map()
    for (const r of rows) {
      if (typeof r.confidence !== 'number' || r.is_correct == null) continue
      const id = r.participant_id ?? 'unknown'
      const cur =
        byParticipant.get(id) ??
        {
          id,
          sumConf: 0,
          sumAcc: 0,
          n: 0,
          correct: 0,
          modalityCounts: {},
        }
      cur.sumConf += Number(r.confidence)
      cur.sumAcc += r.is_correct ? 1 : 0
      cur.n += 1
      cur.correct += r.is_correct ? 1 : 0
      const mod = r.modality ?? 'unknown'
      cur.modalityCounts[mod] = (cur.modalityCounts[mod] ?? 0) + 1
      byParticipant.set(id, cur)
    }
    return [...byParticipant.values()].map((p) => {
      const dominant = Object.entries(p.modalityCounts).sort(
        (a, b) => b[1] - a[1]
      )[0]?.[0]
      const rawX = p.sumConf / p.n
      const rawY = p.sumAcc / p.n
      return {
        id: p.id,
        modality: dominant ?? 'unknown',
        rawX,
        rawY,
        x: clamp(rawX + jitterFromId(p.id, 0.06), 1, 5),
        y: clamp(rawY + jitterFromId(`y-${p.id}`, 0.03), 0, 1),
        correctCount: p.correct,
        totalCount: p.n,
      }
    })
  }, [performanceData])

  const activeScatterPoints = useMemo(() => {
    return performanceViewMode === 'response'
      ? scatterResponsePoints
      : scatterParticipantPoints
  }, [performanceViewMode, scatterResponsePoints, scatterParticipantPoints])

  const scatterGroups = useMemo(() => {
    const groups = {}
    for (const p of activeScatterPoints) {
      const key = p.modality ?? 'unknown'
      if (!groups[key]) groups[key] = []
      groups[key].push(p)
    }
    return Object.entries(groups)
      .sort((a, b) => b[1].length - a[1].length)
      .map(([modality, points]) => ({ modality, points }))
  }, [activeScatterPoints])

  const regressionData = useMemo(() => {
    if (activeScatterPoints.length < 2) return []
    const fit = linearRegression(activeScatterPoints)
    if (!fit) return []
    const x1 = 1
    const x2 = 5
    return [
      { x: x1, y: clamp(fit.slope * x1 + fit.intercept, 0, 1) },
      { x: x2, y: clamp(fit.slope * x2 + fit.intercept, 0, 1) },
    ]
  }, [activeScatterPoints])

  const calibrationData = useMemo(() => {
    const rows = performanceData?.scatter_rows ?? []
    const bins = [
      { key: 0, label: '1.0–1.9', x: 1.5, sum: 0, n: 0 },
      { key: 1, label: '2.0–2.9', x: 2.5, sum: 0, n: 0 },
      { key: 2, label: '3.0–3.9', x: 3.5, sum: 0, n: 0 },
      { key: 3, label: '4.0–4.9', x: 4.5, sum: 0, n: 0 },
      { key: 4, label: '5.0', x: 5.0, sum: 0, n: 0 },
    ]
    for (const r of rows) {
      if (typeof r.confidence !== 'number' || r.is_correct == null) continue
      const c = Number(r.confidence)
      let idx = -1
      if (c >= 1 && c < 2) idx = 0
      else if (c >= 2 && c < 3) idx = 1
      else if (c >= 3 && c < 4) idx = 2
      else if (c >= 4 && c < 5) idx = 3
      else if (c >= 5) idx = 4
      if (idx < 0) continue
      bins[idx].sum += r.is_correct ? 1 : 0
      bins[idx].n += 1
    }
    return bins.map((b) => ({
      binLabel: b.label,
      x: b.x,
      meanAccuracy: b.n > 0 ? b.sum / b.n : null,
      perfect: b.x / 5,
      n: b.n,
    }))
  }, [performanceData])

  return (
    <div className="admin-analytics-page">
      <h1 className="admin-page-title">Analytics</h1>
      <p className="admin-page-lead">
        Explore participation, accuracy, confidence, and related trends.
      </p>

      <div className="admin-panel-card analytics-filters-card">
        <h2 className="admin-section-title">Scope & time range</h2>

        <div className="analytics-filters-section">
          <h3 className="analytics-filters-section-heading">Study scope</h3>
          {studiesLoad === 'loading' && (
            <p className="dashboard-stat-muted">Loading studies…</p>
          )}
          {studiesLoad === 'error' && (
            <p className="dashboard-stat-error">
              Could not load studies for the selector.
            </p>
          )}
          {studiesLoad === 'ok' && (
            <div className="field analytics-scope-field">
              <label htmlFor="analytics-study-scope">
                Include responses from (all studies or one study)
              </label>
              <select
                id="analytics-study-scope"
                value={appliedStudyId ?? ''}
                onChange={(e) => {
                  const v = e.target.value
                  setAppliedStudyId(v ? v : null)
                }}
              >
                <option value="">All studies</option>
                {studiesList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.is_active === false ? ' (inactive)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="analytics-filters-section">
          <h3 className="analytics-filters-section-heading">Time range</h3>
          <div className="analytics-range-row">
            <button
              type="button"
              className={`btn analytics-range-mode-btn ${
                rangeMode === 'all'
                  ? 'analytics-range-mode-btn--active'
                  : 'analytics-range-mode-btn--idle'
              }`}
              onClick={applyAllTime}
            >
              All time
            </button>
            <div className="analytics-range-custom">
              <label className="analytics-range-label">
                <span>From</span>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                />
              </label>
              <label className="analytics-range-label">
                <span>To</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                />
              </label>
              <button
                type="button"
                className="btn btn-secondary analytics-range-apply"
                onClick={applyCustom}
                aria-label="Apply selected from and to dates"
              >
                Apply
              </button>
            </div>
          </div>
        </div>

        {error && <p className="form-message form-message--error">{error}</p>}

        <p className="analytics-filters-status" aria-live="polite">
          {filtersStatusText}
        </p>
      </div>

      {load === 'loading' && (
        <p className="dashboard-stat-muted">Loading analytics…</p>
      )}
      {load === 'error' && !data && (
        <p className="dashboard-stat-error">{error || 'Load failed'}</p>
      )}

      {load === 'ok' && data && (
        <>
          <div className="analytics-tab-bar">
            <div className="analytics-tabs" role="tablist" aria-label="Analytics sections">
              {['overview', 'performance', 'modalities', 'demographics'].map((id) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  className={`analytics-tab ${tab === id ? 'analytics-tab--active' : ''}`}
                  onClick={() => setTab(id)}
                >
                  {id === 'overview' && 'Overview'}
                  {id === 'performance' && 'Performance'}
                  {id === 'modalities' && 'Modalities'}
                  {id === 'demographics' && 'Demographics'}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-secondary analytics-print-btn"
              onClick={() => window.print()}
            >
              Print / PDF
            </button>
          </div>

          <header className="analytics-print-header">
            <h2 className="analytics-print-heading">Analytics</h2>
            <p className="analytics-print-meta">
              Study:{' '}
              {appliedStudyId == null
                ? 'All studies'
                : selectedStudyName || '—'}
            </p>
            {rangeMode === 'custom' && appliedFrom && appliedTo ? (
              <p className="analytics-print-meta">
                Date range:{' '}
                {appliedFrom.toLocaleDateString(undefined, {
                  dateStyle: 'medium',
                })}{' '}
                –{' '}
                {appliedTo.toLocaleDateString(undefined, {
                  dateStyle: 'medium',
                })}{' '}
                (local calendar days)
              </p>
            ) : null}
            <p className="analytics-print-meta">
              Tab: {ANALYTICS_TAB_PRINT_LABEL[tab] ?? tab}
            </p>
          </header>

          {tab === 'overview' && (
            <div className="analytics-tab-panel">
              {!hasResponses ? (
                <EmptyAnalyticsMessage studyName={selectedStudyName} />
              ) : (
                <>
              <p className="analytics-overview-note">
                High-level snapshot of key metrics for your current filters.
              </p>

              <div className="analytics-kpi-grid analytics-kpi-grid--overview">
                <div className="analytics-kpi">
                  <span className="analytics-kpi-value">
                    {summary.participant_count}
                  </span>
                  {renderKpiLabel('Total participants')}
                </div>
                <div className="analytics-kpi">
                  <span className="analytics-kpi-value">
                    {summary.response_count}
                  </span>
                  {renderKpiLabel('Total responses')}
                </div>
                {summary.study_count > 1 && (
                  <div className="analytics-kpi">
                    <span className="analytics-kpi-value">
                      {summary.study_count}
                    </span>
                    {renderKpiLabel('Total studies')}
                  </div>
                )}
                <div className="analytics-kpi">
                  <span className="analytics-kpi-value">
                    {summary.trial_count}
                  </span>
                  {renderKpiLabel('Total trials')}
                </div>
                <div className="analytics-kpi">
                  <span className="analytics-kpi-value">
                    {overviewAccuracy != null ? `${overviewAccuracy}%` : '-'}
                  </span>
                  {renderKpiLabel('Overall accuracy')}
                </div>
              </div>

              <div className="analytics-charts-grid">
                <div className="admin-panel-card analytics-chart-card">
                  <h3 className="analytics-chart-title">
                    Correct vs incorrect
                  </h3>
                  <p className="analytics-chart-sub">
                    Share of correct vs incorrect among responses included in
                    analytics. Overall accuracy is shown in the center.
                  </p>
                  {overviewCorrectIncorrectPie.length === 0 ? (
                    <p className="analytics-empty-inline">
                      No correct or incorrect responses to chart.
                    </p>
                  ) : (
                    <div className="analytics-chart-area analytics-chart-area--pie">
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart
                          margin={{ top: 16, right: 28, bottom: 8, left: 28 }}
                        >
                          <Pie
                            data={overviewCorrectIncorrectPie}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="48%"
                            innerRadius="42%"
                            outerRadius="68%"
                            paddingAngle={1}
                            label={({ name, percent }) =>
                              `${name} ${(percent * 100).toFixed(0)}%`
                            }
                          >
                            {overviewCorrectIncorrectPie.map((entry, index) => (
                              <Cell
                                key={entry.name}
                                fill={
                                  PIE_CORRECT_INCORRECT[
                                    index % PIE_CORRECT_INCORRECT.length
                                  ]
                                }
                              />
                            ))}
                            <Label
                              content={({ viewBox }) => {
                                const cx = viewBox?.cx ?? 0
                                const cy = viewBox?.cy ?? 0
                                if (overviewAccuracy == null) return null
                                return (
                                  <text
                                    x={cx}
                                    y={cy}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    className="analytics-pie-center-text"
                                  >
                                    <tspan
                                      x={cx}
                                      dy="-0.15em"
                                      className="analytics-pie-center-pct"
                                    >
                                      {overviewAccuracy}%
                                    </tspan>
                                    <tspan
                                      x={cx}
                                      dy="1.35em"
                                      className="analytics-pie-center-sub"
                                    >
                                      accuracy
                                    </tspan>
                                  </text>
                                )
                              }}
                            />
                          </Pie>
                          <Tooltip
                            allowEscapeViewBox={{ x: true, y: true }}
                            isAnimationActive={false}
                            wrapperStyle={{ outline: 'none', zIndex: 1000 }}
                            contentStyle={{
                              background: 'transparent',
                              border: 'none',
                              borderRadius: 0,
                              boxShadow: 'none',
                              padding: 0,
                            }}
                            content={<OverviewCorrectnessPieTooltip />}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="analytics-performance-legend">
                        <span className="analytics-performance-legend-item">
                          <span
                            className="analytics-performance-legend-swatch"
                            style={{ backgroundColor: PIE_CORRECT_INCORRECT[0] }}
                          />
                          Correct
                        </span>
                        <span className="analytics-performance-legend-item">
                          <span
                            className="analytics-performance-legend-swatch"
                            style={{ backgroundColor: PIE_CORRECT_INCORRECT[1] }}
                          />
                          Incorrect
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="admin-panel-card analytics-chart-card">
                  <h3 className="analytics-chart-title">
                    Accuracy vs modality
                  </h3>
                  <p className="analytics-chart-sub">
                    Bar height is accuracy (correct / total responses).
                  </p>
                  {modalityAccuracyData.length === 0 ? (
                    <p className="analytics-empty-inline">
                      No modality breakdown in this range.
                    </p>
                  ) : (
                    <div className="analytics-chart-area analytics-chart-area--tall">
                      <ResponsiveContainer width="100%" height={320}>
                        <BarChart
                          data={modalityAccuracyData}
                          margin={{ top: 10, right: 20, bottom: 22, left: 36 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke={PASTEL_YELLOW} />
                          <XAxis
                            dataKey="name"
                            tick={{ fontSize: 12 }}
                            tickMargin={4}
                            label={{
                              value: 'Modality',
                              position: 'insideBottom',
                              offset: -4,
                            }}
                          />
                          <YAxis
                            domain={[0, 100]}
                            allowDecimals={false}
                            width={68}
                            tickFormatter={(v) => `${v}%`}
                            label={{
                              value: 'Accuracy',
                              angle: -90,
                              position: 'insideLeft',
                              offset: 18,
                            }}
                          />
                          <Tooltip
                            allowEscapeViewBox={{ x: true, y: true }}
                            isAnimationActive={false}
                            wrapperStyle={{ outline: 'none', zIndex: 1000 }}
                            contentStyle={{
                              background: 'transparent',
                              border: 'none',
                              borderRadius: 0,
                              boxShadow: 'none',
                              padding: 0,
                            }}
                            content={<StackedAccuracyTooltip />}
                          />
                          <Bar
                            dataKey="accuracyBar"
                            name="Accuracy"
                            fill={PASTEL_CYAN}
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                <div className="admin-panel-card analytics-chart-card">
                  <h3 className="analytics-chart-title">
                    Accuracy vs task type
                  </h3>
                  <p className="analytics-chart-sub">
                    Bar height is accuracy (correct / total responses).
                  </p>
                  {taskAccuracyData.length === 0 ? (
                    <p className="analytics-empty-inline">
                      No task-type breakdown in this range.
                    </p>
                  ) : (
                    <div className="analytics-chart-area analytics-chart-area--tall">
                      <ResponsiveContainer width="100%" height={320}>
                        <BarChart
                          data={taskAccuracyData}
                          margin={{ top: 10, right: 20, bottom: 22, left: 36 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke={PASTEL_YELLOW} />
                          <XAxis
                            dataKey="name"
                            tick={{ fontSize: 12 }}
                            tickMargin={4}
                            label={{
                              value: 'Task type',
                              position: 'insideBottom',
                              offset: -4,
                            }}
                          />
                          <YAxis
                            domain={[0, 100]}
                            allowDecimals={false}
                            width={68}
                            tickFormatter={(v) => `${v}%`}
                            label={{
                              value: 'Accuracy',
                              angle: -90,
                              position: 'insideLeft',
                              offset: 18,
                            }}
                          />
                          <Tooltip
                            allowEscapeViewBox={{ x: true, y: true }}
                            isAnimationActive={false}
                            wrapperStyle={{ outline: 'none', zIndex: 1000 }}
                            contentStyle={{
                              background: 'transparent',
                              border: 'none',
                              borderRadius: 0,
                              boxShadow: 'none',
                              padding: 0,
                            }}
                            content={<StackedAccuracyTooltip />}
                          />
                          <Bar
                            dataKey="accuracyBar"
                            name="Accuracy"
                            fill={PASTEL_CYAN}
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

              </div>
                </>
              )}
            </div>
          )}

          {tab === 'performance' && (
            <div className="analytics-tab-panel">
              <p className="analytics-overview-note">
                Deep dive into the relationship between accuracy and confidence for
                your current filters (scored responses only).
              </p>

              {performanceLoad === 'loading' && (
                <p className="dashboard-stat-muted">Loading performance…</p>
              )}
              {performanceLoad === 'error' && (
                <p className="dashboard-stat-error">
                  {performanceError || 'Could not load performance metrics.'}
                </p>
              )}
              {performanceLoad === 'ok' && performanceData && (
                <>
                  {(performanceData.n_scored ?? 0) === 0 ? (
                    <p className="analytics-empty-inline">
                      No scored responses in this range - metrics need at least
                      one answer with a known score.
                    </p>
                  ) : (
                    <>
                      <div className="analytics-kpi-grid analytics-kpi-grid--overview">
                        <div className="analytics-kpi">
                          <span className="analytics-kpi-value">
                            {performanceData.overall_accuracy_pct != null
                              ? `${performanceData.overall_accuracy_pct}%`
                              : '-'}
                          </span>
                          {renderKpiLabel('Overall accuracy')}
                        </div>
                        <div className="analytics-kpi">
                          <span className="analytics-kpi-value">
                            {performanceData.forced_choice_accuracy_pct != null
                              ? `${performanceData.forced_choice_accuracy_pct}%`
                              : '-'}
                          </span>
                          {renderKpiLabel('Avg accuracy forced choice')}
                        </div>
                        <div className="analytics-kpi">
                          <span className="analytics-kpi-value">
                            {performanceData.single_item_accuracy_pct != null
                              ? `${performanceData.single_item_accuracy_pct}%`
                              : '-'}
                          </span>
                          {renderKpiLabel('Avg accuracy single item')}
                        </div>
                        <div className="analytics-kpi">
                          <span className="analytics-kpi-value">
                            {performanceData.mean_confidence != null
                              ? Number(performanceData.mean_confidence).toFixed(
                                  2
                                )
                              : '-'}
                          </span>
                          {renderKpiLabel('Mean confidence')}
                        </div>
                        <div className="analytics-kpi">
                          <span className="analytics-kpi-value">
                            {performanceData.confidence_accuracy_correlation !=
                            null
                              ? performanceData.confidence_accuracy_correlation
                              : '-'}
                          </span>
                          {renderCorrelationRKpiLabel()}
                        </div>
                        <div className="analytics-kpi">
                          <span className="analytics-kpi-value">
                            {performanceData.d_prime != null
                              ? performanceData.d_prime
                              : '-'}
                          </span>
                          {renderDetectionDprimeKpiLabel()}
                        </div>
                      </div>

                      <div className="analytics-performance-stack">
                        <div
                          className="admin-panel-card analytics-performance-info"
                          role="region"
                          aria-label="Confidence-accuracy correlation and signal detection sensitivity"
                        >
                          <section className="analytics-performance-info-section">
                            <PerformanceMetricHeadingWithInfo title="Confidence-Accuracy Correlation (r)">
                              <p className="analytics-performance-info-p">
                                Point-biserial correlation (r) between
                                participants' confidence ratings (1-5) and their
                                actual accuracy on each trial.
                              </p>
                              <p className="analytics-performance-info-p">
                                <strong>Relevance:</strong> Measures whether
                                people's self-confidence matches their real
                                performance.
                              </p>
                              <ul className="analytics-performance-info-list">
                                <li>
                                  +0.3 to +1.0 → Confidence predicts real skill
                                  (well calibrated)
                                </li>
                                <li>≈ 0 → Confidence is unrelated to performance</li>
                                <li>
                                  -0.3 or lower → Overconfidence (people who feel
                                  most confident are more likely to be wrong)
                                </li>
                              </ul>
                              <p className="analytics-performance-info-p analytics-performance-info-note">
                                Typical in recent AI-detection studies: near 0 or
                                slightly negative, showing humans overestimate
                                their ability to detect AI content.
                              </p>
                            </PerformanceMetricHeadingWithInfo>
                            <p className="analytics-performance-metric-summary">
                              <strong>
                                r ={' '}
                                {performanceCorrelationKpiDisplay(
                                  performanceData.confidence_accuracy_correlation
                                )}
                              </strong>
                              {' - '}
                              {summarizeConfidenceAccuracyCorrelation(
                                performanceData.confidence_accuracy_correlation
                              )}
                            </p>
                          </section>

                          <section className="analytics-performance-info-section">
                            <PerformanceMetricHeadingWithInfo title="Signal Detection Sensitivity (d')">
                              <p className="analytics-performance-info-p">
                                Pure measure of perceptual sensitivity (shows how
                                well participants can actually tell AI-generated
                                from human-made content, independent of bias).
                              </p>
                              <p className="analytics-performance-info-p">
                                <strong>Relevance:</strong> Tells us the true level
                                of indistinguishability by removing the effect of
                                response bias (e.g., always guessing “human”).
                              </p>
                              <ul className="analytics-performance-info-list">
                                <li>
                                  d' &gt; 1.0 → Easy to distinguish (AI is still
                                  detectable)
                                </li>
                                <li>
                                  d' ≈ 0.5-1.0 → Moderate discrimination
                                </li>
                                <li>
                                  d' ≈ 0 → Chance-level performance (AI content is
                                  effectively indistinguishable)
                                </li>
                              </ul>
                              <p className="analytics-performance-info-p analytics-performance-info-note">
                                Typical in latest multimodal studies: between 0
                                and 0.6, highlighting how close we are to full
                                perceptual indistinguishability.
                              </p>
                            </PerformanceMetricHeadingWithInfo>
                            <p className="analytics-performance-metric-summary">
                              <strong>
                                d' ={' '}
                                {performanceDprimeKpiDisplay(
                                  performanceData.d_prime
                                )}
                              </strong>
                              {' - '}
                              {summarizeDprime(performanceData.d_prime)}
                            </p>
                          </section>
                        </div>

                        <div className="admin-panel-card analytics-chart-card analytics-chart-card--wide">
                          <div className="analytics-performance-scatter-head">
                            <h3 className="analytics-chart-title">
                              Confidence vs Accuracy
                            </h3>
                            <div className="analytics-performance-toggle" role="group" aria-label="Scatter aggregation level">
                              <button
                                type="button"
                                className={`btn ${performanceViewMode === 'response' ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => setPerformanceViewMode('response')}
                              >
                                Per response
                              </button>
                              <button
                                type="button"
                                className={`btn ${performanceViewMode === 'participant' ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => setPerformanceViewMode('participant')}
                              >
                                Per participant
                              </button>
                            </div>
                          </div>
                          <p className="analytics-chart-sub">
                            Confidence vs Accuracy Scatter plot with a regression
                            trend line. Points are jittered for visibility and colored
                            by modality.
                          </p>
                          {activeScatterPoints.length === 0 ? (
                            <p className="analytics-empty-inline">
                              No points available for this filter.
                            </p>
                          ) : (
                            <>
                              <div className="analytics-chart-area analytics-chart-area--tall">
                                <ResponsiveContainer width="100%" height={320}>
                                  <ComposedChart
                                    data={activeScatterPoints}
                                    margin={{ top: 10, right: 20, bottom: 6, left: 12 }}
                                  >
                                    <CartesianGrid strokeDasharray="3 3" stroke={PASTEL_YELLOW} />
                                    <XAxis
                                      type="number"
                                      dataKey="x"
                                      domain={[1, 5]}
                                      ticks={[1, 2, 3, 4, 5]}
                                      tick={{ fontSize: 12 }}
                                      label={{ value: 'Confidence', position: 'insideBottom', offset: -2 }}
                                    />
                                    <YAxis
                                      type="number"
                                      dataKey="y"
                                      domain={[0, 1]}
                                      ticks={[0, 0.25, 0.5, 0.75, 1]}
                                      tickFormatter={(v) => Number(v).toFixed(2)}
                                      label={{ value: 'Accuracy', angle: -90, position: 'insideLeft' }}
                                    />
                                    <Tooltip
                                      allowEscapeViewBox={{ x: true, y: true }}
                                      isAnimationActive={false}
                                      wrapperStyle={{ outline: 'none', zIndex: 1000 }}
                                      contentStyle={{
                                        background: 'transparent',
                                        border: 'none',
                                        borderRadius: 0,
                                        boxShadow: 'none',
                                        padding: 0,
                                      }}
                                      cursor={{ strokeDasharray: '4 4' }}
                                      content={
                                        <ScatterPerfTooltip
                                          viewMode={performanceViewMode}
                                        />
                                      }
                                    />
                                    {scatterGroups.map(({ modality, points }) => (
                                      <Scatter
                                        key={modality}
                                        name={modality}
                                        data={points}
                                        fill={
                                          MODALITY_COLORS[modality] ??
                                          MODALITY_COLORS.unknown
                                        }
                                        opacity={0.72}
                                      />
                                    ))}
                                    {regressionData.length === 2 && (
                                      <Line
                                        type="linear"
                                        data={regressionData}
                                        dataKey="y"
                                        name="Regression"
                                        xAxisId={0}
                                        yAxisId={0}
                                        stroke={PASTEL_VIOLET}
                                        strokeWidth={2}
                                        dot={false}
                                        isAnimationActive={false}
                                      />
                                    )}
                                  </ComposedChart>
                                </ResponsiveContainer>
                              </div>
                              <div className="analytics-performance-legend">
                                {scatterGroups.map(({ modality, points }) => (
                                  <span key={modality} className="analytics-performance-legend-item">
                                    <span
                                      className="analytics-performance-legend-swatch"
                                      style={{
                                        backgroundColor:
                                          MODALITY_COLORS[modality] ??
                                          MODALITY_COLORS.unknown,
                                      }}
                                    />
                                    {modality} ({points.length})
                                  </span>
                                ))}
                                {regressionData.length === 2 && (
                                  <span className="analytics-performance-legend-item">
                                    <span
                                      className="analytics-performance-legend-line analytics-performance-legend-line--solid"
                                      style={{ borderTopColor: PASTEL_VIOLET }}
                                    />
                                    Regression
                                  </span>
                                )}
                              </div>
                            </>
                          )}
                        </div>

                        <div className="admin-panel-card analytics-chart-card analytics-chart-card--wide">
                          <h3 className="analytics-chart-title">
                            Confidence distribution by outcome
                          </h3>
                        <p className="analytics-chart-sub">
                          Confidence distribution box plots for correct and
                          incorrect responses. The box spans the middle 50%, the line
                          inside is the median, and whiskers show min and max.
                        </p>
                        {performanceData.confidence_box_by_outcome?.correct ||
                        performanceData.confidence_box_by_outcome?.incorrect ? (
                          <div className="analytics-chart-area analytics-chart-area--tall">
                            <ConfidenceOutcomeBoxPlot
                              correctBox={
                                performanceData.confidence_box_by_outcome
                                  ?.correct ?? null
                              }
                              incorrectBox={
                                performanceData.confidence_box_by_outcome
                                  ?.incorrect ?? null
                              }
                            />
                          </div>
                        ) : (
                          <p className="analytics-empty-inline">
                            No box plot data for this filter.
                          </p>
                        )}
                      </div>

                      <div className="admin-panel-card analytics-chart-card analytics-chart-card--wide">
                        <h3 className="analytics-chart-title">
                          Accuracy by modality and task type
                        </h3>
                        <p className="analytics-chart-sub">
                          Accuracy heatmap by modality and task type.
                        </p>
                        <TaskModalityAccuracyHeatmap
                          rows={
                            performanceData.accuracy_heatmap_task_modality ?? []
                          }
                        />
                      </div>

                      <div className="admin-panel-card analytics-chart-card analytics-chart-card--wide">
                        <h3 className="analytics-chart-title">
                          Confidence calibration
                        </h3>
                        <p className="analytics-chart-sub">
                          Confidence calibration plot with responses grouped into
                          confidence bins (1.0–1.9, 2.0–2.9, 3.0–3.9, 4.0–4.9, and
                          5.0).
                        </p>
                        {calibrationData.every((d) => d.n === 0) ? (
                          <p className="analytics-empty-inline">
                            No calibration points available for this filter.
                          </p>
                        ) : (
                          <div className="analytics-chart-area analytics-chart-area--tall">
                            <ResponsiveContainer width="100%" height={320}>
                              <LineChart
                                data={calibrationData}
                                margin={{ top: 10, right: 20, bottom: 6, left: 12 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" stroke={PASTEL_YELLOW} />
                                <XAxis
                                  type="number"
                                  dataKey="x"
                                  domain={[1, 5]}
                                  ticks={[1, 1.5, 2.5, 3.5, 4.5, 5]}
                                  tick={{ fontSize: 12 }}
                                  tickFormatter={(v) => Number(v).toFixed(1)}
                                  label={{
                                    value: 'Confidence bin midpoint',
                                    position: 'insideBottom',
                                    offset: -2,
                                  }}
                                />
                                <YAxis
                                  type="number"
                                  domain={[0, 1]}
                                  ticks={[0, 0.2, 0.4, 0.6, 0.8, 1]}
                                  tickFormatter={(v) => Number(v).toFixed(2)}
                                  label={{
                                    value: 'Mean accuracy',
                                    angle: -90,
                                    position: 'insideLeft',
                                  }}
                                />
                                <Tooltip
                                  allowEscapeViewBox={{ x: true, y: true }}
                                  isAnimationActive={false}
                                  wrapperStyle={{ outline: 'none', zIndex: 1000 }}
                                  contentStyle={{
                                    background: 'transparent',
                                    border: 'none',
                                    borderRadius: 0,
                                    boxShadow: 'none',
                                    padding: 0,
                                  }}
                                  cursor={{
                                    stroke: PASTEL_BLUE,
                                    strokeWidth: 1,
                                    strokeDasharray: '4 4',
                                  }}
                                  content={<CalibrationLineTooltip />}
                                />
                                <Line
                                  type="linear"
                                  dataKey="meanAccuracy"
                                  name="Observed accuracy"
                                  stroke={PASTEL_CYAN}
                                  strokeWidth={2}
                                  connectNulls={false}
                                  dot={{ r: 4 }}
                                  activeDot={{ r: 6 }}
                                />
                                <Line
                                  type="linear"
                                  dataKey="perfect"
                                  name="Perfect Calibration"
                                  stroke={PASTEL_BLUE}
                                  strokeDasharray="5 4"
                                  strokeWidth={2}
                                  dot={false}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                        <div className="analytics-performance-legend">
                          <span className="analytics-performance-legend-item">
                            <span
                              className="analytics-performance-legend-line analytics-performance-legend-line--solid"
                              style={{ borderTopColor: PASTEL_CYAN }}
                            />
                            Observed accuracy
                          </span>
                          <span className="analytics-performance-legend-item">
                            <span
                              className="analytics-performance-legend-line analytics-performance-legend-line--dashed"
                              style={{ borderTopColor: PASTEL_BLUE }}
                            />
                            Perfect Calibration
                          </span>
                        </div>
                      </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {tab === 'modalities' && (
            <div className="analytics-tab-panel">
              {!hasResponses ? (
                <EmptyAnalyticsMessage studyName={selectedStudyName} />
              ) : (
                <div className="analytics-modalities-content">
                  <p className="analytics-overview-note">
                    Compare performance across modalities.
                  </p>
                  <div className="analytics-kpi-grid analytics-kpi-grid--overview analytics-kpi-grid--modalities-tab">
                    {modalityQuickAccuracyKpis.map(({ key, kpiLabel, pct }) => (
                      <div key={key} className="analytics-kpi">
                        <span className="analytics-kpi-value">
                          {pct != null ? `${pct}%` : '-'}
                        </span>
                        {renderKpiLabel(kpiLabel)}
                      </div>
                    ))}
                  </div>
                  <div className="admin-panel-card analytics-chart-card analytics-chart-card--wide">
                    <h3 className="analytics-chart-title">
                      Accuracy by task type per modality
                    </h3>
                    <p className="analytics-chart-sub">
                      Grouped bars for accuracy by task type per modality.
                    </p>
                    {!hasModalityTaskGroupedChartData ? (
                      <p className="analytics-empty-inline">
                        No modality × task type breakdown in this range.
                      </p>
                    ) : (
                      <div className="analytics-chart-area analytics-chart-area--tall">
                        <ResponsiveContainer width="100%" height={320}>
                          <BarChart
                            data={modalityTaskGroupedBarData}
                            margin={{
                              top: 10,
                              right: 20,
                              bottom: 12,
                              left: 26,
                            }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke={PASTEL_YELLOW}
                            />
                            <XAxis
                              dataKey="name"
                              tick={{ fontSize: 12 }}
                              tickMargin={4}
                              label={{
                                value: 'Modality',
                                position: 'insideBottom',
                                offset: 4,
                              }}
                            />
                            <YAxis
                              domain={[0, 100]}
                              allowDecimals={false}
                              width={56}
                              tick={{ fontSize: 12 }}
                              tickFormatter={(v) => `${v}%`}
                              label={{
                                value: 'Accuracy',
                                angle: -90,
                                position: 'insideLeft',
                                offset: 10,
                              }}
                            />
                            <Tooltip
                              allowEscapeViewBox={{ x: true, y: true }}
                              isAnimationActive={false}
                              wrapperStyle={{
                                outline: 'none',
                                zIndex: 1000,
                              }}
                              contentStyle={{
                                background: 'transparent',
                                border: 'none',
                                borderRadius: 0,
                                boxShadow: 'none',
                                padding: 0,
                              }}
                              content={<ModalityTaskGroupedTooltip />}
                            />
                            <Bar
                              dataKey="forcedChoiceAcc"
                              name="Forced choice"
                              fill={PASTEL_CYAN}
                              radius={[4, 4, 0, 0]}
                              maxBarSize={40}
                            />
                            <Bar
                              dataKey="singleItemAcc"
                              name="Single item"
                              fill={PASTEL_VIOLET}
                              radius={[4, 4, 0, 0]}
                              maxBarSize={40}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                        <div className="analytics-performance-legend">
                          <span className="analytics-performance-legend-item">
                            <span
                              className="analytics-performance-legend-swatch"
                              style={{
                                backgroundColor: PASTEL_CYAN,
                              }}
                            />
                            Forced choice
                          </span>
                          <span className="analytics-performance-legend-item">
                            <span
                              className="analytics-performance-legend-swatch"
                              style={{ backgroundColor: PASTEL_VIOLET }}
                            />
                            Single item
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="admin-panel-card analytics-chart-card analytics-chart-card--wide">
                    <h3 className="analytics-chart-title">
                      Confidence by task type per modality
                    </h3>
                    <p className="analytics-chart-sub">
                      Grouped bars for confidence by task type per modality.
                    </p>
                    {!hasModalityTaskGroupedConfidenceData ? (
                      <p className="analytics-empty-inline">
                        No modality × task type confidence breakdown in this range.
                      </p>
                    ) : (
                      <div className="analytics-chart-area analytics-chart-area--tall">
                        <ResponsiveContainer width="100%" height={320}>
                          <BarChart
                            data={modalityTaskGroupedConfidenceData}
                            margin={{
                              top: 10,
                              right: 20,
                              bottom: 12,
                              left: 26,
                            }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke={PASTEL_YELLOW}
                            />
                            <XAxis
                              dataKey="name"
                              tick={{ fontSize: 12 }}
                              tickMargin={4}
                              label={{
                                value: 'Modality',
                                position: 'insideBottom',
                                offset: 4,
                              }}
                            />
                            <YAxis
                              type="number"
                              domain={[1, 5]}
                              allowDecimals={false}
                              width={56}
                              tick={{ fontSize: 12 }}
                              ticks={[1, 2, 3, 4, 5]}
                              label={{
                                value: 'Confidence',
                                angle: -90,
                                position: 'insideLeft',
                                offset: 10,
                              }}
                            />
                            <Tooltip
                              allowEscapeViewBox={{ x: true, y: true }}
                              isAnimationActive={false}
                              wrapperStyle={{
                                outline: 'none',
                                zIndex: 1000,
                              }}
                              contentStyle={{
                                background: 'transparent',
                                border: 'none',
                                borderRadius: 0,
                                boxShadow: 'none',
                                padding: 0,
                              }}
                              content={<ModalityTaskGroupedConfidenceTooltip />}
                            />
                            <Bar
                              dataKey="forcedChoiceConf"
                              name="Forced choice"
                              fill={PASTEL_CYAN}
                              radius={[4, 4, 0, 0]}
                              maxBarSize={40}
                            />
                            <Bar
                              dataKey="singleItemConf"
                              name="Single item"
                              fill={PASTEL_VIOLET}
                              radius={[4, 4, 0, 0]}
                              maxBarSize={40}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                        <div className="analytics-performance-legend">
                          <span className="analytics-performance-legend-item">
                            <span
                              className="analytics-performance-legend-swatch"
                              style={{
                                backgroundColor: PASTEL_CYAN,
                              }}
                            />
                            Forced choice
                          </span>
                          <span className="analytics-performance-legend-item">
                            <span
                              className="analytics-performance-legend-swatch"
                              style={{ backgroundColor: PASTEL_VIOLET }}
                            />
                            Single item
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="admin-panel-card analytics-chart-card analytics-chart-card--wide">
                    <h3 className="analytics-chart-title">
                      Accuracy and confidence across modalities
                    </h3>
                    <p className="analytics-chart-sub">
                      Radar chart: Accuracy (%) and min-max normalized Confidence (1–5 → 0–100) across modalities
                    </p>
                    {!hasModalityRadarData ? (
                      <p className="analytics-empty-inline">
                        No per-modality accuracy or confidence for this filter.
                      </p>
                    ) : (
                      <div className="analytics-chart-area analytics-chart-area--tall">
                        <ResponsiveContainer width="100%" height={360}>
                          <RadarChart
                            data={modalityRadarData}
                            margin={{
                              top: 20,
                              right: 48,
                              bottom: 20,
                              left: 48,
                            }}
                            cx="50%"
                            cy="50%"
                            outerRadius="72%"
                          >
                            <PolarGrid stroke={PASTEL_YELLOW} />
                            <PolarAngleAxis
                              dataKey="modality"
                              tick={{ fontSize: 12, fill: PASTEL_VIOLET }}
                            />
                            <PolarRadiusAxis
                              angle={90}
                              domain={[0, 100]}
                              tick={{ fontSize: 11, fill: PASTEL_VIOLET }}
                              tickCount={5}
                            />
                            <Tooltip
                              isAnimationActive={false}
                              wrapperStyle={{
                                outline: 'none',
                                zIndex: 1000,
                              }}
                              contentStyle={{
                                background: 'transparent',
                                border: 'none',
                                borderRadius: 0,
                                boxShadow: 'none',
                                padding: 0,
                              }}
                              content={<ModalityRadarTooltip />}
                            />
                            <Radar
                              name="Accuracy"
                              dataKey="accuracy"
                              stroke={PASTEL_CYAN}
                              fill={PASTEL_CYAN}
                              fillOpacity={0.28}
                              strokeWidth={2}
                            />
                            <Radar
                              name="Confidence (scaled)"
                              dataKey="confidenceRadar"
                              stroke={RADAR_CONFIDENCE_COLOR}
                              fill={RADAR_CONFIDENCE_COLOR}
                              fillOpacity={0.22}
                              strokeWidth={2}
                            />
                          </RadarChart>
                        </ResponsiveContainer>
                        <div className="analytics-performance-legend">
                          <span className="analytics-performance-legend-item">
                            <span
                              className="analytics-performance-legend-swatch"
                              style={{
                                backgroundColor: PASTEL_CYAN,
                              }}
                            />
                            Accuracy (%)
                          </span>
                          <span className="analytics-performance-legend-item">
                            <span
                              className="analytics-performance-legend-swatch"
                              style={{
                                backgroundColor: RADAR_CONFIDENCE_COLOR,
                              }}
                            />
                            Confidence (1–5 → 0–100)
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="admin-panel-card analytics-chart-card analytics-chart-card--wide">
                    <h3 className="analytics-chart-title">
                      Confusion matrix (AI vs human) by modality
                    </h3>
                    <p className="analytics-chart-sub">
                      Rows = ground truth (AI / Human), Columns = participant response
                      (Chose AI / Human). Diagonal cells (correct) are tinted green;
                      off-diagonal cells (errors) are tinted red.
                    </p>
                    {!hasConfusionMatrixByModality ? (
                      <p className="analytics-empty-inline">
                        No AI vs human cells for this filter.
                      </p>
                    ) : (
                      <ModalityConfusionMatricesBlock
                        matrices={confusionMatrixByModality}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'demographics' && (
            <div className="analytics-tab-panel">
              {!hasResponses ? (
                <EmptyAnalyticsMessage studyName={selectedStudyName} />
              ) : (
                <div className="analytics-modalities-content">
                  <p className="analytics-overview-note">
                    See how demographics affect detection.
                  </p>
                  {demographicsParticipantsOmittedCount > 0 && (
                    <p className="analytics-omission-note" role="status">
                      <span className="form-warning-symbol" aria-hidden>
                        ⚠
                      </span>
                      {demographicsParticipantsOmittedCount} participant
                      {demographicsParticipantsOmittedCount === 1 ? '' : 's'} excluded
                      from demographic insights because no demographics
                      information was provided.
                    </p>
                  )}

                  {demographicsParticipantsByEducation.length === 0 &&
                  demographicsParticipantsByAiExposure.length === 0 ? (
                    <p className="analytics-empty-inline">
                      No demographics KPIs available for this filter.
                    </p>
                  ) : (
                    <div className="analytics-kpi-grid analytics-kpi-grid--overview analytics-kpi-grid--modalities-tab">
                      {demographicsParticipantsByEducation.map((r) => (
                        <div key={`edu-${r.bucket}`} className="analytics-kpi">
                          <span className="analytics-kpi-value">
                            {r.participant_count ?? 0}
                          </span>
                          {renderKpiLabel(
                            `Participants with ${String(r.bucket)} education`
                          )}
                        </div>
                      ))}
                      {demographicsParticipantsByAiExposure.map((r) => (
                        <div key={`ai-${r.bucket}`} className="analytics-kpi">
                          <span className="analytics-kpi-value">
                            {r.participant_count ?? 0}
                          </span>
                          {renderKpiLabel(
                            `Participants with ${String(r.bucket)} AI literacy`
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="admin-panel-card analytics-chart-card analytics-chart-card--wide">
                    <h3 className="analytics-chart-title">
                      Accuracy by Education Level and modality
                    </h3>
                    <p className="analytics-chart-sub">
                      Grouped bars show modality accuracy within each education level.
                    </p>
                    {!hasDemographicsEducationModalityChart ? (
                      <p className="analytics-empty-inline">
                        No education × modality accuracy breakdown in this range.
                      </p>
                    ) : (
                      <div className="analytics-chart-area analytics-chart-area--tall">
                        <ResponsiveContainer width="100%" height={320}>
                          <BarChart
                            data={demographicsAccuracyByEducationModality}
                            margin={{
                              top: 10,
                              right: 20,
                              bottom: 22,
                              left: 26,
                            }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke={PASTEL_YELLOW} />
                            <XAxis
                              dataKey="educationLevel"
                              tick={{ fontSize: 12 }}
                              tickMargin={4}
                              label={{
                                value: 'Education level',
                                position: 'insideBottom',
                                offset: -4,
                              }}
                            />
                            <YAxis
                              domain={[0, 100]}
                              allowDecimals={false}
                              width={56}
                              tick={{ fontSize: 12 }}
                              tickFormatter={(v) => `${v}%`}
                              label={{
                                value: 'Accuracy',
                                angle: -90,
                                position: 'insideLeft',
                                offset: 10,
                              }}
                            />
                            <Tooltip
                              allowEscapeViewBox={{ x: true, y: true }}
                              isAnimationActive={false}
                              wrapperStyle={{ outline: 'none', zIndex: 1000 }}
                              contentStyle={{
                                background: 'transparent',
                                border: 'none',
                                borderRadius: 0,
                                boxShadow: 'none',
                                padding: 0,
                              }}
                              content={<DemographicsEducationModalityTooltip />}
                            />
                            <Bar dataKey="textAcc" name="Text" fill={MODALITY_COLORS.text} radius={[4, 4, 0, 0]} maxBarSize={26} />
                            <Bar dataKey="imageAcc" name="Image" fill={MODALITY_COLORS.image} radius={[4, 4, 0, 0]} maxBarSize={26} />
                            <Bar dataKey="audioAcc" name="Audio" fill={MODALITY_COLORS.audio} radius={[4, 4, 0, 0]} maxBarSize={26} />
                            <Bar dataKey="videoAcc" name="Video" fill={MODALITY_COLORS.video} radius={[4, 4, 0, 0]} maxBarSize={26} />
                          </BarChart>
                        </ResponsiveContainer>
                        <div className="analytics-performance-legend">
                          <span className="analytics-performance-legend-item">
                            <span className="analytics-performance-legend-swatch" style={{ backgroundColor: MODALITY_COLORS.text }} />
                            Text
                          </span>
                          <span className="analytics-performance-legend-item">
                            <span className="analytics-performance-legend-swatch" style={{ backgroundColor: MODALITY_COLORS.image }} />
                            Image
                          </span>
                          <span className="analytics-performance-legend-item">
                            <span className="analytics-performance-legend-swatch" style={{ backgroundColor: MODALITY_COLORS.audio }} />
                            Audio
                          </span>
                          <span className="analytics-performance-legend-item">
                            <span className="analytics-performance-legend-swatch" style={{ backgroundColor: MODALITY_COLORS.video }} />
                            Video
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="admin-panel-card analytics-chart-card analytics-chart-card--wide">
                    <h3 className="analytics-chart-title">
                      Accuracy by AI Exposure Level and modality
                    </h3>
                    <p className="analytics-chart-sub">
                      Grouped bars show modality accuracy within each AI exposure level.
                    </p>
                    {!hasDemographicsAiExposureModalityAccuracyChart ? (
                      <p className="analytics-empty-inline">
                        No AI exposure × modality accuracy breakdown in this range.
                      </p>
                    ) : (
                      <div className="analytics-chart-area analytics-chart-area--tall">
                        <ResponsiveContainer width="100%" height={320}>
                          <BarChart
                            data={demographicsAccuracyByAiExposureModality}
                            margin={{ top: 10, right: 20, bottom: 22, left: 26 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke={PASTEL_YELLOW} />
                            <XAxis
                              dataKey="aiExposureLevel"
                              tick={{ fontSize: 12 }}
                              tickMargin={4}
                              label={{
                                value: 'AI exposure level',
                                position: 'insideBottom',
                                offset: -4,
                              }}
                            />
                            <YAxis
                              domain={[0, 100]}
                              allowDecimals={false}
                              width={56}
                              tick={{ fontSize: 12 }}
                              tickFormatter={(v) => `${v}%`}
                              label={{
                                value: 'Accuracy',
                                angle: -90,
                                position: 'insideLeft',
                                offset: 10,
                              }}
                            />
                            <Tooltip
                              allowEscapeViewBox={{ x: true, y: true }}
                              isAnimationActive={false}
                              wrapperStyle={{ outline: 'none', zIndex: 1000 }}
                              contentStyle={{
                                background: 'transparent',
                                border: 'none',
                                borderRadius: 0,
                                boxShadow: 'none',
                                padding: 0,
                              }}
                              content={<DemographicsEducationModalityTooltip />}
                            />
                            <Bar dataKey="textAcc" name="Text" fill={MODALITY_COLORS.text} radius={[4, 4, 0, 0]} maxBarSize={26} />
                            <Bar dataKey="imageAcc" name="Image" fill={MODALITY_COLORS.image} radius={[4, 4, 0, 0]} maxBarSize={26} />
                            <Bar dataKey="audioAcc" name="Audio" fill={MODALITY_COLORS.audio} radius={[4, 4, 0, 0]} maxBarSize={26} />
                            <Bar dataKey="videoAcc" name="Video" fill={MODALITY_COLORS.video} radius={[4, 4, 0, 0]} maxBarSize={26} />
                          </BarChart>
                        </ResponsiveContainer>
                        <div className="analytics-performance-legend">
                          <span className="analytics-performance-legend-item">
                            <span className="analytics-performance-legend-swatch" style={{ backgroundColor: MODALITY_COLORS.text }} />
                            Text
                          </span>
                          <span className="analytics-performance-legend-item">
                            <span className="analytics-performance-legend-swatch" style={{ backgroundColor: MODALITY_COLORS.image }} />
                            Image
                          </span>
                          <span className="analytics-performance-legend-item">
                            <span className="analytics-performance-legend-swatch" style={{ backgroundColor: MODALITY_COLORS.audio }} />
                            Audio
                          </span>
                          <span className="analytics-performance-legend-item">
                            <span className="analytics-performance-legend-swatch" style={{ backgroundColor: MODALITY_COLORS.video }} />
                            Video
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="admin-panel-card analytics-chart-card analytics-chart-card--wide">
                    <h3 className="analytics-chart-title">
                      Confidence by Education Level and modality
                    </h3>
                    <p className="analytics-chart-sub">
                      Grouped bars show mean confidence within each education level.
                    </p>
                    {!hasDemographicsEducationModalityConfidenceChart ? (
                      <p className="analytics-empty-inline">
                        No education × modality confidence breakdown in this range.
                      </p>
                    ) : (
                      <div className="analytics-chart-area analytics-chart-area--tall">
                        <ResponsiveContainer width="100%" height={320}>
                          <BarChart
                            data={demographicsConfidenceByEducationModality}
                            margin={{ top: 10, right: 20, bottom: 22, left: 26 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke={PASTEL_YELLOW} />
                            <XAxis
                              dataKey="educationLevel"
                              tick={{ fontSize: 12 }}
                              tickMargin={4}
                              label={{
                                value: 'Education level',
                                position: 'insideBottom',
                                offset: -4,
                              }}
                            />
                            <YAxis
                              type="number"
                              domain={[1, 5]}
                              allowDecimals={false}
                              width={56}
                              tick={{ fontSize: 12 }}
                              ticks={[1, 2, 3, 4, 5]}
                              label={{
                                value: 'Confidence',
                                angle: -90,
                                position: 'insideLeft',
                                offset: 10,
                              }}
                            />
                            <Tooltip
                              allowEscapeViewBox={{ x: true, y: true }}
                              isAnimationActive={false}
                              wrapperStyle={{ outline: 'none', zIndex: 1000 }}
                              contentStyle={{
                                background: 'transparent',
                                border: 'none',
                                borderRadius: 0,
                                boxShadow: 'none',
                                padding: 0,
                              }}
                              content={<DemographicsEducationModalityConfidenceTooltip />}
                            />
                            <Bar dataKey="textConf" name="Text" fill={MODALITY_COLORS.text} radius={[4, 4, 0, 0]} maxBarSize={26} />
                            <Bar dataKey="imageConf" name="Image" fill={MODALITY_COLORS.image} radius={[4, 4, 0, 0]} maxBarSize={26} />
                            <Bar dataKey="audioConf" name="Audio" fill={MODALITY_COLORS.audio} radius={[4, 4, 0, 0]} maxBarSize={26} />
                            <Bar dataKey="videoConf" name="Video" fill={MODALITY_COLORS.video} radius={[4, 4, 0, 0]} maxBarSize={26} />
                          </BarChart>
                        </ResponsiveContainer>
                        <div className="analytics-performance-legend">
                          <span className="analytics-performance-legend-item">
                            <span className="analytics-performance-legend-swatch" style={{ backgroundColor: MODALITY_COLORS.text }} />
                            Text
                          </span>
                          <span className="analytics-performance-legend-item">
                            <span className="analytics-performance-legend-swatch" style={{ backgroundColor: MODALITY_COLORS.image }} />
                            Image
                          </span>
                          <span className="analytics-performance-legend-item">
                            <span className="analytics-performance-legend-swatch" style={{ backgroundColor: MODALITY_COLORS.audio }} />
                            Audio
                          </span>
                          <span className="analytics-performance-legend-item">
                            <span className="analytics-performance-legend-swatch" style={{ backgroundColor: MODALITY_COLORS.video }} />
                            Video
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="admin-panel-card analytics-chart-card analytics-chart-card--wide">
                    <h3 className="analytics-chart-title">
                      Confidence by AI Exposure Level and modality
                    </h3>
                    <p className="analytics-chart-sub">
                      Grouped bars show mean confidence within each AI exposure level.
                    </p>
                    {!hasDemographicsAiExposureModalityConfidenceChart ? (
                      <p className="analytics-empty-inline">
                        No AI exposure × modality confidence breakdown in this range.
                      </p>
                    ) : (
                      <div className="analytics-chart-area analytics-chart-area--tall">
                        <ResponsiveContainer width="100%" height={320}>
                          <BarChart
                            data={demographicsConfidenceByAiExposureModality}
                            margin={{ top: 10, right: 20, bottom: 22, left: 26 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke={PASTEL_YELLOW} />
                            <XAxis
                              dataKey="aiExposureLevel"
                              tick={{ fontSize: 12 }}
                              tickMargin={4}
                              label={{
                                value: 'AI exposure level',
                                position: 'insideBottom',
                                offset: -4,
                              }}
                            />
                            <YAxis
                              type="number"
                              domain={[1, 5]}
                              allowDecimals={false}
                              width={56}
                              tick={{ fontSize: 12 }}
                              ticks={[1, 2, 3, 4, 5]}
                              label={{
                                value: 'Confidence',
                                angle: -90,
                                position: 'insideLeft',
                                offset: 10,
                              }}
                            />
                            <Tooltip
                              allowEscapeViewBox={{ x: true, y: true }}
                              isAnimationActive={false}
                              wrapperStyle={{ outline: 'none', zIndex: 1000 }}
                              contentStyle={{
                                background: 'transparent',
                                border: 'none',
                                borderRadius: 0,
                                boxShadow: 'none',
                                padding: 0,
                              }}
                              content={<DemographicsEducationModalityConfidenceTooltip />}
                            />
                            <Bar dataKey="textConf" name="Text" fill={MODALITY_COLORS.text} radius={[4, 4, 0, 0]} maxBarSize={26} />
                            <Bar dataKey="imageConf" name="Image" fill={MODALITY_COLORS.image} radius={[4, 4, 0, 0]} maxBarSize={26} />
                            <Bar dataKey="audioConf" name="Audio" fill={MODALITY_COLORS.audio} radius={[4, 4, 0, 0]} maxBarSize={26} />
                            <Bar dataKey="videoConf" name="Video" fill={MODALITY_COLORS.video} radius={[4, 4, 0, 0]} maxBarSize={26} />
                          </BarChart>
                        </ResponsiveContainer>
                        <div className="analytics-performance-legend">
                          <span className="analytics-performance-legend-item">
                            <span className="analytics-performance-legend-swatch" style={{ backgroundColor: MODALITY_COLORS.text }} />
                            Text
                          </span>
                          <span className="analytics-performance-legend-item">
                            <span className="analytics-performance-legend-swatch" style={{ backgroundColor: MODALITY_COLORS.image }} />
                            Image
                          </span>
                          <span className="analytics-performance-legend-item">
                            <span className="analytics-performance-legend-swatch" style={{ backgroundColor: MODALITY_COLORS.audio }} />
                            Audio
                          </span>
                          <span className="analytics-performance-legend-item">
                            <span className="analytics-performance-legend-swatch" style={{ backgroundColor: MODALITY_COLORS.video }} />
                            Video
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="admin-panel-card analytics-chart-card analytics-chart-card--wide">
                    <h3 className="analytics-chart-title">
                      Accuracy and confidence by Age
                    </h3>
                    <p className="analytics-chart-sub">
                      Lines show accuracy (%) and normalized confidence (1-5 to 0-100) by age.
                    </p>
                    {!hasDemographicsAgeLineChart ? (
                      <p className="analytics-empty-inline">
                        No age-based accuracy or confidence breakdown in this range.
                      </p>
                    ) : (
                      <div className="analytics-chart-area analytics-chart-area--tall">
                        <ResponsiveContainer width="100%" height={320}>
                          <LineChart
                            data={demographicsAccuracyConfidenceByAge}
                            margin={{ top: 10, right: 20, bottom: 12, left: 26 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke={PASTEL_YELLOW} />
                            <XAxis
                              dataKey="age"
                              type="number"
                              domain={['dataMin', 'dataMax']}
                              allowDecimals={false}
                              tick={{ fontSize: 12 }}
                              tickMargin={4}
                              label={{
                                value: 'Age',
                                position: 'insideBottom',
                                offset: 4,
                              }}
                            />
                            <YAxis
                              type="number"
                              domain={[0, 100]}
                              allowDecimals={false}
                              width={56}
                              tick={{ fontSize: 12 }}
                              tickFormatter={(v) => `${v}%`}
                              label={{
                                value: 'Score',
                                angle: -90,
                                position: 'insideLeft',
                                offset: 10,
                              }}
                            />
                            <Tooltip
                              allowEscapeViewBox={{ x: true, y: true }}
                              isAnimationActive={false}
                              wrapperStyle={{ outline: 'none', zIndex: 1000 }}
                              contentStyle={{
                                background: 'transparent',
                                border: 'none',
                                borderRadius: 0,
                                boxShadow: 'none',
                                padding: 0,
                              }}
                              cursor={{
                                stroke: PASTEL_BLUE,
                                strokeWidth: 1,
                                strokeDasharray: '4 4',
                              }}
                              content={<DemographicsAgeLinesTooltip />}
                            />
                            <Line
                              type="linear"
                              dataKey="accuracyPct"
                              name="Accuracy"
                              stroke={PASTEL_CYAN}
                              strokeWidth={2}
                              connectNulls={false}
                              dot={{ r: 4 }}
                              activeDot={{ r: 6 }}
                            />
                            <Line
                              type="linear"
                              dataKey="confidenceScaled"
                              name="Confidence (scaled)"
                              stroke={RADAR_CONFIDENCE_COLOR}
                              strokeWidth={2}
                              connectNulls={false}
                              dot={{ r: 4 }}
                              activeDot={{ r: 6 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                        <div className="analytics-performance-legend">
                          <span className="analytics-performance-legend-item">
                            <span
                              className="analytics-performance-legend-swatch"
                              style={{ backgroundColor: PASTEL_CYAN }}
                            />
                            Accuracy (%)
                          </span>
                          <span className="analytics-performance-legend-item">
                            <span
                              className="analytics-performance-legend-swatch"
                              style={{ backgroundColor: RADAR_CONFIDENCE_COLOR }}
                            />
                            Confidence (1-5 to 0-100)
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <AnalyticsPrintFooter />
        </>
      )}
    </div>
  )
}
