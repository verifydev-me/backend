import { Navigate } from 'react-router-dom'
import { useRecruiterStore } from '@/store/recruiter-store'
import { Loader2 } from 'lucide-react'

interface RecruiterProtectedRouteProps {
  children: React.ReactNode
}

export default function RecruiterProtectedRoute({ children }: RecruiterProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useRecruiterStore()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/recruiter/login" replace />
  }

  return <>{children}</>
}
