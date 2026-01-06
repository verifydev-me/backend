import { AuthenticatedRequest } from "../../types/index.js";
import express from 'express';
import { MessageService } from '../../domain/message.service.js';

const messageService = new MessageService();
const router = express.Router();

// Send message
router.post('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const isRecruiter = req.user.role === 'recruiter';
    const message = await messageService.sendMessage({
      ...req.body,
      senderId: req.user!.userId,
      senderType: isRecruiter ? 'RECRUITER' : 'CANDIDATE',
    });
    res.status(201).json({ success: true, data: message });
  } catch (error) {
    next(error);
  }
});

// Get inbox
router.get('/inbox', async (req: AuthenticatedRequest, res, next) => {
  try {
    const isRecruiter = req.user.role === 'recruiter';
    const messages = await messageService.getInbox(req.user!.userId, isRecruiter);
    res.json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
});

// Get sent messages
router.get('/sent', async (req: AuthenticatedRequest, res, next) => {
  try {
    const isRecruiter = req.user.role === 'recruiter';
    const messages = await messageService.getSentMessages(req.user!.userId, isRecruiter);
    res.json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
});

// Get conversation
router.get('/conversation/:otherUserId', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { jobId } = req.query;
    const messages = await messageService.getConversation(
      req.user!.userId,
      req.params.otherUserId,
      jobId as string
    );
    res.json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
});

// Mark as read
router.post('/:id/read', async (req: AuthenticatedRequest, res, next) => {
  try {
    const message = await messageService.markAsRead(req.params.id, req.user!.userId);
    res.json({ success: true, data: message });
  } catch (error) {
    next(error);
  }
});

// Mark all as read
router.post('/mark-all-read', async (req: AuthenticatedRequest, res, next) => {
  try {
    const isRecruiter = req.user.role === 'recruiter';
    const count = await messageService.markAllAsRead(req.user!.userId, isRecruiter);
    res.json({ success: true, data: { markedCount: count } });
  } catch (error) {
    next(error);
  }
});

// Get unread count
router.get('/unread-count', async (req: AuthenticatedRequest, res, next) => {
  try {
    const isRecruiter = req.user.role === 'recruiter';
    const count = await messageService.getUnreadCount(req.user!.userId, isRecruiter);
    res.json({ success: true, data: { count } });
  } catch (error) {
    next(error);
  }
});

// Delete message
router.delete('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    await messageService.deleteMessage(req.params.id, req.user!.userId);
    res.json({ success: true, message: 'Message deleted' });
  } catch (error) {
    next(error);
  }
});

// Get messages for a job (recruiter)
router.get('/job/:jobId', async (req: AuthenticatedRequest, res, next) => {
  try {
    const messages = await messageService.getJobMessages(
      req.params.jobId,
      req.user!.userId
    );
    res.json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
});

// Get messages for an application
router.get('/application/:applicationId', async (req: AuthenticatedRequest, res, next) => {
  try {
    const messages = await messageService.getApplicationMessages(
      req.params.applicationId,
      req.user!.userId
    );
    res.json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
});

export default router;
