import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import AppLayout from '@/components/layout/AppLayout'
import LandingPage from '@/pages/LandingPage'
import DashboardPage from '@/pages/DashboardPage'
import MCQPage from '@/pages/MCQPage'
import MockTestPage from '@/pages/MockTestPage'
import DoubtSolverPage from '@/pages/DoubtSolverPage'
import AnalyticsPage from '@/pages/AnalyticsPage'
import LeaderboardPage from '@/pages/LeaderboardPage'
import StudyPlanPage from '@/pages/StudyPlanPage'
import BookmarksPage from '@/pages/BookmarksPage'
import FlashcardsPage from '@/pages/FlashcardsPage'
import AdminPage from '@/pages/AdminPage'
import BattlePage from '@/pages/BattlePage'
import { useAuthStore } from '@/store'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#FFFFFF',
            color: '#0F2044',
            border: '1px solid #E2E8F0',
            fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
            fontSize: '13px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
            borderRadius: '12px',
          },
          success: { iconTheme: { primary: '#059669', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#DC2626', secondary: '#fff' } },
        }}
      />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="practice" element={<MCQPage />} />
          <Route path="mock-test" element={<MockTestPage />} />
          <Route path="ai-tutor" element={<DoubtSolverPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="leaderboard" element={<LeaderboardPage />} />
          <Route path="study-plan" element={<StudyPlanPage />} />
          <Route path="bookmarks" element={<BookmarksPage />} />
          <Route path="flashcards" element={<FlashcardsPage />} />
          <Route path="battle" element={<BattlePage />} />
          <Route path="admin" element={<AdminPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
