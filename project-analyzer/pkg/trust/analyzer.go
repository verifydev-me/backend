package trust

import (
	"regexp"
	"strings"
	"time"

	"github.com/verifydev/project-analyzer/pkg/signals"
)

// TrustAnalyzer performs trust analysis on projects
type TrustAnalyzer struct {
	Signals    *signals.ProjectSignals
	Infra      *signals.InfrastructureSignals
	CommitData *CommitData
}

// CommitData holds git commit information
type CommitData struct {
	Commits      []CommitInfo
	TotalCommits int
	FirstCommit  time.Time
	LastCommit   time.Time
	Authors      []string
}

// CommitInfo represents a single commit
type CommitInfo struct {
	Hash         string
	Author       string
	Date         time.Time
	Message      string
	Additions    int
	Deletions    int
	FilesChanged int
}

// NewTrustAnalyzer creates a trust analyzer
func NewTrustAnalyzer(sigs *signals.ProjectSignals, infra *signals.InfrastructureSignals, commits *CommitData) *TrustAnalyzer {
	return &TrustAnalyzer{
		Signals:    sigs,
		Infra:      infra,
		CommitData: commits,
	}
}

// Analyze performs complete trust analysis
func (ta *TrustAnalyzer) Analyze() *TrustAnalysis {
	result := &TrustAnalysis{
		Flags: []TrustFlag{},
	}

	// Analyze effort
	result.Effort = ta.analyzeEffort()

	// Analyze authenticity
	result.Authenticity = ta.analyzeAuthenticity()

	// Detect learning project
	result.Learning = ta.analyzeLearning()

	// Check consistency
	result.Consistency = ta.analyzeConsistency()

	// Calculate overall trust
	result.OverallTrust = ta.calculateOverallTrust(result)

	// Collect all flags
	result.Flags = ta.collectFlags(result)

	return result
}

// analyzeEffort evaluates development effort
func (ta *TrustAnalyzer) analyzeEffort() EffortAnalysis {
	result := EffortAnalysis{}

	if ta.CommitData == nil || len(ta.CommitData.Commits) == 0 {
		result.Classification = EffortSuspicious
		result.EffortScore = 20
		return result
	}

	// Analyze commit pattern
	result.CommitPattern = ta.analyzeCommitPattern()

	// Calculate development span
	result.DevelopmentSpan = ta.CommitData.LastCommit.Sub(ta.CommitData.FirstCommit)
	result.ActiveDays = calculateActiveDays(ta.CommitData.Commits)

	// Calculate code churn
	totalAdditions := 0
	totalDeletions := 0
	for _, commit := range ta.CommitData.Commits {
		totalAdditions += commit.Additions
		totalDeletions += commit.Deletions
	}
	if totalDeletions > 0 {
		result.CodeChurn = float64(totalAdditions) / float64(totalDeletions)
	} else {
		result.CodeChurn = float64(totalAdditions)
	}

	// Estimate iteration count
	result.IterationCount = countIterations(ta.CommitData.Commits)

	// Calculate effort score
	result.EffortScore = ta.calculateEffortScore(&result)
	result.Classification = classifyEffort(result.EffortScore, &result.CommitPattern)
	result.EffortBand = ConfidenceBand{
		Lower:    maxFloat(0, result.EffortScore-10),
		Expected: result.EffortScore,
		Upper:    minFloat(100, result.EffortScore+10),
	}

	return result
}

func (ta *TrustAnalyzer) analyzeCommitPattern() CommitPattern {
	pattern := CommitPattern{
		TotalCommits: len(ta.CommitData.Commits),
	}

	if len(ta.CommitData.Commits) == 0 {
		return pattern
	}

	pattern.FirstCommit = ta.CommitData.FirstCommit
	pattern.LastCommit = ta.CommitData.LastCommit

	// Calculate averages
	totalLines := 0
	lineCounts := []int{}
	for _, commit := range ta.CommitData.Commits {
		lines := commit.Additions + commit.Deletions
		totalLines += lines
		lineCounts = append(lineCounts, lines)
	}
	pattern.CommitSizeAvg = totalLines / len(ta.CommitData.Commits)

	// Calculate variance
	if len(lineCounts) > 1 {
		mean := float64(totalLines) / float64(len(lineCounts))
		variance := 0.0
		for _, count := range lineCounts {
			diff := float64(count) - mean
			variance += diff * diff
		}
		pattern.CommitSizeVariance = variance / float64(len(lineCounts))
	}

	// Detect bulk imports (single commit with huge additions)
	for _, commit := range ta.CommitData.Commits {
		if commit.Additions > 5000 && commit.Deletions < 100 {
			pattern.HasBulkImport = true
			break
		}
	}

	// Detect regular vs sporadic patterns
	if len(ta.CommitData.Commits) > 5 {
		days := ta.CommitData.LastCommit.Sub(ta.CommitData.FirstCommit).Hours() / 24
		if days > 0 {
			commitsPerDay := float64(len(ta.CommitData.Commits)) / days
			pattern.IsRegular = commitsPerDay > 0.3 && pattern.CommitSizeVariance < 10000
		}
	}

	return pattern
}

