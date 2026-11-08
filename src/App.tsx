import { Navigate, Route, Routes } from 'react-router'
import { TabBar } from './components/TabBar'
import { UpdateToast } from './components/UpdateToast'
import { TrainPage } from './features/session/TrainPage'
import { ProgramsPage } from './features/programs/ProgramsPage'
import { HistoryPage } from './features/history/HistoryPage'
import { ProgressPage } from './features/progress/ProgressPage'

export function App() {
  return (
    <div className="flex h-dvh flex-col">
      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <Routes>
          <Route path="/train" element={<TrainPage />} />
          <Route path="/programs" element={<ProgramsPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="*" element={<Navigate to="/train" replace />} />
        </Routes>
      </main>
      <UpdateToast />
      <TabBar />
    </div>
  )
}
