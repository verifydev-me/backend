# Backend Implementation Guide 🔧

> **Step-by-step technical guide for implementing remaining backend features**

---

## 📊 Service Status Overview

| Service | Language | Port | Completion | Priority |
|---------|----------|------|------------|----------|
| auth-service | Node.js | 3001 | ✅ 95% | - |
| user-service | Node.js | 3002 | 🟡 75% | HIGH |
| job-service | Node.js | 3004 | 🟡 60% | HIGH |
| recruiter-service | Node.js | 3005 | 🔴 40% | HIGH |
| aura-processor | Node.js | Worker | 🟡 70% | MEDIUM |
| project-analyzer | Go | 8001 | 🟡 65% | MEDIUM |
| resume-service | Go | 8003 | 🔴 30% | HIGH |

---

## 🔴 STEP 1: User Service Enhancements

### 1.1 Database Schema Updates

**File:** `/user-service/prisma/schema.prisma`

Add these fields to the User model:

```prisma
model User {
  id                    String    @id @default(uuid())
  githubId              String    @unique @map("github_id")
  username              String    @unique
  email                 String?
  name                  String?
  avatarUrl             String?   @map("avatar_url")
  bio                   String?
  location              String?
  company               String?
  website               String?
  twitter               String?
  isOpenToWork          Boolean   @default(false) @map("is_open_to_work")
  
  // ========== NEW FIELDS ==========
  // Student Information
  isStudent             Boolean   @default(false) @map("is_student")
  collegeName           String?   @map("college_name")
  collegeYear           Int?      @map("college_year") // 1, 2, 3, 4
  cgpa                  Decimal?  @db.Decimal(3, 2) @map("cgpa") // e.g., 8.75
  graduationYear        Int?      @map("graduation_year")
  branch                String?   // Computer Science, etc.
  
  // Onboarding Status
  onboardingComplete    Boolean   @default(false) @map("onboarding_complete")
  onboardingStep        Int       @default(0) @map("onboarding_step")
  
  // Profile Visibility
  isProfilePublic       Boolean   @default(true) @map("is_profile_public")
  showEmail             Boolean   @default(false) @map("show_email")
  showCgpa              Boolean   @default(false) @map("show_cgpa")
  // ================================
  
  githubAccessToken     String?   @map("github_access_token")
  
  createdAt             DateTime  @default(now()) @map("created_at")
  updatedAt             DateTime  @updatedAt @map("updated_at")
  
  // Relations
  skills                Skill[]
  projects              Project[]
  experiences           Experience[]
  education             Education[]
  certifications        Certification[]
  auraScore             AuraScore?
  applications          Application[]
  
  @@map("users")
}

// ========== ENHANCED SKILL MODEL ==========
model Skill {
  id                String       @id @default(uuid())
  userId            String       @map("user_id")
  name              String
  category          SkillCategory @default(OTHER)
  
  // Verification
  source            SkillSource  @default(MANUAL)
  isVerified        Boolean      @default(false) @map("is_verified")
  verifiedAt        DateTime?    @map("verified_at")
  
  // Scoring
  score             Int          @default(0) // 0-100
  evidence          Json?        // { projects: [], commits: [], etc. }
  
  // Self-declared (for manual skills)
  selfDeclaredLevel SkillLevel?  @map("self_declared_level")
  
  createdAt         DateTime     @default(now()) @map("created_at")
  updatedAt         DateTime     @updatedAt @map("updated_at")
  
  user              User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([userId, name])
  @@map("skills")
}

enum SkillCategory {
  LANGUAGE
  FRAMEWORK
  DATABASE
  DEVOPS
  CLOUD
  TOOL
  LIBRARY
  OTHER
}

enum SkillSource {
  GITHUB      // From GitHub languages/repos
  ANALYSIS    // From project analyzer (verified)
  MANUAL      // User declared (unverified)
}

enum SkillLevel {
  BEGINNER
  INTERMEDIATE
  ADVANCED
  EXPERT
}
```

### 1.2 Run Migration

```bash
cd user-service
npx prisma migrate dev --name add_student_and_skill_fields
npx prisma generate
```

---

### 1.3 Onboarding Service

**File:** `/user-service/src/domain/onboarding.service.ts`

