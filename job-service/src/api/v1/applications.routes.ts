import { AuthenticatedRequest } from "../../types/index.js";
import express from 'express';
import { ApplicationService } from '../../domain/application.service.js';

import { authenticate } from '../../middlewares/authenticate.js';

const applicationService = new ApplicationService();
const router = express.Router();

// Protect all application routes
router.use(authenticate);

// Apply to a job
router.post('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const application = await applicationService.apply(
      req.user!.userId,
      req.body.jobId,
      req.body
    );
    res.status(201).json({ success: true, data: application });
  } catch (error) {
    next(error);
  }
});

// Get user's applications
router.get('/my-applications', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { status } = req.query;
    const applications = await applicationService.getUserApplications(
      req.user!.userId,
      status as any
    );
    res.json({ success: true, data: applications });
  } catch (error) {
    next(error);
  }
});

// Get single application
router.get('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const application = await applicationService.getApplicationById(req.params.id);
    if (!application) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }

    // Check authorization
    if (application.userId !== req.user!.userId && application.job?.recruiterId !== req.user!.userId) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    res.json({ success: true, data: application });
  } catch (error) {
    next(error);
  }
});

// Withdraw application
router.post('/:id/withdraw', async (req: AuthenticatedRequest, res, next) => {
  try {
    const result = await applicationService.withdraw(
      req.params.id,
      req.user!.userId
    );
    res.json({ success: true, data: { withdrawn: result } });
  } catch (error) {
    next(error);
  }
});

// Get applications for a job (recruiter only)
router.get('/job/:jobId', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { status } = req.query;
    const applications = await applicationService.getJobApplications(
      req.params.jobId,
      status as any
    );
    res.json({ success: true, data: applications });
  } catch (error) {
    next(error);
  }
});

// Update application status (recruiter only)
router.patch('/:id/status', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { status, notes } = req.body;
    const application = await applicationService.updateStatus(
      req.params.id,
      status,
      notes
    );
    res.json({ success: true, data: application });
  } catch (error) {
    next(error);
  }
});

// Add recruiter notes (recruiter only)
router.post('/:id/notes', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { notes } = req.body;
    const application = await applicationService.addNote(
      req.params.id,
      notes
    );
    res.json({ success: true, data: application });
  } catch (error) {
    next(error);
  }
});

export default router;
