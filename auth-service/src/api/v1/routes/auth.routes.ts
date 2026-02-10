import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { authenticate } from '../../../middlewares/authenticate.js';

const router = Router();

/**
 * @route   GET /api/v1/auth/github
 * @desc    Initiate GitHub OAuth flow
 * @access  Public
 */
router.get('/github', AuthController.initiateGitHub);

/**
 * @route   GET /api/v1/auth/github/callback
 * @desc    Handle GitHub OAuth callback
 * @access  Public
 */
router.get('/github/callback', AuthController.handleGitHubCallback);

/**
 * @route   GET /api/v1/auth/google
 * @desc    Initiate Google OAuth flow
 * @access  Public
 */
router.get('/google', AuthController.initiateGoogle);

/**
 * @route   GET /api/v1/auth/google/callback
 * @desc    Handle Google OAuth callback
 * @access  Public
 */
router.get('/google/callback', AuthController.handleGoogleCallback);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public (with refresh token)
 */
router.post('/refresh', AuthController.refreshToken);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout current session
 * @access  Private
 */
router.post('/logout', authenticate, AuthController.logout);

/**
 * @route   POST /api/v1/auth/logout-all
 * @desc    Logout from all devices
 * @access  Private
 */
router.post('/logout-all', authenticate, AuthController.logoutAll);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current authenticated user
 * @access  Private
 */
router.get('/me', authenticate, AuthController.getCurrentUser);

export default router;
