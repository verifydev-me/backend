import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useAuthStore } from '@/store/auth-store'
import { put } from '@/api/client'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import {
  Sparkles,
  User,
  Code2,
  Briefcase,
  Github,
  MapPin,
  Building,
  Globe,
  ArrowRight,
  ArrowLeft,
  Check,
  Zap,
  Target,
  Rocket,
  Heart,
  Search,
  CheckCircle2,
  Loader2,
  X,
} from 'lucide-react'

// Steps
const STEPS = [
  { id: 'welcome', title: 'Welcome' },
  { id: 'profile', title: 'Profile' },
  { id: 'skills', title: 'Skills' },
  { id: 'goals', title: 'Goals' },
  { id: 'complete', title: 'Complete' },
]

// Skills data
const SKILL_CATEGORIES = [
  {
    name: 'Frontend',
    skills: ['React', 'Vue.js', 'Angular', 'Next.js', 'TypeScript', 'Tailwind CSS', 'HTML/CSS', 'JavaScript'],
  },
  {
    name: 'Backend',
    skills: ['Node.js', 'Python', 'Go', 'Java', 'Rust', 'Express.js', 'Django', 'FastAPI'],
  },
  {
    name: 'Database',
    skills: ['PostgreSQL', 'MongoDB', 'MySQL', 'Redis', 'Prisma', 'GraphQL', 'Firebase'],
  },
  {
    name: 'DevOps',
    skills: ['Docker', 'Kubernetes', 'AWS', 'GCP', 'CI/CD', 'Linux', 'Terraform', 'Nginx'],
  },
  {
    name: 'Mobile',
    skills: ['React Native', 'Flutter', 'Swift', 'Kotlin', 'iOS', 'Android'],
  },
]

// Goals
const GOALS = [
  { id: 'job', icon: Briefcase, title: 'Find a Job', description: 'Looking for full-time opportunities' },
  { id: 'freelance', icon: Globe, title: 'Freelance Work', description: 'Looking for contract/freelance projects' },
  { id: 'showcase', icon: Sparkles, title: 'Showcase Skills', description: 'Build a verifiable developer profile' },
  { id: 'network', icon: Heart, title: 'Network', description: 'Connect with other developers' },
]

