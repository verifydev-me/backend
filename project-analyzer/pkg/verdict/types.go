package verdict

// ============================================
// VERDICT SYSTEM
// Phase 2: Experience Classification & Templates
// ============================================

// ExperienceLevel represents developer experience classification
type ExperienceLevel string

const (
	ExperienceFreshGrad ExperienceLevel = "FRESH_GRAD" // 0-1 years
	ExperienceJunior    ExperienceLevel = "JUNIOR"     // 1-2 years
	ExperienceMidLevel  ExperienceLevel = "MID_LEVEL"  // 2-4 years
	ExperienceSenior    ExperienceLevel = "SENIOR"     // 4-7 years
	ExperienceStaff     ExperienceLevel = "STAFF"      // 7-10 years
	ExperiencePrincipal ExperienceLevel = "PRINCIPAL"  // 10+ years
)

// ExperienceClassification holds the result of level detection
type ExperienceClassification struct {
	Level                ExperienceLevel `json:"level"`
	Confidence           float64         `json:"confidence"` // 0-1
	SupportingSignals    []string        `json:"supportingSignals"`
	ContradictingSignals []string        `json:"contradictingSignals"`
	EstimatedYears       YearRange       `json:"estimatedYears"`
}

// YearRange provides estimated experience range
type YearRange struct {
	Min      float64 `json:"min"`
	Max      float64 `json:"max"`
	Estimate float64 `json:"estimate"`
}

// Verdict is the final human-readable assessment
type Verdict struct {
	Summary              string                   `json:"summary"`              // One sentence overview
	Strengths            []VerdictStatement       `json:"strengths"`            // What they're good at
	GrowthAreas          []VerdictStatement       `json:"growthAreas"`          // Areas to improve
	NotablePatterns      []VerdictStatement       `json:"notablePatterns"`      // Interesting observations
	Experience           ExperienceClassification `json:"experience"`           // Level classification
	HiringRecommendation string                   `json:"hiringRecommendation"` // For recruiter view
	Cautions             []string                 `json:"cautions"`             // What to verify in interview
}

// VerdictStatement is a single observation with evidence
type VerdictStatement struct {
	Statement  string   `json:"statement"`  // Human-readable observation
	Evidence   []string `json:"evidence"`   // Supporting signals
	Confidence string   `json:"confidence"` // HIGH, MEDIUM, LOW
	IsVerified bool     `json:"isVerified"` // From verified sources?
}

// ExperienceLevelThresholds maps dimension profiles to experience levels
var ExperienceLevelThresholds = map[ExperienceLevel]LevelProfile{
	ExperienceFreshGrad: {
		MinFundamentals: 20, MaxFundamentals: 50,
		MinEngineeringDepth: 0, MaxEngineeringDepth: 25,
		MinProductionReadiness: 0, MaxProductionReadiness: 20,
		MinTestingMaturity: 0, MaxTestingMaturity: 15,
		MinArchitecture: 0, MaxArchitecture: 20,
		MinInfraDevOps: 0, MaxInfraDevOps: 10,
	},
	ExperienceJunior: {
		MinFundamentals: 40, MaxFundamentals: 65,
		MinEngineeringDepth: 15, MaxEngineeringDepth: 40,
		MinProductionReadiness: 10, MaxProductionReadiness: 35,
		MinTestingMaturity: 5, MaxTestingMaturity: 30,
		MinArchitecture: 10, MaxArchitecture: 35,
		MinInfraDevOps: 0, MaxInfraDevOps: 20,
	},
	ExperienceMidLevel: {
		MinFundamentals: 55, MaxFundamentals: 80,
		MinEngineeringDepth: 35, MaxEngineeringDepth: 60,
		MinProductionReadiness: 30, MaxProductionReadiness: 55,
		MinTestingMaturity: 25, MaxTestingMaturity: 50,
		MinArchitecture: 30, MaxArchitecture: 55,
		MinInfraDevOps: 15, MaxInfraDevOps: 40,
	},
	ExperienceSenior: {
		MinFundamentals: 70, MaxFundamentals: 95,
		MinEngineeringDepth: 55, MaxEngineeringDepth: 80,
		MinProductionReadiness: 50, MaxProductionReadiness: 75,
		MinTestingMaturity: 45, MaxTestingMaturity: 70,
		MinArchitecture: 50, MaxArchitecture: 75,
		MinInfraDevOps: 35, MaxInfraDevOps: 65,
	},
	ExperienceStaff: {
		MinFundamentals: 80, MaxFundamentals: 100,
		MinEngineeringDepth: 70, MaxEngineeringDepth: 95,
		MinProductionReadiness: 65, MaxProductionReadiness: 90,
		MinTestingMaturity: 60, MaxTestingMaturity: 85,
		MinArchitecture: 65, MaxArchitecture: 90,
		MinInfraDevOps: 55, MaxInfraDevOps: 85,
	},
	ExperiencePrincipal: {
		MinFundamentals: 85, MaxFundamentals: 100,
		MinEngineeringDepth: 80, MaxEngineeringDepth: 100,
		MinProductionReadiness: 75, MaxProductionReadiness: 100,
		MinTestingMaturity: 70, MaxTestingMaturity: 100,
		MinArchitecture: 80, MaxArchitecture: 100,
		MinInfraDevOps: 70, MaxInfraDevOps: 100,
	},
}

// LevelProfile defines dimension ranges for an experience level
type LevelProfile struct {
	MinFundamentals        float64
	MaxFundamentals        float64
	MinEngineeringDepth    float64
	MaxEngineeringDepth    float64
	MinProductionReadiness float64
	MaxProductionReadiness float64
	MinTestingMaturity     float64
	MaxTestingMaturity     float64
	MinArchitecture        float64
	MaxArchitecture        float64
	MinInfraDevOps         float64
	MaxInfraDevOps         float64
}

// YearRanges maps experience levels to year estimates
var YearRanges = map[ExperienceLevel]YearRange{
	ExperienceFreshGrad: {Min: 0, Max: 1, Estimate: 0.5},
	ExperienceJunior:    {Min: 1, Max: 2, Estimate: 1.5},
	ExperienceMidLevel:  {Min: 2, Max: 4, Estimate: 3},
	ExperienceSenior:    {Min: 4, Max: 7, Estimate: 5.5},
	ExperienceStaff:     {Min: 7, Max: 10, Estimate: 8.5},
	ExperiencePrincipal: {Min: 10, Max: 20, Estimate: 12},
}
