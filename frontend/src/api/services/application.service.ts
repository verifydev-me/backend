/**
 * Application Service (Enhanced)
 * API calls for job applications with match scoring
 * Backend: job-service (port 3004) /api/v1/applications
 */

import { get, post, patch } from '../client';
import type {
  Application,
  ApplicationWithDetails,
  ApplyToJobRequest,
  UpdateApplicationStatusRequest,
  AddRecruiterNoteRequest,
  WithdrawApplicationRequest,
  ApplicationStatus,
} from '@/types/application';

const BASE_URL = '/applications';

// ============================================
// APPLICATION CRUD
// ============================================

/**
 * Apply to a job (auto-calculates match score)
 */
export const applyToJob = async (
  data: ApplyToJobRequest
): Promise<{ success: boolean; data: Application }> => {
  return post(BASE_URL, data);
};

/**
 * Get user's applications
 */
export const getMyApplications = async (params?: {
  status?: ApplicationStatus;
  page?: number;
  limit?: number;
}): Promise<{
  success: boolean;
  data: ApplicationWithDetails[];
  pagination: { page: number; limit: number; total: number; pages: number };
}> => {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());

  const url = queryParams.toString()
    ? `${BASE_URL}/my-applications?${queryParams.toString()}`
    : `${BASE_URL}/my-applications`;

  return get(url);
};

/**
 * Get application by ID
 */
export const getApplication = async (
  applicationId: string
): Promise<{ success: boolean; data: ApplicationWithDetails }> => {
  return get(`${BASE_URL}/${applicationId}`);
};

/**
 * Get applications for a job (recruiter only)
 */
export const getJobApplications = async (
  jobId: string,
  params?: {
    status?: ApplicationStatus;
    minMatchScore?: number;
    page?: number;
    limit?: number;
  }
): Promise<{
  success: boolean;
  data: ApplicationWithDetails[];
  pagination: { page: number; limit: number; total: number; pages: number };
}> => {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.minMatchScore)
    queryParams.append('minMatchScore', params.minMatchScore.toString());
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());

  const url = queryParams.toString()
    ? `${BASE_URL}/job/${jobId}?${queryParams.toString()}`
    : `${BASE_URL}/job/${jobId}`;

  return get(url);
};

// ============================================
// APPLICATION ACTIONS
// ============================================

/**
 * Update application status (recruiter only)
 */
export const updateApplicationStatus = async (
  applicationId: string,
  data: UpdateApplicationStatusRequest
): Promise<{ success: boolean; data: Application }> => {
  return patch(`${BASE_URL}/${applicationId}/status`, data);
};

/**
 * Add recruiter note
 */
export const addRecruiterNote = async (
  applicationId: string,
  data: AddRecruiterNoteRequest
): Promise<{ success: boolean; data: Application }> => {
  return post(`${BASE_URL}/${applicationId}/notes`, data);
};

/**
 * Withdraw application
 */
export const withdrawApplication = async (
  applicationId: string,
  data?: WithdrawApplicationRequest
): Promise<{ success: boolean; data: Application }> => {
  return post(`${BASE_URL}/${applicationId}/withdraw`, data || {});
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get application status label
 */
export const getApplicationStatusLabel = (status: ApplicationStatus): string => {
  const labels: Record<ApplicationStatus, string> = {
    PENDING: 'Pending Review',
    REVIEWING: 'Under Review',
    SHORTLISTED: 'Shortlisted',
    INTERVIEW: 'Interview Stage',
    OFFER: 'Offer Extended',
    ACCEPTED: 'Offer Accepted',
    REJECTED: 'Not Selected',
    WITHDRAWN: 'Withdrawn',
  };
  return labels[status] || status;
};

/**
 * Get application status color
 */
export const getApplicationStatusColor = (status: ApplicationStatus): string => {
  const colors: Record<ApplicationStatus, string> = {
    PENDING: 'gray',
    REVIEWING: 'blue',
    SHORTLISTED: 'purple',
    INTERVIEW: 'orange',
    OFFER: 'green',
    ACCEPTED: 'green',
    REJECTED: 'red',
    WITHDRAWN: 'gray',
  };
  return colors[status] || 'gray';
};

/**
 * Get match score color based on percentage
 */
export const getMatchScoreColor = (score: number): string => {
  if (score >= 80) return 'green'; // Excellent
  if (score >= 60) return 'blue'; // Good
  if (score >= 40) return 'orange'; // Fair
  return 'red'; // Poor
};

/**
 * Get match score label
 */
export const getMatchScoreLabel = (score: number): string => {
  if (score >= 80) return 'Excellent Match';
  if (score >= 60) return 'Good Match';
  if (score >= 40) return 'Fair Match';
  return 'Low Match';
};

/**
 * Format match score percentage
 */
export const formatMatchScore = (score: number): string => {
  return `${Math.round(score)}%`;
};

/**
 * Calculate days since application
 */
export const getDaysSinceApplication = (appliedAt: string): number => {
  const applied = new Date(appliedAt);
  const now = new Date();
  const diff = now.getTime() - applied.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

/**
 * Check if application is active
 */
export const isActiveApplication = (status: ApplicationStatus): boolean => {
  return !['REJECTED', 'WITHDRAWN', 'ACCEPTED'].includes(status);
};

/**
 * Check if application can be withdrawn
 */
export const canWithdrawApplication = (status: ApplicationStatus): boolean => {
  return isActiveApplication(status) && status !== 'WITHDRAWN';
};

/**
 * Get next possible statuses for an application
 */
export const getNextStatuses = (
  currentStatus: ApplicationStatus
): ApplicationStatus[] => {
  const workflow: Record<ApplicationStatus, ApplicationStatus[]> = {
    PENDING: ['REVIEWING', 'REJECTED'],
    REVIEWING: ['SHORTLISTED', 'REJECTED'],
    SHORTLISTED: ['INTERVIEW', 'REJECTED'],
    INTERVIEW: ['OFFER', 'REJECTED'],
    OFFER: ['ACCEPTED', 'REJECTED'],
    ACCEPTED: [],
    REJECTED: [],
    WITHDRAWN: [],
  };
  return workflow[currentStatus] || [];
};

/**
 * Format notice period
 */
export const formatNoticePeriod = (days: number): string => {
  if (days === 0) return 'Immediate';
  if (days < 30) return `${days} days`;
  const months = Math.floor(days / 30);
  return `${months} ${months === 1 ? 'month' : 'months'}`;
};
