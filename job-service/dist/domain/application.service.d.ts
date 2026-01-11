import type { Application, ApplyJobDto, ApplicationStatus } from '../types/index.js';
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
export declare class ApplicationService {
    /**
     * Apply to a job
     */
    apply(userId: string, jobId: string, data: ApplyJobDto): Promise<ApplicationWithMatch>;
    /**
     * Get user's applications
     */
    getUserApplications(userId: string): Promise<ApplicationWithMatch[]>;
    /**
     * Get applications for a job (recruiter view)
     */
    getJobApplications(jobId: string, status?: ApplicationStatus, sortBy?: 'matchScore' | 'appliedAt'): Promise<ApplicationWithMatch[]>;
    /**
     * Get application by ID
     */
    getApplicationById(applicationId: string): Promise<ApplicationWithMatch | null>;
    /**
     * Update application status (recruiter action)
     */
    updateStatus(applicationId: string, status: ApplicationStatus, notes?: string): Promise<ApplicationWithMatch | null>;
    /**
     * Withdraw application (user action)
     */
    withdraw(applicationId: string, userId: string): Promise<boolean>;
    /**
     * Check if user can apply to job
     */
    canApply(userId: string, jobId: string): Promise<{
        can: boolean;
        reason?: string;
        matchScore?: number;
    }>;
    /**
     * Get application stats for a job
     */
    getJobApplicationStats(jobId: string): Promise<{
        total: number;
        byStatus: Record<ApplicationStatus, number>;
        avgMatchScore: number;
    }>;
    /**
     * Get all applications for a specific job
     */
    getApplicationsByJob(jobId: string): Promise<any[]>;
}
export default ApplicationService;