```typescript
import { PrismaClient, User } from '@prisma/client';

interface OnboardingStep1 {
  name: string;
  bio?: string;
}

interface OnboardingStep2 {
  isStudent: boolean;
  collegeName?: string;
  collegeYear?: number;
  cgpa?: number;
  graduationYear?: number;
  branch?: string;
}

interface OnboardingStep3 {
  selectedRepos: string[]; // repo URLs to analyze
}

export class OnboardingService {
  constructor(private prisma: PrismaClient) {}

  async getOnboardingStatus(userId: string): Promise<{
    complete: boolean;
    currentStep: number;
    missingFields: string[];
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        onboardingComplete: true,
        onboardingStep: true,
      }
    });

    if (!user) throw new Error('User not found');

    const missingFields: string[] = [];
    if (!user.name) missingFields.push('name');

    return {
      complete: user.onboardingComplete,
      currentStep: user.onboardingStep,
      missingFields,
    };
  }

  async updateStep1(userId: string, data: OnboardingStep1): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        bio: data.bio,
        onboardingStep: 2,
      }
    });
  }

  async updateStep2(userId: string, data: OnboardingStep2): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        isStudent: data.isStudent,
        collegeName: data.collegeName,
        collegeYear: data.collegeYear,
        cgpa: data.cgpa,
        graduationYear: data.graduationYear,
        branch: data.branch,
        onboardingStep: 3,
      }
    });
  }

  async skipStep2(userId: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        isStudent: false,
        onboardingStep: 3,
      }
    });
  }

  async completeOnboarding(userId: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        onboardingComplete: true,
        onboardingStep: 4,
      }
    });
  }
}
```

---

### 1.4 Onboarding Routes

**File:** `/user-service/src/api/routes/onboarding.routes.ts`

```typescript
import { Router } from 'express';
import { OnboardingController } from '../controllers/onboarding.controller';
import { authenticateToken } from '../../middlewares/auth.middleware';

const router = Router();
const controller = new OnboardingController();

// All routes require authentication
router.use(authenticateToken);

// Get onboarding status
router.get('/status', controller.getStatus);

// Update step 1 (basic info)
router.post('/step/1', controller.updateStep1);

// Update step 2 (student info) or skip
router.post('/step/2', controller.updateStep2);
router.post('/step/2/skip', controller.skipStep2);

// Complete onboarding
router.post('/complete', controller.complete);

export default router;
```

---

### 1.5 Skills Protection Middleware

**File:** `/user-service/src/middlewares/skill-protection.middleware.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { PrismaClient, SkillSource } from '@prisma/client';

const prisma = new PrismaClient();

export async function protectVerifiedSkills(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const skillId = req.params.id;
  const userId = req.user?.id;

  if (!skillId || !userId) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  try {
    const skill = await prisma.skill.findUnique({
      where: { id: skillId }
    });

    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    // Check if skill belongs to user
    if (skill.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Block modification of verified skills
    if (skill.source === SkillSource.ANALYSIS && skill.isVerified) {
      return res.status(403).json({
        error: 'Cannot modify verified skills',
        message: 'Skills verified through project analysis cannot be edited. Add projects to improve your skill scores.',
        code: 'SKILL_VERIFIED'
      });
    }

    // Block modification of GitHub-sourced skills
    if (skill.source === SkillSource.GITHUB) {
      return res.status(403).json({
        error: 'Cannot modify GitHub-sourced skills',
        message: 'These skills are synced from your GitHub profile.',
        code: 'SKILL_GITHUB_SOURCED'
      });
    }

    next();
  } catch (error) {
    console.error('Skill protection error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

---

### 1.6 Skills Routes Update

**File:** `/user-service/src/api/routes/skill.routes.ts`

```typescript
import { Router } from 'express';
import { SkillController } from '../controllers/skill.controller';
import { authenticateToken } from '../../middlewares/auth.middleware';
import { protectVerifiedSkills } from '../../middlewares/skill-protection.middleware';

const router = Router();
const controller = new SkillController();

router.use(authenticateToken);

// Get all skills for current user
router.get('/', controller.getMySkills);

// Get skills by category
router.get('/category/:category', controller.getByCategory);

// Add manual skill (unverified)
router.post('/manual', controller.addManualSkill);

// Update manual skill only (protected)
router.put('/:id', protectVerifiedSkills, controller.updateSkill);

// Delete manual skill only (protected)
router.delete('/:id', protectVerifiedSkills, controller.deleteSkill);

// Get skill details with evidence
router.get('/:id/evidence', controller.getSkillEvidence);

