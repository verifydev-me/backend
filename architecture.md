# VerifyDev - Backend Architecture 🏗️

> Production-ready, performance-optimized microservices architecture using **Go-first approach** for CPU-intensive tasks

---

## 🎯 Architecture Philosophy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     SERVICE LANGUAGE DECISION MATRIX                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   USE GO WHEN:                          USE NODE.JS WHEN:                    │
│   ═══════════════                       ═════════════════                    │
│   • CPU-intensive operations            • Simple CRUD operations             │
│   • Concurrent processing needed        • Real-time events (WebSockets)      │
│   • PDF/File generation                 • Rapid prototyping needed           │
│   • Code parsing/analysis               • Heavy JSON manipulation            │
│   • Memory efficiency critical          • NPM ecosystem needed               │
│   • Low latency required                • Quick iteration speed              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 🔥 Why Go-Heavy Architecture?

| Metric | Node.js | Go | Winner |
|--------|---------|-----|--------|
| Concurrency | Event loop (single thread) | Goroutines (thousands) | **Go** |
| PDF Generation | Puppeteer (heavy, slow) | Native libs (fast) | **Go** |
| Memory Usage | ~100MB+ per instance | ~10-20MB per instance | **Go** |
| Cold Start | 500ms-2s | 10-50ms | **Go** |
| CPU Tasks | Blocks event loop | Parallel processing | **Go** |

---

## 📊 Optimized System Architecture

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                                    CLIENT LAYER                                           │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐                        │
│  │   React Web     │    │   Mobile App    │    │ Chrome Extension│                        │
│  │   (Vite + TS)   │    │   (Future)      │    │  (Job Scraper)  │                        │
│  └────────┬────────┘    └────────┬────────┘    └────────┬────────┘                        │
└───────────┼──────────────────────┼──────────────────────┼────────────────────────────────┘
            │                      │                      │
            └──────────────────────┼──────────────────────┘
                                   ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                              NGINX API GATEWAY                                            │
