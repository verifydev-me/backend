// ==================== CHAT ROOM SERVICE ====================

import { getPrisma } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { type ChatRoom } from '@prisma/client';

/**
 * Room ID format: chat_{jobId}_{candidateId}
 * For Direct Message: dm_{smallerId}_{largerId} (normalized ordering)
 * 
 * IMPORTANT: Always normalize DM room IDs by sorting participant IDs
 * This prevents duplicate rooms with swapped participant order
 */
export function generateRoomId(candidateId: string, recruiterId: string, jobId?: string): string {
  if (!jobId || jobId === 'direct') {
    // Normalize DM room ID by always using lexicographically smaller ID first
    const [id1, id2] = [candidateId, recruiterId].sort();
    return `dm_${id1}_${id2}`;
  }
  return `chat_${jobId}_${candidateId}`;
}

export function parseRoomId(roomId: string): { jobId: string | null; candidateId: string; recruiterId?: string } | null {
  const parts = roomId.split('_');
  if (parts[0] === 'dm') {
      // For DM rooms, we can't determine which is candidate vs recruiter from ID alone
      // Return the IDs in order they appear
      return { jobId: null, candidateId: parts[1], recruiterId: parts[2] };
  }
  if (parts.length !== 3 || parts[0] !== 'chat') {
    return null;
  }
  return { jobId: parts[1], candidateId: parts[2] };
}

export const chatRoomService = {
  /**
   * Create or get existing room
   * Now with proper deduplication - checks for existing rooms thoroughly
   */
  async getOrCreateRoom(
    jobId: string | undefined,
    candidateId: string,
    recruiterId: string,
    candidateName?: string,
    recruiterName?: string
  ): Promise<ChatRoom> {
    const prisma = getPrisma();
    const roomId = generateRoomId(candidateId, recruiterId, jobId);

    // Try to find existing room by roomId (unique constraint)
    let existing = await prisma.chatRoom.findUnique({
      where: { roomId },
    });

    if (existing) {
      logger.debug({ roomId }, '♻️  Returning existing room');
      return existing;
    }

    // For DM rooms, also check if a room exists with legacy/alternate naming
    // This handles migration from old room ID format
    if (!jobId || jobId === 'direct') {
      // Check for room with either participant as candidate or recruiter
      const alternativeRooms = await prisma.chatRoom.findMany({
        where: {
          isActive: true,
          // Cast to any to bypass strict type checking for nullable field filter
          jobId: null as any,
          OR: [
            { candidateId, recruiterId },
            { candidateId: recruiterId, recruiterId: candidateId }
          ]
        },
        take: 1
      });

      if (alternativeRooms.length > 0) {
        existing = alternativeRooms[0];
        logger.info({ oldRoomId: existing.roomId, newRoomId: roomId }, '🔄 Found room with alternative format');
        return existing;
      }
    }

    // Create new room - no existing room found
    const newRoom = await prisma.chatRoom.create({
      data: {
        roomId,
        // For optional fields in Prisma, omit the field or set to undefined
        ...(jobId && jobId !== 'direct' ? { jobId: jobId as string } : {}),
        candidateId,
        recruiterId,
        candidateName,
        recruiterName,
        isActive: true,
        unreadCounts: [
          { userId: candidateId, count: 0 },
          { userId: recruiterId, count: 0 }
        ]
      }
    });

    logger.info({ roomId, jobId: jobId || 'direct' }, '🏠 New chat room created');
    return newRoom;
  },

  /**
   * Get room by ID
   */
  async getRoomById(roomId: string): Promise<ChatRoom | null> {
    const prisma = getPrisma();
    return prisma.chatRoom.findUnique({ where: { roomId } });
  },

  /**
   * Get all rooms for a user
   */
  async getUserRooms(userId: string): Promise<ChatRoom[]> {
    const prisma = getPrisma();
    return prisma.chatRoom.findMany({
      where: {
        isActive: true,
        OR: [
          { candidateId: userId },
          { recruiterId: userId }
        ]
      },
      orderBy: { updatedAt: 'desc' }
    });
  },

  /**
   * Check if user has access to room
   */
  async canAccessRoom(roomId: string, userId: string): Promise<boolean> {
    const prisma = getPrisma();
    const room = await prisma.chatRoom.findUnique({
      where: { roomId }
    });
    
    if (!room) return false;
    return room.candidateId === userId || room.recruiterId === userId;
  },

  /**
   * Get the other participant in the room
   * Returns a simplified object compatible with previous interface
   */
  getOtherParticipant(room: ChatRoom, userId: string) {
    if (room.candidateId === userId) {
      return {
        userId: room.recruiterId,
        role: 'recruiter',
        name: room.recruiterName
      };
    } else {
      return {
        userId: room.candidateId,
        role: 'candidate',
        name: room.candidateName
      };
    }
  },

  /**
   * Update last message in room
   */
  async updateLastMessage(
    roomId: string,
    content: string,
    senderId: string
  ): Promise<void> {
    const prisma = getPrisma();
    await prisma.chatRoom.update({
      where: { roomId },
      data: {
        lastMessage: {
          content: content.substring(0, 100),
          senderId,
          sentAt: new Date()
        }
      }
    });
  },

  /**
   * Increment unread count for a user
   * MongoDB Raw Update is safer for atomic increment inside array
   */
  async incrementUnread(roomId: string, userId: string): Promise<void> {
    const prisma = getPrisma();
    
    // We need raw query for atomic array update or fetch-modify-save
    // Prisma doesn't support atomic array field updates easily yet for composite types
    // So we fetch, update, save. Concurrency risk is low for chat unread counts.
    
    const room = await prisma.chatRoom.findUnique({ where: { roomId } });
    if (!room) return;

    const newCounts = room.unreadCounts.map(u => {
      if (u.userId === userId) {
        return { ...u, count: u.count + 1 };
      }
      return u;
    });

    await prisma.chatRoom.update({
      where: { roomId },
      data: { unreadCounts: newCounts }
    });
  },

  /**
   * Reset unread count for a user
   */
  async resetUnread(roomId: string, userId: string): Promise<void> {
    const prisma = getPrisma();
    
    const room = await prisma.chatRoom.findUnique({ where: { roomId } });
    if (!room) return;

    const newCounts = room.unreadCounts.map(u => {
      if (u.userId === userId) {
        return { ...u, count: 0 };
      }
      return u;
    });

    await prisma.chatRoom.update({
      where: { roomId },
      data: { unreadCounts: newCounts }
    });
  },
};

