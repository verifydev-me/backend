import express, { Express } from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { logger } from './utils/logger.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { generalRateLimiter } from './middlewares/rateLimit.js';

// Routes
import authRoutes from './api/v1/routes/auth.routes.js';
import otpRoutes from './api/v1/routes/otp.routes.js';

export function createApp(): Express {
  const app = express();

  // Security middleware
  app.use(helmet());

  // General rate limiting (100 req/min per IP)
  app.use(generalRateLimiter);

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
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/auth/otp', otpRoutes);

  // 404 handler
  app.use(notFoundHandler);

  // Error handler
  app.use(errorHandler);

  return app;
}

export default createApp;
