package intelligence

import (
	"sort"
)

// ============================================
// SUGGESTION GENERATOR
// Auto-generates high-impact suggestions
// Uses pattern detection to produce actionable advice
// Sorts by Impact/Effort ratio
// ============================================

// SuggestionGenerator creates improvement suggestions
type SuggestionGenerator struct {
	signals    *FastSignals
	confidence *SignalConfidenceVector
	intent     ProjectIntent
	devLevel   DeveloperLevel
}

// SuggestionRule defines a suggestion trigger
type SuggestionRule struct {
	Category    string
	Trigger     func(*FastSignals, *SignalConfidenceVector) bool
	Message     string
	ImpactScore int
	EffortScore int
}

// NewSuggestionGenerator creates a new generator
func NewSuggestionGenerator(signals *FastSignals, confidence *SignalConfidenceVector,
	intent ProjectIntent, devLevel DeveloperLevel) *SuggestionGenerator {
	return &SuggestionGenerator{
		signals:    signals,
		confidence: confidence,
		intent:     intent,
		devLevel:   devLevel,
	}
}

// GenerateSuggestions produces impact-weighted suggestions
func (g *SuggestionGenerator) GenerateSuggestions() []Suggestion {
	suggestions := []Suggestion{}

	// Apply all rules
	for _, rule := range g.getSuggestionRules() {
		if rule.Trigger(g.signals, g.confidence) {
			s := Suggestion{
				Category:    rule.Category,
				Message:     rule.Message,
				ImpactScore: rule.ImpactScore,
				EffortScore: rule.EffortScore,
			}
			s.ComputePriority()
			suggestions = append(suggestions, s)
		}
	}

	// Sort by priority (highest first)
	sort.Slice(suggestions, func(i, j int) bool {
		return suggestions[i].Priority > suggestions[j].Priority
	})

	// Limit to top 10
	if len(suggestions) > 10 {
		suggestions = suggestions[:10]
	}

	return suggestions
}

