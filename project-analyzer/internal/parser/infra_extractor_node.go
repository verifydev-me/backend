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

	// PRODUCTION SAFETY: Check file size before reading
	info, err := os.Stat(pkgPath)
	if err != nil || info.Size() > MaxFileSizeRead {
		return // Skip abnormally large package.json files
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
		// ===== FRONTEND FRAMEWORKS =====
		"react":         signals.SignalReact,
		"react-dom":     signals.SignalReact,
		"next":          signals.SignalNextJS,
		"vue":           signals.SignalVue,
		"nuxt":          signals.SignalVue,
		"@angular/core": signals.SignalAngular,
		"svelte":        signals.SignalSvelte,
		"solid-js":      signals.SignalReact,
		"preact":        signals.SignalReact,

		// ===== BUILD TOOLS & BUNDLERS =====
		"vite":                 signals.SignalReact, // Modern bundler - implies modern React
		"@vitejs/plugin-react": signals.SignalReact,
		"webpack":              signals.SignalHTTPFramework,
		"esbuild":              signals.SignalHTTPFramework,
		"turbopack":            signals.SignalNextJS,

		// ===== FRONTEND STATE MANAGEMENT =====
		"redux":                 signals.SignalRedux,
		"@reduxjs/toolkit":      signals.SignalRedux,
		"zustand":               signals.SignalZustand,
		"@tanstack/react-query": signals.SignalReactQuery,
		"react-query":           signals.SignalReactQuery,
		"recoil":                signals.SignalReact,
		"jotai":                 signals.SignalReact,
		"mobx":                  signals.SignalReact,

		// ===== FRONTEND UI LIBRARIES =====
		"tailwindcss":                   signals.SignalTailwind,
		"@mui/material":                 signals.SignalMaterialUI,
		"@chakra-ui/react":              signals.SignalChakraUI,
		"framer-motion":                 signals.SignalFramerMotion,
		"@radix-ui/react-dialog":        signals.SignalReact, // Radix UI (Shadcn base)
		"@radix-ui/react-dropdown-menu": signals.SignalReact,
		"@radix-ui/react-slot":          signals.SignalReact,
		"@radix-ui/react-tabs":          signals.SignalReact,
		"class-variance-authority":      signals.SignalTailwind, // CVA for Shadcn
		"clsx":                          signals.SignalReact,
		"tailwind-merge":                signals.SignalTailwind,
		"tailwindcss-animate":           signals.SignalTailwind,
		"lucide-react":                  signals.SignalReact, // Icons
		"@heroicons/react":              signals.SignalReact,
		"react-icons":                   signals.SignalReact,

		// ===== FORMS & VALIDATION =====
		"zod":                 signals.SignalInputValidation,
		"yup":                 signals.SignalInputValidation,
		"joi":                 signals.SignalInputValidation,
		"react-hook-form":     signals.SignalReact,
		"formik":              signals.SignalReact,
		"@hookform/resolvers": signals.SignalInputValidation,

		// ===== DATA VISUALIZATION =====
		"recharts":        signals.SignalReact,
		"chart.js":        signals.SignalReact,
		"d3":              signals.SignalReact,
		"victory":         signals.SignalReact,
		"nivo":            signals.SignalReact,
		"react-chartjs-2": signals.SignalReact,

		// ===== ROUTING =====
		"react-router-dom": signals.SignalReact,
		"@tanstack/router": signals.SignalReact,
		"wouter":           signals.SignalReact,

		// ===== HTTP CLIENTS =====
		"axios": signals.SignalReact,
		"ky":    signals.SignalReact,
		"got":   signals.SignalHTTPFramework,

		// ===== ANIMATION & UI EFFECTS =====
		"lottie-react":                     signals.SignalReact,
		"@lottiefiles/react-lottie-player": signals.SignalReact,
		"gsap":                             signals.SignalReact,
		"react-spring":                     signals.SignalReact,
		"react-countup":                    signals.SignalReact,
		"react-big-calendar":               signals.SignalReact,

		// ===== DATE/TIME =====
		"date-fns": signals.SignalReact,
		"dayjs":    signals.SignalReact,
		"moment":   signals.SignalReact,
		"luxon":    signals.SignalReact,

		// ===== DATABASES =====
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

		// ===== MESSAGE QUEUES =====
		"amqplib":                    signals.SignalRabbitMQ,
		"amqp":                       signals.SignalRabbitMQ,
		"@golevelup/nestjs-rabbitmq": signals.SignalRabbitMQ,
		"kafkajs":                    signals.SignalKafka,
		"kafka-node":                 signals.SignalKafka,
		"node-rdkafka":               signals.SignalKafka,
		"bullmq":                     signals.SignalRedis,
		"bull":                       signals.SignalRedis,
		"@nestjs/bull":               signals.SignalRedis,

		// ===== HTTP/API FRAMEWORKS =====
		"express":        signals.SignalExpress,
		"fastify":        signals.SignalHTTPFramework,
		"@nestjs/core":   signals.SignalNestJS,
		"koa":            signals.SignalHTTPFramework,
		"hapi":           signals.SignalHTTPFramework,
		"@grpc/grpc-js":  signals.SignalGRPC,
		"graphql":        signals.SignalGraphQL,
		"@apollo/server": signals.SignalGraphQL,
		"@apollo/client": signals.SignalGraphQL,
		"type-graphql":   signals.SignalGraphQL,
		"urql":           signals.SignalGraphQL,

		// ===== SECURITY =====
		"jsonwebtoken":       signals.SignalJWT,
		"passport":           signals.SignalOAuth,
		"@nestjs/passport":   signals.SignalOAuth,
		"bcrypt":             signals.SignalPasswordHashing,
		"argon2":             signals.SignalPasswordHashing,
		"helmet":             signals.SignalHelmet,
		"express-rate-limit": signals.SignalRateLimiting,
		"cors":               signals.SignalCORS,

		// ===== OBSERVABILITY =====
		"prom-client":             signals.SignalPrometheus,
		"@opentelemetry/sdk-node": signals.SignalOpenTelemetry,
		"@sentry/node":            signals.SignalSentry,
		"@sentry/react":           signals.SignalSentry,
		"@sentry/browser":         signals.SignalSentry,
		"dd-trace":                signals.SignalDatadog,
		"winston":                 signals.SignalStructuredLogging,
		"pino":                    signals.SignalStructuredLogging,

		// ===== WEBSOCKET & REAL-TIME =====
		"ws":                 signals.SignalWebSocket,
		"socket.io":          signals.SignalWebSocket,
		"socket.io-client":   signals.SignalWebSocket,
		"@nestjs/websockets": signals.SignalWebSocket,

		// ===== TESTING =====
		"jest":                   signals.SignalJest,
		"vitest":                 signals.SignalUnitTests,
		"@testing-library/react": signals.SignalUnitTests,
		"supertest":              signals.SignalIntegrationTests,
		"cypress":                signals.SignalCypress,
		"@playwright/test":       signals.SignalPlaywright,
		"playwright":             signals.SignalPlaywright,
		"msw":                    signals.SignalMocking, // Mock Service Worker

		// ===== CLOUD SDKs =====
		"aws-sdk":               signals.SignalAWS,
		"@aws-sdk/client-s3":    signals.SignalS3,
		"@google-cloud/storage": signals.SignalGCP,
		"@azure/storage-blob":   signals.SignalAzure,

		// ===== BAAS =====
		"@supabase/supabase-js": signals.SignalSupabase,
		"firebase":              signals.SignalFirebase,
		"firebase-admin":        signals.SignalFirebase,

		// ===== TYPESCRIPT =====
		"typescript": signals.SignalReact, // Implies modern codebase
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
