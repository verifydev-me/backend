/**
 * Interview Service
 * API calls for interview scheduling and management
 * Backend: job-service (port 3004) /api/v1/interviews
 */

import { get, post } from '../client';
import type {
  Interview,
  InterviewWithDetails,
  ScheduleInterviewRequest,
  RescheduleInterviewRequest,
  InterviewFeedbackRequest,
} from '@/types/interview';

const BASE_URL = '/interviews';

// ============================================
// INTERVIEW CRUD
// ============================================

/**
 * Schedule a new interview
 */
export const scheduleInterview = async (
  data: ScheduleInterviewRequest
): Promise<{ success: boolean; data: Interview }> => {
  return post(BASE_URL, data);
};

/**
 * Get interview by ID
 */
export const getInterview = async (
  interviewId: string
): Promise<{ success: boolean; data: InterviewWithDetails }> => {
  return get(`${BASE_URL}/${interviewId}`);
};

/**
 * Get upcoming interviews
 */
export const getUpcomingInterviews = async (params?: {
  status?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
}): Promise<{ success: boolean; data: InterviewWithDetails[] }> => {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.type) queryParams.append('type', params.type);
  if (params?.startDate) queryParams.append('startDate', params.startDate);
  if (params?.endDate) queryParams.append('endDate', params.endDate);

  const url = queryParams.toString()
    ? `${BASE_URL}/upcoming?${queryParams.toString()}`
    : `${BASE_URL}/upcoming`;

  return get(url);
};

// ============================================
// INTERVIEW ACTIONS
// ============================================

/**
 * Confirm interview
 */
export const confirmInterview = async (
  interviewId: string
): Promise<{ success: boolean; data: Interview }> => {
  return post(`${BASE_URL}/${interviewId}/confirm`);
};

/**
 * Reschedule interview
 */
export const rescheduleInterview = async (
  interviewId: string,
  data: RescheduleInterviewRequest
): Promise<{ success: boolean; data: Interview }> => {
  return post(`${BASE_URL}/${interviewId}/reschedule`, data);
};

/**
 * Cancel interview
 */
export const cancelInterview = async (
  interviewId: string,
  reason: string
): Promise<{ success: boolean; data: Interview }> => {
  return post(`${BASE_URL}/${interviewId}/cancel`, { reason });
};

/**
 * Mark interview as completed
 */
export const completeInterview = async (
  interviewId: string
): Promise<{ success: boolean; data: Interview }> => {
  return post(`${BASE_URL}/${interviewId}/complete`);
};

/**
 * Mark interview as no-show
 */
export const markNoShow = async (
  interviewId: string,
  reason?: string
): Promise<{ success: boolean; data: Interview }> => {
  return post(`${BASE_URL}/${interviewId}/no-show`, { reason });
};

/**
 * Add interview feedback
 */
export const addInterviewFeedback = async (
  interviewId: string,
  feedback: InterviewFeedbackRequest
): Promise<{ success: boolean; data: Interview }> => {
  return post(`${BASE_URL}/${interviewId}/feedback`, feedback);
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get interview type label
 */
export const getInterviewTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    PHONE_SCREEN: 'Phone Screen',
    VIDEO_CALL: 'Video Call',
    TECHNICAL: 'Technical Round',
    HR_ROUND: 'HR Round',
    FINAL_ROUND: 'Final Round',
    IN_PERSON: 'In-Person',
  };
  return labels[type] || type;
};

/**
 * Get interview status color
 */
export const getInterviewStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    SCHEDULED: 'blue',
    CONFIRMED: 'green',
    COMPLETED: 'indigo',
    CANCELLED: 'red',
    NO_SHOW: 'orange',
    RESCHEDULED: 'yellow',
  };
  return colors[status] || 'gray';
};

/**
 * Check if interview is upcoming (within next 7 days)
 */
export const isUpcoming = (scheduledAt: string): boolean => {
  const interviewDate = new Date(scheduledAt);
  const now = new Date();
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  return interviewDate >= now && interviewDate <= sevenDaysFromNow;
};

/**
 * Check if interview is past
 */
export const isPast = (scheduledAt: string): boolean => {
  return new Date(scheduledAt) < new Date();
};

/**
 * Format interview duration
 */
export const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};
