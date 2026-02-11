# Project Analyzer - Folder Structure

## 🎯 Design Principles

1. **Single Responsibility**: Each folder has ONE clear purpose
2. **Easy Debugging**: Dedicated debug utilities and structured logging
3. **Production-Ready**: Clear separation of concerns, testable components
4. **New Dev Friendly**: Self-documenting structure with README in each folder

---

## 📁 Proposed Structure

```
project-analyzer/
├── cmd/                          # Application entrypoints
│   └── main.go                   # HTTP server + RabbitMQ consumer
│
├── internal/                     # Private application code
│   │
│   ├── analyzer/                 # Core analysis orchestration
│   │   ├── analyzer.go           # Main analysis pipeline
│   │   ├── security.go           # Authorship & security checks
│   │   └── enrichment.go         # Tech stack enrichment
│   │
│   ├── extractor/                # Signal extraction (MODULAR)
│   │   │
│   │   ├── base.go               # Base extractor interface & helpers
│   │   ├── registry.go           # Extractor registry (plug & play)
│   │   │
│   │   ├── language/             # Language-specific extractors
│   │   │   ├── node.go           # Node.js/JavaScript/TypeScript
│   │   │   ├── go.go             # Go projects
│   │   │   ├── python.go         # Python projects
│   │   │   └── rust.go           # Rust projects (future)
│   │   │
│   │   ├── framework/            # Framework detection
│   │   │   ├── react.go          # React/Next.js/Vue/Angular
│   │   │   ├── backend.go        # Express/NestJS/Gin/Django
│   │   │   └── mobile.go         # React Native/Flutter
│   │   │
│   │   ├── infra/                # Infrastructure signals
│   │   │   ├── docker.go         # Docker & Docker Compose
│   │   │   ├── kubernetes.go     # K8s manifests
│   │   │   ├── ci_cd.go          # GitHub Actions, GitLab CI
│   │   │   └── cloud.go          # AWS/GCP/Azure SDKs
│   │   │
│   │   ├── patterns/             # Code pattern detection
│   │   │   ├── architecture.go   # Clean arch, DDD, microservices
│   │   │   ├── testing.go        # Unit, integration, e2e tests
│   │   │   └── observability.go  # Logging, metrics, tracing
│   │   │
│   │   └── graph/                # Architecture graph generation
│   │       └── graph.go          # Service dependency graph
│   │
│   ├── inference/                # Skill inference engine
│   │   ├── engine.go             # Main inference logic
│   │   ├── rules.go              # Inference rules (signal → skill)
│   │   └── confidence.go         # Confidence scoring
│   │
│   ├── intelligence/             # Autonomous intelligence pipeline
│   │   ├── pipeline.go           # Multi-stage pipeline
│   │   ├── scanner.go            # Fast signal scanner
│   │   ├── router.go             # Module routing
│   │   └── verdict.go            # Final verdict generation
│   │
│   ├── git/                      # Git operations
│   │   ├── client.go             # Clone, checkout
│   │   └── forensics.go          # Commit analysis, authorship
│   │
│   ├── config/                   # Configuration
│   │   └── config.go             # Env vars, feature flags
│   │
│   ├── rabbitmq/                 # Message queue
│   │   └── consumer.go           # RabbitMQ consumer
│   │
│   ├── workerpool/               # Concurrency
│   │   └── pool.go               # Worker pool implementation
│   │
│   └── debug/                    # 🆕 DEBUGGING UTILITIES
│       ├── logger.go             # Structured logging helpers
│       ├── tracer.go             # Request tracing
│       ├── profiler.go           # Performance profiling
│       └── inspector.go          # Signal inspection tools
│
├── pkg/                          # Public/shared packages
│   │
│   ├── signals/                  # Signal definitions
│   │   ├── infrastructure.go     # InfraSignal enum
│   │   ├── project.go            # ProjectSignals struct
│   │   └── types.go              # Shared types
│   │
│   ├── api/                      # API types
│   │   ├── request.go            # Analysis request
│   │   └── response.go           # Analysis response
│   │
│   ├── dimensions/               # Dimensional analysis
│   │   └── analyzer.go           # Multi-dimensional scoring
│   │
│   ├── matching/                 # Pattern matching
│   │   └── matcher.go            # Signal matchers
│   │
│   ├── trust/                    # Trust scoring
│   │   └── calculator.go         # Trust score calculation
│   │
│   └── verdict/                  # Verdict types
│       └── verdict.go            # Final verdict types
│
├── tests/                        # Test files
│   ├── integration/              # Integration tests
│   ├── fixtures/                 # Test fixtures (sample repos)
│   └── mocks/                    # Mock implementations
│
├── scripts/                      # Dev scripts
│   ├── analyze-local.sh          # Run analysis locally
│   ├── debug-signals.sh          # Debug signal extraction
│   └── profile.sh                # Run profiler
│
├── docs/                         # Documentation
│   ├── ARCHITECTURE.md           # System architecture
│   ├── SIGNALS.md                # Signal documentation
│   └── DEBUGGING.md              # Debugging guide
│
├── Dockerfile                    # Production build
├── Dockerfile.dev                # Development build (with debugger)
├── go.mod
├── go.sum
├── README.md                     # Quick start guide
└── DEVELOPER.md                  # Developer documentation
```

