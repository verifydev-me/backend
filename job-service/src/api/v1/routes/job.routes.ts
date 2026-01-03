import { Router } from 'express';
import { JobController } from '../controllers/job.controller.js';

// Note: authenticate middleware would be imported similarly to other services

const router = Router();

// ==================== PUBLIC ROUTES ====================

/**
 * @route   GET /api/v1/jobs
 * @desc    List jobs with filters
 * @access  Public
 */
router.get('/', JobController.listJobs);

/**
 * @route   GET /api/v1/jobs/:jobId
 * @desc    Get job details
 * @access  Public
 */
router.get('/:jobId', JobController.getJob);

// ==================== USER ROUTES (Would add authentication) ====================

/**
 * @route   GET /api/v1/jobs/matched
 * @desc    Get jobs matched to user's skills
 * @access  Private
 */
router.get('/matched', /* authenticate, */ JobController.getMatchedJobs);

/**
 * @route   POST /api/v1/jobs/:jobId/apply
 * @desc    Apply to a job
 * @access  Private
 */
router.post('/:jobId/apply', /* authenticate, */ JobController.applyToJob);

/**
 * @route   GET /api/v1/applications
 * @desc    Get user's applications
 * @access  Private
 */
router.get('/applications', /* authenticate, */ JobController.getMyApplications);

/**
 * @route   DELETE /api/v1/applications/:applicationId
 * @desc    Withdraw application
 * @access  Private
 */
router.delete('/applications/:applicationId', /* authenticate, */ JobController.withdrawApplication);

export default router;
