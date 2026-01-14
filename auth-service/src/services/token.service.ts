import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env.js';
import { tokenBlacklist, sessionStore } from '../config/redis.js';
import { logger } from '../utils/logger.js';
import type { JwtPayload, AuthTokens } from '../types/index.js';

// Parse duration string to seconds (e.g., '15m' -> 900, '7d' -> 604800)
function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Invalid duration format: ${duration}`);

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 60 * 60;
    case 'd': return value * 60 * 60 * 24;
    default: throw new Error(`Unknown unit: ${unit}`);
  }
}

export class TokenService {
  private static accessExpiry = parseDuration(env.JWT_ACCESS_EXPIRY);
  private static refreshExpiry = parseDuration(env.JWT_REFRESH_EXPIRY);

  /**
   * Generate access and refresh tokens
   */
  static async generateTokens(userId: string): Promise<AuthTokens & { sessionId: string }> {
    const sessionId = uuidv4();

    const accessPayload: JwtPayload = {
      userId,
      sessionId,
      type: 'access',
    };

    const refreshPayload: JwtPayload = {
      userId,
      sessionId,
      type: 'refresh',
    };

    const accessToken = jwt.sign(accessPayload, env.JWT_ACCESS_SECRET, {
      expiresIn: this.accessExpiry,
    });

    const refreshToken = jwt.sign(refreshPayload, env.JWT_REFRESH_SECRET, {
      expiresIn: this.refreshExpiry,
    });

    // Store session in Redis
    await sessionStore.set(userId, sessionId, this.refreshExpiry);

    logger.debug({ userId, sessionId }, 'Tokens generated');

    return {
      accessToken,
      refreshToken,
      sessionId,
    };
  }

  /**
   * Verify access token
   */
  static async verifyAccessToken(token: string): Promise<JwtPayload | null> {
    try {
      // Check if token is blacklisted
      const isBlacklisted = await tokenBlacklist.isBlacklisted(token);
      if (isBlacklisted) {
        logger.debug('Token is blacklisted');
        return null;
      }

      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;

      if (payload.type !== 'access') {
        return null;
      }

      // Verify session exists
      const sessionKey = `session:${payload.userId}:${payload.sessionId}`;
      const sessionValid = await sessionStore.get(payload.userId, payload.sessionId);
      
      if (!sessionValid) {
        logger.debug({ 
          userId: payload.userId, 
          sessionId: payload.sessionId,
          sessionKey,
          error: 'Session lookup failed in Redis'
        }, 'Session not found');
        return null;
      }

      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.debug('Access token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        logger.debug('Invalid access token');
      }
      return null;
    }
  }

  /**
   * Verify refresh token
   */
  static async verifyRefreshToken(token: string): Promise<JwtPayload | null> {
    try {
      const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;

      if (payload.type !== 'refresh') {
        return null;
      }

      // Verify session exists
      const sessionValid = await sessionStore.get(payload.userId, payload.sessionId);
      if (!sessionValid) {
        return null;
      }

      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.debug('Refresh token expired');
      }
      return null;
    }
  }

  /**
   * Refresh tokens - invalidate old session, create new one
   */
  static async refreshTokens(refreshToken: string): Promise<AuthTokens | null> {
    const payload = await this.verifyRefreshToken(refreshToken);
    if (!payload) {
      return null;
    }

    // Invalidate old session
    await sessionStore.delete(payload.userId, payload.sessionId);

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = await this.generateTokens(
      payload.userId
    );

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Revoke session (logout)
   */
  static async revokeSession(
    userId: string,
    sessionId: string,
    accessToken?: string
  ): Promise<void> {
    await sessionStore.delete(userId, sessionId);

    // Blacklist the access token if provided
    if (accessToken) {
      await tokenBlacklist.add(accessToken, this.accessExpiry);
    }

    logger.debug({ userId, sessionId }, 'Session revoked');
  }

  /**
   * Revoke all sessions for a user
   */
  static async revokeAllSessions(userId: string): Promise<void> {
    await sessionStore.deleteAll(userId);
    logger.debug({ userId }, 'All sessions revoked');
  }
}

export default TokenService;
