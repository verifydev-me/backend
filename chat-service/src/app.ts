// ==================== EXPRESS APP ====================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import roomRoutes from './api/routes/room.routes.js';
import messageRoutes from './api/routes/message.routes.js';
import directRoutes from './api/routes/direct.routes.js';

export function createApp() {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors({
    origin: config.cors.origin,
    credentials: true,
  }));

  // Body parsing
  app.use(express.json({ limit: '1mb' }));

  // Health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: 'chat-service',
      timestamp: new Date().toISOString(),
    });
  });

  // API Routes
  app.use('/api/v1/chat/rooms', roomRoutes);
  app.use('/api/v1/chat/rooms', messageRoutes);
  app.use('/api/v1/chat/direct', directRoutes);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: 'Endpoint not found',
    });
  });

  // Error handler
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error({ error: err.message, stack: err.stack }, 'Unhandled error');
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  });

  return app;
}
