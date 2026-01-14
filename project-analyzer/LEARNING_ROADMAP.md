# 📚 Project Analyzer - Learning Road Map

> **Ye guide follow karo agar tum akele ye system samajhna chahte ho**

---

## 🎯 Goal

8-10 hours mein poora intelligence engine samajh jaoge aur khud changes kar sakoge.

---

## 📅 Learning Plan (4 Days)

### Day 1: Architecture & Data Flow (2 hours)

**Step 1: Big Picture (30 min)**
```
1. README.md padho - Quick overview
2. DEVELOPER.md ka "Architecture" section - System design
3. Diagram samjho: RabbitMQ → Analyzer → Parser → Intelligence → Output
```

**Step 2: Entry Point (30 min)**
```
Files to read:
├── cmd/main.go                    # Service start, RabbitMQ connection
└── internal/analyzer/analyzer.go  # Main orchestrator (lines 110-370)

Focus on:
- analyze() function - Main flow
- Parallel execution (5 goroutines)
- How results are published to RabbitMQ
```

**Step 3: Data Types (1 hour)**
```
Files to read:
├── pkg/signals/infrastructure.go   # 400+ signal constants
├── pkg/signals/types.go            # ProjectSignals, AnalyzeRequest
└── pkg/signals/verified_skills.go  # VerifiedSkill struct

Samjho:
- Signal kya hai? (e.g., SignalPostgres, SignalDocker)
- VerifiedSkill kya hai? (Name, Category, Confidence, Evidence)
- IndustryAnalysis kaise banta hai?
```

---

### Day 2: Signal Extraction - Parser Layer (3 hours)

**Step 4: Main Extractor (1 hour)**
```
File: internal/parser/infra_extractor.go (529 lines)

Functions to trace:
1. NewInfraExtractor() - Initialization
2. Extract() - Main pipeline (line 30-109)
3. extractRootFileSignals() - Dockerfile, docker-compose check
4. extractDependencySignals() - package.json, go.mod

Practice: Add debug log in Extract() and watch output
```

**Step 5: Technology Detection (1 hour)**
```
Files:
├── infra_extractor_node.go    # package.json parsing (200+ deps)
├── infra_extractor_go.go      # go.mod parsing
├── infra_extractor_services.go # Microservices detection

Key function: scanServicePackageJSON()
- Dekho kaise "prisma" → SignalPrisma ban raha hai
- Dekho kaise dependencies map ho rahi hain
```

**Step 6: Git Forensics (1 hour)**
```
File: internal/parser/git_forensics.go (254 lines)

Key concepts:
1. GitAnalyzer.Analyze() - Main function
2. generateVerdict() - SNAPSHOT vs ORGANIC detection
3. parseCommits() - Git log parsing

Rules samjho:
- LargestCommitRatio > 0.80 → SNAPSHOT
- TimeGap < 24h && RefactorCount == 0 → SNAPSHOT
```

---

### Day 3: Skill Conversion - Inference Engine (2 hours)

**Step 7: Skill Rules (1.5 hours)**
```
File: internal/parser/inference_engine.go (2043 lines)

Structure samjho:
type SkillRule struct {
    SkillName       string              // "PostgreSQL"
    RequiredSignals []InfraSignal       // Must have
    OptionalSignals []InfraSignal       // Boost if present
    BaseConfidence  float64             // Starting confidence
    Weight          int                 // Aura points
}

Key functions:
1. loadRules() - All 150+ rules defined here (line 39-1791)
2. InferSkills() - Main conversion (line 1793-1843)
3. evaluateRule() - Rule matching logic (line 1845-1951)

Exercise: Find PostgreSQL rule and trace how it becomes VerifiedSkill
```

