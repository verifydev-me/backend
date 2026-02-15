import express from 'express';
import { JobController } from './controllers/job.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';

const router = express.Router();

// All routes use the JobController which has proper error handling and service instantiation
router.post('/', authenticate, JobController.createJob);
router.get('/', JobController.listJobs);
router.get('/search', JobController.searchJobs);
router.get('/matched', authenticate, JobController.getMatchedJobs);
router.get('/saved', authenticate, JobController.getSavedJobs);
router.get('/my-jobs', authenticate, JobController.getMyJobs);
router.get('/:jobId', JobController.getJob);
router.get('/:jobId/details', authenticate, JobController.getJobWithMatch);
router.put('/:jobId', authenticate, JobController.updateJob);
router.delete('/:jobId', authenticate, JobController.deleteJob);
router.post('/:jobId/apply', authenticate, JobController.applyToJob);
router.post('/:jobId/save', authenticate, JobController.toggleSaveJob);
router.get('/:jobId/can-apply', authenticate, JobController.checkCanApply);

export default router;
