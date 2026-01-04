import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { AlertCircle, Home, RefreshCw } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'

export default function AuthError() {
  const [searchParams] = useSearchParams()
  const { login } = useAuthStore()
  const message = searchParams.get('message') || 'An error occurred during authentication'

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-md px-4">
        <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Authentication Failed</h1>
        <p className="text-muted-foreground mb-6">
          {message}
        </p>
        <div className="flex gap-4 justify-center">
          <Button variant="outline" onClick={login}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          <Button asChild>
            <Link to="/">
              <Home className="h-4 w-4 mr-2" />
              Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
