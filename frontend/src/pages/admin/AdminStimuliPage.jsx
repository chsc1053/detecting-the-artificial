/**
 * File: pages/admin/AdminStimuliPage.jsx
 * Purpose: Global stimuli library — create and browse stimuli per modality (text, image, video, audio).
 * Dependencies: react
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { StimulusItemCard } from '../../components/admin/StimulusItemCard.jsx'

/** Auto-dismiss after this long (loading messages are excluded). */
const FLASH_MS = { success: 4800, error: 8000, warning: 8000 }

function stimulusPreviewLabel(s) {
  if (s.text_content) return s.text_content.slice(0, 48)
  if (s.storage_key) return s.storage_key.slice(0, 48)
  return s.modality
}

function authHeaders() {
  const t = localStorage.getItem('adminToken')
  return t ? { Authorization: `Bearer ${t}` } : {}
}

const MODALITY_TABS = [
  { id: 'text', label: 'Text' },
  { id: 'image', label: 'Image' },
  { id: 'video', label: 'Video' },
  { id: 'audio', label: 'Audio' },
]

export function AdminStimuliPage() {
  const [activeTab, setActiveTab] = useState('text')
  const [stimuli, setStimuli] = useState([])
  const [load, setLoad] = useState('idle')
  const [flash, setFlash] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const flashDismissRef = useRef(null)
  const flashBannerRef = useRef(null)

  const [forms, setForms] = useState({
    text: { source_type: 'human', text_content: '' },
    image: { source_type: 'human', storage_key: '', model_name: '', notes: '' },
    video: { source_type: 'human', storage_key: '', model_name: '', notes: '' },
    audio: { source_type: 'human', storage_key: '', model_name: '', notes: '' },
  })

  async function loadStimuli() {
    setLoad('loading')
    try {
      const res = await fetch('/api/admin/stimuli', { headers: { ...authHeaders() } })
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
  }, [])

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
    if (!flash) return
    const id = requestAnimationFrame(() => {
      flashBannerRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })
    return () => cancelAnimationFrame(id)
  }, [flash])

  const filteredStimuli = useMemo(
    () => stimuli.filter((s) => s.modality === activeTab),
    [stimuli, activeTab]
  )

  function updateForm(modality, patch) {
    setForms((prev) => ({ ...prev, [modality]: { ...prev[modality], ...patch } }))
  }

  async function handleCreate(e) {
    e.preventDefault()
    setFlash({ kind: 'loading', text: 'Saving…' })
    const form = forms[activeTab]
    try {
      const body =
        activeTab === 'text'
          ? {
              modality: 'text',
              source_type: form.source_type,
              text_content: form.text_content,
            }
          : {
              modality: activeTab,
              source_type: form.source_type,
              storage_key: form.storage_key,
              model_name: form.model_name || null,
              notes: form.notes || null,
            }

      const res = await fetch('/api/admin/stimuli', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify(body),
      })
      const payload = await res.json()
      if (!res.ok || !payload?.success) {
        setFlash({
          kind: 'error',
          text: payload?.error || 'Could not create stimulus',
        })
        return
      }

      setFlash({ kind: 'success', text: 'Stimulus created.' })
      // Clear only the active form
      setForms((prev) => ({
        ...prev,
        text:
          activeTab === 'text'
            ? { ...prev.text, text_content: '' }
            : prev.text,
        image:
          activeTab === 'image'
            ? { ...prev.image, storage_key: '', model_name: '', notes: '' }
            : prev.image,
        video:
          activeTab === 'video'
            ? { ...prev.video, storage_key: '', model_name: '', notes: '' }
            : prev.video,
        audio:
          activeTab === 'audio'
            ? { ...prev.audio, storage_key: '', model_name: '', notes: '' }
            : prev.audio,
      }))
      await loadStimuli()
    } catch {
      setFlash({
        kind: 'error',
        text: 'Could not reach the server.',
      })
    }
  }

  const currentForm = forms[activeTab]

  async function deleteStimulus(s) {
    const preview = stimulusPreviewLabel(s)
    const label =
      preview.length >= 48 ? `${preview}…` : preview || s.id.slice(0, 8)
    if (
      !window.confirm(
        `Delete this ${s.modality} stimulus (${label})? This cannot be undone. It must not be used in any trial.`
      )
    ) {
      return
    }
    setDeletingId(s.id)
    try {
      const res = await fetch(`/api/admin/stimuli/${s.id}`, {
        method: 'DELETE',
        headers: { ...authHeaders() },
      })
      const payload = await res.json()
      if (!res.ok || !payload?.success) {
        const msg = payload?.error || 'Could not delete stimulus'
        setFlash({
          kind: res.status === 409 ? 'warning' : 'error',
          text: msg,
        })
        return
      }
      setFlash({ kind: 'success', text: 'Stimulus removed.' })
      await loadStimuli()
    } catch {
      setFlash({
        kind: 'error',
        text: 'Could not reach the server.',
      })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="admin-stimuli-page">
      <h1 className="admin-page-title">Stimuli</h1>
      <p className="admin-page-lead">
        Manage shared stimuli across all studies. Trials reference items from this library. Delete is only allowed when no
        trial uses a stimulus (remove it from trials first if needed).
      </p>

      {flash && (
        <div
          ref={flashBannerRef}
          className={`admin-flash admin-flash--${flash.kind}`}
          role={flash.kind === 'error' ? 'alert' : 'status'}
          aria-live={flash.kind === 'error' ? 'assertive' : 'polite'}
        >
          <span className="admin-flash__icon" aria-hidden>
            {flash.kind === 'loading' && '⏳'}
            {flash.kind === 'success' && '✓'}
            {flash.kind === 'error' && '✕'}
            {flash.kind === 'warning' && '⚠'}
          </span>
          <span className="admin-flash__text">{flash.text}</span>
        </div>
      )}

      <div className="study-tabs" role="tablist" aria-label="Stimulus modalities">
        {MODALITY_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`study-tab ${activeTab === tab.id ? 'study-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="study-tab-panel">
        <section className="admin-section">
          <h2 className="admin-section-title">
            {activeTab === 'text' && 'Add text stimulus'}
            {activeTab === 'image' && 'Add image stimulus'}
            {activeTab === 'video' && 'Add video stimulus'}
            {activeTab === 'audio' && 'Add audio stimulus'}
          </h2>
          <div className="admin-panel-card">
            <form className="form-stack" onSubmit={handleCreate}>
              <div className="field">
                <label htmlFor={`stim-${activeTab}-src`}>Source</label>
                <select
                  id={`stim-${activeTab}-src`}
                  value={currentForm.source_type}
                  onChange={(e) =>
                    updateForm(activeTab, { source_type: e.target.value })
                  }
                >
                  <option value="human">Human-created</option>
                  <option value="ai">AI-generated</option>
                </select>
              </div>

              {activeTab === 'text' && (
                <div className="field">
                  <label htmlFor="stim-text-content">Text content</label>
                  <textarea
                    id="stim-text-content"
                    value={currentForm.text_content}
                    onChange={(e) =>
                      updateForm('text', { text_content: e.target.value })
                    }
                    rows={3}
                    required
                    placeholder="Stimulus text shown to participants"
                  />
                </div>
              )}

              {activeTab !== 'text' && (
                <>
                  <div className="field">
                    <label htmlFor={`stim-${activeTab}-url`}>Media URL</label>
                    <input
                      id={`stim-${activeTab}-url`}
                      type="url"
                      value={currentForm.storage_key}
                      onChange={(e) =>
                        updateForm(activeTab, { storage_key: e.target.value })
                      }
                      required
                      placeholder="https://your-cdn-or-storage.example.com/path/to/object"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor={`stim-${activeTab}-model`}>
                      Source description
                    </label>
                    <input
                      id={`stim-${activeTab}-model`}
                      type="text"
                      value={currentForm.model_name}
                      onChange={(e) =>
                        updateForm(activeTab, { model_name: e.target.value })
                      }
                      required
                      placeholder="e.g. human reference set, GPT-4, DALL·E 3"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor={`stim-${activeTab}-notes`}>Notes (optional)</label>
                    <textarea
                      id={`stim-${activeTab}-notes`}
                      rows={2}
                      value={currentForm.notes}
                      onChange={(e) =>
                        updateForm(activeTab, { notes: e.target.value })
                      }
                      placeholder="Internal notes for your team"
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                disabled={flash?.kind === 'loading'}
              >
                Create stimulus
              </button>
            </form>
          </div>
        </section>

        <section className="admin-section">
          <h2 className="admin-section-title">
            {activeTab === 'text' && 'All text stimuli'}
            {activeTab === 'image' && 'All image stimuli'}
            {activeTab === 'video' && 'All video stimuli'}
            {activeTab === 'audio' && 'All audio stimuli'}
          </h2>
          {load === 'loading' && (
            <p className="dashboard-stat-muted">Loading…</p>
          )}
          {load === 'error' && (
            <p className="error-banner">Could not load stimuli.</p>
          )}
          {load === 'ok' && filteredStimuli.length === 0 && (
            <div className="empty-state">
              No {activeTab} stimuli yet. Create one above.
            </div>
          )}
          {load === 'ok' && filteredStimuli.length > 0 && (
            <ul className="stimulus-list">
              {filteredStimuli.map((s) => (
                <li key={s.id}>
                  <StimulusItemCard
                    stimulus={s}
                    onDelete={deleteStimulus}
                    deleting={deletingId === s.id}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

