package analyzer

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
	"github.com/rs/zerolog/log"

	"github.com/verifydev/project-analyzer/internal/config"
	"github.com/verifydev/project-analyzer/internal/git"
	"github.com/verifydev/project-analyzer/internal/intelligence"
	"github.com/verifydev/project-analyzer/internal/parser"
	"github.com/verifydev/project-analyzer/internal/rabbitmq"
	"github.com/verifydev/project-analyzer/pkg/dimensions"
	"github.com/verifydev/project-analyzer/pkg/signals"
	"github.com/verifydev/project-analyzer/pkg/trust"
	"github.com/verifydev/project-analyzer/pkg/verdict"
)

type Analyzer struct {
	config    *config.Config
	gitClient *git.GitClient
	rabbit    *rabbitmq.RabbitMQ
}

func NewAnalyzer(cfg *config.Config, rabbit *rabbitmq.RabbitMQ) *Analyzer {
	return &Analyzer{
		config:    cfg,
		gitClient: git.NewGitClient(cfg.CloneDir, cfg.GitHubToken),
		rabbit:    rabbit,
	}
}

// Start begins consuming messages and analyzing projects (legacy single-threaded mode)
func (a *Analyzer) Start(ctx context.Context) error {
	msgs, err := a.rabbit.Consume()
	if err != nil {
		return err
	}

	log.Info().Msg("🔍 Analyzer started - waiting for projects...")

	for {
		select {
		case <-ctx.Done():
			log.Info().Msg("Analyzer shutting down...")
			return nil

		case msg, ok := <-msgs:
			if !ok {
				log.Warn().Msg("RabbitMQ channel closed")
				return nil
			}

			a.handleMessage(ctx, msg)
		}
	}
}

// StartWithWorkerPool begins consuming messages with concurrent workers
// This is the recommended method for production use
func (a *Analyzer) StartWithWorkerPool(ctx context.Context) error {
	msgs, err := a.rabbit.Consume()
	if err != nil {
		return err
	}

	workerCount := a.config.WorkerCount
	if workerCount <= 0 {
		workerCount = 4 // Default fallback
	}

	log.Info().
		Int("workerCount", workerCount).
		Msg("🚀 Analyzer started with WORKER POOL - waiting for projects...")

	// Create a semaphore to limit concurrent workers
	sem := make(chan struct{}, workerCount)

	// WaitGroup to track active workers for graceful shutdown
	var wg sync.WaitGroup

	for {
		select {
		case <-ctx.Done():
			log.Info().Msg("Analyzer shutting down, waiting for active workers...")
			wg.Wait() // Wait for all workers to finish
			log.Info().Msg("All workers finished, shutdown complete")
			return nil

		case msg, ok := <-msgs:
			if !ok {
				log.Warn().Msg("RabbitMQ channel closed")
				wg.Wait()
				return nil
			}

			// Acquire semaphore slot (blocks if all workers are busy)
			sem <- struct{}{}
			wg.Add(1)

			// Process message in goroutine (worker)
			go func(msg amqp.Delivery) {
				defer func() {
					<-sem // Release semaphore slot
					wg.Done()
				}()

				a.handleMessage(ctx, msg)
			}(msg)
		}
	}
}

// handleMessage processes a single analyze request
func (a *Analyzer) handleMessage(ctx context.Context, msg amqp.Delivery) {
	startTime := time.Now()

	// Parse request
	var req signals.AnalyzeRequest
	if err := json.Unmarshal(msg.Body, &req); err != nil {
		log.Error().Err(err).Msg("Failed to parse message")
		msg.Nack(false, false) // Don't requeue - bad message
		return
	}

	log.Info().
		Str("projectId", req.ProjectID).
		Str("repo", req.RepoName).
		Msg("📦 Starting analysis")

	// Analyze with timeout
	analyzeCtx, cancel := context.WithTimeout(ctx, time.Duration(a.config.AnalysisTimeoutSec)*time.Second)
	defer cancel()

	result, err := a.analyze(analyzeCtx, req)
	if err != nil {
		log.Error().
			Err(err).
			Str("projectId", req.ProjectID).
			Msg("❌ Analysis failed")

		// Don't requeue to avoid infinite loop - let DLX handle it
		msg.Nack(false, false)
		return
	}

	// Publish result to aura processor
	if err := a.rabbit.Publish(ctx, result); err != nil {
		log.Error().Err(err).Msg("Failed to publish result")
		msg.Nack(false, true)
		return
	}

	// Acknowledge message
	msg.Ack(false)

	log.Info().
		Str("projectId", req.ProjectID).
		Dur("duration", time.Since(startTime)).
		Msg("✅ Analysis complete")
}

