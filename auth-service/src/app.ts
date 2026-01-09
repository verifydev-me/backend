import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';

// Routes
import authRoutes from './api/v1/routes/auth.routes.js';
import otpRoutes from './api/v1/routes/otp.routes.js';

export function createApp(): Express {
  const app = express();

  // Security middleware
  app.use(helmet());

  // CORS
  app.use(
    cors({
      origin: env.ALLOWED_ORIGINS,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Rate limiting (DISABLED FOR TESTING - TODO: Re-enable in production)
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    skip: () => true, // TESTING: Skip rate limiting
    message: {
      success: false,
      message: 'Too many requests, please try again later',
      error: { code: 'RATE_LIMIT_EXCEEDED' },
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);

  // Stricter rate limit for auth endpoints (DISABLED FOR TESTING)
  const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // 20 auth attempts per hour
    skip: () => true, // TESTING: Skip rate limiting
    message: {
      success: false,
      message: 'Too many authentication attempts',
      error: { code: 'AUTH_RATE_LIMIT' },
    },
  });

  // Body parsing
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));
  app.use(cookieParser());

  // Request logging
  app.use((req, _res, next) => {
    logger.debug({
      method: req.method,
      path: req.path,
      ip: req.ip,
    });
    next();
  });

  // Health check
  app.get('/health', (_req, res) => {
    res.json({
      success: true,
      message: 'Auth Service is healthy',
      data: {
        service: 'auth-service',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
      },
    });
  });

  // API Routes
  app.use('/api/v1/auth', authLimiter, authRoutes);
  app.use('/api/v1/auth/otp', otpRoutes);

  // 404 handler
  app.use(notFoundHandler);

  // Error handler
  app.use(errorHandler);

  return app;
}

export default createApp;
