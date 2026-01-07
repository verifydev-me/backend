/**
 * Authentication Service
 * Handles GitHub OAuth, JWT tokens, session management
 * Backend: auth-service (port 3001)
 */

import { get, post } from '../client'

export interface User {
  id: string
  githubId: string
  username: string
  email: string
  name?: string
  avatarUrl?: string
  bio?: string
  location?: string
  company?: string
  websiteUrl?: string
  githubUrl: string
  createdAt: string
  updatedAt: string
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: User
}

export interface RefreshResponse {
  accessToken: string
  refreshToken: string
}

/**
 * Initiate GitHub OAuth flow
 * Redirects to GitHub authorization page
 */
export const initiateGitHubLogin = () => {
  const apiUrl = import.meta.env.VITE_API_URL || '/api'
  window.location.href = `${apiUrl}/v1/auth/github`
}

/**
 * Get current authenticated user
 * @returns Current user data
 */
export const getCurrentUser = () => {
  return get<User>('/v1/auth/me')
}

/**
 * Refresh access token using refresh token
 * @param refreshToken - The refresh token
 * @returns New tokens
 */
export const refreshAccessToken = (refreshToken: string) => {
  return post<RefreshResponse>('/v1/auth/refresh', { refreshToken })
}

/**
 * Logout from current session
 */
export const logout = () => {
  return post<void>('/v1/auth/logout')
}

/**
 * Logout from all devices
 */
export const logoutAll = () => {
  return post<void>('/v1/auth/logout-all')
}
