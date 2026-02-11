package intelligence

import (
	"context"
	"time"

	"github.com/rs/zerolog/log"
	"github.com/verifydev/project-analyzer/pkg/signals"
)

// ============================================
// INTELLIGENCE PIPELINE ORCHESTRATOR
// Runs the 7-stage autonomous analysis pipeline
// Uses context for cancellation and timeout
// Implements early termination for efficiency
// ============================================

// Pipeline orchestrates the intelligence analysis
type Pipeline struct {
	repoPath        string
	niche           string
	userProjectType string
	timeout         time.Duration

	// Pre-computed signals to bypass Stage 1 scan
	preComputedSignals    *FastSignals
	preComputedConfidence *SignalConfidenceVector
	gitForensicsVerdict   *signals.AuthorshipVerdict

	// NEW: Context
	astReport      *ASTReport
	securityReport *SecurityReport
}

// PipelineResult contains complete analysis output
type PipelineResult struct {
	// Fast signals
	Signals    *FastSignals            `json:"signals"`
	Confidence *SignalConfidenceVector `json:"confidence"`

	// Inferred properties
	Intent     ProjectIntent      `json:"intent"`
	DevLevel   DeveloperLevel     `json:"devLevel"`
	ArchIntent ArchitectureIntent `json:"archIntent"`

	// Module routing
	ModulesExecuted []string `json:"modulesExecuted"`
	ModulesSkipped  []string `json:"modulesSkipped"`

	// Final verdict
	Verdict *Verdict `json:"verdict"`

	// Metadata
	AnalysisTimeMs   int64  `json:"analysisTimeMs"`
	EarlyTermination bool   `json:"earlyTermination"`
	ExitReason       string `json:"exitReason,omitempty"`
}

// NewPipeline creates a new intelligence pipeline
func NewPipeline(repoPath, niche, userProjectType string) *Pipeline {
	return &Pipeline{
		repoPath:        repoPath,
		niche:           niche,
		userProjectType: userProjectType,
		timeout:         10 * time.Second, // Increased from 1s — 1s was too aggressive and caused premature termination
	}
}

// SetPrecomputedSignals allows injecting signals to bypass the internal scan
func (p *Pipeline) SetPrecomputedSignals(signals *FastSignals, confidence *SignalConfidenceVector) {
	p.preComputedSignals = signals
	p.preComputedConfidence = confidence
}

// SetGitForensics injects authenticity verification results
func (p *Pipeline) SetGitForensics(verdict *signals.AuthorshipVerdict) {
	p.gitForensicsVerdict = verdict
}

