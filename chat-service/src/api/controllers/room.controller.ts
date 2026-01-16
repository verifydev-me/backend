// ==================== ROOM CONTROLLER ====================

import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { chatRoomService, generateRoomId } from '../../services/chat-room.service.js';
import { messageService } from '../../services/message.service.js';
import { presenceService } from '../../services/presence.service.js';
import { logger } from '../../utils/logger.js';

export const roomController = {
  /**
   * GET /api/v1/chat/rooms
   * Get all rooms for current user
   */
  async getRooms(req: AuthenticatedRequest, res: Response) {
    try {
      const { userId } = req.user;
      const rooms = await chatRoomService.getUserRooms(userId);

      // Enrich with unread counts and otherParticipant details
      const enrichedRooms = rooms.map((room: any) => {
        const otherParticipant = chatRoomService.getOtherParticipant(room, userId);
        
        return {
          ...room,
          unread: room.unreadCounts?.find((u: any) => u.userId === userId)?.count || 0,
          // Always include otherParticipant with name
          otherParticipant
        };
      });

      res.json({
        success: true,
        data: enrichedRooms,
      });
    } catch (error) {
      logger.error({ error }, 'Error fetching rooms');
      res.status(500).json({
        success: false,
        message: 'Failed to fetch rooms',
      });
    }
  },

  /**
   * GET /api/v1/chat/rooms/:roomId
   * Get room details
   */
  async getRoom(req: AuthenticatedRequest, res: Response) {
    try {
      const { roomId } = req.params;
      const { userId } = req.user;

      // Validate access
      const hasAccess = await chatRoomService.canAccessRoom(roomId, userId);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }

      const room = await chatRoomService.getRoomById(roomId);
      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Room not found',
        });
      }

      // Get online status of other participant
      const other = chatRoomService.getOtherParticipant(room, userId);
      const otherOnline = other ? await presenceService.isOnline(other.userId) : false;

      res.json({
        success: true,
        data: {
          ...room,
          otherParticipant: other,
          otherOnline,
          unread: room.unreadCounts.find(u => u.userId === userId)?.count || 0,
        },
      });
    } catch (error) {
      logger.error({ error }, 'Error fetching room');
      res.status(500).json({
        success: false,
        message: 'Failed to fetch room',
      });
    }
  },

  /**
   * POST /api/v1/chat/rooms
   * Create or get room for a job application
   * 
   * Body: { jobId, candidateId, recruiterId, candidateName?, recruiterName? }
   */
  async createRoom(req: AuthenticatedRequest, res: Response) {
    try {
      const { userId, role } = req.user;
      const { jobId, candidateId, recruiterId, candidateName, recruiterName } = req.body;

      // jobId is now optional for direct messaging
      // if (!jobId) {
      //   return res.status(400).json({
      //     success: false,
      //     message: 'jobId is required',
      //   });
      // }

      // Determine participant IDs based on role
      let finalCandidateId = candidateId;
      let finalRecruiterId = recruiterId;

      if (role === 'candidate') {
        finalCandidateId = userId;
        if (!recruiterId) {
          return res.status(400).json({
            success: false,
            message: 'recruiterId is required',
          });
        }
      } else if (role === 'recruiter') {
        finalRecruiterId = userId;
        if (!candidateId) {
          return res.status(400).json({
            success: false,
            message: 'candidateId is required',
          });
        }
      }

      const room = await chatRoomService.getOrCreateRoom(
        jobId,
        finalCandidateId,
        finalRecruiterId,
        candidateName,
        recruiterName
      );

      res.json({
        success: true,
        data: room,
      });
    } catch (error) {
      logger.error({ error }, 'Error creating room');
      res.status(500).json({
        success: false,
        message: 'Failed to create room',
      });
    }
  },
};
