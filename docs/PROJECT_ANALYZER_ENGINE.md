# Project Analyzer Engine

> AI-Powered GitHub Repository Analysis Engine (Go)

---

## 📋 Overview

The Project Analyzer is a **Go-based microservice** that analyzes GitHub repositories to:
- 🔍 Detect technology stack (languages, frameworks, databases)
- 🏗️ Identify architecture patterns (microservices, monolith)
- ✅ Extract verified skills with confidence scores
- 📊 Calculate code quality metrics
- 🎯 Generate developer niche classification

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PROJECT ANALYZER ENGINE                              │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        ENTRY LAYER                                   │   │
│  │   cmd/main.go → RabbitMQ Consumer → HTTP Health                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        GIT LAYER                                     │   │
│  │   internal/git/client.go → Clone Repository                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        PARSER LAYER                                  │   │
│  │                                                                      │   │
│  │   ┌─────────────────┐  ┌──────────────────────────────────────┐    │   │
│  │   │  FileParser     │  │     InfrastructureExtractor          │    │   │
│  │   │                 │  │                                       │    │   │
│  │   │ • Language Stats│  │ ┌───────────────────────────────────┐│    │   │
│  │   │ • File Counting │  │ │ Phase 1: Parse Docker Compose     ││    │   │
│  │   │ • Folder Tree   │  │ │ Phase 2: Extract Node.js Signals  ││    │   │
│  │   └─────────────────┘  │ │ Phase 3: Extract Go Signals       ││    │   │
│  │                        │ │ Phase 4: Extract Python Signals   ││    │   │
│  │                        │ │ Phase 5: Detect Services          ││    │   │
│  │                        │ └───────────────────────────────────┘│    │   │
│  │                        └──────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     INFERENCE ENGINE                                 │   │
│  │   internal/parser/inference_engine.go (1553 lines of rules!)        │   │
│  │                                                                      │   │
│  │   • 500+ Technology Detection Rules                                  │   │
│  │   • Confidence Score Calculation                                     │   │
│  │   • Skill Categorization (LANGUAGE, FRAMEWORK, DATABASE, etc.)       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     INTELLIGENCE LAYER                               │   │
│  │                                                                      │   │
│  │   ┌────────────┐  ┌───────────────┐  ┌───────────────┐              │   │
│  │   │ 7-Stage    │  │  Stack        │  │   Verdict     │              │   │
│  │   │ Pipeline   │  │  Analyzers    │  │   Engine      │              │   │
│  │   └────────────┘  └───────────────┘  └───────────────┘              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        OUTPUT                                        │   │
│  │   Publish to RabbitMQ: project.analyzed                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
project-analyzer/
├── cmd/
│   └── main.go                    # Entry point, RabbitMQ consumer
│
├── internal/
│   ├── analyzer/
│   │   └── analyzer.go            # Main orchestrator
│   │
│   ├── config/
│   │   └── config.go              # Environment configuration
│   │
│   ├── git/
│   │   └── client.go              # Git clone operations
│   │
│   ├── parser/                    # 17 files
│   │   ├── parser.go              # File/folder parsing
│   │   ├── infra_extractor.go     # Main signal extractor
│   │   ├── infra_extractor_docker.go
│   │   ├── infra_extractor_node.go
│   │   ├── infra_extractor_go.go
│   │   ├── infra_extractor_python.go
│   │   ├── infra_extractor_services.go
│   │   ├── infra_extractor_helpers.go
│   │   └── inference_engine.go    # 1553 lines of skill rules!
│   │
│   ├── intelligence/              # 15 files
│   │   ├── pipeline.go            # 7-stage analysis pipeline
│   │   ├── signal_scanner.go      # Fast lightweight scan
│   │   ├── verdict_engine.go      # Final verdict generation
│   │   ├── stack_analyzers.go     # Next.js, Go, Node analyzers
│   │   ├── skill_taxonomy.go      # Skill categorization
│   │   ├── risk_modeling.go       # Security risk detection
│   │   └── confidence_calibrator.go
│   │
│   └── rabbitmq/
│       └── publisher.go           # Publish results
│
├── pkg/
│   └── models/                    # Shared data structures
│
├── go.mod
├── go.sum
└── Dockerfile
```

---

## 🔄 Analysis Pipeline

### 7-Stage Intelligence Pipeline

```
Stage 1: Signal Scanning
         │ Fast lightweight file scan
         ▼
Stage 2: Language Analysis
         │ Detect programming languages
         ▼
Stage 3: Framework Detection
         │ Identify frameworks (React, Express, Django)
         ▼
Stage 4: Infrastructure Extraction
         │ Parse docker-compose, detect DBs
         ▼
