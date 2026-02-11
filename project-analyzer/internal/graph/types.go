package graph

// ============================================
// PHASE 2: WEIGHTED DEPENDENCY GRAPH
// Models technology relationships with
// weighted edges for skill inference
// ============================================

// TechGraph represents the complete technology dependency graph
type TechGraph struct {
	Nodes map[string]*TechNode `json:"nodes"`
	Edges []*TechEdge          `json:"edges"`
}

// TechNode represents a technology in the graph
type TechNode struct {
	ID           string   `json:"id"`           // Unique identifier (lowercase, no spaces)
	Name         string   `json:"name"`         // Display name
	Category     string   `json:"category"`     // "framework", "database", "language", "tool", "pattern"
	SubCategory  string   `json:"subCategory"`  // "frontend", "backend", "devops", "testing"
	Weight       float64  `json:"weight"`       // 0.0 - 1.0 importance in project
	FileCount    int      `json:"fileCount"`    // Number of files using this tech
	ImportCount  int      `json:"importCount"`  // Number of import statements
	CallCount    int      `json:"callCount"`    // Number of function calls to APIs
	CodePatterns int      `json:"codePatterns"` // Number of detected code patterns
	Evidence     []string `json:"evidence"`     // How it was detected
	Sources      []string `json:"sources"`      // "ast", "infra", "config", "package_manager"
}

// TechEdge represents a relationship between two technologies
type TechEdge struct {
	From       string  `json:"from"`       // Source node ID
	To         string  `json:"to"`         // Target node ID
	Type       string  `json:"type"`       // "depends_on", "uses_with", "alternative_to", "extends"
	Weight     float64 `json:"weight"`     // 0.0 - 1.0 strength of relationship
	Evidence   string  `json:"evidence"`   // Why this edge exists
	Confidence float64 `json:"confidence"` // 0.0 - 1.0 how sure we are
}

// StackPattern represents a recognized technology stack
type StackPattern struct {
	Name        string   `json:"name"`        // "MERN Stack", "Go Microservices"
	Description string   `json:"description"` // Human-readable description
	Required    []string `json:"required"`    // Must-have technologies
	Optional    []string `json:"optional"`    // Nice-to-have technologies
	MinMatch    int      `json:"minMatch"`    // Minimum matches needed
	SkillLevel  string   `json:"skillLevel"`  // "basic", "intermediate", "advanced", "expert"
	Category    string   `json:"category"`    // "fullstack", "backend", "frontend", "devops"
	Weight      int      `json:"weight"`      // Importance 1-10
}

// GraphAnalysisResult holds output of graph-based inference
type GraphAnalysisResult struct {
	// Detected stacks
	DetectedStacks []DetectedStack `json:"detectedStacks"`

	// Inferred higher-level skills from graph connections
	InferredSkills []InferredSkill `json:"inferredSkills"`

	// Technology clusters (groups of related technologies used together)
	Clusters []TechCluster `json:"clusters"`

	// Graph metrics
	TotalNodes     int     `json:"totalNodes"`
	TotalEdges     int     `json:"totalEdges"`
	Density        float64 `json:"density"`        // Edge density (0-1)
	AvgNodeWeight  float64 `json:"avgNodeWeight"`  // Average technology usage weight
	MaxConnections int     `json:"maxConnections"` // Most connected node
}

// DetectedStack holds a recognized stack detection
type DetectedStack struct {
	Pattern    StackPattern `json:"pattern"`
	MatchCount int          `json:"matchCount"` // How many technologies matched
	Matched    []string     `json:"matched"`    // Which technologies matched
	Missing    []string     `json:"missing"`    // Which required were missing
	Confidence float64      `json:"confidence"` // Overall confidence
	Evidence   []string     `json:"evidence"`
}

// InferredSkill is a skill derived from graph analysis
type InferredSkill struct {
	Name        string   `json:"name"`
	Category    string   `json:"category"`
	Level       string   `json:"level"` // "basic", "intermediate", "advanced", "expert"
	Confidence  float64  `json:"confidence"`
	Reasoning   string   `json:"reasoning"` // Why this was inferred
	BasedOn     []string `json:"basedOn"`   // Technologies that led to this inference
	Evidence    []string `json:"evidence"`
	ResumeReady bool     `json:"resumeReady"`
}

// TechCluster represents a group of related technologies
type TechCluster struct {
	Name         string   `json:"name"`
	Technologies []string `json:"technologies"`
	Category     string   `json:"category"` // "frontend", "backend", "devops"
	Strength     float64  `json:"strength"` // How strongly they're connected
}
