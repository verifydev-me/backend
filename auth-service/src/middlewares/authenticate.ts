import { Response, NextFunction } from 'express';
import { TokenService } from '../services/token.service.js';
import { logger } from '../utils/logger.js';
import type { AuthenticatedRequest, ApiResponse } from '../types/index.js';

/**
 * Authentication middleware - validates JWT access token
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Access token required',
        error: { code: 'UNAUTHORIZED' },
      });
      return;
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const payload = await TokenService.verifyAccessToken(token);

    if (!payload) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired access token',
        error: { code: 'INVALID_TOKEN' },
      });
      return;
    }

    // Attach user info to request
    req.user = {
      userId: payload.userId,
      sessionId: payload.sessionId,
    };

    next();
  } catch (error) {
    logger.error({ error }, 'Authentication error');
    res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: { code: 'AUTH_ERROR' },
    });
  }
};

/**
 * Optional authentication - attaches user if token is valid, continues anyway
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const payload = await TokenService.verifyAccessToken(token);

      if (payload) {
        req.user = {
          userId: payload.userId,
          sessionId: payload.sessionId,
        };
      }
    }

    next();
  } catch (error) {
    // Continue without auth on error
    next();
  }
};
