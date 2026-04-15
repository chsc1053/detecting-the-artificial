/**
 * File: pages/admin/StudyOverviewTab.jsx
 * Purpose: Study workspace — overview and edit name/description/active.
 * Dependencies: react, react-router-dom
 */

import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'

const FLASH_MS = { warning: 8000 }

const MANDATORY_DEMOGRAPHICS_CONFLICT_MESSAGE =
  'Cannot turn on mandatory demographics while this study has responses. On the Responses tab, use Delete all responses, then change this setting.'

function authHeaders() {
  const t = localStorage.getItem('adminToken')
  return t ? { Authorization: `Bearer ${t}` } : {}
}

export function StudyOverviewTab() {
  const { study, reloadStudy } = useOutletContext()
  const navigate = useNavigate()
  const [name, setName] = useState(study.name)
  const [description, setDescription] = useState(study.description ?? '')
  const [isActive, setIsActive] = useState(study.is_active)
  const [demographicsMandatory, setDemographicsMandatory] = useState(
    study.demographics_mandatory === true
  )
  const [status, setStatus] = useState('')
  const [flash, setFlash] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const flashDismissRef = useRef(null)
  const flashBannerRef = useRef(null)

  const settingsDirty =
    name !== study.name ||
    description !== (study.description ?? '') ||
    isActive !== study.is_active ||
    demographicsMandatory !== (study.demographics_mandatory === true)

  useEffect(() => {
    setName(study.name)
    setDescription(study.description ?? '')
    setIsActive(study.is_active)
    setDemographicsMandatory(study.demographics_mandatory === true)
  }, [study])

  useEffect(() => {
    if (!flash || flash.kind === 'loading') return undefined
    const ms = FLASH_MS[flash.kind] ?? 5000
    flashDismissRef.current = window.setTimeout(() => setFlash(null), ms)
    return () => {
      if (flashDismissRef.current != null) {
        window.clearTimeout(flashDismissRef.current)
        flashDismissRef.current = null
      }
    }
  }, [flash])

  useEffect(() => {
    if (!flash) return undefined
    const id = requestAnimationFrame(() => {
      flashBannerRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })
    return () => cancelAnimationFrame(id)
  }, [flash])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setStatus('')
    setFlash(null)
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
          demographics_mandatory: demographicsMandatory,
        }),
      })
      const payload = await res.json()
      if (!res.ok || !payload?.success) {
        if (res.status === 409 && payload?.code === 'study_has_responses') {
          setDemographicsMandatory(study.demographics_mandatory === true)
          setFlash({
            kind: 'warning',
            text: MANDATORY_DEMOGRAPHICS_CONFLICT_MESSAGE,
          })
        } else {
          setStatus(payload?.error || 'Save failed')
        }
        setSaving(false)
        return
      }
      setFlash(null)
      setStatus('Saved.')
      await reloadStudy()
    } catch {
      setStatus('Could not reach server')
    }
    setSaving(false)
  }

  async function handleDeleteStudy() {
    if (!window.confirm(`Delete study "${study.name}"? This cannot be undone.`)) return
    setDeleting(true)
    setStatus('')
    try {
      const res = await fetch(`/api/admin/studies/${study.id}`, {
        method: 'DELETE',
        headers: {
          ...authHeaders(),
        },
      })
      const payload = await res.json()
      if (!res.ok || !payload?.success) {
        setStatus(payload?.error || 'Could not delete study')
        setDeleting(false)
        return
      }
      navigate('/admin/studies')
    } catch {
      setStatus('Could not reach the server')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <p className="admin-page-lead">
        Basic study metadata. Add stimuli under Stimuli, then build trials under
        Trials.
      </p>
      <p className="dashboard-stat-muted study-overview-analytics-hint">
        <Link to={`/admin/analytics?study_id=${study.id}`}>
          Open Analytics for this study
        </Link>{' '}
        (charts use the same page; this link sets study scope for you.)
      </p>

      {flash ? (
        <div
          ref={flashBannerRef}
          className={`admin-flash admin-flash--${flash.kind}`}
          role="status"
          aria-live="polite"
        >
          <span className="admin-flash__icon" aria-hidden>
            {flash.kind === 'warning' ? '⚠' : null}
          </span>
          <span className="admin-flash__text">{flash.text}</span>
        </div>
      ) : null}

      <div className="admin-panel-card">
        <form className="form-stack" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="ov-name">Name</label>
            <input
              id="ov-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Study title"
            />
          </div>
          <div className="field">
            <label htmlFor="ov-desc">Description</label>
            <textarea
              id="ov-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Short description"
            />
          </div>
          <label className="field checkbox-field">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            <span>
              {isActive
                ? (
                    <>
                      Make study active / inactive - This study is{' '}
                      <strong>currently active</strong>. Uncheck to make it inactive.
                    </>
                  )
                : (
                    <>
                      Make study active / inactive - This study is{' '}
                      <strong>currently inactive</strong>. Check to make it active.
                    </>
                  )}
            </span>
          </label>
          <label className="field checkbox-field">
            <input
              type="checkbox"
              checked={demographicsMandatory}
              onChange={(e) => setDemographicsMandatory(e.target.checked)}
            />
            <span>
              {demographicsMandatory
                ? (
                    <>
                      Make demographics mandatory / optional - This study{' '}
                      <strong>requires demographics currently</strong>. Uncheck to make them optional
                    </>
                  )
                : (
                    <>
                      Make demographics mandatory / optional - This study{' '}
                      <strong>doesn't require demographics currently</strong>. Check to make them mandatory
                    </>
                  )}
            </span>
          </label>
          {settingsDirty && !saving && (
            <p className="form-message form-message--warning" role="status">
              <span className="form-warning-symbol" aria-hidden>
                ⚠
              </span>
              You have unsaved changes. Click &quot;Save changes&quot; to apply.
            </p>
          )}
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          <button
            type="button"
            className="btn btn-danger-solid"
            onClick={handleDeleteStudy}
            disabled={deleting}
          >
            {deleting ? 'Deleting…' : 'Delete study'}
          </button>
        </form>
        {status ? (
          <p className="form-message" style={{ marginTop: '1rem' }}>
            {status}
          </p>
        ) : null}
      </div>
    </div>
  )
}