// Run executes the full intelligence pipeline
func (p *Pipeline) Run(ctx context.Context) (*PipelineResult, error) {
	start := time.Now()

	// Create context with timeout
	ctx, cancel := context.WithTimeout(ctx, p.timeout)
	defer cancel()

	result := &PipelineResult{}

	// ============================================
	// STAGE 1: FAST SIGNAL SCAN
	// ============================================
	log.Debug().Str("repoPath", p.repoPath).Msg("Stage 1: Signal scanning")

	var signals *FastSignals
	var confidence *SignalConfidenceVector
	var err error

	if p.preComputedSignals != nil {
		log.Debug().Msg("⚡ Using pre-computed signals (skipping redundant scan)")
		signals = p.preComputedSignals
		confidence = p.preComputedConfidence
	} else {
		// Fallback to internal scan (legacy/standalone mode)
		scanner := NewSignalScanner(p.repoPath)
		signals, confidence, err = scanner.Scan()
		if err != nil {
			return nil, err
		}
	}

	result.Signals = signals
	result.Confidence = confidence

	// Check for timeout
	select {
	case <-ctx.Done():
		result.EarlyTermination = true
		result.ExitReason = string(ExitTimeout)
		result.AnalysisTimeMs = time.Since(start).Milliseconds()
		return result, nil
	default:
	}

	// ============================================
	// STAGE 2: INTENT INFERENCE
	// ============================================
	log.Debug().Msg("Stage 2: Intent inference")

	inferer := NewIntentInferer(signals, confidence)
	intent, devLevel, archIntent := inferer.InferIntent()
	result.Intent = intent
	result.DevLevel = devLevel
	result.ArchIntent = archIntent

	// ============================================
	// STAGE 3: MODULE ROUTING
	// ============================================
	log.Debug().Msg("Stage 3: Module routing")

	router := NewModuleRouter(signals, confidence, p.niche, p.userProjectType)
	selection := router.Route()
	result.ModulesExecuted = router.GetModuleNames(selection.SelectedModules)
	result.ModulesSkipped = router.GetModuleNames(selection.SkippedModules)

	// ============================================
	// STAGE 4: EARLY TERMINATION CHECK
	// ============================================
	exitDecision := p.checkEarlyExit(confidence, signals, intent)
	if exitDecision.ShouldExit {
		log.Debug().
			Str("reason", string(exitDecision.Reason)).
			Float64("confidence", exitDecision.ConfidenceAtExit).
			Msg("Early termination triggered")

		result.EarlyTermination = true
		result.ExitReason = string(exitDecision.Reason)

		// Still generate minimal verdict
		suggGen := NewSuggestionGenerator(signals, confidence, intent, devLevel)
		suggestions := suggGen.GenerateSuggestions()

		skills := p.extractBasicSkills(signals)

		verdictEngine := NewVerdictEngine(signals, confidence, intent, devLevel, archIntent, suggestions, skills, p.gitForensicsVerdict)
		result.Verdict = verdictEngine.GenerateVerdict()
		result.Verdict.EarlyTermination = true
		result.Verdict.ExitReason = string(exitDecision.Reason)
		result.AnalysisTimeMs = time.Since(start).Milliseconds()
		result.Verdict.AnalysisTimeMs = result.AnalysisTimeMs

		return result, nil
	}

	// ============================================
	// STAGE 5: STACK-SPECIFIC ANALYSIS
	// Pattern-based, NOT line-by-line
	// ============================================
	log.Debug().Msg("Stage 5: Stack-specific analysis")

	stackResults := p.runStackAnalyzers(signals, selection)

	// Merge stack analysis findings into signals
	for _, sr := range stackResults {
		for _, risk := range sr.Risks {
			signals.DetectedRisks = append(signals.DetectedRisks, risk)
		}
		for _, strength := range sr.Strengths {
			signals.DetectedStrengths = append(signals.DetectedStrengths, strength)
		}
	}

	// Check for timeout
	select {
	case <-ctx.Done():
		result.EarlyTermination = true
		result.ExitReason = string(ExitTimeout)
		result.AnalysisTimeMs = time.Since(start).Milliseconds()
		return result, nil
	default:
	}

	// ============================================
	// STAGE 6: SUGGESTION GENERATION
	// ============================================
	log.Debug().Msg("Stage 6: Suggestion generation")

	suggGen := NewSuggestionGenerator(signals, confidence, intent, devLevel)
	suggestions := suggGen.GenerateSuggestions()

	// ============================================
	// STAGE 7: SKILL EXTRACTION
	// ============================================
	log.Debug().Msg("Stage 7: Skill extraction")

	skills := p.extractSkills(signals, confidence, archIntent)

	// ============================================
	// STAGE 8: VERDICT GENERATION
	// ============================================
	log.Debug().Msg("Stage 8: Verdict generation")

	verdictEngine := NewVerdictEngine(signals, confidence, intent, devLevel, archIntent, suggestions, skills, p.gitForensicsVerdict)
	result.Verdict = verdictEngine.GenerateVerdict()
	result.Verdict.ModulesExecuted = result.ModulesExecuted
	result.Verdict.ModulesSkipped = result.ModulesSkipped

	result.AnalysisTimeMs = time.Since(start).Milliseconds()
	result.Verdict.AnalysisTimeMs = result.AnalysisTimeMs

	log.Debug().
		Int64("timeMs", result.AnalysisTimeMs).
		Int("modulesRun", len(result.ModulesExecuted)).
		Int("modulesSkipped", len(result.ModulesSkipped)).
		Msg("Pipeline completed")

	return result, nil
}