// analyzeAuthenticity checks for signs of genuine work vs copied/generated code
func (ta *TrustAnalyzer) analyzeAuthenticity() AuthenticityAnalysis {
	result := AuthenticityAnalysis{
		AuthenticityScore: 50, // Start neutral
		Signals:           []AuthenticitySignal{},
	}

	// Check for organic development patterns
	if ta.CommitData != nil && len(ta.CommitData.Commits) > 0 {
		// Multiple commits over time suggests organic development
		span := ta.CommitData.LastCommit.Sub(ta.CommitData.FirstCommit)
		if span.Hours() > 24*7 { // More than a week of development
			result.AuthenticityScore += 15
			result.Signals = append(result.Signals, AuthenticitySignal{
				Type:       SignalPositive,
				Name:       "organic_development_span",
				Evidence:   "Development span over a week",
				Confidence: 0.8,
			})
		}

		// Check commit message quality
		meaningfulMessages := 0
		for _, commit := range ta.CommitData.Commits {
			if len(commit.Message) > 10 && !isTrivialMessage(commit.Message) {
				meaningfulMessages++
			}
		}
		if float64(meaningfulMessages)/float64(len(ta.CommitData.Commits)) > 0.7 {
			result.AuthenticityScore += 10
			result.Signals = append(result.Signals, AuthenticitySignal{
				Type:       SignalPositive,
				Name:       "meaningful_commits",
				Evidence:   "Commit messages show intentional development",
				Confidence: 0.7,
			})
		}

		// Multiple authors can indicate collaboration (good sign)
		if len(ta.CommitData.Authors) > 1 {
			result.AuthenticityScore += 5
			result.Signals = append(result.Signals, AuthenticitySignal{
				Type:       SignalPositive,
				Name:       "collaborative_development",
				Evidence:   "Multiple contributors",
				Confidence: 0.6,
			})
		}
	}

	// Check for tutorial/boilerplate indicators using project type
	// NOTE: Only check truly generic/template types, NOT valid project type classifications
	if ta.Signals != nil {
		projectType := string(ta.Signals.ProjectType)
		// Only penalize explicitly tutorial/sample project types
		tutorialTypes := []string{"unknown"}
		isTutorial := false
		for _, t := range tutorialTypes {
			if strings.ToLower(projectType) == t {
				isTutorial = true
				break
			}
		}
		if isTutorial {
			result.AuthenticityScore -= 10
			result.Signals = append(result.Signals, AuthenticitySignal{
				Type:       SignalNegative,
				Name:       "generic_project_type",
				Evidence:   "Project type suggests tutorial/template",
				Confidence: 0.5,
			})
		}
	}

	// Check infrastructure signals for customization
	if ta.Infra != nil {
		customizations := 0
		// Custom CI/CD configuration
		if ta.Infra.HasSignal(signals.SignalGitHubActions) || ta.Infra.HasSignal(signals.SignalGitLabCI) {
			customizations++
		}
		// Custom Docker setup
		if ta.Infra.HasSignal(signals.SignalDocker) && ta.Infra.HasSignal(signals.SignalDockerCompose) {
			customizations++
		}
		// Database usage
		if ta.Infra.HasSignal(signals.SignalPostgres) || ta.Infra.HasSignal(signals.SignalMySQL) || ta.Infra.HasSignal(signals.SignalRedis) {
			customizations++
		}

		if customizations >= 2 {
			result.AuthenticityScore += 10
			result.Signals = append(result.Signals, AuthenticitySignal{
				Type:       SignalPositive,
				Name:       "custom_infrastructure",
				Evidence:   "Project has custom infrastructure setup",
				Confidence: 0.7,
			})
		}
	}

	// Clamp score
	if result.AuthenticityScore < 0 {
		result.AuthenticityScore = 0
	}
	if result.AuthenticityScore > 100 {
		result.AuthenticityScore = 100
	}

	return result
}

