# VerifyDev Backend 🚀

> **Developer-first platform** with **verified skills** from code analysis, **auto-generated resumes**, and **intelligent job matching** for recruiters.

---

## 🏗️ Complete Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              VERIFYDEV PLATFORM                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│   👨‍💻 DEVELOPER FLOW                        👔 RECRUITER FLOW                     │
│   ────────────────────                      ─────────────────                     │
│   1. GitHub OAuth Login                     1. Register Organization              │
│   2. Add Projects                           2. Post Jobs                          │
│   3. Auto-Analyze Code                      3. Search Verified Candidates         │
│   4. Get Verified Skills                    4. View Aura Scores                   │
│   5. Generate Resume                        5. Shortlist & Hire                   │
│   6. Apply to Jobs                                                               │
│                                                                                   │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                              MICROSERVICES                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│   │   Auth      │ │   User      │ │   Job       │ │  Recruiter  │               │
│   │  Service    │ │  Service    │ │  Service    │ │  Service    │               │
│   │  (Node.js)  │ │  (Node.js)  │ │  (Node.js)  │ │  (Node.js)  │               │
│   │   :3001     │ │   :3002     │ │   :3004     │ │   :3005     │               │
│   └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘               │
│                                                                                   │
│   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                               │
│   │  Project    │ │   Resume    │ │    Aura     │                               │
│   │  Analyzer   │ │  Service    │ │  Processor  │                               │
│   │   (Go)      │ │   (Go)      │ │  (Node.js)  │                               │
│   │   :8001     │ │   :8003     │ │   Worker    │                               │
│   └─────────────┘ └─────────────┘ └─────────────┘                               │
│                                                                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                              INFRASTRUCTURE                                       │
│   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│   │ PostgreSQL  │ │   Redis     │ │  RabbitMQ   │ │   MinIO     │               │
│   │   :5432     │ │   :6379     │ │   :5672     │ │   :9000     │               │
│   │  Database   │ │   Cache     │ │   Queue     │ │  Storage    │               │
│   └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘               │
│                                                                                   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
verifybackend/
│
├── 🔐 auth-service/              # GitHub OAuth, JWT Authentication
│   ├── src/
│   │   ├── api/v1/               # Controllers, Routes
│   │   ├── services/             # Auth, GitHub, Token services
│   │   ├── middlewares/          # Auth, Error handling
│   │   └── config/               # Env, Redis
│   └── prisma/                   # Database schema
│
├── 👤 user-service/              # User Profile, Projects, Aura
│   ├── src/
│   │   ├── api/v1/               # User & Project endpoints
│   │   ├── domain/               # Profile, Aura, Visibility services
│   │   └── rabbitmq/             # Publish analyze requests
│   └── prisma/
│
├── 💼 job-service/               # Job Listings, Applications
│   ├── src/
│   │   ├── api/v1/               # Jobs, Applications endpoints
│   │   ├── domain/               # Job, Application services
│   │   └── validators/           # Zod schemas
│   └── prisma/
│
├── 👔 recruiter-service/         # Organization Dashboard, Candidate Search
│   ├── src/
│   │   ├── api/v1/               # Dashboard, Search, Shortlist
│   │   └── domain/               # Candidate service
│   └── prisma/
│
├── 🔍 project-analyzer/          # Code Analysis (Go)
│   ├── cmd/                      # Entry point
│   └── internal/
│       ├── analyzer/             # Main analysis logic
│       ├── parser/               # Language, framework detection
│       ├── git/                  # Repository cloning
│       └── rabbitmq/             # Consumer & Publisher
│
├── 📄 resume-service/            # PDF Resume Generation (Go)
│   ├── cmd/                      # Entry point
│   └── internal/
│       ├── generator/            # PDF generation with chromedp
│       ├── templates/            # Resume HTML templates
│       └── worker/               # Background processing
│
├── ⚡ aura-processor/            # Score Calculation (Worker)
│   └── src/
│       ├── consumers/            # RabbitMQ message handlers
│       └── processors/           # Aura calculation logic
│
├── docker-compose.yml            # Full stack deployment
├── feature.md                    # Feature documentation
├── architecture.md               # Technical architecture
└── readme.md                     # This file
```

---

## 🔄 Complete Flow

### Developer Journey

```
┌──────────────────────────────────────────────────────────────────┐
│  1. LOGIN                                                        │
│     └─► GitHub OAuth ─► Auth Service ─► JWT Tokens               │
│                                                                  │
│  2. ADD PROJECT                                                  │
│     └─► User adds GitHub repo URL                                │
│     └─► User Service ─► RabbitMQ (project.analyze.request)       │
│                                                                  │
│  3. ANALYZE CODE (Async)                                         │
│     └─► Project Analyzer clones repo                            │
│     └─► Detects frameworks, patterns, quality                    │
│     └─► Publishes signals to RabbitMQ (project.analyzed)         │
│                                                                  │
│  4. CALCULATE AURA (Async)                                       │
│     └─► Aura Processor consumes signals                          │
│     └─► Calculates scores (Structure, Quality, Testing...)       │
│     └─► Updates User profile with skills & aura                  │
│                                                                  │
│  5. VIEW PROFILE                                                 │
│     └─► Verified Skills with percentages                         │
│     └─► Aura Score & Level                                       │
│     └─► Core Count (1-3)                                         │
│                                                                  │
│  6. GENERATE RESUME                                              │
│     └─► Resume Service creates PDF with verified skills          │
│     └─► Multiple templates (Modern, Classic, Developer)          │
│                                                                  │
│  7. APPLY TO JOBS                                                │
│     └─► Browse matched jobs (based on skills)                   │
│     └─► One-click apply with auto-attached profile               │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Recruiter Journey

