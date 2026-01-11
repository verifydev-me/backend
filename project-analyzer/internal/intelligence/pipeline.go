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
		timeout:         1 * time.Second, // Reduced from 2s for speed
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

	// Infrastructure skills
	if signals.HasDockerfile {
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

	return skills
}

// runStackAnalyzers executes stack-specific analyzers based on detected signals
func (p *Pipeline) runStackAnalyzers(signals *FastSignals, selection *ModuleSelection) []*StackAnalysisResult {
	results := []*StackAnalysisResult{}

	// Check for Next.js/React frontend
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

	// Check for Go backend
	if signals.DominantLanguage == "Go" {
		analyzer := NewGoBackendAnalyzer()
		result := analyzer.Analyze(p.repoPath)
		if result != nil && (len(result.Risks) > 0 || len(result.Strengths) > 0) {
			results = append(results, result)
		}
	}

	// Check for Node backend
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

	return results
}
