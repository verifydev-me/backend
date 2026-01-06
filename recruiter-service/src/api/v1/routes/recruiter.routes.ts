import { Router } from 'express';
import { RecruiterController } from '../controllers/recruiter.controller.js';
import { authenticateRecruiter } from '../../../middlewares/authenticate.js';

const router = Router();

/**
 * @route   GET /api/v1/dashboard
 * @desc    Get recruiter dashboard stats
 * @access  Private (Recruiter)
 */
router.get('/dashboard', authenticateRecruiter, RecruiterController.getDashboard);

/**
 * @route   GET /api/v1/candidates/search
 * @desc    Search for candidates by filters
 * @access  Private (Recruiter)
 */
router.get('/candidates/search', authenticateRecruiter, RecruiterController.searchCandidates);

/**
 * @route   GET /api/v1/candidates/:userId
 * @desc    Get basic candidate profile
 * @access  Private (Recruiter)
 */
router.get('/candidates/:userId', authenticateRecruiter, RecruiterController.getCandidateProfile);

/**
 * @route   GET /api/v1/candidates/:userId/full
 * @desc    Get FULL candidate profile with all analyzed projects, skills, optimizations
 * @access  Private (Recruiter)
 */
router.get('/candidates/:userId/full', authenticateRecruiter, RecruiterController.getFullCandidateProfile);

/**
 * @route   GET /api/v1/candidates/:userId/resume
 * @desc    Get candidate's resume data
 * @access  Private (Recruiter)
 */
router.get('/candidates/:userId/resume', authenticateRecruiter, RecruiterController.getCandidateResume);

/**
 * @route   POST /api/v1/candidates/:userId/shortlist
 * @desc    Shortlist a candidate
 * @access  Private (Recruiter)
 */
router.post('/candidates/:userId/shortlist', authenticateRecruiter, RecruiterController.shortlistCandidate);

/**
 * @route   GET /api/v1/shortlist
 * @desc    Get shortlisted candidates
 * @access  Private (Recruiter)
 */
router.get('/shortlist', authenticateRecruiter, RecruiterController.getShortlist);

// ==================== SMART MATCHING ====================

/**
 * @route   POST /api/v1/jobs/:jobId/suggested-candidates
 * @desc    Get candidates matching a job's requirements with match scores
 * @access  Private (Recruiter)
 */
router.post('/jobs/:jobId/suggested-candidates', authenticateRecruiter, RecruiterController.getSuggestedCandidates);

/**
 * @route   POST /api/v1/candidates/:userId/match-score
 * @desc    Calculate match score for a specific candidate against job requirements
 * @access  Private (Recruiter)
 */
router.post('/candidates/:userId/match-score', authenticateRecruiter, RecruiterController.calculateCandidateMatch);

export default router;
