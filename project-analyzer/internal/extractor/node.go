package extractor

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/rs/zerolog/log"
	"github.com/verifydev/project-analyzer/internal/debug"
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
		// ===== FRONTEND FRAMEWORKS (EXACT MATCH ONLY) =====
		"react":         signals.SignalReact,
		"react-dom":     signals.SignalReact,
		"next":          signals.SignalNextJS,
		"vue":           signals.SignalVue,
		"nuxt":          signals.SignalVue,
		"@angular/core": signals.SignalAngular,
		"svelte":        signals.SignalSvelte,
		"solid-js":      signals.SignalSolidJS,
		"preact":        signals.SignalPreact,

		// ===== BUILD TOOLS & BUNDLERS =====
		// Note: vite, webpack, esbuild are framework-agnostic - don't assume React
		"@vitejs/plugin-react": signals.SignalReact, // Only this is React-specific
		"turbopack":            signals.SignalNextJS,

		// ===== FRONTEND STATE MANAGEMENT =====
		"redux":                 signals.SignalRedux,
		"@reduxjs/toolkit":      signals.SignalRedux,
		"zustand":               signals.SignalZustand,
		"@tanstack/react-query": signals.SignalReactQuery,
		"react-query":           signals.SignalReactQuery,
		"recoil":                signals.SignalReact,
		"jotai":                 signals.SignalReact,
		// Note: mobx is framework-agnostic

		// ===== FRONTEND UI LIBRARIES (React-specific only) =====
		"tailwindcss":                   signals.SignalTailwind,
		"@mui/material":                 signals.SignalMaterialUI,
		"@chakra-ui/react":              signals.SignalChakraUI,
		"framer-motion":                 signals.SignalFramerMotion,
		"@radix-ui/react-dialog":        signals.SignalReact,
		"@radix-ui/react-dropdown-menu": signals.SignalReact,
		"@radix-ui/react-slot":          signals.SignalReact,
		"@radix-ui/react-tabs":          signals.SignalReact,
		"class-variance-authority":      signals.SignalTailwind,
		"tailwind-merge":                signals.SignalTailwind,
		"tailwindcss-animate":           signals.SignalTailwind,
		"lucide-react":                  signals.SignalReact,
		"@heroicons/react":              signals.SignalReact,
		"react-icons":                   signals.SignalReact,
		// Note: clsx is a utility - not React-specific

		// ===== FORMS & VALIDATION =====
		"zod":                 signals.SignalInputValidation,
		"yup":                 signals.SignalInputValidation,
		"joi":                 signals.SignalInputValidation,
		"react-hook-form":     signals.SignalReact,
		"@hookform/resolvers": signals.SignalInputValidation,
		// Note: formik is framework-agnostic

		// ===== DATA VISUALIZATION (React-specific only) =====
		"recharts":        signals.SignalReact,
		"react-chartjs-2": signals.SignalReact,
		// Note: chart.js, d3, victory, nivo are framework-agnostic

		// ===== ROUTING =====
		"react-router-dom": signals.SignalReact,
		"@tanstack/router": signals.SignalReact,
		"wouter":           signals.SignalReact,

		// ===== HTTP CLIENTS =====
		// Note: axios, ky, got are generic - don't map to React
		"got": signals.SignalHTTPFramework,

		// ===== ANIMATION & UI EFFECTS (React-specific) =====
		"lottie-react":                     signals.SignalReact,
		"@lottiefiles/react-lottie-player": signals.SignalReact,
		"react-spring":                     signals.SignalReact,
		"react-countup":                    signals.SignalReact,
		"react-big-calendar":               signals.SignalReact,

		// ===== DATE/TIME =====
		// Note: date libraries are generic utilities - don't map to React

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
		"typescript": signals.SignalTypeScript,
	}

	debug.LogPackage("npm", servicePath+"/package.json", 0)

	// Check dependencies and devDependencies
	for _, depType := range []string{"dependencies", "devDependencies"} {
		if deps, ok := pkg[depType].(map[string]interface{}); ok {
			debug.LogPackage(depType, servicePath, len(deps))
			for dep := range deps {
				depLower := strings.ToLower(dep)
				for pattern, signal := range depSignals {
					// Use EXACT match only to avoid false positives
					// e.g. @typescript-eslint should NOT match "react"
					if dep == pattern || depLower == strings.ToLower(pattern) {
						evidence := fmt.Sprintf("%s detected in %s/package.json", dep, serviceName)
						debug.LogDependency(dep, string(signal), serviceName+"/package.json")
						e.signals.AddSignal(signal, 0.9, []string{evidence}, "deep_service_scan")
					}
				}
			}
		}
	}
}

