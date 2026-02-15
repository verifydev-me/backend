import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../../../utils/logger.js';
import type { ApiResponse, AuthenticatedRequest } from '../../../types/index.js';

const prisma = new PrismaClient();

/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * DASHBOARD API - COMPREHENSIVE ANALYTICS
 * Single endpoint returning all dashboard data
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

export interface DashboardData {
  // User Overview
  user: {
    id: string;
    username: string;
    email: string | null;
    name: string | null;
    avatarUrl: string | null;
    bio: string | null;
    location: string | null;
    company: string | null;
    isVerified: boolean;
    isOpenToWork: boolean;
    primaryRole: string | null;
    primaryNiche: string | null;
    joinedAt: Date;
  };

  // Aura Scoring System
  aura: {
    total: number;
    rank: string; // 'TOP_1_PERCENT' | 'TOP_5_PERCENT' | 'TOP_10_PERCENT' | 'RISING' | 'BEGINNER'
    percentile: number; // User's percentile rank
    breakdown: {
      profile: number;        // Completeness, verification
      projects: number;       // Quality, complexity, contributions
      skills: number;         // Verified skills count & depth
      activity: number;       // GitHub activity, consistency
      github: number;         // Stars, forks, contributions
      community: number;      // Interactions, help given
    };
    recentGains: Array<{
      type: 'PROJECT_ANALYZED' | 'SKILL_VERIFIED' | 'GITHUB_ACTIVITY' | 'LOGIN' | 'PROFILE_UPDATE';
      points: number;
      description: string;
      timestamp: Date;
    }>;
    trend: {
      change: number;         // +/- change in last 30 days
      direction: 'UP' | 'DOWN' | 'STABLE';
    };
  };

  // Projects Analytics
  projects: {
    total: number;
    analyzed: number;
    avgScore: number;
    topLanguages: Array<{
      name: string;
      count: number;
      percentage: number;
    }>;
    featured: Array<{
      id: string;
      repoName: string;
      description: string | null;
      language: string | null;
      stars: number;
      forks: number;
      overallScore: number;
      complexityScore: number;
      bestPracticesScore: number;
      analysisStatus: string;
      lastAnalyzed: Date | null;
      githubUrl: string | null;
    }>;
  };

  // Skills Analytics
  skills: {
    total: number;
    verified: number;
    categories: Array<{
      category: string;
      count: number;
      avgScore: number;
    }>;
    top: Array<{
      name: string;
      verifiedScore: number;
      category: string;
      isVerified: boolean;
      projectCount: number;
    }>;
    trending: Array<{
      name: string;
      growthRate: number; // Percentage growth in last 30 days
    }>;
  };

  // Job Application Analytics (requires job-service integration)
  jobs: {
    applied: number;
    shortlisted: number;
    interviews: number;
    offers: number;
    rejected: number;
    pending: number;
    successRate: number; // (shortlisted + interviews) / applied * 100
    recent: Array<{
      id: string;
      jobId: string;
      companyName: string;
      role: string;
      status: string;
      matchScore: number | null;
      appliedAt: Date;
    }>;
  };

  // Activity Timeline
  activity: {
    recentActions: Array<{
      type: 'PROJECT_ADDED' | 'SKILL_VERIFIED' | 'JOB_APPLIED' | 'PROFILE_UPDATED' | 'GITHUB_SYNC';
      title: string;
      description: string;
      timestamp: Date;
      metadata?: any;
    }>;
    stats: {
      projectsThisMonth: number;
      skillsAddedThisMonth: number;
      jobsAppliedThisMonth: number;
      loginStreak: number; // Days
    };
  };

  // Recommendations
  recommendations: {
    skillsToLearn: Array<{
      name: string;
      reason: string;
      demand: 'HIGH' | 'MEDIUM' | 'LOW';
      relatedToExisting: string[]; // Related skills user already has
    }>;
    profileImprovements: Array<{
      area: string;
      suggestion: string;
      impact: 'HIGH' | 'MEDIUM' | 'LOW';
      completed: boolean;
    }>;
    matchingJobs: Array<{
      id: string;
      role: string;
      company: string;
      matchScore: number;
      reason: string;
    }>;
  };
}

