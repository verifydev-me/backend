package intelligence

import (
	"math"
	"strings"
)

// ============================================
// CONFIDENCE CALIBRATION SYSTEM
// Prevents overconfidence on small/toy projects
// ============================================

// CalibrationFactors holds the individual factors that affect confidence
type CalibrationFactors struct {
	SizeFactor      float64 `json:"sizeFactor"`      // Based on file count
	DiversityFactor float64 `json:"diversityFactor"` // Based on unique signal count
	IntentFactor    float64 `json:"intentFactor"`    // Based on project intent
}

// CalibratedConfidence represents a properly calibrated confidence score
type CalibratedConfidence struct {
	RawScore           float64            `json:"rawScore"`
	CalibratedScore    float64            `json:"calibratedScore"`
	ConfidenceRange    [2]float64         `json:"confidenceRange"` // [min, max]
	Interpretation     ConfidenceLevel    `json:"interpretation"`
	CalibrationFactors CalibrationFactors `json:"calibrationFactors"`
	Reasoning          string             `json:"reasoning,omitempty"`
}

// ConfidenceLevel is the human-readable interpretation
type ConfidenceLevel string

const (
	ConfidenceVeryHigh ConfidenceLevel = "VERY_HIGH" // 85-100
	ConfidenceHigh     ConfidenceLevel = "HIGH"      // 70-84
	ConfidenceModerate ConfidenceLevel = "MODERATE"  // 50-69
	ConfidenceLow      ConfidenceLevel = "LOW"       // 30-49
	ConfidenceVeryLow  ConfidenceLevel = "VERY_LOW"  // 0-29
)

// CalibrationConfig holds tunable parameters
type CalibrationConfig struct {
	// Size calibration
	MinFilesForFullConfidence int     // Files needed for factor=1.0 (default: 50)
	MinSizeFactor             float64 // Floor for size factor (default: 0.4)

	// Diversity calibration
	MinSignalsForFullConfidence int     // Unique signals for factor=1.0 (default: 15)
	MinDiversityFactor          float64 // Floor for diversity factor (default: 0.6)

	// Intent calibration
	LearningPenalty float64 // Penalty for learning projects (default: 0.70)
	HobbyPenalty    float64 // Penalty for hobby projects (default: 0.85)
}

// DefaultCalibrationConfig returns sensible defaults
func DefaultCalibrationConfig() CalibrationConfig {
	return CalibrationConfig{
		MinFilesForFullConfidence:   5,    // Relaxed from 10 to 5 - small projects OK
		MinSizeFactor:               0.90, // Relaxed from 0.80 to 0.90 - higher floor
		MinSignalsForFullConfidence: 5,    // Relaxed from 8 to 5 - fewer signals needed
		MinDiversityFactor:          0.90, // Relaxed from 0.80 to 0.90 - higher floor
		LearningPenalty:             0.95, // Increased from 0.90 - minimal penalty
		HobbyPenalty:                0.98, // Increased from 0.95 - almost no penalty
	}
}

// ConfidenceCalibrator calibrates raw confidence scores
type ConfidenceCalibrator struct {
	config CalibrationConfig
}

// NewConfidenceCalibrator creates a new calibrator with default config
func NewConfidenceCalibrator() *ConfidenceCalibrator {
	return &ConfidenceCalibrator{
		config: DefaultCalibrationConfig(),
	}
}

// NewConfidenceCalibratorWithConfig creates a calibrator with custom config
func NewConfidenceCalibratorWithConfig(config CalibrationConfig) *ConfidenceCalibrator {
	return &ConfidenceCalibrator{
		config: config,
	}
}