// analyzePackageJSON extracts signals from package.json files in the repo
func (e *InfraExtractor) analyzePackageJSON() {
	defer debug.Profile("analyzePackageJSON")()

	files := e.findFiles("package.json")
	log.Debug().Int("packageJsonCount", len(files)).Str("repoPath", e.repoPath).Msg("📦 analyzePackageJSON called")
	if len(files) > 0 {
		e.signals.AddSignal(signals.SignalNode, 1.0, []string{"Found package.json"}, "runtime_detection")
	}

	for _, file := range files {
		log.Debug().Str("file", file).Msg("📦 Processing package.json file")
		serviceName := filepath.Dir(file)
		if serviceName == "." {
			serviceName = "root"
		}

		// Reuse logic
		dir := filepath.Dir(filepath.Join(e.repoPath, file))
		e.scanServicePackageJSON(dir, serviceName)
	}
}

// analyzeNextJSStructure checks for Next.js specific file patterns
func (e *InfraExtractor) analyzeNextJSStructure() {
	// 1. Config File
	configFiles := []string{"next.config.js", "next.config.mjs", "next.config.ts"}
	for _, config := range configFiles {
		if len(e.findFiles(config)) > 0 {
			evidence := fmt.Sprintf("Found %s", config)
			e.signals.AddSignal(signals.SignalNextJS, 1.0, []string{evidence}, "structure_check")
			e.signals.AddSignal(signals.SignalReact, 1.0, []string{"Next.js implies React"}, "inference")
			break
		}
	}

	// 2. App Directory (App Router)
	// We verify if app/layout or app/page exists to confirm it's Next.js App Router
	// Note: findFiles finds specific filenames.
	// We'll check for app/layout.tsx, app/page.tsx, etc.
	appRouterFiles := []string{
		"app/layout.tsx", "app/layout.jsx", "app/layout.js", "app/layout.ts",
		"app/page.tsx", "app/page.jsx", "app/page.js", "app/page.ts",
	}
	for _, f := range appRouterFiles {
		// findFiles finds relative paths. "app/layout.tsx" matches strictly?
		// findFiles implementation uses glob or walker?
		// e.findFiles uses glob on filename usually? No, it walks.
		// Let's assume pattern matches "*/app/layout.tsx" or just "app/layout.tsx".
		// Actually findFiles argument is "target".
		// Let's look at findFiles: it walks and checks `info.Name() == target` or `match`.
		// If I pass "layout.tsx", it finds all layout.tsx. Then checks if parent is "app".

		// Let's use specific file checks if possible.
		// Simplification: Check common Next.js files
		if len(e.findFiles(filepath.Base(f))) > 0 {
			// Iterate results to check directory?
			files := e.findFiles(filepath.Base(f))
			for _, path := range files {
				// check if parent dir is "app"
				if filepath.Base(filepath.Dir(path)) == "app" {
					e.signals.AddSignal(signals.SignalNextJS, 0.9, []string{"Next.js App Router detected"}, "structure_check")
					e.signals.AddSignal(signals.SignalReact, 0.9, []string{"Next.js implies React"}, "inference")
					return
				}
			}
		}
	}

	// 3. Pages Directory
	pagesFiles := []string{
		"_app.tsx", "_app.jsx", "_app.js", "_app.ts",
		"_document.tsx", "_document.jsx", "_document.js",
	}
	for _, f := range pagesFiles {
		if len(e.findFiles(f)) > 0 {
			e.signals.AddSignal(signals.SignalNextJS, 0.9, []string{"Next.js Pages Router detected"}, "structure_check")
			e.signals.AddSignal(signals.SignalReact, 0.9, []string{"Next.js implies React"}, "inference")
			return
		}
	}
}

