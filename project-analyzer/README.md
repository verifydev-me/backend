# 🔍 Project Analyzer Engine

> **AI-Powered Code Analysis Engine** | Go 1.21+ | Worker Pool Enabled

VerifyDev का core analysis engine जो GitHub repositories को scan करके developer skills verify करता है।

---

## 📋 Table of Contents

1. [Quick Start](#-quick-start)
2. [How It Works](#-how-it-works)
3. [Architecture Overview](#-architecture-overview)
4. [File Structure](#-file-structure)
5. [Analysis Pipeline](#-analysis-pipeline)
6. [Configuration](#-configuration)
7. [API Reference](#-api-reference)

---

## 🚀 Quick Start

```bash
# Run locally
go run cmd/main.go

# Run with Docker
docker compose up project-analyzer

# Environment variables (optional)
WORKER_COUNT=4          # Concurrent workers (default: 4)
PREFETCH_COUNT=4        # RabbitMQ prefetch (default: 4)
ANALYSIS_TIMEOUT_SEC=120 # Per-repo timeout
```

---

## 🧠 How It Works

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ANALYSIS FLOW                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   1. MESSAGE RECEIVED (RabbitMQ)                                     │
│      └─ project.analyze.request queue                                │
│                                                                      │
│   2. GIT CLONE                                                       │
│      └─ Clone repo to /tmp/repos/{projectId}                         │
│                                                                      │
│   3. PARALLEL ANALYSIS (5 concurrent goroutines)                     │
│      ├─ Language Stats      → Count lines per language               │
│      ├─ Folder Structure    → Detect src/, components/, etc          │
│      ├─ Code Signals        → README, Docker, CI detection           │
│      ├─ Infra Extraction    → 400+ tech pattern detection            │
│      └─ Git Forensics       → Authorship verification                │
│                                                                      │
│   4. INTELLIGENCE PIPELINE (7 stages)                                │
│      ├─ Signal Scanning     → Fast tech detection                    │
│      ├─ Intent Inference    → Project purpose (prod/hobby/learning)  │
│      ├─ Skill Extraction    → Convert signals → verified skills      │
│      ├─ Usage Verification  → Check actual code usage                │
│      ├─ Risk Modeling       → Security & quality assessment          │
│      ├─ Suggestion Gen      → Improvement recommendations            │
│      └─ Verdict Generation  → Final recruiter-grade assessment       │
│                                                                      │
│   5. PUBLISH RESULT (RabbitMQ)                                       │
│      └─ project.analyzed queue → Aura Processor                      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Architecture Overview

```
project-analyzer/
│
├── cmd/
│   └── main.go                 # Entry point, HTTP server, worker pool
│
├── internal/
│   ├── analyzer/               # Main orchestrator
│   │   ├── analyzer.go         # Analysis flow, message handling
│   │   └── security.go         # Security pattern detection
│   │
│   ├── config/
│   │   └── config.go           # Environment configuration
│   │
│   ├── git/
│   │   └── client.go           # Git clone/delete operations
│   │
│   ├── intelligence/           # 🧠 AI Analysis Layer (17 modules)
│   │   ├── pipeline.go         # 7-stage analysis orchestration
│   │   ├── types.go            # Core types & confidence vectors
│   │   ├── signal_scanner.go   # Fast signal detection
│   │   ├── usage_verifier.go   # Actual usage verification
│   │   ├── verdict_engine.go   # Final verdict generation
│   │   ├── confidence_calibrator.go
│   │   ├── skill_taxonomy.go
│   │   ├── risk_modeling.go
│   │   ├── security_scanner.go
│   │   └── ... (8 more modules)
│   │
│   ├── parser/                 # Code parsing layer
│   │   ├── parser.go           # Language stats, folder analysis
│   │   ├── infra_extractor.go  # Main signal extraction
│   │   ├── infra_extractor_*.go # Language-specific extractors
│   │   ├── git_forensics.go    # Authorship detection
│   │   └── inference_engine.go # Signal → Skill conversion
│   │
│   ├── rabbitmq/
│   │   └── client.go           # Message queue integration
│   │
│   └── workerpool/
│       └── pool.go             # Concurrent worker management
│
└── pkg/                        # Shared types
    ├── signals/                # Signal constants & types
    ├── dimensions/             # Dimensional analysis
    ├── verdict/                # Verdict types
    └── trust/                  # Trust scoring
```

---

## 📁 File Structure Explained

### 🔴 Entry Point: `cmd/main.go`

```go
// Starts the analyzer with worker pool
func main() {
    cfg := config.Load()
    rabbit := rabbitmq.NewRabbitMQ(...)
    analyzer := analyzer.NewAnalyzer(cfg, rabbit)
    
    // Worker pool for concurrent processing
    analyzer.StartWithWorkerPool(ctx)
}
```

**Key Features:**
- HTTP health endpoints (`/health`, `/ready`, `/metrics`)
- Graceful shutdown support
- Configurable worker pool (WORKER_COUNT env var)

---

### 🔴 Core Orchestrator: `internal/analyzer/analyzer.go`

**This is the BRAIN.** It coordinates everything.

```go
// Main analysis function
func (a *Analyzer) analyze(ctx context.Context, req AnalyzeRequest) (*ProjectSignals, error) {
    // 1. Clone repo
    repoPath := a.gitClient.CloneRepo(...)
    
    // 2. PARALLEL Phase (5 goroutines)
    go fileParser.GetLanguageStats()
    go fileParser.AnalyzeFolderStructure()
    go fileParser.AnalyzeCodeSignals()
    go infraExtractor.Extract()        // ⭐ Heavy lifting
    go gitAnalyzer.Analyze()
    
    // 3. Sequential Phase
    result.ProjectType = DetectProjectType(...)
    result.IndustryAnalysis = inferenceEngine.InferSkills(infraSignals)
    
    // 4. Intelligence Pipeline (7 stages)
    intelligenceResult := intelligencePipeline.Run(ctx)
    
    // 5. Apply authorship penalties
    applyAuthorshipPenaltyToSkills(...)
    
    return result, nil
}
```

**Worker Pool Mode:**
```go
// StartWithWorkerPool - Production recommended
func (a *Analyzer) StartWithWorkerPool(ctx context.Context) {
    // Semaphore limits concurrent workers
    sem := make(chan struct{}, workerCount)
    
    for msg := range msgs {
        sem <- struct{}{}  // Acquire slot
        go func(msg) {
            defer func() { <-sem }()  // Release slot
            a.handleMessage(ctx, msg)
        }(msg)
    }
}
```

---

### 🔴 Signal Detection: `internal/parser/infra_extractor.go`

**Detects 400+ technologies** from code patterns.

```go
// Main extraction function
func (e *InfraExtractor) Extract() *InfrastructureSignals {
    // Scan root files
    e.extractRootFileSignals()     // Dockerfile, docker-compose
    e.extractConfigSignals()       // .env files
    e.extractDependencySignals()   // package.json, go.mod
    e.extractServiceStructureSignals()  // Microservices detection
    e.extractDeepServiceSignals()  // Nested services
    
    return e.signals
}
```

**Language-Specific Extractors:**

| File | Purpose | Detects |
|------|---------|---------|
| `infra_extractor_node.go` | Node.js/TS | React, Express, NestJS, 200+ npm packages |
| `infra_extractor_go.go` | Go | Gin, Fiber, GORM, 50+ Go modules |
| `infra_extractor_python.go` | Python | Django, Flask, FastAPI, ML libraries |
| `infra_extractor_docker.go` | Docker | Dockerfile, compose, multi-stage builds |
| `infra_extractor_gateway.go` | Gateways | Nginx, Traefik, API patterns |
| `infra_extractor_deployment.go` | DevOps | K8s, Terraform, CI/CD |

**Example Signal Detection:**
```go
// From infra_extractor_node.go
dependencyMap := map[string]InfraSignal{
    "@prisma/client": SignalPrisma,
    "express":        SignalExpress,
    "socket.io":      SignalWebSocket,
    "kafkajs":        SignalKafka,
    "ioredis":        SignalRedis,
}
```

---

### 🔴 Skill Inference: `internal/parser/inference_engine.go`

**Converts signals → verified skills** with 150+ rules.

```go
type SkillRule struct {
    SkillName       string              // "PostgreSQL"
    Category        SkillCategory       // DATABASE
    RequiredSignals []InfraSignal       // Must ALL be present
    OptionalSignals []InfraSignal       // Boost confidence
    BaseConfidence  float64             // 0.70-0.90
    Weight          int                 // Aura points
}

// Example rule
{
    SkillName: "Microservices Architecture",
    Category: CategoryArchitecture,
    RequiredSignals: []InfraSignal{SignalDocker, SignalDockerCompose},
    OptionalSignals: []InfraSignal{SignalNginx, SignalKafka, SignalMultipleServices},
    BaseConfidence: 0.80,
    Weight: 12,
}
```

---

### 🔴 Intelligence Pipeline: `internal/intelligence/pipeline.go`

**7-stage deep analysis** for accurate skill verification.

```go
func (p *Pipeline) Run(ctx context.Context) (*PipelineResult, error) {
    // Stage 1: Signal Scanning
    signals, confidence := p.scanner.Scan()
    
    // Stage 2: Intent Inference
    intent := p.inferIntent(signals)  // PRODUCTION, HOBBY, LEARNING
    
    // Stage 3: Skill Extraction
    skills := p.extractSkills(signals)
    
    // Stage 4: Usage Verification
    verdicts := p.verifyUsage(skills)
    
    // Stage 5: Risk Modeling
    risks := p.modelRisks(signals, skills)
    
    // Stage 6: Suggestion Generation
    suggestions := p.generateSuggestions(risks)
    
    // Stage 7: Verdict Generation
    verdict := p.verdictEngine.GenerateVerdict()
    
    return &PipelineResult{Verdict: verdict, Skills: skills}
}
```

**Key Intelligence Modules:**

| Module | Purpose |
|--------|---------|
| `signal_scanner.go` | Fast lightweight scanning |
| `usage_verifier.go` | Verify actual code usage (not just deps) |
| `verdict_engine.go` | Final recruiter-grade assessment |
| `confidence_calibrator.go` | Adjust scores based on project size |
| `skill_taxonomy.go` | Skill hierarchy & relationships |
| `security_scanner.go` | Vulnerability detection |
| `risk_modeling.go` | Uncertainty assessment |

---

### 🔴 Git Forensics: `internal/parser/git_forensics.go`

**Detects organic vs copied projects.**

```go
// AuthorshipVerdict levels:
ORGANIC    → Natural development (5% bonus)
SNAPSHOT   → Bulk copy suspected (10% penalty)
SUSPICIOUS → Red flags detected (15% penalty)
UNCLEAR    → Team project, can't determine

// Detection rules:
if LargestCommitRatio > 0.80 {
    // "80%+ code in single commit = likely copied"
    level = "SNAPSHOT"
}
if projectAge < 24*time.Hour && refactorCount == 0 {
    // "Completed in <24h with no refactors = suspicious"
    level = "SUSPICIOUS"
}
```

---

## ⚙️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 8001 | HTTP server port |
| `WORKER_COUNT` | 4 | Concurrent analysis workers |
| `PREFETCH_COUNT` | 4 | RabbitMQ prefetch (match workers) |
| `ANALYSIS_TIMEOUT_SEC` | 120 | Per-repo timeout |
| `RABBITMQ_URL` | localhost | RabbitMQ connection |
| `CLONE_DIR` | /tmp/repos | Temp directory for clones |
| `GITHUB_TOKEN` | - | For private repos |

### Performance Tuning

```bash
# High-CPU server (8+ cores)
WORKER_COUNT=8
PREFETCH_COUNT=8

# Low-memory server
WORKER_COUNT=2
ANALYSIS_TIMEOUT_SEC=60

# Production recommended
WORKER_COUNT=4
PREFETCH_COUNT=4
ANALYSIS_TIMEOUT_SEC=120
```

---

## 📡 API Reference

### Health Endpoints

```bash
# Health check
GET /health
{
    "success": true,
    "data": {
        "service": "project-analyzer",
        "version": "2.0.0-workerpool",
        "workerCount": 4
    }
}

# Ready check
GET /ready
{
    "success": true,
    "message": "Ready to analyze with worker pool"
}

# Metrics
GET /metrics
{
    "workerCount": 4,
    "prefetchCount": 4
}
```

### RabbitMQ Messages

**Input Queue:** `project.analyze.request`
```json
{
    "projectId": "abc123",
    "userId": "user456",
    "repoUrl": "https://github.com/user/repo",
    "repoName": "repo",
    "defaultBranch": "main",
    "userProjectType": "backend",
    "niche": "web"
}
```

**Output Queue:** `project.analyzed`
```json
{
    "projectId": "abc123",
    "userId": "user456",
    "languages": [...],
    "frameworks": ["Express", "React"],
    "databases": ["PostgreSQL"],
    "tools": ["Docker", "GitHub Actions"],
    "industryAnalysis": {
        "verifiedSkills": [...],
        "totalSkills": 15
    },
    "intelligenceVerdict": {
        "overallScore": 85,
        "hireSignal": "STRONG_HIRE"
    }
}
```

---

## 🔧 Adding New Technology Detection

### Step 1: Add Signal Constant
```go
// pkg/signals/infrastructure.go
const SignalNewTech InfraSignal = "newtech"
```

### Step 2: Add Detection Logic
```go
// internal/parser/infra_extractor_node.go
dependencyMap["newtech-package"] = signals.SignalNewTech
```

### Step 3: Add Skill Rule
```go
// internal/parser/inference_engine.go
{
    SkillName: "NewTech",
    Category: CategoryFramework,
    RequiredSignals: []InfraSignal{SignalNewTech},
    BaseConfidence: 0.85,
}
```

---

## 📊 Output Example

```
📦 Analysis Complete for: verify-stack

Languages:
  TypeScript: 65% (15,000 lines)
  Go: 25% (6,000 lines)
  
Frameworks: [Next.js, Express, Gin, Prisma]
Databases: [PostgreSQL, Redis, MongoDB]
Tools: [Docker, Kubernetes, GitHub Actions]

Verified Skills (15):
  ✅ TypeScript (Advanced) - 95% confidence
  ✅ Microservices Architecture - 90% confidence
  ✅ PostgreSQL - 88% confidence
  ✅ Docker & Kubernetes - 85% confidence
  
Intelligence Verdict:
  Project Type: PRODUCTION
  Developer Level: SENIOR
  Architecture: MICROSERVICES
  Overall Score: 87/100
  Hire Signal: STRONG_HIRE
  
Authorship: ORGANIC (5% bonus applied)
```

---

## 🔗 Related Documentation

- [DEVELOPER.md](./DEVELOPER.md) - Detailed function-level documentation
- [Backend README](../README.md) - Full backend documentation

---

## 📄 License

MIT © VerifyDev
