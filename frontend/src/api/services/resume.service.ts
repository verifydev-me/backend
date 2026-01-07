/**
 * Resume Service
 * Handles resume generation and templates
 * Backend: resume-service (port 8003)
 */

import { get, post } from '../client'

// ============================================
// TYPES
// ============================================

export type ResumeTemplate = 'MODERN' | 'ATS' | 'MINIMAL'

export interface ResumeData {
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
    level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT'
    verified: boolean
  }>
  experience: Array<{
    title: string
    company: string
    location?: string
    startDate: string
    endDate?: string
    current?: boolean
    description: string
    achievements?: string[]
  }>
  education: Array<{
    degree: string
    institution: string
    fieldOfStudy: string
    location?: string
    startYear: number
    endYear?: number
    gpa?: string
  }>
  projects: Array<{
    name: string
    description: string
    technologies: string[]
    url?: string
    github?: string
    highlights?: string[]
  }>
  certifications?: Array<{
    name: string
    issuer: string
    date: string
    url?: string
  }>
}

export interface ResumeGeneration {
  id: string
  userId: string
  template: ResumeTemplate
  data: ResumeData
  pdfUrl?: string
  publicUrl?: string
  status: 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED'
  generatedAt?: string
  expiresAt?: string
  createdAt: string
}

export interface GenerateResumeRequest {
  template: ResumeTemplate
  data: ResumeData
  includeAuraBadge?: boolean
}

// ============================================
// RESUME ENDPOINTS
// ============================================

/**
 * Get user's resume data (auto-populated from profile)
 */
export const getMyResumeData = () => {
  return get<ResumeData>('/v1/users/me/resume')
}

/**
 * Generate resume PDF
 */
export const generateResume = (request: GenerateResumeRequest) => {
  return post<ResumeGeneration>('/v1/resume/generate', request)
}

/**
 * Get resume generation status
 */
export const getResumeStatus = (resumeId: string) => {
  return get<ResumeGeneration>(`/v1/resume/${resumeId}/status`)
}

/**
 * Get user's resume generations
 */
export const getMyResumes = () => {
  return get<ResumeGeneration[]>('/v1/resume/my')
}

/**
 * Download resume PDF
 */
export const downloadResume = (resumeId: string) => {
  const apiUrl = import.meta.env.VITE_API_URL || '/api'
  window.open(`${apiUrl}/v1/resume/${resumeId}/download`, '_blank')
}

/**
 * Get public resume by token
 */
export const getPublicResume = (token: string) => {
  return get<ResumeGeneration>(`/v1/resume/public/${token}`)
}

/**
 * Create public resume link
 */
export const createPublicResumeLink = (resumeId: string, expiresInDays = 30) => {
  return post<{ publicUrl: string; expiresAt: string }>(
    `/v1/resume/${resumeId}/public-link`,
    { expiresInDays }
  )
}

/**
 * Delete resume
 */
export const deleteResume = (resumeId: string) => {
  return post<{ message: string }>(`/v1/resume/${resumeId}/delete`)
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get template display name
 */
export const getTemplateLabel = (template: ResumeTemplate) => {
  const labels: Record<ResumeTemplate, string> = {
    MODERN: 'Modern',
    ATS: 'ATS-Friendly',
    MINIMAL: 'Minimal',
  }
  return labels[template]
}

/**
 * Get template description
 */
export const getTemplateDescription = (template: ResumeTemplate) => {
  const descriptions: Record<ResumeTemplate, string> = {
    MODERN: 'Clean, modern design with visual elements and color accents',
    ATS: 'Simple, text-focused layout optimized for Applicant Tracking Systems',
    MINIMAL: 'Minimalist design with elegant typography and whitespace',
  }
  return descriptions[template]
}

/**
 * Validate resume data
 */
export const validateResumeData = (data: ResumeData): string[] => {
  const errors: string[] = []

  if (!data.personalInfo.name) errors.push('Name is required')
  if (!data.personalInfo.email) errors.push('Email is required')
  if (!data.skills.length) errors.push('At least one skill is required')
  
  return errors
}

/**
 * Format date for resume
 */
export const formatResumeDate = (date: string, current = false) => {
  if (current) return 'Present'
  
  const d = new Date(date)
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}
