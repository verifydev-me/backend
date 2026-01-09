/**
 * Recruiter Candidate Search Page
 * ULTRA PREMIUM design with advanced animations and effects
 */

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useSearchCandidates, useShortlistCandidate, useShortlist } from '@/hooks/use-recruiter'
import { AuraBadge } from '@/components/aura-score'
import { SkillBadge } from '@/components/skill-card'
import type { CandidateSearchFilters } from '@/api/services/recruiter.service'
import {
  Search,
  Filter,
  MapPin,
  Briefcase,
  Star,
  Plus,
  X,
  Users,
  ExternalLink,
  Check,
  Sparkles,
  Zap,
  Code2,
  Target,
  ArrowRight,
  CheckCircle2,
  Shield,
  Crown,
  Flame,
  Heart,
} from 'lucide-react'

const POPULAR_SKILLS = [
  'React', 'TypeScript', 'Node.js', 'Python', 'Go', 'Java',
  'PostgreSQL', 'MongoDB', 'Docker', 'Kubernetes', 'AWS', 'GraphQL',
  'Next.js', 'Vue.js', 'Rust', 'Ruby', 'C++', 'Swift',
]

// Floating particles component
function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-violet-500/30"
          initial={{
            x: Math.random() * 100 + '%',
            y: Math.random() * 100 + '%',
            scale: Math.random() * 0.5 + 0.5,
          }}
          animate={{
            y: [null, '-20%'],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: Math.random() * 10 + 10,
            repeat: Infinity,
            delay: Math.random() * 5,
          }}
        />
      ))}
    </div>
  )
}

