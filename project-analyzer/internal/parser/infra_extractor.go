package parser

import (
	"bufio"
	"encoding/json"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/verifydev/project-analyzer/pkg/signals"
)

// InfraExtractor extracts infrastructure signals from a repository
// LAYER 1: Pure fact extraction - NO decisions
type InfraExtractor struct {
	repoPath string
	signals  *signals.InfrastructureSignals
}

func NewInfraExtractor(repoPath string) *InfraExtractor {
	return &InfraExtractor{
		repoPath: repoPath,
		signals: &signals.InfrastructureSignals{
			SignalDetails: make(map[signals.InfraSignal]signals.SignalDetail),
		},
	}
}

// Extract performs full infrastructure signal extraction
func (e *InfraExtractor) Extract() *signals.InfrastructureSignals {
	// Phase 1: Root file signals
	e.extractRootFileSignals()

	// Phase 2: Configuration file signals
	e.extractConfigSignals()

	// Phase 3: Package/dependency signals
	e.extractDependencySignals()

	// Phase 4: Service structure signals
	e.extractServiceStructureSignals()

	// Phase 5: Code pattern signals
	e.extractCodePatternSignals()

	// Phase 6: Docker compose analysis
	e.extractDockerComposeSignals()

	// ===== EXTREME LEVEL EXTRACTION =====
	// Phase 7: Cloud-native & Infrastructure as Code
	e.extractCloudNativeSignals()

	// Phase 8: Machine Learning & AI patterns
	e.extractMLSignals()

	// Phase 9: Search & Analytics patterns
	e.extractSearchSignals()

	// Phase 10: Advanced Testing patterns
	e.extractTestingSignals()

	// Phase 11: Advanced Observability patterns
	e.extractObservabilitySignals()

	// Phase 12: Deployment & Release patterns
	e.extractDeploymentSignals()

	// Phase 13: Project Completeness Validation
	// Reduces confidence for frameworks that are declared but not implemented
	e.validateProjectCompleteness()

	return e.signals
}

// validateProjectCompleteness reduces confidence for incomplete projects
func (e *InfraExtractor) validateProjectCompleteness() {
	// Check if React/Next.js is declared but no actual components exist
	if e.signals.HasSignal(signals.SignalHTTPFramework) {
		// For Go projects, verify there are actual .go files with handlers
		goFiles := e.findFiles("*.go")
		hasHandlers := e.findCodePattern(`func.*Handler|func.*http\\.ResponseWriter|c\\.JSON|ctx\\.JSON|r\\.GET|e\\.GET`)

		if len(goFiles) < 3 || !hasHandlers {
			// Reduce confidence - project is likely incomplete
			if detail, ok := e.signals.SignalDetails[signals.SignalHTTPFramework]; ok {
				detail.Confidence = detail.Confidence * 0.5
				detail.Evidence = append(detail.Evidence, "Warning: Framework declared but limited implementation detected")
				e.signals.SignalDetails[signals.SignalHTTPFramework] = detail
			}
		}
	}

	// Check total code files - incomplete projects often have very few files
	jsFiles := e.findFiles("*.js", "*.jsx", "*.ts", "*.tsx")
	goFiles := e.findFiles("*.go")
	pyFiles := e.findFiles("*.py")

	totalCodeFiles := len(jsFiles) + len(goFiles) + len(pyFiles)

	// If project has very few code files, mark as potentially incomplete
	if totalCodeFiles < 5 {
		e.signals.AddSignal(signals.SignalIncompleteProject, 0.7,
			[]string{"Project has only " + string(rune(totalCodeFiles)) + " code files"},
			"completeness_check")
	}

	// For Node.js projects, verify src/ or pages/ or components/ exist
	if len(jsFiles) > 0 {
		hasSrc := e.findFiles("src/*")
		hasPages := e.findFiles("pages/*", "app/*")
		hasComponents := e.findFiles("components/*")

		if len(hasSrc) == 0 && len(hasPages) == 0 && len(hasComponents) == 0 {
			// Only has config files, no actual code structure
			e.signals.AddSignal(signals.SignalIncompleteProject, 0.8,
				[]string{"No src/, pages/, or components/ directories found"},
				"structure_check")
		}
	}

	// For Go projects, verify cmd/ or internal/ structure exists
	if len(goFiles) > 0 {
		hasCmd := e.findFiles("cmd/*")
		hasInternal := e.findFiles("internal/*")
		hasPkg := e.findFiles("pkg/*")

		// Check for main.go at minimum
		hasMain := e.findFiles("main.go", "cmd/*/main.go")

		if len(hasMain) == 0 && len(hasCmd) == 0 && len(hasInternal) == 0 && len(hasPkg) == 0 {
			e.signals.AddSignal(signals.SignalIncompleteProject, 0.8,
				[]string{"No main.go, cmd/, internal/, or pkg/ structure found"},
				"structure_check")
		}
	}
}

// extractRootFileSignals checks for key files in root
func (e *InfraExtractor) extractRootFileSignals() {
	rootFiles := map[string]signals.InfraSignal{
		"Dockerfile":          signals.SignalDocker,
		"docker-compose.yml":  signals.SignalDockerCompose,
		"docker-compose.yaml": signals.SignalDockerCompose,
		"nginx.conf":          signals.SignalNginx,
		"kubernetes":          signals.SignalKubernetes,
		"k8s":                 signals.SignalKubernetes,
		"helm":                signals.SignalHelm,
		"Makefile":            signals.SignalDocker, // Often indicates build automation
		".travis.yml":         signals.SignalTravisCI,
		"Jenkinsfile":         signals.SignalJenkins,
		".circleci":           signals.SignalCircleCI,
		"prometheus.yml":      signals.SignalPrometheus,
	}

	// Check root directory
	entries, err := os.ReadDir(e.repoPath)
	if err != nil {
		return
	}

	for _, entry := range entries {
		name := entry.Name()

		// Direct file matches
		if signal, ok := rootFiles[name]; ok {
			e.signals.AddSignal(signal, 0.95, []string{name}, "root_file")
		}

		// Directory matches
		if entry.IsDir() {
			switch name {
			case "kubernetes", "k8s":
				e.signals.AddSignal(signals.SignalKubernetes, 0.9, []string{name + "/"}, "directory")
			case "helm":
				e.signals.AddSignal(signals.SignalHelm, 0.9, []string{name + "/"}, "directory")
			case ".github":
				e.checkGitHubActions(filepath.Join(e.repoPath, name))
			case ".gitlab-ci.yml":
				e.signals.AddSignal(signals.SignalGitLabCI, 0.95, []string{".gitlab-ci.yml"}, "file")
			case "prisma":
				e.signals.AddSignal(signals.SignalPrisma, 0.95, []string{"prisma/"}, "directory")
			}
		}
	}

	// Check for multiple Dockerfiles (microservice indicator)
	dockerfiles := e.findFiles("Dockerfile")
	if len(dockerfiles) > 1 {
		e.signals.AddSignal(signals.SignalMultipleServices, 0.85, dockerfiles, "multiple_dockerfiles")
		e.signals.ServiceCount = len(dockerfiles)
	}
}

// checkGitHubActions checks for GitHub Actions workflows
func (e *InfraExtractor) checkGitHubActions(path string) {
	workflowPath := filepath.Join(path, "workflows")
	if entries, err := os.ReadDir(workflowPath); err == nil && len(entries) > 0 {
		var evidence []string
		for _, entry := range entries {
			if strings.HasSuffix(entry.Name(), ".yml") || strings.HasSuffix(entry.Name(), ".yaml") {
				evidence = append(evidence, ".github/workflows/"+entry.Name())
			}
		}
		if len(evidence) > 0 {
			e.signals.AddSignal(signals.SignalGitHubActions, 0.95, evidence, "github_actions")
		}
	}
}