// Calibrate adjusts raw confidence based on project characteristics
func (c *ConfidenceCalibrator) Calibrate(
	rawScore float64,
	fileCount int,
	signalCount int,
	intent ProjectIntent,
) CalibratedConfidence {

	// Calculate individual factors
	sizeFactor := c.calculateSizeFactor(fileCount)
	diversityFactor := c.calculateDiversityFactor(signalCount)
	intentFactor := c.calculateIntentFactor(intent)

	// Apply calibration
	calibrated := rawScore * sizeFactor * diversityFactor * intentFactor

	// Calculate uncertainty for range
	uncertainty := c.calculateUncertainty(sizeFactor, diversityFactor, signalCount)

	// Calculate confidence range (±uncertainty)
	minConf := math.Max(0, calibrated-uncertainty)
	maxConf := math.Min(100, calibrated+uncertainty)

	// Determine interpretation
	interpretation := c.interpretConfidence(calibrated)

	// Build reasoning
	reasoning := c.buildReasoning(sizeFactor, diversityFactor, intentFactor, intent)

	return CalibratedConfidence{
		RawScore:        rawScore,
		CalibratedScore: calibrated,
		ConfidenceRange: [2]float64{minConf, maxConf},
		Interpretation:  interpretation,
		CalibrationFactors: CalibrationFactors{
			SizeFactor:      sizeFactor,
			DiversityFactor: diversityFactor,
			IntentFactor:    intentFactor,
		},
		Reasoning: reasoning,
	}
}

// calculateSizeFactor computes factor based on project size
// Fix #10: Use smarter size calculation that doesn't penalize clean, focused code
// Now considers both file count AND a complexity bonus for well-structured small projects
func (c *ConfidenceCalibrator) calculateSizeFactor(fileCount int) float64 {
	if fileCount <= 0 {
		return c.config.MinSizeFactor
	}

	// Base factor from file count (less aggressive than before)
	// Old: 50 files for full confidence (penalized small projects)
	// New: 25 files for good confidence, with higher floor
	baseFactor := float64(fileCount) / float64(c.config.MinFilesForFullConfidence)

	// Fix #10: Boost for quality indicators in small projects
	// Small projects (< 40 files) get bonus if they have good structure
	// This prevents well-written microservices from being penalized
	qualityBoost := 0.0
	if fileCount >= 10 && fileCount < 40 {
		qualityBoost = 0.25 // Increased from 0.15 - small but meaningful projects
	} else if fileCount >= 5 && fileCount < 10 {
		qualityBoost = 0.20 // Increased from 0.10 - very small focused utilities
	}

	factor := baseFactor + qualityBoost

	// Apply floor and ceiling
	// Fix #10: Raised floor from 0.55 to 0.85 - small projects with quality should not be penalized
	minFactor := math.Max(c.config.MinSizeFactor, 0.85)
	factor = math.Max(minFactor, factor)
	factor = math.Min(1.0, factor)

	return factor
}

// calculateDiversityFactor computes factor based on signal diversity
func (c *ConfidenceCalibrator) calculateDiversityFactor(signalCount int) float64 {
	if signalCount <= 0 {
		return c.config.MinDiversityFactor
	}

	// Linear scaling up to the minimum signals threshold
	factor := float64(signalCount) / float64(c.config.MinSignalsForFullConfidence)

	// Apply floor and ceiling
	factor = math.Max(c.config.MinDiversityFactor, factor)
	factor = math.Min(1.0, factor)

	return factor
}

// calculateIntentFactor computes factor based on project intent
func (c *ConfidenceCalibrator) calculateIntentFactor(intent ProjectIntent) float64 {
	switch intent {
	case IntentLearning:
		return c.config.LearningPenalty
	case IntentHobby:
		return c.config.HobbyPenalty
	case IntentProduction:
		return 1.0
	case IntentEnterprise:
		return 1.0 // Could add bonus here
	default:
		return 0.90 // Unknown intent = slight penalty
	}
}