export default router;
```

---

## 🔴 STEP 2: Job Service Enhancements

### 2.1 Enhanced Job Schema

**File:** `/job-service/prisma/schema.prisma`

```prisma
model Job {
  id                String      @id @default(uuid())
  recruiterId       String      @map("recruiter_id")
  companyId         String?     @map("company_id")
  
  // Basic Info
  title             String
  description       String
  shortDescription  String?     @map("short_description") @db.VarChar(300)
  
  // Skills
  requiredSkills    Json        @map("required_skills") // [{ name: "React", minScore: 50 }]
  preferredSkills   Json?       @map("preferred_skills")
  
  // Experience
  experienceMin     Int         @default(0) @map("experience_min")
  experienceMax     Int?        @map("experience_max")
  
  // Salary
  salaryMin         Int?        @map("salary_min")
  salaryMax         Int?        @map("salary_max")
  salaryCurrency    String      @default("INR") @map("salary_currency")
  showSalary        Boolean     @default(true) @map("show_salary")
  
  // Location
  locationType      LocationType @default(REMOTE) @map("location_type")
  city              String?
  country           String?
  
  // Job Type
  jobType           JobType     @default(FULLTIME) @map("job_type")
  
  // Status
  status            JobStatus   @default(ACTIVE)
  applicationCount  Int         @default(0) @map("application_count")
  viewCount         Int         @default(0) @map("view_count")
  
  // Dates
  deadline          DateTime?
  createdAt         DateTime    @default(now()) @map("created_at")
  updatedAt         DateTime    @updatedAt @map("updated_at")
  
  // Relations
  applications      Application[]
  
  @@map("jobs")
}

model Application {
  id              String            @id @default(uuid())
  userId          String            @map("user_id")
  jobId           String            @map("job_id")
  
  // Match Data
  matchScore      Int               @default(0) @map("match_score") // 0-100
  matchBreakdown  Json?             @map("match_breakdown")
  
  // Resume
  resumeUrl       String?           @map("resume_url")
  resumeSnapshot  Json?             @map("resume_snapshot") // Copy of resume at apply time
  
  // Optional
  coverLetter     String?           @map("cover_letter")
  
  // Status
  status          ApplicationStatus @default(APPLIED)
  
  // Recruiter Notes
  recruiterNotes  String?           @map("recruiter_notes")
  
  // Dates
  appliedAt       DateTime          @default(now()) @map("applied_at")
  reviewedAt      DateTime?         @map("reviewed_at")
  updatedAt       DateTime          @updatedAt @map("updated_at")
  
  // Relations
  job             Job               @relation(fields: [jobId], references: [id], onDelete: Cascade)
  
  @@unique([userId, jobId])
  @@map("applications")
}

enum LocationType {
  REMOTE
  ONSITE
  HYBRID
}

enum JobType {
  FULLTIME
  PARTTIME
  CONTRACT
  INTERNSHIP
  FREELANCE
}

enum JobStatus {
  DRAFT
  ACTIVE
  PAUSED
  CLOSED
  EXPIRED
}

enum ApplicationStatus {
  APPLIED
  VIEWED
  SHORTLISTED
  INTERVIEWING
  OFFERED
  REJECTED
  WITHDRAWN
  HIRED
}
```

---

### 2.2 Job Search Service

**File:** `/job-service/src/domain/job-search.service.ts`

```typescript
import { PrismaClient, Prisma } from '@prisma/client';

interface JobSearchFilters {
  skills?: string[];
  experienceMin?: number;
  experienceMax?: number;
  salaryMin?: number;
  salaryMax?: number;
  locationType?: ('REMOTE' | 'ONSITE' | 'HYBRID')[];
  jobType?: ('FULLTIME' | 'PARTTIME' | 'CONTRACT' | 'INTERNSHIP')[];
  city?: string;
  keyword?: string;
}

interface JobSearchSort {
  field: 'createdAt' | 'salary' | 'relevance';
  order: 'asc' | 'desc';
}

interface PaginationParams {
  page: number;
  limit: number;
}

export class JobSearchService {
  constructor(private prisma: PrismaClient) {}

  async searchJobs(
    filters: JobSearchFilters,
    sort: JobSearchSort = { field: 'createdAt', order: 'desc' },
    pagination: PaginationParams = { page: 1, limit: 20 }
  ) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.JobWhereInput = {
      status: 'ACTIVE',
      OR: filters.keyword ? [
        { title: { contains: filters.keyword, mode: 'insensitive' } },
        { description: { contains: filters.keyword, mode: 'insensitive' } },
      ] : undefined,
      experienceMin: filters.experienceMax 
        ? { lte: filters.experienceMax }
        : undefined,
      locationType: filters.locationType?.length 
        ? { in: filters.locationType }
        : undefined,
      jobType: filters.jobType?.length 
        ? { in: filters.jobType }
        : undefined,
      city: filters.city 
        ? { contains: filters.city, mode: 'insensitive' }
        : undefined,
    };

    // Build orderBy
    let orderBy: Prisma.JobOrderByWithRelationInput = {};
    switch (sort.field) {
      case 'salary':
        orderBy = { salaryMax: sort.order };
        break;
      case 'createdAt':
      default:
        orderBy = { createdAt: sort.order };
    }

