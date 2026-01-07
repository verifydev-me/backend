import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useRecruiterStore } from '@/store/recruiter-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { 
  Building, 
  Mail, 
  Lock, 
  User, 
  Globe, 
  Briefcase,
  Loader2,
  AlertCircle,
  ArrowRight,
  Users,
  Search,
  FileCheck
} from 'lucide-react'

export default function RecruiterLogin() {
  const navigate = useNavigate()
  const { login, register, isLoading, error, clearError } = useRecruiterStore()
  
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    company: '',
    companyWebsite: '',
    position: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    
    try {
      if (mode === 'login') {
        await login(formData.email, formData.password)
      } else {
        await register(formData)
      }
      navigate('/recruiter/dashboard')
    } catch {
      // Error is handled by the store
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/20 via-primary/10 to-background items-center justify-center p-12">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="max-w-md"
        >
          <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Verify Platform
          </h1>
          <h2 className="text-2xl font-semibold mb-4 text-foreground">
            Find Verified Talent
          </h2>
          <p className="text-muted-foreground mb-8">
            Access developers with verified skills, analyzed code quality, and Aura scores.
            Make hiring decisions based on real evidence, not just resumes.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Search className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Advanced Search</h3>
                <p className="text-sm text-muted-foreground">
                  Filter by skills, aura score, location, and more
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Verified Skills</h3>
                <p className="text-sm text-muted-foreground">
                  Skills extracted and verified from actual code analysis
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Quality Profiles</h3>
                <p className="text-sm text-muted-foreground">
                  Detailed code quality metrics and project analysis
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
      
      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Card className="border-border/50">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10 w-fit">
                <Building className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">
                {mode === 'login' ? 'Recruiter Login' : 'Create Account'}
              </CardTitle>
              <CardDescription>
                {mode === 'login' 
                  ? 'Access the talent pool' 
                  : 'Start finding verified developers'}
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-center gap-2"
                >
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </motion.div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'register' && (
                  <>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        name="name"
                        placeholder="Your Name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                    
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        name="company"
                        placeholder="Company Name"
                        value={formData.company}
                        onChange={handleInputChange}
                        required
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                    
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="url"
                        name="companyWebsite"
                        placeholder="Company Website (optional)"
                        value={formData.companyWebsite}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                    
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        name="position"
                        placeholder="Your Position (optional)"
                        value={formData.position}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
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
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    minLength={8}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                >
                  {isLoading ? (
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
              
              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  {mode === 'login' ? (
                    <>
                      Don't have an account?{' '}
                      <button
                        type="button"
                        onClick={() => { setMode('register'); clearError() }}
                        className="text-primary hover:underline font-medium"
                      >
                        Sign up
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => { setMode('login'); clearError() }}
                        className="text-primary hover:underline font-medium"
                      >
                        Sign in
                      </button>
                    </>
                  )}
                </p>
              </div>
              
              <div className="mt-4 pt-4 border-t border-border text-center">
                <Link 
                  to="/" 
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  ← Back to Developer Login
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
