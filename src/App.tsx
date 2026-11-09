import { Navigate, Route, Routes } from 'react-router'
import { TabBar } from './components/TabBar'
import { UpdateToast } from './components/UpdateToast'
import { RestTimerBar } from './features/session/RestTimerBar'
import { TrainPage } from './features/session/TrainPage'
import { SessionPage } from './features/session/SessionPage'
import { ProgramsPage } from './features/programs/ProgramsPage'
import { ProgramPage } from './features/programs/ProgramPage'
import { DayPage } from './features/programs/DayPage'
import { ExercisesPage } from './features/programs/ExercisesPage'
import { HistoryPage } from './features/history/HistoryPage'
import { ProgressPage } from './features/progress/ProgressPage'

export function App() {
  return (
    <div className="flex h-dvh flex-col">
      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <Routes>
          <Route path="/train" element={<TrainPage />} />
          <Route path="/train/session/:sessionId" element={<SessionPage />} />
          <Route path="/programs" element={<ProgramsPage />} />
          <Route path="/programs/exercises" element={<ExercisesPage />} />
          <Route path="/programs/:programId" element={<ProgramPage />} />
          <Route path="/programs/:programId/days/:dayId" element={<DayPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="*" element={<Navigate to="/train" replace />} />
        </Routes>
      </main>
      <UpdateToast />
      <RestTimerBar />
      <TabBar />
    </div>
  )
}
