import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, TrendingDown, Info, Sparkles, Star, Zap, Award, GitBranch, Code, CheckCircle } from 'lucide-react'
import { AuraDetailItem } from '@/types'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface AuraBreakdownSimple {
  profile: number
  projects: number
  skills: number
  activity: number
  github: number
  breakdownDetails?: Record<string, AuraDetailItem[]>
}

interface AuraScoreCardProps {
  total: number
  level: string
  trend: 'up' | 'down' | 'stable'
  percentile: number
  breakdown: AuraBreakdownSimple
  recentGains?: Array<{ source: string; points: number; date: string }>
}

const categoryConfig: Record<string, { icon: React.ComponentType<any>; color: string; maxPoints: number; description: string }> = {
  profile: {
    icon: CheckCircle,
    color: 'text-green-400',
    maxPoints: 60,
    description: 'Complete your profile to earn points'
  },
  projects: {
    icon: Code,
    color: 'text-blue-400',
    maxPoints: 200,
    description: 'Add and analyze projects for more points'
  },
  skills: {
    icon: Zap,
    color: 'text-yellow-400',
    maxPoints: 150,
    description: 'Verified skills from your projects'
  },
  activity: {
    icon: TrendingUp,
    color: 'text-purple-400',
    maxPoints: 100,
    description: 'Regular activity on the platform'
  },
  github: {
    icon: GitBranch,
    color: 'text-orange-400',
    maxPoints: 100,
    description: 'GitHub profile stats and contributions'
  }
}

const levelConfig: Record<string, { color: string; gradient: string; icon: React.ComponentType<any> }> = {
  Novice: { color: 'text-gray-400', gradient: 'from-gray-400 to-gray-600', icon: Star },
  Rising: { color: 'text-green-400', gradient: 'from-green-400 to-emerald-600', icon: TrendingUp },
  Skilled: { color: 'text-blue-400', gradient: 'from-blue-400 to-cyan-600', icon: Zap },
  Expert: { color: 'text-purple-400', gradient: 'from-purple-400 to-violet-600', icon: Award },
  Legend: { color: 'text-yellow-400', gradient: 'from-yellow-400 to-amber-600', icon: Sparkles }
}

