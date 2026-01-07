import axios from 'axios';
import { logger } from '../utils/logger.js';

// ============================================
// TYPES
// ============================================

export interface ApplicationForRecruiter {
  id: string;
  jobId: string;
  jobTitle: string;
  userId: string;
  candidateName: string;
  candidateUsername: string;
  candidateAvatar?: string;
  matchScore: number;
  status: ApplicationStatus;
  resumeUrl?: string;
  coverLetter?: string;
  appliedAt: Date;
  reviewedAt?: Date;
  recruiterNotes?: string;
}

export type ApplicationStatus = 'PENDING' | 'REVIEWING' | 'SHORTLISTED' | 'INTERVIEW' | 'OFFER' | 'REJECTED' | 'WITHDRAWN';

export interface ApplicationFilters {
  jobId?: string;
  status?: ApplicationStatus;
  sortBy?: 'matchScore' | 'appliedAt';
  order?: 'asc' | 'desc';
}

// ============================================
// MOCK DATABASE
// ============================================

const applicationsDb: Map<string, ApplicationForRecruiter> = new Map();

// Seed demo applications
function seedDemoApplications() {
  const demoApps: ApplicationForRecruiter[] = [
    {
      id: 'app_1',
      jobId: 'job_1',
      jobTitle: 'Senior React Developer',
      userId: 'user_demo_1',
      candidateName: 'John Doe',
      candidateUsername: 'johndoe',
      candidateAvatar: 'https://avatars.githubusercontent.com/u/1',
      matchScore: 92,
      status: 'PENDING',
      resumeUrl: 'https://verifydev.io/resume/johndoe.pdf',
      coverLetter: 'I am excited to apply for this position...',
      appliedAt: new Date('2026-01-04'),
    },
    {
      id: 'app_2',
      jobId: 'job_1',
      jobTitle: 'Senior React Developer',
      userId: 'user_demo_2',
      candidateName: 'Jane Smith',
      candidateUsername: 'janesmith',
      candidateAvatar: 'https://avatars.githubusercontent.com/u/2',
      matchScore: 78,
      status: 'SHORTLISTED',
      resumeUrl: 'https://verifydev.io/resume/janesmith.pdf',
      appliedAt: new Date('2026-01-03'),
      reviewedAt: new Date('2026-01-04'),
    },
    {
      id: 'app_3',
      jobId: 'job_3',
      jobTitle: 'Go Backend Developer',
      userId: 'user_demo_3',
      candidateName: 'Bob Wilson',
      candidateUsername: 'bobwilson',
      matchScore: 85,
      status: 'INTERVIEW',
      resumeUrl: 'https://verifydev.io/resume/bobwilson.pdf',
      appliedAt: new Date('2026-01-02'),
      reviewedAt: new Date('2026-01-03'),
      recruiterNotes: 'Strong Go experience. Schedule for technical round.',
    },
  ];

  demoApps.forEach(app => applicationsDb.set(app.id, app));
}

seedDemoApplications();

// ============================================
// APPLICATION MANAGEMENT SERVICE
// ============================================

export class ApplicationManagementService {
  /**
   * Get all applications for an organization's jobs
   */
  static async getOrganizationApplications(
    organizationId: string,
    filters: ApplicationFilters = {},
    page = 1,
    limit = 20
  ): Promise<{ applications: ApplicationForRecruiter[]; total: number }> {
    logger.debug({ organizationId, filters }, 'Fetching organization applications');

    let applications = Array.from(applicationsDb.values());

    // Filter by job
    if (filters.jobId) {
      applications = applications.filter(app => app.jobId === filters.jobId);
    }

    // Filter by status
    if (filters.status) {
      applications = applications.filter(app => app.status === filters.status);
    }

    // Sort
    const sortBy = filters.sortBy || 'appliedAt';
    const order = filters.order || 'desc';

    applications.sort((a, b) => {
      if (sortBy === 'matchScore') {
        return order === 'desc' ? b.matchScore - a.matchScore : a.matchScore - b.matchScore;
      } else {
        return order === 'desc' 
          ? b.appliedAt.getTime() - a.appliedAt.getTime()
          : a.appliedAt.getTime() - b.appliedAt.getTime();
      }
    });

    const total = applications.length;
    const start = (page - 1) * limit;
    const paginatedApps = applications.slice(start, start + limit);

    return { applications: paginatedApps, total };
  }

  /**
   * Get applications for a specific job
   */
  static async getJobApplications(
    jobId: string,
    filters: Omit<ApplicationFilters, 'jobId'> = {}
  ): Promise<{ applications: ApplicationForRecruiter[]; stats: ApplicationStats }> {
    logger.debug({ jobId, filters }, 'Fetching job applications');

    const result = await this.getOrganizationApplications('', { ...filters, jobId }, 1, 1000);
    const stats = this.calculateStats(result.applications);

    return { applications: result.applications, stats };
  }

