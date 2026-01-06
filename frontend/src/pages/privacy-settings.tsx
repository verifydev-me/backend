import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { get, put, patch } from '@/api/client'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { 
  Shield,
  Eye,
  EyeOff,
  Briefcase,
  MapPin,
  DollarSign,
  Calendar,
  Clock,
  Loader2,
  Check,
  Star,
  Pin,
  Code2,
  Lock,
  Globe,
  UserCheck,
  Sparkles,
  Save,
  ArrowLeft,
  ChevronRight,
  Zap,
  Target,
  Building,
} from 'lucide-react'
import { Link } from 'react-router-dom'

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

// Types
interface VisibilitySettings {
  visibility: {
    isPublic: boolean
    isOpenToWork: boolean
    showEmail: boolean
    showPhone: boolean
    showCgpa: boolean
    visibilityLevel: 'PUBLIC' | 'RECRUITERS_ONLY' | 'INVITE_ONLY'
  }
  jobPreferences: {
    preferredRoles: string[]
    preferredLocations: string[]
    preferredJobTypes: string[]
    expectedSalary: {
      min: number | null
      max: number | null
      currency: string | null
    }
    availableFrom: string | null
    noticePeriodDays: number | null
    remotePreference: 'REMOTE_ONLY' | 'ONSITE_ONLY' | 'HYBRID' | 'FLEXIBLE'
  }
  highlightedSkills: string[]
  phone: string | null
}

interface Skill {
  id: string
  name: string
  category: string
  verifiedScore: number
  isVerified: boolean
  isHighlighted: boolean
  showToRecruiters: boolean
}

interface Project {
  id: string
  repoName: string
  description: string | null
  overallScore: number
  showToRecruiters: boolean
  isPinned: boolean
  language: string | null
}

// Common job roles
const COMMON_ROLES = [
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'DevOps Engineer',
  'Mobile Developer',
  'Data Scientist',
  'Machine Learning Engineer',
  'Cloud Engineer',
  'Security Engineer',
  'QA Engineer',
  'Software Architect',
  'Engineering Manager',
]

// Common job types
const JOB_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'FREELANCE']

