import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { get, post, del } from '@/api/client'
import { toast } from '@/hooks/use-toast'
import {
  formatNumber,
  formatRelativeTime,
  getLanguageColor,
  cn
} from '@/lib/utils'
import type { Project } from '@/types'
import {
  Plus,
  Search,
  Star,
  GitFork,
  Clock,
  Pin,
  Trash2,
  RefreshCw,
  FolderGit2,
  Loader2,
  LayoutGrid,
  List,
  SortAsc,
  SortDesc,
  Filter,
  Zap,
  Code2,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronRight,
  Sparkles,
  BarChart3,
  Github,
  Check,
  Server,
  Cpu,
  Layers,
  Beaker,
  Package,
} from 'lucide-react'

// GitHub repo type from available endpoint
interface GitHubRepo {
  id: number
  name: string
  fullName: string
  url: string
  description: string | null
  language: string | null
  stars: number
  forks: number
  defaultBranch: string
  isAdded: boolean
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

// View modes
type ViewMode = 'grid' | 'list'
type SortField = 'updatedAt' | 'stars' | 'auraContribution' | 'name'
type SortOrder = 'asc' | 'desc'
type ProjectType = 'backend' | 'frontend' | 'fullstack' | 'ml' | 'library'

// ============================================
// CIRCULAR PROGRESS - Dashboard Component
// ============================================
function CircularProgress({ value, size = 56 }: { value: number, size?: number }) {
  const strokeWidth = 4
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (value / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
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
          stroke="hsl(var(--primary))"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-foreground">{value}</span>
      </div>
    </div>
  )
}

// Skeleton components
function ProjectCardSkeleton() {
  return (
    <Card className="overflow-hidden rounded-xl border border-border/80 bg-card/50">
      <CardContent className="p-5">
        <div className="flex items-start gap-4 mb-4">
          <div className="h-14 w-14 rounded-full bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-32 bg-muted rounded animate-pulse" />
            <div className="h-4 w-48 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="flex gap-4 mb-2">
          <div className="h-6 w-16 bg-muted rounded-full animate-pulse" />
          <div className="h-6 w-16 bg-muted rounded-full animate-pulse" />
        </div>
      </CardContent>
    </Card>
  )
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i} className="rounded-xl border border-border/80 bg-card/50">
          <CardContent className="p-4">
            <div className="h-4 w-20 bg-muted rounded animate-pulse mb-2" />
            <div className="h-8 w-16 bg-muted rounded animate-pulse" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default function Projects() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [repoSearch, setRepoSearch] = useState('')
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [sortField, setSortField] = useState<SortField>('updatedAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [languageFilter, setLanguageFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set())
  const [projectType, setProjectType] = useState<ProjectType>('fullstack')
  
  const queryClient = useQueryClient()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['projects'],
    queryFn: () => get<{ projects: Project[]; total: number }>('/v1/projects'),
  })

  // Fetch available GitHub repos
  const { data: availableReposData, isLoading: isLoadingRepos, error: reposError } = useQuery({
    queryKey: ['available-repos'],
    queryFn: () => get<{ repos: GitHubRepo[] }>('/v1/projects/available'),
    enabled: showAddModal,
    retry: 1,
  })

  // Filter available repos based on search
  const filteredRepos = useMemo(() => {
    const repos = availableReposData?.repos || []
    if (!repoSearch) return repos
    const searchLower = repoSearch.toLowerCase()
    return repos.filter(repo => 
      repo.name.toLowerCase().includes(searchLower) ||
      repo.fullName.toLowerCase().includes(searchLower) ||
      repo.description?.toLowerCase().includes(searchLower) ||
      repo.language?.toLowerCase().includes(searchLower)
    )
  }, [availableReposData?.repos, repoSearch])

  // Compute stats
  const stats = useMemo(() => {
    const projects = data?.projects || []
    return {
      total: projects.length,
      analyzed: projects.filter(p => p.analysisStatus?.toLowerCase() === 'completed').length,
      totalStars: projects.reduce((acc, p) => acc + (p.stars || 0), 0),
      totalAura: projects.reduce((acc, p) => acc + (p.auraContribution || 0), 0),
      languages: [...new Set(projects.map(p => p.language).filter(Boolean))]
    }
  }, [data?.projects])

  // Filtered and sorted projects
  const filteredProjects = useMemo(() => {
    let projects = data?.projects || []
    
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase()
      projects = projects.filter(p => 
        p.name?.toLowerCase().includes(searchLower) ||
        p.language?.toLowerCase().includes(searchLower) ||
        p.description?.toLowerCase().includes(searchLower)
      )
    }
    
    // Language filter
    if (languageFilter !== 'all') {
      projects = projects.filter(p => p.language === languageFilter)
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      projects = projects.filter(p => p.analysisStatus?.toLowerCase() === statusFilter)
    }
    
    // Sort
    projects = [...projects].sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'stars':
          comparison = (a.stars || 0) - (b.stars || 0)
          break
        case 'auraContribution':
          comparison = (a.auraContribution || 0) - (b.auraContribution || 0)
          break
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '')
          break
        case 'updatedAt':
        default:
          comparison = new Date(a.updatedAt || 0).getTime() - new Date(b.updatedAt || 0).getTime()
      }
      return sortOrder === 'desc' ? -comparison : comparison
    })
    
    // Pinned projects first
    return projects.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0))
  }, [data?.projects, search, languageFilter, statusFilter, sortField, sortOrder])

  // Mutations
  const addSelectedReposMutation = useMutation({
    mutationFn: async ({ repos, type }: { repos: GitHubRepo[], type: ProjectType }) => {
      const results = await Promise.allSettled(
        repos.map(repo => 
          post('/v1/projects', { 
            githubRepoUrl: repo.url, 
            repoName: repo.name,
            description: repo.description || undefined,
            defaultBranch: repo.defaultBranch,
            projectType: type,
          })
        )
      )
      const failed = results.filter(r => r.status === 'rejected').length
      if (failed > 0) throw new Error(`${failed} repos failed to add`)
      return results
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['available-repos'] })
      queryClient.invalidateQueries({ queryKey: ['aura'] })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      setSelectedRepos(new Set())
      setRepoSearch('')
      setShowAddModal(false)
      toast({ title: 'Projects added', description: `${selectedRepos.size} project(s) are being analyzed.` })
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Some projects failed', description: error.message })
    },
  })

  const analyzeProjectMutation = useMutation({
    mutationFn: (id: string) => post(`/v1/projects/${id}/analyze`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast({ title: 'Analysis started', description: 'Your project is being re-analyzed.' })
    },
  })

  const batchAnalyzeMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => post(`/v1/projects/${id}/analyze`)))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setSelectedProjects(new Set())
      toast({ title: 'Batch analysis started', description: `${selectedProjects.size} projects are being analyzed.` })
    },
  })

  const togglePinMutation = useMutation({
    mutationFn: ({ id, isPinned }: { id: string; isPinned: boolean }) =>
      post(`/v1/projects/${id}/pin`, { isPinned: !isPinned }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  })

  const deleteProjectMutation = useMutation({
    mutationFn: (id: string) => del(`/v1/projects/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['aura'] })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      queryClient.invalidateQueries({ queryKey: ['available-repos'] })
      toast({ title: 'Project deleted', description: 'The project has been removed.' })
    },
  })

  const batchDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => del(`/v1/projects/${id}`)))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['aura'] })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      queryClient.invalidateQueries({ queryKey: ['available-repos'] })
      setSelectedProjects(new Set())
      toast({ title: 'Projects deleted', description: `${selectedProjects.size} projects have been removed.` })
    },
  })

  const toggleProjectSelection = (id: string) => {
    const newSelection = new Set(selectedProjects)
    if (newSelection.has(id)) {
      newSelection.delete(id)
    } else {
      newSelection.add(id)
    }
    setSelectedProjects(newSelection)
  }

  const selectAll = () => {
    if (selectedProjects.size === filteredProjects.length) {
      setSelectedProjects(new Set())
    } else {
      setSelectedProjects(new Set(filteredProjects.map(p => p.id)))
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FolderGit2 className="h-8 w-8 text-primary" />
            Projects
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage, analyze and showcase your GitHub repositories
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowAddModal(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Project
          </Button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      {isLoading ? (
        <StatsSkeleton />
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <Card className="rounded-xl border border-border/80 bg-card/50 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent" />
            <CardContent className="p-5 relative">
              <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
                <FolderGit2 className="h-4 w-4" />
                Total Projects
              </div>
              <p className="text-3xl font-bold mt-2">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="rounded-xl border border-border/80 bg-card/50 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent" />
            <CardContent className="p-5 relative">
              <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
                <CheckCircle2 className="h-4 w-4" />
                Analyzed
              </div>
              <p className="text-3xl font-bold mt-2">{stats.analyzed}</p>
              {stats.total > 0 && (
                <Progress 
                  value={(stats.analyzed / stats.total) * 100} 
                  className="h-1 mt-3" 
                />
              )}
            </CardContent>
          </Card>
          <Card className="rounded-xl border border-border/80 bg-card/50 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-transparent" />
            <CardContent className="p-5 relative">
              <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
                <Star className="h-4 w-4" />
                Total Stars
              </div>
              <p className="text-3xl font-bold mt-2">{formatNumber(stats.totalStars)}</p>
            </CardContent>
          </Card>
          <Card className="rounded-xl border border-border/80 bg-card/50 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent" />
            <CardContent className="p-5 relative">
              <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
                <Zap className="h-4 w-4" />
                Aura Earned
              </div>
              <p className="text-3xl font-bold mt-2 text-primary">+{formatNumber(stats.totalAura)}</p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Add Project Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setShowAddModal(false)
              setSelectedRepos(new Set())
              setRepoSearch('')
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border/50 rounded-xl shadow-2xl p-6 w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Github className="h-5 w-5 text-primary" />
                  Select Repositories
                </h2>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => {
                    setShowAddModal(false)
                    setSelectedRepos(new Set())
                    setRepoSearch('')
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <p className="text-muted-foreground text-sm mb-4">
                Select repositories from your GitHub account to analyze
              </p>

              {/* Project Type Selection */}
              <div className="mb-4">
                <label className="text-sm font-medium text-foreground mb-2 block">Project Type</label>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { value: 'backend', label: 'Backend', icon: Server },
                    { value: 'frontend', label: 'Frontend', icon: Cpu },
                    { value: 'fullstack', label: 'Fullstack', icon: Layers },
                    { value: 'ml', label: 'ML / AI', icon: Beaker },
                    { value: 'library', label: 'Library', icon: Package },
                  ].map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => setProjectType(value as ProjectType)}
                      className={cn(
                        'flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all',
                        projectType === value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-primary/50 text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-xs font-medium">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Search repos */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search your repositories..."
                  value={repoSearch}
                  onChange={(e) => setRepoSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Repo list */}
              <div className="flex-1 overflow-y-auto border border-border/50 rounded-xl min-h-[300px] max-h-[400px] bg-muted/20">
                {isLoadingRepos ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : reposError ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
                    <AlertCircle className="h-12 w-12 mb-2 text-destructive opacity-70" />
                    <p className="text-sm font-medium text-destructive">Failed to load repositories</p>
                    <p className="text-xs mt-1">Please check your connection and try again</p>
                  </div>
                ) : filteredRepos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
                    <FolderGit2 className="h-12 w-12 mb-2 opacity-50" />
                    <p className="text-sm">
                      {repoSearch ? 'No repositories match your search' : 'No repositories found'}
                    </p>
                    <p className="text-xs mt-1 text-muted-foreground/70">
                      Make sure your GitHub account has public repositories
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {filteredRepos.map((repo) => {
                      const isSelected = selectedRepos.has(repo.url)
                      const isDisabled = repo.isAdded
                      return (
                        <div
                          key={repo.id}
                          onClick={() => {
                            if (isDisabled) return
                            const newSelected = new Set(selectedRepos)
                            if (isSelected) {
                              newSelected.delete(repo.url)
                            } else {
                              newSelected.add(repo.url)
                            }
                            setSelectedRepos(newSelected)
                          }}
                          className={cn(
                            "flex items-center gap-3 p-3 transition-colors cursor-pointer",
                            isDisabled && "opacity-50 cursor-not-allowed bg-muted/30",
                            !isDisabled && isSelected && "bg-primary/10",
                            !isDisabled && !isSelected && "hover:bg-muted/50"
                          )}
                        >
                          {/* Checkbox */}
                          <div className={cn(
                            "h-5 w-5 rounded border-2 flex items-center justify-center transition-colors",
                            isDisabled && "border-muted-foreground/30 bg-muted",
                            !isDisabled && isSelected && "border-primary bg-primary",
                            !isDisabled && !isSelected && "border-muted-foreground/50"
                          )}>
                            {(isSelected || isDisabled) && (
                              <Check className={cn(
                                "h-3 w-3",
                                isDisabled ? "text-muted-foreground/50" : "text-primary-foreground"
                              )} />
                            )}
                          </div>

                          {/* Repo info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">{repo.name}</span>
                              {repo.isAdded && (
                                <Badge variant="secondary" className="text-xs">Already Added</Badge>
                              )}
                            </div>
                            {repo.description && (
                              <p className="text-sm text-muted-foreground truncate mt-0.5">
                                {repo.description}
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              {repo.language && (
                                <span className="flex items-center gap-1">
                                  <span 
                                    className="h-2 w-2 rounded-full" 
                                    style={{ backgroundColor: getLanguageColor(repo.language) }}
                                  />
                                  {repo.language}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Star className="h-3 w-3" />
                                {formatNumber(repo.stars)}
                              </span>
                              <span className="flex items-center gap-1">
                                <GitFork className="h-3 w-3" />
                                {formatNumber(repo.forks)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Selection count and actions */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                <div className="text-sm text-muted-foreground">
                  {selectedRepos.size > 0 ? (
                    <span className="text-primary font-medium">
                      {selectedRepos.size} repository{selectedRepos.size !== 1 ? 'ies' : 'y'} selected
                    </span>
                  ) : (
                    'Select repositories to analyze'
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddModal(false)
                      setSelectedRepos(new Set())
                      setRepoSearch('')
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      const allRepos = availableReposData?.repos || []
                      const reposToAdd = allRepos.filter(r => selectedRepos.has(r.url))
                      addSelectedReposMutation.mutate({ repos: reposToAdd, type: projectType })
                    }}
                    disabled={selectedRepos.size === 0 || addSelectedReposMutation.isPending}
                  >
                    {addSelectedReposMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    Analyze {selectedRepos.size > 0 ? `(${selectedRepos.size})` : ''}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters & Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col lg:flex-row gap-4"
      >
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects by name, language, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <Select value={languageFilter} onValueChange={setLanguageFilter}>
            <SelectTrigger className="w-[140px]">
              <Code2 className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Languages</SelectItem>
              {stats.languages.map(lang => (
                <SelectItem key={lang} value={lang!}>
                  <span className="flex items-center gap-2">
                    <span 
                      className="h-2 w-2 rounded-full" 
                      style={{ backgroundColor: getLanguageColor(lang!) }}
                    />
                    {lang}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Analyzed</SelectItem>
              <SelectItem value="analyzing">Analyzing</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={sortField} onValueChange={(v: string) => setSortField(v as SortField)}>
            <SelectTrigger className="w-[140px]">
              <BarChart3 className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updatedAt">Last Updated</SelectItem>
              <SelectItem value="stars">Stars</SelectItem>
              <SelectItem value="auraContribution">Aura</SelectItem>
              <SelectItem value="name">Name</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
          >
            {sortOrder === 'desc' ? (
              <SortDesc className="h-4 w-4" />
            ) : (
              <SortAsc className="h-4 w-4" />
            )}
          </Button>
          
          <div className="border-l h-8 mx-1" />
          
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>

      {/* Batch Actions */}
      <AnimatePresence>
        {selectedProjects.size > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="border-primary/50 bg-primary/5">
              <CardContent className="py-3 flex items-center justify-between">
                <span className="text-sm font-medium">
                  {selectedProjects.size} project{selectedProjects.size > 1 ? 's' : ''} selected
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedProjects(new Set())}
                  >
                    Clear Selection
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => batchAnalyzeMutation.mutate([...selectedProjects])}
                    disabled={batchAnalyzeMutation.isPending}
                  >
                    {batchAnalyzeMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Analyze All
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => batchDeleteMutation.mutate([...selectedProjects])}
                    disabled={batchDeleteMutation.isPending}
                  >
                    {batchDeleteMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-2" />
                    )}
                    Delete All
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Projects List */}
      {isLoading ? (
        <div className={cn(
          viewMode === 'grid' 
            ? 'grid gap-4 md:grid-cols-2 lg:grid-cols-3'
            : 'space-y-4'
        )}>
          {[...Array(6)].map((_, i) => (
            <ProjectCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredProjects.length > 0 ? (
        <>
          {/* Select All */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <input 
              type="checkbox" 
              checked={selectedProjects.size === filteredProjects.length && filteredProjects.length > 0}
              onChange={selectAll}
              className="rounded border-muted-foreground/30"
            />
            <span>
              Showing {filteredProjects.length} of {data?.projects?.length || 0} projects
            </span>
          </div>
          
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className={cn(
              viewMode === 'grid' 
                ? 'grid gap-4 md:grid-cols-2 lg:grid-cols-3'
                : 'space-y-3'
            )}
          >
            {filteredProjects.map((project) => {
              const score = project.auraContribution || 0
              const isAnalyzed = project.analysisStatus?.toLowerCase() === 'completed'
              const repoName = project.repoName || project.name || 'Untitled'
              const topTechs = (project.technologies || []).slice(0, 3)

              return viewMode === 'grid' ? (
                // GRID VIEW - Premium Dashboard Style
                <motion.div key={project.id} variants={itemVariants}>
                  <div 
                    onClick={() => navigate(`/projects/${project.id}`)}
                    className={cn(
                      "group relative cursor-pointer rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card/90 to-card/80 backdrop-blur-xl p-5 transition-all duration-300",
                      "hover:border-primary/40 hover:shadow-xl hover:shadow-primary/15 hover:scale-[1.01]",
                      selectedProjects.has(project.id) && "border-primary bg-primary/5"
                    )}
                  >
                    {/* Checkbox for selection (absolute) */}
                    <div 
                      className="absolute top-4 right-4 z-20"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selectedProjects.has(project.id)}
                        onChange={() => toggleProjectSelection(project.id)}
                        className="rounded border-muted-foreground/30 accent-primary w-4 h-4 cursor-pointer"
                      />
                    </div>
                    
                    {/* Pin Indicator */}
                    {project.isPinned && (
                      <div className="absolute top-4 right-10 z-10 text-primary">
                        <Pin className="h-4 w-4 fill-current" />
                      </div>
                    )}

                    <div className="flex items-start gap-4">
                      {/* Circular Score with Glow */}
                      <div className="relative shrink-0">
                        <div className={cn(
                          "absolute inset-0 rounded-full blur-lg opacity-30 transition-opacity group-hover:opacity-50",
                          score >= 80 ? "bg-emerald-500" : score >= 50 ? "bg-primary" : "bg-amber-500"
                        )} />
                        <CircularProgress value={score > 100 ? 100 : score} />
                      </div>
                      
                      {/* Project Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-gradient-to-br from-muted/80 to-muted/40 border border-border/50 shrink-0">
                            <Github className="w-3.5 h-3.5 text-foreground" />
                          </div>
                          <h3 className="font-bold text-foreground group-hover:text-primary transition-colors truncate text-base">
                            {repoName}
                          </h3>
                        </div>
                        
                        {project.description && (
                          <p className="text-xs text-muted-foreground/80 truncate mb-3">
                            {project.description}
                          </p>
                        )}
                        
                        {/* Tags */}
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          {project.language && (
                            <span className="flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              <span 
                                className="w-1.5 h-1.5 rounded-full" 
                                style={{ backgroundColor: getLanguageColor(project.language) }}
                              />
                              {project.language}
                            </span>
                          )}
                          {topTechs.map((tech, i) => (
                            <span 
                              key={i}
                              className="text-xs px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground border border-border/30"
                            >
                              {tech}
                            </span>
                          ))}
                        </div>
                        
                        {/* Stats Row */}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 text-amber-500" />
                            <span className="font-medium text-foreground">{formatNumber(project.stars)}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <GitFork className="w-3.5 h-3.5" />
                            <span className="font-medium text-foreground">{formatNumber(project.forks)}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{formatRelativeTime(project.updatedAt)}</span>
                          </span>
                          
                          {/* Aura Badge */}
                          {score > 0 && (
                            <span className="ml-auto flex items-center gap-1 text-primary font-bold">
                              <Zap className="w-3.5 h-3.5" />
                              +{score}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* View Details Hint & Actions - Appear on Hover */}
                    <div className="mt-4 pt-3 border-t border-border/30 flex items-center justify-between opacity-80 group-hover:opacity-100 transition-opacity">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary transition-colors">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>View details</span>
                      </div>
                      
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => togglePinMutation.mutate({ id: project.id, isPinned: project.isPinned })}
                        >
                          <Pin className={cn("h-3.5 w-3.5", project.isPinned && "fill-current text-primary")} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => analyzeProjectMutation.mutate(project.id)}
                          disabled={project.analysisStatus === 'analyzing'}
                        >
                          <RefreshCw className={cn("h-3.5 w-3.5", project.analysisStatus === 'analyzing' && "animate-spin")} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => deleteProjectMutation.mutate(project.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                // LIST VIEW - Simplified
                <motion.div key={project.id} variants={itemVariants}>
                  <Card 
                    className={cn(
                      "group transition-all duration-300 hover:shadow-md hover:border-primary/30",
                      selectedProjects.has(project.id) && "border-primary bg-primary/5"
                    )}
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      <input
                        type="checkbox"
                        checked={selectedProjects.has(project.id)}
                        onChange={() => toggleProjectSelection(project.id)}
                        className="rounded border-muted-foreground/30 accent-primary cursor-pointer"
                      />
                      
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        {isAnalyzed ? (
                          <div className="font-bold text-primary">{score}</div>
                        ) : (
                          <FolderGit2 className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/projects/${project.id}`)}>
                         <div className="flex items-center gap-2">
                            {project.isPinned && <Pin className="h-3.5 w-3.5 text-primary fill-primary" />}
                            <h3 className="font-semibold hover:text-primary transition-colors truncate">
                              {repoName}
                            </h3>
                            <Badge variant="outline" className="text-xs font-normal">
                              {project.language || 'Unknown'}
                            </Badge>
                         </div>
                         <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Star className="h-3 w-3" /> {formatNumber(project.stars)}
                            </span>
                            <span>Updated {formatRelativeTime(project.updatedAt)}</span>
                         </div>
                      </div>
                      
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => togglePinMutation.mutate({ id: project.id, isPinned: project.isPinned })}
                          >
                            <Pin className={cn("h-4 w-4", project.isPinned && "fill-current")} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => deleteProjectMutation.mutate(project.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Link to={`/projects/${project.id}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </Link>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </motion.div>
        </>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="border-dashed border-border/50 bg-card/50">
            <CardContent className="py-16 text-center">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <FolderGit2 className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">
                {search || languageFilter !== 'all' || statusFilter !== 'all'
                  ? 'No matching projects'
                  : 'No projects yet'}
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                {search || languageFilter !== 'all' || statusFilter !== 'all'
                  ? 'Try adjusting your filters or search term'
                  : 'Add your first GitHub repository to get it analyzed and start building your developer profile'}
              </p>
              {!search && languageFilter === 'all' && statusFilter === 'all' && (
                <Button onClick={() => setShowAddModal(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Your First Project
                </Button>
              )}
              {(search || languageFilter !== 'all' || statusFilter !== 'all') && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearch('')
                    setLanguageFilter('all')
                    setStatusFilter('all')
                  }}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
