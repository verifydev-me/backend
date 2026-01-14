// ==================== MESSAGE SERVICE ====================

import { getPrisma } from '../config/database.js';
import { chatRoomService } from './chat-room.service.js';
import { logger } from '../utils/logger.js';
import { Role, MessageType, type Message } from '@prisma/client';

export interface SendMessageInput {
  roomId: string; // The chat_... ID
  senderId: string;
  senderRole: 'recruiter' | 'candidate';
  senderName?: string;
  content: string;
  type?: 'text' | 'file' | 'system';
  metadata?: {
    fileName?: string;
    fileUrl?: string;
    fileSize?: number;
  };
}

export interface PaginationOptions {
  limit: number;
  before?: string;  // Cursor-based: messageId to fetch before
}

export const messageService = {
  /**
   * Save a new message
   */
  async saveMessage(input: SendMessageInput): Promise<Message> {
    const prisma = getPrisma();

    const senderRoleEnum = input.senderRole === 'recruiter' ? Role.RECRUITER : Role.CANDIDATE;
    const msgTypeEnum = input.type === 'file' ? MessageType.FILE : 
                        input.type === 'system' ? MessageType.SYSTEM : MessageType.TEXT;

    const message = await prisma.message.create({
      data: {
        roomId: input.roomId, // Store string ID as well
        chatRoom: {
          connect: { roomId: input.roomId } // Connect via unique roomId
        },
        senderId: input.senderId,
        senderRole: senderRoleEnum,
        senderName: input.senderName,
        content: input.content,
        type: msgTypeEnum,
        metadata: input.metadata || {},
        deliveredAt: new Date(),
        readBy: [
          { userId: input.senderId, readAt: new Date() }
        ]
      }
    });

    // Update room's last message
    await chatRoomService.updateLastMessage(
      input.roomId,
      input.content,
      input.senderId
    );

    logger.debug({ roomId: input.roomId, messageId: message.id }, '💬 Message saved');

    return message;
  },

  /**
   * Get paginated messages for a room
   */
  async getMessages(
    roomId: string,
    options: PaginationOptions
  ): Promise<Message[]> {
    const prisma = getPrisma();
    
    // Build query
    const query: any = {
      where: { roomId },
      take: options.limit,
      orderBy: { createdAt: 'desc' }
    };

    if (options.before) {
      query.cursor = { id: options.before };
      query.skip = 1; // Skip the cursor itself
    }

    return prisma.message.findMany(query);
  },

  /**
   * Mark messages as read by a user
   */
  async markAsRead(
    roomId: string,
    userId: string,
    upToMessageId?: string
  ): Promise<number> {
    const prisma = getPrisma();

    // 1. Find unread messages
    // Messages in this room, NOT sent by me, NOT read by me
    const whereClause: any = {
      roomId,
      senderId: { not: userId },
      NOT: {
        readBy: {
          some: { userId }
        }
      }
    };

    if (upToMessageId) {
      // Get reference message time to optimize or just trust ID if monotonic
      // Prisma Mongo doesn't easily compare IDs in range like ObjectId directly unless we fetch timestamp
      // We'll trust the caller passes a valid ID or fetch it
       const refMsg = await prisma.message.findUnique({ where: { id: upToMessageId } });
       if (refMsg) {
         whereClause.createdAt = { lte: refMsg.createdAt };
       }
    }

    const unreadMessages = await prisma.message.findMany({
      where: whereClause,
      select: { id: true }
    });

    if (unreadMessages.length === 0) return 0;

    // 2. Update each message to push read receipt
    // Parallel updates
    const updates = unreadMessages.map(msg => 
      prisma.message.update({
        where: { id: msg.id },
        data: {
          readBy: {
            push: { userId, readAt: new Date() }
          }
        }
      })
    );

    await Promise.all(updates);

    // Reset unread count in room
    await chatRoomService.resetUnread(roomId, userId);

    logger.debug({ roomId, userId, count: unreadMessages.length }, '✓ Messages marked as read');

    return unreadMessages.length;
  },

  /**
   * Get unread message count for a user in a room
   */
  async getUnreadCount(roomId: string, userId: string): Promise<number> {
    const prisma = getPrisma();
    return prisma.message.count({
      where: {
        roomId,
        senderId: { not: userId },
        NOT: {
          readBy: {
            some: { userId }
          }
        }
      }
    });
  },

  /**
   * Get the latest message in a room
   */
  async getLatestMessage(roomId: string): Promise<Message | null> {
    const prisma = getPrisma();
    return prisma.message.findFirst({
      where: { roomId },
      orderBy: { createdAt: 'desc' }
    });
  },
};

