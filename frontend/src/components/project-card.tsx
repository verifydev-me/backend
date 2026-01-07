/**
 * Project Card Component
 * Displays GitHub project with analysis status, tech stack, and quality score
 */

import { Star, GitFork, ExternalLink, RefreshCw, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SkillBadge } from './skill-card'

interface Project {
  id: string
  name: string
  description?: string
  url: string
  language?: string
  stars: number
  forks: number
  analysisStatus: 'PENDING' | 'ANALYZING' | 'COMPLETED' | 'FAILED'
  qualityScore?: number
  technologies: string[]
  analyzedAt?: string
}

interface ProjectCardProps {
  project: Project
  onReanalyze?: (projectId: string) => void
  onViewDetails?: (projectId: string) => void
  className?: string
}

export function ProjectCard({
  project,
  onReanalyze,
  onViewDetails,
  className,
}: ProjectCardProps) {
  const getStatusConfig = (status: Project['analysisStatus']) => {
    const configs: Record<string, { icon: typeof Clock; label: string; color: string; bgColor: string; animate?: boolean }> = {
      PENDING: {
        icon: Clock,
        label: 'Pending',
        color: 'text-yellow-600 dark:text-yellow-400',
        bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
      },
      ANALYZING: {
        icon: RefreshCw,
        label: 'Analyzing...',
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-100 dark:bg-blue-900/20',
        animate: true,
      },
      COMPLETED: {
        icon: CheckCircle,
        label: 'Analyzed',
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-100 dark:bg-green-900/20',
      },
      FAILED: {
        icon: AlertCircle,
        label: 'Failed',
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-100 dark:bg-red-900/20',
      },
    }
    return configs[status]
  }

  const statusConfig = getStatusConfig(project.analysisStatus)
  const StatusIcon = statusConfig.icon

  const getQualityColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400'
    if (score >= 60) return 'text-blue-600 dark:text-blue-400'
    if (score >= 40) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-gray-600 dark:text-gray-400'
  }

  return (
    <Card className={cn('overflow-hidden hover:shadow-lg transition-shadow', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <a
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline flex items-center gap-1"
              >
                {project.name}
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </CardTitle>
            {project.description && (
              <CardDescription className="text-sm line-clamp-2">
                {project.description}
              </CardDescription>
            )}
          </div>

          {/* Status Badge */}
          <Badge
            variant="secondary"
            className={cn('flex items-center gap-1', statusConfig.bgColor, statusConfig.color)}
          >
            <StatusIcon
              className={cn('w-3 h-3', statusConfig.animate && 'animate-spin')}
            />
            {statusConfig.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {project.language && (
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-primary" />
              {project.language}
            </div>
          )}
          <div className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5" />
            {project.stars.toLocaleString()}
          </div>
          <div className="flex items-center gap-1">
            <GitFork className="w-3.5 h-3.5" />
            {project.forks.toLocaleString()}
          </div>
        </div>

        {/* Quality Score */}
        {project.analysisStatus === 'COMPLETED' && project.qualityScore !== undefined && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Quality Score</span>
              <span className={cn('font-semibold', getQualityColor(project.qualityScore))}>
                {project.qualityScore}/100
              </span>
            </div>
            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full transition-all",
                  project.qualityScore >= 80
                    ? 'bg-green-500'
                    : project.qualityScore >= 60
                    ? 'bg-blue-500'
                    : 'bg-yellow-500'
                )}
                style={{ width: `${project.qualityScore}%` }} 
              />
            </div>
          </div>
        )}

        {/* Technologies */}
        {project.technologies.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs text-muted-foreground">Technologies</span>
            <div className="flex flex-wrap gap-1.5">
              {project.technologies.slice(0, 6).map((tech) => (
                <SkillBadge key={tech} name={tech} verified size="sm" />
              ))}
              {project.technologies.length > 6 && (
                <span className="text-xs text-muted-foreground self-center">
                  +{project.technologies.length - 6} more
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-4 border-t flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {project.analyzedAt && (
            <>Analyzed {new Date(project.analyzedAt).toLocaleDateString()}</>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onViewDetails && project.analysisStatus === 'COMPLETED' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewDetails(project.id)}
            >
              View Details
            </Button>
          )}
          {onReanalyze && (project.analysisStatus === 'COMPLETED' || project.analysisStatus === 'FAILED') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onReanalyze(project.id)}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Re-analyze
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}

/**
 * Project Card Compact (for lists)
 */

interface ProjectCardCompactProps {
  project: Project
  onClick?: () => void
  className?: string
}

export function ProjectCardCompact({
  project,
  onClick,
  className,
}: ProjectCardCompactProps) {
  const statusConfig = getCompactStatusConfig(project.analysisStatus)
  const StatusIcon = statusConfig.icon

  function getCompactStatusConfig(status: Project['analysisStatus']) {
    const configs: Record<string, { icon: typeof Clock; color: string; animate?: boolean }> = {
      PENDING: {
        icon: Clock,
        color: 'text-yellow-600',
      },
      ANALYZING: {
        icon: RefreshCw,
        color: 'text-blue-600',
        animate: true,
      },
      COMPLETED: {
        icon: CheckCircle,
        color: 'text-green-600',
      },
      FAILED: {
        icon: AlertCircle,
        color: 'text-red-600',
      },
    }
    return configs[status]
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors',
        onClick && 'cursor-pointer',
        className
      )}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <StatusIcon
          className={cn('w-4 h-4 flex-shrink-0', statusConfig.color, statusConfig.animate && 'animate-spin')}
        />
        <div className="min-w-0 flex-1">
          <p className="font-medium truncate">{project.name}</p>
          <p className="text-xs text-muted-foreground truncate">
            {project.language} • ★ {project.stars}
          </p>
        </div>
      </div>
      {project.qualityScore !== undefined && (
        <Badge variant="secondary" className="ml-2">
          {project.qualityScore}
        </Badge>
      )}
    </div>
  )
}
