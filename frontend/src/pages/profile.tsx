/**
 * Developer Profile - ULTRA PREMIUM EDITION
 * Stunning design with GitHub stats, animations, and comprehensive details
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/auth-store'
import { useUserStore } from '@/store/user-store'
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
import { getInitials, formatNumber, cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import type { VerifiedSkill } from '@/types'
import {
  MapPin,
  Building,
  Link as LinkIcon,
  GitFork,
  Star,
  Share2,
  Download,
  FolderGit2,
  Loader2,
  Github,
  CheckCircle,
  Edit3,
  Sparkles,
  Code,
  Save,
  ExternalLink,
  Users,
  Calendar,
  Zap,
  Trophy,
} from 'lucide-react'
import { motion } from 'framer-motion'

// --- Reusable Components ---

function GlassCard({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm",
        className
      )}
    >
      {children}
    </motion.div>
  )
}

function StatCard({ 
  icon, 
  label, 
  value, 
  gradient = "from-primary to-primary/70",
  delay = 0 
}: { 
  icon: React.ReactNode
  label: string
  value: string | number
  gradient?: string
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay }}
      className="group relative p-4 rounded-xl border border-border bg-card/50 hover:border-primary/30 hover:bg-primary/5 transition-all"
    >
      <div className="flex items-center gap-3">
        <div className={cn("p-2.5 rounded-xl bg-gradient-to-br text-white shadow-lg", gradient)}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </motion.div>
  )
}

function SkillBadge({ skill }: { skill: VerifiedSkill }) {
  const percentage = skill.verifiedScore || skill.score || 0
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05 }}
      className="group"
    >
      <Badge
        variant="outline"
        className={cn(
          "px-3 py-1.5 text-sm backdrop-blur-sm transition-all cursor-default",
          "bg-primary/5 border-primary/20 hover:bg-primary/10 hover:border-primary/40"
        )}
      >
        <span className="font-medium text-foreground">{skill.name}</span>
        <div className="mx-2 h-3 w-px bg-border" />
        <span className={cn(
          "text-xs font-bold",
          percentage >= 80 ? "text-emerald-500" :
          percentage >= 60 ? "text-primary" :
          percentage >= 40 ? "text-amber-500" : "text-muted-foreground"
        )}>
          {percentage}%
        </span>
        {skill.isVerified && (
          <CheckCircle className="w-3 h-3 ml-1.5 text-emerald-500" />
        )}
      </Badge>
    </motion.div>
  )
}

export default function Profile() {
  const { user } = useAuthStore()
  const { 
    aura, 
    projects,
    isLoadingAura, 
    fetchAura, 
    fetchGitHubRepos,
    fetchProjects,
  } = useUserStore()
  
  const [skills, setSkills] = useState<VerifiedSkill[]>([])
  const [isLoadingSkills, setIsLoadingSkills] = useState(false)

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

  useEffect(() => {
    fetchAura()
    fetchGitHubRepos()
    fetchProjects()
    fetchSkills()
  }, [fetchAura, fetchGitHubRepos, fetchProjects])

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

  if (!user) return null

  const handleShare = () => {
    const url = `${window.location.origin}/u/${user.username}`
    navigator.clipboard.writeText(url)
    toast({ title: 'Link copied! 🔗', description: 'Profile URL copied to clipboard.' })
  }

  const handleSaveProfile = async () => {
    setIsSaving(true)
    try {
      await apiClient.put('/v1/users/me', editForm)
      setIsEditDialogOpen(false)
      const { checkAuth } = useAuthStore.getState()
      await checkAuth()
      await fetchAura()
      toast({ title: 'Profile saved! ✅', description: 'Your profile has been updated.' })
    } catch (e: any) {
      const errorMsg = e?.response?.data?.message || 'Failed to update profile'
      toast({ variant: 'destructive', title: 'Save failed', description: errorMsg })
    } finally {
      setIsSaving(false)
    }
  }

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

  // Calculate GitHub stats from user data
  const totalStars = projects.reduce((sum: number, p: any) => sum + (p.stars || 0), 0)
  const totalForks = projects.reduce((sum: number, p: any) => sum + (p.forks || 0), 0)
  const memberSince = user.createdAt ? new Date(user.createdAt).getFullYear() : 'N/A'

  return (
    <div className="min-h-full space-y-6 animate-in fade-in duration-500">
      
      {/* ========== HERO PROFILE CARD ========== */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card via-card to-card/80">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/2 -right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-1/4 -left-1/4 w-72 h-72 bg-primary/3 rounded-full blur-3xl" />
        </div>
        
        <div className="relative p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row gap-6">
            
            {/* Left: Avatar & Basic Info */}
            <div className="flex flex-col items-center lg:items-start gap-4 lg:w-64">
              {/* Premium Avatar */}
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary via-primary/50 to-primary rounded-full blur opacity-30 group-hover:opacity-50 transition-opacity" />
                <Avatar className="relative h-32 w-32 lg:h-36 lg:w-36 border-4 border-card shadow-2xl">
                  <AvatarImage src={user.avatarUrl} alt={user.name} />
                  <AvatarFallback className="text-3xl bg-gradient-to-br from-primary to-primary/70 text-white font-bold">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-2 -right-2 p-2 rounded-full bg-card border border-border shadow-lg">
                  <Github className="h-5 w-5 text-foreground" />
                </div>
              </div>

              {/* Quick Stats under Avatar */}
              <div className="flex gap-4 text-center">
                <div>
                  <p className="text-xl font-bold text-foreground">{projects.length}</p>
                  <p className="text-xs text-muted-foreground">Projects</p>
                </div>
                <div className="w-px h-10 bg-border" />
                <div>
                  <p className="text-xl font-bold text-foreground">{formatNumber(totalStars)}</p>
                  <p className="text-xs text-muted-foreground">Stars</p>
                </div>
                <div className="w-px h-10 bg-border" />
                <div>
                  <p className="text-xl font-bold text-primary">{user.auraScore || 0}</p>
                  <p className="text-xs text-muted-foreground">Aura</p>
                </div>
              </div>
            </div>
            
            {/* Center: Name, Bio, Details */}
            <div className="flex-1 space-y-4 text-center lg:text-left">
              {/* Name & Badges */}
              <div>
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mb-2">
                  <h1 className="text-3xl lg:text-4xl font-bold text-foreground">
                    {user.name || user.username}
                  </h1>
                  {user.auraScore > 100 && (
                    <Badge className="bg-gradient-to-r from-primary to-primary/80 text-white border-0 shadow-lg shadow-primary/30">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                  {(user as any).hireable && (
                    <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                      <Zap className="h-3 w-3 mr-1" />
                      Open to Work
                    </Badge>
                  )}
                </div>
                
                <p className="text-lg text-muted-foreground">@{user.username}</p>
              </div>

              {/* Bio */}
              {user.bio && (
                <p className="text-foreground/80 max-w-2xl text-lg leading-relaxed">
                  {user.bio}
                </p>
              )}

              {/* Meta Info Grid */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-x-6 gap-y-2 text-sm text-muted-foreground">
                {user.location && (
                  <span className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                    <MapPin className="h-4 w-4 text-primary/70" />
                    {user.location}
                  </span>
                )}
                {user.company && (
                  <span className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                    <Building className="h-4 w-4 text-primary/70" />
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
                    <LinkIcon className="h-4 w-4 text-primary/70" />
                    Website
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {user.email && (
                  <span className="flex items-center gap-1.5">
                    <span className="text-primary/70">@</span>
                    {user.email}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-primary/70" />
                  Joined {memberSince}
                </span>
              </div>

              {/* Followers/Following */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-4 pt-2">
                <span className="flex items-center gap-1.5 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <strong className="text-foreground">{formatNumber(user.followers || 0)}</strong>
                  <span className="text-muted-foreground">followers</span>
                </span>
                <span className="flex items-center gap-1.5 text-sm">
                  <span className="text-muted-foreground">·</span>
                  <strong className="text-foreground">{formatNumber(user.following || 0)}</strong>
                  <span className="text-muted-foreground">following</span>
                </span>
                <span className="flex items-center gap-1.5 text-sm">
                  <span className="text-muted-foreground">·</span>
                  <strong className="text-foreground">{user.publicRepos || projects.length}</strong>
                  <span className="text-muted-foreground">repos</span>
                </span>
              </div>
            </div>

            {/* Right: Action Buttons */}
            <div className="flex flex-row lg:flex-col gap-2 justify-center lg:min-w-[140px]">
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2 shadow-lg">
                    <Edit3 className="w-4 h-4" />
                    Edit Profile
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Edit Profile</DialogTitle>
                    <DialogDescription>Update your public developer profile.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Name</label>
                      <Input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Bio</label>
                      <Textarea value={editForm.bio} onChange={e => setEditForm({...editForm, bio: e.target.value})} rows={3} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <label className="text-sm font-medium">Location</label>
                        <Input value={editForm.location} onChange={e => setEditForm({...editForm, location: e.target.value})} />
                      </div>
                      <div className="grid gap-2">
                        <label className="text-sm font-medium">Company</label>
                        <Input value={editForm.company} onChange={e => setEditForm({...editForm, company: e.target.value})} />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveProfile} disabled={isSaving}>
                      {isSaving ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Save className="mr-2 h-4 w-4"/>}
                      Save
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button variant="outline" onClick={handleShare} className="gap-2">
                <Share2 className="w-4 h-4" />
                Share
              </Button>
              
              <Link to="/resume">
                <Button variant="ghost" className="w-full gap-2">
                  <Download className="w-4 h-4" />
                  Resume
                </Button>
              </Link>
              
              <a href={`https://github.com/${user.username}`} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" className="w-full gap-2">
                  <Github className="w-4 h-4" />
                  GitHub
                </Button>
              </a>
            </div>
          </div>

          {/* Profile Completeness */}
          {completenessScore < 100 && (
            <div className="mt-6 pt-6 border-t border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Profile Strength
                </span>
                <span className="text-sm text-muted-foreground">{completenessScore}%</span>
              </div>
              <Progress value={completenessScore} className="h-2" />
            </div>
          )}
        </div>
      </div>

      {/* ========== GITHUB STATS ROW ========== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<FolderGit2 className="h-5 w-5" />}
          label="Public Repos"
          value={user.publicRepos || projects.length}
          gradient="from-violet-500 to-purple-600"
          delay={0}
        />
        <StatCard
          icon={<Star className="h-5 w-5" />}
          label="Total Stars"
          value={formatNumber(totalStars)}
          gradient="from-amber-500 to-orange-600"
          delay={0.1}
        />
        <StatCard
          icon={<GitFork className="h-5 w-5" />}
          label="Total Forks"
          value={formatNumber(totalForks)}
          gradient="from-cyan-500 to-blue-600"
          delay={0.2}
        />
        <StatCard
          icon={<Trophy className="h-5 w-5" />}
          label="Aura Level"
          value={aura?.level || user.auraLevel || 1}
          gradient="from-primary to-primary/70"
          delay={0.3}
        />
      </div>

      {/* ========== VERIFIED SKILLS SECTION ========== */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Code className="w-5 h-5 text-primary" />
            Verified Skills
          </h3>
          <Badge variant="outline" className="text-xs bg-muted/50">
            {skills.length} Skills
          </Badge>
        </div>
        
        {isLoadingSkills ? (
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-9 w-24 rounded-md bg-muted/50 animate-pulse" />
            ))}
          </div>
        ) : skills.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <SkillBadge key={skill.name} skill={skill} />
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border/50">
            <Code className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm">No verified skills yet.</p>
            <p className="text-xs text-muted-foreground">Analyze a project to discover your skills.</p>
          </div>
        )}
      </GlassCard>

      {/* ========== TABS ========== */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-muted p-1 rounded-xl">
          <TabsTrigger value="overview" className="rounded-lg">Overview</TabsTrigger>
          <TabsTrigger value="projects" className="rounded-lg">Projects ({projects.length})</TabsTrigger>
          <TabsTrigger value="skills" className="rounded-lg">Skills ({skills.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Projects Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Top Projects */}
              <GlassCard className="p-6">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <FolderGit2 className="w-5 h-5 text-primary" />
                  Top Projects
                </h3>
                <div className="space-y-3">
                  {projects.slice(0, 4).map((project: any) => (
                    <Link key={project.id} to={`/projects/${project.id}`}>
                      <div className="group flex items-center justify-between p-4 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <FolderGit2 className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground group-hover:text-primary transition-colors">{project.name}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span className="px-1.5 py-0.5 rounded bg-muted">{project.language}</span>
                              <span className="flex items-center gap-1"><Star className="h-3 w-3 text-amber-500" /> {formatNumber(project.stars)}</span>
                              <span className="flex items-center gap-1"><GitFork className="h-3 w-3" /> {formatNumber(project.forks || 0)}</span>
                            </div>
                          </div>
                        </div>
                        {project.score && (
                          <Badge className="bg-primary/10 text-primary border-primary/20">
                            Aura +{project.score}
                          </Badge>
                        )}
                      </div>
                    </Link>
                  ))}
                  {projects.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <FolderGit2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No projects yet. Add some GitHub repositories!</p>
                    </div>
                  )}
                </div>
              </GlassCard>
            </div>

            {/* Aura Score Column */}
            <div>
              {isLoadingAura ? (
                <div className="h-64 flex items-center justify-center bg-muted rounded-2xl animate-pulse" />
              ) : aura ? (
                <AuraScoreCard
                  total={aura.total}
                  level={aura.level}
                  trend={aura.trend}
                  percentile={aura.percentile}
                  breakdown={aura.breakdown}
                  recentGains={aura.recentGains}
                />
              ) : null}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="projects">
          <GlassCard className="p-6">
            <div className="grid gap-4">
              {projects.map((project: any) => (
                <Link key={project.id} to={`/projects/${project.id}`}>
                  <div className="group flex items-center justify-between p-4 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <FolderGit2 className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{project.name}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">{project.description || 'No description'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="px-2 py-1 rounded bg-muted text-xs text-muted-foreground">{project.language}</span>
                      <span className="flex items-center gap-1 text-sm text-muted-foreground"><Star className="h-4 w-4 text-amber-500" /> {project.stars}</span>
                    </div>
                  </div>
                </Link>
              ))}
              {projects.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <FolderGit2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium mb-1">No projects yet</p>
                  <p className="text-sm">Connect your GitHub repositories to showcase your work.</p>
                </div>
              )}
            </div>
          </GlassCard>
        </TabsContent>

        <TabsContent value="skills">
          <GlassCard className="p-6">
            {skills.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {skills.map((skill) => (
                  <SkillBadge key={skill.name} skill={skill} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Code className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium mb-1">No verified skills yet</p>
                <p className="text-sm">Analyze your projects to automatically detect and verify your skills.</p>
              </div>
            )}
          </GlassCard>
        </TabsContent>
      </Tabs>
    </div>
  )
}
