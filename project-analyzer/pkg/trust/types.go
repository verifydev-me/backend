package trust

import "time"

// ============================================
// TRUST SIGNALS SYSTEM
// Phase 4: Effort, Learning Detection, Authenticity
// ============================================

// TrustAnalysis is the complete trust assessment
type TrustAnalysis struct {
	Effort       EffortAnalysis       `json:"effort"`
	Authenticity AuthenticityAnalysis `json:"authenticity"`
	Learning     LearningAnalysis     `json:"learning"`
	Consistency  ConsistencyAnalysis  `json:"consistency"`

	// Overall trust score
	OverallTrust OverallTrust `json:"overallTrust"`
	Flags        []TrustFlag  `json:"flags"`
}

// EffortAnalysis measures development effort
type EffortAnalysis struct {
	CommitPattern   CommitPattern `json:"commitPattern"`
	DevelopmentSpan time.Duration `json:"developmentSpan"`
	ActiveDays      int           `json:"activeDays"`
	CodeChurn       float64       `json:"codeChurn"`      // Additions/deletions ratio
	IterationCount  int           `json:"iterationCount"` // How many revision cycles

	EffortScore    float64              `json:"effortScore"` // 0-100
	EffortBand     ConfidenceBand       `json:"effortBand"`
	Classification EffortClassification `json:"classification"`
}

// CommitPattern analyzes commit behavior
type CommitPattern struct {
	TotalCommits       int     `json:"totalCommits"`
	CommitSizeAvg      int     `json:"commitSizeAvg"` // Lines per commit
	CommitSizeVariance float64 `json:"commitSizeVariance"`

	// Red flags
	HasBulkImport bool `json:"hasBulkImport"` // One huge commit
	IsRegular     bool `json:"isRegular"`     // Consistent development

	// Evidence
	FirstCommit time.Time `json:"firstCommit"`
	LastCommit  time.Time `json:"lastCommit"`
}

// EffortClassification categorizes effort level
type EffortClassification string

const (
	EffortSignificant EffortClassification = "SIGNIFICANT" // Sustained development
	EffortModerate    EffortClassification = "MODERATE"    // Normal project
	EffortMinimal     EffortClassification = "MINIMAL"     // Quick project
	EffortSuspicious  EffortClassification = "SUSPICIOUS"  // Unusual patterns
)

// AuthenticityAnalysis detects original vs copied code
type AuthenticityAnalysis struct {
	AuthenticityScore float64              `json:"authenticityScore"` // 0-100
	Signals           []AuthenticitySignal `json:"signals"`
}

// AuthenticitySignal represents evidence of authenticity
type AuthenticitySignal struct {
	Type       SignalType `json:"type"`
	Name       string     `json:"name"`
	Evidence   string     `json:"evidence"`
	Confidence float64    `json:"confidence"`
}

// SignalType indicates positive or negative signal
type SignalType string

const (
	SignalPositive SignalType = "POSITIVE"
	SignalNegative SignalType = "NEGATIVE"
	SignalNeutral  SignalType = "NEUTRAL"
)

// LearningAnalysis detects if project is learning exercise
type LearningAnalysis struct {
	IsLikelyLearning bool                `json:"isLikelyLearning"`
	LearningScore    float64             `json:"learningScore"` // 0-1
	Indicators       []LearningIndicator `json:"indicators"`
}

// LearningIndicator is evidence of learning project
type LearningIndicator struct {
	Type       string  `json:"type"`
	Evidence   string  `json:"evidence"`
	Confidence float64 `json:"confidence"`
}

// ConsistencyAnalysis checks for internal project consistency
type ConsistencyAnalysis struct {
	ConsistencyScore float64            `json:"consistencyScore"`
	Issues           []ConsistencyIssue `json:"issues"`
}

// ConsistencyIssue represents an inconsistency found
type ConsistencyIssue struct {
	Type     string `json:"type"`
	Severity string `json:"severity"`
	Evidence string `json:"evidence"`
}

// OverallTrust is the final trust assessment
type OverallTrust struct {
	Score          float64             `json:"score"` // 0-100
	Classification TrustClassification `json:"classification"`
	Band           ConfidenceBand      `json:"band"`
}

// TrustClassification categorizes trust level
type TrustClassification string

const (
	TrustHigh       TrustClassification = "HIGH"       // Verified, authentic work
	TrustMedium     TrustClassification = "MEDIUM"     // Likely authentic
	TrustLow        TrustClassification = "LOW"        // Some concerns
	TrustSuspicious TrustClassification = "SUSPICIOUS" // Multiple red flags
)

// ConfidenceBand provides uncertainty range
type ConfidenceBand struct {
	Lower    float64 `json:"lower"`
	Expected float64 `json:"expected"`
	Upper    float64 `json:"upper"`
}

// TrustFlag represents a specific concern or positive signal
type TrustFlag struct {
	Type       FlagType `json:"type"`
	Category   string   `json:"category"`
	Message    string   `json:"message"`
	Confidence float64  `json:"confidence"`
}

// FlagType categorizes the flag severity
type FlagType string

const (
	FlagCritical FlagType = "CRITICAL"
	FlagWarning  FlagType = "WARNING"
	FlagInfo     FlagType = "INFO"
)
