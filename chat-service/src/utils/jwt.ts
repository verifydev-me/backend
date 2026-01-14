// ==================== JWT UTILITIES ====================

import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { logger } from './logger.js';

export interface JwtPayload {
  userId: string;
  email?: string;
  role: 'candidate' | 'recruiter';
  iat?: number;
  exp?: number;
}

/**
 * Verify JWT token using same secret as auth-service
 * NO database calls - pure JWT validation
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, config.jwt.accessSecret) as JwtPayload;
    
    // Handle Recruiter Token
    // Recruiter tokens have 'recruiterId' instead of 'userId'
    if ((decoded as any).recruiterId) {
       decoded.userId = (decoded as any).recruiterId;
       decoded.role = 'recruiter';
    }

    if (!decoded.userId) {
      logger.warn('Invalid token payload: missing userId');
      return null;
    }
    
    // Default role to candidate if not present (auth-service doesn't include it)
    if (!decoded.role) {
      decoded.role = 'candidate';
    }
    
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.debug('Token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      logger.debug({ error: (error as Error).message }, 'Invalid token');
    }
    return null;
  }
}

/**
 * Extract token from Authorization header or query string
 */
export function extractToken(authHeader?: string, queryToken?: string): string | null {
  // Check Authorization header first
  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
      return parts[1];
    }
  }
  
  // Fallback to query string (for WebSocket connections)
  if (queryToken) {
    return queryToken;
  }
  
  return null;
}
