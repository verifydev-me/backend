package analyzer

// ============================================
// TECH STACK ENRICHMENT
// Maps infrastructure signals to user-friendly tech lists
// Also handles authorship penalty, trust analysis,
// dimensional analysis, and verdict generation
// ============================================

import (
	"fmt"
	"strings"
	"time"

	"github.com/rs/zerolog/log"
	"github.com/verifydev/project-analyzer/internal/intelligence"
	"github.com/verifydev/project-analyzer/pkg/dimensions"
	"github.com/verifydev/project-analyzer/pkg/signals"
	"github.com/verifydev/project-analyzer/pkg/trust"
	"github.com/verifydev/project-analyzer/pkg/verdict"
)

// normalizeSkillName normalizes a skill name for case-insensitive matching
// Maps common aliases to canonical names (e.g., "Postgres" → "postgresql")
func normalizeSkillName(name string) string {
	lower := strings.ToLower(strings.TrimSpace(name))
	// Common aliases
	aliases := map[string]string{
		"postgres":       "postgresql",
		"mongo":          "mongodb",
		"k8s":            "kubernetes",
		"es":             "elasticsearch",
		"elastic":        "elasticsearch",
		"js":             "javascript",
		"ts":             "typescript",
		"node":           "node.js",
		"nodejs":         "node.js",
		"react.js":       "react",
		"reactjs":        "react",
		"vue":            "vue.js",
		"vuejs":          "vue.js",
		"next":           "next.js",
		"nextjs":         "next.js",
		"nest":           "nestjs",
		"nest.js":        "nestjs",
		"tailwindcss":    "tailwind css",
		"tailwind":       "tailwind css",
		"docker-compose": "docker compose",
		"docker_compose": "docker compose",
		"github-actions": "github actions",
		"github_actions": "github actions",
		"gitlab-ci":      "gitlab ci",
		"gitlab_ci":      "gitlab ci",
		"aws-s3":         "aws s3",
		"aws_s3":         "aws s3",
		"aws-sqs":        "aws sqs",
		"aws_sqs":        "aws sqs",
		"react-query":    "react query",
		"react_query":    "react query",
		"framer-motion":  "framer motion",
		"framer_motion":  "framer motion",
		"opentelemetry":  "opentelemetry",
		"open_telemetry": "opentelemetry",
		"solidjs":        "solid.js",
		"solid":          "solid.js",
		"expressjs":      "express.js",
		"express":        "express.js",
		"gin-gonic":      "gin",
		"gofiber":        "fiber",
		"labstack/echo":  "echo",
	}
	if canonical, ok := aliases[lower]; ok {
		return canonical
	}
	return lower
}

