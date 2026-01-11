import prisma from '../prisma/client.js';
import { logger } from '../utils/logger.js';
import type { MessageDirection, MessageStatus, TemplateCategory } from '@prisma/client';

/**
 * Send Message Input
 */
export interface SendMessageInput {
  recruiterId: string;
  candidateId: string;
  subject: string;
  body: string;
  bodyHtml?: string;
  jobId?: string;
  jobTitle?: string;
  threadId?: string;
  direction?: MessageDirection;
}

/**
 * Message with metadata
 */
export interface MessageWithMeta {
  id: string;
  recruiterId: string;
  candidateId: string;
  subject: string;
  body: string;
  direction: MessageDirection;
  status: MessageStatus;
  jobId: string | null;
  jobTitle: string | null;
  threadId: string | null;
  sentAt: Date;
  readAt: Date | null;
  recruiterName?: string;
  candidateName?: string;
}

/**
 * Message Service
 * Handles recruiter-candidate communication
 */
export class MessageService {
  /**
   * Send a new message
   */
  static async sendMessage(input: SendMessageInput): Promise<MessageWithMeta> {
    logger.info({ recruiterId: input.recruiterId, candidateId: input.candidateId }, 'Sending message');

    const message = await prisma.message.create({
      data: {
        recruiterId: input.recruiterId,
        candidateId: input.candidateId,
        subject: input.subject,
        body: input.body,
        bodyHtml: input.bodyHtml,
        jobId: input.jobId,
        jobTitle: input.jobTitle,
        threadId: input.threadId,
        direction: input.direction || 'RECRUITER_TO_CANDIDATE',
        status: 'SENT',
      },
      include: {
        recruiter: {
          select: { name: true },
        },
      },
    });

    return {
      id: message.id,
      recruiterId: message.recruiterId,
      candidateId: message.candidateId,
      subject: message.subject,
      body: message.body,
      direction: message.direction,
      status: message.status,
      jobId: message.jobId,
      jobTitle: message.jobTitle,
      threadId: message.threadId,
      sentAt: message.sentAt,
      readAt: message.readAt,
      recruiterName: message.recruiter.name,
    };
  }

