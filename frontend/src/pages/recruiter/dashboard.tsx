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
  Building,
  LogOut,
  ChevronRight,
  AlertCircle
} from 'lucide-react'

const POPULAR_SKILLS = [
  'React', 'TypeScript', 'Node.js', 'Python', 'Go', 'Java', 
  'PostgreSQL', 'MongoDB', 'Docker', 'Kubernetes', 'AWS', 'GraphQL'
]

const AURA_LEVELS = [
  { label: 'All Levels', value: 0 },
  { label: 'Rising+', value: 101 },
  { label: 'Skilled+', value: 251 },
  { label: 'Expert+', value: 401 },
  { label: 'Legend', value: 501 }
]

export default function RecruiterDashboard() {
  const navigate = useNavigate()
  const {
    recruiter,
    searchResults,
    searchTotal,
    isSearching,
    error,
    searchCandidates,
    setFilters,
    clearFilters,
    logout
  } = useRecruiterStore()
  
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [minAura, setMinAura] = useState(0)
  const [customSkill, setCustomSkill] = useState('')
  const [onlyOpenToWork, setOnlyOpenToWork] = useState(false)

  useEffect(() => {
    // Initial search on load
    searchCandidates({})
  }, [])

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

  const handleLogout = () => {
    logout()
    navigate('/recruiter/login')
  }

  const getAuraLevelBadge = (score: number) => {
    if (score >= 501) return { label: 'Legend', color: 'bg-yellow-500/20 text-yellow-400' }
    if (score >= 401) return { label: 'Expert', color: 'bg-purple-500/20 text-purple-400' }
    if (score >= 251) return { label: 'Skilled', color: 'bg-blue-500/20 text-blue-400' }
    if (score >= 101) return { label: 'Rising', color: 'bg-green-500/20 text-green-400' }
    return { label: 'Novice', color: 'bg-gray-500/20 text-gray-400' }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Verify Recruiter
            </h1>
            {recruiter && (
              <Badge variant="outline" className="hidden sm:flex items-center gap-1">
                <Building className="h-3 w-3" />
                {(recruiter as any).organization?.name || (recruiter as any).companyName || (recruiter as any).company || 'Independent Recruiter'}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {(recruiter as any)?.name || (recruiter as any)?.username}
            </span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filters
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  Reset
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Skills Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Skills</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {POPULAR_SKILLS.map(skill => (
                      <button
                        key={skill}
                        onClick={() => toggleSkill(skill)}
                        className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                          selectedSkills.includes(skill)
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        {skill}
                      </button>
                    ))}
                  </div>
                  
                  {/* Selected Skills */}
                  {selectedSkills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {selectedSkills.map(skill => (
                        <Badge 
                          key={skill} 
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => toggleSkill(skill)}
                        >
                          {skill}
                          <X className="h-3 w-3 ml-1" />
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  {/* Custom skill input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customSkill}
                      onChange={(e) => setCustomSkill(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addCustomSkill()}
                      placeholder="Add custom skill..."
                      className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <Button size="sm" variant="outline" onClick={addCustomSkill}>
                      Add
                    </Button>
                  </div>
                </div>

                {/* Aura Level Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Minimum Aura Level
                  </label>
                  <select
                    value={minAura}
                    onChange={(e) => setMinAura(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {AURA_LEVELS.map(level => (
                      <option key={level.value} value={level.value}>
                        {level.label} {level.value > 0 && `(${level.value}+)`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Open to Work Filter */}
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Open to Work Only</label>
                  <button
                    onClick={() => setOnlyOpenToWork(!onlyOpenToWork)}
                    className={`w-10 h-6 rounded-full transition-colors ${
                      onlyOpenToWork ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform mx-1 ${
                      onlyOpenToWork ? 'translate-x-4' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                <Button onClick={handleSearch} className="w-full">
                  <Search className="h-4 w-4 mr-2" />
                  Search Candidates
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Results */}
          <div className="lg:col-span-3">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">Candidates</h2>
                <p className="text-muted-foreground">
                  {isSearching ? 'Searching...' : `${searchTotal} developers found`}
                </p>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive flex items-center gap-2"
              >
                <AlertCircle className="h-5 w-5" />
                {error}
              </motion.div>
            )}

            {/* Results Grid */}
            {isSearching ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : searchResults.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                <AnimatePresence>
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
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card 
                          className="hover:border-primary/50 transition-colors cursor-pointer group"
                          onClick={() => cId && navigate(`/recruiter/candidate/${cId}`)}
                        >
                          <CardContent className="p-6">
                            <div className="flex items-start gap-4">
                              <Avatar className="h-14 w-14 border-2 border-border">
                                <AvatarImage src={cAvatar} />
                                <AvatarFallback>
                                  {getInitials(cName)}
                                </AvatarFallback>
                              </Avatar>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-semibold truncate">
                                    {cName}
                                  </h3>
                                  {(candidate.isOpenToWork || (candidate as any).openToWork) && (
                                    <Badge className="bg-green-500/20 text-green-400 text-xs">
                                      Open to Work
                                    </Badge>
                                  )}
                                </div>
                                
                                <p className="text-sm text-muted-foreground mb-2">
                                  @{cUsername}
                                </p>
                                
                                {(candidate.location || candidate.user?.location) && (
                                  <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                                    <MapPin className="h-3 w-3" />
                                    {candidate.location || candidate.user?.location}
                                  </p>
                                )}
                                
                                {/* Top Skills */}
                                {((candidate.verifiedSkills || candidate.topSkills) && (candidate.verifiedSkills || candidate.topSkills).length > 0) && (
                                  <div className="flex flex-wrap gap-1 mb-3">
                                    {(candidate.verifiedSkills || candidate.topSkills).slice(0, 4).map((skill: any, i: number) => (
                                      <Badge 
                                        key={i} 
                                        variant="secondary" 
                                        className="text-xs"
                                      >
                                        {skill.name || skill}
                                      </Badge>
                                    ))}
                                    {(candidate.verifiedSkills || candidate.topSkills).length > 4 && (
                                      <Badge variant="outline" className="text-xs">
                                        +{(candidate.verifiedSkills || candidate.topSkills).length - 4}
                                      </Badge>
                                    )}
                                  </div>
                                )}
                                
                                {/* Stats */}
                                <div className="flex items-center gap-4 text-sm">
                                  <div className="flex items-center gap-1">
                                    <Sparkles className="h-4 w-4 text-yellow-400" />
                                    <span className="font-medium">{auraScore}</span>
                                    <Badge className={`${auraLevel.color} text-xs ml-1`}>
                                      {auraLevel.label}
                                    </Badge>
                                  </div>
                                  
                                  {candidate.topProjects && candidate.topProjects.length > 0 && (
                                    <div className="flex items-center gap-1 text-muted-foreground">
                                      <Code className="h-4 w-4" />
                                      {candidate.topProjects.length} projects
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <Button 
                                size="sm" 
                                variant="ghost"
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            ) : (
              <div className="text-center py-20">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">No candidates found</h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your filters to see more results
                </p>
                <Button variant="outline" onClick={handleReset}>
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
