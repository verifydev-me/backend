import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/auth-store'
import { useUserStore } from '@/store/user-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { apiClient } from '@/api/client'
import {
  Download,
  Eye,
  Loader2,
  Plus,
  Trash2,
  GraduationCap,
  Briefcase,
  Award,
  Code,
  Sparkles,
  Info,
  MapPin,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from '@/hooks/use-toast'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface ResumeData {
  template: 'modern' | 'classic' | 'developer' | 'corporate'
  skills: Array<{
    name: string
    category: string
    verifiedScore: number
    projectCount: number
  }>
  projects: Array<{
    repoName: string
    description: string
    language: string
    technologies: string[]
    overallScore: number
    githubUrl: string
  }>
  experiences: Array<{
    id: string
    type: 'WORK' | 'EDUCATION' | 'CERTIFICATION'
    title: string
    organization: string
    location: string
    startDate: string
    endDate?: string
    isCurrent: boolean
    description: string
  }>
}

const templates = [
  { value: 'modern', label: 'Modern', description: 'Clean, contemporary design' },
  { value: 'classic', label: 'Classic', description: 'Professional, timeless style' },
  { value: 'developer', label: 'Developer', description: 'Tech-focused layout' },
  { value: 'corporate', label: 'Corporate', description: 'Traditional business format' },
]

export default function Resume() {
  const { user } = useAuthStore()
  const { aura, fetchAura } = useUserStore()

  const [resumeData, setResumeData] = useState<ResumeData>({
    template: 'modern',
    skills: [],
    projects: [],
    experiences: [],
  })

  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set())
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set())
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [skillSources, setSkillSources] = useState<Record<string, string[]>>({})
  const [newExperience, setNewExperience] = useState({
    type: 'WORK' as const,
    title: '',
    organization: '',
    location: '',
    startDate: '',
    endDate: '',
    isCurrent: false,
    description: '',
  })
  const [isAddingExperience, setIsAddingExperience] = useState(false)

  // Load initial data
  useEffect(() => {
    const loadResumeData = async () => {
      try {
        // Fetch user's skills
        const [skillsRes, projectsRes, experiencesRes] = await Promise.all([
          apiClient.get('/v1/users/me/skills'),
          apiClient.get('/v1/users/me/projects'),
          apiClient.get('/v1/experiences'),
          fetchAura(),
        ])
        
        const skillsData = skillsRes.data.data || []
        const projectsData = projectsRes.data.data?.projects || []
        const experiencesData = experiencesRes.data.data?.all || []
        
        // Fetch aura
        fetchAura()

        // Create skill-to-projects mapping
        const mapping: Record<string, string[]> = {}
        projectsData.forEach((p: any) => {
          const techs = p.technologies || []
          if (p.language) techs.push(p.language)
          techs.forEach((t: string) => {
            if (!mapping[t]) mapping[t] = []
            if (!mapping[t].includes(p.repoName)) {
              mapping[t].push(p.repoName)
            }
          })
        })
        setSkillSources(mapping)

        setResumeData((prev) => ({
          ...prev,
          skills: skillsData,
          projects: projectsData.map((p: any) => ({
            repoName: p.repoName,
            description: p.description,
            language: p.language,
            technologies: p.technologies || [],
            overallScore: p.overallScore || 0,
            githubUrl: p.githubRepoUrl || p.url,
          })),
          experiences: experiencesData,
        }))

        // Auto-select high-confidence skills and all projects
        const highConfidenceSkills = new Set<string>(
          skillsData
            .filter((s: any) => s.verifiedScore >= 70)
            .map((s: any) => s.name as string)
        )
        setSelectedSkills(highConfidenceSkills)

        const allProjects = new Set<string>(projectsData.map((p: any) => p.repoName as string))
        setSelectedProjects(allProjects)
        console.log('Resume data loaded:', { skills: skillsData, projects: projectsData, experiences: experiencesData })
      } catch (error) {
        console.error('Failed to load resume data:', error)
        toast({ variant: 'destructive', title: 'Data Load Warning', description: 'Some profile data could not be loaded.' })
      } finally {
        setIsLoading(false)
      }
    }

    loadResumeData()
  }, [fetchAura, toast])

  const toggleSkill = (skillName: string) => {
    const newSelected = new Set(selectedSkills)
    if (newSelected.has(skillName)) {
      newSelected.delete(skillName)
    } else {
      newSelected.add(skillName)
    }
    setSelectedSkills(newSelected)
  }

  const toggleProject = (projectName: string) => {
    const newSelected = new Set(selectedProjects)
    if (newSelected.has(projectName)) {
      newSelected.delete(projectName)
    } else {
      newSelected.add(projectName)
    }
    setSelectedProjects(newSelected)
  }

  const handleAddExperience = async () => {
    try {
      const response = await apiClient.post('/v1/experiences', {
        ...newExperience,
        endDate: newExperience.isCurrent ? null : newExperience.endDate,
      })

      setResumeData((prev) => ({
        ...prev,
        experiences: [...prev.experiences, response.data.data?.experience],
      }))

      setNewExperience({
        type: 'WORK',
        title: '',
        organization: '',
        location: '',
        startDate: '',
        endDate: '',
        isCurrent: false,
        description: '',
      })
      setIsAddingExperience(false)
      toast({ title: 'Experience added successfully!' })
    } catch (error) {
      console.error('Failed to add experience:', error)
      toast({ variant: 'destructive', title: 'Failed to add experience' })
    }
  }

  const handleDeleteExperience = async (id: string) => {
    try {
      await apiClient.delete(`/v1/experiences/${id}`)
      setResumeData((prev) => ({
        ...prev,
        experiences: prev.experiences.filter((exp) => exp.id !== id),
      }))
      toast({ title: 'Experience deleted' })
    } catch (error) {
      console.error('Failed to delete experience:', error)
      toast({ variant: 'destructive', title: 'Failed to delete experience' })
    }
  }

  const handleGenerateResume = async () => {
    setIsGenerating(true)
    try {
      const selectedSkillsData = resumeData.skills.filter((s) => selectedSkills.has(s.name))
      const selectedProjectsData = resumeData.projects.filter((p) => selectedProjects.has(p.repoName))

      // Validate we have enough data
      if (selectedSkillsData.length === 0 && selectedProjectsData.length === 0) {
        toast({
          variant: 'destructive',
          title: 'No content selected',
          description: 'Please select at least one skill or project for your resume.',
        })
        return
      }

      console.log('Generating resume with data:', {
        template: resumeData.template,
        skillsCount: selectedSkillsData.length,
        projectsCount: selectedProjectsData.length,
      })

      const response = await apiClient.post(
        '/v1/resumes/generate',
        {
          template: resumeData.template,
          skills: selectedSkillsData,
          projects: selectedProjectsData,
          experiences: resumeData.experiences.map((exp: any) => ({
            company: exp.organization || exp.company,
            position: exp.title || exp.position,
            location: exp.location,
            startDate: exp.startDate,
            endDate: exp.endDate,
            isCurrent: exp.isCurrent,
            description: exp.description,
          })),
          user: {
            id: user?.id,
            name: user?.name || user?.username,
            email: user?.email,
            username: user?.username,
            bio: user?.bio,
            location: user?.location,
            website: user?.website,
            avatarUrl: user?.avatarUrl,
            auraScore: aura?.total || 0,
            coreCount: user?.coreCount || 0,
          },
          auraSummary: {
            total: aura?.total || 0,
            level: aura?.level || 'novice',
            percentile: aura?.percentile || 0,
          },
        },
        { 
          responseType: 'blob',
          timeout: 60000,
        }
      )

      // Download the PDF
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const filename = `resume-${user?.username || 'developer'}-${new Date().getTime()}.pdf`
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.parentNode?.removeChild(link)
      
      setTimeout(() => window.URL.revokeObjectURL(url), 1000)

      toast({
        title: 'Resume generated!',
        description: 'Your premium resume is ready.',
      })
    } catch (error: any) {
      console.error('Failed to generate resume:', error)
      toast({
        variant: 'destructive',
        title: 'Generation failed',
        description: 'Please try again in a few seconds.',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePreviewResume = async () => {
    setIsPreviewing(true)
    try {
      const selectedSkillsData = resumeData.skills.filter((s) => selectedSkills.has(s.name))
      const selectedProjectsData = resumeData.projects.filter((p) => selectedProjects.has(p.repoName))

      const response = await apiClient.post('/v1/resumes/preview', {
        template: resumeData.template,
        skills: selectedSkillsData,
        projects: selectedProjectsData,
        experiences: resumeData.experiences.map((exp: any) => ({
          company: exp.organization || exp.company,
          position: exp.title || exp.position,
          location: exp.location,
          startDate: exp.startDate,
          endDate: exp.endDate,
          isCurrent: exp.isCurrent,
          description: exp.description,
        })),
        user: {
          id: user?.id,
          name: user?.name || user?.username,
          email: user?.email,
          username: user?.username,
          bio: user?.bio,
          location: user?.location,
          website: user?.website,
          avatarUrl: user?.avatarUrl,
          auraScore: aura?.total || 0,
          coreCount: user?.coreCount || 0,
        },
        auraSummary: {
          total: aura?.total || 0,
          level: aura?.level || 'novice',
          percentile: aura?.percentile || 0,
        },
      })

      // Show preview in a new window or modal
      const previewWindow = window.open('', '_blank')
      if (previewWindow) {
        previewWindow.document.write(response.data.data.html)
        previewWindow.document.close()
      } else {
        toast({ title: 'Popup blocked', description: 'Please allow popups to see the preview' })
      }
    } catch (error) {
      console.error('Failed to preview resume:', error)
      toast({ variant: 'destructive', title: 'Preview failed' })
    } finally {
      setIsPreviewing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-10 max-w-6xl mx-auto pb-12">
      {/* Refined Professional Header */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-2xl bg-card border border-border p-8"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/20 rounded-full blur-[100px]" />
        
        <div className="relative space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-primary" />
            Resume Builder
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Create a professional resume powered by your verified skills and projects. 
            Select your best work and let your aura shine.
          </p>
        </div>
      </motion.div>

      <Tabs defaultValue="template" className="space-y-8">
        <TabsList>
          <TabsTrigger value="template">Template</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="experiences">Experience</TabsTrigger>
        </TabsList>

        {/* Template Selection */}
        <TabsContent value="template" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {templates.map((template) => (
              <Card 
                key={template.value}
                className={`cursor-pointer transition-all border-2 overflow-hidden ${
                  resumeData.template === template.value ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setResumeData({ ...resumeData, template: template.value as any })}
              >
                <div className="aspect-[3/4] relative bg-muted p-4 flex flex-col gap-2">
                   {/* Visual representation based on template type */}
                   {template.value === 'modern' && (
                     <div className="flex-1 rounded-md bg-slate-900 border border-slate-700 p-2 space-y-1 overflow-hidden">
                        <div className="h-4 w-3/4 bg-primary/40 rounded" />
                        <div className="h-2 w-1/2 bg-slate-700 rounded" />
                        <div className="pt-2 flex gap-1">
                           <div className="h-2 w-2 rounded-full bg-primary" />
                           <div className="h-2 w-2 rounded-full bg-primary" />
                        </div>
                        <div className="grid grid-cols-2 gap-1 mt-2">
                           <div className="h-4 bg-slate-800 rounded" />
                           <div className="h-4 bg-slate-800 rounded" />
                        </div>
                     </div>
                   )}
                   {template.value === 'developer' && (
                     <div className="flex-1 rounded-md bg-black border border-green-500/30 p-2 font-mono text-[5px] text-green-500 space-y-1 overflow-hidden">
                        <div>$ cat profile.json</div>
                        <div className="text-blue-400">{"{"}</div>
                        <div className="pl-1">"name": "USER",</div>
                        <div className="pl-1">"skills": ["TS", "Go"],</div>
                        <div className="pl-1">"aura": 1500</div>
                        <div className="text-blue-400">{"}"}</div>
                        <div className="pt-1 text-yellow-500">_</div>
                     </div>
                   )}
                   {template.value === 'classic' && (
                     <div className="flex-1 rounded-md bg-white border border-slate-300 p-2 space-y-2 overflow-hidden">
                        <div className="h-2 w-1/2 bg-slate-900 mx-auto rounded-sm" />
                        <div className="h-[1px] bg-slate-300 w-full" />
                        <div className="space-y-1">
                           <div className="h-1 w-full bg-slate-200" />
                           <div className="h-1 w-full bg-slate-200" />
                           <div className="h-1 w-3/4 bg-slate-100" />
                        </div>
                     </div>
                   )}
                   {template.value === 'corporate' && (
                     <div className="flex-1 rounded-md bg-slate-50 border border-slate-200 p-2 flex gap-2 overflow-hidden">
                        <div className="w-1/3 h-full bg-slate-800 rounded-sm" />
                        <div className="flex-1 space-y-2 pt-1">
                           <div className="h-1.5 w-full bg-slate-300 rounded" />
                           <div className="h-1 w-3/4 bg-slate-200 rounded" />
                           <div className="h-4 w-full bg-slate-200 rounded-sm" />
                        </div>
                     </div>
                   )}
                   
                   {resumeData.template === template.value && (
                     <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1 shadow-md">
                        <Sparkles className="h-3 w-3" />
                     </div>
                   )}
                </div>
                <CardHeader className="p-3 bg-background">
                  <CardTitle className="text-sm font-bold">{template.label}</CardTitle>
                  <CardDescription className="text-[10px] line-clamp-1">{template.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Skills Selection */}
        <TabsContent value="skills" className="space-y-6">
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Code className="h-5 w-5 text-primary" />
                Select Verified Skills
              </CardTitle>
              <CardDescription>
                Click to toggle. Hover to see which projects verified these skills.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TooltipProvider>
                <div className="flex flex-wrap gap-2">
                  {resumeData.skills.length > 0 ? (
                    resumeData.skills.map((skill, idx) => (
                      <Tooltip key={skill.name}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => toggleSkill(skill.name)}
                            className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300 text-sm font-medium ${
                              selectedSkills.has(skill.name)
                                ? 'border-primary/50 bg-primary/10 text-primary'
                                : 'border-border bg-card hover:border-primary/30 hover:bg-primary/5'
                            }`}
                            style={!selectedSkills.has(skill.name) ? {
                              backgroundColor: `hsl(${(idx * 137.5) % 360} 40% ${15}%)`,
                              borderColor: `hsl(${(idx * 137.5) % 360} 40% 25%)`
                            } : undefined}
                          >
                            <span>{skill.name}</span>
                            <Badge 
                              variant="secondary" 
                              className={`h-5 min-w-[20px] px-1 text-[10px] rounded-full flex items-center justify-center transition-colors ${
                                selectedSkills.has(skill.name) ? 'bg-primary text-primary-foreground' : 'bg-background/50'
                              }`}
                            >
                              {skill.verifiedScore}%
                            </Badge>
                            {selectedSkills.has(skill.name) && (
                              <motion.div
                                layoutId="selected-spark"
                                className="absolute -top-1 -right-1"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                              >
                                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                              </motion.div>
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="p-3 max-w-[250px] bg-popover border-primary/20">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-4">
                              <span className="font-bold text-primary">{skill.name}</span>
                              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{skill.category}</span>
                            </div>
                            <div className="h-[1px] bg-border/50" />
                            <div className="space-y-1">
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase">Verified In:</p>
                              <div className="flex flex-wrap gap-1">
                                {skillSources[skill.name]?.map((repo) => (
                                  <Badge key={repo} variant="outline" className="text-[9px] py-0 h-4 border-primary/30 text-foreground">
                                    {repo}
                                  </Badge>
                                )) || <span className="text-[10px] italic">No projects found</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border/50">
                              <Info className="h-3 w-3 text-primary" />
                              <span className="text-[10px] text-muted-foreground">Confidence Score: {skill.verifiedScore}/100</span>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ))
                  ) : (
                    <div className="w-full text-center py-12 bg-muted/20 rounded-xl border border-dashed border-border">
                      <Code className="h-10 w-10 mx-auto mb-3 opacity-20" />
                      <p className="text-muted-foreground">No verified skills found.</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">Analyze your GitHub projects to populate this list.</p>
                    </div>
                  )}
                </div>
              </TooltipProvider>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Projects Selection */}
        <TabsContent value="projects" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Select Projects</CardTitle>
              <p className="text-sm text-muted-foreground">All projects are auto-selected</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {resumeData.projects.map((project) => (
                  <button
                    key={project.repoName}
                    onClick={() => toggleProject(project.repoName)}
                    className={`w-full p-4 rounded-xl border transition-all duration-300 text-left ${
                      selectedProjects.has(project.repoName)
                        ? 'border-primary/50 bg-primary/10'
                        : 'border-border bg-card/50 hover:border-primary/30'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold flex items-center gap-2">
                          <Code className="h-4 w-4" />
                          {project.repoName}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {project.technologies.map((tech) => (
                            <Badge key={tech} variant="secondary">
                              {tech}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Badge className="ml-2">{project.language}</Badge>
                    </div>
                  </button>
                ))}
              </div>
              {resumeData.projects.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No projects added yet. Go to Projects to add your repositories!
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Experience Management */}
        <TabsContent value="experiences" className="space-y-6">
          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Work & Education</CardTitle>
              <Dialog open={isAddingExperience} onOpenChange={setIsAddingExperience}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Experience
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Experience</DialogTitle>
                    <DialogDescription>Add your work, education, or certification</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Type</label>
                      <select
                        value={newExperience.type}
                        onChange={(e) =>
                          setNewExperience({ ...newExperience, type: e.target.value as any })
                        }
                        className="p-2 border rounded-md"
                      >
                        <option value="WORK">Work Experience</option>
                        <option value="EDUCATION">Education</option>
                        <option value="CERTIFICATION">Certification</option>
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Title/Degree</label>
                      <Input
                        value={newExperience.title}
                        onChange={(e) => setNewExperience({ ...newExperience, title: e.target.value })}
                        placeholder="Job title or degree name"
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Organization</label>
                      <Input
                        value={newExperience.organization}
                        onChange={(e) =>
                          setNewExperience({ ...newExperience, organization: e.target.value })
                        }
                        placeholder="Company or school name"
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Location</label>
                      <Input
                        value={newExperience.location}
                        onChange={(e) => setNewExperience({ ...newExperience, location: e.target.value })}
                        placeholder="City, Country"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="grid gap-2">
                        <label className="text-sm font-medium">Start Date</label>
                        <Input
                          type="date"
                          value={newExperience.startDate}
                          onChange={(e) =>
                            setNewExperience({ ...newExperience, startDate: e.target.value })
                          }
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
                        checked={newExperience.isCurrent}
                        onChange={(e) =>
                          setNewExperience({ ...newExperience, isCurrent: e.target.checked })
                        }
                      />
                      <label className="text-sm font-medium">Currently working/studying here</label>
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Description</label>
                      <Textarea
                        value={newExperience.description}
                        onChange={(e) =>
                          setNewExperience({ ...newExperience, description: e.target.value })
                        }
                        placeholder="Describe your role and achievements"
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddingExperience(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddExperience}>Add Experience</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {resumeData.experiences.map((exp) => (
                  <div
                    key={exp.id}
                    className="p-4 rounded-xl border border-border bg-card/30 hover:bg-card/50 transition-all duration-200 group">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4 flex-1">
                        <div className="p-2 rounded-lg bg-slate-800/50">
                          {exp.type === 'WORK' && <Briefcase className="h-5 w-5 text-primary" />}
                          {exp.type === 'EDUCATION' && (
                            <GraduationCap className="h-5 w-5 text-emerald-400" />
                          )}
                          {exp.type === 'CERTIFICATION' && <Award className="h-5 w-5 text-amber-400" />}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-slate-200">{exp.title}</h3>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                            <p className="text-sm text-primary/80 font-medium">{exp.organization}</p>
                            {exp.location && (
                              <p className="text-xs text-slate-500 flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {exp.location}
                              </p>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-2 font-medium uppercase tracking-wider">
                            {exp.startDate} {!exp.isCurrent && `- ${exp.endDate}`}
                            {exp.isCurrent && ' - Present'}
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDeleteExperience(exp.id)}
                      >
                        <Trash2 className="h-4 w-4 text-rose-500/70 hover:text-rose-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              {resumeData.experiences.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No experiences added yet. Add your work, education, and certifications!
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <Button variant="outline" onClick={handlePreviewResume} disabled={isPreviewing} className="gap-2">
          {isPreviewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
          Preview
        </Button>
        <Button onClick={handleGenerateResume} disabled={isGenerating} className="gap-2">
          {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Download PDF
        </Button>
      </motion.div>
    </div>
  )
}

