# VerifyDev - Complete Implementation Roadmap

## Phase 1: Authentication & User Management

### 1.1 Email/Mobile OTP Authentication
**Files to create:**
- `frontend/src/pages/auth/otp-login.tsx` - OTP login page
- `auth-service/src/services/otp.service.ts` - OTP generation & verification
- `auth-service/src/api/v1/controllers/otp.controller.ts` - OTP endpoints

**Features:**
- Email OTP verification
- Mobile OTP verification (SMS via Twilio)
- OTP expiry (10 minutes)
- Rate limiting (max 5 attempts)
- Fallback for username+email
- For recruiters: Mobile verification required
- For users: Can use Google login OR email OTP

### 1.2 Username Search & Discovery
**Database updates needed:**
- Add unique `username` field
- Add `public_profile` flag
- Add `bio` & `location` fields

**API endpoints:**
- `GET /v1/users/search?q=username` - Search by username
- `GET /v1/users/@username` - Public profile view

---

## Phase 2: DSA Verification System

### 2.1 LeetCode & GeeksforGeeks Integration
**Services to create:**
- `services/dsa-service/` - New microservice
- `dsa-service/src/integrations/leetcode.ts`
- `dsa-service/src/integrations/geeksforgeeks.ts`

**Features:**
- Fetch user's LeetCode profile (username)
- Verify solved problems count
- Extract problem categories
- Verify GeeksforGeeks profile
- Calculate DSA score (based on problems, difficulty, patterns)

### 2.2 DSA Tracking in User Profile
**Database schema:**
```typescript
DsaProfile {
  userId: string
  leetcodeUsername: string
  leetcodeSolved: number
  geeksforgeeksUsername: string
  gfgProblems: number
  durationMonths: number
  topicsMastered: string[] // Array, Trees, DP, etc
  dsaScore: number // 0-100
  lastUpdated: Date
}
```

**Frontend pages:**
- `frontend/src/pages/dsa-profile.tsx` - User's DSA profile
- `frontend/src/pages/dsa-connect.tsx` - Connect LeetCode/GFG
- `frontend/src/components/dsa/dsa-stats.tsx` - DSA statistics card

---

## Phase 3: Skills & Verification

### 3.1 Skill Claiming System
**Database schema:**
```typescript
ClaimedSkill {
  id: string
  userId: string
  skillName: string // "React", "Node.js", "Data Structures", etc
  category: "Frontend" | "Backend" | "DSA" | "DevOps" | "ML" | "Data"
  verificationMethod: "project" | "manual" | "test" | "dsa"
  projectId?: string // If from project analysis
  leetcodeLink?: string // If DSA skill
  proofLink?: string // Custom link (GitHub, blog, etc)
  notes?: string // User's explanation
  verificationLevel: "verified" | "manual" | "unverified"
  createdAt: Date
}
```

### 3.2 Project-Linked Skills
- When project analyzed → extract skills used
- Skills auto-added to user profile
- Show which project verified each skill
- Allow user to add custom skills with links/notes

### 3.3 DSA Skills Verification
- Link LeetCode/GFG problems to specific topics
- "Data Structures" skill from 200+ solved problems
- "Dynamic Programming" from DP problems count
- "Advanced DSA" from high difficulty problems

---

## Phase 4: AURA Algorithm Enhancement

### 4.1 Skill Categories to Track
```
Frontend: React, Vue, Angular, Next.js, Svelte, etc
Backend: Node.js, Python, Go, Java, Spring, etc
DSA: Data Structures, Algorithms, Problem Solving
DevOps: Docker, Kubernetes, CI/CD, AWS, GCP
Database: PostgreSQL, MongoDB, Redis, etc
Mobile: React Native, Flutter, Swift, Kotlin
ML/AI: TensorFlow, PyTorch, ML Engineering
Data Science: Python, R, SQL, Data Analysis
```

### 4.2 AURA Calculation Formula
```
Base Score = 300

// Code Quality & Projects
projectScore = numProjects * 15 + avgProjectScore * 10

// Skills Diversity
skillScore = numVerifiedSkills * 8 + (uniqueCategories * 5)

// DSA Mastery
dsaScore = (leetcodeSolved / 100) * 50 + (gfgProblems / 50) * 30 + dsaDifficulty * 20

// Contribution & Consistency
commitScore = totalCommits * 0.5 + commitStreak * 3
prScore = totalPRs * 10 + prMergeRate * 5

// Claimed Skills (verified > unverified)
claimedSkillScore = verifiedSkillCount * 12 + unverifiedSkillCount * 4

Total AURA = Base + projectScore + skillScore + dsaScore + commitScore + prScore + claimedSkillScore

// Multipliers
if userHasHighDSAScore: multiply by 1.2
if userHasAllCategoryCovered: multiply by 1.15
```

---

## Phase 5: Resume & Job Platform

### 5.1 Resume Templates
**Create component:**
- `frontend/src/components/resume/templates/`
  - `modern.tsx` - Minimal, modern design
  - `professional.tsx` - Traditional corporate
  - `minimal.tsx` - Clean, simple
  - `creative.tsx` - Designer-friendly
  - `technical.tsx` - Dev-focused with code blocks

**Resume data:**
```typescript
Resume {
  id: string
  userId: string
  title: string
  template: "modern" | "professional" | "minimal" | "creative" | "technical"
  sections: {
    header: { name, email, phone, location, bio }
    summary: string
    experience: Experience[]
    education: Education[]
    skills: Skill[]
    projects: ProjectRef[]
    dsa?: DsaSection
    certifications?: Certification[]
  }
  isPublic: boolean
  shareUrl: string
  downloadUrl: string
}
```

