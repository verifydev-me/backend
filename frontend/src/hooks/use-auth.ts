/**
 * Auth React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth-store'
import * as authService from '@/api/services/auth.service'

// Query Keys
export const authKeys = {
  all: ['auth'] as const,
  me: () => [...authKeys.all, 'me'] as const,
}

/**
 * Get current user
 */
export const useCurrentUser = () => {
  const { isAuthenticated } = useAuthStore()
  
  return useQuery({
    queryKey: authKeys.me(),
    queryFn: authService.getCurrentUser,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Logout mutation
 */
export const useLogout = () => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { logout: clearAuth } = useAuthStore()

  return useMutation({
    mutationFn: authService.logout,
    onSuccess: () => {
      clearAuth()
      queryClient.clear()
      navigate('/login')
    },
  })
}

/**
 * Logout from all devices mutation
 */
export const useLogoutAll = () => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { logout: clearAuth } = useAuthStore()

  return useMutation({
    mutationFn: authService.logoutAll,
    onSuccess: () => {
      clearAuth()
      queryClient.clear()
      navigate('/login')
    },
  })
}

/**
 * Refresh token mutation
 */
export const useRefreshToken = () => {
  const { setTokens } = useAuthStore()

  return useMutation({
    mutationFn: authService.refreshAccessToken,
    onSuccess: (data) => {
      setTokens(data.accessToken, data.refreshToken)
    },
  })
}
