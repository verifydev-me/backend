// ==================== MESSAGE CONTROLLER ====================

import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { chatRoomService } from '../../services/chat-room.service.js';
import { messageService } from '../../services/message.service.js';
import { logger } from '../../utils/logger.js';

export const messageController = {
  /**
   * GET /api/v1/chat/rooms/:roomId/messages
   * Get paginated messages for a room
   * 
   * Query: { limit?: number, before?: string }
   */
  async getMessages(req: AuthenticatedRequest, res: Response) {
    try {
      const { roomId } = req.params;
      const { userId } = req.user;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const before = req.query.before as string | undefined;

      // Validate access
      const hasAccess = await chatRoomService.canAccessRoom(roomId, userId);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }

      const messages = await messageService.getMessages(roomId, { limit, before });

      // Get unread count
      const unreadCount = await messageService.getUnreadCount(roomId, userId);

      res.json({
        success: true,
        data: {
          messages: messages.reverse(), // Return in chronological order
          unreadCount,
          hasMore: messages.length === limit,
          nextCursor: messages.length > 0 ? messages[0].id : null,
        },
      });
    } catch (error) {
      logger.error({ error }, 'Error fetching messages');
      res.status(500).json({
        success: false,
        message: 'Failed to fetch messages',
      });
    }
  },

  /**
   * POST /api/v1/chat/rooms/:roomId/messages
   * Send a message (REST fallback)
   * 
   * Body: { content, type? }
   */
  async sendMessage(req: AuthenticatedRequest, res: Response) {
    try {
      const { roomId } = req.params;
      const { userId, role } = req.user;
      const { content, type = 'text' } = req.body;

      if (!content?.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Content is required',
        });
      }

      // Validate access
      const hasAccess = await chatRoomService.canAccessRoom(roomId, userId);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }

      const message = await messageService.saveMessage({
        roomId,
        senderId: userId,
        senderRole: role,
        content: content.trim(),
        type,
      });

      res.status(201).json({
        success: true,
        data: message,
      });
    } catch (error) {
      logger.error({ error }, 'Error sending message');
      res.status(500).json({
        success: false,
        message: 'Failed to send message',
      });
    }
  },

  /**
   * PUT /api/v1/chat/rooms/:roomId/read
   * Mark messages as read
   * 
   * Body: { messageId? }
   */
  async markAsRead(req: AuthenticatedRequest, res: Response) {
    try {
      const { roomId } = req.params;
      const { userId } = req.user;
      const { messageId } = req.body;

      // Validate access
      const hasAccess = await chatRoomService.canAccessRoom(roomId, userId);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }

      const count = await messageService.markAsRead(roomId, userId, messageId);

      res.json({
        success: true,
        data: { markedCount: count },
      });
    } catch (error) {
      logger.error({ error }, 'Error marking as read');
      res.status(500).json({
        success: false,
        message: 'Failed to mark as read',
      });
    }
  },
  /**
   * POST /api/v1/chat/direct
   * Send a direct message (Create room if needed + Send)
   * 
   * Body: { candidateId, recruiterId, content, subject?, jobId? }
   */
  async sendDirectMessage(req: AuthenticatedRequest, res: Response) {
    try {
      const { userId, role } = req.user;
      const { candidateId, recruiterId, content, subject, jobId, type = 'text' } = req.body;

      if (!content?.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Content is required',
        });
      }

      // Determine participant IDs
      let finalCandidateId = candidateId;
      let finalRecruiterId = recruiterId;
      let recipientId = '';

      if (role === 'candidate') {
        finalCandidateId = userId;
        recipientId = recruiterId;
        if (!recruiterId) return res.status(400).json({ success: false, message: 'recruiterId required' });
      } else if (role === 'recruiter') {
        finalRecruiterId = userId;
        recipientId = candidateId;
        if (!candidateId) return res.status(400).json({ success: false, message: 'candidateId required' });
      }

      // 1. Get or Create Room
      const room = await chatRoomService.getOrCreateRoom(
        jobId,
        finalCandidateId,
        finalRecruiterId
      );

      // 2. Format content with subject if present
      let finalContent = content.trim();
      if (subject?.trim()) {
        finalContent = `**${subject.trim()}**\n\n${finalContent}`;
      }

      // 3. Save Message
      const message = await messageService.saveMessage({
        roomId: room.roomId,
        senderId: userId,
        senderRole: role,
        content: finalContent,
        type,
      });

      res.status(201).json({
        success: true,
        data: {
          room,
          message
        },
      });
    } catch (error) {
      logger.error({ error }, 'Error sending direct message');
      res.status(500).json({
        success: false,
        message: 'Failed to send direct message',
      });
    }
  },
};
