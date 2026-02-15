import { Request, Response } from 'express';
import type { AuthenticatedRequest, ApiResponse } from '../../../types/index.js';
export declare class JobController {
    /**
     * POST /jobs
     * Create a new job posting (recruiter only)
     */
    static createJob(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * GET /jobs
     * List jobs with filters
     */
    static listJobs(req: Request, res: Response<ApiResponse>): Promise<void>;
    /**
     * GET /jobs/search
     * Advanced job search with multiple filters
     */
    static searchJobs(req: Request, res: Response<ApiResponse>): Promise<void>;
    /**
     * GET /jobs/:jobId
     * Get job details
     */
    static getJob(req: Request, res: Response<ApiResponse>): Promise<void>;
    /**
     * GET /jobs/:jobId/match
     * Get job with user's match score (requires auth)
     */
    static getJobWithMatch(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * GET /jobs/matched
     * Get jobs matched to user's skills
     */
    static getMatchedJobs(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * GET /jobs/recommended
     * Get recommended jobs (alias for matched)
     */
    static getRecommendedJobs(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * POST /jobs/:jobId/apply
     * Apply to a job
     */
    static applyToJob(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * GET /jobs/:jobId/can-apply
     * Check if user can apply to job
     */
    static checkCanApply(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * GET /applications
     * Get user's applications
     */
    static getMyApplications(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * GET /applications/:applicationId
     * Get single application
     */
    static getApplication(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * DELETE /applications/:applicationId
     * Withdraw application
     */
    static withdrawApplication(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * GET /recruiter/jobs
     * Get all jobs posted by the authenticated recruiter
     */
    static getRecruiterJobs(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * GET /recruiter/jobs/:jobId
     * Get single job details for recruiter (with full stats)
     */
    static getRecruiterJobDetails(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * GET /recruiter/jobs/:jobId/analytics
     * Get analytics for a specific job
     */
    static getJobAnalytics(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * GET /recruiter/jobs/:jobId/applicants
     * Get all applicants for a specific job
     */
    static getJobApplicants(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * PUT /jobs/:jobId
     * Update a job (recruiter only)
     */
    static updateJob(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * DELETE /jobs/:jobId
     * Delete/close a job (recruiter only)
     */
    static deleteJob(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * GET /jobs/my-jobs
     * Get recruiter's posted jobs
     */
    static getMyJobs(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * POST /jobs/:jobId/save
     * Toggle save/bookmark a job
     */
    static toggleSaveJob(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * GET /jobs/saved
     * Get saved/bookmarked jobs
     */
    static getSavedJobs(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void>;
}
export default JobController;
