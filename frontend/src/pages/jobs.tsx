import { useState, useMemo } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
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
    <Card className="border border-border/80">
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
  const navigate = useNavigate()
  
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
        <Card className="relative overflow-hidden border border-border/80">
          <div className="absolute inset-0 bg-muted/30" />
          <CardContent className="p-4 relative">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Briefcase className="h-4 w-4" />
              Total Jobs
            </div>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border border-border/80">
          <div className="absolute inset-0 bg-muted/30" />
          <CardContent className="p-4 relative">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Home className="h-4 w-4" />
              Remote
            </div>
            <p className="text-2xl font-bold mt-1">{stats.remote}</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border border-border/80">
          <div className="absolute inset-0 bg-muted/30" />
          <CardContent className="p-4 relative">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Zap className="h-4 w-4" />
              Matched
            </div>
            <p className="text-2xl font-bold mt-1 text-primary">{matchedJobs?.length || 0}</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border border-border/80">
          <div className="absolute inset-0 bg-muted/30" />
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
            <Card className="border border-primary/30 bg-muted/30 overflow-hidden">
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
              <Card className="border border-border/80">
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
            const isMatched = Array.isArray(matchedJobs) && matchedJobs.some(m => m.id === job.id)
            const isSaved = savedJobs.has(job.id)
            
            return (
              <motion.div key={job.id} variants={itemVariants}>
                <Card 
                  onClick={() => navigate(`/jobs/${job.id}`)}
                  className={cn(
                  "group relative overflow-hidden transition-all duration-300 hover:shadow-xl border-border/60 cursor-pointer",
                  "hover:border-primary/50 active:scale-[0.99]",
                  isMatched ? "bg-gradient-to-br from-background to-primary/5 border-primary/20" : "bg-card",
                  isSaved && "border-yellow-500/40"
                )}>
                  {/* Hover Gradient Glow */}
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                  
                  <CardContent className="p-6 relative">
                    <div className="flex flex-col gap-4">
                      {/* Top Row: Logo + Main Info + Salary/Actions */}
                      <div className="flex items-start gap-4">
                        {/* Logo */}
                        <div className={cn(
                          "h-14 w-14 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300",
                          "bg-surface-1 border border-border/50 shadow-sm group-hover:shadow-md"
                        )}>
                          {job.companyLogo ? (
                            <img
                              src={job.companyLogo}
                              alt={job.company}
                              className="h-9 w-9 object-contain rounded-md"
                            />
                          ) : (
                            <Building className="h-7 w-7 text-muted-foreground/40" />
                          )}
                        </div>

                        {/* Title & Company */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-y-2">
                             <div>
                                <h3 className="text-lg font-bold text-foreground hover:text-primary transition-colors line-clamp-1">
                                  {job.title}
                                </h3>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                                  <span className="font-medium text-foreground/80">
                                    {job.company || "Confidential Company"}
                                  </span>
                                  <span className="h-1 w-1 rounded-full bg-border" />
                                  <span className="flex items-center gap-1">
                                     <MapPin className="h-3 w-3" />
                                     {job.isRemote ? "Remote" : job.location}
                                  </span>
                                </div>
                             </div>

                             {/* Right Side: Salary & Badges (Desktop) */}
                             <div className="hidden sm:flex flex-col items-end gap-1">
                                <p className="font-bold text-lg text-emerald-600 dark:text-emerald-400">
                                  {formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency)}
                                </p>
                                <div className="flex items-center gap-2 text-xs">
                                    {(job.minAuraScore || 0) > 0 && (
                                        <Badge variant="outline" className="h-5 border-primary/20 text-primary bg-primary/5 gap-1 px-1.5 font-normal">
                                            <Zap className="h-3 w-3" /> {job.minAuraScore}+ Aura
                                        </Badge>
                                    )}
                                    <Badge variant="secondary" className="h-5 gap-1 font-normal bg-secondary/50 text-muted-foreground">
                                        {jobTypeLabels[job.type?.toLowerCase().replace('_', '-') as keyof typeof jobTypeLabels] || job.type}
                                    </Badge>
                                    <span className="text-muted-foreground flex items-center gap-1">
                                       <Clock className="h-3 w-3" /> {formatRelativeTime(job.createdAt)}
                                    </span>
                                </div>
                             </div>
                          </div>
                        </div>
                      </div>

                      {/* Middle: Description */}
                      <div className="text-sm text-muted-foreground leading-relaxed pl-[4.5rem] break-words -mt-2">
                          {job.description?.length > 150 ? (
                              <>
                                  {job.description.slice(0, 150).trim()}... 
                                  <span className="ml-1 text-primary font-medium">Read more</span>
                              </>
                          ) : (
                              job.description
                          )}
                      </div>

                      {/* Bottom Row: Skills + Actions */}
                      <div className="flex items-center justify-between gap-4 pl-[4.5rem] pt-2">
                          {/* Skills Pills */}
                          <div className="flex flex-wrap gap-2">
                            {(job.requiredSkills || job.skills || []).slice(0, 4).map((skill) => (
                                <span key={skill} className="px-2 py-1 rounded-md bg-secondary/40 text-xs font-medium text-secondary-foreground border border-transparent group-hover:border-border/60 transition-colors">
                                  {skill}
                                </span>
                            ))}
                            {(job.requiredSkills || job.skills || []).length > 4 && (
                                <span className="px-2 py-1 text-xs text-muted-foreground font-medium">
                                  +{(job.requiredSkills || job.skills || []).length - 4}
                                </span>
                            )}
                          </div>

                          {/* Desktop Actions */}
                          <div className="hidden sm:flex items-center gap-3">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mr-2">
                                {job.applicationsCount > 0 && (
                                   <span className="flex items-center gap-1 text-primary/80 bg-primary/5 px-2 py-0.5 rounded-full">
                                       <TrendingUp className="h-3 w-3" /> {job.applicationsCount} applicants
                                   </span>
                                )}
                                <span className="flex items-center gap-1 px-2 py-0.5">
                                   <Eye className="h-3 w-3" /> {job.viewsCount || 0}
                                </span>
                              </div>
                              
                              <Button 
                                  className="h-9 px-4 rounded-lg shadow-sm hover:shadow-md transition-all gap-2 font-medium"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    applyMutation.mutate(job.id)
                                  }}
                              >
                                  Quick Apply <ArrowRight className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleSaveJob(job.id)
                                  }}
                                  className={cn("h-9 w-9 rounded-lg border-border/60 bg-transparent hover:bg-secondary", isSaved && "text-yellow-500 border-yellow-500/20 bg-yellow-500/5")}
                              >
                                  {isSaved ? <Heart className="h-4 w-4 fill-current" /> : <BookmarkPlus className="h-4 w-4" />}
                              </Button>
                          </div>
                      </div>

                      {/* Mobile Only: Salary & Actions (Stacked below) */}
                      <div className="sm:hidden mt-2 pt-3 border-t flex flex-col gap-3">
                          <div className="flex justify-between items-center">
                             <p className="font-bold text-lg text-emerald-600 dark:text-emerald-400">
                                {formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency)}
                             </p>
                             <div className="flex gap-2">
                                <Badge variant="secondary" className="text-xs">{jobTypeLabels[job.type?.toLowerCase().replace('_', '-') as keyof typeof jobTypeLabels] || job.type}</Badge>
                                {(job.minAuraScore || 0) > 0 && <Badge variant="outline" className="text-xs border-primary/30 text-primary">{job.minAuraScore}+ Aura</Badge>}
                             </div>
                          </div>
                          <div className="flex gap-2">
                             <Button 
                               className="flex-1" 
                               onClick={(e) => {
                                 e.stopPropagation()
                                 applyMutation.mutate(job.id)
                               }}
                             >
                               Quick Apply
                             </Button>
                             <Button 
                               variant="outline" 
                               size="icon" 
                               onClick={(e) => {
                                 e.stopPropagation()
                                 toggleSaveJob(job.id)
                               }}
                             >
                                {isSaved ? <Heart className="h-4 w-4 fill-current" /> : <BookmarkPlus className="h-4 w-4" />}
                             </Button>
                          </div>
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
              <div className="h-16 w-16 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4">
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
