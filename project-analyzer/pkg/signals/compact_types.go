package signals

// ============================================
// COMPACT OUTPUT FOR AI VERDICT
// Token-optimized struct designed for LLM consumption.
// Reduces ~30-50KB ProjectSignals to ~2-4KB.
// Used by: ai-service Gemini endpoint
// ============================================

// CompactOutput is the minimal payload sent to the AI service.
// Every field is chosen to maximize insight per token.
type CompactOutput struct {
	ProjectID string         `json:"pid"`
	UserID    string         `json:"uid"`
	Project   CompactProject `json:"p"`
	Skills    []CompactSkill `json:"s"`
	Arch      CompactArch    `json:"a"`
	Scores    CompactScores  `json:"sc"`
	Stack     CompactStack   `json:"st"`
	Signals   CompactSignals `json:"sg"`
}

// CompactProject — project-level metadata
type CompactProject struct {
	Type     string          `json:"t"`    // "fullstack", "backend", etc.
	Files    int             `json:"f"`    // total files
	Lines    int             `json:"l"`    // total lines
	Primary  string          `json:"pl"`   // primary language
	Langs    []CompactLang   `json:"lg"`   // language breakdown
	Scale    string          `json:"sc"`   // "Small", "Medium", "Large", "Enterprise"
}

// CompactLang — minimal language info
type CompactLang struct {
	Name  string `json:"n"`
	Lines int    `json:"l"`
	Pct   int    `json:"p"` // percentage 0-100
}

// CompactSkill — skill with depth + evidence
type CompactSkill struct {
	Name       string   `json:"n"`
	Category   string   `json:"c"`
	Confidence float64  `json:"cf"`  // 0.0-1.0 (Bayesian posterior)
	Depth      string   `json:"d"`   // "surface"|"moderate"|"deep"|"expert"
	Resume     bool     `json:"r"`   // resume-ready
	Verified   bool     `json:"v"`   // usage verified by AST
	Evidence   []string `json:"e"`   // max 3 concise items
	Files      int      `json:"f"`   // file spread
	Patterns   int      `json:"p"`   // patterns used
}

// CompactArch — architecture summary
type CompactArch struct {
	Type     string   `json:"t"`    // "microservices", "monolith", etc.
	Patterns []string `json:"p"`    // ["CQRS", "Event-Driven"]
	Services int      `json:"s"`    // service count
}

// CompactScores — all scoring dimensions
type CompactScores struct {
	Overall    float64            `json:"o"`    // 0-100
	Dimensions map[string]float64 `json:"d"`    // dimension name → score
	Trust      CompactTrust       `json:"t"`    // trust analysis
	Bayesian   float64            `json:"b"`    // ensemble confidence
	Quality    string             `json:"q"`    // quality tier: "Gold", "Silver", "Bronze"
	Level      string             `json:"l"`    // engineering level
}

// CompactTrust — trust summary
type CompactTrust struct {
	Score float64 `json:"s"` // 0-100
	Level string  `json:"l"` // "HIGH", "MEDIUM", "LOW"
}

// CompactStack — detected tech stack
type CompactStack struct {
	Detected   []string `json:"d"`    // ["MERN Stack", "Go Microservices"]
	Frameworks []string `json:"fw"`   // ["React", "Express", "Gin"]
	Databases  []string `json:"db"`   // ["PostgreSQL", "Redis"]
	DevOps     []string `json:"do"`   // ["Docker", "GitHub Actions"]
}

// CompactSignals — key signals for verdict
type CompactSignals struct {
	Strengths []string `json:"str"`  // max 5
	Risks     []string `json:"rsk"`  // max 5
	Intent    string   `json:"int"`  // "PRODUCTION_API", "LEARNING", etc.
}
