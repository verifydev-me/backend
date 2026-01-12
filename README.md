# VerifyDev Backend - Microservices Architecture

> A comprehensive developer verification and recruitment platform built with modern microservices architecture.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture Diagram](#architecture-diagram)
- [Services Overview](#services-overview)
- [Technology Stack](#technology-stack)
- [Design Patterns](#design-patterns)
- [Request Flow](#request-flow)
- [Authentication Flow](#authentication-flow)
- [Project Analysis Flow](#project-analysis-flow)
- [Database Architecture](#database-architecture)
- [Message Queue Architecture](#message-queue-architecture)
- [API Gateway Pattern](#api-gateway-pattern)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)

---

## 🎯 Overview

VerifyDev is a platform that **verifies developer skills** by analyzing their GitHub projects. It provides:
- 🔍 Automated project analysis using AI
- 📊 Skill verification and scoring (Aura Points)
- 👔 Recruiter dashboard for talent discovery
- 📄 Auto-generated resumes based on verified skills

---

## 🏗️ Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                       │
│  │   Web App    │  │  Mobile App  │  │  Admin Panel │                       │
│  │   (Next.js)  │  │   (React     │  │              │                       │
│  │              │  │    Native)   │  │              │                       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                       │
└─────────┼─────────────────┼─────────────────┼───────────────────────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         API GATEWAY (Port 8000)                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  • Rate Limiting    • CORS Handling    • Request Routing            │   │
│  │  • Load Balancing   • SSL Termination  • Request/Response Logging   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MICROSERVICES LAYER                                │
│                                                                              │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐                │
│  │  Auth Service  │  │  User Service  │  │  Job Service   │                │
│  │   (Port 3001)  │  │   (Port 3002)  │  │   (Port 3003)  │                │
│  │                │  │                │  │                │                │
│  │ • GitHub OAuth │  │ • Profile CRUD │  │ • Job Listings │                │
│  │ • JWT Tokens   │  │ • Skills Mgmt  │  │ • Applications │                │
│  │ • Sessions     │  │ • Projects     │  │ • Matching     │                │
│  │ • OTP/2FA      │  │ • Experience   │  │                │                │
│  └────────────────┘  └────────────────┘  └────────────────┘                │
│                                                                              │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐                │
│  │Recruiter Svc   │  │Resume Service  │  │ Aura Processor │                │
│  │   (Port 3004)  │  │   (Port 3005)  │  │   (Port 3006)  │                │
│  │                │  │                │  │                │                │
│  │ • Candidates   │  │ • PDF Generate │  │ • Score Calc   │                │
│  │ • Search       │  │ • Templates    │  │ • Skill Points │                │
│  │ • Shortlist    │  │ • Export       │  │ • Leaderboard  │                │
│  └────────────────┘  └────────────────┘  └────────────────┘                │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Project Analyzer (Go Engine)                      │   │
│  │                         (Port 8080)                                  │   │
│  │  • GitHub Repo Cloning    • Tech Stack Detection    • AI Analysis   │   │
│  │  • Dependency Scanning    • Code Quality Metrics    • Skill Extract │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MESSAGE QUEUE & CACHE                                │
│                                                                              │
│  ┌────────────────────────────┐    ┌────────────────────────────┐          │
│  │       RabbitMQ             │    │          Redis             │          │
│  │      (Port 5672)           │    │        (Port 6379)         │          │
│  │                            │    │                            │          │
│  │ • project.analyze          │    │ • Session Cache            │          │
│  │ • project.analysis.result  │    │ • Rate Limiting            │          │
│  │ • aura.calculate           │    │ • Job Queue                │          │
│  │ • notification.send        │    │ • Temporary Data           │          │
│  └────────────────────────────┘    └────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            DATABASE LAYER                                    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      MongoDB (Atlas Cloud)                           │   │
│  │                                                                      │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │   │
│  │  │  Users   │  │ Sessions │  │ Projects │  │   Jobs   │            │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘            │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │   │
│  │  │  Skills  │  │Experience│  │Recruiters│  │Activities│            │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Services Overview

| Service | Port | Technology | Description |
|---------|------|------------|-------------|
| **Gateway** | 8000 | Go (Gin) | API Gateway - routing, rate limiting, CORS |
| **Auth Service** | 3001 | Node.js (Express) | Authentication, OAuth, Sessions |
| **User Service** | 3002 | Node.js (Express) | User profiles, skills, projects |
| **Job Service** | 3003 | Node.js (Express) | Job listings, applications |
| **Recruiter Service** | 3004 | Node.js (Express) | Recruiter dashboard, candidate search |
| **Resume Service** | 3005 | Node.js (Express) | PDF resume generation |
| **Aura Processor** | 3006 | Node.js (Express) | Score calculation, leaderboard |
| **Project Analyzer** | 8080 | Go | GitHub analysis, tech detection |

---

## 🛠️ Technology Stack

### Backend Services
```
┌─────────────────────────────────────────────────────────┐
│  Language: TypeScript (Node.js) / Go                    │
│  Framework: Express.js / Gin                            │
│  ORM: Prisma                                            │
│  Database: MongoDB (Atlas)                              │
│  Cache: Redis                                           │
│  Message Queue: RabbitMQ                                │
│  Container: Docker + Docker Compose                     │
│  CI/CD: GitHub Actions                                  │
│  Cloud: Azure VM                                        │
└─────────────────────────────────────────────────────────┘
```

### AI/ML Integration
```
┌─────────────────────────────────────────────────────────┐
│  LLM: Google Gemini API                                 │
│  Purpose: Code analysis, skill extraction, scoring      │
└─────────────────────────────────────────────────────────┘
```

---

## 🎨 Design Patterns

### 1. **API Gateway Pattern**
```
Client → Gateway → Service
         ↓
    • Authentication check
    • Rate limiting
    • Request routing
    • Response aggregation
```

### 2. **Microservices Pattern**
- Each service has its own database schema
- Services communicate via REST APIs or Message Queues
- Independent deployment and scaling

### 3. **Event-Driven Architecture**
```
User Service                    RabbitMQ                 Project Analyzer
     │                              │                           │
     │ publish(project.analyze) ───►│                           │
     │                              │◄── consume ───────────────│
     │                              │                           │
     │◄── publish(result) ─────────│                           │
```

### 4. **JWT Authentication (Stateless)**
```
┌─────────────────────────────────────────────────────────┐
│  1. Auth Service issues JWT (access + refresh tokens)   │
│  2. Each service verifies JWT independently             │
│  3. No inter-service calls for auth (fast)              │
│  4. Same JWT_SECRET shared across services              │
└─────────────────────────────────────────────────────────┘
```

### 5. **Repository Pattern (Prisma)**
```typescript
// Example: User Service
Controller → Service → Prisma Client → MongoDB
```

### 6. **Health Check Pattern**
```
Gateway checks health of all downstream services
Each service exposes /health endpoint
```

---

## 🔄 Request Flow

### Typical API Request
```
┌─────────┐     ┌─────────┐     ┌─────────────┐     ┌──────────┐
│ Client  │────►│ Gateway │────►│ User Service│────►│ MongoDB  │
└─────────┘     └─────────┘     └─────────────┘     └──────────┘
     │               │                 │                  │
     │  1. Request   │                 │                  │
     │ ─────────────►│ 2. Route        │                  │
     │               │ ───────────────►│ 3. DB Query      │
     │               │                 │ ─────────────────►
     │               │                 │◄─────────────────
     │               │◄────────────────│ 4. Response      │
     │◄──────────────│ 5. Response     │                  │
```

---

## 🔐 Authentication Flow

### GitHub OAuth Flow
```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  1. User clicks "Login with GitHub"                                      │
│     │                                                                    │
│     ▼                                                                    │
│  2. Frontend redirects to: /api/v1/auth/github                          │
│     │                                                                    │
│     ▼                                                                    │
│  3. Gateway proxies to Auth Service                                      │
│     │                                                                    │
│     ▼                                                                    │
│  4. Auth Service redirects to GitHub OAuth                               │
│     │                                                                    │
│     ▼                                                                    │
│  5. User authorizes on GitHub                                            │
│     │                                                                    │
│     ▼                                                                    │
│  6. GitHub redirects to callback: /api/v1/auth/github/callback           │
│     │                                                                    │
│     ▼                                                                    │
│  7. Auth Service:                                                        │
│     • Exchanges code for GitHub access token                             │
│     • Fetches user info from GitHub API                                  │
│     • Creates/updates user in MongoDB                                    │
│     • Creates session                                                    │
│     • Generates JWT tokens (access + refresh)                            │
│     │                                                                    │
│     ▼                                                                    │
│  8. Redirects to Frontend with tokens                                    │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### JWT Token Structure
```javascript
// Access Token (short-lived: 15 minutes)
{
  userId: "user_id",
  sessionId: "session_id",
  type: "access",
  exp: 1234567890
}

// Refresh Token (long-lived: 7 days)
{
  userId: "user_id",
  sessionId: "session_id",
  type: "refresh",
  exp: 1234567890
}
```

---

## 📊 Project Analysis Flow

### How Project Analysis Works
```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  1. User selects GitHub repository to analyze                            │
│     │                                                                    │
│     ▼                                                                    │
│  2. User Service creates Project record (status: "pending")              │
│     │                                                                    │
│     ▼                                                                    │
│  3. User Service publishes to RabbitMQ:                                  │
│     Queue: project.analyze                                               │
│     Payload: { projectId, repoUrl, userId, githubToken }                 │
│     │                                                                    │
│     ▼                                                                    │
│  4. Project Analyzer (Go) consumes message:                              │
│     • Clones repository                                                  │
│     • Scans file structure                                               │
│     • Detects tech stack (package.json, go.mod, etc.)                    │
│     • Analyzes code quality                                              │
│     • Uses Gemini AI for deep analysis                                   │
│     • Extracts skills with confidence scores                             │
│     │                                                                    │
│     ▼                                                                    │
│  5. Project Analyzer publishes result to RabbitMQ:                       │
│     Queue: project.analysis.result                                       │
│     Payload: { projectId, skills, metrics, summary }                     │
│     │                                                                    │
│     ▼                                                                    │
│  6. User Service consumes result:                                        │
│     • Updates Project record (status: "completed")                       │
│     • Updates user's verified skills                                     │
│     • Triggers Aura score recalculation                                  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Tech Stack Detection
```
Project Analyzer detects:
├── Languages: TypeScript, JavaScript, Go, Python, Rust, etc.
├── Frameworks: Next.js, React, Express, Gin, FastAPI, etc.
├── Databases: MongoDB, PostgreSQL, Redis, etc.
├── Infrastructure: Docker, Kubernetes, AWS, etc.
├── Tools: Git, CI/CD, Testing frameworks, etc.
└── Architecture: Microservices, Monolith, Serverless, etc.
```

---

## 🗄️ Database Architecture

### Collections Structure
```
MongoDB Database: verifydev
│
├── users
│   ├── _id (ObjectId)
│   ├── githubId (unique)
│   ├── username (unique)
│   ├── email
│   ├── name
│   ├── avatarUrl
│   ├── auraScore
│   ├── auraLevel
│   ├── isVerified
│   └── ...
│
├── sessions
│   ├── _id (ObjectId)
│   ├── userId (ref: users)
│   ├── refreshToken
│   ├── userAgent
│   ├── ipAddress
│   ├── isValid
│   └── expiresAt
│
├── projects
│   ├── _id (ObjectId)
│   ├── userId (ref: users)
│   ├── repoFullName
│   ├── repoUrl
│   ├── status (pending|analyzing|completed|failed)
│   ├── analysisResult (JSON)
│   └── skills (JSON array)
│
├── skills
│   ├── _id (ObjectId)
│   ├── userId (ref: users)
│   ├── name
│   ├── category
│   ├── level
│   ├── isVerified
│   └── verifiedAt
│
├── experiences
│   ├── _id (ObjectId)
│   ├── userId (ref: users)
│   ├── company
│   ├── title
│   ├── startDate
│   ├── endDate
│   └── description
│
├── jobs
│   ├── _id (ObjectId)
│   ├── recruiterId (ref: recruiters)
│   ├── title
│   ├── company
│   ├── location
│   ├── salary
│   ├── requirements
│   └── skills
│
├── applications
│   ├── _id (ObjectId)
│   ├── jobId (ref: jobs)
│   ├── userId (ref: users)
│   ├── status
│   └── appliedAt
│
└── recruiters
    ├── _id (ObjectId)
    ├── email
    ├── company
    └── ...
```

---

## 📨 Message Queue Architecture

### RabbitMQ Queues
```
┌─────────────────────────────────────────────────────────┐
│                      QUEUES                              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  project.analyze                                         │
│  ├── Producer: User Service                              │
│  ├── Consumer: Project Analyzer                          │
│  └── Purpose: Trigger project analysis                   │
│                                                          │
│  project.analysis.result                                 │
│  ├── Producer: Project Analyzer                          │
│  ├── Consumer: User Service                              │
│  └── Purpose: Receive analysis results                   │
│                                                          │
│  aura.calculate                                          │
│  ├── Producer: User Service                              │
│  ├── Consumer: Aura Processor                            │
│  └── Purpose: Recalculate user's Aura score              │
│                                                          │
│  notification.send                                       │
│  ├── Producer: Various services                          │
│  ├── Consumer: Notification Service (future)             │
│  └── Purpose: Send emails, push notifications            │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🚪 API Gateway Pattern

### Gateway Routing
```go
// gateway/main.go routing structure

/api/v1/auth/*     → Auth Service (3001)
/api/v1/users/*    → User Service (3002)
/api/v1/projects/* → User Service (3002)
/api/v1/skills/*   → User Service (3002)
/api/v1/jobs/*     → Job Service (3003)
/api/v1/recruiter/*→ Recruiter Service (3004)
/api/v1/resume/*   → Resume Service (3005)
```

### Gateway Responsibilities
```
┌─────────────────────────────────────────────────────────┐
│  1. Request Routing                                      │
│     Route requests to appropriate microservice           │
│                                                          │
│  2. Rate Limiting                                        │
│     Prevent abuse (100 requests/minute per IP)           │
│                                                          │
│  3. CORS Handling                                        │
│     Allow cross-origin requests from frontend            │
│                                                          │
│  4. Request Logging                                      │
│     Log all incoming requests for debugging              │
│                                                          │
│  5. Health Aggregation                                   │
│     Check health of all downstream services              │
│                                                          │
│  6. SSL Termination (in production)                      │
│     Handle HTTPS at gateway level                        │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local development)
- Go 1.21+ (for gateway and analyzer)
- MongoDB Atlas account
- GitHub OAuth App

### Quick Start
```bash
# Clone repository
git clone https://github.com/verifydev-me/backend.git
cd backend

# Copy environment file
cp .env.example .env
# Edit .env with your values

# Start all services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

---

## 🔑 Environment Variables

### Required Variables
```bash
# MongoDB
DATABASE_URL=mongodb+srv://...

# JWT Secrets (same across all services)
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret

# GitHub OAuth
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-client-secret
GITHUB_CALLBACK_URL=https://api.yourdomain.com/api/v1/auth/github/callback

# Redis
REDIS_URL=redis://redis:6379

# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672

# AI (Project Analyzer)
GEMINI_API_KEY=your-gemini-api-key

# Frontend
FRONTEND_URL=https://yourdomain.com
```

---

## 📦 Deployment

### CI/CD Pipeline (GitHub Actions)
```
┌─────────────────────────────────────────────────────────┐
│  Trigger: Push to 'dev' branch                           │
│                                                          │
│  1. Checkout code                                        │
│  2. SSH into Azure VM                                    │
│  3. Pull latest code                                     │
│  4. docker-compose down                                  │
│  5. docker-compose up -d --build                         │
│  6. Health check all services                            │
│  7. Cleanup old images                                   │
└─────────────────────────────────────────────────────────┘
```

### Infrastructure
```
Azure VM
├── Docker Engine
├── Docker Compose
├── Services (containers)
│   ├── verifydev-gateway
│   ├── verifydev-auth
│   ├── verifydev-user
│   ├── verifydev-job
│   ├── verifydev-recruiter
│   ├── verifydev-resume
│   ├── verifydev-aura
│   ├── verifydev-analyzer
│   ├── verifydev-redis
│   └── verifydev-rabbitmq
└── Nginx (reverse proxy, optional)
```

---

## 📁 Project Structure

```
backend/
├── .github/
│   └── workflows/
│       └── deploy-dev.yml      # CI/CD pipeline
├── gateway/                     # API Gateway (Go)
│   ├── main.go
│   └── Dockerfile
├── auth-service/               # Authentication (Node.js)
│   ├── src/
│   │   ├── api/v1/
│   │   │   ├── controllers/
│   │   │   └── routes/
│   │   ├── config/
│   │   ├── middlewares/
│   │   └── utils/
│   ├── prisma/
│   │   └── schema.prisma
│   └── Dockerfile
├── user-service/               # User Management (Node.js)
│   ├── src/
│   │   ├── api/v1/
│   │   ├── domain/
│   │   ├── rabbitmq/
│   │   └── ...
│   ├── prisma/
│   └── Dockerfile
├── job-service/                # Job Management (Node.js)
├── recruiter-service/          # Recruiter Dashboard (Node.js)
├── resume-service/             # Resume Generation (Node.js)
├── aura-processor/             # Score Calculation (Node.js)
├── project-analyzer/           # GitHub Analysis (Go)
│   ├── cmd/
│   ├── internal/
│   │   ├── analyzer/
│   │   ├── github/
│   │   └── gemini/
│   └── Dockerfile
├── docker-compose.yml          # Container orchestration
├── .env                        # Environment variables
└── README.md                   # This file
```

---

## 🔗 API Endpoints Quick Reference

### Auth Service
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/auth/github` | Initiate GitHub OAuth |
| GET | `/api/v1/auth/github/callback` | GitHub OAuth callback |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| POST | `/api/v1/auth/logout` | Logout current session |
| GET | `/api/v1/auth/me` | Get current user |

### User Service
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/users/me` | Get profile |
| PUT | `/api/v1/users/me` | Update profile |
| GET | `/api/v1/projects` | Get user's projects |
| POST | `/api/v1/projects` | Add project for analysis |
| GET | `/api/v1/skills` | Get user's skills |

### Job Service
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/jobs` | List jobs |
| GET | `/api/v1/jobs/:id` | Get job details |
| POST | `/api/v1/jobs/:id/apply` | Apply for job |

---

## 🧪 Testing

```bash
# Run tests for a specific service
cd user-service
npm test

# Run with coverage
npm run test:coverage
```

---

## 📊 Monitoring

### Health Endpoints
```bash
# Gateway health
curl http://localhost:8000/health

# Individual services
curl http://localhost:3001/health  # Auth
curl http://localhost:3002/health  # User
curl http://localhost:3003/health  # Job
```

---

## 🤝 Contributing

1. Create feature branch from `dev`
2. Make changes
3. Create PR to `dev`
4. After review, merge to `dev`
5. CI/CD auto-deploys to staging

---

## 📄 License

Proprietary - VerifyDev © 2024

---

## 👥 Team

- **Backend**: Keshav Sharma
- **Architecture**: Microservices with Event-Driven patterns

---

> Built with ❤️ using modern technologies
