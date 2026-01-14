import { AuthenticatedRequest } from "../../types/index.js";
import express from 'express';
import { MessageService } from '../../domain/message.service.js';
import { authenticate } from '../../middlewares/authenticate.js';

const messageService = new MessageService();
const router = express.Router();

// Apply authentication to all message routes
router.use(authenticate);

// Send message
router.post('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const isRecruiter = req.user!.role === 'recruiter';

    // Determine receiver ID and Type
    // Support both generic receiverId and specific candidateId/recruiterId
    const receiverId = req.body.receiverId || (isRecruiter ? req.body.candidateId : req.body.recruiterId);
    if (!receiverId) {
      return res.status(400).json({ success: false, message: 'Receiver ID is required' });
    }

    const receiverType = isRecruiter ? 'CANDIDATE' : 'RECRUITER';

    // Map content from body if needed (legacy frontend support)
    const content = req.body.content || req.body.body;
    if (!content) {
      return res.status(400).json({ success: false, message: 'Message content is required' });
    }

    const message = await messageService.sendMessage({
      senderId: req.user!.userId,
      senderType: isRecruiter ? 'RECRUITER' : 'CANDIDATE',
      senderName: req.body.senderName,
      receiverId,
      receiverType,
      receiverName: req.body.receiverName || req.body.candidateName,
      content,
      subject: req.body.subject,
      jobId: req.body.jobId,
      applicationId: req.body.applicationId,
      attachments: req.body.attachments,
    });
    res.status(201).json({ success: true, data: message });
  } catch (error) {
    next(error);
  }
});

// Send bulk message to multiple receivers
router.post('/bulk', async (req: AuthenticatedRequest, res, next) => {
  try {
    const isRecruiter = req.user!.role === 'recruiter';
    if (!isRecruiter) {
      return res.status(403).json({ success: false, message: 'Only recruiters can send bulk messages' });
    }

    const { receiverIds, subject, content } = req.body;
    if (!Array.isArray(receiverIds) || receiverIds.length === 0) {
      return res.status(400).json({ success: false, message: 'receiverIds array is required' });
    }
    if (!content) {
      return res.status(400).json({ success: false, message: 'Message content is required' });
    }

    const results = await Promise.all(
      receiverIds.map(receiverId =>
        messageService.sendMessage({
          senderId: req.user!.userId,
          senderType: 'RECRUITER',
          senderName: req.body.senderName,
          receiverId,
          receiverType: 'CANDIDATE',
          content,
          subject,
          jobId: req.body.jobId,
        })
      )
    );

    res.status(201).json({
      success: true,
      data: { sentCount: results.length, messages: results }
    });
  } catch (error) {
    next(error);
  }
});

// Get inbox
router.get('/inbox', async (req: AuthenticatedRequest, res, next) => {
  try {
    const isRecruiter = req.user!.role === 'recruiter';
    const messages = await messageService.getInbox(req.user!.userId, isRecruiter);
    res.json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
});

// Get sent messages
router.get('/sent', async (req: AuthenticatedRequest, res, next) => {
  try {
    const isRecruiter = req.user!.role === 'recruiter';
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
    const isRecruiter = req.user!.role === 'recruiter';
    const count = await messageService.markAllAsRead(req.user!.userId, isRecruiter);
    res.json({ success: true, data: { markedCount: count } });
  } catch (error) {
    next(error);
  }
});

// Get unread count
router.get('/unread-count', async (req: AuthenticatedRequest, res, next) => {
  try {
    const isRecruiter = req.user!.role === 'recruiter';
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