Stage 5: Architecture Classification
         │ Monolith vs Microservices
         ▼
Stage 6: Risk Assessment
         │ Security vulnerabilities, code smells
         ▼
Stage 7: Verdict Generation
         │ Final scores and recommendations
         ▼
       OUTPUT
```

---

## 🔍 Signal Detection

### Infrastructure Extractor Phases

#### Phase 1: Docker Analysis
```go
// Parses docker-compose.yml and Dockerfiles
- Extracts service names
- Identifies databases (postgres, mongo, redis)
- Detects message queues (rabbitmq, kafka)
- Finds networks and volumes
```

**Detects:**
| Service | Pattern |
|---------|---------|
| PostgreSQL | `postgres:`, `image: postgres` |
| MongoDB | `mongo:`, `mongodb://` |
| Redis | `redis:`, `redis://` |
| RabbitMQ | `rabbitmq:`, `amqp://` |
| Kafka | `kafka:`, `KAFKA_` |
| Elasticsearch | `elasticsearch:` |
| Nginx | `nginx:` |
| Traefik | `traefik:` |

---

#### Phase 2: Node.js Analysis
```go
// Parses package.json recursively
- Scans all package.json files in project
- Extracts dependencies and devDependencies
- Identifies frameworks (express, next, nest)
```

**Detects:**
| Technology | Detection Method |
|------------|-----------------|
| React | `react` in dependencies |
| Next.js | `next` in dependencies, next.config.js |
| Express | `express` in dependencies |
| NestJS | `@nestjs/core` in dependencies |
| TypeScript | `typescript` in devDependencies |
| Prisma | `prisma`, `@prisma/client` |
| MongoDB | `mongoose`, `mongodb` |
| Redis | `ioredis`, `redis` |

---

#### Phase 3: Go Analysis
```go
// Parses go.mod and scans imports
- Identifies Go modules and versions
- Detects web frameworks
- Finds database drivers
```

**Detects:**
| Technology | Pattern |
|------------|---------|
| Gin | `github.com/gin-gonic/gin` |
| Fiber | `github.com/gofiber/fiber` |
| Echo | `github.com/labstack/echo` |
| GORM | `gorm.io/gorm` |
| Mongo Driver | `go.mongodb.org/mongo-driver` |

---

#### Phase 4: Python Analysis
```go
// Parses requirements.txt and pyproject.toml
- Identifies frameworks
- Detects ML libraries
```

**Detects:**
| Technology | Pattern |
|------------|---------|
| Django | `django` |
| FastAPI | `fastapi` |
| Flask | `flask` |
| TensorFlow | `tensorflow` |
| PyTorch | `torch` |
| SQLAlchemy | `sqlalchemy` |

---

#### Phase 5: Service Detection
```go
// Identifies microservice patterns
- Scans for service folders
- Detects API gateways
- Identifies shared libraries
```

**Patterns:**
| Pattern | Indicators |
|---------|-----------|
| Microservices | Multiple service folders, docker-compose with 3+ services |
| Monolith | Single src folder, all code in one place |
| Monorepo | `apps/`, `packages/`, `services/` folders |

---

## 🧠 Inference Engine

### Overview

The Inference Engine (`inference_engine.go`) contains **1553 lines** of skill detection rules.

### Rule Structure

```go
type InferenceRule struct {
    Name           string
    Skill          string
    Category       SkillCategory
    Confidence     float64
    Conditions     []RuleCondition
    BoostConditions []RuleCondition  // Optional: increase confidence
}

type RuleCondition struct {
    Type       ConditionType  // FILE_EXISTS, PATTERN_MATCH, SIGNAL_PRESENT
    FilePath   string
    Pattern    string
    SignalName string
}
```

### Example Rules

```go
// Rule: Detect React
{
    Name: "react_detection",
    Skill: "React",
    Category: FRAMEWORK,
    Confidence: 0.85,
    Conditions: []RuleCondition{
        {Type: FILE_EXISTS, FilePath: "package.json"},
        {Type: PATTERN_MATCH, FilePath: "package.json", Pattern: `"react":`},
    },
}

// Rule: Detect Docker Expertise
{
    Name: "docker_expertise",
    Skill: "Docker",
    Category: DEVOPS,
    Confidence: 0.90,
    Conditions: []RuleCondition{
        {Type: FILE_EXISTS, FilePath: "Dockerfile"},
    },
    BoostConditions: []RuleCondition{
        {Type: FILE_EXISTS, FilePath: "docker-compose.yml"},  // +10% if present
        {Type: PATTERN_MATCH, FilePath: "Dockerfile", Pattern: "multi-stage"},  // +10% if multi-stage
    },
}
```

