# High-Level Architecture

> System Overview for VerifyDev Platform

---

## 🎯 What is VerifyDev?

VerifyDev is a **developer verification and recruitment platform** that:
1. Analyzes GitHub repositories using AI
2. Verifies developer skills with confidence scores
3. Assigns "Aura" scores (gamified reputation)
4. Connects verified developers with recruiters

---

## 🏛️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             FRONTEND CLIENTS                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌────────────────┐     ┌────────────────┐     ┌────────────────┐         │
│   │   Web App      │     │  Mobile App    │     │  Recruiter     │         │
│   │   (Next.js)    │     │ (React Native) │     │   Dashboard    │         │
│   │                │     │                │     │                │         │
│   │ • Developer    │     │ • Login/Signup │     │ • Search       │         │
│   │   Dashboard    │     │ • View Profile │     │ • Post Jobs    │         │
│   │ • Job Search   │     │ • Projects     │     │ • Applications │         │
│   │ • Profile      │     │                │     │                │         │
│   └────────┬───────┘     └───────┬────────┘     └───────┬────────┘         │
│            │                     │                      │                   │
└────────────┼─────────────────────┼──────────────────────┼───────────────────┘
             │                     │                      │
             └──────────────┬──────┴──────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          API GATEWAY (NGINX)                                 │
│                              Port 8000                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ CORS        │  │ Rate        │  │ Request     │  │ Load        │        │
│  │ Handling    │  │ Limiting    │  │ Routing     │  │ Balancing   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
                            │
          ┌─────────────────┼─────────────────┬─────────────────┐
          │                 │                 │                 │
          ▼                 ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          MICROSERVICES                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐                   │
│  │ Auth Service  │  │ User Service  │  │ Job Service   │                   │
│  │   (3001)      │  │   (3002)      │  │   (3004)      │                   │
│  │               │  │               │  │               │                   │
│  │ • GitHub OAuth│  │ • Profiles    │  │ • Jobs        │                   │
│  │ • JWT Tokens  │  │ • Skills      │  │ • Applications│                   │
│  │ • Sessions    │  │ • Projects    │  │ • Matching    │                   │
│  └───────────────┘  └───────────────┘  └───────────────┘                   │
│                                                                              │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐                   │
│  │ Recruiter     │  │ Resume        │  │ Aura          │                   │
│  │ Service (3005)│  │ Service (8003)│  │ Processor     │                   │
│  │               │  │               │  │               │                   │
│  │ • Candidates  │  │ • PDF Gen     │  │ • Score Calc  │                   │
│  │ • Interviews  │  │ • Templates   │  │ • Rankings    │                   │
│  └───────────────┘  └───────────────┘  └───────────────┘                   │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                   Project Analyzer (Go) - Port 8001                   │ │
│  │  • Clone GitHub Repos  • Detect Tech Stack  • AI Analysis (Gemini)   │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       MESSAGING & CACHING                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────────────────────────┐  ┌───────────────────────────────┐      │
│  │         RabbitMQ              │  │           Redis               │      │
│  │         (5672)                │  │          (6379)               │      │
│  │                               │  │                               │      │
│  │  • project.analyze.request   │  │  • Session Cache              │      │
│  │  • project.analyzed          │  │  • Rate Limit Counters        │      │
│  │  • resume.generate.request   │  │  • Temporary Data             │      │
│  └───────────────────────────────┘  └───────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DATABASE                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                    MongoDB Atlas (Cloud)                              │ │
│  │                                                                       │ │
│  │  Collections: users, sessions, skills, projects, experiences,        │ │
│  │               jobs, applications, interviews, recruiters, etc.       │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔑 Key Components

### 1. API Gateway (Nginx)
- **Purpose**: Single entry point for all API requests
- **Features**: CORS, rate limiting, routing, SSL termination
- **Port**: 8000

### 2. Auth Service
- **Purpose**: Authentication and authorization
- **Features**: GitHub OAuth, JWT tokens, session management
- **Port**: 3001

### 3. User Service
- **Purpose**: User data management
- **Features**: Profiles, skills, projects, experiences
- **Port**: 3002

### 4. Job Service
- **Purpose**: Job marketplace
- **Features**: Job listings, applications, matching
- **Port**: 3004

### 5. Recruiter Service
- **Purpose**: Recruiter features
- **Features**: Candidate search, interviews, messaging
- **Port**: 3005

### 6. Project Analyzer
- **Purpose**: AI-powered code analysis
- **Features**: Tech detection, skill extraction, scoring
- **Port**: 8001
- **Language**: Go

### 7. Resume Service
- **Purpose**: PDF resume generation
- **Port**: 8003

