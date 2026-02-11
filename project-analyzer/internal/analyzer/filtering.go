package analyzer

// ============================================
// SIGNAL FILTERING
// Removes irrelevant signals based on project type
// ============================================

import (
	"github.com/rs/zerolog/log"
	"github.com/verifydev/project-analyzer/pkg/signals"
)

// filterSignalsByProjectType removes irrelevant signals based on user selection
func filterSignalsByProjectType(result *signals.ProjectSignals, projectType string) {
	switch projectType {
	case "frontend":
		filterForFrontend(result)
	case "backend":
		filterForBackend(result)
	case "fullstack":
		log.Debug().Msg("Keeping all signals for fullstack project")
	default:
		log.Debug().Str("type", projectType).Msg("Keeping all signals")
	}
}

// filterForFrontend removes backend-specific signals from frontend projects
func filterForFrontend(result *signals.ProjectSignals) {
	// Remove backend language signals
	result.NodeSignals = nil
	result.GoSignals = nil
	result.PythonSignals = nil

	// Strict Skill Filtering for Frontend
	if result.IndustryAnalysis != nil {
		var filteredSkills []signals.VerifiedSkill
		for _, skill := range result.IndustryAnalysis.VerifiedSkills {
			if skill.Category == "frontend" ||
				skill.Category == "framework" ||
				skill.Category == "language" ||
				skill.Category == "infrastructure" ||
				skill.Category == "testing" ||
				skill.Category == "observability" ||
				skill.Category == "security" {
				filteredSkills = append(filteredSkills, skill)
			}
		}
		result.IndustryAnalysis.VerifiedSkills = filteredSkills

		// Clean SkillsByCategory Map
		if result.IndustryAnalysis.SkillsByCategory != nil {
			delete(result.IndustryAnalysis.SkillsByCategory, "database")
			delete(result.IndustryAnalysis.SkillsByCategory, "messaging")
			delete(result.IndustryAnalysis.SkillsByCategory, "architecture")
			delete(result.IndustryAnalysis.SkillsByCategory, "ml")
			delete(result.IndustryAnalysis.SkillsByCategory, "backend")
		}

		// Remove Architecture/Microservices Graph for Frontend
		result.IndustryAnalysis.Architecture = signals.SystemArchitecture{}

		// Filter infraSignals to remove backend-only signals
		filterBackendInfraSignals(result)
	}

	// Clear Backend-specific Tech Stacks
	result.Databases = []string{}
	var filteredTools []string
	for _, tool := range result.Tools {
		if tool != "Kafka" && tool != "RabbitMQ" && tool != "NATS" {
			filteredTools = append(filteredTools, tool)
		}
	}
	result.Tools = filteredTools

	// Filter Frameworks to remove backend frameworks
	var filteredFrameworks []string
	backendFrameworks := map[string]bool{
		"Express": true, "NestJS": true, "Fastify": true, "Koa": true,
		"Gin": true, "Fiber": true, "Echo": true, "Chi": true,
		"Django": true, "Flask": true, "FastAPI": true,
		"gRPC": true, "GraphQL": true,
	}
	for _, fw := range result.Frameworks {
		if !backendFrameworks[fw] {
			filteredFrameworks = append(filteredFrameworks, fw)
		}
	}
	result.Frameworks = filteredFrameworks

	log.Debug().Msg("Filtered out backend signals & skills for frontend project")
}

// filterBackendInfraSignals removes backend-only infra signals from frontend projects
func filterBackendInfraSignals(result *signals.ProjectSignals) {
	if result.IndustryAnalysis.InfraSignals == nil {
		return
	}

	backendOnlySignals := map[signals.InfraSignal]bool{
		signals.SignalRabbitMQ:          true,
		signals.SignalKafka:             true,
		signals.SignalNATS:              true,
		signals.SignalCaching:           true,
		signals.SignalRedis:             true,
		signals.SignalCircuitBreaker:    true,
		signals.SignalEventSourcing:     true,
		signals.SignalPropertyTesting:   true,
		signals.SignalServerless:        true,
		signals.SignalSQLInjection:      true,
		signals.SignalRateLimiting:      true,
		signals.SignalHashing:           true,
		signals.SignalEncryption:        true,
		signals.SignalDecoratorPattern:  true,
		signals.SignalAdapterPattern:    true,
		signals.SignalHexagonalArch:     true,
		signals.SignalMetricsCollection: true,
		signals.SignalPrometheus:        true,
		signals.SignalPenetrationTest:   true,
		signals.SignalAPIVersioning:     true,
		signals.SignalMessageProducer:   true,
		signals.SignalMessageConsumer:   true,
	}

	var filteredSignals []signals.InfraSignal
	for _, sig := range result.IndustryAnalysis.InfraSignals.Signals {
		if !backendOnlySignals[sig] {
			filteredSignals = append(filteredSignals, sig)
		}
	}
	result.IndustryAnalysis.InfraSignals.Signals = filteredSignals

	for sig := range backendOnlySignals {
		delete(result.IndustryAnalysis.InfraSignals.SignalDetails, sig)
	}
	log.Debug().Int("filteredInfraSignals", len(filteredSignals)).Msg("Filtered backend-only infraSignals for frontend project")
}

// filterForBackend adjusts frontend signals for backend projects
func filterForBackend(result *signals.ProjectSignals) {
	result.ReactSignals = nil

	if result.IndustryAnalysis != nil {
		var filteredSkills []signals.VerifiedSkill
		for _, skill := range result.IndustryAnalysis.VerifiedSkills {
			if skill.Category == "frontend" {
				skill.Confidence *= 0.4
				skill.ResumeReady = false
				if skill.Confidence >= 0.2 {
					filteredSkills = append(filteredSkills, skill)
				}
			} else {
				filteredSkills = append(filteredSkills, skill)
			}
		}
		result.IndustryAnalysis.VerifiedSkills = filteredSkills
	}

	// Filter Frameworks
	var filteredFrameworks []string
	for _, fw := range result.Frameworks {
		if fw != "React" && fw != "Vue.js" && fw != "Angular" && fw != "Svelte" && fw != "Tailwind CSS" {
			filteredFrameworks = append(filteredFrameworks, fw)
		}
	}
	result.Frameworks = filteredFrameworks

	log.Debug().Msg("Adjusted frontend skill confidence for backend project")
}
