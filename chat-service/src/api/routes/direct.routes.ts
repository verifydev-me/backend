// ==================== DIRECT MESSAGE ROUTES ====================

import { Router } from 'express';
import { messageController } from '../controllers/message.controller.js';
import { authMiddleware, type AuthenticatedRequest } from '../middlewares/auth.middleware.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// POST /api/v1/chat/direct - Send direct message
router.post('/', (req, res) => 
  messageController.sendDirectMessage(req as unknown as AuthenticatedRequest, res)
);

export default router;
