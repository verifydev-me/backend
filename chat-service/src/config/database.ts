import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

let prisma: PrismaClient;

export function getPrisma(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }
  return prisma;
}

export async function connectDatabase(): Promise<void> {
  try {
    const client = getPrisma();
    await client.$connect();
    logger.info('✅ Prisma connected to MongoDB');
  } catch (error) {
    logger.error({ error }, '❌ Prisma connection failed');
    throw error;
  }
}

export async function closeDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    logger.info('Prisma connection closed');
  }
}
