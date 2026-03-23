/**
 * File: components/participant/StimulusView.jsx
 * Purpose: Render a stimulus by modality (text, image, video, audio) for participant tasks.
 */

export function StimulusView({ stimulus, label }) {
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

  const isUrl = storageKey && /^https?:\/\//i.test(storageKey)

  if (modality === 'image') {
    return (
      <div className="stimulus-view stimulus-view--image">
        {title}
        <div className="stimulus-view-body">
          {isUrl ? (
            <img src={storageKey} alt="" className="stimulus-view-media" />
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
          {isUrl ? (
            <video controls className="stimulus-view-media" src={storageKey} />
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
          {isUrl ? (
            <audio controls className="stimulus-view-media" src={storageKey} />
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
