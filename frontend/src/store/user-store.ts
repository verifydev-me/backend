import { create } from 'zustand'
import type { User, GitHubRepo, Project, VerifiedSkill } from '@/types'
import { apiClient } from '@/api/client'

interface AuraState {
  total: number
  level: string
  trend: 'up' | 'down' | 'stable'
  percentile: number
  breakdown: {
    profile: number
    projects: number
    skills: number
    activity: number
    github: number
  }
  breakdownDetails: Record<string, any[]>
  recentGains: Array<{ source: string; points: number; date: string }>
}

interface UserState {
  profile: User | null
  aura: AuraState | null
  githubRepos: GitHubRepo[]
  projects: Project[]
  skills: VerifiedSkill[]

  isLoadingProfile: boolean
  isLoadingAura: boolean
  isLoadingRepos: boolean
  isLoadingProjects: boolean
  isLoadingSkills: boolean

  error: string | null
  lastAuraUpdate: number | null

  fetchProfile: () => Promise<void>
  fetchAura: () => Promise<void>
  fetchGitHubRepos: () => Promise<void>
  fetchProjects: () => Promise<void>
  fetchSkills: () => Promise<void>
  analyzeProject: (repoUrl: string) => Promise<void>
  syncGitHubProfile: () => Promise<void>
  refreshAllData: () => Promise<void>
  clearError: () => void
}

export const useUserStore = create<UserState>((set, get) => ({
  profile: null,
  aura: null,
  githubRepos: [],
  projects: [],
  skills: [],

  isLoadingProfile: false,
  isLoadingAura: false,
  isLoadingRepos: false,
  isLoadingProjects: false,
  isLoadingSkills: false,

  error: null,
  lastAuraUpdate: null,

  // ================= PROFILE =================
  fetchProfile: async () => {
    set({ isLoadingProfile: true, error: null })
    try {
      const res = await apiClient.get<{ data: { profile: User } }>('/v1/users/me')
      // Backend returns { data: { profile: {...} } }
      set({ profile: res.data.data?.profile ?? null, isLoadingProfile: false })
    } catch (err: any) {
      set({
        error: err?.message || 'Failed to fetch profile',
        isLoadingProfile: false,
      })
    }
  },

  // ================= AURA =================
  fetchAura: async () => {
    set({ isLoadingAura: true, error: null })
    try {
      const res = await apiClient.get<{ data: any }>('/v1/users/me/aura')
      const data = res.data.data

      const aura: AuraState = {
        total: data.total ?? 0,
        level: data.level ?? 'novice',
        trend: data.trend ?? 'stable',
        percentile: data.percentile ?? 0,
        breakdown: {
          profile: data.breakdown?.profile ?? 0,
          projects: data.breakdown?.projects ?? 0,
          skills: data.breakdown?.skills ?? 0,
          activity: data.breakdown?.activity ?? 0,
          github: data.breakdown?.github ?? 0,
        },
        breakdownDetails:
          data.breakdownDetails ??
          generateBreakdownDetails(data.breakdown),
        recentGains: data.recentGains ?? [],
      }

      set({
        aura,
        isLoadingAura: false,
        lastAuraUpdate: Date.now(),
      })
    } catch (err: any) {
      set({
        error: err?.message || 'Failed to fetch aura',
        isLoadingAura: false,
      })
    }
  },

  // ================= GITHUB REPOS =================
  fetchGitHubRepos: async () => {
    set({ isLoadingRepos: true, error: null })
    try {
      const res = await apiClient.get<{ data: { repos: GitHubRepo[] } }>(
        '/v1/users/me/repos'
      )
      // Backend returns { data: { repos: [...] } }
      set({ githubRepos: res.data.data?.repos ?? [], isLoadingRepos: false })
    } catch {
      try {
        await get().syncGitHubProfile()
        const res = await apiClient.get<{ data: { repos: GitHubRepo[] } }>(
          '/v1/users/me/repos'
        )
        set({ githubRepos: res.data.data?.repos ?? [], isLoadingRepos: false })
      } catch (err: any) {
        set({
          error: err?.message || 'Failed to fetch GitHub repos',
          isLoadingRepos: false,
        })
      }
    }
  },

  // ================= PROJECTS =================
  fetchProjects: async () => {
    set({ isLoadingProjects: true, error: null })
    try {
      const res = await apiClient.get<{ data: { projects: Project[] } }>(
        '/v1/users/me/projects'
      )
      // Backend returns { data: { projects: [...] } }
      set({ projects: res.data.data?.projects ?? [], isLoadingProjects: false })
    } catch (err: any) {
      set({
        error: err?.message || 'Failed to fetch projects',
        isLoadingProjects: false,
      })
    }
  },

  // ================= SKILLS =================
  fetchSkills: async () => {
    set({ isLoadingSkills: true, error: null })
    try {
      const res = await apiClient.get<{ data: VerifiedSkill[] }>('/v1/users/me/skills')
      set({ skills: res.data.data ?? [], isLoadingSkills: false })
    } catch (err: any) {
      set({
        error: err?.message || 'Failed to fetch skills',
        isLoadingSkills: false,
      })
    }
  },

  analyzeProject: async (repoUrl: string) => {
    set({ error: null })
    try {
      await apiClient.post('/v1/users/me/projects/analyze', { repoUrl })
      // Refresh all data after analysis
      await Promise.all([
        get().fetchProjects(),
        get().fetchAura(),
        get().fetchSkills(),
      ])
    } catch (err: any) {
      set({ error: err?.message || 'Project analysis failed' })
      throw err
    }
  },

  // ================= GITHUB SYNC =================
  syncGitHubProfile: async () => {
    try {
      await apiClient.post('/v1/users/me/sync-github')
    } catch (err: any) {
      console.warn('GitHub sync failed:', err?.message)
    }
  },

  // ================= REFRESH ALL =================
  refreshAllData: async () => {
    await Promise.all([
      get().fetchProfile(),
      get().fetchAura(),
      get().fetchProjects(),
      get().fetchSkills(),
      get().fetchGitHubRepos(),
    ])
  },

  clearError: () => set({ error: null }),
}))

// ================= HELPERS =================
function generateBreakdownDetails(breakdown?: any): Record<string, any[]> {
  if (!breakdown) return {}

  return {
    profile: [
      { label: 'Basic Info', points: 10, earned: breakdown.profile >= 10 },
      { label: 'Bio', points: 10, earned: breakdown.profile >= 20 },
      { label: 'Avatar', points: 10, earned: breakdown.profile >= 30 },
      { label: 'Location', points: 10, earned: breakdown.profile >= 40 },
      { label: 'Links', points: 10, earned: breakdown.profile >= 50 },
      { label: 'Skills', points: 10, earned: breakdown.profile >= 60 },
    ],
    projects: [
      {
        label: 'Projects Analyzed',
        points: breakdown.projects,
        earned: breakdown.projects > 0,
      },
    ],
    skills: [
      {
        label: 'Verified Skills',
        points: breakdown.skills,
        earned: breakdown.skills > 0,
      },
    ],
    activity: [
      {
        label: 'Platform Activity',
        points: breakdown.activity,
        earned: breakdown.activity > 0,
      },
    ],
    github: [
      {
        label: 'Followers',
        points: Math.min(breakdown.github * 0.4, 40),
        earned: breakdown.github > 0,
      },
      {
        label: 'Public Repos',
        points: Math.min(breakdown.github * 0.3, 30),
        earned: breakdown.github > 0,
      },
      {
        label: 'Contributions',
        points: Math.min(breakdown.github * 0.3, 30),
        earned: breakdown.github > 0,
      },
    ],
  }
}
