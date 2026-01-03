import { Router } from 'express';
import { UserController } from '../controllers/user.controller.js';
import { authenticate } from '../../../middlewares/authenticate.js';

const router = Router();

// ============================================
// PRIVATE ROUTES (Authenticated)
// ============================================

/**
 * @route   GET /api/v1/users/me
 * @desc    Get current user's profile
 * @access  Private
 */
router.get('/me', authenticate, UserController.getMyProfile);

/**
 * @route   PUT /api/v1/users/me
 * @desc    Update current user's profile
 * @access  Private
 */
router.put('/me', authenticate, UserController.updateMyProfile);

/**
 * @route   GET /api/v1/users/settings
 * @desc    Get user settings
 * @access  Private
 */
router.get('/settings', authenticate, UserController.getSettings);

/**
 * @route   PUT /api/v1/users/settings
 * @desc    Update user settings
 * @access  Private
 */
router.put('/settings', authenticate, UserController.updateSettings);

/**
 * @route   GET /api/v1/users/me/aura
 * @desc    Get current user's aura summary
 * @access  Private
 */
router.get('/me/aura', authenticate, UserController.getMyAura);

// ============================================
// PUBLIC ROUTES
// ============================================

/**
 * @route   GET /api/v1/u/:username
 * @desc    Get public profile by username
 * @access  Public
 */
router.get('/u/:username', UserController.getPublicProfile);

/**
 * @route   GET /api/v1/u/:username/aura
 * @desc    Get public aura by username
 * @access  Public
 */
router.get('/u/:username/aura', UserController.getPublicAura);

/**
 * @route   GET /api/v1/u/:username/projects
 * @desc    Get public projects by username
 * @access  Public
 */
router.get('/u/:username/projects', UserController.getPublicProjects);

export default router;
