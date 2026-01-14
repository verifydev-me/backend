# 🔧 Project Analyzer - Debug & Deep Dive Guide

> **Go-based Intelligence Engine ka Complete Breakdown | Debug Karne ke liye Full Guide**  
> **Version**: 3.0 | **Go 1.21+** | **January 2026**

> **🚀 New Developer? Pehle Ye Padho:**
> 1. **[LEARNING_ROADMAP.md](./LEARNING_ROADMAP.md)**: 4-Day step-by-step plan to learn this engine.
> 2. **[DEVELOPER.md](./DEVELOPER.md)**: Complete reference manual (900+ lines).
> 3. **Is Guide Ka Purpose**: Engine ki *deep functioning* aur *debugging* samajhna.

---

## 📑 Quick Navigation

| Section | Description |
|---------|-------------|
| [System Overview](#-system-overview) | Pura system kaise kaam karta hai |
| [Message Flow](#-rabbitmq-message-flow) | RabbitMQ se message kaise aata/jata hai |
| [File-by-File Breakdown](#-file-by-file-breakdown) | Har file ki responsibility |
| [Payload Schemas](#-payload-schemas) | Input/Output JSON structure |
| [Data Flow Diagram](#-complete-data-flow) | Step-by-step data flow |
| [Debugging Techniques](#-debugging-techniques) | Debug kaise karna hai |
| [Common Issues](#-common-issues--solutions) | Problem-Solution guide |

---

## 🏗️ System Overview

```
┌────────────────────────────────────────────────────────────────────────────┐
│                     PROJECT ANALYZER ENGINE                                 │
│                                                                             │
│   PURPOSE: GitHub repos analyze karke developer skills verify karna         │
│   INPUT:   RabbitMQ message with repo URL                                  │
│   OUTPUT:  ProjectSignals with verified skills, AURA score, verdict        │
│                                                                             │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│    ┌─────────────┐      ┌────────────────────────────────────────────┐     │
│    │  RabbitMQ   │ ───► │            ANALYZER.GO                     │     │
│    │  (Input)    │      │  ┌──────────────────────────────────────┐  │     │
│    └─────────────┘      │  │  1. Git Clone                        │  │     │
│                         │  │  2. Parser Layer (signals extract)   │  │     │
│                         │  │  3. Intelligence Layer (analysis)    │  │     │
│                         │  │  4. Verdict Engine (final score)     │  │     │
│                         │  └──────────────────────────────────────┘  │     │
│    ┌─────────────┐      │                                            │     │
│    │  RabbitMQ   │ ◄─── │                                            │     │
│    │  (Output)   │      └────────────────────────────────────────────┘     │
│    └─────────────┘                                                          │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

### Kya Karta Hai Ye Engine?

1. **GitHub repo URL receive karta hai** (RabbitMQ se)
2. **Repo clone karta hai** (temp directory mein)
3. **Code analyze karta hai** (parser layer)
4. **Skills extract karta hai** (inference engine)
5. **Deep analysis karta hai** (intelligence pipeline)
6. **Final verdict deta hai** (AURA score + hire signal)
7. **Result publish karta hai** (RabbitMQ pe)

---

## 📬 RabbitMQ Message Flow

### Queue Configuration

```
Exchange:     projects
Consume:      project.analyze       ← Frontend se request aati hai
Publish:      project.analyzed      → Aura-processor ko result jaata hai
```

### Input Message (project.analyze queue)

```json
{
  "projectId": "uuid-string",           // Project ka unique ID
  "userId": "uuid-string",              // User ka ID
  "repoUrl": "https://github.com/user/repo",  // Analyze karne ke liye repo
  "repoName": "repo-name",              // Display name
  "defaultBranch": "main",              // Branch to analyze
  "niche": "backend",                   // Optional: backend/frontend/fullstack
  "projectType": "backend",             // User ne select kiya hua type
  "githubToken": "ghp_xxxx",            // Optional: Private repos ke liye
  "basePath": ""                        // Optional: Monorepo mein path
}
```

### Output Message (project.analyzed queue)

```json
{
  "projectId": "uuid",
  "userId": "uuid",
  "repoUrl": "https://github.com/...",
  "repoName": "my-project",
  "success": true,
  "error": "",
  
  // Language Stats
  "languages": [
    {"name": "TypeScript", "lines": 15000, "files": 120, "percentage": 65.5},
    {"name": "Go", "lines": 5000, "files": 40, "percentage": 22.0}
  ],
  "primaryLanguage": "TypeScript",
  
  // Detected Project Type
  "projectType": "fullstack",
  
  // Tech Stack (user-friendly)
  "techStack": {
    "frontend": ["React", "Next.js", "TailwindCSS"],
    "backend": ["Express", "Prisma"],
    "databases": ["PostgreSQL", "Redis"],
    "tools": ["Docker", "GitHub Actions"]
  },
  
  // Verified Skills
  "industryAnalysis": {
    "verifiedSkills": [
      {
        "name": "PostgreSQL",
        "category": "database",
        "level": "ADVANCED",
        "confidence": 0.90,
        "score": 90,
        "verifiedScore": 81,     // After authorship penalty
        "isVerified": true,
        "usageVerified": true,
        "usageStrength": 0.85,
        "evidence": ["Prisma schema found", "PostgreSQL in docker-compose"],
        "resumeReady": true,
        "auraPoints": 10
      }
      // ... more skills
    ],
    "totalAuraPoints": 450,
    "architecture": {
      "pattern": "Microservices",
      "confidence": 0.85,
      "evidence": ["Multiple services detected", "Docker Compose with 5 services"]
    }
  },
  
  // Git Forensics (Authorship)
  "gitForensics": {
    "commitCount": 150,
    "firstCommitDate": "2023-06-15",
    "lastCommitDate": "2024-01-10",
    "refactorCount": 25,
    "largestCommitRatio": 0.15,
    "primaryAuthorPct": 0.92
  },
  "authorshipVerdict": {
    "level": "ORGANIC",              // ORGANIC, SNAPSHOT, SUSPICIOUS, UNCLEAR
    "confidence": 0.90,
    "flags": [],
    "penaltyApplied": 1.05,         // 5% bonus for organic
    "reasoning": "Natural development pattern over 7 months"
  },
  
  // Intelligence Verdict
  "intelligenceVerdict": {
    "overallScore": 85,
    "hireSignal": "STRONG_HIRE",    // STRONG_HIRE, HIRE, MAYBE, NO_HIRE
    "summary": "Production-grade fullstack application with microservices architecture",
    "strengths": ["Event-driven architecture", "Comprehensive testing", "Clean code structure"],
    "risks": [],
    "engineerVerdict": "Senior-level implementation with industry best practices",
    "devLevel": "SENIOR",
    "projectIntent": "PRODUCTION"
  },
  
  // Analysis Metadata
  "totalFiles": 350,
  "totalLines": 25000,
  "analyzedAt": "2024-01-14T12:00:00Z",
  "analysisVersion": "3.0.0"
}
```

---

## 📁 File-by-File Breakdown

### Entry Point & Orchestration

```
project-analyzer/
├── cmd/
│   └── main.go                     # 🚀 Entry Point
│       ├── main()                  # Startup, RabbitMQ connect
│       ├── setupLogger()           # Zerolog configuration
│       └── setupRouter()           # HTTP health endpoints
```

**`cmd/main.go` (145 lines) - Kya karta hai:**
1. `.env` load karta hai
2. RabbitMQ se connect karta hai
3. Analyzer instance create karta hai
4. HTTP server start karta hai (`/health`, `/ready`)
5. Messages consume karna shuru karta hai

---

### Core Analyzer

```
├── internal/
│   ├── analyzer/
│   │   └── analyzer.go             # 🧠 Main Orchestrator (902 lines)
│   │       ├── NewAnalyzer()       # Constructor
│   │       ├── Start()             # Message consumption loop
│   │       ├── handleMessage()     # Single message process
│   │       ├── analyze()           # Main analysis logic (270 lines!)
│   │       ├── filterSignalsByProjectType()  # Type-based filtering
│   │       ├── enrichTechStack()   # Signal → TechStack mapping
│   │       └── applyAuthorshipPenalty()      # SNAPSHOT penalty
```

**`analyzer.go` - analyze() Function Flow:**

```go
func (a *Analyzer) analyze(ctx context.Context, req signals.AnalyzeRequest) {
    // 1. Git Clone
    repoPath := a.gitClient.Clone(req.RepoURL, req.GitHubToken)
    
    // 2. PARALLEL EXECUTION (5 goroutines)
    go parser.GetLanguageStats()        // LOC count
    go parser.AnalyzeFolderStructure()  // Folder analysis
    go parser.AnalyzeCodeSignals()      // README, Docker, CI
    go infraExtractor.Extract()         // ALL signals (HEAVY)
    go gitAnalyzer.Analyze()            // Authorship check
    
    // 3. Wait for all goroutines
    wg.Wait()
    
    // 4. SEQUENTIAL PROCESSING
    projectType := DetectProjectType()
    inferredSkills := InferenceEngine.InferSkills(infraSignals)
    intelligenceResult := Pipeline.Run()
    verdict := VerdictEngine.GenerateVerdict()
    
    // 5. Apply authorship penalty
    applyAuthorshipPenaltyToSkills()
    
    // 6. Return result
    return result
}
```

---

### Parser Layer (Signal Extraction)

```
│   ├── parser/
│   │   ├── parser.go               # Language stats, folder analysis (604 lines)
│   │   ├── infra_extractor.go      # Main signal extractor (529 lines)
│   │   ├── infra_extractor_node.go # Node.js/TypeScript detection (360 lines)
│   │   ├── infra_extractor_go.go   # Go detection
│   │   ├── infra_extractor_python.go # Python detection
│   │   ├── infra_extractor_docker.go # Docker parsing
│   │   ├── infra_extractor_services.go # Microservices detection
│   │   ├── infra_extractor_gateway.go  # Nginx/Traefik detection
│   │   ├── infra_extractor_deployment.go # CI/CD, K8s, Terraform
│   │   ├── infra_extractor_patterns.go   # Design patterns, ML
│   │   ├── infra_extractor_helpers.go    # Utility functions
│   │   ├── git_forensics.go        # Authorship detection (254 lines)
│   │   └── inference_engine.go     # Signal → Skill rules (2043 lines!)
```

**Key File: `infra_extractor.go`**

```go
type InfraExtractor struct {
    repoPath    string
    projectType string
    signals     *signals.InfrastructureSignals
}

// Main function - sab signals extract karta hai
func (e *InfraExtractor) Extract() *InfrastructureSignals {
    e.extractRootFileSignals()           // Dockerfile, LICENSE
    e.extractConfigSignals()             // .env files
    e.extractDependencySignals()         // package.json, go.mod
    e.extractServiceStructureSignals()   // Microservices
    e.extractDeepServiceSignals()        // Nested services
    e.validateProjectCompleteness()      // Mark incomplete
    return e.signals
}

// Signal add karne ka tarika
e.signals.AddSignal(
    signals.SignalDocker,    // Signal type
    0.9,                     // Confidence (0.0 - 1.0)
    []string{"Dockerfile found at root"},  // Evidence
    "file"                   // Source type
)
```

**Key File: `inference_engine.go` (150+ Skill Rules)**

```go
type SkillRule struct {
    SkillName       string
    Category        signals.SkillCategory  // DATABASE, FRAMEWORK, etc.
    Level           signals.SkillLevel     // BEGINNER, INTERMEDIATE, ADVANCED
    RequiredSignals []signals.InfraSignal  // MUST have ALL
    OptionalSignals []signals.InfraSignal  // Boost confidence if present
    BaseConfidence  float64                // Starting confidence
    Weight          int                    // AURA points multiplier
    Keywords        []string
    Evidence        []string
}

// Example Rule:
{
    SkillName: "PostgreSQL",
    Category: CategoryDatabase,
    Level: LevelAdvanced,
    RequiredSignals: []InfraSignal{SignalPostgres},
    OptionalSignals: []InfraSignal{SignalPrisma, SignalSQLInjection},
    BaseConfidence: 0.85,
    Weight: 10,
}
```

**Key File: `git_forensics.go` (Authorship Detection)**

```go
type AuthorshipVerdict struct {
    Level       string   // ORGANIC, SNAPSHOT, SUSPICIOUS, UNCLEAR
    Confidence  float64
    Flags       []string // Red flags detected
    Penalty     float64  // 1.05 (bonus) or 0.90 (penalty)
    Reasoning   string
}

// Detection Logic:
// - LargestCommitRatio > 0.80 → SNAPSHOT (80%+ code in 1 commit)
// - Project completed in < 24h with 0 refactors → SNAPSHOT
// - Natural pattern over weeks/months → ORGANIC (5% bonus)
```

---

### Intelligence Layer (Deep Analysis)

```
│   ├── intelligence/
│   │   ├── pipeline.go             # 7-Stage Pipeline (756 lines)
│   │   ├── types.go                # Core structs (386 lines)
│   │   ├── signal_scanner.go       # Fast scan (487 lines)
│   │   ├── usage_verifier.go       # Actual usage check (889 lines)
│   │   ├── confidence_calibrator.go # Confidence adjustment (436 lines)
│   │   ├── verdict_engine.go       # Final verdict (419 lines)
│   │   ├── skill_taxonomy.go       # Skill hierarchy (376 lines)
│   │   ├── security_scanner.go     # Vulnerability detection (292 lines)
│   │   ├── risk_modeling.go        # Risk assessment (308 lines)
│   │   └── intent_inferer.go       # Project intent detection
```

**Key File: `pipeline.go` (7-Stage Pipeline)**

```go
func (p *Pipeline) Run(ctx context.Context) (*PipelineResult, error) {
    // Stage 1: Signal Scanning (fast, lightweight)
    signals, confidence := signalScanner.Scan()
    
    // Stage 2: Intent Inference
    intent := intentInferer.InferIntent(signals)
    
    // Stage 3: Skill Extraction
    skills := p.extractSkills(signals, confidence)
    
    // Stage 4: Usage Verification (verify actual usage in code)
    usageVerdicts := usageVerifier.Verify(signals)
    
    // Stage 5: Risk Modeling
    riskProfile := riskModeler.BuildProfile(signals)
    
    // Stage 6: Suggestion Generation
    suggestions := suggestionGen.Generate(signals, skills)
    
    // Stage 7: Verdict Generation
    verdict := verdictEngine.GenerateVerdict()
    
    return result
}
```

**Key File: `usage_verifier.go`**

Ye file check karti hai ki dependencies actually USE ho rahi hain ya sirf install hain:

```go
// Example: React verification
func (v *FrontendUsageVerifier) verifyReact() *UsageVerdict {
    // Check for JSX files
    jsxFiles := findFiles("*.jsx", "*.tsx")
    
    // Check for hooks usage
    hasHooks := findPattern("useState|useEffect|useContext")
    
    // Check for component exports
    componentCount := countPattern("export.*function|export default")
    
    return &UsageVerdict{
        SkillName:     "React",
        UsageVerified: componentCount > 5,
        UsageStrength: min(1.0, float64(componentCount) / 20),
        Evidence:      []string{fmt.Sprintf("%d components found", componentCount)},
    }
}
```

---

### Signal Definitions

```
├── pkg/
│   ├── signals/
│   │   ├── infrastructure.go       # 400+ Signal Constants (446 lines)
│   │   ├── types.go                # Core data types (562 lines)
│   │   └── verified_skills.go      # Skill structures
```

**`infrastructure.go` - Signal Categories:**

```go
// Container Signals
SignalDocker, SignalDockerCompose, SignalKubernetes, SignalHelm

// Database Signals
SignalPostgres, SignalMySQL, SignalMongoDB, SignalRedis

// Framework Signals
SignalReact, SignalNextJS, SignalExpress, SignalGin, SignalDjango

// Architecture Signals
SignalMultipleServices, SignalAPIGatewayPattern, SignalCircuitBreaker

// Security Signals
SignalJWT, SignalOAuth, SignalPasswordHashing, SignalSQLInjection

// Testing Signals
SignalUnitTests, SignalIntegrationTests, SignalTestCoverage

// CI/CD Signals
SignalGitHubActions, SignalGitLabCI, SignalJenkins

// Cloud Signals
SignalAWS, SignalGCP, SignalAzure, SignalTerraform
```

---

## 🔁 Complete Data Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           COMPLETE DATA FLOW                                  │
└──────────────────────────────────────────────────────────────────────────────┘

STEP 1: Message Received
═══════════════════════
RabbitMQ (project.analyze)
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  analyzer.handleMessage()                                                    │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  1. Parse JSON → AnalyzeRequest                                       │  │
│  │  2. Validate fields                                                   │  │
│  │  3. Call analyze()                                                    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
STEP 2: Git Clone
═════════════════
git/client.go
    │
    ├─► Clone repo to temp dir
    ├─► Checkout specific branch
    └─► Return repoPath
    │
    ▼
STEP 3: Parallel Analysis (5 goroutines)
════════════════════════════════════════
    ┌──────────────────────┬──────────────────────┬──────────────────────┐
    │                      │                      │                      │
    ▼                      ▼                      ▼                      │
┌────────────┐       ┌────────────┐       ┌────────────┐                 │
│ parser.go  │       │ infra_     │       │ git_       │                 │
│ Language   │       │ extractor  │       │ forensics  │                 │
│ Stats      │       │ Signals    │       │ Authorship │                 │
└────────────┘       └────────────┘       └────────────┘                 │
    │                      │                      │                      │
    └──────────────────────┼──────────────────────┘                      │
                           │                                             │
                           ▼                                             │
              ┌────────────────────────┐                                 │
              │  InfrastructureSignals │                                 │
              │  ┌──────────────────┐  │                                 │
              │  │ []InfraSignal    │  │                                 │
              │  │ SignalDetails map│  │                                 │
              │  │ ServiceCount     │  │                                 │
              │  └──────────────────┘  │                                 │
              └────────────────────────┘                                 │
                           │                                             │
                           ▼                                             │
STEP 4: Inference Engine                                                 │
════════════════════════                                                 │
inference_engine.go                                                      │
    │                                                                    │
    ├─► Match signals against 150+ SkillRules                            │
    ├─► Calculate confidence per skill                                   │
    ├─► Add evidence                                                     │
    │                                                                    │
    ▼                                                                    │
┌────────────────────────┐                                               │
│  IndustryAnalysis      │                                               │
│  ┌──────────────────┐  │                                               │
│  │ []VerifiedSkill  │  │                                               │
│  │ TotalAuraPoints  │  │                                               │
│  │ Architecture     │  │                                               │
│  └──────────────────┘  │                                               │
└────────────────────────┘                                               │
    │                                                                    │
    ▼                                                                    │
STEP 5: Intelligence Pipeline (7 stages)                                 │
════════════════════════════════════════                                 │
intelligence/pipeline.go                                                 │
    │                                                                    │
    ├─► Stage 1: Signal Scanning (FastSignals)                           │
    ├─► Stage 2: Intent Inference (LEARNING/PRODUCTION/ENTERPRISE)       │
    ├─► Stage 3: Skill Extraction (with confidence)                      │
    ├─► Stage 4: Usage Verification (actual code usage)                  │
    ├─► Stage 5: Risk Modeling (uncertainties)                           │
    ├─► Stage 6: Suggestion Generation                                   │
    └─► Stage 7: Verdict Generation                                      │
    │                                                                    │
    ▼                                                                    │
┌────────────────────────┐                                               │
│  PipelineResult        │                                               │
│  ┌──────────────────┐  │                                               │
│  │ FastSignals      │  │                                               │
│  │ Confidence Vector│  │                                               │
│  │ []ExtractedSkill │  │                                               │
│  │ Verdict          │  │                                               │
│  └──────────────────┘  │                                               │
└────────────────────────┘                                               │
    │                                                                    │
    ▼                                                                    │
STEP 6: Authorship Penalty Application                                   │
═══════════════════════════════════════                                  │
analyzer.go → applyAuthorshipPenaltyToSkills()                           │
    │                                                                    │
    ├─► ORGANIC:    × 1.05 (5% bonus)                                    │
    ├─► SNAPSHOT:   × 0.90 (10% penalty)                                 │
    └─► SUSPICIOUS: × 0.85 (15% penalty)                                 │
    │                                                                    │
    ▼                                                                    │
STEP 7: Result Construction                                              │
═══════════════════════════                                              │
analyzer.go                                                              │
    │                                                                    │
    ├─► Build ProjectSignals                                             │
    ├─► Enrich TechStack                                                 │
    └─► Filter by project type                                           │
    │                                                                    │
    ▼                                                                    │
STEP 8: Publish to RabbitMQ                                              │
═══════════════════════════                                              │
rabbitmq/client.go → Publish()                                           │
    │                                                                    │
    ▼                                                                    │
RabbitMQ (project.analyzed) ──► Aura Processor ──► Database              │
```

---

## 🐛 Debugging Techniques

### 1. Enable Debug Logs

```go
// Add to any function:
import "github.com/rs/zerolog/log"

log.Debug().
    Str("function", "analyzePackageJSON").
    Str("file", packageJsonPath).
    Int("depsFound", len(deps)).
    Msg("Parsing package.json")
```

### 2. View Live Logs

```bash
# All logs
docker compose logs -f project-analyzer

# Filter specific terms
docker compose logs -f project-analyzer | grep -i "postgresql\|confidence"

# Only errors
docker compose logs -f project-analyzer | grep -i "error\|failed"
```

### 3. Debug Specific Files

**Check signal detection:**
```bash
docker compose logs -f project-analyzer | grep "AddSignal\|SignalDocker"
```

**Check skill inference:**
```bash
docker compose logs -f project-analyzer | grep "evaluateRule\|VerifiedSkill"
```

**Check authorship:**
```bash
docker compose logs -f project-analyzer | grep "ORGANIC\|SNAPSHOT\|authorship"
```

### 4. Add Breakpoint Logging

```go
// In inference_engine.go → evaluateRule()
func (ie *InferenceEngine) evaluateRule(rule SkillRule, signals *InfrastructureSignals) (VerifiedSkill, bool) {
    log.Debug().
        Str("skill", rule.SkillName).
        Interface("requiredSignals", rule.RequiredSignals).
        Msg("Evaluating rule")
    
    // Check each required signal
    for _, sig := range rule.RequiredSignals {
        hasSignal := signals.HasSignal(sig)
        log.Debug().
            Str("signal", string(sig)).
            Bool("present", hasSignal).
            Msg("Signal check")
        
        if !hasSignal {
            return VerifiedSkill{}, false
        }
    }
    
    // ... rest of function
}
```

### 5. Test Specific Repo

```bash
# Create test message
docker compose exec rabbitmq rabbitmqadmin publish \
  exchange=projects \
  routing_key=project.analyze \
  payload='{"projectId":"test-123","userId":"user-123","repoUrl":"https://github.com/user/repo","repoName":"test","defaultBranch":"main"}'
```

---

## ❌ Common Issues & Solutions

### Issue 1: Skill Shows 0% Confidence

**Symptom:** Expected skill not appearing or showing 0%

**Debug Steps:**
```bash
# 1. Check if signal is detected
docker compose logs -f project-analyzer | grep "SignalPostgres"

# 2. If not detected, check extractor
# Location: internal/parser/infra_extractor_*.go
```

**Solution:** Signal not being detected. Add detection logic:

```go
// In infra_extractor_node.go
if _, ok := deps["pg"]; ok {
    e.signals.AddSignal(signals.SignalPostgres, 0.9, []string{"pg package found"}, "package.json")
}
```

---

### Issue 2: SNAPSHOT Penalty Applied Incorrectly

**Symptom:** Organic project marked as SNAPSHOT

**Debug Steps:**
```bash
docker compose logs -f project-analyzer | grep -i "forensics\|largestCommit\|refactor"
```

**Root Cause:** Git history analysis sees large commit ratio

**Solution (in git_forensics.go):**
```go
// Adjust threshold if needed
if largestCommitRatio > 0.80 && refactorCount == 0 {
    // Only mark as SNAPSHOT if BOTH conditions true
}
```

---

### Issue 3: Usage Not Verified

**Symptom:** `usageVerified: false` despite skill being real

**Debug Steps:**
```bash
docker compose logs -f project-analyzer | grep "UsageVerd\|UsageStrength"
```

**Solution:** Add pattern to usage_verifier.go:

```go
// In DatabaseUsageVerifier
func (v *DatabaseUsageVerifier) verifyPostgres() *UsageVerdict {
    patterns := []string{
        "PrismaClient",
        "pg.Pool",
        "createConnection",
        "prisma.$transaction",
    }
    // ... search for patterns
}
```

---

### Issue 4: Wrong Project Type Detection

**Symptom:** Backend project detected as frontend

**Debug:**
```bash
docker compose logs -f project-analyzer | grep "projectType\|DetectType"
```

**Location:** `internal/parser/parser.go` → `DetectProjectType()`

---

### Issue 5: Analysis Timeout

**Symptom:** "context deadline exceeded"

**Solution:** Increase timeout in config:
```go
// internal/config/config.go
const DefaultAnalysisTimeout = 120 * time.Second  // Was 60s
```

Or in docker-compose.yml:
```yaml
project-analyzer:
  environment:
    - ANALYSIS_TIMEOUT=120s
```

---

## 📊 Performance Limits

| Limit | Value | Location |
|-------|-------|----------|
| Max files scanned | 10,000 | `infra_extractor_helpers.go` |
| Max file size | 5 MB | `infra_extractor_helpers.go` |
| Max results | 500 | `infra_extractor_helpers.go` |
| Analysis timeout | 60s | `analyzer.go` |
| Git commits parsed | 100 | `git_forensics.go` |

---

## 🔧 Quick Reference: Adding New Skill

1. **Add Signal** (`pkg/signals/infrastructure.go`):
   ```go
   SignalNewTech InfraSignal = "new_tech"
   ```

2. **Add Detection** (`internal/parser/infra_extractor_*.go`):
   ```go
   if _, ok := deps["new-tech"]; ok {
       e.signals.AddSignal(signals.SignalNewTech, 0.9, []string{"evidence"}, "source")
   }
   ```

3. **Add Rule** (`internal/parser/inference_engine.go`):
   ```go
   {
       SkillName: "New Tech",
       Category: CategoryFramework,
       RequiredSignals: []InfraSignal{SignalNewTech},
       BaseConfidence: 0.85,
       Weight: 8,
   }
   ```

4. **Rebuild**:
   ```bash
   docker compose build project-analyzer --no-cache
   docker compose restart project-analyzer
   ```

---

## 📝 Summary

| Component | File | Purpose |
|-----------|------|---------|
| Entry | `cmd/main.go` | Startup, RabbitMQ connect |
| Orchestrator | `internal/analyzer/analyzer.go` | Main analysis flow |
| Git | `internal/git/client.go` | Clone repos |
| Parser | `internal/parser/*.go` | Extract signals |
| Inference | `internal/parser/inference_engine.go` | Signals → Skills |
| Intelligence | `internal/intelligence/*.go` | 7-stage deep analysis |
| Forensics | `internal/parser/git_forensics.go` | Authorship verification |
| RabbitMQ | `internal/rabbitmq/client.go` | Message broker |
| Types | `pkg/signals/*.go` | Data structures |

---

*Questions ho to team se poochho! 🚀*