function BreakdownTooltip({ category, points, details }: { category: string; points: number; details?: AuraDetailItem[] }) {
  const config = categoryConfig[category]
  const Icon = config?.icon || Info
  const percentage = config ? Math.round((points / config.maxPoints) * 100) : 0
  
  return (
    <div className="p-3 min-w-[280px] max-w-[350px]">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
        <Icon className={`w-5 h-5 ${config?.color || 'text-muted-foreground'}`} />
        <span className="font-semibold capitalize">{category}</span>
        <span className="ml-auto text-sm text-muted-foreground">
          {points} / {config?.maxPoints || 100}
        </span>
      </div>
      
      {/* Progress bar */}
      <div className="w-full h-2 bg-muted rounded-full mb-3 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          className={`h-full rounded-full bg-gradient-to-r ${
            percentage > 75 ? 'from-green-500 to-emerald-400' :
            percentage > 50 ? 'from-blue-500 to-cyan-400' :
            percentage > 25 ? 'from-yellow-500 to-amber-400' :
            'from-red-500 to-orange-400'
          }`}
        />
      </div>
      
      {/* Details breakdown */}
      {details && details.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground mb-2">{config?.description}</p>
          {details.map((item, idx) => (
            <div key={idx} className="flex items-start gap-2 text-sm">
              <div className={`w-1.5 h-1.5 rounded-full mt-1.5 ${
                item.earned ? 'bg-green-400' : 'bg-muted-foreground'
              }`} />
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <span className={item.earned ? 'text-foreground' : 'text-muted-foreground'}>
                    {item.label}
                  </span>
                  <span className={`font-mono text-xs ${
                    item.earned ? 'text-green-400' : 'text-muted-foreground'
                  }`}>
                    +{item.points}
                  </span>
                </div>
                {item.reason && (
                  <p className="text-xs text-muted-foreground mt-0.5">{item.reason}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{config?.description || 'No details available'}</p>
      )}
      
      {/* Tip for improvement */}
      {percentage < 100 && (
        <div className="mt-3 pt-2 border-t border-border">
          <p className="text-xs text-primary flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            {percentage < 25 ? 'Start improving this area!' :
             percentage < 50 ? 'Good progress, keep going!' :
             percentage < 75 ? 'Almost there!' :
             'Great work! Max it out!'}
          </p>
        </div>
      )}
    </div>
  )
}

export function AuraScoreCard({ total, level, trend, percentile, breakdown, recentGains }: AuraScoreCardProps) {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null)
  const config = levelConfig[level] || levelConfig.Novice
  const LevelIcon = config.icon
  
  const maxTotal = 610
  const percentage = Math.round((total / maxTotal) * 100)

  return (
    <TooltipProvider delayDuration={100}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-xl p-6 relative overflow-hidden"
      >
        {/* Background gradient */}
        <div className={`absolute inset-0 opacity-5 bg-gradient-to-br ${config.gradient}`} />
        
        {/* Header */}
        <div className="relative flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-gradient-to-br ${config.gradient} bg-opacity-20`}>
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Aura Score</h3>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-sm text-muted-foreground cursor-help flex items-center gap-1">
                    How is this calculated?
                    <Info className="w-3 h-3" />
                  </p>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[300px]">
                  <div className="p-2">
                    <p className="font-semibold mb-2">Aura Score Breakdown (Max: 610)</p>
                    <ul className="text-sm space-y-1">
                      <li>• Profile Completion: up to 60 pts</li>
                      <li>• Projects Analyzed: up to 200 pts</li>
                      <li>• Verified Skills: up to 150 pts</li>
                      <li>• Platform Activity: up to 100 pts</li>
                      <li>• GitHub Profile: up to 100 pts</li>
                    </ul>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          
          {/* Trend indicator */}
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
            trend === 'up' ? 'bg-green-500/20 text-green-400' :
            trend === 'down' ? 'bg-red-500/20 text-red-400' :
            'bg-muted text-muted-foreground'
          }`}>
            {trend === 'up' ? <TrendingUp className="w-3 h-3" /> :
             trend === 'down' ? <TrendingDown className="w-3 h-3" /> : null}
            {trend === 'up' ? '+' : trend === 'down' ? '-' : ''}trending
          </div>
        </div>
        
        {/* Main Score */}
        <div className="relative flex items-end gap-4 mb-6">
          <motion.div
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            className={`text-6xl font-bold bg-gradient-to-r ${config.gradient} bg-clip-text text-transparent`}
          >
            {total}
          </motion.div>
          <div className="mb-2">
            <div className="flex items-center gap-2">
              <LevelIcon className={`w-5 h-5 ${config.color}`} />
              <span className={`text-lg font-semibold ${config.color}`}>{level}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Top {100 - percentile}% of developers
            </p>
          </div>
        </div>
        
        {/* Overall progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-mono">{percentage}%</span>
          </div>
          <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className={`h-full rounded-full bg-gradient-to-r ${config.gradient}`}
            />
          </div>
        </div>
        
        {/* Category Breakdown */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Score Breakdown</h4>
          
          {Object.entries(categoryConfig).map(([key, cat]) => {
            const breakdownKey = key as keyof Omit<AuraBreakdownSimple, 'breakdownDetails'>
            const points = breakdown[breakdownKey] || 0
            const details = breakdown.breakdownDetails?.[breakdownKey] || []
            const catPercentage = Math.round((points / cat.maxPoints) * 100)
            const Icon = cat.icon
            
            return (
              <Tooltip key={key}>
                <TooltipTrigger asChild>
                  <div
                    className="group cursor-pointer"
                    onMouseEnter={() => setHoveredCategory(key)}
                    onMouseLeave={() => setHoveredCategory(null)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${cat.color} transition-transform group-hover:scale-110`} />
                        <span className="text-sm capitalize group-hover:text-foreground transition-colors">
                          {key}
                        </span>
                      </div>
                      <span className="text-sm font-mono">
                        {points}<span className="text-muted-foreground">/{cat.maxPoints}</span>
                      </span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${catPercentage}%` }}
                        transition={{ duration: 0.8, delay: 0.1 * Object.keys(categoryConfig).indexOf(key) }}
                        className={`h-full rounded-full ${
                          hoveredCategory === key ? 'opacity-100' : 'opacity-80'
                        } transition-opacity`}
                        style={{
                          background: `linear-gradient(to right, var(--${cat.color.split('-')[1]}-500), var(--${cat.color.split('-')[1]}-400))`
                        }}
                      />
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="p-0">
                  <BreakdownTooltip 
                    category={key} 
                    points={points} 
                    details={details}
                  />
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>
        
        {/* Recent Gains */}
        {recentGains && recentGains.length > 0 && (
          <div className="mt-6 pt-4 border-t border-border">
            <h4 className="text-sm font-medium text-muted-foreground mb-3">Recent Gains</h4>
            <div className="space-y-2">
              <AnimatePresence>
                {recentGains.slice(0, 3).map((gain, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-muted-foreground">{gain.source}</span>
                    <span className="text-green-400 font-mono">+{gain.points}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </motion.div>
    </TooltipProvider>
  )
}

export default AuraScoreCard
