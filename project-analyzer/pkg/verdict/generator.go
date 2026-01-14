package verdict

import (
	"fmt"
	"sort"

	"github.com/verifydev/project-analyzer/pkg/dimensions"
)

// VerdictGenerator creates human-readable verdicts from dimension scores
type VerdictGenerator struct {
	Matrix            *dimensions.DimensionMatrix
	AntiHallucination *AntiHallucinationRules
}

// AntiHallucinationRules prevents false claims
type AntiHallucinationRules struct {
	MinSignalsForClaim          int     // Minimum signals to make a statement
	MinConfidenceForVerb        float64 // Min confidence to use strong verbs
	RequireEvidenceForAll       bool    // Every statement needs evidence
	MaxStrengthsWithoutEvidence int     // Cap on unverified strengths
}

// DefaultAntiHallucinationRules provides conservative defaults
var DefaultAntiHallucinationRules = &AntiHallucinationRules{
	MinSignalsForClaim:          2,
	MinConfidenceForVerb:        0.6,
	RequireEvidenceForAll:       true,
	MaxStrengthsWithoutEvidence: 1,
}

// NewVerdictGenerator creates a generator with anti-hallucination rules
func NewVerdictGenerator(matrix *dimensions.DimensionMatrix) *VerdictGenerator {
	return &VerdictGenerator{
		Matrix:            matrix,
		AntiHallucination: DefaultAntiHallucinationRules,
	}
}

// Generate creates a complete verdict
func (vg *VerdictGenerator) Generate() *Verdict {
	verdict := &Verdict{
		Strengths:       []VerdictStatement{},
		GrowthAreas:     []VerdictStatement{},
		NotablePatterns: []VerdictStatement{},
		Cautions:        []string{},
	}

	// Classify experience level
	verdict.Experience = vg.classifyExperience()

	// Generate strengths
	verdict.Strengths = vg.generateStrengths()

	// Generate growth areas
	verdict.GrowthAreas = vg.generateGrowthAreas()

	// Generate notable patterns
	verdict.NotablePatterns = vg.generateNotablePatterns()

	// Generate summary
	verdict.Summary = vg.generateSummary(verdict)

	// Generate hiring recommendation
	verdict.HiringRecommendation = vg.generateHiringRecommendation(verdict)

	// Generate cautions (things to verify in interview)
	verdict.Cautions = vg.generateCautions()

	return verdict
}

// classifyExperience determines developer experience level
func (vg *VerdictGenerator) classifyExperience() ExperienceClassification {
	result := ExperienceClassification{
		SupportingSignals:    []string{},
		ContradictingSignals: []string{},
	}

	// Calculate fit scores for each level
	levelScores := make(map[ExperienceLevel]float64)

	for level, profile := range ExperienceLevelThresholds {
		score := vg.calculateLevelFit(profile)
		levelScores[level] = score
	}

	// Find best matching level
	var bestLevel ExperienceLevel
	var bestScore float64
	for level, score := range levelScores {
		if score > bestScore {
			bestScore = score
			bestLevel = level
		}
	}

	result.Level = bestLevel
	result.Confidence = bestScore / 100 // Normalize to 0-1
	result.EstimatedYears = YearRanges[bestLevel]

	// Collect supporting signals
	result.SupportingSignals = vg.collectSupportingSignals(bestLevel)
	result.ContradictingSignals = vg.collectContradictingSignals(bestLevel)

	return result
}

func (vg *VerdictGenerator) calculateLevelFit(profile LevelProfile) float64 {
	totalFit := 0.0
	dimensionCount := 6.0

	totalFit += calculateRangeFit(vg.Matrix.Fundamentals.Score,
		profile.MinFundamentals, profile.MaxFundamentals)

	totalFit += calculateRangeFit(vg.Matrix.EngineeringDepth.Score,
		profile.MinEngineeringDepth, profile.MaxEngineeringDepth)

	totalFit += calculateRangeFit(vg.Matrix.ProductionReadiness.Score,
		profile.MinProductionReadiness, profile.MaxProductionReadiness)

	totalFit += calculateRangeFit(vg.Matrix.TestingMaturity.Score,
		profile.MinTestingMaturity, profile.MaxTestingMaturity)

	totalFit += calculateRangeFit(vg.Matrix.Architecture.Score,
		profile.MinArchitecture, profile.MaxArchitecture)

	totalFit += calculateRangeFit(vg.Matrix.InfraDevOps.Score,
		profile.MinInfraDevOps, profile.MaxInfraDevOps)

	return (totalFit / dimensionCount) * 100
}