export async function getDashboard(
  req: AuthenticatedRequest,
  res: Response<ApiResponse<DashboardData>>,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    
    logger.info({ userId }, 'Fetching comprehensive dashboard data');

    // Parallel data fetching for performance
    const [user, projects, skills, auraData, jobStats] = await Promise.all([
      // 1. User profile
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          email: true,
          name: true,
          avatarUrl: true,
          bio: true,
          location: true,
          company: true,
          isVerified: true,
          isOpenToWork: true,
          primaryRole: true,
          primaryNiche: true,
          createdAt: true,
        },
      }),

      // 2. Projects with analysis data
      prisma.project.findMany({
        where: { userId },
        select: {
          id: true,
          repoName: true,
          description: true,
          language: true,
          stars: true,
          forks: true,
          githubRepoUrl: true,
          analysisStatus: true,
          overallScore: true,
          codeQualityScore: true,
          structureScore: true,
          analyzedAt: true,
          createdAt: true,
        },
        orderBy: { overallScore: 'desc' },
      }),

      // 3. Skills with verification
      prisma.skill.findMany({
        where: { userId },
        select: {
          name: true,
          category: true,
          verifiedScore: true,
          isVerified: true,
          projectCount: true,
          createdAt: true,
        },
        orderBy: { verifiedScore: 'desc' },
      }),

      // 4. Aura scoring data
      prisma.auraScore.findUnique({
        where: { userId },
        include: {
          gainHistory: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      }),

      // 5. Job application stats
      prisma.application.findMany({
        where: { userId },
        select: {
          id: true,
          jobId: true,
          companyName: true,
          role: true,
          status: true,
          matchScore: true,
          appliedAt: true,
        },
        orderBy: { appliedAt: 'desc' },
        take: 10,
      }).catch(() => []), // Graceful fallback if table doesn't exist
    ]);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
        error: { code: 'USER_NOT_FOUND' },
      });
      return;
    }

    // ━━━ Calculate Aura Breakdown ━━━
    const totalAura = auraData?.totalScore || 0;
    const breakdown = {
      profile: auraData?.profileScore || 0,
      projects: auraData?.projectScore || 0,
      skills: auraData?.skillScore || 0,
      activity: auraData?.activityScore || 0,
      github: auraData?.githubScore || 0,
      community: auraData?.communityScore || 0,
    };

    // Calculate percentile rank (simplified - enhance with actual DB query)
    const percentile = calculatePercentile(totalAura);
    const rank = getRankFromPercentile(percentile);

    // ━━━ Projects Analytics ━━━
    const analyzedProjects = projects.filter(p => p.analysisStatus === 'COMPLETED');
    const avgScore = analyzedProjects.length > 0
      ? analyzedProjects.reduce((sum, p) => sum + (p.overallScore || 0), 0) / analyzedProjects.length
      : 0;

    // Language distribution
    const langMap = new Map<string, number>();
    projects.forEach(p => {
      if (p.language) {
        langMap.set(p.language, (langMap.get(p.language) || 0) + 1);
      }
    });
    const topLanguages = Array.from(langMap.entries())
      .map(([name, count]) => ({
        name,
        count,
        percentage: (count / projects.length) * 100,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // ━━━ Skills Analytics ━━━
    const verifiedSkills = skills.filter(s => s.isVerified);
    
    // Category breakdown
    const categoryMap = new Map<string, { count: number; totalScore: number }>();
    skills.forEach(s => {
      const cat = s.category || 'Other';
      const existing = categoryMap.get(cat) || { count: 0, totalScore: 0 };
      categoryMap.set(cat, {
        count: existing.count + 1,
        totalScore: existing.totalScore + s.verifiedScore,
      });
    });
    const categories = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        count: data.count,
        avgScore: data.totalScore / data.count,
      }))
      .sort((a, b) => b.count - a.count);

    // ━━━ Job Stats ━━━
    const jobsByStatus = {
      applied: jobStats.length,
      shortlisted: jobStats.filter(j => j.status === 'SHORTLISTED').length,
      interviews: jobStats.filter(j => j.status === 'INTERVIEW' || j.status === 'INTERVIEW_SCHEDULED').length,
      offers: jobStats.filter(j => j.status === 'OFFER' || j.status === 'OFFER_EXTENDED').length,
      rejected: jobStats.filter(j => j.status === 'REJECTED').length,
      pending: jobStats.filter(j => j.status === 'PENDING').length,
    };
    const successRate = jobStats.length > 0
      ? ((jobsByStatus.shortlisted + jobsByStatus.interviews + jobsByStatus.offers) / jobStats.length) * 100
      : 0;

    // ━━━ Activity Stats ━━━
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const recentProjects = projects.filter(p => p.createdAt >= thirtyDaysAgo).length;
    const recentSkills = skills.filter(s => s.createdAt >= thirtyDaysAgo).length;
    const recentJobs = jobStats.filter(j => j.appliedAt >= thirtyDaysAgo).length;

    // ━━━ Build Response ━━━
    const dashboardData: DashboardData = {
      user: {
        ...user,
        joinedAt: user.createdAt,
      },

      aura: {
        total: totalAura,
        rank,
        percentile,
        breakdown,
        recentGains: auraData?.gainHistory.map(gain => ({
          type: gain.type as any,
          points: gain.points,
          description: gain.description,
          timestamp: gain.createdAt,
        })) || [],
        trend: {
          change: auraData?.monthlyChange || 0,
          direction: (auraData?.monthlyChange || 0) > 0 ? 'UP' : (auraData?.monthlyChange || 0) < 0 ? 'DOWN' : 'STABLE',
        },
      },

      projects: {
        total: projects.length,
        analyzed: analyzedProjects.length,
        avgScore: Math.round(avgScore),
        topLanguages,
        featured: projects.slice(0, 6).map(p => ({
          id: p.id,
          repoName: p.repoName,
          description: p.description,
          language: p.language,
          stars: p.stars,
          forks: p.forks,
          overallScore: p.overallScore,
          complexityScore: p.structureScore,
          bestPracticesScore: p.codeQualityScore,
          analysisStatus: p.analysisStatus,
          lastAnalyzed: p.analyzedAt,
          githubUrl: p.githubRepoUrl,
        })),
      },

      skills: {
        total: skills.length,
        verified: verifiedSkills.length,
        categories,
        top: skills.slice(0, 8),
        trending: [], // TODO: Implement trending calculation based on recent gains
      },

      jobs: {
        ...jobsByStatus,
        successRate: Math.round(successRate),
        recent: jobStats.map(j => ({
          id: j.id,
          jobId: j.jobId,
          companyName: j.companyName,
          role: j.role,
          status: j.status,
          matchScore: j.matchScore,
          appliedAt: j.appliedAt,
        })),
      },

      activity: {
        recentActions: buildActivityTimeline(projects, skills, jobStats),
        stats: {
          projectsThisMonth: recentProjects,
          skillsAddedThisMonth: recentSkills,
          jobsAppliedThisMonth: recentJobs,
          loginStreak: auraData?.loginStreak || 0,
        },
      },

      recommendations: {
        skillsToLearn: generateSkillRecommendations(skills),
        profileImprovements: generateProfileImprovements(user, skills, projects),
        matchingJobs: [], // TODO: Integrate with job matching engine
      },
    };

    res.json({
      success: true,
      message: 'Dashboard data retrieved successfully',
      data: dashboardData,
    });
  } catch (error) {
    logger.error({ error, userId: req.user?.userId }, 'Failed to fetch dashboard data');
    next(error);
  }
}

