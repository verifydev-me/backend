import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Recruiter, CandidateProfile } from '@/types'
import { apiClient } from '@/api/client'

interface RecruiterSearchFilters {
  skills?: string[]
  minAuraScore?: number
  minCoreCount?: number
  location?: string
  isOpenToWork?: boolean
  minSkillScore?: number
}

interface RecruiterState {
  recruiter: Recruiter | null
  accessToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  
  // Search state
  searchResults: CandidateProfile[]
  searchFilters: RecruiterSearchFilters
  searchTotal: number
  searchPage: number
  isSearching: boolean
  
  // Selected candidate
  selectedCandidate: any | null
  isLoadingCandidate: boolean

  // Actions
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
  
  // Search actions
  searchCandidates: (filters?: RecruiterSearchFilters) => Promise<void>
  setFilters: (filters: RecruiterSearchFilters) => void
  clearFilters: () => void
  
  // Candidate actions
  getCandidateProfile: (userId: string) => Promise<void>
  getCandidateResume: (userId: string) => Promise<any>
  clearError: () => void
}

interface RegisterData {
  email: string
  password: string
  name: string
  company: string
  companyWebsite?: string
  position?: string
}

export const useRecruiterStore = create<RecruiterState>()(
  persist(
    (set, get) => ({
      recruiter: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,
      searchResults: [],
      searchFilters: {},
      searchTotal: 0,
      searchPage: 1,
      isSearching: false,
      selectedCandidate: null,
      isLoadingCandidate: false,

      login: async (email, password) => {
        set({ isLoading: true, error: null })
        try {
          const response = await apiClient.post<{ data: { recruiter: Recruiter; accessToken: string } }>(
            '/v1/recruiters/login',
            { email, password }
          )
          const { recruiter, accessToken } = response.data.data
          set({ 
            recruiter, 
            accessToken, 
            isAuthenticated: true, 
            isLoading: false 
          })
        } catch (error: any) {
          set({ 
            error: error.response?.data?.message || 'Login failed', 
            isLoading: false 
          })
          throw error
        }
      },

      register: async (data) => {
        set({ isLoading: true, error: null })
        try {
          const response = await apiClient.post<{ data: { recruiter: Recruiter; accessToken: string } }>(
            '/v1/recruiters/register',
            data
          )
          const { recruiter, accessToken } = response.data.data
          set({ 
            recruiter, 
            accessToken, 
            isAuthenticated: true, 
            isLoading: false 
          })
        } catch (error: any) {
          set({ 
            error: error.response?.data?.message || 'Registration failed', 
            isLoading: false 
          })
          throw error
        }
      },

      logout: () => {
        set({
          recruiter: null,
          accessToken: null,
          isAuthenticated: false,
          searchResults: [],
          selectedCandidate: null,
        })
      },

      checkAuth: async () => {
        const { accessToken } = get()
        if (!accessToken) {
          set({ isLoading: false, isAuthenticated: false })
          return
        }

        try {
          const response = await apiClient.get<{ data: { recruiter: Recruiter } }>(
            '/v1/recruiters/me',
            { headers: { Authorization: `Bearer ${accessToken}` } }
          )
          set({ 
            recruiter: response.data.data.recruiter || response.data.data, 
            isAuthenticated: true, 
            isLoading: false 
          })
        } catch {
          set({ 
            recruiter: null, 
            accessToken: null, 
            isAuthenticated: false, 
            isLoading: false 
          })
        }
      },

      searchCandidates: async (filters) => {
        const { searchFilters, accessToken } = get()
        const finalFilters = filters || searchFilters
        
        set({ isSearching: true, error: null })
        try {
          const params = new URLSearchParams()
          if (finalFilters.skills?.length) {
            finalFilters.skills.forEach(s => params.append('skills', s))
          }
          if (finalFilters.minAuraScore) params.set('minAuraScore', String(finalFilters.minAuraScore))
          if (finalFilters.minCoreCount) params.set('minCoreCount', String(finalFilters.minCoreCount))
          if (finalFilters.location) params.set('location', finalFilters.location)
          if (finalFilters.isOpenToWork !== undefined) params.set('isOpenToWork', String(finalFilters.isOpenToWork))
          if (finalFilters.minSkillScore) params.set('minSkillScore', String(finalFilters.minSkillScore))
          
          const response = await apiClient.get<{ 
            data: { candidates: CandidateProfile[] }; 
            meta: { total: number; page: number } 
          }>(
            `/v1/recruiters/candidates/search?${params.toString()}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          )
          
          set({ 
            searchResults: response.data.data.candidates || [],
            searchTotal: response.data.meta?.total || 0,
            searchPage: response.data.meta?.page || 1,
            isSearching: false 
          })
        } catch (error: any) {
          console.log('Search candidates error:', error)
          // Set empty results instead of showing error to prevent blank screen
          set({ 
            searchResults: [],
            searchTotal: 0,
            error: error.response?.data?.message || 'Search failed', 
            isSearching: false 
          })
        }
      },

      setFilters: (filters) => {
        set({ searchFilters: { ...get().searchFilters, ...filters } })
      },

      clearFilters: () => {
        set({ searchFilters: {}, searchResults: [], searchTotal: 0 })
      },

      getCandidateProfile: async (userId) => {
        const { accessToken } = get()
        set({ isLoadingCandidate: true, error: null })
        try {
          const response = await apiClient.get<{ data: { candidate: any } }>(
            `/v1/recruiters/candidates/${userId}/full`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          )
          set({ 
            selectedCandidate: response.data.data.candidate, 
            isLoadingCandidate: false 
          })
        } catch (error: any) {
          set({ 
            error: error.response?.data?.message || 'Failed to load candidate', 
            isLoadingCandidate: false 
          })
        }
      },

      getCandidateResume: async (userId) => {
        const { accessToken } = get()
        try {
          const response = await apiClient.get<{ data: any }>(
            `/v1/recruiters/candidates/${userId}/resume`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          )
          return response.data.data
        } catch (error: any) {
          set({ error: error.response?.data?.message || 'Failed to get resume' })
          throw error
        }
      },

      clearError: () => set({ error: null })
    }),
    {
      name: 'recruiter-storage',
      partialize: (state) => ({
        accessToken: state.accessToken,
      }),
    }
  )
)