// enrichTechStack maps infra signals to user-friendly tech lists
func enrichTechStack(result *signals.ProjectSignals, infra *signals.InfrastructureSignals) {
	if infra == nil {
		return
	}

	mapping := map[string]string{
		// Databases
		"postgres": "PostgreSQL", "mysql": "MySQL", "mongodb": "MongoDB", "redis": "Redis",
		"dynamodb": "DynamoDB", "cassandra": "Cassandra", "elasticsearch": "Elasticsearch",
		"sqlite": "SQLite", "mariadb": "MariaDB", "firestore": "Firestore",
		"prisma": "Prisma", "typeorm": "TypeORM", "gorm": "GORM", "mongoose": "Mongoose",

		// DevOps & Cloud
		"docker": "Docker", "docker_compose": "Docker Compose", "kubernetes": "Kubernetes",
		"aws": "AWS", "gcp": "Google Cloud", "azure": "Azure", "s3": "AWS S3",
		"terraform": "Terraform", "pulumi": "Pulumi", "helm": "Helm",
		"github_actions": "GitHub Actions", "gitlab_ci": "GitLab CI", "jenkins": "Jenkins",
		"vercel": "Vercel", "netlify": "Netlify", "supabase": "Supabase", "firebase": "Firebase",

		// Message Queues
		"kafka": "Kafka", "rabbitmq": "RabbitMQ", "sqs": "AWS SQS", "nats": "NATS",

		// Frontend Frameworks
		"react": "React", "nextjs": "Next.js", "vue": "Vue.js", "angular": "Angular",
		"svelte": "Svelte", "tailwind": "Tailwind CSS", "redux": "Redux", "zustand": "Zustand",
		"solidjs": "Solid.js", "preact": "Preact",
		"react_query": "React Query", "framer_motion": "Framer Motion",

		// Backend Frameworks
		"nestjs": "NestJS", "express": "Express", "fastify": "Fastify",
		"gin": "Gin", "echo": "Echo", "fiber": "Fiber",
		"django": "Django", "flask": "Flask", "fastapi": "FastAPI",
		"graphql": "GraphQL", "grpc": "gRPC", "websocket": "WebSocket",

		// Testing
		"jest": "Jest", "cypress": "Cypress", "playwright": "Playwright",

		// Observability
		"prometheus": "Prometheus", "grafana": "Grafana", "sentry": "Sentry",
		"datadog": "Datadog", "opentelemetry": "OpenTelemetry",
	}

	// Explicit framework detection
	frameworkSignals := map[signals.InfraSignal]string{
		signals.SignalReact:      "React",
		signals.SignalNextJS:     "Next.js",
		signals.SignalVue:        "Vue.js",
		signals.SignalAngular:    "Angular",
		signals.SignalNestJS:     "NestJS",
		signals.SignalExpress:    "Express",
		signals.SignalGin:        "Gin",
		signals.SignalDjango:     "Django",
		signals.SignalTailwind:   "Tailwind CSS",
		signals.SignalZustand:    "Zustand",
		signals.SignalRedux:      "Redux",
		signals.SignalReactQuery: "React Query",
		signals.SignalSolidJS:    "Solid.js",
		signals.SignalPreact:     "Preact",
	}

	for sig, name := range frameworkSignals {
		if infra.HasSignal(sig) {
			result.Frameworks = appendUnique(result.Frameworks, name)
		}
	}

	// Track uniqueness
	uniqueTech := make(map[string]bool)
	for _, t := range result.Databases {
		uniqueTech[t] = true
	}
	for _, t := range result.Tools {
		uniqueTech[t] = true
	}
	for _, t := range result.Frameworks {
		uniqueTech[t] = true
	}

	// Enrich from signals using mapping
	for signal := range infra.SignalDetails {
		sigStr := string(signal)
		if name, ok := mapping[sigStr]; ok {
			if !uniqueTech[name] {
				if isDatabase(name) {
					result.Databases = append(result.Databases, name)
				} else if isTool(name) {
					result.Tools = append(result.Tools, name)
				} else {
					result.Frameworks = append(result.Frameworks, name)
				}
				uniqueTech[name] = true
			}
		}
	}
}

