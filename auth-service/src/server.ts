import 'dotenv/config';

import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import prisma from './prisma/client.js';
import redis from './config/redis.js';

async function bootstrap() {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('✅ PostgreSQL connected');

    // Redis is already connected on import

    // Create and start Express app
    const app = createApp();

    const server = app.listen(env.PORT, () => {
      logger.info(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🔐 Auth Service Started                                 ║
║   ───────────────────────────────────────────────────     ║
║   Port:        ${env.PORT}                                ║
║   Environment: ${env.NODE_ENV.padEnd(15)}                 ║
║   API Version: ${env.API_VERSION}                         ║
║                                                           ║
║   Endpoints:                                              ║
║   • GET  /health                                          ║
║   • GET  /api/v1/auth/github                              ║
║   • GET  /api/v1/auth/github/callback                     ║
║   • POST /api/v1/auth/refresh                             ║
║   • POST /api/v1/auth/logout                              ║
║   • POST /api/v1/auth/logout-all                          ║
║   • GET  /api/v1/auth/me                                  ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
      `);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        await prisma.$disconnect();
        logger.info('PostgreSQL disconnected');

        await redis.quit();
        logger.info('Redis disconnected');

        process.exit(0);
      });

      // Force close after 10 seconds
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

bootstrap();