// extractConfigSignals analyzes configuration files
func (e *InfraExtractor) extractConfigSignals() {
	// Check for .env files
	envFiles := e.findFiles(".env*")
	if len(envFiles) > 0 {
		e.analyzeEnvFiles(envFiles)
	}

	// Check nginx configs
	nginxFiles := e.findFiles("nginx.conf", "*.nginx.conf", "conf.d/*.conf")
	if len(nginxFiles) > 0 {
		e.signals.AddSignal(signals.SignalNginx, 0.95, nginxFiles, "nginx_config")
		e.signals.AddSignal(signals.SignalAPIGatewayPattern, 0.85, nginxFiles, "reverse_proxy")
	}

	// Check SSL/TLS configs
	sslFiles := e.findFiles("*.pem", "*.crt", "*.key", "ssl/*")
	if len(sslFiles) > 0 {
		e.signals.AddSignal(signals.SignalSSL, 0.8, sslFiles, "ssl_files")
	}
}

// analyzeEnvFiles extracts signals from environment files
func (e *InfraExtractor) analyzeEnvFiles(files []string) {
	envPatterns := map[string]signals.InfraSignal{
		"DATABASE_URL": signals.SignalPostgres,
		"POSTGRES":     signals.SignalPostgres,
		"MYSQL":        signals.SignalMySQL,
		"MONGODB":      signals.SignalMongoDB,
		"MONGO_URI":    signals.SignalMongoDB,
		"REDIS":        signals.SignalRedis,
		"RABBITMQ":     signals.SignalRabbitMQ,
		"AMQP":         signals.SignalRabbitMQ,
		"KAFKA":        signals.SignalKafka,
		"AWS_ACCESS":   signals.SignalAWS,
		"AWS_SECRET":   signals.SignalAWS,
		"GCP":          signals.SignalGCP,
		"AZURE":        signals.SignalAzure,
		"JWT_SECRET":   signals.SignalJWT,
		"OAUTH":        signals.SignalOAuth,
		"SENTRY_DSN":   signals.SignalSentry,
		"DATADOG":      signals.SignalDatadog,
		"NEW_RELIC":    signals.SignalNewRelic,
		"PROMETHEUS":   signals.SignalPrometheus,
	}

	for _, file := range files {
		content, err := os.ReadFile(filepath.Join(e.repoPath, file))
		if err != nil {
			continue
		}

		contentStr := strings.ToUpper(string(content))
		for pattern, signal := range envPatterns {
			if strings.Contains(contentStr, pattern) {
				e.signals.AddSignal(signal, 0.85, []string{file + " contains " + pattern}, "env_file")
			}
		}
	}
}

// extractDependencySignals analyzes package files
func (e *InfraExtractor) extractDependencySignals() {
	// Node.js packages
	e.analyzePackageJSON()

	// Go modules
	e.analyzeGoMod()

	// Python requirements
	e.analyzePythonDeps()
}

// analyzePackageJSON extracts signals from package.json
func (e *InfraExtractor) analyzePackageJSON() {
	files := e.findFiles("package.json")

	depSignals := map[string]signals.InfraSignal{
		// Databases
		"prisma":    signals.SignalPrisma,
		"@prisma":   signals.SignalPrisma,
		"typeorm":   signals.SignalTypeORM,
		"sequelize": signals.SignalSequelze,
		"mongoose":  signals.SignalMongoose,
		"pg":        signals.SignalPostgres,
		"mysql":     signals.SignalMySQL,
		"mongodb":   signals.SignalMongoDB,

		// Message Queues
		"amqplib": signals.SignalRabbitMQ,
		"amqp":    signals.SignalRabbitMQ,
		"kafkajs": signals.SignalKafka,
		"ioredis": signals.SignalRedis,
		"redis":   signals.SignalRedis,
		"bull":    signals.SignalRedis,
		"bullmq":  signals.SignalRedis,

		// Security
		"jsonwebtoken":       signals.SignalJWT,
		"passport":           signals.SignalOAuth,
		"passport-oauth":     signals.SignalOAuth2,
		"helmet":             signals.SignalHelmet,
		"cors":               signals.SignalCORS,
		"express-rate-limit": signals.SignalRateLimiting,

		// Observability
		"prom-client":  signals.SignalPrometheus,
		"winston":      signals.SignalStructuredLogging,
		"pino":         signals.SignalStructuredLogging,
		"@sentry/node": signals.SignalSentry,
		"newrelic":     signals.SignalNewRelic,
		"dd-trace":     signals.SignalDatadog,

		// Testing
		"jest":           signals.SignalUnitTests,
		"mocha":          signals.SignalUnitTests,
		"chai":           signals.SignalUnitTests,
		"supertest":      signals.SignalIntegrationTests,
		"cypress":        signals.SignalE2ETests,
		"playwright":     signals.SignalE2ETests,
		"testcontainers": signals.SignalTestContainers,

		// AWS
		"aws-sdk":  signals.SignalAWS,
		"@aws-sdk": signals.SignalAWS,
	}

	for _, file := range files {
		content, err := os.ReadFile(filepath.Join(e.repoPath, file))
		if err != nil {
			continue
		}

		var pkg map[string]interface{}
		if err := json.Unmarshal(content, &pkg); err != nil {
			continue
		}

		// Check dependencies and devDependencies
		for _, depType := range []string{"dependencies", "devDependencies"} {
			if deps, ok := pkg[depType].(map[string]interface{}); ok {
				for dep := range deps {
					depLower := strings.ToLower(dep)
					for pattern, signal := range depSignals {
						if strings.Contains(depLower, pattern) {
							e.signals.AddSignal(signal, 0.9, []string{file + " → " + dep}, "package_dep")
						}
					}
				}
			}
		}
	}
}

// analyzeGoMod extracts signals from go.mod
func (e *InfraExtractor) analyzeGoMod() {
	files := e.findFiles("go.mod")

	depSignals := map[string]signals.InfraSignal{
		// Message Queues
		"rabbitmq": signals.SignalRabbitMQ,
		"amqp":     signals.SignalRabbitMQ,
		"kafka":    signals.SignalKafka,
		"redis":    signals.SignalRedis,
		"go-redis": signals.SignalRedis,
		"nats":     signals.SignalNATS,

		// Databases
		"pgx":          signals.SignalPostgres,
		"pq":           signals.SignalPostgres,
		"gorm":         signals.SignalGORM,
		"mongo-driver": signals.SignalMongoDB,
		"sqlx":         signals.SignalPostgres,
		"ent/ent":      signals.SignalGORM,
		"sqlc":         signals.SignalPostgres,
		"mysql":        signals.SignalMySQL,

		// Web Frameworks
		"gin-gonic/gin":     signals.SignalHTTPFramework,
		"labstack/echo":     signals.SignalHTTPFramework,
		"gofiber/fiber":     signals.SignalHTTPFramework,
		"go-chi/chi":        signals.SignalHTTPFramework,
		"gorilla/mux":       signals.SignalHTTPFramework,
		"gorilla/websocket": signals.SignalWebSocket,

		// Security
		"jwt-go":     signals.SignalJWT,
		"golang-jwt": signals.SignalJWT,
		"casbin":     signals.SignalRBAC,
		"oauth2":     signals.SignalOAuth2,
		"bcrypt":     signals.SignalPasswordHashing,
		"argon2":     signals.SignalPasswordHashing,

		// Observability
		"prometheus":    signals.SignalPrometheus,
		"opentelemetry": signals.SignalOpenTelemetry,
		"jaeger":        signals.SignalJaeger,
		"zerolog":       signals.SignalStructuredLogging,
		"zap":           signals.SignalStructuredLogging,
		"logrus":        signals.SignalStructuredLogging,
		"sentry-go":     signals.SignalSentry,

		// Testing
		"testify":           signals.SignalUnitTests,
		"gomock":            signals.SignalMocking,
		"go-sqlmock":        signals.SignalMocking,
		"testcontainers-go": signals.SignalTestContainers,

		// Cloud & Infrastructure
		"aws-sdk-go":   signals.SignalAWS,
		"google-cloud": signals.SignalGCP,
		"azure-sdk":    signals.SignalAzure,

		// gRPC & APIs
		"grpc-go":      signals.SignalGRPC,
		"protobuf":     signals.SignalProtobuf,
		"grpc-gateway": signals.SignalAPIGatewayPattern,
		"go-swagger":   signals.SignalOpenAPI,
		"swaggo":       signals.SignalOpenAPI,

		// Configuration
		"viper":    signals.SignalConfigManagement,
		"godotenv": signals.SignalConfigManagement,

		// CLI & Tools
		"cobra":      signals.SignalCodeDocumentation,
		"urfave/cli": signals.SignalCodeDocumentation,

		// Validation & Utilities
		"validator":       signals.SignalInputValidation,
		"ozzo-validation": signals.SignalInputValidation,
		"uuid":            signals.SignalCodeDocumentation,

		// Search
		"elastic/go-elasticsearch": signals.SignalElasticsearch,
		"olivere/elastic":          signals.SignalElasticsearch,
	}

	for _, file := range files {
		content, err := os.ReadFile(filepath.Join(e.repoPath, file))
		if err != nil {
			continue
		}

		contentStr := strings.ToLower(string(content))
		for pattern, signal := range depSignals {
			if strings.Contains(contentStr, pattern) {
				e.signals.AddSignal(signal, 0.9, []string{file + " → " + pattern}, "go_mod")
			}
		}

		// Check for multiple go.mod files (microservices indicator)
		if len(files) > 1 {
			e.signals.AddSignal(signals.SignalMultipleServices, 0.85, files, "multiple_go_modules")
			e.signals.ServiceCount = len(files)
		}
	}
}

