/**
 * Skill Card Component
 * Displays a skill with score, verification status, and evidence
 */

import { ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { VerifiedBadge } from './verified-badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface Skill {
  id: string
  name: string
  category: string
  score: number
  isVerified: boolean
  evidenceCount: number
  lastUsed?: string
}

interface SkillCardProps {
  skill: Skill
  onViewEvidence?: (skillId: string) => void
  compact?: boolean
  className?: string
}

export function SkillCard({
  skill,
  onViewEvidence,
  compact = false,
  className,
}: SkillCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400'
    if (score >= 60) return 'text-blue-600 dark:text-blue-400'
    if (score >= 40) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-gray-600 dark:text-gray-400'
  }

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-green-500'
    if (score >= 60) return 'bg-blue-500'
    if (score >= 40) return 'bg-yellow-500'
    return 'bg-gray-500'
  }

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors',
          className
        )}
      >
        <div className="flex items-center gap-2 flex-1">
          <span className="font-medium">{skill.name}</span>
          {skill.isVerified && <VerifiedBadge size="sm" />}
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className={cn('text-sm font-semibold', getScoreColor(skill.score))}>
              {skill.score}%
            </span>
          </div>
          {skill.isVerified && skill.evidenceCount > 0 && onViewEvidence && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewEvidence(skill.id)}
              className="h-8 px-2"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {skill.name}
              {skill.isVerified && (
                <VerifiedBadge
                  size="sm"
                  tooltipText="Verified through project analysis"
                />
              )}
            </CardTitle>
            <CardDescription className="text-xs">
              {skill.category}
              {skill.lastUsed && ` • Last used ${new Date(skill.lastUsed).toLocaleDateString()}`}
            </CardDescription>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex flex-col items-end">
                  <span className={cn('text-2xl font-bold', getScoreColor(skill.score))}>
                    {skill.score}
                  </span>
                  <span className="text-xs text-muted-foreground">score</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  Skill proficiency score based on usage frequency and project complexity
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
            <div 
              className={cn("h-full transition-all", getProgressColor(skill.score))} 
              style={{ width: `${skill.score}%` }} 
            />
          </div>
        </div>

        {/* Evidence */}
        {skill.isVerified && skill.evidenceCount > 0 && (
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-xs text-muted-foreground">
              {skill.evidenceCount} {skill.evidenceCount === 1 ? 'project' : 'projects'} analyzed
            </span>
            {onViewEvidence && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewEvidence(skill.id)}
                className="h-8 text-xs"
              >
                View Evidence
                <ExternalLink className="ml-1 w-3 h-3" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Skill Badge Component (for tags)
 */

interface SkillBadgeProps {
  name: string
  verified?: boolean
  score?: number
  size?: 'sm' | 'md'
  className?: string
  onClick?: () => void
}

export function SkillBadge({
  name,
  verified = false,
  score,
  size = 'sm',
  className,
  onClick,
}: SkillBadgeProps) {
  return (
    <span
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium transition-colors',
        size === 'sm' ? 'text-xs px-2.5 py-1' : 'text-sm px-3 py-1.5',
        verified
          ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400'
          : 'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300',
        onClick && 'cursor-pointer hover:bg-accent',
        className
      )}
    >
      {name}
      {verified && <VerifiedBadge size="sm" showTooltip={false} />}
      {score !== undefined && (
        <span className="ml-1 text-xs opacity-70">
          {score}%
        </span>
      )}
    </span>
  )
}
