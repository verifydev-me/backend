/**
 * Recruiter Routes - Job Management for Recruiters
 * These routes handle /api/v1/recruiter/* endpoints
 */

import { Router } from 'express';
import { JobController } from '../controllers/job.controller.js';
import { authenticate } from '../../../middlewares/authenticate.js';

const router = Router();

// ==================== RECRUITER JOB MANAGEMENT ====================

/**
 * @route   GET /api/v1/recruiter/jobs
 * @desc    Get all jobs posted by the recruiter
 * @access  Private (Recruiter)
 */
router.get('/jobs', authenticate, JobController.getRecruiterJobs);

/**
 * @route   GET /api/v1/recruiter/jobs/:jobId
 * @desc    Get single job details (recruiter view)
 * @access  Private (Recruiter)
 */
router.get('/jobs/:jobId', authenticate, JobController.getRecruiterJobDetails);

/**
 * @route   GET /api/v1/recruiter/jobs/:jobId/analytics
 * @desc    Get job analytics
 * @access  Private (Recruiter)
 */
router.get('/jobs/:jobId/analytics', authenticate, JobController.getJobAnalytics);

/**
 * @route   GET /api/v1/recruiter/jobs/:jobId/applicants
 * @desc    Get all applicants for a job
 * @access  Private (Recruiter)
 */
router.get('/jobs/:jobId/applicants', authenticate, JobController.getJobApplicants);

export default router;
