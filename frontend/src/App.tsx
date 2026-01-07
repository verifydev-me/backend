import { Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { useAuthStore } from '@/store/auth-store'
import { useRecruiterStore } from '@/store/recruiter-store'
import { useUIStore } from '@/store/ui-store'
import { useEffect, lazy, Suspense } from 'react'

// Layouts
import MainLayout from '@/components/layout/main-layout'
import DashboardLayout from '@/components/layout/dashboard-layout'
import RecruiterLayout from '@/components/layout/recruiter-layout'

// Pages
import Landing from '@/pages/landing'
import Dashboard from '@/pages/dashboard'
import Projects from '@/pages/projects'
import ProjectDetail from '@/pages/project-detail'
import Profile from '@/pages/profile'
import Resume from '@/pages/resume'
import Settings from '@/pages/settings'
import PrivacySettings from '@/pages/privacy-settings'
import Jobs from '@/pages/jobs'
import JobDetail from '@/pages/job-detail'
import Applications from '@/pages/applications'
import Notifications from '@/pages/notifications'
import PublicProfile from '@/pages/public-profile'
import AuthCallback from '@/pages/auth-callback'
import AuthError from '@/pages/auth-error'
import NotFound from '@/pages/not-found'
import Onboarding from '@/pages/onboarding'
import Login from '@/pages/login'

// Recruiter Pages

import RecruiterLogin from '@/pages/recruiter/login'
import RecruiterDashboard from '@/pages/recruiter/dashboard'

// Lazy-loaded Recruiter Pages
const RecruiterRegister = lazy(() => import('@/pages/recruiter/register'))
const RecruiterCandidates = lazy(() => import('@/pages/recruiter/candidates'))
const RecruiterCandidateProfile = lazy(() => import('@/pages/recruiter/candidate-profile'))
const RecruiterPostJob = lazy(() => import('@/pages/recruiter/post-job'))
const RecruiterApplicants = lazy(() => import('@/pages/recruiter/applicants'))
const RecruiterJobs = lazy(() => import('@/pages/recruiter/jobs'))

// Protected Route
import ProtectedRoute from '@/components/auth/protected-route'
import RecruiterProtectedRoute from '@/components/auth/recruiter-protected-route'

// Loading component for lazy routes
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
)

function App() {
  const { checkAuth, isLoading } = useAuthStore()
  const { checkAuth: checkRecruiterAuth } = useRecruiterStore()
  const { theme, accentColor } = useUIStore()

  useEffect(() => {
    checkAuth()
    checkRecruiterAuth()
  }, [checkAuth, checkRecruiterAuth])

  // Initialize UI preferences
  useEffect(() => {
    // Theme
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }

    // Accent Color
    if (accentColor) {
      document.documentElement.style.setProperty('--primary', accentColor)
      document.documentElement.style.setProperty('--ring', accentColor)
    }
  }, [theme, accentColor])

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

        {/* Developer Login Route (No layout) */}
        <Route path="/login" element={<Login />} />

        {/* Recruiter Auth Routes (No layout) */}

        <Route path="/recruiter/login" element={<RecruiterLogin />} />
        <Route path="/recruiter/register" element={
          <Suspense fallback={<PageLoader />}>
            <RecruiterRegister />
          </Suspense>
        } />

        {/* Recruiter Protected Routes (With sidebar layout) */}
        <Route
          element={
            <RecruiterProtectedRoute>
              <RecruiterLayout />
            </RecruiterProtectedRoute>
          }
        >
          <Route path="/recruiter/dashboard" element={<RecruiterDashboard />} />
          <Route path="/recruiter/candidates" element={
            <Suspense fallback={<PageLoader />}>
              <RecruiterCandidates />
            </Suspense>
          } />
          <Route path="/recruiter/candidates/:userId" element={
            <Suspense fallback={<PageLoader />}>
              <RecruiterCandidateProfile />
            </Suspense>
          } />
          <Route path="/recruiter/candidate/:userId" element={
            <Suspense fallback={<PageLoader />}>
              <RecruiterCandidateProfile />
            </Suspense>
          } />
          <Route path="/recruiter/post-job" element={
            <Suspense fallback={<PageLoader />}>
              <RecruiterPostJob />
            </Suspense>
          } />
          <Route path="/recruiter/jobs" element={
            <Suspense fallback={<PageLoader />}>
              <RecruiterJobs />
            </Suspense>
          } />
          <Route path="/recruiter/jobs/:jobId/applicants" element={
            <Suspense fallback={<PageLoader />}>
              <RecruiterApplicants />
            </Suspense>
          } />
          <Route path="/recruiter/settings" element={<Settings />} />
          <Route path="/recruiter/settings/privacy" element={<PrivacySettings />} />
        </Route>

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
          <Route path="/resume" element={<Resume />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/privacy" element={<PrivacySettings />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/jobs/:id" element={<JobDetail />} />
          <Route path="/applications" element={<Applications />} />
          <Route path="/notifications" element={<Notifications />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
    </>
  )
}

export default App

