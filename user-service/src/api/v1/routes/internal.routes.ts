import { Router, Request, Response } from 'express';
import prisma from '../../../prisma/client.js';
import { logger } from '../../../utils/logger.js';
import type { ApiResponse } from '../../../types/index.js';

const router = Router();

/**
 * Internal API for inter-service communication
 * These endpoints are called by other services (recruiter-service, job-service)
 * and should be protected by internal authentication in production
 */

/**
 * @route   GET /api/internal/candidates/search
 * @desc    Search candidates for recruiter service
 * @access  Internal
 */
router.get('/candidates/search', async (req: Request, res: Response<ApiResponse>): Promise<void> => {
  try {
    const {
      skills,
      minAuraScore,
      minCoreCount,
      location,
      isOpenToWork,
      minSkillScore,
      page = '1',
      limit = '20',
    } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const limitNum = Math.min(parseInt(limit as string) || 20, 50);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause - respect visibility settings
    const where: any = {
      // Only show candidates with PUBLIC or RECRUITERS_ONLY visibility
      visibilityLevel: { in: ['PUBLIC', 'RECRUITERS_ONLY'] },
    };

    if (isOpenToWork === 'true') {
      where.isOpenToWork = true;
    }

    if (minAuraScore) {
      where.auraScore = { gte: parseInt(minAuraScore as string) };
    }

    if (minCoreCount) {
      where.coreCount = { gte: parseInt(minCoreCount as string) };
    }

    if (location) {
      where.OR = [
        { location: { contains: location as string, mode: 'insensitive' } },
        { preferredLocations: { has: location as string } },
      ];
    }

    // Get users with skills and projects (only visible ones)
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          skills: {
            where: { showToRecruiters: true },
            orderBy: [{ isHighlighted: 'desc' }, { verifiedScore: 'desc' }],
            take: 10,
          },
          projects: {
            where: { showToRecruiters: true },
            orderBy: [{ isPinned: 'desc' }, { overallScore: 'desc' }],
            take: 5,
          },
        },
        orderBy: { auraScore: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.user.count({ where }),
    ]);

    // Filter by skills if provided
    let filteredUsers = users;
    if (skills) {
      const skillList = (skills as string).split(',').map((s: string) => s.toLowerCase().trim());
      filteredUsers = users.filter(user => {
        const userSkillNames = user.skills.map((s) => s.name.toLowerCase());
        return skillList.some(skill => userSkillNames.includes(skill));
      });

      // If minSkillScore is provided, filter by skill score
      if (minSkillScore) {
        const minScore = parseInt(minSkillScore as string);
        filteredUsers = filteredUsers.filter(user => {
          return user.skills.some((s) => {
            const skillMatches = skillList.includes(s.name.toLowerCase());
            return skillMatches && s.verifiedScore >= minScore;
          });
        });
      }
    }

    // Transform to candidate format with visibility-aware data
    const candidates = filteredUsers.map(user => ({
      id: user.id,
      username: user.username,
      name: user.name,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      location: user.location,
      auraScore: user.auraScore,
      coreCount: user.coreCount,
      isOpenToWork: user.isOpenToWork,
      isVerified: user.isVerified,
      // Job preferences for matching
      preferredRoles: user.preferredRoles,
      preferredLocations: user.preferredLocations,
      preferredJobTypes: user.preferredJobTypes,
      remotePreference: user.remotePreference,
      availableFrom: user.availableFrom,
      // Skills (highlighted first)
      topSkills: user.skills.slice(0, 5).map((s) => ({
        name: s.name,
        score: s.verifiedScore,
        isVerified: s.isVerified,
        isHighlighted: s.isHighlighted,
      })),
      // Projects (pinned first)
      topProjects: user.projects.slice(0, 3).map((p) => ({
        name: p.repoName,
        score: p.overallScore || 0,
        language: p.language || 'Unknown',
        isPinned: p.isPinned,
      })),
    }));

    res.json({
      success: true,
      message: 'Candidates found',
      data: { candidates },
      meta: { page: pageNum, limit: limitNum, total },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to search candidates');
    res.status(500).json({
      success: false,
      message: 'Search failed',
      error: { code: 'INTERNAL_ERROR' },
    });
  }
});

/**
 * @route   GET /api/internal/candidates/:userId
 * @desc    Get candidate profile for recruiter service
 * @access  Internal
 */
