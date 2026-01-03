import { Request } from 'express';

export interface RecruiterRequest extends Request {
  recruiter?: {
    recruiterId: string;
    organizationId: string;
    role: RecruiterRole;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: { code: string; details?: unknown };
  meta?: { page?: number; limit?: number; total?: number };
}

// Recruiter Types
export interface Recruiter {
  id: string;
  email: string;
  name: string;
  title?: string;
  avatarUrl?: string;
  organizationId: string;
  organization?: Organization;
  role: RecruiterRole;
  isActive: boolean;
  createdAt: Date;
  lastLoginAt?: Date;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  website?: string;
  description?: string;
  headquarters?: string;
  industry?: string;
  size: CompanySize;
  foundedYear?: number;
  isVerified: boolean;
  createdAt: Date;
}

// Candidate search
export interface CandidateSearchFilters {
  skills?: string[];
  minAuraScore?: number;
  minCoreCount?: number;
  location?: string;
  isOpenToWork?: boolean;
  minSkillScore?: number;
}

export interface CandidateProfile {
  id: string;
  username: string;
  name?: string;
  avatarUrl?: string;
  bio?: string;
  location?: string;
  auraScore: number;
  coreCount: number;
  isOpenToWork: boolean;
  isVerified: boolean;
  topSkills: { name: string; score: number; isVerified: boolean }[];
  topProjects: { name: string; score: number; language: string }[];
  matchScore?: number; // How well they match job requirements
}

// Enums
export type RecruiterRole = 'ADMIN' | 'RECRUITER' | 'VIEWER';
export type CompanySize = 'STARTUP' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'ENTERPRISE';

// DTOs
export interface CreateOrganizationDto {
  name: string;
  slug: string;
  logo?: string;
  website?: string;
  description?: string;
  headquarters?: string;
  industry?: string;
  size: CompanySize;
  foundedYear?: number;
}

export interface RegisterRecruiterDto {
  email: string;
  password: string;
  name: string;
  title?: string;
  organizationId?: string; // If joining existing org
  newOrganization?: CreateOrganizationDto; // If creating new org
}

export interface LoginDto {
  email: string;
  password: string;
}