// analyzeLearning detects if this is a learning/tutorial project
func (ta *TrustAnalyzer) analyzeLearning() LearningAnalysis {
	result := LearningAnalysis{
		Indicators: []LearningIndicator{},
	}

	score := 0.0

	// Check project type for learning indicators
	if ta.Signals != nil {
		projectType := strings.ToLower(string(ta.Signals.ProjectType))

		// Type-based indicators
		learningPatterns := []string{
			"tutorial", "learn", "example", "demo", "practice",
			"exercise", "course", "lesson", "workshop", "bootcamp",
			"starter", "template", "boilerplate", "test",
		}

		for _, pattern := range learningPatterns {
			if strings.Contains(projectType, pattern) {
				score += 0.3
				result.Indicators = append(result.Indicators, LearningIndicator{
					Type:       "project_type",
					Evidence:   "Project type contains: " + pattern,
					Confidence: 0.8,
				})
				break
			}
		}
	}

	// Commit pattern analysis
	if ta.CommitData != nil {
		// Single commit = likely cloned/copied
		if len(ta.CommitData.Commits) == 1 {
			score += 0.2
			result.Indicators = append(result.Indicators, LearningIndicator{
				Type:       "single_commit",
				Evidence:   "Project has only one commit",
				Confidence: 0.6,
			})
		}

		// Check commit messages for tutorial patterns
		tutorialMessages := []string{
			"initial commit", "first commit", "init", "start",
			"following tutorial", "from tutorial", "copied from",
		}

		for _, commit := range ta.CommitData.Commits {
			msgLower := strings.ToLower(commit.Message)
			for _, pattern := range tutorialMessages {
				if strings.Contains(msgLower, pattern) {
					score += 0.1
					break
				}
			}
		}

		// Very short development span with complex code = suspicious
		span := ta.CommitData.LastCommit.Sub(ta.CommitData.FirstCommit)
		if span.Hours() < 24 && ta.Signals != nil && ta.Signals.TotalLines > 5000 {
			score += 0.2
			result.Indicators = append(result.Indicators, LearningIndicator{
				Type:       "rapid_complex_project",
				Evidence:   "Large codebase created in under 24 hours",
				Confidence: 0.7,
			})
		}
	}

	// Normalize score
	result.LearningScore = minFloat(1.0, score)
	result.IsLikelyLearning = result.LearningScore > 0.5

	return result
}