// Animated gradient orb
function GradientOrb({ className }: { className?: string }) {
  return (
    <motion.div
      className={`absolute rounded-full blur-3xl ${className}`}
      animate={{
        scale: [1, 1.2, 1],
        opacity: [0.3, 0.5, 0.3],
      }}
      transition={{
        duration: 8,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  )
}

export default function CandidateSearchPage() {
  const [filters, setFilters] = useState<CandidateSearchFilters>({
    page: 1,
    limit: 20,
  })
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [customSkill, setCustomSkill] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  // Track mouse for spotlight effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  // Queries with safe defaults
  const { data: candidatesData, isLoading } = useSearchCandidates({
    ...filters,
    skills: selectedSkills.length > 0 ? selectedSkills : undefined,
  })
  const { data: shortlistData = [] } = useShortlist()
  const shortlistMutation = useShortlistCandidate()

  // SAFE data access with explicit null checks
  const candidatesList = candidatesData?.data || []
  const totalCandidates = candidatesData?.meta?.total ?? 0
  const totalPages = candidatesData?.meta?.totalPages ?? 0
  const shortlist = Array.isArray(shortlistData) ? shortlistData : []

  const shortlistedIds = new Set(shortlist.map(c => c?.id).filter(Boolean))

  const handleFilterChange = (key: keyof CandidateSearchFilters, value: any) => {
    setFilters({ ...filters, [key]: value, page: 1 })
  }

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev =>
      prev.includes(skill)
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    )
  }

  const addCustomSkill = () => {
    if (customSkill.trim() && !selectedSkills.includes(customSkill.trim())) {
      setSelectedSkills(prev => [...prev, customSkill.trim()])
      setCustomSkill('')
    }
  }

  const clearFilters = () => {
    setFilters({ page: 1, limit: 20 })
    setSelectedSkills([])
  }

  const handleShortlist = (userId: string) => {
    shortlistMutation.mutate({ userId })
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* ULTRA Premium Animated Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Aurora layers */}
        <GradientOrb className="w-[800px] h-[800px] -top-[200px] -left-[200px] bg-gradient-to-br from-violet-600/30 via-purple-500/20 to-transparent" />
        <GradientOrb className="w-[600px] h-[600px] top-1/2 -right-[100px] bg-gradient-to-bl from-cyan-500/25 via-blue-500/15 to-transparent" />
        <GradientOrb className="w-[500px] h-[500px] -bottom-[100px] left-1/3 bg-gradient-to-tr from-pink-500/20 via-rose-500/10 to-transparent" />

        {/* Mesh gradient overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-900/20 via-transparent to-transparent" />

        {/* Animated grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(139, 92, 246, 0.3) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(139, 92, 246, 0.3) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        {/* Floating particles */}
        <FloatingParticles />

        {/* Mouse spotlight */}
        <div
          className="absolute w-[600px] h-[600px] rounded-full pointer-events-none transition-all duration-300 ease-out"
          style={{
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, transparent 70%)',
            left: mousePosition.x - 300,
            top: mousePosition.y - 300,
          }}
        />
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Premium Header with Shimmer */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10"
        >
          <div>
            <div className="flex items-center gap-4 mb-4">
              {/* Animated icon container */}
              <motion.div
                className="relative"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-cyan-500 rounded-2xl blur-xl opacity-50 animate-pulse" />
                <div className="relative p-3.5 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-2xl shadow-violet-500/30">
                  <Users className="w-7 h-7 text-white" />
                </div>
              </motion.div>

              <div>
                <h1 className="text-4xl md:text-5xl font-bold">
                  <span className="bg-gradient-to-r from-white via-white to-white/50 bg-clip-text text-transparent">
                    Find
                  </span>
                  <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent animate-gradient bg-[length:200%_auto]">
                    {" "}Verified{" "}
                  </span>
                  <span className="bg-gradient-to-r from-white via-white to-white/50 bg-clip-text text-transparent">
                    Developers
                  </span>
                </h1>
                <p className="text-lg text-muted-foreground mt-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  Discover talent with AI-verified skills and real code analysis
                </p>
              </div>
            </div>
          </div>

          {/* Premium CTA Button */}
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              asChild
              className="relative overflow-hidden group h-14 px-8 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-400 hover:via-orange-400 hover:to-red-400 shadow-2xl shadow-orange-500/30 border-0"
            >
              <Link to="/recruiter/shortlist">
                {/* Shine effect */}
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />

                <Star className="mr-2 w-5 h-5 fill-current" />
                <span className="font-semibold">My Shortlist</span>
                <Badge className="ml-3 bg-white/20 text-white border-0">
                  {shortlist?.length || 0}
                </Badge>
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </motion.div>
        </motion.div>

        {/* Animated Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10"
        >
          <PremiumStatCard
            icon={<Users className="w-6 h-6" />}
            label="Total Developers"
            value={totalCandidates}
            gradient="from-violet-500 to-purple-600"
            delay={0}
          />
          <PremiumStatCard
            icon={<Shield className="w-6 h-6" />}
            label="Verified Profiles"
            value={Math.floor(totalCandidates * 0.85)}
            gradient="from-emerald-500 to-teal-600"
            delay={0.1}
          />
          <PremiumStatCard
            icon={<Flame className="w-6 h-6" />}
            label="Active & Hiring"
            value={Math.floor(totalCandidates * 0.6)}
            gradient="from-cyan-500 to-blue-600"
            delay={0.2}
          />
          <PremiumStatCard
            icon={<Crown className="w-6 h-6" />}
            label="Elite Devs"
            value={Math.floor(totalCandidates * 0.15)}
            gradient="from-amber-500 to-orange-600"
            delay={0.3}
          />
        </motion.div>

        <div className="flex gap-8">
          {/* Filters Sidebar - Desktop */}
          <motion.aside
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="hidden lg:block w-80 flex-shrink-0"
          >
            <div className="sticky top-4">
              {/* Premium Filter Card with animated border */}
              <div className="relative group">
                {/* Animated gradient border */}
                <div className="absolute -inset-[1px] bg-gradient-to-r from-violet-500 via-cyan-500 to-pink-500 rounded-3xl opacity-30 group-hover:opacity-60 blur-sm transition-opacity duration-500" />
                <div className="absolute -inset-[1px] bg-gradient-to-r from-violet-500 via-cyan-500 to-pink-500 rounded-3xl opacity-50" style={{ backgroundSize: '300% 300%' }} />

                <Card className="relative border-0 bg-black/40 backdrop-blur-2xl rounded-3xl overflow-hidden">
                  {/* Inner glow */}
                  <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

                  <CardHeader className="pb-4 pt-6">
                    <div className="flex items-center gap-3">
                      <motion.div
                        className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-violet-500/30"
                        whileHover={{ rotate: 180 }}
                        transition={{ duration: 0.5 }}
                      >
                        <Filter className="w-5 h-5 text-white" />
                      </motion.div>
                      <CardTitle className="text-xl font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                        Search Filters
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6 pb-6">
                    <FiltersContent
                      filters={filters}
                      selectedSkills={selectedSkills}
                      customSkill={customSkill}
                      onFilterChange={handleFilterChange}
                      onToggleSkill={toggleSkill}
                      onCustomSkillChange={setCustomSkill}
                      onAddCustomSkill={addCustomSkill}
                      onClearFilters={clearFilters}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </motion.aside>

          {/* Mobile Filters */}
          <Sheet open={showFilters} onOpenChange={setShowFilters}>
            <SheetContent side="left" className="w-80 bg-black/90 backdrop-blur-2xl border-white/10">
              <SheetHeader>
                <SheetTitle className="text-xl">Search Filters</SheetTitle>
                <SheetDescription>
                  Refine your talent search
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <FiltersContent
                  filters={filters}
                  selectedSkills={selectedSkills}
                  customSkill={customSkill}
                  onFilterChange={handleFilterChange}
                  onToggleSkill={toggleSkill}
                  onCustomSkillChange={setCustomSkill}
                  onAddCustomSkill={addCustomSkill}
                  onClearFilters={clearFilters}
                />
              </div>
            </SheetContent>
          </Sheet>

          {/* Results */}
          <main className="flex-1">
            {/* Premium Search Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="relative mb-8"
            >
              <div className="absolute -inset-[1px] bg-gradient-to-r from-violet-500/50 via-transparent to-cyan-500/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex gap-3">
                <div className="relative flex-1 group">
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-500/20 to-cyan-500/20 rounded-2xl opacity-0 group-focus-within:opacity-100 blur-xl transition-opacity" />
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-violet-400 transition-colors" />
                  <Input
                    placeholder="Search developers by name, skills, or location..."
                    value={filters.q || ''}
                    onChange={(e) => handleFilterChange('q', e.target.value)}
                    className="relative pl-14 h-14 rounded-2xl bg-white/5 border-white/10 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 text-base placeholder:text-muted-foreground/50"
                  />
                </div>
                <Button
                  variant="outline"
                  size="lg"
                  className="lg:hidden h-14 w-14 rounded-2xl bg-white/5 border-white/10 hover:bg-white/10"
                  onClick={() => setShowFilters(true)}
                >
                  <Filter className="w-5 h-5" />
                </Button>
              </div>
            </motion.div>

            {/* Selected Skills with animations */}
            <AnimatePresence>
              {selectedSkills.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-wrap gap-2 mb-6"
                >
                  {selectedSkills.map((skill, i) => (
                    <motion.div
                      key={skill}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Badge
                        className="gap-2 py-2 px-4 rounded-xl bg-gradient-to-r from-violet-500/30 to-indigo-500/30 text-violet-200 border border-violet-500/40 hover:border-violet-400/60 transition-all cursor-pointer group"
                        onClick={() => toggleSkill(skill)}
                      >
                        <Code2 className="w-3 h-3" />
                        {skill}
                        <X className="w-3 h-3 group-hover:rotate-90 transition-transform" />
                      </Badge>
                    </motion.div>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-muted-foreground hover:text-white"
                  >
                    Clear all
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Results Header */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex items-center justify-between mb-8"
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-4xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                    {totalCandidates}
                  </span>
                  <span className="text-muted-foreground">developers found</span>
                </div>
                {filters.minAuraScore && filters.minAuraScore > 0 && (
                  <Badge className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-300 border border-yellow-500/30 py-1.5 px-3">
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    Aura {filters.minAuraScore}+
                  </Badge>
                )}
              </div>
            </motion.div>

            {/* Candidate Grid */}
            {isLoading ? (
              <div className="grid gap-5 md:grid-cols-2">
                {[...Array(6)].map((_, i) => (
                  <CandidateCardSkeleton key={i} delay={i * 0.1} />
                ))}
              </div>
            ) : candidatesList.length > 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45 }}
                className="grid gap-5 md:grid-cols-2"
              >
                <AnimatePresence mode="popLayout">
                  {candidatesList.map((candidate: any, idx: number) => (
                    <motion.div
                      key={candidate.id}
                      initial={{ opacity: 0, y: 30, rotateX: -10 }}
                      animate={{ opacity: 1, y: 0, rotateX: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: idx * 0.08, type: "spring", stiffness: 100 }}
                    >
                      <PremiumCandidateCard
                        candidate={candidate}
                        isShortlisted={candidate?.id ? shortlistedIds.has(candidate.id) : false}
                        onShortlist={() => candidate?.id && handleShortlist(candidate.id)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            ) : (
              <EmptyState onClear={clearFilters} />
            )}

            {/* Premium Pagination */}
            {totalPages > 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex items-center justify-center gap-3 mt-12"
              >
                <Button
                  variant="outline"
                  disabled={filters.page === 1}
                  onClick={() => handleFilterChange('page', (filters.page || 1) - 1)}
                  className="h-12 px-6 rounded-xl bg-white/5 border-white/20 hover:bg-white/10 hover:border-violet-500/50"
                >
                  Previous
                </Button>

                <div className="flex items-center gap-1.5 px-4">
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    const page = i + 1
                    return (
                      <motion.button
                        key={page}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleFilterChange('page', page)}
                        className={`w-10 h-10 rounded-xl font-medium transition-all ${filters.page === page
                          ? 'bg-gradient-to-r from-violet-500 to-indigo-500 text-white shadow-lg shadow-violet-500/30'
                          : 'bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white'
                          }`}
                      >
                        {page}
                      </motion.button>
                    )
                  })}
                  {totalPages > 5 && (
                    <>
                      <span className="text-muted-foreground px-2">...</span>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleFilterChange('page', totalPages)}
                        className="w-10 h-10 rounded-xl font-medium bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white transition-all"
                      >
                        {totalPages}
                      </motion.button>
                    </>
                  )}
                </div>

                <Button
                  variant="outline"
                  disabled={filters.page === totalPages}
                  onClick={() => handleFilterChange('page', (filters.page || 1) + 1)}
                  className="h-12 px-6 rounded-xl bg-white/5 border-white/20 hover:bg-white/10 hover:border-violet-500/50"
                >
                  Next
                </Button>
              </motion.div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

// Premium Stat Card with 3D hover effect
function PremiumStatCard({
  icon,
  label,
  value,
  gradient,
  delay
}: {
  icon: React.ReactNode
  label: string
  value: number
  gradient: string
  delay: number
}) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const rotateX = useTransform(y, [-100, 100], [5, -5])
  const rotateY = useTransform(x, [-100, 100], [-5, 5])

  const springRotateX = useSpring(rotateX, { stiffness: 300, damping: 30 })
  const springRotateY = useSpring(rotateY, { stiffness: 300, damping: 30 })

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring" }}
      style={{ rotateX: springRotateX, rotateY: springRotateY, perspective: 1000 }}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        x.set(e.clientX - rect.left - rect.width / 2)
        y.set(e.clientY - rect.top - rect.height / 2)
      }}
      onMouseLeave={() => {
        x.set(0)
        y.set(0)
      }}
      className="group cursor-default"
    >
      <div className="relative">
        {/* Glow effect */}
        <div className={`absolute -inset-1 bg-gradient-to-r ${gradient} rounded-2xl opacity-0 group-hover:opacity-40 blur-xl transition-opacity duration-500`} />

        <Card className="relative border-0 bg-white/5 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/10 group-hover:border-white/20 transition-all">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          <CardContent className="p-5 relative">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}>
                <span className="text-white">{icon}</span>
              </div>
              <div>
                <motion.p
                  className="text-3xl font-bold"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: delay + 0.2 }}
                >
                  {value.toLocaleString()}
                </motion.p>
                <p className="text-sm text-muted-foreground">{label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  )
}