    const [jobs, total] = await Promise.all([
      this.prisma.job.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          shortDescription: true,
          requiredSkills: true,
          experienceMin: true,
          experienceMax: true,
          salaryMin: true,
          salaryMax: true,
          salaryCurrency: true,
          showSalary: true,
          locationType: true,
          city: true,
          jobType: true,
          applicationCount: true,
          createdAt: true,
        }
      }),
      this.prisma.job.count({ where })
    ]);

    // Filter by skills if provided (post-query filtering for JSON field)
    let filteredJobs = jobs;
    if (filters.skills?.length) {
      filteredJobs = jobs.filter(job => {
        const requiredSkills = job.requiredSkills as { name: string }[];
        return filters.skills!.some(skill => 
          requiredSkills.some(rs => 
            rs.name.toLowerCase() === skill.toLowerCase()
          )
        );
      });
    }

    return {
      data: filteredJobs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      }
    };
  }

  async getRecommendedJobs(userId: string, limit: number = 10) {
    // Get user's verified skills
    const userSkills = await this.prisma.$queryRaw<{ name: string; score: number }[]>`
      SELECT name, score FROM skills 
      WHERE user_id = ${userId} 
      AND is_verified = true 
      ORDER BY score DESC 
      LIMIT 10
    `;

    if (!userSkills.length) {
      // Return latest jobs if no skills
      return this.prisma.job.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
    }

    // Get all active jobs
    const allJobs = await this.prisma.job.findMany({
      where: { status: 'ACTIVE' },
      take: 100, // Max to consider
    });

    // Calculate match scores
    const jobsWithScores = allJobs.map(job => {
      const requiredSkills = (job.requiredSkills as { name: string; minScore?: number }[]) || [];
      const matchScore = this.calculateMatchScore(userSkills, requiredSkills);
      return { ...job, matchScore };
    });

    // Sort by match score and return top matches
    return jobsWithScores
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);
  }

  private calculateMatchScore(
    userSkills: { name: string; score: number }[],
    requiredSkills: { name: string; minScore?: number }[]
  ): number {
    if (!requiredSkills.length) return 50; // Default score

    let matchedScore = 0;
    let totalWeight = 0;

    for (const required of requiredSkills) {
      const userSkill = userSkills.find(
        s => s.name.toLowerCase() === required.name.toLowerCase()
      );

      totalWeight += 1;
      
      if (userSkill) {
        const minScore = required.minScore || 0;
        if (userSkill.score >= minScore) {
          matchedScore += 1;
        } else {
          // Partial match
          matchedScore += (userSkill.score / minScore) * 0.5;
        }
      }
    }

    return Math.round((matchedScore / totalWeight) * 100);
  }
}
```

---

### 2.3 Application Service

**File:** `/job-service/src/domain/application.service.ts`

```typescript
import { PrismaClient, ApplicationStatus } from '@prisma/client';
import axios from 'axios';

interface ApplyJobData {
  userId: string;
  jobId: string;
  coverLetter?: string;
}

export class ApplicationService {
  constructor(private prisma: PrismaClient) {}

  async applyToJob(data: ApplyJobData) {
    const { userId, jobId, coverLetter } = data;

    // Check if already applied
    const existing = await this.prisma.application.findUnique({
      where: {
        userId_jobId: { userId, jobId }
      }
    });

    if (existing) {
      throw new Error('Already applied to this job');
    }

    // Get job details
    const job = await this.prisma.job.findUnique({
      where: { id: jobId }
    });

    if (!job || job.status !== 'ACTIVE') {
      throw new Error('Job not found or not active');
    }

    // Get user skills for match calculation
    const userSkills = await this.getUserSkills(userId);
    const requiredSkills = (job.requiredSkills as { name: string; minScore?: number }[]) || [];
    
    // Calculate match score
    const { score, breakdown } = this.calculateDetailedMatch(userSkills, requiredSkills);

    // Get user resume URL (from resume-service)
    const resumeUrl = await this.getUserResumeUrl(userId);

    // Get resume snapshot
    const resumeSnapshot = await this.getResumeSnapshot(userId);

    // Create application
    const application = await this.prisma.application.create({
      data: {
        userId,
        jobId,
        coverLetter,
        matchScore: score,
        matchBreakdown: breakdown,
        resumeUrl,
        resumeSnapshot,
      }
    });

    // Increment application count
    await this.prisma.job.update({
      where: { id: jobId },
      data: { applicationCount: { increment: 1 } }
    });

    // TODO: Send notification to recruiter
    // await this.notifyRecruiter(job.recruiterId, application);

    return application;
  }

