package matching

import (
	"fmt"
	"sort"
	"strings"

	"github.com/verifydev/project-analyzer/pkg/dimensions"
	"github.com/verifydev/project-analyzer/pkg/verdict"
)

// CandidateProfile represents a candidate's analyzed profile
type CandidateProfile struct {
	ID           string                      `json:"id"`
	Matrix       *dimensions.DimensionMatrix `json:"matrix"`
	Verdict      *verdict.Verdict            `json:"verdict"`
	Skills       []CandidateSkill            `json:"skills"`
	TrustSignals *TrustSignals               `json:"trustSignals"`
}

// CandidateSkill represents a skill the candidate has
type CandidateSkill struct {
	Name        string  `json:"name"`
	Proficiency string  `json:"proficiency"` // BASIC, INTERMEDIATE, ADVANCED, EXPERT
	Confidence  float64 `json:"confidence"`  // 0-1
	IsVerified  bool    `json:"isVerified"`
	Source      string  `json:"source"` // github, resume, etc.
}

// TrustSignals for Phase 4 integration
type TrustSignals struct {
	EffortScore         float64 `json:"effortScore"`
	AuthenticityScore   float64 `json:"authenticityScore"`
	ConsistencyScore    float64 `json:"consistencyScore"`
	LearningProjectFlag bool    `json:"learningProjectFlag"`
}

// Matcher performs candidate-job matching
type Matcher struct {
	Candidate *CandidateProfile
	Job       *JobRequirement
}

// NewMatcher creates a new matcher
func NewMatcher(candidate *CandidateProfile, job *JobRequirement) *Matcher {
	return &Matcher{
		Candidate: candidate,
		Job:       job,
	}
}

// Match performs full matching analysis
func (m *Matcher) Match() *MatchResult {
	result := &MatchResult{
		CandidateID:    m.Candidate.ID,
		JobID:          m.Job.ID,
		Strengths:      []string{},
		Concerns:       []string{},
		InterviewFocus: []string{},
	}

	// Match dimensions
	result.DimensionMatch = m.matchDimensions()

	// Match skills
	result.SkillMatch = m.matchSkills()

	// Match experience level
	result.LevelMatch = m.matchLevel()

	// Calculate overall score
	result.MatchScore = m.calculateOverallScore(result)
	result.OverallFit = categorizeFit(result.MatchScore)
	result.Confidence = m.calculateConfidence(result)

	// Generate guidance
	result.Strengths = m.generateStrengths(result)
	result.Concerns = m.generateConcerns(result)
	result.InterviewFocus = m.generateInterviewFocus(result)
	result.Recommendation = m.generateRecommendation(result)

	return result
}

