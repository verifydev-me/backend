package inference

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

		// ============================================
		// EXTREME LEVEL SKILLS - CLOUD NATIVE
		// ============================================
		{
			SkillName:       "Infrastructure as Code (Terraform)",
			Category:        signals.CategoryDevOps,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{signals.SignalTerraform},
			OptionalSignals: []signals.InfraSignal{signals.SignalIaC, signals.SignalAWS, signals.SignalGCP, signals.SignalAzure},
			MinSignalCount:  0,
			BaseConfidence:  0.90,
			Weight:          9,
			Keywords:        []string{"terraform", "infrastructure as code", "iac", "hcl", "provisioning"},
			Evidence:        []string{"Terraform IaC configuration detected"},
		},
		{
			SkillName:       "Infrastructure as Code (Pulumi)",
			Category:        signals.CategoryDevOps,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{signals.SignalPulumi},
			OptionalSignals: []signals.InfraSignal{signals.SignalIaC},
			MinSignalCount:  0,
			BaseConfidence:  0.90,
			Weight:          9,
			Keywords:        []string{"pulumi", "infrastructure as code", "cloud engineering"},
			Evidence:        []string{"Pulumi IaC configuration detected"},
		},
		{
			SkillName:       "AWS CloudFormation / SAM",
			Category:        signals.CategoryCloud,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{signals.SignalCloudFormation},
			OptionalSignals: []signals.InfraSignal{signals.SignalAWS, signals.SignalLambda},
			MinSignalCount:  0,
			BaseConfidence:  0.90,
			Weight:          8,
			Keywords:        []string{"cloudformation", "sam", "aws", "serverless"},
			Evidence:        []string{"CloudFormation/SAM templates detected"},
		},
		{
			SkillName:       "Serverless Architecture",
			Category:        signals.CategoryArchitecture,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{},
			OptionalSignals: []signals.InfraSignal{signals.SignalServerless, signals.SignalLambda},
			MinSignalCount:  1,
			BaseConfidence:  0.85,
			Weight:          9,
			Keywords:        []string{"serverless", "faas", "lambda", "cloud functions"},
			Evidence:        []string{"Serverless architecture patterns detected"},
		},
		{
			SkillName:       "Service Mesh (Istio)",
			Category:        signals.CategoryInfrastructure,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{signals.SignalIstio},
			OptionalSignals: []signals.InfraSignal{signals.SignalServiceMesh, signals.SignalKubernetes},
			MinSignalCount:  0,
			BaseConfidence:  0.90,
			Weight:          9,
			Keywords:        []string{"istio", "service mesh", "sidecar", "envoy"},
			Evidence:        []string{"Istio service mesh configuration detected"},
		},
		{
			SkillName:       "Service Mesh Architecture",
			Category:        signals.CategoryArchitecture,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{signals.SignalServiceMesh},
			OptionalSignals: []signals.InfraSignal{signals.SignalIstio, signals.SignalLinkerd, signals.SignalConsul},
			MinSignalCount:  0,
			BaseConfidence:  0.85,
			Weight:          9,
			Keywords:        []string{"service mesh", "sidecar proxy", "traffic management"},
			Evidence:        []string{"Service mesh architecture detected"},
		},
		{
			SkillName:       "HashiCorp Vault",
			Category:        signals.CategorySecurity,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{signals.SignalVault},
			OptionalSignals: []signals.InfraSignal{},
			MinSignalCount:  0,
			BaseConfidence:  0.90,
			Weight:          8,
			Keywords:        []string{"vault", "secrets management", "hashicorp"},
			Evidence:        []string{"HashiCorp Vault secrets management detected"},
		},
		{
			SkillName:       "Service Discovery (Consul)",
			Category:        signals.CategoryInfrastructure,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{signals.SignalConsul},
			OptionalSignals: []signals.InfraSignal{},
			MinSignalCount:  0,
			BaseConfidence:  0.85,
			Weight:          8,
			Keywords:        []string{"consul", "service discovery", "distributed systems"},
			Evidence:        []string{"Consul service discovery detected"},
		},

		// ============================================
		// EXTREME LEVEL SKILLS - AWS SERVICES
		// ============================================
		{
			SkillName:       "AWS S3",
			Category:        signals.CategoryCloud,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalS3},
			OptionalSignals: []signals.InfraSignal{signals.SignalAWS},
			MinSignalCount:  0,
			BaseConfidence:  0.90,
			Weight:          7,
			Keywords:        []string{"s3", "object storage", "aws", "buckets"},
			Evidence:        []string{"AWS S3 integration detected"},
		},
		{
			SkillName:       "AWS SQS",
			Category:        signals.CategoryMessaging,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalSQS},
			OptionalSignals: []signals.InfraSignal{signals.SignalAWS, signals.SignalSNS},
			MinSignalCount:  0,
			BaseConfidence:  0.90,
			Weight:          7,
			Keywords:        []string{"sqs", "message queue", "aws"},
			Evidence:        []string{"AWS SQS integration detected"},
		},
		{
			SkillName:       "AWS DynamoDB",
			Category:        signals.CategoryDatabase,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{signals.SignalDynamoDB},
			OptionalSignals: []signals.InfraSignal{signals.SignalAWS},
			MinSignalCount:  0,
			BaseConfidence:  0.90,
			Weight:          8,
			Keywords:        []string{"dynamodb", "nosql", "aws", "serverless database"},
			Evidence:        []string{"AWS DynamoDB integration detected"},
		},
		{
			SkillName:       "Google Cloud Platform",
			Category:        signals.CategoryCloud,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalGCP},
			OptionalSignals: []signals.InfraSignal{},
			MinSignalCount:  0,
			BaseConfidence:  0.85,
			Weight:          8,
			Keywords:        []string{"gcp", "google cloud", "firebase", "cloud run"},
			Evidence:        []string{"Google Cloud Platform integration detected"},
		},
		{
			SkillName:       "Microsoft Azure",
			Category:        signals.CategoryCloud,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalAzure},
			OptionalSignals: []signals.InfraSignal{},
			MinSignalCount:  0,
			BaseConfidence:  0.85,
			Weight:          8,
			Keywords:        []string{"azure", "microsoft cloud", "azure functions"},
			Evidence:        []string{"Microsoft Azure integration detected"},
		},

		// ============================================
		// EXTREME LEVEL SKILLS - DESIGN PATTERNS
		// ============================================
		{
			SkillName:       "Repository Pattern",
			Category:        signals.CategoryArchitecture,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalRepositoryPattern},
			OptionalSignals: []signals.InfraSignal{signals.SignalCleanArchitecture},
			MinSignalCount:  0,
			BaseConfidence:  0.85,
			Weight:          7,
			Keywords:        []string{"repository pattern", "data access", "abstraction"},
			Evidence:        []string{"Repository pattern implementation detected"},
		},
		{
			SkillName:       "Factory Pattern",
			Category:        signals.CategoryArchitecture,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalFactoryPattern},
			OptionalSignals: []signals.InfraSignal{},
			MinSignalCount:  0,
			BaseConfidence:  0.80,
			Weight:          6,
			Keywords:        []string{"factory pattern", "creational", "design patterns"},
			Evidence:        []string{"Factory pattern implementation detected"},
		},
		{
			SkillName:       "Domain-Driven Design (DDD)",
			Category:        signals.CategoryArchitecture,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{signals.SignalDDDPattern},
			OptionalSignals: []signals.InfraSignal{signals.SignalEventSourcing, signals.SignalCQRS, signals.SignalRepositoryPattern},
			MinSignalCount:  0,
			BaseConfidence:  0.80,
			Weight:          9,
			Keywords:        []string{"ddd", "domain driven design", "aggregates", "entities", "value objects"},
			Evidence:        []string{"Domain-Driven Design patterns detected"},
		},
		{
			SkillName:       "Clean Architecture",
			Category:        signals.CategoryArchitecture,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{signals.SignalCleanArchitecture},
			OptionalSignals: []signals.InfraSignal{signals.SignalRepositoryPattern, signals.SignalDependencyInjection},
			MinSignalCount:  0,
			BaseConfidence:  0.80,
			Weight:          9,
			Keywords:        []string{"clean architecture", "onion architecture", "layers", "use cases"},
			Evidence:        []string{"Clean Architecture structure detected"},
		},
		{
			SkillName:       "Hexagonal Architecture",
			Category:        signals.CategoryArchitecture,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{signals.SignalHexagonalArchitecture},
			OptionalSignals: []signals.InfraSignal{signals.SignalCleanArchitecture},
			MinSignalCount:  0,
			BaseConfidence:  0.80,
			Weight:          9,
			Keywords:        []string{"hexagonal", "ports and adapters", "clean architecture"},
			Evidence:        []string{"Hexagonal Architecture (Ports & Adapters) detected"},
		},
		{
			SkillName:       "Dependency Injection",
			Category:        signals.CategoryArchitecture,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalDependencyInjection},
			OptionalSignals: []signals.InfraSignal{},
			MinSignalCount:  0,
			BaseConfidence:  0.85,
			Weight:          7,
			Keywords:        []string{"dependency injection", "ioc", "inversion of control"},
			Evidence:        []string{"Dependency injection framework detected"},
		},

		// ============================================
		// EXTREME LEVEL SKILLS - SECURITY
		// ============================================
		{
			SkillName:       "OWASP Security Headers",
			Category:        signals.CategorySecurity,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalOWASP},
			OptionalSignals: []signals.InfraSignal{signals.SignalHelmet},
			MinSignalCount:  0,
			BaseConfidence:  0.85,
			Weight:          7,
			Keywords:        []string{"owasp", "security headers", "csp", "hsts"},
			Evidence:        []string{"OWASP security headers detected"},
		},
		{
			SkillName:       "Secure Password Hashing",
			Category:        signals.CategorySecurity,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalPasswordHashing},
			OptionalSignals: []signals.InfraSignal{},
			MinSignalCount:  0,
			BaseConfidence:  0.90,
			Weight:          7,
			Keywords:        []string{"bcrypt", "argon2", "password hashing", "security"},
			Evidence:        []string{"Secure password hashing implementation detected"},
		},
		{
			SkillName:       "Data Encryption",
			Category:        signals.CategorySecurity,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{signals.SignalEncryption},
			OptionalSignals: []signals.InfraSignal{},
			MinSignalCount:  0,
			BaseConfidence:  0.85,
			Weight:          8,
			Keywords:        []string{"aes", "rsa", "encryption", "cryptography"},
			Evidence:        []string{"Data encryption implementation detected"},
		},
		{
			SkillName:       "Multi-Factor Authentication",
			Category:        signals.CategorySecurity,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{signals.SignalMFA},
			OptionalSignals: []signals.InfraSignal{},
			MinSignalCount:  0,
			BaseConfidence:  0.90,
			Weight:          8,
			Keywords:        []string{"mfa", "2fa", "totp", "authenticator"},
			Evidence:        []string{"Multi-factor authentication detected"},
		},
		{
			SkillName:       "Audit Logging",
			Category:        signals.CategorySecurity,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalAuditLogging},
			OptionalSignals: []signals.InfraSignal{},
			MinSignalCount:  0,
			BaseConfidence:  0.85,
			Weight:          7,
			Keywords:        []string{"audit logging", "compliance", "security audit"},
			Evidence:        []string{"Audit logging implementation detected"},
		},
		{
			SkillName:       "Role-Based Access Control (RBAC)",
			Category:        signals.CategorySecurity,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalRBAC},
			OptionalSignals: []signals.InfraSignal{},
			MinSignalCount:  0,
			BaseConfidence:  0.85,
			Weight:          7,
			Keywords:        []string{"rbac", "authorization", "access control", "permissions"},
			Evidence:        []string{"RBAC implementation detected"},
		},
		{
			SkillName:       "Input Sanitization & XSS Prevention",
			Category:        signals.CategorySecurity,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalInputSanitization},
			OptionalSignals: []signals.InfraSignal{},
			MinSignalCount:  0,
			BaseConfidence:  0.85,
			Weight:          7,
			Keywords:        []string{"xss prevention", "input sanitization", "security"},
			Evidence:        []string{"Input sanitization detected"},
		},
		{
			SkillName:       "SQL Injection Prevention",
			Category:        signals.CategorySecurity,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalSQLInjectionPrevention},
			OptionalSignals: []signals.InfraSignal{},
			MinSignalCount:  0,
			BaseConfidence:  0.85,
			Weight:          7,
			Keywords:        []string{"sql injection", "parameterized queries", "prepared statements"},
			Evidence:        []string{"SQL injection prevention detected"},
		},

		// ============================================
		// EXTREME LEVEL SKILLS - API & PROTOCOLS
		// ============================================
		{
			SkillName:       "OpenAPI / Swagger",
			Category:        signals.CategoryDevOps,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalOpenAPI},
			OptionalSignals: []signals.InfraSignal{},
			MinSignalCount:  0,
			BaseConfidence:  0.90,
			Weight:          7,
			Keywords:        []string{"openapi", "swagger", "api documentation"},
			Evidence:        []string{"OpenAPI/Swagger documentation detected"},
		},
		{
			SkillName:       "Protocol Buffers (Protobuf)",
			Category:        signals.CategoryArchitecture,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{signals.SignalProtobuf},
			OptionalSignals: []signals.InfraSignal{signals.SignalGRPC},
			MinSignalCount:  0,
			BaseConfidence:  0.90,
			Weight:          8,
			Keywords:        []string{"protobuf", "protocol buffers", "binary serialization"},
			Evidence:        []string{"Protocol Buffers detected"},
		},
		{
			SkillName:       "gRPC",
			Category:        signals.CategoryArchitecture,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{signals.SignalGRPC},
			OptionalSignals: []signals.InfraSignal{signals.SignalProtobuf},
			MinSignalCount:  0,
			BaseConfidence:  0.90,
			Weight:          9,
			Keywords:        []string{"grpc", "rpc", "microservices communication"},
			Evidence:        []string{"gRPC implementation detected"},
		},
		{
			SkillName:       "GraphQL",
			Category:        signals.CategoryArchitecture,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalGraphQL},
			OptionalSignals: []signals.InfraSignal{signals.SignalGraphQLFederation},
			MinSignalCount:  0,
			BaseConfidence:  0.90,
			Weight:          8,
			Keywords:        []string{"graphql", "api", "query language"},
			Evidence:        []string{"GraphQL API detected"},
		},
		{
			SkillName:       "GraphQL Federation",
			Category:        signals.CategoryArchitecture,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{signals.SignalGraphQLFederation},
			OptionalSignals: []signals.InfraSignal{signals.SignalGraphQL},
			MinSignalCount:  0,
			BaseConfidence:  0.85,
			Weight:          9,
			Keywords:        []string{"graphql federation", "supergraph", "subgraphs"},
			Evidence:        []string{"GraphQL Federation detected"},
		},
		{
			SkillName:       "WebSocket",
			Category:        signals.CategoryArchitecture,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalWebSocket},
			OptionalSignals: []signals.InfraSignal{},
			MinSignalCount:  0,
			BaseConfidence:  0.90,
			Weight:          7,
			Keywords:        []string{"websocket", "real-time", "bidirectional"},
			Evidence:        []string{"WebSocket implementation detected"},
		},

		// ============================================
		// EXTREME LEVEL SKILLS - MACHINE LEARNING
		// ============================================
		{
			SkillName:       "TensorFlow",
			Category:        signals.CategoryML,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{signals.SignalTensorFlow},
			OptionalSignals: []signals.InfraSignal{signals.SignalML},
			MinSignalCount:  0,
			BaseConfidence:  0.95,
			Weight:          9,
			Keywords:        []string{"tensorflow", "deep learning", "neural networks", "keras"},
			Evidence:        []string{"TensorFlow framework detected"},
		},
		{
			SkillName:       "PyTorch",
			Category:        signals.CategoryML,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{signals.SignalPyTorch},
			OptionalSignals: []signals.InfraSignal{signals.SignalML},
			MinSignalCount:  0,
			BaseConfidence:  0.95,
			Weight:          9,
			Keywords:        []string{"pytorch", "deep learning", "neural networks"},
			Evidence:        []string{"PyTorch framework detected"},
		},
		{
			SkillName:       "Scikit-Learn",
			Category:        signals.CategoryML,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalScikitLearn},
			OptionalSignals: []signals.InfraSignal{signals.SignalML},
			MinSignalCount:  0,
			BaseConfidence:  0.90,
			Weight:          8,
			Keywords:        []string{"scikit-learn", "machine learning", "sklearn"},
			Evidence:        []string{"Scikit-learn framework detected"},
		},
		{
			SkillName:       "Data Science (Pandas/NumPy)",
			Category:        signals.CategoryML,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{},
			OptionalSignals: []signals.InfraSignal{signals.SignalPandas, signals.SignalNumpy},
			MinSignalCount:  1,
			BaseConfidence:  0.85,
			Weight:          7,
			Keywords:        []string{"pandas", "numpy", "data analysis", "data science"},
			Evidence:        []string{"Data science tools detected"},
		},
		{
			SkillName:       "MLOps",
			Category:        signals.CategoryML,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{signals.SignalMLOps},
			OptionalSignals: []signals.InfraSignal{signals.SignalMLflow, signals.SignalKubeflow},
			MinSignalCount:  0,
			BaseConfidence:  0.85,
			Weight:          9,
			Keywords:        []string{"mlops", "ml engineering", "model deployment"},
			Evidence:        []string{"MLOps practices detected"},
		},
		{
			SkillName:       "LLM Integration",
			Category:        signals.CategoryML,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{signals.SignalLLM},
			OptionalSignals: []signals.InfraSignal{},
			MinSignalCount:  0,
			BaseConfidence:  0.90,
			Weight:          9,
			Keywords:        []string{"openai", "gpt", "langchain", "llm", "ai"},
			Evidence:        []string{"LLM/AI integration detected"},
		},
		{
			SkillName:       "Vector Databases",
			Category:        signals.CategoryML,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{signals.SignalVectorDB},
			OptionalSignals: []signals.InfraSignal{signals.SignalLLM},
			MinSignalCount:  0,
			BaseConfidence:  0.90,
			Weight:          8,
			Keywords:        []string{"vector database", "embeddings", "semantic search"},
			Evidence:        []string{"Vector database detected"},
		},

		// ============================================
		// EXTREME LEVEL SKILLS - SEARCH & ANALYTICS
		// ============================================
		{
			SkillName:       "Elasticsearch",
			Category:        signals.CategoryDatabase,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{signals.SignalElasticsearch},
			OptionalSignals: []signals.InfraSignal{},
			MinSignalCount:  0,
			BaseConfidence:  0.90,
			Weight:          8,
			Keywords:        []string{"elasticsearch", "search", "full-text search"},
			Evidence:        []string{"Elasticsearch integration detected"},
		},
		{
			SkillName:       "ClickHouse Analytics",
			Category:        signals.CategoryDatabase,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{signals.SignalClickHouse},
			OptionalSignals: []signals.InfraSignal{},
			MinSignalCount:  0,
			BaseConfidence:  0.90,
			Weight:          8,
			Keywords:        []string{"clickhouse", "analytics", "olap", "columnar"},
			Evidence:        []string{"ClickHouse analytics database detected"},
		},
		{
			SkillName:       "Time-Series Database",
			Category:        signals.CategoryDatabase,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{},
			OptionalSignals: []signals.InfraSignal{signals.SignalTimescaleDB, signals.SignalInfluxDB},
			MinSignalCount:  1,
			BaseConfidence:  0.85,
			Weight:          8,
			Keywords:        []string{"time-series", "timescaledb", "influxdb", "metrics"},
			Evidence:        []string{"Time-series database detected"},
		},

		// ============================================
		// EXTREME LEVEL SKILLS - ADVANCED TESTING
		// ============================================
		{
			SkillName:       "Testcontainers",
			Category:        signals.CategoryTesting,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{signals.SignalTestContainers},
			OptionalSignals: []signals.InfraSignal{signals.SignalDocker},
			MinSignalCount:  0,
			BaseConfidence:  0.90,
			Weight:          8,
			Keywords:        []string{"testcontainers", "integration testing", "docker"},
			Evidence:        []string{"Testcontainers integration detected"},
		},
		{
			SkillName:       "Contract Testing (Pact)",
			Category:        signals.CategoryTesting,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{signals.SignalContractTesting},
			OptionalSignals: []signals.InfraSignal{},
			MinSignalCount:  0,
			BaseConfidence:  0.90,
			Weight:          8,
			Keywords:        []string{"pact", "contract testing", "consumer driven"},
			Evidence:        []string{"Contract testing (Pact) detected"},
		},
		{
			SkillName:       "Load Testing",
			Category:        signals.CategoryTesting,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{signals.SignalLoadTesting},
			OptionalSignals: []signals.InfraSignal{},
			MinSignalCount:  0,
			BaseConfidence:  0.85,
			Weight:          8,
			Keywords:        []string{"load testing", "k6", "artillery", "performance"},
			Evidence:        []string{"Load testing framework detected"},
		},
		{
			SkillName:       "Mutation Testing",
			Category:        signals.CategoryTesting,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{signals.SignalMutationTesting},
			OptionalSignals: []signals.InfraSignal{},
			MinSignalCount:  0,
			BaseConfidence:  0.85,
			Weight:          8,
			Keywords:        []string{"mutation testing", "stryker", "code quality"},
			Evidence:        []string{"Mutation testing detected"},
		},
		{
			SkillName:       "Chaos Engineering",
			Category:        signals.CategoryTesting,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{signals.SignalChaosEngineering},
			OptionalSignals: []signals.InfraSignal{},
			MinSignalCount:  0,
			BaseConfidence:  0.85,
			Weight:          9,
			Keywords:        []string{"chaos engineering", "fault injection", "resilience"},
			Evidence:        []string{"Chaos engineering practices detected"},
		},
		{
			SkillName:       "Property-Based Testing",
			Category:        signals.CategoryTesting,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{signals.SignalPropertyTesting},
			OptionalSignals: []signals.InfraSignal{},
			MinSignalCount:  0,
			BaseConfidence:  0.80,
			Weight:          7,
			Keywords:        []string{"property testing", "quickcheck", "hypothesis"},
			Evidence:        []string{"Property-based testing detected"},
		},
		{
			SkillName:       "BDD / Cucumber",
			Category:        signals.CategoryTesting,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalBDD},
			OptionalSignals: []signals.InfraSignal{},
			MinSignalCount:  0,
			BaseConfidence:  0.85,
			Weight:          7,
			Keywords:        []string{"bdd", "cucumber", "gherkin", "acceptance testing"},
			Evidence:        []string{"BDD/Cucumber testing detected"},
		},

		// ============================================
		// EXTREME LEVEL SKILLS - OBSERVABILITY
		// ============================================
		{
			SkillName:       "OpenTelemetry",
			Category:        signals.CategoryObservability,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{signals.SignalOpenTelemetry},
			OptionalSignals: []signals.InfraSignal{signals.SignalDistributedTracing},
			MinSignalCount:  0,
			BaseConfidence:  0.90,
			Weight:          9,
			Keywords:        []string{"opentelemetry", "otel", "observability", "telemetry"},
			Evidence:        []string{"OpenTelemetry instrumentation detected"},
		},
		{
			SkillName:       "Datadog APM",
			Category:        signals.CategoryObservability,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{signals.SignalDatadog},
			OptionalSignals: []signals.InfraSignal{},
			MinSignalCount:  0,
			BaseConfidence:  0.90,
			Weight:          8,
			Keywords:        []string{"datadog", "apm", "monitoring"},
			Evidence:        []string{"Datadog APM detected"},
		},
		{
			SkillName:       "ELK Stack",
			Category:        signals.CategoryObservability,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{signals.SignalELKStack},
			OptionalSignals: []signals.InfraSignal{signals.SignalElasticsearch},
			MinSignalCount:  0,
			BaseConfidence:  0.85,
			Weight:          8,
			Keywords:        []string{"elk", "elasticsearch", "logstash", "kibana"},
			Evidence:        []string{"ELK Stack observability detected"},
		},
		{
			SkillName:       "SLO/SLI Implementation",
			Category:        signals.CategoryObservability,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{signals.SignalSLO},
			OptionalSignals: []signals.InfraSignal{signals.SignalPrometheus, signals.SignalAlerting},
			MinSignalCount:  0,
			BaseConfidence:  0.85,
			Weight:          9,
			Keywords:        []string{"slo", "sli", "error budget", "reliability"},
			Evidence:        []string{"SLO/SLI implementation detected"},
		},

		// ============================================
		// EXTREME LEVEL SKILLS - DEPLOYMENT
		// ============================================
		{
			SkillName:       "Blue-Green Deployment",
			Category:        signals.CategoryDevOps,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{signals.SignalBlueGreen},
			OptionalSignals: []signals.InfraSignal{},
			MinSignalCount:  0,
			BaseConfidence:  0.80,
			Weight:          8,
			Keywords:        []string{"blue-green", "zero-downtime", "deployment strategy"},
			Evidence:        []string{"Blue-Green deployment pattern detected"},
		},
		{
			SkillName:       "Canary Deployment",
			Category:        signals.CategoryDevOps,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{signals.SignalCanaryDeployment},
			OptionalSignals: []signals.InfraSignal{},
			MinSignalCount:  0,
			BaseConfidence:  0.80,
			Weight:          8,
			Keywords:        []string{"canary", "progressive delivery", "deployment"},
			Evidence:        []string{"Canary deployment pattern detected"},
		},
		{
			SkillName:       "GitOps (ArgoCD)",
			Category:        signals.CategoryDevOps,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{signals.SignalArgoCD},
			OptionalSignals: []signals.InfraSignal{signals.SignalKubernetes},
			MinSignalCount:  0,
			BaseConfidence:  0.90,
			Weight:          9,
			Keywords:        []string{"argocd", "gitops", "continuous deployment"},
			Evidence:        []string{"ArgoCD GitOps detected"},
		},
		{
			SkillName:       "GitOps (Flux)",
			Category:        signals.CategoryDevOps,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{signals.SignalFlux},
			OptionalSignals: []signals.InfraSignal{signals.SignalKubernetes},
			MinSignalCount:  0,
			BaseConfidence:  0.90,
			Weight:          9,
			Keywords:        []string{"flux", "gitops", "continuous deployment"},
			Evidence:        []string{"Flux GitOps detected"},
		},
		{
			SkillName:       "Database Migrations",
			Category:        signals.CategoryDatabase,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalDatabaseMigrations},
			OptionalSignals: []signals.InfraSignal{signals.SignalPrisma},
			MinSignalCount:  0,
			BaseConfidence:  0.85,
			Weight:          7,
			Keywords:        []string{"migrations", "flyway", "liquibase", "schema management"},
			Evidence:        []string{"Database migrations detected"},
		},

		// ============================================
		// EXTREME LEVEL SKILLS - DATA & COMPLIANCE
		// ============================================
		{
			SkillName:       "GDPR Compliance",
			Category:        signals.CategorySecurity,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{signals.SignalGDPR},
			OptionalSignals: []signals.InfraSignal{signals.SignalDataAnonymization},
			MinSignalCount:  0,
			BaseConfidence:  0.80,
			Weight:          8,
			Keywords:        []string{"gdpr", "data privacy", "compliance", "data protection"},
			Evidence:        []string{"GDPR compliance patterns detected"},
		},
		{
			SkillName:       "Data Anonymization",
			Category:        signals.CategorySecurity,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{signals.SignalDataAnonymization},
			OptionalSignals: []signals.InfraSignal{signals.SignalGDPR},
			MinSignalCount:  0,
			BaseConfidence:  0.85,
			Weight:          8,
			Keywords:        []string{"anonymization", "pseudonymization", "data masking"},
			Evidence:        []string{"Data anonymization implementation detected"},
		},
		{
			SkillName:       "ETL Pipeline",
			Category:        signals.CategoryArchitecture,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{signals.SignalETL},
			OptionalSignals: []signals.InfraSignal{signals.SignalBatchProcessing, signals.SignalStreamProcessing},
			MinSignalCount:  0,
			BaseConfidence:  0.85,
			Weight:          8,
			Keywords:        []string{"etl", "data pipeline", "data engineering"},
			Evidence:        []string{"ETL pipeline detected"},
		},
		{
			SkillName:       "Stream Processing",
			Category:        signals.CategoryArchitecture,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{signals.SignalStreamProcessing},
			OptionalSignals: []signals.InfraSignal{signals.SignalKafka},
			MinSignalCount:  0,
			BaseConfidence:  0.80,
			Weight:          8,
			Keywords:        []string{"stream processing", "reactive", "real-time"},
			Evidence:        []string{"Stream processing patterns detected"},
		},

		// ============================================
		// EXTREME LEVEL SKILLS - FEATURE MANAGEMENT
		// ============================================
		{
			SkillName:       "Feature Flags",
			Category:        signals.CategoryDevOps,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalFeatureFlags},
			OptionalSignals: []signals.InfraSignal{signals.SignalABTesting},
			MinSignalCount:  0,
			BaseConfidence:  0.85,
			Weight:          7,
			Keywords:        []string{"feature flags", "feature toggles", "launchdarkly"},
			Evidence:        []string{"Feature flags implementation detected"},
		},
		{
			SkillName:       "A/B Testing",
			Category:        signals.CategoryDevOps,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalABTesting},
			OptionalSignals: []signals.InfraSignal{signals.SignalFeatureFlags},
			MinSignalCount:  0,
			BaseConfidence:  0.85,
			Weight:          7,
			Keywords:        []string{"ab testing", "experimentation", "variant testing"},
			Evidence:        []string{"A/B testing implementation detected"},
		},

		// ============================================
		// EXTREME LEVEL SKILLS - PERFORMANCE
		// ============================================
		{
			SkillName:       "Caching Strategies",
			Category:        signals.CategoryInfrastructure,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalCaching},
			OptionalSignals: []signals.InfraSignal{signals.SignalRedis},
			MinSignalCount:  0,
			BaseConfidence:  0.85,
			Weight:          7,
			Keywords:        []string{"caching", "redis", "memcached", "performance"},
			Evidence:        []string{"Caching implementation detected"},
		},
		{
			SkillName:       "Connection Pooling",
			Category:        signals.CategoryInfrastructure,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalConnectionPooling},
			OptionalSignals: []signals.InfraSignal{},
			MinSignalCount:  0,
			BaseConfidence:  0.85,
			Weight:          7,
			Keywords:        []string{"connection pooling", "database optimization"},
			Evidence:        []string{"Connection pooling detected"},
		},

		// ============================================
		// EXTREME LEVEL SKILLS - INTERNATIONALIZATION
		// ============================================
		{
			SkillName:       "Internationalization (i18n)",
			Category:        signals.CategoryArchitecture,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalI18n},
			OptionalSignals: []signals.InfraSignal{},
			MinSignalCount:  0,
			BaseConfidence:  0.85,
			Weight:          6,
			Keywords:        []string{"i18n", "internationalization", "localization", "translations"},
			Evidence:        []string{"Internationalization implementation detected"},
		},

		// ============================================
		// EXTREME LEVEL SKILLS - ASYNC & CONCURRENCY
		// ============================================
		{
			SkillName:       "Async Programming",
			Category:        signals.CategoryArchitecture,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalAsyncPatterns},
			OptionalSignals: []signals.InfraSignal{signals.SignalConcurrencyControl},
			MinSignalCount:  0,
			BaseConfidence:  0.85,
			Weight:          7,
			Keywords:        []string{"async", "await", "promises", "goroutines"},
			Evidence:        []string{"Async programming patterns detected"},
		},
		{
			SkillName:       "Concurrency Control",
			Category:        signals.CategoryArchitecture,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{signals.SignalConcurrencyControl},
			OptionalSignals: []signals.InfraSignal{},
			MinSignalCount:  0,
			BaseConfidence:  0.85,
			Weight:          8,
			Keywords:        []string{"mutex", "semaphore", "concurrency", "thread safety"},
			Evidence:        []string{"Concurrency control patterns detected"},
		},

		// ============================================
		// FRONTEND FRAMEWORK SKILLS (CRITICAL!)
		// ============================================
		{
			SkillName:       "React",
			Category:        signals.CategoryFramework,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalReact},
			OptionalSignals: []signals.InfraSignal{signals.SignalReactQuery, signals.SignalRedux, signals.SignalZustand},
			MinSignalCount:  0,
			BaseConfidence:  0.90,
			Weight:          8,
			Keywords:        []string{"react", "hooks", "jsx", "components", "frontend"},
			Evidence:        []string{"React framework detected"},
		},
		{
			SkillName:       "JavaScript",
			Category:        signals.CategoryLanguage,
			Level:           signals.LevelBasic,
			RequiredSignals: []signals.InfraSignal{signals.SignalJavaScript},
			OptionalSignals: []signals.InfraSignal{
				signals.SignalNode, signals.SignalReact, signals.SignalVue,
			},
			MinSignalCount: 0,
			BaseConfidence: 0.90,
			Weight:         8,
			Keywords:       []string{"javascript", "js", "ecmascript", "frontend"},
			Evidence:       []string{"JavaScript detected in project"},
		},
		{
			SkillName:       "Go",
			Category:        signals.CategoryLanguage,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalGo},
			OptionalSignals: []signals.InfraSignal{
				signals.SignalHTTPFramework, signals.SignalDocker,
			},
			MinSignalCount: 0,
			BaseConfidence: 0.90,
			Weight:         9,
			Keywords:       []string{"go", "golang", "backend", "systems"},
			Evidence:       []string{"Go language detected"},
		},
		{
			SkillName:       "TypeScript",
			Category:        signals.CategoryLanguage,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalTypeScript},
			OptionalSignals: []signals.InfraSignal{signals.SignalReact, signals.SignalNextJS, signals.SignalNestJS},
			MinSignalCount:  0,
			BaseConfidence:  0.90,
			Weight:          7,
			Keywords:        []string{"typescript", "ts", "type-safe", "static typing"},
			Evidence:        []string{"TypeScript detected in project"},
		},
		{
			SkillName:       "Node.js",
			Category:        signals.CategoryFramework,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalNode},
			OptionalSignals: []signals.InfraSignal{
				signals.SignalExpress, signals.SignalNestJS, signals.SignalJavaScript,
			},
			MinSignalCount: 0,
			BaseConfidence: 0.90,
			Weight:         8,
			Keywords:       []string{"node", "nodejs", "backend", "runtime"},
			Evidence:       []string{"Node.js runtime detected"},
		},
		{
			SkillName:       "Python",
			Category:        signals.CategoryLanguage,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalPython},
			OptionalSignals: []signals.InfraSignal{
				signals.SignalDjango, signals.SignalFlask, signals.SignalFastAPI,
			},
			MinSignalCount: 0,
			BaseConfidence: 0.90,
			Weight:         8,
			Keywords:       []string{"python", "data science", "backend", "scripting"},
			Evidence:       []string{"Python language detected"},
		},
		{
			SkillName:       "Rust",
			Category:        signals.CategoryLanguage,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{signals.SignalRust},
			OptionalSignals: []signals.InfraSignal{},
			MinSignalCount:  0,
			BaseConfidence:  0.90,
			Weight:          9,
			Keywords:        []string{"rust", "systems", "memory safety"},
			Evidence:        []string{"Rust language detected"},
		},
		{
			SkillName:       "Django",
			Category:        signals.CategoryFramework,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalDjango},
			OptionalSignals: []signals.InfraSignal{signals.SignalPython},
			MinSignalCount:  0,
			BaseConfidence:  0.90,
			Weight:          8,
			Keywords:        []string{"django", "python web", "orm"},
			Evidence:        []string{"Django framework detected"},
		},
		{
			SkillName:       "Flask",
			Category:        signals.CategoryFramework,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalFlask},
			OptionalSignals: []signals.InfraSignal{signals.SignalPython},
			MinSignalCount:  0,
			BaseConfidence:  0.90,
			Weight:          7,
			Keywords:        []string{"flask", "python microframework"},
			Evidence:        []string{"Flask framework detected"},
		},
		{
			SkillName:       "FastAPI",
			Category:        signals.CategoryFramework,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{signals.SignalFastAPI},
			OptionalSignals: []signals.InfraSignal{signals.SignalPython},
			MinSignalCount:  0,
			BaseConfidence:  0.90,
			Weight:          8,
			Keywords:        []string{"fastapi", "async python", "pydantic"},
			Evidence:        []string{"FastAPI framework detected"},
		},
		// === NEW LANGUAGE RULES ===
		{
			SkillName:       "Java",
			Category:        signals.CategoryLanguage,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalJava},
			OptionalSignals: []signals.InfraSignal{signals.SignalSpring},
			MinSignalCount:  0,
			BaseConfidence:  0.90,
			Weight:          8,
			Keywords:        []string{"java", "jvm", "spring"},
			Evidence:        []string{"Java language detected"},
		},
		{
			SkillName:       "Kotlin",
			Category:        signals.CategoryLanguage,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalKotlin},
			OptionalSignals: []signals.InfraSignal{signals.SignalJava},
			MinSignalCount:  0,
			BaseConfidence:  0.90,
			Weight:          8,
			Keywords:        []string{"kotlin", "android"},
			Evidence:        []string{"Kotlin language detected"},
		},
		{
			SkillName:       "C#",
			Category:        signals.CategoryLanguage,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalCSharp},
			OptionalSignals: []signals.InfraSignal{},
			MinSignalCount:  0,
			BaseConfidence:  0.90,
			Weight:          8,
			Keywords:        []string{"csharp", "dotnet", ".net"},
			Evidence:        []string{"C# language detected"},
		},
		{
			SkillName:       "Ruby",
			Category:        signals.CategoryLanguage,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalRuby},
			OptionalSignals: []signals.InfraSignal{signals.SignalRails},
			MinSignalCount:  0,
			BaseConfidence:  0.90,
			Weight:          7,
			Keywords:        []string{"ruby", "rails"},
			Evidence:        []string{"Ruby language detected"},
		},
		{
			SkillName:       "PHP",
			Category:        signals.CategoryLanguage,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalPHP},
			OptionalSignals: []signals.InfraSignal{signals.SignalLaravel},
			MinSignalCount:  0,
			BaseConfidence:  0.90,
			Weight:          7,
			Keywords:        []string{"php", "laravel", "symfony"},
			Evidence:        []string{"PHP language detected"},
		},
		{
			SkillName:       "Swift",
			Category:        signals.CategoryLanguage,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{signals.SignalSwift},
			OptionalSignals: []signals.InfraSignal{},
			MinSignalCount:  0,
			BaseConfidence:  0.90,
			Weight:          9,
			Keywords:        []string{"swift", "ios", "macos"},
			Evidence:        []string{"Swift language detected"},
		},
		{
			SkillName:       "Dart",
			Category:        signals.CategoryLanguage,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalDart},
			OptionalSignals: []signals.InfraSignal{},
			MinSignalCount:  0,
			BaseConfidence:  0.90,
			Weight:          8,
			Keywords:        []string{"dart", "flutter"},
			Evidence:        []string{"Dart language detected"},
		},
		// === NEW FRAMEWORK RULES ===
		{
			SkillName:       "Spring Boot",
			Category:        signals.CategoryFramework,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{signals.SignalSpring},
			OptionalSignals: []signals.InfraSignal{signals.SignalJava, signals.SignalKotlin},
			MinSignalCount:  0,
			BaseConfidence:  0.90,
			Weight:          9,
			Keywords:        []string{"spring", "spring boot", "java backend"},
			Evidence:        []string{"Spring Boot framework detected"},
		},
		{
			SkillName:       "Ruby on Rails",
			Category:        signals.CategoryFramework,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalRails},
			OptionalSignals: []signals.InfraSignal{signals.SignalRuby},
			MinSignalCount:  0,
			BaseConfidence:  0.90,
			Weight:          8,
			Keywords:        []string{"rails", "ruby on rails"},
			Evidence:        []string{"Ruby on Rails framework detected"},
		},
		{
			SkillName:       "Laravel",
			Category:        signals.CategoryFramework,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalLaravel},
			OptionalSignals: []signals.InfraSignal{signals.SignalPHP},
			MinSignalCount:  0,
			BaseConfidence:  0.90,
			Weight:          8,
			Keywords:        []string{"laravel", "php framework"},
			Evidence:        []string{"Laravel framework detected"},
		},
		{
			SkillName:       "Nuxt.js",
			Category:        signals.CategoryFramework,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{signals.SignalNuxt},
			OptionalSignals: []signals.InfraSignal{signals.SignalVue},
			MinSignalCount:  0,
			BaseConfidence:  0.90,
			Weight:          8,
			Keywords:        []string{"nuxt", "vue ssr"},
			Evidence:        []string{"Nuxt.js framework detected"},
		},
		{
			SkillName:       "Next.js",
			Category:        signals.CategoryFramework,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{signals.SignalNextJS},
			OptionalSignals: []signals.InfraSignal{signals.SignalReact},
			MinSignalCount:  0,
			BaseConfidence:  0.90,
			Weight:          9,
			Keywords:        []string{"nextjs", "ssr", "server-side rendering", "app router"},
			Evidence:        []string{"Next.js framework detected"},
		},
		{
			SkillName:       "Vue.js",
			Category:        signals.CategoryFramework,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalVue},
			OptionalSignals: []signals.InfraSignal{},
			MinSignalCount:  0,
			BaseConfidence:  0.90,
			Weight:          8,
			Keywords:        []string{"vue", "vuex", "composition api", "frontend"},
			Evidence:        []string{"Vue.js framework detected"},
		},
		{
			SkillName:       "Angular",
			Category:        signals.CategoryFramework,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalAngular},
			OptionalSignals: []signals.InfraSignal{},
			MinSignalCount:  0,
			BaseConfidence:  0.90,
			Weight:          8,
			Keywords:        []string{"angular", "typescript", "rxjs", "frontend"},
			Evidence:        []string{"Angular framework detected"},
		},
		{
			SkillName:       "Tailwind CSS",
			Category:        signals.CategoryFramework,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalTailwind},
			OptionalSignals: []signals.InfraSignal{},
			MinSignalCount:  0,
			BaseConfidence:  0.90,
			Weight:          7,
			Keywords:        []string{"tailwind", "css", "utility-first", "styling"},
			Evidence:        []string{"Tailwind CSS detected"},
		},
		{
			SkillName:       "Redux State Management",
			Category:        signals.CategoryFramework,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalRedux},
			OptionalSignals: []signals.InfraSignal{signals.SignalReact},
			MinSignalCount:  0,
			BaseConfidence:  0.85,
			Weight:          7,
			Keywords:        []string{"redux", "state management", "actions", "reducers"},
			Evidence:        []string{"Redux state management detected"},
		},
		{
			SkillName:       "Zustand State Management",
			Category:        signals.CategoryFramework,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalZustand},
			OptionalSignals: []signals.InfraSignal{signals.SignalReact},
			MinSignalCount:  0,
			BaseConfidence:  0.85,
			Weight:          7,
			Keywords:        []string{"zustand", "state management", "lightweight"},
			Evidence:        []string{"Zustand state management detected"},
		},
		{
			SkillName:       "React Query / TanStack Query",
			Category:        signals.CategoryFramework,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalReactQuery},
			OptionalSignals: []signals.InfraSignal{signals.SignalReact},
			MinSignalCount:  0,
			BaseConfidence:  0.85,
			Weight:          7,
			Keywords:        []string{"react-query", "tanstack", "data fetching", "caching"},
			Evidence:        []string{"React Query / TanStack Query detected"},
		},
		{
			SkillName:       "Framer Motion Animations",
			Category:        signals.CategoryFramework,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalFramerMotion},
			OptionalSignals: []signals.InfraSignal{signals.SignalReact},
			MinSignalCount:  0,
			BaseConfidence:  0.85,
			Weight:          6,
			Keywords:        []string{"framer-motion", "animations", "gestures"},
			Evidence:        []string{"Framer Motion animations detected"},
		},
		{
			SkillName:       "Form Validation (Zod/Yup)",
			Category:        signals.CategoryFramework,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalInputValidation},
			OptionalSignals: []signals.InfraSignal{signals.SignalReact},
			MinSignalCount:  0,
			BaseConfidence:  0.85,
			Weight:          6,
			Keywords:        []string{"zod", "yup", "validation", "schema"},
			Evidence:        []string{"Form validation library detected"},
		},
		{
			SkillName:       "Jest Testing",
			Category:        signals.CategoryTesting,
			Level:           signals.LevelIntermediate,
			RequiredSignals: []signals.InfraSignal{signals.SignalJest},
			OptionalSignals: []signals.InfraSignal{signals.SignalReact},
			MinSignalCount:  0,
			BaseConfidence:  0.85,
			Weight:          7,
			Keywords:        []string{"jest", "testing", "snapshots", "mocking"},
			Evidence:        []string{"Jest testing framework detected"},
		},
		{
			SkillName:       "Cypress E2E Testing",
			Category:        signals.CategoryTesting,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{signals.SignalCypress},
			OptionalSignals: []signals.InfraSignal{},
			MinSignalCount:  0,
			BaseConfidence:  0.90,
			Weight:          8,
			Keywords:        []string{"cypress", "e2e", "end-to-end", "browser testing"},
			Evidence:        []string{"Cypress E2E testing detected"},
		},
		{
			SkillName:       "Playwright Testing",
			Category:        signals.CategoryTesting,
			Level:           signals.LevelAdvanced,
			RequiredSignals: []signals.InfraSignal{signals.SignalPlaywright},
			OptionalSignals: []signals.InfraSignal{},
			MinSignalCount:  0,
			BaseConfidence:  0.90,
			Weight:          8,
			Keywords:        []string{"playwright", "e2e", "cross-browser", "automation"},
			Evidence:        []string{"Playwright testing detected"},
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

	// Apply minor penalty for incomplete projects
	// Only reduce resumeReady status, don't remove skills or heavily penalize
	if infraSignals.HasSignal(signals.SignalIncompleteProject) {
		// Update skills with warning but keep them all
		for cat, skills := range analysis.SkillsByCategory {
			for i := range skills {
				// Only add warning evidence, don't heavily penalize confidence
				skills[i].Evidence = append(skills[i].Evidence, "⚠️ Project structure incomplete")
				// Slightly reduce resumeReady threshold for incomplete projects
				skills[i].ResumeReady = skills[i].Confidence >= 0.80
			}
			analysis.SkillsByCategory[cat] = skills
		}

		// Update VerifiedSkills array to match
		analysis.VerifiedSkills = make([]signals.VerifiedSkill, 0)
		analysis.ResumeReadySkills = 0
		for _, skills := range analysis.SkillsByCategory {
			for _, skill := range skills {
				analysis.VerifiedSkills = append(analysis.VerifiedSkills, skill)
				if skill.ResumeReady {
					analysis.ResumeReadySkills++
				}
			}
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
	var signalConfidenceSum float64

	for _, optSig := range rule.OptionalSignals {
		if sigs.HasSignal(optSig) {
			optionalCount++
			matchedSignals = append(matchedSignals, optSig)

			// Add evidence from signal details and track confidence
			if detail, ok := sigs.SignalDetails[optSig]; ok {
				evidenceList = append(evidenceList, detail.Evidence...)
				signalConfidenceSum += detail.Confidence
			}
		}
	}

	// Add required signal evidence
	for _, reqSig := range rule.RequiredSignals {
		matchedSignals = append(matchedSignals, reqSig)
		if detail, ok := sigs.SignalDetails[reqSig]; ok {
			evidenceList = append(evidenceList, detail.Evidence...)
			signalConfidenceSum += detail.Confidence
		}
	}

	// Check minimum signal count - this applies when there are NO required signals
	// AND optional signals are not meeting the minimum
	if len(rule.RequiredSignals) == 0 && optionalCount < rule.MinSignalCount {
		return signals.VerifiedSkill{}, false
	}

	// If no required signals and no optional signals matched, this rule doesn't apply
	totalMatchedSignals := len(rule.RequiredSignals) + optionalCount
	if totalMatchedSignals == 0 {
		return signals.VerifiedSkill{}, false
	}

	// Calculate confidence based on matched signals
	confidence := rule.BaseConfidence

	// ENHANCED: Tiered evidence-based confidence boosting
	// More evidence = higher confidence (1 match = base, 2-3 = +10%, 4+ = +20%)
	evidenceCount := len(evidenceList)
	if evidenceCount >= 4 {
		confidence += 0.20 // Strong evidence boost
	} else if evidenceCount >= 2 {
		confidence += 0.10 // Moderate evidence boost
	}

	// Boost confidence based on optional signals matched
	if len(rule.OptionalSignals) > 0 {
		boostFactor := float64(optionalCount) / float64(len(rule.OptionalSignals)) * 0.15
		confidence += boostFactor
	}

	// Only BOOST confidence from signal detection, never reduce below base
	// This prevents accuracy drops for valid detections
	if totalMatchedSignals > 0 && signalConfidenceSum > 0 {
		avgSignalConfidence := signalConfidenceSum / float64(totalMatchedSignals)
		// If signals are high confidence (>0.85), boost the skill confidence
		if avgSignalConfidence > 0.85 {
			confidence += 0.05 // Small boost for high confidence signals
		}
	}

	// Cap confidence at 1.0
	if confidence > 1.0 {
		confidence = 1.0
	}

	// Use rule evidence if no specific evidence found
	if len(evidenceList) == 0 {
		evidenceList = rule.Evidence
	}

	// Deduplicate evidence and keep up to 8 items for better context
	evidenceList = dedupe(evidenceList)
	if len(evidenceList) > 8 {
		evidenceList = evidenceList[:8]
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
		ResumeReady: confidence >= 0.75, // Skills with 75%+ confidence are resume-ready
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
	// NEW PRIORITY: Microservices > Monorepo > Event-Driven > Monolith
	// A project CAN be both monorepo AND microservices (multiple services in one repo)

	isMonorepo := sigs.HasSignal(signals.SignalMonorepo)
	isMicroservices := sigs.HasSignal(signals.SignalMultipleServices) && sigs.ServiceCount >= 2

	if isMicroservices {
		// Microservices takes priority - this is about architecture, not repo structure
		arch.Type = signals.ArchMicroservice
		// If also a monorepo, add it to patterns for context
		if isMonorepo {
			arch.Patterns = append(arch.Patterns, "Monorepo Structure")
		}
	} else if isMonorepo {
		arch.Type = signals.ArchMonorepo
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