// analyzeOtherJSFrameworks checks for Nest, Angular, Vue, Svelte structure
func (e *InfraExtractor) analyzeOtherJSFrameworks() {
	// --- NestJS ---
	if len(e.findFiles("nest-cli.json")) > 0 {
		e.signals.AddSignal(signals.SignalNestJS, 1.0, []string{"Found nest-cli.json"}, "structure_check")
		e.signals.AddSignal(signals.SignalNode, 1.0, []string{"NestJS implies Node.js"}, "inference")
	}

	// --- Angular ---
	if len(e.findFiles("angular.json")) > 0 {
		e.signals.AddSignal(signals.SignalAngular, 1.0, []string{"Found angular.json"}, "structure_check")
		e.signals.AddSignal(signals.SignalTypeScript, 1.0, []string{"Angular implies TypeScript"}, "inference")
	}

	// --- Vue / Nuxt ---
	if len(e.findFiles("nuxt.config.js")) > 0 || len(e.findFiles("nuxt.config.ts")) > 0 {
		e.signals.AddSignal(signals.SignalVue, 1.0, []string{"Nuxt config detected"}, "inference")
	}
	if len(e.findFiles("*.vue")) > 0 {
		e.signals.AddSignal(signals.SignalVue, 1.0, []string{"Vue files detected"}, "structure_check")
	}

	// --- Svelte / SvelteKit ---
	if len(e.findFiles("svelte.config.js")) > 0 {
		e.signals.AddSignal(signals.SignalSvelte, 1.0, []string{"Found svelte.config.js"}, "structure_check")
	}
	if len(e.findFiles("*.svelte")) > 0 {
		e.signals.AddSignal(signals.SignalSvelte, 1.0, []string{"Svelte files detected"}, "structure_check")
	}

	// --- Monorepo Tools ---
	if len(e.findFiles("nx.json")) > 0 {
		e.signals.AddSignal(signals.SignalMonorepo, 1.0, []string{"Nx monorepo detected"}, "structure_check")
	}
	if len(e.findFiles("turbo.json")) > 0 {
		e.signals.AddSignal(signals.SignalMonorepo, 1.0, []string{"Turborepo detected"}, "structure_check")
	}
	if len(e.findFiles("lerna.json")) > 0 {
		e.signals.AddSignal(signals.SignalMonorepo, 1.0, []string{"Lerna monorepo detected"}, "structure_check")
	}
	if len(e.findFiles("pnpm-workspace.yaml")) > 0 {
		e.signals.AddSignal(signals.SignalMonorepo, 1.0, []string{"pnpm workspace detected"}, "structure_check")
	}
}

// analyzeReactStructure checks for React specific file patterns
func (e *InfraExtractor) analyzeReactStructure() {
	// JSX/TSX files strongly imply React (or React-like libraries)
	if len(e.findFiles("*.jsx")) > 0 {
		e.signals.AddSignal(signals.SignalReact, 0.9, []string{"JSX files detected"}, "structure_check")
	}
	if len(e.findFiles("*.tsx")) > 0 {
		e.signals.AddSignal(signals.SignalReact, 0.9, []string{"TSX files detected"}, "structure_check")
		e.signals.AddSignal(signals.SignalTypeScript, 1.0, []string{"TSX implies TypeScript"}, "inference")
	}
}
