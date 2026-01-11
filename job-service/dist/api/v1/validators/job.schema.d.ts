import { z } from 'zod';
export declare const createJobSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodString;
    requirements: z.ZodDefault<z.ZodString>;
    responsibilities: z.ZodDefault<z.ZodString>;
    type: z.ZodEnum<["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "FREELANCE"]>;
    level: z.ZodEnum<["ENTRY", "JUNIOR", "MID", "SENIOR", "LEAD", "PRINCIPAL"]>;
    location: z.ZodString;
    isRemote: z.ZodDefault<z.ZodBoolean>;
    salaryMin: z.ZodOptional<z.ZodNumber>;
    salaryMax: z.ZodOptional<z.ZodNumber>;
    salaryCurrency: z.ZodDefault<z.ZodString>;
    requiredSkills: z.ZodArray<z.ZodString, "many">;
    preferredSkills: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    minAuraScore: z.ZodDefault<z.ZodNumber>;
    minCoreCount: z.ZodDefault<z.ZodNumber>;
    expiresAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP" | "FREELANCE";
    level: "ENTRY" | "JUNIOR" | "MID" | "SENIOR" | "LEAD" | "PRINCIPAL";
    title: string;
    description: string;
    requirements: string;
    responsibilities: string;
    location: string;
    isRemote: boolean;
    salaryCurrency: string;
    requiredSkills: string[];
    preferredSkills: string[];
    minAuraScore: number;
    minCoreCount: number;
    salaryMin?: number | undefined;
    salaryMax?: number | undefined;
    expiresAt?: string | undefined;
}, {
    type: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP" | "FREELANCE";
    level: "ENTRY" | "JUNIOR" | "MID" | "SENIOR" | "LEAD" | "PRINCIPAL";
    title: string;
    description: string;
    location: string;
    requiredSkills: string[];
    requirements?: string | undefined;
    responsibilities?: string | undefined;
    isRemote?: boolean | undefined;
    salaryMin?: number | undefined;
    salaryMax?: number | undefined;
    salaryCurrency?: string | undefined;
    preferredSkills?: string[] | undefined;
    minAuraScore?: number | undefined;
    minCoreCount?: number | undefined;
    expiresAt?: string | undefined;
}>;
export declare const jobFiltersSchema: z.ZodObject<{
    type: z.ZodOptional<z.ZodEnum<["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "FREELANCE"]>>;
    level: z.ZodOptional<z.ZodEnum<["ENTRY", "JUNIOR", "MID", "SENIOR", "LEAD", "PRINCIPAL"]>>;
    isRemote: z.ZodOptional<z.ZodBoolean>;
    skills: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    minSalary: z.ZodOptional<z.ZodNumber>;
    location: z.ZodOptional<z.ZodString>;
    search: z.ZodOptional<z.ZodString>;
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    type?: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP" | "FREELANCE" | undefined;
    level?: "ENTRY" | "JUNIOR" | "MID" | "SENIOR" | "LEAD" | "PRINCIPAL" | undefined;
    location?: string | undefined;
    isRemote?: boolean | undefined;
    skills?: string[] | undefined;
    minSalary?: number | undefined;
    search?: string | undefined;
}, {
    type?: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP" | "FREELANCE" | undefined;
    level?: "ENTRY" | "JUNIOR" | "MID" | "SENIOR" | "LEAD" | "PRINCIPAL" | undefined;
    location?: string | undefined;
    isRemote?: boolean | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    skills?: string[] | undefined;
    minSalary?: number | undefined;
    search?: string | undefined;
}>;
export declare const applyJobSchema: z.ZodObject<{
    coverLetter: z.ZodOptional<z.ZodString>;
    resumeUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    coverLetter?: string | undefined;
    resumeUrl?: string | undefined;
}, {
    coverLetter?: string | undefined;
    resumeUrl?: string | undefined;
}>;
export type CreateJobInput = z.infer<typeof createJobSchema>;
export type JobFiltersInput = z.infer<typeof jobFiltersSchema>;
export type ApplyJobInput = z.infer<typeof applyJobSchema>;
