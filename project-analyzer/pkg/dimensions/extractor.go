package dimensions

import (
	"time"

	"github.com/verifydev/project-analyzer/pkg/signals"
)

// DimensionExtractor extracts dimensions from project signals
type DimensionExtractor struct {
	Signals     *signals.ProjectSignals
	Infra       *signals.InfrastructureSignals
	ProjectType string
}

// NewDimensionExtractor creates an extractor instance
func NewDimensionExtractor(sigs *signals.ProjectSignals, infra *signals.InfrastructureSignals) *DimensionExtractor {
	projectType := "unknown"
	if sigs != nil {
		projectType = string(sigs.ProjectType)
	}
	return &DimensionExtractor{
		Signals:     sigs,
		Infra:       infra,
		ProjectType: projectType,
	}
}

// Extract generates the complete dimension matrix
func (de *DimensionExtractor) Extract() *DimensionMatrix {
	matrix := &DimensionMatrix{
		AnalyzedAt:  time.Now(),
		ProjectType: de.ProjectType,
	}

	// Extract each dimension
	matrix.Fundamentals = de.extractFundamentals()
	matrix.EngineeringDepth = de.extractEngineeringDepth()
	matrix.ProductionReadiness = de.extractProductionReadiness()
	matrix.TestingMaturity = de.extractTestingMaturity()
	matrix.Architecture = de.extractArchitecture()
	matrix.InfraDevOps = de.extractInfraDevOps()

	// Calculate overall with default weights
	matrix.CalculateOverall(nil)

	return matrix
}

// extractFundamentals evaluates code basics
func (de *DimensionExtractor) extractFundamentals() DimensionScore {
	score := DimensionScore{
		SubScores: make(map[string]SubScore),
		Signals:   []string{},
	}

	if de.Signals == nil {
		return score
	}

	total := 0.0
	count := 0.0

	// Project Structure (25 points max)
	structureScore := 0.0
	folder := de.Signals.FolderStructure
	if folder.HasSrcFolder {
		structureScore += 5
		score.Signals = append(score.Signals, "has_src_folder")
	}
	if folder.HasComponents {
		structureScore += 5
		score.Signals = append(score.Signals, "has_components")
	}
	if folder.HasUtils {
		structureScore += 3
		score.Signals = append(score.Signals, "has_utils")
	}
	if folder.HasServices {
		structureScore += 5
		score.Signals = append(score.Signals, "has_services")
	}
	if folder.HasConfig {
		structureScore += 4
		score.Signals = append(score.Signals, "has_config")
	}
	if folder.HasTypes {
		structureScore += 3
		score.Signals = append(score.Signals, "has_types")
	}
	score.SubScores["structure"] = SubScore{Score: structureScore, Weight: 0.25}
	total += structureScore
	count += 25

	// Documentation (20 points max)
	docScore := 0.0
	code := de.Signals.CodeSignals
	if code.HasReadme {
		docScore += 10
		score.Signals = append(score.Signals, "has_readme")
	}
	if code.HasLicense {
		docScore += 5
		score.Signals = append(score.Signals, "has_license")
	}
	if code.CommentDensity > 5 {
		docScore += 5
		score.Signals = append(score.Signals, "good_comment_density")
	}
	score.SubScores["documentation"] = SubScore{Score: docScore, Weight: 0.20}
	total += docScore
	count += 20

	// Code Quality Basics (30 points max)
	qualityScore := 0.0
	if code.HasGitignore {
		qualityScore += 5
		score.Signals = append(score.Signals, "has_gitignore")
	}
	if code.HasLinting {
		qualityScore += 10
		score.Signals = append(score.Signals, "has_linting")
	}
	if code.HasPrettier {
		qualityScore += 5
		score.Signals = append(score.Signals, "has_prettier")
	}
	if code.HasTypeScript {
		qualityScore += 10
		score.Signals = append(score.Signals, "has_typescript")
	}
	score.SubScores["quality"] = SubScore{Score: qualityScore, Weight: 0.30}
	total += qualityScore
	count += 30

	// Organization (25 points max)
	orgScore := float64(folder.OrganizationScore) / 4 // Scale 0-100 to 0-25
	score.SubScores["organization"] = SubScore{Score: orgScore, Weight: 0.25}
	total += orgScore
	count += 25

	// Calculate final score
	if count > 0 {
		score.Score = (total / count) * 100
	}
	score.Confidence = 0.8
	score.Band = ConfidenceBand{
		Lower:    maxFloat(0, score.Score-10),
		Expected: score.Score,
		Upper:    minFloat(100, score.Score+10),
	}

	return score
}

