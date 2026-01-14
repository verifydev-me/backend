// ==================== MESSAGE ROUTES ====================

import { Router } from 'express';
import { messageController } from '../controllers/message.controller.js';
import { authMiddleware, type AuthenticatedRequest } from '../middlewares/auth.middleware.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/v1/chat/rooms/:roomId/messages - Get messages
router.get('/:roomId/messages', (req, res) => 
  messageController.getMessages(req as unknown as AuthenticatedRequest, res)
);

// POST /api/v1/chat/rooms/:roomId/messages - Send message (REST fallback)
router.post('/:roomId/messages', (req, res) => 
  messageController.sendMessage(req as unknown as AuthenticatedRequest, res)
);

// PUT /api/v1/chat/rooms/:roomId/read - Mark as read
router.put('/:roomId/read', (req, res) => 
  messageController.markAsRead(req as unknown as AuthenticatedRequest, res)
);

export default router;
