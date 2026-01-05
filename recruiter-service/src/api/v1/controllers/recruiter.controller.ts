import { Request, Response } from 'express';
import { CandidateService } from '../../../domain/candidate.service.js';
import { logger } from '../../../utils/logger.js';
import type { RecruiterRequest, ApiResponse } from '../../../types/index.js';
import { z } from 'zod';

const searchFiltersSchema = z.object({
  skills: z.array(z.string()).optional(),
  minAuraScore: z.number().min(0).optional(),
  minCoreCount: z.number().min(1).max(3).optional(),
  location: z.string().optional(),
  isOpenToWork: z.boolean().optional(),
  minSkillScore: z.number().min(0).max(100).optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(50).default(20),
});

export class RecruiterController {
  /**
   * GET /candidates/search
   * Search for candidates with filters
   */
  static async searchCandidates(
    req: RecruiterRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.recruiter) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const validation = searchFiltersSchema.safeParse(req.query);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          message: 'Invalid filters',
          error: { code: 'VALIDATION_ERROR', details: validation.error.format() },
        });
        return;
      }

      const { page, limit, ...filters } = validation.data;
      const { candidates, total } = await CandidateService.searchCandidates(filters, page, limit);

      res.json({
        success: true,
        message: 'Candidates found',
        data: { candidates },
        meta: { page, limit, total },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to search candidates');
      res.status(500).json({ success: false, message: 'Search failed', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * GET /candidates/:userId
   * Get basic candidate profile (for list view)
   */
  static async getCandidateProfile(
    req: RecruiterRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.recruiter) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const { userId } = req.params;
      const candidate = await CandidateService.getCandidateProfile(userId);

      if (!candidate) {
        res.status(404).json({ success: false, message: 'Candidate not found', error: { code: 'NOT_FOUND' } });
        return;
      }

      res.json({
        success: true,
        message: 'Candidate profile retrieved',
        data: { candidate },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get candidate');
      res.status(500).json({ success: false, message: 'Failed to get candidate', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * GET /candidates/:userId/full
   * Get FULL candidate profile with all analyzed projects, resume, skills, optimization details
   */
  static async getFullCandidateProfile(
    req: RecruiterRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.recruiter) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const { userId } = req.params;
      const candidate = await CandidateService.getFullCandidateProfile(userId);

      if (!candidate) {
        res.status(404).json({ success: false, message: 'Candidate not found', error: { code: 'NOT_FOUND' } });
        return;
      }

      res.json({
        success: true,
        message: 'Full candidate profile retrieved',
        data: {
          candidate,
          // Highlight key info for recruiter
          summary: {
            name: candidate.name,
            auraLevel: getAuraLevel(candidate.auraScore),
            cores: candidate.coreCount,
            topSkills: candidate.topSkills.slice(0, 3).map(s => s.name),
            projectsAnalyzed: candidate.analyzedProjects.length,
            avgProjectScore: Math.round(
              candidate.analyzedProjects.reduce((sum, p) => sum + p.overallScore, 0) /
              candidate.analyzedProjects.length
            ),
            isOpenToWork: candidate.isOpenToWork,
            hasResume: !!candidate.resumeUrl,
          },
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get full candidate profile');
      res.status(500).json({ success: false, message: 'Failed to get profile', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * GET /candidates/:userId/resume
   * Get candidate's resume data for PDF generation or viewing
   */
  static async getCandidateResume(
    req: RecruiterRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.recruiter) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const { userId } = req.params;
      const candidate = await CandidateService.getFullCandidateProfile(userId);

      if (!candidate) {
        res.status(404).json({ success: false, message: 'Candidate not found', error: { code: 'NOT_FOUND' } });
        return;
      }

      // Build resume-friendly data
      const resumeData = {
        user: {
          id: candidate.id,
          username: candidate.username,
          name: candidate.name || candidate.username,
          email: candidate.email,
          avatarUrl: candidate.avatarUrl,
          bio: candidate.bio,
          location: candidate.location,
          website: candidate.website,
          coreCount: candidate.coreCount,
          auraScore: candidate.auraScore,
          isVerified: candidate.isVerified,
        },
        skills: candidate.allSkills.map(s => ({
          name: s.name,
          category: s.category,
          verifiedScore: s.score,
          isVerified: s.isVerified,
          projectCount: s.projectCount,
        })),
        projects: candidate.analyzedProjects.map(p => ({
          repoName: p.repoName,
          description: p.description,
          language: p.primaryLanguage,
          overallScore: p.overallScore,
          technologies: p.technologies,
          githubUrl: p.repoUrl,
        })),
        experiences: candidate.experiences,
        education: candidate.education,
        socialLinks: candidate.socialLinks,
        auraSummary: {
          total: candidate.auraScore,
          level: getAuraLevel(candidate.auraScore),
          percentile: 85, // Would calculate from all users
        },
      };

      res.json({
        success: true,
        message: 'Resume data retrieved',
        data: {
          resumeData,
          pdfUrl: candidate.resumeUrl,
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get resume');
      res.status(500).json({ success: false, message: 'Failed to get resume', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * POST /candidates/:userId/shortlist
   * Shortlist a candidate
   */
  static async shortlistCandidate(
    req: RecruiterRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.recruiter) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const { userId } = req.params;
      const { jobId } = req.body;

      await CandidateService.shortlistCandidate(req.recruiter.id, userId, jobId);

      res.json({
        success: true,
        message: 'Candidate shortlisted',
      });
    } catch (error) {
      logger.error({ error }, 'Failed to shortlist');
      res.status(500).json({ success: false, message: 'Failed to shortlist', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * GET /shortlist
   * Get shortlisted candidates
   */
  static async getShortlist(
    req: RecruiterRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.recruiter) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const candidates = await CandidateService.getShortlist(
        req.recruiter.id,
        req.recruiter.organizationId
      );

      res.json({
        success: true,
        message: 'Shortlist retrieved',
        data: { candidates },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get shortlist');
      res.status(500).json({ success: false, message: 'Failed to get shortlist', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * GET /dashboard
   * Get recruiter dashboard stats
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

      const dashboard = {
        activeJobs: 5,
        totalApplications: 127,
        pendingReviews: 23,
        shortlistedCandidates: 15,
        recentApplications: [],
        topMatchingCandidates: [],
      };

      res.json({
        success: true,
        message: 'Dashboard retrieved',
        data: { dashboard },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get dashboard');
      res.status(500).json({ success: false, message: 'Failed to get dashboard', error: { code: 'INTERNAL_ERROR' } });
    }
  }
}

// Helper function
function getAuraLevel(aura: number): string {
  if (aura >= 501) return 'Legend';
  if (aura >= 401) return 'Expert';
  if (aura >= 251) return 'Skilled';
  if (aura >= 101) return 'Rising';
  return 'Novice';
}

export default RecruiterController;
