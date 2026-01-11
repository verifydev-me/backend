import { z } from 'zod';

export const createJobSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(10000),
  requirements: z.string().max(5000).default(''),
  responsibilities: z.string().max(5000).default(''),
  type: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'FREELANCE']),
  level: z.enum(['ENTRY', 'JUNIOR', 'MID', 'SENIOR', 'LEAD', 'PRINCIPAL']),
  category: z.enum(['FRONTEND', 'BACKEND', 'FULLSTACK', 'MOBILE', 'DEVOPS', 'DATA_ENGINEERING', 'MACHINE_LEARNING', 'SECURITY', 'DESIGN', 'QA', 'GENERAL']).default('GENERAL'),
  location: z.string().min(1).max(200),
  isRemote: z.boolean().default(false),
  salaryMin: z.number().positive().optional(),
  salaryMax: z.number().positive().optional(),
  salaryCurrency: z.string().length(3).default('INR'),
  requiredSkills: z.array(z.string().min(1).max(100)).min(1).max(20),
  preferredSkills: z.array(z.string()).optional().default([]),
  minAuraScore: z.number().min(0).max(1000).default(0),
  minCoreCount: z.number().min(1).max(3).default(1),
  expiresAt: z.string().datetime().optional(),
});


export const jobFiltersSchema = z.object({
  type: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'FREELANCE']).optional(),
  level: z.enum(['ENTRY', 'JUNIOR', 'MID', 'SENIOR', 'LEAD', 'PRINCIPAL']).optional(),
  category: z.enum(['FRONTEND', 'BACKEND', 'FULLSTACK', 'MOBILE', 'DEVOPS', 'DATA_ENGINEERING', 'MACHINE_LEARNING', 'SECURITY', 'DESIGN', 'QA', 'GENERAL']).optional(),
  isRemote: z.boolean().optional(),
  skills: z.array(z.string()).optional(),
  minSalary: z.number().optional(),
  location: z.string().optional(),
  search: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(50).default(20),
});

export const applyJobSchema = z.object({
  coverLetter: z.string().max(5000).optional(),
  resumeUrl: z.string().url().optional(),
  candidateName: z.string().min(1).max(200).optional(),
  candidateEmail: z.string().email().optional(),
  candidateAura: z.number().min(0).optional(),
  candidateCores: z.number().min(1).optional(),
  candidateSkills: z.array(z.string()).optional(),
  candidateProjects: z.array(z.any()).optional(),
  candidateExperience: z.array(z.any()).optional(),
  candidateCertifications: z.array(z.any()).optional(),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;
export type JobFiltersInput = z.infer<typeof jobFiltersSchema>;
export type ApplyJobInput = z.infer<typeof applyJobSchema>;
