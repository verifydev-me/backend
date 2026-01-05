import { logger } from '../utils/logger.js';
import type { Application, ApplyJobDto, ApplicationStatus, Job } from '../types/index.js';
import { JobService } from './job.service.js';
import { prisma } from '../prisma/client.js';
import { Application as PrismaApplication, Prisma } from '@prisma/client';
import axios from 'axios';

// ============================================
// TYPES
// ============================================

interface UserSkill {
  name: string;
  score: number;
  isVerified: boolean;
}

interface ApplicationWithMatch extends Application {
  matchScore: number;
  matchBreakdown: {
    skill: string;
    required: number;
    userScore: number;
    verified: boolean;
    status: 'met' | 'partial' | 'missing';
  }[];
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function transformApplication(app: PrismaApplication, job?: Job | null): ApplicationWithMatch {
  return {
    id: app.id,
    jobId: app.jobId,
    userId: app.userId,
    job: job || undefined,
    coverLetter: app.coverLetter || undefined,
    resumeUrl: app.resumeUrl || undefined,
    status: app.status as ApplicationStatus,
    matchScore: app.matchScore,
    matchBreakdown: (app.matchBreakdown as ApplicationWithMatch['matchBreakdown']) || [],
    appliedAt: app.appliedAt,
    reviewedAt: app.reviewedAt || undefined,
  };
}

// ============================================
// APPLICATION SERVICE WITH PRISMA
// ============================================

export class ApplicationService {
  /**
   * Apply to a job
   */
  static async apply(userId: string, jobId: string, data: ApplyJobDto): Promise<ApplicationWithMatch> {
    logger.info({ userId, jobId }, 'User applying to job');

    // Check if already applied
    const existingApp = await prisma.application.findFirst({
      where: {
        userId,
        jobId,
        status: { not: 'WITHDRAWN' },
      },
    });

    if (existingApp) {
      throw new Error('Already applied to this job');
    }

    // Get job details
    const job = await JobService.getJobById(jobId);
    if (!job) {
      throw new Error('Job not found');
    }
    if (job.status !== 'ACTIVE') {
      throw new Error('Job is no longer accepting applications');
    }

    // Get user skills and calculate match
    let matchScore = 50;
    let matchBreakdown: ApplicationWithMatch['matchBreakdown'] = [];

    try {
      const userDataResponse = await axios.get(
        `http://user-service:3002/api/v1/users/${userId}/skills-summary`,
        { timeout: 5000 }
      );
      
      const userData = userDataResponse.data.data;
      const userSkills: UserSkill[] = userData?.skills || [];
      const userAura: number = userData?.auraScore || 0;

      const matchResult = JobService.calculateSkillMatch(
        userSkills,
        job.requiredSkills,
        userAura,
        job.minAuraScore
      );

      matchScore = matchResult.matchScore;
      matchBreakdown = matchResult.matchedSkills;
    } catch (error) {
      logger.warn({ error, userId }, 'Could not fetch user skills for match calculation');
    }

    // Get resume URL
    let resumeUrl = data.resumeUrl;
    if (!resumeUrl) {
      try {
        const resumeResponse = await axios.get(
          `http://resume-service:8003/api/v1/resume/user/${userId}/url`,
          { timeout: 5000 }
        );
        resumeUrl = resumeResponse.data?.url;
      } catch {
        logger.warn({ userId }, 'Could not fetch resume URL');
      }
    }

    // Create application in database
    const application = await prisma.application.create({
      data: {
        jobId,
        userId,
        coverLetter: data.coverLetter,
        resumeUrl,
        status: 'PENDING',
        matchScore,
        matchBreakdown: matchBreakdown as any,
      },
    });

    // Increment job application count
    await JobService.incrementApplications(jobId);

    logger.info({ applicationId: application.id, matchScore }, 'Application created');

    return transformApplication(application, job);
  }

  /**
   * Get user's applications
   */
  static async getUserApplications(userId: string): Promise<ApplicationWithMatch[]> {
    logger.debug({ userId }, 'Fetching user applications');

    const applications = await prisma.application.findMany({
      where: { userId },
      orderBy: { appliedAt: 'desc' },
    });

    // Enrich with job data
    const enrichedApps: ApplicationWithMatch[] = [];
    for (const app of applications) {
      const job = await JobService.getJobById(app.jobId);
      enrichedApps.push(transformApplication(app, job));
    }

    return enrichedApps;
  }