// extractEngineeringDepth evaluates advanced patterns
func (de *DimensionExtractor) extractEngineeringDepth() DimensionScore {
	score := DimensionScore{
		SubScores: make(map[string]SubScore),
		Signals:   []string{},
	}

	if de.Signals == nil {
		return score
	}

	total := 0.0

	// Advanced Patterns (40 points max)
	patternScore := 0.0
	if de.Signals.AdvancedPatterns != nil {
		ap := de.Signals.AdvancedPatterns
		if ap.UsesCleanArch {
			patternScore += 8
			score.Signals = append(score.Signals, "clean_architecture")
		}
		if ap.UsesRepository {
			patternScore += 5
			score.Signals = append(score.Signals, "repository_pattern")
		}
		if ap.UsesDependencyInj {
			patternScore += 8
			score.Signals = append(score.Signals, "dependency_injection")
		}
		if ap.UsesFactory {
			patternScore += 5
			score.Signals = append(score.Signals, "factory_pattern")
		}
		if ap.UsesMemoization {
			patternScore += 4
			score.Signals = append(score.Signals, "memoization")
		}
		if ap.UsesCaching {
			patternScore += 5
			score.Signals = append(score.Signals, "caching")
		}
		if ap.UsesDebouncing || ap.UsesThrottling {
			patternScore += 5
			score.Signals = append(score.Signals, "rate_limiting_patterns")
		}
	}
	score.SubScores["patterns"] = SubScore{Score: minFloat(40, patternScore), Weight: 0.40}
	total += minFloat(40, patternScore)

	// Framework Mastery (30 points max)
	frameworkScore := 0.0
	if de.Signals.ReactSignals != nil {
		rs := de.Signals.ReactSignals
		if rs.CustomHooksCount > 2 {
			frameworkScore += 8
			score.Signals = append(score.Signals, "custom_hooks")
		}
		if rs.UsesContext {
			frameworkScore += 5
			score.Signals = append(score.Signals, "react_context")
		}
		if rs.UsesReducer {
			frameworkScore += 5
			score.Signals = append(score.Signals, "use_reducer")
		}
		if rs.UsesLazyLoading {
			frameworkScore += 6
			score.Signals = append(score.Signals, "lazy_loading")
		}
		if rs.UsesErrorBoundary {
			frameworkScore += 6
			score.Signals = append(score.Signals, "error_boundary")
		}
	}
	if de.Signals.GoSignals != nil {
		gs := de.Signals.GoSignals
		if gs.UsesGoroutines && gs.UsesChannels {
			frameworkScore += 10
			score.Signals = append(score.Signals, "goroutines_channels")
		}
		if gs.UsesContext {
			frameworkScore += 5
			score.Signals = append(score.Signals, "go_context")
		}
		if gs.UsesInterfaces {
			frameworkScore += 8
			score.Signals = append(score.Signals, "go_interfaces")
		}
	}
	if de.Signals.NodeSignals != nil {
		ns := de.Signals.NodeSignals
		if ns.HasMiddleware && ns.MiddlewareCount > 3 {
			frameworkScore += 5
			score.Signals = append(score.Signals, "middleware_usage")
		}
		if ns.HasValidation {
			frameworkScore += 5
			score.Signals = append(score.Signals, "input_validation")
		}
	}
	score.SubScores["framework"] = SubScore{Score: minFloat(30, frameworkScore), Weight: 0.30}
	total += minFloat(30, frameworkScore)

	// API Design (30 points max)
	apiScore := 0.0
	if de.Signals.AdvancedPatterns != nil {
		ap := de.Signals.AdvancedPatterns
		if ap.UsesREST {
			apiScore += 8
			score.Signals = append(score.Signals, "rest_api")
		}
		if ap.UsesGraphQL {
			apiScore += 10
			score.Signals = append(score.Signals, "graphql")
		}
		if ap.UsesWebSocket {
			apiScore += 6
			score.Signals = append(score.Signals, "websocket")
		}
		if ap.UsesgRPC {
			apiScore += 6
			score.Signals = append(score.Signals, "grpc")
		}
	}
	score.SubScores["api"] = SubScore{Score: minFloat(30, apiScore), Weight: 0.30}
	total += minFloat(30, apiScore)

	score.Score = total
	score.Confidence = 0.75
	score.Band = ConfidenceBand{
		Lower:    maxFloat(0, score.Score-12),
		Expected: score.Score,
		Upper:    minFloat(100, score.Score+12),
	}

	return score
}