### Confidence Boosting

```go
// Dynamic confidence based on evidence count
baseConfidence = rule.Confidence

if matchCount >= 2 && matchCount <= 3 {
    confidence = min(1.0, baseConfidence + 0.10)  // +10%
}
if matchCount >= 4 {
    confidence = min(1.0, baseConfidence + 0.20)  // +20%
}
```

---

## 📊 Output Format

### Project Signals (Published to RabbitMQ)

```json
{
  "projectId": "507f1f77bcf86cd799439011",
  "userId": "507f1f77bcf86cd799439012",
  "status": "completed",
  "analysis": {
    "summary": "A production-ready microservices backend built with Go and TypeScript...",
    
    "techStack": {
      "languages": [
        {"name": "TypeScript", "percentage": 55, "files": 120},
        {"name": "Go", "percentage": 35, "files": 45},
        {"name": "JavaScript", "percentage": 10, "files": 15}
      ],
      "frameworks": ["Express", "Gin", "React"],
      "databases": ["MongoDB", "Redis"],
      "infrastructure": ["Docker", "Nginx", "GitHub Actions"]
    },
    
    "architecture": {
      "type": "microservices",
      "serviceCount": 5,
      "services": [
        {"name": "auth-service", "language": "TypeScript"},
        {"name": "user-service", "language": "TypeScript"},
        {"name": "job-service", "language": "TypeScript"},
        {"name": "project-analyzer", "language": "Go"},
        {"name": "gateway", "language": "Nginx"}
      ],
      "hasAPIGateway": true,
      "hasSharedLibraries": false
    },
    
    "skills": [
      {
        "name": "TypeScript",
        "category": "LANGUAGE",
        "confidence": 0.95,
        "evidence": ["Primary language", "120 files", "Type definitions"],
        "auraPoints": 150
      },
      {
        "name": "Go",
        "category": "LANGUAGE",
        "confidence": 0.90,
        "evidence": ["Backend service", "45 files"],
        "auraPoints": 120
      },
      {
        "name": "Docker",
        "category": "DEVOPS",
        "confidence": 0.95,
        "evidence": ["Dockerfile", "docker-compose.yml", "Multi-stage builds"],
        "auraPoints": 100
      },
      {
        "name": "Microservices",
        "category": "ARCHITECTURE",
        "confidence": 0.92,
        "evidence": ["5 services detected", "Service communication"],
        "auraPoints": 200
      }
    ],
    
    "qualityMetrics": {
      "hasTests": true,
      "testCoverage": null,
      "hasCI": true,
      "ciPlatform": "GitHub Actions",
      "hasDocker": true,
      "hasDockerCompose": true,
      "hasReadme": true,
      "hasContributing": false,
      "hasLicense": true,
      "documentation": "good"
    },
    
    "scores": {
      "codeQuality": 85,
      "structure": 88,
      "overall": 86
    },
    
    "risks": [
      {
        "type": "security",
        "severity": "low",
        "message": "No .env.example found for documentation"
      }
    ],
    
    "recommendations": [
      "Add test coverage reporting",
      "Consider adding CONTRIBUTING.md",
      "Add API documentation (OpenAPI/Swagger)"
    ]
  },
  
  "verdict": {
    "overallRating": "Strong Hire",
    "hireSignal": 0.85,
    "niche": "BACKEND_SYSTEMS",
    "seniorityLevel": "Mid-Senior"
  },
  
  "analyzedAt": "2024-01-10T12:00:00Z",
  "analysisDurationMs": 4500
}
```

---

## ⚙️ Configuration

### Environment Variables

```bash
# Service
PORT=8001
ENV=development

# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672/
EXCHANGE_NAME=project.events
CONSUME_QUEUE=project.analyze.request
PUBLISH_QUEUE=project.analyzed

# Git
CLONE_DIR=/tmp/repos
GITHUB_TOKEN=ghp_xxxxx  # For private repos

# Optional
MAX_ANALYSIS_TIME_SECONDS=300
MAX_FILES_TO_SCAN=10000
```

### Limits

| Limit | Value | Purpose |
|-------|-------|---------|
| `MaxFilesScanned` | 10,000 | Prevent OOM on huge repos |
| `MaxFileResults` | 500 | Limit result set size |
| `MaxFileSizeRead` | 5 MB | Skip binary/large files |
| `MaxAnalysisTime` | 5 min | Timeout for analysis |
| `CloneDepth` | 1 | Shallow clone for speed |

---

## 🔧 Skill Categories

