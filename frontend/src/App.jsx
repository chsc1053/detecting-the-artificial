/**
 * File: App.jsx
 * Purpose: Root UI component for Detecting the Artificial — participant and experimenter flows will be added here or via routing.
 * Dependencies: react
 * Key: App — root component
 * Related: docs/architecture/frontend.md
 */

import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [backendStatus, setBackendStatus] = useState('checking')

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setBackendStatus(data?.success ? 'connected' : 'error'))
      .catch(() => setBackendStatus('unreachable'))
  }, [])

  return (
    <main>
      <h1>Detecting the Artificial</h1>
      <p>Human–AI detection studies — coming soon.</p>
      <p className="backend-status">Backend: {backendStatus}</p>
    </main>
  )
}

export default App
