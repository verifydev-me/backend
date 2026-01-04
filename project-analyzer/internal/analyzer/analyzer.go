package analyzer

import (
	"context"
	"encoding/json"
	"os"
	"strings"
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

	// 2. Parse files
	fileParser := parser.NewFileParser(repoPath)

	// 3. Build signals
	langStats := fileParser.GetLanguageStats()
	primaryLang := fileParser.GetPrimaryLanguage(langStats)
	folderStructure := fileParser.AnalyzeFolderStructure()
	codeSignals := fileParser.AnalyzeCodeSignals()

	result := &signals.ProjectSignals{
		ProjectID:       req.ProjectID,
		UserID:          req.UserID,
		RepoURL:         req.RepoURL,
		PrimaryLanguage: primaryLang,
		Languages:       langStats,
		FolderStructure: folderStructure,
		CodeSignals:     codeSignals,
		AnalyzedAt:      time.Now().Format(time.RFC3339),
		AnalysisVersion: "2.0.0", // Updated version with enhanced analysis
	}

	// Detect project type
	result.ProjectType = fileParser.DetectProjectType(folderStructure, codeSignals)

	// Detect frameworks based on package files
	result.Frameworks = a.detectFrameworks(repoPath)
	result.Databases = a.detectDatabases(repoPath)
	result.Tools = a.detectTools(repoPath)

	// Framework-specific analysis
	if primaryLang == "JavaScript" || primaryLang == "TypeScript" {
		// React detection
		reactSignals := fileParser.AnalyzeReact()
		if reactSignals != nil {
			result.ReactSignals = reactSignals
		}
		// Node.js detection
		nodeSignals := fileParser.AnalyzeNode()
		if nodeSignals != nil {
			result.NodeSignals = nodeSignals
		}
	}

	// Go-specific analysis
	if primaryLang == "Go" {
		goSignals := fileParser.AnalyzeGo()
		if goSignals != nil {
			result.GoSignals = goSignals
		}
	}

	// Python-specific analysis
	if primaryLang == "Python" {
		pythonSignals := fileParser.AnalyzePython()
		if pythonSignals != nil {
			result.PythonSignals = pythonSignals
		}
	}

	// Advanced patterns analysis (language agnostic)
	result.AdvancedPatterns = fileParser.AnalyzeAdvancedPatterns()

	// ============================================
	// INDUSTRY-LEVEL ANALYSIS (3-Layer Pipeline)
	// ============================================
	// Layer 1: Extract infrastructure signals (raw facts)
	infraExtractor := parser.NewInfraExtractor(repoPath)
	infraSignals := infraExtractor.Extract()

	// Layer 2: Infer verified skills from signals (deterministic rules)
	inferenceEngine := parser.NewInferenceEngine()
	industryAnalysis := inferenceEngine.InferSkills(infraSignals)

	// Attach to result
	result.IndustryAnalysis = industryAnalysis

	log.Info().
		Str("projectId", req.ProjectID).
		Int("verifiedSkills", industryAnalysis.TotalSkills).
		Int("highConfidence", industryAnalysis.HighConfidenceSkills).
		Str("archType", string(industryAnalysis.Architecture.Type)).
		Str("engLevel", industryAnalysis.EngineeringLevel).
		Msg("🏭 Industry analysis complete")

	// Calculate totals
	for _, lang := range langStats {
		result.TotalLines += lang.Lines
		result.TotalFiles += lang.Files
	}

	log.Info().
		Str("projectId", req.ProjectID).
		Str("projectType", string(result.ProjectType)).
		Str("primaryLang", primaryLang).
		Int("totalLines", result.TotalLines).
		Int("totalFiles", result.TotalFiles).
		Msg("📊 Analysis metrics")

	return result, nil
}

// detectFrameworks checks for popular frameworks
func (a *Analyzer) detectFrameworks(repoPath string) []string {
	var frameworks []string

	// Check package.json for JS/TS
	pkgContent := readFileContent(repoPath, "package.json")
	if pkgContent != "" {
		checks := map[string]string{
			"react":   "React",
			"next":    "Next.js",
			"vue":     "Vue",
			"nuxt":    "Nuxt",
			"angular": "Angular",
			"svelte":  "Svelte",
			"express": "Express",
			"fastify": "Fastify",
			"@nestjs": "NestJS",
			"koa":     "Koa",
		}
		for pkg, name := range checks {
			if containsIgnoreCase(pkgContent, pkg) {
				frameworks = append(frameworks, name)
			}
		}
	}

	// Check go.mod for Go
	goMod := readFileContent(repoPath, "go.mod")
	if goMod != "" {
		goChecks := map[string]string{
			"gin-gonic/gin": "Gin",
			"echo":          "Echo",
			"fiber":         "Fiber",
			"chi":           "Chi",
			"gorilla/mux":   "Gorilla",
		}
		for pkg, name := range goChecks {
			if containsIgnoreCase(goMod, pkg) {
				frameworks = append(frameworks, name)
			}
		}
	}

	// Check requirements.txt for Python
	pyReq := readFileContent(repoPath, "requirements.txt")
	if pyReq != "" {
		pyChecks := map[string]string{
			"django":  "Django",
			"flask":   "Flask",
			"fastapi": "FastAPI",
		}
		for pkg, name := range pyChecks {
			if containsIgnoreCase(pyReq, pkg) {
				frameworks = append(frameworks, name)
			}
		}
	}

	return frameworks
}

// detectDatabases checks for database usage
func (a *Analyzer) detectDatabases(repoPath string) []string {
	var databases []string

	pkgContent := readFileContent(repoPath, "package.json")
	goMod := readFileContent(repoPath, "go.mod")
	content := pkgContent + goMod

	checks := map[string]string{
		"prisma":    "PostgreSQL (Prisma)",
		"pg":        "PostgreSQL",
		"mysql":     "MySQL",
		"mongodb":   "MongoDB",
		"mongoose":  "MongoDB",
		"redis":     "Redis",
		"ioredis":   "Redis",
		"sqlite":    "SQLite",
		"typeorm":   "TypeORM",
		"sequelize": "Sequelize",
		"go-pg":     "PostgreSQL",
		"gorm":      "GORM",
	}

	for pkg, name := range checks {
		if containsIgnoreCase(content, pkg) {
			databases = append(databases, name)
		}
	}

	return databases
}

// detectTools checks for development tools
func (a *Analyzer) detectTools(repoPath string) []string {
	var tools []string

	pkgContent := readFileContent(repoPath, "package.json")

	checks := map[string]string{
		"eslint":     "ESLint",
		"prettier":   "Prettier",
		"jest":       "Jest",
		"vitest":     "Vitest",
		"mocha":      "Mocha",
		"cypress":    "Cypress",
		"playwright": "Playwright",
		"docker":     "Docker",
		"webpack":    "Webpack",
		"vite":       "Vite",
		"rollup":     "Rollup",
		"husky":      "Husky",
	}

	for pkg, name := range checks {
		if containsIgnoreCase(pkgContent, pkg) {
			tools = append(tools, name)
		}
	}

	return tools
}

// Helper functions
func readFileContent(repoPath, filename string) string {
	content, err := os.ReadFile(repoPath + "/" + filename)
	if err != nil {
		return ""
	}
	return string(content)
}

func containsIgnoreCase(s, substr string) bool {
	return strings.Contains(strings.ToLower(s), strings.ToLower(substr))
}
