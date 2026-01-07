/**
 * Message Types
 * For in-platform messaging system
 */

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  subject?: string;
  content: string;
  jobId?: string;
  applicationId?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageWithDetails extends Message {
  sender: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    role: 'developer' | 'recruiter';
  };
  receiver: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    role: 'developer' | 'recruiter';
  };
  job?: {
    id: string;
    title: string;
    companyName: string;
  };
  application?: {
    id: string;
    status: string;
  };
}

export interface Conversation {
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    role: 'developer' | 'recruiter';
  };
  lastMessage: Message;
  unreadCount: number;
  messages?: Message[];
}

export interface SendMessageRequest {
  receiverId: string;
  subject?: string;
  content: string;
  jobId?: string;
  applicationId?: string;
}

export interface MessageFilters {
  jobId?: string;
  applicationId?: string;
  isRead?: boolean;
  search?: string;
}
