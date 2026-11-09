import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router'
import { App } from './App'
import { db } from './db/db'
import { requestPersistentStorage } from './db/persist'
import { installViewportFix } from './components/viewportFix'
import './index.css'

// Opening the DB creates and seeds it from programs.md on first launch.
void db.open()
void requestPersistentStorage()
installViewportFix()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
