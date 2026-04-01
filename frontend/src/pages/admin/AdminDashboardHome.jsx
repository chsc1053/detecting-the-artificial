/**
 * File: pages/admin/AdminDashboardHome.jsx
 * Purpose: Admin dashboard — studies and stimuli snapshots, recent studies.
 * Dependencies: react, react-router-dom
 * Related: docs/features/admin-panel.md
 */

import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { EditIcon } from '../../components/icons/EditIcon.jsx'

function authHeaders() {
  const t = localStorage.getItem('adminToken')
  return t ? { Authorization: `Bearer ${t}` } : {}
}

function countStimuliByModality(stimuli) {
  const m = { text: 0, image: 0, video: 0, audio: 0 }
  for (const s of stimuli) {
    if (Object.prototype.hasOwnProperty.call(m, s.modality)) {
      m[s.modality] += 1
    }
  }
  return m
}

function formatActivityWindow(sinceIso, windowKey) {
  const d = new Date(sinceIso)
  const formatted = d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
  if (windowKey === 'since_last_login') {
    return {
      title: 'Since your last sign-in',
      detail: `Counts include activity after ${formatted}.`,
    }
  }
  return {
    title: 'Your workspace activity',
    detail: `No earlier sign-in on record — totals run from your account creation (${formatted}).`,
  }
}

function formatMedianConfidence(value) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  const n = Number(value)
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

function formatDemographicsLine(withDemo, total) {
  if (total === 0) {
    return { strong: '—', detail: 'no new participant sessions' }
  }
  const pct = Math.round((100 * withDemo) / total)
  return {
    strong: `${pct}%`,
    detail: `${withDemo} of ${total} sessions with demographics saved`,
  }
}

