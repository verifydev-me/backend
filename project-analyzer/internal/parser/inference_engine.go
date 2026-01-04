package parser

import (
	"github.com/verifydev/project-analyzer/pkg/signals"
)

// ============================================
// LAYER 2: INFERENCE ENGINE
// Converts signals to verified skills using
// deterministic rules - NO AI HALLUCINATION
// ============================================

// SkillRule defines how signals map to a skill
type SkillRule struct {
	SkillName       string
	Category        signals.SkillCategory
	Level           signals.SkillLevel
	RequiredSignals []signals.InfraSignal // ALL must be present
	OptionalSignals []signals.InfraSignal // Boost confidence if present
	MinSignalCount  int                   // Minimum optional signals needed
	BaseConfidence  float64               // Starting confidence
	Weight          int                   // Importance 1-10
	Keywords        []string              // Related keywords
	Evidence        []string              // Default evidence template
}

// InferenceEngine converts infrastructure signals to verified skills
type InferenceEngine struct {
	rules []SkillRule
}

// NewInferenceEngine creates engine with all rules
func NewInferenceEngine() *InferenceEngine {
	engine := &InferenceEngine{}
	engine.loadRules()
	return engine
}

// loadRules defines all signal → skill mappings
func (e *InferenceEngine) loadRules() {
	e.rules = []SkillRule{
		// ============================================
		// ARCHITECTURE SKILLS
		// ============================================
		{
			SkillName:       "Microservices Architecture",
			Category:        signals.CategoryArchitecture,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{signals.SignalMultipleServices},
			OptionalSignals: []signals.InfraSignal{
				signals.SignalDocker, signals.SignalDockerCompose, signals.SignalNginx,
				signals.SignalAPIGatewayPattern, signals.SignalSeparatePorts,
				signals.SignalServiceIsolation, signals.SignalRabbitMQ, signals.SignalKafka,
			},
			MinSignalCount: 2,
			BaseConfidence: 0.75,
			Weight:         10,
			Keywords:       []string{"microservices", "distributed systems", "service mesh", "decomposition"},
			Evidence:       []string{"Multiple independent services detected", "Service isolation verified"},
		},
		{
			SkillName:       "Event-Driven Architecture",
			Category:        signals.CategoryArchitecture,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{},
			OptionalSignals: []signals.InfraSignal{
				signals.SignalRabbitMQ, signals.SignalKafka, signals.SignalRedis,
				signals.SignalMessageProducer, signals.SignalMessageConsumer,
				signals.SignalAsyncCommunication, signals.SignalEventSourcing,
			},
			MinSignalCount: 2,
			BaseConfidence: 0.70,
			Weight:         9,
			Keywords:       []string{"event-driven", "pub/sub", "async", "message-based"},
			Evidence:       []string{"Event-driven communication patterns detected"},
		},
		{
			SkillName:       "API Gateway Pattern",
			Category:        signals.CategoryArchitecture,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalAPIGatewayPattern},
			OptionalSignals: []signals.InfraSignal{
				signals.SignalNginx, signals.SignalTraefik, signals.SignalEnvoy,
				signals.SignalLoadBalancing, signals.SignalRateLimiting,
			},
			MinSignalCount: 1,
			BaseConfidence: 0.80,
			Weight:         7,
			Keywords:       []string{"api gateway", "reverse proxy", "routing", "load balancing"},
			Evidence:       []string{"API Gateway implementation detected"},
		},
		{
			SkillName:       "CQRS Pattern",
			Category:        signals.CategoryArchitecture,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{signals.SignalCQRS},
			OptionalSignals: []signals.InfraSignal{signals.SignalEventSourcing},
			MinSignalCount:  0,
			BaseConfidence:  0.75,
			Weight:          8,
			Keywords:        []string{"cqrs", "command query", "separation", "read model", "write model"},
			Evidence:        []string{"Command/Query separation pattern detected"},
		},

		// ============================================
		// INFRASTRUCTURE SKILLS
		// ============================================
		{
			SkillName:       "Docker & Containerization",
			Category:        signals.CategoryInfrastructure,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalDocker},
			OptionalSignals: []signals.InfraSignal{
				signals.SignalDockerCompose, signals.SignalMultipleServices,
			},
			MinSignalCount: 0,
			BaseConfidence: 0.85,
			Weight:         8,
			Keywords:       []string{"docker", "containers", "containerization", "images"},
			Evidence:       []string{"Dockerfile detected"},
		},
		{
			SkillName:       "Container Orchestration (Docker Compose)",
			Category:        signals.CategoryInfrastructure,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalDockerCompose},
			OptionalSignals: []signals.InfraSignal{
				signals.SignalMultipleServices, signals.SignalDocker,
			},
			MinSignalCount: 0,
			BaseConfidence: 0.85,
			Weight:         7,
			Keywords:       []string{"docker compose", "orchestration", "multi-container"},
			Evidence:       []string{"Docker Compose configuration detected"},
		},
		{
			SkillName:       "Kubernetes",
			Category:        signals.CategoryInfrastructure,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{signals.SignalKubernetes},
			OptionalSignals: []signals.InfraSignal{signals.SignalHelm},
			MinSignalCount:  0,
			BaseConfidence:  0.85,
			Weight:          9,
			Keywords:        []string{"kubernetes", "k8s", "pods", "deployments", "helm"},
			Evidence:        []string{"Kubernetes configurations detected"},
		},
		{
			SkillName:       "Nginx & Reverse Proxy",
			Category:        signals.CategoryInfrastructure,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalNginx},
			OptionalSignals: []signals.InfraSignal{signals.SignalSSL, signals.SignalLoadBalancing},
			MinSignalCount:  0,
			BaseConfidence:  0.85,
			Weight:          7,
			Keywords:        []string{"nginx", "reverse proxy", "load balancer", "web server"},
			Evidence:        []string{"Nginx configuration detected"},
		},

		// ============================================
		// DATABASE SKILLS
		// ============================================
		{
			SkillName:       "PostgreSQL",
			Category:        signals.CategoryDatabase,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalPostgres},
			OptionalSignals: []signals.InfraSignal{signals.SignalPrisma, signals.SignalTypeORM, signals.SignalGORM},
			MinSignalCount:  0,
			BaseConfidence:  0.85,
			Weight:          7,
			Keywords:        []string{"postgresql", "postgres", "sql", "relational database"},
			Evidence:        []string{"PostgreSQL database connection detected"},
		},
		{
			SkillName:       "MongoDB",
			Category:        signals.CategoryDatabase,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalMongoDB},
			OptionalSignals: []signals.InfraSignal{signals.SignalMongoose},
			MinSignalCount:  0,
			BaseConfidence:  0.85,
			Weight:          7,
			Keywords:        []string{"mongodb", "nosql", "document database"},
			Evidence:        []string{"MongoDB database connection detected"},
		},
		{
			SkillName:       "Redis",
			Category:        signals.CategoryDatabase,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalRedis},
			OptionalSignals: []signals.InfraSignal{signals.SignalCaching},
			MinSignalCount:  0,
			BaseConfidence:  0.85,
			Weight:          7,
			Keywords:        []string{"redis", "caching", "in-memory", "key-value"},
			Evidence:        []string{"Redis usage detected"},
		},
		{
			SkillName:       "ORM (Prisma)",
			Category:        signals.CategoryDatabase,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalPrisma},
			OptionalSignals: []signals.InfraSignal{signals.SignalPostgres, signals.SignalMySQL},
			MinSignalCount:  0,
			BaseConfidence:  0.90,
			Weight:          6,
			Keywords:        []string{"prisma", "orm", "database migration", "type-safe"},
			Evidence:        []string{"Prisma ORM detected"},
		},

		// ============================================
		// MESSAGING SKILLS
		// ============================================
		{
			SkillName:       "Message Queues (RabbitMQ)",
			Category:        signals.CategoryMessaging,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{signals.SignalRabbitMQ},
			OptionalSignals: []signals.InfraSignal{
				signals.SignalMessageProducer, signals.SignalMessageConsumer,
				signals.SignalDeadLetterQueue,
			},
			MinSignalCount: 0,
			BaseConfidence: 0.85,
			Weight:         8,
			Keywords:       []string{"rabbitmq", "amqp", "message queue", "pub/sub"},
			Evidence:       []string{"RabbitMQ integration detected"},
		},
		{
			SkillName:       "Apache Kafka",
			Category:        signals.CategoryMessaging,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{signals.SignalKafka},
			OptionalSignals: []signals.InfraSignal{
				signals.SignalMessageProducer, signals.SignalMessageConsumer,
			},
			MinSignalCount: 0,
			BaseConfidence: 0.85,
			Weight:         9,
			Keywords:       []string{"kafka", "streaming", "event streaming", "distributed log"},
			Evidence:       []string{"Apache Kafka integration detected"},
		},

		// ============================================
		// DEVOPS SKILLS
		// ============================================
		{
			SkillName:       "CI/CD Pipeline",
			Category:        signals.CategoryDevOps,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{},
			OptionalSignals: []signals.InfraSignal{
				signals.SignalGitHubActions, signals.SignalGitLabCI,
				signals.SignalJenkins, signals.SignalCircleCI, signals.SignalTravisCI,
			},
			MinSignalCount: 1,
			BaseConfidence: 0.85,
			Weight:         8,
			Keywords:       []string{"ci/cd", "continuous integration", "continuous deployment", "automation"},
			Evidence:       []string{"CI/CD pipeline configuration detected"},
		},
		{
			SkillName:       "GitHub Actions",
			Category:        signals.CategoryDevOps,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalGitHubActions},
			OptionalSignals: []signals.InfraSignal{},
			MinSignalCount:  0,
			BaseConfidence:  0.90,
			Weight:          6,
			Keywords:        []string{"github actions", "workflow", "automation"},
			Evidence:        []string{"GitHub Actions workflows detected"},
		},

		// ============================================
		// SECURITY SKILLS
		// ============================================
		{
			SkillName:       "JWT Authentication",
			Category:        signals.CategorySecurity,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalJWT},
			OptionalSignals: []signals.InfraSignal{signals.SignalOAuth, signals.SignalOAuth2},
			MinSignalCount:  0,
			BaseConfidence:  0.85,
			Weight:          7,
			Keywords:        []string{"jwt", "authentication", "token", "bearer"},
			Evidence:        []string{"JWT authentication implementation detected"},
		},
		{
			SkillName:       "OAuth 2.0",
			Category:        signals.CategorySecurity,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{},
			OptionalSignals: []signals.InfraSignal{signals.SignalOAuth, signals.SignalOAuth2},
			MinSignalCount:  1,
			BaseConfidence:  0.85,
			Weight:          7,
			Keywords:        []string{"oauth", "oauth2", "authorization", "social login"},
			Evidence:        []string{"OAuth implementation detected"},
		},
		{
			SkillName:       "API Security (Rate Limiting, CORS)",
			Category:        signals.CategorySecurity,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{},
			OptionalSignals: []signals.InfraSignal{
				signals.SignalRateLimiting, signals.SignalCORS, signals.SignalHelmet,
			},
			MinSignalCount: 2,
			BaseConfidence: 0.75,
			Weight:         7,
			Keywords:       []string{"rate limiting", "cors", "helmet", "api security"},
			Evidence:       []string{"API security measures detected"},
		},
		{
			SkillName:       "SSL/TLS Configuration",
			Category:        signals.CategorySecurity,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalSSL},
			OptionalSignals: []signals.InfraSignal{signals.SignalNginx},
			MinSignalCount:  0,
			BaseConfidence:  0.80,
			Weight:          6,
			Keywords:        []string{"ssl", "tls", "https", "certificates"},
			Evidence:        []string{"SSL/TLS configuration detected"},
		},

		// ============================================
		// OBSERVABILITY SKILLS
		// ============================================
		{
			SkillName:       "Monitoring & Metrics (Prometheus)",
			Category:        signals.CategoryObservability,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{signals.SignalPrometheus},
			OptionalSignals: []signals.InfraSignal{signals.SignalGrafana, signals.SignalMetricsCollection},
			MinSignalCount:  0,
			BaseConfidence:  0.85,
			Weight:          8,
			Keywords:        []string{"prometheus", "grafana", "metrics", "monitoring"},
			Evidence:        []string{"Prometheus metrics integration detected"},
		},
		{
			SkillName:       "Distributed Tracing",
			Category:        signals.CategoryObservability,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{},
			OptionalSignals: []signals.InfraSignal{
				signals.SignalJaeger, signals.SignalZipkin, signals.SignalDistributedTracing,
			},
			MinSignalCount: 1,
			BaseConfidence: 0.80,
			Weight:         8,
			Keywords:       []string{"tracing", "jaeger", "zipkin", "opentelemetry"},
			Evidence:       []string{"Distributed tracing implementation detected"},
		},
		{
			SkillName:       "Structured Logging",
			Category:        signals.CategoryObservability,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalStructuredLogging},
			OptionalSignals: []signals.InfraSignal{signals.SignalCentralizedLogging},
			MinSignalCount:  0,
			BaseConfidence:  0.85,
			Weight:          6,
			Keywords:        []string{"structured logging", "json logging", "winston", "pino", "zerolog"},
			Evidence:        []string{"Structured logging implementation detected"},
		},
		{
			SkillName:       "Error Tracking (Sentry)",
			Category:        signals.CategoryObservability,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalSentry},
			OptionalSignals: []signals.InfraSignal{},
			MinSignalCount:  0,
			BaseConfidence:  0.90,
			Weight:          6,
			Keywords:        []string{"sentry", "error tracking", "monitoring"},
			Evidence:        []string{"Sentry error tracking detected"},
		},

		// ============================================
		// TESTING SKILLS
		// ============================================
		{
			SkillName:       "Unit Testing",
			Category:        signals.CategoryTesting,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalUnitTests},
			OptionalSignals: []signals.InfraSignal{signals.SignalMocking, signals.SignalTestCoverage},
			MinSignalCount:  0,
			BaseConfidence:  0.85,
			Weight:          7,
			Keywords:        []string{"unit tests", "jest", "mocha", "pytest", "testing"},
			Evidence:        []string{"Unit testing framework detected"},
		},
		{
			SkillName:       "Integration Testing",
			Category:        signals.CategoryTesting,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalIntegrationTests},
			OptionalSignals: []signals.InfraSignal{signals.SignalTestContainers},
			MinSignalCount:  0,
			BaseConfidence:  0.85,
			Weight:          8,
			Keywords:        []string{"integration tests", "api tests", "supertest"},
			Evidence:        []string{"Integration testing detected"},
		},
		{
			SkillName:       "E2E Testing",
			Category:        signals.CategoryTesting,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{signals.SignalE2ETests},
			OptionalSignals: []signals.InfraSignal{},
			MinSignalCount:  0,
			BaseConfidence:  0.85,
			Weight:          8,
			Keywords:        []string{"e2e", "cypress", "playwright", "end-to-end"},
			Evidence:        []string{"E2E testing framework detected"},
		},

		// ============================================
		// CLOUD SKILLS
		// ============================================
		{
			SkillName:       "AWS Cloud Services",
			Category:        signals.CategoryCloud,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalAWS},
			OptionalSignals: []signals.InfraSignal{signals.SignalSQS, signals.SignalDynamoDB},
			MinSignalCount:  0,
			BaseConfidence:  0.80,
			Weight:          8,
			Keywords:        []string{"aws", "amazon", "s3", "ec2", "lambda", "cloud"},
			Evidence:        []string{"AWS SDK/services usage detected"},
		},

		// ============================================
		// RESILIENCE SKILLS
		// ============================================
		{
			SkillName:       "Circuit Breaker Pattern",
			Category:        signals.CategoryArchitecture,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{signals.SignalCircuitBreaker},
			OptionalSignals: []signals.InfraSignal{signals.SignalRetryLogic},
			MinSignalCount:  0,
			BaseConfidence:  0.80,
			Weight:          8,
			Keywords:        []string{"circuit breaker", "fault tolerance", "resilience"},
			Evidence:        []string{"Circuit breaker pattern detected"},
		},
		{
			SkillName:       "Graceful Shutdown",
			Category:        signals.CategoryInfrastructure,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalGracefulShutdown},
			OptionalSignals: []signals.InfraSignal{signals.SignalHealthEndpoints},
			MinSignalCount:  0,
			BaseConfidence:  0.85,
			Weight:          6,
			Keywords:        []string{"graceful shutdown", "signal handling", "cleanup"},
			Evidence:        []string{"Graceful shutdown implementation detected"},
		},
		{
			SkillName:       "Health Check Implementation",
			Category:        signals.CategoryInfrastructure,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalHealthEndpoints},
			OptionalSignals: []signals.InfraSignal{},
			MinSignalCount:  0,
			BaseConfidence:  0.85,
			Weight:          6,
			Keywords:        []string{"health check", "liveness", "readiness"},
			Evidence:        []string{"Health check endpoints detected"},
		},
	}
}

