import { Router } from 'express';
import { authenticate } from '../../../middlewares/authenticate.js';
import { VisibilityController } from '../controllers/visibility.controller.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ==================== VISIBILITY SETTINGS ====================

// GET /api/v1/visibility-settings - Get all visibility settings
router.get('/', VisibilityController.getVisibilitySettings);

// PUT /api/v1/visibility-settings - Update profile visibility
router.put('/', VisibilityController.updateVisibilitySettings);

// ==================== JOB PREFERENCES ====================

// PUT /api/v1/visibility-settings/job-preferences - Update job preferences
router.put('/job-preferences', VisibilityController.updateJobPreferences);

// ==================== HIGHLIGHTED SKILLS ====================

// PUT /api/v1/visibility-settings/highlighted-skills - Bulk update highlighted skills
router.put('/highlighted-skills', VisibilityController.updateHighlightedSkills);

// ==================== PROJECT VISIBILITY ====================

// PATCH /api/v1/visibility-settings/projects/:projectId - Update single project visibility
router.patch('/projects/:projectId', VisibilityController.updateProjectVisibility);

// PUT /api/v1/visibility-settings/projects - Bulk update project visibility
router.put('/projects', VisibilityController.bulkUpdateProjectVisibility);

// ==================== SKILL VISIBILITY ====================

// PATCH /api/v1/visibility-settings/skills/:skillId - Update single skill visibility
router.patch('/skills/:skillId', VisibilityController.updateSkillVisibility);

export default router;
