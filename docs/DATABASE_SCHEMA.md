# Database Schema Documentation

> Complete MongoDB Schema Reference for VerifyDev

---

## 📋 Overview

| Service | Collections |
|---------|-------------|
| **Auth Service** | users, sessions, otp_verifications, skills, projects, experiences, social_links, activities |
| **User Service** | users, sessions, skills, technologies, projects, experiences, social_links, activities, applications, saved_jobs, job_alerts |
| **Job Service** | jobs, applications, interviews, messages, saved_jobs, recruiters |
| **Recruiter Service** | Uses Job Service DB |

---

## Auth Service / User Service Schema

### 👤 User Model

**Collection:** `users`

```prisma
model User {
  id            String  @id @default(auto()) @map("_id") @db.ObjectId
  githubId      String  @unique @map("github_id")
  username      String  @unique
  email         String? @unique
  name          String?
  avatarUrl     String? @map("avatar_url")
  bio           String?
  location      String?
  company       String?
  website       String?
  twitterHandle String? @map("twitter_handle")
  
  // Student Info
  isStudent      Boolean @default(false)
  collegeName    String?
  collegeYear    Int?     // 1, 2, 3, 4
  branch         String?  // Computer Science, IT
  cgpa           Float?
  graduationYear Int?
  
  // Onboarding
  onboardingComplete Boolean @default(false)
  onboardingStep     Int     @default(0)  // 0-4
  
  // Visibility
  isPublic        Boolean @default(true)
  isOpenToWork    Boolean @default(false)
  isVerified      Boolean @default(false)
  showEmail       Boolean @default(false)
  showCgpa        Boolean @default(false)
  showPhone       Boolean @default(false)
  visibilityLevel VisibilityLevel @default(RECRUITERS_ONLY)
  
  // Job Preferences
  preferredRoles     String[] @default([])  // ["Backend Dev", "Full Stack"]
  preferredLocations String[] @default([])  // ["Remote", "Bangalore"]
  preferredJobTypes  String[] @default([])  // ["FULL_TIME", "CONTRACT"]
  expectedSalaryMin  Int?
  expectedSalaryMax  Int?
  salaryCurrency     String?  @default("INR")
  availableFrom      DateTime?
  noticePeriodDays   Int?     @default(0)
  remotePreference   RemotePreference @default(FLEXIBLE)
  
  // Highlighted
  highlightedSkills String[] @default([])
  phone             String?
  
  // Aura & Stats
  auraScore           Int @default(0)
  coreCount           Int @default(1)
  githubFollowers     Int @default(0)
  githubRepos         Int @default(0)
  githubContributions Int @default(0)
  
  // Auto-inferred Role
  primaryRole     String?          // "Backend Developer", "Full Stack Engineer"
  primaryNiche    DeveloperNiche?
  secondaryNiche  DeveloperNiche?
  nicheConfidence Int @default(0)  // 0-100
  nicheInferredAt DateTime?
  autoTags        String[] @default([])
  
  // Timestamps
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  lastLoginAt       DateTime?
  githubAccessToken String?   // Encrypted
  
  // Relations
  sessions     Session[]
  skills       Skill[]
  technologies Technology[]
  projects     Project[]
  experiences  Experience[]
  socialLinks  SocialLink[]
  activities   Activity[]
  applications Application[]
  savedJobs    SavedJob[]
  jobAlerts    JobAlert[]
}
```

**Indexes:**
- `auraScore` - For leaderboard sorting
- `isOpenToWork` - Recruiter candidate search
- `isStudent` - Student-specific filters
- `onboardingComplete` - Onboarding flow
- `createdAt` - Sorting
- `primaryNiche` - Role-based search

