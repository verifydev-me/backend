package signals

// ============================================
// LAYER 2: VERIFIED SKILLS
// Skills inferred from signals using rules
// DETERMINISTIC - NO AI HALLUCINATION
// ============================================

// SkillCategory - Categorization for skills
type SkillCategory string

const (
	CategoryArchitecture   SkillCategory = "architecture"
	CategoryInfrastructure SkillCategory = "infrastructure"
	CategoryDatabase       SkillCategory = "database"
	CategoryMessaging      SkillCategory = "messaging"
	CategorySecurity       SkillCategory = "security"
	CategoryDevOps         SkillCategory = "devops"
	CategoryObservability  SkillCategory = "observability"
	CategoryTesting        SkillCategory = "testing"
	CategoryLanguage       SkillCategory = "language"
	CategoryFramework      SkillCategory = "framework"
	CategoryCloud          SkillCategory = "cloud"
	CategoryPerformance    SkillCategory = "performance"
	CategoryML             SkillCategory = "ml"
	CategoryDataScience    SkillCategory = "data_science"
)

// SkillLevel - Proficiency level
type SkillLevel string

const (
	LevelBasic        SkillLevel = "basic"
	LevelIntermediate SkillLevel = "intermediate"
	LevelAdvanced     SkillLevel = "advanced"
	LevelExpert       SkillLevel = "expert"
)

// VerifiedSkill - A skill proven by code evidence
type VerifiedSkill struct {
	Name        string        `json:"name"`
	Category    SkillCategory `json:"category"`
	Level       SkillLevel    `json:"level"`
	Confidence  float64       `json:"confidence"`  // 0.0 - 1.0
	Evidence    []string      `json:"evidence"`    // Human-readable proof
	Signals     []InfraSignal `json:"signals"`     // Underlying signals
	Keywords    []string      `json:"keywords"`    // Related keywords for search
	ResumeReady bool          `json:"resumeReady"` // Safe to put on resume
	Weight      int           `json:"weight"`      // Importance (1-10) for scoring
}

// ArchitectureType - System architecture classification
type ArchitectureType string

const (
	ArchMonolith     ArchitectureType = "monolith"
	ArchMicroservice ArchitectureType = "microservices"
	ArchMonorepo     ArchitectureType = "monorepo"
	ArchServerless   ArchitectureType = "serverless"
	ArchEventDriven  ArchitectureType = "event_driven"
	ArchModular      ArchitectureType = "modular_monolith"
	ArchLayered      ArchitectureType = "layered"
	ArchHexagonal    ArchitectureType = "hexagonal"
	ArchClean        ArchitectureType = "clean_architecture"
)

// CommunicationType - How services communicate
type CommunicationType string

const (
	CommHTTP      CommunicationType = "http"
	CommREST      CommunicationType = "rest"
	CommGraphQL   CommunicationType = "graphql"
	CommGRPC      CommunicationType = "grpc"
	CommWebSocket CommunicationType = "websocket"
	CommMessage   CommunicationType = "message_queue"
	CommEvent     CommunicationType = "event_bus"
)

// SystemArchitecture - Overall system design
type SystemArchitecture struct {
	Type             ArchitectureType    `json:"type"`
	Communication    []CommunicationType `json:"communication"`
	Gateway          string              `json:"gateway,omitempty"`
	ServiceCount     int                 `json:"serviceCount"`
	Services         []string            `json:"services,omitempty"`
	Patterns         []string            `json:"patterns"`
	EngineeringLevel string              `json:"engineeringLevel"` // Basic, Intermediate, Advanced, Production-grade
}

// IndustryAnalysis - The final industry-level analysis output
type IndustryAnalysis struct {
	// Architecture Analysis
	Architecture SystemArchitecture `json:"architecture"`

	// Verified Skills (the gold)
	VerifiedSkills []VerifiedSkill `json:"verifiedSkills"`

	// Skill Summary by Category
	SkillsByCategory map[SkillCategory][]VerifiedSkill `json:"skillsByCategory"`

	// Quality Metrics
	TotalSkills          int     `json:"totalSkills"`
	HighConfidenceSkills int     `json:"highConfidenceSkills"` // confidence >= 0.8
	ResumeReadySkills    int     `json:"resumeReadySkills"`
	OverallScore         float64 `json:"overallScore"` // 0-100

	// Engineering Level
	EngineeringLevel string `json:"engineeringLevel"`

	// Raw Signals (for transparency)
	InfraSignals *InfrastructureSignals `json:"infraSignals,omitempty"`
}

