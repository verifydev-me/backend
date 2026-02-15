"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplicationService = void 0;
const logger_js_1 = require("../utils/logger.js");
const client_js_1 = require("../prisma/client.js");
const axios_1 = __importDefault(require("axios"));
const job_service_js_1 = require("./job.service.js");
const user_client_js_1 = require("../grpc/user-client.js");
// ============================================
// HELPER FUNCTIONS
// ============================================
function transformPrismaJobToJob(prismaJob) {
    return {
        id: prismaJob.id,
        recruiterId: prismaJob.recruiterId,
        title: prismaJob.title,
        description: prismaJob.description,
        requirements: prismaJob.requirements,
        responsibilities: prismaJob.responsibilities,
        type: prismaJob.type,
        level: prismaJob.level,
        category: prismaJob.category,
        location: prismaJob.location,
        isRemote: prismaJob.isRemote,
        salaryMin: prismaJob.salaryMin || undefined,
        salaryMax: prismaJob.salaryMax || undefined,
        salaryCurrency: prismaJob.salaryCurrency,
        requiredSkills: prismaJob.requiredSkills || [],
        preferredSkills: prismaJob.preferredSkills || undefined,
        minAuraScore: prismaJob.minAuraScore,
        minCoreCount: prismaJob.minCoreCount,
        status: prismaJob.status,
        applicationsCount: prismaJob.applicationsCount,
        viewsCount: prismaJob.viewsCount,
        createdAt: prismaJob.createdAt,
        expiresAt: prismaJob.expiresAt || undefined,
    };
}
function transformApplication(app, prismaJob) {
    const job = prismaJob ? transformPrismaJobToJob(prismaJob) : undefined;
    return {
        id: app.id,
        jobId: app.jobId,
        userId: app.userId,
        job: job,
        coverLetter: app.coverLetter || undefined,
        resumeUrl: app.resumeUrl || undefined,
        status: app.status,
        matchScore: app.matchScore ?? 0,
        matchBreakdown: app.matchBreakdown ? app.matchBreakdown : [],
        appliedAt: app.appliedAt,
        reviewedAt: app.reviewedAt || undefined,
        candidateSkills: app.candidateSkills,
        candidateExperience: app.candidateExperience,
        candidateProjects: app.candidateProjects,
        candidateAura: app.candidateAura,
        candidateName: app.candidateName,
    };
}
// ============================================
// APPLICATION SERVICE WITH PRISMA
// ============================================
class ApplicationService {
    /**
     * Apply to a job
     * Uses gRPC for user data fetching with HTTP fallback
     */
    async apply(userId, jobId, data) {
        logger_js_1.logger.info({ userId, jobId }, 'User applying to job');
        // Check if already applied
        const existingApp = await client_js_1.prisma.application.findFirst({
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
        const job = await client_js_1.prisma.job.findUnique({ where: { id: jobId } });
        if (!job) {
            throw new Error('Job not found');
        }
        if (job.status !== 'ACTIVE') {
            throw new Error('Job is no longer accepting applications');
        }
        // Get user skills and calculate match
        let matchScore = 50;
        let matchBreakdown = [];
        let userSkills = [];
        let userAura = 0;
        // Try gRPC first for user data
        try {
            const grpcUser = await (0, user_client_js_1.getUserProfile)(userId, {
                includeSkills: true,
                includeProjects: true,
            });
            if (grpcUser) {
                userSkills = (grpcUser.skills || []).map((s) => ({
                    name: s.name,
                    score: s.confidence_score || 0.8,
                    isVerified: s.verified || false,
                }));
                userAura = grpcUser.aura_score || 0;
                logger_js_1.logger.debug({ userId, skillCount: userSkills.length }, 'Fetched user skills via gRPC');
            }
        }
        catch (grpcError) {
            logger_js_1.logger.warn({ error: grpcError, userId }, 'gRPC failed, falling back to HTTP');
            // Fallback to HTTP
            try {
                const userDataResponse = await axios_1.default.get(`http://user-service:3002/api/v1/users/${userId}/skills-summary`, { timeout: 5000 });
                const userData = userDataResponse.data.data;
                userSkills = userData?.skills || [];
                userAura = userData?.auraScore || 0;
            }
            catch (httpError) {
                logger_js_1.logger.warn({ error: httpError, userId }, 'HTTP fallback also failed');
            }
        }
        // Calculate skill matches and scores
        if (userSkills.length > 0) {
            const skillMatches = userSkills.filter(us => (job.requiredSkills || []).some(reqSkill => us.name.toLowerCase() === reqSkill.toLowerCase()));
            const skillScore = job.requiredSkills.length > 0
                ? (skillMatches.length / job.requiredSkills.length) * 100
                : 50;
            const auraScore = job.minAuraScore > 0
                ? Math.min(100, (userAura / job.minAuraScore) * 100)
                : 100;
            const matchResult = {
                skills: {
                    score: skillScore,
                    weight: 70,
                    matched: skillMatches.map(s => s.name),
                    missing: (job.requiredSkills || []).filter(req => !userSkills.some(us => us.name.toLowerCase() === req.toLowerCase()))
                },
                aura: {
                    score: auraScore,
                    weight: 30,
                    candidateScore: userAura,
                    requiredScore: job.minAuraScore
                },
                experience: { score: 0, weight: 0, candidateYears: 0, requiredYears: 0 },
                location: { score: 0, weight: 0, isMatch: false }
            };
            matchScore = Math.round(skillScore * 0.7 + auraScore * 0.3);
            matchBreakdown = matchResult;
        }
        // Get resume URL
        let resumeUrl = data.resumeUrl;
        if (!resumeUrl) {
            try {
                const resumeResponse = await axios_1.default.get(`http://resume-service:8003/api/v1/resume/user/${userId}/url`, { timeout: 5000 });
                resumeUrl = resumeResponse.data?.url;
            }
            catch {
                logger_js_1.logger.warn({ userId }, 'Could not fetch resume URL');
            }
        }
        // Create application in database
        const application = await client_js_1.prisma.application.create({
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
                candidateProjects: data.candidateProjects, // Cast to any for Json type
                candidateExperience: data.candidateExperience,
                candidateCertifications: data.candidateCertifications,
                status: 'PENDING',
                matchScore,
                matchBreakdown: matchBreakdown, // Save to DB
            },
        });
        await client_js_1.prisma.job.update({
            where: { id: jobId },
            data: { applicationsCount: { increment: 1 } }
        });
        logger_js_1.logger.info({ applicationId: application.id, matchScore }, 'Application created');
        return transformApplication(application, job);
    }
    /**
     * Get user's applications
     */
    async getUserApplications(userId, status) {
        logger_js_1.logger.debug({ userId, status }, 'Fetching user applications');
        const where = { userId };
        if (status) {
            where.status = status;
        }
        const applications = await client_js_1.prisma.application.findMany({
            where,
            orderBy: { appliedAt: 'desc' },
        });
        // Enrich with job data
        const enrichedApps = [];
        for (const app of applications) {
            const job = await client_js_1.prisma.job.findUnique({ where: { id: app.jobId } });
            enrichedApps.push(transformApplication(app, job));
        }
        return enrichedApps;
    }
    /**
     * Get applications for a job (recruiter view)
     */
    async getJobApplications(jobId, status, sortBy = 'matchScore') {
        logger_js_1.logger.debug({ jobId, status }, 'Fetching job applications');
        const where = { jobId };
        if (status) {
            where.status = status;
        }
        const applications = await client_js_1.prisma.application.findMany({
            where,
            orderBy: sortBy === 'matchScore'
                ? { matchScore: 'desc' }
                : { appliedAt: 'desc' },
        });
        const job = await client_js_1.prisma.job.findUnique({ where: { id: jobId } });
        return applications.map(app => transformApplication(app, job));
    }
    /**
     * Get application by ID
     */
    async getApplicationById(applicationId) {
        const application = await client_js_1.prisma.application.findUnique({
            where: { id: applicationId },
        });
        if (!application)
            return null;
        const job = await client_js_1.prisma.job.findUnique({ where: { id: application.jobId } });
        return transformApplication(application, job);
    }
    /**
     * Update application status (recruiter action)
     */
    async updateStatus(applicationId, status, notes) {
        logger_js_1.logger.info({ applicationId, status }, 'Updating application status');
        try {
            const application = await client_js_1.prisma.application.update({
                where: { id: applicationId },
                data: {
                    status,
                    reviewedAt: new Date(),
                },
            });
            const job = await client_js_1.prisma.job.findUnique({ where: { id: application.jobId } });
            // TODO: Send notification to user about status change
            return transformApplication(application, job);
        }
        catch {
            return null;
        }
    }
    /**
     * Add recruiter note
     */
    async addNote(applicationId, note) {
        try {
            const application = await client_js_1.prisma.application.update({
                where: { id: applicationId },
                data: { recruiterNotes: note }
            });
            const job = await client_js_1.prisma.job.findUnique({ where: { id: application.jobId } });
            return transformApplication(application, job);
        }
        catch {
            return null;
        }
    }
    /**
     * Withdraw application (user action)
     */
    async withdraw(applicationId, userId) {
        logger_js_1.logger.info({ applicationId, userId }, 'Withdrawing application');
        const application = await client_js_1.prisma.application.findUnique({
            where: { id: applicationId },
        });
        if (!application || application.userId !== userId) {
            return false;
        }
        if (application.status === 'WITHDRAWN') {
            throw new Error('Application already withdrawn');
        }
        await client_js_1.prisma.application.update({
            where: { id: applicationId },
            data: { status: 'WITHDRAWN' },
        });
        return true;
    }
    /**
     * Check if user can apply to job
     */
    async canApply(userId, jobId) {
        // Check if already applied
        const existingApp = await client_js_1.prisma.application.findFirst({
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
        const job = await client_js_1.prisma.job.findUnique({ where: { id: jobId } });
        if (!job) {
            return { can: false, reason: 'Job not found' };
        }
        if (job.status !== 'ACTIVE') {
            return { can: false, reason: 'Job is no longer accepting applications' };
        }
        // Get user skills and check eligibility
        try {
            const userDataResponse = await axios_1.default.get(`http://user-service:3002/api/v1/users/${userId}/skills-summary`, { timeout: 5000 });
            const userData = userDataResponse.data.data;
            const userSkills = userData?.skills || [];
            const userAura = userData?.auraScore || 0;
            const matchResult = job_service_js_1.JobService.calculateSkillMatch(userSkills, job.requiredSkills, userAura, job.minAuraScore);
            if (!matchResult.meetsMinimum) {
                return {
                    can: false,
                    reason: 'You do not meet the minimum requirements for this job',
                    matchScore: matchResult.matchScore,
                };
            }
            return { can: true, matchScore: matchResult.matchScore };
        }
        catch {
            // If we can't verify, allow application
            return { can: true };
        }
    }
    /**
     * Get application stats for a job
     */
    async getJobApplicationStats(jobId) {
        const applications = await client_js_1.prisma.application.findMany({
            where: { jobId },
            select: { status: true, matchScore: true },
        });
        const byStatus = {
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
            byStatus: byStatus,
            avgMatchScore: applications.length > 0 ? Math.round(totalMatchScore / applications.length) : 0,
        };
    }
    /**
     * Get all applications for a specific job
     */
    async getApplicationsByJob(jobId) {
        logger_js_1.logger.debug({ jobId }, 'Fetching applications for job');
        const applications = await client_js_1.prisma.application.findMany({
            where: { jobId },
            orderBy: { appliedAt: 'desc' },
        });
        return applications;
    }
}
exports.ApplicationService = ApplicationService;
exports.default = ApplicationService;
//# sourceMappingURL=application.service.js.map