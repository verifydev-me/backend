import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { connectDatabase, disconnectDatabase } from './prisma/client.js';
import v1Router from './api/v1/index.js';

const app = express();

// Security
app.use(helmet());
app.use(cors({ origin: env.ALLOWED_ORIGINS, credentials: true }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Job Service is healthy',
    data: { service: 'job-service', version: '1.0.0' },
  });
});

// API Routes
app.use('/api/v1', v1Router);

// 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
    error: { code: 'NOT_FOUND' },
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: { code: err.code || 'INTERNAL_ERROR' },
  });
});

// Start server with database connection
async function startServer() {
  try {
    // Connect to database
    await connectDatabase();
    
    app.listen(env.PORT, () => {
      logger.info(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   💼 Job Service Started                                     ║
║   ─────────────────────────────────────────────────────      ║
║   Port:        ${env.PORT}                                        ║
║   Environment: ${env.NODE_ENV}                                   ║
║                                                              ║
║   📋 Job Management:                                         ║
║   • GET/POST   /api/v1/jobs          - Jobs CRUD             ║
║   • POST       /api/v1/jobs/:id/publish - Publish job        ║
║   • GET        /api/v1/jobs/:id/stats - Job statistics       ║
║                                                              ║
║   📝 Applications:                                           ║
║   • POST       /api/v1/applications  - Apply to job          ║
║   • GET        /api/v1/applications/my-applications          ║
║   • PATCH      /api/v1/applications/:id/status               ║
║                                                              ║
║   🗓️  Interviews:                                            ║
║   • POST       /api/v1/interviews    - Schedule interview    ║
║   • GET        /api/v1/interviews/upcoming                   ║
║   • POST       /api/v1/interviews/:id/confirm                ║
║                                                              ║
║   💬 Messages:                                               ║
║   • GET/POST   /api/v1/messages      - Messaging            ║
║   • GET        /api/v1/messages/inbox                        ║
║   • GET        /api/v1/messages/unread-count                 ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down...');
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down...');
  await disconnectDatabase();
  process.exit(0);
});

startServer();
