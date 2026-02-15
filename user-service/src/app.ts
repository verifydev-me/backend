import express, { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';

import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import userRoutes from './api/v1/routes/user.routes.js';
import projectRoutes from './api/v1/routes/project.routes.js';
import resumeRoutes from './api/v1/routes/resume.routes.js';
import experienceRoutes from './api/v1/routes/experience.routes.js';
import onboardingRoutes from './api/v1/routes/onboarding.routes.js';
import skillRoutes from './api/v1/routes/skill.routes.js';
import internalRoutes from './api/v1/routes/internal.routes.js';
import visibilityRoutes from './api/v1/routes/visibility.routes.js';
import notificationRoutes from './api/v1/routes/notification.routes.js';
import dashboardRoutes from './api/v1/routes/dashboard.routes.js';
import { rabbitmqPublisher } from './rabbitmq/publisher.js';
import type { ApiResponse } from './types/index.js';

// Initialize RabbitMQ connection
rabbitmqPublisher.connect().catch((err) => {
  logger.warn({ error: err }, 'RabbitMQ not available - project analysis disabled');
});

export function createApp(): Express {
  const app = express();

  // CORS configuration
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  }));

  // Security
  app.use(helmet());

  // Body parsing
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  // Request logging
  app.use((req, _res, next) => {
    logger.debug({ method: req.method, path: req.path });
    next();
  });

  // Health check
  app.get('/health', (_req, res) => {
    res.json({
      success: true,
      message: 'User Service is healthy',
      data: {
        service: 'user-service',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
      },
    });
  });

  // Routes
  app.use('/api/v1/dashboard', dashboardRoutes); // Comprehensive dashboard analytics
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/users/me/onboarding', onboardingRoutes); // Step 1.1: Onboarding routes
  app.use('/api/v1/skills', skillRoutes); // Step 1.2: Skill routes with protection
  app.use('/api/v1/projects', projectRoutes);
  app.use('/api/v1/resume', resumeRoutes);
  app.use('/api/v1/experiences', experienceRoutes);
  app.use('/api/v1/visibility-settings', visibilityRoutes); // Phase 2: Visibility settings
  app.use('/api/v1/notifications', notificationRoutes); // Notifications
  app.use('/api/internal', internalRoutes); // Internal API for inter-service communication
  // Public routes use the same router but different paths
  app.use('/api/v1', userRoutes);

  // 404 handler
  app.use((req, res: Response<ApiResponse>) => {
    res.status(404).json({
      success: false,
      message: `Route ${req.method} ${req.path} not found`,
      error: { code: 'NOT_FOUND' },
    });
  });

  // Error handler
  app.use((err: Error, req: Request, res: Response<ApiResponse>, _next: NextFunction) => {
    logger.error({ error: err.message, stack: err.stack, path: req.path }, 'Request error');
    
    res.status(500).json({
      success: false,
      message: env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
      error: { code: 'INTERNAL_ERROR' },
    });
  });

  return app;
}

export default createApp;
