/**
 * Application Types
 * Enhanced application types with match scoring
 */

export type ApplicationStatus =
  | 'PENDING'
  | 'REVIEWING'
  | 'SHORTLISTED'
  | 'INTERVIEW'
  | 'OFFER'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'WITHDRAWN';

export interface MatchScore {
  overall: number; // 0-100
  breakdown: {
    skills: {
      score: number;
      weight: number; // 40%
      matched: string[];
      missing: string[];
    };
    aura: {
      score: number;
      weight: number; // 25%
      candidateScore: number;
      requiredScore: number;
    };
    experience: {
      score: number;
      weight: number; // 20%
      candidateYears: number;
      requiredYears: number;
    };
    location: {
      score: number;
      weight: number; // 10%
      isMatch: boolean;
      distance?: number;
    };
    availability: {
      score: number;
      weight: number; // 5%
      isAvailable: boolean;
    };
  };
}

export interface Application {
  id: string;
  jobId: string;
  candidateId: string;
  recruiterId: string;
  status: ApplicationStatus;
  matchScore?: MatchScore;
  coverLetter?: string;
  resumeUrl?: string;
  portfolioUrl?: string;
  expectedSalary?: number;
  availableFrom?: string;
  noticePeriod?: number; // in days
  recruiterNotes?: RecruiterNote[];
  rating?: number; // 1-5
  statusHistory: StatusChange[];
  appliedAt: string;
  updatedAt: string;
  withdrawnAt?: string;
  withdrawnReason?: string;
}

export interface ApplicationWithDetails extends Application {
  candidate: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    auraScore: number;
    location?: string;
    githubUsername?: string;
  };
  job: {
    id: string;
    title: string;
    companyName: string;
    companyLogo?: string;
    location: string;
    type: string;
    level: string;
    requiredSkills: string[];
  };
  interviews?: Array<{
    id: string;
    type: string;
    scheduledAt: string;
    status: string;
  }>;
}

export interface RecruiterNote {
  id: string;
  note: string;
  createdBy: string;
  createdAt: string;
}

export interface StatusChange {
  from: ApplicationStatus;
  to: ApplicationStatus;
  changedBy: string;
  changedAt: string;
  reason?: string;
}

export interface ApplyToJobRequest {
  jobId: string;
  coverLetter?: string;
  resumeUrl?: string;
  portfolioUrl?: string;
  expectedSalary?: number;
  availableFrom?: string;
  noticePeriod?: number;
}

export interface UpdateApplicationStatusRequest {
  status: ApplicationStatus;
  reason?: string;
}

export interface AddRecruiterNoteRequest {
  note: string;
  rating?: number;
}

export interface WithdrawApplicationRequest {
  reason?: string;
}
