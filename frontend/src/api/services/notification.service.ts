/**
 * Notification Types and API
 */

export interface Notification {
  id: string
  type: 
    | 'APPLICATION_RECEIVED'
    | 'APPLICATION_STATUS_CHANGED'
    | 'JOB_MATCH'
    | 'AURA_UPDATED'
    | 'PROJECT_ANALYZED'
    | 'SHORTLISTED'
    | 'INTERVIEW_SCHEDULED'
    | 'OFFER_RECEIVED'
    | 'SYSTEM'
  title: string
  message: string
  read: boolean
  createdAt: string
  data?: {
    jobId?: string
    jobTitle?: string
    applicationId?: string
    userId?: string
    userName?: string
    projectId?: string
    auraScore?: number
  }
}

import { get, post, put } from '@/api/client'

export const notificationService = {
  getAll: async (params?: { unreadOnly?: boolean; limit?: number }) => {
    const queryParams = new URLSearchParams()
    if (params?.unreadOnly) queryParams.set('unreadOnly', 'true')
    if (params?.limit) queryParams.set('limit', params.limit.toString())
    
    const query = queryParams.toString() ? `?${queryParams.toString()}` : ''
    const res = await get<{ notifications: Notification[] }>(`/v1/notifications${query}`)
    return res.notifications
  },

  getUnreadCount: async () => {
    const res = await get<{ count: number }>('/v1/notifications/unread-count')
    return res.count
  },

  markAsRead: async (notificationId: string) => {
    return put(`/v1/notifications/${notificationId}/read`, {})
  },

  markAllAsRead: async () => {
    return post('/v1/notifications/mark-all-read', {})
  },

  delete: async (notificationId: string) => {
    return fetch(`/v1/notifications/${notificationId}`, { method: 'DELETE' })
  },
}