// enrichVerdictWithDimensionalAnalysis runs dimensional engine, trust analysis,
// and verdict generation, then enriches the result
func enrichVerdictWithDimensionalAnalysis(
	result *signals.ProjectSignals,
	intelligenceResult *intelligence.PipelineResult,
	infraSignals *signals.InfrastructureSignals,
) {
	extractor := dimensions.NewDimensionExtractor(result, infraSignals)
	dimMatrix := extractor.Extract()

	if dimMatrix == nil || result.IntelligenceVerdict == nil {
		return
	}

	// Map dimensional scores
	result.IntelligenceVerdict.Dimensions = &signals.DimensionalScores{
		Fundamentals: &signals.DimensionScoreData{
			Score:      dimMatrix.Fundamentals.Score,
			Confidence: dimMatrix.Fundamentals.Confidence,
			Signals:    dimMatrix.Fundamentals.Signals,
		},
		EngineeringDepth: &signals.DimensionScoreData{
			Score:      dimMatrix.EngineeringDepth.Score,
			Confidence: dimMatrix.EngineeringDepth.Confidence,
			Signals:    dimMatrix.EngineeringDepth.Signals,
		},
		ProductionReady: &signals.DimensionScoreData{
			Score:      dimMatrix.ProductionReadiness.Score,
			Confidence: dimMatrix.ProductionReadiness.Confidence,
			Signals:    dimMatrix.ProductionReadiness.Signals,
		},
		TestingMaturity: &signals.DimensionScoreData{
			Score:      dimMatrix.TestingMaturity.Score,
			Confidence: dimMatrix.TestingMaturity.Confidence,
			Signals:    dimMatrix.TestingMaturity.Signals,
		},
		Architecture: &signals.DimensionScoreData{
			Score:      dimMatrix.Architecture.Score,
			Confidence: dimMatrix.Architecture.Confidence,
			Signals:    dimMatrix.Architecture.Signals,
		},
		InfraDevOps: &signals.DimensionScoreData{
			Score:      dimMatrix.InfraDevOps.Score,
			Confidence: dimMatrix.InfraDevOps.Confidence,
			Signals:    dimMatrix.InfraDevOps.Signals,
		},
		OverallScore:     dimMatrix.OverallScore,
		OverallBandLower: int(dimMatrix.OverallBand.Lower),
		OverallBandUpper: int(dimMatrix.OverallBand.Upper),
	}

	log.Info().
		Float64("dimOverall", dimMatrix.OverallScore).
		Float64("fundamentals", dimMatrix.Fundamentals.Score).
		Float64("engineering", dimMatrix.EngineeringDepth.Score).
		Msg("🎯 Dimensional analysis complete")

	// Trust Analysis
	enrichWithTrustAnalysis(result, infraSignals)

	// Experience & Verdict
	enrichWithVerdict(result, dimMatrix)

	// Sync Usage Verification from IntelligenceVerdict to IndustryAnalysis
	syncUsageVerification(result)
}

// enrichWithTrustAnalysis runs trust engine and maps results
func enrichWithTrustAnalysis(result *signals.ProjectSignals, infraSignals *signals.InfrastructureSignals) {
	var commitData *trust.CommitData
	if result.GitForensics != nil {
		commitData = &trust.CommitData{
			TotalCommits: result.GitForensics.CommitCount,
		}
		// Parse commit dates from GitForensics metadata if available
		if result.GitForensics.FirstCommitDate != "" {
			if t, err := parseFlexibleDate(result.GitForensics.FirstCommitDate); err == nil {
				commitData.FirstCommit = t
			}
		}
		if result.GitForensics.LastCommitDate != "" {
			if t, err := parseFlexibleDate(result.GitForensics.LastCommitDate); err == nil {
				commitData.LastCommit = t
			}
		}
	}

	trustAnalyzer := trust.NewTrustAnalyzer(result, infraSignals, commitData)
	trustResult := trustAnalyzer.Analyze()
	if trustResult == nil {
		return
	}

	result.IntelligenceVerdict.TrustAnalysis = &signals.TrustAnalysisDetailed{
		Score:             trustResult.OverallTrust.Score,
		Level:             string(trustResult.OverallTrust.Classification),
		EffortScore:       trustResult.Effort.EffortScore,
		EffortClass:       string(trustResult.Effort.Classification),
		AuthenticityScore: trustResult.Authenticity.AuthenticityScore,
		IsLearning:        trustResult.Learning.IsLikelyLearning,
		LearningScore:     trustResult.Learning.LearningScore * 100,
		ConsistencyScore:  trustResult.Consistency.ConsistencyScore,
		HasOriginalWork:   trustResult.Authenticity.AuthenticityScore >= 60,
		Flags:             extractTrustFlags(trustResult),
	}

	log.Info().
		Float64("trustScore", trustResult.OverallTrust.Score).
		Str("trustLevel", string(trustResult.OverallTrust.Classification)).
		Msg("🔒 Trust analysis complete")
}

