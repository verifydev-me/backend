import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import type { AuthenticatedRequest, ApiResponse } from '../types/index.js';

interface UserJwtPayload {
  userId: string;
  sessionId: string;
  type: 'access';
}

interface RecruiterJwtPayload {
  recruiterId: string;
  organizationId: string;
  role: string;
}

type JwtPayload = UserJwtPayload | RecruiterJwtPayload;

function isRecruiterPayload(payload: any): payload is RecruiterJwtPayload {
  return 'recruiterId' in payload;
}

/**
 * Authentication middleware - verifies JWT token
 * Supports both user and recruiter tokens
 * Adds user object to request if valid
 */
export async function authenticate(
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'No token provided',
        error: { code: 'NO_TOKEN' }
      });
      return;
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;

      // Handle both user and recruiter tokens
      if (isRecruiterPayload(decoded)) {
        // Recruiter token - map recruiterId to userId for compatibility
        req.user = {
          userId: decoded.recruiterId,
          sessionId: decoded.organizationId, // Use organizationId as sessionId
        };
      } else {
        // User token
        req.user = {
          userId: decoded.userId,
          sessionId: decoded.sessionId,
        };
      }

      next();
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        res.status(401).json({
          success: false,
          message: 'Token expired',
          error: { code: 'TOKEN_EXPIRED' }
        });
        return;
      }

      res.status(401).json({
        success: false,
        message: 'Invalid token',
        error: { code: 'INVALID_TOKEN' }
      });
    }
  } catch (error) {
    logger.error({ error }, 'Authentication error');
    res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: { code: 'AUTH_ERROR' }
    });
  }
}

/**
 * Optional authentication - doesn't require token but parses it if present
 * Supports both user and recruiter tokens
 */
export async function optionalAuth(
  req: AuthenticatedRequest,
  _res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];

      try {
        const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;

        // Handle both user and recruiter tokens
        if (isRecruiterPayload(decoded)) {
          req.user = {
            userId: decoded.recruiterId,
            sessionId: decoded.organizationId,
          };
        } else {
          req.user = {
            userId: decoded.userId,
            sessionId: decoded.sessionId,
          };
        }
      } catch {
        // Token invalid but that's okay for optional auth
        req.user = undefined;
      }
    }

    next();
  } catch (error) {
    logger.error({ error }, 'Optional auth error');
    next();
  }
}

export default authenticate;