```
┌──────────────────────────────────────────────────────────────────┐
│  1. REGISTER ORGANIZATION                                        │
│     └─► Create company profile                                   │
│     └─► Add team members                                         │
│                                                                  │
│  2. POST JOBS                                                    │
│     └─► Define requirements (skills, aura, cores)               │
│     └─► Job Service stores listing                               │
│                                                                  │
│  3. SEARCH CANDIDATES                                            │
│     └─► Filter by verified skills                                │
│     └─► Filter by aura score                                     │
│     └─► Filter by core count                                     │
│     └─► See code quality metrics                                 │
│                                                                  │
│  4. REVIEW & SHORTLIST                                           │
│     └─► View candidate profiles                                  │
│     └─► See analyzed projects                                    │
│     └─► Shortlist best matches                                   │
│                                                                  │
│  5. HIRE                                                         │
│     └─► Contact candidates                                       │
│     └─► Schedule interviews                                      │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 📡 API Endpoints Summary

### Auth Service `:3001`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/auth/github` | Start GitHub OAuth |
| GET | `/api/v1/auth/github/callback` | OAuth callback |
| POST | `/api/v1/auth/refresh` | Refresh token |
| POST | `/api/v1/auth/logout` | Logout |
| GET | `/api/v1/auth/me` | Current user |

### User Service `:3002`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/users/me` | Get profile |
| PUT | `/api/v1/users/me` | Update profile |
| GET | `/api/v1/users/me/aura` | Get aura |
| POST | `/api/v1/projects` | Add project |
| GET | `/api/v1/projects` | List projects |
| POST | `/api/v1/projects/:id/analyze` | Re-analyze |
| GET | `/api/v1/u/:username` | Public profile |

### Job Service `:3004`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/jobs` | List jobs |
| GET | `/api/v1/jobs/:id` | Job details |
| GET | `/api/v1/jobs/matched` | Matched jobs |
| POST | `/api/v1/jobs/:id/apply` | Apply |
| GET | `/api/v1/applications` | My applications |

### Recruiter Service `:3005`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/dashboard` | Dashboard stats |
| GET | `/api/v1/candidates/search` | Search candidates |
| GET | `/api/v1/candidates/:id` | Candidate profile |
| POST | `/api/v1/candidates/:id/shortlist` | Shortlist |
| GET | `/api/v1/shortlist` | My shortlist |

### Resume Service `:8003`
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/resumes/generate` | Generate PDF |
| POST | `/api/v1/resumes/preview` | HTML preview |

---

## 🎯 Aura Scoring System

### Score Breakdown (per project, max 100)

| Category | Points | What It Measures |
|----------|--------|------------------|
| **Structure** | 20 | Folder organization, patterns |
| **Code Quality** | 25 | Linting, TypeScript, Docker, CI |
| **Testing** | 20 | Test files, coverage |
| **Documentation** | 15 | README, comments |
| **Tech Stack** | 15 | Modern frameworks |
| **Complexity** | 5 | Project size |

### Aura Levels

| Level | Score | Badge |
|-------|-------|-------|
| Novice | 0-100 | 🌱 |
| Rising | 101-250 | ⭐ |
| Skilled | 251-400 | 💫 |
| Expert | 401-500 | 🔥 |
| Legend | 501+ | 👑 |

### Core System

| Cores | Meaning |
|-------|---------|
| ⚡ | 1 Core - Beginner |
| ⚡⚡ | 2 Cores - Intermediate |
| ⚡⚡⚡ | 3 Cores - Advanced |

---

## 🚀 Quick Start

### 1. Start Infrastructure

```bash
docker-compose up -d postgres redis rabbitmq minio
```

### 2. Run Services

```bash
# Terminal 1 - Auth
cd auth-service && npm install && npm run dev

# Terminal 2 - User
cd user-service && npm install && npm run dev

# Terminal 3 - Job
cd job-service && npm install && npm run dev

# Terminal 4 - Recruiter
cd recruiter-service && npm install && npm run dev

# Terminal 5 - Project Analyzer (Go)
cd project-analyzer && go mod tidy && go run cmd/main.go

# Terminal 6 - Resume Service (Go)
cd resume-service && go mod tidy && go run cmd/main.go

# Terminal 7 - Aura Processor
cd aura-processor && npm install && npm run dev
```

### 3. Access

| Service | URL |
|---------|-----|
| Auth | http://localhost:3001 |
| User | http://localhost:3002 |
| Job | http://localhost:3004 |
| Recruiter | http://localhost:3005 |
| Analyzer | http://localhost:8001 |
| Resume | http://localhost:8003 |
| RabbitMQ UI | http://localhost:15672 |
| MinIO Console | http://localhost:9001 |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Node.js Services** | Express, Prisma, Zod, Pino |
| **Go Services** | Gin, go-git, chromedp, zerolog |
| **Database** | PostgreSQL |
| **Cache** | Redis |
| **Message Queue** | RabbitMQ |
| **Object Storage** | MinIO/S3 |
| **Auth** | GitHub OAuth, JWT |
| **PDF Generation** | Chromedp (headless Chrome) |

---

## 📋 Service Summary

| Service | Language | Port | Responsibility |
|---------|----------|------|----------------|
| Auth | Node.js | 3001 | GitHub OAuth, JWT |
| User | Node.js | 3002 | Profile, Projects |
| Job | Node.js | 3004 | Job listings |
| Recruiter | Node.js | 3005 | Candidate search |
| Analyzer | Go | 8001 | Code analysis |
| Resume | Go | 8003 | PDF generation |
| Aura Processor | Node.js | Worker | Score calculation |

---

**Built with ❤️ for developers who want to stand out with verified skills, not just keywords.**