// enrichWithVerdict generates experience analysis and detailed verdict
func enrichWithVerdict(result *signals.ProjectSignals, dimMatrix *dimensions.DimensionMatrix) {
	verdictGen := verdict.NewVerdictGenerator(dimMatrix)
	verdictResult := verdictGen.Generate()
	if verdictResult == nil {
		return
	}

	// Map experience analysis
	result.IntelligenceVerdict.ExperienceAnalysis = &signals.ExperienceAnalysis{
		Level:           string(verdictResult.Experience.Level),
		Confidence:      verdictResult.Experience.Confidence,
		YearsMin:        int(verdictResult.Experience.EstimatedYears.Min),
		YearsMax:        int(verdictResult.Experience.EstimatedYears.Max),
		YearsEstimate:   verdictResult.Experience.EstimatedYears.Estimate,
		MatchingFactors: verdictResult.Experience.SupportingSignals,
	}

	// Map verdict detailed
	strengthTexts := make([]string, 0, len(verdictResult.Strengths))
	for _, s := range verdictResult.Strengths {
		strengthTexts = append(strengthTexts, s.Statement)
	}
	growthTexts := make([]string, 0, len(verdictResult.GrowthAreas))
	for _, g := range verdictResult.GrowthAreas {
		growthTexts = append(growthTexts, g.Statement)
	}

	result.IntelligenceVerdict.VerdictDetailed = &signals.VerdictDetailed{
		Summary:        verdictResult.Summary,
		Strengths:      strengthTexts,
		GrowthAreas:    growthTexts,
		Cautions:       verdictResult.Cautions,
		Recommendation: verdictResult.HiringRecommendation,
	}

	log.Info().
		Str("experienceLevel", string(verdictResult.Experience.Level)).
		Float64("experienceConfidence", verdictResult.Experience.Confidence).
		Int("strengths", len(verdictResult.Strengths)).
		Int("growthAreas", len(verdictResult.GrowthAreas)).
		Msg("📋 Verdict generation complete")
}

// syncUsageVerification syncs usage verification AND evidence from IntelligenceVerdict to IndustryAnalysis
// aura-processor reads IndustryAnalysis.VerifiedSkills for DB storage
func syncUsageVerification(result *signals.ProjectSignals) {
	if result.IntelligenceVerdict == nil || result.IndustryAnalysis == nil {
		return
	}

	// Build normalized lookup maps for intelligence skills
	verifiedMap := make(map[string]bool)
	strengthMap := make(map[string]float64)
	evidenceMap := make(map[string][]string)
	confidenceMap := make(map[string]int) // intelligence confidence (0-100)

	for _, s := range result.IntelligenceVerdict.ExtractedSkills {
		normalizedName := normalizeSkillName(s.Name)
		if s.UsageVerified {
			verifiedMap[normalizedName] = true
			strengthMap[normalizedName] = s.UsageStrength
		}
		// Always collect evidence from intelligence pipeline (Bug #2 fix)
		if len(s.Evidence) > 0 {
			evidenceMap[normalizedName] = s.Evidence
		}
		confidenceMap[normalizedName] = s.Confidence
	}

	mergedCount := 0
	for i := range result.IndustryAnalysis.VerifiedSkills {
		normalizedName := normalizeSkillName(result.IndustryAnalysis.VerifiedSkills[i].Name)

		// Sync usage verification (case-insensitive)
		if verifiedMap[normalizedName] {
			result.IndustryAnalysis.VerifiedSkills[i].UsageVerified = true
			result.IndustryAnalysis.VerifiedSkills[i].UsageStrength = strengthMap[normalizedName]
		}

		// Merge evidence from intelligence pipeline into VerifiedSkills
		// This is the critical fix: intelligence evidence was being lost
		if intEvidence, ok := evidenceMap[normalizedName]; ok {
			existingEvidence := make(map[string]bool)
			for _, e := range result.IndustryAnalysis.VerifiedSkills[i].Evidence {
				existingEvidence[e] = true
			}
			for _, e := range intEvidence {
				if !existingEvidence[e] {
					result.IndustryAnalysis.VerifiedSkills[i].Evidence = append(
						result.IndustryAnalysis.VerifiedSkills[i].Evidence, e,
					)
				}
			}
			mergedCount++
		}
	}

	log.Debug().
		Int("mergedEvidence", mergedCount).
		Int("verifiedCount", len(verifiedMap)).
		Msg("📊 syncUsageVerification: merged intelligence evidence into VerifiedSkills")
}

