# 🔍 Project Analyzer & Aura Processor - Complete Issue Analysis

> **Generated**: January 2025  
> **Updated**: January 2026 (Fixes Implemented)  
> **Priority Focus**: Go Project Analyzer (Backend Priority 1)  
> **Secondary**: TypeScript Aura Processor  

---

## 📊 Executive Summary

This document provides a comprehensive deep-dive analysis of both analyzer engines, identifying:
- **Skill Detection Gaps** - Skills that may not be extracted
- **Score Leak Points** - Where scores can inflate or deflate incorrectly
- **Logic Errors** - Bugs and edge cases causing incorrect results
- **Improvement Opportunities** - Ways to enhance accuracy

### ✅ Implementation Status

| Issue | Status | Files Changed |
|-------|--------|---------------|
| #1 Signal Filtering | ✅ FIXED | `analyzer.go` |
| #2 Score Inflation | ✅ FIXED | `verified_skills.go` |
| #3 Adjacent Skills | ✅ FIXED | `skill_taxonomy.go` |
| #5 Docker Services | ✅ FIXED | `infra_extractor_deployment.go`, `infrastructure.go` |
| #6 Authorship Penalty | ✅ FIXED | `analyzer.go` |
| #10 Calibrator Penalty | ✅ FIXED | `confidence_calibrator.go` |
| #12 Framework Detection | ✅ FIXED | `project-analyzed.ts` |
| #13 Skill Verification | ✅ FIXED | `project-analyzed.ts` |
| #15 React Meta-frameworks | ✅ FIXED | `aura-calculator.ts` |
| #16 Modern Frameworks | ✅ FIXED | `aura-calculator.ts` |
| #18 Language Percentages | ✅ FIXED | `aura-calculator.ts` |
| #19 Skill Categories | ✅ FIXED | `aura-calculator.ts` |

---

## 🚨 PRIORITY 1: Go Project Analyzer Issues

### Location: `/backend/project-analyzer/`

---

### 1. **Signal Filtering Removes Skills Incorrectly** ✅ FIXED

**File**: `internal/analyzer/analyzer.go` (lines 560-600)

```go
// filterSignalsByProjectType removes skills too aggressively
func (a *Analyzer) filterSignalsByProjectType(signals *signals.InfrastructureSignals, projectType string) {
    // ISSUE: Backend projects lose React/Vue skills even if they exist
    if projectType == "backend" || projectType == "api" {
        // Removes ALL frontend signals!
    }
}
```

**Problem**: 
- Full-stack projects classified as "backend" lose ALL frontend skills
- A backend project with a `docs/` site built in React loses that React skill
- Skills like "Tailwind", "Vite" incorrectly filtered

**Impact**: **HIGH** - Developers lose valid skills on resume

**Fix Applied**: ✅ Changed to reduce confidence (40%) instead of removing. Skills with `category == "frontend"` now get reduced confidence but remain in the list.

---

### 2. **Score Inflation via Multiple Bonus Multipliers** ✅ FIXED

**File**: `pkg/signals/verified_skills.go` (lines 176-195)

```go
func CalculateOverallScore(skills []VerifiedSkill, ...) {
    // Bonus 1: More than 10 skills
    if len(skills) > 10 {
        score *= 1.1  // +10%
    }
    // Bonus 2: More than 20 skills
    if len(skills) > 20 {
        score *= 1.1  // +10% AGAIN!
    }
}
```

**Problem**: 
- A project with 25 skills gets 1.1 × 1.1 = **1.21x multiplier** (21% bonus!)
- Stacks with other bonuses (architecture type, production-grade)
- Final score can exceed 100 before capping

**Impact**: **MEDIUM** - Score inflation for large projects

**Fix Applied**: ✅ Changed to additive bonuses: +5 points for >10 skills, +5 more for >20 skills (max +10 total).

---

### 3. **Adjacent Skills Always Included at 50% Confidence** ✅ FIXED

**File**: `internal/intelligence/skill_taxonomy.go` (lines 180-220)

