import { Request, Response, NextFunction } from 'express';

// Simple in-memory rate limiter for auth endpoints
// In production, use Redis-based rate limiting
interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

interface RateLimitOptions {
  windowMs: number;    // Time window in milliseconds
  maxRequests: number; // Max requests per window
  message?: string;    // Custom error message
}

/**
 * Rate limiting middleware for auth endpoints
 * Prevents brute-force attacks on login/refresh endpoints
 */
export function rateLimit(options: RateLimitOptions) {
  const { windowMs, maxRequests, message = 'Too many requests, please try again later.' } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    // Use IP + path as key for more granular limiting
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();

    let record = rateLimitStore.get(key);

    if (!record || now > record.resetTime) {
      // Create new record or reset expired one
      record = {
        count: 1,
        resetTime: now + windowMs,
      };
      rateLimitStore.set(key, record);
    } else {
      record.count++;
    }

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - record.count).toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000).toString());

    if (record.count > maxRequests) {
      res.setHeader('Retry-After', Math.ceil((record.resetTime - now) / 1000).toString());
      res.status(429).json({
        success: false,
        message,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil((record.resetTime - now) / 1000),
        },
      });
      return;
    }

    next();
  };
}

// Pre-configured rate limiters for different endpoints
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,           // 5 attempts per 15 minutes
  message: 'Too many login attempts. Please try again in 15 minutes.',
});

export const refreshRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,  // 5 minutes
  maxRequests: 10,          // 10 refresh attempts per 5 minutes
  message: 'Too many refresh attempts. Please try again later.',
});

export const generalRateLimiter = rateLimit({
  windowMs: 60 * 1000,      // 1 minute
  maxRequests: 100,         // 100 requests per minute
  message: 'Too many requests. Please slow down.',
});