### 8. Aura Processor
- **Purpose**: Calculate and update Aura scores
- **Type**: Background worker (no HTTP port)

---

## 🔄 Communication Patterns

### Synchronous (HTTP/REST)
```
Client → Gateway → Service → MongoDB
```

### Asynchronous (RabbitMQ)
```
User Service → RabbitMQ → Project Analyzer → Aura Processor
```

---

## 🔐 Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      SECURITY LAYERS                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Layer 1: Gateway                                                │
│  ├── CORS Policy (allowed origins only)                         │
│  ├── Rate Limiting (100 req/min)                                │
│  └── Security Headers (X-Frame-Options, CSP)                    │
│                                                                  │
│  Layer 2: Authentication                                         │
│  ├── JWT Tokens (short-lived access, long-lived refresh)        │
│  ├── Session Validation (DB check)                              │
│  └── GitHub OAuth (3rd party auth)                              │
│                                                                  │
│  Layer 3: Authorization                                          │
│  ├── Route Guards (authenticate middleware)                     │
│  ├── Resource Ownership (userId checks)                         │
│  └── Role-based (Developer vs Recruiter)                        │
│                                                                  │
│  Layer 4: Data                                                   │
│  ├── Encrypted at Rest (MongoDB Atlas)                          │
│  ├── Encrypted in Transit (HTTPS/TLS)                           │
│  └── Sensitive Data Hashing (passwords)                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Flow Examples

### User Login Flow
```
1. User clicks "Login with GitHub"
2. Frontend → GET /api/v1/auth/github
3. Gateway → Auth Service
4. Auth Service → Redirect to GitHub
5. User authorizes on GitHub
6. GitHub → Callback to Auth Service
7. Auth Service:
   - Create/update user in MongoDB
   - Create session
   - Generate JWT tokens
8. Redirect to frontend with tokens
```

### Project Analysis Flow
```
1. User adds project
2. Frontend → POST /api/v1/projects
3. Gateway → User Service
4. User Service:
   - Create project (status: PENDING)
   - Publish to RabbitMQ
5. Project Analyzer:
   - Consume message
   - Clone repository
   - Analyze code (7-stage pipeline)
   - Publish results
6. Aura Processor:
   - Consume results
   - Update project (status: COMPLETED)
   - Update user skills
   - Recalculate Aura score
7. User sees updated dashboard
```

### Job Application Flow
```
1. Developer applies to job
2. Frontend → POST /api/v1/jobs/:id/apply
3. Gateway → Job Service
4. Job Service:
   - Create application
   - Snapshot candidate data
   - Calculate match score
   - Notify recruiter (future)
5. Recruiter sees application in dashboard
```

---

## 💡 Design Decisions

### Why Microservices?
- **Scalability**: Scale individual services based on load
- **Flexibility**: Different tech for different services (Go for analyzer)
- **Isolation**: Failure in one service doesn't crash others
- **Team Independence**: Teams can deploy independently

### Why RabbitMQ?
- **Async Processing**: Project analysis takes 10-60 seconds
- **Reliability**: Messages persist, retry on failure
- **Decoupling**: Services don't need to know about each other

### Why MongoDB?
- **Flexible Schema**: Easy to evolve data models
- **JSON-like Documents**: Natural fit for JavaScript/TypeScript
- **Cloud-managed**: Atlas handles backups, scaling

### Why Nginx as Gateway?
- **Performance**: Highly optimized for load balancing
- **Reliability**: Battle-tested in production
- **Features**: Rate limiting, CORS, caching built-in

---

## 🚀 Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       PRODUCTION                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   Azure VM                               │   │
│  │                                                          │   │
│  │  ┌────────────────────────────────────────────────────┐ │   │
│  │  │              Docker Compose                        │ │   │
│  │  │                                                    │ │   │
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ │ │   │
│  │  │  │ Gateway │ │  Auth   │ │  User   │ │   Job   │ │ │   │
│  │  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ │ │   │
│  │  │                                                    │ │   │
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ │ │   │
│  │  │  │Recruiter│ │Analyzer │ │  Redis  │ │RabbitMQ │ │ │   │
│  │  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ │ │   │
│  │  └────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────┘   │
│                            │                                    │
│                            ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              MongoDB Atlas (External)                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### CI/CD Pipeline
```
Push to dev → GitHub Actions → SSH to Azure → Docker Compose Up
```

---

## 📈 Scalability Considerations

### Current (Single VM)
- All services on one Azure VM
- Docker Compose for orchestration
- Suitable for ~1000 concurrent users

### Future (Kubernetes)
- Move to Azure Kubernetes Service (AKS)
- Horizontal pod autoscaling
- Separate node pools for workloads
- Suitable for 100K+ users

---

> Last Updated: January 2026
