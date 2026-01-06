import { get, post, put, del } from '../client'
import type { 
  Job, 
  CreateJobRequest, 
  UpdateJobRequest
} from '@/types/job'

// ==================== RECRUITER JOB ENDPOINTS ====================

/**
 * Create a new job posting
 */
export async function createJob(data: CreateJobRequest): Promise<Job> {
  const response = await post<{ job: Job }>('/v1/jobs', data)
  return response.job
}

/**
 * Update an existing job
 */
export async function updateJob(jobId: string, data: UpdateJobRequest): Promise<Job> {
  const response = await put<{ job: Job }>(`/v1/jobs/${jobId}`, data)
  return response.job
}

/**
 * Delete a job posting
 */
export async function deleteJob(jobId: string): Promise<void> {
  await del(`/v1/jobs/${jobId}`)
}

/**
 * Get jobs posted by the current recruiter/organization
 */
export async function getMyPostedJobs(
  page = 1,
  limit = 20
): Promise<{ jobs: Job[]; total: number }> {
  const response = await get<{ jobs: Job[]; meta: { total: number } }>(
    `/v1/recruiter/jobs?page=${page}&limit=${limit}`
  )
  return {
    jobs: response.jobs,
    total: response.meta.total,
  }
}

/**
 * Get single job details (recruiter view with stats)
 */
export async function getRecruiterJobDetails(jobId: string): Promise<Job> {
  const response = await get<{ job: Job }>(`/v1/recruiter/jobs/${jobId}`)
  return response.job
}

/**
 * Publish a draft job
 */
export async function publishJob(jobId: string): Promise<Job> {
  const response = await put<{ job: Job }>(`/v1/jobs/${jobId}`, {
    status: 'ACTIVE',
  })
  return response.job
}

/**
 * Pause an active job
 */
export async function pauseJob(jobId: string): Promise<Job> {
  const response = await put<{ job: Job }>(`/v1/jobs/${jobId}`, {
    status: 'PAUSED',
  })
  return response.job
}

/**
 * Close a job (stop accepting applications)
 */
export async function closeJob(jobId: string): Promise<Job> {
  const response = await put<{ job: Job }>(`/v1/jobs/${jobId}`, {
    status: 'CLOSED',
  })
  return response.job
}

/**
 * Get job analytics (views, applications, etc.)
 */
export async function getJobAnalytics(jobId: string): Promise<{
  views: number
  applications: number
  shortlisted: number
  hired: number
  viewsThisWeek: number
  applicationsThisWeek: number
}> {
  const response = await get<{
    analytics: {
      views: number
      applications: number
      shortlisted: number
      hired: number
      viewsThisWeek: number
      applicationsThisWeek: number
    }
  }>(`/v1/recruiter/jobs/${jobId}/analytics`)
  return response.analytics
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Validate job form data before submission
 */
export function validateJobForm(data: Partial<CreateJobRequest>): {
  valid: boolean
  errors: Record<string, string>
} {
  const errors: Record<string, string> = {}

  if (!data.title || data.title.length < 5) {
    errors.title = 'Title must be at least 5 characters'
  }
  if (!data.description || data.description.length < 50) {
    errors.description = 'Description must be at least 50 characters'
  }
  if (!data.requirements || data.requirements.length < 20) {
    errors.requirements = 'Requirements must be at least 20 characters'
  }
  if (!data.responsibilities || data.responsibilities.length < 20) {
    errors.responsibilities = 'Responsibilities must be at least 20 characters'
  }
  if (!data.type) {
    errors.type = 'Job type is required'
  }
  if (!data.level) {
    errors.level = 'Experience level is required'
  }
  if (!data.location) {
    errors.location = 'Location is required'
  }
  if (!data.requiredSkills || data.requiredSkills.length === 0) {
    errors.requiredSkills = 'At least one required skill is needed'
  }
  if (data.salaryMin && data.salaryMax && data.salaryMin > data.salaryMax) {
    errors.salary = 'Minimum salary cannot be greater than maximum salary'
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}

/**
 * Calculate job completeness percentage
 */
export function calculateJobCompleteness(data: Partial<CreateJobRequest>): number {
  const fields = [
    data.title,
    data.description,
    data.requirements,
    data.responsibilities,
    data.type,
    data.level,
    data.location,
    data.requiredSkills?.length ? true : false,
    data.salaryMin || data.salaryMax,
    data.preferredSkills?.length ? true : false,
  ]
  
  const filled = fields.filter(Boolean).length
  return Math.round((filled / fields.length) * 100)
}

/**
 * Generate job preview URL
 */
export function getJobPreviewUrl(jobId: string): string {
  return `/jobs/${jobId}/preview`
}

/**
 * Check if job can be published
 */
export function canPublishJob(data: Partial<CreateJobRequest>): boolean {
  const { valid } = validateJobForm(data)
  return valid
}
