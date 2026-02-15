package analyzer

import (
	"encoding/json"

	"github.com/rs/zerolog/log"
	"github.com/verifydev/project-analyzer/pkg/signals"
)

// ============================================
// COMPACT OUTPUT BUILDER
// Transforms full ProjectSignals → CompactOutput
// for token-efficient AI consumption (~2-4KB)
// ============================================

// CompactForAI builds a minimal payload from the full analysis result.
// Designed for Gemini/GPT consumption — every byte counts for token cost.
func CompactForAI(full *signals.ProjectSignals) *signals.CompactOutput {
	out := &signals.CompactOutput{
		ProjectID: full.ProjectID,
		UserID:    full.UserID,
	}

	// --- Project metadata ---
	scale := "Small"
	if full.TotalLines >= 10000 {
		scale = "Enterprise"
	} else if full.TotalLines >= 3000 {
		scale = "Large"
	} else if full.TotalLines >= 500 {
		scale = "Medium"
	}

	langs := make([]signals.CompactLang, 0, len(full.Languages))
	for _, l := range full.Languages {
		langs = append(langs, signals.CompactLang{
			Name:  l.Name,
			Lines: l.Lines,
			Pct:   int(l.Percentage),
		})
	}

	out.Project = signals.CompactProject{
		Type:    string(full.ProjectType),
		Files:   full.TotalFiles,
		Lines:   full.TotalLines,
		Primary: full.PrimaryLanguage,
		Langs:   langs,
		Scale:   scale,
	}

	// --- Skills (from IndustryAnalysis.VerifiedSkills) ---
	if full.IndustryAnalysis != nil {
		skills := make([]signals.CompactSkill, 0, len(full.IndustryAnalysis.VerifiedSkills))
		for _, vs := range full.IndustryAnalysis.VerifiedSkills {
			cs := signals.CompactSkill{
				Name:       vs.Name,
				Category:   string(vs.Category),
				Confidence: round2(vs.Confidence),
				Resume:     vs.ResumeReady,
				Verified:   vs.UsageVerified,
			}

			// Evidence: prefer RichEvidence.Summary, fallback to Evidence
			if vs.RichEvidence != nil {
				cs.Evidence = truncSlice(vs.RichEvidence.Summary, 3)
				if vs.RichEvidence.Depth != nil {
					cs.Depth = vs.RichEvidence.Depth.Level
					cs.Files = vs.RichEvidence.Depth.FileSpread
					cs.Patterns = vs.RichEvidence.Depth.PatternsUsed
				}
			} else {
				cs.Evidence = truncSlice(vs.Evidence, 3)
			}

			if cs.Depth == "" {
				cs.Depth = string(vs.Level)
			}

			skills = append(skills, cs)
		}
		out.Skills = skills
	}

	// --- Architecture ---
	if full.IndustryAnalysis != nil {
		out.Arch = signals.CompactArch{
			Type:     string(full.IndustryAnalysis.Architecture.Type),
			Patterns: full.IndustryAnalysis.Architecture.Patterns,
			Services: full.IndustryAnalysis.Architecture.ServiceCount,
		}
	}

	// --- Scores ---
	out.Scores = signals.CompactScores{
		Bayesian: 0,
	}

	// Dimensional scores from IntelligenceVerdict
	if full.IntelligenceVerdict != nil && full.IntelligenceVerdict.Dimensions != nil {
		dims := make(map[string]float64)
		d := full.IntelligenceVerdict.Dimensions
		if d.Fundamentals != nil {
			dims["fundamentals"] = round2(d.Fundamentals.Score)
		}
		if d.EngineeringDepth != nil {
			dims["engineeringDepth"] = round2(d.EngineeringDepth.Score)
		}
		if d.ProductionReady != nil {
			dims["productionReady"] = round2(d.ProductionReady.Score)
		}
		if d.TestingMaturity != nil {
			dims["testing"] = round2(d.TestingMaturity.Score)
		}
		if d.Architecture != nil {
			dims["architecture"] = round2(d.Architecture.Score)
		}
		if d.InfraDevOps != nil {
			dims["infraDevOps"] = round2(d.InfraDevOps.Score)
		}
		out.Scores.Dimensions = dims
	}

	// Trust from IntelligenceVerdict
	if full.IntelligenceVerdict != nil && full.IntelligenceVerdict.TrustAnalysis != nil {
		out.Scores.Trust = signals.CompactTrust{
			Score: round2(full.IntelligenceVerdict.TrustAnalysis.Score),
			Level: full.IntelligenceVerdict.TrustAnalysis.Level,
		}
	}

	// Bayesian ensemble
	if full.ConfidenceReport != nil {
		out.Scores.Bayesian = round2(full.ConfidenceReport.EnsembleVerdict.FinalScore)
		out.Scores.Quality = full.ConfidenceReport.QualityMetrics.QualityTier
		out.Scores.Overall = round2(full.ConfidenceReport.EnsembleVerdict.FinalScore)
	}

	// Engineering level
	if full.IndustryAnalysis != nil {
		out.Scores.Level = full.IndustryAnalysis.EngineeringLevel
	}

	// --- Stack detection ---
	out.Stack = signals.CompactStack{
		Frameworks: full.Frameworks,
		Databases:  full.Databases,
		DevOps:     full.Tools,
	}

	if full.TechDependencyGraph != nil {
		stacks := make([]string, 0, len(full.TechDependencyGraph.DetectedStacks))
		for _, s := range full.TechDependencyGraph.DetectedStacks {
			stacks = append(stacks, s.Name)
		}
		out.Stack.Detected = stacks
	}

	// --- Key signals ---
	out.Signals = signals.CompactSignals{}

	if full.ConfidenceReport != nil {
		out.Signals.Strengths = truncSlice(full.ConfidenceReport.EnsembleVerdict.TopFactors, 5)
		out.Signals.Risks = truncSlice(full.ConfidenceReport.EnsembleVerdict.RiskFactors, 5)
	}

	if full.IntelligenceVerdict != nil {
		out.Signals.Intent = full.IntelligenceVerdict.ProjectIntent
	}

	// Log compact size
	compactSize := jsonSizeAny(out)
	fullSize := jsonSizeAny(full)
	reduction := float64(fullSize-compactSize) / float64(fullSize) * 100

	log.Info().
		Int("fullBytes", fullSize).
		Int("compactBytes", compactSize).
		Float64("reductionPct", reduction).
		Msg("🤖 Compact AI payload built")

	return out
}

// --- helpers ---

func truncSlice(s []string, max int) []string {
	if len(s) <= max {
		return s
	}
	return s[:max]
}

func round2(f float64) float64 {
	return float64(int(f*100)) / 100
}

func jsonSizeAny(v interface{}) int {
	data, err := json.Marshal(v)
	if err != nil {
		return 0
	}
	return len(data)
}
