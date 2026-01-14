// ==================== CHAT SERVICE ENTRY POINT ====================

import { createServer } from 'http';
import { createApp } from './app.js';
import { config } from './config/index.js';
import { connectDatabase, closeDatabase } from './config/database.js';
import { connectRedis, closeRedis } from './config/redis.js';
import { connectRabbitMQ, closeRabbitMQ } from './services/notification.service.js';
import { createSocketServer } from './websocket/socket-server.js';
import { logger } from './utils/logger.js';

async function main() {
  logger.info('🚀 Starting Chat Service...');

  try {
    // Connect to databases
    await connectDatabase();
    await connectRedis();
    await connectRabbitMQ();

    // Create Express app
    const app = createApp();

    // Create HTTP server
    const httpServer = createServer(app);

    // Attach WebSocket server
    const io = createSocketServer(httpServer);

    // Start listening
    httpServer.listen(config.port, () => {
      logger.info({ port: config.port }, `✅ Chat Service running on port ${config.port}`);
      logger.info(`   📡 REST API: http://localhost:${config.port}/api/v1/chat`);
      logger.info(`   🔌 WebSocket: ws://localhost:${config.port}`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info({ signal }, '🛑 Shutting down...');

      httpServer.close(async () => {
        await closeDatabase();
        await closeRedis();
        await closeRabbitMQ();
        logger.info('✅ Graceful shutdown complete');
        process.exit(0);
      });

      // Force exit after 10s
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error({ error }, '❌ Failed to start Chat Service');
    process.exit(1);
  }
}

main();
