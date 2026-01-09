/**
 * Developer Dashboard - THEME AWARE PREMIUM EDITION
 * All colors use theme CSS variables (--primary)
 * Controlled from settings
 */

import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth-store'
import { useUserStore } from '@/store/user-store'
import { useQuery } from '@tanstack/react-query'
import { get } from '@/api/client'
import { Button } from '@/components/ui/button'
import { cn, formatNumber } from '@/lib/utils'
import {
  Github,
  Target,
  FolderGit2,
  ChevronRight,
  Sparkles,
  Plus,
  TrendingUp,
  Code2,
  RefreshCw,
  Award,
  Briefcase,
  Star,
  GitFork,
  Clock,
  Zap,
  ExternalLink,
  CheckCircle2,
  Activity,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts'

// ============================================
// CIRCULAR PROGRESS - Like the screenshot
// ============================================
function CircularProgress({ value, size = 56 }: { value: number, size?: number }) {
  const strokeWidth = 4
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (value / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(var(--primary))"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-foreground">{value}</span>
      </div>
    </div>
  )
}

// ============================================
// STAT CARD - Theme Based Colors
// ============================================
function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  subtitle,
  trend,
  loading = false,
}: { 
  icon: any
  label: string
  value: number | string
  subtitle?: string
  trend?: number
  loading?: boolean
}) {
  return (
    <div className="group rounded-xl border border-border/60 bg-card/40 backdrop-blur-md p-5 transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
      <div className="flex items-start justify-between mb-3">
        <div className="p-2.5 rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
          <Icon className="w-5 h-5" />
        </div>
        {trend !== undefined && trend > 0 && (
          <div className="flex items-center gap-1 text-xs text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">
            <TrendingUp className="w-3 h-3" />
            +{trend}%
          </div>
        )}
      </div>
      
      {loading ? (
        <div className="h-9 w-24 bg-muted/50 animate-pulse rounded-lg mb-1" />
      ) : (
        <div className="text-3xl font-bold text-foreground tracking-tight mb-1">
          {typeof value === 'number' ? formatNumber(value) : value}
        </div>
      )}
      <div className="text-sm text-muted-foreground">{label}</div>
      {subtitle && <div className="text-xs text-muted-foreground/70 mt-1">{subtitle}</div>}
    </div>
  )
}

// ============================================
// PROJECT CARD - Premium with Score & Breakdown
// ============================================
function ProjectCard({ project }: { project: any }) {
  const navigate = useNavigate()
  const score = project.score || project.qualityScore || 0
  const isAnalyzed = project.analysisStatus === 'COMPLETED'
  
  // Get technologies from project
  const technologies = project.technologies || []
  const topTechs = technologies.slice(0, 3)
  
  // Calculate time ago
  const getTimeAgo = (date: string) => {
    if (!date) return ''
    const diff = Date.now() - new Date(date).getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  // Get repo name from URL or use name
  const repoName = project.repoName || project.name

  return (
    <div 
      onClick={() => navigate(`/projects/${project.id}`)}
      className="group cursor-pointer rounded-xl border border-border/80 bg-gradient-to-br from-card/60 via-card/40 to-card/30 backdrop-blur-md p-5 transition-all duration-300 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/15 hover:scale-[1.01]"
    >
      <div className="flex items-start gap-4">
        {/* Circular Score with Glow */}
        <div className="relative">
          <div className={cn(
            "absolute inset-0 rounded-full blur-lg opacity-30 transition-opacity group-hover:opacity-50",
            score >= 80 ? "bg-emerald-500" : score >= 50 ? "bg-primary" : "bg-amber-500"
          )} />
          <CircularProgress value={score} />
        </div>
        
        {/* Project Info */}
        <div className="flex-1 min-w-0">
          {/* GitHub Repo Name - Prominent */}
          <div className="flex items-center gap-2.5 mb-2">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-muted/80 to-muted/40 border border-border/50">
              <Github className="w-4 h-4 text-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-foreground group-hover:text-primary transition-colors truncate text-base">
                {repoName}
              </h3>
              {project.description && (
                <p className="text-xs text-muted-foreground/80 truncate mt-0.5">
                  {project.description}
                </p>
              )}
            </div>
          </div>
          
          {/* Language Badge */}
          {project.language && (
            <div className="flex items-center gap-2 mb-3">
              <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-gradient-to-r from-blue-500/15 to-blue-400/10 text-blue-400 border border-blue-500/20">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                {project.language}
              </span>
              {topTechs.length > 0 && (
                <>
                  {topTechs.map((tech: string, i: number) => (
                    <span 
                      key={i}
                      className="text-xs px-2 py-1 rounded-full bg-muted/50 text-muted-foreground border border-border/30"
                    >
                      {tech}
                    </span>
                  ))}
                  {technologies.length > 3 && (
                    <span className="text-xs text-muted-foreground/60">
                      +{technologies.length - 3}
                    </span>
                  )}
                </>
              )}
            </div>
          )}
          
          {/* Stats Row */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
            <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-500/10 hover:bg-amber-500/20 transition-colors">
              <Star className="w-3.5 h-3.5 text-amber-500" />
              <span className="font-medium text-amber-400">{project.stars || 0}</span>
            </span>
            <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 hover:bg-muted transition-colors">
              <GitFork className="w-3.5 h-3.5" />
              <span className="font-medium">{project.forks || 0}</span>
            </span>
            {project.analyzedAt && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {getTimeAgo(project.analyzedAt)}
              </span>
            )}
          </div>
          
          {/* Status & Points */}
          <div className="flex items-center justify-between">
            <div className={cn(
              "flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all",
              isAnalyzed 
                ? "bg-gradient-to-r from-primary/20 to-primary/10 text-primary border border-primary/20" 
                : "bg-gradient-to-r from-amber-500/20 to-amber-500/10 text-amber-500 border border-amber-500/20"
            )}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              {isAnalyzed ? 'Analyzed' : 'Pending'}
            </div>
            
            {score > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-primary/20 to-primary/5 border border-primary/20">
                <Zap className="w-4 h-4 text-primary" />
                <span className="font-bold text-primary text-sm">+{score}</span>
                <span className="text-xs text-muted-foreground">Aura</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Arrow with animation */}
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted/50 group-hover:bg-primary/20 transition-all mt-6">
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
      
      {/* View Details Hint */}
      <div className="mt-4 pt-3 border-t border-border/30 flex items-center justify-center gap-2 text-xs text-muted-foreground group-hover:text-primary transition-colors">
        <Sparkles className="w-3.5 h-3.5" />
        <span>Click to view skill breakdown & details</span>
      </div>
    </div>
  )
}

// ============================================
// SKILL PILL - Theme Based
// ============================================
function SkillPill({ skill }: { skill: any }) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-muted/50 border border-border/50 hover:border-primary/30 transition-colors">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-primary" />
        <span className="text-sm font-medium text-foreground">{skill.name}</span>
      </div>
      <span className="text-xs text-muted-foreground font-medium">{skill.score || 85}%</span>
    </div>
  )
}

