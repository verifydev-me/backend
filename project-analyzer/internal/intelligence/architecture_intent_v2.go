package intelligence

// ============================================
// ARCHITECTURE INTENT DETECTOR v2
// Distinguishes intentional design from cargo-cult complexity
// ============================================

// ArchitectureStyle represents detected architectural patterns
type ArchitectureStyle string

const (
	ArchStyleMonolith      ArchitectureStyle = "MONOLITH"
	ArchStyleModular       ArchitectureStyle = "MODULAR"
	ArchStyleMicroservices ArchitectureStyle = "MICROSERVICES"
	ArchStyleServerless    ArchitectureStyle = "SERVERLESS"
	ArchStyleEventDriven   ArchitectureStyle = "EVENT_DRIVEN"
	ArchStyleLayered       ArchitectureStyle = "LAYERED"
	ArchStyleHexagonal     ArchitectureStyle = "HEXAGONAL"
	ArchStyleUnknown       ArchitectureStyle = "UNKNOWN"
)

// JustificationLevel indicates how well an architecture choice is justified
type JustificationLevel string

const (
	JustificationFull    JustificationLevel = "FULLY_JUSTIFIED"
	JustificationPartial JustificationLevel = "PARTIALLY_JUSTIFIED"
	JustificationWeak    JustificationLevel = "WEAKLY_JUSTIFIED"
	JustificationNone    JustificationLevel = "NOT_JUSTIFIED"
)

// CargoCultWarning represents a detected cargo-cult pattern
type CargoCultWarning struct {
	Pattern     string  `json:"pattern"`
	Expected    string  `json:"expected"`    // What should exist
	Found       string  `json:"found"`       // What was actually found
	Severity    string  `json:"severity"`    // HIGH, MEDIUM, LOW
	Penalty     float64 `json:"penalty"`     // Score reduction (0-1)
	Explanation string  `json:"explanation"` // Why this matters
}

// ArchitectureVerdict is the detailed assessment of project architecture
type ArchitectureVerdict struct {
	Style              ArchitectureStyle      `json:"style"`
	Maturity           int                    `json:"maturity"` // 0-10
	IsJustified        bool                   `json:"isJustified"`
	JustificationScore float64                `json:"justificationScore"` // 0-1
	JustificationLevel JustificationLevel     `json:"justificationLevel"`
	Explanation        string                 `json:"explanation"`
	Strengths          []string               `json:"strengths,omitempty"`
	CargoCultWarnings  []CargoCultWarning     `json:"cargoCultWarnings,omitempty"`
	TradeoffAnalysis   []ArchitectureTradeoff `json:"tradeoffAnalysis,omitempty"`
}

// ArchitectureTradeoff explains architectural decisions
type ArchitectureTradeoff struct {
	Decision      string `json:"decision"`      // What was chosen
	Benefit       string `json:"benefit"`       // Why it helps
	Cost          string `json:"cost"`          // What it costs
	IsAppropriate bool   `json:"isAppropriate"` // Given project context
}

// ============================================
// CARGO-CULT DETECTION RULES
// ============================================

// CargoCultRule defines detection criteria for unjustified complexity
type CargoCultRule struct {
	Pattern         ArchitectureStyle
	Name            string
	RequiredSignals []string // Signals that MUST exist to justify the pattern
	OptionalSignals []string // Nice to have, boost justification
	MinimumScore    float64  // Minimum justification score threshold
	Penalty         float64  // Score penalty if unjustified (0-1)
	Severity        string   // HIGH, MEDIUM, LOW
	Explanation     string   // Why this rule matters
}