// analyzePythonDeps extracts signals from requirements.txt/pyproject.toml
func (e *InfraExtractor) analyzePythonDeps() {
	files := e.findFiles("requirements.txt", "pyproject.toml", "setup.py")

	depSignals := map[string]signals.InfraSignal{
		"celery":       signals.SignalWorkerQueues,
		"pika":         signals.SignalRabbitMQ,
		"kafka-python": signals.SignalKafka,
		"redis":        signals.SignalRedis,
		"psycopg":      signals.SignalPostgres,
		"sqlalchemy":   signals.SignalSQLAlch,
		"pymongo":      signals.SignalMongoDB,
		"pyjwt":        signals.SignalJWT,
		"prometheus":   signals.SignalPrometheus,
		"pytest":       signals.SignalUnitTests,
		"boto":         signals.SignalAWS,
		"sentry":       signals.SignalSentry,
	}

	for _, file := range files {
		content, err := os.ReadFile(filepath.Join(e.repoPath, file))
		if err != nil {
			continue
		}

		contentStr := strings.ToLower(string(content))
		for pattern, signal := range depSignals {
			if strings.Contains(contentStr, pattern) {
				e.signals.AddSignal(signal, 0.9, []string{file + " → " + pattern}, "python_dep")
			}
		}
	}
}

// extractServiceStructureSignals detects microservice patterns vs monorepo
func (e *InfraExtractor) extractServiceStructureSignals() {
	entries, err := os.ReadDir(e.repoPath)
	if err != nil {
		return
	}

	// First, check if this is a monorepo
	if e.isMonorepo() {
		e.signals.AddSignal(signals.SignalMonorepo, 0.95, []string{"Monorepo configuration detected (workspaces/lerna/nx/turbo)"}, "config")
	}

	servicePatterns := []string{
		"service", "svc", "api", "gateway", "worker", "processor", "consumer", "producer",
	}

	var potentialServices []string
	var frontendFolders []string
	var backendFolders []string

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		name := entry.Name()
		nameLower := strings.ToLower(name)

		// Skip hidden directories
		if strings.HasPrefix(name, ".") {
			continue
		}

		// Categorize folders
		if isFrontendFolder(name) {
			frontendFolders = append(frontendFolders, name)
			continue // Don't count frontend as a service
		}

		if isBackendFolder(name) {
			backendFolders = append(backendFolders, name)
		}

		// Check for service pattern names (excluding frontend folders)
		for _, pattern := range servicePatterns {
			if strings.Contains(nameLower, pattern) {
				potentialServices = append(potentialServices, name)
				break
			}
		}

		// Check if directory has its own package.json or go.mod (independent module)
		// But NOT if it's a frontend folder
		servicePath := filepath.Join(e.repoPath, name)
		hasIndependentPackage := fileExists(filepath.Join(servicePath, "package.json")) ||
			fileExists(filepath.Join(servicePath, "go.mod")) ||
			fileExists(filepath.Join(servicePath, "Dockerfile"))

		if hasIndependentPackage && !isFrontendFolder(name) {
			if !contains(potentialServices, name) {
				potentialServices = append(potentialServices, name)
			}
		}
	}

	// Mark if frontend exists
	if len(frontendFolders) > 0 {
		e.signals.AddSignal(signals.SignalFrontendOnly, 0.85, frontendFolders, "frontend_detection")
	}

	// Mark if backend exists
	if len(backendFolders) > 0 {
		e.signals.AddSignal(signals.SignalBackendOnly, 0.85, backendFolders, "backend_detection")
	}

	// CRITICAL LOGIC: Distinguish between Monorepo and Microservices
	//
	// MONOREPO: 1 frontend + 1 backend folder (like frontend/ + backend/)
	// MICROSERVICES: 2+ BACKEND services (like auth-service/ + user-service/ + job-service/)

	// Filter out frontend folders from potential services
	var actualBackendServices []string
	for _, svc := range potentialServices {
		if !isFrontendFolder(svc) {
			actualBackendServices = append(actualBackendServices, svc)
		}
	}

	// Case 1: It's a monorepo (has frontend + 1 backend, or workspaces config)
	if len(frontendFolders) > 0 && len(actualBackendServices) == 1 {
		e.signals.AddSignal(signals.SignalMonorepo, 0.90,
			append(frontendFolders, actualBackendServices...),
			"monorepo_structure")
		e.signals.ServiceCount = 1 // Only 1 actual backend service
		e.signals.ServiceNames = actualBackendServices
		return // Exit early - this is NOT microservices
	}

	// Case 2: Has workspaces but multiple packages (still monorepo, not microservices)
	if e.isMonorepo() && len(actualBackendServices) <= 2 {
		e.signals.AddSignal(signals.SignalMonorepo, 0.90,
			actualBackendServices,
			"workspace_monorepo")
		e.signals.ServiceCount = len(actualBackendServices)
		e.signals.ServiceNames = actualBackendServices
		return // Exit early - workspaces = monorepo
	}

	// Case 3: Actual microservices - 2+ independent backend services
	if len(actualBackendServices) >= 2 {
		e.signals.AddSignal(signals.SignalMultipleServices, 0.9, actualBackendServices, "service_dirs")
		e.signals.AddSignal(signals.SignalServiceIsolation, 0.85, actualBackendServices, "independent_services")
		e.signals.ServiceCount = len(actualBackendServices)
		e.signals.ServiceNames = actualBackendServices
	}

	// Check for specific service patterns in backend services
	for _, svc := range actualBackendServices {
		svcLower := strings.ToLower(svc)
		if strings.Contains(svcLower, "auth") {
			e.signals.AddSignal(signals.SignalAuthMicroservice, 0.9, []string{svc}, "auth_service")
		}
		if strings.Contains(svcLower, "gateway") {
			e.signals.AddSignal(signals.SignalAPIGatewayPattern, 0.9, []string{svc}, "gateway_service")
		}
	}
}