// checkEarlyExit determines if we can safely exit early
func (p *Pipeline) checkEarlyExit(confidence *SignalConfidenceVector, signals *FastSignals, intent ProjectIntent) *EarlyExitDecision {
	decision := &EarlyExitDecision{
		ConfidenceAtExit: confidence.OverallConfidence(),
	}

	// CRITICAL: Never early-exit ML/Data Science projects
	// ML projects often use Jupyter notebooks (.ipynb) which aren't counted as code files,
	// leading to premature termination before ML-specific analysis runs
	if p.userProjectType == "ml" || p.hasMLSignals(signals) {
		log.Debug().
			Str("userProjectType", p.userProjectType).
			Bool("hasMLSignals", p.hasMLSignals(signals)).
			Msg("Skipping early exit for ML/Data Science project")
		return decision // ShouldExit = false
	}

	// Rule 1: High confidence threshold (weighted > 80%)
	if confidence.OverallConfidence() > 0.80 {
		// Check for blocking risks
		risks := p.detectBlockingRisks(signals)
		if len(risks) == 0 {
			decision.ShouldExit = true
			decision.Reason = ExitConfidenceThreshold
			return decision
		}
		decision.RisksDetected = risks
	}

	// Rule 2: High architecture clarity + low project size
	if confidence.ArchitectureConfidence > 0.75 && signals.CodeFiles < 30 {
		risks := p.detectBlockingRisks(signals)
		if len(risks) == 0 {
			decision.ShouldExit = true
			decision.Reason = ExitHighArchitectureClarity
			return decision
		}
	}

	// Rule 3: Strong pattern consistency
	if p.hasStrongPatternConsistency(signals) {
		decision.ShouldExit = true
		decision.Reason = ExitStrongPatternConsistency
		return decision
	}

	// Rule 4: Learning/Hobby projects with low complexity
	if (intent == IntentLearning || intent == IntentHobby) && signals.CodeFiles < 20 {
		decision.ShouldExit = true
		decision.Reason = ExitLowRiskSurface
		return decision
	}

	return decision
}

// detectBlockingRisks finds signals that prevent early exit
func (p *Pipeline) detectBlockingRisks(signals *FastSignals) []string {
	risks := []string{}

	// No tests in non-trivial project
	if !signals.HasTests && signals.CodeFiles > 15 {
		risks = append(risks, "missing_tests_in_complex_project")
	}

	// Conflicting patterns (e.g., microservices without Docker)
	if signals.HasMicroservices && !signals.HasDockerfile {
		risks = append(risks, "microservices_without_containerization")
	}

	// ML project without validation
	if signals.HasMLMarkers && !signals.HasTests {
		risks = append(risks, "ml_without_validation")
	}

	return risks
}

// hasStrongPatternConsistency checks for consistent coding patterns
func (p *Pipeline) hasStrongPatternConsistency(signals *FastSignals) bool {
	// Go standard layout
	if signals.DominantLanguage == "Go" &&
		signals.HasInternalFolder && signals.HasCmdFolder &&
		signals.HasTests && signals.HasDockerfile {
		return true
	}

	// Full production pipeline
	if signals.HasDockerfile && signals.HasCI && signals.HasTests && signals.HasLinting {
		return true
	}

	return false
}

// hasMLSignals detects if project has ML/Data Science characteristics
func (p *Pipeline) hasMLSignals(signals *FastSignals) bool {
	// Check for ML markers (sklearn, tensorflow, pytorch, etc.)
	if signals.HasMLMarkers {
		return true
	}

	// Check for Jupyter notebooks
	if signals.HasNotebooks {
		return true
	}

	// Python-dominant projects are often ML/DS
	if signals.DominantLanguage == "Python" || signals.DominantLanguage == "Jupyter Notebook" {
		return true
	}

	return false
}

// extractBasicSkills extracts skills with minimal analysis (for early exit)
func (p *Pipeline) extractBasicSkills(signals *FastSignals) []ExtractedSkill {
	skills := []ExtractedSkill{}

	// Primary language
	if signals.DominantLanguage != "" {
		skill := ExtractedSkill{
			Name:       signals.DominantLanguage,
			Category:   "Language",
			Evidence:   []string{"Primary language detected"},
			UsageDepth: signals.LanguagePercentage,
		}
		skill.ComputeConfidence()
		skills = append(skills, skill)
	}

	// Frameworks
	for _, fw := range signals.DetectedFrameworks {
		skill := ExtractedSkill{
			Name:       fw,
			Category:   "Framework",
			Evidence:   []string{"Framework detected in configuration"},
			UsageDepth: 0.7,
		}
		skill.ComputeConfidence()
		skills = append(skills, skill)
	}

	// Databases (Basic extraction)
	for _, db := range signals.DetectedDatabases {
		skill := ExtractedSkill{
			Name:       db,
			Category:   "Database",
			Evidence:   []string{"Database detected in configuration"},
			UsageDepth: 0.7,
		}
		skill.ComputeConfidence()
		skills = append(skills, skill)
	}

	// Infra (Basic extraction)
	for _, infra := range signals.DetectedInfra {
		skill := ExtractedSkill{
			Name:       infra,
			Category:   "Infrastructure",
			Evidence:   []string{"Infrastructure detecting in configuration"},
			UsageDepth: 0.7,
		}
		skill.ComputeConfidence()
		skills = append(skills, skill)
	}

	// USAGE VERIFICATION (CRITICAL FIX)
	// Even for early exit, we MUST verify usage to show the "Verified" badge.
	// Since early exit implies small project, this file walk is cheap.
	usageVerdicts := VerifyAllUsage(p.repoPath, signals)

	for i := range skills {
		if verdict, ok := usageVerdicts[skills[i].Name]; ok {
			skills[i].UsageVerified = verdict.UsageVerified
			skills[i].UsageStrength = verdict.UsageStrength
			for _, ev := range verdict.Evidence {
				skills[i].Evidence = append(skills[i].Evidence, ev.Description)
			}
			// Apply boost to confidence if verified
			if skills[i].UsageVerified && skills[i].Confidence < 90 {
				skills[i].Confidence = 90
			}
		}
	}

	return skills
}

