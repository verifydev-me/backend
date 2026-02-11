package graph

import (
	"strings"

	"github.com/verifydev/project-analyzer/pkg/signals"
)

// ============================================
// STACK PATTERNS & TECHNOLOGY CLASSIFICATION
// Data-driven configuration for graph builder
// ============================================

// loadStackPatterns defines recognized technology stack patterns
func (b *Builder) loadStackPatterns() {
	b.stackPatterns = []StackPattern{
		// ============================================
		// FULL-STACK PATTERNS
		// ============================================
		{
			Name:        "MERN Stack",
			Description: "MongoDB + Express.js + React + Node.js",
			Required:    []string{"React", "Express", "MongoDB"},
			Optional:    []string{"Mongoose", "Redux", "Tailwind CSS", "TypeScript"},
			MinMatch:    3,
			SkillLevel:  "intermediate",
			Category:    "fullstack",
			Weight:      8,
		},
		{
			Name:        "PERN Stack",
			Description: "PostgreSQL + Express.js + React + Node.js",
			Required:    []string{"React", "Express", "PostgreSQL"},
			Optional:    []string{"Prisma", "Redux", "TypeScript", "Tailwind CSS"},
			MinMatch:    3,
			SkillLevel:  "intermediate",
			Category:    "fullstack",
			Weight:      8,
		},
		{
			Name:        "Next.js Full-Stack",
			Description: "Next.js + Database + Auth",
			Required:    []string{"Next.js"},
			Optional:    []string{"Prisma", "PostgreSQL", "NextAuth", "TypeScript", "Tailwind CSS", "Shadcn/ui"},
			MinMatch:    2,
			SkillLevel:  "advanced",
			Category:    "fullstack",
			Weight:      9,
		},
		{
			Name:        "T3 Stack",
			Description: "Next.js + tRPC + Prisma + TypeScript",
			Required:    []string{"Next.js", "TypeScript"},
			Optional:    []string{"Prisma", "tRPC", "Zod", "Tailwind CSS"},
			MinMatch:    3,
			SkillLevel:  "advanced",
			Category:    "fullstack",
			Weight:      9,
		},

		// ============================================
		// BACKEND PATTERNS
		// ============================================
		{
			Name:        "Go Microservices",
			Description: "Go backend with microservices architecture",
			Required:    []string{"Gin"},
			Optional:    []string{"GORM", "RabbitMQ", "Docker", "PostgreSQL", "Redis", "Prometheus", "gRPC"},
			MinMatch:    3,
			SkillLevel:  "advanced",
			Category:    "backend",
			Weight:      9,
		},
		{
			Name:        "NestJS Enterprise",
			Description: "NestJS enterprise backend",
			Required:    []string{"NestJS", "TypeScript"},
			Optional:    []string{"Prisma", "TypeORM", "PostgreSQL", "Redis", "RabbitMQ", "Docker", "Jest"},
			MinMatch:    3,
			SkillLevel:  "advanced",
			Category:    "backend",
			Weight:      9,
		},
		{
			Name:        "Django Web App",
			Description: "Python Django web application",
			Required:    []string{"Django"},
			Optional:    []string{"Django REST Framework", "Celery", "PostgreSQL", "Redis", "Docker"},
			MinMatch:    2,
			SkillLevel:  "intermediate",
			Category:    "backend",
			Weight:      8,
		},
		{
			Name:        "FastAPI Modern",
			Description: "Python FastAPI microservice",
			Required:    []string{"FastAPI"},
			Optional:    []string{"Pydantic", "SQLAlchemy", "PostgreSQL", "Redis", "Docker", "Celery"},
			MinMatch:    2,
			SkillLevel:  "advanced",
			Category:    "backend",
			Weight:      9,
		},

		// ============================================
		// DEVOPS PATTERNS
		// ============================================
		{
			Name:        "Container Orchestration",
			Description: "Docker + Compose/K8s with monitoring",
			Required:    []string{"Docker"},
			Optional:    []string{"Docker Compose", "Kubernetes", "Prometheus", "Grafana", "GitHub Actions"},
			MinMatch:    3,
			SkillLevel:  "advanced",
			Category:    "devops",
			Weight:      8,
		},
		{
			Name:        "Cloud-Native Infrastructure",
			Description: "Full cloud-native deployment pipeline",
			Required:    []string{"Docker", "GitHub Actions"},
			Optional:    []string{"Kubernetes", "Terraform", "Prometheus", "Grafana", "AWS"},
			MinMatch:    3,
			SkillLevel:  "expert",
			Category:    "devops",
			Weight:      10,
		},

		// ============================================
		// FRONTEND PATTERNS
		// ============================================
		{
			Name:        "React Modern Frontend",
			Description: "Modern React with tools and state management",
			Required:    []string{"React"},
			Optional:    []string{"Redux", "React Router", "Tailwind CSS", "TypeScript", "Zustand", "React Query"},
			MinMatch:    3,
			SkillLevel:  "intermediate",
			Category:    "frontend",
			Weight:      7,
		},
		{
			Name:        "Vue.js Frontend",
			Description: "Vue.js frontend application",
			Required:    []string{"Vue"},
			Optional:    []string{"Vuex", "Pinia", "Vue Router", "TypeScript", "Tailwind CSS"},
			MinMatch:    2,
			SkillLevel:  "intermediate",
			Category:    "frontend",
			Weight:      7,
		},

		// ============================================
		// ML/AI PATTERNS
		// ============================================
		{
			Name:        "ML Pipeline",
			Description: "Machine learning pipeline",
			Required:    []string{},
			Optional:    []string{"TensorFlow", "PyTorch", "Scikit-learn", "Pandas", "NumPy", "Jupyter"},
			MinMatch:    3,
			SkillLevel:  "advanced",
			Category:    "ml",
			Weight:      9,
		},
		{
			Name:        "LLM Application",
			Description: "LLM-powered application",
			Required:    []string{},
			Optional:    []string{"OpenAI", "LangChain", "Vector Database", "Transformers", "Hugging Face"},
			MinMatch:    2,
			SkillLevel:  "advanced",
			Category:    "ml",
			Weight:      9,
		},
	}
}

