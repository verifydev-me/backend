# 🎯 Quick Start Guide - Intelligence Engine

## Kaise Kaam Karta Hai? (How does it work?)

### Simple Flow

```
1. Project Upload → 2. Signal Scan → 3. Smart Analysis → 4. Verdict Ready
```

---

## Example: Go Backend Project Analysis

### Input
```
verifybackend/
├── internal/
│   ├── auth/
│   │   ├── handler.go
│   │   └── service.go
│   └── user/
│       └── handler.go
├── cmd/
│   └── main.go
├── go.mod
├── Dockerfile
└── README.md
```

### Stage-by-Stage Processing

#### Stage 1: SignalScanner (Fast - 50ms)
```go
Detected:
✓ Language: Go (85%)
✓ Framework: None detected
✓ Has: internal/, cmd/, go.mod ✓
✓ Docker: Yes ✓
✓ Tests: No ✗
✓ CI: No ✗
```

**Confidence Vector:**
```
Language:     0.85  (85%)
Framework:    0.00  (Go - no framework needed)
Architecture: 0.60  (Has internal/ and cmd/)
Infra:        0.30  (Has Docker only)
Tests:        0.00  (No tests!)
```

#### Stage 2: IntentInferer (10ms)
```go
Project Intent: HOBBY (has Docker but no tests/CI)
Developer Level: INTERMEDIATE (follows Go layout, but missing tests)
Architecture: INTENTIONAL (proper folder structure)
```

#### Stage 3: ModuleRouter (5ms)
```
Selected Modules:
  ✓ Go Backend (value: 0.85) - 300ms
  ✓ Docker Infra (value: 0.50) - 100ms
  
Skipped Modules:
  ✗ React Frontend (no React signals)
  ✗ Security Scan (confidence < 0.25)
  ✗ ML Pipeline (no ML markers)
  
Estimated Time: 400ms
CPU Saved: 45%
```

#### Stage 4: Early Exit Check
```go
Overall Confidence: 0.48 (48%)
Blocking Risks: 
  - Missing tests (CodeFiles > 10)
  
Decision: CONTINUE (confidence < 80%, has blocking risks)
```

#### Stage 5: Detailed Analysis (200ms)
```go
Patterns Detected:
- HTTP handlers in internal/*/handler.go
- Service layer pattern
- No context propagation ⚠️
- No error wrapping ⚠️
```

#### Stage 6: SuggestionGenerator (15ms)
```go
Generated 8 suggestions:

Top 5 (by priority):
1. "Add unit tests" - Impact: 9, Effort: 6, Priority: 15
2. "Add table-driven tests for Go" - Impact: 8, Effort: 5, Priority: 16
3. "Set up CI/CD pipeline" - Impact: 8, Effort: 4, Priority: 20 ⭐
4. "Document secrets management" - Impact: 9, Effort: 2, Priority: 45 ⭐⭐
5. "Add structured logging" - Impact: 7, Effort: 4, Priority: 17
```

#### Stage 7: SkillExtractor (10ms)
```go
Extracted Skills:

1. Go
   Confidence: 72%
   Evidence: ["Primary language", "Go layout followed"]
   Resume-Ready: ✓

2. Docker
   Confidence: 65%
   Evidence: ["Dockerfile present"]
   Resume-Ready: ✓

3. System Architecture
   Confidence: 58%
   Evidence: ["Service layer pattern"]
   Resume-Ready: ✗ (< 60%)
```

#### Stage 8: VerdictEngine (20ms)
```go
===== FINAL VERDICT =====

Project Summary:
"Intermediate-level Go project with intentional structure but 
lacking observability and structured error handling"

Scores:
- Architecture Maturity: 6/10
- Overall Score: 65/100

Tech Stack: [Go, Docker]
Developer Level: INTERMEDIATE
Project Intent: HOBBY

Strengths:
✓ Follows Go standard project layout
✓ Clean separation of concerns
✓ Containerized deployment

Risks:
⚠️ No test coverage - high risk for production
⚠️ No CI/CD - manual deployment is error-prone
⚠️ Missing documentation

Senior Engineer Verdict:
"Intermediate-level Go project demonstrates awareness of best 
practices through proper folder structure, but needs significant 
improvement in testing and automation before production deployment. 
Suitable for junior-to-mid roles with mentorship."

Hire Signal: BORDERLINE 🟡
```

---

## API Response

