/**
 * File: App.jsx
 * Purpose: Root UI component for Detecting the Artificial — participant and experimenter flows will be added here or via routing.
 * Dependencies: react, react-router-dom
 * Key: App — root component
 * Related: docs/architecture/frontend.md
 */

import { useState, useEffect } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import './App.css'

function ParticipantHome() {
  const [backendStatus, setBackendStatus] = useState('checking')

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setBackendStatus(data?.success ? 'connected' : 'error'))
      .catch(() => setBackendStatus('unreachable'))
  }, [])

  return (
    <main>
      <h1>Detecting the Artificial</h1>
      <p>Human–AI detection studies — coming soon.</p>
      <p className="backend-status">Backend: {backendStatus}</p>
      <p>
        Experimenter access: <a href="/admin/login">Admin Login</a>
      </p>
    </main>
  )
}

function AdminLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setStatus('Signing in...')

    try {
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const payload = await response.json()

      if (!response.ok || !payload?.success) {
        setStatus(payload?.error || 'Login failed')
        return
      }

      localStorage.setItem('adminToken', payload.data.token)
      setStatus('Signed in')
      navigate('/admin')
    } catch (error) {
      setStatus('Could not reach backend')
    }
  }

  return (
    <main>
      <h1>Admin Login</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        <button type="submit">Sign in</button>
      </form>
      <p>{status}</p>
    </main>
  )
}

function AdminDashboard() {
  const navigate = useNavigate()
  const [sessionStatus, setSessionStatus] = useState('checking')
  const [email, setEmail] = useState('')

  useEffect(() => {
    async function checkSession() {
      const token = localStorage.getItem('adminToken')
      if (!token) {
        setSessionStatus('unauthorized')
        return
      }

      try {
        const response = await fetch('/api/admin/me', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const payload = await response.json()
        if (!response.ok || !payload?.success) {
          setSessionStatus('unauthorized')
          return
        }

        setEmail(payload.data.experimenter.email)
        setSessionStatus('authorized')
      } catch (error) {
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
    return <main>Checking admin session...</main>
  }

  if (sessionStatus === 'unauthorized') {
    return <Navigate to="/admin/login" replace />
  }

  if (sessionStatus === 'error') {
    return <main>Could not verify admin session.</main>
  }

  return (
    <main>
      <h1>Admin Panel</h1>
      <p>Signed in as: {email}</p>
      <p>Study/trial configuration and analytics will be added next.</p>
      <button type="button" onClick={signOut}>
        Sign out
      </button>
    </main>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<ParticipantHome />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminDashboard />} />
    </Routes>
  )
}

export default App
