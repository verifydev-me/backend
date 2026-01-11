import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { connectDatabase, disconnectDatabase } from './prisma/client.js';
import { RecruiterAuthService } from './domain/auth.service.js';
import recruiterRoutes from './api/v1/routes/recruiter.routes.js';
import authRoutes from './api/v1/routes/auth.routes.js';
import communicationRoutes from './api/v1/routes/communication.routes.js';

const app = express();

// Security
app.use(helmet());
// app.use(cors({ origin: env.ALLOWED_ORIGINS, credentials: true })); // Gateway handles CORS
// app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200000 })); // Disabled for seeding
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Recruiter Service is healthy',
    data: { service: 'recruiter-service', version: '1.0.0' },
  });
});

// Routes
app.use('/api/v1/recruiters', authRoutes);  // Auth routes: /api/v1/recruiters/login, /register, /me
app.use('/api/v1/recruiters', recruiterRoutes);  // Recruiter routes
app.use('/api/v1', communicationRoutes);  // Communication routes: /api/v1/messages, /interviews, /templates

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
      await RecruiterAuthService.seedDemoData();
    }
    
    app.listen(env.PORT, () => {
      logger.info(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   👔 Recruiter Service Started                            ║
║   ───────────────────────────────────────────────────     ║
║   Port:        ${env.PORT}                                     ║
║   Environment: ${env.NODE_ENV}                                ║
║                                                           ║
║   Auth Endpoints:                                         ║
║   • POST /api/v1/recruiters/register - Register           ║
║   • POST /api/v1/recruiters/login    - Login              ║
║   • GET  /api/v1/recruiters/me       - Current user       ║
║                                                           ║
║   Candidate Endpoints:                                    ║
║   • GET  /api/v1/recruiters/dashboard                     ║
║   • GET  /api/v1/recruiters/candidates/search             ║
║   • GET  /api/v1/recruiters/candidates/:id                ║
║   • GET  /api/v1/recruiters/candidates/:id/full           ║
║   • POST /api/v1/recruiters/candidates/:id/shortlist      ║
║   • GET  /api/v1/recruiters/shortlist                     ║
║                                                           ║
║   Communication Endpoints:                                ║
║   • POST /api/v1/messages              - Send message     ║
║   • GET  /api/v1/messages              - Get messages     ║
║   • POST /api/v1/interviews            - Schedule         ║
║   • GET  /api/v1/interviews            - Get interviews   ║
║   • GET  /api/v1/templates             - Get templates    ║
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
