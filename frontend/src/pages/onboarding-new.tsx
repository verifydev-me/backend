/**
 * Complete Onboarding Flow
 * 5 Steps: Welcome → Basic Info → Student Info (Optional) → Repo Selection → Complete
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useOnboardingStatus,
  useUpdateOnboardingStep1,
  useUpdateOnboardingStep2,
  useSkipOnboardingStep2,
  useCompleteOnboarding,
  useAvailableRepos,
  useAnalyzeProject,
} from '@/hooks/use-user'
import { useCurrentUser } from '@/hooks/use-auth'
import { Loader2, Sparkles, User, GraduationCap, Github, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

const TOTAL_STEPS = 5

export default function OnboardingPage() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)

  // Queries
  const { data: user } = useCurrentUser()
  const { data: onboardingStatus, isLoading: statusLoading } = useOnboardingStatus()
  const { data: repos } = useAvailableRepos()

  // Mutations
  const updateStep1 = useUpdateOnboardingStep1()
  const updateStep2 = useUpdateOnboardingStep2()
  const skipStep2 = useSkipOnboardingStep2()
  const completeOnboarding = useCompleteOnboarding()
  const analyzeProject = useAnalyzeProject()

  // Form states
  const [step1Data, setStep1Data] = useState({
    name: user?.name || '',
    bio: '',
  })

  const [isStudent, setIsStudent] = useState(false)
  const [step2Data, setStep2Data] = useState({
    currentInstitution: '',
    graduationYear: new Date().getFullYear(),
    fieldOfStudy: '',
  })

  const [selectedRepos, setSelectedRepos] = useState<number[]>([])
  const [analyzingRepos, setAnalyzingRepos] = useState(false)

  // Update current step based on onboarding status
  useEffect(() => {
    if (onboardingStatus?.completed) {
      navigate('/dashboard')
    } else if (onboardingStatus) {
      if (onboardingStatus.steps.step2) {
        setCurrentStep(4) // Go to repo selection
      } else if (onboardingStatus.steps.step1) {
        setCurrentStep(3) // Go to student info
      }
    }
  }, [onboardingStatus, navigate])

  const progress = (currentStep / TOTAL_STEPS) * 100

  const handleStep1Submit = async () => {
    try {
      await updateStep1.mutateAsync(step1Data)
      setCurrentStep(3)
    } catch (error) {
      // Error handled by hook
    }
  }

  const handleStep2Submit = async () => {
    try {
      await updateStep2.mutateAsync({
        isStudent,
        ...step2Data,
      })
      setCurrentStep(4)
    } catch (error) {
      // Error handled by hook
    }
  }

  const handleSkipStudent = async () => {
    try {
      await skipStep2.mutateAsync()
      setCurrentStep(4)
    } catch (error) {
      // Error handled by hook
    }
  }

  const handleRepoSelection = async () => {
    if (selectedRepos.length === 0) {
      // Skip repo analysis
      setCurrentStep(5)
      return
    }

    setAnalyzingRepos(true)
    try {
      // Analyze selected repos
      for (const repoId of selectedRepos) {
        const repo = repos?.find((r) => r.id === repoId)
        if (repo) {
          await analyzeProject.mutateAsync({
            repoId: repo.id,
            repoName: repo.name,
            repoUrl: repo.url,
          })
        }
      }
      setCurrentStep(5)
    } catch (error) {
      // Error handled by hook
    } finally {
      setAnalyzingRepos(false)
    }
  }

  const handleComplete = async () => {
    try {
      await completeOnboarding.mutateAsync()
      navigate('/dashboard')
    } catch (error) {
      // Error handled by hook
    }
  }

  if (statusLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="container max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-2 mb-4"
          >
            <Sparkles className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Welcome to VerifyDev</h1>
          </motion.div>
          <p className="text-muted-foreground">Let's set up your verified developer profile</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium">
              Step {currentStep} of {TOTAL_STEPS}
            </span>
            <span className="text-sm text-muted-foreground">{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Steps */}
        <AnimatePresence mode="wait">
          {currentStep === 1 && <WelcomeStep onNext={() => setCurrentStep(2)} />}
          
          {currentStep === 2 && (
            <BasicInfoStep
              data={step1Data}
              onChange={setStep1Data}
              onNext={handleStep1Submit}
              onBack={() => setCurrentStep(1)}
              isLoading={updateStep1.isPending}
            />
          )}
          
          {currentStep === 3 && (
            <StudentInfoStep
              isStudent={isStudent}
              setIsStudent={setIsStudent}
              data={step2Data}
              onChange={setStep2Data}
              onNext={handleStep2Submit}
              onSkip={handleSkipStudent}
              onBack={() => setCurrentStep(2)}
              isLoading={updateStep2.isPending || skipStep2.isPending}
            />
          )}
          
          {currentStep === 4 && (
            <RepoSelectionStep
              repos={repos || []}
              selectedRepos={selectedRepos}
              setSelectedRepos={setSelectedRepos}
              onNext={handleRepoSelection}
              onBack={() => setCurrentStep(3)}
              isLoading={analyzingRepos}
            />
          )}
          
          {currentStep === 5 && (
            <CompleteStep
              onFinish={handleComplete}
              isLoading={completeOnboarding.isPending}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ============================================
// STEP 1: WELCOME
// ============================================

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <motion.div
      key="welcome"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <Card className="border-2">
        <CardHeader className="text-center pb-8">
          <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Sparkles className="w-10 h-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Build Your Verified Developer Profile</CardTitle>
          <CardDescription className="text-base">
            VerifyDev analyzes your GitHub projects to create a trusted, verified profile
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            <FeatureCard
              icon={<Github className="w-6 h-6" />}
              title="GitHub Integration"
              description="Connect your repositories for automatic analysis"
            />
            <FeatureCard
              icon={<CheckCircle className="w-6 h-6" />}
              title="Verified Skills"
              description="Get verified badges for your proven skills"
            />
            <FeatureCard
              icon={<Sparkles className="w-6 h-6" />}
              title="Aura Score"
              description="Build your developer credibility score"
            />
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>Why we ask for this information:</strong> We create your profile from your GitHub data
              and analyze your projects to verify your skills. Your data helps recruiters trust your abilities.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button onClick={onNext} size="lg">
            Get Started
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="text-center p-4 rounded-lg border bg-card">
      <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3 text-primary">
        {icon}
      </div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  )
}

