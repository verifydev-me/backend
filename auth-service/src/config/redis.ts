import Redis from 'ioredis';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('connect', () => {
  logger.info('✅ Redis connected');
});

redis.on('error', (error) => {
  logger.error({ error }, '❌ Redis connection error');
});

// Token blacklist operations
export const tokenBlacklist = {
  async add(token: string, expirySeconds: number): Promise<void> {
    await redis.setex(`blacklist:${token}`, expirySeconds, '1');
  },

  async isBlacklisted(token: string): Promise<boolean> {
    const result = await redis.get(`blacklist:${token}`);
    return result === '1';
  },
};

// Session operations
export const sessionStore = {
  async set(userId: string, sessionId: string, expirySeconds: number): Promise<void> {
    await redis.setex(`session:${userId}:${sessionId}`, expirySeconds, '1');
  },

  async get(userId: string, sessionId: string): Promise<boolean> {
    const result = await redis.get(`session:${userId}:${sessionId}`);
    return result === '1';
  },

  async delete(userId: string, sessionId: string): Promise<void> {
    await redis.del(`session:${userId}:${sessionId}`);
  },

  async deleteAll(userId: string): Promise<void> {
    const keys = await redis.keys(`session:${userId}:*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  },
};

export default redis;
