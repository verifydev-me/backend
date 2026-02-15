package analyzer

// ============================================
// CORE ORCHESTRATOR
// Entry point for analysis: message handling,
// worker pool management, and analysis pipeline
//
// Related files in this package:
//   - filtering.go   → Signal filtering by project type
//   - enrichment.go  → Tech stack, trust, dimensional analysis
//   - mapping.go     → Type conversion (intelligence → API types)
//   - detection.go   → Quick project type detection & helpers
//   - security.go    → Security vulnerability scanning
// ============================================

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
	"github.com/rs/zerolog/log"

	astengine "github.com/verifydev/project-analyzer/internal/ast"
	confengine "github.com/verifydev/project-analyzer/internal/confidence"
	"github.com/verifydev/project-analyzer/internal/config"
	"github.com/verifydev/project-analyzer/internal/debug"
	"github.com/verifydev/project-analyzer/internal/extractor"

	"github.com/verifydev/project-analyzer/internal/git"
	"github.com/verifydev/project-analyzer/internal/graph"
	"github.com/verifydev/project-analyzer/internal/inference"
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

// StartWithWorkerPool begins consuming messages with concurrent workers
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

	// Generate Compact Payload for AI (Gemini)
	// This is much smaller (~3KB vs 50KB) and optimized for LLM token usage
	result.CompactOutput = CompactForAI(result)

	// Trim payload — remove internal-only data before RabbitMQ publish
	slimResult := trimForPublish(result)

	// Publish result to aura processor
	if err := a.rabbit.Publish(ctx, slimResult); err != nil {
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
	// Wire debug tracer for full request lifecycle tracing
	tracer := debug.NewTracer(req.ProjectID)
	defer tracer.TraceSpan("analyze:" + req.ProjectID)()

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
	infraExtractor := extractor.NewInfraExtractor(analysisRoot, userProjectType)

	// ============================================
	// PARALLEL EXECUTION: Phase 1 (Project-Type-Aware)
	// ============================================

	// PHASE 0: Quick project type pre-detection when userProjectType is empty
	// This prevents running ALL parsers when the type can be inferred from folder structure
	effectiveProjectType := userProjectType
	if effectiveProjectType == "" {
		effectiveProjectType = quickDetectProjectType(analysisRoot)
		log.Info().
			Str("autoDetected", effectiveProjectType).
			Msg("🔍 Auto-detected project type (userProjectType was empty)")
	}

	// Complete routing logic based on effectiveProjectType
	// frontend → only frontend analysis
	// backend → only backend analysis
	// fullstack → BOTH frontend + backend
	// ml → ML-specific + backend
	// library → all analysis
	runFrontend := effectiveProjectType == "frontend" || effectiveProjectType == "fullstack" || effectiveProjectType == "library"
	runBackend := effectiveProjectType == "backend" || effectiveProjectType == "fullstack" || effectiveProjectType == "ml" || effectiveProjectType == "library"
	runML := effectiveProjectType == "ml"

	log.Info().
		Str("userProjectType", userProjectType).
		Str("effectiveProjectType", effectiveProjectType).
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

	// 6. AST Deep Analysis (Multi-language - Run for ALL types)
	var astResult *astengine.ProjectASTResult
	wg.Add(1)
	go func() {
		defer wg.Done()
		log.Info().Msg("🧬 Running AST Deep Analysis (TypeScript + Go + Python)...")
		astAnalyzer := astengine.NewProjectAnalyzer(analysisRoot)
		astResult = astAnalyzer.Analyze()
		log.Info().
			Int("files", astResult.Summary.TotalFiles).
			Int("technologies", len(astResult.TechnologyUsage)).
			Int("patterns", astResult.Summary.TotalPatterns).
			Msg("✅ AST Deep Analysis complete")
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

	// NOTE: Git Forensics REMOVED from Go engine.
	// Authenticity data now fetched via GitHub APIs in user-service.
	tracer.StartSpan("Phase2:Sequential")

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
	tracer.EndSpan() // End Phase2:Sequential
	tracer.StartSpan("Phase3:InferenceScoring")

	// 0. Map AST results to ProjectSignals
	if astResult != nil {
		result.ASTDeepAnalysis = mapASTToSignals(astResult)
		log.Info().
			Int("technologies", len(result.ASTDeepAnalysis.DetectedTechnologies)).
			Int("patterns", len(result.ASTDeepAnalysis.Patterns)).
			Str("complexity", result.ASTDeepAnalysis.ComplexityLevel).
			Msg("📊 AST Deep Analysis mapped to signals")
	}

	// 0.5 Phase 2: Build Technology Dependency Graph
	log.Info().Msg("🔗 Building Technology Dependency Graph (Phase 2)...")
	graphBuilder := graph.NewBuilder()
	techGraph := graphBuilder.BuildFromSources(astResult, infraSignals)
	graphAnalysis := graphBuilder.Analyze()

	// Map graph results to ProjectSignals
	result.TechDependencyGraph = mapGraphToSignals(techGraph, graphAnalysis)
	log.Info().
		Int("nodes", graphAnalysis.TotalNodes).
		Int("edges", graphAnalysis.TotalEdges).
		Int("stacks", len(graphAnalysis.DetectedStacks)).
		Int("inferredSkills", len(graphAnalysis.InferredSkills)).
		Msg("✅ Technology Graph analysis complete")

	// 1. Complexity Score
	result.Complexity = infraExtractor.CalculateComplexity()

	// 2. Verified Skills Inference
	inferenceEngine := inference.NewInferenceEngine()
	result.IndustryAnalysis = inferenceEngine.InferSkills(infraSignals)

	// NOTE: Authorship penalty is REMOVED here to avoid double penalty.
	// The Bayesian engine (Phase 3) already applies authorship dampening
	// via gitWeight = AuthorshipFactor * MaturityFactor in its posterior calculation.
	// Applying it here AND in Bayesian would crush legitimate skills.

	// 3. Architecture Graph Generation
	result.ArchitectureGraph = infraExtractor.GenerateArchitectureGraph()

	// 4. Tech Stack Enrichment (From verified infra signals)
	enrichTechStack(result, infraSignals)

	// ============================================
	// AUTONOMOUS INTELLIGENCE ENGINE: Phase 4
	// ============================================
	tracer.EndSpan() // End Phase3
	tracer.StartSpan("Phase4:Intelligence")
	intelligencePipeline := intelligence.NewPipeline(repoPath, req.Niche, req.UserProjectType)

	// PROD OPTIMIZATION: Inject pre-computed signals to skip redundant scanning
	// This prevents the intelligence engine from re-walking the entire file system
	fastSignals := mapToFastSignals(result, infraSignals)
	// Compute confidence from the mapped signals
	confidence := intelligence.ComputeSignalConfidence(fastSignals)
	intelligencePipeline.SetPrecomputedSignals(fastSignals, confidence)
	// NOTE: SetGitForensics removed — forensics handled externally

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

	// ============================================
	// SIGNAL FILTERING (BEFORE Bayesian)
	// Must run BEFORE Bayesian sync so that Phase B
	// (adding new skills from graph/AST) doesn't get
	// destroyed by the filter pass.
	// ============================================
	filterProjectType := effectiveProjectType
	if filterProjectType == "" {
		switch result.ProjectType {
		case signals.ProjectTypeFrontend:
			filterProjectType = "frontend"
		case signals.ProjectTypeBackend, signals.ProjectTypeAPI:
			filterProjectType = "backend"
		case signals.ProjectTypeFullstack, signals.ProjectTypeMonorepo:
			filterProjectType = "fullstack"
		default:
			filterProjectType = "fullstack"
		}
		log.Info().
			Str("fallbackFilterType", filterProjectType).
			Str("autoProjectType", string(result.ProjectType)).
			Msg("🔄 Using auto-detected ProjectType for signal filtering")
	}
	filterSignalsByProjectType(result, filterProjectType)

	// ============================================
	// BAYESIAN CONFIDENCE ENGINE: Phase 3
	// Final confidence calibration using all prior data
	// ============================================
	tracer.EndSpan() // End Phase4 or filter
	tracer.StartSpan("Phase5:BayesianConfidence")
	log.Info().Msg("🔬 Running Bayesian Confidence Engine (Phase 3)...")
	confEngine := confengine.NewEngine()
	confEngine.SetAST(astResult)
	confEngine.SetGraph(graphAnalysis)
	confEngine.SetInfra(infraSignals)
	confEngine.SetIndustry(result.IndustryAnalysis)
	// NOTE: SetForensics removed — forensics handled externally
	confEngine.SetCodeSignals(&result.CodeSignals)

	confReport := confEngine.Run()
	result.ConfidenceReport = mapConfidenceToSignals(confReport)
	log.Info().
		Float64("ensembleScore", confReport.EnsembleVerdict.FinalScore).
		Str("scoreLabel", confReport.EnsembleVerdict.ScoreLabel).
		Int("resumeReady", confReport.EnsembleVerdict.ResumeReadySkills).
		Float64("analysisConf", confReport.AnalysisConfidence).
		Msg("✅ Phase 3: Bayesian Confidence Engine complete")

	// ============================================
	// BAYESIAN → VERIFIED SKILLS SYNC
	// Apply Bayesian posteriors to IndustryAnalysis.VerifiedSkills
	// so aura-processor stores calibrated confidence values
	// ============================================
	syncBayesianConfidenceToSkills(result)

	// ============================================
	// DEEP EVIDENCE ENRICHMENT (Phase 6)
	// Extract granular, pattern-based evidence from graph clusters
	// Must run AFTER Bayesian sync (all skills finalized)
	// ============================================
	enrichSkillsWithDeepEvidence(result)

	// TotalLines was set in Phase 1 line ~244, TotalFiles was set by language parser.
	// Only compute here if they haven't been set yet (defensive)
	if result.TotalLines == 0 || result.TotalFiles == 0 {
		for _, lang := range result.Languages {
			result.TotalLines += lang.Lines
			result.TotalFiles += lang.Files
		}
	}

	// NOTE: Signal filtering was already applied BEFORE Bayesian sync
	// (see above). This ensures Bayesian Phase B skills aren't destroyed.

	tracer.EndSpan() // End Phase5:BayesianConfidence

	// Print trace tree (debug level)
	tracer.PrintTrace()

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
