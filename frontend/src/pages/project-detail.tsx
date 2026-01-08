/**
 * Project Detail Page - Premium Analytics Edition
 * Shows comprehensive project analysis with detailed skill breakdown
 * Skills displayed with percentages (Redis 80%, TypeScript 95%, etc.)
 */

import { useParams, Link } from 'react-router-dom'
import { AnalysisResults } from '@/components/features/project/AnalysisResults'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { get } from '@/api/client'
import { formatNumber, getLanguageColor, cn } from '@/lib/utils'
import {
  ArrowLeft,
  ExternalLink,
  Star,
  GitFork,
  Users,
  GitCommit,
  Loader2,
  Code,
  FileText,
  TestTube,
  Gauge,
  Activity,
  Github,
  Sparkles,
  Zap,
  CheckCircle2,
  TrendingUp,
  Server,
  Database,
  Shield,
  Box,
  Cloud,
  AlertTriangle,
  Lightbulb,
  Target,
  Layers,
  Building2,
  Network,
  BookOpen,
  Cpu,
  Lock,
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
  PieChart,
  Pie,
  Cell,
} from 'recharts'

// Skill category icons
const categoryIcons: Record<string, typeof Code> = {
  language: Code,
  framework: Box,
  database: Database,
  infrastructure: Server,
  security: Shield,
  devops: GitCommit,
  tool: Gauge,
  architecture: Building2,
  cloud: Cloud,
  testing: TestTube,
  messaging: Network,
  observability: Activity,
  performance: Zap,
}

// Skill category colors
const categoryColors: Record<string, string> = {
  language: 'from-indigo-500 to-purple-500',
  framework: 'from-emerald-500 to-teal-500',
  database: 'from-blue-500 to-cyan-500',
  infrastructure: 'from-orange-500 to-amber-500',
  security: 'from-red-500 to-pink-500',
  devops: 'from-violet-500 to-purple-500',
  tool: 'from-gray-500 to-slate-500',
  architecture: 'from-purple-500 to-indigo-500',
  cloud: 'from-sky-500 to-blue-500',
  testing: 'from-green-500 to-emerald-500',
  messaging: 'from-pink-500 to-rose-500',
  observability: 'from-yellow-500 to-orange-500',
  performance: 'from-amber-500 to-yellow-500',
}

// Priority colors for optimizations
const priorityColors: Record<string, { bg: string; text: string; border: string }> = {
  high: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
  medium: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  low: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
}

// ============================================
// SKILL BREAKDOWN CARD - Shows skill with %
// ============================================
interface SkillData {
  name: string
  category?: string
  level?: string
  confidence?: number
  score?: number
  verifiedScore?: number
  evidence?: string[]
  resumeReady?: boolean
  keywords?: string[]
  weight?: number
}

function SkillBreakdownCard({ skill }: { skill: SkillData }) {
  // Calculate percentage (confidence is 0-1, score is 0-100)
  const percentage = skill.confidence 
    ? Math.round(skill.confidence * 100) 
    : skill.score || skill.verifiedScore || 0
  
  const category = skill.category || 'tool'
  const Icon = categoryIcons[category] || Code
  const colorClass = categoryColors[category] || 'from-primary to-primary/70'
  
  // Check if this skill has incomplete project warning
  const hasIncompleteWarning = skill.evidence?.some((e: string) => 
    e.includes('incomplete') || e.includes('⚠️')
  )
  
  // Filter out warning messages from display evidence
  const displayEvidence = skill.evidence?.filter((e: string) => 
    !e.includes('⚠️')
  ) || []
  
  return (
    <div className={cn(
      "group rounded-xl border backdrop-blur p-4 hover:shadow-lg transition-all",
      hasIncompleteWarning 
        ? "border-amber-500/30 bg-amber-500/5"
        : "border-border/50 bg-card/50 hover:border-primary/30"
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br",
            hasIncompleteWarning ? "from-amber-500/70 to-amber-600/70" : colorClass
          )}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="font-bold text-foreground group-hover:text-primary transition-colors">
              {skill.name}
            </h4>
            <p className="text-xs text-muted-foreground capitalize">
              {category} • {skill.level || 'Detected'}
            </p>
          </div>
        </div>
        
        {/* Percentage Badge */}
        <div className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold",
          percentage >= 80 
            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" 
            : percentage >= 60 
              ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
              : percentage >= 50
                ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                : "bg-red-500/15 text-red-400 border border-red-500/30"
        )}>
          {percentage}%
        </div>
      </div>
      
      {/* Low Confidence Warning */}
      {percentage < 60 && (
        <div className="mb-3 flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 rounded-lg px-2 py-1">
          <AlertTriangle className="w-3.5 h-3.5" />
          Low confidence - needs more evidence
        </div>
      )}
      
      {/* Progress Bar */}
      <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
        <div 
          className={cn(
            "h-full rounded-full transition-all duration-700 bg-gradient-to-r",
            hasIncompleteWarning ? "from-amber-500 to-amber-400" : colorClass
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      {/* Evidence/Details */}
      {displayEvidence.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border/30">
          <p className="text-xs text-muted-foreground mb-2">Evidence:</p>
          <div className="flex flex-wrap gap-1.5">
            {displayEvidence.slice(0, 4).map((e: string, i: number) => (
              <span 
                key={i}
                className="text-xs px-2 py-0.5 rounded-md bg-muted/50 text-muted-foreground"
              >
                {e}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {/* Incomplete Project Warning */}
      {hasIncompleteWarning && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-400">
          <AlertTriangle className="w-3.5 h-3.5" />
          Partial detection - project may be incomplete
        </div>
      )}
      
      {/* Resume Ready Badge */}
      {skill.resumeReady && !hasIncompleteWarning && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Resume Ready
        </div>
      )}
    </div>
  )
}

// ============================================
// CIRCULAR SCORE
// ============================================
function CircularScore({ value, size = 120, label }: { value: number, size?: number, label?: string }) {
  const safeValue = isNaN(value) ? 0 : Math.min(100, Math.max(0, value))
  const strokeWidth = 8
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (safeValue / 100) * circumference

  const getColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500'
    if (score >= 60) return 'text-blue-500'
    if (score >= 40) return 'text-amber-500'
    return 'text-muted-foreground'
  }

  return (
    <div className="relative flex flex-col items-center" style={{ width: size }}>
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
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn("transition-all duration-1000", getColor(safeValue))}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("text-3xl font-bold", getColor(safeValue))}>{Math.round(safeValue)}</span>
        {label && <span className="text-xs text-muted-foreground">{label}</span>}
      </div>
    </div>
  )
}