```go
const MaxAdjacentInference = 0.50  // Adjacent skills capped at 50%

// Adjacent skills are ALWAYS added even with zero evidence
func (s *SkillTaxonomy) InferAdjacentSkills(skill string) []string {
    // If React detected -> adds "CSS", "HTML", "JavaScript" at 50% confidence
}
```

**Problem**:
- Developer who only wrote TypeScript backend still gets "CSS" skill
- 50% confidence passes `resumeReady` threshold (0.4)
- Creates phantom skills on resume

**Impact**: **HIGH** - Ghost skills appear on profiles

**Fix Applied**: ✅ Added minimum source confidence requirement (70%) and capped inferred confidence at 40% (below resume-ready threshold).

---

### 4. **Signal Scanner Misses Code-Level Patterns**

**File**: `internal/intelligence/signal_scanner.go` (lines 100-200)

```go
// Only checks config files, not actual code
func (s *SignalScanner) detectFrameworks() {
    // Checks: package.json, go.mod, requirements.txt
    // NEVER reads actual .js, .go, .py files for imports
}
```

**Problem**:
- Framework used in code but not in config file = MISSED
- Direct CDN imports not detected
- `import express from 'express'` in code not checked

**Impact**: **MEDIUM** - Misses dynamically imported frameworks

**Fix**: Add AST parsing or import pattern scanning for primary language files

---

### 5. **Docker Compose Service Count Inflation**

**File**: `internal/parser/infra_extractor_docker.go`

```go
// Every service in docker-compose counts as a "microservice"
for _, service := range compose.Services {
    e.signals.ServiceCount++
}
```

**Problem**:
- A redis container = counted as a "service" you built
- nginx, postgres, redis, rabbitmq = 4 "services" = microservices bonus
- Developer gets "distributed systems" skill for just using docker-compose

**Impact**: **HIGH** - Major skill inflation

**Fix**: Differentiate between:
- Custom services (has Dockerfile, has code)
- Third-party services (uses image:)

---

### 6. **Git Forensics Not Weighted Properly**

**File**: `internal/analyzer/analyzer.go` (Git forensics phase)

```go
// Authorship verdict exists but minimally used
if authorship.Level == "SNAPSHOT" {
    // Only affects overall score, NOT individual skills
}
```

**Problem**:
- A copied/dumped repo still gets all skills detected
- Only the FINAL score is penalized
- Skills show up on profile even for plagiarized projects

**Impact**: **MEDIUM** - Fake projects still generate skill entries

**Fix**: Apply authorship penalty to EACH skill's confidence

---

### 7. **File Size Limits Cause Silent Skips**

**File**: `internal/parser/infra_extractor_helpers.go`

```go
const MaxFileSizeRead = 5 * 1024 * 1024 // 5MB

// Large files silently skipped
if fileSize > MaxFileSizeRead {
    return nil // SILENT SKIP
}
```

**Problem**:
- Minified bundles often > 5MB
- Some `package-lock.json` files > 5MB
- Critical infrastructure detection missed

**Impact**: **LOW** - Rare edge case

**Fix**: Log warning, add to analysis notes

---

### 8. **React Analysis Only for "React" Framework**

**File**: `internal/intelligence/stack_analyzers.go`

```go
func (a *ReactAnalyzer) Analyze() {
    // Only runs if framework name == "React"
    // Next.js projects may not trigger this
}
```

**Problem**:
- Next.js detected as "Next.js" not "React"
- React-specific analysis (hooks, context, memo) skipped
- Developers lose React skill depth

**Impact**: **MEDIUM** - Next.js developers lose React granularity

**Fix**: Trigger ReactAnalyzer for Next.js, Gatsby, Remix as well

---

### 9. **Python Virtual Environment False Positives**

**File**: `internal/parser/infra_extractor_python.go`

```go
// Checks for venv folder existence only
if exists("venv") || exists(".venv") {
    signals.HasVirtualEnv = true
}
```

**Problem**:
- Old/abandoned venv folder still counts
- No validation that venv is actually used
- CI environments without venv marked as "missing best practice"

**Impact**: **LOW** - Minor false positive/negative

