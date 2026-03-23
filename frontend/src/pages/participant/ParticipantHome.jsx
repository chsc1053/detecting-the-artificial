/**
 * File: pages/participant/ParticipantHome.jsx
 * Purpose: Participant entry — redirect if one active study, else list studies to join.
 */

import { useState, useEffect } from 'react'
import { Link, Navigate } from 'react-router-dom'

export function ParticipantHome() {
  const [backendStatus, setBackendStatus] = useState('checking')
  const [studies, setStudies] = useState(null)
  const [load, setLoad] = useState('loading')
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setBackendStatus(data?.success ? 'connected' : 'error'))
      .catch(() => setBackendStatus('unreachable'))
  }, [])

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const res = await fetch('/api/participant/active-studies')
        const payload = await res.json()
        if (cancelled) return
        if (!res.ok || !payload?.success) {
          setError(payload?.error || 'Could not load studies')
          setLoad('error')
          return
        }
        setStudies(payload.data ?? [])
        setLoad('ok')
      } catch {
        if (!cancelled) {
          setError('Network error')
          setLoad('error')
        }
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [])

  const ok = backendStatus === 'connected'

  if (load === 'ok' && studies?.length === 1) {
    return <Navigate to={`/study/${studies[0].id}`} replace />
  }

  return (
    <div className="app-shell app-shell--public">
      <main className="public-page participant-home">
        <h1 className="brand">Detecting the Artificial</h1>
        <p className="tagline">
          Multimodal human–AI detection studies for research.
        </p>
        <div
          className={`status-pill ${ok ? 'status-pill--ok' : 'status-pill--bad'}`}
        >
          API {backendStatus === 'checking' ? '…' : ok ? 'connected' : 'unavailable'}
        </div>

        {load === 'loading' && (
          <p className="participant-home-status">Loading studies…</p>
        )}
        {load === 'error' && (
          <p className="participant-home-error">{error}</p>
        )}
        {load === 'ok' && studies.length === 0 && (
          <div className="participant-home-empty">
            <p>There are no active studies right now. Please check back later.</p>
          </div>
        )}
        {load === 'ok' && studies.length > 1 && (
          <section className="participant-study-pick" aria-label="Choose a study">
            <h2 className="participant-section-title">Choose a study</h2>
            <ul className="participant-study-list">
              {studies.map((s) => (
                <li key={s.id}>
                  <Link className="participant-study-card" to={`/study/${s.id}`}>
                    <span className="participant-study-name">{s.name}</span>
                    {s.description && (
                      <span className="participant-study-desc">{s.description}</span>
                    )}
                    <span className="participant-study-meta">
                      {s.trial_total} question{s.trial_total === 1 ? '' : 's'} (
                      {s.trial_counts.forced_choice} forced-choice,{' '}
                      {s.trial_counts.single_item} single-item)
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="public-footer">
          <Link to="/admin/login">Experimenter / admin sign in</Link>
        </footer>
      </main>
    </div>
  )
}
