import { Response } from 'express';
import { MessageService } from '../../../domain/message.service.js';
import { InterviewService } from '../../../domain/interview.service.js';
import { logger } from '../../../utils/logger.js';
import type { RecruiterRequest, ApiResponse } from '../../../types/index.js';
import { z } from 'zod';

// Validation schemas
const sendMessageSchema = z.object({
  candidateId: z.string(),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  bodyHtml: z.string().optional(),
  jobId: z.string().optional(),
  jobTitle: z.string().optional(),
  threadId: z.string().optional(),
});

const scheduleInterviewSchema = z.object({
  candidateId: z.string(),
  jobId: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  type: z.enum(['PHONE', 'VIDEO', 'ONSITE', 'TECHNICAL', 'HR', 'FINAL']).optional(),
  proposedSlots: z.array(z.string().datetime()).min(1).max(5),
  duration: z.number().min(15).max(480).optional(),
  timezone: z.string().optional(),
  meetingLink: z.string().url().optional(),
  location: z.string().optional(),
  instructions: z.string().optional(),
  interviewers: z.array(z.string()).optional(),
});

const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  bodyHtml: z.string().optional(),
  category: z.enum(['JOB_INVITATION', 'INTERVIEW_REQUEST', 'OFFER_LETTER', 'REJECTION', 'FOLLOW_UP', 'GENERAL']).optional(),
  placeholders: z.array(z.string()).optional(),
});

/**
 * Communication Controller
 * Handles messages, interviews, and templates
 */
export class CommunicationController {
  // ==================== MESSAGES ====================

