"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyJobSchema = exports.jobFiltersSchema = exports.createJobSchema = void 0;
const zod_1 = require("zod");
exports.createJobSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(200),
    description: zod_1.z.string().min(1).max(10000),
    requirements: zod_1.z.string().max(5000).default(''),
    responsibilities: zod_1.z.string().max(5000).default(''),
    type: zod_1.z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'FREELANCE']),
    level: zod_1.z.enum(['ENTRY', 'JUNIOR', 'MID', 'SENIOR', 'LEAD', 'PRINCIPAL']),
    location: zod_1.z.string().min(1).max(200),
    isRemote: zod_1.z.boolean().default(false),
    salaryMin: zod_1.z.number().positive().optional(),
    salaryMax: zod_1.z.number().positive().optional(),
    salaryCurrency: zod_1.z.string().length(3).default('USD'),
    requiredSkills: zod_1.z.array(zod_1.z.string().min(1).max(50)).min(1).max(20),
    preferredSkills: zod_1.z.array(zod_1.z.string()).optional().default([]),
    minAuraScore: zod_1.z.number().min(0).max(1000).default(0),
    minCoreCount: zod_1.z.number().min(1).max(3).default(1),
    expiresAt: zod_1.z.string().datetime().optional(),
});
exports.jobFiltersSchema = zod_1.z.object({
    type: zod_1.z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'FREELANCE']).optional(),
    level: zod_1.z.enum(['ENTRY', 'JUNIOR', 'MID', 'SENIOR', 'LEAD', 'PRINCIPAL']).optional(),
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
});
//# sourceMappingURL=job.schema.js.map