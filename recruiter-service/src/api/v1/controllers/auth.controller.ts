import { Request, Response } from 'express';
import { AuthService } from '../../../domain/auth.service.js';
import { logger } from '../../../utils/logger.js';
import type { ApiResponse, RecruiterRequest } from '../../../types/index.js';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  organizationName: z.string().optional(),
  organizationWebsite: z.string().url().optional(),
  organizationType: z.enum(['STARTUP', 'SMB', 'ENTERPRISE', 'AGENCY', 'NONPROFIT']).optional(),
  organizationSize: z.enum(['STARTUP', 'SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE']).optional(),
  position: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export class AuthController {
  /**
   * POST /auth/register
   * Register a new recruiter and organization
   */
  static async register(req: Request, res: Response<ApiResponse>): Promise<void> {
    try {
      const validation = registerSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          error: { code: 'VALIDATION_ERROR', details: validation.error.format() },
        });
        return;
      }

      const registerData = {
        ...validation.data,
        organizationName: validation.data.organizationName || 'Independent Recruiter',
      };

      const result = await AuthService.register(registerData as any);

      if (!result.success) {
        const statusCode = result.error === 'EMAIL_EXISTS' ? 409 : 400;
        res.status(statusCode).json({
          success: false,
          message: result.message || 'Registration failed',
          error: { code: result.error || 'REGISTRATION_FAILED' },
        });
        return;
      }

      res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: {
          recruiter: result.recruiter,
          organization: result.organization,
          accessToken: result.tokens?.accessToken,
          refreshToken: result.tokens?.refreshToken,
        },
      });
    } catch (error) {
      logger.error({ error }, 'Registration failed');
      res.status(500).json({
        success: false,
        message: 'Registration failed',
        error: { code: 'INTERNAL_ERROR' },
      });
    }
  }

  /**
   * POST /auth/login
   * Login a recruiter
   */
  static async login(req: Request, res: Response<ApiResponse>): Promise<void> {
    try {
      const validation = loginSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          error: { code: 'VALIDATION_ERROR', details: validation.error.format() },
        });
        return;
      }

      const { email, password } = validation.data;
      const result = await AuthService.login(email, password);

      if (!result.success) {
        res.status(401).json({
          success: false,
          message: result.message || 'Invalid credentials',
          error: { code: result.error || 'INVALID_CREDENTIALS' },
        });
        return;
      }

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          recruiter: result.recruiter,
          organization: result.organization,
          accessToken: result.tokens?.accessToken,
          refreshToken: result.tokens?.refreshToken,
        },
      });
    } catch (error) {
      logger.error({ error }, 'Login failed');
      res.status(500).json({
        success: false,
        message: 'Login failed',
        error: { code: 'INTERNAL_ERROR' },
      });
    }
  }

  /**
   * POST /auth/refresh
   * Refresh access token
   */
  static async refresh(req: Request, res: Response<ApiResponse>): Promise<void> {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        res.status(400).json({
          success: false,
          message: 'Refresh token required',
          error: { code: 'MISSING_TOKEN' },
        });
        return;
      }

      const result = await AuthService.refreshTokens(refreshToken);

      if (!result.success) {
        res.status(401).json({
          success: false,
          message: result.message || 'Invalid refresh token',
          error: { code: result.error || 'INVALID_TOKEN' },
        });
        return;
      }

      res.json({
        success: true,
        message: 'Token refreshed',
        data: {
          accessToken: result.tokens?.accessToken,
          refreshToken: result.tokens?.refreshToken,
        },
      });
    } catch (error) {
      logger.error({ error }, 'Token refresh failed');
      res.status(500).json({
        success: false,
        message: 'Token refresh failed',
        error: { code: 'INTERNAL_ERROR' },
      });
    }
  }

  /**
   * GET /auth/me
   * Get current recruiter info
   */
  static async me(req: RecruiterRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      if (!req.recruiter) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated',
          error: { code: 'UNAUTHORIZED' },
        });
        return;
      }

      const result = await AuthService.getRecruiterWithOrganization(req.recruiter.id);

      if (!result) {
        res.status(404).json({
          success: false,
          message: 'Recruiter not found',
          error: { code: 'NOT_FOUND' },
        });
        return;
      }

      res.json({
        success: true,
        message: 'Recruiter found',
        data: {
          recruiter: result.recruiter,
          organization: result.organization,
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get current recruiter');
      res.status(500).json({
        success: false,
        message: 'Failed to get recruiter',
        error: { code: 'INTERNAL_ERROR' },
      });
    }
  }

  /**
   * PUT /auth/profile
   * Update recruiter profile
   */
  static async updateProfile(req: RecruiterRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      if (!req.recruiter) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated',
          error: { code: 'UNAUTHORIZED' },
        });
        return;
      }

      const result = await AuthService.updateProfile(req.recruiter.id, req.body);

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.message || 'Update failed',
          error: { code: result.error || 'UPDATE_FAILED' },
        });
        return;
      }

      res.json({
        success: true,
        message: 'Profile updated',
        data: { recruiter: result.recruiter },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to update profile');
      res.status(500).json({
        success: false,
        message: 'Failed to update profile',
        error: { code: 'INTERNAL_ERROR' },
      });
    }
  }

  /**
   * POST /auth/logout
   * Logout recruiter
   */
  static async logout(_req: RecruiterRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      logger.error({ error }, 'Logout failed');
      res.status(500).json({
        success: false,
        message: 'Logout failed',
        error: { code: 'INTERNAL_ERROR' },
      });
    }
  }
}

export default AuthController;
