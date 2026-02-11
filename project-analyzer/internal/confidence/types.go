package confidence

// ============================================
// PHASE 3: WEIGHTED CONFIDENCE + QUALITY ENGINE
// Bayesian confidence model with multi-source
// evidence fusion and quality-weighted scoring
// ============================================

// ConfidenceReport holds the final Phase 3 output
type ConfidenceReport struct {
	// Bayesian Posteriors for each skill
	SkillConfidences []SkillPosterior `json:"skillConfidences"`

	// Quality Dimensions
	QualityMetrics QualityMetrics `json:"qualityMetrics"`

	// Git Evolution Signals
	EvolutionSignals EvolutionSignals `json:"evolutionSignals"`

	// Ensemble Verdict
	EnsembleVerdict EnsembleVerdict `json:"ensembleVerdict"`

	// Overall confidence in the analysis itself
	AnalysisConfidence float64 `json:"analysisConfidence"` // 0.0 - 1.0
}

// SkillPosterior represents the Bayesian posterior for a skill
type SkillPosterior struct {
	SkillName string `json:"skillName"`
	Category  string `json:"category"`

	// Bayesian components
	Prior      float64 `json:"prior"`      // Base rate from detection method
	Likelihood float64 `json:"likelihood"` // Evidence strength
	Posterior  float64 `json:"posterior"`  // Final confidence after updating

	// Source contributions
	ASTEvidence   float64 `json:"astEvidence"`   // 0.0-1.0 from AST detection
	InfraEvidence float64 `json:"infraEvidence"` // 0.0-1.0 from infra signals
	GraphEvidence float64 `json:"graphEvidence"` // 0.0-1.0 from graph analysis
	QualityWeight float64 `json:"qualityWeight"` // 0.0-1.0 adjustment from code quality
	GitWeight     float64 `json:"gitWeight"`     // 0.0-1.0 adjustment from git history

	// Confidence interval
	LowerBound float64 `json:"lowerBound"` // 95% CI lower
	UpperBound float64 `json:"upperBound"` // 95% CI upper

	// Final
	ResumeReady   bool    `json:"resumeReady"`
	UsageVerified bool    `json:"usageVerified"`
	UsageStrength float64 `json:"usageStrength"` // 0.0-1.0
}

// QualityMetrics captures code quality signals
type QualityMetrics struct {
	// Code Organization
	OrganizationScore float64 `json:"organizationScore"` // 0-100
	ModularityScore   float64 `json:"modularityScore"`   // 0-100

	// Testing Maturity
	TestCoverageProxy float64 `json:"testCoverageProxy"` // 0-100 (estimated from test file ratio)
	TestMaturity      string  `json:"testMaturity"`      // "none", "basic", "moderate", "comprehensive"

	// Documentation
	DocumentationScore float64 `json:"documentationScore"` // 0-100
	HasReadme          bool    `json:"hasReadme"`
	CommentDensity     float64 `json:"commentDensity"`

	// Complexity Assessment
	ComplexityScore float64 `json:"complexityScore"` // 0-100 (higher = better managed)
	ComplexityLevel string  `json:"complexityLevel"` // "simple", "moderate", "complex", "highly_complex"

	// Production Readiness
	ProductionReadiness float64 `json:"productionReadiness"` // 0-100
	HasCI               bool    `json:"hasCI"`
	HasLinting          bool    `json:"hasLinting"`
	HasEnvConfig        bool    `json:"hasEnvConfig"`

	// Overall Quality
	OverallQuality float64 `json:"overallQuality"` // 0-100 weighted composite
	QualityTier    string  `json:"qualityTier"`    // "low", "moderate", "high", "excellent"
}

// EvolutionSignals captures git history-based confidence adjustments
type EvolutionSignals struct {
	// Authorship
	AuthorshipLevel  string  `json:"authorshipLevel"`  // "ORGANIC", "SNAPSHOT", "UNCLEAR"
	AuthorshipFactor float64 `json:"authorshipFactor"` // 0.0-1.0 multiplier

	// Development Pattern
	DevelopmentPattern string  `json:"developmentPattern"` // "incremental", "burst", "snapshot"
	IterationCount     int     `json:"iterationCount"`     // Estimated development iterations
	RefactorRatio      float64 `json:"refactorRatio"`      // refactor commits / total commits

	// Maturity
	ProjectAge     string  `json:"projectAge"`     // "hours", "days", "weeks", "months"
	MaturityFactor float64 `json:"maturityFactor"` // 0.0-1.0 (longer = more mature)

	// Consistency
	CommitConsistency float64 `json:"commitConsistency"` // 0.0-1.0 (spread vs burst)
}

// EnsembleVerdict is the final combined verdict from all sources
type EnsembleVerdict struct {
	// Component Scores (0-100)
	ASTScore          float64 `json:"astScore"`
	GraphScore        float64 `json:"graphScore"`
	InfraScore        float64 `json:"infraScore"`
	IntelligenceScore float64 `json:"intelligenceScore"`
	QualityScore      float64 `json:"qualityScore"`
	GitScore          float64 `json:"gitScore"`

	// Weights used
	Weights EnsembleWeights `json:"weights"`

	// Final ensemble
	FinalScore float64 `json:"finalScore"` // 0-100 weighted average
	Confidence float64 `json:"confidence"` // 0.0-1.0 confidence in the score
	ScoreLabel string  `json:"scoreLabel"` // "Beginner", "Intermediate", "Advanced", "Expert"
	ScoreBand  [2]int  `json:"scoreBand"`  // [lower, upper] range

	// Skill Summary
	TotalSkills       int `json:"totalSkills"`
	HighConfSkills    int `json:"highConfSkills"`    // posterior >= 0.85
	ResumeReadySkills int `json:"resumeReadySkills"` // resume ready after Bayesian update

	// Reasoning
	TopFactors  []string `json:"topFactors"`  // Top 5 factors that influenced the score
	RiskFactors []string `json:"riskFactors"` // Factors that reduced confidence
}

// EnsembleWeights defines how each source contributes to the final score
type EnsembleWeights struct {
	AST          float64 `json:"ast"`
	Graph        float64 `json:"graph"`
	Infra        float64 `json:"infra"`
	Intelligence float64 `json:"intelligence"`
	Quality      float64 `json:"quality"`
	Git          float64 `json:"git"`
}