// extractSkills extracts skills with full analysis
func (p *Pipeline) extractSkills(signals *FastSignals, confidence *SignalConfidenceVector, archIntent ArchitectureIntent) []ExtractedSkill {
	skills := []ExtractedSkill{}

	// Primary language with architecture context
	if signals.DominantLanguage != "" {
		skill := ExtractedSkill{
			Name:     signals.DominantLanguage,
			Category: "Language",
			Evidence: []string{"Primary language detected"},
		}

		// Usage depth based on file percentage
		skill.UsageDepth = signals.LanguagePercentage

		// Architecture usage based on confidence
		skill.ArchUsage = confidence.ArchitectureConfidence

		// Best practices based on patterns
		if signals.HasTests {
			skill.BestPractice += 0.3
		}
		if signals.HasLinting {
			skill.BestPractice += 0.2
		}
		if signals.HasDockerfile {
			skill.BestPractice += 0.2
		}
		if signals.HasCI {
			skill.BestPractice += 0.3
		}

		// Complexity based on project size
		if signals.CodeFiles > 50 {
			skill.Complexity = 1.0
		} else if signals.CodeFiles > 20 {
			skill.Complexity = 0.7
		} else {
			skill.Complexity = 0.4
		}

		skill.ComputeConfidence()

		// Add specific evidence
		if signals.HasTests {
			skill.Evidence = append(skill.Evidence, "Test coverage present")
		}
		if archIntent == ArchSophisticated {
			skill.Evidence = append(skill.Evidence, "Sophisticated architecture")
		}

		skills = append(skills, skill)
	}

	// Frameworks with context
	for _, fw := range signals.DetectedFrameworks {
		skill := ExtractedSkill{
			Name:       fw,
			Category:   "Framework",
			Evidence:   []string{"Framework detected in configuration"},
			UsageDepth: 0.7,
			ArchUsage:  confidence.FrameworkConfidence,
		}
		skill.ComputeConfidence()
		skills = append(skills, skill)
	}

	// CRITICAL FIX: Add Database loops (was missing!)
	// Databases with context
	for _, db := range signals.DetectedDatabases {
		skill := ExtractedSkill{
			Name:       db,
			Category:   "Database",
			Evidence:   []string{"Database detected in configuration"},
			UsageDepth: 0.7,
			ArchUsage:  confidence.FrameworkConfidence,
		}
		skill.ComputeConfidence() // Will get boosted to 85-95% with package.json + schema evidence!
		skills = append(skills, skill)
	}

	// Infrastructure/Messaging (Kafka, Redis, RabbitMQ)
	for _, infra := range signals.DetectedInfra {
		skill := ExtractedSkill{
			Name:       infra,
			Category:   "Infrastructure",
			Evidence:   []string{"Infrastructure detected in configuration"},
			UsageDepth: 0.7,
			ArchUsage:  confidence.InfraConfidence,
		}
		skill.ComputeConfidence() // Will get boosted with docker-compose + package evidence!
		skills = append(skills, skill)
	}

	// Infrastructure skills — only add if NOT already in DetectedInfra (prevents duplicates)
	dockerAlreadyAdded := false
	for _, infra := range signals.DetectedInfra {
		if infra == "Docker" || infra == "Docker & Containerization" {
			dockerAlreadyAdded = true
		}
	}

	if signals.HasDockerfile && !dockerAlreadyAdded {
		skill := ExtractedSkill{
			Name:       "Docker",
			Category:   "Infrastructure",
			Evidence:   []string{"Dockerfile present"},
			UsageDepth: 0.8,
			ArchUsage:  confidence.InfraConfidence,
		}
		if signals.HasDockerCompose {
			skill.Evidence = append(skill.Evidence, "Docker Compose configured")
			skill.UsageDepth = 0.9
		}
		skill.ComputeConfidence()
		skills = append(skills, skill)
	}

	if signals.HasKubernetes {
		skill := ExtractedSkill{
			Name:         "Kubernetes",
			Category:     "Infrastructure",
			Evidence:     []string{"Kubernetes manifests detected"},
			UsageDepth:   0.85,
			ArchUsage:    confidence.InfraConfidence,
			BestPractice: 0.8,
		}
		skill.ComputeConfidence()
		skills = append(skills, skill)
	}

	if signals.HasTerraform {
		skill := ExtractedSkill{
			Name:         "Terraform",
			Category:     "Infrastructure",
			Evidence:     []string{"Terraform configuration detected"},
			UsageDepth:   0.8,
			ArchUsage:    confidence.InfraConfidence,
			BestPractice: 0.7,
		}
		skill.ComputeConfidence()
		skills = append(skills, skill)
	}

	// CI/CD skill
	if signals.HasCI {
		skill := ExtractedSkill{
			Name:         "CI/CD",
			Category:     "DevOps",
			Evidence:     []string{"CI/CD pipeline configured"},
			UsageDepth:   0.7,
			BestPractice: 0.8,
		}
		skill.ComputeConfidence()
		skills = append(skills, skill)
	}

	// Architecture skill (if sophisticated)
	if archIntent == ArchSophisticated {
		skill := ExtractedSkill{
			Name:     "System Architecture",
			Category: "Architecture",
			Evidence: []string{"Sophisticated architecture patterns detected"},
		}
		if signals.HasMicroservices {
			skill.Evidence = append(skill.Evidence, "Microservices architecture")
		}
		if signals.HasGateway {
			skill.Evidence = append(skill.Evidence, "API Gateway pattern")
		}
		skill.UsageDepth = confidence.ArchitectureConfidence
		skill.ArchUsage = 1.0
		skill.BestPractice = 0.8
		skill.Complexity = 0.9
		skill.ComputeConfidence()
		skills = append(skills, skill)
	}

	// ==========================================
	// NEW: USAGE VERIFICATION & BOOSTS
	// ==========================================

	// 1. Verify actual usage
	usageVerdicts := VerifyAllUsage(p.repoPath, signals)

	// Update skills with verification data (for UI/debugging)
	for i := range skills {
		if verdict, ok := usageVerdicts[skills[i].Name]; ok {
			skills[i].UsageVerified = verdict.UsageVerified
			skills[i].UsageStrength = verdict.UsageStrength
			// Add evidence from verification
			for _, ev := range verdict.Evidence {
				skills[i].Evidence = append(skills[i].Evidence, ev.Description)
			}
		}
	}

	// 2. Apply AST & Security Boosts
	applyASTSecurityBoosts(skills, p.astReport, p.securityReport)

	// 3. Calibrate with ALL factors
	calibrator := NewConfidenceCalibrator()
	calibratedSkills := calibrator.CalibrateSkills(
		skills,
		signals.TotalFiles,
		countSignals(signals),
		getIntent(p.userProjectType), // Helper to convert string to Intent
		usageVerdicts,                // Usage Verification
		p.securityReport,             // Security Health
	)

	// 4. Convert back to ExtractedSkill and Filter
	finalSkills := []ExtractedSkill{}
	for i, cal := range calibratedSkills {
		// Update original skill confidence
		skills[i].Confidence = int(cal.Calibration.CalibratedScore)
		skills[i].ResumeReady = skills[i].Confidence >= 50 // Unified 50% threshold

		// Map multipliers for transparency
		if verdict, ok := usageVerdicts[skills[i].Name]; ok {
			skills[i].UsageStrength = verdict.UsageStrength
		}
		// Security multiplier is derived in calibrator, not stored directly yet,
		// but effect is in final score.

		finalSkills = append(finalSkills, skills[i])
	}

	return finalSkills
}

