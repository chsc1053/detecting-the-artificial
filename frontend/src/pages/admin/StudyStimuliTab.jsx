/**
 * File: pages/admin/StudyStimuliTab.jsx
 * Purpose: Stimuli for a study workspace — add text stimuli; more modalities later.
 * Dependencies: react, react-router-dom
 * Related: docs/features/admin-panel.md
 */

import { Link } from 'react-router-dom'

export function StudyStimuliTab() {
  return (
    <div>
      <p className="admin-page-lead">
        Stimuli are managed globally. Use the Stimuli page to create and review
        items across all studies.
      </p>
      <section className="admin-section">
        <h2 className="admin-section-title">Go to Stimuli</h2>
        <div className="admin-panel-card">
          <p className="form-message" style={{ textAlign: 'left', marginTop: 0 }}>
            Open the global Stimuli library to add text, image, video, and audio
            items that can be reused across trials and studies.
          </p>
          <Link to="/admin/stimuli" className="study-edit-btn" style={{ marginTop: '1rem' }}>
            Manage Stimuli
          </Link>
        </div>
      </section>
    </div>
  )
}
