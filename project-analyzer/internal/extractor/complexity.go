package extractor

import (
	"math"

	"github.com/verifydev/project-analyzer/pkg/signals"
)

// ============================================
// PROJECT COMPLEXITY SCORING
// ============================================

// CalculateComplexity computes the project complexity score
func (e *InfraExtractor) CalculateComplexity() *signals.ComplexityScore {
	score := &signals.ComplexityScore{}

	// 1. Architecture Complexity (Microservices, Event-Driven, Patterns)
	archPoints := 0.0
	// Use SignalMultipleServices as a proxy for Microservices at complexity level
	if e.signals.HasSignal(signals.SignalMultipleServices) {
		archPoints += 30
	} else if e.signals.HasSignal(signals.SignalMonorepo) {
		archPoints += 15
	}

	if e.signals.HasSignal(signals.SignalEventDrivenArchitecture) {
		archPoints += 20
	}
	if e.signals.HasSignal(signals.SignalCQRS) {
		archPoints += 15
	}
	if e.signals.HasSignal(signals.SignalHexagonalArch) || e.signals.HasSignal(signals.SignalCleanArchitecture) {
		archPoints += 20
	}
	// Cap at 100
	score.ArchitectureScore = math.Min(100, archPoints)

	// 2. Infrastructure Complexity (K8s, Cloud, databases)
	infraPoints := 0.0
	if e.signals.HasSignal(signals.SignalKubernetes) {
		infraPoints += 25
	} else if e.signals.HasSignal(signals.SignalDockerCompose) {
		infraPoints += 10
	}

	if e.signals.HasSignal(signals.SignalTerraform) || e.signals.HasSignal(signals.SignalPulumi) {
		infraPoints += 20
	}

	if e.signals.HasSignal(signals.SignalAWS) || e.signals.HasSignal(signals.SignalGCP) {
		infraPoints += 15
	}

	if e.signals.HasSignal(signals.SignalKafka) || e.signals.HasSignal(signals.SignalRabbitMQ) {
		infraPoints += 15
	}

	// Complex databases
	if e.signals.HasSignal(signals.SignalCassandra) || e.signals.HasSignal(signals.SignalElasticsearch) {
		infraPoints += 15
	}

	score.InfrastructureScore = math.Min(100, infraPoints)

	// 3. Code Quality & Scale (Tests, CI, Observability)
	qualityPoints := 0.0
	if e.signals.HasSignal(signals.SignalUnitTests) {
		qualityPoints += 15
	}
	if e.signals.HasSignal(signals.SignalE2ETests) {
		qualityPoints += 20
	}
	if e.signals.HasSignal(signals.SignalGitHubActions) || e.signals.HasSignal(signals.SignalGitLabCI) {
		qualityPoints += 15
	}
	if e.signals.HasSignal(signals.SignalPrometheus) || e.signals.HasSignal(signals.SignalDatadog) {
		qualityPoints += 15
	}
	if e.signals.HasSignal(signals.SignalOpenTelemetry) {
		qualityPoints += 15
	}

	// Line count bonus (logarithmic scale) based on rough estimation from file scan
	// We don't have line count here directly, so we use service count
	if e.signals.ServiceCount > 5 {
		qualityPoints += 20
	} else if e.signals.ServiceCount > 2 {
		qualityPoints += 10
	}

	score.CodeQualityScore = math.Min(100, qualityPoints)

	// Total Weighted Score
	// Architecture: 40%, Infrastructure: 35%, Quality: 25%
	score.TotalScore = (score.ArchitectureScore * 0.4) + (score.InfrastructureScore * 0.35) + (score.CodeQualityScore * 0.25)

	// Determine Label
	if score.TotalScore >= 80 {
		score.ScaleLabel = "Enterprise"
	} else if score.TotalScore >= 50 {
		score.ScaleLabel = "Growth/Scaleup"
	} else if score.TotalScore >= 30 {
		score.ScaleLabel = "MVP"
	} else {
		score.ScaleLabel = "Prototype"
	}

	return score
}
