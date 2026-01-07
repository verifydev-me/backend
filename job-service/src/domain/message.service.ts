import { prisma } from '../prisma/client.js';
import type { Message, SenderType } from '../../node_modules/.prisma/job-client/index.js';

export interface CreateMessageDTO {
  senderId: string;
  senderType: SenderType;
  receiverId: string;
  receiverType: SenderType;
  jobId?: string;
  applicationId?: string;
  subject?: string;
  content: string;
  attachments?: string[];
}

export class MessageService {
  // Send message
  async sendMessage(data: CreateMessageDTO): Promise<Message> {
    return await prisma.message.create({
      data: {
        ...data,
        isRead: false,
      },
    });
  }

  // Get inbox messages
  async getInbox(userId: string, isRecruiter = false) {
    const receiverType: SenderType = isRecruiter ? 'RECRUITER' : 'CANDIDATE';

    return await prisma.message.findMany({
      where: {
        receiverId: userId,
        receiverType,
      },
      orderBy: { sentAt: 'desc' },
    });
  }

  // Get sent messages
  async getSentMessages(userId: string, isRecruiter = false) {
    const senderType: SenderType = isRecruiter ? 'RECRUITER' : 'CANDIDATE';

    return await prisma.message.findMany({
      where: {
        senderId: userId,
        senderType,
      },
      orderBy: { sentAt: 'desc' },
    });
  }

  // Get conversation between two users
  async getConversation(userId: string, otherUserId: string, jobId?: string) {
    const where: any = {
      OR: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId },
      ],
    };

    if (jobId) {
      where.jobId = jobId;
    }

    return await prisma.message.findMany({
      where,
      orderBy: { sentAt: 'asc' },
    });
  }

  // Mark message as read
  async markAsRead(messageId: string, userId: string): Promise<Message> {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message || message.receiverId !== userId) {
      throw new Error('Message not found or unauthorized');
    }

    return await prisma.message.update({
      where: { id: messageId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  // Mark all as read
  async markAllAsRead(userId: string, isRecruiter = false): Promise<number> {
    const receiverType: SenderType = isRecruiter ? 'RECRUITER' : 'CANDIDATE';

    const result = await prisma.message.updateMany({
      where: {
        receiverId: userId,
        receiverType,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return result.count;
  }

  // Get unread count
  async getUnreadCount(userId: string, isRecruiter = false): Promise<number> {
    const receiverType: SenderType = isRecruiter ? 'RECRUITER' : 'CANDIDATE';

    return await prisma.message.count({
      where: {
        receiverId: userId,
        receiverType,
        isRead: false,
      },
    });
  }

  // Delete message
  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message || (message.senderId !== userId && message.receiverId !== userId)) {
      throw new Error('Message not found or unauthorized');
    }

    await prisma.message.delete({
      where: { id: messageId },
    });
  }

  // Get messages for a job
  async getJobMessages(jobId: string, recruiterId: string) {
    // Verify job ownership
    const job = await prisma.job.findFirst({
      where: { id: jobId, recruiterId },
    });

    if (!job) {
      throw new Error('Job not found or unauthorized');
    }

    return await prisma.message.findMany({
      where: { jobId },
      orderBy: { sentAt: 'desc' },
    });
  }

  // Get messages for an application
  async getApplicationMessages(applicationId: string, userId: string) {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { job: true },
    });

    if (!application) {
      throw new Error('Application not found');
    }

    // Check if user is candidate or recruiter
    if (application.userId !== userId && application.job.recruiterId !== userId) {
      throw new Error('Unauthorized');
    }

    return await prisma.message.findMany({
      where: { applicationId },
      orderBy: { sentAt: 'asc' },
    });
  }
}

export const messageService = new MessageService();