  /**
   * POST /messages
   * Send a message to a candidate
   */
  static async sendMessage(
    req: RecruiterRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.recruiter) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const validation = sendMessageSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          message: 'Invalid message data',
          error: { code: 'VALIDATION_ERROR', details: validation.error.format() },
        });
        return;
      }

      const message = await MessageService.sendMessage({
        recruiterId: req.recruiter.id,
        ...validation.data,
      });

      res.status(201).json({
        success: true,
        message: 'Message sent successfully',
        data: { message },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to send message');
      res.status(500).json({ success: false, message: 'Failed to send message', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * GET /messages
   * Get messages (inbox/sent)
   */
  static async getMessages(
    req: RecruiterRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.recruiter) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const { direction, candidateId, jobId, page, limit } = req.query;

      const result = await MessageService.getMessages(req.recruiter.id, {
        direction: direction as 'inbox' | 'sent' | undefined,
        candidateId: candidateId as string | undefined,
        jobId: jobId as string | undefined,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
      });

      res.json({
        success: true,
        message: 'Messages retrieved',
        data: { messages: result.messages },
        meta: { total: result.total },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get messages');
      res.status(500).json({ success: false, message: 'Failed to get messages', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * GET /messages/conversation/:candidateId
   * Get conversation thread with a candidate
   */
  static async getConversation(
    req: RecruiterRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.recruiter) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const { candidateId } = req.params;
      const { page, limit } = req.query;

      const result = await MessageService.getConversation(
        req.recruiter.id,
        candidateId,
        {
          page: page ? parseInt(page as string) : 1,
          limit: limit ? parseInt(limit as string) : 50,
        }
      );

      // Mark conversation as read
      await MessageService.markConversationAsRead(req.recruiter.id, candidateId);

      res.json({
        success: true,
        message: 'Conversation retrieved',
        data: { messages: result.messages },
        meta: { total: result.total },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get conversation');
      res.status(500).json({ success: false, message: 'Failed to get conversation', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * PATCH /messages/:messageId/read
   * Mark message as read
   */
  static async markMessageRead(
    req: RecruiterRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.recruiter) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const { messageId } = req.params;
      await MessageService.markAsRead(messageId, req.recruiter.id);

      res.json({
        success: true,
        message: 'Message marked as read',
      });
    } catch (error) {
      logger.error({ error }, 'Failed to mark message as read');
      res.status(500).json({ success: false, message: 'Failed to update message', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * GET /messages/unread-count
   * Get unread message count
   */
  static async getUnreadCount(
    req: RecruiterRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.recruiter) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const count = await MessageService.getUnreadCount(req.recruiter.id);

      res.json({
        success: true,
        message: 'Unread count retrieved',
        data: { unreadCount: count },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get unread count');
      res.status(500).json({ success: false, message: 'Failed to get count', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * DELETE /messages/:messageId
   * Archive a message
   */
  static async archiveMessage(
    req: RecruiterRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.recruiter) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const { messageId } = req.params;
      await MessageService.archiveMessage(messageId, req.recruiter.id);

      res.json({
        success: true,
        message: 'Message archived',
      });
    } catch (error) {
      logger.error({ error }, 'Failed to archive message');
      res.status(500).json({ success: false, message: 'Failed to archive', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  // ==================== INTERVIEWS ====================

  /**
   * POST /interviews
   * Schedule a new interview
   */
  static async scheduleInterview(
    req: RecruiterRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.recruiter) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const validation = scheduleInterviewSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          message: 'Invalid interview data',
          error: { code: 'VALIDATION_ERROR', details: validation.error.format() },
        });
        return;
      }

      const { proposedSlots, ...rest } = validation.data;
      
      const interview = await InterviewService.scheduleInterview({
        recruiterId: req.recruiter.id,
        proposedSlots: proposedSlots.map((s) => new Date(s)),
        ...rest,
      });

      res.status(201).json({
        success: true,
        message: 'Interview scheduled',
        data: { interview },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to schedule interview');
      res.status(500).json({ success: false, message: 'Failed to schedule', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * GET /interviews
   * Get interviews
   */
  static async getInterviews(
    req: RecruiterRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.recruiter) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const { status, candidateId, jobId, upcoming, page, limit } = req.query;

      const result = await InterviewService.getInterviews(req.recruiter.id, {
        status: status as any,
        candidateId: candidateId as string | undefined,
        jobId: jobId as string | undefined,
        upcoming: upcoming === 'true',
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
      });

      res.json({
        success: true,
        message: 'Interviews retrieved',
        data: { interviews: result.interviews },
        meta: { total: result.total },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get interviews');
      res.status(500).json({ success: false, message: 'Failed to get interviews', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * GET /interviews/:interviewId
   * Get interview details
   */
  static async getInterview(
    req: RecruiterRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.recruiter) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const { interviewId } = req.params;
      const interview = await InterviewService.getInterview(interviewId, req.recruiter.id);

      if (!interview) {
        res.status(404).json({ success: false, message: 'Interview not found', error: { code: 'NOT_FOUND' } });
        return;
      }

      res.json({
        success: true,
        message: 'Interview retrieved',
        data: { interview },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get interview');
      res.status(500).json({ success: false, message: 'Failed to get interview', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * PATCH /interviews/:interviewId
   * Update interview
   */
  static async updateInterview(
    req: RecruiterRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.recruiter) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const { interviewId } = req.params;
      const interview = await InterviewService.updateInterview(
        interviewId,
        req.recruiter.id,
        req.body
      );

      if (!interview) {
        res.status(404).json({ success: false, message: 'Interview not found', error: { code: 'NOT_FOUND' } });
        return;
      }

      res.json({
        success: true,
        message: 'Interview updated',
        data: { interview },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to update interview');
      res.status(500).json({ success: false, message: 'Failed to update', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * POST /interviews/:interviewId/reschedule
   * Reschedule interview with new slots
   */
  static async rescheduleInterview(
    req: RecruiterRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.recruiter) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const { interviewId } = req.params;
      const { proposedSlots } = req.body;

      if (!proposedSlots || !Array.isArray(proposedSlots) || proposedSlots.length === 0) {
        res.status(400).json({
          success: false,
          message: 'proposedSlots is required',
          error: { code: 'VALIDATION_ERROR' },
        });
        return;
      }

      const interview = await InterviewService.rescheduleInterview(
        interviewId,
        req.recruiter.id,
        proposedSlots.map((s: string) => new Date(s))
      );

      if (!interview) {
        res.status(404).json({ success: false, message: 'Interview not found or cannot be rescheduled', error: { code: 'NOT_FOUND' } });
        return;
      }

      res.json({
        success: true,
        message: 'Interview rescheduled',
        data: { interview },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to reschedule interview');
      res.status(500).json({ success: false, message: 'Failed to reschedule', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * POST /interviews/:interviewId/cancel
   * Cancel interview
   */
  static async cancelInterview(
    req: RecruiterRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.recruiter) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const { interviewId } = req.params;
      const { reason } = req.body;

      const cancelled = await InterviewService.cancelInterview(
        interviewId,
        req.recruiter.id,
        reason
      );

      if (!cancelled) {
        res.status(404).json({ success: false, message: 'Interview not found or cannot be cancelled', error: { code: 'NOT_FOUND' } });
        return;
      }

      res.json({
        success: true,
        message: 'Interview cancelled',
      });
    } catch (error) {
      logger.error({ error }, 'Failed to cancel interview');
      res.status(500).json({ success: false, message: 'Failed to cancel', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * POST /interviews/:interviewId/complete
   * Mark interview as completed with feedback
   */
  static async completeInterview(
    req: RecruiterRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.recruiter) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const { interviewId } = req.params;
      const { recruiterFeedback, rating } = req.body;

      const interview = await InterviewService.completeInterview(
        interviewId,
        req.recruiter.id,
        { recruiterFeedback, rating }
      );

      if (!interview) {
        res.status(404).json({ success: false, message: 'Interview not found or not confirmed', error: { code: 'NOT_FOUND' } });
        return;
      }

      res.json({
        success: true,
        message: 'Interview completed',
        data: { interview },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to complete interview');
      res.status(500).json({ success: false, message: 'Failed to complete', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * GET /interviews/upcoming
   * Get upcoming interviews
   */
  static async getUpcomingInterviews(
    req: RecruiterRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.recruiter) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const { days } = req.query;
      const interviews = await InterviewService.getUpcomingInterviews(
        req.recruiter.id,
        days ? parseInt(days as string) : 7
      );

      res.json({
        success: true,
        message: 'Upcoming interviews retrieved',
        data: { interviews },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get upcoming interviews');
      res.status(500).json({ success: false, message: 'Failed to get interviews', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * GET /interviews/stats
   * Get interview statistics
   */
  static async getInterviewStats(
    req: RecruiterRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.recruiter) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const stats = await InterviewService.getInterviewStats(req.recruiter.id);

      res.json({
        success: true,
        message: 'Interview stats retrieved',
        data: { stats },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get interview stats');
      res.status(500).json({ success: false, message: 'Failed to get stats', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  // ==================== TEMPLATES ====================

  /**
   * GET /templates
   * Get message templates
   */
  static async getTemplates(
    req: RecruiterRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.recruiter) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const { category } = req.query;
      const templates = await MessageService.getTemplates(
        req.recruiter.id,
        category as any
      );

      res.json({
        success: true,
        message: 'Templates retrieved',
        data: { templates },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get templates');
      res.status(500).json({ success: false, message: 'Failed to get templates', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * POST /templates
   * Create a custom template
   */
  static async createTemplate(
    req: RecruiterRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.recruiter) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const validation = createTemplateSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          message: 'Invalid template data',
          error: { code: 'VALIDATION_ERROR', details: validation.error.format() },
        });
        return;
      }

      const template = await MessageService.createTemplate(
        req.recruiter.id,
        validation.data
      );

      res.status(201).json({
        success: true,
        message: 'Template created',
        data: { template },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to create template');
      res.status(500).json({ success: false, message: 'Failed to create template', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * DELETE /templates/:templateId
   * Delete a custom template
   */
  static async deleteTemplate(
    req: RecruiterRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.recruiter) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const { templateId } = req.params;
      const deleted = await MessageService.deleteTemplate(templateId, req.recruiter.id);

      if (!deleted) {
        res.status(404).json({ success: false, message: 'Template not found or is a system template', error: { code: 'NOT_FOUND' } });
        return;
      }

      res.json({
        success: true,
        message: 'Template deleted',
      });
    } catch (error) {
      logger.error({ error }, 'Failed to delete template');
      res.status(500).json({ success: false, message: 'Failed to delete template', error: { code: 'INTERNAL_ERROR' } });
    }
  }
}

export default CommunicationController;