// loadRelationshipRules is a placeholder for adding additional
// pre-defined relationship rules between technologies
func (b *Builder) loadRelationshipRules() {
	// Future: load from JSON/YAML configuration
	// For now, relationships are built dynamically from co-occurrence
	// and the known dependencies in builder.go
}

// ============================================
// TECHNOLOGY CATEGORIZATION
// ============================================

// categorizeTech returns the primary category of a technology
func categorizeTech(name string) string {
	lower := strings.ToLower(name)

	// Language
	languages := []string{"go", "python", "javascript", "typescript", "rust", "java", "ruby", "php"}
	for _, lang := range languages {
		if lower == lang {
			return "language"
		}
	}

	// Frameworks (broad)
	if isFramework(lower) {
		return "framework"
	}

	// Database
	databases := []string{"postgresql", "mysql", "mongodb", "sqlite", "redis", "cassandra", "dynamodb",
		"influxdb", "clickhouse", "timescaledb", "elasticsearch", "opensearch"}
	for _, db := range databases {
		if strings.Contains(lower, db) {
			return "database"
		}
	}

	// ORM
	orms := []string{"prisma", "typeorm", "sequelize", "gorm", "sqlalchemy", "mongoose", "drizzle"}
	for _, orm := range orms {
		if strings.Contains(lower, orm) {
			return "orm"
		}
	}

	// Messaging
	msgs := []string{"rabbitmq", "kafka", "bullmq", "sqs", "nats", "amqp"}
	for _, msg := range msgs {
		if strings.Contains(lower, msg) {
			return "messaging"
		}
	}

	// Container
	containers := []string{"docker", "kubernetes", "k8s", "helm"}
	for _, c := range containers {
		if strings.Contains(lower, c) {
			return "container"
		}
	}

	// Testing
	tests := []string{"jest", "mocha", "cypress", "playwright", "pytest", "vitest", "testing"}
	for _, t := range tests {
		if strings.Contains(lower, t) {
			return "testing"
		}
	}

	// Cloud
	clouds := []string{"aws", "gcp", "azure", "firebase", "supabase", "vercel", "netlify"}
	for _, c := range clouds {
		if strings.Contains(lower, c) {
			return "cloud"
		}
	}

	// CI/CD
	cicd := []string{"github actions", "gitlab ci", "jenkins", "circleci", "travis"}
	for _, ci := range cicd {
		if strings.Contains(lower, ci) {
			return "cicd"
		}
	}

	// Observability
	obs := []string{"prometheus", "grafana", "jaeger", "sentry", "datadog", "opentelemetry",
		"winston", "pino", "zerolog", "logrus"}
	for _, o := range obs {
		if strings.Contains(lower, o) {
			return "observability"
		}
	}

	// Security
	sec := []string{"jwt", "oauth", "passport", "bcrypt", "helmet", "cors"}
	for _, s := range sec {
		if strings.Contains(lower, s) {
			return "security"
		}
	}

	// ML
	ml := []string{"tensorflow", "pytorch", "scikit", "openai", "langchain", "transformers", "pandas", "numpy"}
	for _, m := range ml {
		if strings.Contains(lower, m) {
			return "ml"
		}
	}

	return "tool"
}

