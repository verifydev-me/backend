import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/auth-store'
import { useUserStore } from '@/store/user-store'
import { useUIStore } from '@/store/ui-store'
import { useQuery } from '@tanstack/react-query'
import { get } from '@/api/client'
import type { Job } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { PostJobModal } from '@/components/recruiter'
import { formatNumber, formatRelativeTime } from '@/lib/utils'
import {
  FolderGit2,
  TrendingUp,
  Briefcase,
  ArrowRight,
  Star,
  GitFork,
  Eye,
  CheckCircle2,
  Clock,
  Sparkles,
  Target,
  Award,
  FileText,
  Plus,
  ExternalLink,
  Loader2,
  ChevronRight,
  Code,
  Activity,
  Flame,
  Github,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

// Onboarding steps
const ONBOARDING_STEPS = [
  { id: 'profile', label: 'Complete Profile', icon: Eye, points: 30 },
  { id: 'github', label: 'Connect GitHub', icon: Github, points: 20 },
  { id: 'project', label: 'Analyze First Project', icon: FolderGit2, points: 50 },
  { id: 'resume', label: 'Generate Resume', icon: FileText, points: 20 },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { accentColor } = useUIStore()
  const { 
    aura, 
    projects, 
    skills,
    isLoadingAura, 
    isLoadingProjects,
    fetchAura, 
    fetchProjects,
    fetchGitHubRepos,
    fetchSkills,
  } = useUserStore()

  const [showOnboarding, setShowOnboarding] = useState(true)
  const [selectedTab, setSelectedTab] = useState<'overview' | 'activity' | 'insights'>('overview')
  const [showPostJobModal, setShowPostJobModal] = useState(false)

  // Fetch job statistics
  const { data: jobsData } = useQuery({
    queryKey: ['jobs-stats'],
    queryFn: async () => {
      try {
        const response = await get<{ jobs: Job[]; total: number }>('/v1/jobs?limit=100')
        return response
      } catch (error) {
        console.log('Jobs API not available:', error)
        return { jobs: [], total: 0 }
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const { data: matchedJobsData } = useQuery({
    queryKey: ['matched-jobs-stats'],
    queryFn: async () => {
      try {
        const response = await get<{ data: Job[] }>('/v1/jobs/matched')
        return response?.data || []
      } catch (error) {
        console.log('Matched jobs API not available:', error)
        return []
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Calculate job statistics
  const jobStats = useMemo(() => {
    const allJobs = jobsData?.jobs || []
    const matched = Array.isArray(matchedJobsData) ? matchedJobsData.length : 0
    return {
      total: allJobs.length || 5, // Fallback to demo value
      matched: matched || 0,
    }
  }, [jobsData, matchedJobsData])

  // Fetch data on mount
  useEffect(() => {
    fetchAura()
    fetchProjects()
    fetchGitHubRepos()
    fetchSkills()
  }, [fetchAura, fetchProjects, fetchGitHubRepos, fetchSkills])

  // Auto-refresh aura every 30 seconds to keep it updated
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAura()
    }, 30000) // 30 seconds
    return () => clearInterval(interval)
  }, [fetchAura])

  // Calculate onboarding progress (reactive to user, projects, skills, aura)
  const onboarding = useMemo(() => {
    if (!user) return { completed: 0, total: 4, steps: ONBOARDING_STEPS.map(s => ({ ...s, done: false })) }
    
    const steps = ONBOARDING_STEPS.map(step => {
      let done = false
      switch (step.id) {
        case 'profile':
          // Check if user has filled basic profile info
          done = !!(user.bio && user.location)
          break
        case 'github':
          // Check if GitHub is connected
          done = !!user.githubId
          break
        case 'project':
          // Check if user has at least one analyzed project
          done = projects.some(p => p.analysisStatus === 'completed')
          break
        case 'resume':
          // Check if user has generated resume (track via localStorage or check if aura >= 120)
          // Automatically mark as done when aura reaches 120+ (all other steps give exactly 100)
          const hasGeneratedResume = localStorage.getItem('resume-generated') === 'true'
          done = hasGeneratedResume || (aura?.total || 0) >= 120
          break
      }
      return { ...step, done }
    })
    
    return {
      completed: steps.filter(s => s.done).length,
      total: steps.length,
      steps,
    }
  }, [user, projects, aura]) // Recalculate when user, projects, or aura changes
  const onboardingPercent = (onboarding.completed / onboarding.total) * 100

  // Use real activity from aura recent gains
  const recentActivity = aura?.recentGains.map(gain => ({
    type: gain.points > 10 ? 'project_analyzed' : 'skill_verified',
    title: gain.source,
    description: `Earned ${gain.points} aura points`,
    time: formatRelativeTime(gain.date),
    points: gain.points
  })) || [
    { type: 'project_analyzed', title: 'Start Analyzing', description: 'Analyze a project to see activity here', time: 'Now', points: 0 },
  ]

  // Calculate real skill distribution from skills
  const getSkillDistribution = () => {
    if (!skills || skills.length === 0) {
      return [
        { name: 'Languages', value: 35 },
        { name: 'Frameworks', value: 25 },
        { name: 'Databases', value: 20 },
        { name: 'Other', value: 20 },
      ]
    }
    
    const categories: Record<string, number> = {}
    skills.forEach(s => {
      const cat = s.category.charAt(0).toUpperCase() + s.category.slice(1).toLowerCase()
      categories[cat] = (categories[cat] || 0) + 1
    })
    
    return Object.entries(categories).map(([name, count]) => ({
      name,
      value: Math.round((count / skills.length) * 100)
    }))
  }

  const skillDistribution = getSkillDistribution()

  // Build chart colors starting from the primary accent color
  const chartPrimary = `hsl(${accentColor})`
  const SKILL_CHART_COLORS = [
    chartPrimary,
    `hsl(${accentColor} / 0.8)`,
    `hsl(${accentColor} / 0.6)`,
    `hsl(${accentColor} / 0.4)`,
    `hsl(${accentColor} / 0.22)`,
  ]

  // Mock aura history but using the accent color for rendering
  const auraHistory = [
    { date: 'Dec 1', score: Math.max(0, (aura?.total || 0) - 130) },
    { date: 'Dec 8', score: Math.max(0, (aura?.total || 0) - 105) },
    { date: 'Dec 15', score: Math.max(0, (aura?.total || 0) - 82) },
    { date: 'Dec 22', score: Math.max(0, (aura?.total || 0) - 55) },
    { date: 'Dec 29', score: Math.max(0, (aura?.total || 0) - 30) },
    { date: 'Today', score: aura?.total || 0 },
  ]

  if (!user) return null

  const analyzedProjects = projects.filter(p => p.analysisStatus === 'completed')
  const pendingProjects = projects.filter(p => p.analysisStatus === 'analyzing' || p.analysisStatus === 'pending')

  return (
    <div className="space-y-6">
      {/* Header with greeting and quick actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">
              Welcome back, {user.name?.split(' ')[0] || user.username}!
            </h1>
            {aura && aura.trend === 'up' && (
              <Badge className="bg-green-500/20 text-green-400">
                <TrendingUp className="h-3 w-3 mr-1" />
                Trending Up
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </motion.div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/profile')}>
            <Eye className="h-4 w-4 mr-2" />
            View Profile
          </Button>
          <Button size="sm" onClick={() => navigate('/projects')}>
            <Plus className="h-4 w-4 mr-2" />
            Add Project
          </Button>
          <Button 
            size="sm" 
            className="bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/30"
            onClick={() => setShowPostJobModal(true)}
          >
            <Briefcase className="h-4 w-4 mr-2" />
            Post Job
          </Button>
        </div>
      </div>

      {/* Onboarding Progress (show if not complete) */}
      {showOnboarding && onboarding.completed < onboarding.total && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Complete Your Profile</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Earn up to 120 aura points
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowOnboarding(false)}
                >
                  Dismiss
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span>{onboarding.completed} of {onboarding.total} completed</span>
                  <span className="text-primary font-medium">{Math.round(onboardingPercent)}%</span>
                </div>
                <Progress value={onboardingPercent} className="h-2" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {onboarding.steps.map((step, index) => {
                  const Icon = step.icon
                  return (
                    <motion.div
                      key={step.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className={`p-3 rounded-lg border transition-all cursor-pointer ${
                        step.done
                          ? 'border-green-500/30 bg-green-500/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => {
                        if (!step.done) {
                          switch (step.id) {
                            case 'profile': navigate('/settings'); break
                            case 'project': navigate('/profile'); break
                            case 'resume': navigate('/profile'); break
                          }
                        }
                      }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {step.done ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <Icon className="h-5 w-5 text-muted-foreground" />
                        )}
                        <span className={`text-xs font-medium ${step.done ? 'text-green-500' : 'text-primary'}`}>
                          +{step.points} pts
                        </span>
                      </div>
                      <p className={`text-sm ${step.done ? 'line-through text-muted-foreground' : 'font-medium'}`}>
                        {step.label}
                      </p>
                    </motion.div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Main Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Aura Score Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="relative overflow-hidden h-full cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => navigate('/profile')}>
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent" />
            <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aura Score</CardTitle>
              <Sparkles className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent className="relative">
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                  {isLoadingAura ? '...' : formatNumber(aura?.total || user.auraScore || 0)}
                </span>
                {aura?.trend === 'up' && (
                  <span className="text-green-400 text-sm mb-1 flex items-center">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +15
                  </span>
                )}
              </div>
              <Badge 
                className={`mt-2 ${
                  (aura?.level || 'novice') === 'legend' ? 'bg-yellow-500/20 text-yellow-400' :
                  (aura?.level || 'novice') === 'expert' ? 'bg-purple-500/20 text-purple-400' :
                  (aura?.level || 'novice') === 'skilled' ? 'bg-blue-500/20 text-blue-400' :
                  (aura?.level || 'novice') === 'rising' ? 'bg-green-500/20 text-green-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}
              >
                {(aura?.level || 'novice').charAt(0).toUpperCase() + (aura?.level || 'novice').slice(1)} Level
              </Badge>
            </CardContent>
          </Card>
        </motion.div>

        {/* Projects Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="h-full cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => navigate('/projects')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Projects</CardTitle>
              <FolderGit2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{projects.length}</div>
              <div className="flex items-center gap-2 mt-2 text-sm">
                <span className="flex items-center text-green-400">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {analyzedProjects.length} analyzed
                </span>
                {pendingProjects.length > 0 && (
                  <span className="flex items-center text-yellow-400">
                    <Clock className="h-3 w-3 mr-1" />
                    {pendingProjects.length} pending
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Skills Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Verified Skills</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{skills.length}</div>
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <Code className="h-3 w-3" />
                From {analyzedProjects.length} projects
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Job Matches Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="h-full cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => navigate('/jobs')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Job Matches</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{jobStats.total}</div>
              <div className="flex items-center gap-2 mt-2 text-sm">
                {jobStats.matched > 0 ? (
                  <Badge variant="secondary" className="text-xs bg-primary/20 text-primary">
                    <Flame className="h-3 w-3 mr-1" />
                    {jobStats.matched} matched
                  </Badge>
                ) : (
                  <span className="text-muted-foreground text-xs">No matches yet</span>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-border pb-2">
        {['overview', 'activity', 'insights'].map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab as typeof selectedTab)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              selectedTab === tab
                ? 'bg-primary/10 text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {selectedTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid gap-6 lg:grid-cols-3"
          >
            {/* Aura Progress Chart */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Aura Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={auraHistory}>
                    <defs>
                      <linearGradient id="auraGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartPrimary} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={chartPrimary} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12, fill: '#71717a' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis hide domain={['dataMin - 20', 'dataMax + 20']} />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: '#18181b',
                        border: '1px solid #27272a',
                        borderRadius: '8px',
                        padding: '8px 12px',
                      }}
                      labelStyle={{ color: '#a1a1aa' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke={chartPrimary}
                      fill="url(#auraGradient)"
                      strokeWidth={3}
                      dot={{ fill: chartPrimary, r: 4 }}
                      activeDot={{ r: 6, stroke: chartPrimary, strokeWidth: 2, fill: '#fff' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => navigate('/profile')}
                >
                  <span className="flex items-center gap-2">
                    <FolderGit2 className="h-4 w-4" />
                    Analyze New Project
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => navigate('/profile')}
                >
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Generate Resume
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => navigate('/jobs')}
                >
                  <span className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Browse Jobs
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => {
                    const url = `${window.location.origin}/u/${user.username}`
                    navigator.clipboard.writeText(url)
                  }}
                >
                  <span className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Share Profile
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            {/* Recent Projects */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recent Projects</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/projects" className="flex items-center gap-1">
                    View all <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {isLoadingProjects ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : projects.length > 0 ? (
                  <div className="space-y-3">
                    {projects.slice(0, 4).map((project, index) => (
                      <motion.div
                        key={project.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Link
                          to={`/projects/${project.id}`}
                          className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                              <FolderGit2 className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium group-hover:text-primary transition-colors">
                                {project.name}
                              </p>
                              <p className="text-xs text-muted-foreground flex items-center gap-2">
                                <span>{project.language}</span>
                                <span>•</span>
                                <span>{formatRelativeTime(project.updatedAt)}</span>
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Star className="h-3 w-3" />
                                {formatNumber(project.stars)}
                              </span>
                              <span className="flex items-center gap-1">
                                <GitFork className="h-3 w-3" />
                                {formatNumber(project.forks)}
                              </span>
                            </div>
                            <Badge
                              variant="secondary"
                              className={`text-xs ${
                                project.analysisStatus === 'completed'
                                  ? 'bg-green-500/20 text-green-400'
                                  : project.analysisStatus === 'analyzing'
                                  ? 'bg-yellow-500/20 text-yellow-400'
                                  : 'bg-muted'
                              }`}
                            >
                              {project.analysisStatus === 'completed' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                              {project.analysisStatus === 'analyzing' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                              {project.analysisStatus}
                            </Badge>
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FolderGit2 className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>No projects yet</p>
                    <Button variant="link" asChild className="mt-2">
                      <Link to="/profile">Add your first project</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Skill Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Skill Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={skillDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {skillDistribution.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={SKILL_CHART_COLORS[index % SKILL_CHART_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {skillDistribution.map((item, index) => (
                    <div key={item.name} className="flex items-center gap-2 text-xs">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: SKILL_CHART_COLORS[index % SKILL_CHART_COLORS.length] }}
                      />
                      <span className="text-muted-foreground">{item.name}</span>
                      <span className="font-medium ml-auto">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {selectedTab === 'activity' && (
          <motion.div
            key="activity"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid gap-6 lg:grid-cols-3"
          >
            {/* Activity Feed */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className={`p-2 rounded-full ${
                        activity.type === 'project_analyzed' ? 'bg-green-500/20' :
                        activity.type === 'skill_verified' ? 'bg-blue-500/20' :
                        'bg-purple-500/20'
                      }`}>
                        {activity.type === 'project_analyzed' && <FolderGit2 className="h-4 w-4 text-green-400" />}
                        {activity.type === 'skill_verified' && <Award className="h-4 w-4 text-blue-400" />}
                        {activity.type === 'profile_view' && <Eye className="h-4 w-4 text-purple-400" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{activity.title}</p>
                        <p className="text-sm text-muted-foreground">{activity.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                      </div>
                      <Badge className="bg-primary/20 text-primary">
                        +{activity.points} pts
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Aura Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Aura Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {aura && (
                  <>
                    {Object.entries(aura.breakdown).map(([key, value]) => (
                      <div key={key}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="capitalize">{key}</span>
                          <span className="font-medium">{value}</span>
                        </div>
                        <Progress
                          value={(value / (key === 'projects' ? 200 : key === 'skills' ? 150 : 100)) * 100}
                          className="h-2"
                        />
                      </div>
                    ))}
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {selectedTab === 'insights' && (
          <motion.div
            key="insights"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid gap-6 lg:grid-cols-2"
          >
            {/* Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-yellow-400" />
                  AI Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg border border-green-500/30 bg-green-500/5">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-green-500/20">
                      <TrendingUp className="h-4 w-4 text-green-400" />
                    </div>
                    <div>
                      <p className="font-medium text-green-400">Boost Your Score</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Analyze 2 more projects to reach "Skilled" level and unlock more job matches.
                      </p>
                      <Button size="sm" variant="outline" className="mt-3" onClick={() => navigate('/profile')}>
                        Analyze Projects
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg border border-blue-500/30 bg-blue-500/5">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/20">
                      <Award className="h-4 w-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium text-blue-400">Skill Verification</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Your Docker skills could be verified. Add a project with Dockerfile to get verified.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg border border-purple-500/30 bg-purple-500/5">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/20">
                      <Briefcase className="h-4 w-4 text-purple-400" />
                    </div>
                    <div>
                      <p className="font-medium text-purple-400">Job Match</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        3 new jobs match your TypeScript + React skills. Apply now!
                      </p>
                      <Button size="sm" variant="outline" className="mt-3" onClick={() => navigate('/jobs')}>
                        View Jobs
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Profile Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" />
                  Profile Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50 text-center">
                    <p className="text-3xl font-bold">127</p>
                    <p className="text-sm text-muted-foreground">Profile Views</p>
                    <p className="text-xs text-green-400 mt-1">+23% this week</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 text-center">
                    <p className="text-3xl font-bold">89%</p>
                    <p className="text-sm text-muted-foreground">Match Score</p>
                    <p className="text-xs text-muted-foreground mt-1">Top 15% of devs</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 text-center">
                    <p className="text-3xl font-bold">5</p>
                    <p className="text-sm text-muted-foreground">Recruiter Views</p>
                    <p className="text-xs text-blue-400 mt-1">This month</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 text-center">
                    <p className="text-3xl font-bold">12</p>
                    <p className="text-sm text-muted-foreground">Resume Downloads</p>
                    <p className="text-xs text-muted-foreground mt-1">All time</p>
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="text-sm font-medium mb-3">Top Search Appearances</h4>
                  <div className="space-y-2">
                    {['TypeScript Developer', 'React Frontend', 'Full Stack Node.js'].map((term, i) => (
                      <div key={term} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{term}</span>
                        <span className="font-medium">{30 - i * 8} times</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Post Job Modal */}
      <PostJobModal open={showPostJobModal} onOpenChange={setShowPostJobModal} />
    </div>
  )
}
