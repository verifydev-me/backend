package intelligence

import (
	"context"
	"strings"
	"time"

	"github.com/rs/zerolog/log"
)

// ============================================
// AUTONOMOUS CODE INTELLIGENCE ENGINE
// Core Types and Confidence System
// ============================================

// SignalConfidenceVector - Multi-dimensional confidence scoring
// This is the CORE of intelligent module routing
type SignalConfidenceVector struct {
	LanguageConfidence     float64 `json:"languageConfidence"`     // 0-1: How certain we are about primary language
	FrameworkConfidence    float64 `json:"frameworkConfidence"`    // 0-1: Framework detection certainty
	ArchitectureConfidence float64 `json:"architectureConfidence"` // 0-1: Architecture pattern clarity
	InfraConfidence        float64 `json:"infraConfidence"`        // 0-1: Infrastructure signals
	TestConfidence         float64 `json:"testConfidence"`         // 0-1: Test coverage/quality signals
	MLConfidence           float64 `json:"mlConfidence"`           // 0-1: ML/AI pattern detection
	SecurityConfidence     float64 `json:"securityConfidence"`     // 0-1: Security practice signals
}

// Weights for computing overall confidence
// Architecture matters MORE than language detection
const (
	WeightLanguage     = 0.15
	WeightFramework    = 0.20
	WeightArchitecture = 0.30
	WeightInfra        = 0.10
	WeightTests        = 0.15
	WeightML           = 0.05
	WeightSecurity     = 0.05
)

// OverallConfidence computes weighted confidence score
func (v *SignalConfidenceVector) OverallConfidence() float64 {
	return (v.LanguageConfidence * WeightLanguage) +
		(v.FrameworkConfidence * WeightFramework) +
		(v.ArchitectureConfidence * WeightArchitecture) +
		(v.InfraConfidence * WeightInfra) +
		(v.TestConfidence * WeightTests) +
		(v.MLConfidence * WeightML) +
		(v.SecurityConfidence * WeightSecurity)
}

// ============================================
// PROJECT INTENT & DEVELOPER LEVEL
// ============================================

type ProjectIntent string

const (
	IntentLearning   ProjectIntent = "LEARNING"
	IntentHobby      ProjectIntent = "HOBBY"
	IntentProduction ProjectIntent = "PRODUCTION"
	IntentEnterprise ProjectIntent = "ENTERPRISE"
)

type DeveloperLevel string

const (
	LevelJunior       DeveloperLevel = "JUNIOR"
	LevelIntermediate DeveloperLevel = "INTERMEDIATE"
	LevelSenior       DeveloperLevel = "SENIOR"
	LevelExpert       DeveloperLevel = "EXPERT"
)

type ArchitectureIntent string

const (
	ArchAccidental    ArchitectureIntent = "ACCIDENTAL"
	ArchIntentional   ArchitectureIntent = "INTENTIONAL"
	ArchSophisticated ArchitectureIntent = "SOPHISTICATED"
)

// ============================================
// MODULE COST MODEL (ELITE-LEVEL OPTIMIZATION)
// ============================================

type AnalysisModule int

const (
	ModuleFrontendReact AnalysisModule = iota
	ModuleFrontendVue
	ModuleFrontendAngular
	ModuleBackendNode
	ModuleBackendGo
	ModuleBackendPython
	ModuleBackendRust
	ModuleInfraDocker
	ModuleInfraK8s
	ModuleInfraTerraform
	ModuleSecurityScan
	ModuleMLPipeline
	ModuleTestCoverage
	ModuleAPIQuality
	ModuleObservability
)

// ModuleMeta declares cost vs value for intelligent routing
type ModuleMeta struct {
	Module        AnalysisModule
	Name          string
	EstimatedCost time.Duration // Expected execution time
	ExpectedValue float64       // 0-1: Expected contribution to final score
	MinConfidence float64       // Minimum signal confidence to trigger
}

