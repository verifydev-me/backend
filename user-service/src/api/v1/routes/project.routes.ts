import { Router } from 'express';
import { ProjectController } from '../controllers/project.controller.js';
import { ProjectAnalysisController } from '../controllers/project-analysis.controller.js';
import { GitDetailsController } from '../controllers/git-details.controller.js';
import { authenticate } from '../../../middlewares/authenticate.js';

const router = Router();

/**
 * @route   GET /api/v1/projects/available
 * @desc    Get user's available GitHub repos to add
 * @access  Private
 */
router.get('/available', authenticate, ProjectController.getAvailableRepos);

/**
 * @route   GET /api/v1/projects/branches
 * @desc    Get branches for a specific repo
 * @access  Private
 */
router.get('/repo/branches', authenticate, ProjectController.getBranches);
router.get('/repo/contents', authenticate, ProjectController.getRepoContents);

/**
 * @route   GET /api/v1/projects/new
 * @desc    Get user's available GitHub repos to add (alias for /available)
 * @access  Private
 */
router.get('/new', authenticate, ProjectController.getAvailableRepos);

/**
 * @route   POST /api/v1/projects
 * @desc    Add a new project for analysis
 * @access  Private
 */
router.post('/', authenticate, ProjectController.addProject);

/**
 * @route   POST /api/v1/projects/batch
 * @desc    Add multiple projects for analysis (max 3)
 * @access  Private
 */
router.post('/batch', authenticate, ProjectController.batchAnalyze);

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
 * @route   GET /api/v1/projects/dimensional/profile
 * @desc    Get aggregated dimensional profile across all user's projects
 * @access  Private
 */
router.get('/dimensional/profile', authenticate, ProjectAnalysisController.getUserDimensionalProfile);

/**
 * @route   POST /api/v1/projects/:projectId/git-details/fetch
 * @desc    Fetch git details from GitHub APIs
 * @access  Private
 */
router.post('/:projectId/git-details/fetch', authenticate, GitDetailsController.fetchGitDetails);

/**
 * @route   GET /api/v1/projects/:projectId/git-details
 * @desc    Get stored git details
 * @access  Private
 */
router.get('/:projectId/git-details', authenticate, GitDetailsController.getGitDetails);

export default router;

