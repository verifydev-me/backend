import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { GitHubService } from '../../../services/github.service.js';
import { AuthService } from '../../../services/auth.service.js';
import { TokenService } from '../../../services/token.service.js';
import { redis } from '../../../config/redis.js';
import { env } from '../../../config/env.js';
import { logger } from '../../../utils/logger.js';
import type { AuthenticatedRequest, ApiResponse, AuthResponse } from '../../../types/index.js';

const STATE_EXPIRY = 600; // 10 minutes

export class AuthController {
  /**
   * GET /auth/github
   * Initiate GitHub OAuth flow
   */
  static async initiateGitHub(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      // Generate unique state for CSRF protection
      const state = uuidv4();

      // Store state in Redis with expiry
      await redis.setex(`oauth:state:${state}`, STATE_EXPIRY, '1');

      // Generate authorization URL
      const authUrl = GitHubService.getAuthorizationUrl(state);

      // Check if client wants JSON (API call) or redirect (browser)
      const wantsJson = req.headers.accept?.includes('application/json') || 
                        req.query.format === 'json';
      
      if (wantsJson) {
        res.json({
          success: true,
          message: 'Redirect to this URL for GitHub authentication',
          data: { authUrl },
        });
      } else {
        // Direct redirect for browser requests
        res.redirect(authUrl);
      }
    } catch (error) {
      logger.error({ error }, 'Failed to initiate GitHub OAuth');
      res.status(500).json({
        success: false,
        message: 'Failed to initiate authentication',
        error: { code: 'AUTH_INIT_FAILED' },
      });
    }
  }

  /**
   * GET /auth/github/callback
   * Handle GitHub OAuth callback
   */
  static async handleGitHubCallback(
    req: Request<unknown, unknown, unknown, { code?: string; state?: string; error?: string }>,
    res: Response<AuthResponse>
  ): Promise<void> {
    try {
      const { code, state, error: oauthError } = req.query;

      // Handle OAuth error
      if (oauthError) {
        logger.warn({ oauthError }, 'GitHub OAuth error');
        res.redirect(`${env.FRONTEND_URL}/auth/error?message=${encodeURIComponent(oauthError)}`);
        return;
      }

      // Validate code and state
      if (!code || !state) {
        res.status(400).json({
          success: false,
          message: 'Missing code or state parameter',
          error: { code: 'INVALID_CALLBACK' },
        });
        return;
      }

      // Verify state to prevent CSRF
      const validState = await redis.get(`oauth:state:${state}`);
      if (!validState) {
        res.status(400).json({
          success: false,
          message: 'Invalid or expired state',
          error: { code: 'INVALID_STATE' },
        });
        return;
      }

      // Delete used state
      await redis.del(`oauth:state:${state}`);

      // Process GitHub auth
      const { user, tokens } = await AuthService.processGitHubAuth(code);

      // Set refresh token in HTTP-only cookie
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/api/v1/auth',
      });

      // Redirect to frontend with access token
      const redirectUrl = new URL(`${env.FRONTEND_URL}/auth/callback`);
      redirectUrl.searchParams.set('accessToken', tokens.accessToken);
      redirectUrl.searchParams.set('userId', user.id);

      res.redirect(redirectUrl.toString());
    } catch (error) {
      logger.error({ error }, 'GitHub callback failed');
      res.redirect(`${env.FRONTEND_URL}/auth/error?message=Authentication failed`);
    }
  }

  /**
   * POST /auth/refresh
   * Refresh access token
   */
  static async refreshToken(
    req: Request,
    res: Response<ApiResponse<{ accessToken: string }>>
  ): Promise<void> {
    try {
      // Get refresh token from cookie or body
      const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

      if (!refreshToken) {
        res.status(401).json({
          success: false,
          message: 'Refresh token required',
          error: { code: 'MISSING_REFRESH_TOKEN' },
        });
        return;
      }

      // Refresh tokens
      const tokens = await TokenService.refreshTokens(refreshToken);

      if (!tokens) {
        res.status(401).json({
          success: false,
          message: 'Invalid or expired refresh token',
          error: { code: 'INVALID_REFRESH_TOKEN' },
        });
        return;
      }

      // Set new refresh token in cookie
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/api/v1/auth',
      });

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: { accessToken: tokens.accessToken },
      });
    } catch (error) {
      logger.error({ error }, 'Token refresh failed');
      res.status(500).json({
        success: false,
        message: 'Failed to refresh token',
        error: { code: 'REFRESH_FAILED' },
      });
    }
  }

  /**
   * POST /auth/logout
   * Logout current session
   */
  static async logout(
    req: AuthenticatedRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated',
          error: { code: 'UNAUTHORIZED' },
        });
        return;
      }

      const accessToken = req.headers.authorization?.split(' ')[1];

      await AuthService.logout(req.user.userId, req.user.sessionId, accessToken);

      // Clear refresh token cookie
      res.clearCookie('refreshToken', { path: '/api/v1/auth' });

      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      logger.error({ error }, 'Logout failed');
      res.status(500).json({
        success: false,
        message: 'Logout failed',
        error: { code: 'LOGOUT_FAILED' },
      });
    }
  }

  /**
   * POST /auth/logout-all
   * Logout from all devices
   */
  static async logoutAll(
    req: AuthenticatedRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated',
          error: { code: 'UNAUTHORIZED' },
        });
        return;
      }

      await AuthService.logoutAll(req.user.userId);

      res.clearCookie('refreshToken', { path: '/api/v1/auth' });

      res.json({
        success: true,
        message: 'Logged out from all devices',
      });
    } catch (error) {
      logger.error({ error }, 'Logout all failed');
      res.status(500).json({
        success: false,
        message: 'Logout failed',
        error: { code: 'LOGOUT_FAILED' },
      });
    }
  }

  /**
   * GET /auth/me
   * Get current user
   */
  static async getCurrentUser(
    req: AuthenticatedRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated',
          error: { code: 'UNAUTHORIZED' },
        });
        return;
      }

      const user = await AuthService.getCurrentUser(req.user.userId);

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
          error: { code: 'USER_NOT_FOUND' },
        });
        return;
      }

      res.json({
        success: true,
        message: 'User retrieved successfully',
        data: { user },
      });
    } catch (error) {
      logger.error({ error }, 'Get current user failed');
      res.status(500).json({
        success: false,
        message: 'Failed to get user',
        error: { code: 'GET_USER_FAILED' },
      });
    }
  }
}

export default AuthController;
