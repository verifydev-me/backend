// User Types
export interface User {
  id: string
  githubId: string
  username: string
  githubUsername?: string
  email: string
  name: string
  avatarUrl: string
  bio?: string
  location?: string
  company?: string
  blog?: string
  website?: string
  twitter?: string
  twitterUsername?: string
  linkedin?: string
  publicRepos: number
  followers: number
  following: number
  githubContributions?: number
  auraScore: number
  auraLevel: AuraLevel
  role: 'developer' | 'recruiter' | 'admin'
  createdAt: string
  updatedAt: string
}

export type AuraLevel = 'novice' | 'rising' | 'skilled' | 'expert' | 'legend'

export interface UserSettings {
  emailNotifications: boolean
  profileVisibility: 'public' | 'private'
  showAuraScore: boolean
  theme: 'light' | 'dark' | 'system'
}

// GitHub Types
export interface GitHubRepo {
  id: number
  name: string
  full_name: string
  description: string | null
  html_url: string
  language: string | null
  stargazers_count: number
  forks_count: number
  watchers_count: number
  open_issues_count: number
  created_at: string
  updated_at: string
  pushed_at: string
  size: number
  default_branch: string
  topics: string[]
  visibility: 'public' | 'private'
  fork: boolean
  archived: boolean
}

// Project Types
export interface Project {
  id: string
  userId: string
  name: string
  description?: string
  repoUrl: string
  url?: string
  language: string
  languages: Record<string, number>
  stars: number
  forks: number
  commits: number
  contributors: number
  lastCommitAt: string
  analysisStatus: AnalysisStatus
  auraContribution: number
  score?: number
  isPinned: boolean
  metrics?: ProjectMetrics
  createdAt: string
  updatedAt: string
}

export type AnalysisStatus = 'pending' | 'analyzing' | 'completed' | 'failed'

export interface ProjectMetrics {
  codeQuality: number
  documentation: number
  testCoverage: number
  maintainability: number
  complexity: number
  activityScore: number
}

// Job Types
export interface Job {
  id: string
  recruiterId: string
  title: string
  company: string
  companyLogo?: string
  location: string
  type: JobType
  experienceLevel: ExperienceLevel
  salaryMin?: number
  salaryMax?: number
  salaryCurrency: string
  description: string
  requirements: string[]
  skills: string[]
  minAuraScore?: number
  status: JobStatus
  applicationsCount: number
  createdAt: string
  updatedAt: string
}

export type JobType = 'full-time' | 'part-time' | 'contract' | 'freelance' | 'internship'
export type ExperienceLevel = 'entry' | 'mid' | 'senior' | 'lead' | 'executive'
export type JobStatus = 'draft' | 'active' | 'paused' | 'closed'

export interface JobApplication {
  id: string
  jobId: string
  userId: string
  job?: Job
  status: ApplicationStatus
  coverLetter?: string
  resumeUrl?: string
  appliedAt: string
  updatedAt: string
}

export type ApplicationStatus = 'pending' | 'reviewing' | 'shortlisted' | 'rejected' | 'accepted'

// ============================================
// INDUSTRY-LEVEL ANALYSIS TYPES
// From the 3-Layer Deterministic Pipeline
// ============================================

export type SkillCategory =
  | 'architecture'
  | 'infrastructure'
  | 'database'
  | 'messaging'
  | 'security'
  | 'devops'
  | 'observability'
  | 'testing'
  | 'language'
  | 'framework'
  | 'cloud'
  | 'performance'

export type SkillLevel = 'basic' | 'intermediate' | 'advanced' | 'expert'

export type ArchitectureType =
  | 'monolith'
  | 'microservices'
  | 'serverless'
  | 'event_driven'
  | 'modular_monolith'
  | 'layered'
  | 'hexagonal'
  | 'clean_architecture'

export type CommunicationType =
  | 'http'
  | 'rest'
  | 'graphql'
  | 'grpc'
  | 'websocket'
  | 'message_queue'
  | 'event_bus'

export interface VerifiedSkill {
  name: string
  category: SkillCategory
  level: SkillLevel
  confidence: number // 0.0 - 1.0
  evidence: string[] // Human-readable proof
  signals: string[] // Underlying signals
  keywords: string[] // Related keywords
  resumeReady: boolean // Safe for resume
  weight: number // Importance (1-10)
}

export interface SystemArchitecture {
  type: ArchitectureType
  communication: CommunicationType[]
  gateway?: string
  serviceCount: number
  services?: string[]
  patterns: string[]
  engineeringLevel: string
}

export interface IndustryAnalysis {
  architecture: SystemArchitecture
  verifiedSkills: VerifiedSkill[]
  skillsByCategory: Record<SkillCategory, VerifiedSkill[]>
  totalSkills: number
  highConfidenceSkills: number
  resumeReadySkills: number
  overallScore: number
  engineeringLevel: string
  infraSignals?: {
    signals: string[]
    serviceCount: number
    serviceNames: string[]
  }
}

// Extended Project with Industry Analysis
export interface ProjectWithIndustry extends Project {
  industryAnalysis?: IndustryAnalysis
}

// Auth Types
export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ApiError {
  success: false
  message: string
  errors?: Record<string, string[]>
}

// Aura Types
export interface AuraBreakdown {
  total: number
  level: AuraLevel
  percentile: number
  trend: 'up' | 'down' | 'stable'
  breakdown: {
    profile: number
    projects: number
    skills: number
    activity: number
    github: number
  }
  breakdownDetails: {
    profile: AuraDetailItem[]
    projects: AuraDetailItem[]
    skills: AuraDetailItem[]
    activity: AuraDetailItem[]
    github: AuraDetailItem[]
  }
  recentGains: AuraGain[]
}

export interface AuraDetailItem {
  label: string
  value: number
  maxValue: number
  description: string
  icon?: string
  earned?: boolean
  points?: number
  reason?: string
}

export interface AuraGain {
  type: string
  points: number
  description: string
  date: string
}

export interface AuraHistoryPoint {
  date: string
  score: number
}

// Resume Types
export interface ResumeData {
  template: 'modern' | 'classic' | 'minimal'
  includeProjects: boolean
  includeAura: boolean
  customSections?: string[]
}

export interface ResumePreview {
  previewUrl: string
  downloadUrl: string
}

// Recruiter Types
export interface Recruiter {
  id: string
  userId: string
  name?: string
  company?: string
  companyName: string
  companyLogo?: string
  companyWebsite?: string
  position: string
  isVerified: boolean
  createdAt: string
}

export interface CandidateSearch {
  minAuraScore?: number
  skills?: string[]
  languages?: string[]
  location?: string
  experienceLevel?: ExperienceLevel
}

export interface CandidateProfile {
  user: User
  aura: AuraBreakdown
  topProjects: Project[]
  verifiedSkills: VerifiedSkill[]
}

export interface VerifiedSkill {
  name: string
  category: 'language' | 'framework' | 'database' | 'devops' | 'tool'
  score: number
  evidence: string[]
  verifiedAt: string
}

// Experience Types
export type ExperienceType = 'WORK' | 'EDUCATION' | 'CERTIFICATION' | 'VOLUNTEER'

export interface Experience {
  id: string
  userId: string
  type: ExperienceType
  title: string
  organization: string
  location?: string
  description?: string
  startDate: string
  endDate?: string | null
  isCurrent: boolean
  skills: string[]
  createdAt: string
  updatedAt: string
}

export interface ExperiencesGrouped {
  work: Experience[]
  education: Experience[]
  certifications: Experience[]
  volunteer: Experience[]
  all: Experience[]
}

