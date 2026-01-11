# 🎯 SIGNAL ACCURACY REBOOT PROMPT

**Mission**: Achieve **10000% accuracy** for ALL current signals. Every language, framework, and tech stack that exists in a repo MUST be detected. Zero false positives, zero false negatives.

---

## 🔍 Phase 1: Current Signal Audit (Mandatory First Step)

### Task 1.1: Generate Signal Detection Matrix

Create a table for EVERY signal in `pkg/signals/infrastructure.go`:

| Signal | Detection Method 1 | Detection Method 2 | Detection Method 3 | Status |
|--------|-------------------|-------------------|-------------------|--------|
| SignalDocker | Dockerfile exists | docker-compose.yml | .dockerignore | ✅ 3 methods |
| SignalReact | package.json → react | *.jsx files | react imports | ✅ 3 methods |
| SignalDjango | manage.py | requirements.txt → django | settings.py | ✅ 3 methods |
| ... | ... | ... | ... | ... |

**Critical Rule**: Every signal MUST have minimum 3 detection methods.
- If < 3 methods → **FAIL** → Add more detection methods immediately.

---

## 🧪 Phase 2: Detection Method Validation

For EACH signal, verify detection works by:

### 2.1 File Extension Detection
```go
// Example: SignalReact
if len(e.findFiles("*.jsx", "*.tsx")) > 0 {
    e.signals.AddSignal(signals.SignalReact, 0.9, ...)
}
```
**Test**: Create fixture with `App.jsx` → Expect `SignalReact` emitted.

### 2.2 Package Manager Detection
```go
// Example: SignalReact in package.json dependencies
"dependencies": {
    "react": "^18.0.0"
}
```
**Test**: Create fixture with only package.json → Expect `SignalReact` emitted.

### 2.3 Config File Detection
```go
// Example: SignalNext via next.config.js
if len(e.findFiles("next.config.js")) > 0 {
    e.signals.AddSignal(signals.SignalNextJS, 1.0, ...)
}
```
**Test**: Create fixture with only next.config.js (no package.json) → Expect `SignalNextJS` emitted.

---

## 🎯 Phase 3: Language Detection Deep Dive

