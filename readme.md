# VerifyDev Backend 🚀

> **Developer verification platform** that proves skills through actual code analysis, not just keywords on resumes.

[![Go](https://img.shields.io/badge/Go-1.21-00ADD8?logo=go)](https://go.dev)
[![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql)](https://www.postgresql.org)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-3.12-FF6600?logo=rabbitmq)](https://www.rabbitmq.com)

---

## 📋 Table of Contents

- [Features](#-features-implemented)
- [Architecture](#-architecture)
- [Services](#-services)
- [API Reference](#-api-reference)
- [Quick Start](#-quick-start)
- [Database Schema](#-database-schema)

---

## ✅ Features Implemented

### 🔐 Authentication System
| Feature | Status | Details |
|---------|--------|---------|
| GitHub OAuth Login | ✅ Done | One-click login with GitHub |
| JWT Access/Refresh Tokens | ✅ Done | Secure token-based auth |
| Token Refresh | ✅ Done | Auto-refresh expired tokens |
| Token Blacklisting | ✅ Done | Redis-based logout |
| Session Management | ✅ Done | Multiple device support |

### 👤 User Profile
| Feature | Status | Details |
|---------|--------|---------|
| Profile Management | ✅ Done | Update bio, location, links |
| Public Profiles | ✅ Done | `/u/:username` public view |
| Profile Completeness | ✅ Done | Track completion percentage |
| Social Links | ✅ Done | GitHub, LinkedIn, Twitter, etc. |
| Privacy Settings | ✅ Done | Control profile visibility |
| Open to Work Status | ✅ Done | Toggle availability |

### 📁 Project Analysis
| Feature | Status | Details |
|---------|--------|---------|
| Add Single Project | ✅ Done | Analyze one GitHub repo |
| **Batch Analysis (Max 3)** | ✅ Done | Analyze up to 3 repos at once |
| Project Limit (Free Tier) | ✅ Done | Max 10 projects |
| Re-analyze Project | ✅ Done | Trigger fresh analysis |
| Pin Projects | ✅ Done | Highlight best projects |
| Delete Projects | ✅ Done | Remove from profile |
| Async Processing | ✅ Done | RabbitMQ queue-based |

### 🔍 Code Analyzer (Go)
| Feature | Status | Details |
|---------|--------|---------|
| Repository Cloning | ✅ Done | Clone public/private repos |
| Language Detection | ✅ Done | Detect primary language |
| Lines of Code Count | ✅ Done | Total LOC per language |
| Folder Structure Analysis | ✅ Done | src/, components/, tests/, etc. |
| Code Quality Signals | ✅ Done | ESLint, Prettier, TypeScript |
| CI/CD Detection | ✅ Done | GitHub Actions, GitLab CI |
| Docker Detection | ✅ Done | Dockerfile, docker-compose |
| Test Detection | ✅ Done | Count test files |
| React Analysis | ✅ Done | Hooks, memoization, patterns |
| Framework Detection | ✅ Done | React, Node, Go, etc. |
| Database Detection | ✅ Done | PostgreSQL, MongoDB, Redis |
| Auto Cleanup | ✅ Done | Delete cloned repos after analysis |

### ⚡ Aura Scoring System
| Feature | Status | Details |
|---------|--------|---------|
| Project Score (max 100) | ✅ Done | Per-project score |
| Score Breakdown | ✅ Done | Structure, Quality, Testing, Docs, Tech, Complexity |
| Total Aura Score | ✅ Done | Sum of all project scores |
| Aura Levels | ✅ Done | Novice → Legend |
| Skills Extraction | ✅ Done | Auto-detect skills from code |
| Verified Skills | ✅ Done | Skills proven by code |
| **Optimization Suggestions** | ✅ Done | Actionable improvements |
| **Best Practices Analysis** | ✅ Done | What's followed vs missing |
| **Framework-Specific Insights** | ✅ Done | React patterns, Node patterns |

### ⭐ Core System
| Feature | Status | Details |
|---------|--------|---------|
| Core Count (1-3) | ✅ Done | Based on GitHub activity |
| Public Repos Factor | ✅ Done | More repos = more cores |
| Followers Factor | ✅ Done | Community influence |
| Account Age Factor | ✅ Done | Experience level |

### 📄 Resume Service (Go)
| Feature | Status | Details |
|---------|--------|---------|
| PDF Generation | ✅ Done | High-quality PDF resumes |
| Modern Template | ✅ Done | Dark theme with verified badges |
| Verified Skills Display | ✅ Done | Skills with percentages |
| Project Highlights | ✅ Done | Top analyzed projects |
| Aura Badge | ✅ Done | Level + score display |
| Core Indicator | ✅ Done | Visual core display |
| HTML Preview | ✅ Done | Preview before download |

### 💼 Job Service
| Feature | Status | Details |
|---------|--------|---------|
| Job Listings | ✅ Done | Browse available jobs |
| Job Details | ✅ Done | Full job description |
| Job Filters | ✅ Done | Type, level, remote, skills |
| Matched Jobs | ✅ Done | Jobs matching user's skills |
| Job Application | ✅ Done | One-click apply |
| Application Status | ✅ Done | Track applications |
| Withdraw Application | ✅ Done | Cancel applications |
| Skill Requirements | ✅ Done | Min skill scores for jobs |
| Aura Requirements | ✅ Done | Min aura for jobs |

### 👔 Recruiter Service
| Feature | Status | Details |
|---------|--------|---------|
| Candidate Search | ✅ Done | Filter by skills, aura, cores |
| **Full Candidate Profile** | ✅ Done | All details for recruiters |
| **Resume View** | ✅ Done | View candidate's resume |
| **Analyzed Projects View** | ✅ Done | See all project analysis |
| **Code Quality Metrics** | ✅ Done | Quality scores visible |
| Shortlist Candidates | ✅ Done | Save for later |
| Dashboard Stats | ✅ Done | Applications, jobs, candidates |
| Skill Score Filter | ✅ Done | Filter by min skill % |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              VERIFYDEV PLATFORM                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│   ┌─────────────────────────────────────────────────────────────────────────┐    │
│   │                         FRONTEND (React/Next.js)                          │    │
│   └───────────────────────────────────┬─────────────────────────────────────┘    │
│                                       │                                           │
│   ┌───────────────────────────────────▼─────────────────────────────────────┐    │
│   │                         API GATEWAY (Future)                              │    │
│   └───────────────────────────────────┬─────────────────────────────────────┘    │
│                                       │                                           │
│   ┌───────────┬───────────┬───────────┼───────────┬───────────┬───────────┐     │
│   │           │           │           │           │           │           │     │
│   ▼           ▼           ▼           ▼           ▼           ▼           ▼     │
│ ┌─────┐   ┌─────┐   ┌─────┐   ┌─────────┐   ┌─────┐   ┌─────┐   ┌─────┐        │
│ │Auth │   │User │   │ Job │   │Recruiter│   │Resume│   │Aura │   │Proj │        │
│ │Svc  │   │Svc  │   │Svc  │   │  Svc    │   │ Svc  │   │Proc │   │Anlz │        │
│ │Node │   │Node │   │Node │   │ Node    │   │ Go   │   │Node │   │ Go  │        │
│ │:3001│   │:3002│   │:3004│   │ :3005   │   │:8003 │   │Worker│   │:8001│        │
│ └──┬──┘   └──┬──┘   └──┬──┘   └────┬────┘   └──┬───┘   └──┬───┘   └──┬──┘        │
│    │         │         │           │           │          │          │           │
│    └─────────┴─────────┴───────────┴───────────┴──────────┴──────────┘           │
│                                       │                                           │
│   ┌───────────────────────────────────▼─────────────────────────────────────┐    │
│   │                                                                           │    │
│   │   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐             │    │
│   │   │PostgreSQL│   │  Redis   │   │ RabbitMQ │   │  MinIO   │             │    │
│   │   │  :5432   │   │  :6379   │   │  :5672   │   │  :9000   │             │    │
│   │   │ Database │   │  Cache   │   │  Queue   │   │ Storage  │             │    │
│   │   └──────────┘   └──────────┘   └──────────┘   └──────────┘             │    │
│   │                                                                           │    │
│   └───────────────────────────────────────────────────────────────────────────┘    │
│                                                                                   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow

### Project Analysis Flow

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                                                                   │
│   1. User adds project(s)                                                         │
│      └─► POST /api/v1/projects/batch                                             │
│          { projects: [{ githubRepoUrl, repoName }, ...] } (max 3)                │
│                                                                                   │
│   2. User Service                                                                 │
│      └─► Saves to PostgreSQL (status: PROCESSING)                                │
│      └─► Publishes to RabbitMQ: project.analyze.request                          │
│                                                                                   │
│   3. Project Analyzer (Go)                                                        │
│      └─► Clones repository                                                        │
│      └─► Analyzes: languages, structure, patterns, frameworks                    │
│      └─► Extracts signals (facts about code)                                      │
│      └─► Deletes cloned repo                                                      │
│      └─► Publishes to RabbitMQ: project.analyzed                                 │
│                                                                                   │
│   4. Aura Processor (Node)                                                        │
│      └─► Calculates scores from signals                                           │
│      └─► Generates optimizations & best practices                                 │
│      └─► Updates project with full analysis                                       │
│      └─► Creates/updates verified skills                                          │
│      └─► Updates user's total aura score                                          │
│                                                                                   │
│   5. User/Recruiter views results                                                 │
│      └─► Verified skills with percentages                                         │
│      └─► Project scores with breakdown                                            │
│      └─► Optimization suggestions                                                 │
│      └─► Best practices analysis                                                  │
│                                                                                   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Services

| Service | Language | Port | Responsibility |
|---------|----------|------|----------------|
| **auth-service** | Node.js | 3001 | GitHub OAuth, JWT tokens |
| **user-service** | Node.js | 3002 | Profiles, Projects, Aura |
| **job-service** | Node.js | 3004 | Job listings, Applications |
| **recruiter-service** | Node.js | 3005 | Candidate search, Dashboard |
| **project-analyzer** | Go | 8001 | Clone repos, Analyze code |
| **resume-service** | Go | 8003 | PDF generation |
| **aura-processor** | Node.js | Worker | Score calculation |

---

## 📡 API Reference

### Auth Service `:3001`

```http
GET  /api/v1/auth/github           # Start OAuth
GET  /api/v1/auth/github/callback  # OAuth callback
POST /api/v1/auth/refresh          # Refresh token
POST /api/v1/auth/logout           # Logout
GET  /api/v1/auth/me               # Current user
```

### User Service `:3002`

```http
# Profile
GET  /api/v1/users/me              # Get my profile
PUT  /api/v1/users/me              # Update profile
GET  /api/v1/users/me/aura         # Get aura summary
GET  /api/v1/u/:username           # Public profile
GET  /api/v1/u/:username/aura      # Public aura

# Projects
POST /api/v1/projects              # Add single project
POST /api/v1/projects/batch        # Add up to 3 projects ✨
GET  /api/v1/projects              # List my projects
GET  /api/v1/projects/:id          # Get project
DELETE /api/v1/projects/:id        # Delete project
POST /api/v1/projects/:id/analyze  # Re-analyze
POST /api/v1/projects/:id/pin      # Toggle pin
```

### Job Service `:3004`

```http
GET  /api/v1/jobs                  # List jobs with filters
GET  /api/v1/jobs/:id              # Job details
GET  /api/v1/jobs/matched          # Jobs matching my skills
POST /api/v1/jobs/:id/apply        # Apply to job
GET  /api/v1/applications          # My applications
DELETE /api/v1/applications/:id    # Withdraw
```

### Recruiter Service `:3005`

```http
GET  /api/v1/dashboard                    # Dashboard stats
GET  /api/v1/candidates/search            # Search candidates
GET  /api/v1/candidates/:id               # Basic profile
GET  /api/v1/candidates/:id/full          # Full profile + analysis ✨
GET  /api/v1/candidates/:id/resume        # Resume data ✨
POST /api/v1/candidates/:id/shortlist     # Shortlist
GET  /api/v1/shortlist                    # My shortlist
```

### Resume Service `:8003`

```http
POST /api/v1/resumes/generate      # Generate PDF
POST /api/v1/resumes/preview       # HTML preview
```

---

## 📊 Aura Scoring

### Score Breakdown (per project, max 100)

| Category | Max Points | What It Measures |
|----------|------------|------------------|
| **Structure** | 20 | src/, components/, types/, utils/ |
| **Code Quality** | 25 | ESLint, Prettier, TypeScript, Docker, CI |
| **Testing** | 20 | Test files, coverage |
| **Documentation** | 15 | README, docs/, comments |
| **Tech Stack** | 15 | Modern frameworks & tools |
| **Complexity** | 5 | Lines of code, languages used |

### Aura Levels

| Level | Score | Badge |
|-------|-------|-------|
| **Novice** | 0-100 | 🌱 |
| **Rising** | 101-250 | ⭐ |
| **Skilled** | 251-400 | 💫 |
| **Expert** | 401-500 | 🔥 |
| **Legend** | 501+ | 👑 |

### Core System

| Cores | Meaning | Requirements |
|-------|---------|--------------|
| ⚡ | 1 Core | New developer |
| ⚡⚡ | 2 Cores | Active contributor |
| ⚡⚡⚡ | 3 Cores | Established developer |

---

## 🔍 Analysis Output Example

When a project is analyzed, recruiters see:

```json
{
  "overallScore": 85,
  "breakdown": {
    "structure": 18,
    "codeQuality": 22,
    "testing": 15,
    "documentation": 12,
    "techStack": 13,
    "complexity": 5
  },
  
  "folderStructure": {
    "hasSrcFolder": true,
    "hasComponents": true,
    "hasTests": true,
    "hasTypes": true,
    "organizationScore": 90
  },
  
  "bestPractices": {
    "followed": [
      "TypeScript strict mode",
      "ESLint + Prettier",
      "Docker containerization",
      "CI/CD with GitHub Actions",
      "Environment documentation"
    ],
    "missing": [
      "Integration tests",
      "API documentation (Swagger)"
    ]
  },
  
  "optimizations": [
    {
      "category": "performance",
      "priority": "medium",
      "title": "Add useMemo for expensive calculations",
      "impact": "Reduces unnecessary re-renders"
    },
    {
      "category": "structure",
      "priority": "high",
      "title": "Add Error Boundaries",
      "impact": "Better error handling"
    }
  ],
  
  "frameworkAnalysis": {
    "framework": "React",
    "patternsDetected": ["Custom Hooks", "Context API", "Lazy Loading"],
    "advancedUsage": ["useMemo", "useCallback"],
    "suggestions": ["Consider React Query for server state"]
  }
}
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Go 1.21+
- Docker & Docker Compose

### 1. Start Infrastructure

```bash
docker-compose up -d postgres redis rabbitmq minio
```

### 2. Setup Each Service

```bash
# Auth Service
cd auth-service
npm install
cp .env.example .env
npx prisma migrate dev
npm run dev

# User Service
cd ../user-service
npm install
cp .env.example .env
npx prisma generate
npm run dev

# Job Service
cd ../job-service
npm install
npm run dev

# Recruiter Service
cd ../recruiter-service
npm install
npm run dev

# Project Analyzer (Go)
cd ../project-analyzer
go mod tidy
go run cmd/main.go

# Resume Service (Go)
cd ../resume-service
go mod tidy
go run cmd/main.go

# Aura Processor
cd ../aura-processor
npm install
npx prisma generate
npm run dev
```

### 3. Access Services

| Service | URL |
|---------|-----|
| Auth | http://localhost:3001 |
| User | http://localhost:3002 |
| Job | http://localhost:3004 |
| Recruiter | http://localhost:3005 |
| Analyzer | http://localhost:8001 |
| Resume | http://localhost:8003 |
| RabbitMQ UI | http://localhost:15672 |
| MinIO | http://localhost:9001 |

---

## 🗄 Database Schema

### Core Models

```
User
├── id, githubId, username, email
├── name, avatarUrl, bio, location
├── auraScore, coreCount
├── isOpenToWork, isVerified, isPublic
└── createdAt, lastLoginAt

Project
├── id, userId, repoName, githubRepoUrl
├── analysisStatus (PENDING, PROCESSING, COMPLETED, FAILED)
├── overallScore, codeQualityScore, structureScore
├── primaryLanguage, technologies[]
├── analysisData (JSON - full analysis)
└── analyzedAt

Skill
├── id, userId, name, category
├── verifiedScore, projectCount
├── isVerified, evidence[]
└── auraContribution

Activity
├── id, userId, type, points, metadata
└── createdAt
```

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **Node.js** | Express, Prisma, Zod, Pino, amqplib |
| **Go** | Gin, go-git, chromedp, zerolog, amqp091 |
| **Database** | PostgreSQL 15 |
| **Cache** | Redis 7 |
| **Queue** | RabbitMQ 3.12 |
| **Storage** | MinIO (S3-compatible) |
| **Auth** | GitHub OAuth, JWT |
| **PDF** | chromedp (headless Chrome) |

---

## 📝 Environment Variables

```env
# Database
DATABASE_URL=postgresql://verifydev:verifydev123@localhost:5432/verifydev

# Redis
REDIS_URL=redis://localhost:6379

# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@localhost:5672

# GitHub OAuth
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_secret
GITHUB_TOKEN=your_pat_for_private_repos

# JWT
JWT_ACCESS_SECRET=min_32_characters_secret
JWT_REFRESH_SECRET=min_32_characters_secret
```

---

## 📄 License

MIT License

---

**Built with ❤️ for developers who want to prove their skills through code, not keywords.**
