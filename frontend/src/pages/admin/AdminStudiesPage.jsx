/**
 * File: pages/admin/AdminStudiesPage.jsx
 * Purpose: Studies list and create-study form (moved from dashboard).
 * Dependencies: react
 * Related: docs/features/admin-panel.md
 */

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { EditIcon } from '../../components/icons/EditIcon.jsx'
import { DeleteIcon } from '../../components/icons/DeleteIcon.jsx'

function getToken() {
  return localStorage.getItem('adminToken')
}

export function AdminStudiesPage() {
  const [studies, setStudies] = useState([])
  const [studiesLoad, setStudiesLoad] = useState('idle')
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [createStatus, setCreateStatus] = useState('')
  const [createError, setCreateError] = useState(false)
  const [deleteStatus, setDeleteStatus] = useState('')
  const [deleteError, setDeleteError] = useState(false)
  const [deletingStudyId, setDeletingStudyId] = useState(null)

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

  async function deleteStudy(studyId, studyName) {
    if (!window.confirm(`Delete study "${studyName}"? This cannot be undone.`)) return
    setDeleteStatus('Deleting…')
    setDeleteError(false)
    setDeletingStudyId(studyId)
    try {
      const res = await fetch(`/api/admin/studies/${studyId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      })
      const payload = await res.json()
      if (!res.ok || !payload?.success) {
        setDeleteStatus(payload?.error || 'Could not delete study')
        setDeleteError(true)
        return
      }
      setDeleteStatus('Study deleted.')
      await loadStudies()
    } catch {
      setDeleteStatus('Could not reach the server')
      setDeleteError(true)
    } finally {
      setDeletingStudyId(null)
    }
  }

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
      await loadStudies()
    } catch {
      setCreateStatus('Could not reach the server')
      setCreateError(true)
    }
  }

  return (
    <div className="admin-studies-page">
      <h1 className="admin-page-title">Studies</h1>
      <p className="admin-page-lead">
        Create studies and manage configuration. Open a study to add stimuli,
        trials, and review responses.
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
              placeholder="Study title"
              />
            </div>
            <div className="field">
              <label htmlFor="study-desc">Description</label>
              <textarea
                id="study-desc"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={3}
                placeholder="Short description"
              />
            </div>
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
        {deleteStatus && (
          <p
            className={`form-message ${deleteError ? 'form-message--error' : ''}`}
            style={{ marginTop: '0.75rem' }}
          >
            {deleteStatus}
          </p>
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
                  <div className="study-item-actions">
                    <Link
                      to={`/admin/studies/${s.id}/overview`}
                      className="study-edit-btn"
                      aria-label={`Edit study: ${s.name}`}
                    >
                      <EditIcon />
                      <span>Edit</span>
                    </Link>
                    <button
                      type="button"
                      className="study-delete-btn"
                      onClick={() => deleteStudy(s.id, s.name)}
                      disabled={deletingStudyId === s.id}
                      aria-label={`Delete study: ${s.name}`}
                    >
                      <DeleteIcon />
                      <span>{deletingStudyId === s.id ? 'Deleting…' : 'Delete'}</span>
                    </button>
                  </div>
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