export default function PrivacySettings() {
  const queryClient = useQueryClient()
  
  const [activeTab, setActiveTab] = useState<'visibility' | 'job' | 'skills' | 'projects'>('visibility')
  const [hasChanges, setHasChanges] = useState(false)

  // Fetch visibility settings
  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ['visibility-settings'],
    queryFn: () => get<{ data: VisibilitySettings }>('/v1/visibility-settings'),
  })

  // Fetch skills
  const { data: skillsData, isLoading: skillsLoading } = useQuery({
    queryKey: ['user-skills'],
    queryFn: () => get<{ data: { skills: Skill[] } }>('/v1/skills'),
  })

  // Fetch projects
  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['user-projects'],
    queryFn: () => get<{ data: Project[] }>('/v1/projects'),
  })

  // Local state for form
  const [visibility, setVisibility] = useState<{
    isPublic: boolean
    isOpenToWork: boolean
    showEmail: boolean
    showPhone: boolean
    showCgpa: boolean
    visibilityLevel: 'PUBLIC' | 'RECRUITERS_ONLY' | 'INVITE_ONLY'
  }>({
    isPublic: true,
    isOpenToWork: false,
    showEmail: false,
    showPhone: false,
    showCgpa: false,
    visibilityLevel: 'RECRUITERS_ONLY',
  })

  const [jobPreferences, setJobPreferences] = useState<{
    preferredRoles: string[]
    preferredLocations: string[]
    preferredJobTypes: string[]
    expectedSalaryMin: number | null
    expectedSalaryMax: number | null
    salaryCurrency: string
    availableFrom: string | null
    noticePeriodDays: number
    remotePreference: 'REMOTE_ONLY' | 'ONSITE_ONLY' | 'HYBRID' | 'FLEXIBLE'
  }>({
    preferredRoles: [],
    preferredLocations: [],
    preferredJobTypes: [],
    expectedSalaryMin: null,
    expectedSalaryMax: null,
    salaryCurrency: 'INR',
    availableFrom: null,
    noticePeriodDays: 0,
    remotePreference: 'FLEXIBLE',
  })

  const [phone, setPhone] = useState('')
  const [customRole, setCustomRole] = useState('')
  const [customLocation, setCustomLocation] = useState('')

  // Sync settings from API
  useEffect(() => {
    if (settingsData?.data) {
      const { visibility: vis, jobPreferences: job, phone: ph } = settingsData.data
      setVisibility(vis)
      setJobPreferences({
        preferredRoles: job.preferredRoles || [],
        preferredLocations: job.preferredLocations || [],
        preferredJobTypes: job.preferredJobTypes || [],
        expectedSalaryMin: job.expectedSalary?.min || null,
        expectedSalaryMax: job.expectedSalary?.max || null,
        salaryCurrency: job.expectedSalary?.currency || 'INR',
        availableFrom: job.availableFrom || null,
        noticePeriodDays: job.noticePeriodDays || 0,
        remotePreference: job.remotePreference || 'FLEXIBLE',
      })
      setPhone(ph || '')
    }
  }, [settingsData])

  // Update visibility mutation
  const updateVisibilityMutation = useMutation({
    mutationFn: (data: Partial<typeof visibility> & { phone?: string }) => 
      put('/v1/visibility-settings', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visibility-settings'] })
      toast({ title: 'Visibility updated! ✅', description: 'Your settings have been saved.' })
      setHasChanges(false)
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update settings.' })
    },
  })

  // Update job preferences mutation
  const updateJobPreferencesMutation = useMutation({
    mutationFn: (data: typeof jobPreferences) => 
      put('/v1/visibility-settings/job-preferences', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visibility-settings'] })
      toast({ title: 'Job preferences saved! 💼', description: 'Recruiters will see your updated preferences.' })
      setHasChanges(false)
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update preferences.' })
    },
  })

  // Update highlighted skills mutation
  const updateHighlightedSkillsMutation = useMutation({
    mutationFn: (skillIds: string[]) => 
      put('/v1/visibility-settings/highlighted-skills', { skillIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visibility-settings'] })
      queryClient.invalidateQueries({ queryKey: ['user-skills'] })
      toast({ title: 'Skills updated! ⭐', description: 'Your highlighted skills have been saved.' })
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update skills.' })
    },
  })

  // Update project visibility mutation
  const updateProjectVisibilityMutation = useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: { showToRecruiters?: boolean; isPinned?: boolean } }) => 
      patch(`/v1/visibility-settings/projects/${projectId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-projects'] })
      toast({ title: 'Project updated!', description: 'Project visibility has been changed.' })
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update project.' })
    },
  })

  // Handlers
  const handleVisibilityChange = (key: keyof typeof visibility, value: any) => {
    setVisibility(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleJobPreferenceChange = (key: keyof typeof jobPreferences, value: any) => {
    setJobPreferences(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleSaveVisibility = () => {
    updateVisibilityMutation.mutate({ ...visibility, phone })
  }

  const handleSaveJobPreferences = () => {
    updateJobPreferencesMutation.mutate(jobPreferences)
  }

  const handleAddRole = () => {
    if (customRole && !jobPreferences.preferredRoles.includes(customRole)) {
      handleJobPreferenceChange('preferredRoles', [...jobPreferences.preferredRoles, customRole])
      setCustomRole('')
    }
  }

  const handleAddLocation = () => {
    if (customLocation && !jobPreferences.preferredLocations.includes(customLocation)) {
      handleJobPreferenceChange('preferredLocations', [...jobPreferences.preferredLocations, customLocation])
      setCustomLocation('')
    }
  }

  const handleToggleSkillHighlight = (skill: Skill) => {
    const currentHighlighted = skills.filter(s => s.isHighlighted).map(s => s.id)
    
    if (skill.isHighlighted) {
      // Remove from highlighted
      updateHighlightedSkillsMutation.mutate(currentHighlighted.filter(id => id !== skill.id))
    } else {
      // Add to highlighted (max 7)
      if (currentHighlighted.length >= 7) {
        toast({ 
          variant: 'destructive', 
          title: 'Limit reached', 
          description: 'You can highlight up to 7 skills. Remove one first.' 
        })
        return
      }
      updateHighlightedSkillsMutation.mutate([...currentHighlighted, skill.id])
    }
  }

  const handleToggleProjectVisibility = (project: Project) => {
    updateProjectVisibilityMutation.mutate({
      projectId: project.id,
      data: { showToRecruiters: !project.showToRecruiters }
    })
  }

  const handleToggleProjectPin = (project: Project) => {
    const pinnedCount = projects.filter(p => p.isPinned).length
    if (!project.isPinned && pinnedCount >= 3) {
      toast({ 
        variant: 'destructive', 
        title: 'Limit reached', 
        description: 'You can pin up to 3 projects. Unpin one first.' 
      })
      return
    }
    updateProjectVisibilityMutation.mutate({
      projectId: project.id,
      data: { isPinned: !project.isPinned }
    })
  }

  const skills = skillsData?.data?.skills || []
  const projects = projectsData?.data || []
  const isLoading = settingsLoading || skillsLoading || projectsLoading
  const isSaving = updateVisibilityMutation.isPending || updateJobPreferencesMutation.isPending

  const tabs = [
    { id: 'visibility' as const, label: 'Profile Visibility', icon: Eye },
    { id: 'job' as const, label: 'Job Preferences', icon: Briefcase },
    { id: 'skills' as const, label: 'Skill Showcase', icon: Sparkles },
    { id: 'projects' as const, label: 'Project Visibility', icon: Code2 },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <Link to="/settings" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Settings
          </Link>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Privacy & Visibility
          </h1>
          <p className="text-muted-foreground mt-1">
            Control what recruiters see and how they can find you
          </p>
        </div>
        {hasChanges && (
          <Button 
            onClick={activeTab === 'visibility' ? handleSaveVisibility : handleSaveJobPreferences}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        )}
      </motion.div>

      {/* Open to Work Banner */}
      {visibility.isOpenToWork && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-500/20 via-emerald-500/10 to-teal-500/20 border border-emerald-500/30 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Target className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="font-medium text-emerald-400">You're Open to Work!</p>
              <p className="text-sm text-muted-foreground">
                Recruiters can see that you're actively looking for opportunities
              </p>
            </div>
          </div>
          <Sparkles className="absolute right-4 top-1/2 -translate-y-1/2 h-16 w-16 text-emerald-500/10" />
        </motion.div>
      )}

      {/* Tab Navigation */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex gap-2 overflow-x-auto pb-2"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap",
              activeTab === tab.id
                ? "bg-primary text-primary-foreground shadow-lg"
                : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* Visibility Settings */}
        {activeTab === 'visibility' && (
          <motion.div variants={itemVariants} className="space-y-6">
            {/* Profile Visibility Level */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  Profile Visibility Level
                </CardTitle>
                <CardDescription>
                  Choose who can view your profile
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    { value: 'PUBLIC', label: 'Public', desc: 'Anyone can see your profile', icon: Globe },
                    { value: 'RECRUITERS_ONLY', label: 'Recruiters Only', desc: 'Only verified recruiters', icon: UserCheck },
                    { value: 'INVITE_ONLY', label: 'Invite Only', desc: 'Only recruiters you approve', icon: Lock },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleVisibilityChange('visibilityLevel', option.value)}
                      className={cn(
                        "p-4 rounded-xl border-2 transition-all text-left",
                        visibility.visibilityLevel === option.value
                          ? "border-primary bg-primary/5"
                          : "border-muted hover:border-primary/50"
                      )}
                    >
                      <option.icon className={cn(
                        "h-6 w-6 mb-2",
                        visibility.visibilityLevel === option.value ? "text-primary" : "text-muted-foreground"
                      )} />
                      <p className="font-medium">{option.label}</p>
                      <p className="text-xs text-muted-foreground">{option.desc}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Display Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" />
                  Display Settings
                </CardTitle>
                <CardDescription>
                  Control what information is visible on your profile
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <Target className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="font-medium">Open to Work</p>
                      <p className="text-sm text-muted-foreground">Show recruiters you're actively looking</p>
                    </div>
                  </div>
                  <Switch 
                    checked={visibility.isOpenToWork}
                    onCheckedChange={(c) => handleVisibilityChange('isOpenToWork', c)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Show Email</p>
                    <p className="text-sm text-muted-foreground">Display your email to recruiters</p>
                  </div>
                  <Switch 
                    checked={visibility.showEmail}
                    onCheckedChange={(c) => handleVisibilityChange('showEmail', c)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Show Phone</p>
                    <p className="text-sm text-muted-foreground">Display your phone number</p>
                  </div>
                  <Switch 
                    checked={visibility.showPhone}
                    onCheckedChange={(c) => handleVisibilityChange('showPhone', c)}
                  />
                </div>
                {visibility.showPhone && (
                  <div className="ml-4 pl-4 border-l-2 border-primary/20">
                    <Input
                      value={phone}
                      onChange={(e) => { setPhone(e.target.value); setHasChanges(true) }}
                      placeholder="+91 98765 43210"
                      className="max-w-xs"
                    />
                  </div>
                )}
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Show CGPA</p>
                    <p className="text-sm text-muted-foreground">Display your academic score (for students)</p>
                  </div>
                  <Switch 
                    checked={visibility.showCgpa}
                    onCheckedChange={(c) => handleVisibilityChange('showCgpa', c)}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={handleSaveVisibility} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                Save Visibility Settings
              </Button>
            </div>
          </motion.div>
        )}

        {/* Job Preferences */}
        {activeTab === 'job' && (
          <motion.div variants={itemVariants} className="space-y-6">
            {/* Preferred Roles */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-primary" />
                  Preferred Roles
                </CardTitle>
                <CardDescription>
                  What kind of positions are you looking for?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {COMMON_ROLES.map(role => (
                    <button
                      key={role}
                      onClick={() => {
                        const roles = jobPreferences.preferredRoles
                        if (roles.includes(role)) {
                          handleJobPreferenceChange('preferredRoles', roles.filter(r => r !== role))
                        } else {
                          handleJobPreferenceChange('preferredRoles', [...roles, role])
                        }
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-sm transition-all",
                        jobPreferences.preferredRoles.includes(role)
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80 text-muted-foreground"
                      )}
                    >
                      {role}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={customRole}
                    onChange={(e) => setCustomRole(e.target.value)}
                    placeholder="Add custom role..."
                    className="max-w-xs"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddRole()}
                  />
                  <Button variant="outline" onClick={handleAddRole}>Add</Button>
                </div>
              </CardContent>
            </Card>

            {/* Location & Remote */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Location Preferences
                </CardTitle>
                <CardDescription>
                  Where do you want to work?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="text-sm font-medium mb-2 block">Remote Preference</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { value: 'FLEXIBLE', label: 'Flexible', desc: 'Open to all' },
                      { value: 'REMOTE_ONLY', label: 'Remote', desc: 'Work from home' },
                      { value: 'HYBRID', label: 'Hybrid', desc: 'Mix of both' },
                      { value: 'ONSITE_ONLY', label: 'On-site', desc: 'Office only' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleJobPreferenceChange('remotePreference', option.value)}
                        className={cn(
                          "p-3 rounded-lg border-2 transition-all text-center",
                          jobPreferences.remotePreference === option.value
                            ? "border-primary bg-primary/5"
                            : "border-muted hover:border-primary/50"
                        )}
                      >
                        <p className="font-medium text-sm">{option.label}</p>
                        <p className="text-xs text-muted-foreground">{option.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Preferred Locations</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {jobPreferences.preferredLocations.map(loc => (
                      <Badge 
                        key={loc} 
                        variant="secondary"
                        className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => handleJobPreferenceChange(
                          'preferredLocations', 
                          jobPreferences.preferredLocations.filter(l => l !== loc)
                        )}
                      >
                        {loc} ×
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={customLocation}
                      onChange={(e) => setCustomLocation(e.target.value)}
                      placeholder="Add location (e.g., Bangalore, Mumbai)..."
                      className="max-w-xs"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddLocation()}
                    />
                    <Button variant="outline" onClick={handleAddLocation}>Add</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Salary & Availability */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Salary & Availability
                </CardTitle>
                <CardDescription>
                  Your compensation expectations and availability
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Currency</label>
                    <Select 
                      value={jobPreferences.salaryCurrency}
                      onValueChange={(v) => handleJobPreferenceChange('salaryCurrency', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INR">₹ INR</SelectItem>
                        <SelectItem value="USD">$ USD</SelectItem>
                        <SelectItem value="EUR">€ EUR</SelectItem>
                        <SelectItem value="GBP">£ GBP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Min Salary (Annual)</label>
                    <Input
                      type="number"
                      value={jobPreferences.expectedSalaryMin || ''}
                      onChange={(e) => handleJobPreferenceChange('expectedSalaryMin', e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="e.g., 800000"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Max Salary (Annual)</label>
                    <Input
                      type="number"
                      value={jobPreferences.expectedSalaryMax || ''}
                      onChange={(e) => handleJobPreferenceChange('expectedSalaryMax', e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="e.g., 1500000"
                    />
                  </div>
                </div>

                <Separator />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Available From
                    </label>
                    <Input
                      type="date"
                      value={jobPreferences.availableFrom || ''}
                      onChange={(e) => handleJobPreferenceChange('availableFrom', e.target.value || null)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Notice Period (Days)
                    </label>
                    <Input
                      type="number"
                      value={jobPreferences.noticePeriodDays || ''}
                      onChange={(e) => handleJobPreferenceChange('noticePeriodDays', parseInt(e.target.value) || 0)}
                      placeholder="e.g., 30"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Job Types */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-primary" />
                  Job Types
                </CardTitle>
                <CardDescription>
                  What type of employment are you looking for?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {JOB_TYPES.map(type => (
                    <button
                      key={type}
                      onClick={() => {
                        const types = jobPreferences.preferredJobTypes
                        if (types.includes(type)) {
                          handleJobPreferenceChange('preferredJobTypes', types.filter(t => t !== type))
                        } else {
                          handleJobPreferenceChange('preferredJobTypes', [...types, type])
                        }
                      }}
                      className={cn(
                        "px-4 py-2 rounded-lg font-medium transition-all",
                        jobPreferences.preferredJobTypes.includes(type)
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80 text-muted-foreground"
                      )}
                    >
                      {type.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={handleSaveJobPreferences} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                Save Job Preferences
              </Button>
            </div>
          </motion.div>
        )}

        {/* Skill Showcase */}
        {activeTab === 'skills' && (
          <motion.div variants={itemVariants} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Highlighted Skills
                  <Badge variant="outline" className="ml-2">
                    {skills.filter(s => s.isHighlighted).length}/7
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Choose up to 7 skills to highlight on your profile. These will be prominently displayed to recruiters.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {skills.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Code2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No skills found. Add projects to auto-detect skills.</p>
                    </div>
                  ) : (
                    skills.map((skill) => (
                      <div
                        key={skill.id}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg border transition-all",
                          skill.isHighlighted
                            ? "bg-primary/5 border-primary"
                            : "bg-muted/50 border-muted hover:border-primary/30"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleToggleSkillHighlight(skill)}
                            className={cn(
                              "h-8 w-8 rounded-full flex items-center justify-center transition-all",
                              skill.isHighlighted
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted hover:bg-primary/20"
                            )}
                          >
                            <Star className={cn(
                              "h-4 w-4",
                              skill.isHighlighted && "fill-current"
                            )} />
                          </button>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{skill.name}</span>
                              {skill.isVerified && (
                                <Badge variant="secondary" className="text-xs">
                                  <Zap className="h-3 w-3 mr-1" />
                                  Verified
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {skill.category} • Score: {skill.verifiedScore}%
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              // Toggle skill visibility
                            }}
                            className={cn(
                              "p-2 rounded-lg transition-all",
                              skill.showToRecruiters
                                ? "text-muted-foreground hover:text-foreground"
                                : "text-destructive"
                            )}
                            title={skill.showToRecruiters ? "Visible to recruiters" : "Hidden from recruiters"}
                          >
                            {skill.showToRecruiters ? (
                              <Eye className="h-4 w-4" />
                            ) : (
                              <EyeOff className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Project Visibility */}
        {activeTab === 'projects' && (
          <motion.div variants={itemVariants} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code2 className="h-5 w-5 text-primary" />
                  Project Visibility
                  <Badge variant="outline" className="ml-2">
                    {projects.filter(p => p.isPinned).length}/3 Pinned
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Control which projects are visible to recruiters. Pin your best 3 projects to showcase them prominently.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {projects.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Code2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No projects found. Add projects from GitHub.</p>
                      <Link to="/projects">
                        <Button variant="outline" className="mt-4">
                          Go to Projects
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    projects.map((project) => (
                      <div
                        key={project.id}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-lg border transition-all",
                          project.isPinned
                            ? "bg-amber-500/5 border-amber-500/50"
                            : !project.showToRecruiters
                            ? "bg-muted/30 border-muted opacity-60"
                            : "bg-muted/50 border-muted hover:border-primary/30"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => handleToggleProjectPin(project)}
                              className={cn(
                                "p-2 rounded-lg transition-all",
                                project.isPinned
                                  ? "bg-amber-500 text-white"
                                  : "bg-muted hover:bg-amber-500/20"
                              )}
                              title={project.isPinned ? "Pinned" : "Pin this project"}
                            >
                              <Pin className={cn("h-4 w-4", project.isPinned && "fill-current")} />
                            </button>
                            <button
                              onClick={() => handleToggleProjectVisibility(project)}
                              className={cn(
                                "p-2 rounded-lg transition-all",
                                project.showToRecruiters
                                  ? "text-muted-foreground hover:text-foreground"
                                  : "bg-destructive/10 text-destructive"
                              )}
                              title={project.showToRecruiters ? "Hide from recruiters" : "Show to recruiters"}
                            >
                              {project.showToRecruiters ? (
                                <Eye className="h-4 w-4" />
                              ) : (
                                <EyeOff className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">{project.repoName}</span>
                              {project.language && (
                                <Badge variant="outline" className="text-xs">
                                  {project.language}
                                </Badge>
                              )}
                              {project.isPinned && (
                                <Badge className="bg-amber-500 text-white text-xs">
                                  Pinned
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {project.description || 'No description'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 ml-4">
                          <div className="text-right">
                            <p className="text-sm font-medium">Score</p>
                            <p className={cn(
                              "text-lg font-bold",
                              project.overallScore >= 70 ? "text-emerald-500" :
                              project.overallScore >= 50 ? "text-amber-500" : "text-destructive"
                            )}>
                              {project.overallScore}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Tips Card */}
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Tips for Better Visibility
                </h3>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2">
                    <Pin className="h-4 w-4 text-amber-500 mt-0.5" />
                    <span>Pin your top 3 projects that best represent your skills</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <EyeOff className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span>Hide experimental or incomplete projects from recruiters</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Star className="h-4 w-4 text-primary mt-0.5" />
                    <span>Highlight skills that match your target job roles</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
