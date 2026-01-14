import { Router } from 'express';
import { ProjectAnalysisController } from '../controllers/project-analysis.controller.js';
import { authenticate } from '../../../middlewares/authenticate.js';

const router = Router();

/**
 * @route   GET /api/v1/projects/:projectId/analysis
 * @desc    Get detailed project analysis (structured data from DB)
 * @access  Private
 */
router.get('/:projectId/analysis', authenticate, ProjectAnalysisController.getDetailedAnalysis);

/**
 * @route   GET /api/v1/projects/:projectId/dimensional
 * @desc    Get 6-dimensional analysis with verdicts and trust scores
 * @access  Private
 */
router.get('/:projectId/dimensional', authenticate, ProjectAnalysisController.getDimensionalAnalysis);

/**
 * @route   GET /api/v1/projects/analysis/summary
 * @desc    Get summary of all project analyses
 * @access  Private
 */
router.get('/analysis/summary', authenticate, ProjectAnalysisController.getSummary);

/**
 * @route   GET /api/v1/projects/dimensional/profile
 * @desc    Get aggregated dimensional profile across all user's projects
 * @access  Private
 */
router.get('/dimensional/profile', authenticate, ProjectAnalysisController.getUserDimensionalProfile);

export default router;
