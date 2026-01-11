import { Request, Response } from 'express';
import { CandidateService } from '../../../domain/candidate.service.js';
import { ApplicationService } from '../../../domain/application.service.js';
import { MatchingService, type JobRequirements } from '../../../domain/matching.service.js';
import { logger } from '../../../utils/logger.js';
import type { RecruiterRequest, ApiResponse } from '../../../types/index.js';
import { z } from 'zod';

const searchFiltersSchema = z.object({
  skills: z.union([z.array(z.string()), z.string()]).optional().transform((val) => {
    if (!val) return undefined;
    if (typeof val === 'string') return [val];
    return val;
  }),
  minAuraScore: z.union([z.number(), z.string()]).optional().transform((val) => {
    if (!val) return undefined;
    return typeof val === 'string' ? parseInt(val, 10) : val;
  }),
  minCoreCount: z.union([z.number(), z.string()]).optional().transform((val) => {
    if (!val) return undefined;
    const num = typeof val === 'string' ? parseInt(val, 10) : val;
    return num >= 1 && num <= 3 ? num : undefined;
  }),
  location: z.string().optional(),
  isOpenToWork: z.union([z.boolean(), z.string()]).optional().transform((val) => {
    if (!val) return undefined;
    return val === 'true' || val === true;
  }),
  minSkillScore: z.union([z.number(), z.string()]).optional().transform((val) => {
    if (!val) return undefined;
    const num = typeof val === 'string' ? parseInt(val, 10) : val;
    return num >= 0 && num <= 100 ? num : undefined;
  }),
  page: z.union([z.number(), z.string()]).optional().transform((val) => {
    const num = typeof val === 'string' ? parseInt(val, 10) : (val || 1);
    return num >= 1 ? num : 1;
  }).default(1),
  limit: z.union([z.number(), z.string()]).optional().transform((val) => {
    const num = typeof val === 'string' ? parseInt(val, 10) : (val || 20);
    return num >= 1 && num <= 50 ? num : 20;
  }).default(20),
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
  /**
   * POST /jobs/:jobId/suggested-candidates
   * Get candidates matching a job's requirements
   */
  static async getSuggestedCandidates(
    req: RecruiterRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.recruiter) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const { jobId } = req.params;
      const {
        requiredSkills = [],
        niceToHaveSkills = [],
        minAuraScore = 0,
        minCoreCount = 0,
        experienceLevel,
        location,
        locationType,
        limit = 20
      } = req.body;

      const jobRequirements: JobRequirements = {
        jobId,
        requiredSkills: (requiredSkills as any[]).map((s: any) => ({
          name: typeof s === 'string' ? s : s.name,
          minScore: typeof s === 'object' ? s.minScore : undefined,
          isRequired: typeof s === 'object' ? s.isRequired !== false : true,
        })),
        niceToHaveSkills: (niceToHaveSkills as any[]).map((s: any) => ({
          name: typeof s === 'string' ? s : s.name,
        })),
        minAuraScore,
        minCoreCount,
        experienceLevel,
        location,
        locationType,
      };

      const matchedCandidates = await MatchingService.findMatchingCandidates(
        jobRequirements,
        limit
      );

      res.json({
        success: true,
        message: `Found ${matchedCandidates.length} matching candidates`,
        data: {
          candidates: matchedCandidates.map(c => ({
            id: c.id,
            username: c.username,
            name: c.name,
            avatarUrl: c.avatarUrl,
            location: c.location,
            auraScore: c.auraScore,
            coreCount: c.coreCount,
            isOpenToWork: c.isOpenToWork,
            matchScore: c.totalScore,
            matchBreakdown: c.breakdown,
            matchedSkills: c.matchedSkills,
            missingSkills: c.missingSkills,
            matchReasons: c.reasons,
          })),
          total: matchedCandidates.length,
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get suggested candidates');
      res.status(500).json({ success: false, message: 'Failed to get suggestions', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * POST /candidates/:userId/match-score
   * Calculate match score for a specific candidate against job requirements
   */
  static async calculateCandidateMatch(
    req: RecruiterRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.recruiter) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const { userId } = req.params;
      const {
        jobId,
        requiredSkills = [],
        niceToHaveSkills = [],
        minAuraScore = 0,
        minCoreCount = 0,
        experienceLevel,
        location,
        locationType,
        availableFrom,
      } = req.body;

      const jobRequirements: JobRequirements = {
        jobId: jobId || 'manual',
        requiredSkills: (requiredSkills as any[]).map((s: any) => ({
          name: typeof s === 'string' ? s : s.name,
          minScore: typeof s === 'object' ? s.minScore : undefined,
          isRequired: typeof s === 'object' ? s.isRequired !== false : true,
        })),
        niceToHaveSkills: (niceToHaveSkills as any[]).map((s: any) => ({
          name: typeof s === 'string' ? s : s.name,
        })),
        minAuraScore,
        minCoreCount,
        experienceLevel,
        location,
        locationType,
        availableFrom: availableFrom ? new Date(availableFrom) : undefined,
      };

      const matchResult = await MatchingService.calculateApplicationMatch(
        userId,
        jobId || 'manual',
        jobRequirements
      );

      if (!matchResult) {
        res.status(404).json({ success: false, message: 'Candidate not found', error: { code: 'NOT_FOUND' } });
        return;
      }

      res.json({
        success: true,
        message: 'Match score calculated',
        data: {
          candidateId: matchResult.candidateId,
          matchScore: matchResult.totalScore,
          matchBreakdown: matchResult.breakdown,
          matchedSkills: matchResult.matchedSkills,
          missingSkills: matchResult.missingSkills,
          matchReasons: matchResult.reasons,
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to calculate match');
      res.status(500).json({ success: false, message: 'Failed to calculate match', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * GET /jobs/:jobId/applications
   * Get applications for a specific job
   */
  static async getJobApplications(
    req: RecruiterRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.recruiter) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const { jobId } = req.params;
      const { status, page, limit } = req.query;

      const result = await ApplicationService.getJobApplications(jobId, {
        status: status as any,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20
      });

      res.json({
        success: true,
        message: 'Applications retrieved',
        data: {
          applications: result.applications,
          stats: result.stats
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get applications');
      res.status(500).json({ success: false, message: 'Failed to get applications', error: { code: 'INTERNAL_ERROR' } });
    }
  }
  /**
   * PUT /applications/:applicationId/status
   * Update application status
   */
  static async updateApplicationStatus(
    req: RecruiterRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.recruiter) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const { applicationId } = (req as any).params;
      const { status } = (req as any).body;

      if (!status) {
        res.status(400).json({ success: false, message: 'Status is required', error: { code: 'VALIDATION_ERROR' } });
        return;
      }

      const application = await ApplicationService.updateApplicationStatus(applicationId, status);

      if (!application) {
        res.status(404).json({ success: false, message: 'Application not found', error: { code: 'NOT_FOUND' } });
        return;
      }

      res.json({
        success: true,
        message: 'Application status updated',
        data: { application },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to update application status');
      res.status(500).json({ success: false, message: 'Failed to update status', error: { code: 'INTERNAL_ERROR' } });
    }
  }

  /**
   * PUT /applications/:applicationId/note
   * Add recruiter note to application
   */
  static async addApplicationNote(
    req: RecruiterRequest,
    res: Response<ApiResponse>
  ): Promise<void> {
    try {
      if (!req.recruiter) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const { applicationId } = (req as any).params;
      const { note } = (req as any).body;

      if (note === undefined) {
        res.status(400).json({ success: false, message: 'Note is required', error: { code: 'VALIDATION_ERROR' } });
        return;
      }

      const application = await ApplicationService.addRecruiterNotes(applicationId, note);

      if (!application) {
        res.status(404).json({ success: false, message: 'Application not found', error: { code: 'NOT_FOUND' } });
        return;
      }

      res.json({
        success: true,
        message: 'Note added',
        data: { application },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to add note');
      res.status(500).json({ success: false, message: 'Failed to add note', error: { code: 'INTERNAL_ERROR' } });
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
