import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { get, post } from '@/api/client'
import { formatSalary, formatDate } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import { ApplyJobModal } from '@/components/job/ApplyJobModal'
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
  const [showApplyModal, setShowApplyModal] = useState(false)

  const { data: job, isLoading } = useQuery({
    queryKey: ['job', id],
    queryFn: () => get<Job>(`/v1/jobs/${id}`),
    enabled: !!id,
  })

  const applyMutation = useMutation({
    mutationFn: () => post(`/v1/jobs/${id}/apply`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', id] })
      toast({
        title: 'Application submitted!',
        description: 'The recruiter will review your profile.',
      })
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: 'Failed to apply',
        description: 'Please try again later.',
      })
    },
  })

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
          <Button onClick={() => setShowApplyModal(true)}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Apply Now
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
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
          <Card>
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
          <Card>
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
          <Card>
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
          <Card>
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
            onClick={() => applyMutation.mutate()}
            disabled={applyMutation.isPending}
          >
            {applyMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Apply for this Job
          </Button>
        </div>
      </div>
    </div>

    {/* Apply Modal */}
    {job && (
      <ApplyJobModal job={job} open={showApplyModal} onOpenChange={setShowApplyModal} />
    )}
  </>
  )
}