// calculateUncertainty determines confidence range width
func (c *ConfidenceCalibrator) calculateUncertainty(sizeFactor, diversityFactor float64, signalCount int) float64 {
	// Low diversity = higher uncertainty
	baseUncertainty := (1.0 - diversityFactor) * 15 // Max 15 points uncertainty

	// Few signals = even more uncertainty
	if signalCount < 5 {
		baseUncertainty += 10
	} else if signalCount < 10 {
		baseUncertainty += 5
	}

	// Small projects = more uncertainty
	if sizeFactor < 0.6 {
		baseUncertainty += 8
	}

	// Cap uncertainty at reasonable levels
	return math.Min(baseUncertainty, 25)
}

// interpretConfidence maps score to human-readable level
func (c *ConfidenceCalibrator) interpretConfidence(score float64) ConfidenceLevel {
	switch {
	case score >= 85:
		return ConfidenceVeryHigh
	case score >= 70:
		return ConfidenceHigh
	case score >= 50:
		return ConfidenceModerate
	case score >= 30:
		return ConfidenceLow
	default:
		return ConfidenceVeryLow
	}
}

// buildReasoning creates human-readable explanation
func (c *ConfidenceCalibrator) buildReasoning(size, diversity, intent float64, projectIntent ProjectIntent) string {
	reasons := make([]string, 0, 3)

	if size < 0.7 {
		reasons = append(reasons, "small project size limits confidence ceiling")
	}

	if diversity < 0.8 {
		reasons = append(reasons, "limited signal diversity")
	}

	if intent < 1.0 {
		switch projectIntent {
		case IntentLearning:
			reasons = append(reasons, "learning project intent detected")
		case IntentHobby:
			reasons = append(reasons, "hobby project intent detected")
		}
	}

	if len(reasons) == 0 {
		return "strong project characteristics support confidence"
	}

	result := "Calibration applied: "
	for i, r := range reasons {
		if i > 0 {
			result += "; "
		}
		result += r
	}
	return result
}

// ============================================
// BATCH CALIBRATION (for skill lists)
// ============================================

// CalculateSecurityHealthMultiplier computes security-based confidence adjustment
func (c *ConfidenceCalibrator) CalculateSecurityHealthMultiplier(
	securityReport *SecurityReport,
) float64 {
	if securityReport == nil {
		return 1.0 // No penalty if no security report
	}

	// Critical vulnerabilities → max 70% cap (was 60%)
	if securityReport.CriticalIssues > 1 {
		return 0.70 // Multiple criticals → 70% cap
	} else if securityReport.CriticalIssues > 0 {
		return 0.80 // Single critical → 80% cap
	}

	// High severity vulnerabilities → 90% cap (was 80%)
	if securityReport.HighIssues > 2 {
		return 0.90
	}

	// Medium/Low → no penalty
	return 1.0
}