**Step 8: Confidence Calculation (30 min)**
```
File: internal/intelligence/types.go

Function: ComputeConfidence()
- Evidence boost: +10% for 2-3 evidences, +20% for 4+
- Package + Config file → boost to 95%

File: internal/analyzer/analyzer.go
Function: applyAuthorshipPenaltyToSkills() (line 581-639)
- SNAPSHOT penalty: ×0.90 (10% penalty)
- ORGANIC bonus: ×1.05 (5% boost)
```

---

### Day 4: Intelligence Layer & Verdict (2 hours)

**Step 9: Pipeline (1 hour)**
```
File: internal/intelligence/pipeline.go (725 lines)

7 Stages samjho:
1. Signal Scanning (signal_scanner.go)
2. Intent Inference (intent_inferer.go)
3. Skill Extraction
4. Usage Verification (usage_verifier.go)
5. Risk Modeling (risk_modeling.go)
6. Suggestion Generation
7. Verdict Generation

Key function: Run() (line 80-238)
```

**Step 10: Final Verdict (1 hour)**
```
File: internal/intelligence/verdict_engine.go (419 lines)

Functions:
1. GenerateVerdict() - Main function
2. calculateOverallScore() - 0-100 score
3. calculateHireSignal() - STRONG_HIRE, HIRE, MAYBE, NO_HIRE
4. generateEngineerVerdict() - Senior engineer assessment

Output samjho:
- Summary, TechStack, Strengths, Risks
- OverallScore, HireSignal
```

---

## 🔧 Hands-On Exercises

### Exercise 1: Add Debug Logs
```go
// Add in infra_extractor.go:Extract()
log.Debug().Msg("Starting signal extraction...")

// Rebuild and watch logs
docker compose build project-analyzer
docker compose logs -f project-analyzer
```

### Exercise 2: Trace a Skill
```
Trace PostgreSQL:
1. infra_extractor_node.go: "prisma" detected → SignalPrisma
2. inference_engine.go: PostgreSQL rule matches SignalPostgres
3. types.go: ComputeConfidence() boosts score
4. analyzer.go: applyAuthorshipPenaltyToSkills() applies penalty
5. Final confidence = 86%
```

### Exercise 3: Add a New Skill
```
Add: "Supabase" skill
1. pkg/signals/infrastructure.go: Add SignalSupabase
2. infra_extractor_node.go: Detect "@supabase/supabase-js"
3. inference_engine.go: Add SkillRule for Supabase
4. Rebuild and test
```

---

## 🗂️ File Priority (Most Important First)

```
🔴 CRITICAL (Read first):
├── internal/analyzer/analyzer.go
├── internal/parser/infra_extractor.go
├── internal/parser/inference_engine.go
└── pkg/signals/infrastructure.go

🟡 IMPORTANT (Read second):
├── internal/parser/git_forensics.go
├── internal/intelligence/pipeline.go
├── internal/intelligence/types.go
└── internal/intelligence/verdict_engine.go

🟢 OPTIONAL (Read if needed):
├── internal/parser/infra_extractor_*.go (specific tech)
├── internal/intelligence/usage_verifier.go
├── internal/intelligence/confidence_calibrator.go
└── internal/intelligence/skill_taxonomy.go
```

---

## 💡 Tips

1. **Logs dekho pehle** - `docker compose logs -f project-analyzer`
2. **One file at a time** - Sab ek saath mat padho
3. **Debug logs add karo** - Samajhne ka best tarika
4. **Exercise karo** - Reading se zyada doing se seekhoge
5. **DEVELOPER.md refer karo** - Sab detail wahan hai

---

## ⏰ Time Summary

| Day | Topic | Time |
|-----|-------|------|
| 1 | Architecture & Data Types | 2 hours |
| 2 | Parser Layer (Signal Extraction) | 3 hours |
| 3 | Inference Engine (Skill Rules) | 2 hours |
| 4 | Intelligence Layer & Verdict | 2 hours |
| **Total** | **Full Understanding** | **9 hours** |

---

*Follow this plan and you'll be able to modify the engine independently! 🚀*
