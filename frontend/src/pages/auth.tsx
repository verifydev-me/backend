/**
 * Unified Auth Page - Developer & Recruiter Login/Signup
 * Single entry point for authentication with role-based tabs
 */
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Mail, 
  ArrowLeft, 
  Github, 
  Loader2, 
  Code2, 
  Check,
  Building,
  Lock,
  User,
  Globe,
  Briefcase,
  AlertCircle,
  ArrowRight
} from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { useRecruiterStore } from '@/store/recruiter-store'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type AuthStep = 'email' | 'otp'
type AuthMode = 'login' | 'signup'
type UserRole = 'developer' | 'recruiter'

// Google Icon SVG
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
)

// LinkedIn Icon SVG
const LinkedInIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#0A66C2">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
)

export default function AuthPage() {
  const navigate = useNavigate()
  const { login: devLogin, setTokens, checkAuth } = useAuthStore()
  const { login: recruiterLogin, register: recruiterRegister, isLoading: recruiterLoading, error: recruiterError, clearError } = useRecruiterStore()

  // State
  const [role, setRole] = useState<UserRole>('developer')
  const [step, setStep] = useState<AuthStep>('email')
  const [mode, setMode] = useState<AuthMode>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Developer form
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')

  // Recruiter form
  const [recruiterForm, setRecruiterForm] = useState({
    email: '',
    password: '',
    name: '',
    company: '',
    companyWebsite: '',
    position: ''
  })

  const API_URL = import.meta.env.VITE_GATEWAY_URL || 'http://localhost'

  // Handle role switch
  const handleRoleSwitch = (newRole: UserRole) => {
    setRole(newRole)
    setStep('email')
    setMode('login')
    setError('')
    setSuccess('')
    clearError()
  }

  // Developer: Request OTP
  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (!email || !email.includes('@')) {
        setError('Please enter a valid email address')
        setLoading(false)
        return
      }

      const response = await fetch(`${API_URL}/api/v1/auth/otp/request-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type: mode }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send OTP')
      }

      setSuccess('OTP sent! Check your email (Dev mode: use 123456)')
      setStep('otp')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  // Developer: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!otp || otp.length !== 6) {
        setError('Please enter a valid 6-digit OTP')
        setLoading(false)
        return
      }

      const response = await fetch(`${API_URL}/api/v1/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, type: mode }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Invalid OTP')
      }

      setTokens(data.accessToken, data.refreshToken)
      await checkAuth()

      if (mode === 'signup') {
        navigate('/connect-platforms')
      } else {
        navigate('/dashboard')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify OTP')
    } finally {
      setLoading(false)
    }
  }

  // Developer: OAuth handlers
  const handleGitHubLogin = () => {
    devLogin()
  }

  const handleGoogleLogin = () => {
    setError('Google login coming soon!')
  }

  const handleLinkedInLogin = () => {
    setError('LinkedIn login coming soon!')
  }

  // Recruiter: Form submit
  const handleRecruiterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    
    try {
      if (mode === 'login') {
        await recruiterLogin(recruiterForm.email, recruiterForm.password)
      } else {
        await recruiterRegister(recruiterForm)
      }
      navigate('/recruiter/dashboard')
    } catch {
      // Error handled by store
    }
  }

  const handleRecruiterInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRecruiterForm(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const currentLoading = role === 'developer' ? loading : recruiterLoading
  const currentError = role === 'developer' ? error : recruiterError

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full blur-[120px] bg-primary/10" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full blur-[100px] bg-primary/5" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary">
              <Code2 className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-foreground">VerifyDev</span>
          </Link>
        </div>

        {/* Main Card */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
          {/* Role Switcher - TOP TABS */}
          <div className="flex gap-2 p-1 bg-muted rounded-lg mb-6">
            <button
              onClick={() => handleRoleSwitch('developer')}
              className={cn(
                'flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2',
                role === 'developer' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Code2 className="w-4 h-4" />
              Developer
            </button>
            <button
              onClick={() => handleRoleSwitch('recruiter')}
              className={cn(
                'flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2',
                role === 'recruiter' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Building className="w-4 h-4" />
              Recruiter
            </button>
          </div>

          {/* Content based on role */}
          <AnimatePresence mode="wait">
            {role === 'developer' ? (
              <motion.div
                key="developer"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                {/* Sign In / Sign Up Tabs */}
                <div className="flex gap-2 p-1 bg-muted/50 rounded-lg mb-6">
                  <button
                    onClick={() => { setMode('login'); setStep('email'); setError(''); setSuccess(''); }}
                    className={cn(
                      'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all',
                      mode === 'login' 
                        ? 'bg-background text-foreground shadow-sm' 
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => { setMode('signup'); setStep('email'); setError(''); setSuccess(''); }}
                    className={cn(
                      'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all',
                      mode === 'signup' 
                        ? 'bg-background text-foreground shadow-sm' 
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Sign Up
                  </button>
                </div>

                <h2 className="text-2xl font-bold text-foreground mb-2">
                  {mode === 'login' ? 'Welcome back!' : 'Create your account'}
                </h2>
                <p className="text-muted-foreground mb-6">
                  {mode === 'login' 
                    ? 'Sign in to access your developer profile'
                    : 'Join VerifyDev and showcase your verified skills'}
                </p>

                {/* OAuth Buttons */}
                <div className="space-y-3 mb-6">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11 gap-3"
                    onClick={handleGitHubLogin}
                  >
                    <Github className="w-5 h-5" />
                    Continue with GitHub
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11 gap-3"
                    onClick={handleGoogleLogin}
                  >
                    <GoogleIcon />
                    Continue with Google
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11 gap-3"
                    onClick={handleLinkedInLogin}
                  >
                    <LinkedInIcon />
                    Continue with LinkedIn
                  </Button>
                </div>

                {/* Divider */}
                <div className="relative flex items-center my-6">
                  <div className="flex-grow border-t border-border"></div>
                  <span className="px-3 text-xs text-muted-foreground uppercase">or continue with email</span>
                  <div className="flex-grow border-t border-border"></div>
                </div>

                {/* Email OTP Form */}
                {step === 'email' ? (
                  <form onSubmit={handleRequestOtp} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none transition text-foreground placeholder:text-muted-foreground"
                          required
                        />
                      </div>
                    </div>

                    {currentError && (
                      <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
                        {currentError}
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full h-11"
                      disabled={currentLoading}
                    >
                      {currentLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>Send OTP</>
                      )}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <button
                      type="button"
                      onClick={() => { setStep('email'); setOtp(''); setError(''); }}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Change email
                    </button>

                    <div className="p-3 bg-muted rounded-lg flex items-center gap-3">
                      <Mail className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">OTP sent to</p>
                        <p className="text-sm font-medium text-foreground">{email}</p>
                      </div>
                    </div>

                    {success && (
                      <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-600 dark:text-green-400 text-sm flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        {success}
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Enter OTP
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                        placeholder="123456"
                        className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none text-center text-2xl tracking-[0.5em] font-mono text-foreground placeholder:text-muted-foreground transition"
                        autoFocus
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        🔧 Dev mode: Use <span className="font-mono bg-muted px-1 rounded">123456</span>
                      </p>
                    </div>

                    {currentError && (
                      <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
                        {currentError}
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full h-11"
                      disabled={currentLoading || otp.length !== 6}
                    >
                      {currentLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>Verify & Continue</>
                      )}
                    </Button>

                    <button
                      type="button"
                      onClick={() => handleRequestOtp()}
                      disabled={currentLoading}
                      className="w-full text-center text-sm text-primary hover:underline"
                    >
                      Resend OTP
                    </button>
                  </form>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="recruiter"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                {/* Sign In / Sign Up Tabs */}
                <div className="flex gap-2 p-1 bg-muted/50 rounded-lg mb-6">
                  <button
                    onClick={() => { setMode('login'); clearError(); }}
                    className={cn(
                      'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all',
                      mode === 'login' 
                        ? 'bg-background text-foreground shadow-sm' 
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => { setMode('signup'); clearError(); }}
                    className={cn(
                      'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all',
                      mode === 'signup' 
                        ? 'bg-background text-foreground shadow-sm' 
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Sign Up
                  </button>
                </div>

                <h2 className="text-2xl font-bold text-foreground mb-2">
                  {mode === 'login' ? 'Recruiter Login' : 'Create Recruiter Account'}
                </h2>
                <p className="text-muted-foreground mb-6">
                  {mode === 'login' 
                    ? 'Access verified developer talent'
                    : 'Start finding the best developers'}
                </p>

                {currentError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-center gap-2"
                  >
                    <AlertCircle className="h-4 w-4" />
                    {currentError}
                  </motion.div>
                )}

                <form onSubmit={handleRecruiterSubmit} className="space-y-4">
                  {mode === 'signup' && (
                    <>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                          type="text"
                          name="name"
                          placeholder="Your Name"
                          value={recruiterForm.name}
                          onChange={handleRecruiterInputChange}
                          required
                          className="w-full pl-10 pr-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                        />
                      </div>
                      
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                          type="text"
                          name="company"
                          placeholder="Company Name"
                          value={recruiterForm.company}
                          onChange={handleRecruiterInputChange}
                          required
                          className="w-full pl-10 pr-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                        />
                      </div>
                      
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                          type="url"
                          name="companyWebsite"
                          placeholder="Company Website (optional)"
                          value={recruiterForm.companyWebsite}
                          onChange={handleRecruiterInputChange}
                          className="w-full pl-10 pr-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                        />
                      </div>
                      
                      <div className="relative">
                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                          type="text"
                          name="position"
                          placeholder="Your Position (optional)"
                          value={recruiterForm.position}
                          onChange={handleRecruiterInputChange}
                          className="w-full pl-10 pr-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                        />
                      </div>
                    </>
                  )}
                  
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="email"
                      name="email"
                      placeholder="Email Address"
                      value={recruiterForm.email}
                      onChange={handleRecruiterInputChange}
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                  
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="password"
                      name="password"
                      placeholder="Password"
                      value={recruiterForm.password}
                      onChange={handleRecruiterInputChange}
                      required
                      minLength={8}
                      className="w-full pl-10 pr-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full h-11" 
                    disabled={currentLoading}
                  >
                    {currentLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                      </>
                    ) : (
                      <>
                        {mode === 'login' ? 'Sign In' : 'Create Account'}
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer */}
          <p className="text-xs text-center text-muted-foreground mt-6">
            By continuing, you agree to our{' '}
            <Link to="/terms" className="text-primary hover:underline">Terms</Link>
            {' '}and{' '}
            <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
          </p>
        </div>

        {/* Back link */}
        <div className="text-center mt-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
