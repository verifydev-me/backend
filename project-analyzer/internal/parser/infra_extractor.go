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
	repoPath    string
	projectType string // backend, frontend, fullstack, etc.
	signals     *signals.InfrastructureSignals
}

func NewInfraExtractor(repoPath, projectType string) *InfraExtractor {
	return &InfraExtractor{
		repoPath:    repoPath,
		projectType: projectType,
		signals: &signals.InfrastructureSignals{
			SignalDetails: make(map[signals.InfraSignal]signals.SignalDetail),
		},
	}
}

// Extract performs full infrastructure signal extraction
func (e *InfraExtractor) Extract() *signals.InfrastructureSignals {
	// ===== PHASE 0: EARLY EXIT CHECKS =====
	// Check for empty repository
	if e.isEmptyRepo() {
		e.signals.AddSignal(signals.SignalIncompleteProject, 0.95,
			[]string{"Repository is empty or contains no files"},
			"empty_check")
		return e.signals
	}

	// Check for binary-only repository (compiled artifacts only)
	if e.isBinaryOnlyRepo() {
		e.signals.AddSignal(signals.SignalIncompleteProject, 0.80,
			[]string{"Repository contains only binary/compiled files, no source code"},
			"binary_check")
		return e.signals
	}

	// Phase 1: Root file signals
	e.extractRootFileSignals()
	e.extractLanguageSignals()

	// Phase 2: Configuration file signals
	e.extractConfigSignals()

	// Phase 3: Package/dependency signals
	// Phase 3: Package/dependency signals
	e.extractDependencySignals()
	e.analyzeReactStructure()
	e.analyzeNextJSStructure()
	e.analyzeOtherJSFrameworks()
	e.analyzePythonStructure()
	e.analyzeBackendStructure()
	e.analyzePackageManagerSignals()

	// Phase 4: Service structure signals
	e.extractServiceStructureSignals()

	// Phase 5: Code pattern signals
	e.extractCodePatternSignals()

	// Phase 6: Docker compose analysis
	e.extractDockerComposeSignals()

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
	// PROD OPTIMIZATION: Skip for pure frontend projects to save time
	if e.projectType != "frontend" {
		e.extractDeepServiceSignals()
	} else {
		// Log internal debug? No logger here, but safe to skip
	}

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
	// BUT ignore if we detected multiple validation services (Docker Compose / Microservices)
	// because file scanning might miss nested service code in large repos
	if totalCodeFiles < 5 && e.signals.ServiceCount == 0 {
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
		"Makefile":            signals.SignalBuildAutomation, // Build automation, not Docker
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
		// DATABASE_URL is generic — don't assume PostgreSQL, only flag specific patterns
		// "DATABASE_URL": removed — was causing false PostgreSQL detection
		"POSTGRES":   signals.SignalPostgres,
		"PG_":        signals.SignalPostgres,
		"MYSQL":      signals.SignalMySQL,
		"MONGODB":    signals.SignalMongoDB,
		"MONGO_URI":  signals.SignalMongoDB,
		"REDIS_URL":  signals.SignalRedis,
		"REDIS_HOST": signals.SignalRedis,
		"REDIS":      signals.SignalRedis,

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

		// Third-party Services (no longer mislabeled as AWS)
		"STRIPE":   signals.SignalThirdPartyIntegration,
		"TWILIO":   signals.SignalThirdPartyIntegration,
		"SENDGRID": signals.SignalThirdPartyIntegration,

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

// extractLanguageSignals checks for source files to detect languages
func (e *InfraExtractor) extractLanguageSignals() {
	// JavaScript
	if len(e.findFiles("*.js", "*.jsx", "*.mjs", "*.cjs")) > 0 {
		e.signals.AddSignal(signals.SignalJavaScript, 0.9, []string{"JavaScript files detected"}, "language_check")
	}
	// TypeScript
	if len(e.findFiles("*.ts", "*.tsx")) > 0 {
		e.signals.AddSignal(signals.SignalTypeScript, 0.9, []string{"TypeScript files detected"}, "language_check")
	}
	// Go
	if len(e.findFiles("*.go")) > 0 {
		e.signals.AddSignal(signals.SignalGo, 0.9, []string{"Go files detected"}, "language_check")
	}
	// Python
	if len(e.findFiles("*.py")) > 0 {
		e.signals.AddSignal(signals.SignalPython, 0.9, []string{"Python files detected"}, "language_check")
	}
	// Rust
	if len(e.findFiles("*.rs")) > 0 {
		e.signals.AddSignal(signals.SignalRust, 0.9, []string{"Rust files detected"}, "language_check")
	}
	// Java
	if len(e.findFiles("*.java")) > 0 {
		e.signals.AddSignal(signals.SignalJava, 0.9, []string{"Java files detected"}, "language_check")
	}
	// Kotlin
	if len(e.findFiles("*.kt", "*.kts")) > 0 {
		e.signals.AddSignal(signals.SignalKotlin, 0.9, []string{"Kotlin files detected"}, "language_check")
	}
	// C#
	if len(e.findFiles("*.cs")) > 0 {
		e.signals.AddSignal(signals.SignalCSharp, 0.9, []string{"C# files detected"}, "language_check")
	}
	// Ruby
	if len(e.findFiles("*.rb")) > 0 {
		e.signals.AddSignal(signals.SignalRuby, 0.9, []string{"Ruby files detected"}, "language_check")
	}
	// PHP
	if len(e.findFiles("*.php")) > 0 {
		e.signals.AddSignal(signals.SignalPHP, 0.9, []string{"PHP files detected"}, "language_check")
	}
	// Swift
	if len(e.findFiles("*.swift")) > 0 {
		e.signals.AddSignal(signals.SignalSwift, 0.9, []string{"Swift files detected"}, "language_check")
	}
	// Dart
	if len(e.findFiles("*.dart")) > 0 {
		e.signals.AddSignal(signals.SignalDart, 0.9, []string{"Dart files detected"}, "language_check")
	}
}

// analyzePythonStructure checks for Python framework patterns
func (e *InfraExtractor) analyzePythonStructure() {
	if len(e.findFiles("manage.py")) > 0 {
		e.signals.AddSignal(signals.SignalDjango, 0.9, []string{"Found manage.py"}, "structure_check")
		e.signals.AddSignal(signals.SignalPython, 1.0, []string{"Django implies Python"}, "inference")
	}
	// Flask detection via app.py pattern
	if len(e.findFiles("app.py")) > 0 {
		e.signals.AddSignal(signals.SignalFlask, 0.7, []string{"app.py found (possible Flask)"}, "structure_check")
	}
}

// analyzePackageManagerSignals detects languages via their package manager files
func (e *InfraExtractor) analyzePackageManagerSignals() {
	// Java: pom.xml (Maven) or build.gradle (Gradle)
	if len(e.findFiles("pom.xml")) > 0 {
		e.signals.AddSignal(signals.SignalJava, 0.95, []string{"Maven pom.xml found"}, "package_manager")
	}
	if len(e.findFiles("build.gradle", "build.gradle.kts")) > 0 {
		e.signals.AddSignal(signals.SignalJava, 0.95, []string{"Gradle build file found"}, "package_manager")
		// Check for Kotlin DSL
		if len(e.findFiles("build.gradle.kts")) > 0 {
			e.signals.AddSignal(signals.SignalKotlin, 0.9, []string{"Kotlin Gradle DSL found"}, "package_manager")
		}
	}

	// Ruby: Gemfile
	if len(e.findFiles("Gemfile")) > 0 {
		e.signals.AddSignal(signals.SignalRuby, 0.95, []string{"Gemfile found"}, "package_manager")
	}

	// PHP: composer.json
	if len(e.findFiles("composer.json")) > 0 {
		e.signals.AddSignal(signals.SignalPHP, 0.95, []string{"composer.json found"}, "package_manager")
	}

	// Swift: Package.swift
	if len(e.findFiles("Package.swift")) > 0 {
		e.signals.AddSignal(signals.SignalSwift, 0.95, []string{"Package.swift (SPM) found"}, "package_manager")
	}

	// Dart: pubspec.yaml
	if len(e.findFiles("pubspec.yaml")) > 0 {
		e.signals.AddSignal(signals.SignalDart, 0.95, []string{"pubspec.yaml (Flutter/Dart) found"}, "package_manager")
	}

	// C#: *.csproj
	if len(e.findFiles("*.csproj")) > 0 {
		e.signals.AddSignal(signals.SignalCSharp, 0.95, []string{".csproj file found"}, "package_manager")
	}

	// Python: pyproject.toml (modern Python)
	if len(e.findFiles("pyproject.toml")) > 0 {
		e.signals.AddSignal(signals.SignalPython, 0.95, []string{"pyproject.toml found"}, "package_manager")
	}

	// Rust: Cargo.toml
	if len(e.findFiles("Cargo.toml")) > 0 {
		e.signals.AddSignal(signals.SignalRust, 0.95, []string{"Cargo.toml found"}, "package_manager")
	}

	// Go: go.mod
	if len(e.findFiles("go.mod")) > 0 {
		e.signals.AddSignal(signals.SignalGo, 0.95, []string{"go.mod found"}, "package_manager")
	}

	// TypeScript: tsconfig.json
	if len(e.findFiles("tsconfig.json")) > 0 {
		e.signals.AddSignal(signals.SignalTypeScript, 0.95, []string{"tsconfig.json found"}, "package_manager")
	}
}

// analyzeBackendStructure checks for other backend framework patterns
func (e *InfraExtractor) analyzeBackendStructure() {
	// Laravel: artisan file
	if len(e.findFiles("artisan")) > 0 {
		e.signals.AddSignal(signals.SignalLaravel, 0.95, []string{"artisan file found"}, "structure_check")
		e.signals.AddSignal(signals.SignalPHP, 1.0, []string{"Laravel implies PHP"}, "inference")
	}

	// Rails: config.ru or Rakefile
	if len(e.findFiles("config.ru")) > 0 {
		e.signals.AddSignal(signals.SignalRails, 0.9, []string{"config.ru found"}, "structure_check")
		e.signals.AddSignal(signals.SignalRuby, 1.0, []string{"Rails implies Ruby"}, "inference")
	}
}