func calculateRangeFit(value, min, max float64) float64 {
	if value >= min && value <= max {
		rangeCenter := (min + max) / 2
		distanceFromCenter := absFloat(value - rangeCenter)
		rangeHalf := (max - min) / 2
		if rangeHalf == 0 {
			return 1.0
		}
		return 1.0 - (distanceFromCenter / rangeHalf * 0.2)
	}

	if value < min {
		return maxFloat(0, 1.0-(min-value)/30)
	}
	return maxFloat(0, 1.0-(value-max)/30)
}

// generateStrengths creates strength statements with anti-hallucination
func (vg *VerdictGenerator) generateStrengths() []VerdictStatement {
	strengths := []VerdictStatement{}

	dims := []struct {
		score dimensions.DimensionScore
		name  string
		verb  string
	}{
		{vg.Matrix.Fundamentals, "fundamentals", "demonstrates solid"},
		{vg.Matrix.EngineeringDepth, "engineering depth", "shows strong"},
		{vg.Matrix.ProductionReadiness, "production readiness", "exhibits"},
		{vg.Matrix.TestingMaturity, "testing practices", "maintains good"},
		{vg.Matrix.Architecture, "architectural thinking", "displays"},
		{vg.Matrix.InfraDevOps, "DevOps knowledge", "possesses"},
	}

	for _, d := range dims {
		if d.score.Score >= 60 && len(d.score.Signals) >= vg.AntiHallucination.MinSignalsForClaim {
			confidence := "MEDIUM"
			if d.score.Confidence >= 0.8 {
				confidence = "HIGH"
			}

			verb := d.verb
			if d.score.Confidence < 0.7 {
				verb = toneDownVerb(verb)
			}

			statement := VerdictStatement{
				Statement:  fmt.Sprintf("%s %s", verb, d.name),
				Evidence:   d.score.Signals[:minInt(3, len(d.score.Signals))],
				Confidence: confidence,
				IsVerified: d.score.Confidence >= 0.8,
			}
			strengths = append(strengths, statement)
		}
	}

	sort.Slice(strengths, func(i, j int) bool {
		return strengths[i].Confidence > strengths[j].Confidence
	})

	if len(strengths) > 5 {
		strengths = strengths[:5]
	}

	return strengths
}

// generateGrowthAreas creates improvement suggestions
func (vg *VerdictGenerator) generateGrowthAreas() []VerdictStatement {
	growthAreas := []VerdictStatement{}

	dims := []struct {
		score   dimensions.DimensionScore
		name    string
		suggest string
	}{
		{vg.Matrix.Fundamentals, "code fundamentals", "Strengthen basic coding practices"},
		{vg.Matrix.EngineeringDepth, "engineering patterns", "Explore more design patterns"},
		{vg.Matrix.ProductionReadiness, "production readiness", "Add CI/CD and containerization"},
		{vg.Matrix.TestingMaturity, "testing", "Increase test coverage and variety"},
		{vg.Matrix.Architecture, "architecture", "Focus on system design principles"},
		{vg.Matrix.InfraDevOps, "DevOps skills", "Learn infrastructure as code"},
	}

	for _, d := range dims {
		// If score is low, suggest improvement
		if d.score.Score < 40 {
			// Use signals as evidence of what's missing
			evidence := []string{"Score below threshold"}
			if len(d.score.Signals) > 0 {
				evidence = d.score.Signals[:minInt(2, len(d.score.Signals))]
			}

			statement := VerdictStatement{
				Statement:  d.suggest,
				Evidence:   evidence,
				Confidence: "HIGH",
				IsVerified: true,
			}
			growthAreas = append(growthAreas, statement)
		}
	}

	if len(growthAreas) > 3 {
		growthAreas = growthAreas[:3]
	}

	return growthAreas
}