// analyzeConsistency checks for internal project consistency
func (ta *TrustAnalyzer) analyzeConsistency() ConsistencyAnalysis {
	result := ConsistencyAnalysis{
		Issues: []ConsistencyIssue{},
	}

	score := 100.0 // Start with perfect consistency

	// Check for consistent infrastructure
	if ta.Infra != nil && ta.Signals != nil {
		// Having tests but no CI is inconsistent for production-grade projects
		if ta.Signals.FolderStructure.HasTests {
			if !ta.Infra.HasSignal(signals.SignalGitHubActions) && !ta.Infra.HasSignal(signals.SignalGitLabCI) {
				score -= 8
				result.Issues = append(result.Issues, ConsistencyIssue{
					Type:     "tests_without_ci",
					Severity: "medium",
					Evidence: "Has tests but no CI pipeline to run them",
				})
			}
		}

		// Docker without compose or compose without docker
		hasDocker := ta.Infra.HasSignal(signals.SignalDocker)
		hasCompose := ta.Infra.HasSignal(signals.SignalDockerCompose)
		if hasCompose && !hasDocker {
			score -= 5
			result.Issues = append(result.Issues, ConsistencyIssue{
				Type:     "compose_without_dockerfile",
				Severity: "low",
				Evidence: "Has docker-compose but no Dockerfile",
			})
		}

		// Production signals without tests — significant inconsistency
		hasProductionInfra := hasDocker || ta.Infra.HasSignal(signals.SignalKubernetes) || ta.Infra.HasSignal(signals.SignalAWS) || ta.Infra.HasSignal(signals.SignalGCP)
		if hasProductionInfra && !ta.Signals.FolderStructure.HasTests {
			score -= 15
			result.Issues = append(result.Issues, ConsistencyIssue{
				Type:     "production_without_tests",
				Severity: "high",
				Evidence: "Has production infrastructure but no test directory",
			})
		}

		// Has monitoring but no CI pipeline — inconsistent ops maturity
		hasMonitoring := ta.Infra.HasSignal(signals.SignalPrometheus) || ta.Infra.HasSignal(signals.SignalGrafana) || ta.Infra.HasSignal(signals.SignalDatadog)
		if hasMonitoring && !ta.Signals.CodeSignals.HasCI {
			score -= 8
			result.Issues = append(result.Issues, ConsistencyIssue{
				Type:     "monitoring_without_ci",
				Severity: "medium",
				Evidence: "Has monitoring setup but no CI/CD pipeline",
			})
		}
	}

	// Check code quality consistency
	if ta.Signals != nil {
		code := ta.Signals.CodeSignals

		// TypeScript project without strict typing indicators
		if code.HasTypeScript && !ta.Signals.FolderStructure.HasTypes && !code.HasLinting {
			score -= 5
			result.Issues = append(result.Issues, ConsistencyIssue{
				Type:     "typescript_without_strictness",
				Severity: "low",
				Evidence: "Uses TypeScript but no types folder or linting configured",
			})
		}

		// No README in a non-trivial project
		if ta.Signals.TotalFiles > 10 && !ta.Signals.FolderStructure.HasDocs {
			score -= 5
			result.Issues = append(result.Issues, ConsistencyIssue{
				Type:     "no_documentation",
				Severity: "low",
				Evidence: "Non-trivial project with no documentation folder",
			})
		}

		// API project without middleware
		if ta.Signals.FolderStructure.HasAPI && !ta.Signals.FolderStructure.HasMiddleware {
			score -= 5
			result.Issues = append(result.Issues, ConsistencyIssue{
				Type:     "api_without_middleware",
				Severity: "low",
				Evidence: "API project without middleware layer",
			})
		}
	}

	// Check commit pattern consistency
	if ta.CommitData != nil && ta.CommitData.TotalCommits > 0 {
		// Single commit for a large project is suspicious
		if ta.CommitData.TotalCommits == 1 && ta.Signals != nil && ta.Signals.TotalFiles > 20 {
			score -= 10
			result.Issues = append(result.Issues, ConsistencyIssue{
				Type:     "single_commit_large_project",
				Severity: "high",
				Evidence: "Large project with only a single commit — likely squashed or copied",
			})
		}
	}

	result.ConsistencyScore = maxFloat(0, score)
	return result
}

// calculateOverallTrust computes the final trust score
func (ta *TrustAnalyzer) calculateOverallTrust(analysis *TrustAnalysis) OverallTrust {
	// Weight different components
	effortWeight := 0.35
	authenticityWeight := 0.30
	learningPenalty := 0.15
	consistencyWeight := 0.20

	baseScore := analysis.Effort.EffortScore*effortWeight +
		analysis.Authenticity.AuthenticityScore*authenticityWeight +
		analysis.Consistency.ConsistencyScore*consistencyWeight

	// Apply learning penalty if detected
	if analysis.Learning.IsLikelyLearning {
		baseScore -= analysis.Learning.LearningScore * learningPenalty * 100
	}

	baseScore = maxFloat(0, minFloat(100, baseScore))

	// Determine classification
	var classification TrustClassification
	switch {
	case baseScore >= 80:
		classification = TrustHigh
	case baseScore >= 60:
		classification = TrustMedium
	case baseScore >= 40:
		classification = TrustLow
	default:
		classification = TrustSuspicious
	}

	return OverallTrust{
		Score:          baseScore,
		Classification: classification,
		Band: ConfidenceBand{
			Lower:    maxFloat(0, baseScore-15),
			Expected: baseScore,
			Upper:    minFloat(100, baseScore+15),
		},
	}
}

