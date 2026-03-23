/**
 * File: pages/participant/ParticipantStudyPage.jsx
 * Purpose: Participant flow — intro, trials, demographics, results (per product spec).
 */

import { useState, useEffect, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { StimulusView } from '../../components/participant/StimulusView.jsx'
import { AutoTextarea } from '../../components/participant/AutoTextarea.jsx'

const ANONYMITY_DISCLAIMER =
  'Your answers are used only for research in anonymized, summary form. We do not ask for your name, email, or anything that directly identifies you. Please avoid entering highly sensitive personal information.'

const DEMO_SECURITY_NOTICE =
  'Your demographics are collected only for research analysis. We do not ask for your name, email, or anything that directly identifies you. Your results are shared in summary form. Please avoid entering highly sensitive personal information.'

const DEMO_MANDATORY_WARNING =
  'To include your trial responses in the study results, please complete the demographics fields. If you skip, you can still view the feedback in the next page, but your answers won’t be counted toward the research.'

/** 1–5 scale with short verbal labels for the confidence dropdown */
const CONFIDENCE_OPTIONS = [
  { value: 1, words: 'Pure guess (no idea)' },
  { value: 2, words: 'Mostly unsure' },
  { value: 3, words: 'Somewhat confident' },
  { value: 4, words: 'Quite sure' },
  { value: 5, words: 'Very sure' },
]

export function ParticipantStudyPage() {
  const { studyId } = useParams()
  const [step, setStep] = useState('loading') // loading | intro | survey | demographics | results
  const [intro, setIntro] = useState(null)
  const [trials, setTrials] = useState([])
  const [participantId, setParticipantId] = useState(null)
  const [trialIndex, setTrialIndex] = useState(0)
  const [choice, setChoice] = useState('')
  const [confidence, setConfidence] = useState(3)
  const [explanation, setExplanation] = useState('')
  const [error, setError] = useState(null)
  const [clientLog, setClientLog] = useState([])
  const [discarded, setDiscarded] = useState(false)
  const [serverResults, setServerResults] = useState(null)
  const [demoAge, setDemoAge] = useState('')
  const [demoLocation, setDemoLocation] = useState('')
  const [demoEdu, setDemoEdu] = useState('')
  const [demoAi, setDemoAi] = useState('')

  const mandatory = intro?.demographics_mandatory === true

  const load = useCallback(async () => {
    setStep('loading')
    setError(null)
    try {
      const [ir, tr] = await Promise.all([
        fetch(`/api/participant/studies/${studyId}/intro`),
        fetch(`/api/participant/studies/${studyId}/trials`),
      ])
      const introPayload = await ir.json()
      const trialsPayload = await tr.json()
      if (!ir.ok || !introPayload?.success) {
        setError(introPayload?.error || 'Study unavailable')
        setStep('error')
        return
      }
      if (!tr.ok || !trialsPayload?.success) {
        setError(trialsPayload?.error || 'Could not load trials')
        setStep('error')
        return
      }
      setIntro(introPayload.data)
      setTrials(trialsPayload.data ?? [])
      setStep('intro')
    } catch {
      setError('Network error')
      setStep('error')
    }
  }, [studyId])

  useEffect(() => {
    load()
  }, [load])

  async function handleStart() {
    setError(null)
    if (!trials.length) {
      setError('This study has no questions yet.')
      return
    }
    try {
      const res = await fetch('/api/participant/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ study_id: studyId }),
      })
      const payload = await res.json()
      if (!res.ok || !payload?.success) {
        setError(payload?.error || 'Could not start session')
        return
      }
      setParticipantId(payload.data.id)
      setTrialIndex(0)
      setChoice('')
      setConfidence(3)
      setExplanation('')
      setClientLog([])
      setStep('survey')
    } catch {
      setError('Could not reach server')
    }
  }

  const currentTrial = trials[trialIndex]

  async function handleNextTrial() {
    if (!currentTrial || !participantId) return
    if (!choice) {
      setError('Please choose an answer before continuing.')
      return
    }
    setError(null)
    try {
      const res = await fetch('/api/participant/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant_id: participantId,
          trial_id: currentTrial.id,
          choice_label: choice,
          confidence,
          explanation: explanation.trim() || null,
        }),
      })
      const payload = await res.json()
      if (!res.ok || !payload?.success) {
        setError(payload?.error || 'Could not save answer')
        return
      }
      const correctLabel =
        currentTrial.task_type === 'forced_choice'
          ? 'ai'
          : currentTrial.stimuli.single?.source_type
      setClientLog((log) => [
        ...log,
        {
          trial_index: currentTrial.trial_index,
          task_type: currentTrial.task_type,
          choice_label: choice,
          confidence,
          explanation: explanation.trim() || null,
          is_correct: payload.data.is_correct,
          correct_label: correctLabel,
        },
      ])
      if (trialIndex + 1 >= trials.length) {
        setChoice('')
        setConfidence(3)
        setExplanation('')
        setStep('demographics')
      } else {
        setTrialIndex((i) => i + 1)
        setChoice('')
        setConfidence(3)
        setExplanation('')
      }
    } catch {
      setError('Could not reach server')
    }
  }

  function isDemographicsEmpty() {
    const ageEmpty = demoAge === '' || demoAge.trim() === ''
    const locEmpty = !demoLocation.trim()
    const eduEmpty = demoEdu === ''
    const aiEmpty = demoAi === ''
    return ageEmpty && locEmpty && eduEmpty && aiEmpty
  }

  /** All fields filled and age in range — required before Save and see results */
  function isDemographicsComplete() {
    if (demoAge === '' || demoAge.trim() === '') return false
    const ageNum = Number(demoAge)
    if (!Number.isFinite(ageNum) || ageNum < 0 || ageNum > 120) return false
    if (!demoLocation.trim()) return false
    if (demoEdu === '' || demoAi === '') return false
    return true
  }

  async function discardMandatorySession() {
    if (!participantId) return
    setError(null)
    try {
      const res = await fetch(`/api/participant/participants/${participantId}/session`, {
        method: 'DELETE',
      })
      const payload = await res.json()
      if (!res.ok || !payload?.success) {
        setError(payload?.error || 'Could not discard session')
        return
      }
      setParticipantId(null)
      setDiscarded(true)
      setServerResults(null)
      setStep('results')
    } catch {
      setError('Could not reach server')
    }
  }

  async function submitDemographics() {
    if (!participantId) return
    setError(null)

    if (!isDemographicsComplete()) {
      if (isDemographicsEmpty()) {
        setError(
          'Fill in every field to save your demographics, or use Skip demographics to continue without answering.'
        )
      } else {
        setError(
          'Please complete every field before saving, or use Skip demographics to continue without answering.'
        )
      }
      return
    }

    try {
      const res = await fetch(`/api/participant/participants/${participantId}/demographics`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          age: demoAge === '' ? null : Number(demoAge),
          approx_location: demoLocation || null,
          education_level: demoEdu || null,
          ai_literacy: demoAi || null,
        }),
      })
      const payload = await res.json()
      if (!res.ok || !payload?.success) {
        setError(payload?.error || 'Could not save demographics')
        return
      }
      await loadResults()
    } catch {
      setError('Could not reach server')
    }
  }

  async function loadResults() {
    if (!participantId) return
    try {
      const res = await fetch(`/api/participant/participants/${participantId}/results`)
      const payload = await res.json()
      if (!res.ok || !payload?.success) {
        setError(payload?.error || 'Could not load results')
        return
      }
      setServerResults(payload.data)
      setDiscarded(false)
      setStep('results')
    } catch {
      setError('Could not reach server')
    }
  }

  async function skipDemographicsOptional() {
    setError(null)
    await loadResults()
  }

  async function skipDemographicsMandatory() {
    if (!participantId) return
    if (
      !window.confirm(
        'Your answers will not be saved for research. Continue to see feedback only?'
      )
    ) {
      return
    }
    await discardMandatorySession()
  }

  if (step === 'loading' || step === 'error') {
    return (
      <div className="app-shell app-shell--public">
        <main className="public-page participant-flow">
          {step === 'loading' && <p className="participant-home-status">Loading…</p>}
          {step === 'error' && (
            <>
              <p className="participant-home-error">{error || 'Something went wrong.'}</p>
              <p>
                <Link to="/">← Home</Link>
              </p>
            </>
          )}
        </main>
      </div>
    )
  }

  if (step === 'intro' && intro) {
    const fc = intro.trial_counts?.forced_choice ?? 0
    const si = intro.trial_counts?.single_item ?? 0
    return (
      <div className="app-shell app-shell--public">
        <main className="public-page participant-flow">
          <h1 className="participant-flow-title">{intro.name}</h1>
          {intro.description && (
            <div className="participant-intro-desc">{intro.description}</div>
          )}
          <section className="participant-card" aria-labelledby="counts-heading">
            <h2 id="counts-heading" className="participant-card-title">
              What to expect
            </h2>
            <ul className="participant-counts">
              <li>
                <strong>{fc}</strong> forced-choice question{fc === 1 ? '' : 's'} (which content
                is AI-generated?)
              </li>
              <li>
                <strong>{si}</strong> single-item question{si === 1 ? '' : 's'} (is this
                AI-generated?)
              </li>
            </ul>
            <p className="participant-total">
              Total: <strong>{intro.trial_total}</strong> question
              {intro.trial_total === 1 ? '' : 's'}
            </p>
          </section>
          <section className="participant-card participant-disclaimer">
            <h2 className="participant-card-title">Privacy</h2>
            <p>{ANONYMITY_DISCLAIMER}</p>
          </section>
          {error && <p className="participant-home-error">{error}</p>}
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleStart}
            disabled={intro.trial_total === 0}
          >
            Start
          </button>
        </main>
      </div>
    )
  }

  if (step === 'survey' && currentTrial) {
    const fc = currentTrial.task_type === 'forced_choice'
    return (
      <div className="app-shell app-shell--public">
        <main className="public-page participant-flow">
          <p className="participant-progress">
            Question {trialIndex + 1} of {trials.length}
          </p>
          {fc ? (
            <>
              <p className="participant-task-prompt">
                Which content is <strong>AI-generated</strong>? (tap a card)
              </p>
              <div className="participant-fc-grid">
                <button
                  type="button"
                  className={`participant-choice-tile ${choice === 'human' ? 'participant-choice-tile--selected' : ''}`}
                  onClick={() => setChoice('human')}
                >
                  <StimulusView stimulus={currentTrial.stimuli.human} label="Option A" />
                </button>
                <button
                  type="button"
                  className={`participant-choice-tile ${choice === 'ai' ? 'participant-choice-tile--selected' : ''}`}
                  onClick={() => setChoice('ai')}
                >
                  <StimulusView stimulus={currentTrial.stimuli.ai} label="Option B" />
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="participant-task-prompt">
                Is this content <strong>AI-generated</strong>?
              </p>
              <StimulusView stimulus={currentTrial.stimuli.single} />
              <div className="participant-single-choices">
                <button
                  type="button"
                  className={`btn ${choice === 'human' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setChoice('human')}
                >
                  Human-created
                </button>
                <button
                  type="button"
                  className={`btn ${choice === 'ai' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setChoice('ai')}
                >
                  AI-generated
                </button>
              </div>
            </>
          )}
          <div className="participant-field">
            <label htmlFor="conf">How confident are you?</label>
            <select
              id="conf"
              className="participant-select"
              value={confidence}
              onChange={(e) => setConfidence(Number(e.target.value))}
              aria-describedby="conf-hint"
            >
              {CONFIDENCE_OPTIONS.map(({ value, words }) => (
                <option key={value} value={value}>
                  {value} — {words}
                </option>
              ))}
            </select>
            <p id="conf-hint" className="participant-field-hint">
              How certain are you that your answer is right?
            </p>
          </div>
          <div className="participant-field participant-field--grow">
            <label htmlFor="expl">Why do you think so? (optional)</label>
            <AutoTextarea
              id="expl"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="e.g. The wording felt more formal than I'd expect from casual human writing."
              aria-label="Optional explanation for your answer"
            />
          </div>
          {error && <p className="participant-home-error">{error}</p>}
          <button type="button" className="btn btn-primary" onClick={handleNextTrial}>
            {trialIndex + 1 >= trials.length ? 'Continue' : 'Next'}
          </button>
        </main>
      </div>
    )
  }

  if (step === 'demographics' && intro) {
    return (
      <div className="app-shell app-shell--public">
        <main className="public-page participant-flow participant-demographics">
          <h1 className="participant-flow-title">About you</h1>
          <section className="participant-card participant-card--notice">
            <p className="participant-card-lead">{DEMO_SECURITY_NOTICE}</p>
            {mandatory && (
              <div className="participant-warning" role="alert">
                <p>{DEMO_MANDATORY_WARNING}</p>
              </div>
            )}
          </section>
          <div className="participant-demographics-fields">
            <div className="participant-field">
              <label htmlFor="age">
                Age <span className="participant-required-mark">*</span>
              </label>
              <input
                id="age"
                className="participant-input"
                type="number"
                min={0}
                max={120}
                inputMode="numeric"
                placeholder="e.g. 24"
                value={demoAge}
                onChange={(e) => setDemoAge(e.target.value)}
              />
            </div>
            <div className="participant-field">
              <label htmlFor="loc">
                Approximate location (e.g. country or region){' '}
                <span className="participant-required-mark">*</span>
              </label>
              <input
                id="loc"
                className="participant-input"
                type="text"
                autoComplete="country-name"
                placeholder="e.g. United Kingdom"
                value={demoLocation}
                onChange={(e) => setDemoLocation(e.target.value)}
              />
            </div>
            <div className="participant-field">
              <label htmlFor="edu">
                Education level <span className="participant-required-mark">*</span>
              </label>
              <select
                id="edu"
                className="participant-select"
                value={demoEdu}
                onChange={(e) => setDemoEdu(e.target.value)}
              >
                <option value="">Select…</option>
                <option value="high_school">High school</option>
                <option value="bachelor">Bachelor</option>
                <option value="master">Master</option>
                <option value="phd">PhD</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="participant-field">
              <label htmlFor="ailit">
                AI literacy <span className="participant-required-mark">*</span>
              </label>
              <select
                id="ailit"
                className="participant-select"
                value={demoAi}
                onChange={(e) => setDemoAi(e.target.value)}
              >
                <option value="">Select…</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          {error && <p className="participant-home-error">{error}</p>}
          <p className="participant-field-hint participant-demographics-save-hint" aria-live="polite">
            {isDemographicsComplete()
              ? 'All fields are filled — you can save and see your results.'
              : 'Fill every field to enable Save, or use Skip demographics to continue without answering.'}
          </p>
          <div className="participant-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={submitDemographics}
              disabled={!isDemographicsComplete()}
            >
              Save and see results
            </button>
            {!mandatory && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={skipDemographicsOptional}
              >
                Skip demographics and see results
              </button>
            )}
            {mandatory && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={skipDemographicsMandatory}
              >
                Skip demographics — see results only (not counted for research)
              </button>
            )}
          </div>
        </main>
      </div>
    )
  }

  if (step === 'results') {
    const data = discarded
      ? {
          trials: clientLog.map((t) => ({
            trial_index: t.trial_index,
            task_type: t.task_type,
            choice_label: t.choice_label,
            confidence: t.confidence,
            explanation: t.explanation,
            is_correct: t.is_correct,
            correct_label: t.correct_label,
          })),
          summary: {
            total: clientLog.length,
            correct: clientLog.filter((t) => t.is_correct).length,
            accuracy_pct: clientLog.length
              ? Math.round(
                  (100 * clientLog.filter((t) => t.is_correct).length) / clientLog.length
                )
              : 0,
            avg_confidence:
              clientLog.length > 0
                ? clientLog.reduce((s, t) => s + t.confidence, 0) / clientLog.length
                : null,
          },
        }
      : serverResults

    return (
      <div className="app-shell app-shell--public">
        <main className="public-page participant-flow">
          <h1 className="participant-flow-title">Your results</h1>
          {discarded && (
            <div className="participant-warning" role="status">
              <p>
                Your trial answers were not saved for research because required demographics
                were skipped. Informal feedback below is for your eyes only.
              </p>
            </div>
          )}
          {data && (
            <>
              <section className="participant-card" aria-labelledby="sum-heading">
                <h2 id="sum-heading" className="participant-card-title">
                  Summary
                </h2>
                <ul className="participant-summary-stats">
                  <li>
                    Accuracy: <strong>{data.summary.accuracy_pct}%</strong> (
                    {data.summary.correct} / {data.summary.total} correct)
                  </li>
                  {data.summary.avg_confidence != null && (
                    <li>
                      Avg. confidence:{' '}
                      <strong>{data.summary.avg_confidence.toFixed(1)}</strong> / 5
                    </li>
                  )}
                </ul>
              </section>
              <section className="participant-card" aria-labelledby="det-heading">
                <h2 id="det-heading" className="participant-card-title">
                  Per question
                </h2>
                <ol className="participant-results-list">
                  {data.trials.map((t, i) => (
                    <li key={`${t.trial_index}-${i}`}>
                      <div className="participant-result-row">
                        <span className="participant-result-idx">Trial {t.trial_index}</span>
                        <span
                          className={
                            t.is_correct ? 'participant-result-ok' : 'participant-result-bad'
                          }
                        >
                          {t.is_correct ? 'Correct' : 'Incorrect'}
                        </span>
                        <span className="participant-result-meta">
                          Your answer: <code>{t.choice_label}</code> · Correct:{' '}
                          <code>{t.correct_label}</code>
                        </span>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            </>
          )}
          <p>
            <Link to="/">← Back to home</Link>
          </p>
        </main>
      </div>
    )
  }

  return null
}
