import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { get, post } from '@/api/client'
import { formatSalary, formatDate } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import { ApplyJobModal } from '@/components/job/ApplyJobModal'
import { useAuthStore } from '@/store/auth-store'
import type { Job } from '@/types'
import {
  ArrowLeft,
  MapPin,
  Building,
  Briefcase,
  Zap,
  Clock,
  DollarSign,
  Users,
  CheckCircle,
  Loader2,
  Sparkles,
} from 'lucide-react'

const jobTypeLabels: Record<Job['type'], string> = {
  'full-time': 'Full-time',
  'part-time': 'Part-time',
  contract: 'Contract',
  freelance: 'Freelance',
  internship: 'Internship',
}

const experienceLevelLabels: Record<Job['experienceLevel'], string> = {
  entry: 'Entry Level',
  mid: 'Mid Level',
  senior: 'Senior',
  lead: 'Lead',
  executive: 'Executive',
}

export default function JobDetail() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const [showApplyModal, setShowApplyModal] = useState(false)
  const [quickApplyEnabled, setQuickApplyEnabled] = useState(false)
  
  // Job Data
  const { data: job, isLoading } = useQuery({
    queryKey: ['job', id],
    queryFn: () => get<Job>(`/v1/jobs/${id}`),
    enabled: !!id,
  })

  // Start Preparation for Quick Apply Data
  // Fetch everything needed to construct the payload
  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => get<{ projects: any[] }>('/v1/projects'),
    enabled: !!user,
  })


  
  const { data: experienceData } = useQuery({
    queryKey: ['experiences'],
    queryFn: () => get<{ work: any[], education: any[], certifications: any[] }>('/v1/experiences'),
    enabled: !!user,
  })

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: () => get<any>('/v1/users/me'),
    enabled: !!user,
  })

  // Load preferences
  useEffect(() => {
    const saved = localStorage.getItem('jobPreferences')
    if (saved) {
      try {
        const prefs = JSON.parse(saved)
        if (prefs.quickApplyEnabled) {
          setQuickApplyEnabled(true)
        }
      } catch (e) {
        console.error(e)
      }
    }
  }, [])

  // Prepare Payload Helper
  const getQuickApplyPayload = () => {
    const saved = localStorage.getItem('jobPreferences')
    if (!saved) return null
    const prefs = JSON.parse(saved)
    
    // Safety check for array existence
    const projects = projectsData?.projects || []
    const work = experienceData?.work || []
    const certs = experienceData?.certifications || []

    const selectedProjects = projects.filter((p: any) => prefs.selectedProjects?.includes(p.id))
    // For skills, we need strings, but if the API returns objects (which it does), we map to names.
    // If prefs saves names (it does), we just pass names.
    // However, validation might check if they exist? No, backend just saves them.
    // Let's trust prefs.selectedSkills directly if they are strings.
    const selectedSkills = prefs.selectedSkills || []
    
    const selectedWork = work.filter((e: any) => prefs.selectedExperience?.includes(e.id))
    const selectedCerts = certs.filter((e: any) => prefs.selectedCertifications?.includes(e.id))

    return {
      coverLetter: prefs.defaultCoverLetter || '',
      candidateName: user?.name || userProfile?.name || 'Candidate',
      candidateEmail: user?.email || userProfile?.email || 'candidate@example.com',
      candidateAura: userProfile?.auraScore || 0,
      candidateCores: userProfile?.coreCount || 1,
      candidateSkills: selectedSkills.length > 0 ? selectedSkills : (userProfile?.skills?.map((s: any) => s.name) || []),
      candidateProjects: selectedProjects,
      candidateExperience: selectedWork,
      candidateCertifications: selectedCerts,
    }
  }

  const quickApplyMutation = useMutation({
    mutationFn: (data: any) => post(`/v1/jobs/${id}/apply`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', id] })
      toast({
        title: 'Application submitted! 🚀',
        description: 'Applied successfully using your default preferences.',
      })
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Failed to apply',
        description: error?.response?.data?.message || 'Please try again.',
      })
    },
  })

  const handleApply = () => {
    if (quickApplyEnabled) {
      const payload = getQuickApplyPayload()
      if (payload) {
        quickApplyMutation.mutate(payload)
      } else {
        toast({ title: 'Quick Apply not configured', description: 'Please check your settings.' })
        setShowApplyModal(true)
      }
    } else {
      setShowApplyModal(true)
    }
  }

  // Get application data for Modal (if not quick apply, but we want to pass defaults)
  const manualApplicationData = (() => {
    const payload = getQuickApplyPayload()
    if (!payload) return undefined
    return {
      skills: payload.candidateSkills,
      projects: payload.candidateProjects,
      experience: payload.candidateExperience,
      certifications: payload.candidateCertifications
    }
  })()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!job) {
    return (
      <div className="text-center py-24">
        <h2 className="text-2xl font-bold mb-2">Job not found</h2>
        <Button asChild>
          <Link to="/jobs">Back to Jobs</Link>
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/jobs">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{job.title}</h1>
            <p className="text-muted-foreground mt-1">{job.company}</p>
          </div>
          
          <div className="flex items-center gap-4">
             {user && (
                 <div className="flex items-center gap-2 mr-2">
                    <Switch 
                        id="quick-apply" 
                        checked={quickApplyEnabled}
                        onCheckedChange={(checked) => {
                            setQuickApplyEnabled(checked)
                            // Optionally update localStorage? No, keep it per session or just reflect preference
                            // If user changes here, maybe we should warn? But just local state is safer effectively overriding for this session/page view
                            // But usually users expect this to persist.
                            // Let's update localStorage to keep it consistent
                            const saved = localStorage.getItem('jobPreferences')
                            if (saved) {
                                const prefs = JSON.parse(saved)
                                prefs.quickApplyEnabled = checked
                                localStorage.setItem('jobPreferences', JSON.stringify(prefs))
                            }
                        }}
                    />
                    <Label htmlFor="quick-apply" className="cursor-pointer flex items-center gap-1.5 text-sm font-medium">
                        <Sparkles className="h-4 w-4 text-primary" />
                        Quick Apply
                    </Label>
                 </div>
             )}
             <Button onClick={handleApply} disabled={quickApplyMutation.isPending} size="lg" className="gap-2">
                {quickApplyMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <CheckCircle className="h-4 w-4" />
                )}
                {quickApplyEnabled ? 'Quick Apply' : 'Apply Now'}
             </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card className="border border-border/50">
            <CardHeader>
              <CardTitle>Job Description</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-invert prose-sm max-w-none">
                <p className="whitespace-pre-wrap">{job.description}</p>
              </div>
            </CardContent>
          </Card>

          {/* Requirements */}
          <Card className="border border-border/50">
            <CardHeader>
              <CardTitle>Requirements</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {job.requirements.map((req, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{req}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Skills */}
          <Card className="border border-border/50">
            <CardHeader>
              <CardTitle>Required Skills</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {job.skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-sm">
                    {skill}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Job Info */}
          <Card className="border border-border/50">
            <CardHeader>
              <CardTitle>Job Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Salary</p>
                  <p className="font-semibold">
                    {formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-semibold">{job.location}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <Briefcase className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Job Type</p>
                  <p className="font-semibold">{jobTypeLabels[job.type]}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <Users className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Experience</p>
                  <p className="font-semibold">
                    {experienceLevelLabels[job.experienceLevel]}
                  </p>
                </div>
              </div>

              {job.minAuraScore && (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Zap className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Minimum Aura Score
                    </p>
                    <p className="font-semibold text-primary">{job.minAuraScore}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Posted</p>
                  <p className="font-semibold">{formatDate(job.createdAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Company Card */}
          <Card className="border border-border/50">
            <CardHeader>
              <CardTitle>About the Company</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                  {job.companyLogo ? (
                    <img
                      src={job.companyLogo}
                      alt={job.company}
                      className="h-8 w-8 object-contain"
                    />
                  ) : (
                    <Building className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="font-semibold">{job.company}</p>
                  <p className="text-sm text-muted-foreground">
                    {job.applicationsCount} applicants
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Apply Button */}
          <Button
            className="w-full"
            size="lg"
            onClick={handleApply}
            disabled={quickApplyMutation.isPending}
          >
            {quickApplyMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            {quickApplyEnabled ? 'Quick Apply' : 'Apply for this Job'}
          </Button>
        </div>
      </div>
    </div>

    {/* Apply Modal */}
    {job && (
      <ApplyJobModal 
        job={job} 
        open={showApplyModal} 
        onOpenChange={setShowApplyModal}
        applicationData={manualApplicationData}
      />
    )}
  </>
  )
}
