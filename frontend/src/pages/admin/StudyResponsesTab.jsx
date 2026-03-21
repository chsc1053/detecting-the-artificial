/**
 * File: pages/admin/StudyResponsesTab.jsx
 * Purpose: Study workspace — participant responses (placeholder until API exists).
 * Dependencies: react, react-router-dom
 * Related: docs/features/admin-panel.md
 */

import { useOutletContext } from 'react-router-dom'

export function StudyResponsesTab() {
  const { study } = useOutletContext()

  return (
    <div>
      <p className="admin-page-lead">
        View and filter participant responses for <strong>{study.name}</strong>. This
        area will list submissions, trial-level choices, and timing once the
        responses API and participant flow are connected.
      </p>
      <div className="admin-panel-card placeholder-panel">
        <p className="placeholder-panel-text">
          Responses for this study will appear here — table, filters, and export
          actions are not implemented yet.
        </p>
      </div>
    </div>
  )
}