// generateNotablePatterns identifies interesting observations
func (vg *VerdictGenerator) generateNotablePatterns() []VerdictStatement {
	patterns := []VerdictStatement{}

	// Check for imbalances that might indicate specialty
	if vg.Matrix.InfraDevOps.Score > vg.Matrix.Fundamentals.Score+30 {
		patterns = append(patterns, VerdictStatement{
			Statement:  "Shows DevOps specialty - infrastructure skills exceed coding fundamentals",
			Evidence:   vg.Matrix.InfraDevOps.Signals[:minInt(2, len(vg.Matrix.InfraDevOps.Signals))],
			Confidence: "MEDIUM",
			IsVerified: false,
		})
	}

	if vg.Matrix.TestingMaturity.Score > 70 {
		patterns = append(patterns, VerdictStatement{
			Statement:  "Strong quality engineering mindset - exceptional testing practices",
			Evidence:   vg.Matrix.TestingMaturity.Signals[:minInt(2, len(vg.Matrix.TestingMaturity.Signals))],
			Confidence: "HIGH",
			IsVerified: true,
		})
	}

	if vg.Matrix.Architecture.Score > 70 && vg.Matrix.EngineeringDepth.Score > 70 {
		patterns = append(patterns, VerdictStatement{
			Statement: "Systems thinking evident - both depth and breadth in design",
			Evidence: append(vg.Matrix.Architecture.Signals[:minInt(1, len(vg.Matrix.Architecture.Signals))],
				vg.Matrix.EngineeringDepth.Signals[:minInt(1, len(vg.Matrix.EngineeringDepth.Signals))]...),
			Confidence: "HIGH",
			IsVerified: true,
		})
	}

	return patterns
}

// generateSummary creates one-sentence overview
func (vg *VerdictGenerator) generateSummary(v *Verdict) string {
	level := levelToHumanString(v.Experience.Level)
	projectType := vg.Matrix.ProjectType
	if projectType == "" {
		projectType = "general"
	}

	strengthCount := len(v.Strengths)
	gapCount := len(v.GrowthAreas)

	if strengthCount >= 3 && gapCount <= 1 {
		return fmt.Sprintf("A %s developer with strong %s skills showing %d areas of demonstrated competence",
			level, projectType, strengthCount)
	} else if gapCount >= 2 {
		return fmt.Sprintf("A %s developer working in %s with room for growth in %d areas",
			level, projectType, gapCount)
	}

	return fmt.Sprintf("A %s developer with balanced skills in %s development",
		level, projectType)
}

// generateHiringRecommendation creates recruiter-focused guidance
func (vg *VerdictGenerator) generateHiringRecommendation(v *Verdict) string {
	switch v.Experience.Level {
	case ExperienceFreshGrad:
		return "Suitable for entry-level roles with mentorship. Verify fundamentals in interview."
	case ExperienceJunior:
		return "Ready for junior developer roles. Good foundation, needs guidance on complex tasks."
	case ExperienceMidLevel:
		return "Can work independently on features. May need support on architectural decisions."
	case ExperienceSenior:
		return "Can lead small teams and make technical decisions. Verify leadership experience."
	case ExperienceStaff:
		return "Capable of owning significant systems. Look for cross-team collaboration evidence."
	case ExperiencePrincipal:
		return "Strategic technical leader. Verify ability to drive organization-wide initiatives."
	default:
		return "Additional assessment recommended to determine appropriate role fit."
	}
}

