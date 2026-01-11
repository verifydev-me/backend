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
	totalSkills := ia.TotalSkills
	highConfCount := ia.HighConfidenceSkills

	// Count infrastructure indicators
	hasInfra := false    // Docker, K8s, etc.
	hasBackend := false  // Database, API, etc.
	hasAdvanced := false // Microservices, messaging, etc.

	for _, skill := range ia.VerifiedSkills {
		category := string(skill.Category)
		name := skill.Name

		// Infrastructure detection
		if category == "infrastructure" || category == "devops" {
			hasInfra = true
		}

		// Backend detection
		if category == "database" || category == "messaging" || category == "architecture" {
			hasBackend = true
		}

		// Advanced pattern detection
		if name == "Microservices Architecture" || name == "Event-Driven Architecture" ||
			category == "messaging" || name == "gRPC" || name == "GraphQL" {
			hasAdvanced = true
		}
	}

	// Simpler level determination based primarily on score and skill count
	// This ensures complex projects get proper recognition

	// Production-grade: High score + many skills + advanced patterns
	if score >= 75 && totalSkills >= 10 && hasAdvanced {
		ia.EngineeringLevel = "Production-grade"
	} else if score >= 70 && totalSkills >= 8 {
		// Also production-grade for high skill projects
		ia.EngineeringLevel = "Production-grade"
	} else if score >= 55 && totalSkills >= 5 && (hasInfra || hasBackend) {
		// Advanced: Good score + decent skills + infrastructure or backend
		ia.EngineeringLevel = "Advanced"
	} else if score >= 50 && totalSkills >= 5 {
		// Also advanced for moderate complexity
		ia.EngineeringLevel = "Advanced"
	} else if score >= 35 && totalSkills >= 3 {
		// Intermediate: Moderate score + few skills
		ia.EngineeringLevel = "Intermediate"
	} else if totalSkills >= 2 || highConfCount >= 1 {
		// Basic+: Has some verified skills
		ia.EngineeringLevel = "Intermediate"
	} else if totalSkills > 0 {
		ia.EngineeringLevel = "Basic"
	} else {
		ia.EngineeringLevel = "Unknown"
	}

	return ia.EngineeringLevel
}
