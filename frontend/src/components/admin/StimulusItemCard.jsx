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
    </div>
  )
}