// ModuleRegistry - all available modules with their cost/value
var ModuleRegistry = map[AnalysisModule]ModuleMeta{
	ModuleFrontendReact: {
		Module: ModuleFrontendReact, Name: "React Frontend",
		EstimatedCost: 200 * time.Millisecond, ExpectedValue: 0.70, MinConfidence: 0.30,
	},
	ModuleFrontendVue: {
		Module: ModuleFrontendVue, Name: "Vue Frontend",
		EstimatedCost: 180 * time.Millisecond, ExpectedValue: 0.65, MinConfidence: 0.30,
	},
	ModuleBackendGo: {
		Module: ModuleBackendGo, Name: "Go Backend",
		EstimatedCost: 300 * time.Millisecond, ExpectedValue: 0.85, MinConfidence: 0.40,
	},
	ModuleBackendNode: {
		Module: ModuleBackendNode, Name: "Node Backend",
		EstimatedCost: 250 * time.Millisecond, ExpectedValue: 0.75, MinConfidence: 0.35,
	},
	ModuleBackendPython: {
		Module: ModuleBackendPython, Name: "Python Backend",
		EstimatedCost: 220 * time.Millisecond, ExpectedValue: 0.70, MinConfidence: 0.35,
	},
	ModuleInfraDocker: {
		Module: ModuleInfraDocker, Name: "Docker Infrastructure",
		EstimatedCost: 100 * time.Millisecond, ExpectedValue: 0.50, MinConfidence: 0.20,
	},
	ModuleInfraK8s: {
		Module: ModuleInfraK8s, Name: "Kubernetes",
		EstimatedCost: 150 * time.Millisecond, ExpectedValue: 0.60, MinConfidence: 0.30,
	},
	ModuleSecurityScan: {
		Module: ModuleSecurityScan, Name: "Security Analysis",
		EstimatedCost: 400 * time.Millisecond, ExpectedValue: 0.55, MinConfidence: 0.25,
	},
	ModuleMLPipeline: {
		Module: ModuleMLPipeline, Name: "ML Pipeline",
		EstimatedCost: 350 * time.Millisecond, ExpectedValue: 0.80, MinConfidence: 0.50,
	},
	ModuleTestCoverage: {
		Module: ModuleTestCoverage, Name: "Test Coverage",
		EstimatedCost: 180 * time.Millisecond, ExpectedValue: 0.45, MinConfidence: 0.20,
	},
}

// MinValueThreshold - modules below this are SKIPPED (saves 30-50% CPU)
const MinValueThreshold = 0.15

// ============================================
// EARLY TERMINATION (REASONED EXIT)
// ============================================

type EarlyExitReason string

const (
	ExitHighArchitectureClarity  EarlyExitReason = "ARCH_CLEAR"
	ExitStrongPatternConsistency EarlyExitReason = "PATTERN_STABLE"
	ExitLowRiskSurface           EarlyExitReason = "LOW_RISK"
	ExitTimeout                  EarlyExitReason = "TIMEOUT"
	ExitConfidenceThreshold      EarlyExitReason = "CONFIDENCE_MET"
)

type EarlyExitDecision struct {
	ShouldExit       bool
	Reason           EarlyExitReason
	ConfidenceAtExit float64
	RisksDetected    []string // Cannot exit if high-risk signals present
}

// ============================================
// SUGGESTION SYSTEM (IMPACT-WEIGHTED)
// ============================================

type Suggestion struct {
	Category    string `json:"category"`    // Frontend, Backend, Infra, Security
	Message     string `json:"message"`     // Human-readable suggestion
	ImpactScore int    `json:"impactScore"` // 1-10: How much it improves the project
	EffortScore int    `json:"effortScore"` // 1-10: How hard to implement
	Priority    int    `json:"priority"`    // Computed: ImpactScore / EffortScore
	Evidence    string `json:"evidence"`    // What triggered this suggestion
}

// ComputePriority calculates impact/effort ratio
func (s *Suggestion) ComputePriority() {
	if s.EffortScore == 0 {
		s.Priority = s.ImpactScore
		return
	}
	s.Priority = (s.ImpactScore * 10) / s.EffortScore
}

// ============================================
// SKILL EXTRACTION (TRUSTABLE SCORING)
// ============================================

// SkillScore formula weights
const (
	SkillWeightUsageDepth    = 0.40
	SkillWeightArchitecture  = 0.30
	SkillWeightBestPractices = 0.20
	SkillWeightComplexity    = 0.10
)

type ExtractedSkill struct {
	Name        string   `json:"name"`
	Category    string   `json:"category"`
	Confidence  int      `json:"confidence"` // 0-100
	Evidence    []string `json:"evidence"`
	ResumeReady bool     `json:"resumeReady"`
	// Internal scoring factors
	UsageDepth   float64 `json:"-"` // Internal scoring
	ArchUsage    float64 `json:"-"`
	BestPractice float64 `json:"-"`
	Complexity   float64 `json:"-"`

	// NEW: Usage verification
	UsageVerified bool    `json:"usageVerified"` // NEW
	UsageStrength float64 `json:"usageStrength"` // NEW (0-1.0)

	// NEW: Multipliers applied
	AuthorshipMult float64 `json:"-"` // NEW
	SecurityMult   float64 `json:"-"` // NEW
}

