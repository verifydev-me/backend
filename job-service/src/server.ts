import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { connectDatabase, disconnectDatabase } from './prisma/client.js';
import { JobService } from './domain/job.service.js';
import jobRoutes from './api/v1/routes/job.routes.js';

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

// Routes
app.use('/api/v1/jobs', jobRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
    error: { code: 'NOT_FOUND' },
  });
});

// Start server with database connection
async function startServer() {
  try {
    // Connect to database
    await connectDatabase();
    
    // Seed demo data in development
    if (env.NODE_ENV === 'development') {
      await JobService.seedDemoJobs();
    }
    
    app.listen(env.PORT, () => {
      logger.info(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   💼 Job Service Started                                  ║
║   ───────────────────────────────────────────────────     ║
║   Port:        ${env.PORT}                                     ║
║   Environment: ${env.NODE_ENV}                                ║
║                                                           ║
║   Public Endpoints:                                       ║
║   • GET  /api/v1/jobs          - List jobs                ║
║   • GET  /api/v1/jobs/:jobId   - Get job details          ║
║                                                           ║
║   User Endpoints:                                         ║
║   • GET  /api/v1/jobs/matched  - Matched jobs             ║
║   • POST /api/v1/jobs/:id/apply - Apply to job            ║
║   • GET  /api/v1/applications  - My applications          ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
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