// analyze performs the actual code analysis
func (a *Analyzer) analyze(ctx context.Context, req signals.AnalyzeRequest) (*signals.ProjectSignals, error) {
	// 1. Clone repository
	// 1. Clone repository
	repoPath, err := a.gitClient.CloneRepo(ctx, req.RepoURL, req.ProjectID, req.DefaultBranch, req.GitHubToken, req.BasePath)
	if err != nil {
		return nil, err
	}

	// Ensure cleanup happens
	defer func() {
		if err := a.gitClient.DeleteRepo(repoPath); err != nil {
			log.Warn().Err(err).Str("path", repoPath).Msg("Failed to delete repo")
		}
	}()

	// Check context for cancellation
	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	default:
	}

	// Initialize result
	result := &signals.ProjectSignals{
		ProjectID:       req.ProjectID,
		UserID:          req.UserID,
		RepoURL:         req.RepoURL,
		AnalyzedAt:      time.Now().Format(time.RFC3339),
		AnalysisVersion: "3.0.0-PROD", // Enterprise Version
	}

	// Extract user project type for routing decisions
	userProjectType := req.UserProjectType // backend, frontend, fullstack, ml, library
	log.Debug().Str("userProjectType", userProjectType).Msg("Project type routing enabled")

	var wg sync.WaitGroup
	var mu sync.Mutex

	// Determine analysis root (subfolder support)
	analysisRoot := repoPath
	if req.BasePath != "" {
		analysisRoot = filepath.Join(repoPath, req.BasePath)
		log.Info().Str("basePath", req.BasePath).Msg("Using subfolder for analysis")
		// Verify subfolder exists
		if _, err := os.Stat(analysisRoot); os.IsNotExist(err) {
			log.Warn().Str("basePath", req.BasePath).Msg("Subfolder does not exist, falling back to root")
			analysisRoot = repoPath
		}
	}

	fileParser := parser.NewFileParser(analysisRoot)
	infraExtractor := parser.NewInfraExtractor(analysisRoot, userProjectType)

	// ============================================
	// PARALLEL EXECUTION: Phase 1 (Project-Type-Aware)
	// ============================================

	// Complete routing logic based on userProjectType
	// frontend → only frontend analysis
	// backend → only backend analysis
	// fullstack → BOTH frontend + backend
	// ml → ML-specific + backend
	// library → all analysis
	runFrontend := userProjectType == "frontend" || userProjectType == "fullstack" || userProjectType == "" || userProjectType == "library"
	runBackend := userProjectType == "backend" || userProjectType == "fullstack" || userProjectType == "ml" || userProjectType == "" || userProjectType == "library"
	runML := userProjectType == "ml"

	log.Info().
		Str("userProjectType", userProjectType).
		Bool("runFrontend", runFrontend).
		Bool("runBackend", runBackend).
		Bool("runML", runML).
		Msg("🔀 Project type routing active")

	// 1. File Stats & Language Analysis (ALWAYS needed)
	wg.Add(1)
	go func() {
		defer wg.Done()
		stats := fileParser.GetLanguageStats()
		mu.Lock()
		result.Languages = stats
		result.PrimaryLanguage = fileParser.GetPrimaryLanguage(stats)
		mu.Unlock()
	}()

	// 2. Folder Structure Analysis (ALWAYS needed)
	wg.Add(1)
	go func() {
		defer wg.Done()
		structure := fileParser.AnalyzeFolderStructure()
		mu.Lock()
		result.FolderStructure = structure
		mu.Unlock()
	}()

	// 3. Code Signals Analysis (ALWAYS needed)
	wg.Add(1)
	go func() {
		defer wg.Done()
		codeSig := fileParser.AnalyzeCodeSignals()
		mu.Lock()
		result.CodeSignals = codeSig
		mu.Unlock()
	}()

	// 4. Infrastructure Extraction (Run for ALL types to detect dependencies like React/Next.js)
	var infraSignals *signals.InfrastructureSignals
	wg.Add(1)
	go func() {
		defer wg.Done()
		infraSignals = infraExtractor.Extract()
	}()

	// 5. Advanced Pattern Analysis (Run for ALL types)
	wg.Add(1)
	go func() {
		defer wg.Done()
		patterns := fileParser.AnalyzeAdvancedPatterns()
		mu.Lock()
		result.AdvancedPatterns = patterns
		mu.Unlock()
	}()

	// Wait for Phase 1
	wg.Wait()

	// Calculate Total Lines
	totalLines := 0
	for _, l := range result.Languages {
		totalLines += l.Lines
	}
	result.TotalLines = totalLines

	// ============================================
	// SEQUENTIAL EXECUTION: Phase 2 (Dependent on Phase 1)
	// ============================================

	// 6. Git Forensics (Authenticity Engine)
	// Must run after we have TotalLines for "Largest Commit Ratio" logic
	log.Info().Msg("🕵️‍♂️ Running Git Forensics...")
	gitAnalyzer := parser.NewGitAnalyzer(repoPath)
	forensics, authVerdict := gitAnalyzer.Analyze(totalLines)
	result.GitForensics = forensics
	result.AuthorshipVerdict = authVerdict

	// Detect Project Type (Depends on Folder + Code Signals)
	result.ProjectType = fileParser.DetectProjectType(result.FolderStructure, result.CodeSignals)

	// Language Specific Analysis (Conditional)
	hasJSTS := false
	hasGo := false
	hasPython := false

	for _, lang := range result.Languages {
		if lang.Name == "JavaScript" || lang.Name == "TypeScript" {
			hasJSTS = true
		}
		if lang.Name == "Go" {
			hasGo = true
		}
		if lang.Name == "Python" {
			hasPython = true
		}
	}

	// Trigger Language Parsers in Parallel (using routing flags from top)

	if hasJSTS {
		wg.Add(1)
		go func() {
			defer wg.Done()
			// React analysis only for frontend/fullstack projects
			if runFrontend {
				result.ReactSignals = fileParser.AnalyzeReact()
				log.Debug().Msg("✅ Running React analysis")
			}
			// Node analysis only for backend/fullstack projects
			if runBackend {
				result.NodeSignals = fileParser.AnalyzeNode()
				log.Debug().Msg("✅ Running Node analysis")
			}
		}()
	}
	// Go analysis only for backend/fullstack projects
	if hasGo && runBackend {
		wg.Add(1)
		go func() {
			defer wg.Done()
			result.GoSignals = fileParser.AnalyzeGo()
			log.Debug().Msg("✅ Running Go analysis")
		}()
	}
	// Python analysis only for backend/fullstack/ml projects
	if hasPython && (runBackend || runML) {
		wg.Add(1)
		go func() {
			defer wg.Done()
			result.PythonSignals = fileParser.AnalyzePython()
			log.Debug().Msg("✅ Running Python analysis")
		}()
	}
	wg.Wait()

	// ============================================
	// ENTERPRISE ANALYSIS: Phase 3 (Inference & Scoring)
	// ============================================

	// 1. Complexity Score
	result.Complexity = infraExtractor.CalculateComplexity()

	// 2. Verified Skills Inference
	inferenceEngine := parser.NewInferenceEngine()
	result.IndustryAnalysis = inferenceEngine.InferSkills(infraSignals)

	// Fix #6: Apply authorship penalty to individual skills, not just overall score
	// This prevents fake/copied projects from generating resume-ready skills
	if result.AuthorshipVerdict != nil && result.IndustryAnalysis != nil {
		applyAuthorshipPenaltyToSkills(result.IndustryAnalysis, result.AuthorshipVerdict)
	}

	// 3. Architecture Graph Generation
	result.ArchitectureGraph = infraExtractor.GenerateArchitectureGraph()

	// 4. Tech Stack Enrichment (From verified infra signals)
	enrichTechStack(result, infraSignals)

	// ============================================
	// AUTONOMOUS INTELLIGENCE ENGINE: Phase 4
	// ============================================
	intelligencePipeline := intelligence.NewPipeline(repoPath, req.Niche, req.UserProjectType)

	// PROD OPTIMIZATION: Inject pre-computed signals to skip redundant scanning
	// This prevents the intelligence engine from re-walking the entire file system
	fastSignals := mapToFastSignals(result, infraSignals)
	// Compute confidence from the mapped signals
	confidence := intelligence.ComputeSignalConfidence(fastSignals)
	intelligencePipeline.SetPrecomputedSignals(fastSignals, confidence)
	intelligencePipeline.SetGitForensics(result.AuthorshipVerdict)

	intelligenceResult, err := intelligencePipeline.Run(ctx)
	if err != nil {
		log.Warn().Err(err).Msg("Intelligence pipeline failed, continuing without verdict")
	} else if intelligenceResult != nil && intelligenceResult.Verdict != nil {
		// Map intelligence verdict to API response
		result.IntelligenceVerdict = mapIntelligenceVerdict(intelligenceResult)

		// ============================================
		// DIMENSIONAL ANALYSIS INTEGRATION (Phase 5)
		// ============================================
		// Run dimensional analysis and enrich verdict with detailed scores
		enrichVerdictWithDimensionalAnalysis(result, intelligenceResult, infraSignals)
	}

	// Calculate final totals (only set once — already computed in Phase 1)
	// TotalLines was set in Phase 1 line ~244, TotalFiles was set by language parser.
	// Only compute here if they haven't been set yet (defensive)
	if result.TotalLines == 0 || result.TotalFiles == 0 {
		for _, lang := range result.Languages {
			result.TotalLines += lang.Lines
			result.TotalFiles += lang.Files
		}
	}

	// Filter signals based on project type for clean response
	filterSignalsByProjectType(result, userProjectType)

	log.Info().
		Str("projectId", req.ProjectID).
		Str("projectType", string(result.ProjectType)).
		Str("userProjectType", userProjectType).
		Str("scale", result.Complexity.ScaleLabel).
		Float64("score", result.Complexity.TotalScore).
		Int("skills", result.IndustryAnalysis.TotalSkills).
		Msg("📊 Analysis metrics")

	return result, nil
}

