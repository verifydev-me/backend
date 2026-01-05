import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/auth-store'
import { useUserStore } from '@/store/user-store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AuraScoreCard } from '@/components/aura/AuraScoreCard'
import { apiClient } from '@/api/client'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  getInitials,
  formatNumber,
} from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import type { GitHubRepo, Experience, ExperiencesGrouped, VerifiedSkill, ExperienceType } from '@/types'
import {
  MapPin,
  Building,
  Link as LinkIcon,
  Twitter,
  GitFork,
  Star,
  Share2,
  Download,
  FolderGit2,
  Loader2,
  RefreshCw,
  Github,
  Plus,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Edit3,
  GraduationCap,
  Briefcase,
  Award,
  Heart,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Code,
  Calendar,
  Save,
  X,
  Zap,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// Skill category colors - refined for premium aesthetic
const skillCategoryColors: Record<string, string> = {
  LANGUAGE: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  FRAMEWORK: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  DATABASE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  DEVOPS: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  TOOL: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  OTHER: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  // New extreme-level categories
  architecture: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  infrastructure: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  database: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  messaging: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  security: 'bg-red-500/10 text-red-400 border-red-500/20',
  devops: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  observability: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  testing: 'bg-lime-500/10 text-lime-400 border-lime-500/20',
  language: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  framework: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  cloud: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  performance: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  ml: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20',
  data_science: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
}

// Experience type icons
const experienceIcons: Record<string, React.ReactNode> = {
  WORK: <Briefcase className="h-5 w-5" />,
  EDUCATION: <GraduationCap className="h-5 w-5" />,
  CERTIFICATION: <Award className="h-5 w-5" />,
  VOLUNTEER: <Heart className="h-5 w-5" />,
}

export default function Profile() {
  const { user } = useAuthStore()
  const { 
    aura, 
    githubRepos, 
    projects,
    isLoadingAura, 
    isLoadingRepos,
    isLoadingProjects,
    fetchAura, 
    fetchGitHubRepos,
    fetchProjects,
    analyzeProject,
    syncGitHubProfile,
    error 
  } = useUserStore()
  
  const [analyzingRepo, setAnalyzingRepo] = useState<string | null>(null)
  const [analyzeSuccess, setAnalyzeSuccess] = useState<string | null>(null)
  const [skills, setSkills] = useState<VerifiedSkill[]>([])
  const [experiences, setExperiences] = useState<ExperiencesGrouped | null>(null)
  const [isLoadingSkills, setIsLoadingSkills] = useState(false)
  const [isLoadingExperiences, setIsLoadingExperiences] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    education: true,
    work: true,
    certifications: false,
  })

  // Edit profile state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    bio: '',
    location: '',
    company: '',
    website: '',
    twitterHandle: '',
  })
  const [isSaving, setIsSaving] = useState(false)

  // Add experience state
  const [isAddExperienceOpen, setIsAddExperienceOpen] = useState(false)
  const [newExperience, setNewExperience] = useState<{
    type: ExperienceType
    title: string
    organization: string
    location: string
    description: string
    startDate: string
    endDate: string
    isCurrent: boolean
    skills: string[]
  }>({
    type: 'WORK',
    title: '',
    organization: '',
    location: '',
    description: '',
    startDate: '',
    endDate: '',
    isCurrent: false,
    skills: [],
  })
  const [isSavingExperience, setIsSavingExperience] = useState(false)

  // Auto-fetch data on mount
  useEffect(() => {
    fetchAura()
    fetchGitHubRepos()
    fetchProjects()
    fetchSkills()
    fetchExperiences()
  }, [fetchAura, fetchGitHubRepos, fetchProjects])

  // Initialize edit form when user data is available
  useEffect(() => {
    if (user) {
      setEditForm({
        name: user.name || '',
        bio: user.bio || '',
        location: user.location || '',
        company: user.company || '',
        website: user.website || user.blog || '',
        twitterHandle: user.twitterUsername || user.twitter || '',
      })
    }
  }, [user])

  const fetchSkills = async () => {
    setIsLoadingSkills(true)
    try {
      const res = await apiClient.get<{ data: VerifiedSkill[] }>('/v1/users/me/skills')
      setSkills(res.data.data || [])
    } catch (e) {
      console.error('Failed to fetch skills:', e)
    } finally {
      setIsLoadingSkills(false)
    }
  }

  const fetchExperiences = async () => {
    setIsLoadingExperiences(true)
    try {
      const res = await apiClient.get<{ data: ExperiencesGrouped }>('/v1/experiences')
      setExperiences(res.data.data)
    } catch (e) {
      console.error('Failed to fetch experiences:', e)
    } finally {
      setIsLoadingExperiences(false)
    }
  }

  if (!user) return null

  const handleShare = () => {
    const url = `${window.location.origin}/u/${user.username}`
    navigator.clipboard.writeText(url)
  }

  const handleAnalyzeRepo = async (repo: GitHubRepo) => {
    setAnalyzingRepo(repo.full_name)
    setAnalyzeSuccess(null)
    try {
      await analyzeProject(repo.html_url)
      setAnalyzeSuccess(repo.full_name)
      setTimeout(() => setAnalyzeSuccess(null), 3000)
      // Refresh aura after analyzing
      fetchAura()
    } catch (e) {
      // Error is handled by the store
    } finally {
      setAnalyzingRepo(null)
    }
  }

  const handleRefreshRepos = async () => {
    await syncGitHubProfile()
    await fetchGitHubRepos()
  }

  const handleSaveProfile = async () => {
    setIsSaving(true)
    try {
      await apiClient.put('/v1/users/me', editForm)
      setIsEditDialogOpen(false)
      // Refresh user data and aura after profile update
      const { checkAuth } = useAuthStore.getState()
      await checkAuth()
      await fetchAura()
      toast({ title: 'Profile saved! ✅', description: 'Your profile has been updated successfully.' })
    } catch (e: any) {
      console.error('Failed to save profile:', e)
      const errorMsg = e?.response?.data?.message || 'Failed to update profile'
      toast({ variant: 'destructive', title: 'Save failed', description: errorMsg })
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddExperience = async () => {
    setIsSavingExperience(true)
    try {
      await apiClient.post('/v1/experiences', {
        ...newExperience,
        startDate: newExperience.startDate,
        endDate: newExperience.isCurrent ? null : newExperience.endDate,
      })
      setIsAddExperienceOpen(false)
      setNewExperience({
        type: 'WORK',
        title: '',
        organization: '',
        location: '',
        description: '',
        startDate: '',
        endDate: '',
        isCurrent: false,
        skills: [],
      })
      await fetchExperiences()
    } catch (e) {
      console.error('Failed to add experience:', e)
    } finally {
      setIsSavingExperience(false)
    }
  }

  const handleDeleteExperience = async (id: string) => {
    try {
      await apiClient.delete(`/v1/experiences/${id}`)
      await fetchExperiences()
    } catch (e) {
      console.error('Failed to delete experience:', e)
    }
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  // Check if a repo is already analyzed
  const isRepoAnalyzed = (repoUrl: string) => {
    return projects.some(p => p.repoUrl === repoUrl || p.url === repoUrl)
  }

  // Calculate profile completeness
  const calculateCompleteness = () => {
    let score = 0
    if (user.name) score += 15
    if (user.bio) score += 20
    if (user.location) score += 10
    if (user.avatarUrl) score += 15
    if (user.company) score += 10
    if (skills.length > 0) score += 15
    if (projects.length > 0) score += 15
    return score
  }

  const completenessScore = calculateCompleteness()

  // Skill sources mapping for tooltips
  const skillToProjects = projects.reduce((acc, p) => {
    const techs = [...((p as any).technologies || [])]
    if (p.language) techs.push(p.language)
    techs.forEach(t => {
      if (!acc[t]) acc[t] = []
      const projectName = p.name || (p as any).repoName || 'Unnamed Project'
      if (!acc[t].includes(projectName)) acc[t].push(projectName)
    })
    return acc
  }, {} as Record<string, string[]>)

  return (
    <div className="space-y-10 pb-12">
      {/* Refined Professional Header */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-3xl bg-card border border-border p-8 shadow-2xl backdrop-blur-md"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/20 rounded-full blur-[100px]" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-muted/30 rounded-full blur-[100px]" />
        
        <div className="relative flex flex-col md:flex-row gap-8 items-start">
          {/* Avatar with GitHub Badge */}
          <div className="relative group">
            <Avatar className="h-32 w-32 border-4 border-primary/30 shadow-2xl ring-4 ring-primary/10 group-hover:ring-primary/30 transition-all">
              <AvatarImage src={user.avatarUrl} alt={user.name} />
              <AvatarFallback className="text-3xl bg-gradient-to-br from-primary to-purple-500 text-white">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-2 -right-2 p-2 rounded-full bg-background border-2 border-border">
              <Github className="h-5 w-5" />
            </div>
          </div>

          {/* Profile Info */}
          <div className="flex-1 space-y-4">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div>
                <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  {user.name || user.username}
                </h1>
                <div className="flex items-center gap-3">
                  <p className="text-primary font-medium">@{user.username}</p>
                  {user.auraScore > 100 && (
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 animate-pulse-subtle py-0.5">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Verified Pro
                    </Badge>
                  )}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Edit3 className="h-4 w-4" />
                      Edit Profile
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Edit Profile</DialogTitle>
                      <DialogDescription>
                        Update your profile information. This helps recruiters find you.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <label className="text-sm font-medium">Name</label>
                        <Input
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          placeholder="Your full name"
                        />
                      </div>
                      <div className="grid gap-2">
                        <label className="text-sm font-medium">Bio</label>
                        <Textarea
                          value={editForm.bio}
                          onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                          placeholder="Tell us about yourself..."
                          rows={3}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <label className="text-sm font-medium">Location</label>
                          <Input
                            value={editForm.location}
                            onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                            placeholder="City, Country"
                          />
                        </div>
                        <div className="grid gap-2">
                          <label className="text-sm font-medium">Company</label>
                          <Input
                            value={editForm.company}
                            onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                            placeholder="Where you work"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <label className="text-sm font-medium">Website</label>
                          <Input
                            value={editForm.website}
                            onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                            placeholder="https://yoursite.com"
                          />
                        </div>
                        <div className="grid gap-2">
                          <label className="text-sm font-medium">Twitter</label>
                          <Input
                            value={editForm.twitterHandle}
                            onChange={(e) => setEditForm({ ...editForm, twitterHandle: e.target.value })}
                            placeholder="username"
                          />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSaveProfile} disabled={isSaving}>
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        Save Changes
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                
                <Button variant="outline" onClick={handleShare} className="gap-2">
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
                <Link to="/resume">
                  <Button className="gap-2 bg-primary hover:opacity-90 text-primary-foreground border-none shadow-lg shadow-primary/20">
                    <Download className="h-4 w-4" />
                    Generate Resume
                  </Button>
                </Link>
              </div>
            </div>

            {/* Bio */}
            {user.bio && (
              <p className="text-muted-foreground max-w-2xl">{user.bio}</p>
            )}

            {/* Meta Info */}
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {user.location && (
                <span className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                  <MapPin className="h-4 w-4" />
                  {user.location}
                </span>
              )}
              {user.company && (
                <span className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                  <Building className="h-4 w-4" />
                  {user.company}
                </span>
              )}
              {(user.blog || user.website) && (
                <a
                  href={user.blog || user.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 hover:text-primary transition-colors"
                >
                  <LinkIcon className="h-4 w-4" />
                  Website
                </a>
              )}
              {(user.twitterUsername || user.twitter) && (
                <a
                  href={`https://twitter.com/${user.twitterUsername || user.twitter}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 hover:text-primary transition-colors"
                >
                  <Twitter className="h-4 w-4" />@{user.twitterUsername || user.twitter}
                </a>
              )}
            </div>

            {/* Skill Tags - Auto-generated from verified skills */}
            <div className="flex flex-wrap gap-2">
              {(() => {
                // Get unique categories from skills
                const categories = [...new Set(skills.map(s => s.category))].slice(0, 5)
                if (categories.length === 0) {
                  return (
                    <Badge variant="outline" className="text-muted-foreground border-muted">
                      <Code className="h-3 w-3 mr-1" />
                      Add skills via projects
                    </Badge>
                  )
                }
                return categories.map((cat) => {
                  const catSkillCount = skills.filter(s => s.category === cat).length
                  const catColor = skillCategoryColors[cat] || skillCategoryColors['OTHER']
                  return (
                    <Badge key={cat} className={`${catColor} border font-medium`}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase()}
                      <span className="ml-1.5 text-xs opacity-70">({catSkillCount})</span>
                    </Badge>
                  )
                })
              })()}
            </div>
          </div>

          {/* Aura Score Mini Card */}
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="hidden lg:flex flex-col items-center justify-center p-6 rounded-2xl bg-background/60 border border-primary/30 backdrop-blur-xl min-w-[200px] shadow-2xl shadow-primary/10 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
            <Zap className="h-8 w-8 text-primary mb-2 relative z-10" />
            <p className="text-5xl font-black bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent relative z-10">
              {formatNumber(aura?.total || user.auraScore || 0)}
            </p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mt-1 relative z-10">Total Aura</p>
            {aura?.level && (
              <Badge className="mt-3 bg-primary text-primary-foreground font-bold border-none shadow-lg shadow-primary/20 relative z-10">
                {aura.level.toUpperCase()}
              </Badge>
            )}
          </motion.div>
        </div>
      </motion.div>

      {/* Error display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg p-4 flex items-center gap-2"
          >
            <AlertCircle className="h-5 w-5" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Completeness */}
      {completenessScore < 100 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
            <CardContent className="py-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <span className="font-medium text-foreground">Profile Completeness</span>
                </div>
                <span className="text-sm text-muted-foreground">{completenessScore}%</span>
              </div>
              <Progress value={completenessScore} className="h-2" />
              <p className="text-sm text-muted-foreground mt-2">
                Complete your profile to improve your visibility to recruiters.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Main Content with Tabs */}
      <Tabs defaultValue="overview" className="space-y-8">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="overview" className="data-[state=active]:bg-background">
            Overview
          </TabsTrigger>
          <TabsTrigger value="projects" className="data-[state=active]:bg-background">
            Projects ({projects.length})
          </TabsTrigger>
          <TabsTrigger value="skills" className="data-[state=active]:bg-background">
            Skills ({skills.length})
          </TabsTrigger>
          <TabsTrigger value="experience" className="data-[state=active]:bg-background">
            Experience
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6 space-y-8">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-8">
              {/* Skills Card */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Code className="h-5 w-5 text-primary" />
                      Verified Skills
                    </CardTitle>
                    <CardDescription>Skills verified from your projects</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingSkills ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : skills.length > 0 ? (
                    <TooltipProvider>
                      <div className="flex flex-wrap gap-2">
                        {skills.map((skill, index) => (
                          <motion.div
                            key={skill.name}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.03 }}
                            whileHover={{ y: -2 }}
                          >
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge
                                  variant="outline"
                                  className={`px-3 py-2 text-sm font-semibold rounded-lg border-2 transition-all shadow-sm flex items-center gap-2 cursor-help ${
                                    skillCategoryColors[skill.category] || skillCategoryColors.OTHER
                                  }`}
                                >
                                  <span className="text-foreground">{skill.name}</span>
                                  <div className="h-4 w-[1px] bg-foreground/20" />
                                  <span className="text-xs opacity-90">{skill.verifiedScore}%</span>
                                  {skill.isVerified && (
                                    <CheckCircle className="h-3 w-3 text-primary animate-pulse" />
                                  )}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent className="bg-popover/95 backdrop-blur-md border-primary/20 p-3 shadow-2xl min-w-[200px]">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <p className="font-bold text-primary">{skill.name}</p>
                                    <Badge variant="secondary" className="text-[10px] h-4">{skill.category}</Badge>
                                  </div>
                                  <div className="h-px bg-border/50" />
                                  <div className="space-y-1">
                                    <p className="text-[10px] uppercase text-muted-foreground font-bold italic">Source Projects:</p>
                                    <div className="flex flex-wrap gap-1">
                                      {skillToProjects[skill.name]?.map(proj => (
                                        <Badge key={proj} variant="outline" className="text-[10px] py-0 h-4 border-primary/20">
                                          {proj}
                                        </Badge>
                                      )) || <span className="text-[10px] text-muted-foreground">Auto-detected from ecosystem</span>}
                                    </div>
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </motion.div>
                        ))}
                      </div>
                    </TooltipProvider>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Code className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No verified skills yet.</p>
                      <p className="text-sm mt-1">Analyze your projects to unlock skill verification.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Projects */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FolderGit2 className="h-5 w-5 text-primary" />
                    Analyzed Projects
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingProjects ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : projects.length > 0 ? (
                    <div className="space-y-3">
                      {projects.slice(0, 4).map((project, idx) => (
                        <motion.div
                          key={project.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          whileHover={{ scale: 1.02, x: 5 }}
                          className="group flex items-center justify-between p-4 rounded-xl border border-border bg-card/30 hover:bg-primary/5 hover:border-primary/40 transition-all duration-300 backdrop-blur-sm"
                        >
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center border border-primary/20 group-hover:border-primary/40 transition-colors">
                              <FolderGit2 className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <p className="font-bold text-foreground group-hover:text-primary transition-colors">{project.name}</p>
                              <div className="flex items-center gap-3 mt-1">
                                <Badge variant="outline" className="text-[10px] py-0 px-2 h-5 bg-background/50 border-primary/20">
                                  {project.language}
                                </Badge>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Star className="h-3 w-3 text-yellow-500" />
                                  {formatNumber(project.stars)}
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <GitFork className="h-3 w-3" />
                                  {formatNumber(project.forks || 0)}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {project.score !== undefined && (
                              <div className="text-right">
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Aura Rank</p>
                                <p className="text-xl font-black text-primary">#{project.score}</p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No analyzed projects yet. Select a repository to analyze.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Aura Score */}
            <div className="space-y-6">
              {isLoadingAura ? (
                <Card>
                  <CardContent className="py-12">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                  </CardContent>
                </Card>
              ) : aura ? (
                <AuraScoreCard
                  total={aura.total}
                  level={aura.level}
                  trend={aura.trend}
                  percentile={aura.percentile}
                  breakdown={aura.breakdown}
                  recentGains={aura.recentGains}
                />
              ) : (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <p>Unable to load Aura score</p>
                    <Button variant="outline" className="mt-4" onClick={fetchAura}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-6">
          {/* GitHub Repositories */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Github className="h-5 w-5" />
                  GitHub Repositories
                </CardTitle>
                <CardDescription>Select projects to analyze and verify your skills</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefreshRepos}
                disabled={isLoadingRepos}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingRepos ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingRepos ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : githubRepos.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <AnimatePresence>
                    {githubRepos.slice(0, 12).map((repo, index) => {
                      const analyzed = isRepoAnalyzed(repo.html_url)
                      const isAnalyzing = analyzingRepo === repo.full_name
                      const justAnalyzed = analyzeSuccess === repo.full_name
                      
                      return (
                        <motion.div
                          key={repo.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={`p-4 rounded-xl border transition-all duration-300 ${
                            analyzed 
                              ? 'border-emerald-500/30 bg-emerald-500/5 shadow-lg shadow-emerald-500/5' 
                              : 'border-border bg-card hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <FolderGit2 className={`h-5 w-5 mt-0.5 ${analyzed ? 'text-emerald-400' : 'text-primary'}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <a 
                                  href={repo.html_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-bold truncate hover:text-primary text-foreground transition-colors flex items-center gap-1"
                                >
                                  {repo.name}
                                  <ExternalLink className="h-3 w-3 opacity-50" />
                                </a>
                                {analyzed && (
                                  <Badge variant="secondary" className="text-green-500 text-xs">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Analyzed
                                  </Badge>
                                )}
                              </div>
                              {repo.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                  {repo.description}
                                </p>
                              )}
                              <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                                {repo.language && (
                                  <span className="flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-primary" />
                                    {repo.language}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Star className="h-3 w-3" />
                                  {formatNumber(repo.stargazers_count)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <GitFork className="h-3 w-3" />
                                  {formatNumber(repo.forks_count)}
                                </span>
                              </div>
                              
                              {!analyzed && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="mt-3"
                                  onClick={() => handleAnalyzeRepo(repo)}
                                  disabled={isAnalyzing}
                                >
                                  {isAnalyzing ? (
                                    <>
                                      <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                                      Analyzing...
                                    </>
                                  ) : justAnalyzed ? (
                                    <>
                                      <CheckCircle className="h-3 w-3 mr-2 text-green-500" />
                                      Started!
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="h-3 w-3 mr-2" />
                                      Analyze Project
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Github className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No repositories found.</p>
                  <Button variant="outline" className="mt-4" onClick={handleRefreshRepos}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sync from GitHub
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Skills Tab */}
        <TabsContent value="skills" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Skills Overview</CardTitle>
              <CardDescription>
                Skills are automatically verified from your analyzed projects
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingSkills ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : skills.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {skills.map((skill, index) => (
                    <motion.div
                      key={skill.name}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-4 rounded-lg border ${
                        skillCategoryColors[skill.category] || skillCategoryColors.OTHER
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{skill.name}</span>
                        {(skill.score || 0) > 50 && (
                          <CheckCircle className="h-4 w-4 text-green-400" />
                        )}
                      </div>
                      <Progress value={skill.score || 0} className="h-1.5" />
                      <p className="text-xs text-muted-foreground mt-2">
                        Verified from {skill.evidence?.length || 0} projects
                      </p>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Code className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No skills verified yet.</p>
                  <p className="text-sm mt-1">Analyze your projects to unlock skill verification.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Experience Tab */}
        <TabsContent value="experience" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Experience & Education</h2>
            <Dialog open={isAddExperienceOpen} onOpenChange={setIsAddExperienceOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Experience
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Add Experience</DialogTitle>
                  <DialogDescription>
                    Add your work experience, education, or certifications.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Type</label>
                    <div className="flex flex-wrap gap-2">
                      {(['WORK', 'EDUCATION', 'CERTIFICATION', 'VOLUNTEER'] as const).map((type) => (
                        <Button
                          key={type}
                          variant={newExperience.type === type ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setNewExperience({ ...newExperience, type })}
                          className="gap-2"
                        >
                          {experienceIcons[type]}
                          {type.charAt(0) + type.slice(1).toLowerCase()}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Title / Degree</label>
                      <Input
                        value={newExperience.title}
                        onChange={(e) => setNewExperience({ ...newExperience, title: e.target.value })}
                        placeholder={newExperience.type === 'EDUCATION' ? 'B.Tech Computer Science' : 'Software Engineer'}
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Organization / College</label>
                      <Input
                        value={newExperience.organization}
                        onChange={(e) => setNewExperience({ ...newExperience, organization: e.target.value })}
                        placeholder={newExperience.type === 'EDUCATION' ? 'MIT' : 'Google'}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Location (Optional)</label>
                    <Input
                      value={newExperience.location}
                      onChange={(e) => setNewExperience({ ...newExperience, location: e.target.value })}
                      placeholder="City, Country"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Description (Optional)</label>
                    <Textarea
                      value={newExperience.description}
                      onChange={(e) => setNewExperience({ ...newExperience, description: e.target.value })}
                      placeholder="Describe your role, achievements, or learnings..."
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Start Date</label>
                      <Input
                        type="date"
                        value={newExperience.startDate}
                        onChange={(e) => setNewExperience({ ...newExperience, startDate: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">End Date</label>
                      <Input
                        type="date"
                        value={newExperience.endDate}
                        onChange={(e) => setNewExperience({ ...newExperience, endDate: e.target.value })}
                        disabled={newExperience.isCurrent}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isCurrent"
                      checked={newExperience.isCurrent}
                      onChange={(e) => setNewExperience({ ...newExperience, isCurrent: e.target.checked })}
                      className="h-4 w-4 rounded border-border"
                    />
                    <label htmlFor="isCurrent" className="text-sm">I currently work/study here</label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddExperienceOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddExperience} disabled={isSavingExperience || !newExperience.title || !newExperience.organization}>
                    {isSavingExperience ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {isLoadingExperiences ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : experiences && experiences.all.length > 0 ? (
            <div className="space-y-6">
              {/* Work Experience */}
              {experiences.work.length > 0 && (
                <Card>
                  <CardHeader 
                    className="cursor-pointer flex flex-row items-center justify-between"
                    onClick={() => toggleSection('work')}
                  >
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-blue-400" />
                      <CardTitle>Work Experience</CardTitle>
                      <Badge variant="secondary">{experiences.work.length}</Badge>
                    </div>
                    {expandedSections.work ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </CardHeader>
                  <AnimatePresence>
                    {expandedSections.work && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                      >
                        <CardContent className="space-y-4">
                          {experiences.work.map((exp) => (
                            <ExperienceItem key={exp.id} experience={exp} onDelete={handleDeleteExperience} />
                          ))}
                        </CardContent>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              )}

              {/* Education */}
              {experiences.education.length > 0 && (
                <Card>
                  <CardHeader 
                    className="cursor-pointer flex flex-row items-center justify-between"
                    onClick={() => toggleSection('education')}
                  >
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-green-400" />
                      <CardTitle>Education</CardTitle>
                      <Badge variant="secondary">{experiences.education.length}</Badge>
                    </div>
                    {expandedSections.education ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </CardHeader>
                  <AnimatePresence>
                    {expandedSections.education && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                      >
                        <CardContent className="space-y-4">
                          {experiences.education.map((exp) => (
                            <ExperienceItem key={exp.id} experience={exp} onDelete={handleDeleteExperience} />
                          ))}
                        </CardContent>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              )}

              {/* Certifications */}
              {experiences.certifications.length > 0 && (
                <Card>
                  <CardHeader 
                    className="cursor-pointer flex flex-row items-center justify-between"
                    onClick={() => toggleSection('certifications')}
                  >
                    <div className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-yellow-400" />
                      <CardTitle>Certifications</CardTitle>
                      <Badge variant="secondary">{experiences.certifications.length}</Badge>
                    </div>
                    {expandedSections.certifications ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </CardHeader>
                  <AnimatePresence>
                    {expandedSections.certifications && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                      >
                        <CardContent className="space-y-4">
                          {experiences.certifications.map((exp) => (
                            <ExperienceItem key={exp.id} experience={exp} onDelete={handleDeleteExperience} />
                          ))}
                        </CardContent>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No experience added yet.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Add your work experience, education, and certifications.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Experience Item Component
function ExperienceItem({ 
  experience, 
  onDelete 
}: { 
  experience: Experience
  onDelete: (id: string) => void 
}) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

  return (
    <div className="flex items-start gap-4 p-4 rounded-lg border border-border hover:border-primary/30 transition-colors group">
      <div className="p-2 rounded-lg bg-muted">
        {experienceIcons[experience.type]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="font-medium">{experience.title}</h4>
            <p className="text-sm text-muted-foreground">{experience.organization}</p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
            onClick={() => onDelete(experience.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>
            {formatDate(experience.startDate)} - {experience.isCurrent ? 'Present' : experience.endDate ? formatDate(experience.endDate) : 'Present'}
          </span>
          {experience.location && (
            <>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {experience.location}
              </span>
            </>
          )}
        </div>
        {experience.description && (
          <p className="text-sm text-muted-foreground mt-2">{experience.description}</p>
        )}
        {experience.skills.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {experience.skills.map((skill) => (
              <Badge key={skill} variant="secondary" className="text-xs">
                {skill}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
