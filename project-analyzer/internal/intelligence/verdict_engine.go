package intelligence

import (
	"fmt"
	"strings"
)

// ============================================
// VERDICT ENGINE
// Produces recruiter-grade assessment
// This is what recruiters READ and TRUST
// Never generic - always specific and actionable
// ============================================

// VerdictEngine produces final assessment
type VerdictEngine struct {
	signals     *FastSignals
	confidence  *SignalConfidenceVector
	intent      ProjectIntent
	devLevel    DeveloperLevel
	archIntent  ArchitectureIntent
	suggestions []Suggestion
	skills      []ExtractedSkill
}

// NewVerdictEngine creates a new verdict engine
func NewVerdictEngine(signals *FastSignals, confidence *SignalConfidenceVector,
	intent ProjectIntent, devLevel DeveloperLevel, archIntent ArchitectureIntent,
	suggestions []Suggestion, skills []ExtractedSkill) *VerdictEngine {
	return &VerdictEngine{
		signals:     signals,
		confidence:  confidence,
		intent:      intent,
		devLevel:    devLevel,
		archIntent:  archIntent,
		suggestions: suggestions,
		skills:      skills,
	}
}

// GenerateVerdict produces the final assessment
func (e *VerdictEngine) GenerateVerdict() *Verdict {
	v := &Verdict{
		ProjectIntentSummary:  e.generateIntentSummary(),
		TechStackSnapshot:     e.generateTechStack(),
		ArchitectureMaturity:  e.calculateArchitectureMaturity(),
		OverallScore:          e.calculateOverallScore(),
		KeySignals:            e.extractKeySignals(),
		StrengthSignals:       e.extractStrengths(),
		RiskSignals:           e.extractRisks(),
		Suggestions:           e.suggestions,
		ExtractedSkills:       e.skills,
		SeniorEngineerVerdict: e.generateEngineerVerdict(),
		HireSignal:            e.calculateHireSignal(),
	}

	return v
}

// generateIntentSummary creates a 1-2 line project summary
func (e *VerdictEngine) generateIntentSummary() string {
	parts := []string{}

	// Developer level
	switch e.devLevel {
	case LevelExpert:
		parts = append(parts, "Expert-level")
	case LevelSenior:
		parts = append(parts, "Senior-level")
	case LevelIntermediate:
		parts = append(parts, "Intermediate-level")
	default:
		parts = append(parts, "Junior-level")
	}

	// Language
	if e.signals.DominantLanguage != "" {
		parts = append(parts, e.signals.DominantLanguage)
	}

	// Project type
	if e.signals.HasMicroservices {
		parts = append(parts, "microservices project")
	} else if len(e.signals.DetectedFrameworks) > 0 {
		parts = append(parts, e.signals.DetectedFrameworks[0]+" project")
	} else {
		switch e.intent {
		case IntentEnterprise:
			parts = append(parts, "enterprise project")
		case IntentProduction:
			parts = append(parts, "production project")
		default:
			parts = append(parts, "project")
		}
	}

	// Architecture qualifier
	switch e.archIntent {
	case ArchSophisticated:
		parts = append(parts, "with sophisticated architecture")
	case ArchIntentional:
		parts = append(parts, "with intentional structure")
	}

	return strings.Join(parts, " ")
}

// generateTechStack creates tech stack snapshot
func (e *VerdictEngine) generateTechStack() []string {
	stack := []string{}

	// Primary language
	if e.signals.DominantLanguage != "" {
		stack = append(stack, e.signals.DominantLanguage)
	}

	// Frameworks
	for _, fw := range e.signals.DetectedFrameworks {
		stack = append(stack, fw)
	}

	// Infrastructure
	if e.signals.HasDockerfile {
		stack = append(stack, "Docker")
	}
	if e.signals.HasKubernetes {
		stack = append(stack, "Kubernetes")
	}
	if e.signals.HasTerraform {
		stack = append(stack, "Terraform")
	}

	return stack
}

