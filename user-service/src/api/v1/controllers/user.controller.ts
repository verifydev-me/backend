import { Request, Response } from 'express';
import { ProfileService } from '../../../domain/profile.service.js';
import { AuraService } from '../../../domain/aura.service.js';
import { VisibilityService } from '../../../domain/visibility.service.js';
import { LeetcodeService } from '../../../domain/leetcode.service.js';
import { GitHubService } from '../../../domain/github.service.js';
import { updateProfileSchema, updateSettingsSchema } from '../validators/user.schema.js';
import { logger } from '../../../utils/logger.js';
import { uploadImage, isCloudinaryConfigured } from '../../../utils/cloudinary.js';
import { prisma } from '../../../prisma/client.js';
import type { AuthenticatedRequest, ApiResponse } from '../../../types/index.js';

export class UserController {
  // ============================================
  // PRIVATE ENDPOINTS (Authenticated User)
  // ============================================

  /**
   * GET /users/me
   * Get current user's full profile
   */
  static async getMyProfile(
    req: AuthenticatedRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const profile = await ProfileService.getMyProfile(req.user.userId);

      if (!profile) {
        res.status(404).json({ success: false, message: 'Profile not found', error: { code: 'NOT_FOUND' } });
        return;
      }

      res.json({
        success: true,
        message: 'Profile retrieved',
        data: { profile },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get profile');
      res.status(500).json({ success: false, message: 'Failed to get profile', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * PUT /users/me
   * Update current user's profile
   */
  static async updateMyProfile(
    req: AuthenticatedRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      // Validate input
      const result = updateProfileSchema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          error: { code: 'VALIDATION_ERROR', details: result.error.format() },
        });
        return;
      }

      const profile = await ProfileService.updateProfile(req.user.userId, result.data);

      if (!profile) {
        res.status(404).json({ success: false, message: 'Profile not found', error: { code: 'NOT_FOUND' } });
        return;
      }

      // Recalculate aura after profile update
      await AuraService.updateAuraScore(req.user.userId);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: { profile },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to update profile');
      res.status(500).json({ success: false, message: 'Failed to update profile', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * GET /users/settings
   * Get user settings
   */
  static async getSettings(
    req: AuthenticatedRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const settings = await VisibilityService.getSettings(req.user.userId);

      if (!settings) {
        res.status(404).json({ success: false, message: 'Settings not found', error: { code: 'NOT_FOUND' } });
        return;
      }

      res.json({
        success: true,
        message: 'Settings retrieved',
        data: { settings },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get settings');
      res.status(500).json({ success: false, message: 'Failed to get settings', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * PUT /users/settings
   * Update user settings
   */
  static async updateSettings(
    req: AuthenticatedRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const result = updateSettingsSchema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          error: { code: 'VALIDATION_ERROR', details: result.error.format() },
        });
        return;
      }

      const settings = await VisibilityService.updateSettings(req.user.userId, result.data);

      res.json({
        success: true,
        message: 'Settings updated successfully',
        data: { settings },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to update settings');
      res.status(500).json({ success: false, message: 'Failed to update settings', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * GET /users/me/aura
   * Get current user's aura summary
   */
  static async getMyAura(
    req: AuthenticatedRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const aura = await AuraService.getAuraSummary(req.user.userId);

      if (!aura) {
        res.status(404).json({ success: false, message: 'User not found', error: { code: 'NOT_FOUND' } });
        return;
      }

      res.json({
        success: true,
        message: 'Aura summary retrieved',
        data: aura, // Return directly, not nested
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get aura');
      res.status(500).json({ success: false, message: 'Failed to get aura', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * POST /users/me/sync-github
   * Sync GitHub profile data
   */
  static async syncGitHub(
    req: AuthenticatedRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      // For now, just return success - GitHub sync happens at login
      res.json({
        success: true,
        message: 'GitHub profile synced',
      });
    } catch (error) {
      logger.error({ error }, 'Failed to sync GitHub');
      res.status(500).json({ success: false, message: 'Failed to sync', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * POST /users/me/avatar
   * Upload custom avatar image
   */
  static async uploadAvatar(
    req: AuthenticatedRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      // Check if Cloudinary is configured
      if (!isCloudinaryConfigured()) {
        res.status(503).json({
          success: false,
          message: 'Image upload service not configured',
          error: { code: 'SERVICE_UNAVAILABLE' }
        });
        return;
      }

      const { image } = req.body as { image?: string };

      if (!image) {
        res.status(400).json({
          success: false,
          message: 'Image is required. Provide base64 encoded image.',
          error: { code: 'VALIDATION_ERROR' }
        });
        return;
      }

      // Validate base64 image size (max 5MB)
      const base64Size = (image.length * 3) / 4;
      if (base64Size > 5 * 1024 * 1024) {
        res.status(400).json({
          success: false,
          message: 'Image too large. Maximum size is 5MB.',
          error: { code: 'VALIDATION_ERROR' }
        });
        return;
      }

      // Upload to Cloudinary
      const result = await uploadImage(image, 'avatars', `user_${req.user.userId}`);

      // Update user's avatarUrl in database
      const profile = await ProfileService.updateProfile(req.user.userId, {
        avatarUrl: result.url,
      });

      logger.info({ userId: req.user.userId, avatarUrl: result.url }, 'Avatar uploaded successfully');

      res.json({
        success: true,
        message: 'Avatar uploaded successfully',
        data: {
          avatarUrl: result.url,
          profile
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to upload avatar');
      res.status(500).json({ success: false, message: 'Failed to upload avatar', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * GET /users/:userId/skills-summary
   * Internal endpoint for job service to get user skills
   */
  static async getSkillsSummary(
    req: Request,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      const { userId } = req.params;

      const [skills, user] = await Promise.all([
        ProfileService.getUserSkills(userId),
        ProfileService.getMyProfile(userId)
      ]);

      if (!user) {
        res.status(404).json({ success: false, message: 'User not found', error: { code: 'NOT_FOUND' } });
        return;
      }

      res.json({
        success: true,
        message: 'Skills summary retrieved',
        data: {
          skills: skills.map(s => ({
            name: s.name,
            score: s.verifiedScore || 0,
            isVerified: s.isVerified
          })),
          auraScore: user.auraScore
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get skills summary');
      res.status(500).json({ success: false, message: 'Failed to get skills summary', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * GET /users/me/skills
   * Get current user's skills
   */
  static async getMySkills(
    req: AuthenticatedRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const skills = await ProfileService.getUserSkills(req.user.userId);

      res.json({
        success: true,
        message: 'Skills retrieved',
        data: skills,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get skills');
      res.status(500).json({ success: false, message: 'Failed to get skills', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  // ============================================
  // PUBLIC ENDPOINTS
  // ============================================

  /**
   * GET /u/:username
   * Get public profile by username
   */
  static async getPublicProfile(
    req: Request<{ username: string }>,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      const { username } = req.params;

      const profile = await ProfileService.getPublicProfile(username);

      if (!profile) {
        res.status(404).json({
          success: false,
          message: 'Profile not found or private',
          error: { code: 'NOT_FOUND' },
        });
        return;
      }

      res.json({
        success: true,
        message: 'Public profile retrieved',
        data: { profile },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get public profile');
      res.status(500).json({ success: false, message: 'Failed to get profile', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * GET /u/:username/aura
   * Get public aura by username
   */
  static async getPublicAura(
    req: Request<{ username: string }>,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      const { username } = req.params;

      const aura = await AuraService.getPublicAura(username);

      if (!aura) {
        res.status(404).json({
          success: false,
          message: 'Aura not found or profile is private',
          error: { code: 'NOT_FOUND' },
        });
        return;
      }

      res.json({
        success: true,
        message: 'Aura retrieved',
        data: { aura },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get public aura');
      res.status(500).json({ success: false, message: 'Failed to get aura', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * GET /u/:username/projects
   * Get public projects by username
   */
  static async getPublicProjects(
    req: Request<{ username: string }>,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      const { username } = req.params;

      const projects = await ProfileService.getUserProjects(username);

      res.json({
        success: true,
        message: 'Projects retrieved',
        data: { projects },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get public projects');
      res.status(500).json({ success: false, message: 'Failed to get projects', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  // ============================================
  // LEETCODE ENDPOINTS
  // ============================================

  /**
   * PUT /users/me/leetcode
   * Connect LeetCode account by username
   */
  static async connectLeetcode(
    req: AuthenticatedRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const { username } = req.body;
      if (!username || typeof username !== 'string' || username.trim().length === 0) {
        res.status(400).json({
          success: false,
          message: 'LeetCode username is required',
          error: { code: 'VALIDATION_ERROR' },
        });
        return;
      }

      const cleanUsername = username.trim();

      // Validate username exists on LeetCode
      const isValid = await LeetcodeService.validateUsername(cleanUsername);
      if (!isValid) {
        res.status(400).json({
          success: false,
          message: 'LeetCode username not found. Please check the username and try again.',
          error: { code: 'INVALID_USERNAME' },
        });
        return;
      }

      // Save to database
      await prisma.user.update({
        where: { id: req.user.userId },
        data: { leetcodeUsername: cleanUsername },
      });

      logger.info({ userId: req.user.userId, leetcodeUsername: cleanUsername }, 'LeetCode connected');

      res.json({
        success: true,
        message: 'LeetCode account connected successfully',
        data: { leetcodeUsername: cleanUsername },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to connect LeetCode');
      res.status(500).json({ success: false, message: 'Failed to connect LeetCode', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * DELETE /users/me/leetcode
   * Disconnect LeetCode account
   */
  static async disconnectLeetcode(
    req: AuthenticatedRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      await prisma.user.update({
        where: { id: req.user.userId },
        data: { leetcodeUsername: null },
      });

      logger.info({ userId: req.user.userId }, 'LeetCode disconnected');

      res.json({
        success: true,
        message: 'LeetCode account disconnected',
      });
    } catch (error) {
      logger.error({ error }, 'Failed to disconnect LeetCode');
      res.status(500).json({ success: false, message: 'Failed to disconnect LeetCode', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * GET /users/me/leetcode
   * Get LeetCode stats for connected account
   */
  static async getLeetcodeStats(
    req: AuthenticatedRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { leetcodeUsername: true },
      });

      if (!user?.leetcodeUsername) {
        res.status(404).json({
          success: false,
          message: 'LeetCode account not connected',
          error: { code: 'NOT_CONNECTED' },
        });
        return;
      }

      const profile = await LeetcodeService.getProfile(user.leetcodeUsername);

      if (!profile) {
        res.status(502).json({
          success: false,
          message: 'Failed to fetch LeetCode data. Please try again later.',
          error: { code: 'EXTERNAL_API_ERROR' },
        });
        return;
      }

      res.json({
        success: true,
        message: 'LeetCode stats retrieved',
        data: profile,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get LeetCode stats');
      res.status(500).json({ success: false, message: 'Failed to get LeetCode stats', error: { code: 'INTERNAL_ERROR' } });
    }
  }
  /**
   * GET /users/me/github
   * Get GitHub stats for connected account
   */
  static async getGithubStats(
    req: AuthenticatedRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      // Allow unauthenticated requests for public profiles if we pass a username query param?
      // For now, keep it authenticated for "me"
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: {
          githubId: true,
          username: true,
          githubAccessToken: true
        },
      });

      // GitHub username = username when user logged in via GitHub (githubId exists)
      const githubUsername = user?.githubId ? user.username : null;

      logger.info({
        userId: req.user.userId,
        githubUsername,
        githubId: user?.githubId,
        hasToken: !!user?.githubAccessToken
      }, 'Fetching GitHub stats');

      if (!githubUsername) {
        res.status(404).json({
          success: false,
          message: 'GitHub account not connected',
          error: { code: 'NOT_CONNECTED' },
        });
        return;
      }

      // Fetch contributions
      const contributions = await GitHubService.getContributionCalendar(githubUsername, user?.githubAccessToken || undefined);

      // We can also fetch other stats here if needed (repos, stars, etc)
      // For now, just return the calendar

      res.json({
        success: true,
        message: 'GitHub stats retrieved',
        data: {
          username: githubUsername,
          submissionCalendar: contributions,
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get GitHub stats');
      res.status(500).json({ success: false, message: 'Failed to get GitHub stats', error: { code: 'INTERNAL_ERROR' } });
    }
  }
}


export default UserController;