// ============================================
// ACTIVITY ITEM
// ============================================
function ActivityItem({ activity }: { activity: { source: string; points: number; date: string } }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
        <Zap className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground truncate">{activity.source}</div>
        <div className="text-xs text-muted-foreground">{new Date(activity.date).toLocaleDateString()}</div>
      </div>
      <div className="text-sm font-semibold text-primary">+{activity.points}</div>
    </div>
  )
}

// ============================================
// MAIN DASHBOARD
// ============================================
export default function Dashboard() {
  const { user } = useAuthStore()
  const { 
    aura, 
    projects, 
    skills,
    isLoadingAura,
    isLoadingProjects,
    isLoadingSkills,
    fetchAura, 
    fetchProjects, 
    fetchSkills,
    syncGitHubProfile,
  } = useUserStore()
  
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    if (user) {
      fetchAura()
      fetchProjects()
      fetchSkills()
    }
  }, [user, fetchAura, fetchProjects, fetchSkills])

  // Fetch matched jobs
  const { data: matchedJobs = [] } = useQuery({
    queryKey: ['matched-jobs-dashboard'],
    queryFn: async () => {
      try {
        const res = await get('/v1/jobs/matched') as any
        return res?.data || []
      } catch {
        return []
      }
    }
  })

  // Activity chart data from aura history or generate sample
  const activityData = (aura?.recentGains?.length ?? 0) > 0 
    ? aura!.recentGains!.slice(0, 7).map(g => ({
        day: new Date(g.date).toLocaleDateString('en-US', { weekday: 'short' }),
        points: g.points,
      }))
    : [
        { day: 'Mon', points: 0 },
        { day: 'Tue', points: 0 },
        { day: 'Wed', points: 0 },
        { day: 'Thu', points: 0 },
        { day: 'Fri', points: 0 },
        { day: 'Sat', points: 0 },
        { day: 'Sun', points: 0 },
      ]

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      await syncGitHubProfile()
      await Promise.all([fetchAura(), fetchProjects(), fetchSkills()])
    } finally {
      setIsSyncing(false)
    }
  }

  const analyzedCount = projects.filter(p => p.analysisStatus?.toUpperCase() === 'COMPLETED').length
  const topSkills = skills.slice(0, 5)
  const recentActivity = aura?.recentGains?.slice(0, 4) || []

  return (
    <div className="min-h-screen pb-12">
      
      {/* ===== HEADER ===== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Welcome back, {user?.name?.split(' ')[0] || user?.username}! 👋
          </h1>
          <p className="text-muted-foreground mt-1.5">
            Here's your developer profile overview
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="default"
            className="gap-2"
            onClick={handleSync}
            disabled={isSyncing}
          >
            <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
            Sync
          </Button>
          <Link to="/projects/new">
            <Button size="default" className="gap-2">
              <Plus className="w-4 h-4" />
              Add Project
            </Button>
          </Link>
        </div>
      </div>

      {/* ===== STATS GRID ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard 
          icon={Sparkles} 
          label="Aura Score" 
          value={aura?.total || 0}
          trend={12}
          loading={isLoadingAura}
        />
        <StatCard 
          icon={FolderGit2} 
          label="Projects" 
          value={analyzedCount}
          subtitle={`${projects.length} total`}
          loading={isLoadingProjects}
        />
        <StatCard 
          icon={Code2} 
          label="Skills Verified" 
          value={skills.length}
          loading={isLoadingSkills}
        />
        <StatCard 
          icon={Target} 
          label="Job Matches" 
          value={matchedJobs.length}
        />
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN - 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Activity Chart */}
          <div className="rounded-xl border border-border/80 bg-card/80 backdrop-blur-xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-border/30">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-foreground">Weekly Activity</h3>
              </div>
              <span className="text-xs text-muted-foreground">Aura points earned</span>
            </div>
            <div className="p-5">
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activityData}>
                    <defs>
                      <linearGradient id="gradientPrimary" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="day" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      dy={10}
                    />
                    <RechartsTooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '12px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
                      }}
                      formatter={(value: number) => [`${value} pts`, 'Earned']}
                      labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="points" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2.5}
                      fill="url(#gradientPrimary)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Projects */}
          <div className="rounded-xl border border-border/80 bg-card/80 backdrop-blur-xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-border/30">
              <div className="flex items-center gap-3">
                <FolderGit2 className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-foreground">Your Projects</h3>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {projects.length}
                </span>
              </div>
              <Link to="/projects" className="text-sm text-primary hover:text-primary/80 flex items-center gap-1">
                View All <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
            
            <div className="p-4 space-y-3">
              {isLoadingProjects ? (
                <div className="p-8 flex justify-center">
                  <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin" />
                </div>
              ) : projects.length > 0 ? (
                projects.slice(0, 3).map((project: any) => (
                  <ProjectCard key={project.id} project={project} />
                ))
              ) : (
                <div className="p-10 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                    <FolderGit2 className="w-7 h-7 text-muted-foreground/50" />
                  </div>
                  <p className="text-muted-foreground mb-4">No projects yet</p>
                  <Link to="/projects/new">
                    <Button size="sm" className="gap-2">
                      <Plus className="w-4 h-4" />
                      Import from GitHub
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN - 1/3 */}
        <div className="space-y-6">
          
          {/* Level Card */}
          <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card/40 to-card/40 backdrop-blur-md p-5">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center">
                <Award className="w-7 h-7 text-primary" />
              </div>
              <div>
                <div className="text-xl font-bold text-foreground capitalize">
                  {aura?.level || 'Novice'}
                </div>
                <div className="text-sm text-muted-foreground">Developer Level</div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress to next</span>
                <span className="text-foreground font-medium">{aura?.percentile || 0}%</span>
              </div>
              <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(aura?.percentile || 25, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="rounded-xl border border-border/80 bg-card/80 backdrop-blur-xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-border/30">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-foreground">Recent Activity</h3>
              </div>
            </div>
            
            <div className="px-5 py-2 divide-y divide-border/30">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity: any, i: number) => (
                  <ActivityItem key={i} activity={activity} />
                ))
              ) : (
                <p className="text-center text-sm text-muted-foreground py-6">
                  No recent activity
                </p>
              )}
            </div>
          </div>

          {/* Top Skills */}
          <div className="rounded-xl border border-border/80 bg-card/80 backdrop-blur-xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-border/30">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-foreground">Top Skills</h3>
              </div>
              <Link to="/profile" className="text-xs text-muted-foreground hover:text-foreground">
                See all
              </Link>
            </div>
            
            <div className="p-4 space-y-2">
              {isLoadingSkills ? (
                [1,2,3].map(i => (
                  <div key={i} className="h-11 bg-muted/50 animate-pulse rounded-xl" />
                ))
              ) : topSkills.length > 0 ? (
                topSkills.map((skill: any, i: number) => (
                  <SkillPill key={skill.id || i} skill={skill} />
                ))
              ) : (
                <p className="text-center text-sm text-muted-foreground py-4">
                  Analyze projects to discover skills
                </p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur-md p-5">
            <h3 className="font-semibold text-foreground mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Link to="/projects/new" className="block">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-primary hover:bg-primary/90 transition-colors text-primary-foreground">
                  <Plus className="w-5 h-5" />
                  <span className="font-medium">Add Project</span>
                </div>
              </Link>
              <Link to="/jobs" className="block">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted border border-border/50 transition-colors">
                  <Briefcase className="w-5 h-5 text-muted-foreground" />
                  <span className="font-medium text-foreground">Browse Jobs</span>
                </div>
              </Link>
              <Link to="/profile" className="block">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted border border-border/50 transition-colors">
                  <Github className="w-5 h-5 text-muted-foreground" />
                  <span className="font-medium text-foreground">View Profile</span>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