// extractDockerComposeSignals deep analyzes docker-compose.yml
func (e *InfraExtractor) extractDockerComposeSignals() {
	files := e.findFiles("docker-compose.yml", "docker-compose.yaml", "compose.yml", "compose.yaml")

	for _, file := range files {
		content, err := os.ReadFile(filepath.Join(e.repoPath, file))
		if err != nil {
			continue
		}

		contentStr := string(content)
		contentLower := strings.ToLower(contentStr)

		// Service detection - improved regex to handle different formats
		serviceRegex := regexp.MustCompile(`(?m)^  (\w[\w-]*):$`)
		matches := serviceRegex.FindAllStringSubmatch(contentStr, -1)

		var allServices []string
		var appServices []string   // Actual application services
		var infraServices []string // Database, queue, etc.

		for _, m := range matches {
			if len(m) > 1 {
				serviceName := m[1]
				allServices = append(allServices, serviceName)

				// Categorize as infra or app service
				if isInfraService(serviceName) {
					infraServices = append(infraServices, serviceName)
				} else if !isFrontendFolder(serviceName) {
					// It's an application service (and not frontend)
					appServices = append(appServices, serviceName)
				}
			}
		}

		// CRITICAL: Only mark as microservices if there are 2+ APPLICATION services
		// Not if there's 1 app + multiple infra (postgres, redis, etc.)
		if len(appServices) >= 2 {
			e.signals.AddSignal(signals.SignalMultipleServices, 0.95, appServices, "docker_compose_app_services")
			// Update service count only for app services
			if len(appServices) > e.signals.ServiceCount {
				e.signals.ServiceCount = len(appServices)
				e.signals.ServiceNames = appServices
			}
		} else if len(appServices) == 1 && len(allServices) > 1 {
			// 1 app service + infrastructure = single service app with infra
			// This is NOT microservices
			if e.hasFrontendFolder() {
				e.signals.AddSignal(signals.SignalMonorepo, 0.85,
					[]string{"Single backend with frontend + infrastructure"},
					"docker_compose_monorepo")
			}
		}

		// Database detection
		if strings.Contains(contentLower, "postgres") {
			e.signals.AddSignal(signals.SignalPostgres, 0.95, []string{file + " → postgres service"}, "compose")
		}
		if strings.Contains(contentLower, "mysql") {
			e.signals.AddSignal(signals.SignalMySQL, 0.95, []string{file + " → mysql service"}, "compose")
		}
		if strings.Contains(contentLower, "mongo") {
			e.signals.AddSignal(signals.SignalMongoDB, 0.95, []string{file + " → mongodb service"}, "compose")
		}

		// Message queue detection
		if strings.Contains(contentLower, "rabbitmq") {
			e.signals.AddSignal(signals.SignalRabbitMQ, 0.95, []string{file + " → rabbitmq service"}, "compose")
		}
		if strings.Contains(contentLower, "kafka") {
			e.signals.AddSignal(signals.SignalKafka, 0.95, []string{file + " → kafka service"}, "compose")
		}
		if strings.Contains(contentLower, "redis") {
			e.signals.AddSignal(signals.SignalRedis, 0.95, []string{file + " → redis service"}, "compose")
		}

		// Gateway detection
		if strings.Contains(contentLower, "nginx") {
			e.signals.AddSignal(signals.SignalNginx, 0.95, []string{file + " → nginx service"}, "compose")
			e.signals.AddSignal(signals.SignalAPIGatewayPattern, 0.9, []string{file + " → nginx as gateway"}, "compose")
		}
		if strings.Contains(contentLower, "traefik") {
			e.signals.AddSignal(signals.SignalTraefik, 0.95, []string{file + " → traefik service"}, "compose")
			e.signals.AddSignal(signals.SignalAPIGatewayPattern, 0.9, []string{file + " → traefik as gateway"}, "compose")
		}

		// Port exposure (multiple ports = separate services)
		portRegex := regexp.MustCompile(`ports:\s*\n\s*-\s*"?(\d+):(\d+)"?`)
		portMatches := portRegex.FindAllStringSubmatch(contentStr, -1)
		if len(portMatches) > 1 {
			e.signals.AddSignal(signals.SignalSeparatePorts, 0.85, []string{file + " → multiple port mappings"}, "compose")
		}

		// Health check detection
		if strings.Contains(contentLower, "healthcheck") {
			e.signals.AddSignal(signals.SignalHealthEndpoints, 0.85, []string{file + " → healthcheck configured"}, "compose")
		}

		// Volume mounts (shared data)
		if strings.Contains(contentLower, "volumes:") {
			// Could indicate shared storage
		}
	}
}

