// ==================== REDIS CONNECTION ====================

import Redis from 'ioredis';
import { config } from './index.js';
import { logger } from '../utils/logger.js';

let redis: any;
let pubClient: any;
let subClient: any;

export async function connectRedis(): Promise<any> {
  const redisConfig = {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
  };

  redis = new (Redis as any)(redisConfig);
  pubClient = new (Redis as any)(redisConfig);
  subClient = new (Redis as any)(redisConfig);

  redis.on('connect', () => {
    logger.info('✅ Redis connected');
  });

  redis.on('error', (error: any) => {
    logger.error({ error }, '❌ Redis error');
  });

  return redis;
}

export function getRedis(): any {
  if (!redis) {
    throw new Error('Redis not initialized');
  }
  return redis;
}

export function getPubClient(): any {
  if (!pubClient) {
    throw new Error('Redis pub client not initialized');
  }
  return pubClient;
}

export function getSubClient(): any {
  if (!subClient) {
    throw new Error('Redis sub client not initialized');
  }
  return subClient;
}

// ==================== PRESENCE OPERATIONS ====================

const ONLINE_USERS_KEY = 'chat:online:users';
const USER_SOCKETS_PREFIX = 'chat:user:sockets:';
const SOCKET_USER_PREFIX = 'chat:socket:user:';
const ROOM_ONLINE_PREFIX = 'chat:room:online:';

export const presenceOps = {
  // Mark user as online
  async setUserOnline(userId: string, socketId: string): Promise<void> {
    const multi = redis.multi();
    multi.sadd(ONLINE_USERS_KEY, userId);
    multi.sadd(`${USER_SOCKETS_PREFIX}${userId}`, socketId);
    multi.set(`${SOCKET_USER_PREFIX}${socketId}`, userId);
    await multi.exec();
  },

  // Mark user as offline (remove specific socket)
  async removeSocket(socketId: string): Promise<string | null> {
    const userId = await redis.get(`${SOCKET_USER_PREFIX}${socketId}`);
    if (!userId) return null;

    await redis.del(`${SOCKET_USER_PREFIX}${socketId}`);
    await redis.srem(`${USER_SOCKETS_PREFIX}${userId}`, socketId);

    // Check if user has other active sockets
    const remainingSockets = await redis.scard(`${USER_SOCKETS_PREFIX}${userId}`);
    if (remainingSockets === 0) {
      await redis.srem(ONLINE_USERS_KEY, userId);
      await redis.del(`${USER_SOCKETS_PREFIX}${userId}`);
    }

    return userId;
  },

  // Check if user is online
  async isUserOnline(userId: string): Promise<boolean> {
    return (await redis.sismember(ONLINE_USERS_KEY, userId)) === 1;
  },

  // Get all sockets for a user
  async getUserSockets(userId: string): Promise<string[]> {
    return redis.smembers(`${USER_SOCKETS_PREFIX}${userId}`);
  },

  // Get user from socket
  async getUserFromSocket(socketId: string): Promise<string | null> {
    return redis.get(`${SOCKET_USER_PREFIX}${socketId}`);
  },

  // Add user to room presence
  async joinRoom(roomId: string, userId: string): Promise<void> {
    await redis.sadd(`${ROOM_ONLINE_PREFIX}${roomId}`, userId);
  },

  // Remove user from room presence
  async leaveRoom(roomId: string, userId: string): Promise<void> {
    await redis.srem(`${ROOM_ONLINE_PREFIX}${roomId}`, userId);
  },

  // Get online users in room
  async getRoomOnlineUsers(roomId: string): Promise<string[]> {
    return redis.smembers(`${ROOM_ONLINE_PREFIX}${roomId}`);
  },

  // Get socket count for user
  async getUserSocketCount(userId: string): Promise<number> {
    return redis.scard(`${USER_SOCKETS_PREFIX}${userId}`);
  },
};

export async function closeRedis(): Promise<void> {
  if (redis) await redis.quit();
  if (pubClient) await pubClient.quit();
  if (subClient) await subClient.quit();
  logger.info('Redis connections closed');
}
