/**
 * File: pages/admin/StudyStimuliTab.jsx
 * Purpose: Stimuli for a study workspace — add text stimuli; more modalities later.
 * Dependencies: react, react-router-dom
 * Related: docs/features/admin-panel.md
 */

import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { StimulusItemCard } from '../../components/admin/StimulusItemCard.jsx'

function authHeaders() {
  const t = localStorage.getItem('adminToken')
  return t ? { Authorization: `Bearer ${t}` } : {}
}

export function StudyStimuliTab() {
  const { study } = useOutletContext()
  const [stimuli, setStimuli] = useState([])
  const [load, setLoad] = useState('loading')
  const [stimForm, setStimForm] = useState({
    source_type: 'human',
    text_content: '',
  })
  const [stimMsg, setStimMsg] = useState('')

  async function loadStimuli() {
    setLoad('loading')
    try {
      const res = await fetch('/api/admin/stimuli', {
        headers: { ...authHeaders() },
      })
      const payload = await res.json()
      if (res.ok && payload?.success) {
        setStimuli(payload.data ?? [])
        setLoad('ok')
      } else {
        setLoad('error')
      }
    } catch {
      setLoad('error')
    }
  }

  useEffect(() => {
    loadStimuli()
  }, [study.id])

  async function addStimulus(e) {
    e.preventDefault()
    setStimMsg('Saving…')
    try {
      const res = await fetch('/api/admin/stimuli', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify({
          modality: 'text',
          source_type: stimForm.source_type,
          text_content: stimForm.text_content,
        }),
      })
      const payload = await res.json()
      if (!res.ok || !payload?.success) {
        setStimMsg(payload?.error || 'Failed')
        return
      }
      setStimMsg('Stimulus created.')
      setStimForm((f) => ({ ...f, text_content: '' }))
      await loadStimuli()
    } catch {
      setStimMsg('Network error')
    }
  }

  return (
    <div>
      <p className="admin-page-lead">
        Stimuli are shared across the deployment. Add text items here; image, video,
        and audio uploads will follow.
      </p>

      <section className="admin-section">
        <h2 className="admin-section-title">Add text stimulus</h2>
        <div className="admin-panel-card">
          <form className="form-stack" onSubmit={addStimulus}>
            <div className="field">
              <label htmlFor="st-src">Source</label>
              <select
                id="st-src"
                value={stimForm.source_type}
                onChange={(e) =>
                  setStimForm((f) => ({ ...f, source_type: e.target.value }))
                }
              >
                <option value="human">Human-created</option>
                <option value="ai">AI-generated</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="st-text">Text content</label>
              <textarea
                id="st-text"
                value={stimForm.text_content}
                onChange={(e) =>
                  setStimForm((f) => ({ ...f, text_content: e.target.value }))
                }
                rows={3}
                required
                placeholder="Stimulus text shown to participants"
              />
            </div>
            <button type="submit" className="btn btn-primary">
              Create stimulus
            </button>
          </form>
          {stimMsg && <p className="form-message">{stimMsg}</p>}
        </div>
      </section>

      <section className="admin-section">
        <h2 className="admin-section-title">Stimulus library (recent)</h2>
        {load === 'loading' && (
          <p className="dashboard-stat-muted">Loading…</p>
        )}
        {load === 'error' && (
          <p className="error-banner">Could not load stimuli.</p>
        )}
        {load === 'ok' && stimuli.length === 0 && (
          <div className="empty-state">No stimuli yet. Create one above.</div>
        )}
        {load === 'ok' && stimuli.length > 0 && (
          <ul className="stimulus-list">
            {stimuli.map((s) => (
              <li key={s.id}>
                <StimulusItemCard stimulus={s} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