**Fix**: Check for recent modification or activation scripts

---

### 10. **Confidence Calibrator Penalizes Valid Small Projects**

**File**: `internal/intelligence/confidence_calibrator.go` (lines 120-140)

```go
// Small project penalty
func calculateSizeFactor(fileCount int) float64 {
    factor := float64(fileCount) / 50.0  // 50 files for full confidence
    return max(0.40, factor)  // Minimum 40%
}
```

**Problem**:
- A clean 15-file utility library gets only 40% confidence
- Well-written microservice with 20 files = 40% of actual skill
- Penalizes clean, focused code

**Impact**: **MEDIUM** - Small projects unfairly penalized

**Fix**: Use lines of code + complexity, not just file count

---

## 🚨 PRIORITY 2: TypeScript Aura Processor Issues

### Location: `/backend/aura-processor/`

---

### 11. **Industry Bonus Caps Incorrectly**

**File**: `src/processors/aura-calculator.ts` (lines 83-130)

```typescript
// Cap increased to 25 but individual bonuses can exceed it
private calculateIndustryBonus(industry?: IndustryAnalysis): number {
    let bonus = 0;
    
    // High confidence skills: up to 12 points
    bonus += Math.min(highConfidenceSkills.length * 2, 12);
    
    // Architecture: up to 8 points
    if (architecture.type === 'microservices') bonus += 8;
    
    // Service count bonus: 2 points
    if (serviceCount > 2) bonus += 2;
    
    // Engineering level: up to 5 points
    // TOTAL POSSIBLE: 12 + 8 + 2 + 5 = 27 points
    
    return Math.min(bonus, 25);  // Capped at 25
}
```

**Problem**:
- Documentation says max 25, but individual items can't all reach max
- Complex projects hit cap early, lose differentiation
- Project with 5 vs 15 high-confidence skills may score same

**Impact**: **LOW** - Score compression at high end

**Fix**: Increase cap or add weighted tiers

---

### 12. **Project Type Detection Fallback Inaccurate**

**File**: `src/consumers/project-analyzed.ts` (lines 165-175)

```typescript
// Fallback detection too simple
const hasFrontend = signals.frameworks?.some(f => 
    ['React', 'Vue', 'Angular', 'Next.js'].includes(f)
);
const hasBackend = signals.frameworks?.some(f => 
    ['Express', 'NestJS', 'Gin', 'Django'].includes(f)
);
```

**Problem**:
- Many frameworks missed: Svelte, SvelteKit, Nuxt, FastAPI, Flask, Fiber, etc.
- Pure Go project classified as "OTHER"
- Python FastAPI = "OTHER" instead of "BACKEND"

**Impact**: **HIGH** - Wrong project type = wrong analysis path

**Fix**: Expand framework lists or use language-based fallback

---

### 13. **Skill Auto-Verification Threshold Too Strict**

**File**: `src/consumers/project-analyzed.ts` (lines 355-370)

```typescript
// Auto-verify only if score >= 70
await prisma.skill.upsert({
    create: {
        isVerified: skill.score >= 70,  // Strict threshold
    },
    update: {
        isVerified: skill.score >= 70,  // Can UN-verify!
    },
});
```

**Problem**:
- Legitimate skill at 65% stays unverified
- Re-analysis with lower score can UN-verify a skill
- All-or-nothing verification

**Impact**: **MEDIUM** - Skills flip-flop verification status

**Fix**: 
- Use hysteresis (verify at 70, un-verify at 50)
- Never downgrade verification, only add

---

### 14. **User Aura Capped Per Project, Not Cumulative**

**File**: `src/consumers/project-analyzed.ts` (lines 385-400)

```typescript
// Max 40 aura per project
const auraContribution = Math.min(projectScore, 40);

await prisma.user.update({
    data: {
        auraScore: { increment: auraContribution }
    }
});
```

**Problem**:
- Project score 90 only contributes 40 aura
- No differentiation between 90 and 100 score projects
- Encourages many small projects over few excellent ones

**Impact**: **LOW** - Design decision, but worth noting

