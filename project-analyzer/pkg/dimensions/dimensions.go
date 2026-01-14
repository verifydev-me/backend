package dimensions

import "time"

// ============================================
// MULTI-DIMENSIONAL EVALUATION SYSTEM
// Phase 1: 6-Dimension Scoring Model
// ============================================

// DimensionScore represents a single dimension's evaluation
type DimensionScore struct {
	Score      float64             `json:"score"`      // 0-100
	Confidence float64             `json:"confidence"` // 0-1 (how sure we are)
	Signals    []string            `json:"signals"`    // Evidence found
	Band       ConfidenceBand      `json:"band"`       // Score range
	SubScores  map[string]SubScore `json:"subScores"`  // Detailed breakdown
}

// SubScore provides granular scoring within a dimension
type SubScore struct {
	Score      float64  `json:"score"`
	Weight     float64  `json:"weight"`
	Evidence   []string `json:"evidence"`
	Confidence float64  `json:"confidence"`
}

// ConfidenceBand provides uncertainty range
type ConfidenceBand struct {
	Lower    float64 `json:"lower"`    // Pessimistic estimate
	Expected float64 `json:"expected"` // Most likely value
	Upper    float64 `json:"upper"`    // Optimistic estimate
}

// DimensionMatrix holds all 6 dimensions
type DimensionMatrix struct {
	// The 6 core dimensions
	Fundamentals        DimensionScore `json:"fundamentals"`        // Code quality, structure
	EngineeringDepth    DimensionScore `json:"engineeringDepth"`    // Patterns, architecture
	ProductionReadiness DimensionScore `json:"productionReadiness"` // Deployment, ops
	TestingMaturity     DimensionScore `json:"testingMaturity"`     // Test coverage, quality
	Architecture        DimensionScore `json:"architecture"`        // System design
	InfraDevOps         DimensionScore `json:"infraDevOps"`         // CI/CD, containers

	// Metadata
	OverallScore   float64        `json:"overallScore"`   // Weighted composite
	OverallBand    ConfidenceBand `json:"overallBand"`    // Overall confidence range
	AnalyzedAt     time.Time      `json:"analyzedAt"`     // When analysis ran
	ContextWeights ContextWeights `json:"contextWeights"` // Job/role context
	ProjectType    string         `json:"projectType"`    // Detected type
}

// ContextWeights allows dimension weighting based on job context
type ContextWeights struct {
	JobTitle         string             `json:"jobTitle"`
	Role             string             `json:"role"`             // frontend, backend, fullstack, devops
	Level            string             `json:"level"`            // junior, mid, senior, staff
	DimensionWeights map[string]float64 `json:"dimensionWeights"` // Custom weights
	Explanation      string             `json:"explanation"`      // Why these weights
}

// DefaultWeights returns standard dimension weights
func DefaultWeights() map[string]float64 {
	return map[string]float64{
		"fundamentals":        0.20,
		"engineeringDepth":    0.20,
		"productionReadiness": 0.15,
		"testingMaturity":     0.15,
		"architecture":        0.15,
		"infraDevOps":         0.15,
	}
}

// FrontendWeights emphasizes UI/UX dimensions
func FrontendWeights() map[string]float64 {
	return map[string]float64{
		"fundamentals":        0.25,
		"engineeringDepth":    0.20,
		"productionReadiness": 0.10,
		"testingMaturity":     0.20,
		"architecture":        0.15,
		"infraDevOps":         0.10,
	}
}

// BackendWeights emphasizes system design
func BackendWeights() map[string]float64 {
	return map[string]float64{
		"fundamentals":        0.15,
		"engineeringDepth":    0.25,
		"productionReadiness": 0.20,
		"testingMaturity":     0.15,
		"architecture":        0.15,
		"infraDevOps":         0.10,
	}
}

// DevOpsWeights emphasizes infrastructure
func DevOpsWeights() map[string]float64 {
	return map[string]float64{
		"fundamentals":        0.10,
		"engineeringDepth":    0.15,
		"productionReadiness": 0.20,
		"testingMaturity":     0.15,
		"architecture":        0.15,
		"infraDevOps":         0.25,
	}
}

// CalculateOverall computes weighted overall score
func (dm *DimensionMatrix) CalculateOverall(weights map[string]float64) {
	if weights == nil {
		weights = DefaultWeights()
	}

	total := 0.0
	totalWeight := 0.0

	// Calculate weighted sum
	dimensions := map[string]DimensionScore{
		"fundamentals":        dm.Fundamentals,
		"engineeringDepth":    dm.EngineeringDepth,
		"productionReadiness": dm.ProductionReadiness,
		"testingMaturity":     dm.TestingMaturity,
		"architecture":        dm.Architecture,
		"infraDevOps":         dm.InfraDevOps,
	}

	lowerSum := 0.0
	upperSum := 0.0

	for name, dim := range dimensions {
		weight := weights[name]
		total += dim.Score * weight
		totalWeight += weight

		// Propagate confidence bands
		lowerSum += dim.Band.Lower * weight
		upperSum += dim.Band.Upper * weight
	}

	if totalWeight > 0 {
		dm.OverallScore = total / totalWeight
		dm.OverallBand = ConfidenceBand{
			Lower:    lowerSum / totalWeight,
			Expected: dm.OverallScore,
			Upper:    upperSum / totalWeight,
		}
	}
}

// GetWeakestDimension returns the dimension needing most improvement
func (dm *DimensionMatrix) GetWeakestDimension() (string, DimensionScore) {
	dimensions := map[string]DimensionScore{
		"fundamentals":        dm.Fundamentals,
		"engineeringDepth":    dm.EngineeringDepth,
		"productionReadiness": dm.ProductionReadiness,
		"testingMaturity":     dm.TestingMaturity,
		"architecture":        dm.Architecture,
		"infraDevOps":         dm.InfraDevOps,
	}

	weakest := ""
	var weakestScore DimensionScore
	weakestScore.Score = 101 // Higher than max

	for name, dim := range dimensions {
		if dim.Score < weakestScore.Score {
			weakest = name
			weakestScore = dim
		}
	}

	return weakest, weakestScore
}

// GetStrongestDimension returns the best dimension
func (dm *DimensionMatrix) GetStrongestDimension() (string, DimensionScore) {
	dimensions := map[string]DimensionScore{
		"fundamentals":        dm.Fundamentals,
		"engineeringDepth":    dm.EngineeringDepth,
		"productionReadiness": dm.ProductionReadiness,
		"testingMaturity":     dm.TestingMaturity,
		"architecture":        dm.Architecture,
		"infraDevOps":         dm.InfraDevOps,
	}

	strongest := ""
	var strongestScore DimensionScore
	strongestScore.Score = -1 // Lower than min

	for name, dim := range dimensions {
		if dim.Score > strongestScore.Score {
			strongest = name
			strongestScore = dim
		}
	}

	return strongest, strongestScore
}
