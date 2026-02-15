import { Response } from 'express';
import { prisma } from '../../../prisma/client.js';
import { logger } from '../../../utils/logger.js';
import type { AuthenticatedRequest, ApiResponse } from '../../../types/index.js';

export class NotificationController {
  /**
   * GET /notifications
   * Get user's notifications
   */
  static async getNotifications(
    req: AuthenticatedRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const { page = 1, limit = 20 } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const [notifications, total] = await Promise.all([
        prisma.notification.findMany({
          where: { userId: req.user.userId },
          orderBy: { createdAt: 'desc' },
          skip,
          take: Number(limit),
        }),
        prisma.notification.count({
          where: { userId: req.user.userId },
        }),
      ]);

      res.json({
        success: true,
        message: 'Notifications retrieved',
        data: { notifications },
        meta: {
          page: Number(page),
          limit: Number(limit),
          total,
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get notifications');
      res.status(500).json({ success: false, message: 'Failed to get notifications', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * GET /notifications/unread-count
   * Get unread notifications count
   */
  static async getUnreadCount(
    req: AuthenticatedRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const count = await prisma.notification.count({
        where: {
          userId: req.user.userId,
          isRead: false,
        },
      });

      res.json({
        success: true,
        message: 'Unread count retrieved',
        data: { unreadCount: count },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get unread count');
      res.status(500).json({ success: false, message: 'Failed to get unread count', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * PATCH /notifications/:id/read
   * Mark notification as read
   */
  static async markAsRead(
    req: AuthenticatedRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const { id } = req.params;

      const notification = await prisma.notification.findUnique({
        where: { id },
      });

      if (!notification) {
        res.status(404).json({ success: false, message: 'Notification not found', error: { code: 'NOT_FOUND' } });
        return;
      }

      if (notification.userId !== req.user.userId) {
        res.status(403).json({ success: false, message: 'Forbidden', error: { code: 'FORBIDDEN' } });
        return;
      }

      const updated = await prisma.notification.update({
        where: { id },
        data: { isRead: true, readAt: new Date() },
      });

      res.json({
        success: true,
        message: 'Notification marked as read',
        data: { notification: updated },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to mark notification as read');
      res.status(500).json({ success: false, message: 'Failed to update notification', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * POST /notifications/read-all
   * Mark all notifications as read
   */
  static async markAllAsRead(
    req: AuthenticatedRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const result = await prisma.notification.updateMany({
        where: {
          userId: req.user.userId,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      res.json({
        success: true,
        message: 'All notifications marked as read',
        data: { updatedCount: result.count },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to mark all as read');
      res.status(500).json({ success: false, message: 'Failed to update notifications', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * DELETE /notifications/:id
   * Delete a notification
   */
  static async deleteNotification(
    req: AuthenticatedRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const { id } = req.params;

      const notification = await prisma.notification.findUnique({
        where: { id },
      });

      if (!notification) {
        res.status(404).json({ success: false, message: 'Notification not found', error: { code: 'NOT_FOUND' } });
        return;
      }

      if (notification.userId !== req.user.userId) {
        res.status(403).json({ success: false, message: 'Forbidden', error: { code: 'FORBIDDEN' } });
        return;
      }

      await prisma.notification.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: 'Notification deleted',
      });
    } catch (error) {
      logger.error({ error }, 'Failed to delete notification');
      res.status(500).json({ success: false, message: 'Failed to delete notification', error: { code: 'INTERNAL_ERROR' } });
    }
  }
}

export default NotificationController;
