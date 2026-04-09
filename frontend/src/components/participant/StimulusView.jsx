/**
 * File: components/participant/StimulusView.jsx
 * Purpose: Render a stimulus by modality (text, image, video, audio) for participant tasks.
 */

import { useCallback, useRef } from 'react'

export function StimulusView({ stimulus, label }) {
  const mediaStageRef = useRef(null)
  const openImageFullscreen = useCallback(() => {
    requestFullscreen(mediaStageRef.current)
  }, [])

  const onFullscreenControlClick = useCallback(
    (e) => {
      e.preventDefault()
      e.stopPropagation()
      openImageFullscreen()
    },
    [openImageFullscreen]
  )

  const onFullscreenControlKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        e.stopPropagation()
        openImageFullscreen()
      }
    },
    [openImageFullscreen]
  )

  if (!stimulus) {
    return (
      <div className="stimulus-view stimulus-view--empty">
        <p>Stimulus unavailable.</p>
      </div>
    )
  }

  const { modality, text_content: textContent, storage_key: storageKey } = stimulus
  const title = label ? (
    <span className="stimulus-view-label">{label}</span>
  ) : null

  if (modality === 'text') {
    return (
      <div className="stimulus-view stimulus-view--text">
        {title}
        <div className="stimulus-view-body">{textContent || '—'}</div>
      </div>
    )
  }

  const mediaSrc = resolveMediaSrc(storageKey)
  const hasMedia = Boolean(mediaSrc)

  if (modality === 'image') {
    return (
      <div className="stimulus-view stimulus-view--image">
        {title}
        <div className="stimulus-view-body">
          {hasMedia ? (
            <div className="stimulus-view-media-stage" ref={mediaStageRef}>
              <img src={mediaSrc} alt="" className="stimulus-view-media" />
              <span
                role="button"
                tabIndex={0}
                className="stimulus-view-fullscreen-btn"
                data-tooltip="View image fullscreen"
                onClick={onFullscreenControlClick}
                onKeyDown={onFullscreenControlKeyDown}
                aria-label="Open image in fullscreen"
              >
                ⛶
              </span>
            </div>
          ) : (
            <p className="stimulus-view-placeholder">
              Image stimulus — connect media storage to show a preview here.
            </p>
          )}
        </div>
      </div>
    )
  }

  if (modality === 'video') {
    return (
      <div className="stimulus-view stimulus-view--video">
        {title}
        <div className="stimulus-view-body">
          {hasMedia ? (
            <div className="stimulus-view-media-stage">
              <video
                controls
                preload="metadata"
                className="stimulus-view-media"
                src={mediaSrc}
              />
            </div>
          ) : (
            <p className="stimulus-view-placeholder">
              Video stimulus — connect media storage to embed playback here.
            </p>
          )}
        </div>
      </div>
    )
  }

  if (modality === 'audio') {
    return (
      <div className="stimulus-view stimulus-view--audio">
        {title}
        <div className="stimulus-view-body">
          {hasMedia ? (
            <div className="stimulus-view-media-stage stimulus-view-media-stage--audio">
              <audio
                controls
                preload="metadata"
                className="stimulus-view-media stimulus-view-media--audio"
                src={mediaSrc}
              />
            </div>
          ) : (
            <p className="stimulus-view-placeholder">
              Audio stimulus — connect media storage to embed playback here.
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="stimulus-view">
      {title}
      <p className="stimulus-view-placeholder">Unsupported modality: {modality}</p>
    </div>
  )
}

function resolveMediaSrc(storageKey) {
  if (!storageKey) return null
  const raw = String(storageKey).trim()
  if (!raw) return null
  if (/^(https?:\/\/|blob:|data:)/i.test(raw)) return raw
  if (raw.startsWith('/')) return raw
  return null
}

function requestFullscreen(el) {
  if (!el || typeof el.requestFullscreen !== 'function') return
  el.requestFullscreen().catch(() => {})
}
