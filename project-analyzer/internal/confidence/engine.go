package confidence

import (
	"math"
	"strings"

	astengine "github.com/verifydev/project-analyzer/internal/ast"
	"github.com/verifydev/project-analyzer/internal/graph"
	"github.com/verifydev/project-analyzer/pkg/signals"

	"github.com/rs/zerolog/log"
)

// ============================================
// BAYESIAN CONFIDENCE ENGINE
// Multi-source evidence fusion with Bayesian updating
// ============================================

// Engine performs Bayesian confidence calculations
type Engine struct {
	// Input sources
	astResult    *astengine.ProjectASTResult
	graphResult  *graph.GraphAnalysisResult
	infraSignals *signals.InfrastructureSignals
	industry     *signals.IndustryAnalysis
	forensics    *signals.GitForensics
	authorship   *signals.AuthorshipVerdict
	codeSignals  *signals.CodeSignals

	// Computed intermediates
	qualityMetrics   QualityMetrics
	evolutionSignals EvolutionSignals
}

// NewEngine creates a new Bayesian confidence engine
func NewEngine() *Engine {
	return &Engine{}
}

// SetAST provides AST analysis results
func (e *Engine) SetAST(result *astengine.ProjectASTResult) {
	e.astResult = result
}

// SetGraph provides graph analysis results
func (e *Engine) SetGraph(result *graph.GraphAnalysisResult) {
	e.graphResult = result
}

// SetInfra provides infrastructure signals
func (e *Engine) SetInfra(infraSignals *signals.InfrastructureSignals) {
	e.infraSignals = infraSignals
}

// SetIndustry provides the rule-based industry analysis
func (e *Engine) SetIndustry(industry *signals.IndustryAnalysis) {
	e.industry = industry
}

// SetForensics provides git forensics data
func (e *Engine) SetForensics(f *signals.GitForensics, v *signals.AuthorshipVerdict) {
	e.forensics = f
	e.authorship = v
}

// SetCodeSignals provides code-level signals
func (e *Engine) SetCodeSignals(cs *signals.CodeSignals) {
	e.codeSignals = cs
}

// Run executes the full Phase 3 confidence pipeline
func (e *Engine) Run() *ConfidenceReport {
	report := &ConfidenceReport{}

	log.Info().Msg("🔬 Phase 3: Running Bayesian Confidence Engine...")

	// Step 1: Compute code quality metrics
	report.QualityMetrics = e.computeQualityMetrics()
	e.qualityMetrics = report.QualityMetrics
	log.Info().
		Float64("quality", report.QualityMetrics.OverallQuality).
		Str("tier", report.QualityMetrics.QualityTier).
		Msg("📐 Quality metrics computed")

	// Step 2: Compute git evolution signals
	report.EvolutionSignals = e.computeEvolutionSignals()
	e.evolutionSignals = report.EvolutionSignals
	log.Info().
		Str("pattern", report.EvolutionSignals.DevelopmentPattern).
		Float64("maturity", report.EvolutionSignals.MaturityFactor).
		Msg("📈 Evolution signals computed")

	// Step 3: Compute Bayesian posteriors for each skill
	report.SkillConfidences = e.computeBayesianPosteriors()
	log.Info().
		Int("skills", len(report.SkillConfidences)).
		Msg("🧮 Bayesian posteriors computed")

	// Step 4: Compute ensemble verdict
	report.EnsembleVerdict = e.computeEnsembleVerdict(report)
	log.Info().
		Float64("finalScore", report.EnsembleVerdict.FinalScore).
		Str("label", report.EnsembleVerdict.ScoreLabel).
		Int("resumeReady", report.EnsembleVerdict.ResumeReadySkills).
		Msg("🎯 Ensemble verdict computed")

	// Step 5: Overall analysis confidence
	report.AnalysisConfidence = e.computeAnalysisConfidence()

	return report
}

// ============================================
// STEP 1: CODE QUALITY METRICS
// ============================================