// InferSkills converts infrastructure signals to verified skills
func (e *InferenceEngine) InferSkills(infraSignals *signals.InfrastructureSignals) *signals.IndustryAnalysis {
	analysis := &signals.IndustryAnalysis{
		SkillsByCategory: make(map[signals.SkillCategory][]signals.VerifiedSkill),
		InfraSignals:     infraSignals,
	}

	// Process each rule
	for _, rule := range e.rules {
		skill, valid := e.evaluateRule(rule, infraSignals)
		if valid {
			analysis.AddSkill(skill)
		}
	}

	// Determine architecture type
	analysis.Architecture = e.inferArchitecture(infraSignals, analysis)

	// Calculate scores
	analysis.CalculateOverallScore()
	analysis.DetermineEngineeringLevel()

	return analysis
}

// evaluateRule checks if a rule matches and returns the skill
func (e *InferenceEngine) evaluateRule(rule SkillRule, sigs *signals.InfrastructureSignals) (signals.VerifiedSkill, bool) {
	// Check required signals (ALL must be present)
	for _, reqSig := range rule.RequiredSignals {
		if !sigs.HasSignal(reqSig) {
			return signals.VerifiedSkill{}, false
		}
	}

	// Count optional signals present
	optionalCount := 0
	var matchedSignals []signals.InfraSignal
	var evidenceList []string

	for _, optSig := range rule.OptionalSignals {
		if sigs.HasSignal(optSig) {
			optionalCount++
			matchedSignals = append(matchedSignals, optSig)

			// Add evidence from signal details
			if detail, ok := sigs.SignalDetails[optSig]; ok {
				evidenceList = append(evidenceList, detail.Evidence...)
			}
		}
	}

	// Add required signal evidence
	for _, reqSig := range rule.RequiredSignals {
		matchedSignals = append(matchedSignals, reqSig)
		if detail, ok := sigs.SignalDetails[reqSig]; ok {
			evidenceList = append(evidenceList, detail.Evidence...)
		}
	}

	// Check minimum signal count
	if len(rule.RequiredSignals) == 0 && optionalCount < rule.MinSignalCount {
		return signals.VerifiedSkill{}, false
	}

	// Calculate confidence based on matched signals
	confidence := rule.BaseConfidence
	if len(rule.OptionalSignals) > 0 {
		boostFactor := float64(optionalCount) / float64(len(rule.OptionalSignals)) * 0.15
		confidence += boostFactor
	}
	if confidence > 1.0 {
		confidence = 1.0
	}

	// Use rule evidence if no specific evidence found
	if len(evidenceList) == 0 {
		evidenceList = rule.Evidence
	}

	// Deduplicate evidence
	evidenceList = dedupe(evidenceList)
	if len(evidenceList) > 5 {
		evidenceList = evidenceList[:5]
	}

	skill := signals.VerifiedSkill{
		Name:        rule.SkillName,
		Category:    rule.Category,
		Level:       rule.Level,
		Confidence:  confidence,
		Evidence:    evidenceList,
		Signals:     matchedSignals,
		Keywords:    rule.Keywords,
		Weight:      rule.Weight,
		ResumeReady: confidence >= 0.75,
	}

	return skill, true
}

