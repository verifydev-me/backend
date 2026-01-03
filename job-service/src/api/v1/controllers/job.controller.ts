import { Request, Response } from 'express';
import { JobService } from '../../../domain/job.service.js';
import { ApplicationService } from '../../../domain/application.service.js';
import { createJobSchema, jobFiltersSchema, applyJobSchema } from '../validators/job.schema.js';
import { logger } from '../../../utils/logger.js';
import type { AuthenticatedRequest, ApiResponse } from '../../../types/index.js';

export class JobController {
  // ==================== PUBLIC ENDPOINTS ====================

  /**
   * GET /jobs
   * List jobs with filters
   */
  static async listJobs(req: Request, res: Response<ApiResponse>): Promise<void> {
    try {
      const result = jobFiltersSchema.safeParse(req.query);
      if (!result.success) {
        res.status(400).json({
          success: false,
          message: 'Invalid filters',
          error: { code: 'VALIDATION_ERROR', details: result.error.format() },
        });
        return;
      }

      const { page, limit, ...filters } = result.data;
      const { jobs, total } = await JobService.getJobs(filters, page, limit);

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
   * GET /jobs/:jobId
   * Get job details
   */
  static async getJob(req: Request, res: Response<ApiResponse>): Promise<void> {
    try {
      const { jobId } = req.params;
      const job = await JobService.getJobById(jobId);

      if (!job) {
        res.status(404).json({ success: false, message: 'Job not found', error: { code: 'NOT_FOUND' } });
        return;
      }

      // Increment views
      await JobService.incrementViews(jobId);

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

  // ==================== USER ENDPOINTS ====================

  /**
   * GET /jobs/matched
   * Get jobs matched to user's skills
   */
  static async getMatchedJobs(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      // Would fetch user's skills and aura from User Service
      const userSkills = [{ name: 'React', score: 80 }];
      const auraScore = 350;

      const jobs = await JobService.getMatchedJobs(req.user.userId, userSkills, auraScore);

      res.json({
        success: true,
        message: 'Matched jobs retrieved',
        data: { jobs },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get matched jobs');
      res.status(500).json({ success: false, message: 'Failed to get jobs', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * POST /jobs/:jobId/apply
   * Apply to a job
   */
  static async applyToJob(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      if (!req.user) {
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
      const canApply = await ApplicationService.canApply(req.user.userId, jobId);
      if (!canApply.can) {
        res.status(400).json({
          success: false,
          message: canApply.reason || 'Cannot apply to this job',
          error: { code: 'CANNOT_APPLY' },
        });
        return;
      }

      const application = await ApplicationService.apply(req.user.userId, jobId, validation.data);

      res.status(201).json({
        success: true,
        message: 'Application submitted',
        data: { application },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to apply');
      res.status(500).json({ success: false, message: 'Failed to apply', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * GET /applications
   * Get user's applications
   */
  static async getMyApplications(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const applications = await ApplicationService.getUserApplications(req.user.userId);

      res.json({
        success: true,
        message: 'Applications retrieved',
        data: { applications },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get applications');
      res.status(500).json({ success: false, message: 'Failed to get applications', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * DELETE /applications/:applicationId
   * Withdraw application
   */
  static async withdrawApplication(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const { applicationId } = req.params;
      const success = await ApplicationService.withdraw(applicationId, req.user.userId);

      if (!success) {
        res.status(404).json({ success: false, message: 'Application not found', error: { code: 'NOT_FOUND' } });
        return;
      }

      res.json({
        success: true,
        message: 'Application withdrawn',
      });
    } catch (error) {
      logger.error({ error }, 'Failed to withdraw');
      res.status(500).json({ success: false, message: 'Failed to withdraw', error: { code: 'INTERNAL_ERROR' } });
    }
  }
}

export default JobController;
