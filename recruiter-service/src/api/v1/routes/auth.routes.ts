import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { authenticateRecruiter } from '../../../middlewares/authenticate.js';

const router = Router();

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new recruiter
 * @access  Public
 */
router.post('/register', AuthController.register);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login a recruiter
 * @access  Public
 */
router.post('/login', AuthController.login);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', AuthController.refresh);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current recruiter info
 * @access  Private
 */
router.get('/me', authenticateRecruiter, AuthController.me);

/**
 * @route   PUT /api/v1/auth/profile
 * @desc    Update recruiter profile
 * @access  Private
 */
router.put('/profile', authenticateRecruiter, AuthController.updateProfile);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout recruiter
 * @access  Private
 */
router.post('/logout', authenticateRecruiter, AuthController.logout);

/**
 * @route   GET /api/v1/recruiters/public/:userId
 * @desc    Get public recruiter info
 * @access  Public
 */
router.get('/public/:userId', AuthController.getPublicProfile);

export default router;
