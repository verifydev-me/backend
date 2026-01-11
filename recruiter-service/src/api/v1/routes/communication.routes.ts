import { Router } from 'express';
import { CommunicationController } from '../controllers/communication.controller.js';
import { authenticateRecruiter } from '../../../middlewares/authenticate.js';

const router = Router();

// All routes require recruiter authentication
router.use(authenticateRecruiter);

// ==================== MESSAGES ====================

/**
 * @route   POST /api/v1/messages
 * @desc    Send a message to a candidate
 * @access  Private (Recruiter)
 */
router.post('/messages', CommunicationController.sendMessage);

/**
 * @route   GET /api/v1/messages
 * @desc    Get messages (inbox/sent)
 * @access  Private (Recruiter)
 */
router.get('/messages', CommunicationController.getMessages);

/**
 * @route   GET /api/v1/messages/unread-count
 * @desc    Get unread message count
 * @access  Private (Recruiter)
 */
router.get('/messages/unread-count', CommunicationController.getUnreadCount);

/**
 * @route   GET /api/v1/messages/conversation/:candidateId
 * @desc    Get conversation thread with a candidate
 * @access  Private (Recruiter)
 */
router.get('/messages/conversation/:candidateId', CommunicationController.getConversation);

/**
 * @route   PATCH /api/v1/messages/:messageId/read
 * @desc    Mark message as read
 * @access  Private (Recruiter)
 */
router.patch('/messages/:messageId/read', CommunicationController.markMessageRead);

/**
 * @route   DELETE /api/v1/messages/:messageId
 * @desc    Archive a message
 * @access  Private (Recruiter)
 */
router.delete('/messages/:messageId', CommunicationController.archiveMessage);

// ==================== INTERVIEWS ====================

/**
 * @route   POST /api/v1/interviews
 * @desc    Schedule a new interview
 * @access  Private (Recruiter)
 */
router.post('/interviews', CommunicationController.scheduleInterview);

/**
 * @route   GET /api/v1/interviews
 * @desc    Get interviews
 * @access  Private (Recruiter)
 */
router.get('/interviews', CommunicationController.getInterviews);

/**
 * @route   GET /api/v1/interviews/upcoming
 * @desc    Get upcoming interviews (next 7 days)
 * @access  Private (Recruiter)
 */
router.get('/interviews/upcoming', CommunicationController.getUpcomingInterviews);

/**
 * @route   GET /api/v1/interviews/stats
 * @desc    Get interview statistics
 * @access  Private (Recruiter)
 */
router.get('/interviews/stats', CommunicationController.getInterviewStats);

/**
 * @route   GET /api/v1/interviews/:interviewId
 * @desc    Get interview details
 * @access  Private (Recruiter)
 */
router.get('/interviews/:interviewId', CommunicationController.getInterview);

/**
 * @route   PATCH /api/v1/interviews/:interviewId
 * @desc    Update interview
 * @access  Private (Recruiter)
 */
router.patch('/interviews/:interviewId', CommunicationController.updateInterview);

/**
 * @route   POST /api/v1/interviews/:interviewId/reschedule
 * @desc    Reschedule interview with new slots
 * @access  Private (Recruiter)
 */
router.post('/interviews/:interviewId/reschedule', CommunicationController.rescheduleInterview);

/**
 * @route   POST /api/v1/interviews/:interviewId/cancel
 * @desc    Cancel interview
 * @access  Private (Recruiter)
 */
router.post('/interviews/:interviewId/cancel', CommunicationController.cancelInterview);

/**
 * @route   POST /api/v1/interviews/:interviewId/complete
 * @desc    Mark interview as completed with feedback
 * @access  Private (Recruiter)
 */
router.post('/interviews/:interviewId/complete', CommunicationController.completeInterview);

// ==================== TEMPLATES ====================

/**
 * @route   GET /api/v1/templates
 * @desc    Get message templates
 * @access  Private (Recruiter)
 */
router.get('/templates', CommunicationController.getTemplates);

/**
 * @route   POST /api/v1/templates
 * @desc    Create a custom template
 * @access  Private (Recruiter)
 */
router.post('/templates', CommunicationController.createTemplate);

/**
 * @route   DELETE /api/v1/templates/:templateId
 * @desc    Delete a custom template
 * @access  Private (Recruiter)
 */
router.delete('/templates/:templateId', CommunicationController.deleteTemplate);

export default router;
