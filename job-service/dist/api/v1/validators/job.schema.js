"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyJobSchema = exports.jobFiltersSchema = exports.createJobSchema = void 0;
const zod_1 = require("zod");
// Loosened validation for easier job posting
exports.createJobSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, 'Title is required').max(200),
    description: zod_1.z.string().min(1, 'Description is required').max(10000),
    requirements: zod_1.z.string().max(5000).optional().default(''),
    responsibilities: zod_1.z.string().max(5000).optional().default(''),
    type: zod_1.z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'FREELANCE']).default('FULL_TIME'),
    level: zod_1.z.enum(['ENTRY', 'JUNIOR', 'MID', 'SENIOR', 'LEAD', 'PRINCIPAL']).default('MID'),
    category: zod_1.z.enum(['FRONTEND', 'BACKEND', 'FULLSTACK', 'MOBILE', 'DEVOPS', 'DATA_ENGINEERING', 'MACHINE_LEARNING', 'SECURITY', 'DESIGN', 'QA', 'GENERAL']).optional().default('GENERAL'),
    location: zod_1.z.string().max(200).optional().default('Remote'),
    isRemote: zod_1.z.boolean().optional().default(false),
    salaryMin: zod_1.z.number().positive().optional().nullable(),
    salaryMax: zod_1.z.number().positive().optional().nullable(),
    salaryCurrency: zod_1.z.string().max(10).optional().default('INR'),
    requiredSkills: zod_1.z.array(zod_1.z.string().min(1).max(100)).optional().default([]),
    preferredSkills: zod_1.z.array(zod_1.z.string()).optional().default([]),
    minAuraScore: zod_1.z.number().min(0).max(1000).optional().default(0),
    minCoreCount: zod_1.z.number().min(1).max(3).optional().default(1),
    expiresAt: zod_1.z.string().datetime().optional().nullable(),
});
exports.jobFiltersSchema = zod_1.z.object({
    type: zod_1.z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'FREELANCE']).optional(),
    level: zod_1.z.enum(['ENTRY', 'JUNIOR', 'MID', 'SENIOR', 'LEAD', 'PRINCIPAL']).optional(),
    category: zod_1.z.enum(['FRONTEND', 'BACKEND', 'FULLSTACK', 'MOBILE', 'DEVOPS', 'DATA_ENGINEERING', 'MACHINE_LEARNING', 'SECURITY', 'DESIGN', 'QA', 'GENERAL']).optional(),
    isRemote: zod_1.z.boolean().optional(),
    skills: zod_1.z.array(zod_1.z.string()).optional(),
    minSalary: zod_1.z.number().optional(),
    location: zod_1.z.string().optional(),
    search: zod_1.z.string().optional(),
    page: zod_1.z.number().min(1).default(1),
    limit: zod_1.z.number().min(1).max(50).default(20),
});
exports.applyJobSchema = zod_1.z.object({
    coverLetter: zod_1.z.string().max(5000).optional(),
    resumeUrl: zod_1.z.string().url().optional(),
    candidateName: zod_1.z.string().min(1).max(200).optional(),
    candidateEmail: zod_1.z.string().email().optional(),
    candidateAura: zod_1.z.number().min(0).optional(),
    candidateCores: zod_1.z.number().min(1).optional(),
    candidateSkills: zod_1.z.array(zod_1.z.string()).optional(),
    candidateProjects: zod_1.z.array(zod_1.z.any()).optional(),
    candidateExperience: zod_1.z.array(zod_1.z.any()).optional(),
    candidateCertifications: zod_1.z.array(zod_1.z.any()).optional(),
});
//# sourceMappingURL=job.schema.js.map