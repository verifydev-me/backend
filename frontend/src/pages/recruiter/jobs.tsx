/**
 * Recruiter Jobs List Page
 * View and manage posted jobs
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { get } from '@/api/client'
import {
  Plus,
  Search,
  Briefcase,
  Users,
  MapPin,
  Clock,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Job {
  id: string
  title: string
  location: string
  isRemote: boolean
  type: string
  level: string
  status: 'ACTIVE' | 'PAUSED' | 'CLOSED' | 'DRAFT'
  applicationsCount: number
  createdAt: string
  requiredSkills: string[]
}

const STATUS_CONFIG = {
  ACTIVE: { label: 'Active', color: 'bg-green-500' },
  PAUSED: { label: 'Paused', color: 'bg-yellow-500' },
  CLOSED: { label: 'Closed', color: 'bg-gray-500' },
  DRAFT: { label: 'Draft', color: 'bg-blue-500' },
}

const TYPE_LABELS: Record<string, string> = {
  FULL_TIME: 'Full Time',
  PART_TIME: 'Part Time',
  CONTRACT: 'Contract',
  INTERNSHIP: 'Internship',
}

export default function RecruiterJobsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['recruiter-jobs'],
    queryFn: async () => {
      const res = await get<{ jobs: Job[] }>('/v1/recruiter/jobs')
      return res.jobs
    },
  })

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalApplicants = jobs.reduce((sum, job) => sum + job.applicationsCount, 0)
  const activeJobs = jobs.filter(j => j.status === 'ACTIVE').length

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-1">Job Listings</h1>
          <p className="text-muted-foreground">
            {jobs.length} job{jobs.length !== 1 ? 's' : ''} • {activeJobs} active • {totalApplicants} total applicants
          </p>
        </div>
        <Link to="/recruiter/post-job">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Post New Job
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card className="border border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Briefcase className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{jobs.length}</p>
                <p className="text-sm text-muted-foreground">Total Jobs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Eye className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeJobs}</p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalApplicants}</p>
                <p className="text-sm text-muted-foreground">Applicants</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Clock className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{jobs.filter(j => j.status === 'DRAFT').length}</p>
                <p className="text-sm text-muted-foreground">Drafts</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="PAUSED">Paused</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Jobs List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredJobs.length === 0 ? (
        <Card className="border border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Briefcase className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No jobs found</h3>
            <p className="text-muted-foreground mb-4">
              {jobs.length === 0 ? "You haven't posted any jobs yet" : "No jobs match your filters"}
            </p>
            <Link to="/recruiter/post-job">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Post Your First Job
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredJobs.map((job, index) => (
            <JobCard key={job.id} job={job} index={index} />
          ))}
        </div>
      )}
    </div>
  )
}

function JobCard({ job, index }: { job: Job; index: number }) {
  const status = STATUS_CONFIG[job.status]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="border border-border/50 hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Link
                  to={`/recruiter/jobs/${job.id}/applicants`}
                  className="text-xl font-semibold hover:underline"
                >
                  {job.title}
                </Link>
                <Badge className={cn('text-white', status.color)}>
                  {status.label}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {job.location}
                  {job.isRemote && ' (Remote)'}
                </span>
                <span className="flex items-center gap-1">
                  <Briefcase className="w-4 h-4" />
                  {TYPE_LABELS[job.type] || job.type}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Posted {format(new Date(job.createdAt), 'MMM d, yyyy')}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {job.requiredSkills?.slice(0, 5).map(skill => (
                  <Badge key={skill} variant="outline">
                    {skill}
                  </Badge>
                ))}
                {job.requiredSkills?.length > 5 && (
                  <Badge variant="outline">
                    +{job.requiredSkills.length - 5} more
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Link to={`/recruiter/jobs/${job.id}/applicants`}>
                <div className="text-center px-4 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <p className="text-2xl font-bold">{job.applicationsCount}</p>
                  <p className="text-xs text-muted-foreground">Applicants</p>
                </div>
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Job
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    {job.status === 'ACTIVE' ? (
                      <>
                        <EyeOff className="w-4 h-4 mr-2" />
                        Pause Job
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 mr-2" />
                        Activate Job
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-red-600">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Job
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