export default function Onboarding() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [currentStep, setCurrentStep] = useState(0)
  
  // Form data
  const [profile, setProfile] = useState({
    name: user?.name || '',
    bio: '',
    location: '',
    company: '',
    website: '',
  })
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [selectedGoals, setSelectedGoals] = useState<string[]>([])
  const [skillSearch, setSkillSearch] = useState('')

  const updateProfileMutation = useMutation({
    mutationFn: () => put('/v1/users/me', {
      ...profile,
      skills: selectedSkills,
      goals: selectedGoals,
      onboardingComplete: true,
    }),
    onSuccess: async () => {
      toast({ title: 'Welcome aboard! 🎉', description: 'Your profile has been set up successfully.' })
      // Wait a bit for backend to update, then navigate
      setTimeout(() => {
        navigate('/dashboard')
      }, 500)
    },
    onError: (error: any) => {
      console.error('Onboarding error:', error)
      const errorMsg = error?.response?.data?.message || 'Failed to save profile'
      toast({ variant: 'destructive', title: 'Setup failed', description: errorMsg })
    },
  })

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = () => {
    updateProfileMutation.mutate()
  }

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev => 
      prev.includes(skill) 
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    )
  }

  const toggleGoal = (goalId: string) => {
    setSelectedGoals(prev => 
      prev.includes(goalId) 
        ? prev.filter(g => g !== goalId)
        : [...prev, goalId]
    )
  }

  const filteredSkills = SKILL_CATEGORIES.map(category => ({
    ...category,
    skills: category.skills.filter(skill => 
      skill.toLowerCase().includes(skillSearch.toLowerCase())
    )
  })).filter(category => category.skills.length > 0)

  const progress = ((currentStep + 1) / STEPS.length) * 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative min-h-screen flex flex-col">
        {/* Header */}
        <header className="p-6">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">DevVerify</span>
            </div>
            <Button variant="ghost" onClick={() => navigate('/dashboard')}>
              Skip for now
            </Button>
          </div>
        </header>

        {/* Progress */}
        <div className="px-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              {STEPS.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                    index < currentStep && "bg-primary text-primary-foreground",
                    index === currentStep && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                    index > currentStep && "bg-muted text-muted-foreground"
                  )}>
                    {index < currentStep ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={cn(
                      "w-12 md:w-24 h-0.5 mx-2 transition-colors",
                      index < currentStep ? "bg-primary" : "bg-muted"
                    )} />
                  )}
                </div>
              ))}
            </div>
            <Progress value={progress} className="h-1" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-2xl">
            <AnimatePresence mode="wait">
              {/* Step 1: Welcome */}
              {currentStep === 0 && (
                <motion.div
                  key="welcome"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="text-center"
                >
                  <div className="h-24 w-24 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <Rocket className="h-12 w-12 text-primary" />
                  </div>
                  <h1 className="text-4xl font-bold mb-4">
                    Welcome to DevVerify! 🎉
                  </h1>
                  <p className="text-xl text-muted-foreground mb-8 max-w-lg mx-auto">
                    Let's set up your profile so recruiters can discover your true potential. 
                    This takes about 2 minutes.
                  </p>
                  
                  <div className="grid md:grid-cols-3 gap-4 mb-8">
                    <Card>
                      <CardContent className="pt-6 text-center">
                        <Target className="h-8 w-8 text-primary mx-auto mb-3" />
                        <h3 className="font-semibold mb-1">Verified Skills</h3>
                        <p className="text-sm text-muted-foreground">
                          Your skills backed by real code
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6 text-center">
                        <Sparkles className="h-8 w-8 text-primary mx-auto mb-3" />
                        <h3 className="font-semibold mb-1">Aura Score</h3>
                        <p className="text-sm text-muted-foreground">
                          Unique developer reputation
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6 text-center">
                        <Briefcase className="h-8 w-8 text-primary mx-auto mb-3" />
                        <h3 className="font-semibold mb-1">Job Matches</h3>
                        <p className="text-sm text-muted-foreground">
                          AI-powered job recommendations
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <Button size="lg" onClick={handleNext} className="gap-2">
                    Let's Get Started
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </motion.div>
              )}

              {/* Step 2: Profile */}
              {currentStep === 1 && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <Card>
                    <CardHeader className="text-center pb-2">
                      <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <User className="h-8 w-8 text-primary" />
                      </div>
                      <CardTitle className="text-2xl">Tell us about yourself</CardTitle>
                      <CardDescription>
                        Help recruiters get to know you better
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Display Name *</label>
                        <Input
                          value={profile.name}
                          onChange={(e) => setProfile(p => ({ ...p, name: e.target.value }))}
                          placeholder="Your name"
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium mb-2 block">Bio</label>
                        <Textarea
                          value={profile.bio}
                          onChange={(e) => setProfile(p => ({ ...p, bio: e.target.value }))}
                          placeholder="Tell us about yourself, your experience, and what you're passionate about..."
                          rows={4}
                        />
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium mb-2 block">Location</label>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              value={profile.location}
                              onChange={(e) => setProfile(p => ({ ...p, location: e.target.value }))}
                              placeholder="City, Country"
                              className="pl-10"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Company</label>
                          <div className="relative">
                            <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              value={profile.company}
                              onChange={(e) => setProfile(p => ({ ...p, company: e.target.value }))}
                              placeholder="Where do you work?"
                              className="pl-10"
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium mb-2 block">Website / Portfolio</label>
                        <div className="relative">
                          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            value={profile.website}
                            onChange={(e) => setProfile(p => ({ ...p, website: e.target.value }))}
                            placeholder="https://yourwebsite.com"
                            className="pl-10"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Step 3: Skills */}
              {currentStep === 2 && (
                <motion.div
                  key="skills"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <Card>
                    <CardHeader className="text-center pb-2">
                      <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <Code2 className="h-8 w-8 text-primary" />
                      </div>
                      <CardTitle className="text-2xl">What are your skills?</CardTitle>
                      <CardDescription>
                        Select the technologies you work with
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Search */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={skillSearch}
                          onChange={(e) => setSkillSearch(e.target.value)}
                          placeholder="Search skills..."
                          className="pl-10"
                        />
                      </div>
                      
                      {/* Selected Skills */}
                      {selectedSkills.length > 0 && (
                        <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                          {selectedSkills.map(skill => (
                            <Badge 
                              key={skill} 
                              variant="default"
                              className="gap-1 cursor-pointer"
                              onClick={() => toggleSkill(skill)}
                            >
                              {skill}
                              <X className="h-3 w-3" />
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      {/* Skill Categories */}
                      <div className="space-y-4 max-h-[300px] overflow-y-auto">
                        {filteredSkills.map(category => (
                          <div key={category.name}>
                            <h4 className="text-sm font-medium text-muted-foreground mb-2">
                              {category.name}
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {category.skills.map(skill => (
                                <Badge
                                  key={skill}
                                  variant={selectedSkills.includes(skill) ? "default" : "outline"}
                                  className={cn(
                                    "cursor-pointer transition-all",
                                    selectedSkills.includes(skill) && "ring-2 ring-primary/20"
                                  )}
                                  onClick={() => toggleSkill(skill)}
                                >
                                  {selectedSkills.includes(skill) && (
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                  )}
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <p className="text-sm text-muted-foreground text-center">
                        {selectedSkills.length} skills selected
                        {selectedSkills.length < 3 && " (select at least 3)"}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Step 4: Goals */}
              {currentStep === 3 && (
                <motion.div
                  key="goals"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <Card>
                    <CardHeader className="text-center pb-2">
                      <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <Target className="h-8 w-8 text-primary" />
                      </div>
                      <CardTitle className="text-2xl">What are your goals?</CardTitle>
                      <CardDescription>
                        Help us personalize your experience
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {GOALS.map(goal => (
                        <button
                          key={goal.id}
                          onClick={() => toggleGoal(goal.id)}
                          className={cn(
                            "w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4",
                            selectedGoals.includes(goal.id)
                              ? "border-primary bg-primary/5"
                              : "border-muted hover:border-primary/50"
                          )}
                        >
                          <div className={cn(
                            "h-12 w-12 rounded-xl flex items-center justify-center transition-colors",
                            selectedGoals.includes(goal.id)
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          )}>
                            <goal.icon className="h-6 w-6" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold">{goal.title}</h3>
                            <p className="text-sm text-muted-foreground">{goal.description}</p>
                          </div>
                          {selectedGoals.includes(goal.id) && (
                            <CheckCircle2 className="h-6 w-6 text-primary" />
                          )}
                        </button>
                      ))}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Step 5: Complete */}
              {currentStep === 4 && (
                <motion.div
                  key="complete"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="text-center"
                >
                  <div className="h-24 w-24 rounded-3xl bg-green-500/10 flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="h-12 w-12 text-green-500" />
                  </div>
                  <h1 className="text-4xl font-bold mb-4">
                    You're all set! 🚀
                  </h1>
                  <p className="text-xl text-muted-foreground mb-8 max-w-lg mx-auto">
                    Your profile is ready. Now add some projects to boost your Aura score!
                  </p>
                  
                  {/* Summary */}
                  <Card className="text-left mb-8">
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Name</span>
                        <span className="font-medium">{profile.name || user?.name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Skills</span>
                        <div className="flex gap-1">
                          {selectedSkills.slice(0, 3).map(skill => (
                            <Badge key={skill} variant="secondary">{skill}</Badge>
                          ))}
                          {selectedSkills.length > 3 && (
                            <Badge variant="outline">+{selectedSkills.length - 3}</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Goals</span>
                        <span className="font-medium">
                          {selectedGoals.map(g => GOALS.find(goal => goal.id === g)?.title).join(', ')}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex flex-col gap-4">
                    <Button 
                      size="lg" 
                      onClick={handleComplete}
                      disabled={updateProfileMutation.isPending}
                      className="gap-2"
                    >
                      {updateProfileMutation.isPending ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Sparkles className="h-5 w-5" />
                      )}
                      Complete Setup & Go to Dashboard
                    </Button>
                    <Button variant="outline" size="lg" onClick={() => navigate('/projects')} className="gap-2">
                      <Github className="h-5 w-5" />
                      Add Projects First
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Navigation */}
        {currentStep > 0 && currentStep < 4 && (
          <footer className="p-6">
            <div className="max-w-2xl mx-auto flex items-center justify-between">
              <Button variant="ghost" onClick={handleBack} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button 
                onClick={handleNext}
                disabled={
                  (currentStep === 1 && !profile.name) ||
                  (currentStep === 2 && selectedSkills.length < 3)
                }
                className="gap-2"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </footer>
        )}
      </div>
    </div>
  )
}
