# Project Analyzer Engine — Complete Technical Reference

> **24,300 lines of Go** across **61 files** — a 6-phase analysis pipeline that clones a GitHub repo, dissects every file, infers developer skills with zero AI hallucination, and produces a hiring-grade profile backed by Bayesian statistics.

---

## Table of Contents

1. [What This Engine Does](#1-what-this-engine-does)
2. [Architecture Overview](#2-architecture-overview)
3. [Entry Point & Worker Pool](#3-entry-point--worker-pool)
4. [The 7-Phase Pipeline](#4-the-7-phase-pipeline)
   - [Phase 0: Project Type Detection](#phase-0-project-type-detection)
   - [Phase 1: Parallel Extraction](#phase-1-parallel-extraction)
   - [Phase 2: Sequential Analysis](#phase-2-sequential-analysis)
   - [Phase 3: Inference & Scoring](#phase-3-inference--scoring)
   - [Phase 4: Intelligence Pipeline](#phase-4-intelligence-pipeline)
   - [Phase 5: Bayesian Confidence Calibration](#phase-5-bayesian-confidence-calibration)
   - [Phase 6: Deep Evidence Enrichment](#phase-6-deep-evidence-enrichment)
5. [Post-Pipeline: Filter → Sync → Trim → Publish](#5-post-pipeline-filter--sync--trim--publish)
6. [Directory Structure (Exact)](#6-directory-structure-exact)
7. [Package-by-Package Breakdown](#7-package-by-package-breakdown)
8. [The 4-Layer Skill Verification Chain](#8-the-4-layer-skill-verification-chain)
9. [The Bayesian Math](#9-the-bayesian-math)
10. [Data Flow: RabbitMQ In → RabbitMQ Out](#10-data-flow-rabbitmq-in--rabbitmq-out)
11. [Key Data Types Reference](#11-key-data-types-reference)
12. [Configuration & Environment](#12-configuration--environment)
13. [Debugging Playbook](#13-debugging-playbook)
14. [Extension Guide](#14-extension-guide)

---

## 1. What This Engine Does

The project-analyzer is a **standalone Go microservice** that:

1. **Consumes** a RabbitMQ message containing `{ projectId, repoURL, userId, githubToken }`
2. **Clones** the GitHub repository (sparse checkout, single-branch)
3. **Runs 6 analysis phases** — parsing, AST, graph construction, inference, intelligence, Bayesian calibration
4. **Publishes** a `ProjectSignals` JSON payload (~15-50KB) to a RabbitMQ output queue
5. **Deletes** the cloned repo from disk

The downstream **aura-processor** (Node.js) consumes this output and stores it in MongoDB.

### What it does NOT do

- **No LLM/AI calls** — every skill verdict is deterministic and traceable
- **No database access** — pure compute, entirely stateless
- **No HTTP API for analysis** — RabbitMQ only (HTTP serves health checks)
- **No external service calls** — only git clone and RabbitMQ

### Design Principles

| Principle | How |
|-----------|-----|
| Zero hallucination | Every skill must trace to code evidence via rules in `inference/engine.go` |
| Deterministic | Same repo → same output. No randomness, no ML inference |
| Stateless | No DB, no cache between requests. Each analysis starts fresh |
| Evidence-first | Confidence scores are mathematically computed, never guessed |
| Anti-gaming | Git forensics detects copied/snapshot code; Bayesian engine dampens confidence |

---

## 2. Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                    PROJECT ANALYZER (Go)                      │
│                                                              │
│  RabbitMQ ──▶ Worker Pool ──▶ analyze() ──▶ RabbitMQ         │
│               (semaphore)        │                            │
│                                  ▼                            │
│  ┌───────────────────────────────────────────────────────┐   │
│  │  PHASE 0 — Quick Project Detection                    │   │
│  │  Heuristic scan: frontend/backend/fullstack/ml        │   │
│  └──────────────────┬────────────────────────────────────┘   │
│                     ▼                                         │
│  ┌───────────────────────────────────────────────────────┐   │
│  │  PHASE 1 — Parallel Extraction (5 goroutines)         │   │
│  │  ┌─────────┐ ┌─────────┐ ┌──────┐ ┌──────┐ ┌──────┐ │   │
│  │  │Language  │ │Folder   │ │Code  │ │Infra │ │ AST  │ │   │
│  │  │Stats    │ │Structure│ │Sigs  │ │Extract│ │Deep  │ │   │
│  │  └─────────┘ └─────────┘ └──────┘ └──────┘ └──────┘ │   │
│  └──────────────────┬────────────────────────────────────┘   │
│                     ▼                                         │
│  ┌───────────────────────────────────────────────────────┐   │
│  │  PHASE 2 — Sequential Analysis                        │   │
│  │  Git Forensics → Project Type → Language Parsers      │   │
│  └──────────────────┬────────────────────────────────────┘   │
│                     ▼                                         │
│  ┌───────────────────────────────────────────────────────┐   │
│  │  PHASE 3 — Inference & Scoring                        │   │
│  │  AST Mapping → Graph Build → Complexity → Skills      │   │
│  │  → Architecture → Tech Stack Enrichment               │   │
│  └──────────────────┬────────────────────────────────────┘   │
│                     ▼                                         │
│  ┌───────────────────────────────────────────────────────┐   │
│  │  PHASE 4 — Intelligence Pipeline (8 stages)           │   │
│  │  Signal Scan → Intent → Routing → Early Exit          │   │
│  │  → Stack Analysis → Suggestions → Verdict             │   │
│  │  + Dimensional Analysis + Trust + Verdict Generation   │   │
│  └──────────────────┬────────────────────────────────────┘   │
│                     ▼                                         │
│  ┌───────────────────────────────────────────────────────┐   │
│  │  PHASE 5 — Bayesian Calibration                       │   │
│  │  Prior → Likelihood → Git Weight → Quality Weight     │   │
│  │  → Posterior per skill → Ensemble Verdict              │   │
│  └──────────────────┬────────────────────────────────────┘   │
│                     ▼                                         │
│  ┌───────────────────────────────────────────────────────┐   │
│  │  PHASE 6 — Deep Evidence Enrichment                   │   │
│  │  Graph Clusters → Pattern Extraction → RichEvidence   │   │
│  │  React hooks, Express routes, DB details, depth calc  │   │
│  └──────────────────┬────────────────────────────────────┘   │
│                     ▼                                         │
│  ┌───────────────────────────────────────────────────────┐   │
│  │  POST-PIPELINE                                        │   │
│  │  Signal Filtering → Bayesian→Skill Sync → Trim        │   │
│  │  → Publish to RabbitMQ                                │   │
│  └───────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Entry Point & Worker Pool

### `cmd/main.go` (169 lines)

```
main()
  ├─ Load .env via godotenv
  ├─ Load config (config.LoadConfig)
  ├─ Configure zerolog (pretty for dev, JSON for prod)
  ├─ Connect to RabbitMQ (prefetch = workerCount)
  ├─ Create Analyzer struct
  ├─ Launch goroutine → analyzer.StartWithWorkerPool(ctx)
  ├─ Start HTTP server (gin):
  │    GET /health     → 200 + JSON status
  │    GET /metrics    → worker count + uptime
  │    GET /ready      → readiness probe
  └─ Wait for SIGINT/SIGTERM → context cancel → graceful shutdown
```

### Worker Pool Pattern

The engine uses a **semaphore pattern** — not a separate worker-pool package. Inside `analyzer.go`:

```go
sem := make(chan struct{}, workerCount)  // buffered channel = semaphore

for msg := range msgs {
    sem <- struct{}{}           // acquire slot (blocks if all workers busy)
    wg.Add(1)
    go func(msg amqp.Delivery) {
        defer wg.Done()
        defer func() { <-sem }  // release slot
        a.handleMessage(ctx, msg)
    }(msg)
}
```

Default: **4 concurrent workers** (configurable via `WORKER_COUNT`). Each worker runs the complete `analyze()` pipeline independently. On shutdown, `wg.Wait()` ensures all in-flight analyses complete before exit.

---

## 4. The 6-Phase Pipeline

The entire pipeline lives in `analyzer.go → analyze()` (~400 lines). Every phase feeds the next.

---

### Phase 0: Project Type Detection

**File:** `analyzer/detection.go` (171 lines)

A **10ms heuristic scan** that determines what kind of project this is. This gates which parsers run in Phase 1.

**Decision logic:**

| Check | Result |
|-------|--------|
| `lerna.json`, `turbo.json`, `pnpm-workspace.yaml` | → `fullstack` |
| `package.json` has `"workspaces"` | → `fullstack` |
| `go.mod` exists, no frontend framework | → `backend` |
| `package.json` has React/Vue/Angular/Next | → `frontend` |
| Both React AND Express in same `package.json` | → `fullstack` |
| Exception: Next.js + Express only | → `frontend` (not fullstack) |
| Go + Python dirs, no frontend | → `backend` |
| `requirements.txt` with ML libraries | → `ml` |

**Output:** `effectiveProjectType` — one of: `frontend`, `backend`, `fullstack`, `ml`, `library`

**Derived routing flags:**
```go
runFrontend := type == "frontend" || type == "fullstack" || type == "library"
runBackend  := type == "backend"  || type == "fullstack" || type == "ml" || type == "library"
runML       := type == "ml"
```

These flags control which language-specific parsers fire in Phase 2 and which signals get filtered in post-pipeline.

---

### Phase 1: Parallel Extraction

**5 goroutines fire simultaneously** via `sync.WaitGroup`. Each is independent — no shared state, no locks.

#### 1.1 Language Statistics → `parser/language.go` (301 lines)

Walks every file using `go-enry` for language detection.

**Output:** `[]LanguageStat` with `Name`, `Lines`, `Files`, `Percentage` per language, plus `PrimaryLanguage` (most lines).

#### 1.2 Folder Structure → `parser/parser.go` (609 lines)

Scans directory tree for structural indicators:
- Key directories: `src/`, `internal/`, `pkg/`, `cmd/`, `components/`, `services/`, `tests/`, `gateway/`
- Metrics: `topLevelFolders`, `maxDepth`
- Boolean flags: `HasSrcFolder`, `HasInternal`, `HasPkg`, `HasTests`, etc.

#### 1.3 Code Signals → `parser/parser.go`

Scans for code quality indicators:
- CI configs (`.github/workflows/`, `.gitlab-ci.yml`)
- Linting (`.eslintrc`, `.prettierrc`, `golangci.yml`)
- Environment management (`.env.example`, `.env.local`)
- Test files (`*_test.go`, `*.test.ts`, `*.spec.ts`)
- Dockerfile, Makefile, docker-compose.yml presence

**Output:** `CodeSignals{HasCI, HasEnvExample, HasLinting, TestFilesCount, ...}`

#### 1.4 Infrastructure Extraction → `extractor/` (13 files, ~3,400 lines)

The **biggest data producer** in the engine. Runs 9 sub-phases:

| Sub-Phase | What It Scans |
|-----------|--------------|
| 1. Root Files | Dockerfile, docker-compose.yml, Makefile, CI configs |
| 2. Language Files | go.mod, package.json, requirements.txt, Cargo.toml |
| 3. Config Files | tsconfig, .eslintrc, jest.config, vite.config |
| 4. Dependencies | Parse actual deps from package.json, go.mod, requirements.txt |
| 5. Service Structure | Count docker-compose services, detect microservices |
| 6. Code Patterns | Import patterns, decorators, middleware usage |
| 7. Docker Compose | Deep parse services, networks, volumes, images |
| 8. Cloud/IaC | Terraform, Kubernetes, Helm, AWS CDK |
| 9. ML/AI | PyTorch, TensorFlow, Jupyter, sklearn |

**Output:** `InfrastructureSignals` — a map of signal names to `SignalDetail{Confidence, Evidence, Source}`. Over 100 possible signals (e.g., `"docker"`, `"rabbitmq"`, `"react"`, `"multiple_services"`).

**Sub-file responsibilities:**

| File | Lines | Purpose |
|------|-------|---------|
| `extractor.go` | 542 | Orchestrator — runs all 9 sub-phases |
| `helpers.go` | 434 | File reading, pattern matching, profiling wrappers |
| `node.go` | 366 | package.json parsing (deps, scripts, workspaces, framework detection) |
| `patterns.go` | 297 | Code pattern detection (CQRS, event sourcing, DDD, etc.) |
| `deployment.go` | 296 | Cloud platform detection (Vercel, Railway, Fly.io, Heroku, AWS) |
| `services.go` | 271 | docker-compose service counting & inter-service mapping |
| `golang.go` | 204 | go.mod parsing, Go-specific patterns (goroutines, channels) |
| `verification.go` | 170 | Usage verification — does code actually USE the dependency? |
| `graph.go` | 154 | Architecture graph generation (services + edges) |
| `python.go` | 125 | requirements.txt, pyproject.toml, Python dependency parsing |
| `complexity.go` | 109 | Complexity score calculation (architecture + infra + quality) |
| `gateway.go` | 100 | API gateway detection (nginx.conf, traefik, envoy) |
| `docker.go` | 72 | Dockerfile analysis (multi-stage builds, base images) |

#### 1.5 AST Deep Analysis → `ast/` (5 files, ~2,480 lines)

Runs **3 language-specific AST analyzers in parallel** via `ast/project_analyzer.go`:

| Analyzer | File | Lines | Parser |
|----------|------|-------|--------|
| TypeScript/JS | `ts_analyzer.go` | 700 | `go-tree-sitter` |
| Go | `go_analyzer.go` | 406 | Native `go/ast` (Go's built-in AST) |
| Python | `python_analyzer.go` | 539 | `go-tree-sitter` |

**What AST analysis produces:**
- **Per-file:** Patterns detected, imports parsed, complexity score, function/class counts
- **`ImportGraph`:** Which file imports what — tracks cross-file dependencies
- **`TechnologyUsage`:** Map of tech name → `{FileCount, ImportCount, CallCount, Intensity, Evidence}` — this is how we know "React is used in 45 files with 120 import calls"
- **Complexity distribution:** Cyclomatic complexity per function, aggregated stats

---

### Phase 2: Sequential Analysis

These **must run after Phase 1** because they depend on extracted data.

#### 2.1 Git Forensics → `forensics/git.go` (261 lines)

Runs `git log` commands on the cloned repo. Produces:

- **CommitCount** — total commits
- **FirstCommitDate / LastCommitDate** — development time span
- **RefactorCount** — commits with "refactor", "fix", "clean", "optimize", "test" in message
- **PrimaryAuthorPct** — percentage of commits from dominant author
- **LargestCommitRatio** — `(largest single commit additions) / totalLOC`

**AuthorshipVerdict decision:**

| Level | Criteria |
|-------|----------|
| `ORGANIC` | Multiple commits, refactors present, > 7 day span, multiple authors |
| `ITERATIVE` | Multiple commits over days, signs of iterative development |
| `SNAPSHOT` | 1-2 bulk commits, possibly copied/generated code |

#### 2.2 Language-Specific Parsers → `parser/advanced.go` (754 lines)

Conditional on Phase 0 routing flags:

| Condition | Parser | What It Finds |
|-----------|--------|---------------|
| JS/TS + `runFrontend` | `AnalyzeReact()` | Components, hooks, state management, routing |
| JS/TS + `runBackend` | `AnalyzeNode()` | Express routes, middleware chains, DB queries |
| Go + `runBackend` | `AnalyzeGo()` | Goroutines, channels, interfaces, error handling |
| Python + `runBackend`/`runML` | `AnalyzePython()` | Django views, Flask routes, ML imports, data pipeline patterns |

---

### Phase 3: Inference & Scoring

This phase transforms raw extracted data into structured intelligence.

#### 3.1 AST → Signal Mapping → `analyzer/mapping.go` (370 lines)

Converts raw `ProjectASTResult` into `ASTDeepAnalysis` fields on the output. Type converters for:
- AST technology usage → frontend-friendly format
- Intelligence verdict → API-compatible format
- Graph metrics → trimmed output format
- Bayesian confidence → output format

#### 3.2 Technology Dependency Graph → `graph/` (3 files, ~1,290 lines)

Builds a **weighted directed graph** where:
- **Nodes** = technologies (TypeScript, React, PostgreSQL, Docker, etc.)
- **Edges** = relationships (TypeScript → React = "uses_framework", Docker → PostgreSQL = "containerizes")

**3 data sources feed the graph:**
1. AST `TechnologyUsage` map (imports, function calls, file counts)
2. Infrastructure signals from `extractor/`
3. Hardcoded relationship rules (e.g., "if React + TypeScript both present → add edge weight 0.9")

**Graph analysis produces:**

| Output | Description |
|--------|-------------|
| `DetectedStacks` | Named stack patterns — MERN, PERN, T3, Go-Microservices, etc. |
| `InferredSkills` | Skills derived from graph topology (e.g., "Full-Stack Development" if frontend + backend + DB nodes connected) |
| `Clusters` | Technology groups that co-occur (e.g., `{Docker, docker-compose, nginx}` = DevOps cluster) |
| `Metrics` | `TotalNodes`, `TotalEdges`, `GraphDensity`, `AvgNodeWeight` |

**Stack pattern matching example** (from `graph/patterns.go`):
```go
// MERN stack pattern:
RequiredNodes: ["mongodb", "express", "react", "node.js"]
OptionalNodes: ["mongoose", "redux", "next.js"]
MinRequired: 3  // At least 3 of 4 required nodes present
```

#### 3.3 Complexity Score → `extractor/complexity.go` (109 lines)

```
TotalScore = ArchitectureScore + InfrastructureScore + CodeQualityScore

ArchitectureScore: microservices=8, monorepo=6, fullstack=4, monolith=2
InfrastructureScore: +3 per (docker, k8s, CI, message queue, etc.)
CodeQualityScore: +2 per (tests, linting, env config, typing)

ScaleLabel:
  "Prototype" (<15) | "Small" (<25) | "Medium" (<40) | "Large" (<60) | "Enterprise" (≥60)
```

#### 3.4 Skill Inference → `inference/engine.go` (2,103 lines)

The **deterministic rules engine** — the core of the zero-hallucination guarantee. Contains **~80 `SkillRule` definitions**.

```go
type SkillRule struct {
    SkillName       string
    Category        SkillCategory       // "language", "framework", "devops", etc.
    RequiredSignals []InfraSignal       // ALL must be present (AND logic)
    OptionalSignals []InfraSignal       // Boost confidence if present
    MinSignalCount  int                 // Minimum optional signals needed
    BaseConfidence  float64             // Starting confidence (0.0-1.0)
    Weight          int                 // Importance 1-10
    Evidence        []string            // Default evidence template strings
}
```

**How a skill qualifies:**
1. Check ALL `RequiredSignals` present in `InfrastructureSignals` → if any missing, **skip entirely**
2. Count how many `OptionalSignals` are present
3. If `count >= MinSignalCount` → skill qualifies
4. Confidence = `BaseConfidence + (optionalMatches × 0.05)`, capped at 0.95
5. Add to `VerifiedSkills[]` with evidence strings populated from templates + actual signal evidence

**Skill categories:** `language`, `framework`, `library`, `database`, `devops`, `infrastructure`, `cloud`, `testing`, `messaging`, `architecture`, `ml`, `security`, `observability`, `tool`

#### 3.5 Architecture Graph → `extractor/graph.go` (154 lines)

Generates a service architecture visualization:
- Detects services from docker-compose
- Maps inter-service communication (ports, networks, `depends_on`)
- Identifies roles: API gateway, message broker, database, cache

#### 3.6 Tech Stack Enrichment → `analyzer/enrichment.go` (679 lines)

Maps raw infrastructure signal names to user-friendly categorized lists:
```
"postgres"  → "PostgreSQL"     → result.Databases
"docker"    → "Docker"         → result.DevOps
"kafka"     → "Kafka"          → result.Tools
"react"     → "React"          → result.Frameworks
"nextjs"    → "Next.js"        → result.Frameworks
```

Also runs the full enrichment chain:
- `enrichTechStack()` — map signals to human-readable tech names
- `enrichVerdictWithDimensionalAnalysis()` — compute 6-dimension scores
- `runTrustAnalysis()` — evaluate project authenticity
- `generateVerdict()` — produce hiring verdict
- `syncBayesianConfidenceToSkills()` — overwrite skill confidence with Bayesian posteriors
- `syncUsageVerification()` — mark skills with usage verification status

---

### Phase 4: Intelligence Pipeline

**Package:** `internal/intelligence/` (10 files, ~4,950 lines)

An autonomous 8-stage mini-pipeline that produces the `IntelligenceVerdict`.

```
Stage 1: Fast Signal Scan      → Uses pre-computed signals from Phase 1 (no redundant disk I/O)
Stage 2: Intent Inference       → Project intent: production_api / learning / portfolio / prototype
Stage 3: Module Routing         → Decides which analysis modules to run based on type + niche
Stage 4: Early Termination      → If confidence > 80% and no blocking risks → skip expensive stages
Stage 5: Stack Analysis         → Run stack-specific analyzers (React patterns, Go idioms, Python ML)
Stage 6: Suggestion Generation  → Improvement suggestions with priority levels
Stage 7: Skill Extraction       → Extract skills with evidence; verify actual code usage
Stage 8: Verdict Generation     → Final developer-level + hire signal + key/risk/strength signals
```

**Files in `intelligence/`:**

| File | Lines | Purpose |
|------|-------|---------|
| `pipeline.go` | 821 | 8-stage orchestrator — runs the full intelligence pipeline |
| `usage_verifier.go` | 951 | Verifies actual code usage of detected technologies (import scanning, call checking) |
| `stack_analyzers.go` | 637 | Stack-specific analysis modules (MERN patterns, Go idioms, Python ML, etc.) |
| `signal_scanner.go` | 511 | Fast signal scanning (fallback if pre-computed signals unavailable) |
| `confidence_calibrator.go` | 437 | Confidence calibration — prevents overconfidence on small/toy projects |
| `verdict_engine.go` | 418 | Generates hire signal, developer level, key/risk/strength signals |
| `types.go` | 385 | All intelligence type definitions (FastSignals, ExtractedSkill, ProjectIntent, etc.) |
| `module_router.go` | 354 | Routes to analysis modules based on project type + detected niche |
| `suggestion_generator.go` | 298 | Generates prioritized improvement suggestions |
| `intent_inferer.go` | 241 | Classifies project intent from signals |

**Key intelligence concepts:**

**Intent Inference** classifies developer intent:
| Intent | Description |
|--------|-------------|
| `PRODUCTION_API` | Real-world API with auth, DB, deployment config |
| `LEARNING_PROJECT` | Tutorial follow-along, simple patterns, no tests |
| `PORTFOLIO_PIECE` | Polished but possibly over-engineered |
| `PROTOTYPE` | Quick proof-of-concept |

**Early Termination** — if after Stage 4 we have >80% confidence and no blocking risks, skip expensive stack analysis and jump to verdict. This saves ~40% compute time on obvious cases.

**Verdict Engine** produces:
```go
type Verdict struct {
    HireSignal           string    // "STRONG_HIRE" / "HIRE" / "BORDERLINE" / "NO_HIRE"
    DeveloperLevel       string    // "JUNIOR" / "INTERMEDIATE" / "SENIOR" / "STAFF"
    SeniorVerdict        string    // Free-text assessment from senior-engineer perspective
    ProjectIntentSummary string    // What the project is trying to do
    TechStackSnapshot    []string  // ["TypeScript", "React", "PostgreSQL", "Docker"]
    KeySignals           []string  // Most important positive signals
    RiskSignals          []string  // Concerns / red flags
    StrengthSignals      []string  // What they're doing well
    OverallScore         float64   // 0-100 composite score
}
```

#### Post-Intelligence Enrichment

After the intelligence pipeline, `enrichment.go` runs three additional analyses:

**1. Dimensional Analysis → `pkg/dimensions/` (2 files, ~860 lines)**

Scores the project on 6 orthogonal dimensions (0-100 each):

| Dimension | Weight | What It Measures |
|-----------|--------|-----------------|
| Fundamentals | 20% | Code quality, structure, naming conventions |
| Engineering Depth | 20% | Design patterns, abstraction levels, sophistication |
| Production Readiness | 15% | CI/CD, Docker, monitoring, environment management |
| Testing Maturity | 15% | Test presence, test quality, coverage proxy |
| Architecture | 15% | System design, service boundaries, separation of concerns |
| Infra/DevOps | 15% | Containerization, orchestration, IaC |

Dimension weights vary by project type — frontend emphasizes testing + fundamentals, backend emphasizes engineering depth + architecture.

**2. Trust Analysis → `pkg/trust/` (2 files, ~960 lines)**

Evaluates "should we trust this project?" independently from skill detection:

| Sub-Analysis | What It Checks |
|-------------|----------------|
| Effort | Commit patterns, development time span, refactoring frequency |
| Authenticity | Is this their own code? (authorship %, commit patterns, bulk-commit detection) |
| Learning Detection | Tutorial follow-along markers (generic names, boilerplate ratios) |
| Consistency | Does code quality match claimed experience level? |
| Overall Trust | Composite trust score (0-100) |

**3. Verdict Generation → `pkg/verdict/` (2 files, ~600 lines)**

Creates human-readable verdicts with **anti-hallucination rules**:
- Every strength statement requires ≥ 2 supporting signals
- Strong verbs ("demonstrates mastery", "shows expertise") require confidence > 0.6
- Maximum 1 strength without evidence backing
- Includes hiring recommendation + interview cautions
- Experience classification: Junior / Mid / Senior / Staff

---

### Phase 5: Bayesian Confidence Calibration

**Package:** `internal/confidence/` (2 files, ~940 lines)

The **final calibration layer** where ALL evidence sources converge into a mathematically rigorous confidence score per skill.

```
Step 1: Quality Metrics      → Code organization, modularity, test maturity, docs, prod readiness
Step 2: Evolution Signals    → Authorship level, development pattern, project age
Step 3: Bayesian Posteriors  → Per-skill posterior calculation (see math in Section 9)
Step 4: Ensemble Verdict     → Weighted composite across all skills
Step 5: Sync to Skills       → Write posteriors back to VerifiedSkills
```

The Bayesian engine produces:
- **Per-skill posterior** (0.05 to 0.98 clamped)
- **Quality metrics** (`overallQuality`, `qualityTier`)
- **Evolution signals** (`authorshipLevel`, `developmentPattern`)
- **Ensemble verdict** (`finalScore`, `scoreLabel`, `resumeReadySkills` count)
- **Analysis confidence** — how confident we are in the analysis itself (meta-confidence)

---

### Phase 6: Deep Evidence Enrichment

**File:** `internal/analyzer/deep_evidence.go` (~500 lines)

The **Developer Magnet** layer — transforms generic evidence strings into granular, pattern-based `RichEvidence` that shows developers we ACTUALLY read their code.

**When it runs:** After `syncBayesianConfidenceToSkills()` — when all VerifiedSkills are finalized with Bayesian posteriors.

**What it does:**
```
For each VerifiedSkill:
  1. Normalize skill name → dispatch to skill-specific enricher
  2. Mine TechDependencyGraph clusters for patterns
  3. Extract data from graph nodes (fileCount, weight, evidence)
  4. Build RichEvidence { summary, patterns, depth }
  5. Backfill Evidence[] for backward compatibility
```

**Skill-specific enrichers:**

| Skill | Enricher | What It Extracts |
|-------|----------|-----------------|
| React | `enrichReactEvidence()` | Built-in hooks (useState, useEffect…), custom hooks (useAuth, useFetch…), state management libs, advanced patterns (Suspense, Portals, Error Boundaries), component count |
| Express.js | `enrichExpressEvidence()` | Routes categorized by HTTP method (GET: 7, POST: 5), middleware chain, backend features (auth, caching, validation) |
| Next.js | `enrichNextJSEvidence()` | Rendering patterns (SSR, SSG, ISR), Next.js APIs (next/router, getServerSideProps) |
| MongoDB | `enrichMongoEvidence()` | Mongoose ORM details, file count, mongo ecosystem tools |
| PostgreSQL | `enrichPostgresEvidence()` | Prisma/TypeORM/Knex ORM, postgres ecosystem stack |
| Redis | `enrichRedisEvidence()` | Caching layer details, file spread, connection weight |
| Docker | `enrichDockerEvidence()` | DevOps stack composition, Docker Compose detection |
| TypeScript | `enrichTypeScriptEvidence()` | File count, type system coverage, TS features |
| Node.js | `enrichNodeEvidence()` | Backend ecosystem breadth |
| (any) | `enrichGenericEvidence()` | Graph node fileCount, weight, detection sources |

**Depth computation (`computeDepth()`):**

| Pattern Count / File Spread | Level |
|----------------------------|-------|
| ≥8 patterns OR (≥15 files AND ≥5 connections) | `expert` |
| ≥4 patterns OR (≥8 files AND ≥3 connections) | `deep` |
| ≥2 patterns OR ≥3 files | `moderate` |
| Anything else | `surface` |

**New data types:**

```go
type RichEvidence struct {
    Summary  []string               `json:"summary"`            // Human-readable
    Patterns map[string]interface{} `json:"patterns,omitempty"` // Detailed pattern data
    Depth    *SkillDepth            `json:"depth,omitempty"`
}

type SkillDepth struct {
    Level          string `json:"level"`          // "surface"|"moderate"|"deep"|"expert"
    DiversityCount int    `json:"diversityCount"` // Edge connections in graph
    PatternsUsed   int    `json:"patternsUsed"`   // Distinct code patterns
    FileSpread     int    `json:"fileSpread"`     // Files using this tech
}
```

**Example output (React):**

Before (generic):
```json
{
  "name": "React",
  "evidence": ["Framework detected", "Hooks actively used"]
}
```

After (with Deep Evidence):
```json
{
  "name": "React",
  "evidence": [
    "React Hooks: useState, useEffect, useContext, useCallback, useMemo, useRef",
    "Custom hooks: useAuth, useFetch, useInfiniteQuery and 2 more",
    "Advanced React: Error Boundaries, Suspense, Lazy Loading"
  ],
  "richEvidence": {
    "summary": [
      "React Hooks: useState, useEffect, useContext, useCallback, useMemo, useRef",
      "Custom hooks: useAuth, useFetch, useInfiniteQuery and 2 more",
      "State management: Zustand",
      "Advanced React: Error Boundaries, Suspense, Lazy Loading"
    ],
    "patterns": {
      "builtInHooks": [
        {"name": "useState", "fileCount": 23, "weight": 0.85},
        {"name": "useEffect", "fileCount": 18, "weight": 0.72}
      ],
      "customHooks": [
        {"name": "useAuth", "fileCount": 4, "weight": 0.65}
      ],
      "stateManagement": ["Zustand"],
      "advancedPatterns": ["Error Boundaries", "Suspense", "Lazy Loading"],
      "componentCount": 38,
      "styling": "tailwind"
    },
    "depth": {
      "level": "expert",
      "diversityCount": 8,
      "patternsUsed": 12,
      "fileSpread": 23
    }
  }
}
```

---

## 5. Post-Pipeline: Filter → Sync → Trim → Publish

After all 7 phases complete, four things happen in order:

### 5.1 Signal Filtering → `analyzer/filtering.go` (169 lines)

Removes irrelevant skills based on project type:

| Project Type | What Gets Stripped |
|-------------|-------------------|
| Frontend | Backend frameworks (Express, NestJS, Gin), databases, messaging, microservices architecture |
| Backend | Frontend frameworks (React, Vue, Angular), component patterns |
| Fullstack | Nothing — keeps everything |

**CRITICAL ordering:** Filtering runs BEFORE Bayesian sync, so Phase B graph-inferred skills (added during sync) don't get destroyed by the filter.

### 5.2 Bayesian → Skill Sync → `enrichment.go`

Two phases:

**Phase A — Overwrite existing skill confidence with Bayesian posteriors:**
```go
for each skill in VerifiedSkills:
    find matching Bayesian posterior
    skill.Confidence = posterior.Posterior    // Overwrite with calibrated value
    skill.ResumeReady = posterior.ResumeReady
    skill.UsageVerified = posterior.UsageVerified
```

**Phase B — Add new skills** that the graph/AST detected but the inference engine missed. This is how graph-inferred skills (e.g., "Full-Stack Development", "DevOps") get added as `VerifiedSkill` entries.

### 5.3 Deep Evidence Enrichment → `deep_evidence.go`

Runs immediately after Bayesian sync. Iterates all finalized VerifiedSkills and adds `RichEvidence` by mining graph clusters and nodes. See [Phase 6](#phase-6-deep-evidence-enrichment) for full details.

### 5.4 Trim → `analyzer/publish.go` (122 lines)

Strips heavy internal-only data before RabbitMQ publish to keep payload at 15-50KB:

| Removed Field | Reason |
|---------------|--------|
| `ASTDeepAnalysis` | Internal engine data — never stored downstream |
| `ArchitectureGraph` | Visualization-only, rebuilt if needed |
| `TechDependencyGraph.Nodes[]` | Raw graph nodes — only metrics kept |
| `TechDependencyGraph.Edges[]` | Raw graph edges — only metrics kept |
| `IndustryAnalysis.SkillsByCategory` | Redundant — rebuilt from `VerifiedSkills` |
| `VerifiedSkill.Keywords` | Low-value, high-volume |
| `ConfidenceReport.Likelihood` | Internal Bayesian intermediate |

### 5.5 Publish → `rabbitmq/client.go` (238 lines)

JSON-marshals the trimmed `ProjectSignals` and publishes to the output queue (`project.analyzed`). Includes `projectId` in the routing key for traceability.

---

## 6. Directory Structure (Exact)

```
project-analyzer/                      # ~25,000 lines, 62 Go files
├── cmd/
│   └── main.go                        # 169L — Entry point, HTTP server, worker pool launch
│
├── internal/                          # Private packages (Go convention)
│   ├── analyzer/                      # 7 files, ~2,570L — THE pipeline orchestrator
│   │   ├── analyzer.go                #  565L — Worker pool, message handling, 7-phase pipeline
│   │   ├── enrichment.go              #  679L — Tech stack mapping, trust, dimensional, Bayesian sync
│   │   ├── deep_evidence.go           #  ~500L — Phase 6: Deep evidence enrichment from graph clusters
│   │   ├── mapping.go                 #  370L — Type converters (internal → API types)
│   │   ├── detection.go               #  171L — Quick project type detection (Phase 0)
│   │   ├── filtering.go               #  169L — Signal filtering by project type
│   │   └── publish.go                 #  122L — Trim payload for RabbitMQ publish
│   │
│   ├── ast/                           # 5 files, ~2,480L — Multi-language AST analysis
│   │   ├── ts_analyzer.go             #  700L — TypeScript/JS AST via tree-sitter
│   │   ├── python_analyzer.go         #  539L — Python AST via tree-sitter
│   │   ├── project_analyzer.go        #  468L — Orchestrator: runs TS+Go+Python in parallel
│   │   ├── go_analyzer.go             #  406L — Go AST (native go/ast package)
│   │   └── types.go                   #  368L — FileAnalysis, ProjectASTResult, TechUsage
│   │
│   ├── confidence/                    # 2 files, ~940L — Phase 5: Bayesian engine
│   │   ├── engine.go                  #  799L — Prior → Likelihood → Posterior per skill
│   │   └── types.go                   #  140L — ConfidenceReport, SkillPosterior, QualityMetrics
│   │
│   ├── config/
│   │   └── config.go                  #   56L — Environment variable loading
│   │
│   ├── debug/                         # 3 files, ~570L — Development debugging tools
│   │   ├── profiler.go                #  271L — Performance profiling (timing, memory)
│   │   ├── tracer.go                  #  176L — Request lifecycle tracer (span tree)
│   │   └── logger.go                  #  126L — Enhanced structured logging for scan/package ops
│   │
│   ├── extractor/                     # 13 files, ~3,400L — Infrastructure signal extraction
│   │   ├── extractor.go               #  542L — Orchestrator: 9-phase extraction pipeline
│   │   ├── helpers.go                 #  434L — File reading, pattern matching, profiling
│   │   ├── node.go                    #  366L — package.json parsing (deps, scripts, workspaces)
│   │   ├── patterns.go                #  297L — Code pattern detection (CQRS, event sourcing, DDD)
│   │   ├── deployment.go              #  296L — Cloud platform detection (Vercel, Railway, AWS)
│   │   ├── services.go                #  271L — docker-compose service detection
│   │   ├── golang.go                  #  204L — go.mod parsing, Go-specific patterns
│   │   ├── verification.go            #  170L — Usage verification (does code USE the dep?)
│   │   ├── graph.go                   #  154L — Architecture graph from services
│   │   ├── python.go                  #  125L — Python dependency parsing
│   │   ├── complexity.go              #  109L — Complexity score computation
│   │   ├── gateway.go                 #  100L — API gateway detection (nginx, traefik)
│   │   └── docker.go                  #   72L — Dockerfile analysis (multi-stage, base image)
│   │
│   ├── forensics/
│   │   └── git.go                     #  261L — Git commit analysis, authorship detection
│   │
│   ├── git/
│   │   └── client.go                  #  155L — Git clone (sparse checkout) + cleanup
│   │
│   ├── graph/                         # 3 files, ~1,290L — Technology dependency graph
│   │   ├── builder.go                 #  726L — Graph construction + analysis + stack detection
│   │   ├── patterns.go                #  462L — Stack pattern definitions (MERN, PERN, T3, etc.)
│   │   └── types.go                   #  103L — TechGraph, TechNode, TechEdge types
│   │
│   ├── inference/
│   │   └── engine.go                  # 2103L — ~80 deterministic SkillRule definitions
│   │
│   ├── intelligence/                  # 10 files, ~4,950L — Autonomous intelligence pipeline
│   │   ├── usage_verifier.go          #  951L — Code usage verification (import/call scanning)
│   │   ├── pipeline.go                #  821L — 8-stage intelligence orchestrator
│   │   ├── stack_analyzers.go         #  637L — Stack-specific analysis modules
│   │   ├── signal_scanner.go          #  511L — Fast signal scanning
│   │   ├── confidence_calibrator.go   #  437L — Confidence calibration for small projects
│   │   ├── verdict_engine.go          #  418L — Hire signal + developer level generation
│   │   ├── types.go                   #  385L — All intelligence type definitions
│   │   ├── module_router.go           #  354L — Routes analysis modules by project type
│   │   ├── suggestion_generator.go    #  298L — Prioritized improvement suggestions
│   │   └── intent_inferer.go          #  241L — Project intent classification
│   │
│   ├── parser/                        # 3 files, ~1,660L — File system parsing
│   │   ├── advanced.go                #  754L — Language-specific parsers (React, Node, Go, Python)
│   │   ├── parser.go                  #  609L — Folder structure + code signal scanning
│   │   └── language.go                #  301L — Language detection via go-enry
│   │
│   └── rabbitmq/
│       └── client.go                  #  238L — RabbitMQ connection, consume, publish
│
├── pkg/                               # Public packages (shared types)
│   ├── signals/                       # 4 files, ~1,700L — The type system
│   │   ├── types.go                   #  801L — ProjectSignals, IntelligenceVerdict, etc.
│   │   ├── infrastructure.go          #  449L — InfrastructureSignals, 100+ signal constants
│   │   ├── verified_skills.go         #  270L — VerifiedSkill, SkillCategory enum
│   │   └── aliases.go                 #  181L — Technology name aliases (normalisation)
│   │
│   ├── dimensions/                    # 2 files, ~860L — 6-dimension evaluation
│   │   ├── extractor.go               #  658L — Dimension score extraction logic
│   │   └── dimensions.go              #  199L — DimensionMatrix, DimensionScore types
│   │
│   ├── trust/                         # 2 files, ~960L — Trust & authenticity analysis
│   │   ├── analyzer.go                #  813L — Effort, authenticity, learning detection
│   │   └── types.go                   #  149L — TrustAnalysis, EffortAnalysis types
│   │
│   └── verdict/                       # 2 files, ~600L — Human-readable verdict
│       ├── generator.go               #  474L — Anti-hallucination verdict generation
│       └── types.go                   #  131L — Verdict, ExperienceClassification types
│
├── Dockerfile                         # Multi-stage build (Go builder → minimal runtime)
├── go.mod                             # github.com/verifydev/project-analyzer, Go 1.24.0
├── go.sum
├── .gitignore
└── ENGINE.md                          # This file
```

---

## 7. Package-by-Package Breakdown

### `internal/analyzer` — The Brain (6 files, ~2,070L)

The **orchestrator** that calls everything else. Every other package is a tool this package invokes.

| File | Role |
|------|------|
| `analyzer.go` | `analyze()` — the ~400-line function that IS the pipeline. Worker pool via semaphore. Message handling: parse → analyze → publish → ack |
| `enrichment.go` | Post-Phase 4 enrichment chain: `enrichTechStack()`, `enrichVerdictWithDimensionalAnalysis()`, `runTrustAnalysis()`, `generateVerdict()`, `syncBayesianConfidenceToSkills()`, `syncUsageVerification()`, skill name normalisation |
| `mapping.go` | Type converters: `mapToFastSignals()`, `mapIntelligenceVerdict()`, `mapASTToSignals()`, `mapGraphToSignals()`, `mapConfidenceToSignals()` |
| `detection.go` | `quickDetectProjectType()` — 10ms heuristic before Phase 1 |
| `filtering.go` | `filterSignalsByProjectType()` — removes irrelevant skills for frontend/backend |
| `publish.go` | `trimForPublish()` — strips internal data before RabbitMQ publish |

### `internal/extractor` — Layer 1: Fact Extraction (13 files, ~3,400L)

Pure signal extraction. **No decisions** — just "does this file/pattern exist?"

The key function is `Extract()` returning `*InfrastructureSignals` — a flat bag of named signals. Each signal:
```go
type SignalDetail struct {
    Confidence float64   // 0.0-1.0
    Evidence   []string  // Human-readable proof strings
    Source     string    // Which extraction phase found it
}
```

The extractor is the **broadest** package — 13 files each specialising in one domain (Node.js, Python, Go, Docker, cloud, etc.).

### `internal/ast` — Multi-Language AST (5 files, ~2,480L)

Uses `go-tree-sitter` for TypeScript/JS and Python, native `go/ast` for Go.

The key output is `TechnologyUsage` — a map like:
```go
"React": { FileCount: 45, ImportCount: 120, CallCount: 340, Intensity: "heavy", Evidence: [...] }
"express": { FileCount: 12, ImportCount: 12, CallCount: 67, Intensity: "moderate", Evidence: [...] }
```

This is the highest-quality evidence source (AST-verified imports and calls, not regex guesses).

### `internal/graph` — Dependency Graph (3 files, ~1,290L)

Discovers **implicit** skills via graph topology:
- If the graph has nodes `TypeScript + React + Express + PostgreSQL + Docker` all connected
- And the stack matcher finds ≥ 3 of `["postgresql", "express", "react", "node.js"]`
- → Infers "PERN Stack" as a detected stack
- → Infers "Full-Stack Development" as a graph-inferred skill

Graph-inferred skills get a lower Bayesian prior (0.35) than directly detected skills since they're topological inferences.

### `internal/inference` — Deterministic Rules Engine (1 file, 2,103L)

The **no-hallucination guarantee**. Every single skill must match a predefined rule. No fuzzy matching, no ML — pure boolean logic over signals.

Example rule:
```go
{
    SkillName: "Docker",
    Category:  "devops",
    RequiredSignals: []InfraSignal{SignalDocker},
    OptionalSignals: []InfraSignal{SignalDockerCompose, SignalDockerMultiStage, SignalDockerNetwork},
    MinSignalCount:  0,
    BaseConfidence:  0.55,
    Weight:          7,
}
```

### `internal/intelligence` — Autonomous Intelligence (10 files, ~4,950L)

The "smart" layer. Key design decisions:

1. **Pre-computed signals bypass** — Stage 1 reuses Phase 1 data instead of re-scanning disk
2. **Early termination** — saves ~40% compute on obvious cases (>80% confidence, no risks)
3. **Usage verification** — checks if code *actually uses* a detected dependency (not just `package.json` listing)
4. **Module routing** — only runs relevant analysis modules (no React analysis on a Go project)
5. **Confidence calibration** — prevents overconfidence on small/toy projects (scaled by file count and signal count)

### `internal/confidence` — Bayesian Engine (2 files, ~940L)

The mathematical finale. Combines ALL evidence into calibrated posteriors. See [Section 9](#9-the-bayesian-math) for the full formula.

Key insight: the Bayesian engine doesn't just calibrate — it also handles **authorship dampening**. A skill in a `SNAPSHOT` (copied) repo gets its confidence multiplied by 0.6, while `ORGANIC` code gets full credit.

### `pkg/signals` — Shared Type System (4 files, ~1,700L)

The **lingua franca**. Every package imports this. Key types:
- `ProjectSignals` — the complete output struct
- `InfrastructureSignals` — bag of detected signals
- `VerifiedSkill` — single skill with confidence + evidence
- `IndustryAnalysis` — all skills grouped by category
- `IntelligenceVerdict` — intelligence pipeline output
- `ConfidenceReport` — Bayesian engine output

### `pkg/trust` — Trust Analysis (2 files, ~960L)

Evaluates project authenticity independently from skills:
- Is there evidence of real work? (commit patterns, time span, refactors)
- Is this their own code? (authorship %, commit patterns)
- Is this a tutorial follow-along? (generic names, boilerplate ratios)
- Does quality match claimed experience? (consistency check)

### `pkg/dimensions` — 6-Dimension Model (2 files, ~860L)

Scores the project on 6 orthogonal dimensions (0-100 each). Each dimension has sub-components that map to specific signals. Weights vary by project type.

### `pkg/verdict` — Verdict Generator (2 files, ~600L)

Creates human-readable verdicts. **Anti-hallucination rules** prevent the generator from making unsupported claims:
- Every strength needs ≥ 2 signal evidence
- Strong language requires confidence > 0.6
- Max 1 unsupported strength
- Includes interview cautions (things the verdict can't verify)

---

## 8. The 4-Layer Skill Verification Chain

Every skill passes through 4 independent verification layers before becoming "resume-ready":

```
┌─────────────────────────────────────────────────────────────┐
│ LAYER 1: Infrastructure Detection                           │
│ Package: extractor/                                         │
│ Question: "Does the signal physically exist?"               │
│ Method: File scanning, dependency parsing, pattern matching │
│ Output: InfrastructureSignals map (signal name → evidence)  │
├─────────────────────────────────────────────────────────────┤
│ LAYER 2: Rule-Based Inference                               │
│ Package: inference/                                         │
│ Question: "Do enough signals match a skill rule?"           │
│ Method: Boolean logic over required/optional signals        │
│ Output: VerifiedSkill[] with base confidence (0.3-0.95)     │
├─────────────────────────────────────────────────────────────┤
│ LAYER 3: Usage Verification                                 │
│ Package: intelligence/usage_verifier.go + enrichment.go     │
│ Question: "Does the code ACTUALLY USE this technology?"     │
│ Method: AST import scanning, function call checking,        │
│         graph node weight analysis                          │
│ Effect: If no usage found → confidence × 0.5,              │
│         usageVerified = false                               │
├─────────────────────────────────────────────────────────────┤
│ LAYER 4: Bayesian Calibration                               │
│ Package: confidence/                                        │
│ Question: "What's the mathematically calibrated confidence?"│
│ Method: Prior × Likelihood × GitWeight × QualityWeight      │
│ Output: Posterior (0.05-0.98)                               │
│ Final: ResumeReady = Posterior ≥ 0.65 AND UsageVerified     │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. The Bayesian Math

For each skill $s$:

$$P(s \mid \text{evidence}) = \text{clamp}\Big(P_{\text{prior}} \times L(s) \times W_{\text{git}} \times W_{\text{quality}},\; 0.05,\; 0.98\Big)$$

where the **likelihood** is a weighted combination of evidence sources:

$$L(s) = w_{\text{ast}} \cdot E_{\text{ast}} + w_{\text{infra}} \cdot E_{\text{infra}} + w_{\text{graph}} \cdot E_{\text{graph}}$$

### Prior Selection

| Detection Source | Prior |
|-----------------|-------|
| Infrastructure signal only | 0.45 |
| AST analysis | 0.55 |
| Graph inference only | 0.35 |
| Multiple sources | max(source priors) |

### Evidence Weights by Category

| Category | $w_{\text{ast}}$ | $w_{\text{infra}}$ | $w_{\text{graph}}$ |
|----------|:---------:|:------------:|:-----------:|
| language | 0.6 | 0.2 | 0.2 |
| framework | 0.5 | 0.3 | 0.2 |
| database | 0.2 | 0.5 | 0.3 |
| devops | 0.1 | 0.6 | 0.3 |
| architecture | 0.2 | 0.3 | 0.5 |

### Git Weight

$$W_{\text{git}} = \text{AuthorshipFactor} \times \text{MaturityFactor}$$

| Authorship Level | Factor |
|-----------------|--------|
| ORGANIC | 1.0 |
| ITERATIVE | 0.85 |
| SNAPSHOT | 0.6 |

| Project Age | Maturity Factor |
|-------------|:--------------:|
| Hours | 0.5 |
| Days | 0.7 |
| Weeks | 0.85 |
| Months+ | 1.0 |

### Quality Weight

$$W_{\text{quality}} = \frac{\text{OverallQuality}}{100}$$

Quality is computed from: code organisation, test coverage proxy, documentation presence, CI/CD presence, typing strictness.

### Ensemble Verdict

Across ALL skills:
```
FinalScore       = Σ(posterior_i × weight_i) / Σ(weight_i)
ResumeReadyCount = count(posterior ≥ 0.65 AND usageVerified)
ScoreLabel       = "Exceptional" (≥85) | "Strong" (≥70) | "Moderate" (≥50)
                   | "Developing" (≥30) | "Limited" (<30)
AnalysisConfidence = meta-confidence in the analysis itself (0-1)
```

---

## 10. Data Flow: RabbitMQ In → RabbitMQ Out

### Input Message (from job-service)

```json
{
  "projectId":       "698dad57b585e55639d56907",
  "userId":          "698d855f0a8257d701e01759",
  "repoUrl":         "https://github.com/user/repo",
  "repoName":        "my-app",
  "defaultBranch":   "main",
  "githubToken":     "ghp_xxx",
  "userProjectType": "fullstack",
  "basePath":        "",
  "niche":           ""
}
```

### Output Message (to aura-processor)

```json
{
  "projectId": "...",
  "userId": "...",
  "repoUrl": "...",
  "analyzedAt": "2026-02-12T10:30:00Z",
  "analysisVersion": "3.0.0-PROD",

  "languages": [{"name":"TypeScript","lines":15000,"files":120,"percentage":85.2}],
  "primaryLanguage": "TypeScript",
  "totalLines": 17600,
  "totalFiles": 145,

  "folderStructure": { "hasSrcFolder": true, "hasTests": true, "hasInternal": true },
  "codeSignals": { "hasCI": true, "hasLinting": true, "testFilesCount": 12 },

  "frameworks": ["React", "Express", "Next.js"],
  "databases": ["PostgreSQL", "Redis"],
  "devOps": ["Docker", "Docker Compose", "GitHub Actions"],
  "tools": ["Prisma", "RabbitMQ"],

  "gitForensics": { "commitCount": 147, "firstCommitDate": "...", "refactorCount": 23 },
  "authorshipVerdict": { "level": "ORGANIC", "confidence": "HIGH", "reasons": ["..."] },

  "complexity": { "totalScore": 45.75, "architectureScore": 8, "scaleLabel": "Large" },

  "industryAnalysis": {
    "totalSkills": 24,
    "verifiedSkills": [
      {
        "name": "TypeScript",
        "category": "language",
        "confidence": 0.92,
        "resumeReady": true,
        "usageVerified": true,
        "evidence": ["AST detected 120 TypeScript files", "Advanced type usage"]
      }
    ]
  },

  "intelligenceVerdict": {
    "hireSignal": "HIRE",
    "developerLevel": "INTERMEDIATE",
    "seniorVerdict": "Solid TypeScript project with microservices...",
    "projectIntentSummary": "Production API platform with real-time features",
    "techStackSnapshot": ["TypeScript","React","Express","PostgreSQL"],
    "keySignals": ["Microservices architecture","Event-driven design"],
    "riskSignals": ["Low test coverage"],
    "strengthSignals": ["Docker containerization","CI/CD pipeline"],
    "overallScore": 72.5
  },

  "techDependencyGraph": {
    "totalNodes": 18,
    "totalEdges": 24,
    "graphDensity": 0.15,
    "detectedStacks": ["MERN","Microservices"],
    "inferredSkills": ["Full-Stack Development","DevOps"],
    "clusters": [{"name":"Frontend","techs":["React","TypeScript","Next.js"]}]
  },

  "confidenceReport": {
    "skillConfidences": [{"skill":"TypeScript","posterior":0.92,"resumeReady":true}],
    "qualityMetrics": { "overallQuality": 72, "qualityTier": "high" },
    "evolutionSignals": { "authorshipLevel": "ORGANIC", "developmentPattern": "incremental" },
    "ensembleVerdict": { "finalScore": 74.2, "scoreLabel": "Strong", "resumeReadySkills": 18 },
    "analysisConfidence": 0.85
  }
}
```

---

## 11. Key Data Types Reference

### `ProjectSignals` (`pkg/signals/types.go`)

The **master output struct**. Every field the engine produces lives here. This is what gets JSON-marshalled and published to RabbitMQ (after trimming).

### `InfrastructureSignals` (`pkg/signals/infrastructure.go`)

A map of signal names to `SignalDetail`. Over 100 signal constants defined:
```go
SignalDocker           = "docker"
SignalDockerCompose    = "docker_compose"
SignalMultipleServices = "multiple_services"
SignalRabbitMQ         = "rabbitmq"
SignalKafka            = "kafka"
SignalReact            = "react"
SignalNextJS           = "nextjs"
SignalPostgres         = "postgres"
SignalMongoDB          = "mongodb"
SignalRedis            = "redis"
SignalGitHubActions    = "github_actions"
// ... 90+ more
```

### `VerifiedSkill` (`pkg/signals/verified_skills.go`)

```go
type VerifiedSkill struct {
    Name           string        // "TypeScript"
    Category       SkillCategory // "language"
    Level          SkillLevel    // "advanced"
    Confidence     float64       // 0.0-1.0 (Bayesian posterior after sync)
    ResumeReady    bool          // Posterior ≥ 0.65 AND usage verified
    UsageVerified  bool          // Code actually uses this technology
    Evidence       []string      // ["Found in 120 files", "Advanced type usage"]
    RichEvidence   *RichEvidence // NEW: Granular pattern-based evidence (Phase 6)
}
```

### `RichEvidence` & `SkillDepth` (`pkg/signals/verified_skills.go`)

```go
type RichEvidence struct {
    Summary  []string               // Human-readable summaries for display
    Patterns map[string]interface{} // Detailed pattern data (hooks, routes, etc.)
    Depth    *SkillDepth            // Technology depth assessment
}

type SkillDepth struct {
    Level          string // "surface", "moderate", "deep", "expert"
    DiversityCount int    // Number of graph edge connections
    PatternsUsed   int    // Number of distinct code patterns detected
    FileSpread     int    // Number of files using this technology
}
```

### `SkillCategory` Enum

Must match the Prisma schema in aura-processor:
```
language, framework, library, database, devops, infrastructure,
cloud, testing, messaging, architecture, ml, security, observability, tool
```

---

## 12. Configuration & Environment

**File:** `internal/config/config.go` (56 lines)

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `8001` | HTTP health check port |
| `ENV` | `development` | Log format (pretty vs JSON) |
| `RABBITMQ_URL` | `amqp://guest:guest@localhost:5672/` | RabbitMQ connection string |
| `EXCHANGE_NAME` | `project.events` | RabbitMQ exchange |
| `CONSUME_QUEUE` | `project.analyze.request` | Input queue name |
| `PUBLISH_QUEUE` | `project.analyzed` | Output queue name |
| `CLONE_DIR` | `/tmp/repos` | Temporary directory for cloned repos |
| `MAX_REPO_SIZE_MB` | `100` | Max repo size to analyze |
| `ANALYSIS_TIMEOUT_SEC` | `120` | Per-repo analysis timeout |
| `GITHUB_TOKEN` | — | Token for private repo access |
| `WORKER_COUNT` | `4` | Concurrent analysis workers |
| `PREFETCH_COUNT` | `4` | RabbitMQ prefetch (should match worker count) |

---

## 13. Debugging Playbook

### "Skill X has wrong confidence"

1. Find the `SkillRule` in `inference/engine.go` → check `RequiredSignals` and `BaseConfidence`
2. Check if signals are being extracted in `extractor/` — add a log or check `InfrastructureSignals` output
3. Check `enrichment.go` → `syncBayesianConfidenceToSkills()` — is the posterior overwriting correctly?
4. Check `confidence/engine.go` — what prior, likelihood, and weights are being computed?

### "Skill X shouldn't appear for this project type"

1. Check `detection.go` → `quickDetectProjectType()` — is the project type detected correctly?
2. Check `filtering.go` → `filterForFrontend()` / `filterForBackend()` — is the category in the filter list?

### "Architecture not detected"

1. Check `extractor/services.go` → docker-compose service counting
2. Check `extractor/gateway.go` → nginx/traefik detection
3. Check `graph/builder.go` → stack pattern matching thresholds
4. Check `inference/engine.go` → architecture rules (search for `CategoryArchitecture`)

### "Git authorship shows SNAPSHOT when it shouldn't"

1. Check `forensics/git.go` → commit count thresholds (≤2 commits = SNAPSHOT)
2. Check `LargestCommitRatio` — one huge initial commit inflates this
3. Check `PrimaryAuthorPct` — solo developer always = 100% (expected, not penalised alone)

### "Where does data X come from?"

Trace the data path:
```
extractor/ produces → InfrastructureSignals
inference/ consumes InfrastructureSignals → produces VerifiedSkills
intelligence/ consumes signals → produces IntelligenceVerdict
confidence/ consumes everything → produces ConfidenceReport + overwrites VerifiedSkill.Confidence
enrichment.go → syncs Bayesian posteriors back to VerifiedSkills
publish.go → trims and publishes to RabbitMQ
```

### "Adding debug output"

- Set `ENV=development` for human-readable logs
- Each phase logs with emoji markers: 🔍 📦 🧬 🔗 🔬 ✅
- `debug/tracer.go` creates a span tree — call `tracer.TraceSpan("name")` for timing
- `debug/profiler.go` — use `defer debug.Profile("operation")()` for per-function timing

---

## 14. Extension Guide

### Adding a new skill rule

1. Add a `SkillRule` in `inference/engine.go` → `loadRules()` function
2. Ensure required signals exist as constants in `pkg/signals/infrastructure.go`
3. Ensure the category is a valid `SkillCategory` (see `pkg/signals/verified_skills.go`)
4. If it needs new signal detection → add extraction in `extractor/`
5. Build & test: `go build ./... && docker compose build project-analyzer`

### Adding support for a new language

1. Create `internal/ast/<lang>_analyzer.go` using `go-tree-sitter` or native parser
2. Register it in `ast/project_analyzer.go` (add to the parallel goroutines)
3. Add language-specific parsing in `parser/advanced.go` if needed
4. Add dependency extraction in `extractor/` (e.g., `Cargo.toml` for Rust)
5. Add skill rules in `inference/engine.go`
6. Add tech name aliases in `pkg/signals/aliases.go`

### Adding a new intelligence module

1. Create the module in `internal/intelligence/`
2. Register it in `module_router.go` so it gets activated for the right project types
3. Have `pipeline.go` call it in the appropriate stage
4. Add any new types to `intelligence/types.go`

### Adding a new stack pattern

1. Add the pattern in `graph/patterns.go`:
```go
{
    Name:          "JAMstack",
    RequiredNodes: []string{"javascript", "api", "markup"},
    OptionalNodes: []string{"netlify", "vercel", "gatsby"},
    MinRequired:   2,
}
```
2. The graph builder will automatically detect it during analysis

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `github.com/gin-gonic/gin` | HTTP server (health endpoints) |
| `github.com/go-enry/go-enry/v2` | Language detection (used by `parser/language.go`) |
| `github.com/smacker/go-tree-sitter` | AST parsing for TypeScript, Python (used by `ast/`) |
| `github.com/rabbitmq/amqp091-go` | RabbitMQ client |
| `github.com/rs/zerolog` | Structured logging |
| `github.com/joho/godotenv` | `.env` file loading |

---

> **24,316 lines of Go across 61 files. Zero external AI. Every verdict traceable to code evidence.**