func countSignals(s *FastSignals) int {
	count := len(s.DetectedFrameworks) + len(s.DetectedDatabases) + len(s.DetectedInfra)
	if s.HasTests {
		count++
	}
	if s.HasDockerCompose {
		count++
	}
	if s.HasCI {
		count++
	}
	return count
}

func getIntent(projectType string) ProjectIntent {
	if projectType == "LEARNING" {
		return IntentLearning
	} else if projectType == "HOBBY" {
		return IntentHobby
	} else if projectType == "ENTERPRISE" {
		return IntentEnterprise
	}
	return IntentProduction
}

func applyASTSecurityBoosts(skills []ExtractedSkill, astReport *ASTReport, secReport *SecurityReport) {
	if astReport == nil {
		return
	}

	for i := range skills {
		// Pointers to modify in place
		skill := &skills[i]

		// Go-specific boosts
		if skill.Name == "Go" {
			// Safe goroutine usage (+5)
			if astReport.GoroutinePatterns.HasProperSync && astReport.GoroutinePatterns.PotentialLeaks == 0 {
				skill.Confidence = minInt(100, skill.Confidence+5)
			}
			// Strong error handling (+5)
			if astReport.ErrorHandling.ErrorHandlingRatio > 0.80 {
				skill.Confidence = minInt(100, skill.Confidence+5)
			}
		}

		// General Engineering boosts
		if skill.Category == "Architecture" || skill.Category == "Backend" {
			// Clean Code (+5)
			if astReport.Complexity.Average < 10.0 && astReport.CodeOrganization.LongFunctions == 0 {
				skill.Confidence = minInt(100, skill.Confidence+5)
			}
		}
	}
}

