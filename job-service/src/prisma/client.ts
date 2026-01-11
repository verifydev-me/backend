import { PrismaClient } from '../../node_modules/.prisma/job-client/index.js';
import { logger } from '../utils/logger.js';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('✅ MongoDB connected (Job Service)');
  } catch (error) {
    logger.error({ error }, '❌ Failed to connect to MongoDB');
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    logger.info('PostgreSQL disconnected');
  } catch (error) {
    logger.error({ error }, 'Error disconnecting from PostgreSQL');
  }
}

export default prisma;