func (e *Engine) computeQualityMetrics() QualityMetrics {
	q := QualityMetrics{}

	// --- Organization Score ---
	// Based on number of distinct directories, separation of concerns
	if e.astResult != nil {
		dirs := make(map[string]bool)
		for _, file := range e.astResult.Files {
			parts := strings.Split(file.FilePath, "/")
			if len(parts) > 1 {
				dirs[parts[0]] = true
			}
		}
		// More directories = better organization (up to a point)
		dirCount := len(dirs)
		q.OrganizationScore = math.Min(float64(dirCount)*12, 100)

		// Modularity: ratio of exported items to total definitions
		totalDefs := 0
		exportedDefs := 0
		for _, file := range e.astResult.Files {
			for _, def := range file.Definitions {
				totalDefs++
				if def.IsExported {
					exportedDefs++
				}
			}
		}
		if totalDefs > 0 {
			exportRatio := float64(exportedDefs) / float64(totalDefs)
			// Ideal export ratio is 0.3-0.5 (not everything public, not everything private)
			if exportRatio >= 0.2 && exportRatio <= 0.6 {
				q.ModularityScore = 80 + (1-math.Abs(exportRatio-0.4))*50
			} else {
				q.ModularityScore = 50 + exportRatio*30
			}
		}
		q.ModularityScore = math.Min(q.ModularityScore, 100)
	}

	// --- Test Coverage Proxy ---
	if e.codeSignals != nil {
		if e.codeSignals.TestFilesCount > 0 {
			q.TestCoverageProxy = 40 // Base for having tests at all

			// Count test-related technologies from infra signals
			if e.infraSignals != nil {
				testSignals := 0
				testRelated := []signals.InfraSignal{
					signals.SignalUnitTests, signals.SignalIntegrationTests,
					signals.SignalE2ETests, signals.SignalTestCoverage,
					signals.SignalMocking, signals.SignalTestContainers,
					signals.SignalJest, signals.SignalCypress, signals.SignalPlaywright,
				}
				for _, sig := range testRelated {
					if e.infraSignals.HasSignal(sig) {
						testSignals++
					}
				}
				q.TestCoverageProxy += float64(testSignals) * 10
			}
			q.TestCoverageProxy = math.Min(q.TestCoverageProxy, 100)

			if q.TestCoverageProxy >= 70 {
				q.TestMaturity = "comprehensive"
			} else if q.TestCoverageProxy >= 50 {
				q.TestMaturity = "moderate"
			} else {
				q.TestMaturity = "basic"
			}
		} else {
			q.TestMaturity = "none"
		}
	} else {
		q.TestMaturity = "none"
	}

	// --- Documentation ---
	if e.codeSignals != nil {
		q.CommentDensity = e.codeSignals.CommentDensity
		q.HasReadme = e.codeSignals.HasReadme

		docScore := 0.0
		if q.HasReadme {
			docScore += 40
		}
		docScore += q.CommentDensity * 200 // commentDensity is typically 0.05-0.3
		if e.infraSignals != nil && e.infraSignals.HasSignal(signals.SignalCodeDocumentation) {
			docScore += 20
		}
		q.DocumentationScore = math.Min(docScore, 100)
	}

	// --- Complexity Management ---
	if e.astResult != nil {
		avgComp := e.astResult.Complexity.AveragePerFunction
		maxComp := float64(e.astResult.Complexity.MaxComplexity)

		// Good complexity: low average, managed max
		if avgComp <= 5 {
			q.ComplexityScore = 90
			q.ComplexityLevel = "simple"
		} else if avgComp <= 10 {
			q.ComplexityScore = 75
			q.ComplexityLevel = "moderate"
		} else if avgComp <= 20 {
			q.ComplexityScore = 55
			q.ComplexityLevel = "complex"
		} else {
			q.ComplexityScore = 30
			q.ComplexityLevel = "highly_complex"
		}

		// Penalty for very high max complexity
		if maxComp > 30 {
			q.ComplexityScore -= 15
		}
		q.ComplexityScore = math.Max(q.ComplexityScore, 10)
	}

	// --- Production Readiness ---
	prodScore := 0.0
	if e.infraSignals != nil {
		if e.infraSignals.HasSignal(signals.SignalGitHubActions) || e.infraSignals.HasSignal(signals.SignalGitLabCI) {
			q.HasCI = true
			prodScore += 25
		}
		if e.infraSignals.HasSignal(signals.SignalDocker) {
			prodScore += 20
		}
		if e.infraSignals.HasSignal(signals.SignalStaticAnalysis) {
			q.HasLinting = true
			prodScore += 15
		}
		if e.infraSignals.HasSignal(signals.SignalConfigManagement) || e.infraSignals.HasSignal(signals.SignalSecretManagement) {
			q.HasEnvConfig = true
			prodScore += 15
		}
		if e.infraSignals.HasSignal(signals.SignalHealthEndpoints) {
			prodScore += 10
		}
		if e.infraSignals.HasSignal(signals.SignalStructuredLogging) {
			prodScore += 15
		}
	}
	q.ProductionReadiness = math.Min(prodScore, 100)

	// --- Overall Quality (weighted composite) ---
	q.OverallQuality = q.OrganizationScore*0.15 +
		q.ModularityScore*0.15 +
		q.TestCoverageProxy*0.20 +
		q.DocumentationScore*0.10 +
		q.ComplexityScore*0.15 +
		q.ProductionReadiness*0.25
	q.OverallQuality = math.Round(q.OverallQuality*100) / 100

	// Tier
	if q.OverallQuality >= 80 {
		q.QualityTier = "excellent"
	} else if q.OverallQuality >= 60 {
		q.QualityTier = "high"
	} else if q.OverallQuality >= 40 {
		q.QualityTier = "moderate"
	} else {
		q.QualityTier = "low"
	}

	return q
}

