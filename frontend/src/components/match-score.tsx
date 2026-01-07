/**
 * Match Score Component
 * Shows job/candidate match percentage with visual indicator
 */

import { TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface MatchScoreProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  showProgress?: boolean
  showTooltip?: boolean
  matchedSkills?: string[]
  missingSkills?: string[]
  className?: string
}

export function MatchScore({
  score,
  size = 'md',
  showLabel = true,
  showProgress = false,
  showTooltip = true,
  matchedSkills = [],
  missingSkills = [],
  className,
}: MatchScoreProps) {
  const getMatchLevel = (score: number) => {
    if (score >= 80) return { label: 'Excellent Match', color: 'green', icon: '🎯' }
    if (score >= 60) return { label: 'Good Match', color: 'blue', icon: '✓' }
    if (score >= 40) return { label: 'Fair Match', color: 'yellow', icon: '~' }
    return { label: 'Low Match', color: 'gray', icon: '○' }
  }

  const matchInfo = getMatchLevel(score)

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  }

  const badgeSizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  }

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-green-500'
    if (score >= 60) return 'bg-blue-500'
    if (score >= 40) return 'bg-yellow-500'
    return 'bg-gray-500'
  }

  const getBgColor = (color: string) => {
    const colors: Record<string, string> = {
      green: 'bg-green-100 dark:bg-green-900/20',
      blue: 'bg-blue-100 dark:bg-blue-900/20',
      yellow: 'bg-yellow-100 dark:bg-yellow-900/20',
      gray: 'bg-gray-100 dark:bg-gray-900/20',
    }
    return colors[color] || colors.gray
  }

  const getTextColor = (color: string) => {
    const colors: Record<string, string> = {
      green: 'text-green-700 dark:text-green-400',
      blue: 'text-blue-700 dark:text-blue-400',
      yellow: 'text-yellow-700 dark:text-yellow-400',
      gray: 'text-gray-700 dark:text-gray-400',
    }
    return colors[color] || colors.gray
  }

  const scoreDisplay = (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Score Badge */}
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full font-semibold',
          badgeSizeClasses[size],
          getBgColor(matchInfo.color),
          getTextColor(matchInfo.color)
        )}
      >
        <TrendingUp className="w-3 h-3" />
        {score}% Match
      </span>

      {/* Label */}
      {showLabel && (
        <span className={cn('text-muted-foreground', sizeClasses[size])}>
          {matchInfo.label}
        </span>
      )}
    </div>
  )

  if (!showTooltip && !showProgress) {
    return scoreDisplay
  }

  return (
    <div className="space-y-2">
      {showTooltip ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>{scoreDisplay}</TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <div className="space-y-2">
                <p className="font-semibold text-sm">Match Details</p>
                {matchedSkills.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-green-600 dark:text-green-400">
                      Matched Skills ({matchedSkills.length})
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {matchedSkills.slice(0, 5).join(', ')}
                      {matchedSkills.length > 5 && ` +${matchedSkills.length - 5} more`}
                    </p>
                  </div>
                )}
                {missingSkills.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-red-600 dark:text-red-400">
                      Missing Skills ({missingSkills.length})
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {missingSkills.slice(0, 5).join(', ')}
                      {missingSkills.length > 5 && ` +${missingSkills.length - 5} more`}
                    </p>
                  </div>
                )}
                {matchedSkills.length === 0 && missingSkills.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Match based on profile similarity and requirements
                  </p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        scoreDisplay
      )}

      {/* Progress Bar */}
      {showProgress && (
        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
          <div 
            className={cn("h-full transition-all", getProgressColor(score))} 
            style={{ width: `${score}%` }} 
          />
        </div>
      )}
    </div>
  )
}

/**
 * Match Score Compact (for lists)
 */

interface MatchScoreCompactProps {
  score: number
  className?: string
}

export function MatchScoreCompact({ score, className }: MatchScoreCompactProps) {
  const matchInfo = getMatchLevel(score)

  function getMatchLevel(score: number) {
    if (score >= 80) return { color: 'green' }
    if (score >= 60) return { color: 'blue' }
    if (score >= 40) return { color: 'yellow' }
    return { color: 'gray' }
  }

  const getBgColor = (color: string) => {
    const colors: Record<string, string> = {
      green: 'bg-green-100 dark:bg-green-900/20',
      blue: 'bg-blue-100 dark:bg-blue-900/20',
      yellow: 'bg-yellow-100 dark:bg-yellow-900/20',
      gray: 'bg-gray-100 dark:bg-gray-900/20',
    }
    return colors[color] || colors.gray
  }

  const getTextColor = (color: string) => {
    const colors: Record<string, string> = {
      green: 'text-green-700 dark:text-green-400',
      blue: 'text-blue-700 dark:text-blue-400',
      yellow: 'text-yellow-700 dark:text-yellow-400',
      gray: 'text-gray-700 dark:text-gray-400',
    }
    return colors[color] || colors.gray
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold',
        getBgColor(matchInfo.color),
        getTextColor(matchInfo.color),
        className
      )}
    >
      {score}%
    </span>
  )
}
