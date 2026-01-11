"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchingService = exports.MatchingService = void 0;
const client_js_1 = require("../prisma/client.js");
class MatchingService {
    // Calculate match score between candidate and job
    calculateMatchScore(candidate, job) {
        let totalScore = 0;
        const breakdown = {
            skills: 0,
            aura: 0,
            experience: 0,
            location: 0,
            availability: 0,
        };
        // 1. Skills Match (40% weight)
        const requiredSkills = job.requiredSkills || [];
        const candidateSkills = candidate.skills?.map((s) => s.name.toLowerCase()) || [];
        const matchedSkills = requiredSkills.filter((skill) => candidateSkills.some((cs) => cs.includes(skill.toLowerCase()) || skill.toLowerCase().includes(cs)));
        const skillsScore = requiredSkills.length > 0
            ? (matchedSkills.length / requiredSkills.length) * 100
            : 100;
        breakdown.skills = Math.round(skillsScore);
        totalScore += skillsScore * 0.4;
        // 2. Aura Score Match (25% weight)
        const auraScore = candidate.auraScore >= job.minAuraScore
            ? 100
            : (candidate.auraScore / job.minAuraScore) * 100;
        breakdown.aura = Math.round(Math.min(100, auraScore));
        totalScore += Math.min(100, auraScore) * 0.25;
        // 3. Experience Match (20% weight)
        const expScore = this.matchExperience(candidate.coreCount, job.level, job.minExperience);
        breakdown.experience = expScore;
        totalScore += expScore * 0.2;
        // 4. Location Match (10% weight)
        const locationScore = this.matchLocation(candidate, job);
        breakdown.location = locationScore;
        totalScore += locationScore * 0.1;
        // 5. Availability Match (5% weight)
        const availScore = this.matchAvailability(candidate.availableFrom, job.publishedAt);
        breakdown.availability = availScore;
        totalScore += availScore * 0.05;
        const missingSkills = requiredSkills.filter((skill) => !matchedSkills.includes(skill));
        return {
            total: Math.round(totalScore),
            breakdown,
            matchedSkills,
            missingSkills,
        };
    }
    // Match experience level
    matchExperience(coreCount, level, minExp) {
        const levelMapping = {
            ENTRY: { min: 0, max: 1 },
            JUNIOR: { min: 1, max: 3 },
            MID: { min: 3, max: 6 },
            SENIOR: { min: 6, max: 10 },
            LEAD: { min: 8, max: 15 },
            PRINCIPAL: { min: 10, max: 20 },
        };
        const range = levelMapping[level] || { min: 0, max: 100 };
        if (coreCount >= range.min && coreCount <= range.max) {
            return 100;
        }
        else if (coreCount < range.min) {
            return Math.max(0, (coreCount / range.min) * 80);
        }
        else {
            return 90; // Overqualified but still good
        }
    }
    // Match location
    matchLocation(candidate, job) {
        if (job.isRemote || job.remoteType === 'FULL_REMOTE') {
            return 100;
        }
        if (candidate.remotePreference === 'REMOTE_ONLY' && !job.isRemote) {
            return 20;
        }
        if (!candidate.location || !job.location) {
            return 50;
        }
        const candLoc = candidate.location.toLowerCase();
        const jobLoc = job.location.toLowerCase();
        if (candLoc.includes(jobLoc) || jobLoc.includes(candLoc)) {
            return 100;
        }
        // Check if both prefer remote/hybrid
        if (candidate.remotePreference === 'FLEXIBLE' || candidate.remotePreference === 'HYBRID') {
            return 70;
        }
        return 30;
    }
    // Match availability
    matchAvailability(candidateAvailable, jobDate) {
        if (!candidateAvailable || !jobDate) {
            return 100;
        }
        const diff = candidateAvailable.getTime() - jobDate.getTime();
        const daysDiff = diff / (1000 * 60 * 60 * 24);
        if (daysDiff <= 0) {
            return 100; // Available now or in past
        }
        else if (daysDiff <= 30) {
            return 90; // Available within a month
        }
        else if (daysDiff <= 60) {
            return 70; // Available within 2 months
        }
        else {
            return 50; // Available later
        }
    }
    // Find matching jobs for a candidate
    async findMatchingJobs(candidateId, limit = 20) {
        // This would call user-service to get candidate details
        // For now, return structure
        const jobs = await client_js_1.prisma.job.findMany({
            where: { status: 'ACTIVE' },
            take: limit,
            include: {
                recruiter: {
                    select: {
                        name: true,
                        organizationName: true,
                        organizationLogo: true,
                    },
                },
            },
        });
        // In production, calculate match scores and sort
        return jobs;
    }
    // Find matching candidates for a job
    async findMatchingCandidates(jobId, filters) {
        const job = await client_js_1.prisma.job.findUnique({
            where: { id: jobId },
        });
        if (!job) {
            throw new Error('Job not found');
        }
        // This would call user-service to search candidates
        // Return structure for now
        return {
            jobId,
            filters: {
                requiredSkills: job.requiredSkills,
                minAuraScore: job.minAuraScore,
                minCoreCount: job.minCoreCount,
                ...filters,
            },
        };
    }
    // Get suggested candidates for a job
    async getSuggestedCandidates(jobId, recruiterId, limit = 10) {
        const job = await client_js_1.prisma.job.findFirst({
            where: { id: jobId, recruiterId },
        });
        if (!job) {
            throw new Error('Job not found or unauthorized');
        }
        // This would integrate with user-service to get candidates
        // and calculate match scores
        return {
            jobId,
            criteria: {
                skills: job.requiredSkills,
                minAura: job.minAuraScore,
                minCores: job.minCoreCount,
                level: job.level,
            },
            limit,
        };
    }
}
exports.MatchingService = MatchingService;
exports.matchingService = new MatchingService();
//# sourceMappingURL=matching.service.js.map