# 🏆 ULTIMATE ENGINE OPTIMIZATION PROMPT

**Mission**: Transform the Project Analyzer Engine into an **industry-leading, enterprise-grade** code intelligence system. Focus on making **existing features perfect**, not adding new ones.

---

## 🎯 Core Optimization Targets

### 1. SIGNAL EXTRACTION LAYER (`infra_extractor_*.go`)

**Goal**: 100% detection rate for all supported technologies.

**Actions**:
1. **Audit every signal constant** in `pkg/signals/infrastructure.go`:
   - For EACH signal, ensure there are AT LEAST 3 ways to detect it:
     - Package manager (package.json, go.mod, requirements.txt)
     - Config file (next.config.js, nest-cli.json, angular.json)
     - File extension or pattern (*.vue, *.svelte, manage.py)
   - Document any signals with fewer than 2 detection methods → Add more.

2. **Stress test `findFiles()`**:
   - Create fixtures with files at depth 15+.
   - Create fixtures with 1000+ files → Ensure no timeout/panic.
   - Create fixtures with special characters in names (spaces, unicode).

3. **Validate signal confidence scores**:
   - Config file detection should be 1.0 (guaranteed).
   - Package dependency detection should be 0.9-0.95.
   - Code pattern detection (regex) should be 0.7-0.85.
   - If any scores are illogical, correct them.

---

### 2. INFERENCE ENGINE (`inference_engine.go`)

**Goal**: Every signal → Exactly ONE verified skill. No missed mappings.

**Actions**:
1. **Complete signal-to-skill audit**:
   ```
   For EACH signal in pkg/signals/infrastructure.go:
     - Search for it in inference_engine.go
     - If NOT found in any SkillRule → ADD IT
     - If found but wrong category/level → FIX IT
   ```

2. **Eliminate skill gaps**:
   - Languages: Go, Python, Rust, TypeScript, JavaScript, Java, Kotlin, C#, Ruby, PHP, Swift, Dart
   - Frameworks: Spring, Rails, Laravel, Django, Flask, FastAPI, NestJS, Next.js, Nuxt, SvelteKit, Gin, Fiber, Echo
   - Databases: PostgreSQL, MySQL, MongoDB, Redis, Elasticsearch, DynamoDB, Cassandra, ClickHouse
   - Infra: Docker, Kubernetes, Terraform, AWS, GCP, Azure, Serverless, Prometheus, Grafana

3. **Validate rule ordering**:
   - More specific rules should come BEFORE generic ones.
   - Example: "React Native" before "React".
   - Check for any ordering bugs.

---

### 3. ARCHITECTURE DETECTION (`inference_engine.go` → `classifyArchitecture`)

**Goal**: Perfect classification of monolith vs microservices vs monorepo.

**Actions**:
1. **Define strict criteria**:
   - `monolith`: Single deployable unit, 1 Dockerfile OR no Docker.
   - `microservices`: 2+ Dockerfiles + SignalMultipleServices + docker-compose with 2+ services.
   - `monorepo`: Multiple package.json/go.mod without docker-compose, OR Nx/Turborepo/Lerna config.

2. **Add Nx/Turborepo/Lerna detection**:
   - Check for `nx.json`, `turbo.json`, `lerna.json`.
   - If found → `monorepo` architecture.

3. **Test edge cases**:
   - Frontend + Backend in same repo (should be `monorepo` not `monolith`).
   - Single microservice (should be `monolith`).
   - 10+ service repo (should be `microservices`).

---

### 4. CONFIDENCE CALIBRATION (`internal/intelligence/confidence_calibrator.go`)

**Goal**: Confidence scores that match reality.

**Actions**:
1. **Calibrate against ground truth**:
   - Take 5 real open-source repos you KNOW well.
   - Run analysis, compare detected skills vs actual skills.
   - Adjust confidence thresholds until precision = 95%+.

2. **Implement confidence decay**:
   - Old dependencies (2+ years) should have lower confidence.
   - Config files without code using them = lower confidence.

---

### 5. PRODUCTION HARDENING

**Goal**: Zero panics, zero infinite loops, graceful degradation.

**Actions**:
1. **Add timeouts to ALL file operations**:
   - `findFiles()` should have a hard 5-second timeout.
   - `findCodePattern()` should stop after 100 file scans.

2. **Test malformed inputs**:
   - Corrupted JSON in package.json.
   - Binary files with code extensions (.go.exe).
   - Symlink loops.
   - Empty files with code extensions.

3. **Memory limits**:
   - Ensure no single file read exceeds 10MB.
   - Ensure total memory usage for analysis < 500MB.

---

## 🧪 Verification Checklist

After optimizations, run these tests:

```
✅ Ghost Next.js (no package.json) → Detects Next.js
✅ Hidden Django (manage.py 10 levels deep) → Detects Django
✅ Empty Repo → Zero skills, no panic
✅ Polyglot (5+ languages) → All detected
✅ Microservices (5+ services) → Architecture = microservices
✅ Monorepo (Nx/Turborepo) → Architecture = monorepo
✅ Malformed JSON → Graceful error, no panic
✅ 10,000 file repo → Completes in < 10 seconds
✅ Real-world repo (vercel/next.js) → Detects Next.js, React, TypeScript, Monorepo
```

---

## 📊 Success Metrics

| Metric | Target | Current |
|--------|--------|---------|
| **Detection Accuracy** | 98%+ | ? |
| **False Positive Rate** | < 2% | ? |
| **Architecture Accuracy** | 95%+ | ? |
| **Analysis Speed** | < 5s for 100k LOC | ? |
| **Memory Usage** | < 500MB | ? |
| **Panic Rate** | 0% | ? |

---

**Execute this prompt to achieve a world-class code intelligence engine.**
