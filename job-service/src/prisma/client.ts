import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('✅ PostgreSQL connected');
  } catch (error) {
    logger.error({ error }, '❌ Failed to connect to PostgreSQL');
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