**Fix**: Consider: `min(projectScore * 0.5, 50)` for scaled contribution

---

### 15. **React Analysis Only When Framework String Matches**

**File**: `src/processors/aura-calculator.ts` (lines 610-620)

```typescript
// Strict string matching
const hasReactFramework = signals.frameworks.some(
    f => f.toLowerCase() === 'react' || f.toLowerCase().includes('next')
);
if (signals.reactSignals && hasReactFramework) {
    frameworkAnalysis = this.generateReactAnalysis(...);
}
```

**Problem**:
- Case sensitivity issues ("react" vs "React")
- Remix, Gatsby don't trigger React analysis
- Vue/Angular have no equivalent analysis

**Impact**: **MEDIUM** - Incomplete framework analysis

**Fix**: Add case-insensitive matching, support more meta-frameworks

---

### 16. **Missing Framework Recognition in Tech Stack Score**

**File**: `src/processors/aura-calculator.ts` (lines 320-350)

```typescript
const modernFrameworks = [
    'React', 'Next.js', 'Vue', 'Nuxt', 'Svelte',
    'NestJS', 'Fastify', 'Gin', 'Fiber', 'FastAPI',
    'Express', 'Koa', 'Echo', 'Chi', 'Django', 'Flask'
];
```

**Problem**:
- Missing: Remix, Astro, SolidJS, Qwik, Hono, Bun
- Go: Missing Buffalo, Beego
- Rust: Missing Actix, Axum, Rocket
- Ruby: Missing Rails, Sinatra

**Impact**: **MEDIUM** - Modern framework users get lower scores

**Fix**: Expand list or use category-based scoring

---

### 17. **Optimization Suggestions Too Generic**

**File**: `src/processors/aura-calculator.ts` (lines 650-720)

```typescript
// Same suggestions for every project
if (!signals.codeSignals.hasReadme) {
    improvements.push('Add a README.md');
}
```

**Problem**:
- Backend API doesn't need "implement lazy loading"
- Go project doesn't need "ESLint setup"
- One-size-fits-all suggestions

**Impact**: **LOW** - Poor UX, not score related

**Fix**: Filter suggestions by project type and language

---

### 18. **Language Stats Missing Percentage Normalization**

**File**: `src/processors/aura-calculator.ts`

```typescript
// Language percentages taken as-is from signals
techStack: {
    languages: signals.languages.map(l => ({ 
        name: l.name, 
        percentage: l.percentage  // May be undefined or NaN!
    })),
}
```

**Problem**:
- Some analyzers return lines, not percentages
- Percentages may not sum to 100
- Frontend crashes on `undefined.toFixed()` (we fixed this but source issue remains)

**Impact**: **HIGH** - Data inconsistency

**Fix**: Always normalize percentages in aura-calculator before saving

---

### 19. **Skill Category Mapping Lossy**

**File**: `src/processors/aura-calculator.ts` (lines 445-460)

```typescript
private mapVerifiedSkillCategory(category: string) {
    const categoryMap = {
        'language': 'LANGUAGE',
        'infrastructure': 'DEVOPS',  // Info loss!
        'cache': 'DATABASE',          // Redis = Database?
        'search': 'DATABASE',         // Elasticsearch = Database?
    };
    return categoryMap[category] || 'TOOL';  // Fallback to TOOL
}
```

**Problem**:
- "infrastructure" flattened to "DEVOPS"
- "cache" and "search" become "DATABASE"
- Loses granularity for recruiter filtering

**Impact**: **MEDIUM** - Skill categorization inaccurate

**Fix**: Expand enum to include INFRASTRUCTURE, CACHE, SEARCH

---

### 20. **Duplicate Skill Prevention Case-Sensitive**

**File**: `src/processors/aura-calculator.ts` (lines 400-440)

```typescript
const addedSkillNames = new Set<string>();

// First add verified skills
addedSkillNames.add(verifiedSkill.name.toLowerCase());

// Then add fallback frameworks
if (!addedSkillNames.has(framework.toLowerCase())) {
    skills.push({ name: framework, ... });
}
```

