/**
 * Interview Types
 * For interview scheduling and management
 */

export type InterviewType = 
  | 'PHONE_SCREEN'
  | 'VIDEO_CALL'
  | 'TECHNICAL'
  | 'HR_ROUND'
  | 'FINAL_ROUND'
  | 'IN_PERSON';

export type InterviewStatus =
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'RESCHEDULED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export interface Interview {
  id: string;
  applicationId: string;
  jobId: string;
  candidateId: string;
  recruiterId: string;
  type: InterviewType;
  round: number;
  scheduledAt: string;
  duration: number; // in minutes
  meetingLink?: string;
  location?: string;
  status: InterviewStatus;
  notes?: string;
  feedback?: InterviewFeedback;
  confirmedByCandidateAt?: string;
  confirmedByRecruiterAt?: string;
  cancelledBy?: string;
  cancelledReason?: string;
  rescheduledFrom?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InterviewFeedback {
  rating: number; // 1-5
  technicalSkills?: number; // 1-5
  communication?: number; // 1-5
  cultureFit?: number; // 1-5
  problemSolving?: number; // 1-5
  comments?: string;
  recommendation: 'STRONG_YES' | 'YES' | 'MAYBE' | 'NO' | 'STRONG_NO';
  createdAt: string;
}

export interface InterviewWithDetails extends Interview {
  candidate: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    auraScore?: number;
  };
  job: {
    id: string;
    title: string;
    companyName: string;
  };
  application: {
    id: string;
    matchScore?: number;
    status: string;
  };
}

export interface ScheduleInterviewRequest {
  applicationId: string;
  type: InterviewType;
  round?: number;
  scheduledAt: string;
  duration: number;
  meetingLink?: string;
  location?: string;
  notes?: string;
}

export interface RescheduleInterviewRequest {
  scheduledAt: string;
  reason: string;
}

export interface InterviewFeedbackRequest {
  rating: number;
  technicalSkills?: number;
  communication?: number;
  cultureFit?: number;
  problemSolving?: number;
  comments?: string;
  recommendation: 'STRONG_YES' | 'YES' | 'MAYBE' | 'NO' | 'STRONG_NO';
}