// ============================================
// STEP 2: GIT EVOLUTION SIGNALS
// ============================================

func (e *Engine) computeEvolutionSignals() EvolutionSignals {
	ev := EvolutionSignals{
		AuthorshipLevel:  "UNKNOWN",
		AuthorshipFactor: 0.5, // neutral default
		MaturityFactor:   0.5,
	}

	if e.forensics == nil {
		ev.DevelopmentPattern = "unknown"
		ev.ProjectAge = "unknown"
		return ev
	}

	// Authorship
	if e.authorship != nil {
		ev.AuthorshipLevel = e.authorship.Level

		switch e.authorship.Level {
		case "ORGANIC":
			switch e.authorship.Confidence {
			case "HIGH":
				ev.AuthorshipFactor = 1.0
			case "MEDIUM":
				ev.AuthorshipFactor = 0.85
			default:
				ev.AuthorshipFactor = 0.7
			}
		case "SNAPSHOT":
			switch e.authorship.Confidence {
			case "HIGH":
				ev.AuthorshipFactor = 0.3
			case "MEDIUM":
				ev.AuthorshipFactor = 0.45
			default:
				ev.AuthorshipFactor = 0.55
			}
		case "UNCLEAR":
			ev.AuthorshipFactor = 0.5
		}
	}

	// Development Pattern
	commitCount := e.forensics.CommitCount
	refactorCount := e.forensics.RefactorCount
	largestRatio := e.forensics.LargestCommitRatio

	if commitCount > 0 {
		ev.RefactorRatio = float64(refactorCount) / float64(commitCount)
	}

	// Estimate iteration count (refactor + fix commits indicate iterations)
	ev.IterationCount = refactorCount + (commitCount / 5) // rough: 1 iteration per 5 commits

	if largestRatio > 0.8 && commitCount < 5 {
		ev.DevelopmentPattern = "snapshot"
	} else if commitCount < 10 && refactorCount == 0 {
		ev.DevelopmentPattern = "burst"
	} else {
		ev.DevelopmentPattern = "incremental"
	}

	// Project age from dates
	if e.forensics.FirstCommitDate != "" && e.forensics.LastCommitDate != "" {
		// Parse the time gap from the commit dates
		// We use commit count as a proxy for project maturity
		if commitCount >= 50 {
			ev.ProjectAge = "months"
			ev.MaturityFactor = 1.0
		} else if commitCount >= 20 {
			ev.ProjectAge = "weeks"
			ev.MaturityFactor = 0.85
		} else if commitCount >= 5 {
			ev.ProjectAge = "days"
			ev.MaturityFactor = 0.65
		} else {
			ev.ProjectAge = "hours"
			ev.MaturityFactor = 0.4
		}
	}

	// Commit consistency: low largest ratio + high commit count = consistent
	if commitCount > 0 {
		ev.CommitConsistency = (1.0 - largestRatio) * math.Min(float64(commitCount)/30.0, 1.0)
		ev.CommitConsistency = math.Round(ev.CommitConsistency*100) / 100
	}

	return ev
}

// ============================================
// STEP 3: BAYESIAN POSTERIORS
// ============================================

