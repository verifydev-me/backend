/**
 * Job Application Preferences Page
 * Configure default settings for quick job applications
 */

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { get } from '@/api/client'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import {
  Briefcase,
  FolderGit2,
  Code2,
  Sparkles,
  Loader2,
  Check,
  Star,
  Zap,
  ArrowLeft,
  FileText,
  Award,
} from 'lucide-react'
import { Link } from 'react-router-dom'

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 20 } }
}

interface Project {
  id: string
  repoName: string
  language?: string
  stars?: number
  auraContribution?: number
  analysisStatus?: string
}

interface Skill {
  id: string
  name: string
  category: string
  verifiedScore: number
  isVerified: boolean
}

interface Experience {
  id: string
  type: 'WORK' | 'EDUCATION' | 'CERTIFICATION' | 'VOLUNTEER'
  title: string
  organization: string
  startDate: string
  isCurrent: boolean
}

interface JobPreferences {
  selectedProjects: string[]
  selectedSkills: string[]
  selectedExperience: string[]
  selectedCertifications: string[]
  defaultCoverLetter: string
  quickApplyEnabled: boolean
  resumeUrl?: string
}

export default function JobPreferences() {
  
  // Fetch user's projects
  const { data: projectsData, isLoading: loadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => get<{ projects: Project[] }>('/v1/projects'),
  })
  
  // Fetch user's skills
  const { data: skills, isLoading: loadingSkills } = useQuery({
    queryKey: ['skills'],
    queryFn: () => get<Skill[]>('/v1/skills'),
  })

  // Fetch user's experience
  const { data: experienceData, isLoading: loadingExperience } = useQuery({
    queryKey: ['experiences'],
    queryFn: () => get<{ work: Experience[], education: Experience[], certifications: Experience[] }>('/v1/experiences'),
  })
  
  // Fetch existing preferences (stored in localStorage for now)
  const [preferences, setPreferences] = useState<JobPreferences>({
    selectedProjects: [],
    selectedSkills: [],
    selectedExperience: [],
    selectedCertifications: [],
    defaultCoverLetter: '',
    quickApplyEnabled: false,
  })
  
  // Load preferences from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('jobPreferences')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        // Merge with default to handle new fields
        setPreferences(prev => ({ ...prev, ...parsed }))
      } catch (e) {
        console.error('Failed to load job preferences:', e)
      }
    }
  }, [])
  
  // Save preferences
  const [isSaving, setIsSaving] = useState(false)
  
  const handleSave = async () => {
    setIsSaving(true)
    try {
      localStorage.setItem('jobPreferences', JSON.stringify(preferences))
      toast({ title: 'Preferences saved! ✅', description: 'Your job application preferences have been updated.' })
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save preferences.' })
    } finally {
      setIsSaving(false)
    }
  }
  
  const toggleProject = (projectId: string) => {
    setPreferences(prev => ({
      ...prev,
      selectedProjects: prev.selectedProjects.includes(projectId)
        ? prev.selectedProjects.filter(id => id !== projectId)
        : [...prev.selectedProjects, projectId]
    }))
  }
  
  const toggleSkill = (skillNames: string[] | string) => {
    const names = Array.isArray(skillNames) ? skillNames : [skillNames]
    setPreferences(prev => {
      const allSelected = names.every(n => prev.selectedSkills.includes(n))
      if (allSelected) {
        return {
          ...prev,
          selectedSkills: prev.selectedSkills.filter(n => !names.includes(n))
        }
      } else {
        const newSkills = [...prev.selectedSkills]
        names.forEach(n => {
          if (!newSkills.includes(n)) newSkills.push(n)
        })
        return { ...prev, selectedSkills: newSkills }
      }
    })
  }

  const toggleExperience = (id: string, isCertification = false) => {
    const key = isCertification ? 'selectedCertifications' : 'selectedExperience'
    setPreferences(prev => ({
      ...prev,
      [key]: prev[key].includes(id)
        ? prev[key].filter(i => i !== id)
        : [...prev[key], id]
    }))
  }
  
  const projects = projectsData?.projects?.filter(p => p.analysisStatus?.toLowerCase() === 'completed') || []
  const skillsList = (Array.isArray(skills) ? skills : (skills as any)?.skills) || []
  const workExperience = experienceData?.work || []
  const certifications = experienceData?.certifications || []
  
  // Group skills by category
  const skillsByCategory = skillsList.reduce((acc: Record<string, Skill[]>, skill: Skill) => {
    const cat = skill.category || 'other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(skill)
    return acc
  }, {} as Record<string, Skill[]>)

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl blur-3xl" />
        <div className="relative bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Link to="/settings" className="p-2 rounded-lg hover:bg-muted transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-primary/60">
              <Briefcase className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold">Job Application Settings</h1>
          </div>
          <p className="text-muted-foreground ml-16">
            Configure your default preferences for quick job applications
          </p>
        </div>
      </motion.div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid gap-6 lg:grid-cols-2"
      >
        {/* Projects Selection */}
        <motion.div variants={itemVariants}>
          <Card className="border border-border/50 bg-card/80 backdrop-blur-xl h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <FolderGit2 className="h-5 w-5 text-primary" />
                </div>
                Featured Projects
              </CardTitle>
              <CardDescription>
                Select projects to highlight in your applications
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingProjects ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FolderGit2 className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>No analyzed projects yet</p>
                  <Link to="/projects/new">
                    <Button variant="link" size="sm">Add Project</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {projects.map((project) => {
                    const isSelected = preferences.selectedProjects.includes(project.id)
                    return (
                      <div
                        key={project.id}
                        onClick={() => toggleProject(project.id)}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border/50 hover:border-border hover:bg-muted/30"
                        )}
                      >
                        <Checkbox checked={isSelected} className="pointer-events-none" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{project.repoName}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {project.language && (
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-primary" />
                                {project.language}
                              </span>
                            )}
                            {project.stars !== undefined && project.stars > 0 && (
                              <span className="flex items-center gap-1">
                                <Star className="h-3 w-3" />
                                {project.stars}
                              </span>
                            )}
                          </div>
                        </div>
                        {project.auraContribution ? (
                          <Badge variant="secondary" className="shrink-0">
                            <Zap className="h-3 w-3 mr-1" />
                            +{project.auraContribution}
                          </Badge>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-3">
                {preferences.selectedProjects.length} project(s) selected
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Skills Selection */}
        <motion.div variants={itemVariants}>
          <Card className="border border-border/50 bg-card/80 backdrop-blur-xl h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Code2 className="h-5 w-5 text-primary" />
                </div>
                Highlight Skills
              </CardTitle>
              <CardDescription>
                Select skills to showcase in applications
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingSkills ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : skillsList.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Code2 className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>No verified skills yet</p>
                  <p className="text-xs mt-1">Analyze projects to get skills</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                   {Object.entries(skillsByCategory).map(([category, untypedSkills]) => {
                    const categorySkills = untypedSkills as Skill[]
                    return (
                    <div key={category}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold uppercase text-muted-foreground">
                          {category}
                        </p>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-5 text-[10px]"
                          onClick={() => toggleSkill(categorySkills.map((s: Skill) => s.name))}
                        >
                          Select All
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {categorySkills.map((skill: Skill) => {
                          const isSelected = preferences.selectedSkills.includes(skill.name)
                          return (
                            <Badge
                              key={skill.id || skill.name}
                              variant={isSelected ? "default" : "outline"}
                              className={cn(
                                "cursor-pointer transition-all",
                                isSelected
                                  ? "bg-primary hover:bg-primary/90"
                                  : "hover:bg-muted"
                              )}
                              onClick={() => toggleSkill(skill.name)}
                            >
                              {skill.name}
                              {skill.isVerified && <Check className="h-3 w-3 ml-1" />}
                              <span className="ml-1 opacity-70">{skill.verifiedScore}%</span>
                            </Badge>
                          )
                        })}
                      </div>
                    </div>
                    )
                  })}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-3">
                {preferences.selectedSkills.length} skill(s) selected
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Work Experience */}
        <motion.div variants={itemVariants}>
          <Card className="border border-border/50 bg-card/80 backdrop-blur-xl h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Briefcase className="h-5 w-5 text-primary" />
                </div>
                Work Experience
              </CardTitle>
              <CardDescription>
                Select experience to include
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingExperience ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : workExperience.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Briefcase className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>No work experience added</p>
                  <Link to="/profile">
                    <Button variant="link" size="sm">Add to Profile</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {workExperience.map((exp) => {
                    const isSelected = preferences.selectedExperience.includes(exp.id)
                    return (
                      <div
                        key={exp.id}
                        onClick={() => toggleExperience(exp.id)}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border/50 hover:border-border hover:bg-muted/30"
                        )}
                      >
                        <Checkbox checked={isSelected} className="pointer-events-none" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{exp.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{exp.organization}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-3">
                {preferences.selectedExperience.length} item(s) selected
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Certifications */}
        <motion.div variants={itemVariants}>
          <Card className="border border-border/50 bg-card/80 backdrop-blur-xl h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Award className="h-5 w-5 text-primary" />
                </div>
                Certifications
              </CardTitle>
              <CardDescription>
                Select certifications to include
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingExperience ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : certifications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Award className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>No certifications added</p>
                  <Link to="/profile">
                    <Button variant="link" size="sm">Add to Profile</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {certifications.map((cert) => {
                    const isSelected = preferences.selectedCertifications.includes(cert.id)
                    return (
                      <div
                        key={cert.id}
                        onClick={() => toggleExperience(cert.id, true)}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border/50 hover:border-border hover:bg-muted/30"
                        )}
                      >
                        <Checkbox checked={isSelected} className="pointer-events-none" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{cert.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{cert.organization}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-3">
                {preferences.selectedCertifications.length} item(s) selected
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Cover Letter Template */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="border border-border/50 bg-card/80 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                Default Cover Letter
              </CardTitle>
              <CardDescription>
                Write a template that will be pre-filled when applying to jobs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={preferences.defaultCoverLetter}
                onChange={(e) => setPreferences(prev => ({ ...prev, defaultCoverLetter: e.target.value }))}
                placeholder="Hi, I'm excited to apply for this position...

You can use placeholders like:
- {{job_title}} - Will be replaced with the job title
- {{company_name}} - Will be replaced with company name

Write about your experience, why you're interested, and what value you can bring."
                rows={8}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground mt-2">
                {preferences.defaultCoverLetter.length}/1000 characters
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Apply Settings */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="border border-border/50 bg-card/80 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                Quick Apply
              </CardTitle>
              <CardDescription>
                Enable one-click applications using your saved preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-muted/20">
                <div>
                  <p className="font-medium">Enable Quick Apply</p>
                  <p className="text-sm text-muted-foreground">
                    Apply instantly to jobs using your selected projects, skills, and cover letter
                  </p>
                </div>
                <Switch
                  checked={preferences.quickApplyEnabled}
                  onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, quickApplyEnabled: checked }))}
                />
              </div>
              
              {preferences.quickApplyEnabled && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/20"
                >
                  <p className="text-sm font-medium text-primary mb-2">Quick Apply Summary</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• {preferences.selectedProjects.length} projects selected</li>
                    <li>• {preferences.selectedSkills.length} skills highlighted</li>
                    <li>• {preferences.selectedExperience.length} experience items included</li>
                    <li>• {preferences.selectedCertifications.length} certifications included</li>
                    <li>• Cover letter: {preferences.defaultCoverLetter.length > 0 ? 'Set' : 'Not set'}</li>
                  </ul>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Save Button */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex justify-end"
      >
        <Button 
          onClick={handleSave}
          disabled={isSaving}
          size="lg"
          className="shadow-lg shadow-primary/30"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Check className="h-4 w-4 mr-2" />
          )}
          Save Preferences
        </Button>
      </motion.div>
    </div>
  )
}
