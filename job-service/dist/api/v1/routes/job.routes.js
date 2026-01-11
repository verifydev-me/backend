"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const job_controller_js_1 = require("../controllers/job.controller.js");
const authenticate_js_1 = require("../../../middlewares/authenticate.js");
const router = (0, express_1.Router)();
// ==================== PUBLIC ROUTES ====================
/**
 * @route   GET /api/v1/jobs
 * @desc    List jobs with basic filters
 * @access  Public
 */
router.get('/', job_controller_js_1.JobController.listJobs);
/**
 * @route   POST /api/v1/jobs
 * @desc    Create a new job posting (recruiter only)
 * @access  Private (Recruiter)
 */
router.post('/', authenticate_js_1.authenticate, job_controller_js_1.JobController.createJob);
/**
 * @route   GET /api/v1/jobs/search
 * @desc    Advanced job search with multiple filters
 * @access  Public
 * @query   q, skills, type, level, isRemote, salaryMin, salaryMax, location, sortBy, page, limit
 */
router.get('/search', job_controller_js_1.JobController.searchJobs);
// ==================== USER ROUTES ====================
/**
 * @route   GET /api/v1/jobs/matched
 * @desc    Get jobs matched to user's skills (requires auth)
 * @access  Private
 */
router.get('/matched', authenticate_js_1.authenticate, job_controller_js_1.JobController.getMatchedJobs);
/**
 * @route   GET /api/v1/jobs/recommended
 * @desc    Get recommended jobs based on user profile
 * @access  Private
 */
router.get('/recommended', authenticate_js_1.authenticate, job_controller_js_1.JobController.getRecommendedJobs);
/**
 * @route   GET /api/v1/jobs/:jobId
 * @desc    Get job details
 * @access  Public
 */
router.get('/:jobId', job_controller_js_1.JobController.getJob);
/**
 * @route   GET /api/v1/jobs/:jobId/match
 * @desc    Get job with user's match score
 * @access  Private (optional - returns extra data if authenticated)
 */
router.get('/:jobId/match', authenticate_js_1.optionalAuth, job_controller_js_1.JobController.getJobWithMatch);
/**
 * @route   GET /api/v1/jobs/:jobId/can-apply
 * @desc    Check if user can apply to job
 * @access  Private
 */
router.get('/:jobId/can-apply', authenticate_js_1.authenticate, job_controller_js_1.JobController.checkCanApply);
/**
 * @route   POST /api/v1/jobs/:jobId/apply
 * @desc    Apply to a job
 * @access  Private
 */
router.post('/:jobId/apply', authenticate_js_1.authenticate, job_controller_js_1.JobController.applyToJob);
// ==================== APPLICATION ROUTES ====================
/**
 * @route   GET /api/v1/applications
 * @desc    Get user's applications
 * @access  Private
 */
router.get('/applications', authenticate_js_1.authenticate, job_controller_js_1.JobController.getMyApplications);
/**
 * @route   GET /api/v1/applications/:applicationId
 * @desc    Get single application
 * @access  Private
 */
router.get('/applications/:applicationId', authenticate_js_1.authenticate, job_controller_js_1.JobController.getApplication);
/**
 * @route   DELETE /api/v1/applications/:applicationId
 * @desc    Withdraw application
 * @access  Private
 */
router.delete('/applications/:applicationId', authenticate_js_1.authenticate, job_controller_js_1.JobController.withdrawApplication);
// ==================== RECRUITER ROUTES ====================
/**
 * @route   GET /api/v1/recruiter/jobs
 * @desc    Get all jobs posted by the recruiter
 * @access  Private (Recruiter)
 */
router.get('/recruiter/jobs', authenticate_js_1.authenticate, job_controller_js_1.JobController.getRecruiterJobs);
/**
 * @route   GET /api/v1/recruiter/jobs/:jobId
 * @desc    Get single job details (recruiter view)
 * @access  Private (Recruiter)
 */
router.get('/recruiter/jobs/:jobId', authenticate_js_1.authenticate, job_controller_js_1.JobController.getRecruiterJobDetails);
/**
 * @route   GET /api/v1/recruiter/jobs/:jobId/analytics
 * @desc    Get job analytics
 * @access  Private (Recruiter)
 */
router.get('/recruiter/jobs/:jobId/analytics', authenticate_js_1.authenticate, job_controller_js_1.JobController.getJobAnalytics);
/**
 * @route   GET /api/v1/recruiter/jobs/:jobId/applicants
 * @desc    Get all applicants for a job
 * @access  Private (Recruiter)
 */
router.get('/recruiter/jobs/:jobId/applicants', authenticate_js_1.authenticate, job_controller_js_1.JobController.getJobApplicants);
exports.default = router;
//# sourceMappingURL=job.routes.js.map