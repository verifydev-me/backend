package parser

import (
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/verifydev/project-analyzer/pkg/signals"
)

// AnalyzeAdvancedPatterns detects advanced coding patterns
func (p *FileParser) AnalyzeAdvancedPatterns() *signals.AdvancedPatterns {
	ap := &signals.AdvancedPatterns{}
	keywords := []string{}

	filepath.Walk(p.repoPath, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return nil
		}

		// Skip non-code files
		ext := strings.ToLower(filepath.Ext(path))
		if !isCodeFile(ext) {
			return nil
		}

		// Skip vendor/node_modules
		if strings.Contains(path, "node_modules") ||
			strings.Contains(path, "vendor") ||
			strings.Contains(path, ".git") {
			return nil
		}

		content, err := os.ReadFile(path)
		if err != nil {
			return nil
		}
		text := string(content)

		// Performance Patterns
		if strings.Contains(text, "React.lazy") || strings.Contains(text, "lazy(") ||
			strings.Contains(text, "import(") {
			ap.UsesLazyLoading = true
			keywords = append(keywords, "lazy-loading")
		}
		if strings.Contains(text, "useMemo") || strings.Contains(text, "@lru_cache") ||
			strings.Contains(text, "memoize") {
			ap.UsesMemoization = true
			keywords = append(keywords, "memoization")
		}
		if strings.Contains(text, "debounce") || strings.Contains(text, "Debounce") {
			ap.UsesDebouncing = true
			keywords = append(keywords, "debouncing")
		}
		if strings.Contains(text, "throttle") || strings.Contains(text, "Throttle") {
			ap.UsesThrottling = true
			keywords = append(keywords, "throttling")
		}
		if strings.Contains(text, "react-window") || strings.Contains(text, "react-virtualized") ||
			strings.Contains(text, "VirtualList") {
			ap.UsesVirtualization = true
			keywords = append(keywords, "virtualization")
		}
		if strings.Contains(text, "React.Suspense") || strings.Contains(text, "<Suspense") ||
			strings.Contains(text, "loadable") {
			ap.UsesCodeSplitting = true
			keywords = append(keywords, "code-splitting")
		}

		// Caching
		if strings.Contains(text, "redis") || strings.Contains(text, "cache") ||
			strings.Contains(text, "Cache") || strings.Contains(text, "lru-cache") {
			ap.UsesCaching = true
			keywords = append(keywords, "caching")
		}

		// API Patterns
		if regexp.MustCompile(`(app\.(get|post|put|delete|patch)|router\.(get|post|put|delete))`).MatchString(text) {
			ap.UsesREST = true
		}
		if strings.Contains(text, "graphql") || strings.Contains(text, "GraphQL") ||
			strings.Contains(text, "gql`") {
			ap.UsesGraphQL = true
			keywords = append(keywords, "graphql")
		}
		if strings.Contains(text, "WebSocket") || strings.Contains(text, "socket.io") ||
			strings.Contains(text, "ws.") {
			ap.UsesWebSocket = true
			keywords = append(keywords, "websocket")
		}
		if strings.Contains(text, "grpc") || strings.Contains(text, "protobuf") {
			ap.UsesgRPC = true
			keywords = append(keywords, "grpc")
		}

		// Security Patterns
		if strings.Contains(text, "zod") || strings.Contains(text, "joi") ||
			strings.Contains(text, "yup") || strings.Contains(text, "validator") ||
			strings.Contains(text, "pydantic") {
			ap.HasInputValidation = true
			keywords = append(keywords, "input-validation")
		}
		if strings.Contains(text, "sanitize") || strings.Contains(text, "escape") ||
			strings.Contains(text, "xss") {
			ap.HasSanitization = true
			keywords = append(keywords, "sanitization")
		}
		if strings.Contains(text, "rateLimit") || strings.Contains(text, "rate-limit") ||
			strings.Contains(text, "RateLimiter") {
			ap.HasRateLimiting = true
			keywords = append(keywords, "rate-limiting")
		}
		if strings.Contains(text, "jwt") || strings.Contains(text, "JWT") ||
			strings.Contains(text, "jsonwebtoken") {
			ap.HasJWT = true
			keywords = append(keywords, "jwt")
		}
		if strings.Contains(text, "oauth") || strings.Contains(text, "OAuth") ||
			strings.Contains(text, "passport") {
			ap.HasOAuth = true
			keywords = append(keywords, "oauth")
		}
		if strings.Contains(text, "authenticate") || strings.Contains(text, "auth") ||
			strings.Contains(text, "login") {
			ap.HasAuth = true
		}

		// DevOps Patterns
		if strings.Contains(text, "/health") || strings.Contains(text, "healthcheck") ||
			strings.Contains(text, "health_check") {
			ap.HasHealthCheck = true
			keywords = append(keywords, "health-check")
		}
		if strings.Contains(text, "SIGTERM") || strings.Contains(text, "SIGINT") ||
			strings.Contains(text, "graceful") {
			ap.HasGracefulShutdown = true
			keywords = append(keywords, "graceful-shutdown")
		}
		if strings.Contains(text, "prometheus") || strings.Contains(text, "metrics") ||
			strings.Contains(text, "statsd") {
			ap.HasMetrics = true
			keywords = append(keywords, "metrics")
		}
		if strings.Contains(text, "opentelemetry") || strings.Contains(text, "tracing") ||
			strings.Contains(text, "jaeger") {
			ap.HasTracing = true
			keywords = append(keywords, "tracing")
		}
		if strings.Contains(text, "logger") || strings.Contains(text, "winston") ||
			strings.Contains(text, "pino") || strings.Contains(text, "zerolog") {
			ap.HasLogging = true
		}

		// Architecture Patterns
		if strings.Contains(path, "/domain/") || strings.Contains(path, "/entities/") ||
			strings.Contains(path, "/usecases/") || strings.Contains(path, "/usecase/") {
			ap.UsesCleanArch = true
			keywords = append(keywords, "clean-architecture")
		}
		if (strings.Contains(path, "/controllers/") || strings.Contains(path, "/handler/")) &&
			(strings.Contains(path, "/models/") || strings.Contains(path, "/views/")) {
			ap.UsesMVC = true
			keywords = append(keywords, "mvc")
		}
		if strings.Contains(path, "/repositories/") || strings.Contains(path, "/repository/") {
			ap.UsesRepository = true
			keywords = append(keywords, "repository-pattern")
		}
		if strings.Contains(text, "Factory") || strings.Contains(text, "factory") {
			ap.UsesFactory = true
		}
		if strings.Contains(text, "Singleton") || strings.Contains(text, "getInstance") {
			ap.UsesSingleton = true
		}
		if strings.Contains(text, "Observable") || strings.Contains(text, "subscribe") ||
			strings.Contains(text, "EventEmitter") {
			ap.UsesObserver = true
			keywords = append(keywords, "observer-pattern")
		}
		if strings.Contains(text, "@inject") || strings.Contains(text, "Inject") ||
			strings.Contains(text, "container.") || strings.Contains(text, "dependency injection") {
			ap.UsesDependencyInj = true
			keywords = append(keywords, "dependency-injection")
		}

		return nil
	})

	// Deduplicate keywords
	ap.AdvancedKeywords = uniqueStrings(keywords)
	return ap
}

