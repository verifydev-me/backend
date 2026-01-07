import { Response } from 'express';
import { OnboardingService } from '../../../domain/onboarding.service.js';
import { logger } from '../../../utils/logger.js';
import type { AuthenticatedRequest, ApiResponse } from '../../../types/index.js';
import { z } from 'zod';

// ============================================
// VALIDATION SCHEMAS
// ============================================

const step1Schema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  bio: z.string().max(500).optional(),
});

const step2Schema = z.object({
  isStudent: z.boolean(),
  collegeName: z.string().max(200).optional(),
  collegeYear: z.number().int().min(1).max(6).optional(),
  branch: z.string().max(100).optional(),
  cgpa: z.number().min(0).max(10).optional(),
  graduationYear: z.number().int().min(2000).max(2035).optional(),
});

// ============================================
// CONTROLLER
// ============================================

export class OnboardingController {
  /**
   * GET /users/me/onboarding/status
   * Get onboarding status
   */
  static async getStatus(
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

      const status = await OnboardingService.getStatus(req.user.userId);

      if (!status) {
        res.status(404).json({
          success: false,
          message: 'User not found',
          error: { code: 'NOT_FOUND' }
        });
        return;
      }

      res.json({
        success: true,
        message: 'Onboarding status retrieved',
        data: status,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get onboarding status');
      res.status(500).json({
        success: false,
        message: 'Failed to get status',
        error: { code: 'INTERNAL_ERROR' }
      });
    }
  }

  /**
   * POST /users/me/onboarding/step/1
   * Update basic info (name, bio)
   */
  static async updateStep1(
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

      const result = step1Schema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          error: { code: 'VALIDATION_ERROR', details: result.error.format() }
        });
        return;
      }

      const user = await OnboardingService.updateStep1(req.user.userId, result.data);

      res.json({
        success: true,
        message: 'Step 1 completed',
        data: { user, nextStep: 2 },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to update step 1');
      res.status(500).json({
        success: false,
        message: 'Failed to update',
        error: { code: 'INTERNAL_ERROR' }
      });
    }
  }

  /**
   * POST /users/me/onboarding/step/2
   * Update student info (optional)
   */
  static async updateStep2(
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

      const result = step2Schema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          error: { code: 'VALIDATION_ERROR', details: result.error.format() }
        });
        return;
      }

      const user = await OnboardingService.updateStep2(req.user.userId, result.data);

      res.json({
        success: true,
        message: 'Step 2 completed',
        data: { user, nextStep: 3 },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to update step 2');
      res.status(500).json({
        success: false,
        message: 'Failed to update',
        error: { code: 'INTERNAL_ERROR' }
      });
    }
  }

  /**
   * POST /users/me/onboarding/step/2/skip
   * Skip student info
   */
  static async skipStep2(
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

      const user = await OnboardingService.skipStep2(req.user.userId);

      res.json({
        success: true,
        message: 'Step 2 skipped',
        data: { user, nextStep: 3 },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to skip step 2');
      res.status(500).json({
        success: false,
        message: 'Failed to skip',
        error: { code: 'INTERNAL_ERROR' }
      });
    }
  }

  /**
   * POST /users/me/onboarding/complete
   * Mark onboarding as complete
   */
  static async complete(
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

      const user = await OnboardingService.complete(req.user.userId);

      res.json({
        success: true,
        message: 'Onboarding completed! Welcome to VerifyDev 🚀',
        data: { user },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to complete onboarding');
      res.status(500).json({
        success: false,
        message: 'Failed to complete',
        error: { code: 'INTERNAL_ERROR' }
      });
    }
  }
}

export default OnboardingController;
