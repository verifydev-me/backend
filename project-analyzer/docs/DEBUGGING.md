# 🐛 Debugging Guide for Project Analyzer

This guide helps you debug the project analyzer effectively.

## 📋 Table of Contents

1. [Quick Debug Commands](#quick-debug-commands)
2. [Log Levels & Categories](#log-levels--categories)
3. [Common Issues & Solutions](#common-issues--solutions)
4. [Using the Debug Package](#using-the-debug-package)
5. [Performance Profiling](#performance-profiling)
6. [Signal Inspection](#signal-inspection)

---

## 🚀 Quick Debug Commands

### View Real-Time Logs
```bash
# All logs
docker logs -f verifydev-analyzer

# Filter by category
docker logs verifydev-analyzer 2>&1 | grep "📦"  # Package detection
docker logs verifydev-analyzer 2>&1 | grep "🔍"  # File scanning
docker logs verifydev-analyzer 2>&1 | grep "🎯"  # Signal matching
docker logs verifydev-analyzer 2>&1 | grep "⚡"  # Performance
docker logs verifydev-analyzer 2>&1 | grep "❌"  # Errors
```

### Trigger Analysis
```bash
# Trigger re-analysis for a project
curl -X POST http://localhost:3002/api/v1/projects/{PROJECT_ID}/analyze \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Check Container State
```bash
# Is analyzer running?
docker ps | grep analyzer

# Restart if needed
docker-compose restart project-analyzer

# Rebuild with latest code
docker-compose build project-analyzer && docker-compose up -d project-analyzer
```

---

## 📊 Log Levels & Categories

### Log Prefixes
| Prefix | Category | Meaning |
|--------|----------|---------|
| `📦` | package | Package/dependency detection |
| `🔍` | scan | File scanning operations |
| `🎯` | signal | Signal matched/detected |
| `⚡` | perf | Performance metrics |
| `🔀` | route | Routing decisions |
| `✅` | - | Success |
| `❌` | - | Error |
| `⚠️` | - | Warning |

### Environment Variables
```bash
# Set log level (silent/error/warn/info/debug/trace)
DEBUG_LEVEL=debug

# Filter to specific categories
DEBUG_CATEGORIES=signal,package,scan
```

### Example: Debug Only Package Detection
```bash
docker run -e DEBUG_LEVEL=debug -e DEBUG_CATEGORIES=package backend-project-analyzer
```

---

## 🔧 Common Issues & Solutions

### 1. Signals Not Detected

**Symptom**: Expected framework/library not appearing in analysis

**Debug Steps**:
```bash
# 1. Check if package.json is being found
docker logs verifydev-analyzer 2>&1 | grep "packageJsonCount"

# 2. Check if dependency is being matched
docker logs verifydev-analyzer 2>&1 | grep "zustand"  # Replace with your dep

# 3. Check if file scanning is working
docker logs verifydev-analyzer 2>&1 | grep "findFiles"
```

**Common Causes**:
- Package.json not found (check `shouldSkipPath` function)
- Dependency not in mapping (add to `depSignals` in `infra_extractor_node.go`)
- Signal not mapped to framework (add to `enrichTechStack` in `analyzer.go`)

### 2. Files Being Skipped

**Symptom**: Files not being scanned

**Debug Steps**:
```bash
# Check what's being skipped
docker logs verifydev-analyzer 2>&1 | grep "skipped\|skip"
```

**Check**: `shouldSkipPath()` function in `infra_extractor_helpers.go`

### 3. Analysis Timeout

**Symptom**: Analysis takes too long or times out

**Debug Steps**:
```bash
# Check phase timings
docker logs verifydev-analyzer 2>&1 | grep "⚡\|duration"

# Look for slow operations
docker logs verifydev-analyzer 2>&1 | grep -E "[0-9]+ms|[0-9]+s"
```

**Common Causes**:
- Large repo (check file count limits)
- Slow git clone (check network)
- Too many pattern matches (check `MaxFilesScanned`)

### 4. Wrong Project Type Detection

**Symptom**: Frontend project detected as backend or vice versa

**Debug Steps**:
```bash
docker logs verifydev-analyzer 2>&1 | grep "projectType\|Auto-detected"
```

**Check**: `quickDetectProjectType()` function in `analyzer.go`

---

## 🛠️ Using the Debug Package

### Import the Package
```go
import "github.com/verifydev/project-analyzer/internal/debug"
```

### Log Signal Detection
```go
debug.LogSignal("zustand", 0.9, []string{"Found in package.json"})
```

### Log Package Scanning
```go
debug.LogPackage("npm", "/path/to/package.json", 42)
debug.LogDependency("zustand", "SignalZustand", "package.json")
```

### Trace Function Timing
```go
func analyzePackageJSON() {
    defer debug.TraceFunction("analyzePackageJSON")()
    // ... your code
}
```

### Profile Operations
```go
func Extract() {
    defer debug.Profile("InfraExtractor.Extract")()
    // ... your code
}

// At end of analysis
debug.ProfileReport()
```

---

## ⚡ Performance Profiling

### Built-in Profiler
```go
// Start profiling
debug.ProfileStart("clone")
// ... clone operation
debug.ProfileStop("clone")

// Or use defer pattern
defer debug.Profile("extract_signals")()

// Print report at end
debug.ProfileReport()
```

### Output Example
```
⚡ PERFORMANCE PROFILING REPORT
================================================================================
OPERATION                             COUNT        TOTAL          AVG          MAX
--------------------------------------------------------------------------------
InfraExtractor.Extract                    1      156.2ms      156.2ms      156.2ms
analyzePackageJSON                        1       23.4ms       23.4ms       23.4ms
findFiles                                47       89.1ms        1.9ms       12.3ms
scanServicePackageJSON                    1        8.7ms        8.7ms        8.7ms
--------------------------------------------------------------------------------
TOTAL                                             277.4ms

📊 Memory: Alloc=12.3MB, TotalAlloc=45.6MB, Sys=72.1MB, NumGC=8
```

### Analysis Profiler
```go
profiler := debug.NewAnalysisProfiler(projectId)

defer profiler.TrackPhase(debug.PhaseClone)()
// clone...

defer profiler.TrackPhase(debug.PhaseInfraExtract)()
// extract...

profiler.Summary()
```

---

## 🔍 Signal Inspection

### Dump All Signals
```go
dump := debug.InspectSignals(infraSignals)
debug.PrintSignalDump(dump)
```

### Output Example
```
============================================================
📊 SIGNAL INSPECTION REPORT (Total: 24 signals)
============================================================

📁 FRONTEND (8)
----------------------------------------
  • nextjs                    [██████████] 100%
      ↳ Found next.config.js
      ↳ Next.js App Router detected
  • react                     [█████████░] 90%
      ↳ TSX files detected
  • tailwind                  [█████████░] 90%
      ↳ tailwindcss detected in root/package.json
  • zustand                   [█████████░] 90%
      ↳ zustand detected in root/package.json

📁 LANGUAGE (2)
----------------------------------------
  • typescript                [█████████░] 90%
      ↳ TypeScript files detected
  • javascript                [█████████░] 90%
      ↳ JavaScript files detected

============================================================
```

### Compare Signals (Before/After)
```go
beforeDump := debug.InspectSignals(beforeSignals)
afterDump := debug.InspectSignals(afterSignals)
debug.CompareSignals(beforeDump, afterDump)
```

### Save to File
```go
dump := debug.InspectSignals(signals)
debug.DumpToFile(dump, "/tmp/signals.json")
```

---

## 📁 Key Files Reference

| File | Purpose |
|------|---------|
| `internal/parser/infra_extractor_node.go` | Node.js/npm dependency detection |
| `internal/parser/infra_extractor_helpers.go` | File scanning helpers |
| `internal/analyzer/analyzer.go` | Main analysis pipeline |
| `internal/debug/logger.go` | Logging utilities |
| `internal/debug/profiler.go` | Performance profiling |
| `internal/debug/inspector.go` | Signal inspection |
| `pkg/signals/infrastructure.go` | Signal definitions |

---

## 🆘 Getting Help

1. **Check this guide first**
2. **Search logs** with grep for your specific issue
3. **Add debug logging** to trace the problem
4. **Check recent commits** that might have introduced the issue
5. **Ask in team chat** with:
   - Error message
   - Reproduction steps
   - Relevant log output
