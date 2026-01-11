"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messageService = exports.MessageService = void 0;
const client_js_1 = require("../prisma/client.js");
class MessageService {
    // Send message
    async sendMessage(data) {
        return await client_js_1.prisma.message.create({
            data: {
                ...data,
                isRead: false,
            },
        });
    }
    // Get inbox messages
    async getInbox(userId, isRecruiter = false) {
        const receiverType = isRecruiter ? 'RECRUITER' : 'CANDIDATE';
        return await client_js_1.prisma.message.findMany({
            where: {
                receiverId: userId,
                receiverType,
            },
            orderBy: { sentAt: 'desc' },
        });
    }
    // Get sent messages
    async getSentMessages(userId, isRecruiter = false) {
        const senderType = isRecruiter ? 'RECRUITER' : 'CANDIDATE';
        return await client_js_1.prisma.message.findMany({
            where: {
                senderId: userId,
                senderType,
            },
            orderBy: { sentAt: 'desc' },
        });
    }
    // Get conversation between two users
    async getConversation(userId, otherUserId, jobId) {
        const where = {
            OR: [
                { senderId: userId, receiverId: otherUserId },
                { senderId: otherUserId, receiverId: userId },
            ],
        };
        if (jobId) {
            where.jobId = jobId;
        }
        return await client_js_1.prisma.message.findMany({
            where,
            orderBy: { sentAt: 'asc' },
        });
    }
    // Mark message as read
    async markAsRead(messageId, userId) {
        const message = await client_js_1.prisma.message.findUnique({
            where: { id: messageId },
        });
        if (!message || message.receiverId !== userId) {
            throw new Error('Message not found or unauthorized');
        }
        return await client_js_1.prisma.message.update({
            where: { id: messageId },
            data: {
                isRead: true,
                readAt: new Date(),
            },
        });
    }
    // Mark all as read
    async markAllAsRead(userId, isRecruiter = false) {
        const receiverType = isRecruiter ? 'RECRUITER' : 'CANDIDATE';
        const result = await client_js_1.prisma.message.updateMany({
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
    async getUnreadCount(userId, isRecruiter = false) {
        const receiverType = isRecruiter ? 'RECRUITER' : 'CANDIDATE';
        return await client_js_1.prisma.message.count({
            where: {
                receiverId: userId,
                receiverType,
                isRead: false,
            },
        });
    }
    // Delete message
    async deleteMessage(messageId, userId) {
        const message = await client_js_1.prisma.message.findUnique({
            where: { id: messageId },
        });
        if (!message || (message.senderId !== userId && message.receiverId !== userId)) {
            throw new Error('Message not found or unauthorized');
        }
        await client_js_1.prisma.message.delete({
            where: { id: messageId },
        });
    }
    // Get messages for a job
    async getJobMessages(jobId, recruiterId) {
        // Verify job ownership
        const job = await client_js_1.prisma.job.findFirst({
            where: { id: jobId, recruiterId },
        });
        if (!job) {
            throw new Error('Job not found or unauthorized');
        }
        return await client_js_1.prisma.message.findMany({
            where: { jobId },
            orderBy: { sentAt: 'desc' },
        });
    }
    // Get messages for an application
    async getApplicationMessages(applicationId, userId) {
        const application = await client_js_1.prisma.application.findUnique({
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
        return await client_js_1.prisma.message.findMany({
            where: { applicationId },
            orderBy: { sentAt: 'asc' },
        });
    }
}
exports.MessageService = MessageService;
exports.messageService = new MessageService();
//# sourceMappingURL=message.service.js.map