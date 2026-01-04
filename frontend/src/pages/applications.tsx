import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { get } from '@/api/client'
import { formatDate } from '@/lib/utils'
import type { JobApplication } from '@/types'
import { FileText, ExternalLink, Loader2 } from 'lucide-react'

const statusConfig: Record<
  JobApplication['status'],
  { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' }
> = {
  pending: { label: 'Pending', variant: 'secondary' },
  reviewing: { label: 'Under Review', variant: 'warning' },
  shortlisted: { label: 'Shortlisted', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'destructive' },
  accepted: { label: 'Accepted', variant: 'success' },
}

export default function Applications() {
  const { data, isLoading } = useQuery({
    queryKey: ['applications'],
    queryFn: () => get<{ applications: JobApplication[] }>('/v1/applications'),
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">My Applications</h1>
        <p className="text-muted-foreground mt-1">
          Track your job applications
        </p>
      </div>

      {/* Applications List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : data?.applications && data.applications.length > 0 ? (
        <div className="space-y-4">
          {data.applications.map((application) => (
            <Card key={application.id}>
              <CardContent className="py-6">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">
                        {application.job?.title || 'Job Title'}
                      </h3>
                      <Badge variant={statusConfig[application.status].variant as any}>
                        {statusConfig[application.status].label}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground">
                      {application.job?.company || 'Company'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Applied on {formatDate(application.appliedAt)}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/jobs/${application.jobId}`}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Job
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold mb-2">No applications yet</h3>
            <p className="text-muted-foreground mb-4">
              Start applying to jobs to track your applications here
            </p>
            <Button asChild>
              <Link to="/jobs">Browse Jobs</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
