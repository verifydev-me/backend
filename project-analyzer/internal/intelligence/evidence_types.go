package intelligence

// ============================================
// EVIDENCE SYSTEM v2
// Structured proof-chains for trustable skill verification
// ============================================

// EvidenceStrength indicates how strong a piece of evidence is
type EvidenceStrength string

const (
	EvidenceWeak   EvidenceStrength = "WEAK"   // Naming/comments only
	EvidenceMedium EvidenceStrength = "MEDIUM" // Config files, imports
	EvidenceStrong EvidenceStrength = "STRONG" // Usage patterns, architecture
)

// Evidence strength weights for confidence calculation
const (
	EvidenceWeightStrong = 1.0
	EvidenceWeightMedium = 0.5
	EvidenceWeightWeak   = 0.2
)

// EvidenceType categorizes what kind of evidence this is
type EvidenceType string

const (
	EvidenceTypeFile         EvidenceType = "FILE"         // File existence/structure
	EvidenceTypePattern      EvidenceType = "PATTERN"      // Code patterns detected
	EvidenceTypeArchitecture EvidenceType = "ARCHITECTURE" // Architectural decisions
	EvidenceTypeConfig       EvidenceType = "CONFIG"       // Configuration files
	EvidenceTypeImport       EvidenceType = "IMPORT"       // Dependencies/imports
	EvidenceTypeTesting      EvidenceType = "TESTING"      // Test patterns
	EvidenceTypeInfra        EvidenceType = "INFRA"        // Infrastructure as code
)

// EvidenceItem is a single piece of evidence for or against a skill claim
type EvidenceItem struct {
	Type        EvidenceType     `json:"type"`
	Location    string           `json:"location,omitempty"` // e.g., "src/handlers/auth.go:45"
	Description string           `json:"description"`        // Human-readable description
	Strength    EvidenceStrength `json:"strength"`
	IsAnti      bool             `json:"isAnti"` // True if this REDUCES confidence
	Weight      float64          `json:"-"`      // Calculated weight (internal)
}

// CalculateWeight computes the evidence weight based on strength
func (e *EvidenceItem) CalculateWeight() float64 {
	switch e.Strength {
	case EvidenceStrong:
		e.Weight = EvidenceWeightStrong
	case EvidenceMedium:
		e.Weight = EvidenceWeightMedium
	case EvidenceWeak:
		e.Weight = EvidenceWeightWeak
	default:
		e.Weight = EvidenceWeightWeak
	}
	if e.IsAnti {
		e.Weight = -e.Weight // Anti-evidence has negative weight
	}
	return e.Weight
}

// EvidenceChain represents all evidence for a specific skill
type EvidenceChain struct {
	SkillName     string         `json:"skillName"`
	SkillCategory string         `json:"skillCategory,omitempty"`
	Items         []EvidenceItem `json:"items"`
	AntiItems     []EvidenceItem `json:"antiItems"`
	TotalStrength float64        `json:"totalStrength"` // Sum of positive weights
	AntiStrength  float64        `json:"antiStrength"`  // Sum of anti-evidence weights
	NetConfidence float64        `json:"netConfidence"` // After anti-evidence applied
}

// AddEvidence adds a piece of evidence to the chain
func (c *EvidenceChain) AddEvidence(evidence EvidenceItem) {
	evidence.CalculateWeight()
	if evidence.IsAnti {
		c.AntiItems = append(c.AntiItems, evidence)
	} else {
		c.Items = append(c.Items, evidence)
	}
}

// ComputeConfidence calculates net confidence from evidence
func (c *EvidenceChain) ComputeConfidence(baseConfidence float64) float64 {
	c.TotalStrength = 0
	c.AntiStrength = 0

	// Sum positive evidence
	for _, item := range c.Items {
		c.TotalStrength += item.CalculateWeight()
	}

	// Sum anti-evidence (negative weights)
	for _, item := range c.AntiItems {
		c.AntiStrength += -item.CalculateWeight() // Convert back to positive for display
	}

	// Net confidence: base + evidence boost - anti-evidence penalty
	// Evidence can boost up to +20%, anti-evidence can reduce up to -40%
	evidenceBoost := evidenceMin(c.TotalStrength*0.05, 0.20) // Max +20%
	antiPenalty := evidenceMin(c.AntiStrength*0.10, 0.40)    // Max -40%

	c.NetConfidence = baseConfidence * (1 + evidenceBoost - antiPenalty)

	// Clamp to 0-100 range
	if c.NetConfidence > 100 {
		c.NetConfidence = 100
	}
	if c.NetConfidence < 0 {
		c.NetConfidence = 0
	}

	return c.NetConfidence
}

