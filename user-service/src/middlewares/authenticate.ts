import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import type { AuthenticatedRequest, ApiResponse } from '../types/index.js';

interface JwtPayload {
  userId: string;
  sessionId: string;
  type: 'access' | 'refresh';
}

/**
 * Authentication middleware - validates JWT access token
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
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

    try {
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;

      if (payload.type !== 'access') {
        res.status(401).json({
          success: false,
          message: 'Invalid token type',
          error: { code: 'INVALID_TOKEN' },
        });
        return;
      }

      req.user = {
        userId: payload.userId,
        sessionId: payload.sessionId,
      };

      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        res.status(401).json({
          success: false,
          message: 'Token expired',
          error: { code: 'TOKEN_EXPIRED' },
        });
        return;
      }

      res.status(401).json({
        success: false,
        message: 'Invalid token',
        error: { code: 'INVALID_TOKEN' },
      });
    }
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
 * Optional auth - continues even if no token
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
      try {
        const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
        if (payload.type === 'access') {
          req.user = {
            userId: payload.userId,
            sessionId: payload.sessionId,
          };
        }
      } catch {
        // Ignore invalid tokens for optional auth
      }
    }

    next();
  } catch {
    next();
  }
};
