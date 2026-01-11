import { Response } from 'express';
import { VisibilityService } from '../../../domain/visibility.service.js';
import { logger } from '../../../utils/logger.js';
import type { AuthenticatedRequest, ApiResponse } from '../../../types/index.js';
import { VisibilityLevel, RemotePreference } from '@prisma/client';

// ==================== VISIBILITY CONTROLLER ====================

export class VisibilityController {
  
  /**
   * GET /visibility-settings
   * Get all visibility settings including job preferences
   */
  static async getVisibilitySettings(
    req: AuthenticatedRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const settings = await VisibilityService.getVisibilitySettings(req.user.userId);

      if (!settings) {
        res.status(404).json({ success: false, message: 'User not found', error: { code: 'NOT_FOUND' } });
        return;
      }

      res.json({
        success: true,
        message: 'Visibility settings retrieved',
        data: settings,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get visibility settings');
      res.status(500).json({ success: false, message: 'Failed to get settings', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * PUT /visibility-settings
   * Update profile visibility settings
   */
  static async updateVisibilitySettings(
    req: AuthenticatedRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const { isPublic, isOpenToWork, showEmail, showPhone, showCgpa, visibilityLevel, phone } = req.body;

      // Validate visibilityLevel if provided
      if (visibilityLevel && !Object.values(VisibilityLevel).includes(visibilityLevel)) {
        res.status(400).json({ 
          success: false, 
          message: 'Invalid visibilityLevel. Must be PUBLIC, RECRUITERS_ONLY, or INVITE_ONLY',
          error: { code: 'VALIDATION_ERROR' } 
        });
        return;
      }

      const updated = await VisibilityService.updateVisibility(req.user.userId, {
        isPublic,
        isOpenToWork,
        showEmail,
        showPhone,
        showCgpa,
        visibilityLevel,
        phone,
      });

      res.json({
        success: true,
        message: 'Visibility settings updated',
        data: updated,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to update visibility settings');
      res.status(500).json({ success: false, message: 'Failed to update settings', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * PUT /visibility-settings/job-preferences
   * Update job preferences
   */
  static async updateJobPreferences(
    req: AuthenticatedRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const {
        preferredRoles,
        preferredLocations,
        preferredJobTypes,
        expectedSalaryMin,
        expectedSalaryMax,
        salaryCurrency,
        availableFrom,
        noticePeriodDays,
        remotePreference,
      } = req.body;

      // Validate remotePreference if provided
      if (remotePreference && !Object.values(RemotePreference).includes(remotePreference)) {
        res.status(400).json({ 
          success: false, 
          message: 'Invalid remotePreference. Must be REMOTE_ONLY, ONSITE_ONLY, HYBRID, or FLEXIBLE',
          error: { code: 'VALIDATION_ERROR' } 
        });
        return;
      }

      const updated = await VisibilityService.updateJobPreferences(req.user.userId, {
        preferredRoles,
        preferredLocations,
        preferredJobTypes,
        expectedSalaryMin,
        expectedSalaryMax,
        salaryCurrency,
        availableFrom: availableFrom ? new Date(availableFrom) : null,
        noticePeriodDays,
        remotePreference,
      });

      res.json({
        success: true,
        message: 'Job preferences updated',
        data: updated,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to update job preferences');
      res.status(500).json({ success: false, message: 'Failed to update preferences', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * PUT /visibility-settings/highlighted-skills
   * Update highlighted skills (max 7)
   */
  static async updateHighlightedSkills(
    req: AuthenticatedRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const { skillIds } = req.body;

      if (!Array.isArray(skillIds)) {
        res.status(400).json({ 
          success: false, 
          message: 'skillIds must be an array',
          error: { code: 'VALIDATION_ERROR' } 
        });
        return;
      }

      const highlighted = await VisibilityService.updateHighlightedSkills(req.user.userId, skillIds);

      res.json({
        success: true,
        message: 'Highlighted skills updated',
        data: highlighted,
      });
    } catch (error: any) {
      if (error.message === 'Maximum 7 skills can be highlighted') {
        res.status(400).json({ success: false, message: error.message, error: { code: 'LIMIT_EXCEEDED' } });
        return;
      }
      logger.error({ error }, 'Failed to update highlighted skills');
      res.status(500).json({ success: false, message: 'Failed to update skills', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * PATCH /visibility-settings/projects/:projectId
   * Update single project visibility
   */
  static async updateProjectVisibility(
    req: AuthenticatedRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const { projectId } = req.params;
      const { showToRecruiters, isPinned, customDescription } = req.body;

      const updated = await VisibilityService.updateProjectVisibility(req.user.userId, projectId, {
        showToRecruiters,
        isPinned,
        customDescription,
      });

      res.json({
        success: true,
        message: 'Project visibility updated',
        data: updated,
      });
    } catch (error: any) {
      if (error.message === 'Project not found') {
        res.status(404).json({ success: false, message: error.message, error: { code: 'NOT_FOUND' } });
        return;
      }
      if (error.message === 'Maximum 3 projects can be pinned') {
        res.status(400).json({ success: false, message: error.message, error: { code: 'LIMIT_EXCEEDED' } });
        return;
      }
      logger.error({ error }, 'Failed to update project visibility');
      res.status(500).json({ success: false, message: 'Failed to update project', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * PUT /visibility-settings/projects
   * Bulk update project visibility
   */
  static async bulkUpdateProjectVisibility(
    req: AuthenticatedRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const { visibleProjectIds, hiddenProjectIds, pinnedProjectIds } = req.body;

      const projects = await VisibilityService.bulkUpdateProjectVisibility(req.user.userId, {
        visibleProjectIds,
        hiddenProjectIds,
        pinnedProjectIds,
      });

      res.json({
        success: true,
        message: 'Project visibility updated',
        data: projects,
      });
    } catch (error: any) {
      if (error.message === 'Maximum 3 projects can be pinned') {
        res.status(400).json({ success: false, message: error.message, error: { code: 'LIMIT_EXCEEDED' } });
        return;
      }
      logger.error({ error }, 'Failed to bulk update project visibility');
      res.status(500).json({ success: false, message: 'Failed to update projects', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * PATCH /visibility-settings/skills/:skillId
   * Update single skill visibility
   */
  static async updateSkillVisibility(
    req: AuthenticatedRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const { skillId } = req.params;
      const { showToRecruiters, isHighlighted } = req.body;

      const updated = await VisibilityService.updateSkillVisibility(req.user.userId, skillId, {
        showToRecruiters,
        isHighlighted,
      });

      res.json({
        success: true,
        message: 'Skill visibility updated',
        data: updated,
      });
    } catch (error: any) {
      if (error.message === 'Skill not found') {
        res.status(404).json({ success: false, message: error.message, error: { code: 'NOT_FOUND' } });
        return;
      }
      if (error.message === 'Maximum 7 skills can be highlighted') {
        res.status(400).json({ success: false, message: error.message, error: { code: 'LIMIT_EXCEEDED' } });
        return;
      }
      logger.error({ error }, 'Failed to update skill visibility');
      res.status(500).json({ success: false, message: 'Failed to update skill', error: { code: 'INTERNAL_ERROR' } });
    }
  }
}

export default VisibilityController;