// GetRecruiterSummary returns a simplified view for recruiters
func (c *EvidenceChain) GetRecruiterSummary() RecruiterEvidenceSummary {
	proofs := make([]string, 0, len(c.Items))
	concerns := make([]string, 0, len(c.AntiItems))

	// Only include STRONG and MEDIUM evidence for recruiters
	for _, item := range c.Items {
		if item.Strength == EvidenceStrong || item.Strength == EvidenceMedium {
			proofs = append(proofs, item.Description)
		}
	}

	// Include all anti-evidence as concerns
	for _, item := range c.AntiItems {
		concerns = append(concerns, item.Description)
	}

	return RecruiterEvidenceSummary{
		Skill:      c.SkillName,
		Confidence: int(c.NetConfidence),
		Proofs:     proofs,
		Concerns:   concerns,
	}
}

// RecruiterEvidenceSummary is the simplified evidence view for recruiters
type RecruiterEvidenceSummary struct {
	Skill      string   `json:"skill"`
	Confidence int      `json:"confidence"`
	Proofs     []string `json:"proofs"`
	Concerns   []string `json:"concerns,omitempty"`
}

// ============================================
// ANTI-EVIDENCE RULES
// Signals that REDUCE confidence in a skill claim
// ============================================

// AntiEvidenceRule defines when to apply anti-evidence
type AntiEvidenceRule struct {
	SkillPattern    string           // Skill name pattern (e.g., "Redis*", "Kubernetes")
	RequiredSignals []string         // Signals that SHOULD exist
	MissingPenalty  EvidenceStrength // How severe the penalty is
	Description     string           // What's missing
}

// AntiEvidenceRules defines common anti-evidence patterns
var AntiEvidenceRules = []AntiEvidenceRule{
	{
		SkillPattern:    "Redis",
		RequiredSignals: []string{"cache_invalidation", "ttl_pattern"},
		MissingPenalty:  EvidenceMedium,
		Description:     "Redis usage without cache invalidation logic",
	},
	{
		SkillPattern:    "Microservices",
		RequiredSignals: []string{"service_mesh", "api_gateway", "distributed_tracing"},
		MissingPenalty:  EvidenceStrong,
		Description:     "Microservices without proper service infrastructure",
	},
	{
		SkillPattern:    "Kubernetes",
		RequiredSignals: []string{"health_probes", "resource_limits", "hpa"},
		MissingPenalty:  EvidenceMedium,
		Description:     "Kubernetes without production-ready configurations",
	},
	{
		SkillPattern:    "PostgreSQL",
		RequiredSignals: []string{"migrations", "connection_pooling"},
		MissingPenalty:  EvidenceWeak,
		Description:     "PostgreSQL without migration management",
	},
	{
		SkillPattern:    "REST API",
		RequiredSignals: []string{"error_handling", "validation", "versioning"},
		MissingPenalty:  EvidenceMedium,
		Description:     "REST API without proper error handling or versioning",
	},
	{
		SkillPattern:    "GraphQL",
		RequiredSignals: []string{"schema_definition", "resolvers"},
		MissingPenalty:  EvidenceStrong,
		Description:     "GraphQL without proper schema/resolver architecture",
	},
	{
		SkillPattern:    "Testing",
		RequiredSignals: []string{"unit_tests", "test_organization"},
		MissingPenalty:  EvidenceMedium,
		Description:     "Testing claimed but minimal test structure found",
	},
	{
		SkillPattern:    "CI/CD",
		RequiredSignals: []string{"pipeline_stages", "automated_testing"},
		MissingPenalty:  EvidenceMedium,
		Description:     "CI/CD without proper pipeline stages",
	},
}

// ============================================
// EVIDENCE BUILDER (Factory pattern)
// ============================================

// NewEvidenceChain creates a new evidence chain for a skill
func NewEvidenceChain(skillName, category string) *EvidenceChain {
	return &EvidenceChain{
		SkillName:     skillName,
		SkillCategory: category,
		Items:         make([]EvidenceItem, 0),
		AntiItems:     make([]EvidenceItem, 0),
	}
}

// BuildFileEvidence creates evidence from file detection
func BuildFileEvidence(location, description string, strength EvidenceStrength) EvidenceItem {
	return EvidenceItem{
		Type:        EvidenceTypeFile,
		Location:    location,
		Description: description,
		Strength:    strength,
		IsAnti:      false,
	}
}

// BuildPatternEvidence creates evidence from code pattern detection
func BuildPatternEvidence(description string, strength EvidenceStrength) EvidenceItem {
	return EvidenceItem{
		Type:        EvidenceTypePattern,
		Description: description,
		Strength:    strength,
		IsAnti:      false,
	}
}

// BuildArchitectureEvidence creates evidence from architectural patterns
func BuildArchitectureEvidence(description string, strength EvidenceStrength) EvidenceItem {
	return EvidenceItem{
		Type:        EvidenceTypeArchitecture,
		Description: description,
		Strength:    strength,
		IsAnti:      false,
	}
}

// BuildAntiEvidence creates anti-evidence (reduces confidence)
func BuildAntiEvidence(evidenceType EvidenceType, description string, strength EvidenceStrength) EvidenceItem {
	return EvidenceItem{
		Type:        evidenceType,
		Description: description,
		Strength:    strength,
		IsAnti:      true,
	}
}

// Helper function
func evidenceMin(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}
