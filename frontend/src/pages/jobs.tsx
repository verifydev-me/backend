import { useState, useMemo } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { get, post } from '@/api/client'
import { formatSalary, formatRelativeTime, cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import type { Job } from '@/types'
import {
  Search,
  MapPin,
  Building,
  Clock,
  Briefcase,
  Zap,
  ArrowRight,
  Loader2,
  Heart,
  DollarSign,
  TrendingUp,
  Home,
  Sparkles,
  SlidersHorizontal,
  BookmarkPlus,
  Send,
  Eye,
  BarChart3,
  Globe,
  X,
} from 'lucide-react'

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

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

const jobTypeIcons: Record<string, React.ReactNode> = {
  'full-time': <Briefcase className="h-3 w-3" />,
  'part-time': <Clock className="h-3 w-3" />,
  contract: <DollarSign className="h-3 w-3" />,
  freelance: <Globe className="h-3 w-3" />,
  internship: <TrendingUp className="h-3 w-3" />,
}

// Skeleton component
function JobCardSkeleton() {
  return (
    <Card>
      <CardContent className="py-6">
        <div className="flex gap-4">
          <div className="h-14 w-14 rounded-xl bg-muted animate-pulse" />
          <div className="flex-1 space-y-3">
            <div className="h-5 w-48 bg-muted rounded animate-pulse" />
            <div className="h-4 w-32 bg-muted rounded animate-pulse" />
            <div className="flex gap-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-6 w-16 bg-muted rounded animate-pulse" />
              ))}
            </div>
          </div>
          <div className="space-y-2 text-right">
            <div className="h-5 w-24 bg-muted rounded animate-pulse ml-auto" />
            <div className="h-4 w-16 bg-muted rounded animate-pulse ml-auto" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function Jobs() {
  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedLevel, setSelectedLevel] = useState<string>('all')
  const [selectedLocation, setSelectedLocation] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('relevance')
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  
  // const queryClient = useQueryClient()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['jobs', { search, type: selectedType, level: selectedLevel }],
    queryFn: () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (selectedType !== 'all') params.set('type', selectedType)
      if (selectedLevel !== 'all') params.set('experienceLevel', selectedLevel)
      return get<{ jobs: Job[]; total: number }>(`/v1/jobs?${params}`)
    },
  })

  const { data: matchedJobs } = useQuery({
    queryKey: ['matched-jobs'],
    queryFn: () => get<Job[]>('/v1/jobs/matched'),
  })

  // Compute stats
  const stats = useMemo(() => {
    const jobs = data?.jobs || []
    return {
      total: jobs.length,
      fullTime: jobs.filter(j => j.type === 'full-time').length,
      remote: jobs.filter(j => j.location?.toLowerCase().includes('remote')).length,
      avgSalary: jobs.length > 0 
        ? Math.round(jobs.reduce((acc, j) => acc + ((j.salaryMin || 0) + (j.salaryMax || 0)) / 2, 0) / jobs.length)
        : 0,
    }
  }, [data?.jobs])

  // Filter and sort jobs
  const filteredJobs = useMemo(() => {
    let jobs = data?.jobs || []
    
    // Location filter
    if (selectedLocation !== 'all') {
      if (selectedLocation === 'remote') {
        jobs = jobs.filter(j => j.location?.toLowerCase().includes('remote'))
      } else if (selectedLocation === 'onsite') {
        jobs = jobs.filter(j => !j.location?.toLowerCase().includes('remote'))
      }
    }
    
    // Sort
    switch (sortBy) {
      case 'salary':
        jobs = [...jobs].sort((a, b) => (b.salaryMax || 0) - (a.salaryMax || 0))
        break
      case 'recent':
        jobs = [...jobs].sort((a, b) => 
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        )
        break
      case 'relevance':
      default:
        // Keep default order (matched first)
        break
    }
    
    return jobs
  }, [data?.jobs, selectedLocation, sortBy])

  const applyMutation = useMutation({
    mutationFn: (jobId: string) => post(`/v1/jobs/${jobId}/apply`),
    onSuccess: () => {
      toast({ title: 'Application sent!', description: 'Good luck with your application.' })
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to apply. Try again.' })
    },
  })

  const toggleSaveJob = (jobId: string) => {
    const newSaved = new Set(savedJobs)
    if (newSaved.has(jobId)) {
      newSaved.delete(jobId)
      toast({ title: 'Removed from saved jobs' })
    } else {
      newSaved.add(jobId)
      toast({ title: 'Saved!', description: 'Job added to your saved list.' })
    }
    setSavedJobs(newSaved)
  }

  const getMatchScore = (_job: Job) => {
    // Simulate match score based on skills
    return Math.floor(Math.random() * 30) + 70
  }

  const jobTypes = ['full-time', 'part-time', 'contract', 'freelance', 'internship']
  const experienceLevels = ['entry', 'mid', 'senior', 'lead', 'executive']

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Briefcase className="h-8 w-8 text-primary" />
            Jobs
          </h1>
          <p className="text-muted-foreground mt-1">
            Find opportunities that match your skills and aura
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <Loader2 className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent" />
          <CardContent className="p-4 relative">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Briefcase className="h-4 w-4" />
              Total Jobs
            </div>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent" />
          <CardContent className="p-4 relative">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Home className="h-4 w-4" />
              Remote
            </div>
            <p className="text-2xl font-bold mt-1">{stats.remote}</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent" />
          <CardContent className="p-4 relative">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Zap className="h-4 w-4" />
              Matched
            </div>
            <p className="text-2xl font-bold mt-1 text-primary">{matchedJobs?.length || 0}</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-transparent" />
          <CardContent className="p-4 relative">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <DollarSign className="h-4 w-4" />
              Avg Salary
            </div>
            <p className="text-2xl font-bold mt-1">${(stats.avgSalary / 1000).toFixed(0)}k</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Matched Jobs Banner */}
      <AnimatePresence>
        {matchedJobs && matchedJobs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border-primary/20 overflow-hidden">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                      <Sparkles className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-lg">
                        🎯 {matchedJobs.length} jobs perfectly matched to your profile!
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Based on your skills, experience, and {' '}
                        <span className="text-primary font-medium">aura score</span>
                      </p>
                    </div>
                  </div>
                  <Button className="gap-2">
                    View Matches
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search & Filter */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search jobs by title, company, or skills..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-11"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[160px] h-11">
              <BarChart3 className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">Relevance</SelectItem>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="salary">Highest Salary</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Job Type Pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <Button
            variant={selectedType === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedType('all')}
            className="flex-shrink-0"
          >
            All Types
          </Button>
          {jobTypes.map((type) => (
            <Button
              key={type}
              variant={selectedType === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedType(type)}
              className="flex-shrink-0 gap-1"
            >
              {jobTypeIcons[type]}
              {jobTypeLabels[type as Job['type']]}
            </Button>
          ))}
        </div>

        {/* Advanced Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <Card>
                <CardContent className="py-4">
                  <div className="flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[200px]">
                      <label className="text-sm font-medium mb-2 block">Experience Level</label>
                      <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                        <SelectTrigger>
                          <SelectValue placeholder="All Levels" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Levels</SelectItem>
                          {experienceLevels.map((level) => (
                            <SelectItem key={level} value={level}>
                              {experienceLevelLabels[level as Job['experienceLevel']]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1 min-w-[200px]">
                      <label className="text-sm font-medium mb-2 block">Location</label>
                      <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                        <SelectTrigger>
                          <SelectValue placeholder="All Locations" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Locations</SelectItem>
                          <SelectItem value="remote">Remote Only</SelectItem>
                          <SelectItem value="onsite">On-site Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setSelectedType('all')
                          setSelectedLevel('all')
                          setSelectedLocation('all')
                          setSearch('')
                        }}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Clear Filters
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Results count */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Showing {filteredJobs.length} of {data?.total || 0} jobs
        </span>
        {savedJobs.size > 0 && (
          <Link to="/jobs/saved" className="text-primary hover:underline flex items-center gap-1">
            <Heart className="h-4 w-4 fill-current" />
            {savedJobs.size} saved
          </Link>
        )}
      </div>

      {/* Jobs List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <JobCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredJobs.length > 0 ? (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-4"
        >
          {filteredJobs.map((job) => {
            const matchScore = getMatchScore(job)
            const isMatched = matchedJobs?.some(m => m.id === job.id)
            const isSaved = savedJobs.has(job.id)
            
            return (
              <motion.div key={job.id} variants={itemVariants}>
                <Card className={cn(
                  "group transition-all duration-300 hover:shadow-lg",
                  isMatched && "border-primary/30 bg-primary/5",
                  isSaved && "border-yellow-500/30"
                )}>
                  <CardContent className="py-6">
                    <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                      {/* Company Logo */}
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          "h-14 w-14 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors",
                          "bg-muted group-hover:bg-primary/10"
                        )}>
                          {job.companyLogo ? (
                            <img
                              src={job.companyLogo}
                              alt={job.company}
                              className="h-10 w-10 object-contain rounded-lg"
                            />
                          ) : (
                            <Building className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                        
                        {/* Mobile: Company name next to logo */}
                        <div className="lg:hidden">
                          <Link
                            to={`/jobs/${job.id}`}
                            className="text-lg font-semibold hover:text-primary transition-colors"
                          >
                            {job.title}
                          </Link>
                          <p className="text-muted-foreground">{job.company}</p>
                        </div>
                      </div>

                      {/* Job Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="hidden lg:block">
                            <div className="flex items-center gap-2">
                              <Link
                                to={`/jobs/${job.id}`}
                                className="text-lg font-semibold hover:text-primary transition-colors"
                              >
                                {job.title}
                              </Link>
                              {isMatched && (
                                <Badge variant="success" className="gap-1">
                                  <Sparkles className="h-3 w-3" />
                                  Matched
                                </Badge>
                              )}
                            </div>
                            <p className="text-muted-foreground">{job.company}</p>
                          </div>
                          
                          {/* Salary & Type - Desktop */}
                          <div className="hidden lg:block text-right flex-shrink-0">
                            <p className="font-semibold text-lg text-primary">
                              {formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency)}
                            </p>
                            <Badge variant="outline" className="gap-1">
                              {jobTypeIcons[job.type]}
                              {jobTypeLabels[job.type]}
                            </Badge>
                          </div>
                        </div>

                        {/* Mobile badges */}
                        <div className="flex flex-wrap gap-2 mt-2 lg:hidden">
                          {isMatched && (
                            <Badge variant="success" className="gap-1">
                              <Sparkles className="h-3 w-3" />
                              Matched
                            </Badge>
                          )}
                          <Badge variant="outline" className="gap-1">
                            {jobTypeIcons[job.type]}
                            {jobTypeLabels[job.type]}
                          </Badge>
                        </div>

                        {/* Meta */}
                        <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {job.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Briefcase className="h-4 w-4" />
                            {experienceLevelLabels[job.experienceLevel]}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {formatRelativeTime(job.createdAt)}
                          </span>
                          {job.minAuraScore && (
                            <span className="flex items-center gap-1 text-primary font-medium">
                              <Zap className="h-4 w-4" />
                              Min {job.minAuraScore} Aura
                            </span>
                          )}
                        </div>

                        {/* Skills */}
                        <div className="flex flex-wrap gap-2 mt-3">
                          {job.skills.slice(0, 6).map((skill) => (
                            <Badge key={skill} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {job.skills.length > 6 && (
                            <Badge variant="outline" className="text-xs">
                              +{job.skills.length - 6} more
                            </Badge>
                          )}
                        </div>

                        {/* Match score bar */}
                        {isMatched && (
                          <div className="mt-4 pt-4 border-t">
                            <div className="flex items-center justify-between text-sm mb-2">
                              <span className="text-muted-foreground">Match Score</span>
                              <span className="font-medium text-primary">{matchScore}%</span>
                            </div>
                            <Progress value={matchScore} className="h-2" />
                          </div>
                        )}

                        {/* Mobile: Salary */}
                        <div className="lg:hidden mt-4 pt-4 border-t">
                          <p className="font-semibold text-lg text-primary">
                            {formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency)}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex lg:flex-col gap-2 flex-shrink-0">
                        <Button asChild className="flex-1 lg:flex-none gap-2">
                          <Link to={`/jobs/${job.id}`}>
                            <Eye className="h-4 w-4" />
                            View Job
                          </Link>
                        </Button>
                        <Button 
                          variant="outline" 
                          className="flex-1 lg:flex-none gap-2"
                          onClick={() => applyMutation.mutate(job.id)}
                          disabled={applyMutation.isPending}
                        >
                          {applyMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                          Quick Apply
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleSaveJob(job.id)}
                          className={cn(isSaved && "text-yellow-500")}
                        >
                          {isSaved ? (
                            <Heart className="h-4 w-4 fill-current" />
                          ) : (
                            <BookmarkPlus className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <Briefcase className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No jobs found</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Try adjusting your search criteria or filters to find more opportunities
              </p>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSelectedType('all')
                  setSelectedLevel('all')
                  setSelectedLocation('all')
                  setSearch('')
                }}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Clear All Filters
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