// AnalyzePython detects Python-specific patterns
func (p *FileParser) AnalyzePython() *signals.PythonSignals {
	ps := &signals.PythonSignals{}

	// Check for package managers
	if _, err := os.Stat(filepath.Join(p.repoPath, "requirements.txt")); err == nil {
		ps.HasRequirements = true
		ps.PackageManager = "pip"
	}
	if _, err := os.Stat(filepath.Join(p.repoPath, "pyproject.toml")); err == nil {
		ps.HasPyproject = true
		content, _ := os.ReadFile(filepath.Join(p.repoPath, "pyproject.toml"))
		if strings.Contains(string(content), "poetry") {
			ps.PackageManager = "poetry"
		}
	}
	if _, err := os.Stat(filepath.Join(p.repoPath, "Pipfile")); err == nil {
		ps.PackageManager = "pipenv"
	}
	if _, err := os.Stat(filepath.Join(p.repoPath, "venv")); err == nil {
		ps.HasVirtualEnv = true
	}
	if _, err := os.Stat(filepath.Join(p.repoPath, ".venv")); err == nil {
		ps.HasVirtualEnv = true
	}

	// Detect framework from requirements
	reqContent := p.readRequirementsTxt()
	if strings.Contains(reqContent, "django") {
		ps.Framework = "Django"
	} else if strings.Contains(reqContent, "fastapi") {
		ps.Framework = "FastAPI"
	} else if strings.Contains(reqContent, "flask") {
		ps.Framework = "Flask"
	}

	// Detect lint tools
	lintTools := []string{}
	if strings.Contains(reqContent, "black") {
		lintTools = append(lintTools, "black")
	}
	if strings.Contains(reqContent, "flake8") {
		lintTools = append(lintTools, "flake8")
	}
	if strings.Contains(reqContent, "mypy") {
		lintTools = append(lintTools, "mypy")
	}
	if strings.Contains(reqContent, "pylint") {
		lintTools = append(lintTools, "pylint")
	}
	ps.LintTools = lintTools

	// Detect test framework
	if strings.Contains(reqContent, "pytest") {
		ps.TestFramework = "pytest"
	} else {
		// Check for unittest usage in files
		filepath.Walk(p.repoPath, func(path string, info os.FileInfo, err error) error {
			if err != nil || info.IsDir() {
				return nil
			}
			if filepath.Ext(path) != ".py" {
				return nil
			}
			content, _ := os.ReadFile(path)
			if strings.Contains(string(content), "import unittest") {
				ps.TestFramework = "unittest"
			}
			return nil
		})
	}

	// Analyze Python files for patterns
	filepath.Walk(p.repoPath, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return nil
		}
		if filepath.Ext(path) != ".py" {
			return nil
		}
		if strings.Contains(path, "venv") || strings.Contains(path, ".venv") {
			return nil
		}

		content, err := os.ReadFile(path)
		if err != nil {
			return nil
		}
		text := string(content)

		// Type hints
		if regexp.MustCompile(`def\s+\w+\([^)]*:\s*\w+`).MatchString(text) ||
			strings.Contains(text, "-> ") {
			ps.UsesTypeHints = true
		}

		// Async/Await
		if strings.Contains(text, "async def") || strings.Contains(text, "await ") {
			ps.UsesAsyncAwait = true
		}

		// Dataclasses
		if strings.Contains(text, "@dataclass") || strings.Contains(text, "from dataclasses") {
			ps.UsesDataclasses = true
		}

		// Pydantic
		if strings.Contains(text, "from pydantic") || strings.Contains(text, "BaseModel") {
			ps.UsesPydantic = true
		}

		// Decorators
		if regexp.MustCompile(`@\w+`).MatchString(text) {
			ps.UsesDecorators = true
		}

		// Generators
		if strings.Contains(text, "yield ") || strings.Contains(text, "yield(") {
			ps.UsesGenerators = true
		}

		// Context Managers
		if strings.Contains(text, "with ") && strings.Contains(text, " as ") {
			ps.UsesContextMgr = true
		}

		// Comprehensions
		if regexp.MustCompile(`\[\s*\w+\s+for\s+`).MatchString(text) ||
			regexp.MustCompile(`{\s*\w+:\s*\w+\s+for\s+`).MatchString(text) {
			ps.UsesComprehensions = true
		}

		return nil
	})

	// Only return if we found Python files
	if ps.Framework != "" || ps.HasRequirements || ps.HasPyproject {
		return ps
	}
	return nil
}

