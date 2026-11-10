import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router'
import { App } from './App'
import { db } from './db/db'
import { requestPersistentStorage } from './db/persist'
import { installViewportFix } from './components/viewportFix'
import { installAudioUnlock } from './features/session/sound'
import { getSettings } from './features/settings/settingsStore'
import './index.css'

// Opening the DB creates and seeds it from programs.md on first launch.
void db.open()
void requestPersistentStorage()
installViewportFix()
// iOS pauses page audio after locking or app switching; any tap re-enables the rest alarm.
installAudioUnlock(() => getSettings().timerSound)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
