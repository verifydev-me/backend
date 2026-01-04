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

	return e.signals
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
		"rabbitmq":      signals.SignalRabbitMQ,
		"amqp":          signals.SignalRabbitMQ,
		"kafka":         signals.SignalKafka,
		"redis":         signals.SignalRedis,
		"go-redis":      signals.SignalRedis,
		"pgx":           signals.SignalPostgres,
		"pq":            signals.SignalPostgres,
		"gorm":          signals.SignalGORM,
		"mongo-driver":  signals.SignalMongoDB,
		"jwt-go":        signals.SignalJWT,
		"prometheus":    signals.SignalPrometheus,
		"opentelemetry": signals.SignalDistributedTracing,
		"jaeger":        signals.SignalJaeger,
		"zerolog":       signals.SignalStructuredLogging,
		"zap":           signals.SignalStructuredLogging,
		"testify":       signals.SignalUnitTests,
		"aws-sdk-go":    signals.SignalAWS,
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

// extractServiceStructureSignals detects microservice patterns
func (e *InfraExtractor) extractServiceStructureSignals() {
	entries, err := os.ReadDir(e.repoPath)
	if err != nil {
		return
	}

	servicePatterns := []string{
		"service", "svc", "api", "gateway", "worker", "processor", "consumer", "producer",
	}

	var potentialServices []string

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		name := strings.ToLower(entry.Name())

		// Check for service pattern names
		for _, pattern := range servicePatterns {
			if strings.Contains(name, pattern) {
				potentialServices = append(potentialServices, entry.Name())
				break
			}
		}

		// Check if directory has its own package.json or go.mod (independent service)
		servicePath := filepath.Join(e.repoPath, entry.Name())
		if fileExists(filepath.Join(servicePath, "package.json")) ||
			fileExists(filepath.Join(servicePath, "go.mod")) ||
			fileExists(filepath.Join(servicePath, "Dockerfile")) {
			if !contains(potentialServices, entry.Name()) {
				potentialServices = append(potentialServices, entry.Name())
			}
		}
	}

	if len(potentialServices) >= 2 {
		e.signals.AddSignal(signals.SignalMultipleServices, 0.9, potentialServices, "service_dirs")
		e.signals.AddSignal(signals.SignalServiceIsolation, 0.85, potentialServices, "independent_services")
		e.signals.ServiceCount = len(potentialServices)
		e.signals.ServiceNames = potentialServices
	}

	// Check for specific patterns
	for _, svc := range potentialServices {
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

		// Service detection
		serviceRegex := regexp.MustCompile(`(?m)^  (\w[\w-]*):$`)
		matches := serviceRegex.FindAllStringSubmatch(contentStr, -1)
		var services []string
		for _, m := range matches {
			if len(m) > 1 {
				services = append(services, m[1])
			}
		}

		if len(services) > 1 {
			e.signals.AddSignal(signals.SignalMultipleServices, 0.95, services, "docker_compose_services")
			e.signals.ServiceCount = len(services)
			e.signals.ServiceNames = services
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
