/**
 * File: pages/admin/AdminDashboardHome.jsx
 * Purpose: Admin dashboard — overview, quick actions, recent studies (not full list).
 * Dependencies: react, react-router-dom
 * Related: docs/features/admin-panel.md
 */

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

export function AdminDashboardHome() {
  const [studies, setStudies] = useState([])
  const [load, setLoad] = useState('loading')

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const res = await fetch('/api/studies')
        const payload = await res.json()
        if (!cancelled && res.ok && payload?.success) {
          setStudies(payload.data ?? [])
          setLoad('ok')
        } else if (!cancelled) {
          setLoad('error')
        }
      } catch {
        if (!cancelled) setLoad('error')
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [])

  const activeCount = studies.filter((s) => s.is_active).length
  const recent = studies.slice(0, 5)

  return (
    <div>
      <h1 className="admin-page-title">Dashboard</h1>
      <p className="admin-page-lead">
        Overview of your deployment. Configure and run studies from{' '}
        <Link to="/admin/studies">Studies</Link>.
      </p>

      <div className="dashboard-grid">
        <section className="admin-panel-card dashboard-actions">
          <h2 className="admin-section-title">Quick actions</h2>
          <div className="dashboard-action-buttons">
            <Link to="/admin/studies" className="btn btn-primary">
              Open studies
            </Link>
            <Link to="/admin/studies" className="btn btn-ghost">
              Create a study
            </Link>
          </div>
          <p className="dashboard-hint">
            Create and manage studies, trials, and stimuli on the Studies page.
          </p>
        </section>

        <section className="admin-panel-card dashboard-stats">
          <h2 className="admin-section-title">At a glance</h2>
          {load === 'loading' && (
            <p className="dashboard-stat-muted">Loading…</p>
          )}
          {load === 'error' && (
            <p className="dashboard-stat-error">Could not load studies.</p>
          )}
          {load === 'ok' && (
            <ul className="dashboard-stat-list">
              <li>
                <strong>{studies.length}</strong>
                <span>total studies</span>
              </li>
              <li>
                <strong>{activeCount}</strong>
                <span>active</span>
              </li>
              <li>
                <strong>{studies.length - activeCount}</strong>
                <span>inactive</span>
              </li>
            </ul>
          )}
        </section>
      </div>

      <section className="admin-section">
        <h2 className="admin-section-title">Recent studies</h2>
        {load === 'ok' && studies.length === 0 && (
          <div className="empty-state">
            <p>No studies yet.</p>
            <Link to="/admin/studies" className="btn btn-primary" style={{ marginTop: '1rem' }}>
              Create your first study
            </Link>
          </div>
        )}
        {load === 'ok' && studies.length > 0 && (
          <ul className="study-list study-list--compact">
            {recent.map((s) => (
              <li key={s.id} className="study-item">
                <div className="study-item-title">
                  {s.name}
                  <span
                    className={`study-badge ${s.is_active ? 'study-badge--on' : 'study-badge--off'}`}
                  >
                    {s.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {s.description && (
                  <p className="study-item-desc">{s.description}</p>
                )}
              </li>
            ))}
          </ul>
        )}
        {load === 'ok' && studies.length > 5 && (
          <p className="dashboard-more">
            <Link to="/admin/studies">View all studies →</Link>
          </p>
        )}
      </section>
    </div>
  )
}