// extractTrustFlags converts trust flags to string slice for JSON output
func extractTrustFlags(trustResult *trust.TrustAnalysis) []string {
	flags := make([]string, 0, len(trustResult.Flags))
	for _, f := range trustResult.Flags {
		flags = append(flags, fmt.Sprintf("[%s] %s", f.Type, f.Message))
	}
	for _, issue := range trustResult.Consistency.Issues {
		flags = append(flags, fmt.Sprintf("[%s] %s: %s", issue.Severity, issue.Type, issue.Evidence))
	}
	return flags
}

// ============================================
// BAYESIAN CONFIDENCE → VERIFIED SKILLS SYNC
// Ensures IndustryAnalysis.VerifiedSkills uses
// the Bayesian-calibrated posteriors (Phase 3)
// as the single source of truth for confidence
// ============================================

// syncBayesianConfidenceToSkills applies Bayesian posteriors from ConfidenceReport
// to IndustryAnalysis.VerifiedSkills. This is critical because:
// 1. aura-processor reads IndustryAnalysis.VerifiedSkills for DB storage
// 2. Without this sync, stored skills use the uncalibrated inference-engine confidence
// 3. Bayesian posteriors incorporate AST, graph, infra, quality, and git evidence
func syncBayesianConfidenceToSkills(result *signals.ProjectSignals) {
	if result.ConfidenceReport == nil || result.IndustryAnalysis == nil {
		return
	}

	posteriors := result.ConfidenceReport.SkillConfidences
	if len(posteriors) == 0 {
		return
	}

	// Build lookup map: normalized skillName → Bayesian posterior data
	bayesianMap := make(map[string]*signals.SkillBayesianResult, len(posteriors))
	for i := range posteriors {
		bayesianMap[normalizeSkillName(posteriors[i].SkillName)] = &posteriors[i]
	}

	updatedCount := 0
	addedCount := 0

	// Phase A: Update existing VerifiedSkills with Bayesian posteriors
	matched := make(map[string]bool)
	for i := range result.IndustryAnalysis.VerifiedSkills {
		skill := &result.IndustryAnalysis.VerifiedSkills[i]
		normalizedName := normalizeSkillName(skill.Name)
		bayesian, exists := bayesianMap[normalizedName]
		if !exists {
			continue
		}

		matched[normalizedName] = true
		oldConf := skill.Confidence

		// Apply Bayesian posterior as the new confidence
		skill.Confidence = bayesian.Posterior

		// Update resume readiness from Bayesian assessment
		skill.ResumeReady = bayesian.ResumeReady

		// Update usage verification if Bayesian found stronger evidence
		if bayesian.UsageVerified && !skill.UsageVerified {
			skill.UsageVerified = true
		}
		if bayesian.UsageStrength > skill.UsageStrength {
			skill.UsageStrength = bayesian.UsageStrength
		}

		// Update skill level based on calibrated confidence
		skill.Level = confidenceToLevel(bayesian.Posterior)

		updatedCount++

		log.Trace().
			Str("skill", skill.Name).
			Float64("oldConfidence", oldConf).
			Float64("newConfidence", bayesian.Posterior).
			Bool("resumeReady", skill.ResumeReady).
			Msg("📊 Bayesian sync: updated skill confidence")
	}

	// Phase B: Add Bayesian-only skills (detected by graph/AST but not by inference engine)
	for i := range posteriors {
		bayesian := &posteriors[i]
		if matched[normalizeSkillName(bayesian.SkillName)] {
			continue
		}

		// Only add skills with meaningful posterior (> 0.3) to avoid noise
		if bayesian.Posterior < 0.3 {
			continue
		}

		newSkill := signals.VerifiedSkill{
			Name:          bayesian.SkillName,
			Category:      sanitizeCategory(bayesian.Category),
			Level:         confidenceToLevel(bayesian.Posterior),
			Confidence:    bayesian.Posterior,
			Evidence:      buildBayesianEvidence(bayesian),
			ResumeReady:   bayesian.ResumeReady,
			Weight:        5, // Default weight for Bayesian-discovered skills
			UsageVerified: bayesian.UsageVerified,
			UsageStrength: bayesian.UsageStrength,
		}

		result.IndustryAnalysis.VerifiedSkills = append(result.IndustryAnalysis.VerifiedSkills, newSkill)
		matched[normalizeSkillName(bayesian.SkillName)] = true
		addedCount++

		log.Trace().
			Str("skill", bayesian.SkillName).
			Float64("posterior", bayesian.Posterior).
			Msg("📊 Bayesian sync: added new skill from Phase 3")
	}

	// Phase B+: Merge graph-inferred skills that aren't in Bayesian posteriors
	// Graph skills like "RESTful API Development", "Real-time App Development"
	// are composite skills inferred from technology graph clusters
	if result.TechDependencyGraph != nil {
		for _, graphSkill := range result.TechDependencyGraph.InferredSkills {
			if matched[normalizeSkillName(graphSkill.Name)] {
				continue
			}
			if graphSkill.Confidence < 0.4 {
				continue
			}

			newSkill := signals.VerifiedSkill{
				Name:        graphSkill.Name,
				Category:    sanitizeCategory(graphSkill.Category),
				Level:       signals.SkillLevel(graphSkill.Level),
				Confidence:  graphSkill.Confidence,
				Evidence:    []string{graphSkill.Reasoning},
				ResumeReady: graphSkill.ResumeReady,
				Weight:      6,
			}

			result.IndustryAnalysis.VerifiedSkills = append(result.IndustryAnalysis.VerifiedSkills, newSkill)
			matched[normalizeSkillName(graphSkill.Name)] = true
			addedCount++

			log.Debug().
				Str("skill", graphSkill.Name).
				Float64("confidence", graphSkill.Confidence).
				Msg("📊 Graph sync: added inferred skill to VerifiedSkills")
		}
	}

	// Phase C: Rebuild SkillsByCategory map and summary counters
	result.IndustryAnalysis.SkillsByCategory = make(map[signals.SkillCategory][]signals.VerifiedSkill)
	result.IndustryAnalysis.TotalSkills = 0
	result.IndustryAnalysis.HighConfidenceSkills = 0
	result.IndustryAnalysis.ResumeReadySkills = 0

	for _, skill := range result.IndustryAnalysis.VerifiedSkills {
		result.IndustryAnalysis.SkillsByCategory[skill.Category] = append(
			result.IndustryAnalysis.SkillsByCategory[skill.Category], skill,
		)
		result.IndustryAnalysis.TotalSkills++
		if skill.Confidence >= 0.8 {
			result.IndustryAnalysis.HighConfidenceSkills++
		}
		if skill.ResumeReady {
			result.IndustryAnalysis.ResumeReadySkills++
		}
	}

	// Recalculate overall score with updated confidences
	result.IndustryAnalysis.CalculateOverallScore()
	result.IndustryAnalysis.DetermineEngineeringLevel()

	log.Info().
		Int("updatedSkills", updatedCount).
		Int("addedSkills", addedCount).
		Int("totalSkills", result.IndustryAnalysis.TotalSkills).
		Int("highConfidence", result.IndustryAnalysis.HighConfidenceSkills).
		Int("resumeReady", result.IndustryAnalysis.ResumeReadySkills).
		Str("engineeringLevel", result.IndustryAnalysis.EngineeringLevel).
		Msg("✅ Bayesian confidence synced to VerifiedSkills")
}

