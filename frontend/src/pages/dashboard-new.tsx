/**
 * Developer Dashboard
 * Shows Aura score, verified skills, projects, job matches, profile completeness
 */

import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useMyProfile,
  useMyAura,
  useMySkills,
  useMyProjects,
} from '@/hooks/use-user'
import { useRecommendedJobs, useMyApplications } from '@/hooks/use-jobs'
import { AuraScore } from '@/components/aura-score'
import { SkillBadge } from '@/components/skill-card'
import { ProjectCardCompact } from '@/components/project-card'
import { MatchScoreCompact } from '@/components/match-score'
import {
  Sparkles,
  Code2,
  Briefcase,
  FileText,
  Settings,
  Plus,
  ArrowRight,
  CheckCircle,
  Target,
} from 'lucide-react'

export default function DashboardPage() {
  // Queries
  const { data: profile, isLoading: profileLoading } = useMyProfile()
  const { data: aura, isLoading: auraLoading } = useMyAura()
  const { data: skills, isLoading: skillsLoading } = useMySkills()
  const { data: projects, isLoading: projectsLoading } = useMyProjects()
  const { data: recommendedJobs, isLoading: jobsLoading } = useRecommendedJobs(5)
  const { data: applications, isLoading: applicationsLoading } = useMyApplications(1, 5)

  const verifiedSkills = skills?.filter((s) => s.isVerified) || []
  const completedProjects = projects?.filter((p) => p.analysisStatus === 'COMPLETED') || []
  const profileCompleteness = profile?.profileCompleteness || 0

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome back, {profileLoading ? '...' : profile?.name || 'Developer'}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's what's happening with your profile
          </p>
        </div>
        <Button asChild>
          <Link to="/settings">
            <Settings className="mr-2 w-4 h-4" />
            Settings
          </Link>
        </Button>
      </div>

      {/* Profile Completeness Alert */}
      {profileCompleteness < 100 && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="w-5 h-5 text-yellow-600" />
                Complete Your Profile
              </CardTitle>
              <span className="text-sm font-semibold text-yellow-700 dark:text-yellow-400">
                {profileCompleteness}%
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress value={profileCompleteness} className="h-2" />
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              A complete profile gets 3x more visibility to recruiters
            </p>
            <Button asChild variant="outline" size="sm">
              <Link to="/profile">
                Complete Profile
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Aura Score */}
        <StatCard
          icon={<Sparkles className="w-5 h-5" />}
          title="Aura Score"
          loading={auraLoading}
        >
          {aura && (
            <div className="flex items-center justify-between">
              <AuraScore
                score={aura.score}
                level={aura.level}
                trend={aura.trend}
                size="lg"
                showLevel={false}
                showTooltip={false}
              />
              <Link to="/profile#aura">
                <Button variant="ghost" size="sm">
                  View Details
                </Button>
              </Link>
            </div>
          )}
        </StatCard>

        {/* Verified Skills */}
        <StatCard
          icon={<CheckCircle className="w-5 h-5 text-green-600" />}
          title="Verified Skills"
          loading={skillsLoading}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold">{verifiedSkills.length}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {skills?.length || 0} total skills
              </p>
            </div>
            <Link to="/profile#skills">
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </Link>
          </div>
        </StatCard>

        {/* Projects Analyzed */}
        <StatCard
          icon={<Code2 className="w-5 h-5 text-blue-600" />}
          title="Projects Analyzed"
          loading={projectsLoading}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold">{completedProjects.length}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {projects?.length || 0} total projects
              </p>
            </div>
            <Link to="/projects">
              <Button variant="ghost" size="sm">
                Manage
              </Button>
            </Link>
          </div>
        </StatCard>

        {/* Job Applications */}
        <StatCard
          icon={<Briefcase className="w-5 h-5 text-purple-600" />}
          title="Applications"
          loading={applicationsLoading}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold">{applications?.meta.total || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Active applications</p>
            </div>
            <Link to="/applications">
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </Link>
          </div>
        </StatCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Projects */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Projects</CardTitle>
                <Button asChild variant="outline" size="sm">
                  <Link to="/projects">
                    <Plus className="mr-2 w-4 h-4" />
                    Add Project
                  </Link>
                </Button>
              </div>
              <CardDescription>Your GitHub projects with analysis status</CardDescription>
            </CardHeader>
            <CardContent>
              {projectsLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : projects && projects.length > 0 ? (
                <div className="space-y-3">
                  {projects.slice(0, 5).map((project) => (
                    <Link key={project.id} to={`/projects/${project.id}`}>
                      <ProjectCardCompact project={project} />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Code2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">No projects yet</p>
                  <Button asChild>
                    <Link to="/projects">
                      <Plus className="mr-2 w-4 h-4" />
                      Add Your First Project
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
            {projects && projects.length > 5 && (
              <CardFooter>
                <Button asChild variant="ghost" className="w-full">
                  <Link to="/projects">
                    View All Projects
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
              </CardFooter>
            )}
          </Card>

          {/* Recommended Jobs */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recommended Jobs</CardTitle>
                <Button asChild variant="outline" size="sm">
                  <Link to="/jobs">Browse All</Link>
                </Button>
              </div>
              <CardDescription>Jobs matched to your verified skills</CardDescription>
            </CardHeader>
            <CardContent>
              {jobsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : recommendedJobs && recommendedJobs.length > 0 ? (
                <div className="space-y-4">
                  {recommendedJobs.map((job) => (
                    <JobCard key={job.id} job={job} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Briefcase className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">No job recommendations yet</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add more projects to get better matches
                  </p>
                  <Button asChild>
                    <Link to="/jobs">Browse Jobs</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - 1/3 width */}
        <div className="space-y-6">
          {/* Top Skills */}
          <Card>
            <CardHeader>
              <CardTitle>Top Skills</CardTitle>
              <CardDescription>Your most verified skills</CardDescription>
            </CardHeader>
            <CardContent>
              {skillsLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : verifiedSkills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {verifiedSkills
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 10)
                    .map((skill) => (
                      <SkillBadge
                        key={skill.id}
                        name={skill.name}
                        verified={skill.isVerified}
                        score={skill.score}
                      />
                    ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">
                    No verified skills yet. Analyze projects to get verified skills.
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button asChild variant="ghost" className="w-full">
                <Link to="/profile#skills">
                  View All Skills
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild variant="outline" className="w-full justify-start">
                <Link to="/resume">
                  <FileText className="mr-2 w-4 h-4" />
                  Build Resume
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link to="/jobs">
                  <Briefcase className="mr-2 w-4 h-4" />
                  Browse Jobs
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link to="/projects">
                  <Code2 className="mr-2 w-4 h-4" />
                  Add Project
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link to="/profile">
                  <Settings className="mr-2 w-4 h-4" />
                  Edit Profile
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Aura Breakdown */}
          {aura && (
            <Card>
              <CardHeader>
                <CardTitle>Aura Breakdown</CardTitle>
                <CardDescription>What makes up your score</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <AuraBreakdownItem
                  label="Skill Diversity"
                  value={aura.breakdown.skillDiversity}
                />
                <AuraBreakdownItem
                  label="Project Quality"
                  value={aura.breakdown.projectQuality}
                />
                <AuraBreakdownItem
                  label="Activity Consistency"
                  value={aura.breakdown.activityConsistency}
                />
                <AuraBreakdownItem
                  label="Community Impact"
                  value={aura.breakdown.communityImpact}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================
// HELPER COMPONENTS
// ============================================

function StatCard({
  icon,
  title,
  loading,
  children,
}: {
  icon: React.ReactNode
  title: string
  loading: boolean
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          {icon}
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-12 w-full" />
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}

function JobCard({ job }: { job: any }) {
  return (
    <Link to={`/jobs/${job.id}`}>
      <div className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold truncate">{job.title}</h4>
            <p className="text-sm text-muted-foreground truncate">{job.companyName}</p>
          </div>
          {job.matchScore !== undefined && (
            <MatchScoreCompact score={job.matchScore} />
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary">{job.type.replace('_', ' ')}</Badge>
          <span>•</span>
          <span>{job.location}</span>
          {job.isRemote && (
            <>
              <span>•</span>
              <Badge variant="outline">Remote</Badge>
            </>
          )}
        </div>
      </div>
    </Link>
  )
}

function AuraBreakdownItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{value}%</span>
      </div>
      <Progress value={value} className="h-1.5" />
    </div>
  )
}
