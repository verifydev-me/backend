import { Router } from 'express';
import { ProjectController } from '../controllers/project.controller.js';
import { authenticate } from '../../../middlewares/authenticate.js';

const router = Router();

/**
 * @route   POST /api/v1/projects
 * @desc    Add a new project for analysis
 * @access  Private
 */
router.post('/', authenticate, ProjectController.addProject);

/**
 * @route   GET /api/v1/projects
 * @desc    Get user's projects
 * @access  Private
 */
router.get('/', authenticate, ProjectController.getMyProjects);

/**
 * @route   GET /api/v1/projects/:projectId
 * @desc    Get single project
 * @access  Private
 */
router.get('/:projectId', authenticate, ProjectController.getProject);

/**
 * @route   DELETE /api/v1/projects/:projectId
 * @desc    Delete a project
 * @access  Private
 */
router.delete('/:projectId', authenticate, ProjectController.deleteProject);

/**
 * @route   POST /api/v1/projects/:projectId/analyze
 * @desc    Re-trigger analysis
 * @access  Private
 */
router.post('/:projectId/analyze', authenticate, ProjectController.reanalyze);

/**
 * @route   POST /api/v1/projects/:projectId/pin
 * @desc    Toggle pin status
 * @access  Private
 */
router.post('/:projectId/pin', authenticate, ProjectController.togglePin);

export default router;