// inferArchitecture determines the overall system architecture
func (e *InferenceEngine) inferArchitecture(sigs *signals.InfrastructureSignals, analysis *signals.IndustryAnalysis) signals.SystemArchitecture {
	arch := signals.SystemArchitecture{
		ServiceCount: sigs.ServiceCount,
		Services:     sigs.ServiceNames,
		Patterns:     []string{},
	}

	// Determine architecture type
	if sigs.HasSignal(signals.SignalMultipleServices) && sigs.ServiceCount >= 2 {
		arch.Type = signals.ArchMicroservice
	} else if sigs.HasSignal(signals.SignalEventSourcing) || sigs.HasSignal(signals.SignalCQRS) {
		arch.Type = signals.ArchEventDriven
	} else {
		arch.Type = signals.ArchMonolith
	}

	// Determine communication types
	if sigs.HasSignal(signals.SignalRabbitMQ) || sigs.HasSignal(signals.SignalKafka) {
		arch.Communication = append(arch.Communication, signals.CommMessage)
	}
	if sigs.HasSignal(signals.SignalAsyncCommunication) {
		arch.Communication = append(arch.Communication, signals.CommEvent)
	}
	// Default to HTTP
	if len(arch.Communication) == 0 {
		arch.Communication = []signals.CommunicationType{signals.CommHTTP}
	} else {
		// Add HTTP as services typically also communicate via HTTP
		arch.Communication = append(arch.Communication, signals.CommHTTP)
	}

	// Determine gateway
	if sigs.HasSignal(signals.SignalNginx) {
		arch.Gateway = "Nginx"
	} else if sigs.HasSignal(signals.SignalTraefik) {
		arch.Gateway = "Traefik"
	} else if sigs.HasSignal(signals.SignalEnvoy) {
		arch.Gateway = "Envoy"
	}

	// Collect patterns
	patternSignals := map[signals.InfraSignal]string{
		signals.SignalAPIGatewayPattern: "API Gateway",
		signals.SignalCircuitBreaker:    "Circuit Breaker",
		signals.SignalRetryLogic:        "Retry Logic",
		signals.SignalHealthEndpoints:   "Health Checks",
		signals.SignalGracefulShutdown:  "Graceful Shutdown",
		signals.SignalCQRS:              "CQRS",
		signals.SignalEventSourcing:     "Event Sourcing",
		signals.SignalSagaPattern:       "Saga Pattern",
	}

	for sig, pattern := range patternSignals {
		if sigs.HasSignal(sig) {
			arch.Patterns = append(arch.Patterns, pattern)
		}
	}

	// Determine engineering level
	arch.EngineeringLevel = analysis.DetermineEngineeringLevel()

	return arch
}

// dedupe removes duplicate strings
func dedupe(slice []string) []string {
	seen := make(map[string]bool)
	var result []string
	for _, s := range slice {
		if !seen[s] {
			seen[s] = true
			result = append(result, s)
		}
	}
	return result
}
