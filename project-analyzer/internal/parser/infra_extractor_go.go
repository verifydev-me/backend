package parser

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/verifydev/project-analyzer/pkg/signals"
)

// scanServiceGoMod scans a service's go.mod for technologies
func (e *InfraExtractor) scanServiceGoMod(servicePath, serviceName string) {
	modPath := filepath.Join(servicePath, "go.mod")
	if !fileExists(modPath) {
		return
	}

	content, err := os.ReadFile(modPath)
	if err != nil {
		return
	}

	contentStr := strings.ToLower(string(content))

	// Comprehensive Go dependency mapping
	depSignals := map[string]signals.InfraSignal{
		// Databases
		"pgx":          signals.SignalPostgres,
		"lib/pq":       signals.SignalPostgres,
		"go-pg":        signals.SignalPostgres,
		"gorm":         signals.SignalGORM,
		"sqlx":         signals.SignalPostgres,
		"mongo-driver": signals.SignalMongoDB,
		"go-redis":     signals.SignalRedis,
		"rueidis":      signals.SignalRedis,
		"ent/ent":      signals.SignalGORM,

		// Message Queues
		"amqp091-go":         signals.SignalRabbitMQ,
		"rabbitmq":           signals.SignalRabbitMQ,
		"segmentio/kafka-go": signals.SignalKafka,
		"confluent-kafka-go": signals.SignalKafka,
		"sarama":             signals.SignalKafka,
		"nats-io":            signals.SignalNATS,
		"nats.go":            signals.SignalNATS,

		// HTTP/API Frameworks
		"gin-gonic/gin":    signals.SignalHTTPFramework,
		"labstack/echo":    signals.SignalHTTPFramework,
		"gofiber/fiber":    signals.SignalHTTPFramework,
		"go-chi/chi":       signals.SignalHTTPFramework,
		"gorilla/mux":      signals.SignalHTTPFramework,
		"grpc":             signals.SignalGRPC,
		"graphql-go":       signals.SignalGraphQL,
		"99designs/gqlgen": signals.SignalGraphQL,

		// Security
		"golang-jwt": signals.SignalJWT,
		"jwt-go":     signals.SignalJWT,
		"casbin":     signals.SignalRBAC,
		"bcrypt":     signals.SignalPasswordHashing,
		"argon2":     signals.SignalPasswordHashing,
		"oauth2":     signals.SignalOAuth2,
		"ory/hydra":  signals.SignalOAuth2,

		// Observability
		"prometheus/client_golang": signals.SignalPrometheus,
		"opentelemetry-go":         signals.SignalOpenTelemetry,
		"zerolog":                  signals.SignalStructuredLogging,
		"zap":                      signals.SignalStructuredLogging,
		"logrus":                   signals.SignalStructuredLogging,

		// WebSocket
		"gorilla/websocket":   signals.SignalWebSocket,
		"nhooyr.io/websocket": signals.SignalWebSocket,

		// Testing
		"testify":        signals.SignalUnitTests,
		"goconvey":       signals.SignalUnitTests,
		"testcontainers": signals.SignalTestContainers,

		// Cloud SDKs
		"aws-sdk-go":              signals.SignalAWS,
		"google.golang.org/cloud": signals.SignalGCP,
		"azure-sdk-for-go":        signals.SignalAzure,
	}

	for pattern, signal := range depSignals {
		if strings.Contains(contentStr, strings.ToLower(pattern)) {
			evidence := fmt.Sprintf("%s/go.mod → %s", serviceName, pattern)
			e.signals.AddSignal(signal, 0.9, []string{evidence}, "deep_service_scan")
		}
	}
}

// scanServicePrisma scans for Prisma schema files
func (e *InfraExtractor) scanServicePrisma(servicePath, serviceName string) {
	prismaSchemaPath := filepath.Join(servicePath, "prisma", "schema.prisma")
	if !fileExists(prismaSchemaPath) {
		// Also check root level
		prismaSchemaPath = filepath.Join(servicePath, "schema.prisma")
		if !fileExists(prismaSchemaPath) {
			return
		}
	}

	content, err := os.ReadFile(prismaSchemaPath)
	if err != nil {
		return
	}

	contentStr := strings.ToLower(string(content))
	evidence := fmt.Sprintf("%s/prisma/schema.prisma", serviceName)

	e.signals.AddSignal(signals.SignalPrisma, 0.95, []string{evidence}, "deep_service_scan")

	// Detect database type from Prisma schema
	if strings.Contains(contentStr, "postgresql") || strings.Contains(contentStr, "postgres") {
		e.signals.AddSignal(signals.SignalPostgres, 0.95, []string{evidence + " → postgresql provider"}, "prisma_schema")
	}
	if strings.Contains(contentStr, "mysql") {
		e.signals.AddSignal(signals.SignalMySQL, 0.95, []string{evidence + " → mysql provider"}, "prisma_schema")
	}
	if strings.Contains(contentStr, "mongodb") {
		e.signals.AddSignal(signals.SignalMongoDB, 0.95, []string{evidence + " → mongodb provider"}, "prisma_schema")
	}
	if strings.Contains(contentStr, "sqlite") {
		e.signals.AddSignal(signals.SignalSQLite, 0.95, []string{evidence + " → sqlite provider"}, "prisma_schema")
	}
}

// analyzeGoMod extracts signals from go.mod files
func (e *InfraExtractor) analyzeGoMod() {
	files := e.findFiles("go.mod")

	validServiceFiles := []string{}
	excludedPatterns := []string{"task", "phase", "part", "chapter", "lesson", "example", "sample", "assignment", "day", "step", "tutorial"}

	for _, file := range files {
		serviceName := filepath.Dir(file)
		if serviceName == "." {
			serviceName = "root"
		}

		// Check if it's a valid service or a learning module
		isExcluded := false
		serviceNameLower := strings.ToLower(serviceName)
		for _, ex := range excludedPatterns {
			if strings.Contains(serviceNameLower, ex) {
				isExcluded = true
				break
			}
		}

		dir := filepath.Dir(filepath.Join(e.repoPath, file))
		e.scanServiceGoMod(dir, serviceName)

		if !isExcluded {
			validServiceFiles = append(validServiceFiles, file)
		}
	}

	// Check for multiple go.mod files (microservices indicator)
	// ONLY if they are valid services (not tasks/examples)
	if len(validServiceFiles) > 1 {
		e.signals.AddSignal(signals.SignalMultipleServices, 0.85, validServiceFiles, "multiple_go_modules")
		e.signals.ServiceCount = len(validServiceFiles)
	}
}
