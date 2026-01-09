/**
 * Applicants Management Page for Recruiters
 */

import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from '@/hooks/use-toast'
import { get, put } from '@/api/client'
import { AuraScore } from '@/components/aura-score'
import { MatchScore } from '@/components/match-score'
import { VerifiedBadge } from '@/components/verified-badge'
import {
  ArrowLeft,
  User,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
  FileText,
  ExternalLink,
  Loader2,
  Github,
  MapPin,
  Star,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface Applicant {
  id: string
  userId: string
  jobId: string
  status: 'PENDING' | 'REVIEWING' | 'SHORTLISTED' | 'INTERVIEW' | 'OFFER' | 'REJECTED' | 'WITHDRAWN'
  appliedAt: string
  note?: string
  recruiterNotes?: string
  user: {
    id: string
    name: string
    email: string
    avatarUrl?: string
    location?: string
    title?: string
    githubUsername?: string
  }
  aura?: {
    overallScore: number
    level: string
    isVerified: boolean
  }
  matchScore?: number
  matchedSkills?: string[]
  missingSkills?: string[]
}

interface Job {
  id: string
  title: string
  company: string
  location: string
  requiredSkills: string[]
  preferredSkills: string[]
}

const STATUS_CONFIG = {
  PENDING: { label: 'Pending', color: 'bg-gray-500', icon: Clock },
  REVIEWING: { label: 'Reviewing', color: 'bg-blue-500', icon: FileText },
  SHORTLISTED: { label: 'Shortlisted', color: 'bg-purple-500', icon: Star },
  INTERVIEW: { label: 'Interview', color: 'bg-yellow-500', icon: Calendar },
  OFFER: { label: 'Offer', color: 'bg-green-500', icon: CheckCircle2 },
  REJECTED: { label: 'Rejected', color: 'bg-red-500', icon: XCircle },
  WITHDRAWN: { label: 'Withdrawn', color: 'bg-gray-400', icon: XCircle },
}

export default function ApplicantsPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('all')
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null)
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false)
  const [noteText, setNoteText] = useState('')

  // Fetch job details
  const { data: job, isLoading: jobLoading } = useQuery({
    queryKey: ['job', jobId],
    queryFn: async () => {
      const res = await get<{ job: Job }>(`/v1/jobs/${jobId}`)
      return res.job
    },
    enabled: !!jobId,
  })

  // Fetch applicants
  const { data: applicants = [], isLoading: applicantsLoading } = useQuery({
    queryKey: ['applicants', jobId],
    queryFn: async () => {
      const res = await get<{ applications: Applicant[] }>(`/v1/recruiters/jobs/${jobId}/applications`)
      return res.applications
    },
    enabled: !!jobId,
  })

  // Update application status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ applicationId, status }: { applicationId: string; status: string }) => {
      return put(`/v1/recruiters/applications/${applicationId}/status`, { status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applicants', jobId] })
      toast({ title: 'Status updated successfully' })
    },
    onError: () => {
      toast({ title: 'Failed to update status', variant: 'destructive' })
    },
  })

  // Add recruiter note
  const addNoteMutation = useMutation({
    mutationFn: async ({ applicationId, note }: { applicationId: string; note: string }) => {
      return put(`/v1/recruiters/applications/${applicationId}/note`, { note })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applicants', jobId] })
      setIsNoteDialogOpen(false)
      setNoteText('')
      toast({ title: 'Note added successfully' })
    },
  })

  const filteredApplicants = activeTab === 'all'
    ? applicants
    : applicants.filter(a => a.status === activeTab.toUpperCase())

  const counts = {
    all: applicants.length,
    pending: applicants.filter(a => a.status === 'PENDING').length,
    shortlisted: applicants.filter(a => a.status === 'SHORTLISTED').length,
    interview: applicants.filter(a => a.status === 'INTERVIEW').length,
    rejected: applicants.filter(a => a.status === 'REJECTED').length,
  }

  const isLoading = jobLoading || applicantsLoading

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          to="/recruiter/jobs"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to jobs
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{job?.title}</h1>
            <p className="text-muted-foreground">
              {counts.all} applicant{counts.all !== 1 ? 's' : ''} • {job?.location}
            </p>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            {counts.all} Total
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
          <TabsTrigger value="shortlisted">Shortlisted ({counts.shortlisted})</TabsTrigger>
          <TabsTrigger value="interview">Interview ({counts.interview})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({counts.rejected})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredApplicants.length === 0 ? (
              <Card className="border border-border/50">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <User className="w-12 h-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No applicants in this category</p>
                </CardContent>
              </Card>
            ) : (
              filteredApplicants.map((applicant, index) => (
                <ApplicantCard
                  key={applicant.id}
                  applicant={applicant}
                  job={job!}
                  index={index}
                  onStatusChange={(status) =>
                    updateStatusMutation.mutate({ applicationId: applicant.id, status })
                  }
                  onAddNote={() => {
                    setSelectedApplicant(applicant)
                    setNoteText(applicant.recruiterNotes || '')
                    setIsNoteDialogOpen(true)
                  }}
                />
              ))
            )}
          </AnimatePresence>
        </TabsContent>
      </Tabs>

      {/* Note Dialog */}
      <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Internal Notes</DialogTitle>
            <DialogDescription>
              Add private notes about {selectedApplicant?.user.name}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Add your notes here..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            className="min-h-32"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNoteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedApplicant && addNoteMutation.mutate({
                applicationId: selectedApplicant.id,
                note: noteText,
              })}
              disabled={addNoteMutation.isPending}
            >
              {addNoteMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Save Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface ApplicantCardProps {
  applicant: Applicant
  job: Job
  index: number
  onStatusChange: (status: string) => void
  onAddNote: () => void
}

function ApplicantCard({ applicant, job, index, onStatusChange, onAddNote }: ApplicantCardProps) {
  const status = STATUS_CONFIG[applicant.status]
  const StatusIcon = status.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="border border-border/50 hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <Avatar className="w-16 h-16">
              <AvatarImage src={applicant.user.avatarUrl} />
              <AvatarFallback className="text-lg">
                {applicant.user.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>

            {/* Main Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/recruiter/candidates/${applicant.userId}`}
                      className="text-xl font-semibold hover:underline"
                    >
                      {applicant.user.name}
                    </Link>
                    {applicant.aura?.isVerified && <VerifiedBadge size="sm" />}
                  </div>
                  {applicant.user.title && (
                    <p className="text-muted-foreground">{applicant.user.title}</p>
                  )}
                </div>

                {/* Status Badge */}
                <Badge className={cn('gap-1', status.color, 'text-white')}>
                  <StatusIcon className="w-3 h-3" />
                  {status.label}
                </Badge>
              </div>

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                {applicant.user.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {applicant.user.location}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Applied {format(new Date(applicant.appliedAt), 'MMM d, yyyy')}
                </span>
                {applicant.user.githubUsername && (
                  <a
                    href={`https://github.com/${applicant.user.githubUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-foreground"
                  >
                    <Github className="w-4 h-4" />
                    {applicant.user.githubUsername}
                  </a>
                )}
              </div>

              {/* Scores */}
              <div className="flex items-center gap-6 mb-4">
                {applicant.aura && (
                  <AuraScore score={applicant.aura.overallScore} level={applicant.aura.overallScore} size="sm" showLevel />
                )}
                {applicant.matchScore !== undefined && (
                  <MatchScore score={applicant.matchScore} size="sm" />
                )}
              </div>

              {/* Skill Match */}
              {applicant.matchedSkills && applicant.matchedSkills.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">
                    Matched Skills ({applicant.matchedSkills.length}/{job.requiredSkills.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {applicant.matchedSkills.map(skill => (
                      <Badge key={skill} variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        {skill}
                      </Badge>
                    ))}
                    {applicant.missingSkills?.map(skill => (
                      <Badge key={skill} variant="outline" className="text-muted-foreground">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Recruiter Notes */}
              {applicant.recruiterNotes && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>Note:</strong> {applicant.recruiterNotes}
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Link to={`/recruiter/candidates/${applicant.userId}`}>
                <Button variant="outline" size="sm">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Profile
                </Button>
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Update Status
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onStatusChange('REVIEWING')}>
                    <FileText className="w-4 h-4 mr-2" />
                    Mark as Reviewing
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onStatusChange('SHORTLISTED')}>
                    <Star className="w-4 h-4 mr-2" />
                    Shortlist
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onStatusChange('INTERVIEW')}>
                    <Calendar className="w-4 h-4 mr-2" />
                    Move to Interview
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onStatusChange('OFFER')}>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Extend Offer
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onStatusChange('REJECTED')}
                    className="text-red-600"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant="ghost" size="icon" onClick={onAddNote}>
                <MessageSquare className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
