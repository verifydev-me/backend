package intelligence

// ============================================
// SKILL TAXONOMY & HIERARCHY
// Graph-based skill relationships with safe rollup
// ============================================

// SkillTier represents the level of a skill in the hierarchy
type SkillTier int

const (
	SkillTierCore     SkillTier = 1 // Primary skills (Go, React, Python)
	SkillTierSub      SkillTier = 2 // Sub-skills (Goroutines, React Hooks)
	SkillTierInfra    SkillTier = 3 // Infrastructure skills (Docker, K8s)
	SkillTierAdjacent SkillTier = 4 // Inferred, not claimed (Distributed Systems)
)

// SkillRelationType defines how skills are related
type SkillRelationType string

const (
	RelationParent   SkillRelationType = "PARENT"   // Go → Go Backend
	RelationChild    SkillRelationType = "CHILD"    // Go Backend → Go
	RelationSupports SkillRelationType = "SUPPORTS" // Docker → Kubernetes
	RelationAdjacent SkillRelationType = "ADJACENT" // Redis → Distributed Systems
)

// Rollup weight limits (prevent skill inflation)
const (
	MaxChildToParentRollup = 0.80 // Child can contribute max 80% to parent
	MaxAdjacentInference   = 0.50 // Adjacent skills max 50% confidence
	MaxSupportingRollup    = 0.60 // Supporting skills max 60% boost
)

// SkillRelation represents a relationship between two skills
type SkillRelation struct {
	TargetSkillID string            `json:"targetSkillId"`
	Type          SkillRelationType `json:"type"`
	Weight        float64           `json:"weight"` // Rollup weight
}

// SkillNode represents a skill in the taxonomy graph
type SkillNode struct {
	ID            string          `json:"id"`
	Name          string          `json:"name"`
	Category      string          `json:"category"` // Language, Framework, Infra, etc.
	Tier          SkillTier       `json:"tier"`
	IsClaimed     bool            `json:"isClaimed"`              // Direct evidence exists
	IsInferred    bool            `json:"isInferred"`             // Inferred from adjacent skills
	InferredFrom  string          `json:"inferredFrom,omitempty"` // Source of inference
	RawConfidence float64         `json:"rawConfidence"`
	NetConfidence float64         `json:"netConfidence"` // After rollup/calibration
	Relations     []SkillRelation `json:"relations,omitempty"`
	Evidence      *EvidenceChain  `json:"evidence,omitempty"`
}

// SkillTaxonomy holds the complete skill graph
type SkillTaxonomy struct {
	CoreSkills     []SkillNode `json:"coreSkills"`
	SubSkills      []SkillNode `json:"subSkills"`
	InfraSkills    []SkillNode `json:"infraSkills"`
	InferredSkills []SkillNode `json:"inferredSkills"`

	// Internal graph for lookups
	nodeIndex map[string]*SkillNode
}

// NewSkillTaxonomy creates an empty taxonomy
func NewSkillTaxonomy() *SkillTaxonomy {
	return &SkillTaxonomy{
		CoreSkills:     make([]SkillNode, 0),
		SubSkills:      make([]SkillNode, 0),
		InfraSkills:    make([]SkillNode, 0),
		InferredSkills: make([]SkillNode, 0),
		nodeIndex:      make(map[string]*SkillNode),
	}
}

// AddSkill adds a skill to the appropriate tier
func (t *SkillTaxonomy) AddSkill(node SkillNode) {
	node.NetConfidence = node.RawConfidence // Initially same

	switch node.Tier {
	case SkillTierCore:
		t.CoreSkills = append(t.CoreSkills, node)
	case SkillTierSub:
		t.SubSkills = append(t.SubSkills, node)
	case SkillTierInfra:
		t.InfraSkills = append(t.InfraSkills, node)
	case SkillTierAdjacent:
		node.IsInferred = true
		node.IsClaimed = false // Adjacent skills are NEVER claimed
		t.InferredSkills = append(t.InferredSkills, node)
	}

	t.nodeIndex[node.ID] = &node
}