```go
type SkillCategory string

const (
    LANGUAGE        SkillCategory = "LANGUAGE"
    FRAMEWORK       SkillCategory = "FRAMEWORK"
    DATABASE        SkillCategory = "DATABASE"
    DEVOPS          SkillCategory = "DEVOPS"
    INFRASTRUCTURE  SkillCategory = "INFRASTRUCTURE"
    CICD            SkillCategory = "CICD"
    CLOUD           SkillCategory = "CLOUD"
    SECURITY        SkillCategory = "SECURITY"
    TESTING         SkillCategory = "TESTING"
    ARCHITECTURE    SkillCategory = "ARCHITECTURE"
    SOFT_SKILL      SkillCategory = "SOFT_SKILL"
)
```

---

## 🎯 Aura Point Calculation

| Skill Type | Base Points | Confidence Multiplier |
|------------|-------------|----------------------|
| Language (Primary) | 100 | × confidence |
| Language (Secondary) | 50 | × confidence |
| Framework | 75 | × confidence |
| Database | 60 | × confidence |
| DevOps | 80 | × confidence |
| Architecture | 150 | × confidence |
| Testing | 50 | × confidence |

**Example:**
```
TypeScript (primary language, 95% confidence)
= 100 × 0.95 = 95 points

Docker (DevOps, 90% confidence)
= 80 × 0.90 = 72 points

Microservices (Architecture, 92% confidence)
= 150 × 0.92 = 138 points
```

---

## 📋 Technology Coverage

### Languages
| Language | Detection | Confidence |
|----------|-----------|------------|
| TypeScript | package.json, tsconfig.json | 0.95 |
| JavaScript | package.json, .js files | 0.90 |
| Go | go.mod, .go files | 0.95 |
| Python | requirements.txt, pyproject.toml | 0.90 |
| Java | pom.xml, build.gradle | 0.90 |
| Rust | Cargo.toml | 0.90 |
| C# | .csproj files | 0.85 |

### Frameworks
| Framework | Detection | Confidence |
|-----------|-----------|------------|
| React | package.json, jsx files | 0.90 |
| Next.js | next.config.js | 0.95 |
| Vue | package.json, .vue files | 0.85 |
| Angular | angular.json | 0.90 |
| Express | package.json | 0.85 |
| NestJS | @nestjs/core | 0.90 |
| Gin | go.mod imports | 0.90 |
| Django | requirements.txt, manage.py | 0.90 |
| FastAPI | requirements.txt | 0.85 |
| Spring Boot | pom.xml, application.properties | 0.90 |

### Databases
| Database | Detection | Confidence |
|----------|-----------|------------|
| PostgreSQL | docker-compose, pg imports | 0.85 |
| MongoDB | docker-compose, mongoose | 0.85 |
| Redis | docker-compose, ioredis | 0.85 |
| MySQL | docker-compose, mysql2 | 0.80 |
| Elasticsearch | docker-compose | 0.85 |

### Infrastructure
| Technology | Detection | Confidence |
|------------|-----------|------------|
| Docker | Dockerfile | 0.95 |
| Kubernetes | k8s/, deployment.yaml | 0.90 |
| GitHub Actions | .github/workflows | 0.95 |
| GitLab CI | .gitlab-ci.yml | 0.95 |
| Terraform | .tf files | 0.90 |
| Nginx | nginx.conf, docker-compose | 0.90 |

---

## 🐛 Debugging

### Local Testing

```bash
# Build
cd project-analyzer
go build -o analyzer ./cmd

# Run with debug output
ENV=development ./analyzer
```

### Docker Testing

```bash
# Build image
docker build -t verifydev-analyzer .

# Run with logs
docker run --rm \
  -e RABBITMQ_URL=amqp://guest:guest@host.docker.internal:5672/ \
  -e GITHUB_TOKEN=ghp_xxx \
  verifydev-analyzer
```

### Viewing Logs

```bash
# In docker-compose
docker logs -f verifydev-analyzer

# Specific analysis
docker logs verifydev-analyzer 2>&1 | grep "projectId"
```

---

## 📈 Performance

| Metric | Target | Actual |
|--------|--------|--------|
| Clone Time (shallow) | < 5s | ~2-4s |
| Small Repo Analysis | < 10s | ~5-8s |
| Medium Repo Analysis | < 30s | ~15-25s |
| Large Repo Analysis | < 60s | ~40-50s |
| Memory Usage | < 512MB | ~200-400MB |

---

## 🔒 Security Considerations

1. **Token Handling**: GitHub token stored in env, never logged
2. **Sandboxed Clone**: Repos cloned to isolated temp directory
3. **File Size Limits**: Large files skipped (potential binaries)
4. **Execution Prevention**: No code execution, only static analysis
5. **Rate Limiting**: Respects GitHub API rate limits

---

> Last Updated: January 2026
