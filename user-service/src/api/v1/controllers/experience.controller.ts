import { Response } from 'express';
import { z } from 'zod';
import prisma from '../../../prisma/client.js';
import { logger } from '../../../utils/logger.js';
import type { AuthenticatedRequest, ApiResponse } from '../../../types/index.js';

// Validation schemas
const createExperienceSchema = z.object({
  type: z.enum(['WORK', 'EDUCATION', 'CERTIFICATION', 'VOLUNTEER']),
  title: z.string().min(1).max(200),
  organization: z.string().min(1).max(200),
  location: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  startDate: z.string().transform((s) => new Date(s)),
  endDate: z.string().transform((s) => new Date(s)).optional().nullable(),
  isCurrent: z.boolean().default(false),
  skills: z.array(z.string()).default([]),
});

const updateExperienceSchema = createExperienceSchema.partial();

export class ExperienceController {
  /**
   * GET /users/me/experiences
   * Get all experiences for the current user
   */
  static async getMyExperiences(
    req: AuthenticatedRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const experiences = await prisma.experience.findMany({
        where: { userId: req.user.userId },
        orderBy: [{ isCurrent: 'desc' }, { startDate: 'desc' }],
      });

      // Group by type for easier frontend consumption
      const grouped = {
        work: experiences.filter((e) => e.type === 'WORK'),
        education: experiences.filter((e) => e.type === 'EDUCATION'),
        certifications: experiences.filter((e) => e.type === 'CERTIFICATION'),
        volunteer: experiences.filter((e) => e.type === 'VOLUNTEER'),
        all: experiences,
      };

      res.json({
        success: true,
        message: 'Experiences retrieved',
        data: grouped,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get experiences');
      res.status(500).json({ success: false, message: 'Failed to get experiences', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * POST /users/me/experiences
   * Create a new experience
   */
  static async createExperience(
    req: AuthenticatedRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const result = createExperienceSchema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          error: { code: 'VALIDATION_ERROR', details: result.error.format() },
        });
        return;
      }

      const experience = await prisma.experience.create({
        data: {
          userId: req.user.userId,
          type: result.data.type,
          title: result.data.title,
          organization: result.data.organization,
          location: result.data.location,
          description: result.data.description,
          startDate: result.data.startDate,
          endDate: result.data.endDate,
          isCurrent: result.data.isCurrent,
          skills: result.data.skills,
        },
      });

      logger.info({ userId: req.user.userId, experienceId: experience.id }, 'Experience created');

      res.status(201).json({
        success: true,
        message: 'Experience created successfully',
        data: { experience },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to create experience');
      res.status(500).json({ success: false, message: 'Failed to create experience', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * PUT /users/me/experiences/:id
   * Update an experience
   */
  static async updateExperience(
    req: AuthenticatedRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const { id } = req.params;

      // Verify ownership
      const existing = await prisma.experience.findFirst({
        where: { id, userId: req.user.userId },
      });

      if (!existing) {
        res.status(404).json({ success: false, message: 'Experience not found', error: { code: 'NOT_FOUND' } });
        return;
      }

      const result = updateExperienceSchema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          error: { code: 'VALIDATION_ERROR', details: result.error.format() },
        });
        return;
      }

      const experience = await prisma.experience.update({
        where: { id },
        data: result.data,
      });

      res.json({
        success: true,
        message: 'Experience updated successfully',
        data: { experience },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to update experience');
      res.status(500).json({ success: false, message: 'Failed to update experience', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * DELETE /users/me/experiences/:id
   * Delete an experience
   */
  static async deleteExperience(
    req: AuthenticatedRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const { id } = req.params;

      // Verify ownership
      const existing = await prisma.experience.findFirst({
        where: { id, userId: req.user.userId },
      });

      if (!existing) {
        res.status(404).json({ success: false, message: 'Experience not found', error: { code: 'NOT_FOUND' } });
        return;
      }

      await prisma.experience.delete({ where: { id } });

      res.json({
        success: true,
        message: 'Experience deleted successfully',
      });
    } catch (error) {
      logger.error({ error }, 'Failed to delete experience');
      res.status(500).json({ success: false, message: 'Failed to delete experience', error: { code: 'INTERNAL_ERROR' } });
    }
  }
}

export default ExperienceController;
