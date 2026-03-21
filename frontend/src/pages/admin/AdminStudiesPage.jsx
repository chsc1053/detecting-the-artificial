/**
 * File: pages/admin/AdminStudiesPage.jsx
 * Purpose: Studies list and create-study form (moved from dashboard).
 * Dependencies: react
 * Related: docs/features/admin-panel.md
 */

import { useState, useEffect } from 'react'

function getToken() {
  return localStorage.getItem('adminToken')
}

export function AdminStudiesPage() {
  const [studies, setStudies] = useState([])
  const [studiesLoad, setStudiesLoad] = useState('idle')
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newActive, setNewActive] = useState(false)
  const [createStatus, setCreateStatus] = useState('')
  const [createError, setCreateError] = useState(false)

  async function loadStudies() {
    setStudiesLoad('loading')
    try {
      const res = await fetch('/api/studies')
      const payload = await res.json()
      if (res.ok && payload?.success) {
        setStudies(payload.data ?? [])
        setStudiesLoad('ok')
      } else {
        setStudiesLoad('error')
      }
    } catch {
      setStudiesLoad('error')
    }
  }

  useEffect(() => {
    loadStudies()
  }, [])

  async function handleCreateStudy(event) {
    event.preventDefault()
    setCreateStatus('Saving…')
    setCreateError(false)
    try {
      const res = await fetch('/api/admin/studies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          name: newName,
          description: newDescription || null,
          is_active: newActive,
        }),
      })
      const payload = await res.json()
      if (!res.ok || !payload?.success) {
        setCreateStatus(payload?.error || 'Could not create study')
        setCreateError(true)
        return
      }
      setCreateStatus('Study created.')
      setCreateError(false)
      setNewName('')
      setNewDescription('')
      setNewActive(false)
      await loadStudies()
    } catch {
      setCreateStatus('Could not reach the server')
      setCreateError(true)
    }
  }

  return (
    <div>
      <h1 className="admin-page-title">Studies</h1>
      <p className="admin-page-lead">
        Create studies and manage configuration. Trials and stimuli will be added
        here next.
      </p>

      <section className="admin-section">
        <h2 className="admin-section-title">New study</h2>
        <div className="admin-panel-card">
          <form className="form-stack" onSubmit={handleCreateStudy}>
            <div className="field">
              <label htmlFor="study-name">Name</label>
              <input
                id="study-name"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                placeholder="e.g. Pilot — text detection"
              />
            </div>
            <div className="field">
              <label htmlFor="study-desc">Description</label>
              <textarea
                id="study-desc"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={3}
                placeholder="Optional notes for your team"
              />
            </div>
            <label className="field checkbox-field">
              <input
                type="checkbox"
                checked={newActive}
                onChange={(e) => setNewActive(e.target.checked)}
              />
              <span>
                Mark as active (ready for participants once the participant flow
                is live)
              </span>
            </label>
            <button type="submit" className="btn btn-primary">
              Create study
            </button>
          </form>
          {createStatus && (
            <p
              className={`form-message ${createError ? 'form-message--error' : ''}`}
              style={{ marginTop: '1rem' }}
            >
              {createStatus}
            </p>
          )}
        </div>
      </section>

      <section className="admin-section">
        <h2 className="admin-section-title">All studies</h2>
        {studiesLoad === 'loading' && (
          <div className="admin-panel-card loading-state">Loading studies…</div>
        )}
        {studiesLoad === 'error' && (
          <div className="admin-panel-card error-banner">
            Could not load studies. Is the API running?
          </div>
        )}
        {studiesLoad === 'ok' && studies.length === 0 && (
          <div className="empty-state">
            No studies yet. Create one above to get started.
          </div>
        )}
        {studiesLoad === 'ok' && studies.length > 0 && (
          <ul className="study-list">
            {studies.map((s) => (
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
      </section>
    </div>
  )
}