// extractCodePatternSignals scans code for architecture patterns
func (e *InfraExtractor) extractCodePatternSignals() {
	// Check for producer/consumer patterns
	if e.findCodePattern(`publish|produce|emit|sendMessage`) {
		e.signals.AddSignal(signals.SignalMessageProducer, 0.8, []string{"Message publishing code detected"}, "code")
	}
	if e.findCodePattern(`consume|subscribe|onMessage|handleMessage`) {
		e.signals.AddSignal(signals.SignalMessageConsumer, 0.8, []string{"Message consuming code detected"}, "code")
	}

	// Both producer and consumer = async communication
	if e.signals.HasSignal(signals.SignalMessageProducer) && e.signals.HasSignal(signals.SignalMessageConsumer) {
		e.signals.AddSignal(signals.SignalAsyncCommunication, 0.85, []string{"Producer/Consumer pattern detected"}, "inference")
	}

	// Event sourcing patterns
	if e.findCodePattern(`eventStore|EventSourcing|aggregate|DomainEvent`) {
		e.signals.AddSignal(signals.SignalEventSourcing, 0.8, []string{"Event sourcing pattern detected"}, "code")
	}

	// CQRS patterns
	if e.findCodePattern(`CommandHandler|QueryHandler|CQRS|Command.*Query`) {
		e.signals.AddSignal(signals.SignalCQRS, 0.8, []string{"CQRS pattern detected"}, "code")
	}

	// Circuit breaker
	if e.findCodePattern(`circuitBreaker|CircuitBreaker|fallback|retry`) {
		e.signals.AddSignal(signals.SignalCircuitBreaker, 0.75, []string{"Circuit breaker pattern detected"}, "code")
	}

	// Rate limiting
	if e.findCodePattern(`rateLimiter|RateLimit|throttle|Throttle`) {
		e.signals.AddSignal(signals.SignalRateLimiting, 0.8, []string{"Rate limiting code detected"}, "code")
	}

	// Graceful shutdown
	if e.findCodePattern(`gracefulShutdown|SIGTERM|SIGINT|shutdown.*graceful`) {
		e.signals.AddSignal(signals.SignalGracefulShutdown, 0.8, []string{"Graceful shutdown handling detected"}, "code")
	}

	// Health endpoints
	if e.findCodePattern(`/health|/healthz|/ready|/live|healthCheck`) {
		e.signals.AddSignal(signals.SignalHealthEndpoints, 0.85, []string{"Health check endpoints detected"}, "code")
	}

	// API versioning
	if e.findCodePattern(`/v1/|/v2/|/api/v\d`) {
		e.signals.AddSignal(signals.SignalAPIVersioning, 0.85, []string{"API versioning detected"}, "code")
	}

	// ===========================================
	// EXTREME LEVEL PATTERN DETECTION
	// ===========================================

	// Advanced Architecture Patterns
	if e.findCodePattern(`Repository\s*{|Repository\s*interface|IRepository|BaseRepository`) {
		e.signals.AddSignal(signals.SignalRepositoryPattern, 0.85, []string{"Repository pattern implementation detected"}, "code")
	}

	if e.findCodePattern(`Factory\s*{|CreateFactory|AbstractFactory|IFactory`) {
		e.signals.AddSignal(signals.SignalFactoryPattern, 0.85, []string{"Factory pattern implementation detected"}, "code")
	}

	if e.findCodePattern(`Singleton\s*{|getInstance|GetInstance|shared\s*=`) {
		e.signals.AddSignal(signals.SignalSingletonPattern, 0.80, []string{"Singleton pattern detected"}, "code")
	}

	if e.findCodePattern(`Observer\s*{|EventEmitter|addEventListener|Subscribe|Notify`) {
		e.signals.AddSignal(signals.SignalObserverPattern, 0.80, []string{"Observer pattern detected"}, "code")
	}

	if e.findCodePattern(`Strategy\s*{|IStrategy|ExecuteStrategy|SetStrategy`) {
		e.signals.AddSignal(signals.SignalStrategyPattern, 0.80, []string{"Strategy pattern detected"}, "code")
	}

	if e.findCodePattern(`Decorator\s*{|@.*\(|Wrap|Middleware`) {
		e.signals.AddSignal(signals.SignalDecoratorPattern, 0.75, []string{"Decorator pattern detected"}, "code")
	}

	// Clean Architecture / DDD Detection
	if e.findCodePattern(`domain/|Domain/|entities/|Entities/|valueObjects|ValueObjects`) {
		e.signals.AddSignal(signals.SignalDDDPattern, 0.80, []string{"Domain-Driven Design structure detected"}, "code")
	}

	if e.findCodePattern(`usecase/|usecases/|application/|Application/|services/.*Service`) {
		e.signals.AddSignal(signals.SignalCleanArchitecture, 0.80, []string{"Clean Architecture layers detected"}, "code")
	}

	if e.findCodePattern(`interface.*Repository|port/|ports/|adapter/|adapters/`) {
		e.signals.AddSignal(signals.SignalHexagonalArchitecture, 0.75, []string{"Hexagonal Architecture (Ports & Adapters) detected"}, "code")
	}

	// SOLID Principles Detection
	if e.findCodePattern(`interface\s+\w+\s*{.*\n\s*\w+\(`) {
		e.signals.AddSignal(signals.SignalSOLID, 0.70, []string{"Interface segregation patterns detected"}, "code")
	}

	// Dependency Injection
	if e.findCodePattern(`@Inject|@Injectable|inject\(|Provide|Container\.resolve|wire\.Build`) {
		e.signals.AddSignal(signals.SignalDependencyInjection, 0.85, []string{"Dependency injection framework detected"}, "code")
	}

	// Security Patterns
	if e.findCodePattern(`X-Content-Type-Options|X-Frame-Options|X-XSS-Protection|Content-Security-Policy`) {
		e.signals.AddSignal(signals.SignalOWASP, 0.85, []string{"OWASP security headers detected"}, "code")
	}

	if e.findCodePattern(`bcrypt|argon2|scrypt|pbkdf2|hash.*password|Password.*Hash`) {
		e.signals.AddSignal(signals.SignalPasswordHashing, 0.90, []string{"Secure password hashing detected"}, "code")
	}

	if e.findCodePattern(`AES|RSA|HMAC|encrypt|Encrypt|Cipher|crypto\.`) {
		e.signals.AddSignal(signals.SignalEncryption, 0.85, []string{"Encryption implementation detected"}, "code")
	}

	if e.findCodePattern(`MFA|2FA|TwoFactor|TOTP|authenticator`) {
		e.signals.AddSignal(signals.SignalMFA, 0.90, []string{"Multi-factor authentication detected"}, "code")
	}

	if e.findCodePattern(`audit.*log|AuditLog|logAudit|createAuditEntry`) {
		e.signals.AddSignal(signals.SignalAuditLogging, 0.85, []string{"Audit logging implementation detected"}, "code")
	}

	if e.findCodePattern(`RBAC|role.*permission|hasPermission|checkAccess|authorize`) {
		e.signals.AddSignal(signals.SignalRBAC, 0.85, []string{"Role-Based Access Control detected"}, "code")
	}

	if e.findCodePattern(`sanitize|escape|DOMPurify|xss.*filter|htmlspecialchars`) {
		e.signals.AddSignal(signals.SignalInputSanitization, 0.85, []string{"Input sanitization detected"}, "code")
	}

	if e.findCodePattern(`SqlParameter|PreparedStatement|parameterized|Prepare\(`) {
		e.signals.AddSignal(signals.SignalSQLInjectionPrevention, 0.85, []string{"SQL injection prevention detected"}, "code")
	}

	// API & Protocol Patterns
	if e.findCodePattern(`openapi|swagger|@ApiOperation|@ApiResponse`) {
		e.signals.AddSignal(signals.SignalOpenAPI, 0.90, []string{"OpenAPI/Swagger documentation detected"}, "code")
	}

	if e.findCodePattern(`\.proto|protobuf|Protocol Buffers|grpc\.`) {
		e.signals.AddSignal(signals.SignalProtobuf, 0.90, []string{"Protocol Buffers detected"}, "code")
	}

	if e.findCodePattern(`graphql|GraphQL|@Query|@Mutation|@Resolver|gql\x60`) {
		e.signals.AddSignal(signals.SignalGraphQL, 0.90, []string{"GraphQL implementation detected"}, "code")
	}

	if e.findCodePattern(`federation|@key|@external|@requires|subgraph`) {
		e.signals.AddSignal(signals.SignalGraphQLFederation, 0.85, []string{"GraphQL Federation detected"}, "code")
	}

	if e.findCodePattern(`WebSocket|ws://|wss://|socket\.io|Socket\.IO`) {
		e.signals.AddSignal(signals.SignalWebSocket, 0.90, []string{"WebSocket implementation detected"}, "code")
	}

	// Performance Patterns
	if e.findCodePattern(`@Cacheable|Cache-Control|redis\.get|memcached|cache\.Set`) {
		e.signals.AddSignal(signals.SignalCaching, 0.85, []string{"Caching implementation detected"}, "code")
	}

	if e.findCodePattern(`ConnectionPool|pool\.acquire|maxPoolSize|minPoolSize`) {
		e.signals.AddSignal(signals.SignalConnectionPooling, 0.85, []string{"Connection pooling detected"}, "code")
	}

	if e.findCodePattern(`LazyLoad|lazy\s*=|@Lazy|defer|Suspense`) {
		e.signals.AddSignal(signals.SignalLazyLoading, 0.80, []string{"Lazy loading pattern detected"}, "code")
	}

	if e.findCodePattern(`pagination|Paginate|pageSize|offset|cursor|nextPage`) {
		e.signals.AddSignal(signals.SignalPagination, 0.85, []string{"Pagination implementation detected"}, "code")
	}

	// Feature Management
	if e.findCodePattern(`featureFlag|FeatureToggle|isEnabled|LaunchDarkly|unleash`) {
		e.signals.AddSignal(signals.SignalFeatureFlags, 0.85, []string{"Feature flags implementation detected"}, "code")
	}

	if e.findCodePattern(`A/B.*test|abTest|experiment|variant`) {
		e.signals.AddSignal(signals.SignalABTesting, 0.80, []string{"A/B testing detected"}, "code")
	}

	// Data Processing Patterns
	if e.findCodePattern(`batch.*process|BatchJob|@Scheduled|cron|Quartz`) {
		e.signals.AddSignal(signals.SignalBatchProcessing, 0.85, []string{"Batch processing detected"}, "code")
	}

	if e.findCodePattern(`Stream\.|stream\(|Observable|Flux|pipeline|pipe\(`) {
		e.signals.AddSignal(signals.SignalStreamProcessing, 0.80, []string{"Stream processing detected"}, "code")
	}

	if e.findCodePattern(`ETL|Extract.*Transform.*Load|DataPipeline|Airflow`) {
		e.signals.AddSignal(signals.SignalETL, 0.85, []string{"ETL pipeline detected"}, "code")
	}

	// Compliance & Data Privacy
	if e.findCodePattern(`GDPR|gdpr|dataRetention|rightToDelete|anonymize`) {
		e.signals.AddSignal(signals.SignalGDPR, 0.85, []string{"GDPR compliance patterns detected"}, "code")
	}

	if e.findCodePattern(`PCI.*DSS|pci.*compliance|cardholder`) {
		e.signals.AddSignal(signals.SignalPCIDSS, 0.85, []string{"PCI-DSS compliance patterns detected"}, "code")
	}

	if e.findCodePattern(`anonymize|pseudonymize|mask.*data|redact`) {
		e.signals.AddSignal(signals.SignalDataAnonymization, 0.85, []string{"Data anonymization detected"}, "code")
	}

	// Error Handling & Resilience
	if e.findCodePattern(`ErrorBoundary|catch\s*\(|try\s*{|recover\(\)|panic\(`) {
		e.signals.AddSignal(signals.SignalErrorHandling, 0.80, []string{"Error handling patterns detected"}, "code")
	}

	if e.findCodePattern(`retry|Retry|backoff|exponential.*delay|maxRetries`) {
		e.signals.AddSignal(signals.SignalRetryLogic, 0.85, []string{"Retry logic with backoff detected"}, "code")
	}

	if e.findCodePattern(`timeout|Timeout|context\.WithTimeout|setTimeout`) {
		e.signals.AddSignal(signals.SignalTimeout, 0.80, []string{"Timeout handling detected"}, "code")
	}

	// Internationalization
	if e.findCodePattern(`i18n|intl|locale|translation|getMessage|formatMessage`) {
		e.signals.AddSignal(signals.SignalI18n, 0.85, []string{"Internationalization detected"}, "code")
	}

	// Documentation
	if e.findCodePattern(`@param|@returns|@example|@deprecated|\/\*\*`) {
		e.signals.AddSignal(signals.SignalCodeDocumentation, 0.75, []string{"Code documentation detected"}, "code")
	}

	// Async Patterns
	if e.findCodePattern(`async\s+function|await\s+|Promise\.|goroutine|go\s+func`) {
		e.signals.AddSignal(signals.SignalAsyncPatterns, 0.85, []string{"Async/concurrent programming patterns detected"}, "code")
	}

	if e.findCodePattern(`Mutex|RWMutex|sync\.Lock|synchronized|semaphore`) {
		e.signals.AddSignal(signals.SignalConcurrencyControl, 0.85, []string{"Concurrency control patterns detected"}, "code")
	}
}