// subCategorizeTech returns the sub-category for more precise classification
func subCategorizeTech(name string) string {
	lower := strings.ToLower(name)

	// Frontend frameworks/libs
	frontend := []string{"react", "vue", "angular", "svelte", "solid", "preact", "nextjs", "next.js",
		"nuxt", "tailwind", "material-ui", "chakra", "shadcn", "framer-motion",
		"redux", "zustand", "recoil", "jotai", "mobx", "react-router", "react-query"}
	for _, f := range frontend {
		if strings.Contains(lower, f) {
			return "frontend"
		}
	}

	// Backend frameworks
	backend := []string{"express", "nestjs", "fastify", "gin", "fiber", "echo", "chi",
		"django", "flask", "fastapi", "spring", "rails", "laravel",
		"koa", "hapi", "hono"}
	for _, b := range backend {
		if strings.Contains(lower, b) {
			return "backend"
		}
	}

	// Database
	db := []string{"postgres", "mysql", "mongo", "sqlite", "redis", "cassandra", "dynamodb",
		"prisma", "typeorm", "sequelize", "gorm", "sqlalchemy", "mongoose", "drizzle"}
	for _, d := range db {
		if strings.Contains(lower, d) {
			return "database"
		}
	}

	// Messaging
	msg := []string{"rabbitmq", "kafka", "bullmq", "sqs", "nats"}
	for _, m := range msg {
		if strings.Contains(lower, m) {
			return "messaging"
		}
	}

	// Testing
	test := []string{"jest", "mocha", "cypress", "playwright", "pytest", "vitest", "testing-library"}
	for _, t := range test {
		if strings.Contains(lower, t) {
			return "testing"
		}
	}

	// DevOps
	devops := []string{"docker", "kubernetes", "terraform", "github actions", "gitlab", "jenkins"}
	for _, d := range devops {
		if strings.Contains(lower, d) {
			return "devops"
		}
	}

	// Observability
	obs := []string{"prometheus", "grafana", "jaeger", "sentry", "datadog", "opentelemetry",
		"winston", "pino", "zerolog"}
	for _, o := range obs {
		if strings.Contains(lower, o) {
			return "observability"
		}
	}

	// Cloud
	cloud := []string{"aws", "gcp", "azure", "firebase", "supabase", "vercel"}
	for _, c := range cloud {
		if strings.Contains(lower, c) {
			return "cloud"
		}
	}

	// Security
	sec := []string{"jwt", "oauth", "passport", "bcrypt", "helmet", "cors", "auth"}
	for _, s := range sec {
		if strings.Contains(lower, s) {
			return "security"
		}
	}

	return ""
}