// Helper
func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// runStackAnalyzers executes stack-specific analyzers based on detected signals
// Respects userProjectType to prevent cross-contamination (e.g., running
// NodeBackendAnalyzer on a pure React project)
func (p *Pipeline) runStackAnalyzers(signals *FastSignals, selection *ModuleSelection) []*StackAnalysisResult {
	results := []*StackAnalysisResult{}

	isFrontend := p.userProjectType == "frontend"
	isBackend := p.userProjectType == "backend"
	// If empty or fullstack, use signal-based detection
	runFrontendAnalyzers := isFrontend || p.userProjectType == "fullstack" || p.userProjectType == ""
	runBackendAnalyzers := isBackend || p.userProjectType == "fullstack" || p.userProjectType == "ml"

	// When userProjectType is empty, use signal-based heuristic to avoid running both
	if p.userProjectType == "" {
		hasFrontendFw := false
		hasBackendFw := false
		for _, fw := range signals.DetectedFrameworks {
			switch fw {
			case "React", "Vue", "Angular", "Next.js", "Svelte":
				hasFrontendFw = true
			case "Express", "NestJS", "Fastify":
				hasBackendFw = true
			}
		}
		if signals.DominantLanguage == "Go" {
			hasBackendFw = true
		}

		// If only frontend signals, don't run backend analyzers
		if hasFrontendFw && !hasBackendFw {
			runBackendAnalyzers = false
		}
		// If only backend signals, don't run frontend analyzers
		if hasBackendFw && !hasFrontendFw {
			runFrontendAnalyzers = false
		}
	}

	// Check for Next.js/React frontend
	if runFrontendAnalyzers {
		for _, fw := range signals.DetectedFrameworks {
			if fw == "Next.js" || fw == "React" {
				analyzer := NewNextJSAnalyzer()
				result := analyzer.Analyze(p.repoPath)
				if result != nil && (len(result.Risks) > 0 || len(result.Strengths) > 0) {
					results = append(results, result)
				}
				break
			}
		}
	}

	// Check for Go backend
	if runBackendAnalyzers && signals.DominantLanguage == "Go" {
		analyzer := NewGoBackendAnalyzer()
		result := analyzer.Analyze(p.repoPath)
		if result != nil && (len(result.Risks) > 0 || len(result.Strengths) > 0) {
			results = append(results, result)
		}
	}

	// Check for Node backend
	if runBackendAnalyzers {
		for _, fw := range signals.DetectedFrameworks {
			if fw == "Express" || fw == "NestJS" {
				analyzer := NewNodeBackendAnalyzer()
				result := analyzer.Analyze(p.repoPath)
				if result != nil && (len(result.Risks) > 0 || len(result.Strengths) > 0) {
					results = append(results, result)
				}
				break
			}
		}
	}

	return results
}
