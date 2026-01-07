import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface AnimatedCardProps {
  children: ReactNode
  className?: string
  hoverScale?: boolean
  hoverGlow?: boolean
  delay?: number
  gradient?: string
}

export function AnimatedCard({
  children,
  className,
  hoverScale = true,
  hoverGlow = true,
  delay = 0,
  gradient,
}: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={hoverScale ? { scale: 1.02 } : undefined}
      className="relative group"
    >
      {gradient && (
        <div
          className={cn(
            'absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity rounded-lg',
            `bg-gradient-to-br ${gradient}`
          )}
        />
      )}
      {hoverGlow && (
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity blur rounded-lg" />
      )}
      <Card className={cn('relative transition-all duration-300', className)}>{children}</Card>
    </motion.div>
  )
}

interface StatCardProps {
  icon: ReactNode
  label: string
  value: string | number
  trend?: string
  trendUp?: boolean
  color?: string
  delay?: number
}

export function AnimatedStatCard({
  icon,
  label,
  value,
  trend,
  trendUp,
  color = 'bg-primary/10 text-primary',
  delay = 0,
}: StatCardProps) {
  return (
    <AnimatedCard delay={delay} hoverScale hoverGlow>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-1">{label}</p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: delay + 0.2 }}
              className="text-3xl font-bold"
            >
              {value}
            </motion.p>
            {trend && (
              <motion.p
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: delay + 0.3 }}
                className={cn(
                  'text-xs mt-1 flex items-center gap-1',
                  trendUp ? 'text-green-500' : 'text-muted-foreground'
                )}
              >
                {trendUp && <span>↗</span>}
                {trend}
              </motion.p>
            )}
          </div>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: delay + 0.1, type: 'spring', stiffness: 200 }}
            className={cn('p-3 rounded-lg', color)}
          >
            {icon}
          </motion.div>
        </div>
      </CardContent>
    </AnimatedCard>
  )
}

interface FeatureCardProps {
  icon: ReactNode
  title: string
  description: string
  href?: string
  onClick?: () => void
  gradient?: string
  delay?: number
}

export function AnimatedFeatureCard({
  icon,
  title,
  description,
  href,
  onClick,
  gradient = 'from-primary to-primary/60',
  delay = 0,
}: FeatureCardProps) {
  const Component = href ? 'a' : 'div'
  const props = href ? { href } : onClick ? { onClick, role: 'button', tabIndex: 0 } : {}

  return (
    <Component {...props}>
      <AnimatedCard
        delay={delay}
        hoverScale
        hoverGlow
        gradient={gradient}
        className="cursor-pointer h-full"
      >
        <CardHeader>
          <motion.div
            initial={{ rotate: -180, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ delay: delay + 0.2, type: 'spring', stiffness: 200 }}
            className={cn(
              'inline-flex p-3 rounded-lg mb-4',
              `bg-gradient-to-br ${gradient} text-white`
            )}
          >
            {icon}
          </motion.div>
          <CardTitle className="group-hover:text-primary transition-colors">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{description}</p>
        </CardContent>
      </AnimatedCard>
    </Component>
  )
}

export function PulseCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      animate={{
        boxShadow: [
          '0 0 0 0 rgba(var(--primary), 0)',
          '0 0 0 10px rgba(var(--primary), 0.1)',
          '0 0 0 0 rgba(var(--primary), 0)',
        ],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        repeatType: 'loop',
      }}
      className={cn('rounded-lg', className)}
    >
      <Card>{children}</Card>
    </motion.div>
  )
}