```json
{
  "intelligenceVerdict": {
    "projectIntentSummary": "Intermediate-level Go project with intentional structure",
    "techStackSnapshot": ["Go", "Docker"],
    "architectureMaturity": 6,
    "overallScore": 65,
    "developerLevel": "INTERMEDIATE",
    "projectIntent": "HOBBY",
    "hireSignal": "BORDERLINE",
    "suggestions": [
      {
        "category": "Testing",
        "message": "Add unit tests - projects without tests are risky",
        "impactScore": 9,
        "effortScore": 6,
        "priority": 15
      }
    ],
    "extractedSkills": [
      {
        "name": "Go",
        "confidence": 72,
        "resumeReady": true
      }
    ],
    "analysisTimeMs": 310,
    "modulesExecuted": ["Go Backend", "Docker Infrastructure"],
    "modulesSkipped": ["React Frontend", "ML Pipeline", "Security Scan"],
    "earlyTermination": false
  }
}
```

---

## Frontend Display

```
╔════════════════════════════════════════════════════════════╗
║  🧠 Intelligence Verdict          🟡 BORDERLINE            ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  Intermediate-level Go project with intentional structure ║
║  [INTERMEDIATE] [HOBBY]                                    ║
║                                                            ║
║  Architecture Maturity: 6/10  ████████░░ 60%              ║
║  Overall Score:        65/100 ██████░░░░ 65%              ║
║                                                            ║
║  Tech Stack: Go · Docker                                   ║
║                                                            ║
║  ✅ Strengths:                                             ║
║    • Follows Go standard project layout                    ║
║    • Clean separation of concerns                          ║
║                                                            ║
║  ⚠️ Risks:                                                 ║
║    • No test coverage - high risk                          ║
║    • No CI/CD automation                                   ║
║                                                            ║
║  💡 Top Suggestions:                                       ║
║    1. Document secrets management (Impact: 9, Effort: 2)   ║
║    2. Set up CI/CD pipeline (Impact: 8, Effort: 4)         ║
║    3. Add table-driven tests (Impact: 8, Effort: 5)        ║
║                                                            ║
║  🎯 Skills Extracted:                                      ║
║    Go (72%) ✓ · Docker (65%) ✓                            ║
║                                                            ║
║  Senior Engineer Assessment:                               ║
║  "Intermediate-level Go project demonstrates awareness     ║
║   of best practices through proper folder structure, but   ║
║   needs significant improvement in testing..."             ║
║                                                            ║
║  ⏱️ 310ms · 2 modules run · 3 skipped                      ║
╚════════════════════════════════════════════════════════════╝
```

---

## Comparison: With vs Without Tests

### Same Project + Tests

If we add:
```
internal/
├── auth/
│   ├── handler_test.go  ← Added
│   ├── service_test.go  ← Added
```

**New Verdict:**
- Architecture Maturity: 7/10 (+1)
- Overall Score: 75/100 (+10)
- Hire Signal: **HIRE** ✅ (upgraded from BORDERLINE)

**Why?**
```
TestConfidence: 0.00 → 0.60 (+0.60)
Overall Confidence: 48% → 62% (+14%)
```

---

## Time Breakdown

```
Total Time: 310ms

SignalScanner:        50ms (16%)
IntentInferer:        10ms (3%)
ModuleRouter:          5ms (2%)
Early Exit Check:      0ms (skipped)
Go Backend Module:   200ms (65%) ← Main work
Docker Module:        20ms (6%)
SuggestionGenerator:  15ms (5%)
SkillExtractor:       10ms (3%)
VerdictEngine:         0ms (instant, uses cached data)
```

---

## Key Insights

### What Makes It "Autonomous"?

1. **No Configuration Needed** - Detects everything automatically
2. **Smart Routing** - Only runs relevant modules
3. **Early Exit** - Stops when confident enough
4. **Cost-Aware** - Skips expensive low-value analysis

### What Makes It "Intelligent"?

1. **Pattern Recognition** - Not just file counting
2. **Context-Aware** - Adjusts based on project type
3. **Evidence-Based** - Every verdict has proof
4. **Non-Generic** - Specific, actionable feedback

### Production-Ready Features

- ✅ Context timeout (max 2s)
- ✅ Error handling (continues on failure)
- ✅ Concurrent execution (goroutines)
- ✅ Memory efficient (streaming)
- ✅ Cancellable (context.Context)

---

## Try It Yourself

```bash
# Clone project
cd /Users/keshavsharma/verifybackend/project-analyzer

# Build
go build ./...

# Run on any repo
./bin/analyzer analyze --repo-path /path/to/project

# Or integrate in code:
pipeline := intelligence.NewPipeline("/path/to/repo", "")
result, _ := pipeline.Run(context.Background())
fmt.Printf("Hire Signal: %s\n", result.Verdict.HireSignal)
```

---

## 🎓 Learning Path

1. Read [README.md](./README.md) - Full architecture
2. Check [types.go](./types.go) - Core data structures
3. Follow [pipeline.go](./pipeline.go) - Execution flow
4. Explore modules - Individual analyzers

**Happy coding! 🚀**
