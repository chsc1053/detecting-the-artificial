/**
 * File: App.jsx
 * Purpose: Root UI — participant home + study flow, admin login, nested admin routes.
 * Dependencies: react, react-router-dom
 * Related: docs/architecture/frontend.md, docs/features/admin-panel.md
 */

import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { AdminLayout } from './pages/admin/AdminLayout.jsx'
import { AdminDashboardHome } from './pages/admin/AdminDashboardHome.jsx'
import { AdminStudiesPage } from './pages/admin/AdminStudiesPage.jsx'
import {
  StudyWorkspaceLayout,
  StudyWorkspaceIndexRedirect,
} from './pages/admin/StudyWorkspaceLayout.jsx'
import { StudyOverviewTab } from './pages/admin/StudyOverviewTab.jsx'
import { StudyTrialsTab } from './pages/admin/StudyTrialsTab.jsx'
import { StudyStimuliTab } from './pages/admin/StudyStimuliTab.jsx'
import { AdminStimuliPage } from './pages/admin/AdminStimuliPage.jsx'
import { StudyResponsesTab } from './pages/admin/StudyResponsesTab.jsx'
import { AdminAnalyticsPage } from './pages/admin/AdminAnalyticsPage.jsx'
import { ParticipantHome } from './pages/participant/ParticipantHome.jsx'
import { ParticipantStudyPage } from './pages/participant/ParticipantStudyPage.jsx'
import { useState } from 'react'
import './App.css'

function AdminLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setStatus('Signing in…')
    setError(false)

    try {
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const payload = await response.json()

      if (!response.ok || !payload?.success) {
        setStatus(payload?.error || 'Sign-in failed')
        setError(true)
        return
      }

      localStorage.setItem('adminToken', payload.data.token)
      setStatus('')
      navigate('/admin')
    } catch {
      setStatus('Could not reach the server')
      setError(true)
    }
  }

  return (
    <div className="app-shell app-shell--centered">
      <main className="card" aria-labelledby="admin-login-title">
        <h1 id="admin-login-title" className="card-title">
          Experimenter sign in
        </h1>
        <p className="card-subtitle">
          Use the account stored in your local database.
        </p>
        <form className="form-stack" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Sign in
          </button>
        </form>
        {status && (
          <p className={`form-message ${error ? 'form-message--error' : ''}`}>
            {status}
          </p>
        )}
        <p className="form-message" style={{ marginTop: '1.25rem' }}>
          <Link to="/">← Back to home</Link>
        </p>
      </main>
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<ParticipantHome />} />
      <Route path="/study/:studyId" element={<ParticipantStudyPage />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboardHome />} />
        <Route path="studies" element={<AdminStudiesPage />} />
        <Route path="stimuli" element={<AdminStimuliPage />} />
        <Route path="analytics" element={<AdminAnalyticsPage />} />
        <Route path="studies/:studyId" element={<StudyWorkspaceLayout />}>
          <Route index element={<StudyWorkspaceIndexRedirect />} />
          <Route path="overview" element={<StudyOverviewTab />} />
          <Route path="stimuli" element={<StudyStimuliTab />} />
          <Route path="trials" element={<StudyTrialsTab />} />
          <Route path="responses" element={<StudyResponsesTab />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
