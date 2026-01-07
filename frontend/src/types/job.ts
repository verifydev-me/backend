// Job Types and Enums

export type JobType = 
  | 'FULL_TIME' 
  | 'PART_TIME' 
  | 'CONTRACT' 
  | 'INTERNSHIP' 
  | 'FREELANCE'

export type ExperienceLevel = 
  | 'ENTRY' 
  | 'JUNIOR' 
  | 'MID' 
  | 'SENIOR' 
  | 'LEAD' 
  | 'PRINCIPAL'

export type JobStatus = 
  | 'DRAFT' 
  | 'ACTIVE' 
  | 'PAUSED' 
  | 'CLOSED' 
  | 'EXPIRED'

export interface JobSkill {
  skillName: string
  minScore: number
  isRequired: boolean
}

export interface Organization {
  id: string
  name: string
  slug: string
  size: 'STARTUP' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'ENTERPRISE'
  isVerified: boolean
}

export interface Job {
  id: string
  organizationId: string
  organization?: Organization
  title: string
  description: string
  requirements: string
  responsibilities: string
  type: JobType
  level: ExperienceLevel
  location: string
  isRemote: boolean
  salaryMin?: number
  salaryMax?: number
  salaryCurrency: string
  requiredSkills: JobSkill[]
  preferredSkills?: string[]
  minAuraScore: number
  minCoreCount: number
  status: JobStatus
  applicationsCount: number
  viewsCount: number
  createdAt: Date | string
  expiresAt?: Date | string
}

// Request DTOs
export interface CreateJobRequest {
  title: string
  description: string
  requirements: string
  responsibilities: string
  type: JobType
  level: ExperienceLevel
  location: string
  isRemote: boolean
  salaryMin?: number
  salaryMax?: number
  salaryCurrency?: string
  requiredSkills: JobSkill[]
  preferredSkills?: string[]
  minAuraScore?: number
  minCoreCount?: number
  expiresAt?: string // ISO date string
}

export interface UpdateJobRequest extends Partial<CreateJobRequest> {
  status?: JobStatus
}

export interface JobFilters {
  type?: JobType
  level?: ExperienceLevel
  isRemote?: boolean
  skills?: string[]
  minSalary?: number
  location?: string
  search?: string
}

// Helper Functions
export function getJobTypeLabel(type: JobType): string {
  const labels: Record<JobType, string> = {
    FULL_TIME: 'Full Time',
    PART_TIME: 'Part Time',
    CONTRACT: 'Contract',
    INTERNSHIP: 'Internship',
    FREELANCE: 'Freelance',
  }
  return labels[type]
}

export function getJobTypeBadgeColor(type: JobType): string {
  const colors: Record<JobType, string> = {
    FULL_TIME: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
    PART_TIME: 'bg-green-500/10 text-green-700 dark:text-green-400',
    CONTRACT: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
    INTERNSHIP: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
    FREELANCE: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400',
  }
  return colors[type]
}

export function getExperienceLevelLabel(level: ExperienceLevel): string {
  const labels: Record<ExperienceLevel, string> = {
    ENTRY: 'Entry Level',
    JUNIOR: 'Junior',
    MID: 'Mid Level',
    SENIOR: 'Senior',
    LEAD: 'Lead',
    PRINCIPAL: 'Principal',
  }
  return labels[level]
}

export function getJobStatusLabel(status: JobStatus): string {
  const labels: Record<JobStatus, string> = {
    DRAFT: 'Draft',
    ACTIVE: 'Active',
    PAUSED: 'Paused',
    CLOSED: 'Closed',
    EXPIRED: 'Expired',
  }
  return labels[status]
}

export function getJobStatusColor(status: JobStatus): string {
  const colors: Record<JobStatus, string> = {
    DRAFT: 'bg-gray-500/10 text-gray-700 dark:text-gray-400',
    ACTIVE: 'bg-green-500/10 text-green-700 dark:text-green-400',
    PAUSED: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
    CLOSED: 'bg-red-500/10 text-red-700 dark:text-red-400',
    EXPIRED: 'bg-gray-500/10 text-gray-700 dark:text-gray-400',
  }
  return colors[status]
}

export function formatSalaryRange(
  min?: number, 
  max?: number, 
  currency: string = 'USD'
): string {
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
  if (min) {
    return `From ${formatter.format(min)}`
  }
  return `Up to ${formatter.format(max!)}`
}

export function getDaysAgo(date: Date | string): number {
  const now = new Date()
  const posted = new Date(date)
  const diff = now.getTime() - posted.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export function formatPostedDate(date: Date | string): string {
  const days = getDaysAgo(date)
  
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  if (days < 365) return `${Math.floor(days / 30)} months ago`
  return `${Math.floor(days / 365)} years ago`
}
