/**
 * File: pages/admin/StudyResponsesTab.jsx
 * Purpose: Study workspace — list participant trial responses for this study.
 * Dependencies: react, react-router-dom
 * Related: docs/api/endpoints.md
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'

function authHeaders() {
  const t = localStorage.getItem('adminToken')
  return t ? { Authorization: `Bearer ${t}` } : {}
}

function shortId(uuid) {
  if (!uuid || typeof uuid !== 'string') return '—'
  return `${uuid.slice(0, 8)}…`
}

function formatWhen(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return String(iso)
  }
}

function correctLabel(v) {
  if (v === true) return 'Yes'
  if (v === false) return 'No'
  return '—'
}

function escapeCsvCell(s) {
  if (s == null) return ''
  const t = String(s)
  if (/[",\n\r]/.test(t)) return `"${t.replace(/"/g, '""')}"`
  return t
}

function responsesToCsv(rows) {
  const headers = [
    'submitted_at',
    'participant_id',
    'trial_index',
    'task_type',
    'choice_label',
    'confidence',
    'is_correct',
    'explanation',
    'age',
    'approx_location',
    'education_level',
    'ai_literacy',
  ]
  const lines = [headers.join(',')]
  for (const r of rows) {
    lines.push(
      [
        r.created_at,
        r.participant_id,
        r.trial_index,
        r.task_type,
        r.choice_label,
        r.confidence,
        r.is_correct,
        r.explanation,
        r.age,
        r.approx_location,
        r.education_level,
        r.ai_literacy,
      ]
        .map(escapeCsvCell)
        .join(',')
    )
  }
  return lines.join('\r\n')
}

export function StudyResponsesTab() {
  const { study } = useOutletContext()
  const [rows, setRows] = useState([])
  const [load, setLoad] = useState('loading')
  const [error, setError] = useState(null)
  const [trialFilter, setTrialFilter] = useState('all')

  const loadResponses = useCallback(async () => {
    setLoad('loading')
    setError(null)
    try {
      const res = await fetch(`/api/admin/studies/${study.id}/responses`, {
        headers: { ...authHeaders() },
      })
      const payload = await res.json()
      if (!res.ok || !payload?.success) {
        setError(payload?.error || 'Could not load responses')
        setRows([])
        setLoad('error')
        return
      }
      setRows(payload.data ?? [])
      setLoad('ok')
    } catch {
      setError('Network error')
      setRows([])
      setLoad('error')
    }
  }, [study.id])

  useEffect(() => {
    loadResponses()
  }, [loadResponses])

  const trialOptions = useMemo(() => {
    const set = new Set()
    for (const r of rows) {
      if (r.trial_index != null) set.add(r.trial_index)
    }
    return [...set].sort((a, b) => a - b)
  }, [rows])

  const filtered = useMemo(() => {
    if (trialFilter === 'all') return rows
    const n = Number(trialFilter)
    if (Number.isNaN(n)) return rows
    return rows.filter((r) => r.trial_index === n)
  }, [rows, trialFilter])

  const uniqueParticipants = useMemo(() => {
    const s = new Set()
    for (const r of rows) {
      if (r.participant_id) s.add(r.participant_id)
    }
    return s.size
  }, [rows])

  function downloadCsv() {
    const csv = responsesToCsv(filtered)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `responses-${study.id.slice(0, 8)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <p className="admin-page-lead">
        Trial-level responses recorded for <strong>{study.name}</strong>. Each row is one
        answer; the same participant may appear on multiple rows.
      </p>

      <section className="admin-section">
        <div className="responses-tab-toolbar">
          <div className="responses-tab-stats" aria-live="polite">
            {load === 'ok' && (
              <>
                <span>
                  <strong>{rows.length}</strong> response{rows.length === 1 ? '' : 's'}
                </span>
                <span className="responses-tab-stats-sep" aria-hidden>
                  ·
                </span>
                <span>
                  <strong>{uniqueParticipants}</strong> participant
                  {uniqueParticipants === 1 ? '' : 's'}
                </span>
              </>
            )}
          </div>
          <div className="responses-tab-actions">
            <label className="responses-filter-label" htmlFor="responses-trial-filter">
              <span className="responses-filter-label-text">Trial Filter:</span>
              <select
                id="responses-trial-filter"
                value={trialFilter}
                onChange={(e) => setTrialFilter(e.target.value)}
                disabled={load !== 'ok' || rows.length === 0}
              >
                <option value="all">All</option>
                {trialOptions.map((idx) => (
                  <option key={idx} value={String(idx)}>
                    Trial {idx + 1}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => loadResponses()}
              disabled={load === 'loading'}
            >
              Refresh
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={downloadCsv}
              disabled={load !== 'ok' || filtered.length === 0}
            >
              Download CSV
            </button>
          </div>
        </div>

        {load === 'loading' && (
          <div className="admin-panel-card loading-state">Loading responses…</div>
        )}
        {load === 'error' && (
          <div className="admin-panel-card error-banner">
            {error || 'Could not load responses.'}{' '}
            <button type="button" className="btn-inline" onClick={() => loadResponses()}>
              Retry
            </button>
          </div>
        )}
        {load === 'ok' && rows.length === 0 && (
          <div className="admin-panel-card empty-state">No responses yet for this study.</div>
        )}
        {load === 'ok' && filtered.length > 0 && (
          <div className="admin-panel-card admin-table-wrap">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th scope="col">Submitted</th>
                  <th scope="col">Participant</th>
                  <th scope="col">Trial</th>
                  <th scope="col">Task</th>
                  <th scope="col">Choice</th>
                  <th scope="col">Conf.</th>
                  <th scope="col">Correct</th>
                  <th scope="col">Explanation</th>
                  <th scope="col">Age</th>
                  <th scope="col">Location</th>
                  <th scope="col">Education</th>
                  <th scope="col">AI literacy</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td>{formatWhen(r.created_at)}</td>
                    <td>
                      <code className="admin-mono-clip" title={r.participant_id}>
                        {shortId(r.participant_id)}
                      </code>
                    </td>
                    <td>{r.trial_index != null ? r.trial_index + 1 : '—'}</td>
                    <td>{r.task_type === 'forced_choice' ? 'Forced choice' : 'Single item'}</td>
                    <td>
                      <code>{r.choice_label}</code>
                    </td>
                    <td>{r.confidence}</td>
                    <td>{correctLabel(r.is_correct)}</td>
                    <td className="admin-cell-explanation">
                      {r.explanation ? (
                        <span title={r.explanation}>{r.explanation}</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>{r.age ?? '—'}</td>
                    <td>{r.approx_location ?? '—'}</td>
                    <td>{r.education_level ?? '—'}</td>
                    <td>{r.ai_literacy ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