// extractProductionReadiness evaluates deployment readiness
func (de *DimensionExtractor) extractProductionReadiness() DimensionScore {
	score := DimensionScore{
		SubScores: make(map[string]SubScore),
		Signals:   []string{},
	}

	total := 0.0

	// Containerization (25 points max)
	containerScore := 0.0
	if de.Signals != nil {
		code := de.Signals.CodeSignals
		if code.HasDockerfile {
			containerScore += 10
			score.Signals = append(score.Signals, "has_dockerfile")
		}
		if code.HasDockerCompose {
			containerScore += 10
			score.Signals = append(score.Signals, "has_docker_compose")
		}
	}
	if de.Infra != nil {
		if de.Infra.HasSignal(signals.SignalKubernetes) {
			containerScore += 5
			score.Signals = append(score.Signals, "kubernetes")
		}
	}
	score.SubScores["containerization"] = SubScore{Score: containerScore, Weight: 0.25}
	total += containerScore

	// CI/CD (25 points max)
	ciScore := 0.0
	if de.Signals != nil && de.Signals.CodeSignals.HasCI {
		ciScore += 15
		score.Signals = append(score.Signals, "has_ci")
	}
	if de.Infra != nil {
		if de.Infra.HasSignal(signals.SignalGitHubActions) {
			ciScore += 5
			score.Signals = append(score.Signals, "github_actions")
		}
		if de.Infra.HasSignal(signals.SignalGitLabCI) {
			ciScore += 5
			score.Signals = append(score.Signals, "gitlab_ci")
		}
	}
	score.SubScores["cicd"] = SubScore{Score: minFloat(25, ciScore), Weight: 0.25}
	total += minFloat(25, ciScore)

	// Observability (25 points max)
	obsScore := 0.0
	if de.Signals != nil && de.Signals.AdvancedPatterns != nil {
		ap := de.Signals.AdvancedPatterns
		if ap.HasLogging {
			obsScore += 8
			score.Signals = append(score.Signals, "logging")
		}
		if ap.HasMetrics {
			obsScore += 8
			score.Signals = append(score.Signals, "metrics")
		}
		if ap.HasTracing {
			obsScore += 5
			score.Signals = append(score.Signals, "tracing")
		}
		if ap.HasHealthCheck {
			obsScore += 4
			score.Signals = append(score.Signals, "health_check")
		}
	}
	score.SubScores["observability"] = SubScore{Score: obsScore, Weight: 0.25}
	total += obsScore

	// Security (25 points max)
	secScore := 0.0
	if de.Signals != nil && de.Signals.AdvancedPatterns != nil {
		ap := de.Signals.AdvancedPatterns
		if ap.HasInputValidation {
			secScore += 8
			score.Signals = append(score.Signals, "input_validation")
		}
		if ap.HasAuth {
			secScore += 8
			score.Signals = append(score.Signals, "authentication")
		}
		if ap.HasRateLimiting {
			secScore += 5
			score.Signals = append(score.Signals, "rate_limiting")
		}
		if ap.HasSanitization {
			secScore += 4
			score.Signals = append(score.Signals, "sanitization")
		}
	}
	score.SubScores["security"] = SubScore{Score: secScore, Weight: 0.25}
	total += secScore

	score.Score = total
	score.Confidence = 0.8
	score.Band = ConfidenceBand{
		Lower:    maxFloat(0, score.Score-10),
		Expected: score.Score,
		Upper:    minFloat(100, score.Score+10),
	}

	return score
}

