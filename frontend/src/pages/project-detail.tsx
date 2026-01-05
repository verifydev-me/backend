import { useParams, Link } from 'react-router-dom'
import { AnalysisResults } from '@/components/features/project/AnalysisResults'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { get } from '@/api/client'
import { formatNumber, formatDate, getLanguageColor } from '@/lib/utils'
import type { Project } from '@/types'
import {
  ArrowLeft,
  ExternalLink,
  Star,
  GitFork,
  Users,
  GitCommit,
  Clock,
  Loader2,
  Code,
  FileText,
  TestTube,
  Gauge,
  Activity,
} from 'lucide-react'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => get<Project>(`/v1/projects/${id}`),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="text-center py-24">
        <h2 className="text-2xl font-bold mb-2">Project not found</h2>
        <Button asChild>
          <Link to="/projects">Back to Projects</Link>
        </Button>
      </div>
    )
  }

  const metricsData = project.metrics
    ? [
        { metric: 'Code Quality', value: project.metrics.codeQuality },
        { metric: 'Documentation', value: project.metrics.documentation },
        { metric: 'Test Coverage', value: project.metrics.testCoverage },
        { metric: 'Maintainability', value: project.metrics.maintainability },
        { metric: 'Activity', value: project.metrics.activityScore },
      ]
    : []

  const languagesData = Object.entries(project.languages || {}).map(
    ([name, bytes]) => ({
      name,
      value: bytes as number,
      color: getLanguageColor(name),
    })
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/projects">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{project.name}</h1>
            <Badge
              variant={
                project.analysisStatus === 'completed' ? 'success' : 'secondary'
              }
            >
              {project.analysisStatus === 'completed'
                ? 'Analyzed'
                : project.analysisStatus}
            </Badge>
          </div>
          {project.description && (
            <p className="text-muted-foreground mt-1">{project.description}</p>
          )}
        </div>
        <Button variant="outline" asChild>
          <a href={project.repoUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 mr-2" />
            View on GitHub
          </a>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Star className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{formatNumber(project.stars)}</p>
                <p className="text-sm text-muted-foreground">Stars</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <GitFork className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{formatNumber(project.forks)}</p>
                <p className="text-sm text-muted-foreground">Forks</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <GitCommit className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">
                  {formatNumber(project.commits)}
                </p>
                <p className="text-sm text-muted-foreground">Commits</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{project.contributors}</p>
                <p className="text-sm text-muted-foreground">Contributors</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/10 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold text-primary">
                  +{formatNumber(project.auraContribution)}
                </p>
                <p className="text-sm text-muted-foreground">Aura Points</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Metrics & Languages */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Metrics Radar */}
        {project.metrics && (
          <Card>
            <CardHeader>
              <CardTitle>Code Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={metricsData}>
                  <PolarGrid stroke="#27272a" />
                  <PolarAngleAxis
                    dataKey="metric"
                    tick={{ fill: '#a1a1aa', fontSize: 12 }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 100]}
                    tick={{ fill: '#a1a1aa', fontSize: 10 }}
                  />
                  <Radar
                    name="Score"
                    dataKey="value"
                    stroke="#8b5cf6"
                    fill="#8b5cf6"
                    fillOpacity={0.3}
                  />
                </RadarChart>
              </ResponsiveContainer>

              {/* Metric Details */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <Code className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Code Quality</span>
                  <span className="ml-auto font-medium">
                    {project.metrics.codeQuality}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Documentation</span>
                  <span className="ml-auto font-medium">
                    {project.metrics.documentation}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <TestTube className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Test Coverage</span>
                  <span className="ml-auto font-medium">
                    {project.metrics.testCoverage}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Complexity</span>
                  <span className="ml-auto font-medium">
                    {project.metrics.complexity}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Languages */}
        <Card>
          <CardHeader>
            <CardTitle>Languages</CardTitle>
          </CardHeader>
          <CardContent>
            {languagesData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={languagesData} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fill: '#a1a1aa', fontSize: 12 }}
                      width={80}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#18181b',
                        border: '1px solid #27272a',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) =>
                        `${(value / 1024).toFixed(1)} KB`
                      }
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {languagesData.map((entry, index) => (
                        <rect key={index} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                {/* Language badges */}
                <div className="flex flex-wrap gap-2 mt-4">
                  {languagesData.map((lang) => (
                    <Badge
                      key={lang.name}
                      variant="outline"
                      className="flex items-center gap-1"
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: lang.color }}
                      />
                      {lang.name}
                    </Badge>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No language data available
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis */}
      {project.fullAnalysis ? (
        <div className="mt-8">
           <h2 className="text-2xl font-bold mb-4">Deep Analysis</h2>
           <AnalysisResults analysis={project.fullAnalysis} />
        </div>
      ) : (
         <div className="mt-8 p-6 border border-dashed border-zinc-700 rounded-lg text-center bg-zinc-900/20">
            <Code className="h-10 w-10 text-zinc-500 mx-auto mb-3" />
            <h3 className="text-lg font-medium">Deep analysis pending</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto mt-2">
              Detailed code structure, optimization tips, and framework analysis will appear here once the deep scan is complete.
            </p>
         </div>
      )}

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Last commit: {formatDate(project.lastCommitAt)}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
