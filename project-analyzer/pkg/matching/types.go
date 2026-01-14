package matching

// ============================================
// JOB MATCHING SYSTEM
// Phase 3: Requirement Schema & Matching Algorithm
// ============================================

// JobRequirement defines what a job needs
type JobRequirement struct {
	ID      string        `json:"id"`
	Title   string        `json:"title"`
	Company string        `json:"company"`
	Level   RequiredLevel `json:"level"`
	Type    string        `json:"type"` // frontend, backend, fullstack, etc.

	// Dimension requirements
	Dimensions DimensionRequirements `json:"dimensions"`

	// Skill requirements
	MustHave   []SkillRequirement `json:"mustHave"`   // Required skills
	NiceToHave []SkillRequirement `json:"niceToHave"` // Bonus skills

	// Cultural & soft requirements
	TeamSize   string   `json:"teamSize"`   // small, medium, large
	WorkStyle  string   `json:"workStyle"`  // remote, hybrid, onsite
	Priorities []string `json:"priorities"` // speed, quality, innovation, etc.
}

// RequiredLevel specifies experience requirement
type RequiredLevel struct {
	Minimum  string `json:"minimum"`  // JUNIOR, MID_LEVEL, SENIOR, etc.
	Ideal    string `json:"ideal"`    // Preferred level
	Flexible bool   `json:"flexible"` // Accept lower with potential?
}

// DimensionRequirements specifies min scores per dimension
type DimensionRequirements struct {
	Fundamentals        DimensionReq `json:"fundamentals"`
	EngineeringDepth    DimensionReq `json:"engineeringDepth"`
	ProductionReadiness DimensionReq `json:"productionReadiness"`
	TestingMaturity     DimensionReq `json:"testingMaturity"`
	Architecture        DimensionReq `json:"architecture"`
	InfraDevOps         DimensionReq `json:"infraDevOps"`
}

// DimensionReq specifies requirement for one dimension
type DimensionReq struct {
	MinScore   float64 `json:"minScore"`   // Minimum acceptable (0-100)
	IdealScore float64 `json:"idealScore"` // What we really want
	Weight     float64 `json:"weight"`     // Importance for this role (0-1)
	Required   bool    `json:"required"`   // Is this dimension mandatory?
}

// SkillRequirement defines a skill need
type SkillRequirement struct {
	Skill            string  `json:"skill"`            // e.g., "React", "Kubernetes"
	MinProficiency   string  `json:"minProficiency"`   // BASIC, INTERMEDIATE, ADVANCED, EXPERT
	VerifiedRequired bool    `json:"verifiedRequired"` // Must be from verified source?
	Weight           float64 `json:"weight"`           // Importance (0-1)
}

// MatchResult is the output of matching algorithm
type MatchResult struct {
	CandidateID string `json:"candidateId"`
	JobID       string `json:"jobId"`

	// Overall assessment
	OverallFit FitCategory `json:"overallFit"`
	MatchScore float64     `json:"matchScore"` // 0-100
	Confidence float64     `json:"confidence"` // 0-1

	// Detailed breakdown
	DimensionMatch DimensionMatchResult `json:"dimensionMatch"`
	SkillMatch     SkillMatchResult     `json:"skillMatch"`
	LevelMatch     LevelMatchResult     `json:"levelMatch"`

	// Recruiter guidance
	Strengths      []string `json:"strengths"`
	Concerns       []string `json:"concerns"`
	InterviewFocus []string `json:"interviewFocus"`
	Recommendation string   `json:"recommendation"`
}

// FitCategory represents match quality
type FitCategory string

const (
	FitExcellent FitCategory = "EXCELLENT" // 85+, highly recommended
	FitGood      FitCategory = "GOOD"      // 70-84, solid match
	FitPotential FitCategory = "POTENTIAL" // 55-69, with development
	FitStretch   FitCategory = "STRETCH"   // 40-54, significant gap
	FitMismatch  FitCategory = "MISMATCH"  // <40, not recommended
)

// DimensionMatchResult shows how dimensions match
type DimensionMatchResult struct {
	OverallScore    float64                 `json:"overallScore"`
	ByDimension     map[string]DimensionFit `json:"byDimension"`
	MissingRequired []string                `json:"missingRequired"`
}

// DimensionFit shows fit for one dimension
type DimensionFit struct {
	CandidateScore float64 `json:"candidateScore"`
	RequiredMin    float64 `json:"requiredMin"`
	IdealScore     float64 `json:"idealScore"`
	FitScore       float64 `json:"fitScore"` // How well they fit (0-100)
	Gap            float64 `json:"gap"`      // Negative = below requirement
	Status         string  `json:"status"`   // EXCEEDS, MEETS, BELOW, MISSING
}

// SkillMatchResult shows skill coverage
type SkillMatchResult struct {
	MustHaveMatched   int      `json:"mustHaveMatched"`
	MustHaveTotal     int      `json:"mustHaveTotal"`
	MustHaveScore     float64  `json:"mustHaveScore"` // Percentage matched
	NiceToHaveMatched int      `json:"niceToHaveMatched"`
	NiceToHaveTotal   int      `json:"niceToHaveTotal"`
	MissingMustHave   []string `json:"missingMustHave"`
	BonusSkills       []string `json:"bonusSkills"` // Extra skills they have
}

// LevelMatchResult shows experience level fit
type LevelMatchResult struct {
	CandidateLevel string `json:"candidateLevel"`
	RequiredMin    string `json:"requiredMin"`
	IdealLevel     string `json:"idealLevel"`
	Status         string `json:"status"`   // EXCEEDS, MEETS, BELOW, UNDER_QUALIFIED
	LevelGap       int    `json:"levelGap"` // Levels difference (negative = below)
}