// CargoCultRules contains all detection rules
var CargoCultRules = []CargoCultRule{
	{
		Pattern:         ArchStyleMicroservices,
		Name:            "Microservices without infrastructure",
		RequiredSignals: []string{"service_mesh", "api_gateway", "distributed_tracing", "service_discovery"},
		OptionalSignals: []string{"circuit_breaker", "rate_limiting", "centralized_logging"},
		MinimumScore:    0.50,
		Penalty:         0.40,
		Severity:        "HIGH",
		Explanation:     "Microservices add significant complexity; without proper infrastructure (service mesh, tracing, discovery), they become a distributed monolith with extra network hops",
	},
	{
		Pattern:         ArchStyleMicroservices,
		Name:            "Single-service 'microservices'",
		RequiredSignals: []string{"multiple_services", "inter_service_communication"},
		OptionalSignals: []string{},
		MinimumScore:    1.0, // Must have both
		Penalty:         0.50,
		Severity:        "HIGH",
		Explanation:     "A single service labeled as microservices is a misnomer and suggests pattern cargo-culting",
	},
	{
		Pattern:         ArchStyleEventDriven,
		Name:            "Event-driven without resilience",
		RequiredSignals: []string{"dead_letter_queue", "retry_logic", "idempotency"},
		OptionalSignals: []string{"event_sourcing", "saga_pattern"},
		MinimumScore:    0.50,
		Penalty:         0.35,
		Severity:        "MEDIUM",
		Explanation:     "Event-driven systems require resilience patterns; without them, message loss and processing failures are inevitable",
	},
	{
		Pattern:         ArchStyleServerless,
		Name:            "Serverless without observability",
		RequiredSignals: []string{"structured_logging", "tracing", "metrics"},
		OptionalSignals: []string{"cold_start_optimization"},
		MinimumScore:    0.40,
		Penalty:         0.30,
		Severity:        "MEDIUM",
		Explanation:     "Serverless obscures infrastructure; without observability, debugging production issues becomes extremely difficult",
	},
}

// KubernetesJustificationRule checks K8s usage justification
var KubernetesJustificationRule = CargoCultRule{
	Pattern:         ArchStyleUnknown, // Applies to any style
	Name:            "Kubernetes without production patterns",
	RequiredSignals: []string{"health_probes", "resource_limits", "hpa", "pod_disruption_budget"},
	OptionalSignals: []string{"network_policies", "pod_security", "service_mesh"},
	MinimumScore:    0.50,
	Penalty:         0.30,
	Severity:        "MEDIUM",
	Explanation:     "Kubernetes without production patterns (probes, limits, HPA) is just Docker with extra YAML",
}

// DockerJustificationRule checks Docker usage justification
var DockerJustificationRule = CargoCultRule{
	Pattern:         ArchStyleUnknown,
	Name:            "Containerization without multi-stage",
	RequiredSignals: []string{"multi_stage_build", "non_root_user"},
	OptionalSignals: []string{"health_check", "optimized_layers"},
	MinimumScore:    0.50,
	Penalty:         0.15,
	Severity:        "LOW",
	Explanation:     "Docker without multi-stage builds and security practices suggests basic usage without optimization",
}

// ============================================
// ARCHITECTURE INTENT DETECTOR
// ============================================

// ArchitectureIntentDetector analyzes and justifies architectural patterns
type ArchitectureIntentDetector struct {
	signals      map[string]bool
	projectSize  int // File count as proxy for scale
	serviceCount int
}

// NewArchitectureIntentDetector creates a new detector
func NewArchitectureIntentDetector() *ArchitectureIntentDetector {
	return &ArchitectureIntentDetector{
		signals:      make(map[string]bool),
		projectSize:  0,
		serviceCount: 1,
	}
}

// AddSignal records a detected signal
func (d *ArchitectureIntentDetector) AddSignal(signal string) {
	d.signals[signal] = true
}

// SetProjectSize sets the file count
func (d *ArchitectureIntentDetector) SetProjectSize(files int) {
	d.projectSize = files
}

// SetServiceCount sets number of services detected
func (d *ArchitectureIntentDetector) SetServiceCount(count int) {
	d.serviceCount = count
}

