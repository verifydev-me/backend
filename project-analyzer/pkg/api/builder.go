package api

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/verifydev/project-analyzer/pkg/dimensions"
	"github.com/verifydev/project-analyzer/pkg/matching"
	"github.com/verifydev/project-analyzer/pkg/trust"
	"github.com/verifydev/project-analyzer/pkg/verdict"
)

// ResponseBuilder creates API responses
type ResponseBuilder struct {
	Matrix  *dimensions.DimensionMatrix
	Verdict *verdict.Verdict
	Trust   *trust.TrustAnalysis
	ABTest  *ABTestConfig
}

// NewResponseBuilder creates a builder
func NewResponseBuilder() *ResponseBuilder {
	return &ResponseBuilder{}
}

// WithDimensions adds dimension data
func (rb *ResponseBuilder) WithDimensions(m *dimensions.DimensionMatrix) *ResponseBuilder {
	rb.Matrix = m
	return rb
}

// WithVerdict adds verdict data
func (rb *ResponseBuilder) WithVerdict(v *verdict.Verdict) *ResponseBuilder {
	rb.Verdict = v
	return rb
}

// WithTrust adds trust data
func (rb *ResponseBuilder) WithTrust(t *trust.TrustAnalysis) *ResponseBuilder {
	rb.Trust = t
	return rb
}

// WithABTest adds A/B test config
func (rb *ResponseBuilder) WithABTest(ab *ABTestConfig) *ResponseBuilder {
	rb.ABTest = ab
	return rb
}

// BuildAnalysisResponse creates the full analysis response
func (rb *ResponseBuilder) BuildAnalysisResponse(projectID, analysisID string) *AnalysisResponse {
	response := &AnalysisResponse{
		Version:    "2.0",
		AnalysisID: analysisID,
		ProjectID:  projectID,
		Timestamp:  time.Now().UTC().Format(time.RFC3339),
		Dimensions: rb.Matrix,
		Verdict:    rb.Verdict,
		Trust:      rb.Trust,
	}

	// Add legacy scores for backward compatibility
	if rb.Matrix != nil {
		response.LegacyScores = &LegacyScores{
			Overall:    rb.Matrix.OverallScore,
			Deprecated: true,
			Message:    "Use 'dimensions' field for accurate multi-dimensional assessment",
		}
	}

	// Build summary
	response.Summary = rb.buildSummary()

	return response
}

// buildSummary creates the quick summary
func (rb *ResponseBuilder) buildSummary() ResponseSummary {
	summary := ResponseSummary{}

	if rb.Verdict != nil {
		summary.ExperienceLevel = string(rb.Verdict.Experience.Level)
		summary.OneLineSummary = rb.Verdict.Summary

		// Extract top strengths
		for i, s := range rb.Verdict.Strengths {
			if i >= 3 {
				break
			}
			summary.TopStrengths = append(summary.TopStrengths, s.Statement)
		}

		// Extract main gaps
		for i, g := range rb.Verdict.GrowthAreas {
			if i >= 2 {
				break
			}
			summary.MainGaps = append(summary.MainGaps, g.Statement)
		}
	}

	if rb.Trust != nil {
		summary.TrustLevel = string(rb.Trust.OverallTrust.Classification)
	}

	return summary
}

// BuildDashboardView creates recruiter dashboard view
func (rb *ResponseBuilder) BuildDashboardView(candidateID, displayName string, matchResult *matching.MatchResult) *DashboardView {
	view := &DashboardView{
		CandidateID: candidateID,
		DisplayName: displayName,
	}

	// Build quick stats
	view.QuickStats = rb.buildQuickStats(matchResult)

	// Build dimension chart data
	view.DimensionChart = rb.buildDimensionChart()

	// Build skill matrix (would need skill data)
	view.SkillMatrix = SkillMatrix{
		Required:   []SkillCell{},
		NiceToHave: []SkillCell{},
		Bonus:      []SkillCell{},
	}

	// Set actions
	view.Actions = RecruiterActions{
		CanShortlist: matchResult != nil && matchResult.OverallFit != matching.FitMismatch,
		CanReject:    true,
		CanSchedule:  matchResult != nil && matchResult.MatchScore >= 55,
	}

	return view
}

func (rb *ResponseBuilder) buildQuickStats(matchResult *matching.MatchResult) QuickStats {
	stats := QuickStats{}

	if rb.Verdict != nil {
		stats.ExperienceLevel = string(rb.Verdict.Experience.Level)
	}

	if matchResult != nil {
		stats.OverallFit = string(matchResult.OverallFit)
		stats.MatchScore = int(matchResult.MatchScore)
	}

	if rb.Trust != nil {
		stats.TrustLevel = string(rb.Trust.OverallTrust.Classification)
	}

	return stats
}

func (rb *ResponseBuilder) buildDimensionChart() DimensionChart {
	chart := DimensionChart{
		Labels: []string{
			"Fundamentals",
			"Engineering Depth",
			"Production Readiness",
			"Testing Maturity",
			"Architecture",
			"Infrastructure/DevOps",
		},
		Scores: []float64{},
		Bands:  [][]float64{},
	}

	if rb.Matrix != nil {
		dims := []dimensions.DimensionScore{
			rb.Matrix.Fundamentals,
			rb.Matrix.EngineeringDepth,
			rb.Matrix.ProductionReadiness,
			rb.Matrix.TestingMaturity,
			rb.Matrix.Architecture,
			rb.Matrix.InfraDevOps,
		}

		for _, d := range dims {
			chart.Scores = append(chart.Scores, d.Score)
			chart.Bands = append(chart.Bands, []float64{
				d.Band.Lower,
				d.Band.Upper,
			})
		}
	}

	return chart
}

// BuildMatchResponse creates job matching response
func BuildMatchResponse(jobID string, results []*matching.MatchResult, filters MatchFilters) *MatchResponse {
	return &MatchResponse{
		JobID:      jobID,
		Matches:    results,
		TotalCount: len(results),
		Filters:    filters,
	}
}

// BuildWebhook creates webhook payload
func BuildWebhook(event string, data interface{}, secret string) *WebhookPayload {
	payload := &WebhookPayload{
		Event:     event,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Data:      data,
	}

	// Sign payload
	jsonData, _ := json.Marshal(data)
	payload.Signature = computeHMAC(jsonData, secret)

	return payload
}

func computeHMAC(data []byte, secret string) string {
	// Would use crypto/hmac in production
	return "hmac_signature_placeholder"
}

// CreateABTestConfig creates A/B test configuration
func CreateABTestConfig(userID, testID string) *ABTestConfig {
	// Deterministic variant assignment based on user ID
	variant := "control"
	if hashUserForTest(userID, testID) {
		variant = "treatment"
	}

	variantConfig := ABTestVariants["verdict_v2"]
	if variant == "treatment" {
		variantConfig = ABTestVariants["verdict_v3"]
	}

	return &ABTestConfig{
		TestID:   testID,
		Variant:  variant,
		Features: variantConfig.Features,
		Tracking: ABTestTracking{
			ImpressionID: generateImpressionID(),
			Timestamp:    time.Now().UTC().Format(time.RFC3339),
			UserID:       userID,
			Context:      "analysis_view",
		},
	}
}

func hashUserForTest(userID, testID string) bool {
	// Simple hash for A/B assignment
	// In production, use proper hashing
	sum := 0
	for _, c := range userID + testID {
		sum += int(c)
	}
	return sum%2 == 0
}

func generateImpressionID() string {
	return fmt.Sprintf("%d", time.Now().UnixNano())
}
