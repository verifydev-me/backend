   # VerifyDev Backend   https://excalidraw.com/#json=JlpK_r44NNjXMeUSYnemp,Uiy7JcKYkRFQOXEP88S8nw    

> Developer Verification & Recruitment Platform - Microservices Architecture

VerifyDev automatically **verifies developer skills** by analyzing their GitHub repositories using AI, assigns **Aura scores**, and connects verified developers with recruiters.

---

## 📋 Quick Links

- [Architecture Overview](#architecture-overview)
- [Communication Architecture](#-communication-architecture-hybrid-http--grpc) - **gRPC Implementation**
- [Performance Analysis](./PERFORMANCE.md) - **Latency Metrics & Benchmarks**
- [Services](#services)
- [API Routes](#api-routes)
- [Getting Started](#getting-started) 

---

## 🏗️ Architecture Overview

```
                                    ┌─────────────────┐
                                    │    Frontend     │
                                    │ (Next.js/React  │
                                    │    Native)      │
                                    └────────┬────────┘
                                             │ JSON/HTTP
                                             ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                           NGINX API GATEWAY                                 │
│                              (Port 8000)                                    │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  • Request Routing         • CORS Handling        • Load Balancing   │  │
│  │  • Rate Limiting           • Security Headers     • Gzip Compression │  │
│  │  • SSL Termination         • Error Handling       • Health Checks    │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────┬──────────────────────────────────────┘
                                      │ HTTP/JSON (proxy_pass)
          ┌───────────────────────────┼───────────────────────────┐
          │                           │                           │
          ▼                           ▼                           ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│  Auth Service   │       │  User Service   │       │  Job Service    │
│   HTTP :3001    │       │   HTTP :3002    │       │   HTTP :3004    │
│                 │       │   gRPC :50051   │       │                 │
│ • GitHub OAuth  │       │ • User Profile  │       │ • Job Listings  │
│ • JWT Tokens    │       │ • Skills CRUD   │       │ • Applications  │
│ • Sessions      │       │ • Projects      │       │ • Recruiter API │
│ • OTP Auth      │       │ • Experience    │       │ • Messages      │
└─────────────────┘       └────────┬────────┘       └─────────────────┘
                                   │
                                   │ ⚡ gRPC (Binary Protocol Buffers)
                                   │    Inter-service communication
                                   ▼
                    ┌──────────────────────────────┐
                    │     Recruiter Service        │
                    │        HTTP :3005            │
                    │        gRPC :50054           │
                    │                              │
                    │  • Candidate Search (gRPC)   │
                    │  • BatchGetUsers (gRPC)      │
                    │  • Profile Fetch (gRPC)      │
                    └──────────────────────────────┘
                                   
                    ┌──────────────────────────────┐
                    │     Project Analyzer (Go)    │
                    │         (Port 8001)          │
                    │                              │
                    │  • Clone GitHub Repos        │
                    │  • Detect Tech Stack         │
                    │  • AI Analysis (Gemini)      │
                    │  • Extract Skills            │
                    └──────────────────────────────┘
                                   │
                                   │ (RabbitMQ)
                                   ▼
                    ┌──────────────────────────────┐
                    │       Aura Processor         │
                    │                              │
                    │  • Calculate Aura Score      │
                    │  • Update User Stats         │
                    └──────────────────────────────┘

┌─────────────────┐       ┌─────────────────┐
│Recruiter Service│       │ Resume Service  │
│   (Port 3005)   │       │   (Port 8003)   │
│                 │       │                 │
│ • Candidates    │       │ • PDF Generate  │
│ • Interviews    │       │ • Templates     │
│ • Shortlists    │       │                 │
└─────────────────┘       └─────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                         INFRASTRUCTURE                                   │
│  ┌───────────────┐    ┌───────────────┐    ┌───────────────────────┐   │
│  │    Redis      │    │   RabbitMQ    │    │   MongoDB (Atlas)     │   │
│  │  (Port 6379)  │    │  (Port 5672)  │    │                       │   │
│  │               │    │               │    │  • Users, Sessions    │   │
│  │ • Sessions    │    │ • Async Jobs  │    │  • Projects, Skills   │   │
│  │ • Cache       │    │ • Events      │    │  • Jobs, Applications │   │
│  └───────────────┘    └───────────────┘    └───────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

**Protocol Legend:**
- `JSON/HTTP` - Frontend to Gateway and Gateway to Services
- `⚡ gRPC` - Service-to-Service (low latency, binary)
- `RabbitMQ` - Async event-driven communication

---


## 🚄 Communication Architecture (Hybrid HTTP + gRPC)

The backend uses a **Hybrid Communication Pattern** optimized for **low latency** and **scalability**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           COMMUNICATION FLOW                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Frontend/Mobile (Next.js, React Native)                                    │
│          │                                                                   │
│          │  JSON/HTTP REST (Human-readable, debuggable)                      │
│          ▼                                                                   │
│   ┌──────────────────────────────────────────────────────────┐               │
│   │              API GATEWAY (Nginx - Port 8000)             │               │
│   │  • CORS Handling      • Rate Limiting    • Load Balance  │               │
│   │  • SSL Termination    • Request Routing  • Compression   │               │
│   └──────────────────────────────────────────────────────────┘               │
│          │                                                                   │
│          │  HTTP/JSON (proxy_pass) ─ Simple, Compatible                      │
│          ▼                                                                   │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐                │
│   │   Auth   │  │   User   │  │   Job    │  │  Recruiter   │                │
│   │ :3001    │  │ :3002    │  │ :3004    │  │   :3005      │                │
│   └──────────┘  └────┬─────┘  └──────────┘  └──────┬───────┘                │
│                      │                             │                         │
│                      │   gRPC (Binary Protocol Buffers)                      │
│                      │   ⚡ Low latency, High throughput                     │
│                      ▼                             │                         │
│               ┌────────────┐                       │                         │
│               │ gRPC :50051│◄──────────────────────┘                         │
│               └────────────┘                                                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Why This Architecture?

| Layer | Protocol | Why? |
|-------|----------|------|
| **Frontend → Gateway** | JSON/HTTP | Human-readable, debuggable, browser-native |
| **Gateway → Services** | HTTP/JSON | Nginx compatibility, simple routing, easy monitoring |
| **Service ↔ Service** | **gRPC** | ⚡ Binary protocol, 10x faster, streaming, strict contracts |

### gRPC Implementation (Service-to-Service)

gRPC is used for **internal service communication** where performance matters most:

```
┌────────────────────┐     gRPC     ┌────────────────────┐
│ Recruiter Service  │ ───────────► │   User Service     │
│     :3005          │  (Binary)    │     :50051         │
│                    │              │                    │
│ • BatchGetUsers()  │              │ • GetUser()        │
│ • SearchCandidates │              │ • BatchGetUsers()  │
│ • GetUserProfile() │              │ • SearchCandidates │
└────────────────────┘              └────────────────────┘
```

#### Benefits of gRPC for Internal Calls:
- **⚡ 10x Lower Latency**: Binary Protocol Buffers vs JSON parsing
- **📦 Smaller Payload**: ~30% smaller than JSON
- **📋 Strict Contracts**: Proto files are the single source of truth
- **🔄 Streaming**: Bi-directional streaming for real-time updates
- **🔁 Built-in Retries**: Automatic retry with exponential backoff

### Core Components

1. **Proto Definitions (`backend/proto/`)**
   - Source of truth for service-to-service contracts
   - Organized by domain: `user/`, `job/`, `recruiter/`, `common/`
   - Dynamic loading with `@grpc/proto-loader` (no compilation step)

2. **Shared Utilities (`backend/shared/`)**
   - `GrpcServer`: Standardized server setup with keepalive, error handling
   - `GrpcClient`: Connection pooling, automatic retries, timeouts
   - `GrpcClientPool`: Singleton pattern for connection reuse

3. **Port Configuration**
   | Service | HTTP Port | gRPC Port |
   |---------|-----------|-----------|
   | User Service | 3002 | 50051 |
   | Recruiter Service | 3005 | 50054 |
   | Job Service | 3004 | 50052* |
   
   *Planned

### Implementation Example

**Recruiter Service calling User Service via gRPC:**

```typescript
// recruiter-service/src/grpc/user-client.ts
import { GrpcClient } from '../../../shared/grpc-client';

const userClient = new GrpcClient(UserServiceProto, {
  address: 'user-service:50051',
  serviceName: 'UserService',
  maxRetries: 3,
  timeout: 10000,
});

// Get multiple users in ONE call (instead of N HTTP calls)
const users = await batchGetUsers(['user1', 'user2', 'user3']);
// ⚡ Single TCP connection, binary payload, parallel fetch
```

> 📘 **Detailed Guide**: See [GRPC_IMPLEMENTATION_GUIDE.md](./GRPC_IMPLEMENTATION_GUIDE.md) for step-by-step tutorial.

---



## 🔧 Services

| Service | HTTP Port | gRPC Port | Language | Description |
|---------|-----------|-----------|----------|-------------|
| **Gateway** | 8000 | - | Nginx | API Gateway - routing, CORS, rate limiting |
| **Auth Service** | 3001 | - | TypeScript | GitHub OAuth, JWT tokens, sessions |
| **User Service** | 3002 | **50051** | TypeScript | Profiles, skills, projects, experience |
| **Job Service** | 3004 | 50052* | TypeScript | Jobs, applications, recruiter management |
| **Recruiter Service** | 3005 | **50054** | TypeScript | Candidate search, interviews, messaging |
| **Chat Service** | 3006 | - | TypeScript | Real-time messaging (Socket.IO) |
| **Resume Service** | 8003 | - | Go | PDF resume generation |
| **Project Analyzer** | 8001 | - | Go | GitHub analysis, tech detection, AI |
| **Aura Processor** | - | - | TypeScript | Score calculations (worker) |
| **Redis** | 6379 | - | - | Session cache, rate limiting |
| **RabbitMQ** | 5672 | - | - | Message queue for async tasks |

*Planned | **Active gRPC server


---

## 🛠️ Tech Stack

### Backend
- **Languages:** TypeScript (Node.js), Go  
- **Framework:** Express.js  
- **ORM:** Prisma  
- **Database:** MongoDB Atlas  
- **Cache:** Redis  
- **Message Queue:** RabbitMQ  
- **API Gateway:** Nginx  
- **Container:** Docker + Docker Compose  

### AI/ML
- **LLM:** Google Gemini API  
- **Use:** Code analysis, skill extraction  

### DevOps
- **CI/CD:** GitHub Actions  
- **Cloud:** Azure VM  
- **Reverse Proxy:** Nginx  

---

## 🛣️ API Routes

### Gateway Routing (nginx.conf)

| Route | → Service | Description |
|-------|-----------|-------------|
| `/api/v1/auth/*` | auth-service:3001 | Authentication |
| `/api/v1/users/*` | user-service:3002 | User profiles |
| `/api/v1/projects/*` | user-service:3002 | Project management |
| `/api/v1/skills/*` | user-service:3002 | Skills management |
| `/api/v1/experiences/*` | user-service:3002 | Experience entries |
| `/api/v1/jobs/*` | job-service:3004 | Job listings |
| `/api/v1/applications/*` | job-service:3004 | Job applications |
| `/api/v1/recruiter/*` | job-service:3004 | Recruiter job mgmt |
| `/api/v1/recruiters/*` | recruiter-service:3005 | Recruiter accounts |
| `/api/v1/candidates/*` | recruiter-service:3005 | Candidate search |
| `/api/v1/interviews/*` | recruiter-service:3005 | Interview scheduling |
| `/api/v1/messages/*` | job-service:3004 | Messaging |
| `/api/v1/templates/*` | recruiter-service:3005 | Message templates |
| `/api/v1/resumes/*` | resume-service:8003 | Resume generation |
| `/health` | gateway | Health check |

---

## 📨 Message Queues (RabbitMQ)

### Exchange: `project.events`

| Queue | Producer | Consumer | Purpose |
|-------|----------|----------|---------|
| `project.analyze.request` | user-service | project-analyzer | Trigger analysis |
| `project.analyzed` | project-analyzer | aura-processor | Analysis results |
| `resume.generate.request` | user-service | resume-service | Resume generation |

### Message Flow
```
User adds project
       │
       ▼
┌──────────────────┐  publish   ┌───────────────────┐
│   User Service   │ ─────────► │  project.analyze  │
└──────────────────┘            │     .request      │
                                └─────────┬─────────┘
                                          │ consume
                                          ▼
                                ┌───────────────────┐
                                │ Project Analyzer  │
                                │      (Go)         │
                                └─────────┬─────────┘
                                          │ publish
                                          ▼
                                ┌───────────────────┐
                                │ project.analyzed  │
                                └─────────┬─────────┘
                                          │ consume
                                          ▼
                                ┌───────────────────┐
                                │  Aura Processor   │
                                │  (updates user)   │
                                └───────────────────┘
```

---

## 🔐 Authentication

### Flow: GitHub OAuth
```
1. User clicks "Login with GitHub"
2. Frontend → GET /api/v1/auth/github
3. Gateway → Auth Service
4. Auth Service redirects to GitHub OAuth
5. User authorizes on GitHub
6. GitHub → /api/v1/auth/github/callback
7. Auth Service:
   • Exchanges code for GitHub token
   • Fetches user info from GitHub API
   • Creates/updates user in MongoDB
   • Creates session in DB
   • Generates JWT tokens (access + refresh)
8. Redirect to Frontend with tokens
```

### JWT Strategy (Stateless)
```typescript
// Each service verifies JWT independently
// No inter-service auth calls needed

// Access Token: 15 min expiry
{
  userId: "xxx",
  sessionId: "yyy",
  type: "access"
}

// Refresh Token: 7 days expiry
{
  userId: "xxx",
  sessionId: "yyy",
  type: "refresh"
}
```

All services share `JWT_ACCESS_SECRET` for verification.

---

## 📊 Project Analysis Flow

### How It Works

1. **User selects GitHub repo**
2. **User Service** creates project record (status: `pending`)
3. **User Service** publishes to RabbitMQ:
   ```json
   {
     "projectId": "xxx",
     "userId": "yyy",
     "repoUrl": "https://github.com/user/repo",
     "repoName": "repo",
     "defaultBranch": "main"
   }
   ```
4. **Project Analyzer (Go)** consumes and:
   - Clones repository
   - Scans file structure
   - Detects tech stack (package.json, go.mod, docker-compose, etc.)
   - Identifies architecture patterns (microservices, monolith)
   - Sends to Gemini AI for deep analysis
   - Extracts skills with confidence scores
5. **Project Analyzer** publishes results
6. **Aura Processor** consumes and:
   - Updates project status to `completed`
   - Adds verified skills to user profile
   - Recalculates Aura score

### Tech Detection
```
Detects:
├── Languages: TypeScript, JavaScript, Go, Python, Rust, Java
├── Frameworks: Next.js, React, Express, Gin, FastAPI, Spring
├── Databases: MongoDB, PostgreSQL, Redis, MySQL
├── Infrastructure: Docker, Kubernetes, AWS, Terraform
├── DevOps: GitHub Actions, Jenkins, ArgoCD
└── Architecture: Microservices, Monolith, Serverless
```

---

## 📁 Project Structure

```
backend/
├── .github/
│   └── workflows/
│       └── deploy-dev.yml      # CI/CD pipeline
│
├── gateway/                     # Nginx API Gateway
│   ├── nginx.conf              # Main config
│   ├── conf.d/
│   │   └── api.conf            # Route definitions
│   └── Dockerfile
│
├── auth-service/               # Authentication
│   ├── src/
│   │   ├── api/v1/
│   │   │   ├── controllers/
│   │   │   └── routes/
│   │   ├── middlewares/
│   │   └── utils/
│   ├── prisma/
│   │   └── schema.prisma
│   └── Dockerfile
│
├── user-service/               # User Management
│   ├── src/
│   │   ├── api/v1/
│   │   ├── domain/             # Business logic
│   │   ├── rabbitmq/           # Message publisher
│   │   └── ...
│   ├── prisma/
│   └── Dockerfile
│
├── job-service/                # Jobs & Applications
│   ├── src/
│   ├── prisma/
│   └── Dockerfile
│
├── recruiter-service/          # Recruiter Features
│   ├── src/
│   ├── prisma/
│   └── Dockerfile
│
├── resume-service/             # PDF Generation (Go)
│   └── Dockerfile
│
├── aura-processor/             # Score Calculator
│   └── Dockerfile
│
├── project-analyzer/           # GitHub Analysis (Go)
│   ├── cmd/
│   ├── internal/
│   │   ├── analyzer/           # Analysis logic
│   │   ├── github/             # GitHub API client
│   │   └── gemini/             # AI integration
│   └── Dockerfile
│
├── docker-compose.yml          # Container orchestration
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Docker & Docker Compose
- MongoDB Atlas account
- GitHub OAuth App
- Google Gemini API key

### Quick Start
```bash
# 1. Clone
git clone https://github.com/verifydev-me/backend.git
cd backend

# 2. Create .env file
cp .env.example .env
# Edit .env with your values

# 3. Start services
docker-compose up -d

# 4. Check status
docker-compose ps

# 5. View logs
docker-compose logs -f
```

### Environment Variables
```bash
# Required in .env or docker-compose

# Database
DATABASE_URL=mongodb+srv://...

# JWT (same across all services)
JWT_ACCESS_SECRET=your-32-char-secret
JWT_REFRESH_SECRET=your-32-char-secret

# GitHub OAuth
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx
GITHUB_CALLBACK_URL=https://api.yourdomain.com/api/v1/auth/github/callback

# GitHub Token (for repo cloning)
GITHUB_TOKEN=ghp_xxx

# AI
GEMINI_API_KEY=xxx

# Frontend
FRONTEND_URL=https://verifydev.me
ALLOWED_ORIGINS=https://verifydev.me,http://localhost:3000
```

---

## 📦 Deployment

### CI/CD Pipeline (GitHub Actions)

**Trigger:** Push to `dev` branch

```
1. Checkout code
2. SSH into Azure VM
3. Setup deploy keys
4. Pull latest code
5. docker-compose down
6. docker-compose up -d --build
7. Health check all services
8. Cleanup old images
```

### Production URLs
- **API:** https://api.verifydev.me
- **Frontend:** https://verifydev.me

---

## 🧪 Health Checks

```bash
# Gateway
curl https://api.verifydev.me/health

# Individual services (internal)
curl http://localhost:3001/health  # Auth
curl http://localhost:3002/health  # User
curl http://localhost:3004/health  # Job
curl http://localhost:3005/health  # Recruiter
curl http://localhost:8001/health  # Analyzer
curl http://localhost:8003/health  # Resume
```

---

## 🎨 Design Patterns

| Pattern | Implementation |
|---------|----------------|
| **API Gateway** | Nginx routes all requests, handles CORS/rate limiting |
| **Microservices** | Independent services with own databases |
| **Event-Driven** | RabbitMQ for async communication |
| **Stateless Auth** | JWT verified independently by each service |
| **Repository** | Prisma ORM for data access |
| **Dead Letter Queue** | Failed messages go to DLX for retry |

---

## 👥 Team

- **Backend Architecture:** Keshav Sharma

---

> Built with ❤️ for developers who want their skills verified
