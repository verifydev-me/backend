"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const interview_service_js_1 = require("../../domain/interview.service.js");
const interviewService = new interview_service_js_1.InterviewService();
const router = express_1.default.Router();
// Schedule interview (recruiter)
router.post('/', async (req, res, next) => {
    try {
        const interview = await interviewService.scheduleInterview({
            ...req.body,
            recruiterId: req.user.userId,
        });
        res.status(201).json({ success: true, data: interview });
    }
    catch (error) {
        next(error);
    }
});
// Get interview by ID
router.get('/:id', async (req, res, next) => {
    try {
        const interview = await interviewService.getInterviewById(req.params.id);
        if (!interview) {
            return res.status(404).json({ success: false, error: 'Interview not found' });
        }
        // Check authorization
        if (interview.userId !== req.user.userId && interview.recruiterId !== req.user.userId) {
            return res.status(403).json({ success: false, error: 'Unauthorized' });
        }
        res.json({ success: true, data: interview });
    }
    catch (error) {
        next(error);
    }
});
// Get user's interviews
router.get('/my-interviews', async (req, res, next) => {
    try {
        const { status } = req.query;
        const isRecruiter = req.user.role === 'recruiter';
        const interviews = isRecruiter
            ? await interviewService.getRecruiterInterviews(req.user.userId, status)
            : await interviewService.getUserInterviews(req.user.userId, status);
        res.json({ success: true, data: interviews });
    }
    catch (error) {
        next(error);
    }
});
// Get upcoming interviews
router.get('/upcoming', async (req, res, next) => {
    try {
        const isRecruiter = req.user.role === 'recruiter';
        const interviews = await interviewService.getUpcomingInterviews(req.user.userId, isRecruiter);
        res.json({ success: true, data: interviews });
    }
    catch (error) {
        next(error);
    }
});
// Update interview (recruiter)
router.patch('/:id', async (req, res, next) => {
    try {
        const interview = await interviewService.updateInterview(req.params.id, req.user.userId, req.body);
        res.json({ success: true, data: interview });
    }
    catch (error) {
        next(error);
    }
});
// Confirm interview (candidate)
router.post('/:id/confirm', async (req, res, next) => {
    try {
        const interview = await interviewService.confirmInterview(req.params.id, req.user.userId);
        res.json({ success: true, data: interview });
    }
    catch (error) {
        next(error);
    }
});
// Reschedule interview (recruiter)
router.post('/:id/reschedule', async (req, res, next) => {
    try {
        const { newScheduledAt, reason } = req.body;
        const interview = await interviewService.rescheduleInterview(req.params.id, req.user.userId, new Date(newScheduledAt), reason);
        res.json({ success: true, data: interview });
    }
    catch (error) {
        next(error);
    }
});
// Cancel interview
router.post('/:id/cancel', async (req, res, next) => {
    try {
        const { reason } = req.body;
        const interview = await interviewService.cancelInterview(req.params.id, req.user.userId, reason);
        res.json({ success: true, data: interview });
    }
    catch (error) {
        next(error);
    }
});
// Complete interview (recruiter)
router.post('/:id/complete', async (req, res, next) => {
    try {
        const { feedback, rating, notes } = req.body;
        const interview = await interviewService.completeInterview(req.params.id, req.user.userId, feedback, rating, notes);
        res.json({ success: true, data: interview });
    }
    catch (error) {
        next(error);
    }
});
// Mark as no-show (recruiter)
router.post('/:id/no-show', async (req, res, next) => {
    try {
        const interview = await interviewService.markNoShow(req.params.id, req.user.userId);
        res.json({ success: true, data: interview });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=interviews.routes.js.map