import axios from 'axios';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

// ============================================
// TYPES
// ============================================

export interface ApplicationForRecruiter {
  id: string;
  jobId: string;
  userId: string;
  status: ApplicationStatus;
  appliedAt: Date;
  matchScore: number;
  note?: string; // Cover letter or note from candidate
  recruiterNotes?: string;

  // Enriched User Data
  user: {
    id: string;
    name: string;
    email: string;
    username?: string;
    avatarUrl?: string;
    location?: string;
    title?: string;
    githubUsername?: string;
  };

  // Aura & Match Details
  aura?: {
    overallScore: number;
    level: string;
    isVerified: boolean;
  };
  matchedSkills?: string[];
  missingSkills?: string[];
}

export type ApplicationStatus = 'PENDING' | 'REVIEWING' | 'SHORTLISTED' | 'INTERVIEW' | 'OFFER' | 'REJECTED' | 'WITHDRAWN';

export interface ApplicationFilters {
  jobId?: string;
  status?: ApplicationStatus;
  sortBy?: 'matchScore' | 'appliedAt';
  order?: 'asc' | 'desc';
}

interface ApplicationStats {
  total: number;
  byStatus: Record<ApplicationStatus, number>;
  avgMatchScore: number;
}

// Service URLs
const JOB_SERVICE_URL = env.JOB_SERVICE_URL;
const USER_SERVICE_URL = env.USER_SERVICE_URL;

// ============================================
// APPLICATION MANAGEMENT SERVICE
// ============================================

export class ApplicationService {
  /**
   * Get all applications for an organization's jobs
   */
  static async getOrganizationApplications(
    organizationId: string,
    filters: ApplicationFilters = {},
    page = 1,
    limit = 20
  ): Promise<{ applications: ApplicationForRecruiter[]; total: number }> {
    // For now, this is not fully implemented with backend support for "organization-wide" fetch in job-service
    // This would require a new endpoint in job-service or iterating jobs.
    // Leaving as empty for now or implementing if needed by specific routes.
    return { applications: [], total: 0 };
  }

