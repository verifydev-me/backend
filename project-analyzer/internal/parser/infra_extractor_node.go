package parser

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/verifydev/project-analyzer/pkg/signals"
)

// scanServicePackageJSON scans a service's package.json for technologies
func (e *InfraExtractor) scanServicePackageJSON(servicePath, serviceName string) {
	pkgPath := filepath.Join(servicePath, "package.json")
	if !fileExists(pkgPath) {
		return
	}

	content, err := os.ReadFile(pkgPath)
	if err != nil {
		return
	}

	var pkg map[string]interface{}
	if err := json.Unmarshal(content, &pkg); err != nil {
		return
	}

	// Comprehensive dependency mapping
	depSignals := map[string]signals.InfraSignal{
		// Databases
		"prisma":         signals.SignalPrisma,
		"@prisma/client": signals.SignalPrisma,
		"typeorm":        signals.SignalTypeORM,
		"sequelize":      signals.SignalSequelze,
		"mongoose":       signals.SignalMongoose,
		"pg":             signals.SignalPostgres,
		"mysql2":         signals.SignalMySQL,
		"mongodb":        signals.SignalMongoDB,
		"ioredis":        signals.SignalRedis,
		"redis":          signals.SignalRedis,
		"@upstash/redis": signals.SignalRedis,
		"drizzle-orm":    signals.SignalPostgres,
		"knex":           signals.SignalPostgres,
		"mikro-orm":      signals.SignalTypeORM,

		// Message Queues
		"amqplib":                    signals.SignalRabbitMQ,
		"amqp":                       signals.SignalRabbitMQ, // Older but common
		"@golevelup/nestjs-rabbitmq": signals.SignalRabbitMQ,
		"kafkajs":                    signals.SignalKafka,
		"kafka-node":                 signals.SignalKafka, // Another common library
		"node-rdkafka":               signals.SignalKafka,
		"bullmq":                     signals.SignalRedis,
		"bull":                       signals.SignalRedis,
		"@nestjs/bull":               signals.SignalRedis,

		// HTTP/API Frameworks
		"express":        signals.SignalHTTPFramework,
		"fastify":        signals.SignalHTTPFramework,
		"@nestjs/core":   signals.SignalHTTPFramework,
		"koa":            signals.SignalHTTPFramework,
		"hapi":           signals.SignalHTTPFramework,
		"@grpc/grpc-js":  signals.SignalGRPC,
		"graphql":        signals.SignalGraphQL,
		"@apollo/server": signals.SignalGraphQL,
		"type-graphql":   signals.SignalGraphQL,

		// Security
		"jsonwebtoken":       signals.SignalJWT,
		"passport":           signals.SignalOAuth,
		"@nestjs/passport":   signals.SignalOAuth,
		"bcrypt":             signals.SignalPasswordHashing,
		"argon2":             signals.SignalPasswordHashing,
		"helmet":             signals.SignalHelmet,
		"express-rate-limit": signals.SignalRateLimiting,

		// Observability
		"prom-client":             signals.SignalPrometheus,
		"@opentelemetry/sdk-node": signals.SignalOpenTelemetry,
		"@sentry/node":            signals.SignalSentry,
		"dd-trace":                signals.SignalDatadog,
		"winston":                 signals.SignalStructuredLogging,
		"pino":                    signals.SignalStructuredLogging,

		// WebSocket & Real-time
		"ws":                 signals.SignalWebSocket,
		"socket.io":          signals.SignalWebSocket,
		"@nestjs/websockets": signals.SignalWebSocket,

		// Testing
		"jest":       signals.SignalUnitTests,
		"vitest":     signals.SignalUnitTests,
		"supertest":  signals.SignalIntegrationTests,
		"cypress":    signals.SignalE2ETests,
		"playwright": signals.SignalE2ETests,

		// Cloud SDKs
		"aws-sdk":               signals.SignalAWS,
		"@aws-sdk/client-s3":    signals.SignalAWS,
		"@google-cloud/storage": signals.SignalGCP,
		"@azure/storage-blob":   signals.SignalAzure,
	}

	// Check dependencies and devDependencies
	for _, depType := range []string{"dependencies", "devDependencies"} {
		if deps, ok := pkg[depType].(map[string]interface{}); ok {
			for dep := range deps {
				depLower := strings.ToLower(dep)
				for pattern, signal := range depSignals {
					if strings.Contains(depLower, strings.ToLower(pattern)) || dep == pattern {
						evidence := fmt.Sprintf("%s/package.json → %s", serviceName, dep)
						e.signals.AddSignal(signal, 0.9, []string{evidence}, "deep_service_scan")
					}
				}
			}
		}
	}
}

// analyzePackageJSON extracts signals from package.json files in the repo
func (e *InfraExtractor) analyzePackageJSON() {
	files := e.findFiles("package.json")

	for _, file := range files {
		// Use scanServicePackageJSON logic but adapt evidence
		// For simplicity, we can just call scanServicePackageJSON if path adaptation fits,
		// but findFiles returns relative paths.
		serviceName := filepath.Dir(file)
		if serviceName == "." {
			serviceName = "root"
		}

		// Reuse logic
		dir := filepath.Dir(filepath.Join(e.repoPath, file))
		e.scanServicePackageJSON(dir, serviceName)
	}
}