// ============================================
// ARCHITECTURE DISPLAY
// ============================================
interface ArchitectureData {
  type?: string
  communication?: string[]
  serviceCount?: number
  services?: string[]
  patterns?: string[]
  engineeringLevel?: string
}

function ArchitectureCard({ architecture }: { architecture: ArchitectureData }) {
  if (!architecture) return null
  
  const archTypeLabels: Record<string, string> = {
    microservices: 'Microservices',
    monolith: 'Monolithic',
    serverless: 'Serverless',
    event_driven: 'Event-Driven',
    modular_monolith: 'Modular Monolith',
    layered: 'Layered',
    hexagonal: 'Hexagonal',
    clean_architecture: 'Clean Architecture',
  }
  
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur overflow-hidden">
      <CardHeader className="border-b border-border/30">
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-purple-500" />
          System Architecture
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid gap-4">
          {/* Architecture Type */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-purple-500/5 border border-purple-500/20">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Architecture Type</p>
              <p className="text-lg font-bold text-purple-400">
                {archTypeLabels[architecture.type || ''] || architecture.type || 'Standard'}
              </p>
            </div>
            <Building2 className="h-8 w-8 text-purple-500/50" />
          </div>
          
          {/* Service Count */}
          {architecture.serviceCount && architecture.serviceCount > 0 && (
            <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-blue-500/5 border border-blue-500/20">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Services</p>
                <p className="text-lg font-bold text-blue-400">{architecture.serviceCount} Services</p>
              </div>
              <Server className="h-8 w-8 text-blue-500/50" />
            </div>
          )}
          
          {/* Services List */}
          {architecture.services && architecture.services.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Service Names</p>
              <div className="flex flex-wrap gap-2">
                {architecture.services.map((service, i) => (
                  <Badge key={i} variant="outline" className="bg-muted/50">
                    {service}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Communication */}
          {architecture.communication && architecture.communication.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Communication Protocols</p>
              <div className="flex flex-wrap gap-2">
                {architecture.communication.map((comm, i) => (
                  <Badge key={i} className="bg-cyan-500/15 text-cyan-400 border-cyan-500/30">
                    {comm.toUpperCase()}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Patterns */}
          {architecture.patterns && architecture.patterns.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Detected Patterns</p>
              <div className="flex flex-wrap gap-2">
                {architecture.patterns.map((pattern, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {pattern}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Engineering Level */}
          {architecture.engineeringLevel && (
            <div className="flex items-center gap-2 mt-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Engineering Level:</span>
              <Badge className={cn(
                architecture.engineeringLevel === 'Production-grade' 
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : architecture.engineeringLevel === 'Advanced'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-amber-500/20 text-amber-400'
              )}>
                {architecture.engineeringLevel}
              </Badge>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// TECH STACK DISPLAY - ENHANCED
// ============================================
interface TechStackData {
  languages?: { name: string; percentage: number }[]
  frameworks?: string[]
  databases?: string[]
  tools?: string[]
  infrastructure?: string[]
  messaging?: string[]
  cloud?: string[]
  observability?: string[]
  testing?: string[]
}

interface InfraSignals {
  signals?: string[]
  signalDetails?: Record<string, { signal: string; confidence: number; evidence: string[] }>
}

// Map infra signals to readable names and categories
const signalToTechMapping: Record<string, { name: string; category: string }> = {
  'docker_compose': { name: 'Docker Compose', category: 'infrastructure' },
  'docker': { name: 'Docker', category: 'infrastructure' },
  'kubernetes': { name: 'Kubernetes', category: 'infrastructure' },
  'nginx': { name: 'Nginx', category: 'infrastructure' },
  'traefik': { name: 'Traefik', category: 'infrastructure' },
  'redis': { name: 'Redis', category: 'database' },
  'postgres': { name: 'PostgreSQL', category: 'database' },
  'mongodb': { name: 'MongoDB', category: 'database' },
  'mysql': { name: 'MySQL', category: 'database' },
  'rabbitmq': { name: 'RabbitMQ', category: 'messaging' },
  'kafka': { name: 'Apache Kafka', category: 'messaging' },
  'message_producer': { name: 'Message Queue', category: 'messaging' },
  'message_consumer': { name: 'Event Consumer', category: 'messaging' },
  'websocket': { name: 'WebSocket', category: 'realtime' },
  'graphql': { name: 'GraphQL', category: 'api' },
  'grpc': { name: 'gRPC', category: 'api' },
  'rest_api': { name: 'REST API', category: 'api' },
  'prometheus': { name: 'Prometheus', category: 'observability' },
  'grafana': { name: 'Grafana', category: 'observability' },
  'elastic': { name: 'Elasticsearch', category: 'observability' },
  'opentelemetry': { name: 'OpenTelemetry', category: 'observability' },
  'sentry': { name: 'Sentry', category: 'observability' },
  'aws': { name: 'AWS', category: 'cloud' },
  'gcp': { name: 'Google Cloud', category: 'cloud' },
  'azure': { name: 'Azure', category: 'cloud' },
  's3': { name: 'AWS S3', category: 'cloud' },
  'lambda': { name: 'AWS Lambda', category: 'cloud' },
  'jest': { name: 'Jest', category: 'testing' },
  'cypress': { name: 'Cypress', category: 'testing' },
  'tdd': { name: 'TDD', category: 'testing' },
  'llm': { name: 'LLM/AI', category: 'ml' },
  'circuit_breaker': { name: 'Circuit Breaker', category: 'pattern' },
  'retry_logic': { name: 'Retry Pattern', category: 'pattern' },
  'api_gateway_pattern': { name: 'API Gateway', category: 'pattern' },
  'health_endpoints': { name: 'Health Checks', category: 'devops' },
  'graceful_shutdown': { name: 'Graceful Shutdown', category: 'devops' },
  'ci_cd': { name: 'CI/CD', category: 'devops' },
  'github_actions': { name: 'GitHub Actions', category: 'devops' },
  'rbac': { name: 'RBAC', category: 'security' },
  'jwt': { name: 'JWT Auth', category: 'security' },
  'oauth': { name: 'OAuth', category: 'security' },
  'password_hashing': { name: 'Password Hashing', category: 'security' },
}

function TechStackCard({ techStack, skills, infraSignals }: { 
  techStack: TechStackData; 
  skills?: any[];
  infraSignals?: InfraSignals 
}) {
  if (!techStack && (!skills || skills.length === 0) && !infraSignals) return null
  
  const languages = techStack?.languages || []
  const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899']
  
  // Extract technologies from skills by category
  const skillsByCategory = (skills || []).reduce((acc: Record<string, string[]>, skill: any) => {
    const cat = skill.category || 'tool'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(skill.name)
    return acc
  }, {})
  
  // Extract technologies from infraSignals
  const signalTechs: Record<string, string[]> = {
    infrastructure: [],
    database: [],
    messaging: [],
    realtime: [],
    api: [],
    observability: [],
    cloud: [],
    testing: [],
    ml: [],
    pattern: [],
    devops: [],
    security: [],
  }
  
  if (infraSignals?.signals) {
    infraSignals.signals.forEach(signal => {
      const tech = signalToTechMapping[signal]
      if (tech && signalTechs[tech.category]) {
        if (!signalTechs[tech.category].includes(tech.name)) {
          signalTechs[tech.category].push(tech.name)
        }
      }
    })
  }
  
  // Merge all sources
  const databases = [...new Set([
    ...(techStack?.databases || []), 
    ...(skillsByCategory.database || []),
    ...signalTechs.database
  ])]
  const frameworks = [...new Set([
    ...(techStack?.frameworks || []), 
    ...(skillsByCategory.framework || [])
  ])]
  const infrastructure = [...new Set([
    ...(techStack?.infrastructure || []), 
    ...(skillsByCategory.infrastructure || []),
    ...signalTechs.infrastructure
  ])]
  const messaging = [...new Set([
    ...(techStack?.messaging || []), 
    ...(skillsByCategory.messaging || []),
    ...signalTechs.messaging
  ])]
  const realtime = signalTechs.realtime
  const apiTech = signalTechs.api
  const cloud = [...new Set([
    ...(techStack?.cloud || []), 
    ...(skillsByCategory.cloud || []),
    ...signalTechs.cloud
  ])]
  const observability = [...new Set([
    ...(techStack?.observability || []), 
    ...(skillsByCategory.observability || []),
    ...signalTechs.observability
  ])]
  const testing = [...new Set([
    ...(techStack?.testing || []), 
    ...(skillsByCategory.testing || []),
    ...signalTechs.testing
  ])]
  const devops = [...new Set([...(skillsByCategory.devops || []), ...signalTechs.devops])]
  const security = signalTechs.security
  const patterns = signalTechs.pattern
  const mlTech = signalTechs.ml
  const tools = [...new Set([...(techStack?.tools || []), ...(skillsByCategory.tool || [])])]
  
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cpu className="h-5 w-5 text-cyan-500" />
          Technology Stack
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Languages Pie Chart */}
        {languages.length > 0 && (
          <div className="mb-6">
            <p className="text-sm font-medium mb-4">Language Distribution</p>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={150} height={150}>
                <PieChart>
                  <Pie
                    data={languages}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={2}
                    dataKey="percentage"
                  >
                    {languages.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {languages.slice(0, 5).map((lang, i) => (
                  <div key={lang.name} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="text-sm flex-1">{lang.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {lang.percentage.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Tech Categories Grid */}
        <div className="space-y-4">
          {/* Frameworks */}
          {frameworks.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <Box className="w-3 h-3" /> Frameworks
              </p>
              <div className="flex flex-wrap gap-2">
                {frameworks.map((fw, i) => (
                  <Badge key={i} className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                    {fw}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Databases */}
          {databases.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <Database className="w-3 h-3" /> Databases
              </p>
              <div className="flex flex-wrap gap-2">
                {databases.map((db, i) => (
                  <Badge key={i} className="bg-blue-500/15 text-blue-400 border-blue-500/30">
                    {db}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Infrastructure (Nginx, Docker, K8s, etc.) */}
          {infrastructure.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <Server className="w-3 h-3" /> Infrastructure
              </p>
              <div className="flex flex-wrap gap-2">
                {infrastructure.map((infra, i) => (
                  <Badge key={i} className="bg-orange-500/15 text-orange-400 border-orange-500/30">
                    {infra}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Messaging (RabbitMQ, Kafka) */}
          {messaging.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <Network className="w-3 h-3" /> Messaging / Queues
              </p>
              <div className="flex flex-wrap gap-2">
                {messaging.map((msg, i) => (
                  <Badge key={i} className="bg-pink-500/15 text-pink-400 border-pink-500/30">
                    {msg}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Cloud Services */}
          {cloud.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <Cloud className="w-3 h-3" /> Cloud Services
              </p>
              <div className="flex flex-wrap gap-2">
                {cloud.map((c, i) => (
                  <Badge key={i} className="bg-sky-500/15 text-sky-400 border-sky-500/30">
                    {c}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Observability */}
          {observability.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <Activity className="w-3 h-3" /> Observability
              </p>
              <div className="flex flex-wrap gap-2">
                {observability.map((obs, i) => (
                  <Badge key={i} className="bg-yellow-500/15 text-yellow-400 border-yellow-500/30">
                    {obs}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* DevOps */}
          {devops.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <GitCommit className="w-3 h-3" /> DevOps
              </p>
              <div className="flex flex-wrap gap-2">
                {devops.map((d, i) => (
                  <Badge key={i} className="bg-violet-500/15 text-violet-400 border-violet-500/30">
                    {d}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Real-time */}
          {realtime.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <Zap className="w-3 h-3" /> Real-time
              </p>
              <div className="flex flex-wrap gap-2">
                {realtime.map((rt, i) => (
                  <Badge key={i} className="bg-purple-500/15 text-purple-400 border-purple-500/30">
                    {rt}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* API Technologies */}
          {apiTech.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <Network className="w-3 h-3" /> API Technologies
              </p>
              <div className="flex flex-wrap gap-2">
                {apiTech.map((api, i) => (
                  <Badge key={i} className="bg-indigo-500/15 text-indigo-400 border-indigo-500/30">
                    {api}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Security */}
          {security.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <Shield className="w-3 h-3" /> Security
              </p>
              <div className="flex flex-wrap gap-2">
                {security.map((sec, i) => (
                  <Badge key={i} className="bg-red-500/15 text-red-400 border-red-500/30">
                    {sec}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Design Patterns */}
          {patterns.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <Layers className="w-3 h-3" /> Design Patterns
              </p>
              <div className="flex flex-wrap gap-2">
                {patterns.map((p, i) => (
                  <Badge key={i} className="bg-teal-500/15 text-teal-400 border-teal-500/30">
                    {p}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* ML/AI */}
          {mlTech.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> ML / AI
              </p>
              <div className="flex flex-wrap gap-2">
                {mlTech.map((ml, i) => (
                  <Badge key={i} className="bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30">
                    {ml}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Testing */}
          {testing.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <TestTube className="w-3 h-3" /> Testing
              </p>
              <div className="flex flex-wrap gap-2">
                {testing.map((t, i) => (
                  <Badge key={i} className="bg-green-500/15 text-green-400 border-green-500/30">
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Other Tools */}
          {tools.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <Gauge className="w-3 h-3" /> Other Tools
              </p>
              <div className="flex flex-wrap gap-2">
                {tools.map((tool, i) => (
                  <Badge key={i} variant="outline">
                    {tool}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// OPTIMIZATIONS CARD
// ============================================
interface OptimizationData {
  category: string
  priority: string
  title: string
  description: string
  impact: string
}

function OptimizationsCard({ optimizations }: { optimizations: OptimizationData[] }) {
  if (!optimizations || optimizations.length === 0) return null
  
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'performance': return Zap
      case 'security': return Lock
      case 'testing': return TestTube
      case 'documentation': return BookOpen
      default: return Lightbulb
    }
  }
  
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-amber-500" />
          Optimization Suggestions
          <Badge variant="secondary" className="ml-auto">{optimizations.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {optimizations.map((opt, i) => {
          const colors = priorityColors[opt.priority] || priorityColors.low
          const Icon = getCategoryIcon(opt.category)
          
          return (
            <div 
              key={i}
              className={cn(
                "p-4 rounded-xl border",
                colors.bg,
                colors.border
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn("p-2 rounded-lg", colors.bg)}>
                  <Icon className={cn("h-4 w-4", colors.text)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-sm">{opt.title}</h4>
                    <Badge className={cn("text-xs", colors.bg, colors.text, colors.border)}>
                      {opt.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{opt.description}</p>
                  <p className="text-xs flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-emerald-500" />
                    <span className="text-emerald-400">{opt.impact}</span>
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

// ============================================
// BEST PRACTICES CARD
// ============================================
interface BestPracticesData {
  followed: string[]
  missing: string[]
  score: number
}

function BestPracticesCard({ bestPractices }: { bestPractices: BestPracticesData }) {
  if (!bestPractices) return null
  
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            Best Practices
          </div>
          <CircularScore value={bestPractices.score} size={60} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Followed */}
        {bestPractices.followed && bestPractices.followed.length > 0 && (
          <div>
            <p className="text-sm font-medium text-emerald-400 mb-2 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Following ({bestPractices.followed.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {bestPractices.followed.map((practice, i) => (
                <Badge key={i} className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                  {practice}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* Missing */}
        {bestPractices.missing && bestPractices.missing.length > 0 && (
          <div>
            <p className="text-sm font-medium text-amber-400 mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Missing ({bestPractices.missing.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {bestPractices.missing.map((practice, i) => (
                <Badge key={i} variant="outline" className="text-amber-400 border-amber-500/30">
                  {practice}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// FRAMEWORK ANALYSIS CARD
// ============================================
interface FrameworkAnalysisData {
  framework: string
  patternsDetected: string[]
  suggestions: string[]
  advancedUsage?: string[]
}

function FrameworkAnalysisCard({ frameworkAnalysis }: { frameworkAnalysis: FrameworkAnalysisData }) {
  if (!frameworkAnalysis) return null
  
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Box className="h-5 w-5 text-emerald-500" />
          Framework Analysis
          <Badge className="ml-2 bg-emerald-500/20 text-emerald-400">
            {frameworkAnalysis.framework}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Patterns Detected */}
        {frameworkAnalysis.patternsDetected && frameworkAnalysis.patternsDetected.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Patterns Detected</p>
            <div className="flex flex-wrap gap-2">
              {frameworkAnalysis.patternsDetected.map((pattern, i) => (
                <Badge key={i} variant="secondary">
                  {pattern}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* Advanced Usage */}
        {frameworkAnalysis.advancedUsage && frameworkAnalysis.advancedUsage.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Advanced Usage</p>
            <div className="flex flex-wrap gap-2">
              {frameworkAnalysis.advancedUsage.map((usage, i) => (
                <Badge key={i} className="bg-purple-500/15 text-purple-400 border-purple-500/30">
                  {usage}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* Suggestions */}
        {frameworkAnalysis.suggestions && frameworkAnalysis.suggestions.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Suggestions</p>
            <ul className="space-y-2">
              {frameworkAnalysis.suggestions.map((suggestion, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// COMPLEXITY CARD
// ============================================
interface ComplexityData {
  totalScore: number
  architectureScore: number
  infrastructureScore: number
  codeQualityScore: number
  scaleLabel: string
}

function ComplexityCard({ complexity }: { complexity?: ComplexityData }) {
  if (!complexity) return null

  return (
    <Card className="border-border/50 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gauge className="h-5 w-5 text-indigo-500" />
          Project Complexity
          <Badge className={cn("ml-2", 
            complexity.scaleLabel === 'Enterprise' ? "bg-purple-500/20 text-purple-400" :
            complexity.scaleLabel === 'Growth/Scaleup' ? "bg-indigo-500/20 text-indigo-400" :
            "bg-blue-500/20 text-blue-400"
          )}>
            {complexity.scaleLabel}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="shrink-0">
             <CircularScore value={complexity.totalScore} size={100} label="Complexity" />
          </div>
          <div className="flex-1 space-y-4 w-full">
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span>Architecture</span>
                <span className="font-bold text-indigo-400">{Math.round(complexity.architectureScore)}/100</span>
              </div>
              <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" 
                  style={{ width: `${complexity.architectureScore}%` }} 
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span>Infrastructure</span>
                <span className="font-bold text-pink-400">{Math.round(complexity.infrastructureScore)}/100</span>
              </div>
              <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-pink-500 to-rose-500" 
                  style={{ width: `${complexity.infrastructureScore}%` }} 
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span>Code Quality</span>
                <span className="font-bold text-emerald-400">{Math.round(complexity.codeQualityScore)}/100</span>
              </div>
              <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" 
                  style={{ width: `${complexity.codeQualityScore}%` }} 
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// ARCHITECTURE GRAPH VIEW
// ============================================
interface GraphNode {
  id: string
  label: string
  type: string
  technology: string
}

interface GraphEdge {
  source: string
  target: string
  type: string
}

interface ArchitectureGraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

function ArchitectureGraphView({ graph }: { graph?: ArchitectureGraphData }) {
  if (!graph || graph.nodes.length === 0) return null
  
  // Simple visualization for now - just nodes and connection list
  
  const getIcon = (type: string) => {
    switch (type) {
      case 'service': return Server
      case 'database': return Database
      case 'queue': return Network
      case 'gateway': return Layers
      case 'frontend': return Code
      default: return Box
    }
  }

  const getColor = (type: string) => {
    switch (type) {
      case 'service': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      case 'database': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      case 'queue': return 'bg-pink-500/10 text-pink-400 border-pink-500/20'
      case 'gateway': return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
      case 'frontend': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
      default: return 'bg-muted text-muted-foreground border-border'
    }
  }

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Network className="h-5 w-5 text-teal-500" />
          System Topology
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Nodes Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {graph.nodes.map(node => {
            const Icon = getIcon(node.type)
            return (
              <div key={node.id} className={cn("p-4 rounded-xl border flex flex-col items-center text-center gap-2", getColor(node.type))}>
                <Icon className="h-6 w-6 mb-1" />
                <span className="font-bold text-sm truncate w-full" title={node.label}>{node.label}</span>
                <span className="text-[10px] uppercase opacity-70 tracking-wider font-semibold">{node.type}</span>
                {node.technology && (
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5 mt-1 bg-background/50">
                    {node.technology}
                  </Badge>
                )}
              </div>
            )
          })}
        </div>
        
        {/* Edges / Flows */}
        {graph.edges.length > 0 && (
          <div className="p-4 rounded-xl bg-muted/20 border border-border/30">
            <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Communication Flows</h4>
            <div className="space-y-2">
              {graph.edges.map((edge, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className="font-medium">{graph.nodes.find(n => n.id === edge.source)?.label || edge.source}</span>
                  <div className="flex-1 h-px bg-border flex items-center justify-center relative">
                     <span className="absolute -top-2 text-[10px] text-muted-foreground bg-background px-1">connects to</span>
                     <div className="absolute right-0 top-1/2 -mt-[3px] w-0 h-0 border-t-[3px] border-t-transparent border-b-[3px] border-b-transparent border-l-[6px] border-l-border" />
                  </div>
                  <span className="font-medium">{graph.nodes.find(n => n.id === edge.target)?.label || edge.target}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()

  const { data: project, isLoading, error } = useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const response = await get<{ project: any }>(`/v1/projects/${id}`)
      const raw = response.project
      
      // Map backend fields to frontend expected fields
      // Handle the nested fullAnalysis.industryAnalysis structure
      const fullAnalysis = raw.fullAnalysis || {}
      const industryAnalysisFromFull = fullAnalysis.industryAnalysis || {}
      const topLevelIndustry = raw.industryAnalysis || {}
      
      // Merge industry analysis - prefer fullAnalysis version as it has more data
      const mergedIndustryAnalysis = {
        ...topLevelIndustry,
        ...industryAnalysisFromFull,
        verifiedSkills: industryAnalysisFromFull.verifiedSkills || topLevelIndustry.verifiedSkills || [],
        skillsByCategory: industryAnalysisFromFull.skillsByCategory || topLevelIndustry.skillsByCategory || {},
      }
      
      return {
        ...raw,
        repoUrl: raw.githubRepoUrl || raw.repoUrl,
        analysisStatus: (raw.analysisStatus || '').toLowerCase(),
        stars: raw.stars || 0,
        forks: raw.forks || 0,
        commits: raw.commits || 0,
        contributors: raw.contributors || 0,
        languages: raw.languages || {},
        auraContribution: raw.auraContribution || raw.overallScore || 0,
        fullAnalysis: fullAnalysis,
        industryAnalysis: mergedIndustryAnalysis,
        metrics: raw.metrics || null,
      }
    },
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading project details...</p>
        </div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="text-center py-24">
        <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
          <Github className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Project not found</h2>
        <p className="text-muted-foreground mb-6">The project you're looking for doesn't exist or failed to load.</p>
        <Button asChild>
          <Link to="/projects">Back to Projects</Link>
        </Button>
      </div>
    )
  }

  // Extract data from fullAnalysis
  const fullAnalysis = project.fullAnalysis || {}
  const industryAnalysis = project.industryAnalysis || {}
  
  // Get verified skills from industry analysis (fullAnalysis has the complete data)
  const verifiedSkills = industryAnalysis.verifiedSkills || []
  const skillsByCategory = industryAnalysis.skillsByCategory || {}
  const overallScore = industryAnalysis.overallScore || project.auraContribution || 0
  
  // Metrics for radar chart
  const metrics = project.metrics
  const metricsData = metrics
    ? [
        { metric: 'Code Quality', value: metrics.codeQuality || 0 },
        { metric: 'Documentation', value: metrics.documentation || 0 },
        { metric: 'Test Coverage', value: metrics.testCoverage || 0 },
        { metric: 'Maintainability', value: metrics.maintainability || 0 },
        { metric: 'Activity', value: metrics.activityScore || 0 },
      ]
    : []

  const languagesData = Object.entries(project.languages || {}).map(
    ([name, bytes]) => ({
      name,
      value: bytes as number,
      color: getLanguageColor(name),
    })
  )

  // Count skills by category
  const categorySkillCounts = Object.entries(skillsByCategory).map(([category, skills]) => ({
    category,
    count: Array.isArray(skills) ? skills.length : 0,
  })).filter(c => c.count > 0)

  return (
    <div className="space-y-5 pb-10">
      {/* ===== HERO HEADER ===== */}
      <div className="rounded-3xl border border-border/50 bg-gradient-to-br from-card via-card/80 to-card/60 backdrop-blur-xl p-6 md:p-8">
        <div className="flex items-start gap-4 mb-6">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link to="/projects">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              {/* GitHub Icon */}
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-muted to-muted/50 border border-border/50 flex items-center justify-center">
                <Github className="w-6 h-6" />
              </div>
              
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                  {project.repoName || project.name}
                </h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  {project.language && (
                    <Badge variant="secondary" className="gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      {project.language}
                    </Badge>
                  )}
                  <Badge
                    variant={project.analysisStatus === 'completed' ? 'default' : 'secondary'}
                    className={project.analysisStatus === 'completed' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : ''}
                  >
                    {project.analysisStatus === 'completed' ? '✓ Analyzed' : project.analysisStatus}
                  </Badge>
                </div>
              </div>
            </div>
            
            {project.description && (
              <p className="text-muted-foreground mt-3 max-w-2xl">{project.description}</p>
            )}
          </div>
          
          <Button variant="outline" asChild className="shrink-0">
            <a href={project.repoUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              View on GitHub
            </a>
          </Button>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 p-4">
            <div className="flex items-center gap-2 text-amber-500 mb-1">
              <Star className="h-4 w-4" />
              <span className="text-xs font-medium">Stars</span>
            </div>
            <p className="text-2xl font-bold">{formatNumber(project.stars)}</p>
          </div>
          
          <div className="rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 p-4">
            <div className="flex items-center gap-2 text-blue-500 mb-1">
              <GitFork className="h-4 w-4" />
              <span className="text-xs font-medium">Forks</span>
            </div>
            <p className="text-2xl font-bold">{formatNumber(project.forks)}</p>
          </div>
          
          <div className="rounded-xl bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 p-4">
            <div className="flex items-center gap-2 text-green-500 mb-1">
              <GitCommit className="h-4 w-4" />
              <span className="text-xs font-medium">Commits</span>
            </div>
            <p className="text-2xl font-bold">{formatNumber(project.commits)}</p>
          </div>
          
          <div className="rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 p-4">
            <div className="flex items-center gap-2 text-purple-500 mb-1">
              <Users className="h-4 w-4" />
              <span className="text-xs font-medium">Contributors</span>
            </div>
            <p className="text-2xl font-bold">{project.contributors}</p>
          </div>
          
          <div className="rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-4">
            <div className="flex items-center gap-2 text-primary mb-1">
              <Zap className="h-4 w-4" />
              <span className="text-xs font-medium">Aura Points</span>
            </div>
            <p className="text-2xl font-bold text-primary">+{formatNumber(project.auraContribution)}</p>
          </div>
        </div>
      </div>

      {/* ===== OVERALL SCORE & SUMMARY ===== */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Overall Score */}
        <Card className="border-border/50 bg-gradient-to-br from-primary/5 to-primary/10 backdrop-blur">
          <CardContent className="p-6 flex flex-col items-center justify-center">
            <CircularScore value={Math.round(overallScore)} size={140} label="Overall Score" />
            <p className="text-sm text-muted-foreground mt-4 text-center">
              Industry-grade analysis score based on architecture, patterns, and best practices
            </p>
          </CardContent>
        </Card>
        
        {/* Skills Summary */}
        <Card className="border-border/50 bg-card/50 backdrop-blur md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Analysis Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-muted/30 border border-border/30 text-center">
                <p className="text-3xl font-bold text-primary">{verifiedSkills.length}</p>
                <p className="text-xs text-muted-foreground">Skills Detected</p>
              </div>
              <div className="p-4 rounded-xl bg-muted/30 border border-border/30 text-center">
                <p className="text-3xl font-bold text-emerald-400">
                  {industryAnalysis.resumeReadySkills || verifiedSkills.filter((s: SkillData) => s.resumeReady).length}
                </p>
                <p className="text-xs text-muted-foreground">Resume Ready</p>
              </div>
              <div className="p-4 rounded-xl bg-muted/30 border border-border/30 text-center">
                <p className="text-3xl font-bold text-blue-400">
                  {industryAnalysis.highConfidenceSkills || verifiedSkills.filter((s: SkillData) => (s.confidence || 0) >= 0.8).length}
                </p>
                <p className="text-xs text-muted-foreground">High Confidence</p>
              </div>
              <div className="p-4 rounded-xl bg-muted/30 border border-border/30 text-center">
                <p className="text-3xl font-bold text-purple-400">{categorySkillCounts.length}</p>
                <p className="text-xs text-muted-foreground">Categories</p>
              </div>
            </div>
            
            {/* Engineering Level */}
            {industryAnalysis.engineeringLevel && (
              <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-purple-500/5 border border-purple-500/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 text-purple-500" />
                  <span className="font-medium">Engineering Level</span>
                </div>
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-sm">
                  {industryAnalysis.engineeringLevel}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ===== SKILLS BREAKDOWN SECTION ===== */}
      {verifiedSkills.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Verified Skills</h2>
              <p className="text-sm text-muted-foreground">
                {verifiedSkills.length} skills detected • Confidence shown as %
              </p>
            </div>
          </div>
          
          {/* Skills Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {verifiedSkills
              .sort((a: SkillData, b: SkillData) => {
                const aScore = a.confidence ? a.confidence * 100 : (a.score || a.verifiedScore || 0)
                const bScore = b.confidence ? b.confidence * 100 : (b.score || b.verifiedScore || 0)
                return bScore - aScore
              })
              .slice(0, 12)
              .map((skill: SkillData, index: number) => (
                <SkillBreakdownCard key={`${skill.name}-${index}`} skill={skill} />
              ))}
          </div>
          
          {verifiedSkills.length > 12 && (
            <p className="text-sm text-muted-foreground text-center">
              Showing top 12 of {verifiedSkills.length} skills
            </p>
          )}
        </div>
      )}

      {/* ===== SKILLS BY CATEGORY ===== */}
      {Object.keys(skillsByCategory).length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            Skills by Category
          </h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            {Object.entries(skillsByCategory).map(([category, skills]) => {
              if (!Array.isArray(skills) || skills.length === 0) return null
              const Icon = categoryIcons[category] || Code
              const colorClass = categoryColors[category] || 'from-primary to-primary/70'
              
              return (
                <Card key={category} className="border-border/50 bg-card/50 backdrop-blur">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg capitalize">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br", colorClass)}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      {category}
                      <Badge variant="secondary" className="ml-auto">{skills.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {skills.slice(0, 4).map((skill: SkillData, i: number) => {
                        const percentage = skill.confidence 
                          ? Math.round(skill.confidence * 100) 
                          : skill.score || skill.verifiedScore || 0
                        
                        return (
                          <div key={i} className="flex items-center gap-3">
                            <span className="text-sm flex-1 truncate">{skill.name}</span>
                            <div className="w-24 h-2 rounded-full bg-muted/50 overflow-hidden">
                              <div 
                                className={cn("h-full rounded-full bg-gradient-to-r", colorClass)}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-10 text-right">
                              {percentage}%
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* ===== COMPLEXITY & GRAPH ===== */}
      <div className="grid gap-4">
        {project.complexity && (
          <ComplexityCard complexity={project.complexity} />
        )}
        
        {project.architectureGraph && (
          <ArchitectureGraphView graph={project.architectureGraph} />
        )}
      </div>

      {/* ===== ARCHITECTURE & TECH STACK ===== */}
      {fullAnalysis.industryAnalysis?.architecture && (
        <div className="grid md:grid-cols-2 gap-4">
          <ArchitectureCard architecture={fullAnalysis.industryAnalysis.architecture} />
          {(fullAnalysis.techStack || verifiedSkills.length > 0) && (
            <TechStackCard 
              techStack={fullAnalysis.techStack || {}} 
              skills={verifiedSkills} 
              infraSignals={fullAnalysis.industryAnalysis?.infraSignals}
            />
          )}
        </div>
      )}

      {/* ===== METRICS & LANGUAGES ===== */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Metrics Radar */}
        {metrics && metricsData.length > 0 && (
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Code Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={metricsData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis
                    dataKey="metric"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 100]}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  />
                  <Radar
                    name="Score"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.3}
                  />
                </RadarChart>
              </ResponsiveContainer>

              {/* Metric Details */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                  <Code className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Code Quality</span>
                  <span className="ml-auto font-bold text-primary">
                    {metrics.codeQuality}%
                  </span>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Documentation</span>
                  <span className="ml-auto font-bold text-blue-400">
                    {metrics.documentation}%
                  </span>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                  <TestTube className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Test Coverage</span>
                  <span className="ml-auto font-bold text-emerald-400">
                    {metrics.testCoverage}%
                  </span>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                  <Gauge className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Complexity</span>
                  <span className="ml-auto font-bold text-amber-400">
                    {metrics.complexity}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Languages */}
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5 text-primary" />
              Languages
            </CardTitle>
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
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      width={80}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '12px',
                      }}
                      formatter={(value: number) =>
                        `${(value / 1024).toFixed(1)} KB`
                      }
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {languagesData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
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
                      className="flex items-center gap-1.5 px-3 py-1.5"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: lang.color }}
                      />
                      {lang.name}
                    </Badge>
                  ))}
                </div>
              </>
            ) : fullAnalysis.techStack?.languages && fullAnalysis.techStack.languages.length > 0 ? (
              // Use techStack languages if project.languages is empty
              <div className="space-y-3">
                {fullAnalysis.techStack.languages.map((lang: { name: string; percentage: number }, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-sm flex-1">{lang.name}</span>
                    <div className="w-32 h-2 rounded-full bg-muted/50 overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70"
                        style={{ width: `${lang.percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-12 text-right">
                      {lang.percentage.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No language data available
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ===== BEST PRACTICES & OPTIMIZATIONS ===== */}
      <div className="grid md:grid-cols-2 gap-6">
        {fullAnalysis.bestPractices && (
          <BestPracticesCard bestPractices={fullAnalysis.bestPractices} />
        )}
        {fullAnalysis.optimizations && (
          <OptimizationsCard optimizations={fullAnalysis.optimizations} />
        )}
      </div>

      {/* ===== FRAMEWORK ANALYSIS ===== */}
      {fullAnalysis.frameworkAnalysis && (
        <FrameworkAnalysisCard frameworkAnalysis={fullAnalysis.frameworkAnalysis} />
      )}

      {/* ===== DETAILED ANALYSIS ===== */}
      {fullAnalysis && Object.keys(fullAnalysis).length > 0 ? (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-cyan-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Deep Analysis</h2>
              <p className="text-sm text-muted-foreground">
                Folder structure, code quality indicators, and configuration analysis
              </p>
            </div>
          </div>
          <AnalysisResults analysis={fullAnalysis} />
        </div>
      ) : (
        <div className="p-8 border border-dashed border-border rounded-2xl text-center bg-muted/5">
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <Code className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-bold mb-2">Deep analysis pending</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Detailed code structure, optimization tips, and framework analysis will appear here once the deep scan is complete.
          </p>
        </div>
      )}

      {/* ===== INFRASTRUCTURE SIGNALS (Debug/Advanced) ===== */}
      {industryAnalysis.infraSignals && industryAnalysis.infraSignals.signals && industryAnalysis.infraSignals.signals.length > 0 && (
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5 text-orange-500" />
              Infrastructure Signals
              <Badge variant="secondary" className="ml-auto">
                {industryAnalysis.infraSignals.signals.length} signals
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {industryAnalysis.infraSignals.signals.map((signal: string, i: number) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {signal.replace(/_/g, ' ')}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
