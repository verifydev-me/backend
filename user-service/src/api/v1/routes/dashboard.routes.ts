import { Router } from 'express';
import { getDashboard } from '../controllers/dashboard.controller.js';
import { authenticate } from '../../../middlewares/authenticate.js';

const router = Router();

/**
 * @route   GET /api/v1/dashboard
 * @desc    Get comprehensive dashboard analytics
 * @access  Private
 */
router.get('/', authenticate, getDashboard);

export default router;