// calculateArchitectureMaturity returns 0-10 score
func (e *VerdictEngine) calculateArchitectureMaturity() int {
	score := 0.0

	// Architecture confidence is primary factor
	score += e.confidence.ArchitectureConfidence * 4

	// Project structure
	if e.archIntent == ArchSophisticated {
		score += 3
	} else if e.archIntent == ArchIntentional {
		score += 1.5
	}

	// Infrastructure maturity
	if e.signals.HasMicroservices && e.signals.HasGateway {
		score += 1
	}
	if e.signals.HasKubernetes {
		score += 0.5
	}

	// Test coverage
	if e.confidence.TestConfidence > 0.6 {
		score += 1
	}

	return int(min(score, 10))
}

// calculateOverallScore returns 0-100 score
func (e *VerdictEngine) calculateOverallScore() float64 {
	// Weighted confidence
	baseScore := e.confidence.OverallConfidence() * 100

	// Bonuses
	if e.signals.HasTests {
		baseScore += 5
	}
	if e.signals.HasCI {
		baseScore += 5
	}
	if e.signals.HasDockerfile {
		baseScore += 3
	}
	if e.signals.HasReadme {
		baseScore += 2
	}

	// Penalties
	if !e.signals.HasTests && e.signals.CodeFiles > 10 {
		baseScore -= 10
	}
	if !e.signals.HasCI && e.intent == IntentProduction {
		baseScore -= 5
	}

	return min(baseScore, 100)
}

// extractKeySignals returns bullet points of detected patterns
func (e *VerdictEngine) extractKeySignals() []string {
	signals := []string{}

	if e.signals.HasMicroservices {
		signals = append(signals, "Microservices architecture detected")
	}
	if e.signals.HasGateway {
		signals = append(signals, "API Gateway pattern implemented")
	}
	if e.signals.HasKubernetes {
		signals = append(signals, "Kubernetes deployment configured")
	}
	if e.signals.HasCI {
		signals = append(signals, "CI/CD pipeline active")
	}
	if e.signals.HasTests && e.signals.TestFilesCount > 5 {
		signals = append(signals, fmt.Sprintf("Solid test coverage (%d test files)", e.signals.TestFilesCount))
	}
	if e.signals.HasTypeScript {
		signals = append(signals, "TypeScript enabled for type safety")
	}
	if e.signals.HasInternalFolder && e.signals.HasCmdFolder {
		signals = append(signals, "Follows Go standard project layout")
	}

	return signals
}

// extractStrengths returns positive signals
func (e *VerdictEngine) extractStrengths() []string {
	strengths := []string{}

	if e.confidence.ArchitectureConfidence > 0.7 {
		strengths = append(strengths, "Clean architecture with clear separation of concerns")
	}
	if e.signals.HasTests && e.confidence.TestConfidence > 0.6 {
		strengths = append(strengths, "Good testing discipline")
	}
	if e.signals.HasDockerfile && e.signals.HasCI {
		strengths = append(strengths, "Production-ready deployment pipeline")
	}
	if len(e.signals.DetectedFrameworks) > 0 {
		strengths = append(strengths, "Uses established frameworks appropriately")
	}
	if e.signals.HasLinting {
		strengths = append(strengths, "Code quality tools configured")
	}
	if e.archIntent == ArchSophisticated {
		strengths = append(strengths, "Sophisticated architecture demonstrating senior-level thinking")
	}

	return strengths
}

// extractRisks returns concerning signals
func (e *VerdictEngine) extractRisks() []string {
	risks := []string{}

	if !e.signals.HasTests && e.signals.CodeFiles > 10 {
		risks = append(risks, "No test coverage - high risk for production")
	}
	if !e.signals.HasCI && e.intent == IntentProduction {
		risks = append(risks, "No CI/CD - manual deployment is error-prone")
	}
	if !e.signals.HasReadme && e.signals.CodeFiles > 5 {
		risks = append(risks, "Missing documentation")
	}
	if e.confidence.ArchitectureConfidence < 0.3 && e.signals.CodeFiles > 20 {
		risks = append(risks, "Unclear architecture may hinder maintainability")
	}
	if !e.signals.HasEnvExample && e.signals.HasDockerfile {
		risks = append(risks, "Environment variables not documented")
	}

	return risks
}