func isFramework(name string) bool {
	frameworks := []string{"react", "vue", "angular", "svelte", "express", "nestjs", "fastify",
		"gin", "fiber", "echo", "django", "flask", "fastapi", "spring", "rails",
		"laravel", "nextjs", "next.js", "nuxt"}
	for _, f := range frameworks {
		if strings.Contains(name, f) {
			return true
		}
	}
	return false
}

// infraSignalToTechName converts an InfraSignal to a human-readable technology name
func infraSignalToTechName(sig signals.InfraSignal) string {
	mapping := map[signals.InfraSignal]string{
		signals.SignalDocker:         "Docker",
		signals.SignalDockerCompose:  "Docker Compose",
		signals.SignalKubernetes:     "Kubernetes",
		signals.SignalHelm:           "Helm",
		signals.SignalNginx:          "Nginx",
		signals.SignalTraefik:        "Traefik",
		signals.SignalRabbitMQ:       "RabbitMQ",
		signals.SignalKafka:          "Kafka",
		signals.SignalRedis:          "Redis",
		signals.SignalPostgres:       "PostgreSQL",
		signals.SignalMySQL:          "MySQL",
		signals.SignalMongoDB:        "MongoDB",
		signals.SignalSQLite:         "SQLite",
		signals.SignalGitHubActions:  "GitHub Actions",
		signals.SignalGitLabCI:       "GitLab CI",
		signals.SignalAWS:            "AWS",
		signals.SignalGCP:            "GCP",
		signals.SignalAzure:          "Azure",
		signals.SignalPrisma:         "Prisma",
		signals.SignalTypeORM:        "TypeORM",
		signals.SignalGORM:           "GORM",
		signals.SignalSQLAlch:        "SQLAlchemy",
		signals.SignalMongoose:       "Mongoose",
		signals.SignalJWT:            "JWT",
		signals.SignalPrometheus:     "Prometheus",
		signals.SignalGrafana:        "Grafana",
		signals.SignalJaeger:         "Jaeger",
		signals.SignalSentry:         "Sentry",
		signals.SignalTerraform:      "Terraform",
		signals.SignalPulumi:         "Pulumi",
		signals.SignalIstio:          "Istio",
		signals.SignalConsul:         "Consul",
		signals.SignalVault:          "HashiCorp Vault",
		signals.SignalReact:          "React",
		signals.SignalNextJS:         "Next.js",
		signals.SignalNestJS:         "NestJS",
		signals.SignalVue:            "Vue",
		signals.SignalAngular:        "Angular",
		signals.SignalExpress:        "Express",
		signals.SignalGin:            "Gin",
		signals.SignalDjango:         "Django",
		signals.SignalFlask:          "Flask",
		signals.SignalFastAPI:        "FastAPI",
		signals.SignalTailwind:       "Tailwind CSS",
		signals.SignalRedux:          "Redux",
		signals.SignalFirebase:       "Firebase",
		signals.SignalSupabase:       "Supabase",
		signals.SignalJest:           "Jest",
		signals.SignalCypress:        "Cypress",
		signals.SignalPlaywright:     "Playwright",
		signals.SignalTensorFlow:     "TensorFlow",
		signals.SignalPyTorch:        "PyTorch",
		signals.SignalElasticsearch:  "Elasticsearch",
		signals.SignalGRPC:           "gRPC",
		signals.SignalGraphQL:        "GraphQL",
		signals.SignalWebSocket:      "WebSocket",
		signals.SignalOpenTelemetry:  "OpenTelemetry",
		signals.SignalServerless:     "Serverless",
		signals.SignalLambda:         "AWS Lambda",
		signals.SignalCloudFormation: "CloudFormation",
		signals.SignalS3:             "AWS S3",
		signals.SignalSQS:            "AWS SQS",
		signals.SignalDynamoDB:       "DynamoDB",
	}

	if name, ok := mapping[sig]; ok {
		return name
	}
	return ""
}
