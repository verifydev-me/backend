// ==================== ROOM ROUTES ====================

import { Router } from 'express';
import { roomController } from '../controllers/room.controller.js';
import { authMiddleware, type AuthenticatedRequest } from '../middlewares/auth.middleware.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/v1/chat/rooms - Get user's rooms
router.get('/', (req, res) => roomController.getRooms(req as unknown as AuthenticatedRequest, res));

// GET /api/v1/chat/rooms/:roomId - Get room details
router.get('/:roomId', (req, res) => roomController.getRoom(req as unknown as AuthenticatedRequest, res));

// POST /api/v1/chat/rooms - Create/get room
router.post('/', (req, res) => roomController.createRoom(req as unknown as AuthenticatedRequest, res));

export default router;
