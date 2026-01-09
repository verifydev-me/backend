import express from 'express';
import jobRouter from './routes/job.routes.js';
import applicationsRouter from './applications.routes.js';
import interviewsRouter from './interviews.routes.js';
import messagesRouter from './messages.routes.js';
import recruiterRouter from './routes/recruiter.routes.js';

const router = express.Router();

// Mount routes
router.use('/jobs', jobRouter);
router.use('/applications', applicationsRouter);
router.use('/interviews', interviewsRouter);
router.use('/messages', messagesRouter);

// Recruiter-specific routes (for /api/v1/recruiter/* from gateway)
router.use('/recruiter', recruiterRouter);

export default router;