// ━━━ HELPER FUNCTIONS ━━━

function calculatePercentile(score: number): number {
  // Simplified percentile calculation
  // In production, query actual user distribution from database
  if (score >= 500) return 99;
  if (score >= 400) return 95;
  if (score >= 300) return 85;
  if (score >= 200) return 70;
  if (score >= 100) return 50;
  return 25;
}

function getRankFromPercentile(percentile: number): string {
  if (percentile >= 99) return 'TOP_1_PERCENT';
  if (percentile >= 95) return 'TOP_5_PERCENT';
  if (percentile >= 90) return 'TOP_10_PERCENT';
  if (percentile >= 70) return 'RISING';
  return 'BEGINNER';
}

function buildActivityTimeline(projects: any[], skills: any[], jobs: any[]): any[] {
  const activities: any[] = [];

  // Add project activities
  projects.slice(0, 3).forEach(p => {
    activities.push({
      type: 'PROJECT_ADDED',
      title: 'New Project Analyzed',
      description: `${p.repoName} - Score: ${p.overallScore || 0}`,
      timestamp: p.createdAt,
    });
  });

  // Add skill activities
  skills.slice(0, 3).forEach(s => {
    if (s.isVerified) {
      activities.push({
        type: 'SKILL_VERIFIED',
        title: 'Skill Verified',
        description: `${s.name} - Score: ${s.verifiedScore}`,
        timestamp: s.createdAt,
      });
    }
  });

  // Add job activities
  jobs.slice(0, 3).forEach(j => {
    activities.push({
      type: 'JOB_APPLIED',
      title: 'Job Application',
      description: `${j.role} at ${j.companyName}`,
      timestamp: j.appliedAt,
    });
  });

  return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 10);
}

