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
	"github.com/verifydev/project-analyzer/internal/intelligence"
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

	// Extract user project type for routing decisions
	userProjectType := req.UserProjectType // backend, frontend, fullstack, ml, library
	log.Debug().Str("userProjectType", userProjectType).Msg("Project type routing enabled")

	var wg sync.WaitGroup
	var mu sync.Mutex

	fileParser := parser.NewFileParser(repoPath)
	infraExtractor := parser.NewInfraExtractor(repoPath, userProjectType)

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
	}

	// Calculate final totals
	for _, lang := range result.Languages {
		result.TotalLines += lang.Lines
		result.TotalFiles += lang.Files
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

		// Strict Skill Filtering for Backend
		if result.IndustryAnalysis != nil {
			var filteredSkills []signals.VerifiedSkill
			for _, skill := range result.IndustryAnalysis.VerifiedSkills {
				if skill.Category != "frontend" {
					filteredSkills = append(filteredSkills, skill)
				}
			}
			result.IndustryAnalysis.VerifiedSkills = filteredSkills
		}

		// Filter Frameworks (remove React/Next/Vue)
		var filteredFrameworks []string
		for _, fw := range result.Frameworks {
			if fw != "React" && fw != "Vue.js" && fw != "Angular" && fw != "Svelte" && fw != "Tailwind CSS" {
				filteredFrameworks = append(filteredFrameworks, fw)
			}
		}
		result.Frameworks = filteredFrameworks

		log.Debug().Msg("Filtered out frontend signals for backend project")

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
			fs.ServiceCount = 2 // Minimal assumption
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
			Name:        skill.Name,
			Category:    skill.Category,
			Confidence:  skill.Confidence,
			Evidence:    skill.Evidence,
			ResumeReady: skill.ResumeReady,
		})
	}

	return verdict
}