// sanitizeCategory maps raw category strings to valid Prisma SkillCategory values.
// The Prisma schema only accepts specific enum values; invalid values like "frontend"
// or "backend" cause PrismaClientUnknownRequestError at read time.
func sanitizeCategory(raw string) signals.SkillCategory {
	lower := strings.ToLower(strings.TrimSpace(raw))
	switch lower {
	case "language":
		return signals.CategoryLanguage
	case "framework":
		return signals.CategoryFramework
	case "database":
		return signals.CategoryDatabase
	case "devops":
		return signals.CategoryDevOps
	case "infrastructure":
		return signals.CategoryInfrastructure
	case "messaging":
		return signals.CategoryMessaging
	case "testing":
		return signals.CategoryTesting
	case "cloud":
		return signals.CategoryCloud
	case "security":
		return signals.CategorySecurity
	case "observability":
		return signals.CategoryObservability
	case "architecture":
		return signals.CategoryArchitecture
	case "performance":
		return signals.CategoryPerformance
	case "ml":
		return signals.CategoryML
	case "data_science":
		return signals.CategoryDataScience
	// Map invalid categories to closest valid ones
	case "frontend":
		return signals.CategoryFramework
	case "backend":
		return signals.CategoryFramework
	case "fullstack":
		return signals.CategoryArchitecture
	case "container", "containerization":
		return signals.CategoryInfrastructure
	case "cicd", "ci_cd":
		return signals.CategoryDevOps
	case "cache", "search":
		return signals.CategoryDatabase
	case "pattern":
		return signals.CategoryArchitecture
	default:
		log.Warn().Str("category", raw).Msg("⚠️ Unknown skill category, defaulting to framework")
		return signals.CategoryFramework
	}
}

