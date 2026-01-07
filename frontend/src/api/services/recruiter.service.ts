/**
 * Recruiter Service
 * Handles recruiter authentication, candidate search, and job management
 * Backend: recruiter-service (port 3005)
 */

import { get, post, put } from '../client'

// ============================================
// TYPES
// ============================================

export interface Recruiter {
  id: string
  email: string
  name: string
  companyName: string
  companyWebsite?: string
  companyLogo?: string
  position?: string
  verified: boolean
  createdAt: string
  updatedAt: string
}

export interface RecruiterAuthResponse {
  accessToken: string
  refreshToken: string
  recruiter: Recruiter
}

export interface RecruiterRegisterData {
  email: string
  password: string
  name: string
  organizationName: string
  organizationWebsite?: string
  position?: string
}

export interface RecruiterLoginData {
  email: string
  password: string
}

export interface RecruiterDashboard {
  stats: {
    activeJobs: number
    totalApplications: number
    newCandidates: number
    shortlisted: number
  }
  recentApplications: Array<{
    id: string
    candidateName: string
    candidateAvatar?: string
    jobTitle: string
    appliedAt: string
    matchScore: number
    status: string
  }>
  topJobs: Array<{
    id: string
    title: string
    applicationCount: number
    viewCount: number
  }>
}

export interface CandidateSearchFilters {
  q?: string
  skills?: string[]
  minAuraScore?: number
  maxAuraScore?: number
  minExperience?: number
  maxExperience?: number
  location?: string
  isOpenToWork?: boolean
  page?: number
  limit?: number
}

export interface Candidate {
  id: string
  username: string
  name?: string
  email?: string
  avatarUrl?: string
  bio?: string
  location?: string
  githubUrl: string
  auraScore: number
  auraLevel: number
  topSkills: Array<{
    name: string
    score: number
    isVerified: boolean
  }>
  projectCount: number
  isOpenToWork: boolean
  createdAt: string
}

export interface FullCandidateProfile extends Candidate {
  company?: string
  websiteUrl?: string
  skills: Array<{
    id: string
    name: string
    category: string
    score: number
    isVerified: boolean
    evidenceCount: number
  }>
  allSkills?: any[]
  projects: Array<{
    id: string
    name: string
    description?: string
    url: string
    language?: string
    stars: number
    qualityScore?: number
    technologies: string[]
    analyzedAt?: string
  }>
  analyzedProjects?: any[]
  experience?: Array<{
    id: string
    title: string
    company: string
    location?: string
    startDate: string
    endDate?: string
    description?: string
  }>
  experiences?: any[]
  education?: Array<{
    id: string
    institution: string
    degree: string
    fieldOfStudy: string
    startYear: number
    endYear?: number
  }>
  auraSummary: {
    level: number
    score: number
    trend: 'UP' | 'DOWN' | 'STABLE'
    breakdown: {
      skillDiversity: number
      projectQuality: number
      activityConsistency: number
      communityImpact: number
    }
  }
}

export interface CandidateResume {
  userId: string
  resume: {
    personalInfo: {
      name: string
      email: string
      phone?: string
      location?: string
      website?: string
      github?: string
      linkedin?: string
    }
    summary?: string
    skills: Array<{
      name: string
      level: string
      verified: boolean
    }>
    experience: Array<{
      title: string
      company: string
      location?: string
      startDate: string
      endDate?: string
      description: string
    }>
    education: Array<{
      degree: string
      institution: string
      fieldOfStudy: string
      startYear: number
      endYear?: number
    }>
    projects: Array<{
      name: string
      description: string
      technologies: string[]
      url?: string
    }>
  }
  generatedAt: string
}

export interface UpdateRecruiterProfileData {
  name?: string
  companyName?: string
  companyWebsite?: string
  companyLogo?: string
  position?: string
}

// ============================================
// AUTHENTICATION ENDPOINTS
// ============================================

/**
 * Register a new recruiter
 */
export const registerRecruiter = (data: RecruiterRegisterData) => {
  return post<RecruiterAuthResponse>('/v1/recruiters/register', data)
}

/**
 * Login a recruiter
 */
export const loginRecruiter = (data: RecruiterLoginData) => {
  return post<RecruiterAuthResponse>('/v1/recruiters/login', data)
}

/**
 * Refresh recruiter access token
 */
export const refreshRecruiterToken = (refreshToken: string) => {
  return post<{ accessToken: string; refreshToken: string }>('/v1/recruiters/refresh', {
    refreshToken,
  })
}

/**
 * Get current recruiter info
 */