### 5.2 Job Platform Enhancement
**Skill categories in job posting:**
```typescript
Job {
  requiredSkills: {
    Frontend?: ["React", "TypeScript"]
    Backend?: ["Node.js", "MongoDB"]
    DSA?: { level: "intermediate" | "advanced", topics: string[] }
    DevOps?: string[]
    Other?: string[]
  }
  nice_to_have: string[]
  salary_range: { min, max, currency }
  remote: "fully" | "hybrid" | "onsite"
  level: "junior" | "mid" | "senior"
}
```

### 5.3 Smart Job Matching
- Match user skills with job requirements
- Consider DSA level if job requires it
- Factor in AURA score
- Show match percentage
- Highlight missing skills

---

## Phase 6: Database Models

### New Collections/Tables:

```typescript
// OTP Verification
OtpVerification {
  id: string
  email: string
  phone?: string
  otp: string
  expiresAt: Date
  attempts: number
  type: "signup" | "login" | "mobile_verify"
}

// DSA Profile
DsaProfile { ... } // See Phase 2.2

// Claimed Skills
ClaimedSkill { ... } // See Phase 3.1

// Resume
Resume { ... } // See Phase 5.1

// Enhanced Job
Job { ... } // See Phase 5.2

// Enhanced User
User {
  ...existing
  username: string (unique)
  email: string (unique)
  phone?: string
  phoneVerified: boolean
  bio?: string
  location?: string
  websiteUrl?: string
  dsaProfile?: DsaProfileId
  claimedSkills: SkillId[]
  resumes: ResumeId[]
  publicProfile: boolean
}
```

---

## Phase 7: API Endpoints Summary

### Authentication
- `POST /v1/auth/send-otp` - Send OTP to email/phone
- `POST /v1/auth/verify-otp` - Verify OTP & create session
- `POST /v1/auth/verify-mobile` - Verify mobile (recruiters)

### Users & Search
- `GET /v1/users/search?q=query` - Search users by username
- `GET /v1/users/@username` - Public profile
- `PUT /v1/users/profile` - Update profile

### DSA
- `POST /v1/dsa/connect-leetcode` - Connect LeetCode account
- `POST /v1/dsa/connect-gfg` - Connect GeeksforGeeks
- `GET /v1/dsa/profile/:userId` - Get DSA profile
- `GET /v1/dsa/verify` - Verify & update DSA data

### Skills
- `GET /v1/skills/all` - List all available skills by category
- `POST /v1/users/skills/claim` - Claim a skill
- `PUT /v1/users/skills/:skillId` - Update skill (add link/notes)
- `GET /v1/users/:userId/skills` - Get user's skills

### Resume
- `POST /v1/resumes` - Create resume
- `PUT /v1/resumes/:id` - Update resume
- `GET /v1/resumes/:id/download` - Download PDF
- `GET /v1/resumes/:id/share` - Get shareable link

### Jobs
- `GET /v1/jobs?filters` - Get jobs with skill filters
- `GET /v1/jobs/:id` - Job details
- `POST /v1/jobs/:id/apply` - Apply for job
- `GET /v1/jobs/recommendations` - Personalized recommendations

---

## Frontend Components Structure

```
src/
├── pages/
│   ├── auth/
│   │   ├── otp-login.tsx
│   │   └── verify-mobile.tsx
│   ├── dsa/
│   │   ├── dsa-profile.tsx
│   │   └── connect-leetcode.tsx
│   ├── skills/
│   │   ├── claim-skill.tsx
│   │   └── my-skills.tsx
│   ├── resume/
│   │   ├── resume-builder.tsx
│   │   ├── resume-templates.tsx
│   │   └── resume-preview.tsx
│   ├── jobs/
│   │   ├── job-search.tsx
│   │   ├── job-detail.tsx
│   │   └── applications.tsx
│   └── discover/
│       └── search-users.tsx
├── components/
│   ├── dsa/
│   │   ├── dsa-stats.tsx
│   │   ├── leetcode-card.tsx
│   │   └── problem-tracker.tsx
│   ├── skills/
│   │   ├── skill-card.tsx
│   │   ├── skill-claim-modal.tsx
│   │   └── skill-verification-badge.tsx
│   ├── resume/
│   │   ├── templates/ (all templates)
│   │   └── resume-editor.tsx
│   └── job/
│       ├── job-card.tsx
│       ├── skill-filter.tsx
│       └── match-score.tsx
```

---

## Implementation Priority

1. **Priority 1 (Week 1):** OTP Auth + Email/Mobile verification
2. **Priority 2 (Week 2):** Username search + public profiles
3. **Priority 3 (Week 3):** DSA verification (LeetCode/GFG integration)
4. **Priority 4 (Week 4):** Skills claiming system
5. **Priority 5 (Week 5):** Enhanced AURA algorithm
6. **Priority 6 (Week 6):** Resume templates
7. **Priority 7 (Week 7):** Job platform enhancements
8. **Priority 8 (Week 8):** Polish & optimization

---

## Key Libraries Needed

- **SMS/OTP:** Twilio, AWS SNS
- **Resume PDF:** pdfkit, html2pdf
- **LeetCode API:** Web scraping (Puppeteer) or LeetCode GraphQL API
- **GeeksforGeeks:** Web scraping (Cheerio)
- **Rich Text Editor:** Tiptap, Draft.js
- **Resume Templates:** React-PDF, html2canvas

---

## Success Metrics

✅ OTP auth working for both email & mobile
✅ Username search discovers 100+ users per second
✅ DSA data synced from LeetCode (real-time or hourly)
✅ Skills claimed with 90%+ verification rate
✅ AURA score increases with DSA + skill diversity
✅ 5+ resume templates with PDF export
✅ Job filtering by skill category & DSA level
✅ 85%+ job match accuracy

