import express from 'express';
import jobRouter from './routes/job.routes.js';
import applicationsRouter from './applications.routes.js';
import interviewsRouter from './interviews.routes.js';
import messagesRouter from './messages.routes.js';

const router = express.Router();

// Mount routes
router.use('/jobs', jobRouter);
router.use('/applications', applicationsRouter);
router.use('/interviews', interviewsRouter);
router.use('/messages', messagesRouter);

export default router;