// JobTemplates provides common job requirement templates
var JobTemplates = map[string]JobRequirement{
	"frontend_junior": {
		Title: "Junior Frontend Developer",
		Level: RequiredLevel{Minimum: "FRESH_GRAD", Ideal: "JUNIOR", Flexible: true},
		Type:  "frontend",
		Dimensions: DimensionRequirements{
			Fundamentals:        DimensionReq{MinScore: 40, IdealScore: 60, Weight: 0.30, Required: true},
			EngineeringDepth:    DimensionReq{MinScore: 20, IdealScore: 40, Weight: 0.25, Required: false},
			ProductionReadiness: DimensionReq{MinScore: 10, IdealScore: 30, Weight: 0.10, Required: false},
			TestingMaturity:     DimensionReq{MinScore: 10, IdealScore: 25, Weight: 0.15, Required: false},
			Architecture:        DimensionReq{MinScore: 10, IdealScore: 25, Weight: 0.15, Required: false},
			InfraDevOps:         DimensionReq{MinScore: 0, IdealScore: 10, Weight: 0.05, Required: false},
		},
		MustHave: []SkillRequirement{
			{Skill: "JavaScript", MinProficiency: "INTERMEDIATE", Weight: 1.0},
			{Skill: "React", MinProficiency: "BASIC", Weight: 0.9},
			{Skill: "HTML", MinProficiency: "INTERMEDIATE", Weight: 0.8},
			{Skill: "CSS", MinProficiency: "INTERMEDIATE", Weight: 0.8},
		},
	},
	"backend_senior": {
		Title: "Senior Backend Developer",
		Level: RequiredLevel{Minimum: "MID_LEVEL", Ideal: "SENIOR", Flexible: false},
		Type:  "backend",
		Dimensions: DimensionRequirements{
			Fundamentals:        DimensionReq{MinScore: 65, IdealScore: 80, Weight: 0.20, Required: true},
			EngineeringDepth:    DimensionReq{MinScore: 55, IdealScore: 75, Weight: 0.25, Required: true},
			ProductionReadiness: DimensionReq{MinScore: 50, IdealScore: 70, Weight: 0.20, Required: true},
			TestingMaturity:     DimensionReq{MinScore: 45, IdealScore: 65, Weight: 0.15, Required: true},
			Architecture:        DimensionReq{MinScore: 50, IdealScore: 70, Weight: 0.15, Required: true},
			InfraDevOps:         DimensionReq{MinScore: 30, IdealScore: 50, Weight: 0.05, Required: false},
		},
		MustHave: []SkillRequirement{
			{Skill: "API Design", MinProficiency: "ADVANCED", Weight: 1.0},
			{Skill: "Databases", MinProficiency: "ADVANCED", Weight: 1.0},
			{Skill: "System Design", MinProficiency: "INTERMEDIATE", Weight: 0.9},
		},
	},
	"fullstack_mid": {
		Title: "Mid-Level Fullstack Developer",
		Level: RequiredLevel{Minimum: "JUNIOR", Ideal: "MID_LEVEL", Flexible: true},
		Type:  "fullstack",
		Dimensions: DimensionRequirements{
			Fundamentals:        DimensionReq{MinScore: 50, IdealScore: 70, Weight: 0.20, Required: true},
			EngineeringDepth:    DimensionReq{MinScore: 40, IdealScore: 55, Weight: 0.20, Required: true},
			ProductionReadiness: DimensionReq{MinScore: 35, IdealScore: 50, Weight: 0.20, Required: false},
			TestingMaturity:     DimensionReq{MinScore: 30, IdealScore: 45, Weight: 0.15, Required: false},
			Architecture:        DimensionReq{MinScore: 35, IdealScore: 50, Weight: 0.15, Required: false},
			InfraDevOps:         DimensionReq{MinScore: 20, IdealScore: 35, Weight: 0.10, Required: false},
		},
		MustHave: []SkillRequirement{
			{Skill: "JavaScript", MinProficiency: "ADVANCED", Weight: 1.0},
			{Skill: "React", MinProficiency: "INTERMEDIATE", Weight: 0.9},
			{Skill: "Node.js", MinProficiency: "INTERMEDIATE", Weight: 0.9},
			{Skill: "SQL", MinProficiency: "INTERMEDIATE", Weight: 0.8},
		},
	},
	"devops_senior": {
		Title: "Senior DevOps Engineer",
		Level: RequiredLevel{Minimum: "MID_LEVEL", Ideal: "SENIOR", Flexible: false},
		Type:  "infra",
		Dimensions: DimensionRequirements{
			Fundamentals:        DimensionReq{MinScore: 40, IdealScore: 55, Weight: 0.10, Required: false},
			EngineeringDepth:    DimensionReq{MinScore: 35, IdealScore: 50, Weight: 0.15, Required: false},
			ProductionReadiness: DimensionReq{MinScore: 65, IdealScore: 85, Weight: 0.25, Required: true},
			TestingMaturity:     DimensionReq{MinScore: 30, IdealScore: 45, Weight: 0.10, Required: false},
			Architecture:        DimensionReq{MinScore: 55, IdealScore: 70, Weight: 0.15, Required: true},
			InfraDevOps:         DimensionReq{MinScore: 70, IdealScore: 90, Weight: 0.25, Required: true},
		},
		MustHave: []SkillRequirement{
			{Skill: "Kubernetes", MinProficiency: "ADVANCED", Weight: 1.0},
			{Skill: "Docker", MinProficiency: "ADVANCED", Weight: 1.0},
			{Skill: "CI/CD", MinProficiency: "ADVANCED", Weight: 0.9},
			{Skill: "Cloud", MinProficiency: "ADVANCED", Weight: 0.9},
		},
	},
}
