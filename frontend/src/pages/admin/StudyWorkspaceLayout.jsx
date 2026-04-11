/**
 * File: pages/admin/StudyWorkspaceLayout.jsx
 * Purpose: Study workspace shell — header, tabs, loads study for child routes.
 * Dependencies: react, react-router-dom
 * Related: docs/features/admin-panel.md
 */

/**
 * File: pages/admin/StudyWorkspaceLayout.jsx
 * Purpose: Study workspace shell — header, tabs, loads study for child routes.
 * Dependencies: react, react-router-dom
 * Related: docs/features/admin-panel.md
 */

import { useState, useEffect } from 'react'
import { Link, NavLink, Navigate, Outlet, useParams } from 'react-router-dom'

function authHeaders() {
  const t = localStorage.getItem('adminToken')
  return t ? { Authorization: `Bearer ${t}` } : {}
}

export function StudyWorkspaceLayout() {
  const { studyId } = useParams()
  const [study, setStudy] = useState(null)
  const [load, setLoad] = useState('loading')
  const [error, setError] = useState(null)

  async function reloadStudy() {
    setLoad('loading')
    setError(null)
    try {
      const res = await fetch(`/api/admin/studies/${studyId}`, {
        headers: { ...authHeaders() },
      })
      const payload = await res.json()
      if (!res.ok || !payload?.success) {
        setError(payload?.error || 'Could not load study')
        setStudy(null)
        setLoad('error')
        return
      }
      setStudy(payload.data)
      setLoad('ok')
    } catch {
      setError('Network error')
      setStudy(null)
      setLoad('error')
    }
  }

  useEffect(() => {
    reloadStudy()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- studyId only
  }, [studyId])

  if (load === 'loading') {
    return (
      <div className="loading-state" style={{ padding: '2rem' }}>
        Loading study…
      </div>
    )
  }

  if (load === 'error' || !study) {
    return (
      <div className="admin-panel-card error-banner" style={{ margin: '1rem 0' }}>
        {error || 'Study not found.'}{' '}
        <Link to="/admin/studies">Back to studies</Link>
      </div>
    )
  }

  return (
    <div className="study-workspace">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/admin/studies">Studies</Link>
        <span className="breadcrumb-sep" aria-hidden>
          /
        </span>
        <span className="breadcrumb-current">{study.name}</span>
      </nav>

      <header className="study-workspace-header">
        <h1 className="admin-page-title">{study.name}</h1>
        <span
          className={`study-badge ${study.is_active ? 'study-badge--on' : 'study-badge--off'}`}
        >
          {study.is_active ? 'Active' : 'Inactive'}
        </span>
        <span
          className={`study-badge ${study.demographics_mandatory === true ? 'study-badge--demo-req' : 'study-badge--demo-opt'}`}
        >
          {study.demographics_mandatory === true
            ? 'Demographics required'
            : 'Demographics optional'}
        </span>
      </header>

      <div className="study-tabs" role="tablist">
        <NavLink
          to="overview"
          className={({ isActive }) =>
            `study-tab ${isActive ? 'study-tab--active' : ''}`
          }
        >
          Overview
        </NavLink>
        <NavLink
          to="stimuli"
          className={({ isActive }) =>
            `study-tab ${isActive ? 'study-tab--active' : ''}`
          }
        >
          Stimuli
        </NavLink>
        <NavLink
          to="trials"
          className={({ isActive }) =>
            `study-tab ${isActive ? 'study-tab--active' : ''}`
          }
        >
          Trials
        </NavLink>
        <NavLink
          to="responses"
          className={({ isActive }) =>
            `study-tab ${isActive ? 'study-tab--active' : ''}`
          }
        >
          Responses
        </NavLink>
      </div>

      <div className="study-tab-panel">
        <Outlet context={{ study, reloadStudy }} />
      </div>
    </div>
  )
}

export function StudyWorkspaceIndexRedirect() {
  return <Navigate to="overview" replace />
}
