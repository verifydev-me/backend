import { useState, useEffect } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/hooks/use-toast'
import { post, get } from '@/api/client'
import { useAuthStore } from '@/store/auth-store'
import type { Job } from '@/types'
import {
  CheckCircle2,
  Sparkles,
  FileText,
  User,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Briefcase,
  FolderGit2,
  ChevronDown,
  ChevronRight,
  Code2,
} from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

const applicationSchema = z.object({
  coverLetter: z.string().min(50, 'Cover letter must be at least 50 characters').max(1000),
})

type ApplicationFormData = z.infer<typeof applicationSchema>

interface ApplyJobModalProps {
  job: Job
  open: boolean
  onOpenChange: (open: boolean) => void
  applicationData?: {
    skills?: string[]
    projects?: any[]
    experience?: any[]
    certifications?: any[]
  }
}

export function ApplyJobModal({ job, open, onOpenChange, applicationData }: ApplyJobModalProps) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [step, setStep] = useState<'form' | 'preview'>('form')

  // Selection State
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])
  const [selectedExperience, setSelectedExperience] = useState<string[]>([])
  const [selectedCertifications, setSelectedCertifications] = useState<string[]>([])

  // Collapsible states
  const [isProjectsOpen, setIsProjectsOpen] = useState(false)
  const [isExperienceOpen, setIsExperienceOpen] = useState(false)
  const [isSkillsOpen, setIsSkillsOpen] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      coverLetter: '',
    },
  })

  const coverLetter = watch('coverLetter')

  // Fetch Data
  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: () => get<any>('/v1/users/me'),
    enabled: open,
  })

  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => get<{ projects: any[] }>('/v1/projects'),
    enabled: open,
  })

  const { data: experienceData } = useQuery({
    queryKey: ['experiences'],
    queryFn: () => get<{ work: any[], education: any[], certifications: any[] }>('/v1/experiences'),
    enabled: open,
  })

  const { data: skillsResponse } = useQuery({
    queryKey: ['skills'],
    queryFn: () => get<{ skills: any[] }>('/v1/skills'),
    enabled: open,
  })

  const projects = projectsData?.projects || []
  const work = experienceData?.work || []
  const certs = experienceData?.certifications || []
  const skills = skillsResponse?.skills || []

  // Initialize from applicationData or defaults
  useEffect(() => {
    if (open) {
      if (applicationData) {
        // Pre-fill from usage of "Quick Apply" preferences logic
        setSelectedSkills(applicationData.skills || [])
        setSelectedProjects(applicationData.projects?.map(p => p.id) || [])
        setSelectedExperience(applicationData.experience?.map(e => e.id) || [])
        setSelectedCertifications(applicationData.certifications?.map(c => c.id) || [])
      } else {
        // Default clean slate allows user to choose
        setSelectedSkills([])
        setSelectedProjects([])
        setSelectedExperience([])
        setSelectedCertifications([])
      }
    }
  }, [open, applicationData])

  // Helper to get full objects for submission
  const getSelectedObjects = () => {
    const fullProjects = projects.filter(p => selectedProjects.includes(p.id))
    const fullWork = work.filter(e => selectedExperience.includes(e.id))
    const fullCerts = certs.filter(c => selectedCertifications.includes(c.id))

    // For skills, we just send names usually, but if backend expects objects, we might need to map?
    // Backend applyJobSchema expects string[] for skills.
    return { fullProjects, fullWork, fullCerts }
  }

  const applyMutation = useMutation({
    mutationFn: (data: ApplicationFormData) => {
      const { fullProjects, fullWork, fullCerts } = getSelectedObjects()

      const payload = {
        coverLetter: data.coverLetter,
        candidateName: user?.name || userProfile?.name || 'Candidate',
        candidateEmail: user?.email || userProfile?.email || 'candidate@example.com',
        candidateAura: userProfile?.auraScore || 0,
        candidateCores: userProfile?.coreCount || 1,
        candidateSkills: selectedSkills,
        candidateProjects: fullProjects,
        candidateExperience: fullWork,
        candidateCertifications: fullCerts,
      }
      return post(`/v1/jobs/${job.id}/apply`, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', job.id] })
      queryClient.invalidateQueries({ queryKey: ['applications'] })
      toast({
        title: 'Application submitted! 🎉',
        description: 'The recruiter will review your profile.',
      })
      onOpenChange(false)
      reset()
      setStep('form')
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Failed to apply',
        description: error?.response?.data?.message || 'Please try again later.',
      })
    },
  })

  const onSubmit = (data: ApplicationFormData) => {
    if (step === 'form') {
      setStep('preview')
    } else {
      applyMutation.mutate(data)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    reset()
    setStep('form')
  }

  const toggleSkill = (skillName: string) => {
    setSelectedSkills(prev =>
      prev.includes(skillName)
        ? prev.filter(s => s !== skillName)
        : [...prev, skillName]
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {step === 'form' ? 'Apply for this position' : 'Review your application'}
          </DialogTitle>
          <DialogDescription>
            {step === 'form'
              ? `Apply to ${job.title} at ${job.company}`
              : 'Review your application before submitting'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {step === 'form' ? (
            <>
              {/* Job Info */}
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{job.title}</h3>
                      <p className="text-sm text-muted-foreground">{job.company}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="secondary">{job.type}</Badge>
                        <Badge variant="secondary">{job.location}</Badge>
                        {job.requiredSkills?.slice(0, 3).map((s: string) => <Badge key={s} variant="outline" className="bg-background/50">{s}</Badge>)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Cover Letter */}
              <div className="space-y-2">
                <Label htmlFor="coverLetter">
                  Cover Letter <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="coverLetter"
                  placeholder="Tell the recruiter why you're a great fit..."
                  className="min-h-[150px] resize-none"
                  {...register('coverLetter')}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <p>{errors.coverLetter?.message}</p>
                  <p>{coverLetter?.length || 0} / 1000</p>
                </div>
              </div>

              {/* Attachments Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Label className="text-base font-semibold">Profile Attachments</Label>
                  <Badge variant="secondary" className="text-xs font-normal">Optional</Badge>
                </div>

                {/* Skills Selection */}
                <Collapsible open={isSkillsOpen} onOpenChange={setIsSkillsOpen} className="border border-border rounded-xl bg-card">
                  <div className="flex items-center justify-between p-4">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="p-0 hover:bg-transparent flex items-center gap-2 w-full justify-between">
                        <div className="flex items-center gap-2">
                          <Code2 className="h-4 w-4 text-primary" />
                          <span className="font-medium">Skills ({selectedSkills.length})</span>
                        </div>
                        {isSkillsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent>
                    <div className="px-4 pb-4">
                      {skills.length === 0 ? <p className="text-sm text-muted-foreground">No skills found.</p> :
                        <div className="flex flex-wrap gap-2">
                          {skills.map((s) => (
                            <Badge
                              key={s.id || s.name}
                              variant={selectedSkills.includes(s.name) ? "default" : "outline"}
                              className="cursor-pointer hover:bg-primary/90 transition-all"
                              onClick={() => toggleSkill(s.name)}
                            >
                              {s.name}
                            </Badge>
                          ))}
                        </div>
                      }
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Projects */}
                <Collapsible open={isProjectsOpen} onOpenChange={setIsProjectsOpen} className="border border-border rounded-xl bg-card">
                  <div className="flex items-center justify-between p-4">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="p-0 hover:bg-transparent flex items-center gap-2 w-full justify-between">
                        <div className="flex items-center gap-2">
                          <FolderGit2 className="h-4 w-4 text-primary" />
                          <span className="font-medium">Projects ({selectedProjects.length})</span>
                        </div>
                        {isProjectsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent>
                    <div className="px-4 pb-4 space-y-2">
                      {projects.length === 0 ? <p className="text-sm text-muted-foreground">No projects found.</p> :
                        projects.map((p) => (
                          <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg border border-border/50 bg-muted/20">
                            <Checkbox
                              id={`p-${p.id}`}
                              checked={selectedProjects.includes(p.id)}
                              onCheckedChange={(c) => {
                                setSelectedProjects(prev => c ? [...prev, p.id] : prev.filter(id => id !== p.id))
                              }}
                            />
                            <label htmlFor={`p-${p.id}`} className="flex-1 cursor-pointer text-sm font-medium">
                              {p.repoName || p.name}
                              <span className="block text-xs text-muted-foreground font-normal">{p.description?.substring(0, 60)}...</span>
                            </label>
                            {p.stars > 0 && <Badge variant="secondary" className="text-xs gap-1"><Sparkles className="h-2 w-2" /> {p.stars}</Badge>}
                          </div>
                        ))
                      }
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Experience */}
                <Collapsible open={isExperienceOpen} onOpenChange={setIsExperienceOpen} className="border border-border rounded-xl bg-card">
                  <div className="flex items-center justify-between p-4">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="p-0 hover:bg-transparent flex items-center gap-2 w-full justify-between">
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-primary" />
                          <span className="font-medium">Experience ({selectedExperience.length + selectedCertifications.length})</span>
                        </div>
                        {isExperienceOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent>
                    <div className="px-4 pb-4 space-y-4">
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Work</h4>
                        {work.length === 0 ? <p className="text-sm text-muted-foreground">No work experience.</p> :
                          work.map((e) => (
                            <div key={e.id} className="flex items-center gap-3 p-2 rounded-lg border border-border/50 bg-muted/20 mb-2">
                              <Checkbox
                                id={`e-${e.id}`}
                                checked={selectedExperience.includes(e.id)}
                                onCheckedChange={(c) => setSelectedExperience(prev => c ? [...prev, e.id] : prev.filter(id => id !== e.id))}
                              />
                              <label htmlFor={`e-${e.id}`} className="flex-1 cursor-pointer text-sm font-medium">
                                {e.title}
                                <span className="block text-xs text-muted-foreground font-normal">{e.organization}</span>
                              </label>
                            </div>
                          ))
                        }
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Certifications</h4>
                        {certs.length === 0 ? <p className="text-sm text-muted-foreground">No certifications.</p> :
                          certs.map((c) => (
                            <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg border border-border/50 bg-muted/20 mb-2">
                              <Checkbox
                                id={`c-${c.id}`}
                                checked={selectedCertifications.includes(c.id)}
                                onCheckedChange={(chk) => setSelectedCertifications(prev => chk ? [...prev, c.id] : prev.filter(id => id !== c.id))}
                              />
                              <label htmlFor={`c-${c.id}`} className="flex-1 cursor-pointer text-sm font-medium">
                                {c.title}
                                <span className="block text-xs text-muted-foreground font-normal">{c.organization}</span>
                              </label>
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="ghost" onClick={handleClose}>Cancel</Button>
                <Button type="submit" disabled={!coverLetter || coverLetter.length < 50}>
                  Review & Submit <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Preview Step */}
              <div className="space-y-6">
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-primary" /> Your Application Profile</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">{getInitials(user?.name)}</div>
                      <div>
                        <p className="font-semibold">{user?.name}</p>
                        <p className="text-sm text-muted-foreground">{user?.email}</p>
                      </div>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Skills</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedSkills.slice(0, 5).map(s => <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>)}
                          {selectedSkills.length > 5 && <span className="text-xs text-muted-foreground">+{selectedSkills.length - 5} more</span>}
                          {selectedSkills.length === 0 && <span>-</span>}
                        </div>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Projects</p>
                        <p className="font-medium">{selectedProjects.length} selected</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Experience</p>
                        <p className="font-medium">{selectedExperience.length} items</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Certifications</p>
                        <p className="font-medium">{selectedCertifications.length} items</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Cover Letter</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{coverLetter}</p>
                  </CardContent>
                </Card>

                <div className="flex justify-between gap-3">
                  <Button type="button" variant="outline" onClick={() => setStep('form')}><ArrowLeft className="mr-2 h-4 w-4" /> Back to Edit</Button>
                  <Button type="submit" disabled={applyMutation.isPending}>
                    {applyMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : <><CheckCircle2 className="ml-2 h-4 w-4" /> Submit Application</>}
                  </Button>
                </div>
              </div>
            </>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}

function getInitials(name?: string) {
  if (!name) return 'U'
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
}
