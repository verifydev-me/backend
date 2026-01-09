/**
 * User Service
 * Handles user profile, onboarding, skills, projects, and aura
 * Backend: user-service (port 3002)
 */

import { get, post, put } from '../client'

// ============================================
// TYPES
// ============================================

export interface UserProfile {
  id: string
  username: string
  email: string
  name?: string
  bio?: string
  avatarUrl?: string
  location?: string
  company?: string
  websiteUrl?: string
  githubUrl: string
  isStudent: boolean
  currentInstitution?: string
  graduationYear?: number
  fieldOfStudy?: string
  onboardingCompleted: boolean
  profileCompleteness: number
  createdAt: string
  updatedAt: string
}

export interface OnboardingStatus {
  completed: boolean
  currentStep: number
  steps: {
    step1: boolean // Basic info
    step2: boolean // Student info (optional)
  }
}

export interface GitHubRepo {
  id: number
  name: string
  fullName: string
  description?: string
  language?: string
  stars: number
  forks: number
  url: string
  isPrivate: boolean
  updatedAt: string
}

export interface Project {
  id: string
  userId: string
  githubRepoId: number
  name: string
  description?: string
  url: string
  language?: string
  stars: number
  forks: number
  analysisStatus: 'PENDING' | 'ANALYZING' | 'COMPLETED' | 'FAILED'
  qualityScore?: number
  technologies: string[]
  analyzedAt?: string
  createdAt: string
  updatedAt: string
}

export interface Skill {
  id: string
  name: string
  category: string
  score: number
  isVerified: boolean
  verifiedBy?: 'PROJECT_ANALYSIS' | 'MANUAL'
  evidenceCount: number
  lastUsed?: string
  createdAt: string
}

export interface AuraSummary {
  level: number
  score: number
  trend: 'UP' | 'DOWN' | 'STABLE'
  rank?: string
  breakdown: {
    skillDiversity: number
    projectQuality: number
    activityConsistency: number
    communityImpact: number
  }
  history: Array<{
    date: string
    score: number
  }>
}

export interface UpdateProfileData {
  name?: string
  bio?: string
  location?: string
  company?: string
  websiteUrl?: string
}

export interface OnboardingStep1Data {
  name: string
  bio?: string
}

export interface OnboardingStep2Data {
  isStudent: boolean
  currentInstitution?: string
  graduationYear?: number
  fieldOfStudy?: string
}

export interface AnalyzeProjectData {
  repoId: number
  repoName: string
  repoUrl: string
  projectType?: 'backend' | 'frontend' | 'fullstack' | 'ml' | 'library'
}

// ============================================
// PROFILE ENDPOINTS
// ============================================

/**
 * Get current user's profile
 */
export const getMyProfile = () => {
  return get<UserProfile>('/v1/users/me')
}

/**
 * Update current user's profile
 */
export const updateMyProfile = (data: UpdateProfileData) => {
  return put<UserProfile>('/v1/users/me', data)
}

/**
 * Get public profile by username
 */
export const getPublicProfile = (username: string) => {
  return get<UserProfile>(`/v1/users/u/${username}`)
}

/**
 * Sync GitHub profile data
 */
export const syncGitHub = () => {
  return post<{ message: string }>('/v1/users/me/sync-github')
}

// ============================================
// ONBOARDING ENDPOINTS
// ============================================

/**
 * Get onboarding status
 */
export const getOnboardingStatus = () => {
  return get<OnboardingStatus>('/v1/users/me/onboarding/status')
}

/**
 * Update onboarding step 1 (basic info)
 */
export const updateOnboardingStep1 = (data: OnboardingStep1Data) => {
  return post<{ step: number; completed: boolean }>('/v1/users/me/onboarding/step/1', data)
}

/**
 * Update onboarding step 2 (student info)
 */
export const updateOnboardingStep2 = (data: OnboardingStep2Data) => {
  return post<{ step: number; completed: boolean }>('/v1/users/me/onboarding/step/2', data)
}

/**
 * Skip onboarding step 2
 */
export const skipOnboardingStep2 = () => {
  return post<{ step: number; skipped: boolean }>('/v1/users/me/onboarding/step/2/skip')
}

/**
 * Complete onboarding
 */
export const completeOnboarding = () => {
  return post<{ completed: boolean; user: UserProfile }>('/v1/users/me/onboarding/complete')
}

// ============================================
// PROJECT ENDPOINTS
// ============================================

/**
 * Get available GitHub repos for analysis
 */
export const getAvailableRepos = () => {
  return get<GitHubRepo[]>('/v1/users/me/repos')
}

/**
 * Get user's analyzed projects
 */
export const getMyProjects = () => {
  return get<Project[]>('/v1/users/me/projects')
}

/**
 * Analyze a new project
 */
export const analyzeProject = (data: AnalyzeProjectData) => {
  return post<Project>('/v1/users/me/projects/analyze', data)
}

// ============================================
// SKILLS ENDPOINTS
// ============================================

/**
 * Get user's skills
 */
export const getMySkills = () => {
  return get<Skill[]>('/v1/users/me/skills')
}

// ============================================
// AURA ENDPOINTS
// ============================================

/**
 * Get current user's aura summary
 */
export const getMyAura = () => {
  return get<AuraSummary>('/v1/users/me/aura')
}

/**
 * Get public aura by username
 */
export const getPublicAura = (username: string) => {
  return get<AuraSummary>(`/v1/users/u/${username}/aura`)
}

// ============================================
// SETTINGS ENDPOINTS
// ============================================

export interface UserSettings {
  emailNotifications: boolean
  jobAlerts: boolean
  profileVisibility: 'PUBLIC' | 'PRIVATE'
  showEmail: boolean
  showLocation: boolean
}

/**
 * Get user settings
 */
export const getSettings = () => {
  return get<UserSettings>('/v1/users/settings')
}

/**
 * Update user settings
 */
export const updateSettings = (data: Partial<UserSettings>) => {
  return put<UserSettings>('/v1/users/settings', data)
}
