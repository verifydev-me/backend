/**
 * Jobs Page - Discovery with search and filters
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useJobSearch, useMatchedJobs } from '@/hooks/use-jobs'
import { MatchScore } from '@/components/match-score'
import { Briefcase, MapPin, DollarSign, Search, Filter, TrendingUp } from 'lucide-react'
import { formatSalary, getJobTypeLabel, getJobLevelLabel } from '@/api/services/job.service'
import type { JobSearchFilters } from '@/api/services/job.service'
import { cn } from '@/lib/utils'

export default function JobsPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'matched'>('all')
  const [filters, setFilters] = useState<JobSearchFilters>({
    page: 1,
    limit: 20,
    sortBy: 'recent',
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Queries
  const { data: searchResults, isLoading: searchLoading } = useJobSearch(filters)
  const { data: matchedResults, isLoading: matchedLoading } = useMatchedJobs(filters.page, filters.limit)

  const jobs = activeTab === 'matched' ? matchedResults : searchResults
  const isLoading = activeTab === 'matched' ? matchedLoading : searchLoading

  const handleSearch = () => {
    setFilters({ ...filters, q: searchQuery, page: 1 })
  }

  const handleFilterChange = (key: keyof JobSearchFilters, value: any) => {
    setFilters({ ...filters, [key]: value, page: 1 })
  }

  const clearFilters = () => {
    setFilters({ page: 1, limit: 20, sortBy: 'recent' })
    setSearchQuery('')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Find Your Next Opportunity</h1>
        <p className="text-muted-foreground">
          Discover jobs matched to your verified skills
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab('all')}
          className={cn(
            'px-4 py-2 font-medium border-b-2 transition-colors',
            activeTab === 'all'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          All Jobs
        </button>
        <button
          onClick={() => setActiveTab('matched')}
          className={cn(
            'px-4 py-2 font-medium border-b-2 transition-colors flex items-center gap-2',
            activeTab === 'matched'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <TrendingUp className="w-4 h-4" />
          Matched for You
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search jobs by title, company, or skills..."
              className="pl-10"
            />
          </div>
          <Button onClick={handleSearch}>Search</Button>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-2 w-4 h-4" />
            Filters
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Filters</h3>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              {/* Job Type */}
              <div className="space-y-2">
                <Label>Job Type</Label>
                <Select
                  value={filters.type || ''}
                  onValueChange={(value) => handleFilterChange('type', value || undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All types</SelectItem>
                    <SelectItem value="FULL_TIME">Full Time</SelectItem>
                    <SelectItem value="PART_TIME">Part Time</SelectItem>
                    <SelectItem value="CONTRACT">Contract</SelectItem>
                    <SelectItem value="INTERNSHIP">Internship</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Level */}
              <div className="space-y-2">
                <Label>Experience Level</Label>
                <Select
                  value={filters.level || ''}
                  onValueChange={(value) => handleFilterChange('level', value || undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All levels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All levels</SelectItem>
                    <SelectItem value="ENTRY">Entry Level</SelectItem>
                    <SelectItem value="JUNIOR">Junior</SelectItem>
                    <SelectItem value="MID">Mid Level</SelectItem>
                    <SelectItem value="SENIOR">Senior</SelectItem>
                    <SelectItem value="LEAD">Lead</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  value={filters.location || ''}
                  onChange={(e) => handleFilterChange('location', e.target.value || undefined)}
                  placeholder="City, Country"
                />
              </div>

              {/* Remote */}
              <div className="flex items-center space-x-2 pt-8">
                <Checkbox
                  id="remote"
                  checked={filters.isRemote || false}
                  onCheckedChange={(checked) => handleFilterChange('isRemote', checked || undefined)}
                />
                <Label htmlFor="remote" className="cursor-pointer">
                  Remote Only
                </Label>
              </div>
            </div>

            {/* Salary Range */}
            <div className="grid md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label>Min Salary (USD)</Label>
                <Input
                  type="number"
                  value={filters.salaryMin || ''}
                  onChange={(e) =>
                    handleFilterChange('salaryMin', e.target.value ? parseInt(e.target.value) : undefined)
                  }
                  placeholder="50000"
                />
              </div>
              <div className="space-y-2">
                <Label>Max Salary (USD)</Label>
                <Input
                  type="number"
                  value={filters.salaryMax || ''}
                  onChange={(e) =>
                    handleFilterChange('salaryMax', e.target.value ? parseInt(e.target.value) : undefined)
                  }
                  placeholder="150000"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      <div className="space-y-4">
        {/* Results Header */}
        {jobs && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {jobs.meta.total} jobs found
            </p>
            <Select
              value={filters.sortBy || 'recent'}
              onValueChange={(value) => handleFilterChange('sortBy', value as any)}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="salary">Highest Salary</SelectItem>
                <SelectItem value="relevance">Most Relevant</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Job List */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        ) : jobs && jobs.data.length > 0 ? (
          <>
            {jobs.data.map((job) => (
              <JobCard key={job.id} job={job} showMatch={activeTab === 'matched'} />
            ))}

            {/* Pagination */}
            {jobs.meta.totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  disabled={jobs.meta.page === 1}
                  onClick={() => handleFilterChange('page', jobs.meta.page - 1)}
                >
                  Previous
                </Button>
                <span className="flex items-center px-4 text-sm text-muted-foreground">
                  Page {jobs.meta.page} of {jobs.meta.totalPages}
                </span>
                <Button
                  variant="outline"
                  disabled={jobs.meta.page === jobs.meta.totalPages}
                  onClick={() => handleFilterChange('page', jobs.meta.page + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        ) : (
          <Card className="p-12">
            <div className="text-center">
              <Briefcase className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No jobs found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your filters or search query
              </p>
              <Button onClick={clearFilters} variant="outline">
                Clear Filters
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

// ============================================
// JOB CARD COMPONENT
// ============================================

function JobCard({ job, showMatch }: { job: any; showMatch?: boolean }) {
  return (
    <Link to={`/jobs/${job.id}`}>
      <Card className="hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="flex items-start gap-3 mb-3">
                {job.companyLogo && (
                  <img
                    src={job.companyLogo}
                    alt={job.companyName}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold mb-1 truncate">{job.title}</h3>
                  <p className="text-muted-foreground">{job.companyName}</p>
                </div>
              </div>

              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-3">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {job.location}
                </div>
                {job.isRemote && <Badge variant="secondary">Remote</Badge>}
                <Badge variant="outline">{getJobTypeLabel(job.type)}</Badge>
                <Badge variant="outline">{getJobLevelLabel(job.level)}</Badge>
                {(job.salaryMin || job.salaryMax) && (
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    {formatSalary(job.salaryMin, job.salaryMax, job.currency)}
                  </div>
                )}
              </div>

              {/* Skills */}
              <div className="flex flex-wrap gap-1.5">
                {job.requiredSkills.slice(0, 5).map((skill: string) => (
                  <Badge key={skill} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
                {job.requiredSkills.length > 5 && (
                  <Badge variant="outline" className="text-xs">
                    +{job.requiredSkills.length - 5} more
                  </Badge>
                )}
              </div>
            </div>

            {/* Match Score (if available) */}
            {showMatch && job.matchScore !== undefined && (
              <div className="flex-shrink-0">
                <MatchScore
                  score={job.matchScore}
                  matchedSkills={job.matchedSkills}
                  missingSkills={job.missingSkills}
                  size="sm"
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>{job.applicationCount} applicants</span>
              <span>•</span>
              <span>Posted {new Date(job.createdAt).toLocaleDateString()}</span>
            </div>
            {job.applicationDeadline && (
              <Badge variant="outline" className="text-xs">
                Deadline: {new Date(job.applicationDeadline).toLocaleDateString()}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