// filterSignalsByProjectType removes irrelevant signals based on user selection
func filterSignalsByProjectType(result *signals.ProjectSignals, projectType string) {
	switch projectType {
	case "frontend":
		// Frontend projects: remove backend-specific signals
		result.NodeSignals = nil
		result.GoSignals = nil
		result.PythonSignals = nil

		// Strict Skill Filtering for Frontend
		if result.IndustryAnalysis != nil {
			var filteredSkills []signals.VerifiedSkill
			for _, skill := range result.IndustryAnalysis.VerifiedSkills {
				if skill.Category == "frontend" ||
					skill.Category == "framework" ||
					skill.Category == "language" ||
					skill.Category == "infrastructure" ||
					skill.Category == "testing" ||
					skill.Category == "observability" ||
					skill.Category == "security" {
					filteredSkills = append(filteredSkills, skill)
				}
			}
			result.IndustryAnalysis.VerifiedSkills = filteredSkills

			// Clean SkillsByCategory Map
			if result.IndustryAnalysis.SkillsByCategory != nil {
				delete(result.IndustryAnalysis.SkillsByCategory, "database")
				delete(result.IndustryAnalysis.SkillsByCategory, "messaging")
				delete(result.IndustryAnalysis.SkillsByCategory, "architecture")
				delete(result.IndustryAnalysis.SkillsByCategory, "ml")
				delete(result.IndustryAnalysis.SkillsByCategory, "backend")
			}

			// Remove Architecture/Microservices Graph for Frontend
			result.IndustryAnalysis.Architecture = signals.SystemArchitecture{}
		}

		// Clear Backend-specific Tech Stacks
		result.Databases = []string{} // Frontend doesn't manage DBs usually
		// Filter Tools to remove Backend tools? (Kafka is in tools)
		var filteredTools []string
		for _, tool := range result.Tools {
			// Simple blacklist for obvious backend tools
			if tool != "Kafka" && tool != "RabbitMQ" && tool != "NATS" {
				filteredTools = append(filteredTools, tool)
			}
		}
		result.Tools = filteredTools

		log.Debug().Msg("Filtered out backend signals & skills for frontend project")

	case "backend":
		// Backend projects: remove frontend-specific signals
		result.ReactSignals = nil

		// Fix #1: Instead of removing skills, reduce their confidence
		// This allows backend projects with legitimate frontend components (e.g., docs site)
		// to retain those skills but with lower priority
		if result.IndustryAnalysis != nil {
			var filteredSkills []signals.VerifiedSkill
			for _, skill := range result.IndustryAnalysis.VerifiedSkills {
				if skill.Category == "frontend" {
					// Fix #1: Reduce confidence instead of removing completely
					// Backend projects with frontend skills get reduced confidence (40%)
					skill.Confidence *= 0.4
					skill.ResumeReady = false // Not primary for resume
					// Only include if confidence is still above threshold
					if skill.Confidence >= 0.2 {
						filteredSkills = append(filteredSkills, skill)
					}
				} else {
					filteredSkills = append(filteredSkills, skill)
				}
			}
			result.IndustryAnalysis.VerifiedSkills = filteredSkills
		}

		// Filter Frameworks (remove React/Next/Vue) - these still get removed from primary list
		var filteredFrameworks []string
		for _, fw := range result.Frameworks {
			if fw != "React" && fw != "Vue.js" && fw != "Angular" && fw != "Svelte" && fw != "Tailwind CSS" {
				filteredFrameworks = append(filteredFrameworks, fw)
			}
		}
		result.Frameworks = filteredFrameworks

		log.Debug().Msg("Adjusted frontend skill confidence for backend project")

	case "fullstack":
		// Fullstack: keep everything
		log.Debug().Msg("Keeping all signals for fullstack project")

	default:
		// ml, library, or empty: keep everything
		log.Debug().Str("type", projectType).Msg("Keeping all signals")
	}
}

