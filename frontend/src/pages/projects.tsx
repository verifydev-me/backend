import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
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
  ExternalLink,
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

// Skeleton components
function ProjectCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="pt-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="h-12 w-12 rounded-xl bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-32 bg-muted rounded animate-pulse" />
            <div className="h-4 w-20 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="space-y-2 mb-4">
          <div className="h-4 w-full bg-muted rounded animate-pulse" />
          <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
        </div>
        <div className="flex gap-4 mb-4">
          <div className="h-4 w-12 bg-muted rounded animate-pulse" />
          <div className="h-4 w-12 bg-muted rounded animate-pulse" />
          <div className="h-4 w-16 bg-muted rounded animate-pulse" />
        </div>
        <div className="h-6 w-20 bg-muted rounded animate-pulse" />
      </CardContent>
    </Card>
  )
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
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
  
  const queryClient = useQueryClient()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['projects'],
    queryFn: () => get<{ projects: Project[]; total: number }>('/v1/projects'),
  })

  // Fetch available GitHub repos when modal is open
  const { data: availableReposData, isLoading: isLoadingRepos, error: reposError } = useQuery({
    queryKey: ['available-repos'],
    queryFn: () => get<{ repos: GitHubRepo[] }>('/v1/projects/available'),
    enabled: showAddModal,
    retry: 1,
  })

  // Log error for debugging
  if (reposError) {
    console.error('Failed to fetch repos:', reposError);
  }

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

  // Add selected repos from GitHub list
  const addSelectedReposMutation = useMutation({
    mutationFn: async (repos: GitHubRepo[]) => {
      const results = await Promise.allSettled(
        repos.map(repo => 
          post('/v1/projects', { 
            githubRepoUrl: repo.url, 
            repoName: repo.name,
            // Convert null to undefined to pass Zod validation
            description: repo.description || undefined,
            defaultBranch: repo.defaultBranch
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
      toast({ 
        title: 'Projects added', 
        description: `${selectedRepos.size} project(s) are being analyzed.` 
      })
    },
    onError: (error: Error) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['available-repos'] })
      toast({ 
        variant: 'destructive', 
        title: 'Some projects failed',
        description: error.message
      })
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

  const getStatusBadge = (status: string) => {
    const statusLower = status?.toLowerCase()
    switch (statusLower) {
      case 'completed':
        return (
          <Badge variant="success" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Analyzed
          </Badge>
        )
      case 'processing':
      case 'analyzing':
        return (
          <Badge variant="info" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Analyzing
          </Badge>
        )
      case 'pending':
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        )
      case 'failed':
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Failed
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status || 'Unknown'}</Badge>
    }
  }

  const getAuraLevel = (aura: number) => {
    if (aura >= 50) return { level: 'Legendary', color: 'text-yellow-500' }
    if (aura >= 30) return { level: 'Epic', color: 'text-purple-500' }
    if (aura >= 15) return { level: 'Great', color: 'text-blue-500' }
    if (aura >= 5) return { level: 'Good', color: 'text-green-500' }
    return { level: 'Basic', color: 'text-muted-foreground' }
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
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent" />
            <CardContent className="p-4 relative">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <FolderGit2 className="h-4 w-4" />
                Total Projects
              </div>
              <p className="text-2xl font-bold mt-1">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent" />
            <CardContent className="p-4 relative">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <CheckCircle2 className="h-4 w-4" />
                Analyzed
              </div>
              <p className="text-2xl font-bold mt-1">{stats.analyzed}</p>
              {stats.total > 0 && (
                <Progress 
                  value={(stats.analyzed / stats.total) * 100} 
                  className="h-1 mt-2" 
                />
              )}
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-transparent" />
            <CardContent className="p-4 relative">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Star className="h-4 w-4" />
                Total Stars
              </div>
              <p className="text-2xl font-bold mt-1">{formatNumber(stats.totalStars)}</p>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent" />
            <CardContent className="p-4 relative">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Zap className="h-4 w-4" />
                Aura Earned
              </div>
              <p className="text-2xl font-bold mt-1 text-primary">+{formatNumber(stats.totalAura)}</p>
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
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
              className="bg-card border rounded-xl shadow-2xl p-6 w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
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
              <div className="flex-1 overflow-y-auto border rounded-lg min-h-[300px] max-h-[400px]">
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
                  <div className="divide-y">
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
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
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
                      addSelectedReposMutation.mutate(reposToAdd)
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
            {filteredProjects.map((project) => (
              viewMode === 'grid' ? (
                // Grid View Card
                <motion.div key={project.id} variants={itemVariants}>
                  <Card className={cn(
                    "group relative overflow-hidden transition-all duration-300",
                    "hover:shadow-lg hover:border-primary/30",
                    selectedProjects.has(project.id) && "border-primary bg-primary/5"
                  )}>
                    {/* Selection checkbox */}
                    <div className="absolute top-3 left-3 z-10">
                      <input
                        type="checkbox"
                        checked={selectedProjects.has(project.id)}
                        onChange={() => toggleProjectSelection(project.id)}
                        className="rounded border-muted-foreground/30"
                      />
                    </div>
                    
                    {/* Pin indicator */}
                    {project.isPinned && (
                      <div className="absolute top-3 right-3 z-10">
                        <Pin className="h-4 w-4 text-primary fill-primary" />
                      </div>
                    )}
                    
                    {/* Aura glow effect for high aura projects */}
                    {(project.auraContribution || 0) >= 30 && (
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5" />
                    )}
                    
                    <CardContent className="pt-8 pb-6 relative">
                      <div className="flex items-start gap-3 mb-4">
                        <div className={cn(
                          "h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors",
                          "bg-primary/10 group-hover:bg-primary/20"
                        )}>
                          <FolderGit2 className="h-6 w-6 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <Link
                            to={`/projects/${project.id}`}
                            className="font-semibold text-lg hover:text-primary transition-colors truncate block"
                          >
                            {project.name}
                          </Link>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: getLanguageColor(project.language) }}
                            />
                            {project.language || 'Unknown'}
                          </div>
                        </div>
                      </div>

                      {project.description && (
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                          {project.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                        <span className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500" />
                          {formatNumber(project.stars)}
                        </span>
                        <span className="flex items-center gap-1">
                          <GitFork className="h-4 w-4" />
                          {formatNumber(project.forks)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {formatRelativeTime(project.updatedAt)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        {getStatusBadge(project.analysisStatus)}
                        
                        {project.analysisStatus?.toLowerCase() === 'completed' && (project.auraContribution || 0) > 0 && (
                          <span className={cn(
                            "text-sm font-semibold flex items-center gap-1",
                            getAuraLevel(project.auraContribution || 0).color
                          )}>
                            <Zap className="h-4 w-4" />
                            +{formatNumber(project.auraContribution)} Aura
                          </span>
                        )}
                      </div>

                      {/* Action buttons - visible on hover */}
                      <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-card via-card to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => togglePinMutation.mutate({ id: project.id, isPinned: project.isPinned })}
                          className="gap-1"
                        >
                          <Pin className={cn("h-4 w-4", project.isPinned && "fill-current")} />
                          {project.isPinned ? 'Unpin' : 'Pin'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => analyzeProjectMutation.mutate(project.id)}
                          disabled={project.analysisStatus === 'analyzing'}
                          className="gap-1"
                        >
                          <RefreshCw className="h-4 w-4" />
                          Analyze
                        </Button>
                        <Button variant="ghost" size="sm" asChild className="gap-1">
                          <a href={project.repoUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                            View
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteProjectMutation.mutate(project.id)}
                          className="gap-1 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                // List View Card
                <motion.div key={project.id} variants={itemVariants}>
                  <Card className={cn(
                    "group transition-all duration-300",
                    "hover:shadow-md hover:border-primary/30",
                    selectedProjects.has(project.id) && "border-primary bg-primary/5"
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <input
                          type="checkbox"
                          checked={selectedProjects.has(project.id)}
                          onChange={() => toggleProjectSelection(project.id)}
                          className="rounded border-muted-foreground/30"
                        />
                        
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <FolderGit2 className="h-5 w-5 text-primary" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {project.isPinned && (
                              <Pin className="h-4 w-4 text-primary fill-primary flex-shrink-0" />
                            )}
                            <Link
                              to={`/projects/${project.id}`}
                              className="font-semibold hover:text-primary transition-colors truncate"
                            >
                              {project.name}
                            </Link>
                            <span
                              className="h-2 w-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: getLanguageColor(project.language) }}
                            />
                            <span className="text-sm text-muted-foreground">{project.language}</span>
                          </div>
                          {project.description && (
                            <p className="text-sm text-muted-foreground truncate">
                              {project.description}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-6 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500" />
                            {formatNumber(project.stars)}
                          </span>
                          <span className="flex items-center gap-1">
                            <GitFork className="h-4 w-4" />
                            {formatNumber(project.forks)}
                          </span>
                          {getStatusBadge(project.analysisStatus)}
                          {(project.auraContribution || 0) > 0 && (
                            <span className={cn(
                              "font-semibold flex items-center gap-1",
                              getAuraLevel(project.auraContribution || 0).color
                            )}>
                              <Zap className="h-4 w-4" />
                              +{formatNumber(project.auraContribution)}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => togglePinMutation.mutate({ id: project.id, isPinned: project.isPinned })}
                          >
                            <Pin className={cn("h-4 w-4", project.isPinned && "fill-current")} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => analyzeProjectMutation.mutate(project.id)}
                            disabled={project.analysisStatus === 'analyzing'}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" asChild>
                            <a href={project.repoUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteProjectMutation.mutate(project.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Link to={`/projects/${project.id}`}>
                            <Button variant="ghost" size="icon">
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            ))}
          </motion.div>
        </>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <FolderGit2 className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
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