// AnalyzeGo detects Go-specific patterns
func (p *FileParser) AnalyzeGo() *signals.GoSignals {
	gs := &signals.GoSignals{}

	// Check if it's a Go project
	if _, err := os.Stat(filepath.Join(p.repoPath, "go.mod")); err != nil {
		return nil
	}

	// Detect framework from go.mod
	goMod, _ := os.ReadFile(filepath.Join(p.repoPath, "go.mod"))
	goModContent := string(goMod)

	if strings.Contains(goModContent, "gin-gonic/gin") {
		gs.Framework = "Gin"
	} else if strings.Contains(goModContent, "labstack/echo") {
		gs.Framework = "Echo"
	} else if strings.Contains(goModContent, "gofiber/fiber") {
		gs.Framework = "Fiber"
	} else if strings.Contains(goModContent, "go-chi/chi") {
		gs.Framework = "Chi"
	}

	// Count modules
	moduleCount := 0
	if strings.Contains(goModContent, "require") {
		lines := strings.Split(goModContent, "\n")
		for _, line := range lines {
			if strings.Contains(line, "\t") && !strings.Contains(line, "//") {
				moduleCount++
			}
		}
	}
	gs.ModuleCount = moduleCount

	// Analyze package structure
	if _, err := os.Stat(filepath.Join(p.repoPath, "internal")); err == nil {
		if _, err := os.Stat(filepath.Join(p.repoPath, "cmd")); err == nil {
			gs.PackageStructure = "standard"
		}
	} else if _, err := os.Stat(filepath.Join(p.repoPath, "domain")); err == nil {
		gs.PackageStructure = "clean-arch"
	} else {
		gs.PackageStructure = "flat"
	}

	// Analyze Go files
	filepath.Walk(p.repoPath, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return nil
		}
		if filepath.Ext(path) != ".go" {
			return nil
		}
		if strings.Contains(path, "vendor") {
			return nil
		}

		content, err := os.ReadFile(path)
		if err != nil {
			return nil
		}
		text := string(content)

		// Interfaces
		if regexp.MustCompile(`type\s+\w+\s+interface`).MatchString(text) {
			gs.UsesInterfaces = true
		}

		// Goroutines
		if strings.Contains(text, "go ") && regexp.MustCompile(`go\s+\w+\(`).MatchString(text) {
			gs.UsesGoroutines = true
		}

		// Channels
		if strings.Contains(text, "chan ") || strings.Contains(text, "<-") {
			gs.UsesChannels = true
		}

		// Mutex
		if strings.Contains(text, "sync.Mutex") || strings.Contains(text, "sync.RWMutex") {
			gs.UsesMutex = true
		}

		// Context
		if strings.Contains(text, "context.Context") || strings.Contains(text, "ctx context") {
			gs.UsesContext = true
		}

		// Defer
		if strings.Contains(text, "defer ") {
			gs.UsesDefer = true
		}

		// Error handling style
		if strings.Contains(text, "errors.Wrap") || strings.Contains(text, "fmt.Errorf") {
			gs.ErrorHandlingStyle = "wrap"
		} else if strings.Contains(text, "if err != nil") {
			if gs.ErrorHandlingStyle == "" {
				gs.ErrorHandlingStyle = "standard"
			}
		}

		// Tests
		if strings.HasSuffix(path, "_test.go") {
			gs.HasTests = true
			if strings.Contains(text, "func Benchmark") {
				gs.HasBenchmarks = true
			}
		}

		return nil
	})

	return gs
}