// matchDimensions compares candidate dimensions to requirements
func (m *Matcher) matchDimensions() DimensionMatchResult {
	result := DimensionMatchResult{
		ByDimension:     make(map[string]DimensionFit),
		MissingRequired: []string{},
	}

	dims := []struct {
		name  string
		score float64
		req   DimensionReq
	}{
		{"fundamentals", m.Candidate.Matrix.Fundamentals.Score, m.Job.Dimensions.Fundamentals},
		{"engineeringDepth", m.Candidate.Matrix.EngineeringDepth.Score, m.Job.Dimensions.EngineeringDepth},
		{"productionReadiness", m.Candidate.Matrix.ProductionReadiness.Score, m.Job.Dimensions.ProductionReadiness},
		{"testingMaturity", m.Candidate.Matrix.TestingMaturity.Score, m.Job.Dimensions.TestingMaturity},
		{"architecture", m.Candidate.Matrix.Architecture.Score, m.Job.Dimensions.Architecture},
		{"infraDevOps", m.Candidate.Matrix.InfraDevOps.Score, m.Job.Dimensions.InfraDevOps},
	}

	totalWeight := 0.0
	weightedScore := 0.0

	for _, d := range dims {
		fit := DimensionFit{
			CandidateScore: d.score,
			RequiredMin:    d.req.MinScore,
			IdealScore:     d.req.IdealScore,
		}

		// Determine status and calculate fit score
		if d.score >= d.req.IdealScore {
			fit.Status = "EXCEEDS"
			fit.FitScore = 100
			fit.Gap = d.score - d.req.IdealScore
		} else if d.score >= d.req.MinScore {
			fit.Status = "MEETS"
			// Score between 70-99 based on position between min and ideal
			range_ := d.req.IdealScore - d.req.MinScore
			if range_ > 0 {
				position := (d.score - d.req.MinScore) / range_
				fit.FitScore = 70 + position*29
			} else {
				fit.FitScore = 85
			}
			fit.Gap = d.score - d.req.IdealScore
		} else if d.score >= d.req.MinScore*0.7 {
			fit.Status = "BELOW"
			// Score 40-69 based on how close to minimum
			if d.req.MinScore > 0 {
				position := d.score / d.req.MinScore
				fit.FitScore = position * 69
			} else {
				fit.FitScore = 50
			}
			fit.Gap = d.score - d.req.MinScore

			if d.req.Required {
				result.MissingRequired = append(result.MissingRequired, d.name)
			}
		} else {
			fit.Status = "MISSING"
			fit.FitScore = maxFloat(0, (d.score/d.req.MinScore)*40)
			fit.Gap = d.score - d.req.MinScore

			if d.req.Required {
				result.MissingRequired = append(result.MissingRequired, d.name)
			}
		}

		result.ByDimension[d.name] = fit
		weightedScore += fit.FitScore * d.req.Weight
		totalWeight += d.req.Weight
	}

	if totalWeight > 0 {
		result.OverallScore = weightedScore / totalWeight
	}

	return result
}

// matchSkills compares candidate skills to requirements
func (m *Matcher) matchSkills() SkillMatchResult {
	result := SkillMatchResult{
		MustHaveTotal:   len(m.Job.MustHave),
		NiceToHaveTotal: len(m.Job.NiceToHave),
		MissingMustHave: []string{},
		BonusSkills:     []string{},
	}

	// Create skill lookup
	candidateSkills := make(map[string]CandidateSkill)
	for _, skill := range m.Candidate.Skills {
		candidateSkills[normalizeSkillName(skill.Name)] = skill
	}

	// Check must-haves
	for _, req := range m.Job.MustHave {
		normalizedReq := normalizeSkillName(req.Skill)
		if candidateSkill, found := candidateSkills[normalizedReq]; found {
			if proficiencyMeets(candidateSkill.Proficiency, req.MinProficiency) {
				result.MustHaveMatched++
			} else {
				result.MissingMustHave = append(result.MissingMustHave,
					fmt.Sprintf("%s (have %s, need %s)", req.Skill, candidateSkill.Proficiency, req.MinProficiency))
			}
		} else {
			result.MissingMustHave = append(result.MissingMustHave, req.Skill)
		}
	}

	// Check nice-to-haves
	for _, req := range m.Job.NiceToHave {
		normalizedReq := normalizeSkillName(req.Skill)
		if candidateSkill, found := candidateSkills[normalizedReq]; found {
			if proficiencyMeets(candidateSkill.Proficiency, req.MinProficiency) {
				result.NiceToHaveMatched++
			}
		}
	}

	// Find bonus skills (candidate has but not in requirements)
	requiredSkills := make(map[string]bool)
	for _, req := range m.Job.MustHave {
		requiredSkills[normalizeSkillName(req.Skill)] = true
	}
	for _, req := range m.Job.NiceToHave {
		requiredSkills[normalizeSkillName(req.Skill)] = true
	}

	for _, skill := range m.Candidate.Skills {
		normalized := normalizeSkillName(skill.Name)
		if !requiredSkills[normalized] && skill.IsVerified {
			result.BonusSkills = append(result.BonusSkills, skill.Name)
		}
	}

	// Calculate scores
	if result.MustHaveTotal > 0 {
		result.MustHaveScore = float64(result.MustHaveMatched) / float64(result.MustHaveTotal) * 100
	}

	return result
}