// Analyze performs full architecture analysis
func (d *ArchitectureIntentDetector) Analyze(style ArchitectureStyle) ArchitectureVerdict {
	verdict := ArchitectureVerdict{
		Style:              style,
		Maturity:           0,
		IsJustified:        true,
		JustificationScore: 1.0,
		Strengths:          make([]string, 0),
		CargoCultWarnings:  make([]CargoCultWarning, 0),
		TradeoffAnalysis:   make([]ArchitectureTradeoff, 0),
	}

	// Check applicable cargo-cult rules
	for _, rule := range CargoCultRules {
		if rule.Pattern == style || rule.Pattern == ArchStyleUnknown {
			warning := d.evaluateRule(rule)
			if warning != nil {
				verdict.CargoCultWarnings = append(verdict.CargoCultWarnings, *warning)
				verdict.JustificationScore -= warning.Penalty
			}
		}
	}

	// Check infrastructure-specific rules
	if d.hasSignal("kubernetes") {
		warning := d.evaluateRule(KubernetesJustificationRule)
		if warning != nil {
			verdict.CargoCultWarnings = append(verdict.CargoCultWarnings, *warning)
			verdict.JustificationScore -= warning.Penalty
		}
	}

	if d.hasSignal("docker") {
		warning := d.evaluateRule(DockerJustificationRule)
		if warning != nil {
			verdict.CargoCultWarnings = append(verdict.CargoCultWarnings, *warning)
			verdict.JustificationScore -= warning.Penalty
		}
	}

	// Clamp justification score
	if verdict.JustificationScore < 0 {
		verdict.JustificationScore = 0
	}

	// Determine justification level
	verdict.JustificationLevel = d.determineJustificationLevel(verdict.JustificationScore)
	verdict.IsJustified = verdict.JustificationScore >= 0.60

	// Calculate maturity based on detected patterns
	verdict.Maturity = d.calculateMaturity(style)

	// Generate explanation
	verdict.Explanation = d.generateExplanation(verdict)

	// Add detected strengths
	verdict.Strengths = d.detectStrengths()

	// Add tradeoff analysis
	verdict.TradeoffAnalysis = d.analyzeTradeoffs(style)

	return verdict
}

// evaluateRule checks if a rule applies and returns warning if violated
func (d *ArchitectureIntentDetector) evaluateRule(rule CargoCultRule) *CargoCultWarning {
	matchedRequired := 0
	totalRequired := len(rule.RequiredSignals)

	for _, signal := range rule.RequiredSignals {
		if d.hasSignal(signal) {
			matchedRequired++
		}
	}

	score := float64(matchedRequired) / float64(totalRequired)

	if score < rule.MinimumScore {
		found := ""
		if matchedRequired > 0 {
			found = formatSignalList(d.getMatchedSignals(rule.RequiredSignals))
		} else {
			found = "none of the required infrastructure"
		}

		return &CargoCultWarning{
			Pattern:     rule.Name,
			Expected:    formatSignalList(rule.RequiredSignals),
			Found:       found,
			Severity:    rule.Severity,
			Penalty:     rule.Penalty,
			Explanation: rule.Explanation,
		}
	}

	return nil
}

// Helper functions
func (d *ArchitectureIntentDetector) hasSignal(signal string) bool {
	return d.signals[signal]
}

func (d *ArchitectureIntentDetector) getMatchedSignals(signals []string) []string {
	matched := make([]string, 0)
	for _, s := range signals {
		if d.hasSignal(s) {
			matched = append(matched, s)
		}
	}
	return matched
}

func (d *ArchitectureIntentDetector) determineJustificationLevel(score float64) JustificationLevel {
	switch {
	case score >= 0.80:
		return JustificationFull
	case score >= 0.60:
		return JustificationPartial
	case score >= 0.30:
		return JustificationWeak
	default:
		return JustificationNone
	}
}

