/**
 * Recruiter Candidate Search Page
 * Advanced filtering for finding verified developers
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
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
  BookmarkPlus,
  Check,
} from 'lucide-react'

const POPULAR_SKILLS = [
  'React', 'TypeScript', 'Node.js', 'Python', 'Go', 'Java',
  'PostgreSQL', 'MongoDB', 'Docker', 'Kubernetes', 'AWS', 'GraphQL',
  'Next.js', 'Vue.js', 'Rust', 'Ruby', 'C++', 'Swift',
]

export default function CandidateSearchPage() {
  const [filters, setFilters] = useState<CandidateSearchFilters>({
    page: 1,
    limit: 20,
  })
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [customSkill, setCustomSkill] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Queries
  const { data: candidates, isLoading } = useSearchCandidates({
    ...filters,
    skills: selectedSkills.length > 0 ? selectedSkills : undefined,
  })
  const { data: shortlist } = useShortlist()
  const shortlistMutation = useShortlistCandidate()

  const shortlistedIds = new Set(shortlist?.map(c => c.id) || [])

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
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Find Verified Developers</h1>
          <p className="text-muted-foreground">
            Search candidates with real, analyzed skills and aura scores
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/recruiter/shortlist">
            <Star className="mr-2 w-4 h-4" />
            Shortlist ({shortlist?.length || 0})
          </Link>
        </Button>
      </div>

      <div className="flex gap-6">
        {/* Filters Sidebar - Desktop */}
        <aside className="hidden lg:block w-80 flex-shrink-0">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
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
        </aside>

        {/* Mobile Filters */}
        <Sheet open={showFilters} onOpenChange={setShowFilters}>
          <SheetContent side="left" className="w-80">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
              <SheetDescription>
                Narrow down your candidate search
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
          {/* Search Bar */}
          <div className="flex gap-2 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, location, or keyword..."
                value={filters.q || ''}
                onChange={(e) => handleFilterChange('q', e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              className="lg:hidden"
              onClick={() => setShowFilters(true)}
            >
              <Filter className="w-4 h-4" />
            </Button>
          </div>

          {/* Selected Skills */}
          {selectedSkills.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {selectedSkills.map(skill => (
                <Badge key={skill} variant="secondary" className="gap-1">
                  {skill}
                  <button onClick={() => toggleSkill(skill)}>
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear all
              </Button>
            </div>
          )}

          {/* Results Count */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {candidates?.meta.total || 0} developers found
            </p>
          </div>

          {/* Candidate Grid */}
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[...Array(6)].map((_, i) => (
                <CandidateCardSkeleton key={i} />
              ))}
            </div>
          ) : candidates?.data && candidates.data.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid gap-4 md:grid-cols-2"
            >
              {candidates.data.map((candidate) => (
                <CandidateCard
                  key={candidate.id}
                  candidate={candidate}
                  isShortlisted={shortlistedIds.has(candidate.id)}
                  onShortlist={() => handleShortlist(candidate.id)}
                />
              ))}
            </motion.div>
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-semibold mb-2">No candidates found</h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your filters or search query
                </p>
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Pagination */}
          {candidates && candidates.meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button
                variant="outline"
                disabled={filters.page === 1}
                onClick={() => handleFilterChange('page', (filters.page || 1) - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {filters.page} of {candidates.meta.totalPages}
              </span>
              <Button
                variant="outline"
                disabled={filters.page === candidates.meta.totalPages}
                onClick={() => handleFilterChange('page', (filters.page || 1) + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
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
      <div className="space-y-3">
        <Label>Skills</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Add skill..."
            value={customSkill}
            onChange={(e) => onCustomSkillChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onAddCustomSkill()}
          />
          <Button variant="outline" size="icon" onClick={onAddCustomSkill}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {POPULAR_SKILLS.map(skill => (
            <Badge
              key={skill}
              variant={selectedSkills.includes(skill) ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => onToggleSkill(skill)}
            >
              {skill}
            </Badge>
          ))}
        </div>
      </div>

      {/* Aura Score */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Minimum Aura Score</Label>
          <span className="text-sm font-medium">{filters.minAuraScore || 0}</span>
        </div>
        <Slider
          value={[filters.minAuraScore || 0]}
          min={0}
          max={100}
          step={10}
          onValueChange={([value]) => onFilterChange('minAuraScore', value)}
        />
      </div>

      {/* Location */}
      <div className="space-y-2">
        <Label>Location</Label>
        <Input
          placeholder="City, country..."
          value={filters.location || ''}
          onChange={(e) => onFilterChange('location', e.target.value)}
        />
      </div>

      {/* Open to Work */}
      <div className="flex items-center justify-between">
        <Label htmlFor="openToWork">Open to work only</Label>
        <Switch
          id="openToWork"
          checked={filters.isOpenToWork || false}
          onCheckedChange={(checked) => onFilterChange('isOpenToWork', checked)}
        />
      </div>

      {/* Clear Filters */}
      <Button variant="outline" className="w-full" onClick={onClearFilters}>
        Clear All Filters
      </Button>
    </>
  )
}

// Candidate Card Component
interface CandidateCardProps {
  candidate: any
  isShortlisted: boolean
  onShortlist: () => void
}

function CandidateCard({ candidate, isShortlisted, onShortlist }: CandidateCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="hover:shadow-lg transition-shadow">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Avatar className="w-14 h-14">
              <AvatarImage src={candidate.avatarUrl} />
              <AvatarFallback>{candidate.name?.[0] || candidate.username[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold truncate">
                  {candidate.name || candidate.username}
                </h3>
                {candidate.isOpenToWork && (
                  <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                    Open to work
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">
                @{candidate.username}
              </p>
              {candidate.location && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3" />
                  {candidate.location}
                </p>
              )}
            </div>
            <AuraBadge score={candidate.auraScore} level={candidate.auraLevel} />
          </div>

          {/* Top Skills */}
          {candidate.topSkills?.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-2">Top Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {candidate.topSkills.slice(0, 5).map((skill: any) => (
                  <SkillBadge
                    key={skill.name}
                    name={skill.name}
                    verified={skill.isVerified}
                    score={skill.score}
                    size="sm"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Briefcase className="w-3.5 h-3.5" />
              {candidate.projectCount} projects
            </span>
          </div>
        </CardContent>
        <CardFooter className="border-t pt-4 flex gap-2">
          <Button asChild variant="outline" className="flex-1">
            <Link to={`/recruiter/candidates/${candidate.id}`}>
              <ExternalLink className="mr-2 w-4 h-4" />
              View Profile
            </Link>
          </Button>
          <Button
            variant={isShortlisted ? 'secondary' : 'default'}
            size="icon"
            onClick={onShortlist}
            disabled={isShortlisted}
          >
            {isShortlisted ? (
              <Check className="w-4 h-4" />
            ) : (
              <BookmarkPlus className="w-4 h-4" />
            )}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  )
}

// Skeleton
function CandidateCardSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <Skeleton className="w-14 h-14 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <div className="mt-4 flex gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-14 rounded-full" />
        </div>
      </CardContent>
    </Card>
  )
}
