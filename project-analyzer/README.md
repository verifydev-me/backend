# 🚀 Project Analyzer Engine (Enterprise Grade)

The **Project Analyzer** is a high-performance, intelligent static analysis engine designed to deconstruct, understand, and visualize software repositories. Built with **Go** for speed and concurrency, it goes beyond simple file counting to understand *how* code is written, architected, and deployed.

---

## ⚡ Core Capabilities

### 1. **Deep Tech Stack Detection**
   - **Languages**: JavaScript, TypeScript, Go, Python, Java, Rust, C#, PHP.
   - **Frameworks**:
     - **Frontend**: React, Next.js, Vue, Angular, Svelte, Tailwind, Redux.
     - **Backend**: Node.js (Express, NestJS), Go (Gin, Echo, Fiber), Python (Django, Flask, FastAPI).
   - **Databases**: PostgreSQL, MongoDB, MySQL, Redis, DynamoDB, Cassandra, Elasticsearch.
   - **Infrastructure**: Docker, Kubernetes, Terraform, AWS, GCP, Azure, Helm, Ansible.
   - **DevOps**: GitHub Actions, Jenkins, CircleCI, Prometheus, Grafana, ELK Stack.

### 2. **Intelligent Architecture Analysis**
   - **Microservices vs. Monolith**: Smart detection logic distinguishes between true distributed microservices and simple monorepos using folder patterns and `go.mod`/`package.json` dependency graphs.
   - **Monorepo Support**: Detects workspaces (Lerna, Nx, Turbo, Go Workspaces).
   - **Gateway Detection**: Identifies API Gateways (Nginx, Kong, Traefik) and Service Meshes (Istio).

### 3. **"Ghost Dependency" Verification**
   - **Problem**: A `package.json` lists `redux`, but is it actually used?
   - **Solution**: The engine performs a **Phase 2 Deep Scan** using Regex/AST logic to verify if libraries are imported and instantiated in the code.
   - **Result**: "Redux" is only listed as a skill if `useSelector` or `dispatch` is found in the source code.

### 4. **Complexity Scoring & Labeling**
   - Calculates a **0-100 Complexity Score** based on:
     - **Architecture (40%)**: Microservices, Event-Driven patterns.
     - **Infrastructure (35%)**: K8s, Cloud-Native, IaC.
     - **Code Quality (25%)**: Testing coverage, CI/CD, Observability.
   - **Auto-Labeling**: Classifies projects as **Prototype**, **MVP**, **Growth**, or **Enterprise**.

### 5. **Architecture Graph Generation**
   - Generates a `node-link` JSON graph representing the system topology.
   - **Nodes**: Services, Databases, Queues, Frontends, Gateways.
   - **Edges**: Connection flows (Service → Database, Frontend → Gateway).
   - Ready for visualization in frontend layouts.

---

## 🛠️ How It Works (The Pipeline)

The engine uses a **Massively Parallel Pipeline** to process repositories in seconds.

### **Phase 1: Parallel Extraction (The Heavy Lifting)**
Multiple extractors run concurrently using Go Goroutines:
1.  **File Stats**: Counts lines of code per language (excluding vendor/configs).
2.  **Folder Structure**: Analyzes project layout (`src`, `internal`, `pkg`, `api`).
3.  **Code Signals**: Checks for "Good Engineering" markers (Tests, CI, Linting, Dockerfiles).
4.  **Infra Extraction**: Scans configuration files (`Dockerfile`, `k8s/*.yaml`, `terraform`, `nginx.conf`).
5.  **Pattern Scanning**: Regex scan for design patterns (Singleton, Adapter, Factory, Clean Arch).

### **Phase 2: Language-Specific Deep Dives**
Once the primary language is identified, specialized parsers trigger:
- **Node.js**: Parses `package.json` + scans imports.
- **Go**: Parses `go.mod` + scans `func main()` code patterns.
- **Python**: Parses `requirements.txt` + `pyproject.toml`.

### **Phase 3: Verification & Inference (The "Brain")**
- **Ghost Check**: Verifies listed dependencies against actual code usage.
- **Skill Inference**: Maps "Raw Signals" (e.g., `gin` + `gorm` + `docker`) to "Verified Skills" (e.g., "Go Backend Development").
- **Graph Generation**: Builds the system topology.

---

## 📂 Modular Architecture

The codebase is refactored for extreme maintainability and debugging:

```text
internal/parser/
├── infra_extractor.go           # The Orchestrator
├── infra_extractor_services.go  # Microservice vs Monorepo Logic
├── infra_extractor_deployment.go# Docker/K8s/Cloud Detection
├── infra_extractor_graph.go     # Architecture Graph Generator
├── infra_extractor_complexity.go# Scoring Algorithm
├── infra_extractor_verification.go # Ghost Dependency Checker
├── infra_extractor_patterns.go  # Design Pattern Matcher
├── infra_extractor_gateway.go   # Nginx/Traefik Config Parsing
├── infra_extractor_node.go      # Node.js Logic
├── infra_extractor_go.go        # Go Logic
└── infra_extractor_python.go    # Python Logic
```

---

## 🚀 Performance & Scalability

- **Concurrency**: Typical repo analysis takes **< 2 seconds**. Large monorepos with microservices take **3-5 seconds**.
- **Message Queue**: Fully event-driven via **RabbitMQ**.
- **Error Handling**: Uses Dead Letter Queues (DLQ) for failed analyses to prevent data loss.
- **Resource Efficient**: Streaming file readers (no loading huge files into memory).

---

## 📝 Example Output (JSON)

```json
{
  "projectId": "123",
  "projectType": "microservice",
  "complexity": {
    "totalScore": 85.5,
    "scaleLabel": "Enterprise"
  },
  "industryAnalysis": {
    "engineeringLevel": "Senior",
    "architecture": { "type": "Microservices", "confidence": 0.95 }
  },
  "architectureGraph": {
    "nodes": [
      { "id": "auth-service", "type": "service", "tech": "go" },
      { "id": "user-service", "type": "service", "tech": "node" },
      { "id": "postgres", "type": "database", "tech": "postgres" }
    ],
    "edges": [
      { "source": "auth-service", "target": "postgres" }
    ]
  },
  "frameworks": ["Gin", "NestJS", "React"],
  "databases": ["PostgreSQL", "Redis"],
  "tools": ["Docker", "Kubernetes", "Prometheus"]
}
```

---
**Built by the VerifyDev Team using Advanced Agentic Coding.**