  /**
   * Get applications for a job (recruiter view)
   */
  static async getJobApplications(
    jobId: string, 
    status?: ApplicationStatus,
    sortBy: 'matchScore' | 'appliedAt' = 'matchScore'
  ): Promise<ApplicationWithMatch[]> {
    logger.debug({ jobId, status }, 'Fetching job applications');

    const where: Prisma.ApplicationWhereInput = { jobId };
    if (status) {
      where.status = status;
    }

    const applications = await prisma.application.findMany({
      where,
      orderBy: sortBy === 'matchScore' 
        ? { matchScore: 'desc' } 
        : { appliedAt: 'desc' },
    });

    const job = await JobService.getJobById(jobId);
    return applications.map(app => transformApplication(app, job));
  }

  /**
   * Get application by ID
   */
  static async getApplicationById(applicationId: string): Promise<ApplicationWithMatch | null> {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
    });

    if (!application) return null;

    const job = await JobService.getJobById(application.jobId);
    return transformApplication(application, job);
  }

  /**
   * Update application status (recruiter action)
   */
  static async updateStatus(
    applicationId: string, 
    status: ApplicationStatus, 
    notes?: string
  ): Promise<ApplicationWithMatch | null> {
    logger.info({ applicationId, status }, 'Updating application status');

    try {
      const application = await prisma.application.update({
        where: { id: applicationId },
        data: {
          status,
          reviewedAt: new Date(),
        },
      });

      const job = await JobService.getJobById(application.jobId);
      
      // TODO: Send notification to user about status change
      
      return transformApplication(application, job);
    } catch {
      return null;
    }
  }

  /**
   * Withdraw application (user action)
   */
  static async withdraw(applicationId: string, userId: string): Promise<boolean> {
    logger.info({ applicationId, userId }, 'Withdrawing application');

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
    });

    if (!application || application.userId !== userId) {
      return false;
    }

    if (application.status === 'WITHDRAWN') {
      throw new Error('Application already withdrawn');
    }

    await prisma.application.update({
      where: { id: applicationId },
      data: { status: 'WITHDRAWN' },
    });

    return true;
  }

  /**
   * Check if user can apply to job
   */
  static async canApply(userId: string, jobId: string): Promise<{ 
    can: boolean; 
    reason?: string;
    matchScore?: number;
  }> {
    // Check if already applied
    const existingApp = await prisma.application.findFirst({
      where: {
        userId,
        jobId,
        status: { not: 'WITHDRAWN' },
      },
    });

    if (existingApp) {
      return { can: false, reason: 'You have already applied to this job' };
    }

    // Get job
    const job = await JobService.getJobById(jobId);
    if (!job) {
      return { can: false, reason: 'Job not found' };
    }
    if (job.status !== 'ACTIVE') {
      return { can: false, reason: 'Job is no longer accepting applications' };
    }

    // Get user skills and check eligibility
    try {
      const userDataResponse = await axios.get(
        `http://user-service:3002/api/v1/users/${userId}/skills-summary`,
        { timeout: 5000 }
      );

      const userData = userDataResponse.data.data;
      const userSkills: UserSkill[] = userData?.skills || [];
      const userAura: number = userData?.auraScore || 0;

      const matchResult = JobService.calculateSkillMatch(
        userSkills,
        job.requiredSkills,
        userAura,
        job.minAuraScore
      );

      if (!matchResult.meetsMinimum) {
        return {
          can: false,
          reason: 'You do not meet the minimum requirements for this job',
          matchScore: matchResult.matchScore,
        };
      }

      return { can: true, matchScore: matchResult.matchScore };
    } catch {
      // If we can't verify, allow application
      return { can: true };
    }
  }

  /**
   * Get application stats for a job
   */
  static async getJobApplicationStats(jobId: string): Promise<{
    total: number;
    byStatus: Record<ApplicationStatus, number>;
    avgMatchScore: number;
  }> {
    const applications = await prisma.application.findMany({
      where: { jobId },
      select: { status: true, matchScore: true },
    });

    const byStatus: Record<string, number> = {
      PENDING: 0,
      REVIEWING: 0,
      SHORTLISTED: 0,
      INTERVIEW: 0,
      OFFER: 0,
      REJECTED: 0,
      WITHDRAWN: 0,
    };

    let totalMatchScore = 0;

    for (const app of applications) {
      byStatus[app.status] = (byStatus[app.status] || 0) + 1;
      totalMatchScore += app.matchScore;
    }

    return {
      total: applications.length,
      byStatus: byStatus as Record<ApplicationStatus, number>,
      avgMatchScore: applications.length > 0 ? Math.round(totalMatchScore / applications.length) : 0,
    };
  }
}

export default ApplicationService;
