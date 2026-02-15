export interface MatchScore {
    total: number;
    breakdown: {
        skills: number;
        aura: number;
        experience: number;
        location: number;
        availability: number;
    };
    matchedSkills: string[];
    missingSkills: string[];
}
export interface CandidateSearchFilters {
    requiredSkills?: string[];
    preferredSkills?: string[];
    minAuraScore?: number;
    minCoreCount?: number;
    location?: string;
    remote?: boolean;
    availableFrom?: Date;
    minExperience?: number;
    maxExperience?: number;
    isOpenToWork?: boolean;
    education?: string;
}
export declare class MatchingService {
    calculateMatchScore(candidate: any, job: any): MatchScore;
    private matchExperience;
    private matchLocation;
    private matchAvailability;
    findMatchingJobs(candidateId: string, limit?: number): Promise<({
        recruiter: {
            name: string;
            organizationName: string;
            organizationLogo: string | null;
        };
    } & {
        status: import(".prisma/job-client").$Enums.JobStatus;
        type: import(".prisma/job-client").$Enums.JobType;
        level: import(".prisma/job-client").$Enums.ExperienceLevel;
        id: string;
        recruiterId: string;
        title: string;
        description: string;
        requirements: string;
        responsibilities: string;
        benefits: string | null;
        category: import(".prisma/job-client").$Enums.JobCategory;
        location: string;
        isRemote: boolean;
        remoteType: import(".prisma/job-client").$Enums.RemoteType | null;
        salaryMin: number | null;
        salaryMax: number | null;
        salaryCurrency: string;
        salaryPeriod: import(".prisma/job-client").$Enums.SalaryPeriod;
        showSalary: boolean;
        requiredSkills: string[];
        preferredSkills: string[];
        minExperience: number | null;
        maxExperience: number | null;
        minAuraScore: number;
        minCoreCount: number;
        minEducation: import(".prisma/job-client").$Enums.EducationLevel | null;
        applicationsCount: number;
        viewsCount: number;
        matchedCount: number;
        createdAt: Date;
        updatedAt: Date;
        publishedAt: Date | null;
        expiresAt: Date | null;
        closedAt: Date | null;
    })[]>;
    findMatchingCandidates(jobId: string, filters?: CandidateSearchFilters): Promise<{
        jobId: string;
        filters: {
            requiredSkills: string[];
            preferredSkills?: string[];
            minAuraScore: number;
            minCoreCount: number;
            location?: string;
            remote?: boolean;
            availableFrom?: Date;
            minExperience?: number;
            maxExperience?: number;
            isOpenToWork?: boolean;
            education?: string;
        };
    }>;
    getSuggestedCandidates(jobId: string, recruiterId: string, limit?: number): Promise<{
        jobId: string;
        criteria: {
            skills: string[];
            minAura: number;
            minCores: number;
            level: import(".prisma/job-client").$Enums.ExperienceLevel;
        };
        limit: number;
    }>;
}
export declare const matchingService: MatchingService;