// AnalyzeNode detects Node.js specific patterns
func (p *FileParser) AnalyzeNode() *signals.NodeSignals {
	ns := &signals.NodeSignals{}

	// Check if it's a Node project
	pkgPath := filepath.Join(p.repoPath, "package.json")
	if _, err := os.Stat(pkgPath); err != nil {
		return nil
	}

	content, _ := os.ReadFile(pkgPath)
	text := strings.ToLower(string(content))

	// Detect framework
	if strings.Contains(text, "@nestjs") {
		ns.Framework = "NestJS"
	} else if strings.Contains(text, "fastify") {
		ns.Framework = "Fastify"
	} else if strings.Contains(text, "express") {
		ns.Framework = "Express"
	} else if strings.Contains(text, "koa") {
		ns.Framework = "Koa"
	}

	// TypeScript
	if _, err := os.Stat(filepath.Join(p.repoPath, "tsconfig.json")); err == nil {
		ns.UsesTypeScript = true
	}

	// Detect ORM
	if strings.Contains(text, "prisma") {
		ns.DatabaseORM = "Prisma"
	} else if strings.Contains(text, "typeorm") {
		ns.DatabaseORM = "TypeORM"
	} else if strings.Contains(text, "mongoose") {
		ns.DatabaseORM = "Mongoose"
	} else if strings.Contains(text, "sequelize") {
		ns.DatabaseORM = "Sequelize"
	}

	// Analyze Node files
	routesCount := 0
	middlewareCount := 0

	filepath.Walk(p.repoPath, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return nil
		}

		ext := filepath.Ext(path)
		if ext != ".js" && ext != ".ts" && ext != ".mjs" {
			return nil
		}
		if strings.Contains(path, "node_modules") {
			return nil
		}

		fileContent, err := os.ReadFile(path)
		if err != nil {
			return nil
		}
		fileText := string(fileContent)

		// Middleware detection
		if strings.Contains(path, "middleware") {
			ns.HasMiddleware = true
			middlewareCount++
		}

		// Routes detection
		if strings.Contains(path, "routes") || strings.Contains(path, "router") {
			matches := regexp.MustCompile(`\.(get|post|put|delete|patch)\s*\(`).FindAllStringIndex(fileText, -1)
			routesCount += len(matches)
		}

		// Feature detection
		if strings.Contains(fileText, "catch") && strings.Contains(fileText, "try") ||
			strings.Contains(fileText, "errorHandler") {
			ns.HasErrorHandling = true
		}
		if strings.Contains(fileText, "zod") || strings.Contains(fileText, "joi") ||
			strings.Contains(fileText, "validate") {
			ns.HasValidation = true
		}
		if strings.Contains(fileText, "authenticate") || strings.Contains(fileText, "passport") ||
			strings.Contains(fileText, "jwt") {
			ns.HasAuthentication = true
		}
		if strings.Contains(fileText, "rateLimit") || strings.Contains(fileText, "rate-limit") {
			ns.HasRateLimiting = true
		}
		if strings.Contains(fileText, "logger") || strings.Contains(fileText, "pino") ||
			strings.Contains(fileText, "winston") {
			ns.HasLogging = true
		}
		if strings.Contains(fileText, "cache") || strings.Contains(fileText, "redis") {
			ns.HasCaching = true
		}
		if strings.Contains(fileText, "socket.io") || strings.Contains(fileText, "WebSocket") ||
			strings.Contains(fileText, "ws.") {
			ns.HasWebSocket = true
		}
		if strings.Contains(fileText, "graphql") || strings.Contains(fileText, "apollo") {
			ns.HasGraphQL = true
		}
		if strings.Contains(fileText, "swagger") || strings.Contains(fileText, "openapi") {
			ns.HasSwagger = true
		}

		return nil
	})

	ns.RoutesCount = routesCount
	ns.MiddlewareCount = middlewareCount

	return ns
}