// getSuggestionRules returns all available suggestion rules
func (g *SuggestionGenerator) getSuggestionRules() []SuggestionRule {
	return []SuggestionRule{
		// ============================================
		// TESTING SUGGESTIONS
		// ============================================
		{
			Category: "Testing",
			Trigger: func(s *FastSignals, c *SignalConfidenceVector) bool {
				return !s.HasTests && s.CodeFiles > 5
			},
			Message:     "Add unit tests - projects without tests are risky for production",
			ImpactScore: 9,
			EffortScore: 6,
		},
		{
			Category: "Testing",
			Trigger: func(s *FastSignals, c *SignalConfidenceVector) bool {
				return s.HasTests && s.TestFilesCount < 3 && s.CodeFiles > 20
			},
			Message:     "Increase test coverage - current test count is low relative to codebase size",
			ImpactScore: 7,
			EffortScore: 5,
		},

		// ============================================
		// INFRASTRUCTURE SUGGESTIONS
		// ============================================
		{
			Category: "Infrastructure",
			Trigger: func(s *FastSignals, c *SignalConfidenceVector) bool {
				return !s.HasDockerfile && s.CodeFiles > 10
			},
			Message:     "Add Dockerfile for containerized deployment",
			ImpactScore: 8,
			EffortScore: 3,
		},
		{
			Category: "Infrastructure",
			Trigger: func(s *FastSignals, c *SignalConfidenceVector) bool {
				return !s.HasCI && s.HasTests
			},
			Message:     "Set up CI/CD pipeline (GitHub Actions recommended) to automate testing",
			ImpactScore: 8,
			EffortScore: 4,
		},
		{
			Category: "Infrastructure",
			Trigger: func(s *FastSignals, c *SignalConfidenceVector) bool {
				return s.HasDockerfile && !s.HasDockerCompose && s.HasMicroservices
			},
			Message:     "Add docker-compose.yml for local multi-service development",
			ImpactScore: 6,
			EffortScore: 3,
		},

		// ============================================
		// CODE QUALITY SUGGESTIONS
		// ============================================
		{
			Category: "Code Quality",
			Trigger: func(s *FastSignals, c *SignalConfidenceVector) bool {
				return !s.HasLinting && (s.DominantLanguage == "TypeScript" ||
					s.DominantLanguage == "JavaScript")
			},
			Message:     "Add ESLint and Prettier for consistent code style",
			ImpactScore: 6,
			EffortScore: 2,
		},
		{
			Category: "Code Quality",
			Trigger: func(s *FastSignals, c *SignalConfidenceVector) bool {
				return !s.HasReadme && s.CodeFiles > 5
			},
			Message:     "Add README.md with project description, setup instructions, and usage",
			ImpactScore: 7,
			EffortScore: 2,
		},
		{
			Category: "Code Quality",
			Trigger: func(s *FastSignals, c *SignalConfidenceVector) bool {
				return !s.HasEnvExample && s.HasDockerfile
			},
			Message:     "Add .env.example to document required environment variables",
			ImpactScore: 5,
			EffortScore: 1,
		},

		// ============================================
		// GO-SPECIFIC SUGGESTIONS
		// ============================================
		{
			Category: "Go",
			Trigger: func(s *FastSignals, c *SignalConfidenceVector) bool {
				return s.DominantLanguage == "Go" && !s.HasInternalFolder && s.CodeFiles > 10
			},
			Message:     "Follow Go standard project layout - add internal/ and cmd/ folders",
			ImpactScore: 7,
			EffortScore: 4,
		},
		{
			Category: "Go",
			Trigger: func(s *FastSignals, c *SignalConfidenceVector) bool {
				return s.DominantLanguage == "Go" && !s.HasTests && s.CodeFiles > 5
			},
			Message:     "Add Go table-driven tests for better coverage and maintainability",
			ImpactScore: 8,
			EffortScore: 5,
		},

		// ============================================
		// FRONTEND SUGGESTIONS
		// ============================================
		{
			Category: "Frontend",
			Trigger: func(s *FastSignals, c *SignalConfidenceVector) bool {
				hasReact := false
				for _, fw := range s.DetectedFrameworks {
					if fw == "React" || fw == "Next.js" {
						hasReact = true
						break
					}
				}
				return hasReact && !s.HasTypeScript
			},
			Message:     "Migrate to TypeScript for better type safety and developer experience",
			ImpactScore: 7,
			EffortScore: 6,
		},
		{
			Category: "Frontend",
			Trigger: func(s *FastSignals, c *SignalConfidenceVector) bool {
				hasReact := false
				for _, fw := range s.DetectedFrameworks {
					if fw == "React" {
						hasReact = true
						break
					}
				}
				return hasReact && s.CodeFiles > 30
			},
			Message:     "Consider implementing code splitting with React.lazy for better performance",
			ImpactScore: 6,
			EffortScore: 5,
		},

		// ============================================
		// SECURITY SUGGESTIONS
		// ============================================
		{
			Category: "Security",
			Trigger: func(s *FastSignals, c *SignalConfidenceVector) bool {
				return s.HasDockerfile && c.SecurityConfidence < 0.3
			},
			Message:     "Add security scanning to CI pipeline (Snyk, Trivy, or similar)",
			ImpactScore: 8,
			EffortScore: 4,
		},
		{
			Category: "Security",
			Trigger: func(s *FastSignals, c *SignalConfidenceVector) bool {
				return !s.HasEnvExample && s.HasDockerCompose
			},
			Message:     "Document secrets management - ensure no hardcoded credentials",
			ImpactScore: 9,
			EffortScore: 2,
		},

		// ============================================
		// OBSERVABILITY SUGGESTIONS
		// ============================================
		{
			Category: "Observability",
			Trigger: func(s *FastSignals, c *SignalConfidenceVector) bool {
				return s.HasMicroservices && !s.HasKubernetes
			},
			Message:     "Add structured logging for distributed tracing across services",
			ImpactScore: 7,
			EffortScore: 4,
		},

		// ============================================
		// ARCHITECTURE SUGGESTIONS
		// ============================================
		{
			Category: "Architecture",
			Trigger: func(s *FastSignals, c *SignalConfidenceVector) bool {
				return s.HasMicroservices && !s.HasGateway
			},
			Message:     "Consider adding API gateway for centralized routing and auth",
			ImpactScore: 7,
			EffortScore: 6,
		},
		{
			Category: "Architecture",
			Trigger: func(s *FastSignals, c *SignalConfidenceVector) bool {
				return s.CodeFiles > 50 && c.ArchitectureConfidence < 0.4
			},
			Message:     "Refactor toward cleaner architecture - separate concerns into layers",
			ImpactScore: 8,
			EffortScore: 8,
		},

		// ============================================
		// ML/AI SUGGESTIONS
		// ============================================
		{
			Category: "ML/AI",
			Trigger: func(s *FastSignals, c *SignalConfidenceVector) bool {
				return s.HasMLMarkers && s.HasNotebooks && !s.HasTests
			},
			Message:     "Add validation split and reproducibility tests for ML pipeline",
			ImpactScore: 9,
			EffortScore: 5,
		},
		{
			Category: "ML/AI",
			Trigger: func(s *FastSignals, c *SignalConfidenceVector) bool {
				return s.HasMLMarkers && !s.HasDockerfile
			},
			Message:     "Containerize ML environment for reproducible training/inference",
			ImpactScore: 7,
			EffortScore: 4,
		},
	}
}