// extractTestingMaturity evaluates testing practices
func (de *DimensionExtractor) extractTestingMaturity() DimensionScore {
	score := DimensionScore{
		SubScores: make(map[string]SubScore),
		Signals:   []string{},
	}

	total := 0.0

	// Test Presence (40 points max)
	testScore := 0.0
	if de.Signals != nil {
		code := de.Signals.CodeSignals
		folder := de.Signals.FolderStructure

		if folder.HasTests {
			testScore += 15
			score.Signals = append(score.Signals, "has_tests_folder")
		}

		// Scale test files
		if code.TestFilesCount > 0 {
			testScore += minFloat(25, float64(code.TestFilesCount)*3)
			score.Signals = append(score.Signals, "has_test_files")
		}
	}
	score.SubScores["presence"] = SubScore{Score: testScore, Weight: 0.40}
	total += testScore

	// Coverage (30 points max)
	coverageScore := 0.0
	if de.Signals != nil && de.Signals.GoSignals != nil {
		coverage := de.Signals.GoSignals.TestCoverage
		coverageScore = minFloat(30, coverage*0.3)
		if coverage > 50 {
			score.Signals = append(score.Signals, "good_coverage")
		}
	}
	score.SubScores["coverage"] = SubScore{Score: coverageScore, Weight: 0.30}
	total += coverageScore

	// Advanced Testing (30 points max)
	advancedScore := 0.0
	if de.Signals != nil && de.Signals.GoSignals != nil {
		if de.Signals.GoSignals.HasBenchmarks {
			advancedScore += 15
			score.Signals = append(score.Signals, "has_benchmarks")
		}
	}
	// Integration tests, e2e patterns would go here
	score.SubScores["advanced"] = SubScore{Score: advancedScore, Weight: 0.30}
	total += advancedScore

	score.Score = total
	score.Confidence = 0.7
	score.Band = ConfidenceBand{
		Lower:    maxFloat(0, score.Score-15),
		Expected: score.Score,
		Upper:    minFloat(100, score.Score+15),
	}

	return score
}

// extractArchitecture evaluates system design
func (de *DimensionExtractor) extractArchitecture() DimensionScore {
	score := DimensionScore{
		SubScores: make(map[string]SubScore),
		Signals:   []string{},
	}

	total := 0.0

	// Layering (35 points max)
	layerScore := 0.0
	if de.Signals != nil {
		folder := de.Signals.FolderStructure
		if folder.HasModels {
			layerScore += 7
			score.Signals = append(score.Signals, "has_models_layer")
		}
		if folder.HasServices {
			layerScore += 8
			score.Signals = append(score.Signals, "has_service_layer")
		}
		if folder.HasControllers {
			layerScore += 7
			score.Signals = append(score.Signals, "has_controller_layer")
		}
		if folder.HasMiddleware {
			layerScore += 6
			score.Signals = append(score.Signals, "has_middleware_layer")
		}
		if folder.HasAPI {
			layerScore += 7
			score.Signals = append(score.Signals, "has_api_layer")
		}
	}
	score.SubScores["layering"] = SubScore{Score: layerScore, Weight: 0.35}
	total += layerScore

	// Patterns (35 points max)
	patternScore := 0.0
	if de.Signals != nil && de.Signals.AdvancedPatterns != nil {
		ap := de.Signals.AdvancedPatterns
		if ap.UsesCleanArch {
			patternScore += 10
			score.Signals = append(score.Signals, "clean_architecture")
		}
		if ap.UsesMVC {
			patternScore += 7
			score.Signals = append(score.Signals, "mvc_pattern")
		}
		if ap.UsesHexagonal {
			patternScore += 10
			score.Signals = append(score.Signals, "hexagonal_architecture")
		}
		if ap.UsesRepository {
			patternScore += 8
			score.Signals = append(score.Signals, "repository_pattern")
		}
	}
	score.SubScores["patterns"] = SubScore{Score: minFloat(35, patternScore), Weight: 0.35}
	total += minFloat(35, patternScore)

	// Modularity (30 points max)
	modScore := 0.0
	if de.Signals != nil {
		folder := de.Signals.FolderStructure
		if folder.HasInternal || folder.HasPkg {
			modScore += 10
			score.Signals = append(score.Signals, "go_module_structure")
		}
		if folder.OrganizationScore > 70 {
			modScore += 10
			score.Signals = append(score.Signals, "well_organized")
		}
		// Depth indicates complexity
		if folder.MaxDepth >= 3 && folder.MaxDepth <= 5 {
			modScore += 10
			score.Signals = append(score.Signals, "appropriate_depth")
		}
	}
	score.SubScores["modularity"] = SubScore{Score: modScore, Weight: 0.30}
	total += modScore

	score.Score = total
	score.Confidence = 0.75
	score.Band = ConfidenceBand{
		Lower:    maxFloat(0, score.Score-12),
		Expected: score.Score,
		Upper:    minFloat(100, score.Score+12),
	}

	return score
}

