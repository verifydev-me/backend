# 🧠 Project Analyzer Engine

> **Go-based Intelligence Engine for Developer Skill Verification**

Analyzes GitHub repositories to extract verified skills, calculate dimensional scores, and generate trust signals.

## 🚀 Quick Start

```bash
# Build
docker compose build project-analyzer

# Run
docker compose up -d project-analyzer

# Check logs
docker compose logs -f project-analyzer
```

## 📁 Project Structure

```
project-analyzer/
├── cmd/main.go                 # Entry point
├── internal/
│   ├── analyzer/               # Main orchestrator
│   ├── parser/                 # Signal extraction (18 files)
│   │   ├── inference_engine.go # 150+ skill rules
│   │   ├── infra_extractor*.go # Technology detection
│   │   └── git_forensics.go    # Authorship verification
│   └── intelligence/           # Advanced analysis (17 files)
│       ├── pipeline.go         # 7-stage analysis
│       ├── verdict_engine.go   # Final assessment
│       └── usage_verifier.go   # Verify actual usage
├── pkg/signals/                # Data types & constants
├── DEVELOPER.md                # 📖 FULL DOCUMENTATION
└── README.md                   # This file
```

## 🔄 How It Works

```
RabbitMQ (project.analyze)
       ▼
   Git Clone → Parser (signals) → Inference (skills) → Intelligence (verdict)
       ▼
RabbitMQ (project.analyzed) → Aura Processor (save to DB)
```

## 📖 Documentation

**For developers:** See [`DEVELOPER.md`](./DEVELOPER.md) for:
- Complete architecture & data flow
- Every file explained with functions
- Confidence scoring system
- How to add new skills
- Debugging guide

## ⚙️ Environment Variables

```bash
RABBITMQ_URL=amqp://user:pass@localhost:5672/
ANALYSIS_TIMEOUT=300s
LOG_LEVEL=info
```

## 🧪 Testing

```bash
# Run tests
go test ./...

# Test specific package
go test ./internal/parser/...
```

## 📊 Key Metrics

| Metric | Value |
|--------|-------|
| Analysis Time | 15-45 seconds |
| Max Repo Size | 500MB |
| Skill Rules | 150+ |
| Signal Types | 400+ |

---

*For detailed documentation, see [DEVELOPER.md](./DEVELOPER.md)*
