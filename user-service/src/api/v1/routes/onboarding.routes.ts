import { Router } from 'express';
import { OnboardingController } from '../controllers/onboarding.controller.js';
import { authenticate } from '../../../middlewares/authenticate.js';

const router = Router();

// All onboarding routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/users/me/onboarding/status
 * @desc    Get onboarding status
 * @access  Private
 */
router.get('/status', OnboardingController.getStatus);

/**
 * @route   POST /api/v1/users/me/onboarding/step/1
 * @desc    Update step 1 (basic info: name, bio)
 * @access  Private
 */
router.post('/step/1', OnboardingController.updateStep1);

/**
 * @route   POST /api/v1/users/me/onboarding/step/2
 * @desc    Update step 2 (student info - optional)
 * @access  Private
 */
router.post('/step/2', OnboardingController.updateStep2);

/**
 * @route   POST /api/v1/users/me/onboarding/step/2/skip
 * @desc    Skip step 2 (student info)
 * @access  Private
 */
router.post('/step/2/skip', OnboardingController.skipStep2);

/**
 * @route   POST /api/v1/users/me/onboarding/complete
 * @desc    Complete onboarding
 * @access  Private
 */
router.post('/complete', OnboardingController.complete);

export default router;