// enrichTechStack maps infra signals to user-friendly tech lists
func enrichTechStack(result *signals.ProjectSignals, infra *signals.InfrastructureSignals) {
	if infra == nil {
		return
	}

	mapping := map[string]string{
		// Databases
		"postgres": "PostgreSQL", "mysql": "MySQL", "mongodb": "MongoDB", "redis": "Redis",
		"dynamodb": "DynamoDB", "cassandra": "Cassandra", "elasticsearch": "Elasticsearch",
		"sqlite": "SQLite", "mariadb": "MariaDB", "firestore": "Firestore",
		"prisma": "Prisma", "typeorm": "TypeORM", "gorm": "GORM", "mongoose": "Mongoose",

		// DevOps & Cloud
		"docker": "Docker", "docker_compose": "Docker Compose", "kubernetes": "Kubernetes",
		"aws": "AWS", "gcp": "Google Cloud", "azure": "Azure", "s3": "AWS S3",
		"terraform": "Terraform", "pulumi": "Pulumi", "helm": "Helm",
		"github_actions": "GitHub Actions", "gitlab_ci": "GitLab CI", "jenkins": "Jenkins",
		"vercel": "Vercel", "netlify": "Netlify", "supabase": "Supabase", "firebase": "Firebase",

		// Message Queues
		"kafka": "Kafka", "rabbitmq": "RabbitMQ", "sqs": "AWS SQS", "nats": "NATS",

		// Frontend Frameworks
		"react": "React", "nextjs": "Next.js", "vue": "Vue.js", "angular": "Angular",
		"svelte": "Svelte", "tailwind": "Tailwind CSS", "redux": "Redux", "zustand": "Zustand",
		"solidjs": "Solid.js", "preact": "Preact",
		"react_query": "React Query", "framer_motion": "Framer Motion",

		// Backend Frameworks
		"nestjs": "NestJS", "express": "Express", "fastify": "Fastify",
		"gin": "Gin", "echo": "Echo", "fiber": "Fiber",
		"django": "Django", "flask": "Flask", "fastapi": "FastAPI",
		"graphql": "GraphQL", "grpc": "gRPC", "websocket": "WebSocket",

		// Testing
		"jest": "Jest", "cypress": "Cypress", "playwright": "Playwright",

		// Observability
		"prometheus": "Prometheus", "grafana": "Grafana", "sentry": "Sentry",
		"datadog": "Datadog", "opentelemetry": "OpenTelemetry",
	}

	// Explicit framework detection (these are commonly needed)
	if infra.HasSignal(signals.SignalReact) {
		result.Frameworks = appendUnique(result.Frameworks, "React")
	}
	if infra.HasSignal(signals.SignalNextJS) {
		result.Frameworks = appendUnique(result.Frameworks, "Next.js")
	}
	if infra.HasSignal(signals.SignalVue) {
		result.Frameworks = appendUnique(result.Frameworks, "Vue.js")
	}
	if infra.HasSignal(signals.SignalAngular) {
		result.Frameworks = appendUnique(result.Frameworks, "Angular")
	}
	if infra.HasSignal(signals.SignalNestJS) {
		result.Frameworks = appendUnique(result.Frameworks, "NestJS")
	}
	if infra.HasSignal(signals.SignalExpress) {
		result.Frameworks = appendUnique(result.Frameworks, "Express")
	}
	if infra.HasSignal(signals.SignalGin) {
		result.Frameworks = appendUnique(result.Frameworks, "Gin")
	}
	if infra.HasSignal(signals.SignalDjango) {
		result.Frameworks = appendUnique(result.Frameworks, "Django")
	}
	if infra.HasSignal(signals.SignalTailwind) {
		result.Frameworks = appendUnique(result.Frameworks, "Tailwind CSS")
	}
	if infra.HasSignal(signals.SignalZustand) {
		result.Frameworks = appendUnique(result.Frameworks, "Zustand")
	}
	if infra.HasSignal(signals.SignalRedux) {
		result.Frameworks = appendUnique(result.Frameworks, "Redux")
	}
	if infra.HasSignal(signals.SignalReactQuery) {
		result.Frameworks = appendUnique(result.Frameworks, "React Query")
	}
	if infra.HasSignal(signals.SignalSolidJS) {
		result.Frameworks = appendUnique(result.Frameworks, "Solid.js")
	}
	if infra.HasSignal(signals.SignalPreact) {
		result.Frameworks = appendUnique(result.Frameworks, "Preact")
	}

	// Track what we've already added
	uniqueTech := make(map[string]bool)
	for _, t := range result.Databases {
		uniqueTech[t] = true
	}
	for _, t := range result.Tools {
		uniqueTech[t] = true
	}
	for _, t := range result.Frameworks {
		uniqueTech[t] = true
	}

	// Enrich from signals using mapping
	for signal := range infra.SignalDetails {
		sigStr := string(signal)
		if name, ok := mapping[sigStr]; ok {
			if !uniqueTech[name] {
				if isDatabase(name) {
					result.Databases = append(result.Databases, name)
				} else if isTool(name) {
					result.Tools = append(result.Tools, name)
				} else {
					result.Frameworks = append(result.Frameworks, name)
				}
				uniqueTech[name] = true
			}
		}
	}
}