For EACH language signal (Go, Python, JavaScript, TypeScript, Rust, Java, Kotlin, C#, Ruby, PHP, Swift, Dart):

### 3.1 Verify File Extension Mapping
```
SignalJava → *.java ✅
SignalKotlin → *.kt, *.kts ✅
SignalSwift → *.swift ✅
...
```

### 3.2 Verify Package Manager Mapping
```
SignalJava → pom.xml (Maven), build.gradle (Gradle)
SignalPHP → composer.json
SignalRust → Cargo.toml
...
```

### 3.3 Create Multi-Language Test
**Fixture**: Project with Java + Kotlin + Swift together.
**Expected**: All 3 language signals emitted.
**Current**: Run test, verify output.
**If fails**: Fix detection logic.

---

## 🏗️ Phase 4: Framework Detection Hardening

For EACH framework (React, Next.js, Vue, Nuxt, Angular, Svelte, Django, Flask, FastAPI, Express, NestJS, Spring, Rails, Laravel, Gin...):

### 4.1 Triple Detection Rule
Every framework MUST have:
1. **Dependency detection** (package.json / requirements.txt / go.mod)
2. **Config file detection** (next.config.js / nest-cli.json / angular.json)
3. **File pattern detection** (*.vue / manage.py / *.module.ts)

### 4.2 Edge Case Testing
**Test Cases**:
- Framework WITHOUT package manager (only config file)
- Framework WITHOUT config (only dependency in package.json)
- Framework WITHOUT either (only characteristic files like `app/layout.tsx` for Next.js App Router)

**All 3 cases must pass.**

---

## 📊 Phase 5: Confidence Score Calibration

### 5.1 Confidence Rules (Enforce Strictly)
```
Config file detected               → 1.0 (100%)
Package dependency detected        → 0.95 (95%)
File extension detected            → 0.9 (90%)
Code pattern (regex) detected      → 0.8 (80%)
Directory structure inferred       → 0.7 (70%)
```

### 5.2 Audit Current Scores
Search for ALL `e.signals.AddSignal()` calls.
**For each**:
- If config file → Score MUST be 1.0
- If file extension → Score MUST be 0.9
- If anything else → Verify correct tier

**Fix any violations immediately.**

---

## 🧬 Phase 6: Architecture Detection Precision

### 6.1 Monolith Criteria (STRICT)
```
✅ Correct: Single Dockerfile OR no Docker at all
✅ Correct: All code in one package.json / go.mod
❌ Wrong: Multiple services in folders but labeled monolith
```

### 6.2 Microservices Criteria (STRICT)
```
✅ Correct: 2+ Dockerfiles + docker-compose with 2+ services + SignalMultipleServices
✅ Correct: ServiceCount >= 2
❌ Wrong: Single service labeled as microservices
```

### 6.3 Monorepo Criteria (STRICT)
```
✅ Correct: nx.json OR turbo.json OR lerna.json OR pnpm-workspace.yaml
✅ Correct: Multiple package.json at different levels WITHOUT docker orchestration
❌ Wrong: Monorepo tools missing but still labeled monorepo
```

---

## 🚀 Phase 7: Real-World Validation

### 7.1 Test Against Known Repos
Run analysis on these public repos and verify 100% accuracy:

| Repo | Expected Detections | Test |
|------|-------------------|------|
| `vercel/next.js` | Next.js, React, TypeScript, Monorepo (Turborepo) | Run & verify |
| `django/django` | Python, Django | Run & verify |
| `spring-projects/spring-boot` | Java, Kotlin, Spring Boot | Run & verify |
| `vuejs/core` | TypeScript, Vue, Monorepo | Run & verify |

**Acceptance Criteria**: All expected technologies detected with confidence > 0.9.

### 7.2 Generate Accuracy Report
```
Detection Accuracy: X% (Target: 98%+)
False Positive Rate: Y% (Target: <2%)
False Negative Rate: Z% (Target: <2%)
Architecture Accuracy: A% (Target: 95%+)
```

---

## 🔧 Phase 8: Production Hardening

### 8.1 Timeout Protection
```go
// Add to findFiles()
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()
```

### 8.2 Malformed Input Handling
**Test Cases**:
- Corrupted JSON in package.json → Graceful skip, no panic
- Binary file with .go extension → Detect but don't crash
- Symlink loop → Detect and break, no infinite loop
- 100k+ files → Complete in < 10 seconds

### 8.3 Memory Limits
```go
// Enforce in findFiles()
const MaxFileSize = 10 * 1024 * 1024 // 10MB
const MaxTotalMemory = 500 * 1024 * 1024 // 500MB
```

---

## ✅ Final Verification Checklist

Run these tests, ALL must pass:

```
✅ All 14 languages detected from file extensions alone
✅ All 20+ frameworks detected from config files alone
✅ All 20+ frameworks detected from package managers alone
✅ Nx/Turbo/Lerna monorepos correctly identified
✅ Microservices (5+ services) correctly labeled
✅ Empty repo returns zero skills (no hallucinations)
✅ Malformed JSON handled gracefully
✅ 10k+ file repo completes in < 10s
✅ Real-world repo (Next.js) detects correctly
✅ No panics on any input
```

---

## 📈 Success Metrics

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Language Detection | ? | 100% | ? |
| Framework Detection | ? | 98%+ | ? |
| Architecture Accuracy | ? | 95%+ | ? |
| False Positive Rate | ? | <2% | ? |
| False Negative Rate | ? | <2% | ? |
| Panic Rate | ? | 0% | ? |

---

**Execution Order**: Follow phases 1→8 sequentially. Do NOT skip any phase. After completing all phases, report final metrics.