// CalibrateSkills applies calibration to all skills in a list
// Now includes usage verification and security health
func (c *ConfidenceCalibrator) CalibrateSkills(
	skills []ExtractedSkill,
	fileCount int,
	signalCount int,
	intent ProjectIntent,
	usageVerdicts map[string]*UsageVerdict,
	securityReport *SecurityReport,
) []CalibratedSkill {
	result := make([]CalibratedSkill, len(skills))

	for i, skill := range skills {
		// Start with base calibration
		calibrated := c.Calibrate(float64(skill.Confidence), fileCount, signalCount, intent)

		// NEW: Apply usage strength multiplier
		usageMultiplier := 1.0
		if verdict, found := usageVerdicts[skill.Name]; found {
			if !verdict.UsageVerified {
				// Dependency detected but usage not verified → relax penalty (0.80 -> 0.90)
				// 90% allows "Very High Confidence" if signals are strong
				usageMultiplier = 0.90
				calibrated.Reasoning = "Dependency detected (usage verification pending)"
			} else {
				// Usage verified → force high multiplier
				// If usage is verified, we shouldn't punish below 95%
				usageMultiplier = math.Max(verdict.UsageStrength, 0.95)
				if usageMultiplier < 0.8 {
					calibrated.Reasoning = "Weak usage patterns detected"
				}
			}
			calibrated.CalibratedScore = calibrated.CalibratedScore * usageMultiplier
		}

		// NEW: Apply security health multiplier
		securityMultiplier := c.CalculateSecurityHealthMultiplier(securityReport)
		if securityMultiplier < 1.0 {
			calibrated.CalibratedScore = calibrated.CalibratedScore * securityMultiplier
			if securityMultiplier <= 0.60 {
				calibrated.Reasoning += "; Critical security issues detected"
			}
		}

		// PROTECTION FOR PROVEN SKILLS (retained from V2)
		// If we have explicit evidence (Package + Config), do not let calibration
		// destroy the score just because the project is small/learning.
		strongEvidence := false
		hasPackage := false
		hasConfig := false

		// Analyze evidence strength
		for _, ev := range skill.Evidence {
			evLower := strings.ToLower(ev)
			if strings.Contains(evLower, "package.json") || strings.Contains(evLower, "go.mod") || strings.Contains(evLower, "pom.xml") || strings.Contains(evLower, "requirements.txt") {
				hasPackage = true
			}
			if strings.Contains(evLower, "config") || strings.Contains(evLower, "schema") || strings.Contains(evLower, "docker") || strings.Contains(evLower, ".yml") {
				hasConfig = true
			}
		}

		if (hasPackage && hasConfig) || len(skill.Evidence) >= 2 {
			strongEvidence = true
		}

		// ONLY apply evidence boost if usage was verified
		// This prevents boosting dependency-only skills
		if strongEvidence {
			if verdict, found := usageVerdicts[skill.Name]; !found || verdict.UsageVerified {
				// Restore high confidence if calibration penalized it too much
				originalScore := float64(skill.Confidence)
				if originalScore >= 70 {
					// Allow very small penalty (max 5%) instead of 10%
					floor := originalScore * 0.95
					if calibrated.CalibratedScore < floor {
						calibrated.CalibratedScore = floor
						calibrated.Interpretation = c.interpretConfidence(floor)
						calibrated.Reasoning = "Confirmed by strong evidence and verified usage"
					}
				}
			}
		}

		result[i] = CalibratedSkill{
			Skill:       skill,
			Calibration: calibrated,
		}
	}

	return result
}

// CalibratedSkill pairs a skill with its calibration data
type CalibratedSkill struct {
	Skill       ExtractedSkill       `json:"skill"`
	Calibration CalibratedConfidence `json:"calibration"`
}

// ============================================
// OVERALL SCORE CALIBRATION
// ============================================

// CalibrateOverallScore calibrates the final overall score
func (c *ConfidenceCalibrator) CalibrateOverallScore(
	rawScore float64,
	fileCount int,
	signalCount int,
	intent ProjectIntent,
	hasTests bool,
	hasDocumentation bool,
) CalibratedConfidence {

	// Base calibration
	calibrated := c.Calibrate(rawScore, fileCount, signalCount, intent)

	// Additional adjustments for overall score
	adjustedScore := calibrated.CalibratedScore

	// Penalize lack of tests in non-trivial projects
	if !hasTests && fileCount > 20 {
		adjustedScore *= 0.95 // -5% penalty (was -10%)
	}

	// Small bonus for documentation
	if hasDocumentation && fileCount > 5 {
		adjustedScore *= 1.10 // +10% bonus (was +5%)
		adjustedScore = math.Min(100, adjustedScore)
	}

	calibrated.CalibratedScore = adjustedScore
	calibrated.Interpretation = c.interpretConfidence(adjustedScore)

	// Recalculate range
	uncertainty := (calibrated.ConfidenceRange[1] - calibrated.ConfidenceRange[0]) / 2
	calibrated.ConfidenceRange[0] = math.Max(0, adjustedScore-uncertainty)
	calibrated.ConfidenceRange[1] = math.Min(100, adjustedScore+uncertainty)

	return calibrated
}