// DetectProjectType determines the type of project
func (p *FileParser) DetectProjectType(folderAnalysis signals.FolderAnalysis, codeSignals signals.CodeSignals) signals.ProjectType {
	// Check for microservice indicators
	if codeSignals.HasDockerfile && codeSignals.HasDockerCompose {
		return signals.ProjectTypeMicroservice
	}

	// Check for CLI
	if p.fileContains("package.json", "bin") ||
		p.fileExists("cmd/main.go") ||
		p.fileContains("setup.py", "console_scripts") {
		return signals.ProjectTypeCLI
	}

	// Check for library
	if p.fileContains("package.json", "\"main\":") && !folderAnalysis.HasAPI {
		return signals.ProjectTypeLibrary
	}
	if p.fileExists("setup.py") || p.fileExists("pyproject.toml") {
		return signals.ProjectTypeLibrary
	}

	// Check for frontend
	if folderAnalysis.HasComponents && !folderAnalysis.HasAPI && !folderAnalysis.HasControllers {
		return signals.ProjectTypeFrontend
	}

	// Check for fullstack (has both frontend and backend indicators)
	if folderAnalysis.HasComponents && (folderAnalysis.HasAPI || folderAnalysis.HasControllers) {
		return signals.ProjectTypeFullstack
	}

	// Check for API/backend
	if folderAnalysis.HasAPI || folderAnalysis.HasControllers {
		if codeSignals.HasDockerfile {
			return signals.ProjectTypeAPI
		}
		return signals.ProjectTypeBackend
	}

	return signals.ProjectTypeUnknown
}

// Helper functions

func (p *FileParser) readRequirementsTxt() string {
	content, _ := os.ReadFile(filepath.Join(p.repoPath, "requirements.txt"))
	pyproject, _ := os.ReadFile(filepath.Join(p.repoPath, "pyproject.toml"))
	return strings.ToLower(string(content) + string(pyproject))
}

func (p *FileParser) fileExists(filename string) bool {
	_, err := os.Stat(filepath.Join(p.repoPath, filename))
	return err == nil
}

func isCodeFile(ext string) bool {
	codeExts := map[string]bool{
		".js": true, ".jsx": true, ".ts": true, ".tsx": true,
		".go": true, ".py": true, ".java": true, ".rb": true,
		".rs": true, ".php": true, ".cs": true, ".cpp": true,
		".c": true, ".swift": true, ".kt": true,
	}
	return codeExts[ext]
}

func uniqueStrings(slice []string) []string {
	seen := make(map[string]bool)
	result := []string{}
	for _, s := range slice {
		if !seen[s] {
			seen[s] = true
			result = append(result, s)
		}
	}
	return result
}
