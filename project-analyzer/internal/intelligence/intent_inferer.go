package intelligence

// ============================================
// INTENT INFERER
// Determines project category and developer level
// Uses signals to infer WITHOUT deep analysis
// ============================================

// IntentInferer infers project and developer characteristics
type IntentInferer struct {
	signals    *FastSignals
	confidence *SignalConfidenceVector
}

// NewIntentInferer creates a new intent inferer
func NewIntentInferer(signals *FastSignals, confidence *SignalConfidenceVector) *IntentInferer {
	return &IntentInferer{
		signals:    signals,
		confidence: confidence,
	}
}

// InferIntent determines project intent, developer level, and architecture intent
func (i *IntentInferer) InferIntent() (ProjectIntent, DeveloperLevel, ArchitectureIntent) {
	intent := i.inferProjectIntent()
	level := i.inferDeveloperLevel()
	arch := i.inferArchitectureIntent()
	return intent, level, arch
}

// inferProjectIntent - What is this project for?
func (i *IntentInferer) inferProjectIntent() ProjectIntent {
	score := 0

	// Production markers
	if i.signals.HasDockerfile {
		score += 2
	}
	if i.signals.HasCI {
		score += 3
	}
	if i.signals.HasTests && i.signals.TestFilesCount > 5 {
		score += 2
	}
	if i.signals.HasDockerCompose {
		score += 1
	}
	if i.signals.HasEnvExample {
		score += 1
	}

	// Enterprise markers
	if i.signals.HasKubernetes {
		score += 4
	}
	if i.signals.HasTerraform {
		score += 3
	}
	if i.signals.HasMicroservices {
		score += 3
	}
	if i.signals.HasGateway {
		score += 2
	}

	// Learning/Hobby negative markers
	if !i.signals.HasTests && !i.signals.HasCI {
		score -= 3
	}
	if i.signals.TotalFiles < 10 {
		score -= 2
	}
	if i.signals.CodeFiles < 5 {
		score -= 2
	}

	// Decision
	switch {
	case score >= 10:
		return IntentEnterprise
	case score >= 5:
		return IntentProduction
	case score >= 0:
		return IntentHobby
	default:
		return IntentLearning
	}
}

// inferDeveloperLevel - What level is the developer?
func (i *IntentInferer) inferDeveloperLevel() DeveloperLevel {
	score := 0

	// Architecture signals (strong indicator of level)
	if i.confidence.ArchitectureConfidence > 0.7 {
		score += 4
	} else if i.confidence.ArchitectureConfidence > 0.4 {
		score += 2
	}

	// Go-specific patterns (indicate senior level)
	if i.signals.HasInternalFolder && i.signals.HasCmdFolder {
		score += 3 // Follows Go standard project layout
	}

	// Testing maturity
	if i.signals.TestFilesCount > 10 {
		score += 3
	} else if i.signals.HasTests {
		score += 1
	}

	// Infrastructure awareness
	if i.signals.HasKubernetes || i.signals.HasTerraform {
		score += 3
	}
	if i.signals.HasDockerCompose && i.signals.HasMicroservices {
		score += 2
	}

	// Code organization
	if len(i.signals.DetectedFrameworks) > 0 && i.signals.HasLinting {
		score += 2
	}
	if i.signals.HasTypeScript {
		score += 1 // Type safety awareness
	}

	// Project complexity
	if i.signals.CodeFiles > 50 {
		score += 2
	} else if i.signals.CodeFiles > 20 {
		score += 1
	}

	// Decision
	switch {
	case score >= 12:
		return LevelExpert
	case score >= 8:
		return LevelSenior
	case score >= 4:
		return LevelIntermediate
	default:
		return LevelJunior
	}
}

// inferArchitectureIntent - Is the architecture deliberate or accidental?
func (i *IntentInferer) inferArchitectureIntent() ArchitectureIntent {
	// Check for sophisticated patterns
	sophisticatedSignals := 0
	if i.signals.HasMicroservices && i.signals.HasGateway {
		sophisticatedSignals++
	}
	if i.signals.HasKubernetes {
		sophisticatedSignals++
	}
	if i.confidence.ArchitectureConfidence > 0.7 {
		sophisticatedSignals++
	}
	if sophisticatedSignals >= 2 {
		return ArchSophisticated
	}

	// Check for intentional patterns
	intentionalSignals := 0
	if i.signals.HasSrcFolder || i.signals.HasAppFolder {
		intentionalSignals++
	}
	if i.signals.HasInternalFolder || i.signals.HasPkgFolder {
		intentionalSignals++
	}
	if i.signals.HasServicesFolder {
		intentionalSignals++
	}
	if len(i.signals.DetectedFrameworks) > 0 {
		intentionalSignals++
	}
	if intentionalSignals >= 2 {
		return ArchIntentional
	}

	return ArchAccidental
}

// GetIntentDescription - Human readable description
func (i *IntentInferer) GetIntentDescription(intent ProjectIntent, level DeveloperLevel, arch ArchitectureIntent) string {
	// Build concise description
	var parts []string

	switch level {
	case LevelExpert:
		parts = append(parts, "Expert-level")
	case LevelSenior:
		parts = append(parts, "Senior-level")
	case LevelIntermediate:
		parts = append(parts, "Intermediate-level")
	default:
		parts = append(parts, "Junior-level")
	}

	// Add language context
	if i.signals.DominantLanguage != "" {
		parts = append(parts, i.signals.DominantLanguage)
	}

	// Add project type
	switch intent {
	case IntentEnterprise:
		parts = append(parts, "enterprise project")
	case IntentProduction:
		parts = append(parts, "production-ready project")
	case IntentHobby:
		parts = append(parts, "hobby project")
	default:
		parts = append(parts, "learning project")
	}

	// Add architecture note
	switch arch {
	case ArchSophisticated:
		parts = append(parts, "with sophisticated architecture")
	case ArchIntentional:
		parts = append(parts, "with intentional structure")
	default:
		parts = append(parts, "with basic structure")
	}

	result := ""
	for i, p := range parts {
		if i == 0 {
			result = p
		} else if i == len(parts)-1 {
			result += " " + p
		} else {
			result += " " + p
		}
	}
	return result
}
