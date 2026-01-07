import { Router } from 'express';
import { ResumeController } from '../controllers/resume.controller.js';
import { authenticate } from '../../../middlewares/authenticate.js';

const router = Router();

/**
 * @route   POST /api/v1/resume/generate
 * @desc    Generate a resume
 * @access  Private
 */
router.post('/generate', authenticate, ResumeController.generateResume);

export default router;
