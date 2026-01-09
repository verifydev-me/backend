/**
 * Career Profile - Manage your professional identity
 * Add experience, certifications, and claim skills.
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/auth-store'
import { useUserStore } from '@/store/user-store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AuraScoreCard } from '@/components/aura/AuraScoreCard'
import { get, post, put, del } from '@/api/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

import { getInitials, cn, formatNumber } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import type { VerifiedSkill } from '@/types'
import {
  MapPin,
  Building,
  Link as LinkIcon,
  Star,
  Download,
  FolderGit2,
  CheckCircle,
  Edit3,
  Sparkles,
  Code,
  Plus,
  Briefcase,
  Award,
  Trash2,
  GraduationCap,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

// --- Types ---
interface Experience {
  id: string
  type: 'WORK' | 'EDUCATION' | 'CERTIFICATION' | 'VOLUNTEER'
  title: string
  organization: string
  startDate: string
  endDate?: string
  description?: string
  isCurrent: boolean
}

// --- Reusable Components ---

function GlassCard({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        "relative overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm",
        className
      )}
    >
      {children}
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
        {percentage > 0 && (
            <>
                <div className="mx-2 h-3 w-px bg-border" />
                <span className={cn(
                "text-xs font-bold",
                percentage >= 80 ? "text-emerald-500" :
                percentage >= 60 ? "text-primary" :
                percentage >= 40 ? "text-amber-500" : "text-muted-foreground"
                )}>
                {percentage}%
                </span>
            </>
        )}
        {skill.isVerified && (
          <CheckCircle className="w-3 h-3 ml-1.5 text-emerald-500" />
        )}
        {!skill.isVerified && (
           <span className="ml-1.5 text-xs text-muted-foreground">(Claimed)</span> 
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
    fetchAura, 
    fetchGitHubRepos,
    fetchProjects,
  } = useUserStore()
  
  const [skills, setSkills] = useState<VerifiedSkill[]>([])
  const [, setIsLoadingSkills] = useState(false)
  const [experiences, setExperiences] = useState<{ work: Experience[], education: Experience[], certifications: Experience[] }>({ work: [], education: [], certifications: [] })
  const [, setIsLoadingExp] = useState(false)

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

  // Experience Dialog
  const [isExpDialogOpen, setIsExpDialogOpen] = useState(false)
  const [expForm, setExpForm] = useState<Partial<Experience>>({ type: 'WORK', isCurrent: false })



  useEffect(() => {
    fetchAura()
    fetchGitHubRepos()
    fetchProjects()
    fetchSkills()
    fetchExperience()
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
      const res = await get<{ data: VerifiedSkill[] }>('/v1/users/me/skills') // Assuming this endpoint returns all skills (verified + manual)
      setSkills(res?.data || [])
    } catch (e) {
      console.error('Failed to fetch skills:', e)
    } finally {
      setIsLoadingSkills(false)
    }
  }

  const fetchExperience = async () => {
    setIsLoadingExp(true)
    try {
        const res = await get<{ work: Experience[], education: Experience[], certifications: Experience[] }>('/v1/experiences')
        setExperiences(res)
    } catch (e) {
        console.error('Failed to fetch experience', e)
    } finally {
        setIsLoadingExp(false)
    }
  }

  if (!user) return null

  const handleSaveProfile = async () => {
    setIsSaving(true)
    try {
      await put('/v1/users/me', editForm)
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



  const handleSaveExperience = async () => {
      setIsSaving(true)
      try {
          // Assuming single endpoint for add/update based on ID presence, or POST for new
          await post('/v1/experiences', expForm)
          toast({ title: 'Experience added!', description: 'Your timeline has been updated.' })
          setIsExpDialogOpen(false)
          setExpForm({ type: 'WORK', isCurrent: false }) // Reset
          fetchExperience()
      } catch (e) {
          toast({ variant: 'destructive', title: 'Error', description: 'Failed to save experience.' })
      } finally {
          setIsSaving(false)
      }
  }

  const deleteExperience = async (id: string) => {
      if(!confirm('Are you sure?')) return
      try {
          await del(`/v1/experiences/${id}`)
          toast({ title: 'Removed', description: 'Item deleted.' })
          fetchExperience()
      } catch (e) {
          toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete.' })
      }
  }

  // Calculate GitHub stats from user data
  const totalStars = projects.reduce((sum: number, p: any) => sum + (p.stars || 0), 0)

  return (
    <div className="min-h-full space-y-6 animate-in fade-in duration-500">
      
      {/* ========== HERO PROFILE CARD ========== */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-card/80">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/2 -right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-1/4 -left-1/4 w-72 h-72 bg-primary/3 rounded-full blur-3xl" />
        </div>
        
        <div className="relative p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row gap-6">
            
            {/* Left: Avatar & Basic Info */}
            <div className="flex flex-col items-center lg:items-start gap-4 lg:w-64">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary via-primary/50 to-primary rounded-full blur opacity-30 group-hover:opacity-50 transition-opacity" />
                <Avatar className="relative h-32 w-32 lg:h-36 lg:w-36 border-4 border-card shadow-2xl">
                  <AvatarImage src={user.avatarUrl} alt={user.name} />
                  <AvatarFallback className="text-3xl bg-gradient-to-br from-primary to-primary/70 text-white font-bold">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Quick Stats */}
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
            
              {/* Center: Info */}
              <div className="flex-1 space-y-4 text-center lg:text-left">
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
                  </div>
                  <p className="text-lg text-muted-foreground">@{user.username}</p>
                  
                  {/* Primary Role Badge - System Inferred */}
                  {user.primaryRole && (
                    <div className="mt-3 flex flex-wrap gap-2 justify-center lg:justify-start">
                      <Badge className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0 px-3 py-1 text-sm shadow-md">
                        <Code className="h-3.5 w-3.5 mr-1.5" />
                        {user.primaryRole}
                      </Badge>
                      {user.nicheConfidence && user.nicheConfidence > 70 && (
                        <Badge variant="outline" className="border-green-500/30 text-green-600 dark:text-green-400 bg-green-500/5">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {user.nicheConfidence}% Match
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  {/* Auto-generated Tags - Non-editable */}
                  {user.autoTags && user.autoTags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3 justify-center lg:justify-start">
                      {user.autoTags.map((tag: string) => (
                        <Badge key={tag} variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  {/* Legacy tags display fallback */}
                  {(!user.autoTags || user.autoTags.length === 0) && user.tags && user.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2 justify-center lg:justify-start">
                          {user.tags.map((tag: string) => (
                              <Badge key={tag} variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                                  {tag}
                              </Badge>
                          ))}
                      </div>
                  )}
                </div>

              {user.bio && (
                  <p className="text-foreground/80 max-w-2xl text-lg leading-relaxed">{user.bio}</p>
              )}

              <div className="flex flex-wrap justify-center lg:justify-start gap-x-6 gap-y-2 text-sm text-muted-foreground">
                {user.location && (
                  <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4"/> {user.location}</span>
                )}
                {user.company && (
                  <span className="flex items-center gap-1.5"><Building className="h-4 w-4"/> {user.company}</span>
                )}
                {user.website && (
                  <a href={user.website} target="_blank" className="flex items-center gap-1.5 hover:text-primary"><LinkIcon className="h-4 w-4"/> Website</a>
                )}
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex flex-row lg:flex-col gap-2 justify-center lg:min-w-[140px]">
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2 shadow-lg"><Edit3 className="w-4 h-4"/> Edit Profile</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Profile</DialogTitle>
                    <DialogDescription>Update your public details.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2"><Label>Name</Label><Input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} /></div>
                    <div className="grid gap-2"><Label>Bio</Label><Textarea value={editForm.bio} onChange={e => setEditForm({...editForm, bio: e.target.value})} /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2"><Label>Location</Label><Input value={editForm.location} onChange={e => setEditForm({...editForm, location: e.target.value})} /></div>
                      <div className="grid gap-2"><Label>Company</Label><Input value={editForm.company} onChange={e => setEditForm({...editForm, company: e.target.value})} /></div>
                    </div>
                     <div className="grid gap-2"><Label>Website</Label><Input value={editForm.website} onChange={e => setEditForm({...editForm, website: e.target.value})} /></div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleSaveProfile} disabled={isSaving}>Save</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              
               <Link to="/resume">
                <Button variant="ghost" className="w-full gap-2"><Download className="w-4 h-4" /> Resume</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ========== TABS ========== */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-muted p-1 rounded-xl">
          <TabsTrigger value="overview" className="rounded-lg">Overview</TabsTrigger>
          <TabsTrigger value="experience" className="rounded-lg">Experience</TabsTrigger>
          <TabsTrigger value="projects" className="rounded-lg">Projects</TabsTrigger>
          <TabsTrigger value="skills" className="rounded-lg">Skills</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
             <div className="grid lg:grid-cols-3 gap-6">
                 <div className="lg:col-span-2 space-y-6">
                    <GlassCard className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold flex items-center gap-2">
                                <Code className="w-5 h-5 text-primary"/> Skills
                            </h3>
                            <Button variant="ghost" size="sm" onClick={() => document.getElementById('tab-skills')?.click()}>View All</Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {skills.slice(0, 10).map(s => <SkillBadge key={s.name} skill={s} />)}
                            {skills.length === 0 && <span className="text-muted-foreground text-sm">No skills yet.</span>}
                        </div>
                    </GlassCard>
                    
                    <GlassCard className="p-6">
                        <h3 className="font-semibold mb-4 flex items-center gap-2"><Briefcase className="w-5 h-5 text-primary"/> Recent Experience</h3>
                         <div className="space-y-4">
                             {experiences.work.slice(0, 2).map(exp => (
                                 <div key={exp.id} className="flex gap-4">
                                     <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                         <Briefcase className="h-5 w-5 text-primary"/>
                                     </div>
                                     <div>
                                         <p className="font-medium">{exp.title}</p>
                                         <p className="text-sm text-muted-foreground">{exp.organization}</p>
                                     </div>
                                 </div>
                             ))}
                             {experiences.work.length === 0 && <p className="text-muted-foreground text-sm">No work experience added.</p>}
                         </div>
                    </GlassCard>
                 </div>
                 
                 <div>
                    <AuraScoreCard 
                      total={aura?.total ?? 0}
                      level={aura?.level ?? 'Beginner'}
                      trend={aura?.trend ?? 'stable'}
                      percentile={aura?.percentile ?? 0}
                      breakdown={aura?.breakdown ?? { profile: 0, projects: 0, skills: 0, activity: 0, github: 0 }}
                      recentGains={aura?.recentGains}
                    />
                 </div>
             </div>
        </TabsContent>

        <TabsContent value="experience" className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Work Experience & Certifications</h2>
                <Dialog open={isExpDialogOpen} onOpenChange={setIsExpDialogOpen}>
                    <DialogTrigger asChild>
                        <Button><Plus className="h-4 w-4 mr-2"/> Add Experience</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add Experience</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>Type</Label>
                                <select 
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={expForm.type}
                                    onChange={(e) => setExpForm({...expForm, type: e.target.value as any})}
                                >
                                    <option value="WORK">Work Experience</option>
                                    <option value="EDUCATION">Education</option>
                                    <option value="CERTIFICATION">Certification</option>
                                </select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Title / Degree</Label>
                                <Input value={expForm.title} onChange={e => setExpForm({...expForm, title: e.target.value})} placeholder="e.g. Senior Developer" />
                            </div>
                            <div className="grid gap-2">
                                <Label>Company / Institution</Label>
                                <Input value={expForm.organization} onChange={e => setExpForm({...expForm, organization: e.target.value})} placeholder="e.g. Google" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Start Date</Label>
                                    <Input type="date" value={expForm.startDate} onChange={e => setExpForm({...expForm, startDate: e.target.value})} />
                                </div>
                                <div className="grid gap-2">
                                    <Label>End Date</Label>
                                    <Input type="date" value={expForm.endDate} onChange={e => setExpForm({...expForm, endDate: e.target.value})} disabled={expForm.isCurrent} />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Checkbox id="current" checked={expForm.isCurrent} onCheckedChange={(c) => setExpForm({...expForm, isCurrent: !!c})} />
                                <Label htmlFor="current">I currently work here</Label>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleSaveExperience} disabled={isSaving}>Save</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
                <GlassCard className="p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2"><Briefcase className="w-5 h-5 text-primary"/> Work History</h3>
                    <div className="space-y-6">
                        {experiences.work.map(exp => (
                            <div key={exp.id} className="relative pl-6 border-l border-border pb-6 last:pb-0">
                                <div className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full bg-primary" />
                                <div className="flex justify-between items-start group">
                                    <div>
                                        <h4 className="font-medium">{exp.title}</h4>
                                        <p className="text-sm text-foreground/80">{exp.organization}</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {new Date(exp.startDate).getFullYear()} - {exp.isCurrent ? 'Present' : exp.endDate ? new Date(exp.endDate).getFullYear() : ''}
                                        </p>
                                    </div>
                                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 h-8 w-8 text-destructive" onClick={() => deleteExperience(exp.id)}>
                                        <Trash2 className="h-4 w-4"/>
                                    </Button>
                                </div>
                            </div>
                        ))}
                         {experiences.work.length === 0 && <p className="text-muted-foreground text-sm">No work experience added.</p>}
                    </div>
                </GlassCard>
                
                <div className="space-y-6">
                     <GlassCard className="p-6">
                        <h3 className="font-semibold mb-4 flex items-center gap-2"><Award className="w-5 h-5 text-amber-500"/> Certifications</h3>
                        <div className="space-y-4">
                            {experiences.certifications.map(cert => (
                                <div key={cert.id} className="flex gap-4 items-start group">
                                     <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                                         <Award className="h-5 w-5 text-amber-500"/>
                                     </div>
                                     <div className="flex-1">
                                         <h4 className="font-medium">{cert.title}</h4>
                                         <p className="text-sm text-muted-foreground">{cert.organization}</p>
                                     </div>
                                     <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 h-8 w-8 text-destructive" onClick={() => deleteExperience(cert.id)}>
                                        <Trash2 className="h-4 w-4"/>
                                    </Button>
                                </div>
                            ))}
                            {experiences.certifications.length === 0 && <p className="text-muted-foreground text-sm">No certifications added.</p>}
                        </div>
                     </GlassCard>
                     
                     <GlassCard className="p-6">
                        <h3 className="font-semibold mb-4 flex items-center gap-2"><GraduationCap className="w-5 h-5 text-blue-500"/> Education</h3>
                         <div className="space-y-4">
                            {experiences.education.map(edu => (
                                <div key={edu.id} className="flex gap-4 items-start group">
                                     <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                         <GraduationCap className="h-5 w-5 text-blue-500"/>
                                     </div>
                                     <div className="flex-1">
                                         <h4 className="font-medium">{edu.title}</h4>
                                         <p className="text-sm text-muted-foreground">{edu.organization}</p>
                                     </div>
                                     <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 h-8 w-8 text-destructive" onClick={() => deleteExperience(edu.id)}>
                                        <Trash2 className="h-4 w-4"/>
                                    </Button>
                                </div>
                            ))}
                             {experiences.education.length === 0 && <p className="text-muted-foreground text-sm">No education added.</p>}
                        </div>
                     </GlassCard>
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
            <GlassCard className="p-6 mb-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                         <h3 className="font-semibold text-lg flex items-center gap-2">
                             <CheckCircle className="w-5 h-5 text-emerald-500" /> Verified Skills
                         </h3>
                         <p className="text-sm text-muted-foreground">Detected automatically from your projects.</p>
                    </div>
                </div>
                
                 <div className="flex flex-wrap gap-3">
                    {skills.filter(s => s.isVerified).map((skill) => (
                        <SkillBadge key={skill.name} skill={skill} />
                    ))}
                    {skills.filter(s => s.isVerified).length === 0 && <p className="text-muted-foreground text-sm">No verified skills yet. Connect projects to get verified skills.</p>}
                </div>
            </GlassCard>

            <GlassCard className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                         <h3 className="font-semibold text-lg flex items-center gap-2">
                            <Briefcase className="w-5 h-5 text-blue-500" /> Claimed Skills
                         </h3>
                         <p className="text-sm text-muted-foreground">Manually added skills with evidence.</p>
                    </div>
                    <Link to="/claim-skills">
                        <Button variant="outline"><Plus className="h-4 w-4 mr-2"/> Add Skill</Button>
                    </Link>
                </div>
                
                 <div className="flex flex-wrap gap-3">
                    {skills.filter(s => !s.isVerified).map((skill) => (
                        <SkillBadge key={skill.name} skill={skill} />
                    ))}
                    {skills.filter(s => !s.isVerified).length === 0 && <p className="text-muted-foreground text-sm">No claimed skills yet.</p>}
                </div>
            </GlassCard>
        </TabsContent>

      </Tabs>
    </div>
  )
}
