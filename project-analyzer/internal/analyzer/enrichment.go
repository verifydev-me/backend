package analyzer

// ============================================
// TECH STACK ENRICHMENT
// Maps infrastructure signals to user-friendly tech lists
// Also handles authorship penalty, trust analysis,
// dimensional analysis, and verdict generation
// ============================================

import (
	"fmt"

	"github.com/rs/zerolog/log"
	"github.com/verifydev/project-analyzer/internal/intelligence"
	"github.com/verifydev/project-analyzer/pkg/dimensions"
	"github.com/verifydev/project-analyzer/pkg/signals"
	"github.com/verifydev/project-analyzer/pkg/trust"
	"github.com/verifydev/project-analyzer/pkg/verdict"
)

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

// applyAuthorshipPenaltyToSkills adjusts skill confidence based on authorship analysis
// Snapshot/copied projects get reduced confidence to prevent fake resume skills
func applyAuthorshipPenaltyToSkills(analysis *signals.IndustryAnalysis, authorship *signals.AuthorshipVerdict) {
	if authorship == nil || analysis == nil {
		return
	}

	var penaltyMultiplier float64
	switch authorship.Level {
	case "SNAPSHOT":
		penaltyMultiplier = 0.90
	case "SUSPICIOUS":
		penaltyMultiplier = 0.85
	case "ASSISTED":
		penaltyMultiplier = 0.95
	case "ORGANIC":
		if authorship.Confidence == "HIGH" {
			penaltyMultiplier = 1.05
		} else {
			penaltyMultiplier = 1.0
		}
	default:
		penaltyMultiplier = 1.0
	}

	for i := range analysis.VerifiedSkills {
		skill := &analysis.VerifiedSkills[i]
		skill.Confidence *= penaltyMultiplier
		if skill.Confidence > 1.0 {
			skill.Confidence = 1.0
		}
		skill.ResumeReady = skill.Confidence >= 0.4
	}

	for cat, skills := range analysis.SkillsByCategory {
		for i := range skills {
			skills[i].Confidence *= penaltyMultiplier
			if skills[i].Confidence > 1.0 {
				skills[i].Confidence = 1.0
			}
			skills[i].ResumeReady = skills[i].Confidence >= 0.4
		}
		analysis.SkillsByCategory[cat] = skills
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

// syncUsageVerification syncs usage verification from IntelligenceVerdict to IndustryAnalysis
// aura-processor reads IndustryAnalysis.VerifiedSkills for DB storage
func syncUsageVerification(result *signals.ProjectSignals) {
	if result.IntelligenceVerdict == nil || result.IndustryAnalysis == nil {
		return
	}

	verifiedMap := make(map[string]bool)
	strengthMap := make(map[string]float64)

	for _, s := range result.IntelligenceVerdict.ExtractedSkills {
		if s.UsageVerified {
			verifiedMap[s.Name] = true
			strengthMap[s.Name] = s.UsageStrength
		}
	}

	for i := range result.IndustryAnalysis.VerifiedSkills {
		skillName := result.IndustryAnalysis.VerifiedSkills[i].Name
		if verifiedMap[skillName] {
			result.IndustryAnalysis.VerifiedSkills[i].UsageVerified = true
			result.IndustryAnalysis.VerifiedSkills[i].UsageStrength = strengthMap[skillName]
		}
	}
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