// Fix #6: Apply authorship penalty to individual skills
// Snapshot/copied projects should have reduced skill confidence
// This prevents resume-ready skills from appearing for fake projects
func applyAuthorshipPenaltyToSkills(analysis *signals.IndustryAnalysis, authorship *signals.AuthorshipVerdict) {
	if authorship == nil || analysis == nil {
		return
	}

	// Determine penalty multiplier based on authorship level
	// NOTE: Penalties reduced to be less aggressive - real skill detection matters more
	var penaltyMultiplier float64
	switch authorship.Level {
	case "SNAPSHOT":
		// FURTHER REDUCED: Even snapshots have real skills - only 10% penalty
		penaltyMultiplier = 0.90 // Keep 90% confidence (was 70%)
	case "SUSPICIOUS":
		// Minor penalty - some concerns about authenticity
		penaltyMultiplier = 0.85 // Keep 85% confidence
	case "ASSISTED":
		// Very minor penalty - automated assistance is common and acceptable
		penaltyMultiplier = 0.95 // Keep 95% confidence
	case "ORGANIC":
		// No penalty or bonus
		if authorship.Confidence == "HIGH" {
			penaltyMultiplier = 1.05 // 5% boost for verified organic
		} else {
			penaltyMultiplier = 1.0
		}
	default:
		penaltyMultiplier = 1.0
	}

	// Apply penalty to all verified skills
	for i := range analysis.VerifiedSkills {
		skill := &analysis.VerifiedSkills[i]
		skill.Confidence *= penaltyMultiplier

		// Cap at 1.0
		if skill.Confidence > 1.0 {
			skill.Confidence = 1.0
		}

		// Update resume-ready flag based on new confidence
		// Threshold is typically 0.4 (40%)
		skill.ResumeReady = skill.Confidence >= 0.4
	}

	// Also update skills by category
	for cat, skills := range analysis.SkillsByCategory {
		for i := range skills {
			skills[i].Confidence *= penaltyMultiplier
			if skills[i].Confidence > 1.0 {
				skills[i].Confidence = 1.0
			}
			skills[i].ResumeReady = skills[i].Confidence >= 0.4
		}
		analysis.SkillsByCategory[cat] = skills
	}
}

