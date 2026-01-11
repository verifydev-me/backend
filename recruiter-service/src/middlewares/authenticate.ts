import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../prisma/client.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';
import type { RecruiterRequest } from '../types/index.js';

const JWT_ACCESS_SECRET = env.JWT_ACCESS_SECRET;

interface JWTPayload {
  recruiterId: string;
  organizationId: string;
  role: string;
  iat: number;
  exp: number;
}

/**
 * Middleware to authenticate recruiters using JWT
 */
export async function authenticateRecruiter(
  req: RecruiterRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'No token provided',
        error: { code: 'NO_TOKEN' },
      });
      return;
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, JWT_ACCESS_SECRET) as JWTPayload;

      // Verify recruiter exists and is active
      const recruiter = await prisma.recruiter.findUnique({
        where: { id: decoded.recruiterId },
        include: { organization: true },
      });

      if (!recruiter || !recruiter.isActive) {
        res.status(401).json({
          success: false,
          message: 'Recruiter not found or inactive',
          error: { code: 'INVALID_RECRUITER' },
        });
        return;
      }

      // Attach recruiter info to request
      req.recruiter = {
        id: recruiter.id,
        email: recruiter.email,
        name: recruiter.name,
        organizationId: recruiter.organizationId,
        role: recruiter.role,
        organization: recruiter.organization as any,
      };

      next();
    } catch (jwtError) {
      if (jwtError instanceof jwt.TokenExpiredError) {
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
    logger.error({ error }, 'Authentication middleware error');
    res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: { code: 'AUTH_ERROR' },
    });
  }
}

/**
 * Optional auth - doesn't fail if no token, just doesn't set req.recruiter
 */
export async function optionalRecruiterAuth(
  req: RecruiterRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, JWT_ACCESS_SECRET) as JWTPayload;

      const recruiter = await prisma.recruiter.findUnique({
        where: { id: decoded.recruiterId },
        include: { organization: true },
      });

      if (recruiter && recruiter.isActive) {
        req.recruiter = {
          id: recruiter.id,
          email: recruiter.email,
          name: recruiter.name,
          organizationId: recruiter.organizationId,
          role: recruiter.role,
          organization: recruiter.organization as any,
        };
      }
    } catch {
      // Ignore JWT errors for optional auth
    }

    next();
  } catch (error) {
    logger.error({ error }, 'Optional auth middleware error');
    next();
  }
}

/**
 * Check if recruiter has specific role
 */
export function requireRole(...roles: string[]) {
  return (req: RecruiterRequest, res: Response, next: NextFunction): void => {
    if (!req.recruiter) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
        error: { code: 'UNAUTHORIZED' },
      });
      return;
    }

    if (!roles.includes(req.recruiter.role)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        error: { code: 'FORBIDDEN' },
      });
      return;
    }

    next();
  };
}