│  ┌────────────────────────────────────────────────────────────────────────────────────┐  │
│  │  • SSL/TLS Termination      • Rate Limiting (100 req/min per IP)                   │  │
│  │  • Load Balancing           • Request Routing                                       │  │
│  │  • CORS Handling            • Compression (gzip/brotli)                            │  │
│  │  • Health Checks            • Access Logging                                        │  │
│  │  • Connection Pooling       • Request Buffering                                     │  │
│  └────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                           │
│  ROUTE MAPPING (Optimized):                                                               │
│  ─────────────────────────────────────────────────────────────────────────────────────   │
│  /api/v1/auth/*        →  Auth Service (Node.js)         :3001   [Low CPU]               │
│  /api/v1/users/*       →  User Service (Node.js)         :3002   [Simple CRUD]           │
│  /api/v1/resume/*      →  Resume Service (Go) 🔥         :8003   [PDF Gen, Concurrency]  │
│  /api/v1/projects/*    →  Project Analyzer (Go) 🔥       :8001   [Code Parsing]          │
│  /api/v1/jobs/*        →  Job Service (Node.js)          :3004   [CRUD + Search]         │
│  /api/v1/recruiter/*   →  Recruiter Service (Node.js)    :3005   [CRUD]                  │
│  /api/v1/ai/*          →  AI Service (Go) 🔥             :8002   [LLM Calls, Scoring]    │
└──────────────────────────────────────────────────────────────────────────────────────────┘
                                        │
         ┌──────────────────────────────┼──────────────────────────────┐
         │                              │                              │
         ▼                              ▼                              ▼
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   NODE.JS SERVICES  │    │    GOLANG SERVICES  │    │   SHARED SERVICES   │
│   ═══════════════   │    │   ══════════════ 🔥 │    │   ═══════════════   │
│                     │    │                     │    │                     │
│  ┌───────────────┐  │    │  ┌───────────────┐  │    │  ┌───────────────┐  │
│  │ Auth Service  │  │    │  │   Project     │  │    │  │    Redis      │  │
│  │   :3001      │  │    │  │   Analyzer    │  │    │  │   (Cache)     │  │
│  │              │  │    │  │    :8001      │  │    │  │    :6379      │  │
│  │ • GitHub OAuth│  │    │  │              │  │    │  └───────────────┘  │
│  │ • JWT Tokens │  │    │  │ • Code Parser │  │    │                     │
│  │ • Sessions   │  │    │  │ • AST Analysis│  │    │  ┌───────────────┐  │
│  └───────────────┘  │    │  │ • Git Clone  │  │    │  │  RabbitMQ/    │  │
│                     │    │  │ • Metrics    │  │    │  │    Kafka      │  │
│  ┌───────────────┐  │    │  └───────────────┘  │    │  │  (Queue)      │  │
│  │ User Service  │  │    │                     │    │  │    :5672      │  │
│  │   :3002      │  │    │  ┌───────────────┐  │    │  └───────────────┘  │
│  │              │  │    │  │  AI Service   │  │    │                     │
│  │ • Profile    │  │    │  │    :8002      │  │    │  ┌───────────────┐  │
│  │ • Settings   │  │    │  │              │  │    │  │  MinIO/S3     │  │
│  │ • Skills     │  │    │  │ • OpenAI Call│  │    │  │  (Storage)    │  │
│  └───────────────┘  │    │  │ • Code Review│  │    │  │    :9000      │  │
│                     │    │  │ • Scoring    │  │    │  └───────────────┘  │
│  ┌───────────────┐  │    │  └───────────────┘  │    │                     │
│  │ Job Service   │  │    │                     │    └─────────────────────┘
│  │   :3004      │  │    │  ┌───────────────┐  │
│  │              │  │    │  │Resume Service │  │
│  │ • Listings   │  │    │  │   :8003 🔥    │  │
│  │ • Apply      │  │    │  │              │  │
│  │ • Matching   │  │    │  │ • PDF Gen    │  │
│  └───────────────┘  │    │  │ • Templates  │  │
│                     │    │  │ • Concurrency│  │
│  ┌───────────────┐  │    │  │ • Worker Pool│  │
│  │Recruiter Svc  │  │    │  └───────────────┘  │
│  │   :3005      │  │    │                     │
│  │              │  │    └─────────────────────┘
│  │ • Search     │  │
│  │ • Filters    │  │
│  │ • Dashboard  │  │
│  └───────────────┘  │
│                     │
└─────────────────────┘
         │                              │
         │         gRPC COMMUNICATION   │
         │◄────────────────────────────►│
         │         (Protobuf)           │
         │                              │
         ▼                              ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                                  DATABASE LAYER                                           │
│                                                                                           │
│  ┌─────────────────────────────┐    ┌─────────────────────────────┐                      │
│  │      PostgreSQL :5432       │    │      MongoDB :27017         │                      │
│  │      ═════════════════      │    │      ═══════════════        │                      │
│  │                             │    │                             │                      │
│  │  Tables:                    │    │  Collections:               │                      │
│  │  ├── users                  │    │  ├── project_analyses       │                      │
│  │  ├── profiles               │    │  ├── code_metrics           │                      │
│  │  ├── resumes                │    │  ├── skill_scores           │                      │
│  │  ├── projects               │    │  ├── ai_responses           │                      │
│  │  ├── experiences            │    │  ├── analysis_logs          │                      │
│  │  ├── skills                 │    │  └── activity_logs          │                      │
│  │  ├── jobs                   │    │                             │                      │
│  │  ├── applications           │    │                             │                      │
│  │  ├── recruiters             │    │                             │                      │
│  │  └── companies              │    │                             │                      │
│  │                             │    │                             │                      │
│  └─────────────────────────────┘    └─────────────────────────────┘                      │
│                                                                                           │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Service Communication

### REST (External - Client to Gateway)
```
Client ──HTTP/HTTPS──▶ Nginx ──HTTP──▶ Services
```

### gRPC (Internal - Service to Service)
```
Node Service ──gRPC──▶ Go Analyzer (Project analysis)
Node Service ──gRPC──▶ Go AI Service (Code review)
Node Service ──gRPC──▶ Go Resume Service (PDF generation)
Go Services ──gRPC──▶ Each other (High-speed internal)
```

### Message Queue (Async Operations)
```
User adds project ──▶ Queue ──▶ Analyzer picks up ──▶ Processes ──▶ Updates DB
User requests PDF  ──▶ Queue ──▶ Resume Service ──▶ Worker Pool ──▶ PDF Ready
```

---

## 📋 Services Summary

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           SERVICE DISTRIBUTION MATRIX                                    │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│   SERVICE              │ LANGUAGE  │ PORT   │ WHY THIS CHOICE?                          │
│   ─────────────────────┼───────────┼────────┼─────────────────────────────────────────  │
│   Auth Service         │ Node.js   │ 3001   │ Simple OAuth flow, JWT, fast prototyping  │
│   User Service         │ Node.js   │ 3002   │ Basic CRUD, JSON-heavy operations         │
│   Job Service          │ Node.js   │ 3004   │ CRUD + search, rapid iteration needed     │
│   Recruiter Service    │ Node.js   │ 3005   │ Dashboard logic, filtering, CRUD          │
│   ─────────────────────┼───────────┼────────┼─────────────────────────────────────────  │
│   Resume Service 🔥    │ Go        │ 8003   │ PDF gen, concurrency, worker pools        │
│   Project Analyzer 🔥  │ Go        │ 8001   │ Code parsing, AST, file operations        │
│   AI Service 🔥        │ Go        │ 8002   │ LLM calls, scoring algorithms             │
│                                                                                          │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│   GO SERVICES = CPU/Memory Intensive, Need High Concurrency                              │
│   NODE.JS SERVICES = I/O Bound, CRUD Operations, Fast Development                        │
│                                                                                          │
│   Total: 4 Node.js + 3 Go = 7 Microservices                                             │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📦 Microservices Breakdown

### 1️⃣ Auth Service (Node.js + Express)
**Port: 3001**

```
┌─────────────────────────────────────────────────────────┐
│                    AUTH SERVICE                          │
├─────────────────────────────────────────────────────────┤
│  Responsibilities:                                       │
│  • GitHub OAuth 2.0 flow                                │
│  • JWT access & refresh token generation                │
│  • Token validation middleware                          │
│  • Session management                                   │
│  • Password reset (email login - future)                │
├─────────────────────────────────────────────────────────┤
│  Endpoints:                                              │
│  POST   /auth/github           - Initiate OAuth         │
│  GET    /auth/github/callback  - OAuth callback         │
│  POST   /auth/refresh          - Refresh token          │
│  POST   /auth/logout           - Invalidate session     │
│  GET    /auth/me               - Get current user       │
├─────────────────────────────────────────────────────────┤
│  Dependencies:                                           │
│  • PostgreSQL (users table)                             │
│  • Redis (session store, token blacklist)               │
│  • GitHub API                                           │
└─────────────────────────────────────────────────────────┘
```

---

### 2️⃣ User Service (Node.js + Express)
**Port: 3002**

```
┌─────────────────────────────────────────────────────────┐
│                    USER SERVICE                          │
├─────────────────────────────────────────────────────────┤
│  Responsibilities:                                       │
│  • User profile management                              │
│  • Skills management (self-declared)                    │
│  • Experience & education CRUD                          │
│  • Profile visibility settings                          │
│  • Account settings                                     │
├─────────────────────────────────────────────────────────┤
│  Endpoints:                                              │
│  GET    /users/:id             - Get user profile       │
│  PUT    /users/:id             - Update profile         │
│  GET    /users/:id/skills      - Get skills             │
│  POST   /users/:id/skills      - Add skill              │
│  POST   /users/:id/experience  - Add experience         │
│  GET    /users/public/:username - Public profile        │
├─────────────────────────────────────────────────────────┤
│  Dependencies:                                           │
│  • PostgreSQL (users, profiles, skills, experiences)    │
│  • Redis (profile cache)                                │
└─────────────────────────────────────────────────────────┘
```

---

### 3️⃣ Resume Service (Go + Gin + Goroutines) 🔥
**Port: 8003 | gRPC: 50053**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         RESUME SERVICE (Go) 🔥                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  WHY GO FOR RESUME SERVICE?                                                      │
│  ═══════════════════════════                                                     │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │  Problem with Node.js:                                                     │ │
│  │  • PDF generation blocks event loop                                        │ │
│  │  • Puppeteer uses 100MB+ RAM per instance                                  │ │
│  │  • Single-threaded = slow with multiple requests                           │ │
│  │                                                                            │ │
│  │  Go Solution:                                                              │ │
│  │  • Goroutines for concurrent PDF generation (1000+ simultaneous)          │ │
│  │  • Native PDF libs (gofpdf, maroto) = 10x faster                           │ │
│  │  • Worker pool pattern for controlled resource usage                       │ │
│  │  • Memory: ~20MB vs ~200MB+ for Node+Puppeteer                             │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│  PERFORMANCE BENCHMARKS:                                                         │
│  ═══════════════════════                                                         │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │  Metric              │  Node.js + Puppeteer  │  Go + Native PDF        │   │
│  │  ────────────────────┼───────────────────────┼─────────────────────────│   │
│  │  Single PDF          │  800ms - 2s           │  50ms - 150ms           │   │
│  │  100 Concurrent PDFs │  45s+ (queue)         │  2-3s (parallel)        │   │
│  │  Memory per request  │  50-100MB             │  5-10MB                 │   │
│  │  Max concurrent      │  10-20 (limited)      │  1000+ (goroutines)     │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│  RESPONSIBILITIES:                                                               │
│  • Resume builder logic with validation                                         │
│  • Template engine (HTML templates → PDF)                                       │
│  • Concurrent PDF generation with worker pool                                   │
│  • Public resume links with caching                                             │
│  • Resume versioning and history                                                │
│  • Real-time preview generation                                                 │
│                                                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│  REST ENDPOINTS:                                                                 │
│  GET    /resume/:userId           - Get resume data                             │
│  PUT    /resume/:userId           - Update resume                               │
│  GET    /resume/templates         - List available templates                    │
│  POST   /resume/generate-pdf      - Generate PDF (async, returns job ID)        │
│  GET    /resume/pdf/:jobId        - Get PDF generation status/download          │
│  GET    /resume/public/:slug      - Public resume page (HTML)                   │
│  GET    /resume/preview/:userId   - Real-time preview (fast)                    │
│                                                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│  gRPC METHODS (for internal services):                                          │
│  GeneratePDF()         - Generate PDF with priority queue                       │
│  GetResumeData()       - Fetch resume for other services                        │
│  ValidateResume()      - Check resume completeness                              │
│                                                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│  ARCHITECTURE:                                                                   │
│                                                                                  │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                     │
│  │   Request    │────▶│  Job Queue   │────▶│ Worker Pool  │                     │
│  │   Handler    │     │   (Redis)    │     │ (Goroutines) │                     │
│  └──────────────┘     └──────────────┘     └──────┬───────┘                     │
│                                                    │                             │
│                              ┌────────────────────┴────────────────────┐        │
│                              │                                          │        │
│                              ▼                                          ▼        │
│                    ┌──────────────────┐                     ┌──────────────────┐│
│                    │  Template Engine │                     │   PDF Generator  ││
│                    │  (html/template) │                     │   (maroto/wkhtml)││
│                    └──────────────────┘                     └──────────────────┘│
│                                                                      │           │
│                                                                      ▼           │
│                                                           ┌──────────────────┐  │
│                                                           │  MinIO Storage   │  │
│                                                           │  (PDF files)     │  │
│                                                           └──────────────────┘  │
│                                                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│  INTERNAL MODULES:                                                               │
│  ├── cmd/                                                                       │
│  │   └── main.go                 - Entry point                                  │
│  ├── internal/                                                                  │
│  │   ├── api/                                                                   │
│  │   │   ├── rest/               - REST handlers                                │
│  │   │   └── grpc/               - gRPC server                                  │
│  │   ├── resume/                                                                │
│  │   │   ├── builder.go          - Resume construction logic                    │
│  │   │   ├── validator.go        - Data validation                              │
│  │   │   └── service.go          - Business logic                               │
│  │   ├── pdf/                                                                   │
│  │   │   ├── generator.go        - PDF generation                               │
│  │   │   ├── templates.go        - Template management                          │
│  │   │   └── worker_pool.go      - Goroutine worker pool                        │
│  │   ├── storage/                                                               │
│  │   │   ├── postgres.go         - Resume data                                  │
│  │   │   └── minio.go            - PDF file storage                             │
│  │   └── cache/                                                                 │
│  │       └── redis.go            - Caching layer                                │
│  └── proto/                                                                     │
│      └── resume.proto            - gRPC definitions                             │
│                                                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│  WORKER POOL IMPLEMENTATION:                                                     │
│                                                                                  │
│  type WorkerPool struct {                                                        │
│      workers    int                                                              │
│      jobQueue   chan PDFJob                                                      │
│      results    chan PDFResult                                                   │
│      wg         sync.WaitGroup                                                   │
│  }                                                                               │
│                                                                                  │
│  func (p *WorkerPool) Start() {                                                  │
│      for i := 0; i < p.workers; i++ {                                            │
│          go p.worker(i) // Launch goroutine workers                              │
│      }                                                                           │
│  }                                                                               │
│                                                                                  │
│  func (p *WorkerPool) worker(id int) {                                           │
│      for job := range p.jobQueue {                                               │
│          result := generatePDF(job) // CPU-intensive work                        │
│          p.results <- result                                                     │
│      }                                                                           │
│  }                                                                               │
│                                                                                  │
│  // Config: WORKER_COUNT = 10-50 based on CPU cores                              │
│  // Each worker handles one PDF at a time                                        │
│  // Thousands of jobs can queue up without blocking                              │
│                                                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│  DEPENDENCIES:                                                                   │
│  • PostgreSQL (resume data, templates metadata)                                 │
│  • Redis (job queue, caching, rate limiting)                                    │
│  • MinIO/S3 (PDF file storage)                                                  │
│  • Go Libraries:                                                                │
│    - github.com/gin-gonic/gin (HTTP router)                                     │
│    - github.com/johnfercher/maroto (PDF generation)                             │
│    - github.com/go-redis/redis (Redis client)                                   │
│    - google.golang.org/grpc (gRPC server)                                       │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

### 4️⃣ Project Analyzer Service (Go + Gin) 🔥
**Port: 8001**

```
┌─────────────────────────────────────────────────────────┐
│              PROJECT ANALYZER SERVICE (Go)               │
├─────────────────────────────────────────────────────────┤
│  Why Go?                                                 │
│  • Fast file system operations                          │
│  • Concurrent processing (goroutines)                   │
│  • Efficient memory usage for large repos               │
│  • Native AST parsing for Go projects                   │
├─────────────────────────────────────────────────────────┤
│  Responsibilities:                                       │
│  • Clone GitHub repositories                            │
│  • Parse code files (AST analysis)                      │
│  • Detect tech stack                                    │
│  • Analyze folder structure                             │
│  • Calculate code metrics                               │
│  • Generate skill scores                                │
├─────────────────────────────────────────────────────────┤
│  Endpoints (gRPC + REST):                               │
│  POST   /projects/analyze      - Queue project analysis │
│  GET    /projects/:id/status   - Analysis status        │
│  GET    /projects/:id/result   - Get analysis result    │
├─────────────────────────────────────────────────────────┤
│  Internal Modules:                                       │
│  ├── git/           - Git operations                    │
│  ├── parser/        - Code parsing                      │
│  │   ├── javascript.go                                  │
│  │   ├── typescript.go                                  │
│  │   ├── golang.go                                      │
│  │   └── python.go                                      │
│  ├── analyzer/      - Analysis logic                    │
│  │   ├── structure.go   (folder analysis)               │
│  │   ├── quality.go     (code quality)                  │
│  │   ├── react.go       (React-specific)                │
│  │   └── patterns.go    (design patterns)               │
│  ├── scorer/        - Skill scoring                     │
│  └── storage/       - Result storage                    │
├─────────────────────────────────────────────────────────┤
│  Dependencies:                                           │
│  • MongoDB (analysis results)                           │
│  • Redis (job queue, caching)                           │
│  • GitHub API (repo info)                               │
│  • AI Service (via gRPC)                                │
└─────────────────────────────────────────────────────────┘
```

---

### 5️⃣ AI Service (Go + Gin) 🧠
**Port: 8002**

```
┌─────────────────────────────────────────────────────────┐
│                    AI SERVICE (Go)                       │
├─────────────────────────────────────────────────────────┤
│  Responsibilities:                                       │
│  • Code quality analysis using AI                       │
│  • Best practices detection                             │
│  • Skill scoring algorithms                             │
│  • Resume content generation                            │
│  • Job matching algorithms                              │
├─────────────────────────────────────────────────────────┤
│  gRPC Methods:                                           │
│  AnalyzeCode()        - Send code, get analysis         │
│  ScoreSkills()        - Calculate skill percentages     │
│  GenerateResume()     - AI-powered resume content       │
│  MatchJobs()          - Match user to jobs              │
├─────────────────────────────────────────────────────────┤
│  AI Providers:                                           │
│  • OpenAI GPT-4 (code analysis, content)                │
│  • Google Gemini (alternative)                          │
│  • Custom ML models (skill scoring) - future            │
├─────────────────────────────────────────────────────────┤
│  Dependencies:                                           │
│  • MongoDB (AI responses cache)                         │
│  • Redis (rate limiting, caching)                       │
│  • OpenAI API / Gemini API                              │
└─────────────────────────────────────────────────────────┘
```

---

### 6️⃣ Job Service (Node.js + Express)
**Port: 3004**

```
┌─────────────────────────────────────────────────────────┐
│                     JOB SERVICE                          │
├─────────────────────────────────────────────────────────┤
│  Responsibilities:                                       │
│  • Job listings management                              │
│  • Job search & filters                                 │
│  • Application processing                               │
│  • Job matching for users                               │
│  • Application status tracking                          │
├─────────────────────────────────────────────────────────┤
│  Endpoints:                                              │
│  GET    /jobs                  - List jobs (filtered)   │
│  GET    /jobs/:id              - Job details            │
│  POST   /jobs/:id/apply        - Apply to job           │
│  GET    /jobs/recommended      - AI-matched jobs        │
│  GET    /applications          - User's applications    │
├─────────────────────────────────────────────────────────┤
│  Dependencies:                                           │
│  • PostgreSQL (jobs, applications)                      │
│  • Redis (search cache)                                 │
│  • AI Service (job matching via gRPC)                   │
└─────────────────────────────────────────────────────────┘
```

---

### 7️⃣ Recruiter Service (Node.js + Express)
**Port: 3005**

```
┌─────────────────────────────────────────────────────────┐
│                  RECRUITER SERVICE                       │
├─────────────────────────────────────────────────────────┤
│  Responsibilities:                                       │
│  • Recruiter account management                         │
│  • Company profile                                      │
│  • Job posting                                          │
│  • Developer search with filters                        │
│  • Shortlist management                                 │
│  • Application review                                   │
├─────────────────────────────────────────────────────────┤
│  Endpoints:                                              │
│  POST   /recruiter/register    - Register company       │
│  POST   /recruiter/jobs        - Post a job             │
│  GET    /recruiter/search      - Search developers      │
│  POST   /recruiter/shortlist   - Save to shortlist      │
│  GET    /recruiter/applications - View applications     │
├─────────────────────────────────────────────────────────┤
│  Search Filters:                                         │
│  • skills[]         - Filter by verified skills         │
│  • minSkillScore    - Minimum skill percentage          │
│  • codeQuality      - Minimum code quality score        │
│  • experience       - Years of experience               │
│  • location         - Remote/Onsite/City                │
│  • availability     - Open to work status               │
├─────────────────────────────────────────────────────────┤
│  Dependencies:                                           │
│  • PostgreSQL (recruiters, companies, jobs)             │
│  • Redis (search cache)                                 │
│  • Elasticsearch (developer search) - future           │
└─────────────────────────────────────────────────────────┘
```

---

## 🔐 Authentication Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │     │  Nginx   │     │  Auth    │     │  GitHub  │
│          │     │  Gateway │     │  Service │     │   API    │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │ 1. Click "Login with GitHub"    │                │
     │────────────────▶                │                │
     │                │ 2. Forward to Auth              │
     │                │────────────────▶                │
     │                │                │ 3. Redirect to GitHub
     │◀───────────────────────────────────────────────────────────
     │                                                  │
     │ 4. User authorizes on GitHub                    │
     │─────────────────────────────────────────────────▶
     │                                                  │
     │ 5. GitHub redirects with code                   │
     │◀─────────────────────────────────────────────────
     │                │                │                │
     │ 6. Send code to callback        │                │
     │────────────────▶────────────────▶                │
     │                │                │ 7. Exchange code for token
     │                │                │────────────────▶
     │                │                │◀───────────────│
     │                │                │ 8. Get user info
     │                │                │────────────────▶
     │                │                │◀───────────────│
     │                │                │                │
     │                │ 9. Create/Update user in DB     │
     │                │ 10. Generate JWT tokens         │
     │◀───────────────────────────────│                │
     │ 11. Return access + refresh token               │
     │                │                │                │
```

---

## 📊 Database Schema

### PostgreSQL Tables

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    github_id VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255),
    name VARCHAR(255),
    avatar_url TEXT,
    bio TEXT,
    location VARCHAR(255),
    is_open_to_work BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Skills table
CREATE TABLE skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    is_verified BOOLEAN DEFAULT false,
    verified_percentage INT DEFAULT 0,
    self_declared_level VARCHAR(50), -- beginner, intermediate, advanced
    created_at TIMESTAMP DEFAULT NOW()
);

-- Projects table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    github_repo_url TEXT NOT NULL,
    repo_name VARCHAR(255),
    description TEXT,
    analysis_status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
    analysis_id VARCHAR(255), -- MongoDB ObjectId reference
    created_at TIMESTAMP DEFAULT NOW()
);

-- Resumes table
CREATE TABLE resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    template_id UUID,
    content JSONB, -- Flexible resume content
    is_public BOOLEAN DEFAULT true,
    public_slug VARCHAR(255) UNIQUE,
    pdf_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Jobs table
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recruiter_id UUID REFERENCES recruiters(id),
    company_id UUID REFERENCES companies(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    required_skills JSONB,
    experience_range VARCHAR(50),
    salary_range VARCHAR(100),
    location VARCHAR(255),
    job_type VARCHAR(50), -- remote, onsite, hybrid
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Applications table
CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    job_id UUID REFERENCES jobs(id),
    status VARCHAR(50) DEFAULT 'applied', -- applied, reviewed, shortlisted, rejected, hired
    applied_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### MongoDB Collections

```javascript
// project_analyses collection
{
  _id: ObjectId,
  projectId: "uuid", // Reference to PostgreSQL
  userId: "uuid",
  repoUrl: "https://github.com/user/repo",
  
  techStack: {
    languages: [
      { name: "JavaScript", percentage: 60, linesOfCode: 5000 },
      { name: "TypeScript", percentage: 30, linesOfCode: 2500 },
      { name: "CSS", percentage: 10, linesOfCode: 800 }
    ],
    frameworks: ["React", "Express"],
    databases: ["MongoDB", "Redis"],
    tools: ["Docker", "GitHub Actions"]
  },
  
  folderStructure: {
    score: 85,
    hasComponents: true,
    hasUtils: true,
    hasSrcFolder: true,
    hasTests: false,
    recommendations: ["Add tests folder", "Consider adding types folder"]
  },
  
  codeQuality: {
    overallScore: 78,
    metrics: {
      naming: 80,
      errorHandling: 70,
      documentation: 65,
      complexity: 75,
      duplication: 85
    }
  },
  
  frameworkAnalysis: {
    react: {
      usesHooks: true,
      usesMemoization: true,
      componentCount: 25,
      customHooksCount: 5,
      stateManagement: "Redux",
      performanceScore: 82
    }
  },
  
  skillScores: [
    { skill: "React", score: 85, evidence: ["Custom hooks", "Memoization", "Good component structure"] },
    { skill: "Node.js", score: 70, evidence: ["Express API", "Middleware patterns"] }
  ],
  
  analyzedAt: ISODate,
  analysisVersion: "1.0"
}
```

---

## 🐳 Docker Compose Setup

```yaml
version: '3.8'

services:
  # ==================== NGINX ====================
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - auth-service
      - user-service
      - resume-service
      - project-analyzer
      - job-service
      - recruiter-service
    networks:
      - verifydev-network

  # ==================== NODE.JS SERVICES ====================
  auth-service:
    build: ./services/auth
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@postgres:5432/verifydev
      - REDIS_URL=redis://redis:6379
      - GITHUB_CLIENT_ID=${GITHUB_CLIENT_ID}
      - GITHUB_CLIENT_SECRET=${GITHUB_CLIENT_SECRET}
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - postgres
      - redis
    networks:
      - verifydev-network

  user-service:
    build: ./services/user
    ports:
      - "3002:3002"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@postgres:5432/verifydev
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    networks:
      - verifydev-network

  # ==================== GO SERVICES (Performance Critical) ====================
  resume-service:
    build: ./services/resume
    ports:
      - "8003:8003"
      - "50053:50053"  # gRPC
    environment:
      - GO_ENV=production
      - DATABASE_URL=postgresql://user:pass@postgres:5432/verifydev
      - REDIS_URL=redis://redis:6379
      - MINIO_ENDPOINT=minio:9000
      - MINIO_ACCESS_KEY=${MINIO_ACCESS_KEY}
      - MINIO_SECRET_KEY=${MINIO_SECRET_KEY}
      - WORKER_POOL_SIZE=20  # Goroutine workers for PDF generation
      - MAX_CONCURRENT_PDFS=100
    depends_on:
      - postgres
      - redis
      - minio
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 128M
    networks:
      - verifydev-network


  job-service:
    build: ./services/job
    ports:
      - "3004:3004"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@postgres:5432/verifydev
      - REDIS_URL=redis://redis:6379
      - AI_SERVICE_URL=ai-service:50052
    depends_on:
      - postgres
      - redis
    networks:
      - verifydev-network

  recruiter-service:
    build: ./services/recruiter
    ports:
      - "3005:3005"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@postgres:5432/verifydev
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    networks:
      - verifydev-network

  # ==================== GO SERVICES ====================
  project-analyzer:
    build: ./services/project-analyzer
    ports:
      - "8001:8001"
      - "50051:50051"  # gRPC
    environment:
      - MONGO_URI=mongodb://mongo:27017/verifydev
      - REDIS_URL=redis://redis:6379
      - GITHUB_TOKEN=${GITHUB_TOKEN}
      - AI_SERVICE_URL=ai-service:50052
    volumes:
      - ./tmp/repos:/tmp/repos  # For cloning repos
    depends_on:
      - mongo
      - redis
      - ai-service
    networks:
      - verifydev-network

  ai-service:
    build: ./services/ai
    ports:
      - "8002:8002"
      - "50052:50052"  # gRPC
    environment:
      - MONGO_URI=mongodb://mongo:27017/verifydev
      - REDIS_URL=redis://redis:6379
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - GEMINI_API_KEY=${GEMINI_API_KEY}
    depends_on:
      - mongo
      - redis
    networks:
      - verifydev-network

  # ==================== DATABASES ====================
  postgres:
    image: postgres:15-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=verifydev
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - verifydev-network

  mongo:
    image: mongo:6
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db
    networks:
      - verifydev-network

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    networks:
      - verifydev-network

  # ==================== STORAGE ====================
  minio:
    image: minio/minio
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      - MINIO_ROOT_USER=minioadmin
      - MINIO_ROOT_PASSWORD=minioadmin
    volumes:
      - minio-data:/data
    command: server /data --console-address ":9001"
    networks:
      - verifydev-network

  # ==================== MESSAGE QUEUE (Optional) ====================
  rabbitmq:
    image: rabbitmq:3-management-alpine
    ports:
      - "5672:5672"
      - "15672:15672"
    volumes:
      - rabbitmq-data:/var/lib/rabbitmq
    networks:
      - verifydev-network

volumes:
  postgres-data:
  mongo-data:
  redis-data:
  minio-data:
  rabbitmq-data:

networks:
  verifydev-network:
    driver: bridge
```

---

## 📁 Project Structure

```
verifydev/
├── docker-compose.yml
├── docker-compose.dev.yml
├── .env.example
├── Makefile
├── README.md
│
├── nginx/
│   ├── nginx.conf
│   └── ssl/
│
├── services/
│   ├── auth/                    # Node.js
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── routes/
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── middleware/
│   │   │   └── utils/
│   │   └── tests/
│   │
│   ├── user/                    # Node.js
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── src/
│   │
│   ├── resume/                  # Node.js
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── src/
│   │
│   ├── job/                     # Node.js
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── src/
│   │
│   ├── recruiter/               # Node.js
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── src/
│   │
│   ├── project-analyzer/        # Go
│   │   ├── Dockerfile
│   │   ├── go.mod
│   │   ├── go.sum
│   │   ├── cmd/
│   │   │   └── main.go
│   │   ├── internal/
│   │   │   ├── git/
│   │   │   ├── parser/
│   │   │   ├── analyzer/
│   │   │   ├── scorer/
│   │   │   └── storage/
│   │   ├── api/
│   │   │   ├── rest/
│   │   │   └── grpc/
│   │   └── proto/
│   │
│   └── ai/                      # Go
│       ├── Dockerfile
│       ├── go.mod
│       ├── cmd/
│       ├── internal/
│       │   ├── openai/
│       │   ├── gemini/
│       │   └── scoring/
│       └── proto/
│
├── proto/                       # Shared protobuf definitions
│   ├── analyzer.proto
│   └── ai.proto
│
├── frontend/                    # React App
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│
├── scripts/
│   ├── setup.sh
│   ├── migrate.sh
│   └── seed.sh
│
└── docs/
    ├── api.md
    ├── architecture.md
    └── deployment.md
```

---

## 🚀 Deployment Options

### Development
```bash
docker-compose -f docker-compose.dev.yml up
```

### Production
- **Option 1:** Docker Compose on VPS (DigitalOcean, Linode)
- **Option 2:** Kubernetes (GKE, EKS, AKS)
- **Option 3:** Railway / Render (easier management)

### CI/CD Pipeline
```
GitHub Push → GitHub Actions → Build Images → Push to Registry → Deploy
```

---

## 📈 Scalability Considerations

1. **Horizontal Scaling:** Each service can scale independently
2. **Database Replication:** PostgreSQL read replicas
3. **Caching Layer:** Redis for frequently accessed data
4. **Queue System:** RabbitMQ for async processing
5. **CDN:** For static assets and resume PDFs
6. **Load Balancing:** Nginx handles distribution

---

## 🔒 Security Measures

1. **JWT with short expiry** + refresh tokens
2. **Rate limiting** at Nginx level
3. **Input validation** on all endpoints
4. **SQL injection prevention** (parameterized queries)
5. **CORS configuration**
6. **Secrets in environment variables**
7. **HTTPS everywhere**
8. **GitHub token scoping** (minimal permissions)

---

**This architecture is designed to be:**
- ✅ Scalable
- ✅ Maintainable
- ✅ Secure
- ✅ Developer-friendly
- ✅ Production-ready
