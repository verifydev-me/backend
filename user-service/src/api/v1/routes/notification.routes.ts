import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller.js';
import { authenticate } from '../../../middlewares/authenticate.js';

const router = Router();

// All notification routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/notifications
 * @desc    Get user's notifications
 * @access  Private
 */
router.get('/', NotificationController.getNotifications);

/**
 * @route   GET /api/v1/notifications/unread-count
 * @desc    Get unread notifications count
 * @access  Private
 */
router.get('/unread-count', NotificationController.getUnreadCount);

/**
 * @route   PATCH /api/v1/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.patch('/:id/read', NotificationController.markAsRead);

/**
 * @route   POST /api/v1/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.post('/read-all', NotificationController.markAllAsRead);

/**
 * @route   DELETE /api/v1/notifications/:id
 * @desc    Delete a notification
 * @access  Private
 */
router.delete('/:id', NotificationController.deleteNotification);

export default router;
