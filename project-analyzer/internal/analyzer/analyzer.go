package analyzer

import (
	"context"
	"encoding/json"
	"sync"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
	"github.com/rs/zerolog/log"

	"github.com/verifydev/project-analyzer/internal/config"
	"github.com/verifydev/project-analyzer/internal/git"
	"github.com/verifydev/project-analyzer/internal/parser"
	"github.com/verifydev/project-analyzer/internal/rabbitmq"
	"github.com/verifydev/project-analyzer/pkg/signals"
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

// Start begins consuming messages and analyzing projects
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

		// Requeue for retry (RabbitMQ will handle max retries via DLQ)
		msg.Nack(false, true)
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
	repoPath, err := a.gitClient.CloneRepo(req.RepoURL, req.ProjectID, req.DefaultBranch)
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

	var wg sync.WaitGroup
	var mu sync.Mutex

	fileParser := parser.NewFileParser(repoPath)
	infraExtractor := parser.NewInfraExtractor(repoPath)

	// ============================================
	// PARALLEL EXECUTION: Phase 1
	// ============================================

	// 1. File Stats & Language Analysis
	wg.Add(1)
	go func() {
		defer wg.Done()
		stats := fileParser.GetLanguageStats()
		mu.Lock()
		result.Languages = stats
		result.PrimaryLanguage = fileParser.GetPrimaryLanguage(stats)
		mu.Unlock()
	}()

	// 2. Folder Structure Analysis
	wg.Add(1)
	go func() {
		defer wg.Done()
		structure := fileParser.AnalyzeFolderStructure()
		mu.Lock()
		result.FolderStructure = structure
		mu.Unlock()
	}()

	// 3. Code Signals Analysis
	wg.Add(1)
	go func() {
		defer wg.Done()
		codeSig := fileParser.AnalyzeCodeSignals()
		mu.Lock()
		result.CodeSignals = codeSig
		mu.Unlock()
	}()

	// 4. Infrastructure Extraction (The Heavy Lifter)
	var infraSignals *signals.InfrastructureSignals
	wg.Add(1)
	go func() {
		defer wg.Done()
		infraSignals = infraExtractor.Extract()
	}()

	// 5. Advanced Pattern Analysis (Regex Scanning)
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

	// ============================================
	// SEQUENTIAL EXECUTION: Phase 2 (Dependent on Phase 1)
	// ============================================

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

	// Trigger Language Parsers in Parallel
	if hasJSTS {
		wg.Add(1)
		go func() {
			defer wg.Done()
			result.ReactSignals = fileParser.AnalyzeReact()
			result.NodeSignals = fileParser.AnalyzeNode()
		}()
	}
	if hasGo {
		wg.Add(1)
		go func() {
			defer wg.Done()
			result.GoSignals = fileParser.AnalyzeGo()
		}()
	}
	if hasPython {
		wg.Add(1)
		go func() {
			defer wg.Done()
			result.PythonSignals = fileParser.AnalyzePython()
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

	// 3. Architecture Graph Generation
	result.ArchitectureGraph = infraExtractor.GenerateArchitectureGraph()

	// 4. Tech Stack Enrichment (From verified infra signals)
	enrichTechStack(result, infraSignals)

	// Calculate final totals
	for _, lang := range result.Languages {
		result.TotalLines += lang.Lines
		result.TotalFiles += lang.Files
	}

	log.Info().
		Str("projectId", req.ProjectID).
		Str("projectType", string(result.ProjectType)).
		Str("scale", result.Complexity.ScaleLabel).
		Float64("score", result.Complexity.TotalScore).
		Int("skills", result.IndustryAnalysis.TotalSkills).
		Msg("📊 Analysis metrics")

	return result, nil
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

		// DevOps & Cloud
		"docker": "Docker", "kubernetes": "Kubernetes", "aws": "AWS", "gcp": "Google Cloud",
		"azure": "Azure", "terraform": "Terraform", "github_actions": "GitHub Actions",
		"jenkins": "Jenkins", "gitlab_ci": "GitLab CI", "vercel": "Vercel", "netlify": "Netlify",

		// Message Queues
		"kafka": "Kafka", "rabbitmq": "RabbitMQ", "sqs": "AWS SQS", "nats": "NATS",

		// Frameworks & Libs
		"react": "React", "nextjs": "Next.js", "nestjs": "NestJS", "express": "Express",
		"gin": "Gin", "django": "Django", "flask": "Flask", "fastapi": "FastAPI",
		"graphql": "GraphQL", "grpc": "gRPC", "tailwind": "Tailwind CSS",
		"redux": "Redux", "socketio": "Socket.io",
	}

	// Frameworks
	if infra.HasSignal(signals.SignalReact) {
		result.Frameworks = append(result.Frameworks, "React")
	}
	if infra.HasSignal(signals.SignalNextJS) {
		result.Frameworks = append(result.Frameworks, "Next.js")
	}
	if infra.HasSignal(signals.SignalNestJS) {
		result.Frameworks = append(result.Frameworks, "NestJS")
	}
	if infra.HasSignal(signals.SignalExpress) {
		result.Frameworks = append(result.Frameworks, "Express")
	}
	if infra.HasSignal(signals.SignalGin) {
		result.Frameworks = append(result.Frameworks, "Gin")
	}
	if infra.HasSignal(signals.SignalDjango) {
		result.Frameworks = append(result.Frameworks, "Django")
	}

	// Use mapping for the rest
	// Note: In a real prod scenario, this mapping should be in a separate config file
	uniqeTech := make(map[string]bool)

	// Add existing
	for _, t := range result.Databases {
		uniqeTech[t] = true
	}
	for _, t := range result.Tools {
		uniqeTech[t] = true
	}
	for _, t := range result.Frameworks {
		uniqeTech[t] = true
	}

	// Enrich from signals
	for signal := range infra.SignalDetails {
		sigStr := string(signal)
		if name, ok := mapping[sigStr]; ok {
			if !uniqeTech[name] {
				// Determine category simply
				if isDatabase(name) {
					result.Databases = append(result.Databases, name)
				} else if isTool(name) {
					result.Tools = append(result.Tools, name)
				} else {
					result.Frameworks = append(result.Frameworks, name)
				}
				uniqeTech[name] = true
			}
		}
	}
}

func isDatabase(name string) bool {
	dbs := []string{"PostgreSQL", "MySQL", "MongoDB", "Redis", "DynamoDB", "Cassandra", "Elasticsearch", "SQLite", "MariaDB", "Firestore"}
	for _, d := range dbs {
		if d == name {
			return true
		}
	}
	return false
}

func isTool(name string) bool {
	tools := []string{"Docker", "Kubernetes", "AWS", "Google Cloud", "Azure", "Terraform", "GitHub Actions", "Jenkins", "GitLab CI", "Kafka", "RabbitMQ"}
	for _, t := range tools {
		if t == name {
			return true
		}
	}
	return false
}
