/**
 * File: pages/admin/AdminLayout.jsx
 * Purpose: Authenticated admin shell — sidebar, top bar, session gate, Outlet for child routes.
 * Dependencies: react, react-router-dom
 * Related: docs/features/admin-panel.md
 */

import { useState, useEffect } from 'react'
import { Link, NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom'

export function AdminLayout() {
  const navigate = useNavigate()
  const [sessionStatus, setSessionStatus] = useState('checking')
  const [email, setEmail] = useState('')

  useEffect(() => {
    async function checkSession() {
      const t = localStorage.getItem('adminToken')
      if (!t) {
        setSessionStatus('unauthorized')
        return
      }

      try {
        const response = await fetch('/api/admin/me', {
          headers: { Authorization: `Bearer ${t}` },
        })
        const payload = await response.json()
        if (!response.ok || !payload?.success) {
          setSessionStatus('unauthorized')
          return
        }

        setEmail(payload.data.experimenter.email)
        setSessionStatus('authorized')
      } catch {
        setSessionStatus('error')
      }
    }

    checkSession()
  }, [])

  function signOut() {
    localStorage.removeItem('adminToken')
    navigate('/admin/login')
  }

  if (sessionStatus === 'checking') {
    return (
      <div className="app-shell app-shell--centered">
        <p className="loading-state">Verifying session…</p>
      </div>
    )
  }

  if (sessionStatus === 'unauthorized') {
    return <Navigate to="/admin/login" replace />
  }

  if (sessionStatus === 'error') {
    return (
      <div className="app-shell app-shell--centered">
        <div className="card card--wide">
          <p className="error-banner">
            Could not verify your session. Check that the API is running.
          </p>
          <p className="form-message">
            <Link to="/admin/login">Return to sign in</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-app">
      <aside className="admin-sidebar" aria-label="Admin navigation">
        <div className="admin-sidebar-brand">
          <Link to="/admin">Detecting the Artificial</Link>
          <span className="admin-sidebar-tag">Admin</span>
        </div>
        <nav className="admin-nav">
          <NavLink to="/admin" end className="admin-nav-link">
            Dashboard
          </NavLink>
          <NavLink to="/admin/studies" className="admin-nav-link">
            Studies
          </NavLink>
        </nav>
      </aside>

      <div className="admin-main-column">
        <header className="admin-header">
          <div className="admin-header-spacer" aria-hidden />
          <div className="admin-user">
            <span className="admin-email">{email}</span>
            <button type="button" className="btn btn-ghost" onClick={signOut}>
              Sign out
            </button>
          </div>
        </header>

        <main className="admin-body admin-body--scroll">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