func (e *Engine) computeBayesianPosteriors() []SkillPosterior {
	posteriors := []SkillPosterior{}

	if e.industry == nil {
		return posteriors
	}

	// Build lookup maps for AST and Graph evidence
	astTechConf := make(map[string]float64)    // tech name -> AST confidence
	graphSkillConf := make(map[string]float64) // skill name -> graph confidence

	if e.astResult != nil {
		for name := range e.astResult.TechnologyUsage {
			astTechConf[strings.ToLower(name)] = e.astResult.GetTechConfidence(name)
		}
	}

	if e.graphResult != nil {
		for _, skill := range e.graphResult.InferredSkills {
			graphSkillConf[strings.ToLower(skill.Name)] = skill.Confidence
		}
	}

	// Quality weight from code quality (0.5 to 1.0 range)
	qualityWeight := 0.5 + (e.qualityMetrics.OverallQuality/100)*0.5

	// Git weight from evolution signals
	gitWeight := e.evolutionSignals.AuthorshipFactor * e.evolutionSignals.MaturityFactor
	if gitWeight < 0.2 {
		gitWeight = 0.2 // Floor: never completely zero even for snapshots
	}

	for _, skill := range e.industry.VerifiedSkills {
		posterior := SkillPosterior{
			SkillName:     skill.Name,
			Category:      string(skill.Category),
			QualityWeight: qualityWeight,
			GitWeight:     gitWeight,
		}

		// Prior: base confidence from the rule engine
		posterior.Prior = skill.Confidence

		// AST evidence: check if any of the skill's keywords match AST-detected tech
		astEvidence := 0.0
		for _, kw := range skill.Keywords {
			if conf, ok := astTechConf[strings.ToLower(kw)]; ok {
				if conf > astEvidence {
					astEvidence = conf
				}
			}
		}
		// Also check skill name directly
		if conf, ok := astTechConf[strings.ToLower(skill.Name)]; ok {
			if conf > astEvidence {
				astEvidence = conf
			}
		}
		posterior.ASTEvidence = astEvidence

		// Infra evidence: check if skill signals exist in infra
		infraEvidence := 0.0
		for _, sig := range skill.Signals {
			if e.infraSignals != nil {
				conf := e.infraSignals.GetSignalConfidence(sig)
				if conf > infraEvidence {
					infraEvidence = conf
				}
			}
		}
		posterior.InfraEvidence = infraEvidence

		// Graph evidence: check if graph inferred this skill
		if conf, ok := graphSkillConf[strings.ToLower(skill.Name)]; ok {
			posterior.GraphEvidence = conf
		}

		// ============================================
		// BAYESIAN UPDATE
		// P(skill|evidence) ∝ P(evidence|skill) * P(skill)
		//
		// We compute a likelihood from multiple evidence sources,
		// then update the prior to get the posterior.
		// ============================================

		// Likelihood = weighted combination of evidence sources
		sourceWeights := map[string]float64{
			"ast":     0.30,
			"infra":   0.25,
			"graph":   0.20,
			"quality": 0.15,
			"git":     0.10,
		}

		likelihood := sourceWeights["ast"]*posterior.ASTEvidence +
			sourceWeights["infra"]*posterior.InfraEvidence +
			sourceWeights["graph"]*posterior.GraphEvidence +
			sourceWeights["quality"]*qualityWeight +
			sourceWeights["git"]*gitWeight

		posterior.Likelihood = math.Round(likelihood*1000) / 1000

		// Bayesian update: posterior = prior * likelihood / normalization
		// Since we don't have a true P(evidence), we use a simplified update:
		// posterior = prior * (1 + evidence_boost) / normalization
		evidenceBoost := likelihood - 0.5 // boost is relative to neutral 0.5
		rawPosterior := posterior.Prior * (1 + evidenceBoost)

		// Clamp to [0.05, 0.99]
		rawPosterior = math.Max(0.05, math.Min(0.99, rawPosterior))

		// Apply quality and git dampening
		posterior.Posterior = rawPosterior * (0.3 + 0.7*qualityWeight) * (0.3 + 0.7*gitWeight)
		posterior.Posterior = math.Round(posterior.Posterior*1000) / 1000
		posterior.Posterior = math.Max(0.05, math.Min(0.99, posterior.Posterior))

		// Confidence interval (approximate)
		// Width depends on number of evidence sources that agree
		sourceCount := 0
		if posterior.ASTEvidence > 0.3 {
			sourceCount++
		}
		if posterior.InfraEvidence > 0.3 {
			sourceCount++
		}
		if posterior.GraphEvidence > 0.3 {
			sourceCount++
		}

		// More agreeing sources = tighter interval
		var halfWidth float64
		switch sourceCount {
		case 3:
			halfWidth = 0.05
		case 2:
			halfWidth = 0.10
		case 1:
			halfWidth = 0.15
		default:
			halfWidth = 0.20
		}

		posterior.LowerBound = math.Max(0.0, math.Round((posterior.Posterior-halfWidth)*100)/100)
		posterior.UpperBound = math.Min(1.0, math.Round((posterior.Posterior+halfWidth)*100)/100)

		// Resume-ready: posterior >= 0.65 AND (at least 2 evidence sources OR authorship is ORGANIC)
		posterior.ResumeReady = posterior.Posterior >= 0.65 &&
			(sourceCount >= 2 || e.evolutionSignals.AuthorshipLevel == "ORGANIC")

		// Usage verification from AST
		posterior.UsageVerified = posterior.ASTEvidence >= 0.5
		posterior.UsageStrength = posterior.ASTEvidence

		posteriors = append(posteriors, posterior)
	}

	return posteriors
}

