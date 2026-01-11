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
export declare class MessageService {
    sendMessage(data: CreateMessageDTO): Promise<Message>;
    getInbox(userId: string, isRecruiter?: boolean): Promise<{
        id: string;
        jobId: string | null;
        applicationId: string | null;
        senderId: string;
        senderType: import(".prisma/job-client", { with: { "resolution-mode": "import" } }).$Enums.SenderType;
        receiverId: string;
        receiverType: import(".prisma/job-client", { with: { "resolution-mode": "import" } }).$Enums.SenderType;
        subject: string | null;
        content: string;
        attachments: string[];
        isRead: boolean;
        readAt: Date | null;
        sentAt: Date;
    }[]>;
    getSentMessages(userId: string, isRecruiter?: boolean): Promise<{
        id: string;
        jobId: string | null;
        applicationId: string | null;
        senderId: string;
        senderType: import(".prisma/job-client", { with: { "resolution-mode": "import" } }).$Enums.SenderType;
        receiverId: string;
        receiverType: import(".prisma/job-client", { with: { "resolution-mode": "import" } }).$Enums.SenderType;
        subject: string | null;
        content: string;
        attachments: string[];
        isRead: boolean;
        readAt: Date | null;
        sentAt: Date;
    }[]>;
    getConversation(userId: string, otherUserId: string, jobId?: string): Promise<{
        id: string;
        jobId: string | null;
        applicationId: string | null;
        senderId: string;
        senderType: import(".prisma/job-client", { with: { "resolution-mode": "import" } }).$Enums.SenderType;
        receiverId: string;
        receiverType: import(".prisma/job-client", { with: { "resolution-mode": "import" } }).$Enums.SenderType;
        subject: string | null;
        content: string;
        attachments: string[];
        isRead: boolean;
        readAt: Date | null;
        sentAt: Date;
    }[]>;
    markAsRead(messageId: string, userId: string): Promise<Message>;
    markAllAsRead(userId: string, isRecruiter?: boolean): Promise<number>;
    getUnreadCount(userId: string, isRecruiter?: boolean): Promise<number>;
    deleteMessage(messageId: string, userId: string): Promise<void>;
    getJobMessages(jobId: string, recruiterId: string): Promise<{
        id: string;
        jobId: string | null;
        applicationId: string | null;
        senderId: string;
        senderType: import(".prisma/job-client", { with: { "resolution-mode": "import" } }).$Enums.SenderType;
        receiverId: string;
        receiverType: import(".prisma/job-client", { with: { "resolution-mode": "import" } }).$Enums.SenderType;
        subject: string | null;
        content: string;
        attachments: string[];
        isRead: boolean;
        readAt: Date | null;
        sentAt: Date;
    }[]>;
    getApplicationMessages(applicationId: string, userId: string): Promise<{
        id: string;
        jobId: string | null;
        applicationId: string | null;
        senderId: string;
        senderType: import(".prisma/job-client", { with: { "resolution-mode": "import" } }).$Enums.SenderType;
        receiverId: string;
        receiverType: import(".prisma/job-client", { with: { "resolution-mode": "import" } }).$Enums.SenderType;
        subject: string | null;
        content: string;
        attachments: string[];
        isRead: boolean;
        readAt: Date | null;
        sentAt: Date;
    }[]>;
}
export declare const messageService: MessageService;