// appendUnique adds an item to slice if not already present
func appendUnique(slice []string, item string) []string {
	for _, s := range slice {
		if s == item {
			return slice
		}
	}
	return append(slice, item)
}

func isDatabase(name string) bool {
	dbs := []string{
		"PostgreSQL", "MySQL", "MongoDB", "Redis", "DynamoDB", "Cassandra",
		"Elasticsearch", "SQLite", "MariaDB", "Firestore",
		"Prisma", "TypeORM", "GORM", "Mongoose", // ORMs count as database tech
	}
	for _, d := range dbs {
		if d == name {
			return true
		}
	}
	return false
}

func isTool(name string) bool {
	tools := []string{
		"Docker", "Docker Compose", "Kubernetes", "Helm",
		"AWS", "AWS S3", "Google Cloud", "Azure",
		"Terraform", "Pulumi",
		"GitHub Actions", "GitLab CI", "Jenkins",
		"Kafka", "RabbitMQ", "NATS", "AWS SQS",
		"Prometheus", "Grafana", "Sentry", "Datadog", "OpenTelemetry",
		"Supabase", "Firebase", "Vercel", "Netlify",
		"Jest", "Cypress", "Playwright",
	}
	for _, t := range tools {
		if t == name {
			return true
		}
	}
	return false
}

// mapToFastSignals converts detailed ProjectSignals to FastSignals for the intelligence pipeline
func mapToFastSignals(p *signals.ProjectSignals, infra *signals.InfrastructureSignals) *intelligence.FastSignals {
	fs := &intelligence.FastSignals{
		DominantLanguage:   p.PrimaryLanguage,
		LanguagePercentage: 0.0, // Calculated below
		DetectedFrameworks: p.Frameworks,

		// Folder Intent
		HasSrcFolder:        p.FolderStructure.HasSrcFolder,
		HasInternalFolder:   p.FolderStructure.HasInternal,
		HasPkgFolder:        p.FolderStructure.HasPkg,
		HasCmdFolder:        p.FolderStructure.HasCmd,
		HasServicesFolder:   p.FolderStructure.HasServices,
		HasGateway:          p.FolderStructure.HasGateway,
		HasComponentsFolder: p.FolderStructure.HasComponents,

		// Production Markers
		HasCI:         p.CodeSignals.HasCI,
		HasEnvExample: p.CodeSignals.HasEnvExample,
		HasLinting:    p.CodeSignals.HasLinting,
		HasTests:      p.CodeSignals.TestFilesCount > 0 || p.FolderStructure.HasTests,

		TestFilesCount: p.CodeSignals.TestFilesCount,
		TotalFiles:     p.TotalFiles,
		CodeFiles:      p.TotalFiles,
	}

	// Calculate primary language percentage
	for _, l := range p.Languages {
		if l.Name == p.PrimaryLanguage {
			fs.LanguagePercentage = l.Percentage / 100.0
			break
		}
	}

	// Collect secondary languages
	for _, l := range p.Languages {
		if l.Name != p.PrimaryLanguage && l.Percentage > 5.0 {
			fs.SecondaryLanguages = append(fs.SecondaryLanguages, l.Name)
		}
	}

	// Map Infrastructure Signals if available
	if infra != nil {
		fs.HasDockerfile = infra.HasSignal(signals.SignalDocker)
		fs.HasDockerCompose = infra.HasSignal(signals.SignalDockerCompose)

		// Infer Microservices
		if infra.HasSignal("multiple_services") || len(p.FolderStructure.TopLevelFolders) > 2 {
			fs.HasMicroservices = true
			// Use actual service count from infra extraction, fallback to 2
			if infra.ServiceCount > 0 {
				fs.ServiceCount = infra.ServiceCount
			} else {
				fs.ServiceCount = 2 // Minimal assumption when we can't determine exact count
			}
		}

		// ML Markers
		if infra.HasSignal(signals.SignalLLM) || infra.HasSignal("python_ml") {
			fs.HasMLMarkers = true
		}
	}

	// TypeScript detection from languages
	for _, l := range p.Languages {
		if l.Name == "TypeScript" {
			fs.HasTypeScript = true
			break
		}
	}

	return fs
}

