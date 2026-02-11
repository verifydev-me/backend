import { Request } from 'express';

// Authenticated Request
export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    sessionId: string;
  };
}

// API Response
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: {
    code: string;
    details?: unknown;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

// User Types
export interface UserProfile {
  id: string;
  username: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  bio: string | null;
  location: string | null;
  company: string | null;
  website: string | null;
  twitterHandle: string | null;
  leetcodeUsername?: string | null;
  linkedinUrl?: string | null;

  // Core & Aura
  coreCount: number;
  auraScore: number;

  // Status
  isPublic: boolean;
  isOpenToWork: boolean;
  isVerified: boolean;

  // GitHub stats
  githubFollowers: number;
  githubRepos: number;
  githubContributions: number;

  // Timestamps
  createdAt: Date;
  lastLoginAt: Date | null;
  tags?: string[];
}

export interface PublicProfile {
  username: string;
  name: string | null;
  avatarUrl: string | null;
  bio: string | null;
  location: string | null;
  coreCount: number;
  auraScore: number;
  isVerified: boolean;
  isOpenToWork: boolean;
  skills: SkillSummary[];
  projects: ProjectSummary[];
  socialLinks: SocialLinkSummary[];
  tags?: string[];
}

export interface AuraDetailItem {
  label: string;
  points: number;
  earned: boolean;
  reason: string;
}

export interface AuraSummary {
  total: number;
  breakdown: {
    profile: number;       // Profile completeness
    projects: number;      // From project analysis
    skills: number;        // From verified skills
    activity: number;      // From platform activity
    github: number;        // From GitHub stats
  };
  breakdownDetails?: {
    profile: AuraDetailItem[];
    projects: AuraDetailItem[];
    skills: AuraDetailItem[];
    activity: AuraDetailItem[];
    github: AuraDetailItem[];
  };
  level: 'Novice' | 'Rising' | 'Skilled' | 'Expert' | 'Legend';
  percentile: number;      // Top X% of users
  trend: 'up' | 'down' | 'stable';
  recentGains: AuraGain[];
}

export interface AuraGain {
  type: string;
  points: number;
  description: string;
  date: Date;
}

export interface SkillSummary {
  name: string;
  category: string;
  isVerified: boolean;
  verifiedScore: number;
  projectCount: number;
  source: string;
}

export interface ProjectSummary {
  repoName: string;
  description: string | null;
  language: string | null;
  stars: number;
  overallScore: number;
  isPublic: boolean;
}

export interface SocialLinkSummary {
  platform: string;
  url: string;
  username: string | null;
}

// Settings
export interface UserSettings {
  isPublic: boolean;
  isOpenToWork: boolean;
  emailNotifications: boolean;
  showEmail: boolean;
  showLocation: boolean;
}

// Update DTOs
export interface UpdateProfileDto {
  name?: string;
  bio?: string;
  location?: string;
  company?: string;
  website?: string;
  twitterHandle?: string;
  avatarUrl?: string;
  linkedinUrl?: string;
}

export interface UpdateSettingsDto {
  isPublic?: boolean;
  isOpenToWork?: boolean;
}
