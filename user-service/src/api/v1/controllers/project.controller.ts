import { Request, Response } from 'express';
import { ProjectService } from '../../../domain/project.service.js';
import { logger } from '../../../utils/logger.js';
import type { AuthenticatedRequest, ApiResponse } from '../../../types/index.js';
import { z } from 'zod';

const addProjectSchema = z.object({
  githubRepoUrl: z.string().url().includes('github.com'),
  repoName: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  defaultBranch: z.string().max(100).optional(),
});

// Batch analysis - max 3 projects at a time
const batchAnalyzeSchema = z.object({
  projects: z.array(z.object({
    githubRepoUrl: z.string().url().includes('github.com'),
    repoName: z.string().min(1).max(200),
    description: z.string().max(500).optional(),
    defaultBranch: z.string().max(100).optional(),
  })).min(1).max(3, 'Maximum 3 projects can be analyzed at a time'),
});

const MAX_TOTAL_PROJECTS = 10; // Free tier limit

export class ProjectController {
  /**
   * POST /projects
   * Add a new project for analysis
   */
  static async addProject(
    req: AuthenticatedRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const result = addProjectSchema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          error: { code: 'VALIDATION_ERROR', details: result.error.format() },
        });
        return;
      }

      const project = await ProjectService.addProject(req.user.userId, result.data);

      res.status(201).json({
        success: true,
        message: 'Project added for analysis',
        data: { project },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to add project');
      res.status(500).json({ success: false, message: 'Failed to add project', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * GET /projects
   * Get user's projects
   */
  static async getMyProjects(
    req: AuthenticatedRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const projects = await ProjectService.getUserProjects(req.user.userId);

      res.json({
        success: true,
        message: 'Projects retrieved',
        data: { projects },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get projects');
      res.status(500).json({ success: false, message: 'Failed to get projects', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * GET /projects/:projectId
   * Get single project
   */
  static async getProject(
    req: AuthenticatedRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const project = await ProjectService.getProject(req.params.projectId, req.user.userId);

      if (!project) {
        res.status(404).json({ success: false, message: 'Project not found', error: { code: 'NOT_FOUND' } });
        return;
      }

      res.json({
        success: true,
        message: 'Project retrieved',
        data: { project },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get project');
      res.status(500).json({ success: false, message: 'Failed to get project', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * DELETE /projects/:projectId
   * Delete a project
   */
  static async deleteProject(
    req: AuthenticatedRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const project = await ProjectService.deleteProject(req.params.projectId, req.user.userId);

      if (!project) {
        res.status(404).json({ success: false, message: 'Project not found', error: { code: 'NOT_FOUND' } });
        return;
      }

      res.json({
        success: true,
        message: 'Project deleted',
      });
    } catch (error) {
      logger.error({ error }, 'Failed to delete project');
      res.status(500).json({ success: false, message: 'Failed to delete project', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * POST /projects/:projectId/analyze
   * Re-trigger analysis for a project
   */
  static async reanalyze(
    req: AuthenticatedRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const project = await ProjectService.getProject(req.params.projectId, req.user.userId);

      if (!project) {
        res.status(404).json({ success: false, message: 'Project not found', error: { code: 'NOT_FOUND' } });
        return;
      }

      // Re-add to trigger analysis
      await ProjectService.addProject(req.user.userId, {
        githubRepoUrl: project.githubRepoUrl,
        repoName: project.repoName,
        description: project.description || undefined,
      });

      res.json({
        success: true,
        message: 'Analysis triggered',
      });
    } catch (error) {
      logger.error({ error }, 'Failed to trigger analysis');
      res.status(500).json({ success: false, message: 'Failed to trigger analysis', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * POST /projects/:projectId/pin
   * Toggle pin status
   */
  static async togglePin(
    req: AuthenticatedRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const project = await ProjectService.togglePin(req.params.projectId, req.user.userId);

      if (!project) {
        res.status(404).json({ success: false, message: 'Project not found', error: { code: 'NOT_FOUND' } });
        return;
      }

      res.json({
        success: true,
        message: `Project ${project.isPinned ? 'pinned' : 'unpinned'}`,
        data: { project },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to toggle pin');
      res.status(500).json({ success: false, message: 'Failed to toggle pin', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * POST /projects/batch
   * Analyze multiple projects at once (max 3)
   */
  static async batchAnalyze(
    req: AuthenticatedRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const result = batchAnalyzeSchema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          error: { code: 'VALIDATION_ERROR', details: result.error.format() },
        });
        return;
      }

      // Check total project limit
      const existingProjects = await ProjectService.getUserProjects(req.user.userId);
      const newCount = result.data.projects.length;
      
      if (existingProjects.length + newCount > MAX_TOTAL_PROJECTS) {
        res.status(400).json({
          success: false,
          message: `Maximum ${MAX_TOTAL_PROJECTS} projects allowed. You have ${existingProjects.length} projects.`,
          error: { code: 'PROJECT_LIMIT_EXCEEDED' },
        });
        return;
      }

      // Add all projects for analysis
      const addedProjects = [];
      for (const projectData of result.data.projects) {
        try {
          const project = await ProjectService.addProject(req.user.userId, projectData);
          addedProjects.push(project);
        } catch (err) {
          logger.warn({ error: err, repo: projectData.repoName }, 'Failed to add project in batch');
        }
      }

      res.status(201).json({
        success: true,
        message: `${addedProjects.length} projects added for analysis`,
        data: {
          projects: addedProjects,
          queued: addedProjects.length,
          failed: result.data.projects.length - addedProjects.length,
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to batch analyze');
      res.status(500).json({ success: false, message: 'Failed to add projects', error: { code: 'INTERNAL_ERROR' } });
    }
  }
}

export default ProjectController;
