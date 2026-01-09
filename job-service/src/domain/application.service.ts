import { logger } from '../utils/logger.js';
import type { Application, ApplyJobDto, ApplicationStatus, Job } from '../types/index.js';
import { prisma } from '../prisma/client.js';
import { Application as PrismaApplication, Job as PrismaJob, Prisma } from '../../node_modules/.prisma/job-client/index.js';
import axios from 'axios';
import { JobService } from './job.service.js';

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

function transformPrismaJobToJob(prismaJob: PrismaJob): Job {
  return {
    id: prismaJob.id,
    recruiterId: prismaJob.recruiterId,
    title: prismaJob.title,
    description: prismaJob.description,
    requirements: prismaJob.requirements,
    responsibilities: prismaJob.responsibilities,
    type: prismaJob.type as Job['type'],
    level: prismaJob.level as Job['level'],
    location: prismaJob.location,
    isRemote: prismaJob.isRemote,
    salaryMin: prismaJob.salaryMin || undefined,
    salaryMax: prismaJob.salaryMax || undefined,
    salaryCurrency: prismaJob.salaryCurrency,
    requiredSkills: prismaJob.requiredSkills || [],
    preferredSkills: prismaJob.preferredSkills || undefined,
    minAuraScore: prismaJob.minAuraScore,
    minCoreCount: prismaJob.minCoreCount,
    status: prismaJob.status as Job['status'],
    applicationsCount: prismaJob.applicationsCount,
    viewsCount: prismaJob.viewsCount,
    createdAt: prismaJob.createdAt,
    expiresAt: prismaJob.expiresAt || undefined,
  };
}

function transformApplication(app: PrismaApplication, prismaJob?: PrismaJob | null): ApplicationWithMatch {
  const job = prismaJob ? transformPrismaJobToJob(prismaJob) : undefined;
  
  return {
    id: app.id,
    jobId: app.jobId,
    userId: app.userId,
    job: job,
    coverLetter: app.coverLetter || undefined,
    resumeUrl: app.resumeUrl || undefined,
    status: app.status as ApplicationStatus,
    matchScore: app.matchScore ?? 0,
    matchBreakdown: [], // Would be calculated from skillMatchScore and auraMatchScore
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
  async apply(userId: string, jobId: string, data: ApplyJobDto): Promise<ApplicationWithMatch> {
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
    const job = await prisma.job.findUnique({ where: { id: jobId } });
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

      // Simple match calculation
      const skillMatches = (job.requiredSkills || []).filter(reqSkill =>
        userSkills.some(us => us.name.toLowerCase() === reqSkill.toLowerCase())
      );
      const skillScore = job.requiredSkills.length > 0 
        ? (skillMatches.length / job.requiredSkills.length) * 100 
        : 50;
      const auraScore = job.minAuraScore > 0 
        ? Math.min(100, (userAura / job.minAuraScore) * 100) 
        : 100;
      
      matchScore = Math.round(skillScore * 0.7 + auraScore * 0.3);
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
        candidateName: data.candidateName || 'Candidate',
        candidateEmail: data.candidateEmail || 'candidate@example.com',
        candidateAura: data.candidateAura || 0,
        candidateCores: data.candidateCores || 1,
        candidateSkills: data.candidateSkills || [],
        candidateProjects: data.candidateProjects as any, // Cast to any for Json type
        candidateExperience: data.candidateExperience as any,
        candidateCertifications: data.candidateCertifications as any,
        status: 'PENDING',
        matchScore,
      },
    });
    await prisma.job.update({
      where: { id: jobId },
      data: { applicationsCount: { increment: 1 } }
    });

    logger.info({ applicationId: application.id, matchScore }, 'Application created');

    return transformApplication(application, job);
  }

  /**
   * Get user's applications
   */
  async getUserApplications(userId: string): Promise<ApplicationWithMatch[]> {
    logger.debug({ userId }, 'Fetching user applications');

    const applications = await prisma.application.findMany({
      where: { userId },
      orderBy: { appliedAt: 'desc' },
    });

    // Enrich with job data
    const enrichedApps: ApplicationWithMatch[] = [];
    for (const app of applications) {
      const job = await prisma.job.findUnique({ where: { id: app.jobId } });
      enrichedApps.push(transformApplication(app, job));
    }

    return enrichedApps;
  }

  /**
   * Get applications for a job (recruiter view)
   */
  async getJobApplications(
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

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    return applications.map(app => transformApplication(app, job));
  }

  /**
   * Get application by ID
   */
  async getApplicationById(applicationId: string): Promise<ApplicationWithMatch | null> {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
    });

    if (!application) return null;

    const job = await prisma.job.findUnique({ where: { id: application.jobId } });
    return transformApplication(application, job);
  }

  /**
   * Update application status (recruiter action)
   */
  async updateStatus(
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

      const job = await prisma.job.findUnique({ where: { id: application.jobId } });
      
      // TODO: Send notification to user about status change
      
      return transformApplication(application, job);
    } catch {
      return null;
    }
  }

  /**
   * Withdraw application (user action)
   */
  async withdraw(applicationId: string, userId: string): Promise<boolean> {
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
  async canApply(userId: string, jobId: string): Promise<{ 
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
    const job = await prisma.job.findUnique({ where: { id: jobId } });
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
  async getJobApplicationStats(jobId: string): Promise<{
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
      totalMatchScore += app.matchScore ?? 0;
    }

    return {
      total: applications.length,
      byStatus: byStatus as Record<ApplicationStatus, number>,
      avgMatchScore: applications.length > 0 ? Math.round(totalMatchScore / applications.length) : 0,
    };
  }

  /**
   * Get all applications for a specific job
   */
  async getApplicationsByJob(jobId: string): Promise<any[]> {
    logger.debug({ jobId }, 'Fetching applications for job');

    const applications = await prisma.application.findMany({
      where: { jobId },
      orderBy: { appliedAt: 'desc' },
    });

    return applications;
  }
}

export default ApplicationService;
