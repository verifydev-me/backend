/**
 * Verified Badge Component
 * Shows a verified checkmark badge for verified skills, projects, etc.
 */

import { Check, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface VerifiedBadgeProps {
  size?: 'sm' | 'md' | 'lg'
  showTooltip?: boolean
  tooltipText?: string
  className?: string
  variant?: 'check' | 'shield'
}

export function VerifiedBadge({
  size = 'md',
  showTooltip = true,
  tooltipText = 'Verified through project analysis',
  className,
  variant = 'check',
}: VerifiedBadgeProps) {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }

  const Icon = variant === 'shield' ? ShieldCheck : Check

  const badge = (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-green-500 text-white',
        sizeClasses[size],
        className
      )}
    >
      <Icon className={cn('w-2/3 h-2/3')} />
    </div>
  )

  if (!showTooltip) {
    return badge
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * Verified Label Component
 * Shows "Verified" text with badge
 */

interface VerifiedLabelProps {
  size?: 'sm' | 'md' | 'lg'
  showBadge?: boolean
  className?: string
}

export function VerifiedLabel({
  size = 'md',
  showBadge = true,
  className,
}: VerifiedLabelProps) {
  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-green-600 font-medium',
        textSizeClasses[size],
        className
      )}
    >
      {showBadge && <VerifiedBadge size={size} showTooltip={false} />}
      Verified
    </span>
  )
}
