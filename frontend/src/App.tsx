import { Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { useAuthStore } from '@/store/auth-store'
import { useRecruiterStore } from '@/store/recruiter-store'
import { useEffect } from 'react'

// Layouts
import MainLayout from '@/components/layout/main-layout'
import DashboardLayout from '@/components/layout/dashboard-layout'

// Pages
import Landing from '@/pages/landing'
import Dashboard from '@/pages/dashboard'
import Projects from '@/pages/projects'
import ProjectDetail from '@/pages/project-detail'
import Profile from '@/pages/profile'
import Settings from '@/pages/settings'
import Jobs from '@/pages/jobs'
import JobDetail from '@/pages/job-detail'
import Applications from '@/pages/applications'
import PublicProfile from '@/pages/public-profile'
import AuthCallback from '@/pages/auth-callback'
import AuthError from '@/pages/auth-error'
import NotFound from '@/pages/not-found'
import Onboarding from '@/pages/onboarding'

// Recruiter Pages
import RecruiterLogin from '@/pages/recruiter/login'
import RecruiterDashboard from '@/pages/recruiter/dashboard'

// Protected Route
import ProtectedRoute from '@/components/auth/protected-route'
import RecruiterProtectedRoute from '@/components/auth/recruiter-protected-route'

function App() {
  const { checkAuth, isLoading } = useAuthStore()
  const { checkAuth: checkRecruiterAuth } = useRecruiterStore()

  useEffect(() => {
    checkAuth()
    checkRecruiterAuth()
  }, [checkAuth, checkRecruiterAuth])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <>
      <Routes>
        {/* Public Routes */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/u/:username" element={<PublicProfile />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/auth/error" element={<AuthError />} />
        </Route>

        {/* Recruiter Routes */}
        <Route path="/recruiter/login" element={<RecruiterLogin />} />
        <Route
          path="/recruiter/dashboard"
          element={
            <RecruiterProtectedRoute>
              <RecruiterDashboard />
            </RecruiterProtectedRoute>
          }
        />
        <Route
          path="/recruiter/candidate/:id"
          element={
            <RecruiterProtectedRoute>
              <RecruiterDashboard />
            </RecruiterProtectedRoute>
          }
        />

        {/* Onboarding Route */}
        <Route 
          path="/onboarding" 
          element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          } 
        />

        {/* Protected Routes */}
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/jobs/:id" element={<JobDetail />} />
          <Route path="/applications" element={<Applications />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
    </>
  )
}

export default App

