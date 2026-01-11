import { Request, Response } from 'express';
import { JobService } from '../../../domain/job.service.js';
import { ApplicationService } from '../../../domain/application.service.js';
import { createJobSchema, jobFiltersSchema, applyJobSchema } from '../validators/job.schema.js';
import { logger } from '../../../utils/logger.js';
import type { AuthenticatedRequest, ApiResponse } from '../../../types/index.js';

export class JobController {
  // ==================== RECRUITER ENDPOINTS ====================

  /**
   * POST /jobs
   * Create a new job posting (recruiter only)
   */
  static async createJob(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({ success: false, message: 'Unauthorized - User not authenticated', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      // Validate request body
      const validation = createJobSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          error: { code: 'VALIDATION_ERROR', details: validation.error.format() },
        });
        return;
      }

      // Create job with recruiter ID from authenticated user
      const jobService = new JobService();
      const job = await jobService.createJob({
        ...validation.data,
        recruiterId: req.user.userId,
        expiresAt: validation.data.expiresAt ? new Date(validation.data.expiresAt) : undefined,
      });

      res.status(201).json({
        success: true,
        message: 'Job posted successfully! 🎉',
        data: { job },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to create job');
      const errorMessage = error instanceof Error ? error.message : 'Failed to create job';
      res.status(500).json({ 
        success: false, 
        message: errorMessage, 
        error: { code: 'INTERNAL_ERROR' } 
      });
    }
  }

  // ==================== PUBLIC ENDPOINTS ====================

