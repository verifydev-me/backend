import { Request } from 'express';
export interface AuthenticatedRequest extends Request {
    user?: {
        userId: string;
        sessionId: string;
        role?: 'user' | 'recruiter';
    };
}
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
        totalPages?: number;
    };
}
export interface Job {
    id: string;
    recruiterId: string;
    title: string;
    description: string;
    requirements: string;
    responsibilities: string;
    type: JobType;
    level: ExperienceLevel;
    category: JobCategory;
    location: string;
    isRemote: boolean;
    salaryMin?: number;
    salaryMax?: number;
    salaryCurrency: string;
    requiredSkills: string[];
    preferredSkills?: string[];
    minAuraScore: number;
    minCoreCount: number;
    status: JobStatus;
    applicationsCount: number;
    viewsCount: number;
    createdAt: Date;
    expiresAt?: Date;
}
export interface JobSkill {
    skillName: string;
    minScore: number;
    isRequired: boolean;
}
export interface Organization {
    id: string;
    name: string;
    slug: string;
    logo?: string;
    website?: string;
    description?: string;
    industry?: string;
    size: CompanySize;
    isVerified: boolean;
}
export interface Application {
    id: string;
    jobId: string;
    job?: Job;
    userId: string;
    coverLetter?: string;
    resumeUrl?: string;
    status: ApplicationStatus;
    appliedAt: Date;
    reviewedAt?: Date;
}
export type JobType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP' | 'FREELANCE';
export type ExperienceLevel = 'ENTRY' | 'JUNIOR' | 'MID' | 'SENIOR' | 'LEAD' | 'PRINCIPAL';
export type JobCategory = 'FRONTEND' | 'BACKEND' | 'FULLSTACK' | 'MOBILE' | 'DEVOPS' | 'DATA_ENGINEERING' | 'MACHINE_LEARNING' | 'SECURITY' | 'DESIGN' | 'QA' | 'GENERAL';
export type JobStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CLOSED' | 'EXPIRED';
export type ApplicationStatus = 'PENDING' | 'REVIEWING' | 'SHORTLISTED' | 'INTERVIEW' | 'OFFER' | 'REJECTED' | 'WITHDRAWN';
export type CompanySize = 'STARTUP' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'ENTERPRISE';
export interface CreateJobDto {
    title: string;
    description: string;
    requirements: string;
    responsibilities: string;
    type: JobType;
    level: ExperienceLevel;
    category?: JobCategory;
    location: string;
    isRemote: boolean;
    salaryMin?: number;
    salaryMax?: number;
    salaryCurrency?: string;
    requiredSkills: string[];
    preferredSkills?: string[];
    minAuraScore?: number;
    minCoreCount?: number;
    expiresAt?: Date;
}
export interface JobFilters {
    type?: JobType;
    level?: ExperienceLevel;
    category?: JobCategory;
    isRemote?: boolean;
    skills?: string[];
    minSalary?: number;
    location?: string;
    search?: string;
}
export interface ApplyJobDto {
    coverLetter?: string;
    resumeUrl?: string;
    candidateName?: string;
    candidateEmail?: string;
    candidateAura?: number;
    candidateCores?: number;
    candidateSkills?: string[];
    candidateProjects?: any[];
    candidateExperience?: any[];
    candidateCertifications?: any[];
}