// AddRelation adds a relationship between skills
func (t *SkillTaxonomy) AddRelation(sourceID, targetID string, relationType SkillRelationType, weight float64) {
	source, exists := t.nodeIndex[sourceID]
	if !exists {
		return
	}

	// Apply weight limits based on relation type
	switch relationType {
	case RelationChild:
		weight = minFloat(weight, MaxChildToParentRollup)
	case RelationAdjacent:
		weight = minFloat(weight, MaxAdjacentInference)
	case RelationSupports:
		weight = minFloat(weight, MaxSupportingRollup)
	}

	source.Relations = append(source.Relations, SkillRelation{
		TargetSkillID: targetID,
		Type:          relationType,
		Weight:        weight,
	})
}

// ApplySafeRollup performs confidence rollup with guards
func (t *SkillTaxonomy) ApplySafeRollup() {
	// Rule 1: Child → Parent rollup (limited)
	for i := range t.SubSkills {
		child := &t.SubSkills[i]
		for _, rel := range child.Relations {
			if rel.Type == RelationChild || rel.Type == RelationParent {
				parent, exists := t.nodeIndex[rel.TargetSkillID]
				if exists && child.RawConfidence > 70 {
					// Contribute to parent, but capped
					contribution := child.RawConfidence * rel.Weight
					if contribution > parent.NetConfidence {
						parent.NetConfidence = maxFloat(parent.NetConfidence, contribution)
					}
				}
			}
		}
	}

	// Rule 2: Adjacent inference (marked, not claimed)
	for i := range t.InferredSkills {
		inferred := &t.InferredSkills[i]
		// Already marked as inferred, ensure confidence is capped
		inferred.NetConfidence = minFloat(inferred.RawConfidence, MaxAdjacentInference*100)
		inferred.IsClaimed = false // Enforce: never claimed
	}

	// Rule 3: Infra skills DO NOT boost core skills
	// This is enforced by not having those relations in the first place
}

// GetClaimedSkills returns only skills with direct evidence
func (t *SkillTaxonomy) GetClaimedSkills() []SkillNode {
	result := make([]SkillNode, 0)

	for _, s := range t.CoreSkills {
		if s.IsClaimed {
			result = append(result, s)
		}
	}
	for _, s := range t.SubSkills {
		if s.IsClaimed {
			result = append(result, s)
		}
	}
	for _, s := range t.InfraSkills {
		if s.IsClaimed {
			result = append(result, s)
		}
	}
	// InferredSkills are NEVER claimed by definition

	return result
}

// GetResumeReadySkills returns skills suitable for resume display
func (t *SkillTaxonomy) GetResumeReadySkills(minConfidence float64) []SkillNode {
	result := make([]SkillNode, 0)

	for _, s := range t.CoreSkills {
		if s.IsClaimed && s.NetConfidence >= minConfidence {
			result = append(result, s)
		}
	}
	for _, s := range t.SubSkills {
		if s.IsClaimed && s.NetConfidence >= minConfidence {
			result = append(result, s)
		}
	}
	for _, s := range t.InfraSkills {
		if s.IsClaimed && s.NetConfidence >= minConfidence {
			result = append(result, s)
		}
	}
	// Inferred skills are NOT resume-ready

	return result
}

// ============================================
// SKILL GRAPH BUILDER
// Factory for building taxonomy from extracted skills
// ============================================

// SkillGraphBuilder constructs the taxonomy from analysis results
type SkillGraphBuilder struct {
	taxonomy *SkillTaxonomy
}

// NewSkillGraphBuilder creates a new builder
func NewSkillGraphBuilder() *SkillGraphBuilder {
	return &SkillGraphBuilder{
		taxonomy: NewSkillTaxonomy(),
	}
}

// AddCoreSkill adds a primary skill
func (b *SkillGraphBuilder) AddCoreSkill(name, category string, confidence float64, evidence *EvidenceChain) *SkillGraphBuilder {
	b.taxonomy.AddSkill(SkillNode{
		ID:            slugify(name),
		Name:          name,
		Category:      category,
		Tier:          SkillTierCore,
		IsClaimed:     true,
		IsInferred:    false,
		RawConfidence: confidence,
		Evidence:      evidence,
	})
	return b
}

