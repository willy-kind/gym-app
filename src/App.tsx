import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { TabBar } from './components/TabBar'
import { UpdateToast } from './components/UpdateToast'
import { DebugOverlay } from './components/DebugOverlay'
import { RestTimerBar } from './features/session/RestTimerBar'
import { TrainPage } from './features/session/TrainPage'
import { SessionPage } from './features/session/SessionPage'
import { ProgramsPage } from './features/programs/ProgramsPage'
import { ProgramPage } from './features/programs/ProgramPage'
import { DayPage } from './features/programs/DayPage'
import { ExercisesPage } from './features/programs/ExercisesPage'
import { HistoryPage } from './features/history/HistoryPage'
import { SessionDetailPage } from './features/history/SessionDetailPage'
import { ProgressPage } from './features/progress/ProgressPage'
import { SettingsPage } from './features/settings/SettingsPage'

// Charts pull in Recharts; load them only when a chart screen is opened.
const ExerciseProgressPage = lazy(() => import('./features/progress/ExerciseProgressPage'))

export function App() {
  return (
    // Pinned to the screen edges rather than sized with 100dvh: in iOS standalone mode
    // dvh can come out a status-bar height short, leaving a band under the tab bar.
    // bg-bg: the shell paints the app background itself, so any red showing is page background outside it.
    <div className="fixed inset-0 flex flex-col bg-bg">
      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <Routes>
          <Route path="/train" element={<TrainPage />} />
          <Route path="/train/session/:sessionId" element={<SessionPage />} />
          <Route path="/programs" element={<ProgramsPage />} />
          <Route path="/programs/exercises" element={<ExercisesPage />} />
          <Route path="/programs/:programId" element={<ProgramPage />} />
          <Route path="/programs/:programId/days/:dayId" element={<DayPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/history/:sessionId" element={<SessionDetailPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route
            path="/progress/:exerciseId"
            element={
              <Suspense fallback={null}>
                <ExerciseProgressPage />
              </Suspense>
            }
          />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/train" replace />} />
        </Routes>
      </main>
      <UpdateToast />
      <RestTimerBar />
      <TabBar />
      <DebugOverlay />
    </div>
  )
}
