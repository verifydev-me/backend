/**
 * Recruiter Dashboard
 * Premium landing view with candidate discovery
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useRecruiterStore } from '@/store/recruiter-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'
import {
  Search,
  Filter,
  Users,
  Loader2,
  MapPin,
  Sparkles,
  Code,
  X,
  Eye,
  ChevronRight,
  AlertCircle,
  Target,
  Briefcase,
  Shield,
  Zap,
  BookmarkPlus,
} from 'lucide-react'

const POPULAR_SKILLS = [
  'React', 'TypeScript', 'Node.js', 'Python', 'Go', 'Java', 
  'PostgreSQL', 'MongoDB', 'Docker', 'Kubernetes', 'AWS', 'GraphQL'
]

const AURA_LEVELS = [
  { label: 'All Levels', value: 0, color: 'gray' },
  { label: 'Rising+', value: 101, color: 'emerald' },
  { label: 'Skilled+', value: 251, color: 'blue' },
  { label: 'Expert+', value: 401, color: 'violet' },
  { label: 'Legend', value: 501, color: 'yellow' }
]

export default function RecruiterDashboard() {
  const navigate = useNavigate()
  const {
    searchResults,
    searchTotal,
    isSearching,
    error,
    searchCandidates,
    setFilters,
    clearFilters,
  } = useRecruiterStore()
  
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [minAura, setMinAura] = useState(0)
  const [customSkill, setCustomSkill] = useState('')
  const [onlyOpenToWork, setOnlyOpenToWork] = useState(false)

  useEffect(() => {
    // Initial search on load - safely call with error handling
    const loadInitialData = async () => {
      try {
        await searchCandidates({})
      } catch (err) {
        console.log('Initial search failed:', err)
      }
    }
    loadInitialData()
  }, [searchCandidates])

  const handleSearch = () => {
    setFilters({
      skills: selectedSkills.length > 0 ? selectedSkills : undefined,
      minAuraScore: minAura > 0 ? minAura : undefined,
      isOpenToWork: onlyOpenToWork || undefined
    })
    searchCandidates({
      skills: selectedSkills.length > 0 ? selectedSkills : undefined,
      minAuraScore: minAura > 0 ? minAura : undefined,
      isOpenToWork: onlyOpenToWork || undefined
    })
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

  const handleReset = () => {
    setSelectedSkills([])
    setMinAura(0)
    setOnlyOpenToWork(false)
    clearFilters()
    searchCandidates({})
  }

  const getAuraLevelBadge = (score: number) => {
    if (score >= 501) return { label: 'Legend', gradient: 'from-yellow-500 to-orange-500', glow: 'shadow-yellow-500/30' }
    if (score >= 401) return { label: 'Expert', gradient: 'from-violet-500 to-purple-500', glow: 'shadow-violet-500/30' }
    if (score >= 251) return { label: 'Skilled', gradient: 'from-blue-500 to-cyan-500', glow: 'shadow-blue-500/30' }
    if (score >= 101) return { label: 'Rising', gradient: 'from-emerald-500 to-green-500', glow: 'shadow-emerald-500/30' }
    return { label: 'Novice', gradient: 'from-gray-500 to-gray-600', glow: 'shadow-gray-500/20' }
  }

  return (
    <div className="min-h-screen relative">
      {/* Premium Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 right-1/4 w-[700px] h-[700px] bg-gradient-to-bl from-violet-500/10 via-transparent to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-cyan-500/10 via-transparent to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-0 w-[400px] h-[400px] bg-gradient-to-l from-pink-500/10 to-transparent rounded-full blur-2xl" />
      </div>

      <div className="relative z-10 space-y-8 p-6 lg:p-8">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-end justify-between gap-4"
        >
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/30">
                <Target className="w-7 h-7 text-violet-400" />
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
                Find Candidates
              </h1>
            </div>
            <p className="text-lg text-muted-foreground">
              Discover developers with <span className="text-violet-400 font-medium">verified skills</span> and proven track records
            </p>
          </div>
          
          {/* Quick Stats */}
          <div className="flex items-center gap-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-gradient-to-r from-violet-500/10 to-indigo-500/10 border border-violet-500/20"
            >
              <Users className="w-5 h-5 text-violet-400" />
              <div>
                <p className="text-2xl font-bold">{searchTotal}</p>
                <p className="text-xs text-muted-foreground">Total Candidates</p>
              </div>
            </motion.div>
          </div>
        </motion.div>
        
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-1"
          >
            <Card className="sticky top-24 border-0 bg-gradient-to-br from-white/5 via-white/[0.02] to-transparent backdrop-blur-xl border border-white/10 overflow-hidden">
              {/* Decorative top gradient */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-cyan-500 to-pink-500" />
              
              <CardHeader className="flex flex-row items-center justify-between pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20">
                    <Filter className="h-5 w-5 text-indigo-400" />
                  </div>
                  <CardTitle className="text-lg">Filters</CardTitle>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleReset}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4 mr-1" />
                  Reset
                </Button>
              </CardHeader>
              <CardContent className="space-y-6 pb-6">
                {/* Skills Filter */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Code className="w-4 h-4 text-cyan-400" />
                    <label className="text-sm font-medium">Skills</label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {POPULAR_SKILLS.map(skill => (
                      <button
                        key={skill}
                        onClick={() => toggleSkill(skill)}
                        className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                          selectedSkills.includes(skill)
                            ? 'bg-gradient-to-r from-violet-500 to-indigo-500 text-white border-transparent shadow-lg shadow-violet-500/20'
                            : 'border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/30'
                        }`}
                      >
                        {skill}
                      </button>
                    ))}
                  </div>
                  
                  {/* Selected Skills */}
                  <AnimatePresence>
                    {selectedSkills.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex flex-wrap gap-2"
                      >
                        {selectedSkills.map(skill => (
                          <Badge 
                            key={skill} 
                            className="bg-gradient-to-r from-violet-500/20 to-indigo-500/20 text-violet-300 border-violet-500/30 gap-1"
                            onClick={() => toggleSkill(skill)}
                          >
                            {skill}
                            <X className="h-3 w-3 cursor-pointer hover:text-white" />
                          </Badge>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {/* Custom skill input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customSkill}
                      onChange={(e) => setCustomSkill(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addCustomSkill()}
                      placeholder="Add custom skill..."
                      className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-white/10 bg-white/5 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 placeholder:text-muted-foreground"
                    />
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={addCustomSkill}
                      className="px-4 bg-white/5 border-white/10 hover:bg-white/10"
                    >
                      Add
                    </Button>
                  </div>
                </div>

                {/* Aura Level Filter */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                    <label className="text-sm font-medium">Minimum Aura Level</label>
                  </div>
                  <select
                    value={minAura}
                    onChange={(e) => setMinAura(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 text-sm"
                  >
                    {AURA_LEVELS.map(level => (
                      <option key={level.value} value={level.value}>
                        {level.label} {level.value > 0 && `(${level.value}+)`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Open to Work Filter */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/20">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-emerald-400" />
                    <label className="text-sm font-medium">Open to Work</label>
                  </div>
                  <button
                    onClick={() => setOnlyOpenToWork(!onlyOpenToWork)}
                    className={`w-12 h-7 rounded-full transition-all relative ${
                      onlyOpenToWork 
                        ? 'bg-gradient-to-r from-emerald-500 to-green-500 shadow-lg shadow-emerald-500/30' 
                        : 'bg-white/20'
                    }`}
                  >
                    <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-lg transition-transform ${
                      onlyOpenToWork ? 'translate-x-5' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>

                <Button 
                  onClick={handleSearch} 
                  className="w-full h-12 text-base relative overflow-hidden group bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-xl shadow-violet-500/25"
                  disabled={isSearching}
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  {isSearching ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Search className="h-5 w-5 mr-2" />
                      Search Candidates
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Results */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-3"
          >
            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <Shield className="w-6 h-6 text-emerald-400" />
                  Verified Candidates
                </h2>
                <p className="text-muted-foreground mt-1">
                  {isSearching ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Searching for top talent...
                    </span>
                  ) : (
                    <span>{searchTotal} developers match your criteria</span>
                  )}
                </p>
              </div>
              
              {selectedSkills.length > 0 && (
                <div className="hidden md:flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Filtering by:</span>
                  {selectedSkills.slice(0, 3).map(skill => (
                    <Badge key={skill} variant="secondary" className="bg-violet-500/20 text-violet-300 border-violet-500/30">
                      {skill}
                    </Badge>
                  ))}
                  {selectedSkills.length > 3 && (
                    <Badge variant="outline" className="border-white/20">
                      +{selectedSkills.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Error State */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/30 flex items-center gap-3"
                >
                  <div className="p-2 rounded-xl bg-red-500/20">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                  </div>
                  <p className="text-red-300">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Results Grid */}
            {isSearching ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[...Array(6)].map((_, i) => (
                  <CandidateCardSkeleton key={i} />
                ))}
              </div>
            ) : searchResults.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                <AnimatePresence mode="popLayout">
                  {Array.isArray(searchResults) && searchResults.map((candidate: any, index) => {
                    const auraScore = candidate.auraScore || candidate.user?.auraScore || 0;
                    const auraLevel = getAuraLevelBadge(auraScore);
                    const cId = candidate.id || candidate.user?.id;
                    const cName = candidate.name || candidate.username || candidate.user?.name || candidate.user?.username || 'Unknown Developer';
                    const cAvatar = candidate.avatarUrl || candidate.user?.avatarUrl;
                    const cUsername = candidate.username || candidate.user?.username || 'anonymous';
                    
                    return (
                      <motion.div
                        key={cId || `candidate-${index}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: index * 0.05 }}
                        layout
                      >
                        <Card 
                          className="group relative overflow-hidden border-0 bg-gradient-to-br from-white/5 via-white/[0.02] to-transparent backdrop-blur-xl border border-white/10 hover:border-primary/40 transition-all duration-300 cursor-pointer"
                          onClick={() => cId && navigate(`/recruiter/candidate/${cId}`)}
                        >
                          {/* Hover gradient effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-violet-500/0 via-violet-500/5 to-cyan-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                          
                          <CardContent className="p-6 relative">
                            <div className="flex items-start gap-4">
                              {/* Avatar with glow */}
                              <div className="relative">
                                <div className={`absolute -inset-1 bg-gradient-to-r ${auraLevel.gradient} rounded-full opacity-0 group-hover:opacity-50 blur-md transition-opacity`} />
                                <Avatar className="h-14 w-14 relative border-2 border-white/10 group-hover:border-white/30 transition-colors">
                                  <AvatarImage src={cAvatar} />
                                  <AvatarFallback className="text-lg font-semibold bg-gradient-to-br from-violet-500/20 to-indigo-500/20">
                                    {getInitials(cName)}
                                  </AvatarFallback>
                                </Avatar>
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-semibold truncate text-lg group-hover:text-primary transition-colors">
                                    {cName}
                                  </h3>
                                  {(candidate.isOpenToWork || (candidate as any).openToWork) && (
                                    <Badge className="bg-gradient-to-r from-emerald-500/20 to-green-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                                      ✨ Hiring
                                    </Badge>
                                  )}
                                </div>
                                
                                <p className="text-sm text-muted-foreground mb-2">
                                  @{cUsername}
                                </p>
                                
                                {(candidate.location || candidate.user?.location) && (
                                  <p className="text-sm text-muted-foreground flex items-center gap-1.5 mb-3">
                                    <MapPin className="h-3.5 w-3.5 text-blue-400" />
                                    {candidate.location || candidate.user?.location}
                                  </p>
                                )}
                                
                                {/* Top Skills */}
                                {((candidate.verifiedSkills || candidate.topSkills) && (candidate.verifiedSkills || candidate.topSkills).length > 0) && (
                                  <div className="flex flex-wrap gap-1.5 mb-4">
                                    {(candidate.verifiedSkills || candidate.topSkills).slice(0, 4).map((skill: any, i: number) => (
                                      <Badge 
                                        key={i} 
                                        variant="secondary" 
                                        className="text-xs bg-white/10 border-white/20 hover:bg-white/20"
                                      >
                                        {skill.name || skill}
                                      </Badge>
                                    ))}
                                    {(candidate.verifiedSkills || candidate.topSkills).length > 4 && (
                                      <Badge variant="outline" className="text-xs border-white/20">
                                        +{(candidate.verifiedSkills || candidate.topSkills).length - 4}
                                      </Badge>
                                    )}
                                  </div>
                                )}
                                
                                {/* Stats */}
                                <div className="flex items-center gap-4 text-sm">
                                  <div className="flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-yellow-400" />
                                    <span className="font-bold">{auraScore}</span>
                                    <Badge className={`bg-gradient-to-r ${auraLevel.gradient} text-white text-xs border-0 shadow-lg ${auraLevel.glow}`}>
                                      {auraLevel.label}
                                    </Badge>
                                  </div>
                                  
                                  {candidate.topProjects && candidate.topProjects.length > 0 && (
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                      <Briefcase className="h-4 w-4 text-cyan-400" />
                                      <span className="font-medium text-foreground">{candidate.topProjects.length}</span> projects
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex flex-col gap-2">
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  className="opacity-0 group-hover:opacity-100 transition-all bg-white/5 hover:bg-white/10"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    cId && navigate(`/recruiter/candidate/${cId}`)
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  className="opacity-0 group-hover:opacity-100 transition-all bg-violet-500/10 hover:bg-violet-500/20 text-violet-300"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    // Add shortlist logic
                                  }}
                                >
                                  <BookmarkPlus className="h-4 w-4 mr-1" />
                                  Save
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <Card className="text-center py-16 border-0 bg-gradient-to-br from-white/5 via-white/[0.02] to-transparent backdrop-blur-xl border border-white/10">
                  <CardContent>
                    <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-violet-500/10 to-indigo-500/10 border border-violet-500/20 flex items-center justify-center">
                      <Users className="h-12 w-12 text-violet-400/50" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3">No candidates found</h3>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                      Try adjusting your filters or search for different skills to discover more verified developers.
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={handleReset}
                      className="bg-white/5 border-white/20 hover:bg-white/10"
                    >
                      <X className="mr-2 w-4 h-4" />
                      Clear All Filters
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}

// Skeleton Component
function CandidateCardSkeleton() {
  return (
    <Card className="border-0 bg-white/5 border border-white/10 overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-white/10 animate-pulse" />
          <div className="flex-1 space-y-3">
            <div className="h-5 w-32 bg-white/10 rounded animate-pulse" />
            <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
            <div className="h-4 w-40 bg-white/10 rounded animate-pulse" />
            <div className="flex gap-2">
              <div className="h-6 w-16 bg-white/10 rounded-full animate-pulse" />
              <div className="h-6 w-20 bg-white/10 rounded-full animate-pulse" />
              <div className="h-6 w-14 bg-white/10 rounded-full animate-pulse" />
            </div>
            <div className="flex gap-4">
              <div className="h-5 w-20 bg-white/10 rounded animate-pulse" />
              <div className="h-5 w-24 bg-white/10 rounded animate-pulse" />
            </div>
          </div>
          <div className="h-8 w-16 bg-white/10 rounded animate-pulse" />
        </div>
      </CardContent>
    </Card>
  )
}