  /**
   * Get single application
   */
  static async getApplicationById(applicationId: string): Promise<ApplicationForRecruiter | null> {
    return applicationsDb.get(applicationId) || null;
  }

  /**
   * Update application status
   */
  static async updateApplicationStatus(
    applicationId: string,
    status: ApplicationStatus,
    notes?: string
  ): Promise<ApplicationForRecruiter | null> {
    logger.info({ applicationId, status }, 'Updating application status');

    const application = applicationsDb.get(applicationId);
    if (!application) return null;

    application.status = status;
    application.reviewedAt = new Date();
    if (notes) {
      application.recruiterNotes = notes;
    }

    applicationsDb.set(applicationId, application);

    // TODO: Send notification to candidate
    // await this.notifyCandidate(application.userId, status);

    return application;
  }

  /**
   * Add recruiter notes
   */
  static async addRecruiterNotes(
    applicationId: string,
    notes: string
  ): Promise<ApplicationForRecruiter | null> {
    const application = applicationsDb.get(applicationId);
    if (!application) return null;

    application.recruiterNotes = notes;
    applicationsDb.set(applicationId, application);

    return application;
  }

  /**
   * Bulk update application statuses
   */
  static async bulkUpdateStatus(
    applicationIds: string[],
    status: ApplicationStatus
  ): Promise<{ updated: number; failed: number }> {
    logger.info({ count: applicationIds.length, status }, 'Bulk updating applications');

    let updated = 0;
    let failed = 0;

    for (const id of applicationIds) {
      const app = applicationsDb.get(id);
      if (app) {
        app.status = status;
        app.reviewedAt = new Date();
        applicationsDb.set(id, app);
        updated++;
      } else {
        failed++;
      }
    }

    return { updated, failed };
  }

  /**
   * Get candidate full profile for application
   */
  static async getCandidateProfile(userId: string): Promise<any | null> {
    try {
      const response = await axios.get(
        `http://user-service:3002/api/v1/u/${userId}`,
        { timeout: 5000 }
      );
      return response.data?.data?.profile;
    } catch (error) {
      logger.error({ error, userId }, 'Failed to fetch candidate profile');
      return null;
    }
  }

  /**
   * Download candidate resume
   */
  static async getResumeUrl(userId: string): Promise<string | null> {
    try {
      const response = await axios.get(
        `http://resume-service:8003/api/v1/resume/user/${userId}/url`,
        { timeout: 5000 }
      );
      return response.data?.url;
    } catch (error) {
      logger.error({ error, userId }, 'Failed to fetch resume URL');
      return null;
    }
  }

  /**
   * Get dashboard stats for recruiter
   */
  static async getDashboardStats(organizationId: string): Promise<DashboardStats> {
    const allApps = Array.from(applicationsDb.values());

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats: DashboardStats = {
      totalApplications: allApps.length,
      newToday: allApps.filter(app => app.appliedAt >= today).length,
      pending: allApps.filter(app => app.status === 'PENDING').length,
      shortlisted: allApps.filter(app => app.status === 'SHORTLISTED').length,
      interviewing: allApps.filter(app => app.status === 'INTERVIEW').length,
      offered: allApps.filter(app => app.status === 'OFFER').length,
      avgMatchScore: allApps.length > 0 
        ? Math.round(allApps.reduce((sum, app) => sum + app.matchScore, 0) / allApps.length)
        : 0,
      topCandidates: allApps
        .filter(app => app.status !== 'REJECTED' && app.status !== 'WITHDRAWN')
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 5)
        .map(app => ({
          id: app.userId,
          name: app.candidateName,
          matchScore: app.matchScore,
          jobTitle: app.jobTitle,
        })),
    };

    return stats;
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private static calculateStats(applications: ApplicationForRecruiter[]): ApplicationStats {
    const byStatus: Record<ApplicationStatus, number> = {
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
      byStatus[app.status]++;
      totalMatchScore += app.matchScore;
    }

    return {
      total: applications.length,
      byStatus,
      avgMatchScore: applications.length > 0 
        ? Math.round(totalMatchScore / applications.length) 
        : 0,
    };
  }
}

// ============================================
// ADDITIONAL TYPES
// ============================================

interface ApplicationStats {
  total: number;
  byStatus: Record<ApplicationStatus, number>;
  avgMatchScore: number;
}

interface DashboardStats {
  totalApplications: number;
  newToday: number;
  pending: number;
  shortlisted: number;
  interviewing: number;
  offered: number;
  avgMatchScore: number;
  topCandidates: {
    id: string;
    name: string;
    matchScore: number;
    jobTitle: string;
  }[];
}

export default ApplicationManagementService;
