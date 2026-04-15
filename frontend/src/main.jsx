/**
 * File: main.jsx
 * Purpose: Entry point — mounts the React app (App) into #root.
 * Dependencies: react, react-dom, react-router-dom, App.jsx
 * Related: docs/architecture/frontend.md
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
