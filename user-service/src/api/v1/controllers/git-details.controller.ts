import { Response } from 'express';
import { GitDetailsService } from '../../../domain/git-details.service.js';
import { ProjectService } from '../../../domain/project.service.js';
import { logger } from '../../../utils/logger.js';
import type { AuthenticatedRequest, ApiResponse } from '../../../types/index.js';

export class GitDetailsController {
  /**
   * POST /projects/:projectId/git-details/fetch
   * Trigger fetching git details from GitHub
   */
  static async fetchGitDetails(
    req: AuthenticatedRequest,
    res: Response<ApiResponse>,
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const { projectId } = req.params;

      // Verify ownership
      const project = await ProjectService.getProject(projectId, req.user.userId);
      if (!project) {
        res.status(404).json({ success: false, message: 'Project not found', error: { code: 'NOT_FOUND' } });
        return;
      }

      const gitDetails = await GitDetailsService.refresh(projectId);

      res.json({
        success: true,
        message: 'Git details fetched from GitHub',
        data: { gitDetails },
      });
    } catch (error) {
      logger.error({ error, projectId: req.params.projectId }, 'Failed to fetch git details');
      res.status(500).json({ success: false, message: 'Failed to fetch git details', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * GET /projects/:projectId/git-details
   * Get stored git details
   */
  static async getGitDetails(
    req: AuthenticatedRequest,
    res: Response<ApiResponse>,
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const { projectId } = req.params;

      // Verify ownership
      const project = await ProjectService.getProject(projectId, req.user.userId);
      if (!project) {
        res.status(404).json({ success: false, message: 'Project not found', error: { code: 'NOT_FOUND' } });
        return;
      }

      const gitDetails = await GitDetailsService.getByProjectId(projectId);

      if (!gitDetails) {
        res.status(404).json({ success: false, message: 'Git details not fetched yet', error: { code: 'NOT_FOUND' } });
        return;
      }

      res.json({
        success: true,
        message: 'Git details retrieved',
        data: { gitDetails },
      });
    } catch (error) {
      logger.error({ error, projectId: req.params.projectId }, 'Failed to get git details');
      res.status(500).json({ success: false, message: 'Failed to get git details', error: { code: 'INTERNAL_ERROR' } });
    }
  }
}

export default GitDetailsController;
