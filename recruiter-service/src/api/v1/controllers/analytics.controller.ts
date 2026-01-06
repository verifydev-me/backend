import { Response } from 'express';
import { AnalyticsService } from '../../../domain/analytics.service.js';
import { logger } from '../../../utils/logger.js';
import type { RecruiterRequest, ApiResponse } from '../../../types/index.js';

/**
 * Analytics Controller
 * Provides endpoints for recruiter analytics and insights
 */
export class AnalyticsController {
  /**
   * GET /analytics/dashboard
   * Get comprehensive recruiter dashboard stats
   */
  static async getDashboard(
    req: RecruiterRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.recruiter) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const stats = await AnalyticsService.getRecruiterDashboard(
        req.recruiter.id,
        req.recruiter.organizationId
      );

      res.json({
        success: true,
        message: 'Dashboard stats retrieved',
        data: { stats },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get dashboard');
      res.status(500).json({ success: false, message: 'Failed to get dashboard', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * GET /analytics/quick
   * Get quick metrics for header/sidebar
   */
  static async getQuickMetrics(
    req: RecruiterRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.recruiter) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const metrics = await AnalyticsService.getQuickMetrics(req.recruiter.id);

      res.json({
        success: true,
        message: 'Quick metrics retrieved',
        data: { metrics },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get quick metrics');
      res.status(500).json({ success: false, message: 'Failed to get metrics', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * GET /analytics/interviews
   * Get interview analytics
   */
  static async getInterviewAnalytics(
    req: RecruiterRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.recruiter) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const { startDate, endDate } = req.query;
      let dateRange: { start: Date; end: Date } | undefined;

      if (startDate && endDate) {
        dateRange = {
          start: new Date(startDate as string),
          end: new Date(endDate as string),
        };
      }

      const analytics = await AnalyticsService.getInterviewAnalytics(
        req.recruiter.id,
        dateRange
      );

      res.json({
        success: true,
        message: 'Interview analytics retrieved',
        data: { analytics },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get interview analytics');
      res.status(500).json({ success: false, message: 'Failed to get analytics', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * GET /analytics/messages
   * Get message analytics
   */
  static async getMessageAnalytics(
    req: RecruiterRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.recruiter) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const analytics = await AnalyticsService.getMessageAnalytics(req.recruiter.id);

      res.json({
        success: true,
        message: 'Message analytics retrieved',
        data: { analytics },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get message analytics');
      res.status(500).json({ success: false, message: 'Failed to get analytics', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * GET /analytics/candidates
   * Get saved candidates analytics
   */
  static async getCandidateAnalytics(
    req: RecruiterRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.recruiter) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const analytics = await AnalyticsService.getSavedCandidatesAnalytics(req.recruiter.id);

      res.json({
        success: true,
        message: 'Candidate analytics retrieved',
        data: { analytics },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get candidate analytics');
      res.status(500).json({ success: false, message: 'Failed to get analytics', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * GET /analytics/templates
   * Get template usage analytics
   */
  static async getTemplateAnalytics(
    req: RecruiterRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.recruiter) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const analytics = await AnalyticsService.getTemplateAnalytics(req.recruiter.id);

      res.json({
        success: true,
        message: 'Template analytics retrieved',
        data: { analytics },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get template analytics');
      res.status(500).json({ success: false, message: 'Failed to get analytics', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * GET /analytics/activity
   * Get activity timeline
   */
  static async getActivityTimeline(
    req: RecruiterRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.recruiter) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const { limit } = req.query;
      const activities = await AnalyticsService.getActivityTimeline(
        req.recruiter.id,
        limit ? parseInt(limit as string) : 20
      );

      res.json({
        success: true,
        message: 'Activity timeline retrieved',
        data: { activities },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get activity timeline');
      res.status(500).json({ success: false, message: 'Failed to get timeline', error: { code: 'INTERNAL_ERROR' } });
    }
  }
}

export default AnalyticsController;