  /**
   * GET /jobs
   * List jobs with filters
   */
  static async listJobs(req: Request, res: Response<ApiResponse>): Promise<void> {
    try {
      // Parse query parameters (URL query params are always strings)
      const queryParams = {
        ...req.query,
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      };

      const result = jobFiltersSchema.safeParse(queryParams);
      if (!result.success) {
        res.status(400).json({
          success: false,
          message: 'Invalid filters',
          error: { code: 'VALIDATION_ERROR', details: result.error.format() },
        });
        return;
      }

      const { page, limit, ...filters } = result.data;
      const jobService = new JobService();
      const { jobs, total } = await jobService.getJobs(filters, page, limit);

      res.json({
        success: true,
        message: 'Jobs retrieved',
        data: { jobs },
        meta: { page, limit, total },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to list jobs');
      res.status(500).json({ success: false, message: 'Failed to get jobs', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * GET /jobs/search
   * Advanced job search with multiple filters
   */
  static async searchJobs(req: Request, res: Response<ApiResponse>): Promise<void> {
    try {
      const params = {
        query: req.query.q as string,
        skills: req.query.skills ? (req.query.skills as string).split(',') : undefined,
        type: req.query.type ? (req.query.type as string).split(',') : undefined,
        level: req.query.level ? (req.query.level as string).split(',') : undefined,
        isRemote: req.query.isRemote !== undefined ? req.query.isRemote === 'true' : undefined,
        salaryMin: req.query.salaryMin ? parseInt(req.query.salaryMin as string) : undefined,
        salaryMax: req.query.salaryMax ? parseInt(req.query.salaryMax as string) : undefined,
        location: req.query.location as string,
        sortBy: (req.query.sortBy as 'relevance' | 'date' | 'salary') || 'date',
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
      };

      const jobService = new JobService();
      const result = await jobService.searchJobs(params);

      res.json({
        success: true,
        message: 'Search results',
        data: { jobs: result.jobs },
        meta: {
          page: result.page,
          limit: params.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to search jobs');
      res.status(500).json({ success: false, message: 'Search failed', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * GET /jobs/:jobId
   * Get job details
   */
  static async getJob(req: Request, res: Response<ApiResponse>): Promise<void> {
    try {
      const { jobId } = req.params;
      const jobService = new JobService();
      const job = await jobService.getJobById(jobId);

      if (!job) {
        res.status(404).json({ success: false, message: 'Job not found', error: { code: 'NOT_FOUND' } });
        return;
      }

      // Increment views
      await jobService.incrementViews(jobId);

      res.json({
        success: true,
        message: 'Job retrieved',
        data: { job },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get job');
      res.status(500).json({ success: false, message: 'Failed to get job', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * GET /jobs/:jobId/match
   * Get job with user's match score (requires auth)
   */
  static async getJobWithMatch(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const { jobId } = req.params;
      const jobService = new JobService();
      const job = await jobService.getJobById(jobId);

      if (!job) {
        res.status(404).json({ success: false, message: 'Job not found', error: { code: 'NOT_FOUND' } });
        return;
      }

      // Increment views
      await jobService.incrementViews(jobId);

      // If user is authenticated, show match info
      let matchInfo = null;
      if (req.user && req.user.userId) {
        const applicationService = new ApplicationService();
        const canApplyResult = await applicationService.canApply(req.user.userId, jobId);
        matchInfo = {
          canApply: canApplyResult.can,
          matchScore: canApplyResult.matchScore,
          reason: canApplyResult.reason,
        };
      }

      res.json({
        success: true,
        message: 'Job retrieved',
        data: { job, matchInfo },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get job');
      res.status(500).json({ success: false, message: 'Failed to get job', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  // ==================== USER ENDPOINTS ====================

  /**
   * GET /jobs/matched
   * Get jobs matched to user's skills
   */
  static async getMatchedJobs(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      // Fetch user's matched jobs directly (service handles user data fetching)
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const jobService = new JobService();
      const result = await jobService.getRecommendedJobs(req.user.userId, page, limit);

      res.json({
        success: true,
        message: 'Matched jobs retrieved',
        data: { 
          jobs: result.jobs,
          totalMatched: result.total,
          meta: { page, limit, total: result.total }
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get matched jobs');
      res.status(500).json({ success: false, message: 'Failed to get jobs', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * GET /jobs/recommended
   * Get recommended jobs (alias for matched)
   */
  static async getRecommendedJobs(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void> {
    return JobController.getMatchedJobs(req, res);
  }

  /**
   * POST /jobs/:jobId/apply
   * Apply to a job
   */
  static async applyToJob(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const { jobId } = req.params;

      const validation = applyJobSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          error: { code: 'VALIDATION_ERROR', details: validation.error.format() },
        });
        return;
      }

      // Check if can apply
      const applicationService = new ApplicationService();
      const canApply = await applicationService.canApply(req.user.userId, jobId);
      if (!canApply.can) {
        res.status(400).json({
          success: false,
          message: canApply.reason || 'Cannot apply to this job',
          error: { code: 'CANNOT_APPLY', details: { matchScore: canApply.matchScore } },
        });
        return;
      }

      const application = await applicationService.apply(
        req.user.userId,
        jobId,
        validation.data
      );

      res.status(201).json({
        success: true,
        message: 'Application submitted successfully! 🎉',
        data: { 
          application,
        },
      });
    } catch (error: any) {
      if (error.message === 'Already applied to this job') {
        res.status(409).json({
          success: false,
          message: 'You have already applied to this job',
          error: { code: 'ALREADY_APPLIED' },
        });
        return;
      }
      logger.error({ error }, 'Failed to apply');
      res.status(500).json({ success: false, message: 'Failed to apply', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * GET /jobs/:jobId/can-apply
   * Check if user can apply to job
   */
  static async checkCanApply(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const { jobId } = req.params;
      const applicationService = new ApplicationService();
      const result = await applicationService.canApply(req.user.userId, jobId);

      res.json({
        success: true,
        message: result.can ? 'You can apply to this job' : (result.reason || 'Cannot apply'),
        data: {
          canApply: result.can,
          matchScore: result.matchScore,
          reason: result.reason,
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to check application eligibility');
      res.status(500).json({ success: false, message: 'Check failed', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * GET /applications
   * Get user's applications
   */
  static async getMyApplications(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const applicationService = new ApplicationService();
      const applications = await applicationService.getUserApplications(req.user.userId);

      res.json({
        success: true,
        message: 'Applications retrieved',
        data: { 
          applications,
          total: applications.length,
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get applications');
      res.status(500).json({ success: false, message: 'Failed to get applications', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * GET /applications/:applicationId
   * Get single application
   */
  static async getApplication(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const { applicationId } = req.params;
      const applicationService = new ApplicationService();
      const application = await applicationService.getApplicationById(applicationId);

      if (!application || application.userId !== req.user.userId) {
        res.status(404).json({ success: false, message: 'Application not found', error: { code: 'NOT_FOUND' } });
        return;
      }

      res.json({
        success: true,
        message: 'Application retrieved',
        data: { application },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get application');
      res.status(500).json({ success: false, message: 'Failed to get application', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * DELETE /applications/:applicationId
   * Withdraw application
   */
  static async withdrawApplication(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const { applicationId } = req.params;
      const applicationService = new ApplicationService();
      const success = await applicationService.withdraw(applicationId, req.user.userId);

      if (!success) {
        res.status(404).json({ success: false, message: 'Application not found', error: { code: 'NOT_FOUND' } });
        return;
      }

      res.json({
        success: true,
        message: 'Application withdrawn',
      });
    } catch (error: any) {
      if (error.message === 'Application already withdrawn') {
        res.status(400).json({
          success: false,
          message: 'Application already withdrawn',
          error: { code: 'ALREADY_WITHDRAWN' },
        });
        return;
      }
      logger.error({ error }, 'Failed to withdraw');
      res.status(500).json({ success: false, message: 'Failed to withdraw', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  // ==================== RECRUITER-SPECIFIC ENDPOINTS ====================

  /**
   * GET /recruiter/jobs
   * Get all jobs posted by the authenticated recruiter
   */
  static async getRecruiterJobs(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const jobService = new JobService();
      const { jobs, total } = await jobService.getJobsByRecruiter(req.user.userId, page, limit);

      res.json({
        success: true,
        message: 'Jobs retrieved',
        data: { jobs },
        meta: { page, limit, total },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get recruiter jobs');
      res.status(500).json({ success: false, message: 'Failed to get jobs', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * GET /recruiter/jobs/:jobId
   * Get single job details for recruiter (with full stats)
   */
  static async getRecruiterJobDetails(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const { jobId } = req.params;
      const jobService = new JobService();
      const job = await jobService.getJobById(jobId);

      if (!job) {
        res.status(404).json({ success: false, message: 'Job not found', error: { code: 'NOT_FOUND' } });
        return;
      }

      // Verify the job belongs to this recruiter
      if (job.recruiterId !== req.user.userId) {
        res.status(403).json({ success: false, message: 'Forbidden', error: { code: 'FORBIDDEN' } });
        return;
      }

      res.json({
        success: true,
        message: 'Job retrieved',
        data: { job },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get job details');
      res.status(500).json({ success: false, message: 'Failed to get job', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * GET /recruiter/jobs/:jobId/analytics
   * Get analytics for a specific job
   */
  static async getJobAnalytics(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const { jobId } = req.params;
      const jobService = new JobService();
      const job = await jobService.getJobById(jobId);

      if (!job) {
        res.status(404).json({ success: false, message: 'Job not found', error: { code: 'NOT_FOUND' } });
        return;
      }

      // Verify the job belongs to this recruiter
      if (job.recruiterId !== req.user.userId) {
        res.status(403).json({ success: false, message: 'Forbidden', error: { code: 'FORBIDDEN' } });
        return;
      }

      // Get application stats
      const applicationService = new ApplicationService();
      const applications = await applicationService.getApplicationsByJob(jobId);
      
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const applicationsThisWeek = applications.filter(
        (app: any) => new Date(app.createdAt) >= oneWeekAgo
      ).length;

      const shortlisted = applications.filter(
        (app: any) => app.status === 'SHORTLISTED'
      ).length;

      const hired = applications.filter(
        (app: any) => app.status === 'ACCEPTED'
      ).length;

      res.json({
        success: true,
        message: 'Analytics retrieved',
        data: {
          analytics: {
            views: job.viewsCount || 0,
            applications: job.applicationsCount || 0,
            shortlisted,
            hired,
            viewsThisWeek: 0, // TODO: Implement view tracking
            applicationsThisWeek,
          },
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get analytics');
      res.status(500).json({ success: false, message: 'Failed to get analytics', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * GET /recruiter/jobs/:jobId/applicants
   * Get all applicants for a specific job
   */
  static async getJobApplicants(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const { jobId } = req.params;
      const jobService = new JobService();
      const job = await jobService.getJobById(jobId);

      if (!job) {
        res.status(404).json({ success: false, message: 'Job not found', error: { code: 'NOT_FOUND' } });
        return;
      }

      // Verify the job belongs to this recruiter
      if (job.recruiterId !== req.user.userId) {
        res.status(403).json({ success: false, message: 'Forbidden', error: { code: 'FORBIDDEN' } });
        return;
      }

      const applicationService = new ApplicationService();
      const applications = await applicationService.getApplicationsByJob(jobId);

      res.json({
        success: true,
        message: 'Applicants retrieved',
        data: { applications },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get applicants');
      res.status(500).json({ success: false, message: 'Failed to get applicants', error: { code: 'INTERNAL_ERROR' } });
    }
  }
}

export default JobController;
