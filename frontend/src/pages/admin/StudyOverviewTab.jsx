/**
 * File: pages/admin/StudyOverviewTab.jsx
 * Purpose: Study workspace — overview and edit name/description/active.
 * Dependencies: react, react-router-dom
 */

import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'

function authHeaders() {
  const t = localStorage.getItem('adminToken')
  return t ? { Authorization: `Bearer ${t}` } : {}
}

export function StudyOverviewTab() {
  const { study, reloadStudy } = useOutletContext()
  const [name, setName] = useState(study.name)
  const [description, setDescription] = useState(study.description ?? '')
  const [isActive, setIsActive] = useState(study.is_active)
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setName(study.name)
    setDescription(study.description ?? '')
    setIsActive(study.is_active)
  }, [study])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setStatus('')
    try {
      const res = await fetch(`/api/admin/studies/${study.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify({
          name,
          description: description || null,
          is_active: isActive,
        }),
      })
      const payload = await res.json()
      if (!res.ok || !payload?.success) {
        setStatus(payload?.error || 'Save failed')
        setSaving(false)
        return
      }
      setStatus('Saved.')
      await reloadStudy()
    } catch {
      setStatus('Could not reach server')
    }
    setSaving(false)
  }

  return (
    <div>
      <p className="admin-page-lead">
        Basic study metadata. Add stimuli under Stimuli, then build trials under
        Trials.
      </p>
      <div className="admin-panel-card">
        <form className="form-stack" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="ov-name">Name</label>
            <input
              id="ov-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="ov-desc">Description</label>
            <textarea
              id="ov-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>
          <label className="field checkbox-field">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            <span>Study is active</span>
          </label>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
        {status && (
          <p className="form-message" style={{ marginTop: '1rem' }}>
            {status}
          </p>
        )}
      </div>
    </div>
  )
}
