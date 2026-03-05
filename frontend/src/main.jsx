/**
 * File: main.jsx
 * Purpose: Entry point — mounts the React app (App) into #root.
 * Dependencies: react, react-dom, App.jsx
 * Related: docs/architecture/frontend.md
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
