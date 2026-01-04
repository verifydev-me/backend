# VerifyDev 🚀

> **Developer-first platform that verifies skills through actual code analysis**, builds professional resumes automatically, and connects verified developers with recruiters.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-18+-green.svg)
![Go](https://img.shields.io/badge/go-1.21+-00ADD8.svg)
![Docker](https://img.shields.io/badge/docker-compose-blue.svg)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Services](#-services)
- [Features Implemented](#-features-implemented)
- [Getting Started](#-getting-started)
- [API Endpoints](#-api-endpoints)
- [Frontend Pages](#-frontend-pages)
- [Environment Variables](#-environment-variables)
- [Roadmap](#-roadmap)

---

## 🎯 Overview

VerifyDev solves two major problems in tech hiring:

### For Developers:
- ❌ Skills on resume are self-claimed (no proof)
- ❌ Building resume is time-consuming
- ❌ Portfolio websites are static and don't show real skills

### For Recruiters:
- ❌ Can't verify if candidate actually knows the tech
- ❌ Resumes are generic and look the same
- ❌ Finding right candidates is like finding needle in haystack

### Our Solution ✅
One platform where **skills are verified from actual code**, resumes are auto-generated, and recruiters find the right developers instantly.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React + Vite)                      │
│                           localhost:3000                             │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     NGINX API GATEWAY (Port 80)                      │
│                        Rate Limiting, CORS, Routing                  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
┌──────────────┐          ┌──────────────┐          ┌──────────────┐
│ Auth Service │          │ User Service │          │ Job Service  │
│   (3001)     │          │   (3002)     │          │   (3004)     │
│   Node.js    │          │   Node.js    │          │   Node.js    │
└──────────────┘          └──────────────┘          └──────────────┘
        │                           │                           │
        └───────────────────────────┼───────────────────────────┘
                                    │
┌───────────────────────────────────┼───────────────────────────────┐
│                                   ▼                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │  PostgreSQL  │  │    Redis     │  │   RabbitMQ   │            │
│  │   (5432)     │  │   (6379)     │  │    (5672)    │            │
│  └──────────────┘  └──────────────┘  └──────────────┘            │
│                        DATA LAYER                                 │
└───────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
┌──────────────┐          ┌──────────────┐          ┌──────────────┐
│  Project     │          │    Aura      │          │   Resume     │
│  Analyzer    │          │  Processor   │          │   Service    │
│   (8001)     │          │  (Worker)    │          │   (8003)     │
│     Go       │          │   Node.js    │          │     Go       │
└──────────────┘          └──────────────┘          └──────────────┘
        │                                                   │
        └───────────────────────────────────────────────────┘
                                │
                        ┌───────────────┐
                        │     MinIO     │
                        │ Object Store  │
                        │  (9000/9001)  │
                        └───────────────┘
```

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 18 | UI Framework |
| Vite | Build Tool |
| TypeScript | Type Safety |
| Tailwind CSS | Styling |
| Zustand | State Management |
| React Query | Data Fetching |
| Framer Motion | Animations |
| Shadcn/UI | Component Library |

### Backend (Node.js Services)
| Technology | Purpose |
|------------|---------|
| Express.js | HTTP Server |
| TypeScript | Type Safety |
| Prisma | ORM |
| JWT | Authentication |
| Redis | Caching & Sessions |
| RabbitMQ | Message Queue |

### Backend (Go Services)
| Technology | Purpose |
|------------|---------|
| Go 1.21+ | Project Analyzer |
| Gin/Echo | HTTP Framework |
| go-git | Git Operations |
| RabbitMQ | Message Queue |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| Docker | Containerization |
| Docker Compose | Orchestration |
| Nginx | API Gateway |
| PostgreSQL | Primary Database |
| Redis | Cache & Sessions |
| RabbitMQ | Message Broker |
| MinIO | Object Storage |

---

## 📦 Services

### 1. API Gateway (Nginx)
- **Port:** 80/443
- **Features:**
  - Intelligent request routing
  - Rate limiting (Auth: 10/min, API: 100/min)
  - CORS handling
  - Health checks
  - Error standardization

### 2. Auth Service (Node.js)
- **Port:** 3001
- **Features:**
  - GitHub OAuth integration
  - JWT access/refresh tokens
  - Session management with Redis
  - Multi-device logout support

### 3. User Service (Node.js)
- **Port:** 3002
- **Features:**
  - User profile management
  - GitHub data sync
  - Skills verification
  - Aura score calculation
  - Experience management (Work, Education, Certifications)
  - Project management
  - Public profile pages

### 4. Job Service (Node.js)
- **Port:** 3004
- **Features:**
  - Job listing CRUD
  - Job search & filtering
  - Application management
  - Skill matching

### 5. Recruiter Service (Node.js)
- **Port:** 3005
- **Features:**
  - Recruiter authentication
  - Candidate search
  - Job posting
  - Application review

### 6. Project Analyzer (Go)
- **Port:** 8001
- **Features:**
  - Git repository cloning
  - Code structure analysis
  - Tech stack detection
  - Code quality scoring
  - Skill extraction
  - RabbitMQ event publishing

### 7. Aura Processor (Node.js)
- **Type:** Background Worker
- **Features:**
  - Listen to project.analyzed events
  - Calculate user Aura scores
  - Update skill percentages
  - Track score history

### 8. Resume Service (Go)
- **Port:** 8003
- **Features:**
  - PDF generation
  - Multiple templates
  - MinIO storage
  - Share links

---

## ✅ Features Implemented

### 🔐 Authentication
- [x] GitHub OAuth login
- [x] JWT access & refresh tokens
- [x] Auto token refresh
- [x] Session management
- [x] Multi-device logout
- [x] Protected routes

### 👤 User Profile
- [x] GitHub profile sync
- [x] Profile editing (name, bio, location, company, website, twitter)
- [x] Avatar display from GitHub
- [x] Public profile pages (`/u/:username`)
- [x] Profile completeness indicator

### 📊 Aura Score System
- [x] Total aura score calculation
- [x] Category breakdown (Profile, Projects, Skills, Activity, GitHub)
- [x] Level system (Novice, Rising, Skilled, Expert, Legend)
- [x] Trend indicators (up/down/stable)
- [x] Percentile ranking
- [x] Interactive breakdown tooltips
- [x] Recent gains tracking

### 🔧 Skills Verification
- [x] Automatic skill extraction from projects
- [x] Skill categories (Language, Framework, Database, DevOps, etc.)
- [x] Skill score calculation
- [x] Verified skill badges
- [x] Evidence tracking per skill

### 📁 Project Analysis
- [x] GitHub repository listing
- [x] One-click project analysis
- [x] Tech stack detection
- [x] Code quality scoring
- [x] Project stats (stars, forks, language)
- [x] Analysis status tracking

### 💼 Experience Management
- [x] Work experience CRUD
- [x] Education history
- [x] Certifications
- [x] Collapsible sections
- [x] Add/Edit/Delete functionality

### 🏢 Job Board
- [x] Job listings display
- [x] Job search & filtering
- [x] Job detail pages
- [x] Apply to jobs
- [x] Application tracking

### 🎨 Frontend UI/UX
- [x] Modern dark theme
- [x] Responsive design
- [x] Smooth animations (Framer Motion)
- [x] Loading states
- [x] Error handling
- [x] Toast notifications
- [x] Premium glassmorphism effects
- [x] Gradient accents

### 📄 Pages Implemented
- [x] Landing page
- [x] Dashboard
- [x] Profile page
- [x] Projects page
- [x] Jobs page
- [x] Job detail page
- [x] Settings page
- [x] Public profile page
- [x] Onboarding flow
- [x] Auth callback/error pages

---

## 🚀 Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js 18+
- Go 1.21+
- GitHub OAuth App credentials

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/verifydev.git
cd verifydev
```

### 2. Environment Setup
```bash
# Copy example env file
cp .env.example .env

# Add your GitHub OAuth credentials
# GITHUB_CLIENT_ID=your_client_id
# GITHUB_CLIENT_SECRET=your_client_secret
```

### 3. Start All Services
```bash
# Start all backend services with Docker
docker compose up -d

# Watch logs
docker compose logs -f
```

### 4. Start Frontend
```bash
cd frontend
npm install
npm run dev
```

### 5. Access the Application
- **Frontend:** http://localhost:3000
- **API Gateway:** http://localhost/api
- **RabbitMQ Dashboard:** http://localhost:15672
- **MinIO Console:** http://localhost:9001

---

## 📡 API Endpoints

### Auth Service (`/api/v1/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/github` | Initiate GitHub OAuth |
| GET | `/github/callback` | OAuth callback handler |
| POST | `/refresh` | Refresh access token |
| POST | `/logout` | Logout current session |
| POST | `/logout-all` | Logout all devices |
| GET | `/me` | Get current user |

### User Service (`/api/v1/users`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/me` | Get my profile |
| PUT | `/me` | Update my profile |
| GET | `/me/repos` | Get GitHub repos |
| GET | `/me/projects` | Get analyzed projects |
| POST | `/me/projects/analyze` | Analyze a project |
| POST | `/me/sync-github` | Sync GitHub data |
| GET | `/me/skills` | Get my skills |
| GET | `/me/aura` | Get my aura score |

### Experience Routes (`/api/v1/experiences`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get all experiences |
| POST | `/` | Create experience |
| PUT | `/:id` | Update experience |
| DELETE | `/:id` | Delete experience |

### Public Routes (`/api/v1/u`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/:username` | Public profile |
| GET | `/:username/aura` | Public aura score |
| GET | `/:username/projects` | Public projects |

### Job Service (`/api/v1/jobs`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List all jobs |
| GET | `/:id` | Get job details |
| POST | `/` | Create job (recruiter) |
| POST | `/:id/apply` | Apply to job |

---

## 🎨 Frontend Pages

| Page | Route | Description |
|------|-------|-------------|
| Landing | `/` | Marketing page |
| Dashboard | `/dashboard` | User home |
| Profile | `/profile` | User profile management |
| Projects | `/projects` | Project analysis |
| Jobs | `/jobs` | Job listings |
| Job Detail | `/jobs/:id` | Single job view |
| Settings | `/settings` | User settings |
| Public Profile | `/u/:username` | Shareable profile |
| Onboarding | `/onboarding` | New user setup |

---

## 🔧 Environment Variables

### Root `.env`
```env
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
JWT_ACCESS_SECRET=supersecretaccesskey32characters!
JWT_REFRESH_SECRET=supersecretrefreshkey32characters
GITHUB_TOKEN=optional_for_higher_rate_limits
```

### Service-Specific
Each service has its own `.env.example` with required variables.

---

## 🗺️ Roadmap

### ✅ Phase 1 - Core Platform (Completed)
- [x] GitHub OAuth authentication
- [x] User profile management
- [x] Project analysis engine
- [x] Aura score system
- [x] Skills verification
- [x] Basic job board
- [x] API Gateway setup

### 🚧 Phase 2 - Enhancement (In Progress)
- [ ] Resume PDF generation
- [ ] Multiple resume templates
- [ ] Enhanced recruiter dashboard
- [ ] Email notifications
- [ ] Advanced job matching

### 📋 Phase 3 - Growth (Planned)
- [ ] LinkedIn integration
- [ ] Portfolio website generator
- [ ] AI cover letter generator
- [ ] Skill improvement recommendations

### 🔮 Phase 4 - Scale (Future)
- [ ] Video introductions
- [ ] Coding challenges
- [ ] Company reviews
- [ ] Referral system

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## ⭐ Acknowledgments

Built with ❤️ for developers who want to stand out with **verified skills, not just keywords**.

---

<p align="center">
  <strong>VerifyDev</strong> - Don't tell recruiters you know React. <em>Prove it.</em>
</p>