// ============================================
// STEP 2: BASIC INFO
// ============================================

interface BasicInfoStepProps {
  data: { name: string; bio: string }
  onChange: (data: { name: string; bio: string }) => void
  onNext: () => void
  onBack: () => void
  isLoading: boolean
}

function BasicInfoStep({ data, onChange, onNext, onBack, isLoading }: BasicInfoStepProps) {
  const isValid = data.name.trim().length > 0

  return (
    <motion.div
      key="basic-info"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <User className="w-5 h-5 text-primary" />
            <CardTitle>Basic Information</CardTitle>
          </div>
          <CardDescription>Tell us a bit about yourself</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Full Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={data.name}
              onChange={(e) => onChange({ ...data, name: e.target.value })}
              placeholder="John Doe"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={data.bio}
              onChange={(e) => onChange({ ...data, bio: e.target.value })}
              placeholder="Full-stack developer passionate about building great products..."
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">{data.bio.length}/500 characters</p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 w-4 h-4" />
            Back
          </Button>
          <Button onClick={onNext} disabled={!isValid || isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Next
                <ArrowRight className="ml-2 w-4 h-4" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  )
}

// ============================================
// STEP 3: STUDENT INFO (OPTIONAL)
// ============================================

interface StudentInfoStepProps {
  isStudent: boolean
  setIsStudent: (value: boolean) => void
  data: { currentInstitution: string; graduationYear: number; fieldOfStudy: string }
  onChange: (data: any) => void
  onNext: () => void
  onSkip: () => void
  onBack: () => void
  isLoading: boolean
}

function StudentInfoStep({
  isStudent,
  setIsStudent,
  data,
  onChange,
  onNext,
  onSkip,
  onBack,
  isLoading,
}: StudentInfoStepProps) {
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 10 }, (_, i) => currentYear + i)

  const isValid = !isStudent || (data.currentInstitution && data.fieldOfStudy)

  return (
    <motion.div
      key="student-info"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            <CardTitle>Student Information</CardTitle>
          </div>
          <CardDescription>Optional - helps recruiters find student opportunities</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
            <div>
              <p className="font-medium">Are you currently a student?</p>
              <p className="text-sm text-muted-foreground">This helps us show you relevant opportunities</p>
            </div>
            <Switch checked={isStudent} onCheckedChange={setIsStudent} />
          </div>

          {isStudent && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="institution">
                  Current Institution <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="institution"
                  value={data.currentInstitution}
                  onChange={(e) => onChange({ ...data, currentInstitution: e.target.value })}
                  placeholder="University of California, Berkeley"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="field">
                  Field of Study <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="field"
                  value={data.fieldOfStudy}
                  onChange={(e) => onChange({ ...data, fieldOfStudy: e.target.value })}
                  placeholder="Computer Science"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="graduation">Expected Graduation Year</Label>
                <Select
                  value={data.graduationYear.toString()}
                  onValueChange={(value) => onChange({ ...data, graduationYear: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </motion.div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 w-4 h-4" />
            Back
          </Button>
          <div className="flex gap-2">
            {isStudent ? (
              <Button onClick={onNext} disabled={!isValid || isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={onSkip} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                    Skipping...
                  </>
                ) : (
                  <>
                    Skip
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  )
}

// ============================================
// STEP 4: REPO SELECTION
// ============================================

interface RepoSelectionStepProps {
  repos: any[]
  selectedRepos: number[]
  setSelectedRepos: (repos: number[]) => void
  onNext: () => void
  onBack: () => void
  isLoading: boolean
}

function RepoSelectionStep({
  repos,
  selectedRepos,
  setSelectedRepos,
  onNext,
  onBack,
  isLoading,
}: RepoSelectionStepProps) {
  const toggleRepo = (repoId: number) => {
    setSelectedRepos(
      selectedRepos.includes(repoId)
        ? selectedRepos.filter((id) => id !== repoId)
        : [...selectedRepos, repoId]
    )
  }

  return (
    <motion.div
      key="repo-selection"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Github className="w-5 h-5 text-primary" />
            <CardTitle>Select Projects to Analyze</CardTitle>
          </div>
          <CardDescription>
            We'll analyze these repositories to verify your skills
            {selectedRepos.length > 0 && ` (${selectedRepos.length} selected)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {repos.length === 0 ? (
            <div className="text-center py-12">
              <Github className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No public repositories found</p>
              <p className="text-sm text-muted-foreground mt-2">
                You can add projects later from your dashboard
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {repos.slice(0, 20).map((repo) => (
                <div
                  key={repo.id}
                  onClick={() => toggleRepo(repo.id)}
                  className={cn(
                    'flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors',
                    selectedRepos.includes(repo.id)
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-accent'
                  )}
                >
                  <Checkbox
                    checked={selectedRepos.includes(repo.id)}
                    onCheckedChange={() => toggleRepo(repo.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{repo.name}</p>
                    {repo.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{repo.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      {repo.language && <Badge variant="secondary">{repo.language}</Badge>}
                      <span>★ {repo.stars}</span>
                      {repo.isPrivate && <Badge variant="outline">Private</Badge>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={onBack} disabled={isLoading}>
            <ArrowLeft className="mr-2 w-4 h-4" />
            Back
          </Button>
          <Button onClick={onNext} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                {selectedRepos.length > 0 ? 'Analyze & Continue' : 'Skip for Now'}
                <ArrowRight className="ml-2 w-4 h-4" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  )
}

// ============================================
// STEP 5: COMPLETE
// ============================================

function CompleteStep({ onFinish, isLoading }: { onFinish: () => void; isLoading: boolean }) {
  return (
    <motion.div
      key="complete"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
    >
      <Card className="border-2 border-primary">
        <CardHeader className="text-center pb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="mx-auto w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4"
          >
            <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
          </motion.div>
          <CardTitle className="text-2xl">You're All Set! 🎉</CardTitle>
          <CardDescription className="text-base">
            Your verified developer profile is ready
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border bg-card">
              <h3 className="font-semibold mb-2">✓ Profile Created</h3>
              <p className="text-sm text-muted-foreground">
                Your basic profile is set up and ready
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <h3 className="font-semibold mb-2">🔍 Projects Analyzing</h3>
              <p className="text-sm text-muted-foreground">
                We're analyzing your projects to verify skills
              </p>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">What's Next?</h4>
            <ul className="space-y-2 text-sm text-blue-900 dark:text-blue-100">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Check your dashboard for verified skills
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Browse matched job opportunities
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Build your resume with verified data
              </li>
            </ul>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={onFinish} size="lg" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                Loading Dashboard...
              </>
            ) : (
              <>
                Go to Dashboard
                <ArrowRight className="ml-2 w-4 h-4" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  )
}