// confidenceToLevel maps a 0.0-1.0 confidence score to a skill level
func confidenceToLevel(confidence float64) signals.SkillLevel {
	switch {
	case confidence >= 0.85:
		return signals.LevelExpert
	case confidence >= 0.65:
		return signals.LevelAdvanced
	case confidence >= 0.45:
		return signals.LevelIntermediate
	default:
		return signals.LevelBasic
	}
}

// buildBayesianEvidence creates human-readable evidence from Bayesian components
func buildBayesianEvidence(bayesian *signals.SkillBayesianResult) []string {
	evidence := make([]string, 0, 4)
	if bayesian.ASTEvidence > 0.5 {
		evidence = append(evidence, fmt.Sprintf("AST analysis detected usage (%.0f%% confidence)", bayesian.ASTEvidence*100))
	}
	if bayesian.InfraEvidence > 0.5 {
		evidence = append(evidence, fmt.Sprintf("Infrastructure signals detected (%.0f%% confidence)", bayesian.InfraEvidence*100))
	}
	if bayesian.GraphEvidence > 0.5 {
		evidence = append(evidence, fmt.Sprintf("Dependency graph confirms usage (%.0f%% confidence)", bayesian.GraphEvidence*100))
	}
	if bayesian.UsageVerified {
		evidence = append(evidence, fmt.Sprintf("Code usage verified (%.0f%% strength)", bayesian.UsageStrength*100))
	}
	if len(evidence) == 0 {
		evidence = append(evidence, fmt.Sprintf("Bayesian posterior: %.0f%%", bayesian.Posterior*100))
	}
	return evidence
}

// parseFlexibleDate tries multiple date formats to parse a string into time.Time
func parseFlexibleDate(dateStr string) (time.Time, error) {
	formats := []string{
		time.RFC3339,
		"2006-01-02T15:04:05Z",
		"2006-01-02T15:04:05-07:00",
		"2006-01-02 15:04:05",
		"2006-01-02",
	}
	for _, format := range formats {
		if t, err := time.Parse(format, dateStr); err == nil {
			return t, nil
		}
	}
	return time.Time{}, fmt.Errorf("unable to parse date: %s", dateStr)
}
