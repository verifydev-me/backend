import 'dotenv/config';
import { logger } from './utils/logger.js';
import { rabbitmq } from './rabbitmq/client.js';
import { handleProjectAnalyzed } from './consumers/project-analyzed.js';
import './prisma/client.js'; // Initialize Prisma connection

async function main() {
  logger.info(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   ⚡ Aura Processor Service                               ║
║   ───────────────────────────────────────────────────     ║
║                                                           ║
║   Responsibilities:                                       ║
║   • Consume project.analyzed events                       ║
║   • Calculate aura scores                                 ║
║   • Update user profiles & skills                         ║
║   • Generate improvement hints                            ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);

  try {
    // Connect to RabbitMQ
    await rabbitmq.connect();

    // Start consuming messages
    await rabbitmq.consume(handleProjectAnalyzed);

    logger.info('🚀 Aura Processor is running');

    // Graceful shutdown
    const shutdown = async () => {
      logger.info('Shutting down...');
      await rabbitmq.close();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

  } catch (error) {
    logger.error({ error }, 'Failed to start Aura Processor');
    process.exit(1);
  }
}

main();
