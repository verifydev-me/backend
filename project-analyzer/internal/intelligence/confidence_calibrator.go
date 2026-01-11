package intelligence

import (
	"math"
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
		MinFilesForFullConfidence:   50,
		MinSizeFactor:               0.40,
		MinSignalsForFullConfidence: 15,
		MinDiversityFactor:          0.60,
		LearningPenalty:             0.70,
		HobbyPenalty:                0.85,
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
func (c *ConfidenceCalibrator) calculateSizeFactor(fileCount int) float64 {
	if fileCount <= 0 {
		return c.config.MinSizeFactor
	}

	// Linear scaling up to the minimum files threshold
	factor := float64(fileCount) / float64(c.config.MinFilesForFullConfidence)

	// Apply floor and ceiling
	factor = math.Max(c.config.MinSizeFactor, factor)
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

// CalibrateSkills applies calibration to all skills in a list
func (c *ConfidenceCalibrator) CalibrateSkills(
	skills []ExtractedSkill,
	fileCount int,
	signalCount int,
	intent ProjectIntent,
) []CalibratedSkill {
	result := make([]CalibratedSkill, len(skills))

	for i, skill := range skills {
		calibrated := c.Calibrate(float64(skill.Confidence), fileCount, signalCount, intent)
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
	if !hasTests && fileCount > 10 {
		adjustedScore *= 0.90 // -10% penalty
	}

	// Small bonus for documentation
	if hasDocumentation && fileCount > 5 {
		adjustedScore *= 1.05 // +5% bonus, capped at 100
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