// ComputeConfidence calculates weighted skill confidence
func (s *ExtractedSkill) ComputeConfidence() {
	raw := (s.UsageDepth * SkillWeightUsageDepth) +
		(s.ArchUsage * SkillWeightArchitecture) +
		(s.BestPractice * SkillWeightBestPractices) +
		(s.Complexity * SkillWeightComplexity)

	s.Confidence = int(raw * 100)
	rawConfidence := s.Confidence // Store for logging

	// INTELLIGENT BOOST: Evidence-based Authority
	// If explicit evidence exists (files, configs), we shouldn't rely solely on usage depth heuristics.
	// 1. Check for Config + Package confirmation (Highest Trust)
	hasPackage := false
	hasConfig := false
	for _, e := range s.Evidence {
		eLower := strings.ToLower(e)
		if strings.Contains(eLower, "package.json") || strings.Contains(eLower, "go.mod") || strings.Contains(eLower, "pom.xml") {
			hasPackage = true
		}
		if strings.Contains(eLower, "config") || strings.Contains(eLower, ".yml") || strings.Contains(eLower, ".json") || strings.Contains(eLower, "schema") {
			hasConfig = true
		}
	}

	// DEBUG: Log evidence analysis
	log.Debug().
		Str("skill", s.Name).
		Int("rawConfidence", rawConfidence).
		Int("evidenceCount", len(s.Evidence)).
		Bool("hasPackage", hasPackage).
		Bool("hasConfig", hasConfig).
		Strs("evidence", s.Evidence).
		Msg("🔍 Computing confidence")

	// 2. Apply Boosts (ENHANCED: Higher confidence floors)
	boostApplied := "none"
	if hasPackage && hasConfig {
		// Confirmed via dependency AND configuration -> Very High Confidence (95%+)
		if s.Confidence < 95 {
			s.Confidence = 95 // Increased from 90
			boostApplied = "package+config → 95%"
		}
	} else if len(s.Evidence) >= 2 {
		// Corroborated by multiple sources -> High Confidence (85%+)
		if s.Confidence < 85 {
			s.Confidence = 85 // Increased from 75
			boostApplied = "multiple_evidence → 85%"
		}
	} else if len(s.Evidence) == 1 && (hasPackage || hasConfig) {
		// Single strong evidence -> Good Base (75%+)
		if s.Confidence < 75 {
			s.Confidence = 75 // Increased from 60
			boostApplied = "single_strong → 75%"
		}
	}

	if s.Confidence > 100 {
		s.Confidence = 100
	}

	// DEBUG: Log final result
	if boostApplied != "none" {
		log.Info().
			Str("skill", s.Name).
			Int("raw", rawConfidence).
			Int("final", s.Confidence).
			Str("boost", boostApplied).
			Msg("✨ Evidence boost applied")
	}

	// Resume-ready if confidence > 60 and has evidence
	s.ResumeReady = s.Confidence >= 60 && len(s.Evidence) > 0
}

// ============================================
// VERDICT ENGINE (RECRUITER-GRADE OUTPUT)
// ============================================

type HireSignal string

const (
	HireStrongHire HireSignal = "STRONG_HIRE"
	HireHire       HireSignal = "HIRE"
	HireBorderline HireSignal = "BORDERLINE"
	HireNoHire     HireSignal = "NO_HIRE"
)

type Verdict struct {
	// Summary (1-2 lines)
	ProjectIntentSummary string `json:"projectIntentSummary"`

	// Tech Stack
	TechStackSnapshot []string `json:"techStackSnapshot"`

	// Scores
	ArchitectureMaturity int     `json:"architectureMaturity"` // 0-10
	OverallScore         float64 `json:"overallScore"`         // 0-100

	// Signals
	KeySignals      []string `json:"keySignals"`
	StrengthSignals []string `json:"strengthSignals"`
	RiskSignals     []string `json:"riskSignals"`

	// Suggestions (sorted by priority)
	Suggestions []Suggestion `json:"suggestions"`

	// Skills
	ExtractedSkills []ExtractedSkill `json:"extractedSkills"`

	// Recruiter Output
	SeniorEngineerVerdict string     `json:"seniorEngineerVerdict"`
	HireSignal            HireSignal `json:"hireSignal"`

	// Metadata
	AnalysisTimeMs   int64    `json:"analysisTimeMs"`
	ModulesExecuted  []string `json:"modulesExecuted"`
	ModulesSkipped   []string `json:"modulesSkipped"`
	EarlyTermination bool     `json:"earlyTermination"`
	ExitReason       string   `json:"exitReason,omitempty"`
}

// ============================================
// ANALYSIS CONTEXT (GO CONCURRENCY PATTERNS)
// ============================================

type AnalysisContext struct {
	Ctx          context.Context
	RepoPath     string
	ProjectNiche string // From user selection
	MaxTimeout   time.Duration
	SignalCache  map[string]interface{} // Shared signal cache
	Confidence   *SignalConfidenceVector
	Intent       ProjectIntent
	DevLevel     DeveloperLevel
	ArchIntent   ArchitectureIntent
}

// NewAnalysisContext creates context with defaults
func NewAnalysisContext(ctx context.Context, repoPath, niche string) *AnalysisContext {
	return &AnalysisContext{
		Ctx:          ctx,
		RepoPath:     repoPath,
		ProjectNiche: niche,
		MaxTimeout:   2 * time.Second,
		SignalCache:  make(map[string]interface{}),
		Confidence:   &SignalConfidenceVector{},
	}
}