router.get('/candidates/:userId', async (req: Request, res: Response<ApiResponse>): Promise<void> => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        // Only get skills user has chosen to show to recruiters
        skills: { 
          where: { showToRecruiters: true },
          orderBy: [{ isHighlighted: 'desc' }, { verifiedScore: 'desc' }] 
        },
        // Only get projects user has chosen to show to recruiters
        projects: {
          where: { showToRecruiters: true },
          orderBy: [{ isPinned: 'desc' }, { overallScore: 'desc' }],
        },
        experiences: { orderBy: { startDate: 'desc' } },
        socialLinks: true,
      },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
        error: { code: 'NOT_FOUND' },
      });
      return;
    }

    // Check if user allows recruiter visibility
    if (user.visibilityLevel === 'INVITE_ONLY') {
      res.status(403).json({
        success: false,
        message: 'This profile is private',
        error: { code: 'PRIVATE_PROFILE' },
      });
      return;
    }

    // Separate work experience and education from experiences
    const workExperiences = user.experiences.filter(e => e.type === 'WORK');
    const educationList = user.experiences.filter(e => e.type === 'EDUCATION');

    const candidate = {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.isOpenToWork ? user.email : undefined, // Only share email if open to work
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      location: user.location,
      website: user.website,
      auraScore: user.auraScore,
      coreCount: user.coreCount,
      isOpenToWork: user.isOpenToWork,
      isVerified: user.isVerified,
      
      // Skills (only those marked for recruiter visibility)
      allSkills: user.skills.map((s) => ({
        id: s.id,
        name: s.name,
        category: s.category,
        score: s.verifiedScore,
        isVerified: s.isVerified,
        projectCount: s.projectCount,
        isHighlighted: s.isHighlighted,
      })),
      topSkills: user.skills.slice(0, 5).map((s) => ({
        name: s.name,
        score: s.verifiedScore,
        isVerified: s.isVerified,
      })),

      // Projects (only those marked for recruiter visibility)
      analyzedProjects: user.projects.map((p) => ({
        id: p.id,
        repoName: p.repoName,
        repoUrl: p.githubRepoUrl,
        description: p.description,
        primaryLanguage: p.language,
        overallScore: p.overallScore || 0,
        codeQualityScore: p.codeQualityScore || 0,
        structureScore: p.structureScore || 0,
        stars: p.stars,
        forks: p.forks,
        isPinned: p.isPinned,
        analyzedAt: p.analyzedAt?.toISOString(),
      })),
      topProjects: user.projects.slice(0, 3).map((p) => ({
        name: p.repoName,
        score: p.overallScore || 0,
        language: p.language || 'Unknown',
      })),

      // Work Experience
      experiences: workExperiences.map((e) => ({
        company: e.organization,
        position: e.title,
        location: e.location,
        startDate: e.startDate.toISOString(),
        endDate: e.endDate?.toISOString(),
        isCurrent: e.isCurrent,
        description: e.description,
      })),

      // Education
      education: educationList.map((e) => ({
        institution: e.organization,
        degree: e.title,
        field: e.description || '',
        startYear: e.startDate.getFullYear(),
        endYear: e.endDate?.getFullYear() || null,
      })),

      // Social
      socialLinks: user.socialLinks.map((s) => ({
        platform: s.platform,
        url: s.url,
      })),

    };

    res.json({
      success: true,
      message: 'Candidate found',
      data: { candidate },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get candidate');
    res.status(500).json({
      success: false,
      message: 'Failed to get candidate',
      error: { code: 'INTERNAL_ERROR' },
    });
  }
});

/**
 * @route   GET /api/internal/candidates/:userId/resume
 * @desc    Get candidate resume data for PDF generation
 * @access  Internal
 */
router.get('/candidates/:userId/resume', async (req: Request, res: Response<ApiResponse>): Promise<void> => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        skills: { orderBy: { verifiedScore: 'desc' }, take: 15 },
        projects: {
          orderBy: { overallScore: 'desc' },
          take: 6,
        },
        experiences: { orderBy: { startDate: 'desc' } },
        socialLinks: true,
      },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
        error: { code: 'NOT_FOUND' },
      });
      return;
    }

    // Separate work experience and education
    const workExperiences = user.experiences.filter(e => e.type === 'WORK');
    const educationList = user.experiences.filter(e => e.type === 'EDUCATION');

    // Format for resume service
    const resumeData = {
      user: {
        id: user.id,
        username: user.username,
        name: user.name || user.username,
        email: user.email || '',
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        location: user.location,
        website: user.website,
        phone: '', // User may add this
        coreCount: user.coreCount,
        auraScore: user.auraScore,
        isVerified: user.isVerified,
      },
      skills: user.skills.map((s) => ({
        name: s.name,
        category: s.category,
        verifiedScore: s.verifiedScore,
        isVerified: s.isVerified,
        projectCount: s.projectCount,
      })),
      projects: user.projects.map((p) => ({
        repoName: p.repoName,
        description: p.description || '',
        language: p.language || 'Unknown',
        stars: p.stars,
        overallScore: p.overallScore || 0,
        githubUrl: p.githubRepoUrl,
      })),
      experiences: workExperiences.map((e) => ({
        company: e.organization,
        position: e.title,
        location: e.location,
        startDate: e.startDate.toISOString().split('T')[0],
        endDate: e.endDate?.toISOString().split('T')[0],
        isCurrent: e.isCurrent,
        description: e.description || '',
      })),
      education: educationList.map((e) => ({
        institution: e.organization,
        degree: e.title,
        field: e.description || '',
        startYear: e.startDate.getFullYear(),
        endYear: e.endDate?.getFullYear() || null,
      })),
      socialLinks: user.socialLinks.map((s) => ({
        platform: s.platform,
        url: s.url,
        username: s.username,
      })),
      auraSummary: {
        total: user.auraScore,
        level: getAuraLevel(user.auraScore),
        percentile: 0, // Would need to calculate
      },
    };

    res.json({
      success: true,
      message: 'Resume data retrieved',
      data: resumeData,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get resume data');
    res.status(500).json({
      success: false,
      message: 'Failed to get resume data',
      error: { code: 'INTERNAL_ERROR' },
    });
  }
});

function getAuraLevel(score: number): string {
  if (score >= 900) return 'Legendary';
  if (score >= 700) return 'Master';
  if (score >= 500) return 'Expert';
  if (score >= 300) return 'Proficient';
  if (score >= 150) return 'Intermediate';
  if (score >= 50) return 'Beginner';
  return 'Newcomer';
}

export default router;