export const getCurrentRecruiter = () => {
  return get<Recruiter>('/v1/recruiters/me')
}

/**
 * Update recruiter profile
 */
export const updateRecruiterProfile = (data: UpdateRecruiterProfileData) => {
  return put<Recruiter>('/v1/recruiters/profile', data)
}

/**
 * Logout recruiter
 */
export const logoutRecruiter = () => {
  return post<void>('/v1/recruiters/logout')
}

// ============================================
// DASHBOARD ENDPOINTS
// ============================================

/**
 * Get recruiter dashboard stats
 */
export const getRecruiterDashboard = () => {
  return get<RecruiterDashboard>('/v1/recruiters/dashboard')
}

// ============================================
// CANDIDATE SEARCH ENDPOINTS
// ============================================

/**
 * Search for candidates by filters
 */
export const searchCandidates = async (filters: CandidateSearchFilters) => {
  const params = new URLSearchParams()
  
  if (filters.q) params.append('q', filters.q)
  if (filters.skills?.length) params.append('skills', filters.skills.join(','))
  if (filters.minAuraScore !== undefined && filters.minAuraScore > 0) {
    params.append('minAuraScore', String(filters.minAuraScore))
  }
  if (filters.maxAuraScore !== undefined && filters.maxAuraScore > 0) {
    params.append('maxAuraScore', String(filters.maxAuraScore))
  }
  if (filters.minExperience !== undefined && filters.minExperience > 0) {
    params.append('minExperience', String(filters.minExperience))
  }
  if (filters.maxExperience !== undefined && filters.maxExperience > 0) {
    params.append('maxExperience', String(filters.maxExperience))
  }
  if (filters.location) params.append('location', filters.location)
  if (filters.isOpenToWork !== undefined) params.append('isOpenToWork', String(filters.isOpenToWork))
  params.append('page', String(filters.page || 1))
  params.append('limit', String(filters.limit || 20))

  try {
    const response = await get<{
      data: Candidate[]
      meta: {
        total: number
        page: number
        limit: number
        totalPages: number
      }
    }>(`/v1/recruiters/candidates/search?${params.toString()}`)
    return response
  } catch (error: any) {
    console.error('Search candidates error:', error)
    // Return empty results on error
    return {
      data: [],
      meta: {
        total: 0,
        page: filters.page || 1,
        limit: filters.limit || 20,
        totalPages: 0
      }
    }
  }
}

/**
 * Get basic candidate profile
 */
export const getCandidateProfile = (userId: string) => {
  return get<Candidate>(`/v1/recruiters/candidates/${userId}`)
}

/**
 * Get full candidate profile with all details
 */
export const getFullCandidateProfile = (userId: string) => {
  return get<FullCandidateProfile>(`/v1/recruiters/candidates/${userId}/full`)
}

/**
 * Get candidate's resume data
 */
export const getCandidateResume = (userId: string) => {
  return get<CandidateResume>(`/v1/recruiters/candidates/${userId}/resume`)
}

/**
 * Download candidate's resume PDF
 */
export const downloadCandidateResume = (userId: string) => {
  const apiUrl = import.meta.env.VITE_API_URL || '/api'
  window.open(`${apiUrl}/v1/recruiters/candidates/${userId}/resume?download=true`, '_blank')
}

// ============================================
// SHORTLIST ENDPOINTS
// ============================================

export interface ShortlistCandidate {
  userId: string
  notes?: string
  tags?: string[]
}

/**
 * Shortlist a candidate
 */
export const shortlistCandidate = (data: ShortlistCandidate) => {
  return post<{ message: string }>(`/v1/recruiters/candidates/${data.userId}/shortlist`, data)
}

/**
 * Get shortlisted candidates
 */
export const getShortlist = async (): Promise<Candidate[]> => {
  try {
    const response = await get<{ candidates: Candidate[] } | Candidate[]>('/v1/recruiters/shortlist')
    // Handle both response formats
    if (Array.isArray(response)) {
      return response
    }
    return response.candidates || []
  } catch (error) {
    console.error('Failed to fetch shortlist:', error)
    return []
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get aura level badge color
 */
export const getAuraLevelColor = (level: number) => {
  if (level >= 90) return 'purple'
  if (level >= 70) return 'blue'
  if (level >= 50) return 'green'
  if (level >= 30) return 'yellow'
  return 'gray'
}

/**
 * Get aura level label
 */
export const getAuraLevelLabel = (level: number) => {
  if (level >= 90) return 'Elite'
  if (level >= 70) return 'Expert'
  if (level >= 50) return 'Advanced'
  if (level >= 30) return 'Intermediate'
  return 'Beginner'
}