// extractCloudNativeSignals detects cloud-native patterns
func (e *InfraExtractor) extractCloudNativeSignals() {
	// Infrastructure as Code files
	terraformFiles := e.findFiles("*.tf", "*.tfvars")
	if len(terraformFiles) > 0 {
		e.signals.AddSignal(signals.SignalTerraform, 0.95, []string{"Terraform configuration detected"}, "config")
		e.signals.AddSignal(signals.SignalIaC, 0.90, []string{"Infrastructure as Code detected"}, "config")
	}

	pulumiFiles := e.findFiles("Pulumi.yaml", "Pulumi.yml")
	if len(pulumiFiles) > 0 {
		e.signals.AddSignal(signals.SignalPulumi, 0.95, []string{"Pulumi configuration detected"}, "config")
		e.signals.AddSignal(signals.SignalIaC, 0.90, []string{"Infrastructure as Code detected"}, "config")
	}

	cloudFormationFiles := e.findFiles("template.yaml", "cloudformation.yaml", "sam.yaml")
	if len(cloudFormationFiles) > 0 {
		e.signals.AddSignal(signals.SignalCloudFormation, 0.95, []string{"CloudFormation/SAM template detected"}, "config")
		e.signals.AddSignal(signals.SignalIaC, 0.90, []string{"Infrastructure as Code detected"}, "config")
	}

	ansibleFiles := e.findFiles("playbook.yml", "ansible.cfg", "*.playbook.yml")
	if len(ansibleFiles) > 0 {
		e.signals.AddSignal(signals.SignalAnsible, 0.95, []string{"Ansible playbooks detected"}, "config")
		e.signals.AddSignal(signals.SignalIaC, 0.90, []string{"Infrastructure as Code detected"}, "config")
	}

	// Serverless configurations
	serverlessFiles := e.findFiles("serverless.yml", "serverless.yaml", "sam.yaml")
	if len(serverlessFiles) > 0 {
		e.signals.AddSignal(signals.SignalServerless, 0.95, []string{"Serverless framework detected"}, "config")
	}

	// Check for Lambda/Cloud Functions patterns in code
	if e.findCodePattern(`exports\.handler|lambda_handler|def handler\(event|@cloud_function`) {
		e.signals.AddSignal(signals.SignalLambda, 0.90, []string{"Lambda/Cloud Function handler detected"}, "code")
		e.signals.AddSignal(signals.SignalServerless, 0.85, []string{"Serverless function pattern detected"}, "code")
	}

	// Service Mesh configurations
	istioFiles := e.findFiles("istio*.yaml", "virtualservice*.yaml", "destinationrule*.yaml")
	if len(istioFiles) > 0 {
		e.signals.AddSignal(signals.SignalIstio, 0.95, []string{"Istio service mesh configuration detected"}, "config")
		e.signals.AddSignal(signals.SignalServiceMesh, 0.90, []string{"Service mesh detected"}, "config")
	}

	// Linkerd
	if e.findCodePattern(`linkerd\.io|linkerd-proxy|@linkerd`) {
		e.signals.AddSignal(signals.SignalLinkerd, 0.90, []string{"Linkerd service mesh detected"}, "code")
		e.signals.AddSignal(signals.SignalServiceMesh, 0.85, []string{"Service mesh detected"}, "code")
	}

	// Consul service discovery
	if e.findCodePattern(`consul\.|Consul|consul\.d|service.*discovery`) {
		e.signals.AddSignal(signals.SignalConsul, 0.85, []string{"Consul service discovery detected"}, "code")
	}

	// Vault secrets management
	vaultFiles := e.findFiles("vault*.hcl", "vault-policy*.hcl")
	if len(vaultFiles) > 0 || e.findCodePattern(`vault\.hashicorp|Vault|hvac\.Client`) {
		e.signals.AddSignal(signals.SignalVault, 0.90, []string{"HashiCorp Vault secrets management detected"}, "code")
	}

	// AWS Services
	if e.findCodePattern(`aws-sdk|@aws-sdk|boto3|AWS\.`) {
		e.signals.AddSignal(signals.SignalAWS, 0.90, []string{"AWS SDK usage detected"}, "code")
	}

	if e.findCodePattern(`S3Client|s3\.put|s3\.get|bucket.*s3`) {
		e.signals.AddSignal(signals.SignalS3, 0.90, []string{"AWS S3 usage detected"}, "code")
	}

	if e.findCodePattern(`SQSClient|sqs\.send|sqs\.receive|Queue.*sqs`) {
		e.signals.AddSignal(signals.SignalSQS, 0.90, []string{"AWS SQS usage detected"}, "code")
	}

	if e.findCodePattern(`SNSClient|sns\.publish|Topic.*sns`) {
		e.signals.AddSignal(signals.SignalSNS, 0.90, []string{"AWS SNS usage detected"}, "code")
	}

	if e.findCodePattern(`DynamoDBClient|dynamodb\.|Table.*dynamodb`) {
		e.signals.AddSignal(signals.SignalDynamoDB, 0.90, []string{"AWS DynamoDB usage detected"}, "code")
	}

	// GCP Services
	if e.findCodePattern(`@google-cloud|google\.cloud|from google\.cloud`) {
		e.signals.AddSignal(signals.SignalGCP, 0.90, []string{"Google Cloud SDK usage detected"}, "code")
	}

	// Azure Services
	if e.findCodePattern(`@azure|azure-sdk|from azure\.`) {
		e.signals.AddSignal(signals.SignalAzure, 0.90, []string{"Azure SDK usage detected"}, "code")
	}

	// CDN
	if e.findCodePattern(`CloudFront|cloudflare|Fastly|cdn\.`) {
		e.signals.AddSignal(signals.SignalCDN, 0.85, []string{"CDN configuration detected"}, "code")
	}
}