**Enums:**
```prisma
enum VisibilityLevel {
  PUBLIC           // Anyone can see
  RECRUITERS_ONLY  // Only verified recruiters
  INVITE_ONLY      // Only approved recruiters
}

enum RemotePreference {
  REMOTE_ONLY
  ONSITE_ONLY
  HYBRID
  FLEXIBLE
}

enum DeveloperNiche {
  WEB_FRONTEND      // React, Vue, Angular
  WEB_BACKEND       // Node, Express, Django
  WEB_FULLSTACK     // Full-stack web
  MOBILE_ANDROID    // Kotlin, Java
  MOBILE_IOS        // Swift, Objective-C
  MOBILE_CROSS      // React Native, Flutter
  BACKEND_SYSTEMS   // Go, Rust, C++
  DISTRIBUTED       // Kafka, RabbitMQ, gRPC
  DATA_ENGINEERING  // Spark, Airflow, ETL
  ML_AI             // TensorFlow, PyTorch
  DEVOPS            // Docker, K8s, Terraform
  CLOUD_INFRA       // AWS, GCP, Azure
  SECURITY          // AppSec, Cryptography
  BLOCKCHAIN        // Solidity, Web3
  EMBEDDED          // C, IoT
  GAME_DEV          // Unity, Unreal
  GENERAL           // No specific niche
}
```

---

### 🔐 Session Model

**Collection:** `sessions`

```prisma
model Session {
  id           String   @id @default(auto()) @map("_id") @db.ObjectId
  userId       String   @map("user_id") @db.ObjectId
  refreshToken String   @unique @map("refresh_token")
  userAgent    String?  @map("user_agent")
  ipAddress    String?  @map("ip_address")
  isValid      Boolean  @default(true) @map("is_valid")
  expiresAt    DateTime @map("expires_at")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

**Purpose:**
- Track active sessions per user
- Enable "logout from all devices"
- Session invalidation on logout

---

### 📱 OTP Verification Model

**Collection:** `otp_verifications`

```prisma
model OtpVerification {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  email     String?
  phone     String?
  code      String
  type      OtpType  @default(LOGIN)
  isUsed    Boolean  @default(false)
  expiresAt DateTime
  createdAt DateTime @default(now())
  usedAt    DateTime?
}

