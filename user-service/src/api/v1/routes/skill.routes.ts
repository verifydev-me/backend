import { Router } from 'express';
import { SkillController } from '../controllers/skill.controller.js';
import { authenticate } from '../../../middlewares/authenticate.js';
import { protectVerifiedSkills } from '../../../middlewares/skill-protection.middleware.js';

const router = Router();

// All skill routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/skills
 * @desc    Get all skills for current user
 * @access  Private
 */
router.get('/', SkillController.getMySkills);

/**
 * @route   GET /api/v1/skills/category/:category
 * @desc    Get skills by category
 * @access  Private
 */
router.get('/category/:category', SkillController.getByCategory);

/**
 * @route   POST /api/v1/skills/manual
 * @desc    Add a manual (unverified) skill
 * @access  Private
 */
router.post('/manual', SkillController.addManualSkill);

/**
 * @route   PUT /api/v1/skills/:id
 * @desc    Update a skill (only MANUAL skills allowed - middleware protected)
 * @access  Private
 */
router.put('/:id', protectVerifiedSkills, SkillController.updateSkill);

/**
 * @route   DELETE /api/v1/skills/:id
 * @desc    Delete a skill (only MANUAL skills allowed - middleware protected)
 * @access  Private
 */
router.delete('/:id', protectVerifiedSkills, SkillController.deleteSkill);

/**
 * @route   GET /api/v1/skills/:id/evidence
 * @desc    Get skill with evidence details
 * @access  Private
 */
router.get('/:id/evidence', SkillController.getSkillEvidence);

export default router;
