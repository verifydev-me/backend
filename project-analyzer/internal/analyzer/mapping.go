package analyzer

// ============================================
// TYPE MAPPING
// Converts between internal types (intelligence, parser)
// and API response types (signals.ProjectSignals)
// ============================================

import (
	"github.com/verifydev/project-analyzer/internal/intelligence"
	"github.com/verifydev/project-analyzer/pkg/signals"
)

// mapToFastSignals converts detailed ProjectSignals to FastSignals for the intelligence pipeline
// This prevents the intelligence engine from re-walking the entire file system
func mapToFastSignals(p *signals.ProjectSignals, infra *signals.InfrastructureSignals) *intelligence.FastSignals {
	fs := &intelligence.FastSignals{
		DominantLanguage:   p.PrimaryLanguage,
		LanguagePercentage: 0.0,
		DetectedFrameworks: p.Frameworks,

		// Folder Intent
		HasSrcFolder:        p.FolderStructure.HasSrcFolder,
		HasInternalFolder:   p.FolderStructure.HasInternal,
		HasPkgFolder:        p.FolderStructure.HasPkg,
		HasCmdFolder:        p.FolderStructure.HasCmd,
		HasServicesFolder:   p.FolderStructure.HasServices,
		HasGateway:          p.FolderStructure.HasGateway,
		HasComponentsFolder: p.FolderStructure.HasComponents,

		// Production Markers
		HasCI:         p.CodeSignals.HasCI,
		HasEnvExample: p.CodeSignals.HasEnvExample,
		HasLinting:    p.CodeSignals.HasLinting,
		HasTests:      p.CodeSignals.TestFilesCount > 0 || p.FolderStructure.HasTests,

		TestFilesCount: p.CodeSignals.TestFilesCount,
		TotalFiles:     p.TotalFiles,
		CodeFiles:      p.TotalFiles,
	}

	// Calculate primary language percentage
	for _, l := range p.Languages {
		if l.Name == p.PrimaryLanguage {
			fs.LanguagePercentage = l.Percentage / 100.0
			break
		}
	}

	// Collect secondary languages
	for _, l := range p.Languages {
		if l.Name != p.PrimaryLanguage && l.Percentage > 5.0 {
			fs.SecondaryLanguages = append(fs.SecondaryLanguages, l.Name)
		}
	}

	// Map Infrastructure Signals if available
	if infra != nil {
		fs.HasDockerfile = infra.HasSignal(signals.SignalDocker)
		fs.HasDockerCompose = infra.HasSignal(signals.SignalDockerCompose)

		if infra.HasSignal("multiple_services") || len(p.FolderStructure.TopLevelFolders) > 2 {
			fs.HasMicroservices = true
			if infra.ServiceCount > 0 {
				fs.ServiceCount = infra.ServiceCount
			} else {
				fs.ServiceCount = 2
			}
		}

		if infra.HasSignal(signals.SignalLLM) || infra.HasSignal("python_ml") {
			fs.HasMLMarkers = true
		}
	}

	// TypeScript detection
	for _, l := range p.Languages {
		if l.Name == "TypeScript" {
			fs.HasTypeScript = true
			break
		}
	}

	return fs
}

// mapIntelligenceVerdict converts intelligence package result to API response type
func mapIntelligenceVerdict(result *intelligence.PipelineResult) *signals.IntelligenceVerdict {
	if result == nil || result.Verdict == nil {
		return nil
	}

	v := result.Verdict

	iv := &signals.IntelligenceVerdict{
		ProjectIntentSummary:  v.ProjectIntentSummary,
		TechStackSnapshot:     v.TechStackSnapshot,
		ArchitectureMaturity:  v.ArchitectureMaturity,
		OverallScore:          v.OverallScore,
		DeveloperLevel:        string(result.DevLevel),
		ProjectIntent:         string(result.Intent),
		KeySignals:            v.KeySignals,
		StrengthSignals:       v.StrengthSignals,
		RiskSignals:           v.RiskSignals,
		SeniorEngineerVerdict: v.SeniorEngineerVerdict,
		HireSignal:            string(v.HireSignal),
		AnalysisTimeMs:        result.AnalysisTimeMs,
		ModulesExecuted:       result.ModulesExecuted,
		ModulesSkipped:        result.ModulesSkipped,
		EarlyTermination:      result.EarlyTermination,
		ExitReason:            result.ExitReason,
	}

	// Map suggestions
	for _, s := range v.Suggestions {
		iv.Suggestions = append(iv.Suggestions, signals.IntelligenceSuggestion{
			Category:    s.Category,
			Message:     s.Message,
			ImpactScore: s.ImpactScore,
			EffortScore: s.EffortScore,
			Priority:    s.Priority,
		})
	}

	// Map skills
	for _, skill := range v.ExtractedSkills {
		iv.ExtractedSkills = append(iv.ExtractedSkills, signals.IntelligenceSkill{
			Name:          skill.Name,
			Category:      skill.Category,
			Confidence:    skill.Confidence,
			Evidence:      skill.Evidence,
			ResumeReady:   skill.ResumeReady,
			UsageVerified: skill.UsageVerified,
			UsageStrength: skill.UsageStrength,
		})
	}

	return iv
}