function generateSkillRecommendations(skills: any[]): any[] {
  const recommendations = [];
  const hasTypeScript = skills.some(s => s.name.toLowerCase().includes('typescript'));
  const hasReact = skills.some(s => s.name.toLowerCase().includes('react'));
  const hasNode = skills.some(s => s.name.toLowerCase().includes('node'));

  if (!hasTypeScript) {
    recommendations.push({
      name: 'TypeScript',
      reason: 'High demand in modern web development',
      demand: 'HIGH' as const,
      relatedToExisting: ['JavaScript', 'Web Development'],
    });
  }

  if (!hasReact && hasTypeScript) {
    recommendations.push({
      name: 'React',
      reason: 'Pairs well with TypeScript',
      demand: 'HIGH' as const,
      relatedToExisting: ['TypeScript', 'Frontend'],
    });
  }

  if (!hasNode && hasTypeScript) {
    recommendations.push({
      name: 'Node.js',
      reason: 'Backend development with TypeScript',
      demand: 'HIGH' as const,
      relatedToExisting: ['TypeScript', 'Backend'],
    });
  }

  return recommendations.slice(0, 5);
}

function generateProfileImprovements(user: any, skills: any[], projects: any[]): any[] {
  const improvements = [];

  if (!user.bio) {
    improvements.push({
      area: 'Profile Bio',
      suggestion: 'Add a compelling bio to increase profile views',
      impact: 'HIGH' as const,
      completed: false,
    });
  }

  if (!user.location) {
    improvements.push({
      area: 'Location',
      suggestion: 'Add your location for better job matches',
      impact: 'MEDIUM' as const,
      completed: false,
    });
  }

  if (skills.length < 5) {
    improvements.push({
      area: 'Skills',
      suggestion: 'Add more skills to your profile (aim for 10+)',
      impact: 'HIGH' as const,
      completed: false,
    });
  }

  if (projects.length < 3) {
    improvements.push({
      area: 'Projects',
      suggestion: 'Add more projects to showcase your work',
      impact: 'HIGH' as const,
      completed: false,
    });
  }

  return improvements.slice(0, 5);
}