// mapIntelligenceVerdict converts intelligence package result to API response type
func mapIntelligenceVerdict(result *intelligence.PipelineResult) *signals.IntelligenceVerdict {
	if result == nil || result.Verdict == nil {
		return nil
	}

	v := result.Verdict

	verdict := &signals.IntelligenceVerdict{
		ProjectIntentSummary:  v.ProjectIntentSummary,
		TechStackSnapshot:     v.TechStackSnapshot,
		ArchitectureMaturity:  v.ArchitectureMaturity,
		OverallScore:          v.OverallScore,
		DeveloperLevel:        string(result.DevLevel),
		ProjectIntent:         string(result.Intent),
		KeySignals:            v.KeySignals,
		StrengthSignals:       v.StrengthSignals,
		RiskSignals:           v.RiskSignals,
		SeniorEngineerVerdict: v.SeniorEngineerVerdict,
		HireSignal:            string(v.HireSignal),
		AnalysisTimeMs:        result.AnalysisTimeMs,
		ModulesExecuted:       result.ModulesExecuted,
		ModulesSkipped:        result.ModulesSkipped,
		EarlyTermination:      result.EarlyTermination,
		ExitReason:            result.ExitReason,
	}

	// Map suggestions
	for _, s := range v.Suggestions {
		verdict.Suggestions = append(verdict.Suggestions, signals.IntelligenceSuggestion{
			Category:    s.Category,
			Message:     s.Message,
			ImpactScore: s.ImpactScore,
			EffortScore: s.EffortScore,
			Priority:    s.Priority,
		})
	}

	// Map skills
	for _, skill := range v.ExtractedSkills {
		verdict.ExtractedSkills = append(verdict.ExtractedSkills, signals.IntelligenceSkill{
			Name:          skill.Name,
			Category:      skill.Category,
			Confidence:    skill.Confidence,
			Evidence:      skill.Evidence,
			ResumeReady:   skill.ResumeReady,
			UsageVerified: skill.UsageVerified, // NEW: Pass through verification status
			UsageStrength: skill.UsageStrength, // NEW: Pass through verification strength
		})
	}

	return verdict
}

