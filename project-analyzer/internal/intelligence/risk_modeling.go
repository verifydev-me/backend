package intelligence

// ============================================
// RISK & UNCERTAINTY MODELING
// Explicit modeling of unknowns and assumptions
// ============================================

// UncertaintyType categorizes types of uncertainty
type UncertaintyType string

const (
	UncertaintyMissing    UncertaintyType = "MISSING"    // Expected signal not found
	UncertaintyAmbiguous  UncertaintyType = "AMBIGUOUS"  // Conflicting signals
	UncertaintyAssumption UncertaintyType = "ASSUMPTION" // Risky inference made
	UncertaintyLimited    UncertaintyType = "LIMITED"    // Insufficient data
)

// UncertaintyImpact describes severity of uncertainty
type UncertaintyImpact string

const (
	ImpactHigh   UncertaintyImpact = "HIGH"
	ImpactMedium UncertaintyImpact = "MEDIUM"
	ImpactLow    UncertaintyImpact = "LOW"
)

// Uncertainty represents a single unknown or assumption
type Uncertainty struct {
	Type        UncertaintyType   `json:"type"`
	Description string            `json:"description"`
	Impact      UncertaintyImpact `json:"impact"`
	Affects     []string          `json:"affects"`              // Skills/scores affected
	Mitigation  string            `json:"mitigation,omitempty"` // How to reduce this uncertainty
}

// RiskLevel is the aggregate risk assessment
type RiskLevel string

const (
	RiskHigh     RiskLevel = "HIGH"
	RiskModerate RiskLevel = "MODERATE"
	RiskLow      RiskLevel = "LOW"
)

// RiskProfile is the complete uncertainty assessment
type RiskProfile struct {
	Unknowns         []Uncertainty `json:"unknowns"`
	RiskLevel        RiskLevel     `json:"riskLevel"`
	HighRiskCount    int           `json:"highRiskCount"`
	MediumRiskCount  int           `json:"mediumRiskCount"`
	HiringImpact     string        `json:"hiringImpact"`
	Recommendations  []string      `json:"recommendations"`
	ConfidenceAdjust float64       `json:"confidenceAdjust"` // Penalty to apply (-0.0 to -0.30)
}

// RiskProfileBuilder constructs risk profiles
type RiskProfileBuilder struct {
	uncertainties []Uncertainty
}

// NewRiskProfileBuilder creates a new builder
func NewRiskProfileBuilder() *RiskProfileBuilder {
	return &RiskProfileBuilder{
		uncertainties: make([]Uncertainty, 0),
	}
}

// AddMissingSignal adds uncertainty for missing expected signal
func (b *RiskProfileBuilder) AddMissingSignal(description string, impact UncertaintyImpact, affects []string) *RiskProfileBuilder {
	b.uncertainties = append(b.uncertainties, Uncertainty{
		Type:        UncertaintyMissing,
		Description: description,
		Impact:      impact,
		Affects:     affects,
		Mitigation:  "Verify presence during technical interview",
	})
	return b
}

// AddAmbiguousSignal adds uncertainty for conflicting signals
func (b *RiskProfileBuilder) AddAmbiguousSignal(description string, impact UncertaintyImpact, affects []string) *RiskProfileBuilder {
	b.uncertainties = append(b.uncertainties, Uncertainty{
		Type:        UncertaintyAmbiguous,
		Description: description,
		Impact:      impact,
		Affects:     affects,
		Mitigation:  "Clarify during screening call",
	})
	return b
}

// AddAssumption adds uncertainty for a risky inference
func (b *RiskProfileBuilder) AddAssumption(description string, impact UncertaintyImpact, affects []string) *RiskProfileBuilder {
	b.uncertainties = append(b.uncertainties, Uncertainty{
		Type:        UncertaintyAssumption,
		Description: description,
		Impact:      impact,
		Affects:     affects,
		Mitigation:  "Validate assumption with portfolio review",
	})
	return b
}

// AddLimitedData adds uncertainty due to insufficient data
func (b *RiskProfileBuilder) AddLimitedData(description string, impact UncertaintyImpact, affects []string) *RiskProfileBuilder {
	b.uncertainties = append(b.uncertainties, Uncertainty{
		Type:        UncertaintyLimited,
		Description: description,
		Impact:      impact,
		Affects:     affects,
		Mitigation:  "Request additional projects or code samples",
	})
	return b
}

// Build constructs the final RiskProfile
func (b *RiskProfileBuilder) Build() RiskProfile {
	profile := RiskProfile{
		Unknowns:        b.uncertainties,
		Recommendations: make([]string, 0),
	}

	// Count by impact level
	for _, u := range b.uncertainties {
		switch u.Impact {
		case ImpactHigh:
			profile.HighRiskCount++
		case ImpactMedium:
			profile.MediumRiskCount++
		}
	}

	// Determine overall risk level
	profile.RiskLevel = b.calculateRiskLevel(profile.HighRiskCount, profile.MediumRiskCount)

	// Generate hiring impact statement
	profile.HiringImpact = b.generateHiringImpact(profile.RiskLevel, profile.HighRiskCount)

	// Generate recommendations
	profile.Recommendations = b.generateRecommendations()

	// Calculate confidence adjustment
	profile.ConfidenceAdjust = b.calculateConfidenceAdjust(profile.HighRiskCount, profile.MediumRiskCount)

	return profile
}