// collectFlags gathers all trust flags from the analysis
func (ta *TrustAnalyzer) collectFlags(analysis *TrustAnalysis) []TrustFlag {
	flags := []TrustFlag{}

	// Effort flags
	if analysis.Effort.CommitPattern.HasBulkImport {
		flags = append(flags, TrustFlag{
			Type:       FlagWarning,
			Category:   "effort",
			Message:    "Bulk code import detected",
			Confidence: 0.7,
		})
	}

	if analysis.Effort.Classification == EffortSuspicious {
		flags = append(flags, TrustFlag{
			Type:       FlagCritical,
			Category:   "effort",
			Message:    "Suspicious effort pattern",
			Confidence: 0.8,
		})
	}

	// Authenticity flags
	for _, signal := range analysis.Authenticity.Signals {
		flagType := FlagInfo
		if signal.Type == SignalNegative {
			flagType = FlagWarning
		}
		flags = append(flags, TrustFlag{
			Type:       flagType,
			Category:   "authenticity",
			Message:    signal.Evidence,
			Confidence: signal.Confidence,
		})
	}

	// Learning flags
	if analysis.Learning.IsLikelyLearning {
		flags = append(flags, TrustFlag{
			Type:       FlagInfo,
			Category:   "learning",
			Message:    "Likely a learning/tutorial project",
			Confidence: analysis.Learning.LearningScore,
		})
	}

	// Consistency flags
	for _, issue := range analysis.Consistency.Issues {
		flagType := FlagInfo
		if issue.Severity == "high" {
			flagType = FlagCritical
		} else if issue.Severity == "medium" {
			flagType = FlagWarning
		}
		flags = append(flags, TrustFlag{
			Type:       flagType,
			Category:   "consistency",
			Message:    issue.Evidence,
			Confidence: 0.7,
		})
	}

	return flags
}

// calculateEffortScore computes effort score from pattern analysis
func (ta *TrustAnalyzer) calculateEffortScore(effort *EffortAnalysis) float64 {
	score := 50.0 // Base score

	// Commit count contribution (up to 20 points)
	commitScore := minFloat(20, float64(effort.CommitPattern.TotalCommits)*2)
	score += commitScore

	// Development span contribution (up to 15 points)
	days := effort.DevelopmentSpan.Hours() / 24
	spanScore := minFloat(15, days*0.5)
	score += spanScore

	// Active days contribution (up to 10 points)
	activeDaysScore := minFloat(10, float64(effort.ActiveDays)*0.5)
	score += activeDaysScore

	// Iteration contribution (up to 5 points)
	iterationScore := minFloat(5, float64(effort.IterationCount))
	score += iterationScore

	// Penalties
	if effort.CommitPattern.HasBulkImport {
		score -= 15
	}

	if effort.CommitPattern.TotalCommits == 1 {
		score -= 20
	}

	return maxFloat(0, minFloat(100, score))
}

// Helper functions

func calculateActiveDays(commits []CommitInfo) int {
	if len(commits) == 0 {
		return 0
	}

	days := make(map[string]bool)
	for _, commit := range commits {
		dateStr := commit.Date.Format("2006-01-02")
		days[dateStr] = true
	}
	return len(days)
}

func countIterations(commits []CommitInfo) int {
	if len(commits) <= 1 {
		return 0
	}

	iterations := 0
	for i, commit := range commits {
		if i == 0 {
			continue
		}
		// Count commits that modify significant portions
		if commit.Additions > 100 || commit.Deletions > 50 {
			iterations++
		}
	}
	return iterations
}

func classifyEffort(score float64, pattern *CommitPattern) EffortClassification {
	if pattern.TotalCommits == 1 || pattern.HasBulkImport {
		if score < 30 {
			return EffortSuspicious
		}
	}

	switch {
	case score >= 80:
		return EffortSignificant
	case score >= 60:
		return EffortModerate
	case score >= 40:
		return EffortMinimal
	default:
		return EffortSuspicious
	}
}

func isTrivialMessage(msg string) bool {
	trivial := []string{
		"update", "fix", "changes", "wip", ".",
		"commit", "stuff", "more", "test",
	}
	msgLower := strings.ToLower(strings.TrimSpace(msg))
	for _, t := range trivial {
		if msgLower == t {
			return true
		}
	}
	return false
}

func isGenericProjectName(name string) bool {
	generic := []string{
		"my-app", "myapp", "test-app", "testapp",
		"hello-world", "helloworld", "sample", "example",
		"demo", "tutorial", "project", "app",
		"frontend", "backend", "api", "web",
	}
	nameLower := strings.ToLower(name)
	for _, g := range generic {
		if nameLower == g {
			return true
		}
	}
	// Check for patterns like "my-project-1"
	matched, _ := regexp.MatchString(`^(my|test|sample|example|demo)-?(\w+)?-?\d*$`, nameLower)
	return matched
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
