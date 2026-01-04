import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';

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
 * @route   GET /api/v1/auth/me
 * @desc    Get current recruiter info
 * @access  Private
 */
router.get('/me', AuthController.me);

export default router;
