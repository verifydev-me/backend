import { useEffect, useState } from 'react'
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
import type { GitHubRepo, Experience, ExperiencesGrouped, VerifiedSkill, ExperienceType } from '@/types'
import {
  MapPin,
  Building,
  Link as LinkIcon,
  Twitter,
  Users,
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

// Skill category colors
const skillCategoryColors: Record<string, string> = {
  LANGUAGE: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  FRAMEWORK: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  DATABASE: 'bg-green-500/20 text-green-400 border-green-500/30',
  DEVOPS: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  TOOL: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  OTHER: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
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
      // Refresh aura after profile update
      await fetchAura()
    } catch (e) {
      console.error('Failed to save profile:', e)
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

  return (
    <div className="space-y-6">
      {/* Premium Header with Gradient */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/30 via-purple-500/20 to-pink-500/10 p-8 border border-primary/20"
      >
        <div className="absolute inset-0 bg-grid-white/5" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
        
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
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold">{user.name || user.username}</h1>
                  {user.auraScore > 100 && (
                    <Badge className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400 border border-yellow-500/30">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground text-lg">@{user.username}</p>
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
                <Button className="gap-2 bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90">
                  <Download className="h-4 w-4" />
                  Generate Resume
                </Button>
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

            {/* GitHub Stats */}
            <div className="flex flex-wrap gap-6 text-sm">
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-primary" />
                <strong className="text-foreground">{formatNumber(user.followers)}</strong>
                <span className="text-muted-foreground">followers</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-primary" />
                <strong className="text-foreground">{formatNumber(user.following)}</strong>
                <span className="text-muted-foreground">following</span>
              </span>
              <span className="flex items-center gap-1.5">
                <FolderGit2 className="h-4 w-4 text-primary" />
                <strong className="text-foreground">{user.publicRepos}</strong>
                <span className="text-muted-foreground">repositories</span>
              </span>
            </div>
          </div>

          {/* Aura Score Mini Card */}
          <div className="hidden lg:flex flex-col items-center justify-center p-6 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/20 backdrop-blur-sm min-w-[180px]">
            <Zap className="h-8 w-8 text-primary mb-2" />
            <p className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
              {formatNumber(aura?.total || user.auraScore || 0)}
            </p>
            <p className="text-sm text-muted-foreground">Aura Score</p>
            {aura?.level && (
              <Badge variant="secondary" className="mt-2">
                {aura.level}
              </Badge>
            )}
          </div>
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
          <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
            <CardContent className="py-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <span className="font-medium">Profile Completeness</span>
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
      <Tabs defaultValue="overview" className="space-y-6">
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
        <TabsContent value="overview" className="space-y-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
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
                    <div className="flex flex-wrap gap-2">
                      {skills.map((skill, index) => (
                        <motion.div
                          key={skill.name}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <Badge
                            variant="outline"
                            className={`px-3 py-1.5 text-sm font-medium ${
                              skillCategoryColors[skill.category] || skillCategoryColors.OTHER
                            }`}
                          >
                            {skill.name}
                            {skill.score > 50 && (
                              <CheckCircle className="h-3 w-3 ml-1.5" />
                            )}
                          </Badge>
                        </motion.div>
                      ))}
                    </div>
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
                      {projects.slice(0, 4).map((project) => (
                        <motion.div
                          key={project.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <FolderGit2 className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{project.name}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-2">
                                <span>{project.language}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Star className="h-3 w-3" />
                                  {formatNumber(project.stars)}
                                </span>
                              </p>
                            </div>
                          </div>
                          {project.score !== undefined && (
                            <Badge variant="secondary">
                              Score: {project.score}/100
                            </Badge>
                          )}
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
                          className={`p-4 rounded-lg border transition-all ${
                            analyzed 
                              ? 'border-green-500/30 bg-green-500/5' 
                              : 'border-border hover:border-primary/50 hover:shadow-lg'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <FolderGit2 className={`h-5 w-5 mt-0.5 ${analyzed ? 'text-green-500' : 'text-primary'}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <a 
                                  href={repo.html_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-medium truncate hover:text-primary flex items-center gap-1"
                                >
                                  {repo.name}
                                  <ExternalLink className="h-3 w-3" />
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
                        {skill.score > 50 && (
                          <CheckCircle className="h-4 w-4 text-green-400" />
                        )}
                      </div>
                      <Progress value={skill.score} className="h-1.5" />
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
