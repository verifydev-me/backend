// ==================== PRESENCE SERVICE ====================

import { presenceOps } from '../config/redis.js';
import { logger } from '../utils/logger.js';

export const presenceService = {
  /**
   * Mark user as online when connected
   */
  async userConnected(userId: string, socketId: string): Promise<void> {
    await presenceOps.setUserOnline(userId, socketId);
    logger.debug({ userId, socketId }, '🟢 User online');
  },

  /**
   * Handle user disconnect (remove socket, check if fully offline)
   */
  async userDisconnected(socketId: string): Promise<{ userId: string | null; isFullyOffline: boolean }> {
    const userId = await presenceOps.removeSocket(socketId);
    
    if (!userId) {
      return { userId: null, isFullyOffline: false };
    }

    const isFullyOffline = !(await presenceOps.isUserOnline(userId));
    
    if (isFullyOffline) {
      logger.debug({ userId }, '🔴 User fully offline');
    }

    return { userId, isFullyOffline };
  },

  /**
   * Check if user is online
   */
  async isOnline(userId: string): Promise<boolean> {
    return presenceOps.isUserOnline(userId);
  },

  /**
   * Get all socket IDs for a user
   */
  async getUserSockets(userId: string): Promise<string[]> {
    return presenceOps.getUserSockets(userId);
  },

  /**
   * Join room presence
   */
  async joinRoom(roomId: string, userId: string): Promise<void> {
    await presenceOps.joinRoom(roomId, userId);
    logger.debug({ roomId, userId }, '📥 User joined room presence');
  },

  /**
   * Leave room presence
   */
  async leaveRoom(roomId: string, userId: string): Promise<void> {
    await presenceOps.leaveRoom(roomId, userId);
    logger.debug({ roomId, userId }, '📤 User left room presence');
  },

  /**
   * Get online users in a room
   */
  async getRoomOnlineUsers(roomId: string): Promise<string[]> {
    return presenceOps.getRoomOnlineUsers(roomId);
  },

  /**
   * Check if user has too many connections
   */
  async hasExceededConnectionLimit(userId: string, maxConnections: number): Promise<boolean> {
    const count = await presenceOps.getUserSocketCount(userId);
    return count >= maxConnections;
  },
};
