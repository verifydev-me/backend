package api

// ============================================
// API INTEGRATION
// Phase 5: Response Schema & Dashboard Compatibility
// ============================================

import (
	"github.com/verifydev/project-analyzer/pkg/dimensions"
	"github.com/verifydev/project-analyzer/pkg/matching"
	"github.com/verifydev/project-analyzer/pkg/trust"
	"github.com/verifydev/project-analyzer/pkg/verdict"
)

// AnalysisResponse is the complete API response
type AnalysisResponse struct {
	// Metadata
	Version    string `json:"version"` // API version
	AnalysisID string `json:"analysisId"`
	ProjectID  string `json:"projectId"`
	Timestamp  string `json:"timestamp"`

	// Core analysis
	Dimensions *dimensions.DimensionMatrix `json:"dimensions"`
	Verdict    *verdict.Verdict            `json:"verdict"`
	Trust      *trust.TrustAnalysis        `json:"trust"`

	// Legacy compatibility (deprecated, use dimensions)
	LegacyScores *LegacyScores `json:"legacyScores,omitempty"`

	// Summary for quick display
	Summary ResponseSummary `json:"summary"`
}

// LegacyScores maintains backward compatibility
type LegacyScores struct {
	Overall    float64 `json:"overall"`
	Deprecated bool    `json:"deprecated"` // Always true
	Message    string  `json:"message"`    // "Use dimensions for accurate assessment"
}

// ResponseSummary provides quick overview
type ResponseSummary struct {
	ExperienceLevel string   `json:"experienceLevel"`
	TopStrengths    []string `json:"topStrengths"`
	MainGaps        []string `json:"mainGaps"`
	TrustLevel      string   `json:"trustLevel"`
	OneLineSummary  string   `json:"oneLineSummary"`
}

// MatchResponse is the job matching API response
type MatchResponse struct {
	JobID      string                  `json:"jobId"`
	Matches    []*matching.MatchResult `json:"matches"`
	TotalCount int                     `json:"totalCount"`
	Filters    MatchFilters            `json:"filters"`
}

// MatchFilters shows applied filters
type MatchFilters struct {
	MinScore         float64  `json:"minScore"`
	RequiredSkills   []string `json:"requiredSkills"`
	ExperienceLevels []string `json:"experienceLevels"`
}

// DashboardView is optimized for recruiter dashboard
type DashboardView struct {
	CandidateID string `json:"candidateId"`
	DisplayName string `json:"displayName"`

	// Quick stats for cards
	QuickStats QuickStats `json:"quickStats"`

	// Detailed view data
	DimensionChart DimensionChart `json:"dimensionChart"`
	SkillMatrix    SkillMatrix    `json:"skillMatrix"`

	// Recruiter actions
	Actions RecruiterActions `json:"actions"`
}

// QuickStats for dashboard cards
type QuickStats struct {
	ExperienceLevel string `json:"experienceLevel"`
	OverallFit      string `json:"overallFit"` // EXCELLENT, GOOD, etc.
	MatchScore      int    `json:"matchScore"` // 0-100
	TrustLevel      string `json:"trustLevel"`
	VerifiedSkills  int    `json:"verifiedSkills"`
	TotalSkills     int    `json:"totalSkills"`
	ProjectCount    int    `json:"projectCount"`
}

// DimensionChart for radar/spider chart
type DimensionChart struct {
	Labels []string    `json:"labels"`
	Scores []float64   `json:"scores"`
	Bands  [][]float64 `json:"bands"` // [lower, upper] for each
}

// SkillMatrix for skill comparison view
type SkillMatrix struct {
	Required   []SkillCell `json:"required"`
	NiceToHave []SkillCell `json:"niceToHave"`
	Bonus      []SkillCell `json:"bonus"`
}

// SkillCell represents one skill in the matrix
type SkillCell struct {
	Name       string  `json:"name"`
	Level      string  `json:"level"`  // BASIC, INTERMEDIATE, etc.
	Status     string  `json:"status"` // HAS, MISSING, PARTIAL
	IsVerified bool    `json:"isVerified"`
	Confidence float64 `json:"confidence"`
}

// RecruiterActions are available actions
type RecruiterActions struct {
	CanShortlist   bool   `json:"canShortlist"`
	CanReject      bool   `json:"canReject"`
	CanSchedule    bool   `json:"canSchedule"`
	InterviewGuide string `json:"interviewGuide"` // URL to generated guide
}

// ABTestConfig for verdict accuracy testing
type ABTestConfig struct {
	TestID   string         `json:"testId"`
	Variant  string         `json:"variant"`  // "control" or "treatment"
	Features []string       `json:"features"` // Enabled features
	Tracking ABTestTracking `json:"tracking"`
}

// ABTestTracking for analytics
type ABTestTracking struct {
	ImpressionID string `json:"impressionId"`
	Timestamp    string `json:"timestamp"`
	UserID       string `json:"userId"`
	Context      string `json:"context"` // Where shown
}

// ABTestVariants defines available test variants
var ABTestVariants = map[string]ABTestVariant{
	"verdict_v1": {
		Name:        "Original Verdict",
		Description: "Traditional single-score verdict",
		Features:    []string{"legacy_scores", "simple_verdict"},
	},
	"verdict_v2": {
		Name:        "Multi-Dimensional Verdict",
		Description: "6-dimension analysis with confidence bands",
		Features:    []string{"dimensions", "confidence_bands", "context_weights"},
	},
	"verdict_v3": {
		Name:        "Full Trust System",
		Description: "Complete trust analysis with authenticity scoring",
		Features:    []string{"dimensions", "confidence_bands", "trust_signals", "learning_detection"},
	},
}

// ABTestVariant defines a test variant
type ABTestVariant struct {
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Features    []string `json:"features"`
}

// WebhookPayload for integration events
type WebhookPayload struct {
	Event     string      `json:"event"` // analysis.complete, match.found, etc.
	Timestamp string      `json:"timestamp"`
	Data      interface{} `json:"data"`
	Signature string      `json:"signature"` // HMAC signature
}

// WebhookEvents
const (
	EventAnalysisComplete = "analysis.complete"
	EventMatchFound       = "match.found"
	EventTrustFlagged     = "trust.flagged"
	EventVerdictGenerated = "verdict.generated"
)

// ErrorResponse for API errors
type ErrorResponse struct {
	Code      string            `json:"code"`
	Message   string            `json:"message"`
	Details   map[string]string `json:"details,omitempty"`
	RequestID string            `json:"requestId"`
}

// Common error codes
const (
	ErrCodeInvalidInput   = "INVALID_INPUT"
	ErrCodeNotFound       = "NOT_FOUND"
	ErrCodeAnalysisFailed = "ANALYSIS_FAILED"
	ErrCodeRateLimited    = "RATE_LIMITED"
	ErrCodeUnauthorized   = "UNAUTHORIZED"
)