---

## 🔧 Key Improvements

### 1. **Modular Extractors** (`internal/extractor/`)

Current `infra_extractor_*.go` files split into logical folders:

| Current File | New Location |
|-------------|--------------|
| `infra_extractor_node.go` | `extractor/language/node.go` |
| `infra_extractor_go.go` | `extractor/language/go.go` |
| `infra_extractor_python.go` | `extractor/language/python.go` |
| `infra_extractor_docker.go` | `extractor/infra/docker.go` |
| `infra_extractor_deployment.go` | `extractor/infra/ci_cd.go` |
| `infra_extractor_patterns.go` | `extractor/patterns/architecture.go` |
| `infra_extractor_services.go` | `extractor/patterns/microservices.go` |
| `infra_extractor_gateway.go` | `extractor/infra/gateway.go` |
| `infra_extractor_graph.go` | `extractor/graph/graph.go` |
| `infra_extractor_helpers.go` | `extractor/base.go` |
| `infra_extractor_complexity.go` | `extractor/patterns/complexity.go` |
| `infra_extractor_verification.go` | `extractor/patterns/verification.go` |

### 2. **Debugging Package** (`internal/debug/`)

```go
// logger.go - Structured logging with context
func LogSignalDetection(signal string, confidence float64, evidence []string) {
    log.Debug().
        Str("signal", signal).
        Float64("confidence", confidence).
        Strs("evidence", evidence).
        Msg("🎯 Signal detected")
}

// inspector.go - Signal inspection
func DumpSignals(signals *InfrastructureSignals) {
    // Pretty print all detected signals for debugging
}

// tracer.go - Request tracing
func TraceAnalysis(projectId string) func() {
    start := time.Now()
    return func() {
        log.Info().
            Str("projectId", projectId).
            Dur("duration", time.Since(start)).
            Msg("✅ Analysis completed")
    }
}
```

### 3. **Extractor Registry** (Plug & Play)

```go
// registry.go
type Extractor interface {
    Name() string
    Extract(ctx context.Context, repoPath string) []Signal
    SupportedLanguages() []string
}

type Registry struct {
    extractors []Extractor
}

func (r *Registry) Register(e Extractor) {
    r.extractors = append(r.extractors, e)
}

func (r *Registry) ExtractAll(ctx context.Context, repoPath string) *Signals {
    // Run all extractors in parallel
}
```

---

## 🐛 Debugging Guide

### Quick Debug Commands

```bash
# 1. Run local analysis with verbose logging
LOG_LEVEL=debug go run ./cmd/main.go --local /path/to/repo

# 2. Inspect signals for a specific extractor
go run ./cmd/main.go --debug-extractor=node /path/to/repo

# 3. Profile performance
go run ./cmd/main.go --profile /path/to/repo

# 4. Dump all signals to JSON
go run ./cmd/main.go --dump-signals /path/to/repo > signals.json
```

### Log Prefixes for Easy Filtering

| Prefix | Meaning |
|--------|---------|
| `📦` | Package/dependency detection |
| `🔍` | File scanning |
| `🎯` | Signal matched |
| `⚡` | Performance optimization |
| `🔀` | Routing decision |
| `✅` | Success |
| `❌` | Error |
| `⚠️` | Warning |

```bash
# Filter logs by category
docker logs verifydev-analyzer 2>&1 | grep "📦"  # Package detection
docker logs verifydev-analyzer 2>&1 | grep "🎯"  # Signal matches
```

---

## 📋 Migration Plan

### Phase 1: Create New Structure (Non-Breaking)
1. Create new folders under `internal/extractor/`
2. Create `internal/debug/` package
3. Add logging utilities

### Phase 2: Migrate Extractors
1. Move code file by file
2. Update imports
3. Run tests after each move

### Phase 3: Cleanup
1. Remove old files
2. Update documentation
3. Add integration tests

---

## ✅ Benefits

1. **For New Developers**:
   - Clear folder names = self-documenting
   - Each file has single responsibility
   - Easy to find where to add new extractors

2. **For Debugging**:
   - Dedicated debug package
   - Consistent log prefixes
   - Signal inspection tools

3. **For Production**:
   - Modular, testable components
   - Easy to add new languages/frameworks
   - Performance profiling built-in
