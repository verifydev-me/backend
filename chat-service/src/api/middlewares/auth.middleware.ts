// ==================== AUTH MIDDLEWARE ====================

import type { Request, Response, NextFunction } from 'express';
import { verifyToken, extractToken, type JwtPayload } from '../../utils/jwt.js';
import { logger } from '../../utils/logger.js';

// Extend Express Request
export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const token = extractToken(req.headers.authorization);

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const payload = verifyToken(token);
    if (!payload) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
      return;
    }

    (req as AuthenticatedRequest).user = payload;
    next();
  } catch (error) {
    logger.error({ error }, 'Auth middleware error');
    res.status(401).json({
      success: false,
      message: 'Authentication failed',
    });
  }
}
