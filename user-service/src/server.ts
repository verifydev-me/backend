import 'dotenv/config';

import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import prisma from './prisma/client.js';

async function bootstrap() {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('✅ PostgreSQL connected');

    const app = createApp();

    const server = app.listen(env.PORT, () => {
      logger.info(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   👤 User Service Started                                 ║
║   ───────────────────────────────────────────────────     ║
║   Port:        ${env.PORT}                                ║
║   Environment: ${env.NODE_ENV.padEnd(15)}                 ║
║   API Version: ${env.API_VERSION}                         ║
║                                                           ║
║   Private Endpoints:                                      ║
║   • GET  /api/v1/users/me          - My profile           ║
║   • PUT  /api/v1/users/me          - Update profile       ║
║   • GET  /api/v1/users/settings    - My settings          ║
║   • PUT  /api/v1/users/settings    - Update settings      ║
║   • GET  /api/v1/users/me/aura     - My aura summary      ║
║                                                           ║
║   Public Endpoints:                                       ║
║   • GET  /api/v1/u/:username       - Public profile       ║
║   • GET  /api/v1/u/:username/aura  - Public aura          ║
║   • GET  /api/v1/u/:username/projects - Public projects   ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
      `);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down...`);
      server.close(async () => {
        await prisma.$disconnect();
        logger.info('Server closed');
        process.exit(0);
      });

      setTimeout(() => {
        logger.error('Forced shutdown');
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
