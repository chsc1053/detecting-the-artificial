/**
 * File: pages/admin/StudyTrialsTab.jsx
 * Purpose: Add and list trials (stimuli created on Stimuli tab).
 * Dependencies: react, react-router-dom
 */

import { useState, useEffect, useMemo } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { StimulusItemCard } from '../../components/admin/StimulusItemCard.jsx'

function authHeaders() {
  const t = localStorage.getItem('adminToken')
  return t ? { Authorization: `Bearer ${t}` } : {}
}

function stimulusLabel(s) {
  const preview = (s.text_content || s.modality || '').slice(0, 48)
  return `${s.id} · ${s.source_type} · ${preview}${preview.length >= 48 ? '…' : ''}`
}

export function StudyTrialsTab() {
  const { study } = useOutletContext()
  const [trials, setTrials] = useState([])
  const [stimuli, setStimuli] = useState([])
  const [load, setLoad] = useState('loading')
  const [taskType, setTaskType] = useState('forced_choice')
  const [humanId, setHumanId] = useState('')
  const [aiId, setAiId] = useState('')
  const [singleId, setSingleId] = useState('')
  const [trialMsg, setTrialMsg] = useState('')

  async function loadAll() {
    setLoad('loading')
    try {
      const [tr, st] = await Promise.all([
        fetch(`/api/admin/studies/${study.id}/trials`, {
          headers: { ...authHeaders() },
        }),
        fetch('/api/admin/stimuli', { headers: { ...authHeaders() } }),
      ])
      const trP = await tr.json()
      const stP = await st.json()
      if (tr.ok && trP?.success) setTrials(trP.data ?? [])
      else setTrials([])
      if (st.ok && stP?.success) setStimuli(stP.data ?? [])
      else setStimuli([])
      setLoad('ok')
    } catch {
      setLoad('error')
    }
  }

  useEffect(() => {
    loadAll()
  }, [study.id])

  async function addTrial(e) {
    e.preventDefault()
    setTrialMsg('Adding…')
    const body =
      taskType === 'forced_choice'
        ? {
            task_type: 'forced_choice',
            human_stimulus_id: humanId,
            ai_stimulus_id: aiId,
          }
        : {
            task_type: 'single_item',
            single_stimulus_id: singleId,
          }
    try {
      const res = await fetch(`/api/admin/studies/${study.id}/trials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify(body),
      })
      const payload = await res.json()
      if (!res.ok || !payload?.success) {
        setTrialMsg(payload?.error || 'Failed')
        return
      }
      setTrialMsg('Trial added.')
      setHumanId('')
      setAiId('')
      setSingleId('')
      await loadAll()
    } catch {
      setTrialMsg('Network error')
    }
  }

  const textStimuli = stimuli.filter((s) => s.modality === 'text')

  const stimuliById = useMemo(() => {
    const m = new Map()
    for (const s of stimuli) {
      m.set(s.id, s)
    }
    return m
  }, [stimuli])

  return (
    <div>
      <p className="admin-page-lead">
        Build trials from stimuli you added on the{' '}
        <Link to={`/admin/studies/${study.id}/stimuli`}>Stimuli</Link> tab. Order
        follows trial index (next index is assigned automatically).
      </p>

      <section className="admin-section">
        <h2 className="admin-section-title">Add trial</h2>
        <div className="admin-panel-card">
          <form className="form-stack" onSubmit={addTrial}>
            <div className="field">
              <label htmlFor="trial-type">Task type</label>
              <select
                id="trial-type"
                value={taskType}
                onChange={(e) => setTaskType(e.target.value)}
              >
                <option value="forced_choice">Forced choice (which is AI?)</option>
                <option value="single_item">Single item (is this AI?)</option>
              </select>
            </div>

            {taskType === 'forced_choice' && (
              <>
                <div className="field">
                  <label htmlFor="trial-human">Human stimulus</label>
                  <select
                    id="trial-human"
                    value={humanId}
                    onChange={(e) => setHumanId(e.target.value)}
                    required
                  >
                    <option value="">Select…</option>
                    {textStimuli
                      .filter((s) => s.source_type === 'human')
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {stimulusLabel(s)}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="trial-ai">AI stimulus</label>
                  <select
                    id="trial-ai"
                    value={aiId}
                    onChange={(e) => setAiId(e.target.value)}
                    required
                  >
                    <option value="">Select…</option>
                    {textStimuli
                      .filter((s) => s.source_type === 'ai')
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {stimulusLabel(s)}
                        </option>
                      ))}
                  </select>
                </div>
              </>
            )}

            {taskType === 'single_item' && (
              <div className="field">
                <label htmlFor="trial-single">Stimulus</label>
                <select
                  id="trial-single"
                  value={singleId}
                  onChange={(e) => setSingleId(e.target.value)}
                  required
                >
                  <option value="">Select…</option>
                  {textStimuli.map((s) => (
                    <option key={s.id} value={s.id}>
                      {stimulusLabel(s)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button type="submit" className="btn btn-primary">
              Add trial
            </button>
          </form>
          {trialMsg && <p className="form-message">{trialMsg}</p>}
        </div>
      </section>

      <section className="admin-section">
        <h2 className="admin-section-title">Trials in this study</h2>
        {load === 'loading' && <p className="dashboard-stat-muted">Loading…</p>}
        {load === 'error' && (
          <p className="error-banner">Could not load trials.</p>
        )}
        {load === 'ok' && trials.length === 0 && (
          <div className="empty-state">No trials yet.</div>
        )}
        {load === 'ok' && trials.length > 0 && (
          <ul className="trial-list">
            {trials.map((t) => {
              const human = t.human_stimulus_id
                ? stimuliById.get(t.human_stimulus_id)
                : null
              const ai = t.ai_stimulus_id ? stimuliById.get(t.ai_stimulus_id) : null
              const single = t.single_stimulus_id
                ? stimuliById.get(t.single_stimulus_id)
                : null
              return (
                <li key={t.id} className="trial-item">
                  <div className="trial-item-header">
                    <span className="trial-index">#{t.trial_index}</span>
                    <span className="trial-type">{t.task_type}</span>
                    <code className="ref-id ref-id--inline">{t.id}</code>
                  </div>
                  {t.task_type === 'forced_choice' && (
                    <div className="trial-item-stimuli trial-stimuli-row">
                      <StimulusItemCard
                        stimulus={human}
                        missingId={t.human_stimulus_id}
                      />
                      <StimulusItemCard
                        stimulus={ai}
                        missingId={t.ai_stimulus_id}
                      />
                    </div>
                  )}
                  {t.task_type === 'single_item' && (
                    <div className="trial-item-stimuli trial-stimuli-row trial-stimuli-row--single">
                      <StimulusItemCard
                        stimulus={single}
                        missingId={t.single_stimulus_id}
                      />
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