// matchLevel compares experience levels
func (m *Matcher) matchLevel() LevelMatchResult {
	result := LevelMatchResult{
		CandidateLevel: string(m.Candidate.Verdict.Experience.Level),
		RequiredMin:    m.Job.Level.Minimum,
		IdealLevel:     m.Job.Level.Ideal,
	}

	candidateLevelNum := levelToNumber(result.CandidateLevel)
	requiredMinNum := levelToNumber(result.RequiredMin)
	idealLevelNum := levelToNumber(result.IdealLevel)

	result.LevelGap = candidateLevelNum - requiredMinNum

	if candidateLevelNum >= idealLevelNum {
		result.Status = "EXCEEDS"
	} else if candidateLevelNum >= requiredMinNum {
		result.Status = "MEETS"
	} else if m.Job.Level.Flexible && candidateLevelNum >= requiredMinNum-1 {
		result.Status = "BELOW"
	} else {
		result.Status = "UNDER_QUALIFIED"
	}

	return result
}

// calculateOverallScore computes weighted match score
func (m *Matcher) calculateOverallScore(result *MatchResult) float64 {
	// Weights for different components
	dimensionWeight := 0.50
	skillWeight := 0.35
	levelWeight := 0.15

	dimensionScore := result.DimensionMatch.OverallScore
	skillScore := result.SkillMatch.MustHaveScore

	levelScore := 0.0
	switch result.LevelMatch.Status {
	case "EXCEEDS":
		levelScore = 100
	case "MEETS":
		levelScore = 85
	case "BELOW":
		levelScore = 60
	default:
		levelScore = 30
	}

	// Penalty for missing required dimensions
	missingPenalty := float64(len(result.DimensionMatch.MissingRequired)) * 15

	finalScore := dimensionScore*dimensionWeight +
		skillScore*skillWeight +
		levelScore*levelWeight -
		missingPenalty

	return maxFloat(0, minFloat(100, finalScore))
}

// calculateConfidence determines how confident we are in the match
func (m *Matcher) calculateConfidence(result *MatchResult) float64 {
	confidence := 0.5 // Base confidence

	// More verified skills = higher confidence
	verifiedCount := 0
	for _, skill := range m.Candidate.Skills {
		if skill.IsVerified {
			verifiedCount++
		}
	}
	if verifiedCount > 5 {
		confidence += 0.2
	} else if verifiedCount > 2 {
		confidence += 0.1
	}

	// High dimension confidence = higher match confidence
	avgDimConfidence := (m.Candidate.Matrix.Fundamentals.Confidence +
		m.Candidate.Matrix.EngineeringDepth.Confidence) / 2
	confidence += avgDimConfidence * 0.2

	// Fewer missing items = higher confidence
	if len(result.SkillMatch.MissingMustHave) == 0 {
		confidence += 0.1
	}

	return minFloat(1.0, confidence)
}

// generateStrengths creates list of candidate strengths for this role
func (m *Matcher) generateStrengths(result *MatchResult) []string {
	strengths := []string{}

	// Check for exceeding dimensions
	for name, fit := range result.DimensionMatch.ByDimension {
		if fit.Status == "EXCEEDS" {
			strengths = append(strengths, fmt.Sprintf("Exceeds %s requirements (%.0f vs %.0f needed)",
				name, fit.CandidateScore, fit.IdealScore))
		}
	}

	// Check skill matches
	if result.SkillMatch.MustHaveScore >= 100 {
		strengths = append(strengths, "Has all required skills")
	}
	if result.SkillMatch.NiceToHaveMatched > 0 {
		strengths = append(strengths, fmt.Sprintf("Has %d bonus skills",
			result.SkillMatch.NiceToHaveMatched))
	}

	// Level match
	if result.LevelMatch.Status == "EXCEEDS" {
		strengths = append(strengths, "More experienced than required")
	}

	return strengths
}