// ============================================
// STEP 4: ENSEMBLE VERDICT
// ============================================

func (e *Engine) computeEnsembleVerdict(report *ConfidenceReport) EnsembleVerdict {
	verdict := EnsembleVerdict{}

	// Define weights based on what data is available
	weights := EnsembleWeights{
		AST:          0.25,
		Graph:        0.15,
		Infra:        0.20,
		Intelligence: 0.15,
		Quality:      0.15,
		Git:          0.10,
	}
	verdict.Weights = weights

	// --- Component Scores ---

	// AST Score: based on number of detected technologies and complexity management
	if e.astResult != nil {
		techCount := len(e.astResult.TechnologyUsage)
		patternCount := e.astResult.Summary.TotalPatterns
		astScore := math.Min(float64(techCount)*5+float64(patternCount)*3, 100)
		verdict.ASTScore = math.Round(astScore*100) / 100
	}

	// Graph Score: based on detected stacks and inferred skills
	if e.graphResult != nil {
		stackScore := float64(len(e.graphResult.DetectedStacks)) * 15
		skillScore := float64(len(e.graphResult.InferredSkills)) * 10
		clusterScore := float64(len(e.graphResult.Clusters)) * 5
		graphScore := math.Min(stackScore+skillScore+clusterScore, 100)
		verdict.GraphScore = math.Round(graphScore*100) / 100
	}

	// Infra Score: based on number and diversity of signals
	if e.infraSignals != nil {
		sigCount := len(e.infraSignals.Signals)
		infraScore := math.Min(float64(sigCount)*3, 100)
		verdict.InfraScore = math.Round(infraScore*100) / 100
	}

	// Intelligence Score: from industry analysis
	if e.industry != nil {
		verdict.IntelligenceScore = e.industry.OverallScore
	}

	// Quality Score
	verdict.QualityScore = report.QualityMetrics.OverallQuality

	// Git Score: combination of authorship and maturity
	gitScore := report.EvolutionSignals.AuthorshipFactor*60 +
		report.EvolutionSignals.MaturityFactor*25 +
		report.EvolutionSignals.CommitConsistency*15
	verdict.GitScore = math.Round(math.Min(gitScore, 100)*100) / 100

	// --- Final Ensemble Score ---
	verdict.FinalScore = verdict.ASTScore*weights.AST +
		verdict.GraphScore*weights.Graph +
		verdict.InfraScore*weights.Infra +
		verdict.IntelligenceScore*weights.Intelligence +
		verdict.QualityScore*weights.Quality +
		verdict.GitScore*weights.Git

	verdict.FinalScore = math.Round(verdict.FinalScore*100) / 100

	// Confidence in the score itself (based on data completeness)
	dataPoints := 0
	if e.astResult != nil {
		dataPoints++
	}
	if e.graphResult != nil {
		dataPoints++
	}
	if e.infraSignals != nil {
		dataPoints++
	}
	if e.industry != nil {
		dataPoints++
	}
	if e.forensics != nil {
		dataPoints++
	}
	verdict.Confidence = math.Min(float64(dataPoints)*0.2, 1.0)

	// Score label
	if verdict.FinalScore >= 80 {
		verdict.ScoreLabel = "Expert"
		verdict.ScoreBand = [2]int{80, 100}
	} else if verdict.FinalScore >= 60 {
		verdict.ScoreLabel = "Advanced"
		verdict.ScoreBand = [2]int{60, 80}
	} else if verdict.FinalScore >= 40 {
		verdict.ScoreLabel = "Intermediate"
		verdict.ScoreBand = [2]int{40, 60}
	} else if verdict.FinalScore >= 20 {
		verdict.ScoreLabel = "Beginner"
		verdict.ScoreBand = [2]int{20, 40}
	} else {
		verdict.ScoreLabel = "Novice"
		verdict.ScoreBand = [2]int{0, 20}
	}

	// Skill stats from posteriors
	for _, p := range report.SkillConfidences {
		verdict.TotalSkills++
		if p.Posterior >= 0.85 {
			verdict.HighConfSkills++
		}
		if p.ResumeReady {
			verdict.ResumeReadySkills++
		}
	}

	// Top factors
	verdict.TopFactors = e.computeTopFactors(verdict)
	verdict.RiskFactors = e.computeRiskFactors(report)

	return verdict
}