// generateCautions identifies things to verify in interview
func (vg *VerdictGenerator) generateCautions() []string {
	cautions := []string{}

	// Low confidence dimensions
	if vg.Matrix.Fundamentals.Confidence < 0.5 {
		cautions = append(cautions, "Verify core coding fundamentals - limited evidence available")
	}

	// High production readiness but low testing
	if vg.Matrix.ProductionReadiness.Score > 60 && vg.Matrix.TestingMaturity.Score < 30 {
		cautions = append(cautions, "Strong DevOps but weak testing - verify quality practices")
	}

	// High architecture but low implementation
	if vg.Matrix.Architecture.Score > 60 && vg.Matrix.EngineeringDepth.Score < 40 {
		cautions = append(cautions, "Knows patterns but limited implementation evidence - verify hands-on skills")
	}

	// Low overall confidence
	avgConfidence := (vg.Matrix.Fundamentals.Confidence +
		vg.Matrix.EngineeringDepth.Confidence +
		vg.Matrix.ProductionReadiness.Confidence +
		vg.Matrix.TestingMaturity.Confidence +
		vg.Matrix.Architecture.Confidence +
		vg.Matrix.InfraDevOps.Confidence) / 6

	if avgConfidence < 0.6 {
		cautions = append(cautions, "Overall analysis confidence is moderate - additional verification recommended")
	}

	if len(cautions) > 4 {
		cautions = cautions[:4]
	}

	return cautions
}

// collectSupportingSignals gathers evidence for the experience level
func (vg *VerdictGenerator) collectSupportingSignals(level ExperienceLevel) []string {
	supporting := []string{}

	profile := ExperienceLevelThresholds[level]

	// Check which dimensions match the profile
	if vg.Matrix.Fundamentals.Score >= profile.MinFundamentals &&
		vg.Matrix.Fundamentals.Score <= profile.MaxFundamentals {
		supporting = append(supporting, "Fundamentals score matches expected range")
	}

	if vg.Matrix.EngineeringDepth.Score >= profile.MinEngineeringDepth &&
		vg.Matrix.EngineeringDepth.Score <= profile.MaxEngineeringDepth {
		supporting = append(supporting, "Engineering depth aligns with level")
	}

	if vg.Matrix.ProductionReadiness.Score >= profile.MinProductionReadiness {
		supporting = append(supporting, "Production readiness meets minimum")
	}

	// Add top signals from each dimension
	for _, sig := range vg.Matrix.Fundamentals.Signals[:minInt(2, len(vg.Matrix.Fundamentals.Signals))] {
		supporting = append(supporting, sig)
	}

	if len(supporting) > 5 {
		supporting = supporting[:5]
	}

	return supporting
}

// collectContradictingSignals gathers evidence against the level
func (vg *VerdictGenerator) collectContradictingSignals(level ExperienceLevel) []string {
	contradicting := []string{}

	profile := ExperienceLevelThresholds[level]

	// Check which dimensions DON'T match
	if vg.Matrix.Fundamentals.Score < profile.MinFundamentals {
		contradicting = append(contradicting, "Fundamentals below expected minimum")
	}
	if vg.Matrix.Fundamentals.Score > profile.MaxFundamentals {
		contradicting = append(contradicting, "Fundamentals exceed expected range (might be higher level)")
	}

	if vg.Matrix.EngineeringDepth.Score < profile.MinEngineeringDepth {
		contradicting = append(contradicting, "Engineering depth below expected")
	}

	if len(contradicting) > 3 {
		contradicting = contradicting[:3]
	}

	return contradicting
}

// Helper functions

func toneDownVerb(verb string) string {
	toned := map[string]string{
		"demonstrates solid": "shows some",
		"shows strong":       "indicates",
		"exhibits":           "shows signs of",
		"maintains good":     "has basic",
		"displays":           "shows potential in",
		"possesses":          "has some",
	}
	if t, ok := toned[verb]; ok {
		return t
	}
	return verb
}

func levelToHumanString(level ExperienceLevel) string {
	switch level {
	case ExperienceFreshGrad:
		return "fresh graduate"
	case ExperienceJunior:
		return "junior"
	case ExperienceMidLevel:
		return "mid-level"
	case ExperienceSenior:
		return "senior"
	case ExperienceStaff:
		return "staff"
	case ExperiencePrincipal:
		return "principal"
	default:
		return "developer"
	}
}

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func maxFloat(a, b float64) float64 {
	if a > b {
		return a
	}
	return b
}

func absFloat(a float64) float64 {
	if a < 0 {
		return -a
	}
	return a
}
