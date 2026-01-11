import { Response } from 'express';
import { SkillService } from '../../../domain/skill.service.js';
import { logger } from '../../../utils/logger.js';
import type { AuthenticatedRequest, ApiResponse } from '../../../types/index.js';
import { z } from 'zod';
import { SkillCategory, SkillLevel } from '@prisma/client';

// ============================================
// VALIDATION SCHEMAS
// ============================================

const addManualSkillSchema = z.object({
  name: z.string().min(1, 'Skill name is required').max(100),
  category: z.nativeEnum(SkillCategory).optional(),
  selfDeclaredLevel: z.nativeEnum(SkillLevel).optional(),
  evidence: z.array(z.object({
    label: z.string().optional(),
    url: z.string().url('Invalid URL'),
    description: z.string().optional(),
  })).optional(),
});

const updateManualSkillSchema = z.object({
  selfDeclaredLevel: z.nativeEnum(SkillLevel).optional(),
  category: z.nativeEnum(SkillCategory).optional(),
  evidence: z.array(z.object({
    label: z.string().optional(),
    url: z.string().url('Invalid URL'),
    description: z.string().optional(),
  })).optional(),
});

// ============================================
// CONTROLLER
// ============================================

export class SkillController {
  /**
   * GET /skills
   * Get all skills for current user
   */
  static async getMySkills(
    req: AuthenticatedRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
          error: { code: 'UNAUTHORIZED' }
        });
        return;
      }

      const skills = await SkillService.getUserSkills(req.user.userId);

      res.json({
        success: true,
        message: 'Skills retrieved',
        data: skills,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get skills');
      res.status(500).json({
        success: false,
        message: 'Failed to get skills',
        error: { code: 'INTERNAL_ERROR' }
      });
    }
  }

  /**
   * GET /skills/category/:category
   * Get skills by category
   */
  static async getByCategory(
    req: AuthenticatedRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
          error: { code: 'UNAUTHORIZED' }
        });
        return;
      }

      const category = req.params.category as SkillCategory;
      
      // Validate category
      if (!Object.values(SkillCategory).includes(category)) {
        res.status(400).json({
          success: false,
          message: 'Invalid category',
          error: { code: 'VALIDATION_ERROR' }
        });
        return;
      }

      const skills = await SkillService.getSkillsByCategory(req.user.userId, category);

      res.json({
        success: true,
        message: 'Skills retrieved',
        data: { skills },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get skills by category');
      res.status(500).json({
        success: false,
        message: 'Failed to get skills',
        error: { code: 'INTERNAL_ERROR' }
      });
    }
  }

  /**
   * POST /skills/manual
   * Add a manual (unverified) skill
   */
  static async addManualSkill(
    req: AuthenticatedRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
          error: { code: 'UNAUTHORIZED' }
        });
        return;
      }

      const result = addManualSkillSchema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          error: { code: 'VALIDATION_ERROR', details: result.error.format() }
        });
        return;
      }

      const skill = await SkillService.addManualSkill(req.user.userId, result.data);

      res.status(201).json({
        success: true,
        message: 'Manual skill added (unverified)',
        data: { 
          skill,
          note: 'This skill is marked as unverified. Add projects using this skill to get it verified automatically.'
        },
      });
    } catch (error: any) {
      if (error.message === 'Skill already exists') {
        res.status(409).json({
          success: false,
          message: 'Skill already exists',
          error: { code: 'CONFLICT' }
        });
        return;
      }
      
      logger.error({ error }, 'Failed to add manual skill');
      res.status(500).json({
        success: false,
        message: 'Failed to add skill',
        error: { code: 'INTERNAL_ERROR' }
      });
    }
  }

  /**
   * PUT /skills/:id
   * Update a manual skill (protected by middleware for verified skills)
   */
  static async updateSkill(
    req: AuthenticatedRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
          error: { code: 'UNAUTHORIZED' }
        });
        return;
      }

      const result = updateManualSkillSchema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          error: { code: 'VALIDATION_ERROR', details: result.error.format() }
        });
        return;
      }

      const skill = await SkillService.updateManualSkill(req.params.id, result.data);

      res.json({
        success: true,
        message: 'Skill updated',
        data: { skill },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to update skill');
      res.status(500).json({
        success: false,
        message: 'Failed to update skill',
        error: { code: 'INTERNAL_ERROR' }
      });
    }
  }

  /**
   * DELETE /skills/:id
   * Delete a manual skill (protected by middleware for verified skills)
   */
  static async deleteSkill(
    req: AuthenticatedRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
          error: { code: 'UNAUTHORIZED' }
        });
        return;
      }

      await SkillService.deleteManualSkill(req.params.id);

      res.json({
        success: true,
        message: 'Skill deleted',
      });
    } catch (error) {
      logger.error({ error }, 'Failed to delete skill');
      res.status(500).json({
        success: false,
        message: 'Failed to delete skill',
        error: { code: 'INTERNAL_ERROR' }
      });
    }
  }

  /**
   * GET /skills/:id/evidence
   * Get skill with evidence details
   */
  static async getSkillEvidence(
    req: AuthenticatedRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
          error: { code: 'UNAUTHORIZED' }
        });
        return;
      }

      const skill = await SkillService.getSkillEvidence(req.user.userId, req.params.id);

      if (!skill) {
        res.status(404).json({
          success: false,
          message: 'Skill not found',
          error: { code: 'NOT_FOUND' }
        });
        return;
      }

      res.json({
        success: true,
        message: 'Skill evidence retrieved',
        data: { skill },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get skill evidence');
      res.status(500).json({
        success: false,
        message: 'Failed to get evidence',
        error: { code: 'INTERNAL_ERROR' }
      });
    }
  }
}

export default SkillController;