// extractMLSignals detects machine learning and AI patterns
func (e *InfraExtractor) extractMLSignals() {
	// Python ML frameworks
	if e.findCodePattern(`import tensorflow|from tensorflow|tf\.keras`) {
		e.signals.AddSignal(signals.SignalTensorFlow, 0.95, []string{"TensorFlow framework detected"}, "code")
		e.signals.AddSignal(signals.SignalML, 0.90, []string{"Machine learning detected"}, "code")
	}

	if e.findCodePattern(`import torch|from torch|torch\.nn`) {
		e.signals.AddSignal(signals.SignalPyTorch, 0.95, []string{"PyTorch framework detected"}, "code")
		e.signals.AddSignal(signals.SignalML, 0.90, []string{"Machine learning detected"}, "code")
	}

	if e.findCodePattern(`import sklearn|from sklearn|scikit-learn`) {
		e.signals.AddSignal(signals.SignalScikitLearn, 0.95, []string{"Scikit-learn framework detected"}, "code")
		e.signals.AddSignal(signals.SignalML, 0.90, []string{"Machine learning detected"}, "code")
	}

	if e.findCodePattern(`import pandas|from pandas|pd\.DataFrame`) {
		e.signals.AddSignal(signals.SignalPandas, 0.90, []string{"Pandas data analysis detected"}, "code")
	}

	if e.findCodePattern(`import numpy|from numpy|np\.array`) {
		e.signals.AddSignal(signals.SignalNumpy, 0.90, []string{"NumPy numerical computing detected"}, "code")
	}

	// MLOps tools
	if e.findCodePattern(`mlflow|MLflow|mlflow\.`) {
		e.signals.AddSignal(signals.SignalMLflow, 0.90, []string{"MLflow MLOps platform detected"}, "code")
		e.signals.AddSignal(signals.SignalMLOps, 0.85, []string{"MLOps practices detected"}, "code")
	}

	if e.findCodePattern(`kubeflow|Kubeflow|KFP`) {
		e.signals.AddSignal(signals.SignalKubeflow, 0.90, []string{"Kubeflow ML platform detected"}, "code")
		e.signals.AddSignal(signals.SignalMLOps, 0.85, []string{"MLOps practices detected"}, "code")
	}

	// Model serving
	if e.findCodePattern(`model\.predict|inference|serving|ModelServer`) {
		e.signals.AddSignal(signals.SignalModelServing, 0.80, []string{"Model serving pattern detected"}, "code")
	}

	// LLM/AI patterns
	if e.findCodePattern(`openai\.|OpenAI|ChatGPT|GPT-|langchain|LangChain`) {
		e.signals.AddSignal(signals.SignalLLM, 0.90, []string{"LLM/AI integration detected"}, "code")
	}

	// Vector databases
	if e.findCodePattern(`pinecone|weaviate|milvus|qdrant|chroma`) {
		e.signals.AddSignal(signals.SignalVectorDB, 0.90, []string{"Vector database detected"}, "code")
	}

	// Jupyter notebooks
	notebooks := e.findFiles("*.ipynb")
	if len(notebooks) > 0 {
		e.signals.AddSignal(signals.SignalJupyter, 0.95, []string{"Jupyter notebooks detected"}, "code")
	}
}

// extractSearchSignals detects search and analytics patterns
func (e *InfraExtractor) extractSearchSignals() {
	// Elasticsearch
	if e.findCodePattern(`elasticsearch|@elastic/elasticsearch|Elasticsearch`) {
		e.signals.AddSignal(signals.SignalElasticsearch, 0.90, []string{"Elasticsearch integration detected"}, "code")
	}

	// OpenSearch
	if e.findCodePattern(`opensearch|OpenSearch`) {
		e.signals.AddSignal(signals.SignalOpenSearch, 0.90, []string{"OpenSearch integration detected"}, "code")
	}

	// MeiliSearch
	if e.findCodePattern(`meilisearch|MeiliSearch`) {
		e.signals.AddSignal(signals.SignalMeiliSearch, 0.90, []string{"MeiliSearch integration detected"}, "code")
	}

	// Algolia
	if e.findCodePattern(`algolia|Algolia|algoliasearch`) {
		e.signals.AddSignal(signals.SignalAlgolia, 0.90, []string{"Algolia search integration detected"}, "code")
	}

	// Analytics
	if e.findCodePattern(`ClickHouse|clickhouse`) {
		e.signals.AddSignal(signals.SignalClickHouse, 0.90, []string{"ClickHouse analytics database detected"}, "code")
	}

	// TimescaleDB
	if e.findCodePattern(`timescale|TimescaleDB|hypertable`) {
		e.signals.AddSignal(signals.SignalTimescaleDB, 0.90, []string{"TimescaleDB time-series database detected"}, "code")
	}

	// InfluxDB
	if e.findCodePattern(`influxdb|InfluxDB|influx`) {
		e.signals.AddSignal(signals.SignalInfluxDB, 0.90, []string{"InfluxDB time-series database detected"}, "code")
	}
}

// extractTestingSignals detects advanced testing patterns
func (e *InfraExtractor) extractTestingSignals() {
	// Test containers
	if e.findCodePattern(`testcontainers|TestContainers|@Testcontainers`) {
		e.signals.AddSignal(signals.SignalTestContainers, 0.90, []string{"Testcontainers integration detected"}, "code")
	}

	// Contract testing
	if e.findCodePattern(`pact|Pact|contract.*test|@PactVerify`) {
		e.signals.AddSignal(signals.SignalContractTesting, 0.90, []string{"Contract testing (Pact) detected"}, "code")
	}

	// Load testing
	if e.findCodePattern(`k6|artillery|locust|JMeter|gatling`) {
		e.signals.AddSignal(signals.SignalLoadTesting, 0.90, []string{"Load testing framework detected"}, "code")
	}

	// Mutation testing
	if e.findCodePattern(`stryker|pitest|mutant|mutation.*test`) {
		e.signals.AddSignal(signals.SignalMutationTesting, 0.90, []string{"Mutation testing detected"}, "code")
	}

	// Chaos engineering
	if e.findCodePattern(`chaos.*monkey|chaos.*engineering|litmus|chaoskube|gremlin`) {
		e.signals.AddSignal(signals.SignalChaosEngineering, 0.90, []string{"Chaos engineering practices detected"}, "code")
	}

	// Static analysis
	if e.findCodePattern(`eslint|prettier|golangci-lint|mypy|pylint|sonarqube`) {
		e.signals.AddSignal(signals.SignalStaticAnalysis, 0.85, []string{"Static code analysis detected"}, "code")
	}

	// Property-based testing
	if e.findCodePattern(`property.*test|quickcheck|hypothesis|fast-check`) {
		e.signals.AddSignal(signals.SignalPropertyTesting, 0.85, []string{"Property-based testing detected"}, "code")
	}

	// Snapshot testing
	if e.findCodePattern(`toMatchSnapshot|snapshot.*test|__snapshots__`) {
		e.signals.AddSignal(signals.SignalSnapshotTesting, 0.85, []string{"Snapshot testing detected"}, "code")
	}

	// Visual regression testing
	if e.findCodePattern(`percy|chromatic|backstopjs|visual.*regression`) {
		e.signals.AddSignal(signals.SignalVisualRegression, 0.85, []string{"Visual regression testing detected"}, "code")
	}

	// API testing tools
	if e.findCodePattern(`supertest|httptest|newman|postman`) {
		e.signals.AddSignal(signals.SignalAPITesting, 0.85, []string{"API testing tools detected"}, "code")
	}

	// BDD/Cucumber
	if e.findCodePattern(`cucumber|gherkin|Given.*When.*Then|@given|@when|@then`) {
		e.signals.AddSignal(signals.SignalBDD, 0.85, []string{"BDD/Cucumber testing detected"}, "code")
	}

	// TDD patterns
	if e.findCodePattern(`describe\s*\(|it\s*\(|test\s*\(|func Test`) {
		e.signals.AddSignal(signals.SignalTDD, 0.75, []string{"Test-Driven Development patterns detected"}, "code")
	}
}

// extractObservabilitySignals detects advanced observability patterns
func (e *InfraExtractor) extractObservabilitySignals() {
	// OpenTelemetry
	if e.findCodePattern(`opentelemetry|OpenTelemetry|@opentelemetry|otel`) {
		e.signals.AddSignal(signals.SignalOpenTelemetry, 0.90, []string{"OpenTelemetry instrumentation detected"}, "code")
		e.signals.AddSignal(signals.SignalDistributedTracing, 0.85, []string{"Distributed tracing detected"}, "code")
	}

	// Datadog
	if e.findCodePattern(`datadog|dd-trace|ddtrace`) {
		e.signals.AddSignal(signals.SignalDatadog, 0.90, []string{"Datadog APM detected"}, "code")
	}

	// New Relic
	if e.findCodePattern(`newrelic|New Relic|@newrelic`) {
		e.signals.AddSignal(signals.SignalNewRelic, 0.90, []string{"New Relic APM detected"}, "code")
	}

	// ELK Stack
	if e.findCodePattern(`logstash|kibana|filebeat|elastic.*apm`) {
		e.signals.AddSignal(signals.SignalELKStack, 0.85, []string{"ELK Stack observability detected"}, "code")
	}

	// Loki
	if e.findCodePattern(`loki|promtail|grafana.*loki`) {
		e.signals.AddSignal(signals.SignalLoki, 0.90, []string{"Grafana Loki logging detected"}, "code")
	}

	// Custom metrics
	if e.findCodePattern(`Counter\(|Histogram\(|Gauge\(|metrics\.New`) {
		e.signals.AddSignal(signals.SignalMetricsCollection, 0.85, []string{"Custom metrics collection detected"}, "code")
	}

	// Alerting
	if e.findCodePattern(`alertmanager|PagerDuty|opsgenie|alert.*rule`) {
		e.signals.AddSignal(signals.SignalAlerting, 0.85, []string{"Alerting configuration detected"}, "code")
	}

	// SLO/SLI
	if e.findCodePattern(`SLO|SLI|error.*budget|availability.*target`) {
		e.signals.AddSignal(signals.SignalSLO, 0.85, []string{"SLO/SLI implementation detected"}, "code")
	}
}

