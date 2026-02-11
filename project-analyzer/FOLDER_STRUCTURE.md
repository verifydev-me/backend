# Project Analyzer — Folder Structure

> Every folder has ONE job. Looking at the name tells you what it does.

```
project-analyzer/
│
├── cmd/main.go                    ← App entry: HTTP server + RabbitMQ consumer
│
├── internal/                      ← Private app code (not importable by others)
│   │
│   ├── analyzer/                  ← 🎯 ORCHESTRATOR — ties everything together
│   │   ├── analyzer.go            │  Core: NewAnalyzer, Start, handleMessage, analyze()
│   │   ├── detection.go           │  Quick project type detection (frontend/backend/fullstack)
│   │   ├── enrichment.go          │  Tech stack mapping, trust analysis, dimensional scoring
│   │   ├── filtering.go           │  Remove irrelevant signals by project type
│   │   ├── mapping.go             │  Convert internal types → API response types
│   │   └── security.go            │  Security vulnerability scanning (regex-based)
│   │
│   ├── extractor/                 ← 🔍 INFRASTRUCTURE SIGNAL EXTRACTION
│   │   ├── extractor.go           │  Main Extract() pipeline (15 phases)
│   │   ├── helpers.go             │  findFiles, shouldSkipPath, findCodePattern
│   │   ├── node.go                │  package.json scanning (npm deps → signals)
│   │   ├── golang.go              │  go.mod scanning (Go deps → signals)
│   │   ├── python.go              │  requirements.txt / pyproject.toml scanning
│   │   ├── docker.go              │  Dockerfile analysis
│   │   ├── deployment.go          │  CI/CD, cloud, IaC detection
│   │   ├── services.go            │  Microservice vs monorepo detection
│   │   ├── patterns.go            │  Message queues, event sourcing, CQRS
│   │   ├── gateway.go             │  Nginx, Traefik, Envoy detection
│   │   ├── graph.go               │  Architecture graph generation
│   │   ├── complexity.go          │  Complexity scoring
│   │   └── verification.go        │  Ghost dependency check (signal verification)
│   │
│   ├── parser/                    ← 📄 FILE PARSING & LANGUAGE ANALYSIS
│   │   ├── parser.go              │  FileParser: LOC, deps, tests, frameworks
│   │   ├── language.go            │  Language detection (go-enry)
│   │   └── advanced.go            │  Advanced pattern detection (REST, decorators, etc.)
│   │
│   ├── inference/                 ← 🧠 SKILL INFERENCE ENGINE
│   │   └── engine.go              │  Signal → Verified Skills mapping (2000+ rules)
│   │
│   ├── forensics/                 ← 🕵️ GIT AUTHENTICITY ANALYSIS
│   │   └── git.go                 │  Commit patterns, authorship verification
│   │
│   ├── intelligence/              ← 🤖 AUTONOMOUS INTELLIGENCE PIPELINE
│   │   ├── pipeline.go            │  7-stage pipeline orchestrator
│   │   ├── signal_scanner.go      │  Fast lightweight pattern scanner
│   │   ├── module_router.go       │  Cost/value routing (skip low-value work)
│   │   ├── types.go               │  Core types: FastSignals, Verdict, etc.
│   │   ├── ast_analyzer.go        │  Go AST semantic analysis
│   │   ├── static_analyzer.go     │  Code quality, error handling patterns
│   │   ├── stack_analyzers.go     │  Stack-specific analyzers (Go/Node/Python/React)
│   │   ├── usage_verifier.go      │  Validates actual code usage vs deps
│   │   ├── skill_taxonomy.go      │  Skill hierarchy graph
│   │   ├── architecture_intent_v2.go  Intent detection (monolith/micro/serverless)
│   │   ├── confidence_calibrator.go   Prevents overconfidence on small projects
│   │   ├── risk_modeling.go       │  Missing signals, ambiguous data tracking
│   │   ├── intent_inferer.go      │  Project category inference (SaaS/lib/CLI)
│   │   ├── verdict_engine.go      │  Recruiter-grade assessment generation
│   │   ├── suggestion_generator.go│  Improvement suggestions by impact/effort
│   │   ├── security_scanner.go    │  gosec-based vulnerability detection
│   │   └── evidence_types.go      │  Evidence system types
│   │
│   ├── debug/                     ← 🐛 DEBUGGING UTILITIES
│   │   ├── logger.go              │  Structured logging with categories
│   │   ├── profiler.go            │  Performance profiling & timing
│   │   ├── inspector.go           │  Signal inspection & comparison
│   │   └── tracer.go              │  Request lifecycle tracing
│   │
│   ├── config/                    ← ⚙️ CONFIGURATION
│   │   └── config.go              │  Env var loading
│   │
│   ├── git/                       ← 📥 GIT OPERATIONS
│   │   └── client.go              │  Clone, cleanup repos
│   │
│   ├── rabbitmq/                  ← 📨 MESSAGE QUEUE
│   │   └── client.go              │  RabbitMQ connection, consume, publish
│   │
│   └── workerpool/                ← ⚡ CONCURRENCY
│       └── pool.go                │  Generic worker pool with metrics
│
├── pkg/                           ← Public packages (importable by other services)
│   ├── signals/                   │  Core types: ProjectSignals, InfraSignal, VerifiedSkill
│   ├── dimensions/                │  6-dimension scoring model
│   ├── trust/                     │  Trust analysis engine
│   ├── verdict/                   │  Experience classification & verdict generation
│   ├── matching/                  │  Job-candidate matching algorithm
│   └── api/                       │  API response builder & types
│
└── docs/                          ← 📚 Documentation
```

## Data Flow

```
RabbitMQ Message
    ↓
cmd/main.go → analyzer.analyze()
    ↓
┌──────────────── PARALLEL PHASE 1 ────────────────┐
│  parser.GetLanguageStats()      (language.go)     │
│  parser.AnalyzeFolderStructure() (parser.go)      │
│  parser.AnalyzeCodeSignals()     (parser.go)      │
│  extractor.Extract()             (extractor.go)   │
│  parser.AnalyzeAdvancedPatterns() (advanced.go)   │
└──────────────────────────────────────────────────┘
    ↓
┌──────────────── SEQUENTIAL PHASE 2 ──────────────┐
│  forensics.NewGitAnalyzer()      (git.go)         │
│  parser.DetectProjectType()      (parser.go)      │
│  parser.AnalyzeReact/Go/Node()   (parser.go)      │
└──────────────────────────────────────────────────┘
    ↓
┌──────────────── INFERENCE PHASE 3 ───────────────┐
│  extractor.CalculateComplexity() (complexity.go)  │
│  inference.InferSkills()         (engine.go)      │
│  extractor.GenerateArchGraph()   (graph.go)       │
│  enrichTechStack()               (enrichment.go)  │
└──────────────────────────────────────────────────┘
    ↓
┌──────────────── INTELLIGENCE PHASE 4 ────────────┐
│  intelligence.NewPipeline().Run() (pipeline.go)   │
│  dimensions.Extract()            (extractor.go)   │
│  trust.Analyze()                 (analyzer.go)    │
│  verdict.Generate()              (generator.go)   │
└──────────────────────────────────────────────────┘
    ↓
filterSignalsByProjectType()       (filtering.go)
    ↓
Publish to RabbitMQ → aura-processor
```