export function AdminDashboardHome() {
  const [studies, setStudies] = useState([])
  const [stimuli, setStimuli] = useState([])
  const [studiesLoad, setStudiesLoad] = useState('loading')
  const [stimuliLoad, setStimuliLoad] = useState('loading')
  const [activityLoad, setActivityLoad] = useState('loading')
  const [activityData, setActivityData] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function run() {
      setStudiesLoad('loading')
      setStimuliLoad('loading')
      setActivityLoad('loading')
      try {
        const [studiesRes, stimuliRes, activityRes] = await Promise.all([
          fetch('/api/studies'),
          fetch('/api/admin/stimuli', { headers: { ...authHeaders() } }),
          fetch('/api/admin/dashboard/activity', {
            headers: { ...authHeaders() },
          }),
        ])
        const studiesPayload = await studiesRes.json()
        const stimuliPayload = await stimuliRes.json()
        const activityPayload = await activityRes.json()
        if (cancelled) return
        if (studiesRes.ok && studiesPayload?.success) {
          setStudies(studiesPayload.data ?? [])
          setStudiesLoad('ok')
        } else {
          setStudies([])
          setStudiesLoad('error')
        }
        if (stimuliRes.ok && stimuliPayload?.success) {
          setStimuli(stimuliPayload.data ?? [])
          setStimuliLoad('ok')
        } else {
          setStimuli([])
          setStimuliLoad('error')
        }
        if (activityRes.ok && activityPayload?.success) {
          setActivityData(activityPayload.data)
          setActivityLoad('ok')
        } else {
          setActivityData(null)
          setActivityLoad('error')
        }
      } catch {
        if (!cancelled) {
          setStudiesLoad('error')
          setStimuliLoad('error')
          setActivityLoad('error')
        }
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [])

  const activeCount = studies.filter((s) => s.is_active).length
  const recent = studies.slice(0, 5)
  const modalityCounts = useMemo(
    () => countStimuliByModality(stimuli),
    [stimuli]
  )

  const activityWindow =
    activityData &&
    formatActivityWindow(activityData.since, activityData.window_key)
  const demographicsDisplay =
    activityData &&
    formatDemographicsLine(
      activityData.participants_with_demographics ?? 0,
      activityData.participants_started ?? 0
    )
  const activityQuiet =
    activityLoad === 'ok' &&
    activityData &&
    activityData.responses_total === 0 &&
    activityData.participants_started === 0 &&
    (activityData.responses_by_study?.length ?? 0) === 0

  return (
    <div className="admin-dashboard-page">
      <h1 className="admin-page-title">Dashboard</h1>
      <p className="admin-page-lead">
        What's new since you last signed in, quick totals, and recent studies. For setup
        and data, use <Link to="/admin/stimuli">Stimuli</Link> and{' '}
        <Link to="/admin/studies">Studies</Link>.
      </p>

      <section className="admin-section dashboard-activity-section">
        <div className="admin-panel-card dashboard-activity-card">
          {activityLoad === 'loading' && (
            <p className="dashboard-stat-muted">Loading activity…</p>
          )}
          {activityLoad === 'error' && (
            <p className="dashboard-stat-error">
              Could not load activity since your last sign-in.
            </p>
          )}
          {activityLoad === 'ok' && activityData && activityWindow && (
            <>
              <h2 className="admin-section-title dashboard-activity-title">
                {activityWindow.title}
              </h2>
              <p className="dashboard-activity-detail">{activityWindow.detail}</p>
              {activityQuiet ? (
                <p className="dashboard-activity-empty">
                  No new participant sessions or trial responses in this period.
                </p>
              ) : (
                <>
                  <ul className="dashboard-activity-metrics" aria-label="Summary counts">
                    <li>
                      <strong>{activityData.responses_total}</strong>
                      <span>new trial responses</span>
                    </li>
                    <li>
                      <strong>{activityData.participants_started}</strong>
                      <span>new participant sessions</span>
                    </li>
                    <li>
                      <strong>
                        {activityData.active_studies_with_responses ?? 0}
                      </strong>
                      <span>active studies with new responses</span>
                    </li>
                    <li>
                      <strong>
                        {formatMedianConfidence(activityData.median_confidence)}
                      </strong>
                      <span>median confidence (1–5)</span>
                    </li>
                    <li>
                      <strong>{demographicsDisplay.strong}</strong>
                      <span>{demographicsDisplay.detail}</span>
                    </li>
                  </ul>
                  {(activityData.responses_by_study?.length ?? 0) > 0 && (
                    <div className="dashboard-activity-by-study">
                      <h3 className="dashboard-activity-subheading">
                        Responses by study
                      </h3>
                      <ul className="dashboard-activity-study-list">
                        {activityData.responses_by_study.map((row) => (
                          <li key={row.study_id}>
                            <Link
                              to={`/admin/studies/${row.study_id}/responses`}
                              className="dashboard-activity-study-link"
                            >
                              {row.study_name}
                            </Link>
                            <span className="dashboard-activity-study-count">
                              {row.response_count}{' '}
                              {row.response_count === 1
                                ? 'new trial response'
                                : 'new trial responses'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="admin-panel-card dashboard-stats">
          <h2 className="admin-section-title">Studies at a glance</h2>
          {studiesLoad === 'loading' && (
            <p className="dashboard-stat-muted">Loading…</p>
          )}
          {studiesLoad === 'error' && (
            <p className="dashboard-stat-error">Could not load studies.</p>
          )}
          {studiesLoad === 'ok' && (
            <div className="dashboard-stat-body">
              <div className="dashboard-stat-total">
                <strong className="dashboard-stat-total-value">
                  {studies.length}
                </strong>
                <span className="dashboard-stat-total-label">total studies</span>
              </div>
              <ul className="dashboard-stat-breakdown dashboard-stat-breakdown--studies">
                <li>
                  <strong>{activeCount}</strong>
                  <span>active</span>
                </li>
                <li>
                  <strong>{studies.length - activeCount}</strong>
                  <span>inactive</span>
                </li>
              </ul>
            </div>
          )}
        </section>

        <section className="admin-panel-card dashboard-stats">
          <h2 className="admin-section-title">Stimuli at a glance</h2>
          {stimuliLoad === 'loading' && (
            <p className="dashboard-stat-muted">Loading…</p>
          )}
          {stimuliLoad === 'error' && (
            <p className="dashboard-stat-error">Could not load stimuli.</p>
          )}
          {stimuliLoad === 'ok' && (
            <div className="dashboard-stat-body">
              <div className="dashboard-stat-total">
                <strong className="dashboard-stat-total-value">
                  {stimuli.length}
                </strong>
                <span className="dashboard-stat-total-label">total stimuli</span>
              </div>
              <ul className="dashboard-stat-breakdown dashboard-stat-breakdown--modalities">
                <li>
                  <strong>{modalityCounts.text}</strong>
                  <span>text</span>
                </li>
                <li>
                  <strong>{modalityCounts.image}</strong>
                  <span>image</span>
                </li>
                <li>
                  <strong>{modalityCounts.video}</strong>
                  <span>video</span>
                </li>
                <li>
                  <strong>{modalityCounts.audio}</strong>
                  <span>audio</span>
                </li>
              </ul>
            </div>
          )}
        </section>
      </div>

      <section className="admin-section">
        <h2 className="admin-section-title">Recent studies</h2>
        {studiesLoad === 'ok' && studies.length === 0 && (
          <div className="empty-state">
            <p>No studies yet.</p>
            <Link to="/admin/studies" className="btn btn-primary" style={{ marginTop: '1rem' }}>
              Create your first study
            </Link>
          </div>
        )}
        {studiesLoad === 'ok' && studies.length > 0 && (
          <ul className="study-list study-list--compact">
            {recent.map((s) => (
              <li key={s.id} className="study-item">
                <div className="study-item-header">
                  <div className="study-item-title">
                    <Link
                      className="study-item-link"
                      to={`/admin/studies/${s.id}/overview`}
                    >
                      {s.name}
                    </Link>
                    <span
                      className={`study-badge ${s.is_active ? 'study-badge--on' : 'study-badge--off'}`}
                    >
                      {s.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span
                      className={`study-badge ${s.demographics_mandatory === true ? 'study-badge--demo-req' : 'study-badge--demo-opt'}`}
                    >
                      {s.demographics_mandatory === true
                        ? 'Demographics required'
                        : 'Demographics optional'}
                    </span>
                  </div>
                  <Link
                    to={`/admin/studies/${s.id}/overview`}
                    className="study-edit-btn"
                    aria-label={`Edit study: ${s.name}`}
                  >
                    <EditIcon />
                    <span>Edit</span>
                  </Link>
                </div>
                {s.description && (
                  <p className="study-item-desc">{s.description}</p>
                )}
              </li>
            ))}
          </ul>
        )}
        {studiesLoad === 'ok' && studies.length > 5 && (
          <p className="dashboard-more">
            <Link to="/admin/studies">View all studies →</Link>
          </p>
        )}
      </section>
    </div>
  )
}