// extractDeploymentSignals detects deployment and release patterns
func (e *InfraExtractor) extractDeploymentSignals() {
	// Blue-Green deployment
	if e.findCodePattern(`blue.*green|green.*blue|deployment.*strategy`) {
		e.signals.AddSignal(signals.SignalBlueGreen, 0.80, []string{"Blue-Green deployment pattern detected"}, "code")
	}

	// Canary deployment
	if e.findCodePattern(`canary|traffic.*split|weighted.*routing`) {
		e.signals.AddSignal(signals.SignalCanaryDeployment, 0.80, []string{"Canary deployment pattern detected"}, "code")
	}

	// Rolling updates
	if e.findCodePattern(`rolling.*update|maxSurge|maxUnavailable`) {
		e.signals.AddSignal(signals.SignalRollingUpdate, 0.80, []string{"Rolling update strategy detected"}, "code")
	}

	// ArgoCD GitOps
	if e.findCodePattern(`argocd|ArgoCD|Application.*apiVersion.*argoproj`) {
		e.signals.AddSignal(signals.SignalArgoCD, 0.90, []string{"ArgoCD GitOps detected"}, "code")
	}

	// Flux GitOps
	if e.findCodePattern(`flux|Flux|Kustomization.*fluxcd`) {
		e.signals.AddSignal(signals.SignalFlux, 0.90, []string{"Flux GitOps detected"}, "code")
	}

	// Feature branch deployments
	if e.findCodePattern(`preview.*environment|ephemeral.*environment|pr.*deployment`) {
		e.signals.AddSignal(signals.SignalPreviewEnvironments, 0.80, []string{"Preview/ephemeral environments detected"}, "code")
	}

	// Database migrations
	if e.findCodePattern(`migrate|Migration|flyway|liquibase|knex.*migrate|prisma.*migrate`) {
		e.signals.AddSignal(signals.SignalDatabaseMigrations, 0.85, []string{"Database migrations detected"}, "code")
	}

	// Rollback mechanisms
	if e.findCodePattern(`rollback|revert|undo.*deploy`) {
		e.signals.AddSignal(signals.SignalRollback, 0.80, []string{"Rollback mechanisms detected"}, "code")
	}
}

// findFiles finds files matching patterns
func (e *InfraExtractor) findFiles(patterns ...string) []string {
	var results []string

	filepath.Walk(e.repoPath, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return nil
		}

		// Skip vendor/node_modules
		if strings.Contains(path, "node_modules") ||
			strings.Contains(path, "vendor") ||
			strings.Contains(path, ".git") {
			return filepath.SkipDir
		}

		relPath, _ := filepath.Rel(e.repoPath, path)
		for _, pattern := range patterns {
			matched, _ := filepath.Match(pattern, info.Name())
			if matched {
				results = append(results, relPath)
				break
			}
		}

		return nil
	})

	return results
}

// findCodePattern searches for regex pattern in code files
func (e *InfraExtractor) findCodePattern(pattern string) bool {
	regex := regexp.MustCompile(pattern)
	found := false

	filepath.Walk(e.repoPath, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() || found {
			return nil
		}

		// Skip non-code files
		ext := strings.ToLower(filepath.Ext(path))
		codeExts := map[string]bool{
			".go": true, ".js": true, ".ts": true, ".py": true,
			".java": true, ".rs": true, ".rb": true, ".cs": true,
		}
		if !codeExts[ext] {
			return nil
		}

		// Skip vendor
		if strings.Contains(path, "node_modules") ||
			strings.Contains(path, "vendor") {
			return filepath.SkipDir
		}

		file, err := os.Open(path)
		if err != nil {
			return nil
		}
		defer file.Close()

		scanner := bufio.NewScanner(file)
		for scanner.Scan() {
			if regex.MatchString(scanner.Text()) {
				found = true
				return filepath.SkipAll
			}
		}

		return nil
	})

	return found
}

// Helper functions
func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

// isFrontendFolder checks if a folder name indicates a frontend module
func isFrontendFolder(name string) bool {
	frontendIndicators := []string{
		"frontend", "client", "web", "webapp", "web-app", "ui", "dashboard",
		"admin", "portal", "app", "mobile", "react-app", "vue-app", "angular-app",
	}
	nameLower := strings.ToLower(name)
	for _, indicator := range frontendIndicators {
		if nameLower == indicator || strings.HasSuffix(nameLower, "-"+indicator) {
			return true
		}
	}
	return false
}

// isBackendFolder checks if a folder name indicates a backend service
func isBackendFolder(name string) bool {
	backendIndicators := []string{
		"backend", "server", "api", "api-server", "service", "svc",
		"worker", "processor", "consumer", "producer", "gateway", "core",
	}
	nameLower := strings.ToLower(name)
	for _, indicator := range backendIndicators {
		if nameLower == indicator || strings.HasPrefix(nameLower, indicator+"-") ||
			strings.HasSuffix(nameLower, "-"+indicator) || strings.Contains(nameLower, "-"+indicator+"-") {
			return true
		}
	}
	return false
}

// isInfraService checks if a service name is an infrastructure component (not an application service)
func isInfraService(serviceName string) bool {
	infraServices := []string{
		"postgres", "postgresql", "mysql", "mariadb", "mongo", "mongodb",
		"redis", "rabbitmq", "kafka", "zookeeper", "elasticsearch", "opensearch",
		"nginx", "traefik", "envoy", "haproxy", "mailhog", "localstack",
		"minio", "vault", "consul", "etcd", "adminer", "pgadmin",
	}
	nameLower := strings.ToLower(serviceName)
	for _, infra := range infraServices {
		if nameLower == infra || strings.Contains(nameLower, infra) {
			return true
		}
	}
	return false
}

// isMonorepoFile checks if any monorepo configuration files exist
func (e *InfraExtractor) isMonorepo() bool {
	monorepoFiles := []string{
		"lerna.json",
		"nx.json",
		"turbo.json",
		"rush.json",
		"pnpm-workspace.yaml",
	}

	for _, file := range monorepoFiles {
		if fileExists(filepath.Join(e.repoPath, file)) {
			return true
		}
	}

	// Check package.json for workspaces
	pkgPath := filepath.Join(e.repoPath, "package.json")
	if content, err := os.ReadFile(pkgPath); err == nil {
		contentStr := string(content)
		if strings.Contains(contentStr, "\"workspaces\"") || strings.Contains(contentStr, "'workspaces'") {
			return true
		}
	}

	return false
}

// hasFrontendFolder checks if the repo has a frontend folder
func (e *InfraExtractor) hasFrontendFolder() bool {
	entries, err := os.ReadDir(e.repoPath)
	if err != nil {
		return false
	}

	for _, entry := range entries {
		if entry.IsDir() && isFrontendFolder(entry.Name()) {
			return true
		}
	}
	return false
}

// hasBackendFolder checks if the repo has a backend folder
func (e *InfraExtractor) hasBackendFolder() bool {
	entries, err := os.ReadDir(e.repoPath)
	if err != nil {
		return false
	}

	for _, entry := range entries {
		if entry.IsDir() && isBackendFolder(entry.Name()) {
			return true
		}
	}
	return false
}