// AddSubSkill adds a sub-skill with parent relation
func (b *SkillGraphBuilder) AddSubSkill(name, category, parentName string, confidence float64, evidence *EvidenceChain) *SkillGraphBuilder {
	id := slugify(name)
	parentID := slugify(parentName)

	b.taxonomy.AddSkill(SkillNode{
		ID:            id,
		Name:          name,
		Category:      category,
		Tier:          SkillTierSub,
		IsClaimed:     true,
		IsInferred:    false,
		RawConfidence: confidence,
		Evidence:      evidence,
		Relations: []SkillRelation{
			{TargetSkillID: parentID, Type: RelationParent, Weight: 0.8},
		},
	})
	return b
}

// AddInfraSkill adds an infrastructure skill
func (b *SkillGraphBuilder) AddInfraSkill(name, category string, confidence float64, evidence *EvidenceChain) *SkillGraphBuilder {
	b.taxonomy.AddSkill(SkillNode{
		ID:            slugify(name),
		Name:          name,
		Category:      category,
		Tier:          SkillTierInfra,
		IsClaimed:     true,
		IsInferred:    false,
		RawConfidence: confidence,
		Evidence:      evidence,
	})
	return b
}

// InferAdjacentSkill adds an inferred skill from another skill
func (b *SkillGraphBuilder) InferAdjacentSkill(name, category, inferredFrom string, sourceConfidence float64) *SkillGraphBuilder {
	// Adjacent skills get max 50% of source confidence
	inferredConfidence := sourceConfidence * MaxAdjacentInference

	b.taxonomy.AddSkill(SkillNode{
		ID:            slugify(name),
		Name:          name,
		Category:      category,
		Tier:          SkillTierAdjacent,
		IsClaimed:     false, // NEVER claimed
		IsInferred:    true,
		InferredFrom:  inferredFrom,
		RawConfidence: inferredConfidence,
	})
	return b
}

// Build finalizes the taxonomy with rollup applied
func (b *SkillGraphBuilder) Build() *SkillTaxonomy {
	b.taxonomy.ApplySafeRollup()
	return b.taxonomy
}

// ============================================
// PREDEFINED SKILL RELATIONSHIPS
// ============================================

// KnownSkillRelations defines common skill relationships
var KnownSkillRelations = map[string][]struct {
	Related string
	Type    SkillRelationType
}{
	"go": {
		{Related: "goroutines", Type: RelationChild},
		{Related: "go-modules", Type: RelationChild},
		{Related: "error-handling-go", Type: RelationChild},
	},
	"react": {
		{Related: "react-hooks", Type: RelationChild},
		{Related: "react-context", Type: RelationChild},
		{Related: "jsx", Type: RelationChild},
	},
	"kubernetes": {
		{Related: "docker", Type: RelationSupports},
		{Related: "distributed-systems", Type: RelationAdjacent},
		{Related: "cloud-native", Type: RelationAdjacent},
	},
	"microservices": {
		{Related: "distributed-systems", Type: RelationAdjacent},
		{Related: "api-design", Type: RelationAdjacent},
	},
	"postgresql": {
		{Related: "sql", Type: RelationChild},
		{Related: "database-design", Type: RelationAdjacent},
	},
	"redis": {
		{Related: "caching", Type: RelationAdjacent},
		{Related: "distributed-systems", Type: RelationAdjacent},
	},
}

// Helpers
func slugify(name string) string {
	// Simple slugify - lowercase and replace spaces with dashes
	result := ""
	for _, c := range name {
		if c >= 'A' && c <= 'Z' {
			result += string(c + 32) // lowercase
		} else if c == ' ' {
			result += "-"
		} else if (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '-' {
			result += string(c)
		}
	}
	return result
}

func minFloat(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}

func maxFloat(a, b float64) float64 {
	if a > b {
		return a
	}
	return b
}