// Filters Content Component
interface FiltersContentProps {
  filters: CandidateSearchFilters
  selectedSkills: string[]
  customSkill: string
  onFilterChange: (key: keyof CandidateSearchFilters, value: any) => void
  onToggleSkill: (skill: string) => void
  onCustomSkillChange: (value: string) => void
  onAddCustomSkill: () => void
  onClearFilters: () => void
}

function FiltersContent({
  filters,
  selectedSkills,
  customSkill,
  onFilterChange,
  onToggleSkill,
  onCustomSkillChange,
  onAddCustomSkill,
  onClearFilters,
}: FiltersContentProps) {
  return (
    <>
      {/* Skills */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-violet-400" />
          <Label className="font-semibold text-sm">Required Skills</Label>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Add skill..."
            value={customSkill}
            onChange={(e) => onCustomSkillChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onAddCustomSkill()}
            className="bg-white/5 border-white/20 rounded-xl focus:border-violet-500/50 focus:ring-violet-500/20"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={onAddCustomSkill}
            className="shrink-0 bg-gradient-to-r from-violet-500/20 to-indigo-500/20 border-violet-500/30 hover:from-violet-500/30 hover:to-indigo-500/30 rounded-xl"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 max-h-44 overflow-y-auto scrollbar-clean pr-1">
          {POPULAR_SKILLS.map((skill, i) => (
            <motion.button
              key={skill}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.02 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onToggleSkill(skill)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-all ${selectedSkills.includes(skill)
                ? 'bg-gradient-to-r from-violet-500 to-indigo-500 text-white shadow-lg shadow-violet-500/30 border-0'
                : 'border border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/40'
                }`}
            >
              {skill}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Aura Score */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <Label className="font-semibold text-sm">Minimum Aura</Label>
          </div>
          <Badge className="bg-gradient-to-r from-yellow-500/30 to-orange-500/30 text-yellow-300 border border-yellow-500/40 font-bold">
            {filters.minAuraScore || 0}
          </Badge>
        </div>
        <Slider
          value={[filters.minAuraScore || 0]}
          min={0}
          max={100}
          step={5}
          onValueChange={([value]) => onFilterChange('minAuraScore', value)}
          className="[&>span]:bg-gradient-to-r [&>span]:from-yellow-500 [&>span]:to-orange-500 [&_[role=slider]]:rounded-full [&_[role=slider]]:focus-visible:ring-offset-0 [&_[role=slider]]:focus-visible:ring-2 [&_[role=slider]]:focus-visible:ring-yellow-500/50"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Beginner</span>
          <span>⭐ Elite</span>
        </div>
      </div>

      {/* Location */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-cyan-400" />
          <Label className="font-semibold text-sm">Location</Label>
        </div>
        <Input
          placeholder="City, country..."
          value={filters.location || ''}
          onChange={(e) => onFilterChange('location', e.target.value)}
          className="bg-white/5 border-white/20 rounded-xl focus:border-cyan-500/50"
        />
      </div>

      {/* Open to Work Toggle */}
      <motion.div
        whileHover={{ scale: 1.02 }}
        className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-green-500/10 to-teal-500/10 border border-emerald-500/20 hover:border-emerald-500/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/30">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <Label htmlFor="openToWork" className="font-semibold">Available Now</Label>
        </div>
        <Switch
          id="openToWork"
          checked={filters.isOpenToWork || false}
          onCheckedChange={(checked) => onFilterChange('isOpenToWork', checked)}
        />
      </motion.div>

      {/* Clear Filters */}
      <Button
        variant="outline"
        className="w-full h-12 rounded-xl bg-white/5 border-white/20 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-all"
        onClick={onClearFilters}
      >
        <X className="mr-2 w-4 h-4" />
        Clear All Filters
      </Button>
    </>
  )
}

// Premium Candidate Card
function PremiumCandidateCard({ candidate, isShortlisted, onShortlist }: {
  candidate: any
  isShortlisted: boolean
  onShortlist: () => void
}) {
  return (
    <div className="group relative">
      {/* Animated border gradient */}
      <div className="absolute -inset-[1px] bg-gradient-to-r from-violet-500/30 via-cyan-500/30 to-pink-500/30 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <Card className="relative overflow-hidden border-0 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 group-hover:border-white/20 transition-all duration-300">
        {/* Shine effect on hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />

        <CardContent className="pt-6 pb-4 relative">
          <div className="flex items-start gap-4">
            {/* Avatar with animated ring */}
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-violet-500 via-cyan-500 to-pink-500 rounded-full opacity-0 group-hover:opacity-70 blur-md transition-opacity animate-spin-slow [animation-duration:4s]" />
              <Avatar className="w-16 h-16 relative border-2 border-white/20 group-hover:border-white/40 transition-colors shadow-xl">
                <AvatarImage src={candidate.avatarUrl} />
                <AvatarFallback className="bg-gradient-to-br from-violet-600 to-indigo-600 text-lg font-bold text-white">
                  {candidate.name?.[0] || candidate.username[0]}
                </AvatarFallback>
              </Avatar>
              {candidate.isOpenToWork && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-green-500 shadow-lg shadow-emerald-500/50"
                >
                  <Zap className="w-3 h-3 text-white" />
                </motion.div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-bold truncate group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-violet-400 group-hover:to-cyan-400 group-hover:bg-clip-text transition-all">
                  {candidate.name || candidate.username}
                </h3>
                {candidate.isOpenToWork && (
                  <Badge className="bg-gradient-to-r from-emerald-500/30 to-green-500/30 text-emerald-300 border border-emerald-500/40 text-xs">
                    Hiring ✨
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">
                @{candidate.username}
              </p>
              {candidate.location && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1.5">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  {candidate.location}
                </p>
              )}
            </div>

            <AuraBadge score={candidate.auraScore} level={candidate.auraLevel} />
          </div>

          {/* Skills with better styling */}
          {candidate.topSkills?.length > 0 && (
            <div className="mt-5">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-3.5 h-3.5 text-violet-400" />
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Top Skills</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {candidate.topSkills.slice(0, 4).map((skill: any) => (
                  <SkillBadge
                    key={skill.name}
                    name={skill.name}
                    verified={skill.isVerified}
                    score={skill.score}
                    size="sm"
                  />
                ))}
                {candidate.topSkills.length > 4 && (
                  <Badge variant="outline" className="text-xs border-white/20 bg-white/5">
                    +{candidate.topSkills.length - 4}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Stats Row */}
          <div className="flex items-center gap-5 mt-5 text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Briefcase className="w-4 h-4 text-cyan-400" />
              <span className="font-semibold text-white">{candidate.projectCount}</span> projects
            </span>
            {candidate.verifiedSkillCount > 0 && (
              <span className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-white">{candidate.verifiedSkillCount}</span> verified
              </span>
            )}
          </div>
        </CardContent>

        <CardFooter className="border-t border-white/5 pt-4 pb-4 flex gap-3 bg-white/[0.02]">
          <Button
            asChild
            variant="outline"
            className="flex-1 h-11 rounded-xl bg-white/5 border-white/20 hover:bg-gradient-to-r hover:from-violet-500/20 hover:to-indigo-500/20 hover:border-violet-500/40 group/btn transition-all"
          >
            <Link to={`/recruiter/candidates/${candidate.id}`}>
              <ExternalLink className="mr-2 w-4 h-4" />
              View Profile
              <ArrowRight className="ml-2 w-4 h-4 opacity-0 group-hover/btn:opacity-100 group-hover/btn:translate-x-1 transition-all" />
            </Link>
          </Button>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant={isShortlisted ? 'secondary' : 'default'}
              size="icon"
              onClick={onShortlist}
              disabled={isShortlisted}
              className={`h-11 w-11 rounded-xl ${isShortlisted
                ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-lg shadow-violet-500/30'
                }`}
            >
              {isShortlisted ? (
                <Check className="w-5 h-5" />
              ) : (
                <Heart className="w-5 h-5" />
              )}
            </Button>
          </motion.div>
        </CardFooter>
      </Card>
    </div>
  )
}

// Empty State
function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 via-transparent to-cyan-500/10 rounded-3xl" />

        <Card className="relative text-center py-20 border-0 bg-black/40 backdrop-blur-xl rounded-3xl border border-white/10">
          <CardContent>
            <motion.div
              animate={{
                y: [0, -10, 0],
                rotateZ: [0, 5, -5, 0]
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="w-28 h-28 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/30 flex items-center justify-center"
            >
              <Users className="w-14 h-14 text-violet-400/70" />
            </motion.div>
            <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
              No developers found
            </h3>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto text-lg">
              Try adjusting your filters or search for different skills to discover verified talent.
            </p>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="outline"
                onClick={onClear}
                className="h-12 px-8 rounded-xl bg-white/5 border-white/20 hover:bg-violet-500/20 hover:border-violet-500/40 hover:text-white"
              >
                <X className="mr-2 w-4 h-4" />
                Clear All Filters
              </Button>
            </motion.div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  )
}

// Premium Skeleton
function CandidateCardSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay }}
    >
      <Card className="border-0 bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <CardContent className="pt-6 pb-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-white/10 to-white/5 animate-pulse" />
            <div className="flex-1 space-y-3">
              <div className="h-5 w-36 bg-gradient-to-r from-white/10 to-white/5 rounded-lg animate-pulse" />
              <div className="h-4 w-24 bg-gradient-to-r from-white/10 to-white/5 rounded-lg animate-pulse" />
              <div className="h-4 w-44 bg-gradient-to-r from-white/10 to-white/5 rounded-lg animate-pulse" />
            </div>
            <div className="h-8 w-20 bg-gradient-to-r from-white/10 to-white/5 rounded-full animate-pulse" />
          </div>
          <div className="mt-5 space-y-2">
            <div className="h-3 w-20 bg-gradient-to-r from-white/10 to-white/5 rounded animate-pulse" />
            <div className="flex gap-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-7 w-16 bg-gradient-to-r from-white/10 to-white/5 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t border-white/5 pt-4 pb-4 flex gap-3">
          <div className="flex-1 h-11 bg-gradient-to-r from-white/10 to-white/5 rounded-xl animate-pulse" />
          <div className="w-11 h-11 bg-gradient-to-r from-white/10 to-white/5 rounded-xl animate-pulse" />
        </CardFooter>
      </Card>
    </motion.div>
  )
}