  /**
   * Get applications for a specific job
   */
  static async getJobApplications(
    jobId: string,
    options: Omit<ApplicationFilters, 'jobId'> & { page?: number; limit?: number } = {}
  ): Promise<{ applications: ApplicationForRecruiter[]; stats: ApplicationStats }> {
    const { page = 1, limit = 20, status, sortBy, order } = options;
    logger.debug({ jobId, status, page, limit }, 'Fetching job applications from job-service');

    try {
      // 1. Fetch applications from Job Service
      const response = await axios.get(`${JOB_SERVICE_URL}/api/v1/applications/job/${jobId}`, {
        params: { status },
        timeout: 10000
      });

      if (!response.data.success) {
        throw new Error('Failed to fetch applications from job-service');
      }

      const rawApplications = response.data.data || [];

      // 2. Enrich with User Data (Bulk or Parallel)
      // Extract unique user IDs
      const userIds = [...new Set(rawApplications.map((app: any) => app.userId))];

      // Fetch profiles in parallel (optimally user-service should have a bulk endpoint)
      const userProfiles = new Map();
      await Promise.all(
        userIds.map(async (userId) => {
          const profile = await this.getUserProfile(userId as string);
          if (profile) {
            userProfiles.set(userId, profile);
          }
        })
      );

      // 3. Transform to ApplicationForRecruiter
      const applications: ApplicationForRecruiter[] = rawApplications.map((app: any) => {
        const userProfile = userProfiles.get(app.userId) || {};

        return {
          id: app.id,
          jobId: app.jobId,
          userId: app.userId,
          status: app.status,
          appliedAt: new Date(app.appliedAt),
          matchScore: app.matchScore || 0,
          note: app.coverLetter,
          recruiterNotes: app.recruiterNotes,

          user: {
            id: app.userId,
            name: userProfile.name || app.candidateName || 'Unknown Candidate',
            email: userProfile.email || app.candidateEmail || '',
            username: userProfile.username,
            avatarUrl: userProfile.avatarUrl, // This maps to 'candidateAvatar' in previous mock, but frontend wants nested
            location: userProfile.location,
            title: userProfile.title,
            githubUsername: userProfile.username // Assuming username is github username or stored separately
          },

          aura: {
            overallScore: app.candidateAura || userProfile.auraScore || 0,
            level: 'Novice', // You might calculate this
            isVerified: userProfile.isVerified || false
          },

          matchedSkills: [], // job-service might not return this detailed breakdown yet
          missingSkills: []
        };
      });

      // 4. Client-side Sorting & Pagination (since we fetched all from job-service job endpoint)
      // Note: If job-service supports pagination, we should pass it there.
      // Based on typical patterns, we'll do in-memory for now if job-service returns all.

      const stats = this.calculateStats(applications);

      // Sort
      applications.sort((a, b) => {
        if (sortBy === 'matchScore') {
          return order === 'asc' ? a.matchScore - b.matchScore : b.matchScore - a.matchScore;
        }
        // Default latest first
        return b.appliedAt.getTime() - a.appliedAt.getTime();
      });

      // Paginate
      const start = (page - 1) * limit;
      const paginatedApps = applications.slice(start, start + limit);

      return { applications: paginatedApps, stats };

    } catch (error) {
      logger.error({ error, jobId }, 'Failed to get job applications');
      return {
        applications: [],
        stats: {
          total: 0,
          byStatus: { PENDING: 0, REVIEWING: 0, SHORTLISTED: 0, INTERVIEW: 0, OFFER: 0, REJECTED: 0, WITHDRAWN: 0 },
          avgMatchScore: 0
        }
      };
    }
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

    try {
      const response = await axios.patch(`${JOB_SERVICE_URL}/api/v1/applications/${applicationId}/status`, {
        status,
        notes
      });

      if (response.data.success) {
        // Return mapped application
        // We might need to fetch the full object again or map the response
        // For simplicity, just return what job-service returns, mapped lightly
        const app = response.data.data;
        // Check if we need to fetch user profile again? Maybe just minimally map
        return {
          id: app.id,
          jobId: app.jobId,
          userId: app.userId,
          status: app.status,
          appliedAt: new Date(app.appliedAt),
          matchScore: app.matchScore || 0,
          recruiterNotes: app.recruiterNotes,
          user: {
            id: app.userId,
            name: app.candidateName,
            email: app.candidateEmail
            // Other fields missing if not fetched, but usually status update doesn't need full redraw
          }
        } as ApplicationForRecruiter;
      }
      return null;
    } catch (error) {
      logger.error({ error, applicationId }, 'Failed to update application status');
      return null;
    }
  }

  /**
   * Add recruiter notes
   */
  static async addRecruiterNotes(
    applicationId: string,
    notes: string
  ): Promise<ApplicationForRecruiter | null> {
    try {
      const response = await axios.post(`${JOB_SERVICE_URL}/api/v1/applications/${applicationId}/notes`, {
        notes
      });

      if (response.data.success) {
        const app = response.data.data;
        return {
          id: app.id,
          jobId: app.jobId,
          userId: app.userId,
          status: app.status,
          appliedAt: new Date(app.appliedAt),
          matchScore: app.matchScore || 0,
          recruiterNotes: app.recruiterNotes,
          user: {
            id: app.userId,
            name: app.candidateName,
            email: app.candidateEmail
          }
        } as ApplicationForRecruiter;
      }
      return null;
    } catch (error) {
      logger.error({ error, applicationId }, 'Failed to add notes');
      return null;
    }
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private static async getUserProfile(userId: string): Promise<any> {
    try {
      const response = await axios.get(`${USER_SERVICE_URL}/api/internal/candidates/${userId}`, {
        timeout: 5000
      });
      if (response.data.success) {
        return response.data.data.candidate;
      }
      return null;
    } catch (error) {
      logger.warn({ userId, error: (error as Error).message }, 'Failed to fetch user profile');
      return null;
    }
  }

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
      if (byStatus[app.status] !== undefined) {
        byStatus[app.status]++;
      }
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

export default ApplicationService;