// AddSkill adds a verified skill to the analysis
func (ia *IndustryAnalysis) AddSkill(skill VerifiedSkill) {
	ia.VerifiedSkills = append(ia.VerifiedSkills, skill)

	if ia.SkillsByCategory == nil {
		ia.SkillsByCategory = make(map[SkillCategory][]VerifiedSkill)
	}
	ia.SkillsByCategory[skill.Category] = append(ia.SkillsByCategory[skill.Category], skill)

	ia.TotalSkills++
	if skill.Confidence >= 0.8 {
		ia.HighConfidenceSkills++
	}
	if skill.ResumeReady {
		ia.ResumeReadySkills++
	}
}

// HasSkill checks if a skill exists
func (ia *IndustryAnalysis) HasSkill(name string) bool {
	for _, s := range ia.VerifiedSkills {
		if s.Name == name {
			return true
		}
	}
	return false
}

// GetTopSkills returns top N skills by confidence
func (ia *IndustryAnalysis) GetTopSkills(n int) []VerifiedSkill {
	if n >= len(ia.VerifiedSkills) {
		return ia.VerifiedSkills
	}

	// Simple sort by confidence (bubble sort for small lists)
	skills := make([]VerifiedSkill, len(ia.VerifiedSkills))
	copy(skills, ia.VerifiedSkills)

	for i := 0; i < len(skills)-1; i++ {
		for j := 0; j < len(skills)-i-1; j++ {
			if skills[j].Confidence < skills[j+1].Confidence {
				skills[j], skills[j+1] = skills[j+1], skills[j]
			}
		}
	}

	return skills[:n]
}

// CalculateOverallScore calculates the final score
func (ia *IndustryAnalysis) CalculateOverallScore() float64 {
	if ia.TotalSkills == 0 {
		return 0
	}

	totalWeight := 0.0
	weightedSum := 0.0

	for _, skill := range ia.VerifiedSkills {
		weight := float64(skill.Weight)
		weightedSum += skill.Confidence * weight
		totalWeight += weight
	}

	if totalWeight == 0 {
		return 0
	}

	// Normalize to 0-100
	score := (weightedSum / totalWeight) * 100

	// Bonus for high skill count
	if ia.TotalSkills > 10 {
		score = score * 1.1 // 10% bonus
	}
	if ia.TotalSkills > 20 {
		score = score * 1.1 // Another 10%
	}

	// Cap at 100
	if score > 100 {
		score = 100
	}

	ia.OverallScore = score
	return score
}

// DetermineEngineeringLevel determines the engineering sophistication
func (ia *IndustryAnalysis) DetermineEngineeringLevel() string {
	score := ia.CalculateOverallScore()

	// Check for specific patterns
	hasDocker := false
	hasCI := false
	hasMicroservices := false
	hasObservability := false
	hasAdvancedPatterns := false

	for _, skill := range ia.VerifiedSkills {
		switch skill.Name {
		case "Docker & Containerization":
			hasDocker = true
		case "Microservices Architecture":
			hasMicroservices = true
		case "CI/CD Pipeline":
			hasCI = true
		case "Observability Stack", "Monitoring & Metrics":
			hasObservability = true
		case "Event-Driven Architecture", "Message Queues (RabbitMQ)", "CQRS Pattern":
			hasAdvancedPatterns = true
		}
	}

	// Determine level
	if hasMicroservices && hasObservability && hasAdvancedPatterns && score >= 75 {
		ia.EngineeringLevel = "Production-grade"
	} else if hasDocker && hasCI && score >= 60 {
		ia.EngineeringLevel = "Advanced"
	} else if hasDocker || hasCI && score >= 40 {
		ia.EngineeringLevel = "Intermediate"
	} else {
		ia.EngineeringLevel = "Basic"
	}

	return ia.EngineeringLevel
}