func (d *ArchitectureIntentDetector) calculateMaturity(style ArchitectureStyle) int {
	base := 5 // Default middle score

	// Positive signals
	if d.hasSignal("health_probes") {
		base++
	}
	if d.hasSignal("structured_logging") {
		base++
	}
	if d.hasSignal("distributed_tracing") {
		base++
	}
	if d.hasSignal("circuit_breaker") {
		base++
	}
	if d.hasSignal("api_versioning") {
		base++
	}

	// Negative signals
	if !d.hasSignal("error_handling") && d.projectSize > 20 {
		base--
	}
	if style == ArchStyleMicroservices && d.serviceCount < 3 {
		base -= 2
	}

	// Clamp to 0-10
	if base < 0 {
		base = 0
	}
	if base > 10 {
		base = 10
	}

	return base
}

func (d *ArchitectureIntentDetector) generateExplanation(verdict ArchitectureVerdict) string {
	var explanation string

	switch verdict.JustificationLevel {
	case JustificationFull:
		explanation = "Well-structured " + string(verdict.Style) + " with proper supporting infrastructure."
	case JustificationPartial:
		explanation = string(verdict.Style) + " pattern detected with some infrastructure gaps."
	case JustificationWeak:
		explanation = string(verdict.Style) + " pattern lacks key supporting infrastructure. Consider simplifying or adding missing components."
	case JustificationNone:
		explanation = "Architecture complexity appears unjustified for project scale. Consider: Is this complexity necessary?"
	}

	if len(verdict.CargoCultWarnings) > 0 {
		explanation += " Detected " + string(rune(len(verdict.CargoCultWarnings)+'0')) + " cargo-cult warning(s)."
	}

	return explanation
}

func (d *ArchitectureIntentDetector) detectStrengths() []string {
	strengths := make([]string, 0)

	if d.hasSignal("ci_cd") {
		strengths = append(strengths, "Automated CI/CD pipeline")
	}
	if d.hasSignal("infrastructure_as_code") {
		strengths = append(strengths, "Infrastructure as code")
	}
	if d.hasSignal("comprehensive_testing") {
		strengths = append(strengths, "Comprehensive test coverage")
	}
	if d.hasSignal("observability_stack") {
		strengths = append(strengths, "Full observability stack")
	}
	if d.hasSignal("security_scanning") {
		strengths = append(strengths, "Security scanning in pipeline")
	}

	return strengths
}

func (d *ArchitectureIntentDetector) analyzeTradeoffs(style ArchitectureStyle) []ArchitectureTradeoff {
	tradeoffs := make([]ArchitectureTradeoff, 0)

	switch style {
	case ArchStyleMicroservices:
		tradeoffs = append(tradeoffs, ArchitectureTradeoff{
			Decision:      "Microservices architecture",
			Benefit:       "Independent deployment, team autonomy, technology diversity",
			Cost:          "Distributed system complexity, network latency, operational overhead",
			IsAppropriate: d.serviceCount >= 3 && d.projectSize > 100,
		})
	case ArchStyleMonolith:
		tradeoffs = append(tradeoffs, ArchitectureTradeoff{
			Decision:      "Monolithic architecture",
			Benefit:       "Simpler deployment, easier debugging, lower operational complexity",
			Cost:          "Scaling constraints, technology lock-in, larger codebase coordination",
			IsAppropriate: d.projectSize < 200 || d.serviceCount <= 2,
		})
	case ArchStyleEventDriven:
		tradeoffs = append(tradeoffs, ArchitectureTradeoff{
			Decision:      "Event-driven architecture",
			Benefit:       "Loose coupling, scalability, asynchronous processing",
			Cost:          "Event ordering complexity, eventual consistency, debugging difficulty",
			IsAppropriate: d.hasSignal("dead_letter_queue") && d.hasSignal("retry_logic"),
		})
	}

	return tradeoffs
}

func formatSignalList(signals []string) string {
	if len(signals) == 0 {
		return "none"
	}
	result := signals[0]
	for i := 1; i < len(signals); i++ {
		result += ", " + signals[i]
	}
	return result
}
