/**
 * Job Service
 * Handles job listings, search, applications, and matching
 * Backend: job-service (port 3004)
 */

import { get, post, del } from '../client'

// ============================================
// TYPES
// ============================================

export interface Job {
  id: string
  title: string
  description: string
  companyName: string
  companyLogo?: string
  location: string
  isRemote: boolean
  type: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP'
  level: 'ENTRY' | 'JUNIOR' | 'MID' | 'SENIOR' | 'LEAD'
  salaryMin?: number
  salaryMax?: number
  currency: string
  requiredSkills: string[]
  preferredSkills: string[]
  responsibilities: string[]
  qualifications: string[]
  benefits?: string[]
  applicationDeadline?: string
  recruiterId: string
  status: 'ACTIVE' | 'CLOSED' | 'DRAFT'
  viewCount: number
  applicationCount: number
  createdAt: string
  updatedAt: string
}

export interface JobWithMatch extends Job {
  matchScore?: number
  matchedSkills?: string[]
  missingSkills?: string[]
}

export interface Application {
  id: string
  jobId: string
  userId: string
  status: 'APPLIED' | 'REVIEWING' | 'SHORTLISTED' | 'REJECTED' | 'WITHDRAWN'
  coverLetter?: string
  resumeUrl?: string
  matchScore: number
  appliedAt: string
  updatedAt: string
  job?: Job
}

export interface ApplicationWithJob extends Application {
  job: Job
}

export interface JobSearchFilters {
  q?: string
  skills?: string[]
  type?: Job['type']
  level?: Job['level']
  isRemote?: boolean
  salaryMin?: number
  salaryMax?: number
  location?: string
  sortBy?: 'recent' | 'salary' | 'relevance'
  page?: number
  limit?: number
}

export interface PaginatedJobs {
  data: Job[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface ApplyToJobData {
  coverLetter?: string
}

export interface CanApplyResponse {
  canApply: boolean
  reason?: string
  hasApplied?: boolean
}

// ============================================
// JOB DISCOVERY ENDPOINTS
// ============================================

/**
 * List all jobs (basic)
 */
export const listJobs = (page = 1, limit = 20) => {
  return get<PaginatedJobs>(`/v1/jobs?page=${page}&limit=${limit}`)
}

/**
 * Advanced job search with filters
 */
export const searchJobs = (filters: JobSearchFilters) => {
  const params = new URLSearchParams()
  
  if (filters.q) params.append('q', filters.q)
  if (filters.skills?.length) params.append('skills', filters.skills.join(','))
  if (filters.type) params.append('type', filters.type)
  if (filters.level) params.append('level', filters.level)
  if (filters.isRemote !== undefined) params.append('isRemote', String(filters.isRemote))
  if (filters.salaryMin) params.append('salaryMin', String(filters.salaryMin))
  if (filters.salaryMax) params.append('salaryMax', String(filters.salaryMax))
  if (filters.location) params.append('location', filters.location)
  if (filters.sortBy) params.append('sortBy', filters.sortBy)
  if (filters.page) params.append('page', String(filters.page))
  if (filters.limit) params.append('limit', String(filters.limit))

  return get<PaginatedJobs>(`/v1/jobs/search?${params.toString()}`)
}

/**
 * Get matched jobs based on user's skills (requires auth)
 */
export const getMatchedJobs = (page = 1, limit = 20) => {
  return get<PaginatedJobs>(`/v1/jobs/matched?page=${page}&limit=${limit}`)
}

/**
 * Get recommended jobs based on user profile
 */
export const getRecommendedJobs = (limit = 10) => {
  return get<Job[]>(`/v1/jobs/recommended?limit=${limit}`)
}

/**
 * Get job details by ID
 */
export const getJob = (jobId: string) => {
  return get<Job>(`/v1/jobs/${jobId}`)
}

/**
 * Get job with user's match score (requires auth)
 */
export const getJobWithMatch = (jobId: string) => {
  return get<JobWithMatch>(`/v1/jobs/${jobId}/match`)
}

/**
 * Check if user can apply to a job
 */
export const canApplyToJob = (jobId: string) => {
  return get<CanApplyResponse>(`/v1/jobs/${jobId}/can-apply`)
}

/**
 * Apply to a job
 */
export const applyToJob = (jobId: string, data: ApplyToJobData) => {
  return post<Application>(`/v1/jobs/${jobId}/apply`, data)
}

// ============================================
// APPLICATION MANAGEMENT ENDPOINTS
// ============================================

/**
 * Get user's applications
 */
export const getMyApplications = (page = 1, limit = 20) => {
  return get<{
    data: ApplicationWithJob[]
    meta: {
      total: number
      page: number
      limit: number
      totalPages: number
    }
  }>(`/v1/applications?page=${page}&limit=${limit}`)
}

/**
 * Get single application
 */
export const getApplication = (applicationId: string) => {
  return get<ApplicationWithJob>(`/v1/applications/${applicationId}`)
}

/**
 * Withdraw application
 */
export const withdrawApplication = (applicationId: string) => {
  return del<{ message: string }>(`/v1/applications/${applicationId}`)
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format salary range
 */
export const formatSalary = (min?: number, max?: number, currency = 'USD') => {
  if (!min && !max) return 'Not specified'
  
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })

  if (min && max) {
    return `${formatter.format(min)} - ${formatter.format(max)}`
  }
  
  return min ? `From ${formatter.format(min)}` : `Up to ${formatter.format(max!)}`
}

/**
 * Get job type label
 */
export const getJobTypeLabel = (type: Job['type']) => {
  const labels: Record<Job['type'], string> = {
    FULL_TIME: 'Full Time',
    PART_TIME: 'Part Time',
    CONTRACT: 'Contract',
    INTERNSHIP: 'Internship',
  }
  return labels[type]
}

/**
 * Get job level label
 */
export const getJobLevelLabel = (level: Job['level']) => {
  const labels: Record<Job['level'], string> = {
    ENTRY: 'Entry Level',
    JUNIOR: 'Junior',
    MID: 'Mid Level',
    SENIOR: 'Senior',
    LEAD: 'Lead',
  }
  return labels[level]
}

/**
 * Get application status label
 */
export const getApplicationStatusLabel = (status: Application['status']) => {
  const labels: Record<Application['status'], string> = {
    APPLIED: 'Applied',
    REVIEWING: 'Under Review',
    SHORTLISTED: 'Shortlisted',
    REJECTED: 'Rejected',
    WITHDRAWN: 'Withdrawn',
  }
  return labels[status]
}

/**
 * Get application status color
 */
export const getApplicationStatusColor = (status: Application['status']) => {
  const colors: Record<Application['status'], string> = {
    APPLIED: 'blue',
    REVIEWING: 'yellow',
    SHORTLISTED: 'green',
    REJECTED: 'red',
    WITHDRAWN: 'gray',
  }
  return colors[status]
}
