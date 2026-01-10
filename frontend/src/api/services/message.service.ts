/**
 * Message Service
 * API calls for in-platform messaging
 * Backend: job-service (port 3004) /api/v1/messages
 */

import { get, post, del } from '../client';
import type {
  Message,
  MessageWithDetails,
  Conversation,
  SendMessageRequest,
} from '@/types/message';

const BASE_URL = '/v1/messages';

// ============================================
// MESSAGE CRUD
// ============================================

/**
 * Send a new message
 */
export const sendMessage = async (
  data: SendMessageRequest
): Promise<{ success: boolean; data: Message }> => {
  return post(BASE_URL, data);
};

/**
 * Get inbox messages
 */
export const getInbox = async (params?: {
  page?: number;
  limit?: number;
  isRead?: boolean;
}): Promise<{
  success: boolean;
  data: MessageWithDetails[];
  pagination: { page: number; limit: number; total: number; pages: number };
}> => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.isRead !== undefined)
    queryParams.append('isRead', params.isRead.toString());

  const url = queryParams.toString()
    ? `${BASE_URL}/inbox?${queryParams.toString()}`
    : `${BASE_URL}/inbox`;

  return get(url);
};

/**
 * Get sent messages
 */
export const getSentMessages = async (params?: {
  page?: number;
  limit?: number;
}): Promise<{
  success: boolean;
  data: MessageWithDetails[];
  pagination: { page: number; limit: number; total: number; pages: number };
}> => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());

  const url = queryParams.toString()
    ? `${BASE_URL}/sent?${queryParams.toString()}`
    : `${BASE_URL}/sent`;

  return get(url);
};

/**
 * Get conversation with a specific user
 */
export const getConversation = async (
  userId: string,
  params?: { page?: number; limit?: number }
): Promise<{
  success: boolean;
  data: MessageWithDetails[];
  pagination: { page: number; limit: number; total: number; pages: number };
}> => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());

  const url = queryParams.toString()
    ? `${BASE_URL}/conversation/${userId}?${queryParams.toString()}`
    : `${BASE_URL}/conversation/${userId}`;

  return get(url);
};

/**
 * Get all conversations
 */
export const getConversations = async (): Promise<{
  success: boolean;
  data: Conversation[];
}> => {
  // Note: This endpoint may need to be added to backend
  // For now, we'll derive conversations from inbox
  const inbox = await getInbox({ limit: 100 });

  // Group messages by sender/receiver
  const conversationsMap = new Map<string, Conversation>();

  inbox.data.forEach((message) => {
    const otherUserId = message.senderId;
    const otherUser = message.sender;

    if (!conversationsMap.has(otherUserId)) {
      conversationsMap.set(otherUserId, {
        userId: otherUserId,
        user: otherUser,
        lastMessage: message,
        unreadCount: message.isRead ? 0 : 1,
        messages: [message],
      });
    } else {
      const conversation = conversationsMap.get(otherUserId)!;
      conversation.messages!.push(message);
      if (!message.isRead) {
        conversation.unreadCount++;
      }
      // Update last message if this one is more recent
      if (new Date(message.createdAt) > new Date(conversation.lastMessage.createdAt)) {
        conversation.lastMessage = message;
      }
    }
  });

  return {
    success: true,
    data: Array.from(conversationsMap.values()),
  };
};

// ============================================
// MESSAGE ACTIONS
// ============================================

/**
 * Mark message as read
 */
export const markAsRead = async (
  messageId: string
): Promise<{ success: boolean; data: Message }> => {
  return post(`${BASE_URL}/${messageId}/read`);
};

/**
 * Mark all messages as read
 */
export const markAllAsRead = async (): Promise<{
  success: boolean;
  data: { count: number };
}> => {
  return post(`${BASE_URL}/read-all`);
};

/**
 * Delete message
 */
export const deleteMessage = async (
  messageId: string
): Promise<{ success: boolean }> => {
  return del(`${BASE_URL}/${messageId}`);
};

// ============================================
// MESSAGE QUERIES
// ============================================

/**
 * Get unread message count
 */
export const getUnreadCount = async (): Promise<{
  success: boolean;
  data: { count: number };
}> => {
  return get(`${BASE_URL}/unread-count`);
};

/**
 * Get messages for a job
 */
export const getJobMessages = async (
  jobId: string
): Promise<{ success: boolean; data: MessageWithDetails[] }> => {
  return get(`${BASE_URL}/job/${jobId}`);
};

/**
 * Get messages for an application
 */
export const getApplicationMessages = async (
  applicationId: string
): Promise<{ success: boolean; data: MessageWithDetails[] }> => {
  return get(`${BASE_URL}/application/${applicationId}`);
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format message preview (truncate long messages)
 */
export const formatMessagePreview = (content: string, maxLength = 60): string => {
  if (content.length <= maxLength) return content;
  return `${content.substring(0, maxLength)}...`;
};

/**
 * Get time ago string
 */
export const getTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return date.toLocaleDateString();
};

/**
 * Check if message is recent (within last 24 hours)
 */
export const isRecent = (dateString: string): boolean => {
  const date = new Date(dateString);
  const now = new Date();
  const hoursDiff = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
  return hoursDiff < 24;
};
