import { logger } from '../utils/logger.js';
import type { CreateJobDto, JobFilters, Job, JobSkill } from '../types/index.js';
import { prisma } from '../prisma/client.js';
import { Job as PrismaJob, JobSkill as PrismaJobSkill, Prisma } from '@prisma/client';
import axios from 'axios';

// ============================================
// TYPES FOR SKILL MATCHING
// ============================================

interface UserSkill {
  name: string;
  score: number;
  isVerified: boolean;
}

interface MatchResult {
  matchScore: number; // 0-100
  matchedSkills: {
    skill: string;
    required: number;
    userScore: number;
    verified: boolean;
    status: 'met' | 'partial' | 'missing';
  }[];
  meetsMinimum: boolean;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

// Transform Prisma Job to API Job format
function transformJob(prismaJob: PrismaJob & { requiredSkills?: PrismaJobSkill[] }): Job {
  return {
    id: prismaJob.id,
    organizationId: prismaJob.organizationId,
    organization: prismaJob.organizationName ? {
      id: prismaJob.organizationId,
      name: prismaJob.organizationName,
      slug: prismaJob.organizationName.toLowerCase().replace(/\s+/g, '-'),
      size: 'MEDIUM',
      isVerified: false,
    } : undefined,
    title: prismaJob.title,
    description: prismaJob.description,
    requirements: prismaJob.requirements || '',
    responsibilities: prismaJob.responsibilities || '',
    type: prismaJob.jobType as Job['type'],
    level: prismaJob.experienceLevel as Job['level'],
    location: prismaJob.location || 'Remote',
    isRemote: prismaJob.locationType === 'REMOTE' || prismaJob.locationType === 'HYBRID',
    salaryMin: prismaJob.salaryMin || undefined,
    salaryMax: prismaJob.salaryMax || undefined,
    salaryCurrency: prismaJob.salaryCurrency,
    requiredSkills: (prismaJob.requiredSkills || []).map(skill => ({
      skillName: skill.skillName,
      minScore: skill.minScore,
      isRequired: skill.isRequired,
    })),
    minAuraScore: prismaJob.minAuraScore,
    minCoreCount: prismaJob.minCoreCount,
    status: prismaJob.status as Job['status'],
    applicationsCount: prismaJob.applicationsCount,
    viewsCount: prismaJob.viewsCount,
    createdAt: prismaJob.createdAt,
    expiresAt: prismaJob.expiresAt || undefined,
  };
}

// ============================================
// JOB SERVICE WITH PRISMA
// ============================================

export class JobService {
  /**
   * Create a new job posting
   */
  static async createJob(organizationId: string, recruiterId: string, data: CreateJobDto): Promise<Job> {
    logger.info({ organizationId, title: data.title }, 'Creating job');

    const job = await prisma.job.create({
      data: {
        organizationId,
        recruiterId,
        title: data.title,
        description: data.description,
        shortDescription: data.description.substring(0, 200),
        requirements: data.requirements,
        responsibilities: data.responsibilities,
        jobType: data.type,
        experienceLevel: data.level,
        location: data.location,
        locationType: data.isRemote ? 'REMOTE' : 'ONSITE',
        salaryMin: data.salaryMin,
        salaryMax: data.salaryMax,
        salaryCurrency: data.salaryCurrency || 'INR',
        minAuraScore: data.minAuraScore || 0,
        minCoreCount: data.minCoreCount || 1,
        status: 'ACTIVE',
        expiresAt: data.expiresAt,
        requiredSkills: {
          create: data.requiredSkills.map(skill => ({
            skillName: skill.skillName,
            minScore: skill.minScore,
            isRequired: skill.isRequired,
          })),
        },
      },
      include: {
        requiredSkills: true,
      },
    });

    return transformJob(job);
  }

  /**
   * Get jobs with filters and pagination
   */
  static async getJobs(filters: JobFilters, page = 1, limit = 20): Promise<{ jobs: Job[]; total: number }> {
    logger.debug({ filters, page, limit }, 'Fetching jobs');

    const where: Prisma.JobWhereInput = {
      status: 'ACTIVE',
    };

    // Apply filters
    if (filters.type) {
      where.jobType = filters.type;
    }
    if (filters.level) {
      where.experienceLevel = filters.level;
    }
    if (filters.isRemote !== undefined) {
      where.locationType = filters.isRemote ? { in: ['REMOTE', 'HYBRID'] } : 'ONSITE';
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
        { organizationName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters.skills && filters.skills.length > 0) {
      where.requiredSkills = {
        some: {
          skillName: { in: filters.skills, mode: 'insensitive' },
        },
      };
    }

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        include: { requiredSkills: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.job.count({ where }),
    ]);

    return { jobs: jobs.map(transformJob), total };
  }