**Problem**:
- Go analyzer sends "docker", aura-processor receives "Docker"
- Set checks lowercase but pushes original case
- Same skill can appear twice with different casing

**Impact**: **LOW** - Rare case mismatch

**Fix**: Normalize all skill names to consistent casing

---

## 📋 Complete Issue Summary

| # | Engine | Severity | Issue |
|---|--------|----------|-------|
| 1 | Go | 🔴 HIGH | Signal filtering removes skills incorrectly |
| 2 | Go | 🟡 MEDIUM | Score inflation via multiple multipliers |
| 3 | Go | 🔴 HIGH | Adjacent skills always added at 50% |
| 4 | Go | 🟡 MEDIUM | Signal scanner misses code patterns |
| 5 | Go | 🔴 HIGH | Docker services counted as microservices |
| 6 | Go | 🟡 MEDIUM | Git forensics not applied to skills |
| 7 | Go | 🟢 LOW | File size limits cause silent skips |
| 8 | Go | 🟡 MEDIUM | React analysis only for "React" |
| 9 | Go | 🟢 LOW | Python venv false positives |
| 10 | Go | 🟡 MEDIUM | Calibrator penalizes small projects |
| 11 | TS | 🟢 LOW | Industry bonus cap issues |
| 12 | TS | 🔴 HIGH | Project type fallback inaccurate |
| 13 | TS | 🟡 MEDIUM | Skill verification flip-flops |
| 14 | TS | 🟢 LOW | Aura capped per project |
| 15 | TS | 🟡 MEDIUM | React analysis case sensitive |
| 16 | TS | 🟡 MEDIUM | Missing modern frameworks |
| 17 | TS | 🟢 LOW | Generic optimization suggestions |
| 18 | TS | 🔴 HIGH | Language percentage normalization |
| 19 | TS | 🟡 MEDIUM | Skill category mapping lossy |
| 20 | TS | 🟢 LOW | Duplicate skill case sensitivity |

---

## 🛠️ Recommended Fixes (Priority Order)

### Critical (Fix Now)
1. **Issue #5**: Distinguish custom vs third-party Docker services
2. **Issue #3**: Require evidence for adjacent skills
3. **Issue #1**: Don't remove skills, reduce confidence instead
4. **Issue #12**: Expand framework detection lists
5. **Issue #18**: Normalize language percentages

### Important (Fix Soon)
6. **Issue #2**: Change multiplicative bonuses to additive
7. **Issue #6**: Apply authorship penalty per-skill
8. **Issue #10**: Use complexity metrics not just file count
9. **Issue #13**: Implement verification hysteresis
10. **Issue #8, #15**: Support meta-frameworks in React analysis

### Nice to Have
11. Expand modern framework lists (#16)
12. Add infrastructure/cache/search categories (#19)
13. Project-type-specific suggestions (#17)

---

## 🔄 Backend Service Improvements Summary

### 1. user-service
- Add language percentage normalization in `project.service.ts`
- Validate analysis data before API response
- Add cache layer for project analysis fetch

### 2. aura-processor
- Expand project type detection frameworks
- Add skill category enum values
- Implement percentage normalization pre-save

### 3. project-analyzer (Go)
- Refactor signal filtering to confidence reduction
- Add Docker service type differentiation
- Implement evidence requirements for adjacent skills
- Add AST parsing for import detection

### 4. auth-service
- No analyzer-related changes needed

### 5. job-service / recruiter-service
- No changes needed - consumes processed data

---

## 📈 Testing Recommendations

### Regression Test Cases
1. Full-stack project with frontend in `/docs` folder
2. Docker-compose with 5+ third-party services
3. Small utility library (<20 files)
4. Copied/dumped repository (snapshot authorship)
5. Next.js project (React analysis triggered?)
6. FastAPI project (backend type detection?)
7. Svelte/SvelteKit project (modern framework score?)

### Performance Test Cases
1. Monorepo with 100K+ files
2. Project with 5MB+ package-lock.json
3. Repository with 1000+ commits

---

*Document maintained by Engineering Team*     a
*Last Updated: January 2025*
