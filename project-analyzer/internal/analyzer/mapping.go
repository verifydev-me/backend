package analyzer

// ============================================
// TYPE MAPPING
// Converts between internal types (intelligence, parser)
// and API response types (signals.ProjectSignals)
// ============================================

import (
	astengine "github.com/verifydev/project-analyzer/internal/ast"
	"github.com/verifydev/project-analyzer/internal/confidence"
	"github.com/verifydev/project-analyzer/internal/graph"
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

// mapASTToSignals converts the internal AST engine output to API-facing ASTDeepAnalysis type
func mapASTToSignals(ast *astengine.ProjectASTResult) *signals.ASTDeepAnalysis {
	if ast == nil {
		return nil
	}

	result := &signals.ASTDeepAnalysis{
		TotalFilesAnalyzed: ast.Summary.TotalFiles,
		TotalImports:       ast.Summary.TotalImports,
		UniqueModules:      ast.Summary.UniqueModules,
		TotalFunctions:     ast.Summary.TotalFunctions,
		TotalPatterns:      ast.Summary.TotalPatterns,
		AverageComplexity:  ast.Complexity.AveragePerFunction,
		MaxComplexity:      ast.Complexity.MaxComplexity,
		ComplexityLevel:    ast.GetComplexityLevel(),
		Distribution:       ast.Complexity.Distribution,
		ImportGraph:        ast.ImportGraph,
	}

	// Map technologies
	for name, usage := range ast.TechnologyUsage {
		result.DetectedTechnologies = append(result.DetectedTechnologies, signals.ASTTechnology{
			Name:       name,
			FileCount:  usage.FileCount,
			CallCount:  usage.CallCount,
			Intensity:  usage.Intensity,
			Confidence: ast.GetTechConfidence(name),
			Evidence:   usage.Evidence,
		})
	}

	// Aggregate patterns by type
	patternCounts := make(map[string]int)
	patternNames := make(map[string]string)
	patternConfidences := make(map[string]float64)
	patternEvidence := make(map[string]string)

	for _, file := range ast.Files {
		for _, p := range file.Patterns {
			patternCounts[p.Type]++
			patternNames[p.Type] = p.Name
			if p.Confidence > patternConfidences[p.Type] {
				patternConfidences[p.Type] = p.Confidence
			}
			patternEvidence[p.Type] = p.Evidence
		}
	}

	for pType, count := range patternCounts {
		result.Patterns = append(result.Patterns, signals.ASTPattern{
			Type:       pType,
			Name:       patternNames[pType],
			Confidence: patternConfidences[pType],
			Count:      count,
			Evidence:   patternEvidence[pType],
		})
	}

	return result
}

// mapGraphToSignals converts the internal graph output to API-facing TechDependencyGraph type
func mapGraphToSignals(techGraph *graph.TechGraph, analysis *graph.GraphAnalysisResult) *signals.TechDependencyGraph {
	if techGraph == nil || analysis == nil {
		return nil
	}

	result := &signals.TechDependencyGraph{
		TotalNodes:     analysis.TotalNodes,
		TotalEdges:     analysis.TotalEdges,
		GraphDensity:   analysis.Density,
		AvgNodeWeight:  analysis.AvgNodeWeight,
		MaxConnections: analysis.MaxConnections,
	}

	// Map nodes
	for _, node := range techGraph.Nodes {
		result.Nodes = append(result.Nodes, signals.TechGraphNode{
			ID:          node.ID,
			Name:        node.Name,
			Category:    node.Category,
			SubCategory: node.SubCategory,
			Weight:      node.Weight,
			FileCount:   node.FileCount,
			Evidence:    node.Evidence,
			Sources:     node.Sources,
		})
	}

	// Map edges
	for _, edge := range techGraph.Edges {
		result.Edges = append(result.Edges, signals.TechGraphEdge{
			From:       edge.From,
			To:         edge.To,
			Type:       edge.Type,
			Weight:     edge.Weight,
			Confidence: edge.Confidence,
		})
	}

	// Map detected stacks
	for _, stack := range analysis.DetectedStacks {
		result.DetectedStacks = append(result.DetectedStacks, signals.DetectedTechStack{
			Name:        stack.Pattern.Name,
			Description: stack.Pattern.Description,
			Category:    stack.Pattern.Category,
			SkillLevel:  stack.Pattern.SkillLevel,
			MatchCount:  stack.MatchCount,
			Matched:     stack.Matched,
			Missing:     stack.Missing,
			Confidence:  stack.Confidence,
		})
	}

	// Map inferred skills
	for _, skill := range analysis.InferredSkills {
		result.InferredSkills = append(result.InferredSkills, signals.GraphInferredSkill{
			Name:        skill.Name,
			Category:    skill.Category,
			Level:       skill.Level,
			Confidence:  skill.Confidence,
			Reasoning:   skill.Reasoning,
			BasedOn:     skill.BasedOn,
			ResumeReady: skill.ResumeReady,
		})
	}

	// Map clusters
	for _, cluster := range analysis.Clusters {
		result.Clusters = append(result.Clusters, signals.TechnologyCluster{
			Name:         cluster.Name,
			Technologies: cluster.Technologies,
			Category:     cluster.Category,
			Strength:     cluster.Strength,
		})
	}

	return result
}

// mapConfidenceToSignals converts the internal confidence engine output to API-facing ConfidenceAnalysis type
func mapConfidenceToSignals(report *confidence.ConfidenceReport) *signals.ConfidenceAnalysis {
	if report == nil {
		return nil
	}

	result := &signals.ConfidenceAnalysis{
		AnalysisConfidence: report.AnalysisConfidence,
	}

	// Map skill posteriors
	for _, sp := range report.SkillConfidences {
		result.SkillConfidences = append(result.SkillConfidences, signals.SkillBayesianResult{
			SkillName:     sp.SkillName,
			Category:      sp.Category,
			Prior:         sp.Prior,
			Likelihood:    sp.Likelihood,
			Posterior:     sp.Posterior,
			ASTEvidence:   sp.ASTEvidence,
			InfraEvidence: sp.InfraEvidence,
			GraphEvidence: sp.GraphEvidence,
			QualityWeight: sp.QualityWeight,
			GitWeight:     sp.GitWeight,
			LowerBound:    sp.LowerBound,
			UpperBound:    sp.UpperBound,
			ResumeReady:   sp.ResumeReady,
			UsageVerified: sp.UsageVerified,
			UsageStrength: sp.UsageStrength,
		})
	}

	// Map quality metrics
	result.QualityMetrics = signals.CodeQualityMetrics{
		OrganizationScore:   report.QualityMetrics.OrganizationScore,
		ModularityScore:     report.QualityMetrics.ModularityScore,
		TestCoverageProxy:   report.QualityMetrics.TestCoverageProxy,
		TestMaturity:        report.QualityMetrics.TestMaturity,
		DocumentationScore:  report.QualityMetrics.DocumentationScore,
		ComplexityScore:     report.QualityMetrics.ComplexityScore,
		ComplexityLevel:     report.QualityMetrics.ComplexityLevel,
		ProductionReadiness: report.QualityMetrics.ProductionReadiness,
		OverallQuality:      report.QualityMetrics.OverallQuality,
		QualityTier:         report.QualityMetrics.QualityTier,
	}

	// Map evolution signals
	result.EvolutionSignals = signals.GitEvolutionSignals{
		AuthorshipLevel:    report.EvolutionSignals.AuthorshipLevel,
		AuthorshipFactor:   report.EvolutionSignals.AuthorshipFactor,
		DevelopmentPattern: report.EvolutionSignals.DevelopmentPattern,
		IterationCount:     report.EvolutionSignals.IterationCount,
		RefactorRatio:      report.EvolutionSignals.RefactorRatio,
		ProjectAge:         report.EvolutionSignals.ProjectAge,
		MaturityFactor:     report.EvolutionSignals.MaturityFactor,
		CommitConsistency:  report.EvolutionSignals.CommitConsistency,
	}

	// Map ensemble verdict
	ev := report.EnsembleVerdict
	result.EnsembleVerdict = signals.EnsembleResult{
		ASTScore:          ev.ASTScore,
		GraphScore:        ev.GraphScore,
		InfraScore:        ev.InfraScore,
		IntelligenceScore: ev.IntelligenceScore,
		QualityScore:      ev.QualityScore,
		GitScore:          ev.GitScore,
		Weights: signals.EnsembleWeightsV{
			AST:          ev.Weights.AST,
			Graph:        ev.Weights.Graph,
			Infra:        ev.Weights.Infra,
			Intelligence: ev.Weights.Intelligence,
			Quality:      ev.Weights.Quality,
			Git:          ev.Weights.Git,
		},
		FinalScore:        ev.FinalScore,
		Confidence:        ev.Confidence,
		ScoreLabel:        ev.ScoreLabel,
		ScoreBand:         ev.ScoreBand,
		TotalSkills:       ev.TotalSkills,
		HighConfSkills:    ev.HighConfSkills,
		ResumeReadySkills: ev.ResumeReadySkills,
		TopFactors:        ev.TopFactors,
		RiskFactors:       ev.RiskFactors,
	}

	return result
}
