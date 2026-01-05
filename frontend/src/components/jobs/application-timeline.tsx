import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  MessageSquare, 
  Calendar,
  Building,
  MapPin,
  Briefcase,
  ExternalLink,
  FileText,
  Plus,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import type { JobApplication } from '@/types'
import { cn } from '@/lib/utils'
import { useState } from 'react'

interface ApplicationTimelineProps {
  application: JobApplication
  onAddNote?: (note: string) => void
  onWithdraw?: () => void
  className?: string
}

// Status configuration
const statusConfig = {
  pending: {
    icon: Clock,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    label: 'Application Submitted',
    description: 'Your application is being reviewed by the hiring team.',
  },
  reviewing: {
    icon: FileText,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    label: 'Under Review',
    description: 'The recruiter is reviewing your profile and application.',
  },
  shortlisted: {
    icon: CheckCircle2,
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    label: 'Shortlisted',
    description: 'Congratulations! You have been shortlisted for the next round.',
  },
  rejected: {
    icon: XCircle,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    label: 'Not Selected',
    description: 'Unfortunately, you were not selected for this position.',
  },
  accepted: {
    icon: CheckCircle2,
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    label: 'Accepted',
    description: 'Your application has been accepted!',
  },
}

// Timeline steps for different statuses
const getTimelineSteps = (status: string) => {
  const baseSteps = [
    { id: 'applied', label: 'Applied', completed: true },
    { id: 'reviewing', label: 'Under Review', completed: false },
    { id: 'shortlisted', label: 'Shortlisted', completed: false },
    { id: 'interview', label: 'Interview', completed: false },
    { id: 'decision', label: 'Decision', completed: false },
  ]

  const statusIndex = {
    pending: 0,
    reviewing: 1,
    shortlisted: 2,
    accepted: 4,
    rejected: 4,
  }

  const currentIndex = statusIndex[status as keyof typeof statusIndex] || 0
  
  return baseSteps.map((step, index) => ({
    ...step,
    completed: index <= currentIndex,
    current: index === currentIndex,
    failed: status === 'rejected' && index === 4,
  }))
}

export function ApplicationTimeline({ 
  application, 
  onAddNote, 
  onWithdraw,
  className 
}: ApplicationTimelineProps) {
  const [noteText, setNoteText] = useState('')
  const [showNoteInput, setShowNoteInput] = useState(false)

  const status = statusConfig[application.status as keyof typeof statusConfig] || statusConfig.pending
  const StatusIcon = status.icon
  const timelineSteps = getTimelineSteps(application.status)

  const handleAddNote = () => {
    if (noteText.trim() && onAddNote) {
      onAddNote(noteText.trim())
      setNoteText('')
      setShowNoteInput(false)
    }
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      {/* Status Header */}
      <div className={cn('p-4', status.bg, status.border, 'border-b')}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-full', status.bg)}>
              <StatusIcon className={cn('h-5 w-5', status.color)} />
            </div>
            <div>
              <p className={cn('font-semibold', status.color)}>{status.label}</p>
              <p className="text-sm text-muted-foreground">{status.description}</p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            {formatDistanceToNow(new Date(application.appliedAt), { addSuffix: true })}
          </Badge>
        </div>
      </div>

      <CardContent className="p-4 space-y-6">
        {/* Job Info */}
        {application.job && (
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
              {application.job.companyLogo ? (
                <img 
                  src={application.job.companyLogo} 
                  alt={application.job.company}
                  className="h-full w-full object-cover rounded-lg"
                />
              ) : (
                <Building className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">{application.job.title}</h3>
              <p className="text-sm text-muted-foreground">{application.job.company}</p>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {application.job.location}
                </span>
                <span className="flex items-center gap-1">
                  <Briefcase className="h-3 w-3" />
                  {application.job.type}
                </span>
              </div>
            </div>
            <Button variant="ghost" size="icon" asChild>
              <a href={`/jobs/${application.jobId}`}>
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
        )}

        <Separator />

        {/* Timeline */}
        <div>
          <p className="text-sm font-medium mb-4">Application Progress</p>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-muted" />
            
            {/* Steps */}
            <div className="space-y-4">
              {timelineSteps.map((step) => (
                <div key={step.id} className="flex items-center gap-3 relative">
                  <div 
                    className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center z-10',
                      step.failed ? 'bg-red-500' :
                      step.completed ? 'bg-primary' : 
                      step.current ? 'bg-primary/50 ring-2 ring-primary ring-offset-2 ring-offset-background' :
                      'bg-muted'
                    )}
                  >
                    {step.failed ? (
                      <XCircle className="h-3 w-3 text-white" />
                    ) : step.completed ? (
                      <CheckCircle2 className="h-3 w-3 text-white" />
                    ) : (
                      <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                    )}
                  </div>
                  <span className={cn(
                    'text-sm',
                    step.completed || step.current ? 'font-medium' : 'text-muted-foreground'
                  )}>
                    {step.label}
                  </span>
                  {step.current && (
                    <Badge variant="secondary" className="text-xs ml-auto">Current</Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <Separator />

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs mb-1">Applied On</p>
            <p className="font-medium flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(application.appliedAt), 'MMM d, yyyy')}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs mb-1">Last Updated</p>
            <p className="font-medium flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(new Date(application.updatedAt), 'MMM d, yyyy')}
            </p>
          </div>
        </div>

        {/* Notes Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Personal Notes</p>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowNoteInput(!showNoteInput)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Note
            </Button>
          </div>
          
          {showNoteInput && (
            <div className="space-y-2 mb-3">
              <Textarea 
                placeholder="Add a note about this application..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={2}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddNote}>Save</Button>
                <Button size="sm" variant="outline" onClick={() => setShowNoteInput(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Placeholder for notes */}
          <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
            <MessageSquare className="h-4 w-4 inline mr-2" />
            No notes yet. Add notes to track your progress.
          </div>
        </div>

        {/* Actions */}
        {application.status !== 'rejected' && application.status !== 'accepted' && (
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onWithdraw}>
              Withdraw Application
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ApplicationTimeline
