import { Response } from 'express';
import { ResumeService } from '../../../domain/resume.service.js';
import { logger } from '../../../utils/logger.js';
import type { AuthenticatedRequest, ApiResponse } from '../../../types/index.js';
import { z } from 'zod';

const generateResumeSchema = z.object({
  template: z.enum(['modern', 'classic', 'developer', 'corporate']).optional(),
  format: z.enum(['pdf', 'html']).optional(),
});

export class ResumeController {
  /**
   * POST /resume/generate
   * Generate a resume
   */
  static async generateResume(
    req: AuthenticatedRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ 
          success: false, 
          message: 'Unauthorized', 
          error: { code: 'UNAUTHORIZED' } 
        });
        return;
      }

      const result = generateResumeSchema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          error: { code: 'VALIDATION_ERROR', details: result.error.format() },
        });
        return;
      }

      const resumeResult = await ResumeService.generateResume(
        req.user.userId, 
        result.data
      );

      res.status(202).json({
        success: true,
        message: 'Resume generation started',
        data: resumeResult,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to generate resume');
      
      if (error instanceof Error && error.message === 'Failed to queue resume generation') {
        res.status(503).json({
          success: false,
          message: 'Resume service temporarily unavailable',
          error: { code: 'SERVICE_UNAVAILABLE' },
        });
        return;
      }

      res.status(500).json({ 
        success: false, 
        message: 'Failed to generate resume', 
        error: { code: 'INTERNAL_ERROR' } 
      });
    }
  }
}

export default ResumeController;
