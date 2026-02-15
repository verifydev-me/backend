import type { CreateJobDto, JobFilters, Job } from '../types/index.js';
interface UserSkill {
    name: string;
    score: number;
    isVerified: boolean;
}
interface MatchResult {
    matchScore: number;
    matchedSkills: {
        skill: string;
        required: number;
        userScore: number;
        verified: boolean;
        status: 'met' | 'partial' | 'missing';
    }[];
    meetsMinimum: boolean;
}
export declare class JobService {
    /**
     * Create a new job posting
     */
    createJob(data: CreateJobDto & {
        recruiterId: string;
    }): Promise<Job>;
    /**
     * Get jobs with filters and pagination
     */
    getJobs(filters: JobFilters, page?: number, limit?: number): Promise<{
        jobs: Job[];
        total: number;
    }>;
    /**
     * Get job by ID
     */
    getJobById(jobId: string): Promise<Job | null>;
    /**
     * Get all jobs posted by a specific recruiter
     */
    getJobsByRecruiter(recruiterId: string, page?: number, limit?: number): Promise<{
        jobs: Job[];
        total: number;
    }>;
    /**
     * Get matched jobs for a user based on their skills
     */
    getMatchedJobs(userId: string, userSkills: UserSkill[], auraScore: number, page?: number, limit?: number): Promise<{
        jobs: (Job & {
            matchResult: MatchResult;
        })[];
        total: number;
    }>;
    /**
     * Get recommended jobs based on user profile
     * OPTIMIZED: Faster with caching and parallel processing
     */
    getRecommendedJobs(userId: string, page?: number, limit?: number): Promise<{
        jobs: (Job & {
            matchResult: MatchResult;
        })[];
        total: number;
    }>;
    /**
     * Calculate skill match between user and job
     */
    static calculateSkillMatch(userSkills: UserSkill[], jobSkills: string[], userAura: number, minAura: number): MatchResult;
    /**
     * Increment view count
     */
    incrementViews(jobId: string): Promise<void>;
    /**
     * Increment application count
     */
    incrementApplications(jobId: string): Promise<void>;
    /**
     * Update job status
     */
    updateJobStatus(jobId: string, status: 'ACTIVE' | 'PAUSED' | 'CLOSED'): Promise<Job | null>;
    /**
     * Search jobs with advanced filters
     */
    searchJobs(params: {
        query?: string;
        skills?: string[];
        type?: string[];
        level?: string[];
        isRemote?: boolean;
        salaryMin?: number;
        salaryMax?: number;
        location?: string;
        sortBy?: 'relevance' | 'date' | 'salary';
        page?: number;
        limit?: number;
    }): Promise<{
        jobs: Job[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    /**
     * Seed demo jobs for development
     */
    seedDemoJobs(): Promise<void>;
    /**
     * Update a job
     */
    updateJob(jobId: string, updateData: Partial<CreateJobDto>): Promise<Job>;
    /**
     * Delete a job (soft delete by setting status to CLOSED)
     */
    deleteJob(jobId: string): Promise<void>;
    /**
     * Get recruiter's posted jobs
     */
    getRecruiterJobs(recruiterId: string): Promise<Job[]>;
    /**
     * Toggle save/bookmark a job
     */
    toggleSaveJob(userId: string, jobId: string): Promise<{
        saved: boolean;
    }>;
    /**
     * Get user's saved jobs
     */
    getSavedJobs(userId: string): Promise<Job[]>;
}
export default JobService;