// generateEngineerVerdict creates senior engineer-level assessment
// NEVER GENERIC - always specific and actionable
func (e *VerdictEngine) generateEngineerVerdict() string {
	var verdict strings.Builder

	// Opening assessment
	switch e.devLevel {
	case LevelExpert, LevelSenior:
		verdict.WriteString(fmt.Sprintf("%s-level %s project demonstrating ",
			e.devLevel, e.signals.DominantLanguage))
	case LevelIntermediate:
		verdict.WriteString(fmt.Sprintf("Intermediate-level %s project with ",
			e.signals.DominantLanguage))
	default:
		verdict.WriteString(fmt.Sprintf("Early-stage %s project showing ",
			e.signals.DominantLanguage))
	}

	// Architecture assessment
	switch e.archIntent {
	case ArchSophisticated:
		verdict.WriteString("sophisticated architecture and strong engineering practices. ")
	case ArchIntentional:
		verdict.WriteString("intentional structure and awareness of best practices. ")
	default:
		verdict.WriteString("basic structure that would benefit from refactoring. ")
	}

	// Key observations
	observations := []string{}
	if e.signals.HasMicroservices {
		observations = append(observations, "distributed systems experience")
	}
	if e.signals.HasKubernetes {
		observations = append(observations, "cloud-native deployment knowledge")
	}
	if e.confidence.TestConfidence > 0.6 {
		observations = append(observations, "testing discipline")
	}
	if len(observations) > 0 {
		verdict.WriteString(fmt.Sprintf("Shows %s. ", strings.Join(observations, ", ")))
	}

	// Gap assessment
	gaps := []string{}
	if !e.signals.HasTests && e.signals.CodeFiles > 10 {
		gaps = append(gaps, "test coverage")
	}
	if !e.signals.HasCI {
		gaps = append(gaps, "CI/CD automation")
	}
	if e.confidence.ArchitectureConfidence < 0.4 && e.signals.CodeFiles > 20 {
		gaps = append(gaps, "architectural clarity")
	}
	if len(gaps) > 0 {
		verdict.WriteString(fmt.Sprintf("Gaps in %s should be addressed. ", strings.Join(gaps, " and ")))
	}

	// Role suitability
	switch e.calculateHireSignal() {
	case HireStrongHire:
		verdict.WriteString("Suitable for senior technical roles.")
	case HireHire:
		verdict.WriteString("Suitable for mid-to-senior roles with minor growth areas.")
	case HireBorderline:
		verdict.WriteString("Suitable for junior-to-mid roles with mentorship.")
	default:
		verdict.WriteString("Needs significant improvement before production deployment.")
	}

	return verdict.String()
}

// calculateHireSignal determines hiring recommendation
func (e *VerdictEngine) calculateHireSignal() HireSignal {
	score := 0

	// Positive signals
	if e.devLevel == LevelExpert {
		score += 4
	} else if e.devLevel == LevelSenior {
		score += 3
	} else if e.devLevel == LevelIntermediate {
		score += 1
	}

	if e.archIntent == ArchSophisticated {
		score += 3
	} else if e.archIntent == ArchIntentional {
		score += 1
	}

	if e.confidence.TestConfidence > 0.6 {
		score += 2
	}
	if e.signals.HasCI {
		score += 1
	}
	if e.signals.HasKubernetes || e.signals.HasTerraform {
		score += 2
	}

	// Negative signals
	if !e.signals.HasTests && e.signals.CodeFiles > 10 {
		score -= 2
	}
	if e.confidence.ArchitectureConfidence < 0.3 {
		score -= 2
	}

	// Decision
	switch {
	case score >= 8:
		return HireStrongHire
	case score >= 5:
		return HireHire
	case score >= 2:
		return HireBorderline
	default:
		return HireNoHire
	}
}