  /**
   * Get job by ID
   */
  static async getJobById(jobId: string): Promise<Job | null> {
    logger.debug({ jobId }, 'Fetching job');
    
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { requiredSkills: true },
    });

    return job ? transformJob(job) : null;
  }

  /**
   * Get matched jobs for a user based on their skills
   */
  static async getMatchedJobs(
    userId: string, 
    userSkills: UserSkill[], 
    auraScore: number
  ): Promise<(Job & { matchResult: MatchResult })[]> {
    logger.debug({ userId, skillCount: userSkills.length, auraScore }, 'Finding matched jobs');

    const jobs = await prisma.job.findMany({
      where: { status: 'ACTIVE' },
      include: { requiredSkills: true },
    });

    const matchedJobs = jobs.map(prismaJob => {
      const job = transformJob(prismaJob);
      const matchResult = this.calculateSkillMatch(userSkills, job.requiredSkills, auraScore, job.minAuraScore);
      return { ...job, matchResult };
    });

    // Filter jobs where user meets minimum requirements
    const qualifiedJobs = matchedJobs.filter(job => job.matchResult.meetsMinimum);

    // Sort by match score
    qualifiedJobs.sort((a, b) => b.matchResult.matchScore - a.matchResult.matchScore);

    return qualifiedJobs.slice(0, 20); // Return top 20
  }

  /**
   * Get recommended jobs based on user profile
   * Fetches user data from user-service
   */
  static async getRecommendedJobs(userId: string): Promise<(Job & { matchResult: MatchResult })[]> {
    try {
      // Fetch user skills from user-service
      const userDataResponse = await axios.get(
        `http://user-service:3002/api/v1/users/${userId}/skills-summary`,
        { timeout: 5000 }
      );

      const userData = userDataResponse.data.data;
      const userSkills: UserSkill[] = userData.skills || [];
      const auraScore: number = userData.auraScore || 0;

      return this.getMatchedJobs(userId, userSkills, auraScore);
    } catch (error) {
      logger.error({ error, userId }, 'Failed to fetch user data for recommendations');
      // Return all jobs if we can't get user data
      const jobs = await prisma.job.findMany({
        where: { status: 'ACTIVE' },
        include: { requiredSkills: true },
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
      
      return jobs.map(prismaJob => ({
        ...transformJob(prismaJob),
        matchResult: {
          matchScore: 50,
          matchedSkills: [],
          meetsMinimum: true,
        }
      }));
    }
  }

  /**
   * Calculate skill match between user and job
   */
  static calculateSkillMatch(
    userSkills: UserSkill[],
    jobSkills: JobSkill[],
    userAura: number,
    minAura: number
  ): MatchResult {
    if (!jobSkills || jobSkills.length === 0) {
      return {
        matchScore: userAura >= minAura ? 100 : 0,
        matchedSkills: [],
        meetsMinimum: userAura >= minAura,
      };
    }

    const matchedSkills: MatchResult['matchedSkills'] = [];
    let totalScore = 0;
    let requiredMet = true;

    for (const jobSkill of jobSkills) {
      const userSkill = userSkills.find(
        s => s.name.toLowerCase() === jobSkill.skillName.toLowerCase()
      );

      if (userSkill) {
        const meetsRequirement = userSkill.score >= jobSkill.minScore;
        
        // Verified skills get bonus
        const verifiedBonus = userSkill.isVerified ? 1.2 : 1.0;
        const contributionScore = Math.min(100, (userSkill.score / jobSkill.minScore) * 100 * verifiedBonus);
        
        totalScore += contributionScore;
        matchedSkills.push({
          skill: jobSkill.skillName,
          required: jobSkill.minScore,
          userScore: userSkill.score,
          verified: userSkill.isVerified,
          status: meetsRequirement ? 'met' : 'partial',
        });

        if (jobSkill.isRequired && !meetsRequirement) {
          requiredMet = false;
        }
      } else {
        matchedSkills.push({
          skill: jobSkill.skillName,
          required: jobSkill.minScore,
          userScore: 0,
          verified: false,
          status: 'missing',
        });

        if (jobSkill.isRequired) {
          requiredMet = false;
        }
      }
    }

    const matchScore = Math.round(totalScore / jobSkills.length);
    const meetsMinimum = requiredMet && userAura >= minAura;

    return {
      matchScore: Math.min(100, matchScore),
      matchedSkills,
      meetsMinimum,
    };
  }

  /**
   * Increment view count
   */
  static async incrementViews(jobId: string): Promise<void> {
    logger.debug({ jobId }, 'Incrementing views');
    
    await prisma.job.update({
      where: { id: jobId },
      data: { viewsCount: { increment: 1 } },
    });
  }

  /**
   * Increment application count
   */
  static async incrementApplications(jobId: string): Promise<void> {
    await prisma.job.update({
      where: { id: jobId },
      data: { applicationsCount: { increment: 1 } },
    });
  }

  /**
   * Update job status
   */
  static async updateJobStatus(jobId: string, status: 'ACTIVE' | 'PAUSED' | 'CLOSED'): Promise<Job | null> {
    logger.info({ jobId, status }, 'Updating job status');
    
    const job = await prisma.job.update({
      where: { id: jobId },
      data: { status },
      include: { requiredSkills: true },
    });

    return transformJob(job);
  }

  /**
   * Delete job
   */
  static async deleteJob(jobId: string): Promise<boolean> {
    logger.info({ jobId }, 'Deleting job');
    
    try {
      await prisma.job.delete({ where: { id: jobId } });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Search jobs with advanced filters
   */
  static async searchJobs(params: {
    query?: string;
    skills?: string[];
    type?: string[];
    level?: string[];
    isRemote?: boolean;
    salaryMin?: number;
    salaryMax?: number;
    location?: string;
    sortBy?: 'relevance' | 'date' | 'salary';
    page?: number;
    limit?: number;
  }): Promise<{ jobs: Job[]; total: number; page: number; totalPages: number }> {
    const where: Prisma.JobWhereInput = {
      status: 'ACTIVE',
    };

    // Text search
    if (params.query) {
      where.OR = [
        { title: { contains: params.query, mode: 'insensitive' } },
        { description: { contains: params.query, mode: 'insensitive' } },
        { organizationName: { contains: params.query, mode: 'insensitive' } },
      ];
    }

    // Skills filter
    if (params.skills && params.skills.length > 0) {
      where.requiredSkills = {
        some: {
          skillName: { in: params.skills, mode: 'insensitive' },
        },
      };
    }

    // Type filter
    if (params.type && params.type.length > 0) {
      where.jobType = { in: params.type as any };
    }

    // Level filter
    if (params.level && params.level.length > 0) {
      where.experienceLevel = { in: params.level as any };
    }

    // Remote filter
    if (params.isRemote !== undefined) {
      where.locationType = params.isRemote ? { in: ['REMOTE', 'HYBRID'] } : 'ONSITE';
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
    let orderBy: Prisma.JobOrderByWithRelationInput;
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
      prisma.job.findMany({
        where,
        include: { requiredSkills: true },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.job.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return { jobs: jobs.map(transformJob), total, page, totalPages };
  }

  /**
   * Seed demo jobs for development
   */
  static async seedDemoJobs(): Promise<void> {
    const existingCount = await prisma.job.count();
    if (existingCount > 0) {
      logger.info('Demo jobs already exist, skipping seed');
      return;
    }

    logger.info('Seeding demo jobs...');

    const demoJobs = [
      {
        organizationId: '64f0c79b5c3d2e1a8b9c0d1e', // org_demo
        recruiterId: '64f0c79b5c3d2e1a8b9c0d1f',    // recruiter_demo
        organizationName: 'TechCorp',
        title: 'Senior React Developer',
        description: 'We are looking for a Senior React Developer to join our team...',
        shortDescription: 'Senior React Developer position at TechCorp',
        requirements: '5+ years of experience with React, TypeScript, and modern frontend tools.',
        responsibilities: 'Lead frontend architecture, mentor juniors, implement features.',
        jobType: 'FULL_TIME' as const,
        experienceLevel: 'SENIOR' as const,
        location: 'Bangalore, India',
        locationType: 'HYBRID' as const,
        salaryMin: 2000000,
        salaryMax: 3500000,
        salaryCurrency: 'INR',
        minAuraScore: 300,
        minCoreCount: 2,
        status: 'ACTIVE' as const,
        requiredSkills: {
          create: [
            { skillName: 'React', minScore: 70, isRequired: true },
            { skillName: 'TypeScript', minScore: 60, isRequired: true },
            { skillName: 'JavaScript', minScore: 80, isRequired: true },
            { skillName: 'Node.js', minScore: 50, isRequired: false },
          ],
        },
      },
      {
        organizationId: '64f0c79b5c3d2e1a8b9c0d20', // org_startup
        recruiterId: '64f0c79b5c3d2e1a8b9c0d21',    // recruiter_startup
        organizationName: 'StartupX',
        title: 'Full Stack Developer',
        description: 'Join our fast-growing startup as a Full Stack Developer...',
        shortDescription: 'Full Stack Developer at fast-growing StartupX',
        requirements: '2+ years of experience with React and Node.js.',
        responsibilities: 'Build features end-to-end, work directly with founders.',
        jobType: 'FULL_TIME' as const,
        experienceLevel: 'MID' as const,
        location: 'Remote',
        locationType: 'REMOTE' as const,
        salaryMin: 1000000,
        salaryMax: 1800000,
        salaryCurrency: 'INR',
        minAuraScore: 100,
        minCoreCount: 1,
        status: 'ACTIVE' as const,
        requiredSkills: {
          create: [
            { skillName: 'React', minScore: 50, isRequired: true },
            { skillName: 'Node.js', minScore: 50, isRequired: true },
            { skillName: 'PostgreSQL', minScore: 40, isRequired: false },
          ],
        },
      },
      {
        organizationId: '64f0c79b5c3d2e1a8b9c0d22', // org_enterprise
        recruiterId: '64f0c79b5c3d2e1a8b9c0d23',    // recruiter_enterprise
        organizationName: 'Enterprise Corp',
        title: 'Go Backend Developer',
        description: 'Looking for Go developer to build high-performance microservices...',
        shortDescription: 'Go Backend Developer for microservices',
        requirements: '3+ years Go experience, microservices architecture.',
        responsibilities: 'Design and build microservices, optimize performance.',
        jobType: 'FULL_TIME' as const,
        experienceLevel: 'SENIOR' as const,
        location: 'Mumbai, India',
        locationType: 'ONSITE' as const,
        salaryMin: 2500000,
        salaryMax: 4000000,
        salaryCurrency: 'INR',
        minAuraScore: 400,
        minCoreCount: 3,
        status: 'ACTIVE' as const,
        requiredSkills: {
          create: [
            { skillName: 'Go', minScore: 70, isRequired: true },
            { skillName: 'Docker', minScore: 50, isRequired: true },
            { skillName: 'PostgreSQL', minScore: 60, isRequired: true },
            { skillName: 'Redis', minScore: 40, isRequired: false },
          ],
        },
      },
      {
        organizationId: '64f0c79b5c3d2e1a8b9c0d1e', // org_demo
        recruiterId: '64f0c79b5c3d2e1a8b9c0d1f',    // recruiter_demo
        organizationName: 'TechCorp',
        title: 'Python Data Engineer',
        description: 'Join our data team to build ETL pipelines...',
        shortDescription: 'Python Data Engineer for ETL pipelines',
        requirements: 'Strong Python skills, experience with data pipelines.',
        responsibilities: 'Build data pipelines, maintain data warehouse.',
        jobType: 'FULL_TIME' as const,
        experienceLevel: 'MID' as const,
        location: 'Hyderabad, India',
        locationType: 'HYBRID' as const,
        salaryMin: 1500000,
        salaryMax: 2500000,
        salaryCurrency: 'INR',
        minAuraScore: 200,
        minCoreCount: 1,
        status: 'ACTIVE' as const,
        requiredSkills: {
          create: [
            { skillName: 'Python', minScore: 70, isRequired: true },
            { skillName: 'SQL', minScore: 60, isRequired: true },
            { skillName: 'Apache Spark', minScore: 40, isRequired: false },
          ],
        },
      },
      {
        organizationId: '64f0c79b5c3d2e1a8b9c0d20', // org_startup
        recruiterId: '64f0c79b5c3d2e1a8b9c0d21',    // recruiter_startup
        organizationName: 'StartupX',
        title: 'Frontend Intern',
        description: 'Great opportunity for freshers to learn and grow...',
        shortDescription: 'Frontend Intern position for freshers',
        requirements: 'Basic HTML/CSS/JS knowledge, willingness to learn.',
        responsibilities: 'Assist in building UI components, learn from seniors.',
        jobType: 'INTERNSHIP' as const,
        experienceLevel: 'ENTRY' as const,
        location: 'Remote',
        locationType: 'REMOTE' as const,
        salaryMin: 15000,
        salaryMax: 25000,
        salaryCurrency: 'INR',
        minAuraScore: 0,
        minCoreCount: 1,
        status: 'ACTIVE' as const,
        requiredSkills: {
          create: [
            { skillName: 'JavaScript', minScore: 20, isRequired: true },
            { skillName: 'HTML', minScore: 30, isRequired: true },
            { skillName: 'CSS', minScore: 30, isRequired: true },
          ],
        },
      },
    ];

    for (const jobData of demoJobs) {
      await prisma.job.create({ data: jobData });
    }

    logger.info(`Seeded ${demoJobs.length} demo jobs`);
  }
}

export default JobService;
