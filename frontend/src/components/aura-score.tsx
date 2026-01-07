/**
 * Aura Score Display Component
 * Shows the user's aura score with level, trend, and visual styling
 */

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface AuraScoreProps {
  score: number
  level: number
  trend?: 'UP' | 'DOWN' | 'STABLE'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showTrend?: boolean
  showLevel?: boolean
  showTooltip?: boolean
  className?: string
}

/**
 * Get aura level color and label
 */
export function getAuraLevel(level: number) {
  if (level >= 90) return { label: 'Elite', color: 'purple', gradient: 'from-purple-500 to-pink-500' }
  if (level >= 70) return { label: 'Expert', color: 'blue', gradient: 'from-blue-500 to-cyan-500' }
  if (level >= 50) return { label: 'Advanced', color: 'green', gradient: 'from-green-500 to-emerald-500' }
  if (level >= 30) return { label: 'Intermediate', color: 'yellow', gradient: 'from-yellow-500 to-orange-500' }
  return { label: 'Beginner', color: 'gray', gradient: 'from-gray-400 to-gray-600' }
}

export function AuraScore({
  score,
  level,
  trend,
  size = 'md',
  showTrend = true,
  showLevel = true,
  showTooltip = true,
  className,
}: AuraScoreProps) {
  const auraInfo = getAuraLevel(level)

  const sizeClasses = {
    sm: 'text-xl',
    md: 'text-3xl',
    lg: 'text-4xl',
    xl: 'text-5xl',
  }

  const badgeSizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
    xl: 'text-lg px-4 py-2',
  }

  const TrendIcon = trend === 'UP' ? TrendingUp : trend === 'DOWN' ? TrendingDown : Minus
  const trendColor = trend === 'UP' ? 'text-green-500' : trend === 'DOWN' ? 'text-red-500' : 'text-gray-400'

  const scoreDisplay = (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      {/* Score */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="relative"
      >
        <span
          className={cn(
            'font-bold bg-gradient-to-r bg-clip-text text-transparent',
            auraInfo.gradient,
            sizeClasses[size]
          )}
        >
          {score}
        </span>
        {showTrend && trend && (
          <TrendIcon className={cn('absolute -top-1 -right-6 w-4 h-4', trendColor)} />
        )}
      </motion.div>

      {/* Level Badge */}
      {showLevel && (
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full font-semibold',
            badgeSizeClasses[size],
            `bg-${auraInfo.color}-100 text-${auraInfo.color}-700 dark:bg-${auraInfo.color}-900/20 dark:text-${auraInfo.color}-400`
          )}
        >
          <span className={cn('w-2 h-2 rounded-full', `bg-${auraInfo.color}-500`)} />
          {auraInfo.label}
        </span>
      )}
    </div>
  )

  if (!showTooltip) {
    return scoreDisplay
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{scoreDisplay}</TooltipTrigger>
        <TooltipContent>
          <div className="text-xs space-y-1">
            <p className="font-semibold">Aura Score</p>
            <p className="text-muted-foreground">
              Based on skill diversity, project quality, activity consistency, and community impact
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * Aura Badge Component (Compact version)
 */

interface AuraBadgeProps {
  score: number
  level: number
  size?: 'sm' | 'md'
  className?: string
}

export function AuraBadge({ score, level, size = 'sm', className }: AuraBadgeProps) {
  const auraInfo = getAuraLevel(level)

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold',
        size === 'sm' ? 'text-xs px-2 py-1' : 'text-sm px-3 py-1.5',
        `bg-gradient-to-r ${auraInfo.gradient} text-white`,
        className
      )}
    >
      <span className="font-bold">{score}</span>
      <span className="opacity-90">{auraInfo.label}</span>
    </span>
  )
}