// generateConcerns creates list of concerns for recruiter
func (m *Matcher) generateConcerns(result *MatchResult) []string {
	concerns := []string{}

	// Missing required dimensions
	for _, dim := range result.DimensionMatch.MissingRequired {
		concerns = append(concerns, fmt.Sprintf("Below minimum in %s", dim))
	}

	// Missing skills
	if len(result.SkillMatch.MissingMustHave) > 0 {
		concerns = append(concerns, fmt.Sprintf("Missing %d required skills: %v",
			len(result.SkillMatch.MissingMustHave), result.SkillMatch.MissingMustHave))
	}

	// Level concerns
	if result.LevelMatch.Status == "UNDER_QUALIFIED" {
		concerns = append(concerns, "Experience level below requirement")
	}

	return concerns
}

// generateInterviewFocus suggests interview topics
func (m *Matcher) generateInterviewFocus(result *MatchResult) []string {
	focus := []string{}

	// Below-minimum dimensions need verification
	for name, fit := range result.DimensionMatch.ByDimension {
		if fit.Status == "BELOW" || fit.Status == "MISSING" {
			focus = append(focus, fmt.Sprintf("Deep dive on %s", name))
		}
	}

	// Missing skills need exploration
	for _, skill := range result.SkillMatch.MissingMustHave {
		focus = append(focus, fmt.Sprintf("Assess %s knowledge", skill))
	}

	// If level is borderline, assess growth potential
	if result.LevelMatch.Status == "BELOW" {
		focus = append(focus, "Evaluate growth trajectory and learning ability")
	}

	return focus
}

// generateRecommendation creates final recommendation
func (m *Matcher) generateRecommendation(result *MatchResult) string {
	switch result.OverallFit {
	case FitExcellent:
		return "Highly recommended - strong match across all dimensions. Proceed to technical interview."
	case FitGood:
		return "Recommended - solid match with minor gaps. Standard interview process."
	case FitPotential:
		return "Consider with caveats - shows potential but has gaps. Assess learning ability."
	case FitStretch:
		return "Risky hire - significant gaps exist. Only consider if willing to invest in development."
	default:
		return "Not recommended - fundamental mismatch with role requirements."
	}
}

// RankCandidates sorts candidates by match score for a job
func RankCandidates(candidates []*CandidateProfile, job *JobRequirement) []*MatchResult {
	results := make([]*MatchResult, len(candidates))

	for i, candidate := range candidates {
		matcher := NewMatcher(candidate, job)
		results[i] = matcher.Match()
	}

	// Sort by match score descending
	sort.Slice(results, func(i, j int) bool {
		return results[i].MatchScore > results[j].MatchScore
	})

	return results
}

// Helper functions

func categorizeFit(score float64) FitCategory {
	switch {
	case score >= 85:
		return FitExcellent
	case score >= 70:
		return FitGood
	case score >= 55:
		return FitPotential
	case score >= 40:
		return FitStretch
	default:
		return FitMismatch
	}
}

func normalizeSkillName(name string) string {
	// Normalize: lowercase, trim spaces, replace special chars for consistent matching
	normalized := strings.ToLower(strings.TrimSpace(name))
	normalized = strings.ReplaceAll(normalized, " ", "-")
	normalized = strings.ReplaceAll(normalized, "_", "-")
	normalized = strings.ReplaceAll(normalized, ".", "")
	return normalized
}

func proficiencyMeets(have, need string) bool {
	levels := map[string]int{
		"BASIC":        1,
		"INTERMEDIATE": 2,
		"ADVANCED":     3,
		"EXPERT":       4,
	}
	return levels[have] >= levels[need]
}

func levelToNumber(level string) int {
	levels := map[string]int{
		"FRESH_GRAD": 1,
		"JUNIOR":     2,
		"MID_LEVEL":  3,
		"SENIOR":     4,
		"STAFF":      5,
		"PRINCIPAL":  6,
	}
	if n, ok := levels[level]; ok {
		return n
	}
	return 0
}

func parseConfidenceLevel(level string) float64 {
	switch level {
	case "HIGH":
		return 1.0
	case "MEDIUM":
		return 0.7
	case "LOW":
		return 0.4
	default:
		return 0.2
	}
}

func maxFloat(a, b float64) float64 {
	if a > b {
		return a
	}
	return b
}

func minFloat(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}
