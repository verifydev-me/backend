import { Router } from 'express';
import { QueryController } from '../controllers/query.controller.js';

const router = Router();

/**
 * @route   POST /api/v1/ai/query
 * @desc    Process a natural language job query
 * @access  Public (for testing) / Internal
 * @body    { query: string, userId?: string }
 */
router.post('/query', QueryController.processQuery);

/**
 * @route   POST /api/v1/ai/parse
 * @desc    Parse intent from query (debugging)
 * @access  Internal
 * @body    { query: string }
 */
router.post('/parse', QueryController.parseIntent);

export default router;
