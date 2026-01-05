import { Response, NextFunction } from 'express';
import { prisma } from '../prisma/client.js';
import { SkillSource } from '@prisma/client';
import { logger } from '../utils/logger.js';
import type { AuthenticatedRequest, ApiResponse } from '../types/index.js';

/**
 * Middleware to protect verified skills from modification
 * 
 * Skills from ANALYSIS source are verified and cannot be:
 * - Edited
 * - Deleted
 * 
 * Only MANUAL skills can be modified by users.
 */
export async function protectVerifiedSkills(
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  const skillId = req.params.id;
  const userId = req.user?.userId;

  if (!skillId) {
    res.status(400).json({
      success: false,
      message: 'Skill ID is required',
      error: { code: 'BAD_REQUEST' }
    });
    return;
  }

  if (!userId) {
    res.status(401).json({
      success: false,
      message: 'Unauthorized',
      error: { code: 'UNAUTHORIZED' }
    });
    return;
  }

  try {
    const skill = await prisma.skill.findUnique({
      where: { id: skillId },
      select: {
        id: true,
        userId: true,
        name: true,
        source: true,
        isVerified: true,
      }
    });

    if (!skill) {
      res.status(404).json({
        success: false,
        message: 'Skill not found',
        error: { code: 'NOT_FOUND' }
      });
      return;
    }

    // Check if skill belongs to user
    if (skill.userId !== userId) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to modify this skill',
        error: { code: 'FORBIDDEN' }
      });
      return;
    }

    // Block modification of verified skills from ANALYSIS
    if (skill.source === SkillSource.ANALYSIS) {
      logger.warn({ userId, skillId, skillName: skill.name }, 'Attempted to modify verified skill');
      
      res.status(403).json({
        success: false,
        message: 'Cannot modify verified skills',
        error: {
          code: 'SKILL_PROTECTED',
          details: {
            reason: 'Skills verified through project analysis cannot be edited or deleted.',
            suggestion: 'Add more projects to improve your skill scores.',
          }
        }
      });
      return;
    }

    // Block modification of GitHub-sourced skills
    if (skill.source === SkillSource.GITHUB) {
      res.status(403).json({
        success: false,
        message: 'Cannot modify GitHub-synced skills',
        error: {
          code: 'SKILL_GITHUB_SYNCED',
          details: {
            reason: 'These skills are automatically synced from your GitHub profile.',
            suggestion: 'Update your GitHub profile to change these skills.',
          }
        }
      });
      return;
    }

    // MANUAL skills can be modified
    next();
  } catch (error) {
    logger.error({ error, skillId, userId }, 'Error in skill protection middleware');
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: { code: 'INTERNAL_ERROR' }
    });
  }
}

export default protectVerifiedSkills;