  async getMyApplications(userId: string) {
    return this.prisma.application.findMany({
      where: { userId },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            locationType: true,
            city: true,
            jobType: true,
            status: true,
          }
        }
      },
      orderBy: { appliedAt: 'desc' }
    });
  }

  async withdrawApplication(userId: string, applicationId: string) {
    const application = await this.prisma.application.findFirst({
      where: {
        id: applicationId,
        userId,
      }
    });

    if (!application) {
      throw new Error('Application not found');
    }

    if (application.status === 'WITHDRAWN') {
      throw new Error('Already withdrawn');
    }

    return this.prisma.application.update({
      where: { id: applicationId },
      data: { status: 'WITHDRAWN' }
    });
  }

  private async getUserSkills(userId: string) {
    // Call user-service or use direct DB query
    const skills = await this.prisma.$queryRaw<
      { name: string; score: number; isVerified: boolean }[]
    >`
      SELECT name, score, is_verified as "isVerified"
      FROM skills
      WHERE user_id = ${userId}
      ORDER BY score DESC
    `;
    return skills;
  }

  private calculateDetailedMatch(
    userSkills: { name: string; score: number; isVerified: boolean }[],
    requiredSkills: { name: string; minScore?: number }[]
  ) {
    const breakdown: { skill: string; required: number; userScore: number; verified: boolean }[] = [];
    let totalScore = 0;

    for (const required of requiredSkills) {
      const userSkill = userSkills.find(
        s => s.name.toLowerCase() === required.name.toLowerCase()
      );

      breakdown.push({
        skill: required.name,
        required: required.minScore || 0,
        userScore: userSkill?.score || 0,
        verified: userSkill?.isVerified || false,
      });

      if (userSkill) {
        const minScore = required.minScore || 50;
        const factor = userSkill.isVerified ? 1.2 : 1.0; // Bonus for verified
        totalScore += Math.min(100, (userSkill.score / minScore) * 100 * factor);
      }
    }

    const score = requiredSkills.length > 0 
      ? Math.round(totalScore / requiredSkills.length)
      : 50;

    return { score, breakdown };
  }

  private async getUserResumeUrl(userId: string): Promise<string | null> {
    try {
      // Call resume-service to get latest resume URL
      const response = await axios.get(
        `http://resume-service:8003/api/v1/resume/user/${userId}/url`
      );
      return response.data.url;
    } catch {
      return null;
    }
  }

  private async getResumeSnapshot(userId: string): Promise<object | null> {
    try {
      // Get current profile data snapshot
      const response = await axios.get(
        `http://user-service:3002/api/v1/users/${userId}/resume-data`
      );
      return response.data;
    } catch {
      return null;
    }
  }
}
```

---

## 🔴 STEP 3: Recruiter Service Enhancement

### 3.1 Recruiter Authentication

**File:** `/recruiter-service/prisma/schema.prisma`

```prisma
model Recruiter {
  id          String    @id @default(uuid())
  email       String    @unique
  password    String    // bcrypt hashed
  name        String
  phone       String?
  designation String?
  
  companyId   String    @map("company_id")
  company     Company   @relation(fields: [companyId], references: [id])
  
  isActive    Boolean   @default(true) @map("is_active")
  isVerified  Boolean   @default(false) @map("is_verified")
  
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  
  jobs        Job[]
  
  @@map("recruiters")
}

model Company {
  id          String    @id @default(uuid())
  name        String
  slug        String    @unique
  description String?
  
  logo        String?
  website     String?
  linkedin    String?
  
  industry    String?
  size        CompanySize @default(SMALL)
  type        CompanyType @default(STARTUP)
  
  city        String?
  country     String?
  
  isVerified  Boolean   @default(false) @map("is_verified")
  
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  
  recruiters  Recruiter[]
  jobs        Job[]
  
  @@map("companies")
}

enum CompanySize {
  SMALL       // 1-10
  MEDIUM      // 11-50
  LARGE       // 51-200
  ENTERPRISE  // 201+
}

enum CompanyType {
  STARTUP
  SME
  MNC
  GOVERNMENT
  NONPROFIT
}
```

---

### 3.2 Recruiter Auth Service

**File:** `/recruiter-service/src/domain/auth.service.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone?: string;
  companyName: string;
  companyWebsite?: string;
}

interface LoginData {
  email: string;
  password: string;
}

export class RecruiterAuthService {
  constructor(private prisma: PrismaClient) {}

  async register(data: RegisterData) {
    // Check existing email
    const existing = await this.prisma.recruiter.findUnique({
      where: { email: data.email }
    });

    if (existing) {
      throw new Error('Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 12);

    // Create company
    const slug = this.generateSlug(data.companyName);
    let company = await this.prisma.company.findUnique({
      where: { slug }
    });

    if (!company) {
      company = await this.prisma.company.create({
        data: {
          name: data.companyName,
          slug,
          website: data.companyWebsite,
        }
      });
    }

    // Create recruiter
    const recruiter = await this.prisma.recruiter.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        phone: data.phone,
        companyId: company.id,
      },
      include: {
        company: true,
      }
    });

