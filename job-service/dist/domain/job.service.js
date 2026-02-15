"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobService = void 0;
const logger_js_1 = require("../utils/logger.js");
const client_js_1 = require("../prisma/client.js");
const axios_1 = __importDefault(require("axios"));
// ============================================
// HELPER FUNCTIONS
// ============================================
// Transform Prisma Job to API Job format
function transformJob(prismaJob) {
    return {
        id: prismaJob.id,
        recruiterId: prismaJob.recruiterId,
        title: prismaJob.title,
        description: prismaJob.description,
        requirements: prismaJob.requirements,
        responsibilities: prismaJob.responsibilities,
        type: prismaJob.type,
        level: prismaJob.level,
        category: (prismaJob.category || 'GENERAL'),
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
// ============================================
// JOB SERVICE WITH PRISMA
// ============================================
class JobService {
    /**
     * Create a new job posting
     */
    async createJob(data) {
        logger_js_1.logger.info({ recruiterId: data.recruiterId, title: data.title }, 'Creating job');
        const job = await client_js_1.prisma.job.create({
            data: {
                recruiterId: data.recruiterId,
                title: data.title,
                description: data.description,
                requirements: data.requirements,
                responsibilities: data.responsibilities,
                type: data.type,
                level: data.level,
                category: data.category || 'GENERAL',
                location: data.location,
                isRemote: data.isRemote,
                salaryMin: data.salaryMin,
                salaryMax: data.salaryMax,
                salaryCurrency: data.salaryCurrency || 'INR',
                minAuraScore: data.minAuraScore || 0,
                minCoreCount: data.minCoreCount || 1,
                status: 'ACTIVE',
                expiresAt: data.expiresAt,
                requiredSkills: data.requiredSkills || [],
                preferredSkills: data.preferredSkills || [],
            },
        });
        return transformJob(job);
    }
    /**
     * Get jobs with filters and pagination
     */
    async getJobs(filters, page = 1, limit = 20) {
        logger_js_1.logger.debug({ filters, page, limit }, 'Fetching jobs');
        const where = {
            status: 'ACTIVE',
        };
        // Apply filters
        if (filters.type) {
            where.type = filters.type;
        }
        if (filters.level) {
            where.level = filters.level;
        }
        if (filters.category) {
            where.category = filters.category;
        }
        if (filters.isRemote !== undefined) {
            where.isRemote = filters.isRemote;
        }
        if (filters.location) {
            where.location = { contains: filters.location, mode: 'insensitive' };
        }
        if (filters.minSalary) {
            where.salaryMax = { gte: filters.minSalary };
        }
        if (filters.search) {
            where.OR = [
                { title: { contains: filters.search, mode: 'insensitive' } },
                { description: { contains: filters.search, mode: 'insensitive' } },
            ];
        }
        if (filters.skills && filters.skills.length > 0) {
            where.requiredSkills = {
                hasSome: filters.skills,
            };
        }
        const [jobs, total] = await Promise.all([
            client_js_1.prisma.job.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            client_js_1.prisma.job.count({ where }),
        ]);
        return { jobs: jobs.map(transformJob), total };
    }
    /**
     * Get job by ID
     */
    async getJobById(jobId) {
        logger_js_1.logger.debug({ jobId }, 'Fetching job');
        const job = await client_js_1.prisma.job.findUnique({
            where: { id: jobId },
        });
        return job ? transformJob(job) : null;
    }
    /**
     * Get all jobs posted by a specific recruiter
     */
    async getJobsByRecruiter(recruiterId, page = 1, limit = 20) {
        logger_js_1.logger.debug({ recruiterId, page, limit }, 'Fetching recruiter jobs');
        const skip = (page - 1) * limit;
        const [jobs, total] = await Promise.all([
            client_js_1.prisma.job.findMany({
                where: { recruiterId },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            client_js_1.prisma.job.count({
                where: { recruiterId },
            }),
        ]);
        return { jobs: jobs.map(transformJob), total };
    }
    /**
     * Get matched jobs for a user based on their skills
     */
    async getMatchedJobs(userId, userSkills, auraScore, page = 1, limit = 10) {
        logger_js_1.logger.debug({ userId, skillCount: userSkills.length, auraScore, page, limit }, 'Finding matched jobs');
        // Get 200 recent active jobs for matching candidate pool
        // This allows us to have a good pool to rank without fetching the entire DB
        const recentJobs = await client_js_1.prisma.job.findMany({
            where: { status: 'ACTIVE' },
            take: 200,
            orderBy: { createdAt: 'desc' },
        });
        // Calculate Match Scores
        const matchedJobs = recentJobs.map(prismaJob => {
            const job = transformJob(prismaJob);
            const matchResult = JobService.calculateSkillMatch(userSkills, job.requiredSkills, auraScore, job.minAuraScore);
            return { ...job, matchResult };
        });
        // Filter jobs where user meets minimum requirements
        const qualifiedJobs = matchedJobs.filter(job => job.matchResult.meetsMinimum);
        // Sort by match score (Highest first)
        qualifiedJobs.sort((a, b) => b.matchResult.matchScore - a.matchResult.matchScore);
        // Manual Pagination (Slicing the sorted array)
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedJobs = qualifiedJobs.slice(startIndex, endIndex);
        return {
            jobs: paginatedJobs,
            total: qualifiedJobs.length
        };
    }
    /**
     * Get recommended jobs based on user profile
     * OPTIMIZED: Faster with caching and parallel processing
     */
    async getRecommendedJobs(userId, page = 1, limit = 20) {
        try {
            // Fetch user skills with SHORT timeout
            const userDataResponse = await axios_1.default.get(`http://user-service:3002/api/v1/users/${userId}/skills-summary`, { timeout: 2000 });
            const userData = userDataResponse.data.data;
            const userSkills = userData.skills || [];
            const auraScore = userData.auraScore || 0;
            // If no skills, return recent jobs quickly
            if (!userSkills.length) {
                const total = await client_js_1.prisma.job.count({ where: { status: 'ACTIVE' } });
                const jobs = await client_js_1.prisma.job.findMany({
                    where: { status: 'ACTIVE' },
                    skip: (page - 1) * limit,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                });
                return {
                    jobs: jobs.map(prismaJob => ({
                        ...transformJob(prismaJob),
                        matchResult: {
                            matchScore: 50,
                            matchedSkills: [],
                            meetsMinimum: true,
                        }
                    })),
                    total
                };
            }
            return this.getMatchedJobs(userId, userSkills, auraScore, page, limit);
        }
        catch (error) {
            logger_js_1.logger.warn({ error, userId }, 'User-service timeout, returning recent jobs');
            // FAST FALLBACK
            const total = await client_js_1.prisma.job.count({ where: { status: 'ACTIVE' } });
            const jobs = await client_js_1.prisma.job.findMany({
                where: { status: 'ACTIVE' },
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
            });
            return {
                jobs: jobs.map(prismaJob => ({
                    ...transformJob(prismaJob),
                    matchResult: {
                        matchScore: 50,
                        matchedSkills: [],
                        meetsMinimum: true,
                    }
                })),
                total
            };
        }
    }
    /**
     * Calculate skill match between user and job
     */
    static calculateSkillMatch(userSkills, jobSkills, userAura, minAura) {
        if (!jobSkills || jobSkills.length === 0) {
            return {
                matchScore: userAura >= minAura ? 100 : 0,
                matchedSkills: [],
                meetsMinimum: userAura >= minAura,
            };
        }
        const matchedSkills = [];
        let totalScore = 0;
        let requiredMet = true;
        for (const jobSkillName of jobSkills) {
            const userSkill = userSkills.find(s => s.name.toLowerCase() === jobSkillName.toLowerCase());
            if (userSkill) {
                // Default min score requirement
                const minScore = 50;
                const meetsRequirement = userSkill.score >= minScore;
                // Verified skills get bonus
                const verifiedBonus = userSkill.isVerified ? 1.2 : 1.0;
                const contributionScore = Math.min(100, (userSkill.score / minScore) * 100 * verifiedBonus);
                totalScore += contributionScore;
                matchedSkills.push({
                    skill: jobSkillName,
                    required: minScore,
                    userScore: userSkill.score,
                    verified: userSkill.isVerified,
                    status: meetsRequirement ? 'met' : 'partial',
                });
                if (!meetsRequirement) {
                    requiredMet = false;
                }
            }
            else {
                matchedSkills.push({
                    skill: jobSkillName,
                    required: 50,
                    userScore: 0,
                    verified: false,
                    status: 'missing',
                });
            }
        }
        const matchScore = Math.round(totalScore / jobSkills.length);
        // Relaxed requirement: Allow all authenticated users to apply,
        // but keep the score for recruiter info.
        const meetsMinimum = true;
        return {
            matchScore: Math.min(100, matchScore),
            matchedSkills,
            meetsMinimum,
        };
    }
    /**
     * Increment view count
     */
    async incrementViews(jobId) {
        logger_js_1.logger.debug({ jobId }, 'Incrementing views');
        await client_js_1.prisma.job.update({
            where: { id: jobId },
            data: { viewsCount: { increment: 1 } },
        });
    }
    /**
     * Increment application count
     */
    async incrementApplications(jobId) {
        await client_js_1.prisma.job.update({
            where: { id: jobId },
            data: { applicationsCount: { increment: 1 } },
        });
    }
    /**
     * Update job status
     */
    async updateJobStatus(jobId, status) {
        logger_js_1.logger.info({ jobId, status }, 'Updating job status');
        const job = await client_js_1.prisma.job.update({
            where: { id: jobId },
            data: { status },
        });
        return transformJob(job);
    }
    /**
     * Search jobs with advanced filters
     */
    async searchJobs(params) {
        const where = {
            status: 'ACTIVE',
        };
        // Text search
        if (params.query) {
            where.OR = [
                { title: { contains: params.query, mode: 'insensitive' } },
                { description: { contains: params.query, mode: 'insensitive' } },
            ];
        }
        // Skills filter
        if (params.skills && params.skills.length > 0) {
            where.requiredSkills = {
                hasSome: params.skills,
            };
        }
        // Type filter
        if (params.type && params.type.length > 0) {
            where.type = { in: params.type };
        }
        // Level filter
        if (params.level && params.level.length > 0) {
            where.level = { in: params.level };
        }
        // Remote filter
        if (params.isRemote !== undefined) {
            where.isRemote = params.isRemote;
        }
        // Salary filter
        if (params.salaryMin) {
            where.salaryMax = { gte: params.salaryMin };
        }
        if (params.salaryMax) {
            where.salaryMin = { lte: params.salaryMax };
        }
        // Location filter
        if (params.location) {
            where.location = { contains: params.location, mode: 'insensitive' };
        }
        // Determine sort order
        let orderBy;
        switch (params.sortBy) {
            case 'salary':
                orderBy = { salaryMax: 'desc' };
                break;
            case 'date':
            default:
                orderBy = { createdAt: 'desc' };
        }
        const page = params.page || 1;
        const limit = params.limit || 20;
        const [jobs, total] = await Promise.all([
            client_js_1.prisma.job.findMany({
                where,
                orderBy,
                skip: (page - 1) * limit,
                take: limit,
            }),
            client_js_1.prisma.job.count({ where }),
        ]);
        const totalPages = Math.ceil(total / limit);
        return { jobs: jobs.map(transformJob), total, page, totalPages };
    }
    /**
     * Seed demo jobs for development
     */
    async seedDemoJobs() {
        const existingCount = await client_js_1.prisma.job.count();
        if (existingCount > 0) {
            logger_js_1.logger.info('Demo jobs already exist, skipping seed');
            return;
        }
        logger_js_1.logger.info('Seeding demo jobs...');
        const demoJobs = [
            {
                recruiterId: '64f0c79b5c3d2e1a8b9c0d1f', // recruiter_demo
                title: 'Senior React Developer',
                description: 'We are looking for a Senior React Developer to join our team...',
                requirements: '5+ years of experience with React, TypeScript, and modern frontend tools.',
                responsibilities: 'Lead frontend architecture, mentor juniors, implement features.',
                type: 'FULL_TIME',
                level: 'SENIOR',
                location: 'Bangalore, India',
                isRemote: false,
                salaryMin: 2000000,
                salaryMax: 3500000,
                salaryCurrency: 'INR',
                minAuraScore: 300,
                minCoreCount: 2,
                status: 'ACTIVE',
                requiredSkills: ['React', 'TypeScript', 'JavaScript'],
                preferredSkills: ['Node.js'],
            },
            {
                recruiterId: '64f0c79b5c3d2e1a8b9c0d21', // recruiter_startup
                title: 'Full Stack Developer',
                description: 'Join our fast-growing startup as a Full Stack Developer...',
                requirements: '2+ years of experience with React and Node.js.',
                responsibilities: 'Build features end-to-end, work directly with founders.',
                type: 'FULL_TIME',
                level: 'MID',
                location: 'Remote',
                isRemote: true,
                salaryMin: 1000000,
                salaryMax: 1800000,
                salaryCurrency: 'INR',
                minAuraScore: 100,
                minCoreCount: 1,
                status: 'ACTIVE',
                requiredSkills: ['React', 'Node.js'],
                preferredSkills: ['PostgreSQL'],
            },
            {
                recruiterId: '64f0c79b5c3d2e1a8b9c0d23', // recruiter_enterprise
                title: 'Go Backend Developer',
                description: 'Looking for Go developer to build high-performance microservices...',
                requirements: '3+ years Go experience, microservices architecture.',
                responsibilities: 'Design and build microservices, optimize performance.',
                type: 'FULL_TIME',
                level: 'SENIOR',
                location: 'Mumbai, India',
                isRemote: false,
                salaryMin: 2500000,
                salaryMax: 4000000,
                salaryCurrency: 'INR',
                minAuraScore: 400,
                minCoreCount: 3,
                status: 'ACTIVE',
                requiredSkills: ['Go', 'Docker', 'PostgreSQL'],
                preferredSkills: ['Redis'],
            },
            {
                recruiterId: '64f0c79b5c3d2e1a8b9c0d1f', // recruiter_demo
                title: 'Python Data Engineer',
                description: 'Join our data team to build ETL pipelines...',
                requirements: 'Strong Python skills, experience with data pipelines.',
                responsibilities: 'Build data pipelines, maintain data warehouse.',
                type: 'FULL_TIME',
                level: 'MID',
                location: 'Hyderabad, India',
                isRemote: false,
                salaryMin: 1500000,
                salaryMax: 2500000,
                salaryCurrency: 'INR',
                minAuraScore: 200,
                minCoreCount: 1,
                status: 'ACTIVE',
                requiredSkills: ['Python', 'SQL'],
                preferredSkills: ['Apache Spark'],
            },
            {
                recruiterId: '64f0c79b5c3d2e1a8b9c0d21', // recruiter_startup
                title: 'Frontend Intern',
                description: 'Great opportunity for freshers to learn and grow...',
                requirements: 'Basic HTML/CSS/JS knowledge, willingness to learn.',
                responsibilities: 'Assist in building UI components, learn from seniors.',
                type: 'INTERNSHIP',
                level: 'ENTRY',
                location: 'Remote',
                isRemote: true,
                salaryMin: 15000,
                salaryMax: 25000,
                salaryCurrency: 'INR',
                minAuraScore: 0,
                minCoreCount: 1,
                status: 'ACTIVE',
                requiredSkills: ['JavaScript', 'HTML', 'CSS'],
            },
        ];
        for (const jobData of demoJobs) {
            await client_js_1.prisma.job.create({ data: jobData });
        }
        logger_js_1.logger.info(`Seeded ${demoJobs.length} demo jobs`);
    }
    /**
     * Update a job
     */
    async updateJob(jobId, updateData) {
        const updatedJob = await client_js_1.prisma.job.update({
            where: { id: jobId },
            data: {
                ...updateData,
                updatedAt: new Date(),
            },
        });
        return transformJob(updatedJob);
    }
    /**
     * Delete a job (soft delete by setting status to CLOSED)
     */
    async deleteJob(jobId) {
        await client_js_1.prisma.job.update({
            where: { id: jobId },
            data: {
                status: 'CLOSED',
                updatedAt: new Date(),
            },
        });
    }
    /**
     * Get recruiter's posted jobs
     */
    async getRecruiterJobs(recruiterId) {
        const jobs = await client_js_1.prisma.job.findMany({
            where: { recruiterId },
            orderBy: { createdAt: 'desc' },
        });
        return jobs.map(transformJob);
    }
    /**
     * Toggle save/bookmark a job
     */
    async toggleSaveJob(userId, jobId) {
        // Check if already saved
        const existing = await client_js_1.prisma.savedJob.findUnique({
            where: {
                userId_jobId: {
                    userId,
                    jobId,
                },
            },
        });
        if (existing) {
            // Unsave
            await client_js_1.prisma.savedJob.delete({
                where: {
                    userId_jobId: {
                        userId,
                        jobId,
                    },
                },
            });
            return { saved: false };
        }
        else {
            // Save
            await client_js_1.prisma.savedJob.create({
                data: {
                    userId,
                    jobId,
                },
            });
            return { saved: true };
        }
    }
    /**
     * Get user's saved jobs
     */
    async getSavedJobs(userId) {
        const savedJobs = await client_js_1.prisma.savedJob.findMany({
            where: { userId },
            include: {
                job: true,
            },
            orderBy: { savedAt: 'desc' },
        });
        return savedJobs.map(saved => transformJob(saved.job));
    }
}
exports.JobService = JobService;
exports.default = JobService;
//# sourceMappingURL=job.service.js.map