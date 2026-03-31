/**
 * File: components/admin/StimulusItemCard.jsx
 * Purpose: Shared stimulus presentation — badges, full ID, text — for list and trial embeds.
 */

export function StimulusItemCard({ stimulus, missingId }) {
  if (!stimulus) {
    return (
      <div className="stimulus-item stimulus-item--missing">
        <div className="stimulus-item-meta">
          <span className="study-badge study-badge--off">—</span>
          {missingId ? (
            <code className="ref-id ref-id--inline">{missingId}</code>
          ) : null}
        </div>
        <p className="stimulus-item-text stimulus-item-text--muted">
          Stimulus not found in library (reload Stimuli or check ID).
        </p>
      </div>
    )
  }

  return (
    <div className="stimulus-item stimulus-item--card">
      <div className="stimulus-item-meta">
        <span className="study-badge study-badge--off">{stimulus.modality}</span>
        <span className="study-badge study-badge--on">{stimulus.source_type}</span>
        <code className="ref-id ref-id--inline">{stimulus.id}</code>
      </div>
      {stimulus.text_content ? (
        <p className="stimulus-item-text">{stimulus.text_content}</p>
      ) : null}
      {!stimulus.text_content && stimulus.storage_key ? (
        <div className="stimulus-item-body">
          <div className="stimulus-item-main">
            {stimulus.modality === 'image' && (
              <img
                src={stimulus.storage_key}
                alt={`Stimulus ${stimulus.id}`}
                className="stimulus-media stimulus-media--image"
                loading="lazy"
              />
            )}
            {stimulus.modality === 'video' && (
              <video
                src={stimulus.storage_key}
                controls
                preload="metadata"
                className="stimulus-media stimulus-media--video"
              />
            )}
            {stimulus.modality === 'audio' && (
              <audio
                src={stimulus.storage_key}
                controls
                preload="metadata"
                className="stimulus-media stimulus-media--audio"
              />
            )}
          </div>
          <aside className="stimulus-item-side">
            <p className="stimulus-item-side-title">Source description</p>
            <p className="stimulus-item-text">
              {stimulus.model_name || '—'}
            </p>
            {stimulus.notes ? (
              <>
                <p className="stimulus-item-side-title stimulus-item-side-title--notes">
                  Notes
                </p>
                <p className="stimulus-item-text stimulus-item-text--muted">
                  {stimulus.notes}
                </p>
              </>
            ) : null}
          </aside>
        </div>
      ) : null}
    </div>
  )
}