    // Generate tokens
    const tokens = this.generateTokens(recruiter.id);

    return {
      recruiter: this.sanitizeRecruiter(recruiter),
      ...tokens,
    };
  }

  async login(data: LoginData) {
    const recruiter = await this.prisma.recruiter.findUnique({
      where: { email: data.email },
      include: { company: true }
    });

    if (!recruiter) {
      throw new Error('Invalid credentials');
    }

    const isValid = await bcrypt.compare(data.password, recruiter.password);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    if (!recruiter.isActive) {
      throw new Error('Account is deactivated');
    }

    const tokens = this.generateTokens(recruiter.id);

    return {
      recruiter: this.sanitizeRecruiter(recruiter),
      ...tokens,
    };
  }

  private generateTokens(recruiterId: string) {
    const accessToken = jwt.sign(
      { recruiterId, type: 'recruiter' },
      process.env.JWT_ACCESS_SECRET!,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { recruiterId, type: 'recruiter' },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: '7d' }
    );

    return { accessToken, refreshToken };
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  private sanitizeRecruiter(recruiter: any) {
    const { password, ...safe } = recruiter;
    return safe;
  }
}
```

---

### 3.3 Developer Search Service

**File:** `/recruiter-service/src/domain/developer-search.service.ts`

```typescript
import { PrismaClient } from '@prisma/client';

interface DeveloperSearchFilters {
  skills?: { name: string; minScore?: number }[];
  experienceMin?: number;
  experienceMax?: number;
  location?: string;
  isOpenToWork?: boolean;
  minAuraScore?: number;
}

export class DeveloperSearchService {
  constructor(private prisma: PrismaClient) {}

  async searchDevelopers(filters: DeveloperSearchFilters, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    // Build base query
    let query = `
      SELECT DISTINCT
        u.id,
        u.username,
        u.name,
        u.avatar_url,
        u.bio,
        u.location,
        u.is_open_to_work,
        a.total_score as aura_score,
        a.level as aura_level
      FROM users u
      LEFT JOIN aura_scores a ON u.id = a.user_id
      WHERE u.is_profile_public = true
    `;

    const params: any[] = [];
    let paramIndex = 1;

    // Open to work filter
    if (filters.isOpenToWork !== undefined) {
      query += ` AND u.is_open_to_work = $${paramIndex++}`;
      params.push(filters.isOpenToWork);
    }

    // Location filter
    if (filters.location) {
      query += ` AND u.location ILIKE $${paramIndex++}`;
      params.push(`%${filters.location}%`);
    }

    // Aura score filter
    if (filters.minAuraScore) {
      query += ` AND a.total_score >= $${paramIndex++}`;
      params.push(filters.minAuraScore);
    }

    // Skills filter (most complex)
    if (filters.skills?.length) {
      const skillConditions = filters.skills.map((skill, i) => {
        const nameParam = `$${paramIndex++}`;
        params.push(skill.name.toLowerCase());
        
        if (skill.minScore) {
          const scoreParam = `$${paramIndex++}`;
          params.push(skill.minScore);
          return `(LOWER(s.name) = ${nameParam} AND s.score >= ${scoreParam})`;
        }
        return `LOWER(s.name) = ${nameParam}`;
      });

      query += `
        AND u.id IN (
          SELECT s.user_id FROM skills s
          WHERE ${skillConditions.join(' OR ')}
          GROUP BY s.user_id
          HAVING COUNT(DISTINCT s.name) >= ${filters.skills.length}
        )
      `;
    }

    // Add ordering
    query += ` ORDER BY a.total_score DESC NULLS LAST`;

    // Add pagination
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, skip);

    // Execute query
    const developers = await this.prisma.$queryRawUnsafe(query, ...params);

    // Get skills for each developer
    const developersWithSkills = await Promise.all(
      (developers as any[]).map(async (dev) => {
        const skills = await this.prisma.skill.findMany({
          where: { userId: dev.id, isVerified: true },
          orderBy: { score: 'desc' },
          take: 5,
          select: {
            name: true,
            score: true,
            category: true,
          }
        });
        return { ...dev, topSkills: skills };
      })
    );

