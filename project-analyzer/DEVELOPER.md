# 🧠 Project Analyzer - Complete Developer Reference

> **Version**: 3.0.0-PROD | **Go 1.21+** | **Last Updated**: January 2026

Developer ke liye complete guide - har file, har function, har concept detail mein explained.

---

## 📋 Quick Navigation

| Section | Description |
|---------|-------------|
| [Architecture](#-architecture) | Overall system design |
| [Layer 1: Parser](#-layer-1-parser---signal-extraction) | Signal extraction from code |
| [Layer 2: Inference](#-layer-2-inference---skill-conversion) | Signal to skill conversion |
| [Layer 3: Intelligence](#-layer-3-intelligence---advanced-analysis) | Deep analysis & verdict |
| [Data Types](#-data-types-pkgsignals) | Core structs & constants |
| [Confidence System](#-confidence-system) | How scores are calculated |
| [How to Add Skills](#-how-to-add-new-skills) | Step-by-step guide |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PROJECT ANALYZER ENGINE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────┐                                                            │
│   │   RabbitMQ  │──► project.analyze queue                                   │
│   └──────┬──────┘                                                            │
│          ▼                                                                   │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    ANALYZER (analyzer.go)                            │   │
│   │   • Orchestrates full analysis flow                                  │   │
│   │   • Parallel execution (5 goroutines)                                │   │
│   │   • Applies authorship penalties                                     │   │
│   └──────┬──────┬──────┬──────┬──────────────────────────────────────────┘   │
│          │      │      │      │                                              │
│          ▼      ▼      ▼      ▼                                              │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                       │
│   │ PARSER   │ │ INFRA    │ │ GIT      │ │ INTEL    │                       │
│   │ Layer    │ │ EXTRACT  │ │ FORENSIC │ │ PIPELINE │                       │
│   └──────────┘ └──────────┘ └──────────┘ └──────────┘                       │
│                                                                              │
│   Output: ProjectSignals ─────► RabbitMQ (project.analyzed)                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Execution Flow

```
1. RabbitMQ Message Received
       ▼
2. Git Clone (internal/git/git.go)
       ▼
3. PARALLEL EXECUTION ──────────────────────────────────────────────┐
   │                                                                 │
   ├── GetLanguageStats() ──► Language distribution                  │
   ├── AnalyzeFolderStructure() ──► Folder analysis                  │
   ├── AnalyzeCodeSignals() ──► README, Docker, CI detection         │
   ├── InfraExtractor.Extract() ──► ALL signals (HEAVY)              │
   └── GitAnalyzer.Analyze() ──► Authorship verification             │
       ▼                                                             │
4. SEQUENTIAL ◄──────────────────────────────────────────────────────┘
   │
   ├── DetectProjectType() ──► frontend/backend/fullstack
   ├── InferenceEngine.InferSkills() ──► Convert signals → skills
   ├── Intelligence Pipeline.Run() ──► 7-stage deep analysis
   └── VerdictEngine.GenerateVerdict() ──► Final assessment
       ▼
5. Publish to RabbitMQ
```

---

## 📁 Layer 1: Parser - Signal Extraction

Location: `internal/parser/`

### parser.go (604 lines)
**Purpose**: Language stats, folder structure, React analysis

```go
type FileParser struct {
    repoPath string
}

// Key Functions:
GetLanguageStats()        // Count LOC per language
GetPrimaryLanguage()      // Identify dominant language (excludes JSON/YAML)
AnalyzeFolderStructure()  // Check src/, components/, utils/, etc.
AnalyzeCodeSignals()      // Detect README, Dockerfile, CI, linting
AnalyzeReact()            // React-specific: hooks, context, components

// Helper:
extToLanguage(ext string) // Maps .ts → TypeScript, .go → Go, etc.
```

### infra_extractor.go (529 lines) ⭐ MAIN ENTRY
**Purpose**: Orchestrates all signal extraction

```go
type InfraExtractor struct {
    repoPath    string
    projectType string
    signals     *signals.InfrastructureSignals
}

// Main Function:
Extract() *InfrastructureSignals  // Returns ALL detected signals

// Extraction Pipeline (called by Extract):
extractRootFileSignals()           // Dockerfile, docker-compose, LICENSE
extractConfigSignals()             // .env files
extractDependencySignals()         // package.json, go.mod, requirements.txt
extractServiceStructureSignals()   // Microservices detection
extractDeepServiceSignals()        // Nested service scanning
validateProjectCompleteness()      // Mark incomplete projects

// Signal Addition (how signals are added):
e.signals.AddSignal(SignalDocker, 0.9, []string{"Dockerfile found"})
```

### infra_extractor_node.go (360 lines)
**Purpose**: Node.js/TypeScript ecosystem detection

```go
// Functions:
scanServicePackageJSON()    // Scans package.json for 200+ dependencies
analyzePackageJSON()        // Main package.json analyzer
analyzeNextJSStructure()    // Next.js: app/, pages/, next.config.js
analyzeReactStructure()     // React: jsx files, components/
analyzeOtherJSFrameworks()  // NestJS, Angular, Vue, Svelte

// Dependency Mapping Examples:
"@prisma/client"     → SignalPrisma
"express"            → SignalExpress
"socket.io"          → SignalWebSocket
"kafkajs"            → SignalKafka
"ioredis"            → SignalRedis
"bcrypt"             → SignalPasswordHashing
```

### infra_extractor_go.go (7KB)
**Purpose**: Go ecosystem detection

```go
// Functions:
scanServiceGoMod()  // Parses go.mod for dependencies

// Go Dependency Mapping:
"github.com/gin-gonic/gin"   → SignalGin
"github.com/gofiber/fiber"   → SignalFiber
"github.com/go-chi/chi"      → SignalHTTPFramework
"gorm.io/gorm"               → SignalGORM
"go.mongodb.org/mongo-driver"→ SignalMongoDB
```

### infra_extractor_python.go (3.2KB)
**Purpose**: Python ecosystem detection

```go
// Functions:
analyzePythonStructure()  // Django, Flask, FastAPI detection

// Detection Methods:
manage.py exists          → SignalDjango
requirements.txt content  → Parse for django, flask, fastapi
pyproject.toml           → Modern Python projects
```

### infra_extractor_docker.go (2.2KB)
**Purpose**: Docker file parsing

```go
// Detection:
Dockerfile exists         → SignalDocker
docker-compose.yml exists → SignalDockerCompose
Multi-stage builds        → SignalMultiStageDocker
```

### infra_extractor_services.go (272 lines)
**Purpose**: Microservices vs Monorepo detection

```go
// Functions:
extractServiceStructureSignals()  // Main service detection
extractDeepServiceSignals()       // Nested service scanning
analyzeServiceFolder()           // Individual service analysis

// Detection Logic:
services/ folder with 2+ subdirs   → SignalMultipleServices
Each service has own package.json  → Microservices
docker-compose with 3+ services    → ServiceCount = N
```

### infra_extractor_gateway.go (3.8KB)
**Purpose**: Nginx/Traefik/API Gateway detection

```go
// Detection:
nginx.conf exists               → SignalNginx
traefik.yml exists              → SignalTraefik
gateway/ or api-gateway/ folder → SignalAPIGatewayPattern
Upstream blocks in nginx.conf   → Load balancing detected
```

### infra_extractor_deployment.go (11KB)
**Purpose**: CI/CD, Kubernetes, Terraform detection

```go
// CI/CD Detection:
.github/workflows/    → SignalGitHubActions
.gitlab-ci.yml        → SignalGitLabCI
Jenkinsfile           → SignalJenkins

// Kubernetes:
*.yaml with apiVersion → SignalKubernetes
helm/ directory        → SignalHelm

// Terraform:
*.tf files             → SignalTerraform
```

### infra_extractor_patterns.go (11.5KB)
**Purpose**: Design patterns, ML, testing detection

```go
// Design Patterns:
Factory pattern regex  → SignalDesignPatterns
Singleton detection    → SignalDesignPatterns

// ML Detection:
tensorflow, pytorch    → SignalML
.ipynb files           → SignalJupyter

// Testing:
*.test.ts, *_test.go   → SignalTesting
jest.config.js         → SignalJest
pytest.ini             → SignalPytest
```

### infra_extractor_helpers.go (418 lines)
**Purpose**: Utility functions with production limits

```go
// PRODUCTION LIMITS (prevent OOM/hangs):
const MaxFileSizeRead = 5 * 1024 * 1024   // 5MB max file read
const MaxFilesScanned = 10000              // Max files to scan
const MaxFileResults  = 500                // Max results returned

// Core Helpers:
findFiles(patterns ...string) []string   // Find files with glob patterns
findCodePattern(pattern string) bool     // Regex search in code files
fileExists(filename string) bool         // Check file existence
isMonorepo() bool                        // Detect monorepo tools

// Skip Patterns (never scanned):
node_modules/, vendor/, .git/, dist/, build/, 
.next/, coverage/, target/, __pycache__/
```

### git_forensics.go (254 lines) ⭐ AUTHORSHIP DETECTION
**Purpose**: Detect organic vs copied projects

```go
type GitAnalyzer struct {
    repoPath string
}

// Main Function:
Analyze(totalLOC int) (*GitForensics, *AuthorshipVerdict)

// GitForensics Output:
CommitCount          int      // Total commits
FirstCommitDate      string   // When project started
LastCommitDate       string   // Most recent commit
RefactorCount        int      // Commits with "fix", "refactor", "clean"
LargestCommitRatio   float64  // Largest commit / total LOC
PrimaryAuthorPct     float64  // Main author's contribution %

// AuthorshipVerdict Levels:
ORGANIC    → Natural development pattern (BONUS: 5%)
SNAPSHOT   → Bulk import/copy suspected (PENALTY: 10%)
SUSPICIOUS → Multiple red flags (PENALTY: 15%)
UNCLEAR    → Team project, can't determine

// SNAPSHOT Detection Rules:
if LargestCommitRatio > 0.80 → "Over 80% of code in single commit"
if gap < 24h && refactorCount == 0 → "Project completed in <24h"
```

### inference_engine.go (2043 lines) ⭐ SKILL RULES
**Purpose**: Maps signals → verified skills (150+ rules)

```go
type SkillRule struct {
    SkillName       string              // e.g., "PostgreSQL"
    Category        signals.SkillCategory // DATABASE, FRAMEWORK, etc.
    Level           signals.SkillLevel    // BEGINNER, INTERMEDIATE, ADVANCED
    RequiredSignals []signals.InfraSignal // ALL must be present
    OptionalSignals []signals.InfraSignal // Boost confidence if present
    BaseConfidence  float64              // Starting confidence (0.70-0.90)
    Weight          int                  // Aura points multiplier
    Keywords        []string             // Search terms
    Evidence        []string             // Display evidence
}

// Main Functions:
InferSkills(infraSignals) *IndustryAnalysis   // Convert signals → skills
evaluateRule(rule, signals) (VerifiedSkill, bool)  // Check if rule matches
inferArchitecture(signals, analysis) SystemArchitecture  // Detect architecture

// Confidence Calculation in evaluateRule():
1. Start with BaseConfidence
2. Add optional signal boost: +15% max if optional signals present
3. Evidence boost: +10% for 2-3 evidences, +20% for 4+ evidences
4. Cap at 0.95 (never 100% from inference alone)

// Example Rules:
{
    SkillName: "PostgreSQL",
    Category: CategoryDatabase,
    RequiredSignals: []InfraSignal{SignalPostgres},
    OptionalSignals: []InfraSignal{SignalPrisma, SignalSQLInjectionPrevention},
    BaseConfidence: 0.85,
    Weight: 10,
}

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

## 📁 Layer 3: Intelligence - Advanced Analysis

Location: `internal/intelligence/`

### pipeline.go (725 lines) ⭐ 7-STAGE PIPELINE
**Purpose**: Orchestrates advanced analysis

```go
type Pipeline struct {
    repoPath           string
    niche              string
    userProjectType    string
    timeout            time.Duration
    preComputedSignals *FastSignals
}

// Main Function:
Run(ctx context.Context) (*PipelineResult, error)

// 7 STAGES:
1. Signal Scanning     → Fast lightweight scan (signal_scanner.go)
2. Intent Inference    → Detect project purpose (intent_inferer.go)
3. Skill Extraction    → Extract verified skills
4. Usage Verification  → Verify actual usage (usage_verifier.go)
5. Risk Modeling       → Security assessment (risk_modeling.go)
6. Suggestion Gen      → Improvement suggestions
7. Verdict Generation  → Final assessment (verdict_engine.go)

// Early Exit (optimization):
checkEarlyExit()        → Can skip remaining stages if high confidence
detectBlockingRisks()   → Risks that prevent early exit
hasStrongPatternConsistency() → Check coding pattern stability

// Skill Extraction:
extractBasicSkills()    → Quick extraction (for early exit)
extractSkills()         → Full extraction with confidence
```

### types.go (386 lines) ⭐ CORE TYPES
**Purpose**: All core structs and constants

```go
// CONFIDENCE VECTOR (multi-dimensional):
type SignalConfidenceVector struct {
    LanguageConfidence     float64  // How sure about language
    FrameworkConfidence    float64  // How sure about frameworks
    ArchitectureConfidence float64  // How sure about architecture
    InfraConfidence        float64  // How sure about infra
    TestConfidence         float64  // How sure about testing
    MLConfidence           float64  // How sure about ML
    SecurityConfidence     float64  // How sure about security
}

// Weights for overall confidence:
WeightLanguage     = 0.15
WeightFramework    = 0.20
WeightArchitecture = 0.30  // Architecture matters MOST
WeightInfra        = 0.10
WeightTests        = 0.15
WeightML           = 0.05
WeightSecurity     = 0.05

// PROJECT INTENT:
IntentLearning   = "LEARNING"    // Toy project
IntentHobby      = "HOBBY"       // Side project
IntentProduction = "PRODUCTION"  // Real product
IntentEnterprise = "ENTERPRISE"  // Corporate scale

// DEVELOPER LEVEL:
LevelJunior       = "JUNIOR"
LevelIntermediate = "INTERMEDIATE"
LevelSenior       = "SENIOR"
LevelExpert       = "EXPERT"

// EXTRACTED SKILL:
type ExtractedSkill struct {
    Name           string
    Category       string
    Confidence     float64    // 0.0 - 1.0
    RawConfidence  float64    // Before calibration
    Evidence       []string
    UsageDepth     float64    // How deeply used
    ArchUsage      float64    // Architecture relevance
}

// ComputeConfidence() - CRITICAL FUNCTION:
func (s *ExtractedSkill) ComputeConfidence() {
    // Boost based on evidence:
    if hasPackage && hasConfig {
        boost to 0.95
    } else if evidenceCount >= 2 {
        boost to 0.85
    }
}
```

### signal_scanner.go (487 lines)
**Purpose**: Fast lightweight scanning (no deep analysis)

```go
type SignalScanner struct {
    repoPath      string
    confidence    *SignalConfidenceVector
    signals       *FastSignals
}

// FastSignals - quick extraction results:
type FastSignals struct {
    DominantLanguage     string
    LanguagePercentage   float64
    DetectedFrameworks   []string  // React, Express, etc.
    DetectedDatabases    []string  // PostgreSQL, MongoDB, etc.
    DetectedInfra        []string  // Docker, K8s, etc.
    HasDocker            bool
    HasDockerCompose     bool
    HasKubernetes        bool
    HasTests             bool
    ServiceCount         int
    TotalFiles           int
    DetectedRisks        []string
    DetectedStrengths    []string
}

// Functions:
Scan() (*FastSignals, *SignalConfidenceVector, error)
scanFileSystem()      // Fast directory walk
detectFrameworks()    // Check config files only (no code parsing)
computeConfidence()   // Calculate confidence vector
```

### usage_verifier.go (889 lines)
**Purpose**: Verify actual code usage (not just dependencies)

```go
// Interface all verifiers implement:
type UsageVerifier interface {
    Verify(repoPath string, signals *FastSignals) []*UsageVerdict
    Name() string
}

// UsageVerdict - result:
type UsageVerdict struct {
    SkillName     string
    UsageVerified bool      // Is it actually used?
    UsageStrength float64   // How deeply (0.0 - 1.0)
    Evidence      []UsageEvidence
    AntiEvidence  []UsageEvidence  // Signs of non-usage
}

// VERIFIERS AVAILABLE:

// 1. FrontendUsageVerifier
verifyReact()    // Check for JSX files, hooks, components
                 // Evidence: "Found 15 React components"

// 2. NodeBackendUsageVerifier
verifyNodeFramework()  // Check Express routes, NestJS modules
                       // Evidence: "5 route handlers found"

// 3. GoBackendUsageVerifier
verifyGoFramework()    // Check Gin handlers, Fiber routes
                       // Evidence: "HTTP handlers using gin.Context"

// 4. DatabaseUsageVerifier
verifyDatabase()       // Check actual queries, ORM usage
                       // Evidence: "Prisma client operations found"

// 5. InfraUsageVerifier
verifyInfra()          // Check Docker EXPOSE, K8s replicas
                       // Evidence: "Dockerfile exposes port 8080"
```

### confidence_calibrator.go (436 lines)
**Purpose**: Adjust confidence based on project characteristics

```go
type ConfidenceCalibrator struct {
    config CalibrationConfig
}

// CalibrationConfig defaults:
MinFilesForFullConfidence    = 10    // Projects with <10 files get penalty
MinSizeFactor                = 0.40  // Minimum size factor floor
MinSignalsForFullConfidence  = 5     // Need 5+ signals for full confidence
MinDiversityFactor           = 0.30  // Minimum diversity floor
LearningPenalty              = 0.80  // Learning projects get 20% penalty
HobbyPenalty                 = 0.90  // Hobby projects get 10% penalty

// Main Functions:
Calibrate(rawScore, fileCount, signalCount, intent) CalibratedConfidence

// Calibration Factors:
calculateSizeFactor()      // Based on file count
calculateDiversityFactor() // Based on signal count
calculateIntentFactor()    // Based on project intent

// Output:
type CalibratedConfidence struct {
    RawScore           float64          // Original score
    CalibratedScore    float64          // After calibration
    ConfidenceRange    [2]float64       // Min-max range
    Interpretation     ConfidenceLevel  // VERY_HIGH, HIGH, MODERATE, LOW
    CalibrationFactors CalibrationFactors
    Reasoning          string           // Human explanation
}
```

### verdict_engine.go (419 lines) ⭐ FINAL VERDICT
**Purpose**: Generate recruiter-grade assessment

```go
type VerdictEngine struct {
    signals     *FastSignals
    confidence  *SignalConfidenceVector
    intent      ProjectIntent
    devLevel    DeveloperLevel
    archIntent  ArchitectureIntent
    skills      []ExtractedSkill
    authorship  *signals.AuthorshipVerdict
}

// Main Function:
GenerateVerdict() *Verdict

// Verdict Output:
type Verdict struct {
    Summary         string      // 1-2 line project summary
    TechStack       []string    // Technologies used
    Strengths       []string    // Positive signals
    Risks           []string    // Concerning signals
    EngineerVerdict string      // Senior engineer assessment
    OverallScore    float64     // 0-100
    HireSignal      HireSignal  // STRONG_HIRE, HIRE, MAYBE, NO_HIRE
    KeySignals      []string    // Important detected patterns
}

// Functions:
generateIntentSummary()       // "Production-grade microservices backend"
generateTechStack()           // ["TypeScript", "PostgreSQL", "Docker"]
calculateArchitectureMaturity() // 0-10 score
calculateOverallScore()       // 0-100 score with bonuses
extractStrengths()            // "Event-driven architecture", etc.
extractRisks()                // "No tests detected", etc.
generateEngineerVerdict()     // Detailed assessment
calculateHireSignal()         // Final recommendation

// HireSignal levels:
STRONG_HIRE → Score 85+, all green flags
HIRE        → Score 70-84, mostly positive
MAYBE       → Score 50-69, mixed signals
NO_HIRE     → Score <50, serious concerns
```

### skill_taxonomy.go (376 lines)
**Purpose**: Graph-based skill hierarchy

```go
// Skill Tiers:
SkillTierCore     = 1  // Primary: Go, React, Python
SkillTierSub      = 2  // Sub-skills: Goroutines, React Hooks
SkillTierInfra    = 3  // Infrastructure: Docker, K8s
SkillTierAdjacent = 4  // Inferred: Distributed Systems

// Skill Relations:
RelationParent   → Go → Go Backend
RelationChild    → Go Backend → Go
RelationSupports → Docker → Kubernetes
RelationRequires → Kubernetes → Docker

// Confidence Limits:
MaxChildRollup           = 0.70  // Child can boost parent max 70%
MaxAdjacentInference     = 0.50  // Inferred skills max 50%
MaxSupportingRollup      = 0.60  // Supporting boost max 60%

// SkillTaxonomy:
type SkillTaxonomy struct {
    CoreSkills     []SkillNode
    SubSkills      []SkillNode
    InfraSkills    []SkillNode
    AdjacentSkills []SkillNode  // Inferred, not claimed
}

// Key Functions:
AddSkill(node SkillNode)
ApplySafeRollup()           // Apply confidence propagation
GetClaimedSkills()          // Only skills with direct evidence
GetResumeReadySkills(min)   // Skills above threshold
```

### security_scanner.go (292 lines)
**Purpose**: Vulnerability detection

```go
type SecurityScanner struct {
    repoPath string
}

// Output:
type SecurityReport struct {
    SecurityScore       int   // 0-100
    TotalIssues         int
    CriticalIssues      int
    HighIssues          int
    MediumIssues        int
    LowIssues           int
    HasHardcodedSecrets bool
    HasSQLInjection     bool
    HasWeakCrypto       bool
    Vulnerabilities     []SecurityVulnerability
}

// Detection Patterns:
SQL Injection     → "fmt.Sprintf" + SQL keywords
Hardcoded Secrets → password=, api_key=, secret=
Weak Crypto       → MD5, DES, RC4
Command Injection → os/exec with user input
TLS Issues        → InsecureSkipVerify: true

// Functions:
Scan() (*SecurityReport, error)
analyzeSecurityPatterns()     // Pattern-based analysis
calculateSecurityScore()      // 0-100 score
RunGosecCLI()                // Optional: use gosec tool
```

### risk_modeling.go (308 lines)
**Purpose**: Uncertainty & risk assessment

```go
// Uncertainty Types:
UncertaintyMissing    → Expected signal not found
UncertaintyAmbiguous  → Conflicting signals
UncertaintyAssumption → Risky inference made
UncertaintyLimited    → Insufficient data

// RiskProfile Output:
type RiskProfile struct {
    Unknowns         []Uncertainty
    RiskLevel        RiskLevel     // HIGH, MODERATE, LOW
    HighRiskCount    int
    MediumRiskCount  int
    HiringImpact     string        // Impact on hiring decision
    Recommendations  []string      // What to investigate
    ConfidenceAdjust float64       // How much to reduce confidence
}

// Builder Pattern:
builder := NewRiskProfileBuilder()
builder.AddMissingSignal("No tests found", ImpactMedium, []string{"Testing"})
builder.AddAssumption("Assumed production intent", ImpactLow, []string{"Intent"})
profile := builder.Build()
```

---

## 📦 Data Types (pkg/signals/)

### infrastructure.go - 400+ Signal Constants

```go
// Language Signals:
SignalGo, SignalPython, SignalJavaScript, SignalTypeScript, SignalRust, SignalJava

// Framework Signals:
SignalReact, SignalNextJS, SignalVue, SignalAngular, SignalSvelte
SignalExpress, SignalNestJS, SignalGin, SignalFiber, SignalDjango, SignalFastAPI

// Database Signals:
SignalPostgres, SignalMySQL, SignalMongoDB, SignalRedis, SignalElasticsearch
SignalSQLite, SignalCassandra, SignalDynamoDB, SignalPrisma, SignalGORM

// Infrastructure Signals:
SignalDocker, SignalDockerCompose, SignalKubernetes, SignalHelm
SignalTerraform, SignalAWS, SignalGCP, SignalAzure

// Architecture Signals:
SignalMultipleServices, SignalAPIGatewayPattern, SignalCircuitBreaker
SignalGracefulShutdown, SignalHealthEndpoints, SignalLoadBalancing

// Security Signals:
SignalPasswordHashing, SignalJWT, SignalCORS, SignalSQLInjectionPrevention
```

### verified_skills.go - Skill Structures

```go
type VerifiedSkill struct {
    Name          string           // "PostgreSQL"
    Category      SkillCategory    // DATABASE
    Level         SkillLevel       // ADVANCED
    Confidence    float64          // 0.90
    Score         int              // 90
    VerifiedScore int              // After penalties
    IsVerified    bool             // Has evidence
    UsageVerified bool             // Actual usage found
    UsageStrength float64          // Usage depth
    Evidence      []string         // Proof
    ResumeReady   bool             // Confidence >= 40%
    AuraPoints    int              // Points contribution
}

type SkillCategory string
const (
    CategoryLanguage      SkillCategory = "language"
    CategoryFramework     SkillCategory = "framework"
    CategoryDatabase      SkillCategory = "database"
    CategoryInfrastructure SkillCategory = "infrastructure"
    CategoryArchitecture  SkillCategory = "architecture"
    CategorySecurity      SkillCategory = "security"
    CategoryMessaging     SkillCategory = "messaging"
    CategoryTesting       SkillCategory = "testing"
    CategoryML            SkillCategory = "ml"
)
```

---

## 📊 Confidence System

### Complete Flow

```
                    ┌─────────────────┐
                    │  InferenceEngine │
                    │  BaseConfidence  │
                    │    (0.85)        │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Evidence Boost  │
                    │  +10% (2-3 ev)   │
                    │  +20% (4+ ev)    │
                    │    → 0.95        │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ UsageVerifier    │
                    │ (optional boost) │
                    │    → 0.95        │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Calibrator       │
                    │ Size/Diversity   │
                    │ factors          │
                    └────────┬────────┘
                             │
                             ▼
          ┌──────────────────────────────────────┐
          │        AUTHORSHIP PENALTY            │
          │ (Applied in analyzer.go:614-616)     │
          │                                      │
          │ ORGANIC:     × 1.05 (5% bonus)       │
          │ ASSISTED:    × 0.95 (5% penalty)     │
          │ SNAPSHOT:    × 0.90 (10% penalty) ← Fixed! │
          │ SUSPICIOUS:  × 0.85 (15% penalty)    │
          └──────────────────────────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  FINAL SCORE    │
                    │  PostgreSQL:    │
                    │  0.85 + 0.10    │
                    │  = 0.95 × 0.90  │
                    │  = 0.855 (86%)  │
                    └─────────────────┘
```

---

## ➕ How to Add New Skills

### Step 1: Add Signal Constant

```go
// pkg/signals/infrastructure.go
const (
    // ... existing signals ...
    SignalNewFramework InfraSignal = "new_framework"
)
```

### Step 2: Add Detection Logic

```go
// internal/parser/infra_extractor_node.go (for npm packages)
// OR infra_extractor_go.go (for Go modules)

func (e *InfraExtractor) scanServicePackageJSON(servicePath, serviceName string) {
    // ... existing code ...
    
    // ADD THIS:
    if _, ok := deps["new-framework"]; ok {
        e.signals.AddSignal(
            signals.SignalNewFramework,
            0.9,  // Confidence
            []string{"new-framework in package.json"},  // Evidence
        )
    }
}
```

### Step 3: Add Skill Rule

```go
// internal/parser/inference_engine.go → loadRules()

// ADD THIS in the rules array:
{
    SkillName:       "New Framework",
    Category:        signals.CategoryFramework,
    Level:           signals.LevelIntermediate,
    RequiredSignals: []signals.InfraSignal{signals.SignalNewFramework},
    OptionalSignals: []signals.InfraSignal{
        signals.SignalTypeScript,  // Boost if also has TS
        signals.SignalDocker,      // Boost if containerized
    },
    BaseConfidence:  0.90,
    Weight:          8,
    Keywords:        []string{"new-framework", "nf"},
    Evidence:        []string{"New Framework detected"},
},
```

### Step 4: Add to Tech Stack Mapping

```go
// internal/analyzer/analyzer.go → enrichTechStack()

// In the mapping:
mapping["new_framework"] = "New Framework"
```

### Step 5: Rebuild & Test

```bash
# Rebuild
docker compose build project-analyzer --no-cache

# Restart
docker compose restart project-analyzer

# Check logs
docker compose logs -f project-analyzer
```

---

## 🐛 Debugging Guide

### Check Logs

```bash
# View analyzer logs
docker compose logs -f project-analyzer | grep -i "postgresql\|confidence\|skill"
```

### Add Debug Logs

```go
// Add to any function:
import "github.com/rs/zerolog/log"

log.Debug().
    Str("skill", skill.Name).
    Float64("confidence", skill.Confidence).
    Strs("evidence", skill.Evidence).
    Msg("Skill detected")
```

### Common Issues

| Issue | Cause | Fix Location |
|-------|-------|--------------|
| Skill shows 0% | Signal not detected | infra_extractor_*.go |
| Skill shows 70% instead of 90% | SNAPSHOT penalty | analyzer.go:595 |
| Skill not appearing | No rule for signal | inference_engine.go |
| Wrong category | Rule misconfigured | inference_engine.go |

---

## 📈 Performance Limits

| Limit | Value | File |
|-------|-------|------|
| Max files scanned | 10,000 | infra_extractor_helpers.go |
| Max file size | 5 MB | infra_extractor_helpers.go |
| Max results | 500 | infra_extractor_helpers.go |
| Analysis timeout | 60s | analyzer.go |
| Git commits parsed | 100 | git_forensics.go |

---

*For questions: Check inline code comments or ask the developer team.*