// extractInfraDevOps evaluates infrastructure maturity
func (de *DimensionExtractor) extractInfraDevOps() DimensionScore {
	score := DimensionScore{
		SubScores: make(map[string]SubScore),
		Signals:   []string{},
	}

	total := 0.0

	// Container Orchestration (35 points max)
	containerScore := 0.0
	if de.Infra != nil {
		if de.Infra.HasSignal(signals.SignalDocker) {
			containerScore += 10
			score.Signals = append(score.Signals, "docker")
		}
		if de.Infra.HasSignal(signals.SignalDockerCompose) {
			containerScore += 10
			score.Signals = append(score.Signals, "docker_compose")
		}
		if de.Infra.HasSignal(signals.SignalKubernetes) {
			containerScore += 15
			score.Signals = append(score.Signals, "kubernetes")
		}
	}
	score.SubScores["containers"] = SubScore{Score: containerScore, Weight: 0.35}
	total += containerScore

	// CI/CD Pipelines (35 points max)
	ciScore := 0.0
	if de.Infra != nil {
		if de.Infra.HasSignal(signals.SignalGitHubActions) {
			ciScore += 12
			score.Signals = append(score.Signals, "github_actions")
		}
		if de.Infra.HasSignal(signals.SignalGitLabCI) {
			ciScore += 12
			score.Signals = append(score.Signals, "gitlab_ci")
		}
		// Note: Makefile detection happens through CodeSignals.HasMakefile
	}
	if de.Signals != nil && de.Signals.CodeSignals.HasMakefile {
		ciScore += 5
	}
	score.SubScores["cicd"] = SubScore{Score: minFloat(35, ciScore), Weight: 0.35}
	total += minFloat(35, ciScore)

	// Infrastructure Services (30 points max)
	infraScore := 0.0
	if de.Infra != nil {
		if de.Infra.HasSignal(signals.SignalRedis) {
			infraScore += 6
			score.Signals = append(score.Signals, "redis")
		}
		if de.Infra.HasSignal(signals.SignalPostgres) || de.Infra.HasSignal(signals.SignalMySQL) {
			infraScore += 8
			score.Signals = append(score.Signals, "database")
		}
		if de.Infra.HasSignal(signals.SignalRabbitMQ) || de.Infra.HasSignal(signals.SignalKafka) {
			infraScore += 8
			score.Signals = append(score.Signals, "message_queue")
		}
		if de.Infra.HasSignal(signals.SignalNginx) {
			infraScore += 5
			score.Signals = append(score.Signals, "nginx")
		}
		if de.Infra.ServiceCount > 3 {
			infraScore += 3
			score.Signals = append(score.Signals, "multi_service")
		}
	}
	score.SubScores["services"] = SubScore{Score: minFloat(30, infraScore), Weight: 0.30}
	total += minFloat(30, infraScore)

	score.Score = total
	score.Confidence = 0.85
	score.Band = ConfidenceBand{
		Lower:    maxFloat(0, score.Score-8),
		Expected: score.Score,
		Upper:    minFloat(100, score.Score+8),
	}

	return score
}

// Helper functions
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