    return {
      data: developersWithSkills,
      pagination: {
        page,
        limit,
      }
    };
  }

  async getDeveloperProfile(developerId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: developerId },
      select: {
        id: true,
        username: true,
        name: true,
        avatarUrl: true,
        bio: true,
        location: true,
        website: true,
        isOpenToWork: true,
        skills: {
          where: { isVerified: true },
          orderBy: { score: 'desc' },
        },
        projects: {
          where: { analysisStatus: 'completed' },
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        experiences: {
          orderBy: { startDate: 'desc' },
        },
      }
    });

    if (!user) throw new Error('Developer not found');

    return user;
  }
}
```

---

## 🔴 STEP 4: Resume Service (Go) Enhancement

### 4.1 Main Entry Point

**File:** `/resume-service/cmd/main.go`

```go
package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"resume-service/internal/api"
	"resume-service/internal/config"
	"resume-service/internal/generator"
	"resume-service/internal/storage"
	"resume-service/internal/worker"
)

func main() {
	// Load config
	cfg := config.Load()

	// Initialize storage
	minioClient, err := storage.NewMinioClient(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to MinIO: %v", err)
	}

	// Initialize PDF generator
	pdfGen := generator.NewPDFGenerator(cfg, minioClient)

	// Initialize worker pool
	workerPool := worker.NewPool(10, pdfGen)
	go workerPool.Start()

	// Setup router
	router := gin.Default()

	// Initialize handlers
	handler := api.NewHandler(cfg, pdfGen, workerPool)

	// Routes
	v1 := router.Group("/api/v1/resume")
	{
		// Public routes
		v1.GET("/templates", handler.ListTemplates)
		v1.GET("/public/:slug", handler.GetPublicResume)

		// Protected routes (require auth)
		v1.GET("/user/:userId", handler.GetResumeData)
		v1.GET("/user/:userId/url", handler.GetResumeURL)
		v1.POST("/generate", handler.QueueGeneration)
		v1.GET("/status/:jobId", handler.GetJobStatus)
		v1.GET("/download/:id", handler.DownloadPDF)
	}

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8003"
	}

	log.Printf("Resume service starting on port %s", port)
	router.Run(":" + port)
}
```

---

### 4.2 PDF Generator

**File:** `/resume-service/internal/generator/pdf.go`

```go
package generator

import (
	"bytes"
	"context"
	"fmt"
	"html/template"
	"log"
	"os/exec"
	"path/filepath"

	"resume-service/internal/config"
	"resume-service/internal/models"
	"resume-service/internal/storage"
)

type PDFGenerator struct {
	cfg       *config.Config
	storage   *storage.MinioClient
	templates map[string]*template.Template
}

func NewPDFGenerator(cfg *config.Config, storage *storage.MinioClient) *PDFGenerator {
	gen := &PDFGenerator{
		cfg:       cfg,
		storage:   storage,
		templates: make(map[string]*template.Template),
	}
	gen.loadTemplates()
	return gen
}

func (g *PDFGenerator) loadTemplates() {
	templates := []string{"modern", "professional", "minimal", "ats"}
	
	for _, name := range templates {
		path := filepath.Join("internal/templates", name+".html")
		tmpl, err := template.ParseFiles(path)
		if err != nil {
			log.Printf("Failed to load template %s: %v", name, err)
			continue
		}
		g.templates[name] = tmpl
	}
}

func (g *PDFGenerator) Generate(ctx context.Context, data models.ResumeData, templateName string) (*models.GenerationResult, error) {
	// Get template
	tmpl, ok := g.templates[templateName]
	if !ok {
		tmpl = g.templates["modern"] // Default
	}

	// Render HTML
	var htmlBuf bytes.Buffer
	if err := tmpl.Execute(&htmlBuf, data); err != nil {
		return nil, fmt.Errorf("template render failed: %w", err)
	}

	// Create temp HTML file
	htmlPath := fmt.Sprintf("/tmp/resume_%s.html", data.User.ID)
	if err := os.WriteFile(htmlPath, htmlBuf.Bytes(), 0644); err != nil {
		return nil, fmt.Errorf("failed to write HTML: %w", err)
	}
	defer os.Remove(htmlPath)

	// Generate PDF using wkhtmltopdf
	pdfPath := fmt.Sprintf("/tmp/resume_%s.pdf", data.User.ID)
	cmd := exec.CommandContext(ctx, "wkhtmltopdf",
		"--page-size", "A4",
		"--margin-top", "10mm",
		"--margin-bottom", "10mm",
		"--margin-left", "10mm",
		"--margin-right", "10mm",
		"--enable-local-file-access",
		htmlPath, pdfPath,
	)

	if output, err := cmd.CombinedOutput(); err != nil {
		return nil, fmt.Errorf("PDF generation failed: %s - %w", string(output), err)
	}
	defer os.Remove(pdfPath)

	// Read PDF file
	pdfData, err := os.ReadFile(pdfPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read PDF: %w", err)
	}

	// Upload to MinIO
	objectName := fmt.Sprintf("resumes/%s/%s.pdf", data.User.ID, data.User.Username)
	url, err := g.storage.UploadPDF(ctx, objectName, pdfData)
	if err != nil {
		return nil, fmt.Errorf("upload failed: %w", err)
	}

	return &models.GenerationResult{
		URL:      url,
		Size:     len(pdfData),
		Template: templateName,
	}, nil
}

