import { Router } from 'express';
import { ExperienceController } from '../controllers/experience.controller.js';
import { authenticate } from '../../../middlewares/authenticate.js';

const router = Router();

/**
 * Experience Routes - For managing work, education, certifications, volunteer experiences
 * All routes require authentication
 */

/**
 * @route   GET /api/v1/experiences
 * @desc    Get all experiences for the current user (grouped by type)
 * @access  Private
 */
router.get('/', authenticate, ExperienceController.getMyExperiences);

/**
 * @route   POST /api/v1/experiences
 * @desc    Create a new experience
 * @access  Private
 */
router.post('/', authenticate, ExperienceController.createExperience);

/**
 * @route   PUT /api/v1/experiences/:id
 * @desc    Update an experience
 * @access  Private
 */
router.put('/:id', authenticate, ExperienceController.updateExperience);

/**
 * @route   DELETE /api/v1/experiences/:id
 * @desc    Delete an experience
 * @access  Private
 */
router.delete('/:id', authenticate, ExperienceController.deleteExperience);

export default router;