  /**
   * Get messages for a recruiter (inbox/sent)
   */
  static async getMessages(
    recruiterId: string,
    options: {
      direction?: 'inbox' | 'sent';
      candidateId?: string;
      jobId?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ messages: MessageWithMeta[]; total: number }> {
    const { direction, candidateId, jobId, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const where: any = { recruiterId };

    if (direction === 'inbox') {
      where.direction = 'CANDIDATE_TO_RECRUITER';
    } else if (direction === 'sent') {
      where.direction = 'RECRUITER_TO_CANDIDATE';
    }

    if (candidateId) {
      where.candidateId = candidateId;
    }

    if (jobId) {
      where.jobId = jobId;
    }

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        include: {
          recruiter: {
            select: { name: true },
          },
        },
        orderBy: { sentAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.message.count({ where }),
    ]);

    return {
      messages: messages.map((m) => ({
        id: m.id,
        recruiterId: m.recruiterId,
        candidateId: m.candidateId,
        subject: m.subject,
        body: m.body,
        direction: m.direction,
        status: m.status,
        jobId: m.jobId,
        jobTitle: m.jobTitle,
        threadId: m.threadId,
        sentAt: m.sentAt,
        readAt: m.readAt,
        recruiterName: m.recruiter.name,
      })),
      total,
    };
  }

  /**
   * Get conversation thread between recruiter and candidate
   */
  static async getConversation(
    recruiterId: string,
    candidateId: string,
    options: { page?: number; limit?: number } = {}
  ): Promise<{ messages: MessageWithMeta[]; total: number }> {
    const { page = 1, limit = 50 } = options;
    const skip = (page - 1) * limit;

    const where = {
      recruiterId,
      candidateId,
    };

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        include: {
          recruiter: {
            select: { name: true },
          },
        },
        orderBy: { sentAt: 'asc' }, // Chronological for conversation
        skip,
        take: limit,
      }),
      prisma.message.count({ where }),
    ]);

    return {
      messages: messages.map((m) => ({
        id: m.id,
        recruiterId: m.recruiterId,
        candidateId: m.candidateId,
        subject: m.subject,
        body: m.body,
        direction: m.direction,
        status: m.status,
        jobId: m.jobId,
        jobTitle: m.jobTitle,
        threadId: m.threadId,
        sentAt: m.sentAt,
        readAt: m.readAt,
        recruiterName: m.recruiter.name,
      })),
      total,
    };
  }

  /**
   * Mark message as read
   */
  static async markAsRead(messageId: string, recruiterId: string): Promise<boolean> {
    const message = await prisma.message.updateMany({
      where: {
        id: messageId,
        recruiterId,
        readAt: null,
      },
      data: {
        readAt: new Date(),
        status: 'READ',
      },
    });

    return message.count > 0;
  }

  /**
   * Mark all messages from a candidate as read
   */
  static async markConversationAsRead(recruiterId: string, candidateId: string): Promise<number> {
    const result = await prisma.message.updateMany({
      where: {
        recruiterId,
        candidateId,
        direction: 'CANDIDATE_TO_RECRUITER',
        readAt: null,
      },
      data: {
        readAt: new Date(),
        status: 'READ',
      },
    });

    return result.count;
  }

  /**
   * Get unread message count
   */
  static async getUnreadCount(recruiterId: string): Promise<number> {
    return prisma.message.count({
      where: {
        recruiterId,
        direction: 'CANDIDATE_TO_RECRUITER',
        readAt: null,
      },
    });
  }

  /**
   * Archive a message
   */
  static async archiveMessage(messageId: string, recruiterId: string): Promise<boolean> {
    const result = await prisma.message.updateMany({
      where: {
        id: messageId,
        recruiterId,
      },
      data: {
        status: 'ARCHIVED',
        archivedAt: new Date(),
      },
    });

    return result.count > 0;
  }

  // ==================== TEMPLATES ====================

  /**
   * Get message templates
   */
  static async getTemplates(
    recruiterId: string,
    category?: TemplateCategory
  ): Promise<any[]> {
    const where: any = {
      OR: [
        { recruiterId },
        { isPublic: true },
      ],
    };

    if (category) {
      where.category = category;
    }

    return prisma.messageTemplate.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Create a custom template
   */
  static async createTemplate(
    recruiterId: string,
    input: {
      name: string;
      subject: string;
      body: string;
      bodyHtml?: string;
      category?: TemplateCategory;
      placeholders?: string[];
    }
  ): Promise<any> {
    return prisma.messageTemplate.create({
      data: {
        recruiterId,
        name: input.name,
        subject: input.subject,
        body: input.body,
        bodyHtml: input.bodyHtml,
        category: input.category || 'GENERAL',
        placeholders: input.placeholders || [],
        isPublic: false,
      },
    });
  }

  /**
   * Apply template with placeholders
   */
  static applyTemplate(
    template: { subject: string; body: string },
    data: Record<string, string>
  ): { subject: string; body: string } {
    let subject = template.subject;
    let body = template.body;

    for (const [key, value] of Object.entries(data)) {
      const placeholder = `{{${key}}}`;
      subject = subject.replace(new RegExp(placeholder, 'g'), value);
      body = body.replace(new RegExp(placeholder, 'g'), value);
    }

    return { subject, body };
  }

  /**
   * Delete a custom template
   */
  static async deleteTemplate(templateId: string, recruiterId: string): Promise<boolean> {
    const result = await prisma.messageTemplate.deleteMany({
      where: {
        id: templateId,
        recruiterId,
        isPublic: false, // Can't delete system templates
      },
    });

    return result.count > 0;
  }
}

export default MessageService;
