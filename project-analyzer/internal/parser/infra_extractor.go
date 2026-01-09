package parser

import (
	"fmt"
	"os"
	"path/filepath"
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
	e.validateProjectCompleteness()

	// ===== ENTERPRISE-GRADE DEEP ANALYSIS =====
	// Phase 14: Deep scan nested services (services/*, gateway/*, apps/*)
	e.extractDeepServiceSignals()

	// Phase 15: Deep Verification of Usage (Ghost Dependency Check)
	e.verifySignals()

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
			[]string{fmt.Sprintf("Project has only %d code files", totalCodeFiles)},
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

	validServices := 0
	excludedPatterns := []string{"task", "phase", "part", "chapter", "lesson", "example", "sample", "assignment", "day", "step", "tutorial"}

	for _, df := range dockerfiles {
		pathLower := strings.ToLower(df)
		isExcluded := false
		for _, ex := range excludedPatterns {
			if strings.Contains(pathLower, ex) {
				isExcluded = true
				break
			}
		}
		if !isExcluded {
			validServices++
		}
	}

	if validServices > 1 {
		e.signals.AddSignal(signals.SignalMultipleServices, 0.85, dockerfiles, "multiple_dockerfiles")
		e.signals.ServiceCount = validServices
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
		// Databases
		"DATABASE_URL": signals.SignalPostgres,
		"POSTGRES":     signals.SignalPostgres,
		"PG_":          signals.SignalPostgres,
		"MYSQL":        signals.SignalMySQL,
		"MONGODB":      signals.SignalMongoDB,
		"MONGO_URI":    signals.SignalMongoDB,
		"REDIS_URL":    signals.SignalRedis,
		"REDIS_HOST":   signals.SignalRedis,
		"REDIS":        signals.SignalRedis,

		// Message Queues
		"RABBITMQ":      signals.SignalRabbitMQ,
		"AMQP_URL":      signals.SignalRabbitMQ,
		"AMQP":          signals.SignalRabbitMQ,
		"KAFKA_BROKERS": signals.SignalKafka,
		"KAFKA_HOST":    signals.SignalKafka,
		"KAFKA":         signals.SignalKafka,
		"NATS_URL":      signals.SignalNATS,

		// Cloud Providers
		"AWS_ACCESS":                     signals.SignalAWS,
		"AWS_SECRET":                     signals.SignalAWS,
		"AWS_REGION":                     signals.SignalAWS,
		"S3_BUCKET":                      signals.SignalS3,
		"AWS_S3":                         signals.SignalS3,
		"GCP":                            signals.SignalGCP,
		"GOOGLE_CLOUD":                   signals.SignalGCP,
		"GOOGLE_APPLICATION_CREDENTIALS": signals.SignalGCP,
		"AZURE":                          signals.SignalAzure,

		// Auth & Security
		"JWT_SECRET": signals.SignalJWT,
		"JWT_":       signals.SignalJWT,
		"OAUTH":      signals.SignalOAuth,
		"AUTH0":      signals.SignalOAuth2,
		"OKTA":       signals.SignalOAuth2,

		// Observability
		"SENTRY_DSN": signals.SignalSentry,
		"DATADOG":    signals.SignalDatadog,
		"NEW_RELIC":  signals.SignalNewRelic,
		"PROMETHEUS": signals.SignalPrometheus,
		"GRAFANA":    signals.SignalGrafana,

		// Third-party Services
		"STRIPE":   signals.SignalAWS, // Using AWS as placeholder for integrations
		"TWILIO":   signals.SignalAWS,
		"SENDGRID": signals.SignalAWS,

		// Search & Analytics
		"ELASTICSEARCH": signals.SignalElasticsearch,
		"ELASTIC_":      signals.SignalElasticsearch,
		"ALGOLIA":       signals.SignalElasticsearch, // Similar category

		// BaaS
		"SUPABASE": signals.SignalSupabase,
		"FIREBASE": signals.SignalFirebase,

		// AI/LLM
		"OPENAI_API_KEY": signals.SignalLLM,
		"ANTHROPIC":      signals.SignalLLM,
		"HUGGINGFACE":    signals.SignalML,
	}

	for _, file := range files {
		filePath := filepath.Join(e.repoPath, file)

		// PRODUCTION SAFETY: Check file size before reading
		info, err := os.Stat(filePath)
		if err != nil || info.Size() > MaxFileSizeRead {
			continue // Skip large or inaccessible files
		}

		content, err := os.ReadFile(filePath)
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
