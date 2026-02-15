import type { Interview, InterviewType, InterviewStatus } from '../../node_modules/.prisma/job-client/index.js';
export interface CreateInterviewDTO {
    applicationId: string;
    jobId: string;
    userId: string;
    recruiterId: string;
    title: string;
    description?: string;
    type: InterviewType;
    round: number;
    scheduledAt?: Date;
    duration: number;
    meetingUrl?: string;
    location?: string;
}
export declare class InterviewService {
    scheduleInterview(data: CreateInterviewDTO): Promise<Interview>;
    getInterviewById(interviewId: string): Promise<Interview | null>;
    getUserInterviews(userId: string, status?: InterviewStatus): Promise<({
        application: {
            job: {
                recruiter: {
                    name: string;
                    organizationName: string;
                };
                title: string;
            };
        } & {
            status: import(".prisma/job-client", { with: { "resolution-mode": "import" } }).$Enums.ApplicationStatus;
            id: string;
            updatedAt: Date;
            jobId: string;
            userId: string;
            coverLetter: string | null;
            resumeUrl: string | null;
            portfolioUrl: string | null;
            candidateName: string;
            candidateEmail: string;
            candidatePhone: string | null;
            candidateAura: number;
            candidateCores: number;
            candidateSkills: string[];
            candidateProjects: import(".prisma/job-client/runtime/library").JsonValue | null;
            candidateExperience: import(".prisma/job-client/runtime/library").JsonValue | null;
            candidateCertifications: import(".prisma/job-client/runtime/library").JsonValue | null;
            stage: string | null;
            matchScore: number | null;
            matchBreakdown: import(".prisma/job-client/runtime/library").JsonValue | null;
            skillMatchScore: number | null;
            auraMatchScore: number | null;
            recruiterNotes: string | null;
            rating: number | null;
            reviewedBy: string | null;
            interviewScheduled: boolean;
            appliedAt: Date;
            reviewedAt: Date | null;
            shortlistedAt: Date | null;
            rejectedAt: Date | null;
        };
    } & {
        status: import(".prisma/job-client", { with: { "resolution-mode": "import" } }).$Enums.InterviewStatus;
        type: import(".prisma/job-client", { with: { "resolution-mode": "import" } }).$Enums.InterviewType;
        id: string;
        recruiterId: string;
        title: string;
        description: string | null;
        location: string | null;
        createdAt: Date;
        updatedAt: Date;
        jobId: string;
        userId: string;
        rating: number | null;
        applicationId: string;
        round: number;
        scheduledAt: Date | null;
        duration: number;
        meetingUrl: string | null;
        feedback: string | null;
        interviewerNotes: string | null;
        completedAt: Date | null;
        cancelledAt: Date | null;
    })[]>;
    getRecruiterInterviews(recruiterId: string, status?: InterviewStatus): Promise<({
        application: {
            job: {
                title: string;
            };
            candidateName: string;
            candidateEmail: string;
        };
    } & {
        status: import(".prisma/job-client", { with: { "resolution-mode": "import" } }).$Enums.InterviewStatus;
        type: import(".prisma/job-client", { with: { "resolution-mode": "import" } }).$Enums.InterviewType;
        id: string;
        recruiterId: string;
        title: string;
        description: string | null;
        location: string | null;
        createdAt: Date;
        updatedAt: Date;
        jobId: string;
        userId: string;
        rating: number | null;
        applicationId: string;
        round: number;
        scheduledAt: Date | null;
        duration: number;
        meetingUrl: string | null;
        feedback: string | null;
        interviewerNotes: string | null;
        completedAt: Date | null;
        cancelledAt: Date | null;
    })[]>;
    updateInterview(interviewId: string, recruiterId: string, data: Partial<CreateInterviewDTO>): Promise<Interview>;
    confirmInterview(interviewId: string, userId: string): Promise<Interview>;
    rescheduleInterview(interviewId: string, recruiterId: string, newScheduledAt: Date, reason?: string): Promise<Interview>;
    cancelInterview(interviewId: string, userId: string, reason: string): Promise<Interview>;
    completeInterview(interviewId: string, recruiterId: string, feedback: string, rating?: number, notes?: string): Promise<Interview>;
    markNoShow(interviewId: string, recruiterId: string): Promise<Interview>;
    getUpcomingInterviews(userId: string, isRecruiter?: boolean): Promise<({
        application: {
            job: {
                recruiter: {
                    name: string;
                    organizationName: string;
                };
                title: string;
            };
        } & {
            status: import(".prisma/job-client", { with: { "resolution-mode": "import" } }).$Enums.ApplicationStatus;
            id: string;
            updatedAt: Date;
            jobId: string;
            userId: string;
            coverLetter: string | null;
            resumeUrl: string | null;
            portfolioUrl: string | null;
            candidateName: string;
            candidateEmail: string;
            candidatePhone: string | null;
            candidateAura: number;
            candidateCores: number;
            candidateSkills: string[];
            candidateProjects: import(".prisma/job-client/runtime/library").JsonValue | null;
            candidateExperience: import(".prisma/job-client/runtime/library").JsonValue | null;
            candidateCertifications: import(".prisma/job-client/runtime/library").JsonValue | null;
            stage: string | null;
            matchScore: number | null;
            matchBreakdown: import(".prisma/job-client/runtime/library").JsonValue | null;
            skillMatchScore: number | null;
            auraMatchScore: number | null;
            recruiterNotes: string | null;
            rating: number | null;
            reviewedBy: string | null;
            interviewScheduled: boolean;
            appliedAt: Date;
            reviewedAt: Date | null;
            shortlistedAt: Date | null;
            rejectedAt: Date | null;
        };
    } & {
        status: import(".prisma/job-client", { with: { "resolution-mode": "import" } }).$Enums.InterviewStatus;
        type: import(".prisma/job-client", { with: { "resolution-mode": "import" } }).$Enums.InterviewType;
        id: string;
        recruiterId: string;
        title: string;
        description: string | null;
        location: string | null;
        createdAt: Date;
        updatedAt: Date;
        jobId: string;
        userId: string;
        rating: number | null;
        applicationId: string;
        round: number;
        scheduledAt: Date | null;
        duration: number;
        meetingUrl: string | null;
        feedback: string | null;
        interviewerNotes: string | null;
        completedAt: Date | null;
        cancelledAt: Date | null;
    })[]>;
}
export declare const interviewService: InterviewService;