enum OtpType {
  SIGNUP
  LOGIN
  MOBILE_VERIFY
}
```

---

### 🛠️ Skill Model

**Collection:** `skills`

```prisma
model Skill {
  id       String        @id @default(auto()) @map("_id") @db.ObjectId
  userId   String        @map("user_id") @db.ObjectId
  name     String
  category SkillCategory @default(OTHER)
  
  // Source & Verification
  source        SkillSource @default(MANUAL)
  isVerified    Boolean     @default(false)
  verifiedScore Int         @default(0)  // 0-100
  verifiedAt    DateTime?
  
  // Evidence (JSON array)
  evidence Json? @default("[]")
  
  // Self-declared for manual skills
  selfDeclaredLevel SkillLevel @default(BEGINNER)
  
  // Stats
  projectCount     Int @default(0)
  linesOfCode      Int @default(0)
  auraContribution Int @default(0)
  
  // Visibility
  isHighlighted    Boolean @default(false)
  showToRecruiters Boolean @default(true)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

enum SkillSource {
  GITHUB    // Auto-detected from repos
  ANALYSIS  // Verified by project analyzer (PROTECTED)
  MANUAL    // User-declared (can edit/delete)
}

enum SkillCategory {
  LANGUAGE    // JavaScript, Go, Python
  FRAMEWORK   // React, Express, Gin
  DATABASE    // PostgreSQL, MongoDB, Redis
  DEVOPS      // Docker, K8s, CI/CD
  TOOL        // Git, VS Code
  SOFT_SKILL  // Communication, Leadership
  OTHER
}

enum SkillLevel {
  BEGINNER
  INTERMEDIATE
  ADVANCED
  EXPERT
}
```

**Skill Protection Rules:**
| Source | Can Edit? | Can Delete? | Badge |
|--------|-----------|-------------|-------|
| `ANALYSIS` | ❌ No | ❌ No | ✅ Verified |
| `GITHUB` | ❌ No | ❌ No | 🔗 GitHub |
| `MANUAL` | ✅ Yes | ✅ Yes | 📝 Declared |

---

### 🔧 Technology Model

**Collection:** `technologies`

```prisma
model Technology {
  id       String             @id @default(auto()) @map("_id") @db.ObjectId
  userId   String             @map("user_id") @db.ObjectId
  name     String
  category TechnologyCategory @default(OTHER)
  
  detectedFrom String[] @default([])  // ["docker", "terraform"]
  confidence   Int      @default(0)   // 0-100
  
  projectCount     Int @default(0)
  auraContribution Int @default(0)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

enum TechnologyCategory {
  INFRASTRUCTURE  // Docker, K8s, Terraform
  CICD            // GitHub Actions, Jenkins
  MONITORING      // Prometheus, Grafana
  CLOUD           // AWS, GCP, Azure
  SECURITY        // OAuth, JWT, SSL
  OTHER
}
```

---

### 📊 Project Model

**Collection:** `projects`

```prisma
model Project {
  id     String @id @default(auto()) @map("_id") @db.ObjectId
  userId String @map("user_id") @db.ObjectId
  
  // GitHub Info
  githubRepoUrl String
  repoName      String
  description   String?
  stars         Int     @default(0)
  forks         Int     @default(0)
  language      String?  // Primary language
  
  // Analysis
  analysisStatus AnalysisStatus @default(PENDING)
  analysisId     String?        @db.ObjectId
  fullAnalysis   Json?          // Complete analysis result
  analyzedAt     DateTime?
  
  // Scores
  codeQualityScore Int @default(0)  // 0-100
  structureScore   Int @default(0)  // 0-100
  overallScore     Int @default(0)  // 0-100
  auraContribution Int @default(0)
  
  // Visibility
  isPublic          Boolean @default(true)
  isPinned          Boolean @default(false)
  displayOrder      Int     @default(0)
  showToRecruiters  Boolean @default(true)
  customDescription String?
  
  // Niche (user input)
  projectNiche DeveloperNiche?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

enum AnalysisStatus {
  PENDING     // Waiting to be analyzed
  PROCESSING  // Currently being analyzed
  COMPLETED   // Analysis complete
  FAILED      // Analysis failed
}
```

**Analysis Result Structure (fullAnalysis JSON):**
```json
{
  "summary": "A full-stack e-commerce platform...",
  "techStack": {
    "languages": ["TypeScript", "Go"],
    "frameworks": ["Next.js", "Express"],
    "databases": ["MongoDB", "Redis"],
    "infrastructure": ["Docker", "Nginx"]
  },
  "architecture": "Microservices",
  "skills": [
    {
      "name": "TypeScript",
      "category": "LANGUAGE",
      "confidence": 95,
      "evidence": ["Primary language", "50+ files"]
    }
  ],
  "qualityMetrics": {
    "hasTests": true,
    "hasCI": true,
    "hasDocker": true,
    "documentation": "good"
  },
  "scores": {
    "codeQuality": 85,
    "structure": 80,
    "overall": 82
  }
}
```

---

### 💼 Experience Model

**Collection:** `experiences`

```prisma
model Experience {
  id     String @id @default(auto()) @map("_id") @db.ObjectId
  userId String @map("user_id") @db.ObjectId
  
  type         ExperienceType
  title        String
  organization String
  location     String?
  description  String?
  
  startDate DateTime
  endDate   DateTime?
  isCurrent Boolean   @default(false)
  skills    String[]  @default([])
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

enum ExperienceType {
  WORK
  EDUCATION
  CERTIFICATION
  VOLUNTEER
}
```

---

### 🔗 Social Link Model

**Collection:** `social_links`

```prisma
model SocialLink {
  id       String         @id @default(auto()) @map("_id") @db.ObjectId
  userId   String         @map("user_id") @db.ObjectId
  platform SocialPlatform
  url      String
  username String?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

enum SocialPlatform {
  LINKEDIN
  TWITTER
  YOUTUBE
  PORTFOLIO
  BLOG
  STACKOVERFLOW
  DEVTO
  MEDIUM
  OTHER
}
```

---

### 📈 Activity Model

**Collection:** `activities`

```prisma
model Activity {
  id          String       @id @default(auto()) @map("_id") @db.ObjectId
  userId      String       @map("user_id") @db.ObjectId
  type        ActivityType
  description String?
  
  auraPoints Int @default(0)
  
  referenceId   String?  // Related entity ID
  referenceType String?  // "project", "skill", etc.
  
  createdAt DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

enum ActivityType {
  PROFILE_COMPLETE
  PROJECT_ADDED
  PROJECT_ANALYZED
  SKILL_VERIFIED
  LOGIN
  RESUME_GENERATED
  PROFILE_VIEWED
}
```

**Aura Points per Activity:**
| Activity | Points |
|----------|--------|
| `PROFILE_COMPLETE` | +50 |
| `PROJECT_ADDED` | +10 |
| `PROJECT_ANALYZED` | +50-200 (based on score) |
| `SKILL_VERIFIED` | +20 |
| `LOGIN` | +1 (daily cap) |

---

## Job Service Schema

### 💼 Job Model

**Collection:** `jobs`

```prisma
model Job {
  id String @id @default(auto()) @map("_id") @db.ObjectId
  
  recruiterId String    @db.ObjectId
  recruiter   Recruiter @relation
  
  // Details
  title            String
  description      String
  requirements     String
  responsibilities String
  benefits         String?
  
  // Classification
  type     JobType         @default(FULL_TIME)
  level    ExperienceLevel @default(MID)
  category JobCategory     @default(GENERAL)
  
  // Location
  location   String
  isRemote   Boolean     @default(false)
  remoteType RemoteType?
  
  // Compensation
  salaryMin      Int?
  salaryMax      Int?
  salaryCurrency String       @default("INR")
  salaryPeriod   SalaryPeriod @default(YEARLY)
  showSalary     Boolean      @default(true)
  
  // Skills
  requiredSkills  String[] @default([])
  preferredSkills String[] @default([])
  
  // Requirements
  minExperience Int? // Years
  maxExperience Int?
  minAuraScore  Int  @default(0)
  minCoreCount  Int  @default(1)
  minEducation  EducationLevel?
  
  // Status
  status            JobStatus @default(DRAFT)
  applicationsCount Int       @default(0)
  viewsCount        Int       @default(0)
  matchedCount      Int       @default(0)
  
  // Timestamps
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  publishedAt DateTime?
  expiresAt   DateTime?
  closedAt    DateTime?
  
  // Relations
  applications Application[]
  interviews   Interview[]
  messages     Message[]
  savedByUsers SavedJob[]
}
```

**Enums:**
```prisma
enum JobType {
  FULL_TIME
  PART_TIME
  CONTRACT
  INTERNSHIP
  FREELANCE
}

enum ExperienceLevel {
  ENTRY
  JUNIOR
  MID
  SENIOR
  LEAD
  PRINCIPAL
}

enum JobStatus {
  DRAFT
  ACTIVE
  PAUSED
  CLOSED
  EXPIRED
}

enum JobCategory {
  FRONTEND
  BACKEND
  FULLSTACK
  MOBILE
  DEVOPS
  DATA_ENGINEERING
  MACHINE_LEARNING
  SECURITY
  DESIGN
  QA
  GENERAL
}
```

---

### 📝 Application Model

**Collection:** `applications`

```prisma
model Application {
  id String @id @default(auto()) @map("_id") @db.ObjectId
  
  jobId  String @db.ObjectId
  job    Job    @relation
  userId String
  
  // Application Details
  coverLetter  String?
  resumeUrl    String?
  portfolioUrl String?
  
  // Candidate Snapshot (at application time)
  candidateName           String
  candidateEmail          String
  candidatePhone          String?
  candidateAura           Int      @default(0)
  candidateCores          Int      @default(1)
  candidateSkills         String[] @default([])
  candidateProjects       Json?
  candidateExperience     Json?
  candidateCertifications Json?
  
  // Status
  status ApplicationStatus @default(PENDING)
  stage  String?
  
  // Matching
  matchScore      Int?   // 0-100
  matchBreakdown  Json?
  skillMatchScore Int?
  auraMatchScore  Int?
  
  // Recruiter Feedback
  recruiterNotes String?
  rating         Int?    // 1-5
  reviewedBy     String?
  
  interviewScheduled Boolean @default(false)
  
  // Timestamps
  appliedAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  reviewedAt    DateTime?
  shortlistedAt DateTime?
  rejectedAt    DateTime?
  
  // Relations
  interviews Interview[]
  messages   Message[]
}

enum ApplicationStatus {
  PENDING
  REVIEWING
  SHORTLISTED
  INTERVIEW
  OFFER
  ACCEPTED
  REJECTED
  WITHDRAWN
}
```

---

### 📅 Interview Model

**Collection:** `interviews`

```prisma
model Interview {
  id String @id @default(auto()) @map("_id") @db.ObjectId
  
  applicationId String      @db.ObjectId
  application   Application @relation
  jobId         String      @db.ObjectId
  job           Job         @relation
  userId        String
  recruiterId   String
  
  // Details
  title       String
  description String?
  type        InterviewType @default(VIDEO)
  round       Int           @default(1)
  
  // Scheduling
  scheduledAt DateTime?
  duration    Int       @default(60)  // minutes
  meetingUrl  String?
  location    String?
  
  // Status
  status InterviewStatus @default(SCHEDULED)
  
  // Feedback
  feedback         String?
  rating           Int?  // 1-5
  interviewerNotes String?
  
  // Timestamps
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  completedAt DateTime?
  cancelledAt DateTime?
}

enum InterviewType {
  PHONE
  VIDEO
  IN_PERSON
  TECHNICAL
  HR
  FINAL
}

enum InterviewStatus {
  SCHEDULED
  CONFIRMED
  RESCHEDULED
  COMPLETED
  CANCELLED
  NO_SHOW
}
```

---

### 💬 Message Model

**Collection:** `messages`

```prisma
model Message {
  id String @id @default(auto()) @map("_id") @db.ObjectId
  
  jobId         String?      @db.ObjectId
  job           Job?         @relation
  applicationId String?      @db.ObjectId
  application   Application? @relation
  
  // Participants
  senderId     String
  senderType   SenderType
  receiverId   String
  receiverType SenderType
  
  // Message
  subject     String?
  content     String
  attachments String[] @default([])
  
  // Display Names
  senderName   String?
  receiverName String?
  
  // Status
  isRead Boolean   @default(false)
  readAt DateTime?
  
  sentAt DateTime @default(now())
}

enum SenderType {
  CANDIDATE
  RECRUITER
  SYSTEM
}
```

---

### 👔 Recruiter Model

**Collection:** `recruiters`

```prisma
model Recruiter {
  id String @id @default(auto()) @map("_id") @db.ObjectId
  
  // Auth
  email        String @unique
  passwordHash String
  
  // Profile
  name        String
  title       String?
  phone       String?
  avatarUrl   String?
  bio         String?
  linkedinUrl String?
  
  // Organization
  organizationName    String
  organizationWebsite String?
  organizationLogo    String?
  organizationSize    String?
  industry            String?
  
  // Verification
  isVerified Boolean   @default(false)
  verifiedAt DateTime?
  
  // Status
  isActive  Boolean @default(true)
  isPremium Boolean @default(false)
  
  // Stats
  jobsPosted        Int @default(0)
  activeJobs        Int @default(0)
  totalApplications Int @default(0)
  
  // Timestamps
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  lastLoginAt DateTime?
  
  // Relations
  jobs Job[]
}
```

---

## Index Summary

| Collection | Indexes | Purpose |
|------------|---------|---------|
| `users` | auraScore, isOpenToWork, isStudent, primaryNiche, createdAt | Sorting, filtering |
| `sessions` | userId, expiresAt, isValid | Session lookup, cleanup |
| `skills` | userId+name (unique), source, category, isVerified | Skill queries |
| `projects` | userId+githubRepoUrl (unique), analysisStatus, isPinned | Project queries |
| `jobs` | category, status, createdAt, recruiterId | Job search |
| `applications` | jobId+userId (unique), status, appliedAt | Application tracking |

---

> Last Updated: January 2026