// enrichVerdictWithDimensionalAnalysis runs dimensional engine and enriches verdict
func enrichVerdictWithDimensionalAnalysis(
	result *signals.ProjectSignals,
	intelligenceResult *intelligence.PipelineResult,
	infraSignals *signals.InfrastructureSignals,
) {
	// Use the dimensional extractor to get scores
	extractor := dimensions.NewDimensionExtractor(result, infraSignals)
	dimMatrix := extractor.Extract()

	// Enrich IntelligenceVerdict with dimensional data
	if dimMatrix != nil && result.IntelligenceVerdict != nil {
		result.IntelligenceVerdict.Dimensions = &signals.DimensionalScores{
			Fundamentals: &signals.DimensionScoreData{
				Score:      dimMatrix.Fundamentals.Score,
				Confidence: dimMatrix.Fundamentals.Confidence,
				Signals:    dimMatrix.Fundamentals.Signals,
			},
			EngineeringDepth: &signals.DimensionScoreData{
				Score:      dimMatrix.EngineeringDepth.Score,
				Confidence: dimMatrix.EngineeringDepth.Confidence,
				Signals:    dimMatrix.EngineeringDepth.Signals,
			},
			ProductionReady: &signals.DimensionScoreData{
				Score:      dimMatrix.ProductionReadiness.Score,
				Confidence: dimMatrix.ProductionReadiness.Confidence,
				Signals:    dimMatrix.ProductionReadiness.Signals,
			},
			TestingMaturity: &signals.DimensionScoreData{
				Score:      dimMatrix.TestingMaturity.Score,
				Confidence: dimMatrix.TestingMaturity.Confidence,
				Signals:    dimMatrix.TestingMaturity.Signals,
			},
			Architecture: &signals.DimensionScoreData{
				Score:      dimMatrix.Architecture.Score,
				Confidence: dimMatrix.Architecture.Confidence,
				Signals:    dimMatrix.Architecture.Signals,
			},
			InfraDevOps: &signals.DimensionScoreData{
				Score:      dimMatrix.InfraDevOps.Score,
				Confidence: dimMatrix.InfraDevOps.Confidence,
				Signals:    dimMatrix.InfraDevOps.Signals,
			},
			OverallScore:     dimMatrix.OverallScore,
			OverallBandLower: int(dimMatrix.OverallBand.Lower),
			OverallBandUpper: int(dimMatrix.OverallBand.Upper),
		}

		log.Info().
			Float64("dimOverall", dimMatrix.OverallScore).
			Float64("fundamentals", dimMatrix.Fundamentals.Score).
			Float64("engineering", dimMatrix.EngineeringDepth.Score).
			Msg("🎯 Dimensional analysis complete")

		// ============================================
		// TRUST ANALYSIS INTEGRATION
		// ============================================
		var commitData *trust.CommitData
		if result.GitForensics != nil {
			commitData = &trust.CommitData{
				TotalCommits: result.GitForensics.CommitCount,
			}
		}
		trustAnalyzer := trust.NewTrustAnalyzer(result, infraSignals, commitData)
		trustResult := trustAnalyzer.Analyze()
		if trustResult != nil {
			result.IntelligenceVerdict.TrustAnalysis = &signals.TrustAnalysisDetailed{
				Score:             trustResult.OverallTrust.Score,
				Level:             string(trustResult.OverallTrust.Classification),
				EffortScore:       trustResult.Effort.EffortScore,
				EffortClass:       string(trustResult.Effort.Classification),
				AuthenticityScore: trustResult.Authenticity.AuthenticityScore,
				IsLearning:        trustResult.Learning.IsLikelyLearning,
				LearningScore:     trustResult.Learning.LearningScore * 100,
				ConsistencyScore:  trustResult.Consistency.ConsistencyScore,
				HasOriginalWork:   trustResult.Authenticity.AuthenticityScore >= 60,
				Flags:             extractTrustFlags(trustResult),
			}
			log.Info().
				Float64("trustScore", trustResult.OverallTrust.Score).
				Str("trustLevel", string(trustResult.OverallTrust.Classification)).
				Msg("🔒 Trust analysis complete")
		}

		// ============================================
		// EXPERIENCE & VERDICT DETAILED INTEGRATION
		// ============================================
		verdictGen := verdict.NewVerdictGenerator(dimMatrix)
		verdictResult := verdictGen.Generate()
		if verdictResult != nil {
			// Map experience analysis
			result.IntelligenceVerdict.ExperienceAnalysis = &signals.ExperienceAnalysis{
				Level:           string(verdictResult.Experience.Level),
				Confidence:      verdictResult.Experience.Confidence,
				YearsMin:        int(verdictResult.Experience.EstimatedYears.Min),
				YearsMax:        int(verdictResult.Experience.EstimatedYears.Max),
				YearsEstimate:   verdictResult.Experience.EstimatedYears.Estimate,
				MatchingFactors: verdictResult.Experience.SupportingSignals,
			}

			// Map verdict detailed
			strengthTexts := make([]string, 0, len(verdictResult.Strengths))
			for _, s := range verdictResult.Strengths {
				strengthTexts = append(strengthTexts, s.Statement)
			}
			growthTexts := make([]string, 0, len(verdictResult.GrowthAreas))
			for _, g := range verdictResult.GrowthAreas {
				growthTexts = append(growthTexts, g.Statement)
			}
			result.IntelligenceVerdict.VerdictDetailed = &signals.VerdictDetailed{
				Summary:        verdictResult.Summary,
				Strengths:      strengthTexts,
				GrowthAreas:    growthTexts,
				Cautions:       verdictResult.Cautions,
				Recommendation: verdictResult.HiringRecommendation,
			}
			log.Info().
				Str("experienceLevel", string(verdictResult.Experience.Level)).
				Float64("experienceConfidence", verdictResult.Experience.Confidence).
				Int("strengths", len(verdictResult.Strengths)).
				Int("growthAreas", len(verdictResult.GrowthAreas)).
				Msg("📋 Verdict generation complete")
		}
	}

	// CRITICAL FIX: Sync Usage Verification from IntelligenceVerdict to IndustryAnalysis
	// aura-processor reads IndustryAnalysis.VerifiedSkills for DB storage
	if result.IntelligenceVerdict != nil && result.IndustryAnalysis != nil {
		// Create map for fast lookup
		verifiedMap := make(map[string]bool)
		strengthMap := make(map[string]float64)

		for _, s := range result.IntelligenceVerdict.ExtractedSkills {
			if s.UsageVerified {
				verifiedMap[s.Name] = true
				strengthMap[s.Name] = s.UsageStrength
			}
		}

		// Update IndustryAnalysis skills
		for i := range result.IndustryAnalysis.VerifiedSkills {
			skillName := result.IndustryAnalysis.VerifiedSkills[i].Name
			if verifiedMap[skillName] {
				result.IndustryAnalysis.VerifiedSkills[i].UsageVerified = true
				result.IndustryAnalysis.VerifiedSkills[i].UsageStrength = strengthMap[skillName]
			}
		}
	}
}

// extractTrustFlags converts trust flags to string slice for JSON output
func extractTrustFlags(trustResult *trust.TrustAnalysis) []string {
	flags := make([]string, 0, len(trustResult.Flags))
	for _, f := range trustResult.Flags {
		flags = append(flags, fmt.Sprintf("[%s] %s", f.Type, f.Message))
	}
	// Also include consistency issues as flags
	for _, issue := range trustResult.Consistency.Issues {
		flags = append(flags, fmt.Sprintf("[%s] %s: %s", issue.Severity, issue.Type, issue.Evidence))
	}
	return flags
}