func (e *Engine) computeTopFactors(v EnsembleVerdict) []string {
	factors := []string{}

	// Sort by contribution (score * weight)
	type scoredFactor struct {
		name         string
		contribution float64
	}
	ranked := []scoredFactor{
		{"AST Code Analysis", v.ASTScore * v.Weights.AST},
		{"Technology Graph", v.GraphScore * v.Weights.Graph},
		{"Infrastructure Signals", v.InfraScore * v.Weights.Infra},
		{"Intelligence Engine", v.IntelligenceScore * v.Weights.Intelligence},
		{"Code Quality", v.QualityScore * v.Weights.Quality},
		{"Git History", v.GitScore * v.Weights.Git},
	}

	// Simple sort (small list)
	for i := 0; i < len(ranked)-1; i++ {
		for j := i + 1; j < len(ranked); j++ {
			if ranked[j].contribution > ranked[i].contribution {
				ranked[i], ranked[j] = ranked[j], ranked[i]
			}
		}
	}

	// Top 5
	limit := 5
	if len(ranked) < limit {
		limit = len(ranked)
	}
	for i := 0; i < limit; i++ {
		if ranked[i].contribution > 0 {
			factors = append(factors, ranked[i].name)
		}
	}

	return factors
}

func (e *Engine) computeRiskFactors(report *ConfidenceReport) []string {
	risks := []string{}

	if report.EvolutionSignals.AuthorshipLevel == "SNAPSHOT" {
		risks = append(risks, "Project appears to be a code snapshot (not incrementally developed)")
	}
	if report.EvolutionSignals.DevelopmentPattern == "burst" {
		risks = append(risks, "Development pattern is burst-like (all code written in short period)")
	}
	if report.QualityMetrics.TestMaturity == "none" {
		risks = append(risks, "No automated tests detected")
	}
	if report.QualityMetrics.OverallQuality < 40 {
		risks = append(risks, "Code quality metrics below moderate threshold")
	}
	if report.QualityMetrics.DocumentationScore < 20 {
		risks = append(risks, "Minimal or no documentation found")
	}
	if e.industry != nil && e.industry.TotalSkills < 3 {
		risks = append(risks, "Few verified skills detected")
	}

	return risks
}

// ============================================
// STEP 5: ANALYSIS CONFIDENCE
// ============================================

func (e *Engine) computeAnalysisConfidence() float64 {
	conf := 0.0

	// Each data source adds confidence in the analysis
	if e.astResult != nil && len(e.astResult.Files) > 0 {
		conf += 0.25
	}
	if e.graphResult != nil && e.graphResult.TotalNodes > 0 {
		conf += 0.15
	}
	if e.infraSignals != nil && len(e.infraSignals.Signals) > 0 {
		conf += 0.20
	}
	if e.industry != nil && e.industry.TotalSkills > 0 {
		conf += 0.15
	}
	if e.forensics != nil && e.forensics.CommitCount > 0 {
		conf += 0.15
	}
	if e.codeSignals != nil {
		conf += 0.10
	}

	return math.Round(math.Min(conf, 1.0)*100) / 100
}