func (b *RiskProfileBuilder) calculateRiskLevel(high, medium int) RiskLevel {
	if high >= 3 {
		return RiskHigh
	}
	if high >= 1 || medium >= 3 {
		return RiskModerate
	}
	return RiskLow
}

func (b *RiskProfileBuilder) generateHiringImpact(level RiskLevel, highCount int) string {
	switch level {
	case RiskHigh:
		return "High uncertainty - recommend thorough technical interview before proceeding"
	case RiskModerate:
		return "Moderate uncertainty - standard interview process with attention to flagged areas"
	case RiskLow:
		return "Low uncertainty - strong evidence supports skill claims"
	default:
		return "Unable to determine risk level"
	}
}

func (b *RiskProfileBuilder) generateRecommendations() []string {
	recs := make([]string, 0)

	hasMissingTests := false
	hasAmbiguous := false
	hasLimitedData := false

	for _, u := range b.uncertainties {
		if u.Type == UncertaintyMissing && containsString(u.Affects, "Testing") {
			hasMissingTests = true
		}
		if u.Type == UncertaintyAmbiguous {
			hasAmbiguous = true
		}
		if u.Type == UncertaintyLimited {
			hasLimitedData = true
		}
	}

	if hasMissingTests {
		recs = append(recs, "Ask about testing strategy and practices during interview")
	}
	if hasAmbiguous {
		recs = append(recs, "Clarify conflicting signals during technical screening")
	}
	if hasLimitedData {
		recs = append(recs, "Request additional code samples or projects for fuller picture")
	}

	if len(recs) == 0 {
		recs = append(recs, "Standard interview process recommended")
	}

	return recs
}

func (b *RiskProfileBuilder) calculateConfidenceAdjust(high, medium int) float64 {
	// Each high-risk item reduces confidence by 8%
	// Each medium-risk item reduces confidence by 3%
	adjust := float64(high)*0.08 + float64(medium)*0.03

	// Cap at 30% reduction
	if adjust > 0.30 {
		adjust = 0.30
	}

	return -adjust
}

func containsString(slice []string, target string) bool {
	for _, s := range slice {
		if s == target {
			return true
		}
	}
	return false
}

// ============================================
// COMMON UNCERTAINTY PATTERNS
// Pre-defined uncertainties for common situations
// ============================================

// CommonUncertainties provides factory methods for frequent patterns
var CommonUncertainties = struct {
	NoTests            func() Uncertainty
	NoDocumentation    func() Uncertainty
	SmallProject       func() Uncertainty
	SingleRepo         func() Uncertainty
	MixedLanguages     func() Uncertainty
	ToyProject         func() Uncertainty
	InferredProduction func() Uncertainty
}{
	NoTests: func() Uncertainty {
		return Uncertainty{
			Type:        UncertaintyMissing,
			Description: "No test files detected in codebase",
			Impact:      ImpactHigh,
			Affects:     []string{"Testing Discipline", "Code Quality"},
			Mitigation:  "Verify testing practices during interview",
		}
	},
	NoDocumentation: func() Uncertainty {
		return Uncertainty{
			Type:        UncertaintyMissing,
			Description: "No README or documentation found",
			Impact:      ImpactLow,
			Affects:     []string{"Documentation Skills", "Communication"},
			Mitigation:  "Ask about documentation practices",
		}
	},
	SmallProject: func() Uncertainty {
		return Uncertainty{
			Type:        UncertaintyLimited,
			Description: "Project has fewer than 20 files, limiting analysis depth",
			Impact:      ImpactMedium,
			Affects:     []string{"Overall Score", "Architecture Assessment"},
			Mitigation:  "Request additional projects for fuller assessment",
		}
	},
	SingleRepo: func() Uncertainty {
		return Uncertainty{
			Type:        UncertaintyLimited,
			Description: "Assessment based on single repository only",
			Impact:      ImpactMedium,
			Affects:     []string{"Skill Breadth", "Experience Level"},
			Mitigation:  "Review additional repositories if available",
		}
	},
	MixedLanguages: func() Uncertainty {
		return Uncertainty{
			Type:        UncertaintyAmbiguous,
			Description: "Multiple primary languages detected with similar usage",
			Impact:      ImpactLow,
			Affects:     []string{"Primary Language", "Specialization"},
			Mitigation:  "Clarify primary expertise area during screening",
		}
	},
	ToyProject: func() Uncertainty {
		return Uncertainty{
			Type:        UncertaintyAssumption,
			Description: "Project appears to be tutorial/learning project, not production code",
			Impact:      ImpactMedium,
			Affects:     []string{"Experience Level", "Production Readiness"},
			Mitigation:  "Request production project examples",
		}
	},
	InferredProduction: func() Uncertainty {
		return Uncertainty{
			Type:        UncertaintyAssumption,
			Description: "Production usage assumed from Dockerfile/deployment configs",
			Impact:      ImpactLow,
			Affects:     []string{"Production Experience"},
			Mitigation:  "Confirm deployment history",
		}
	},
}
