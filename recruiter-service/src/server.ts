import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import recruiterRoutes from './api/v1/routes/recruiter.routes.js';
import authRoutes from './api/v1/routes/auth.routes.js';

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
    message: 'Recruiter Service is healthy',
    data: { service: 'recruiter-service', version: '1.0.0' },
  });
});

// Routes
app.use('/api/v1/recruiters', authRoutes);  // Auth routes: /api/v1/recruiters/login, /register, /me
app.use('/api/v1/recruiters', recruiterRoutes);  // Recruiter routes

// 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
    error: { code: 'NOT_FOUND' },
  });
});

// Start server
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
╚═══════════════════════════════════════════════════════════╝
  `);
});