func (g *PDFGenerator) GetTemplates() []models.Template {
	return []models.Template{
		{ID: "modern", Name: "Modern Dark", Description: "Sleek dark theme with accent colors"},
		{ID: "professional", Name: "Professional", Description: "Classic professional layout"},
		{ID: "minimal", Name: "Minimal", Description: "Clean and simple design"},
		{ID: "ats", Name: "ATS Optimized", Description: "Optimized for applicant tracking systems"},
	}
}
```

---

### 4.3 Worker Pool

**File:** `/resume-service/internal/worker/pool.go`

```go
package worker

import (
	"context"
	"log"
	"sync"

	"resume-service/internal/generator"
	"resume-service/internal/models"
)

type Job struct {
	ID       string
	UserID   string
	Template string
	Data     models.ResumeData
	Result   chan *models.GenerationResult
	Error    chan error
}

type Pool struct {
	workerCount int
	jobQueue    chan *Job
	results     map[string]*JobStatus
	mutex       sync.RWMutex
	generator   *generator.PDFGenerator
}

type JobStatus struct {
	Status   string // pending, processing, completed, failed
	URL      string
	Error    string
}

func NewPool(workers int, gen *generator.PDFGenerator) *Pool {
	return &Pool{
		workerCount: workers,
		jobQueue:    make(chan *Job, 100),
		results:     make(map[string]*JobStatus),
		generator:   gen,
	}
}

func (p *Pool) Start() {
	for i := 0; i < p.workerCount; i++ {
		go p.worker(i)
	}
	log.Printf("Started %d PDF generation workers", p.workerCount)
}

func (p *Pool) worker(id int) {
	for job := range p.jobQueue {
		log.Printf("Worker %d processing job %s", id, job.ID)

		p.updateStatus(job.ID, "processing", "", "")

		result, err := p.generator.Generate(
			context.Background(),
			job.Data,
			job.Template,
		)

		if err != nil {
			log.Printf("Worker %d: job %s failed: %v", id, job.ID, err)
			p.updateStatus(job.ID, "failed", "", err.Error())
			if job.Error != nil {
				job.Error <- err
			}
			continue
		}

		log.Printf("Worker %d: job %s completed", id, job.ID)
		p.updateStatus(job.ID, "completed", result.URL, "")
		if job.Result != nil {
			job.Result <- result
		}
	}
}

func (p *Pool) Submit(job *Job) {
	p.updateStatus(job.ID, "pending", "", "")
	p.jobQueue <- job
}

func (p *Pool) GetStatus(jobID string) *JobStatus {
	p.mutex.RLock()
	defer p.mutex.RUnlock()
	return p.results[jobID]
}

func (p *Pool) updateStatus(jobID, status, url, errMsg string) {
	p.mutex.Lock()
	defer p.mutex.Unlock()
	p.results[jobID] = &JobStatus{
		Status: status,
		URL:    url,
		Error:  errMsg,
	}
}
```

---

## 📋 Implementation Order Summary

```
Week 1:
├── Day 1-2: User Service - Schema + Onboarding
├── Day 3-4: User Service - Skills Protection
└── Day 5: Testing + Fixes

Week 2:
├── Day 1-2: Job Service - Enhanced Schema
├── Day 3-4: Job Service - Search + Application
└── Day 5: Testing + Fixes

Week 3:
├── Day 1-2: Recruiter Service - Auth + Company
├── Day 3-4: Recruiter Service - Search + Applications
└── Day 5: Testing + Fixes

Week 4:
├── Day 1-3: Resume Service (Go) - Full Implementation
├── Day 4: Integration Testing
└── Day 5: Bug Fixes

Week 5:
├── Day 1-2: Project Analyzer Enhancement
├── Day 3-4: Aura Processor Enhancement
└── Day 5: Final Integration
```

---

## 🔧 Environment Variables Checklist

```bash
# All services need these:
DATABASE_URL=postgresql://verifydev:verifydev123@postgres:5432/verifydev
REDIS_URL=redis://redis:6379
JWT_ACCESS_SECRET=your_secret_here
JWT_REFRESH_SECRET=your_secret_here

# Auth Service
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx
GITHUB_CALLBACK_URL=http://localhost/api/v1/auth/github/callback
FRONTEND_URL=http://localhost:3000

# Resume Service (Go)
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=resumes

# Project Analyzer (Go)
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672/
GITHUB_TOKEN=your_token_for_higher_rate_limits
```

---

**Ready to implement? Start with Step 1.1!** 🚀
