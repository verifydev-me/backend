import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'
import { apiClient } from '@/api/client'

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  // Actions
  setUser: (user: User | null) => void
  setTokens: (accessToken: string, refreshToken: string) => void
  checkAuth: () => Promise<void>
  login: () => void
  logout: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      checkAuth: async () => {
        const { accessToken } = get()
        
        if (!accessToken) {
          set({ isLoading: false, isAuthenticated: false })
          return
        }

        try {
          const response = await apiClient.get<{ data: { user: User } }>('/v1/auth/me')
          set({
            user: response.data.data?.user ?? null,
            isAuthenticated: !!response.data.data?.user,
            isLoading: false,
          })
        } catch {
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
          })
        }
      },

      login: () => {
        // Redirect directly to gateway - browser redirects don't go through Vite proxy
        // In production, this should be the actual API domain
        const gatewayUrl = import.meta.env.VITE_GATEWAY_URL || 'http://localhost'
          window.location.href = `${gatewayUrl}/api/v1/auth/github`
      },

      logout: async () => {
        const { accessToken } = get()
        if (!accessToken) {
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            error: null,
          })
          return
        }

        try {
          await apiClient.post('/v1/auth/logout')
        } catch {
          // Ignore logout errors
        } finally {
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            error: null,
          })
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
)
