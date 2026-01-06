import { AuthenticatedRequest } from "../../../types/index.js";
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
 * @route   POST /api/v1/jobs
 * @desc    Create a new job posting (recruiter only)
 * @access  Private (Recruiter)
 */
router.post('/', authenticate, JobController.createJob);

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

// ==================== RECRUITER ROUTES ====================

/**
 * @route   GET /api/v1/recruiter/jobs
 * @desc    Get all jobs posted by the recruiter
 * @access  Private (Recruiter)
 */
router.get('/recruiter/jobs', authenticate, JobController.getRecruiterJobs);

/**
 * @route   GET /api/v1/recruiter/jobs/:jobId
 * @desc    Get single job details (recruiter view)
 * @access  Private (Recruiter)
 */
router.get('/recruiter/jobs/:jobId', authenticate, JobController.getRecruiterJobDetails);

/**
 * @route   GET /api/v1/recruiter/jobs/:jobId/analytics
 * @desc    Get job analytics
 * @access  Private (Recruiter)
 */
router.get('/recruiter/jobs/:jobId/analytics', authenticate, JobController.getJobAnalytics);

/**
 * @route   GET /api/v1/recruiter/jobs/:jobId/applicants
 * @desc    Get all applicants for a job
 * @access  Private (Recruiter)
 */
router.get('/recruiter/jobs/:jobId/applicants', authenticate, JobController.getJobApplicants);

export default router;
