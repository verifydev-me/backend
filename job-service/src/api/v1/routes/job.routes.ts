import { Router } from 'express';
import { JobController } from '../controllers/job.controller.js';
import { authenticate, optionalAuth } from '../../../middlewares/authenticate.js';

const router = Router();

// ==================== PUBLIC ROUTES ====================

/**
 * @route   GET /api/v1/jobs
 * @desc    List jobs with basic filters
 * @access  Public
 */
router.get('/', JobController.listJobs);

/**
 * @route   GET /api/v1/jobs/search
 * @desc    Advanced job search with multiple filters
 * @access  Public
 * @query   q, skills, type, level, isRemote, salaryMin, salaryMax, location, sortBy, page, limit
 */
router.get('/search', JobController.searchJobs);

// ==================== USER ROUTES ====================

/**
 * @route   GET /api/v1/jobs/matched
 * @desc    Get jobs matched to user's skills (requires auth)
 * @access  Private
 */
router.get('/matched', authenticate, JobController.getMatchedJobs);

/**
 * @route   GET /api/v1/jobs/recommended
 * @desc    Get recommended jobs based on user profile
 * @access  Private
 */
router.get('/recommended', authenticate, JobController.getRecommendedJobs);

/**
 * @route   GET /api/v1/jobs/:jobId
 * @desc    Get job details
 * @access  Public
 */
router.get('/:jobId', JobController.getJob);

/**
 * @route   GET /api/v1/jobs/:jobId/match
 * @desc    Get job with user's match score
 * @access  Private (optional - returns extra data if authenticated)
 */
router.get('/:jobId/match', optionalAuth, JobController.getJobWithMatch);

/**
 * @route   GET /api/v1/jobs/:jobId/can-apply
 * @desc    Check if user can apply to job
 * @access  Private
 */
router.get('/:jobId/can-apply', authenticate, JobController.checkCanApply);

/**
 * @route   POST /api/v1/jobs/:jobId/apply
 * @desc    Apply to a job
 * @access  Private
 */
router.post('/:jobId/apply', authenticate, JobController.applyToJob);

// ==================== APPLICATION ROUTES ====================

/**
 * @route   GET /api/v1/applications
 * @desc    Get user's applications
 * @access  Private
 */
router.get('/applications', authenticate, JobController.getMyApplications);

/**
 * @route   GET /api/v1/applications/:applicationId
 * @desc    Get single application
 * @access  Private
 */
router.get('/applications/:applicationId', authenticate, JobController.getApplication);

/**
 * @route   DELETE /api/v1/applications/:applicationId
 * @desc    Withdraw application
 * @access  Private
 */
router.delete('/applications/:applicationId', authenticate, JobController.withdrawApplication);

export default router;
