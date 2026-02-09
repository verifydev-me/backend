package intelligence

import (
	"os"
	"path/filepath"
	"strings"
)

// ============================================
// FAST SIGNAL SCANNER
// Lightweight scan - pattern detection ONLY
// No deep analysis, no AST traversal
// ============================================

// SignalScanner performs fast lightweight analysis
type SignalScanner struct {
	repoPath      string
	confidence    *SignalConfidenceVector
	signals       *FastSignals
	manifestPaths []string
}

// FastSignals - quick extraction results
type FastSignals struct {
	// Language signals
	DominantLanguage   string   `json:"dominantLanguage"`
	LanguagePercentage float64  `json:"languagePercentage"`
	SecondaryLanguages []string `json:"secondaryLanguages"`

	// Framework fingerprints
	// Framework fingerprints
	DetectedFrameworks []string `json:"detectedFrameworks"`
	DetectedDatabases  []string `json:"detectedDatabases"` // NEW
	DetectedInfra      []string `json:"detectedInfra"`     // NEW
	PackageManager     string   `json:"packageManager"`

	// Folder intent signals
	HasSrcFolder        bool `json:"hasSrcFolder"`
	HasInternalFolder   bool `json:"hasInternalFolder"`   // Go pattern
	HasPkgFolder        bool `json:"hasPkgFolder"`        // Go pattern
	HasCmdFolder        bool `json:"hasCmdFolder"`        // Go pattern
	HasAppFolder        bool `json:"hasAppFolder"`        // Node pattern
	HasComponentsFolder bool `json:"hasComponentsFolder"` // Frontend pattern
	HasServicesFolder   bool `json:"hasServicesFolder"`

	// Production markers
	HasDockerfile    bool `json:"hasDockerfile"`
	HasDockerCompose bool `json:"hasDockerCompose"`
	HasCI            bool `json:"hasCI"`
	HasTests         bool `json:"hasTests"`
	TestFilesCount   int  `json:"testFilesCount"`
	HasKubernetes    bool `json:"hasKubernetes"`
	HasTerraform     bool `json:"hasTerraform"`

	// Architecture signals
	ServiceCount     int  `json:"serviceCount"`
	HasGateway       bool `json:"hasGateway"`
	HasMicroservices bool `json:"hasMicroservices"`

	// ML signals
	HasMLMarkers bool `json:"hasMLMarkers"`
	HasNotebooks bool `json:"hasNotebooks"`

	// Code quality signals
	HasLinting    bool `json:"hasLinting"`
	HasTypeScript bool `json:"hasTypeScript"`
	HasReadme     bool `json:"hasReadme"`
	HasEnvExample bool `json:"hasEnvExample"`

	// File counts (for complexity estimation)
	TotalFiles int `json:"totalFiles"`
	CodeFiles  int `json:"codeFiles"`

	// Stack-specific analysis results
	DetectedRisks     []string `json:"detectedRisks,omitempty"`
	DetectedStrengths []string `json:"detectedStrengths,omitempty"`
}

// NewSignalScanner creates a new scanner
func NewSignalScanner(repoPath string) *SignalScanner {
	return &SignalScanner{
		repoPath:   repoPath,
		confidence: &SignalConfidenceVector{},
		signals:    &FastSignals{},
	}
}

// Scan performs fast signal extraction - NO DEEP ANALYSIS
func (s *SignalScanner) Scan() (*FastSignals, *SignalConfidenceVector, error) {
	// Phase 1: Quick file system scan
	s.scanFileSystem()

	// Phase 2: Detect frameworks from config files only
	s.detectFrameworks()

	// Phase 3: Compute confidence vector
	s.computeConfidence()

	return s.signals, s.confidence, nil
}

// scanFileSystem - fast directory walk with early termination
func (s *SignalScanner) scanFileSystem() {
	languageCounts := make(map[string]int)
	var totalFiles, codeFiles, testFiles int

	// Fast walk with depth limit
	filepath.WalkDir(s.repoPath, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return nil
		}

		// Skip common noise directories
		if d.IsDir() {
			name := d.Name()
			if name == "node_modules" || name == ".git" || name == "vendor" ||
				name == "__pycache__" || name == ".venv" || name == "dist" ||
				name == "build" || name == "target" {
				return filepath.SkipDir
			}

			// Folder intent detection
			switch name {
			case "src":
				s.signals.HasSrcFolder = true
			case "internal":
				s.signals.HasInternalFolder = true
			case "pkg":
				s.signals.HasPkgFolder = true
			case "cmd":
				s.signals.HasCmdFolder = true
			case "app":
				s.signals.HasAppFolder = true
			case "components":
				s.signals.HasComponentsFolder = true
			case "services":
				s.signals.HasServicesFolder = true
				s.signals.ServiceCount++
			case "gateway", "api-gateway":
				s.signals.HasGateway = true
			}
			return nil
		}

		totalFiles++
		name := d.Name()
		ext := strings.ToLower(filepath.Ext(name))

		// Language counting
		switch ext {
		case ".go":
			languageCounts["Go"]++
			codeFiles++
		case ".ts", ".tsx":
			languageCounts["TypeScript"]++
			codeFiles++
			s.signals.HasTypeScript = true
		case ".js", ".jsx":
			languageCounts["JavaScript"]++
			codeFiles++
		case ".py":
			languageCounts["Python"]++
			codeFiles++
		case ".rs":
			languageCounts["Rust"]++
			codeFiles++
		case ".java":
			languageCounts["Java"]++
			codeFiles++
		case ".ipynb":
			s.signals.HasNotebooks = true
			s.signals.HasMLMarkers = true
		}

		// Test detection
		if strings.Contains(name, "_test.go") || strings.Contains(name, ".test.") ||
			strings.Contains(name, ".spec.") || strings.HasPrefix(name, "test_") {
			testFiles++
		}

		// Production marker detection
		switch name {
		case "Dockerfile":
			s.signals.HasDockerfile = true
		case "docker-compose.yml", "docker-compose.yaml", "compose.yml":
			s.signals.HasDockerCompose = true
		case "README.md", "README":
			s.signals.HasReadme = true
		case ".env.example", ".env.sample":
			s.signals.HasEnvExample = true
		case ".eslintrc", ".eslintrc.json", ".eslintrc.js", ".prettierrc",
			"eslint.config.js", "eslint.config.mjs", "eslint.config.cjs":
			s.signals.HasLinting = true
		case "requirements.txt", "pyproject.toml":
			s.signals.PackageManager = "pip"
			s.manifestPaths = append(s.manifestPaths, path)
		case "package.json", "go.mod", "pom.xml":
			s.manifestPaths = append(s.manifestPaths, path)
		case "schema.prisma":
			s.manifestPaths = append(s.manifestPaths, path)
		}

		// CI detection
		rel, _ := filepath.Rel(s.repoPath, path)
		if strings.HasPrefix(rel, ".github/workflows") ||
			strings.HasPrefix(rel, ".gitlab-ci") ||
			name == "Jenkinsfile" || name == ".travis.yml" {
			s.signals.HasCI = true
		}

		// K8s detection
		if strings.Contains(name, "deployment.yaml") || strings.Contains(name, "service.yaml") ||
			strings.HasSuffix(name, ".k8s.yaml") {
			s.signals.HasKubernetes = true
		}

		// Terraform detection
		if ext == ".tf" {
			s.signals.HasTerraform = true
		}

		return nil
	})

	// Compute dominant language
	s.signals.TotalFiles = totalFiles
	s.signals.CodeFiles = codeFiles
	s.signals.TestFilesCount = testFiles
	s.signals.HasTests = testFiles > 0

	var maxCount int
	for lang, count := range languageCounts {
		if count > maxCount {
			maxCount = count
			s.signals.DominantLanguage = lang
		} else if count > 0 {
			s.signals.SecondaryLanguages = append(s.signals.SecondaryLanguages, lang)
		}
	}

	if codeFiles > 0 {
		s.signals.LanguagePercentage = float64(maxCount) / float64(codeFiles)
	}

	// Microservices heuristic
	if s.signals.ServiceCount >= 2 || (s.signals.HasDockerCompose && s.signals.ServiceCount >= 1) {
		s.signals.HasMicroservices = true
	}
}

// detectFrameworks - check config files only (no code parsing)
func (s *SignalScanner) detectFrameworks() {
	seenFrameworks := make(map[string]bool)
	seenDatabases := make(map[string]bool)
	seenInfra := make(map[string]bool)

	for _, path := range s.manifestPaths {
		content, err := os.ReadFile(path)
		if err != nil {
			continue
		}

		filename := filepath.Base(path)
		fileContent := string(content)
		lowerContent := strings.ToLower(fileContent)

		switch filename {
		case "package.json":
			s.signals.PackageManager = "npm"

			// Linting check in package.json (devDeps or scripts)
			if strings.Contains(fileContent, "eslint") || strings.Contains(fileContent, "\"lint\":") {
				s.signals.HasLinting = true
			}

			// Frameworks
			if strings.Contains(fileContent, "\"react\"") {
				seenFrameworks["React"] = true
			}
			if strings.Contains(fileContent, "\"vue\"") {
				seenFrameworks["Vue"] = true
			}
			if strings.Contains(fileContent, "\"@angular/core\"") {
				seenFrameworks["Angular"] = true
			}
			if strings.Contains(fileContent, "\"next\"") {
				seenFrameworks["Next.js"] = true
			}
			if strings.Contains(fileContent, "\"express\"") {
				seenFrameworks["Express"] = true
			}
			if strings.Contains(fileContent, "\"nestjs\"") || strings.Contains(fileContent, "\"@nestjs/core\"") {
				seenFrameworks["NestJS"] = true
			}

			// Databases
			if strings.Contains(fileContent, "\"prisma\"") || strings.Contains(fileContent, "\"@prisma/client\"") {
				seenFrameworks["Prisma"] = true
				seenDatabases["Prisma"] = true
				// Don't assume PostgreSQL — detect actual DB from schema.prisma provider
			}
			if strings.Contains(fileContent, "\"mongoose\"") || strings.Contains(fileContent, "\"mongodb\"") {
				seenDatabases["MongoDB"] = true
			}
			if strings.Contains(fileContent, "\"pg\"") {
				seenDatabases["PostgreSQL"] = true
			}
			if strings.Contains(fileContent, "\"mysql\"") || strings.Contains(fileContent, "\"mysql2\"") {
				seenDatabases["MySQL"] = true
			}

			// Infra
			if strings.Contains(lowerContent, "redis") {
				seenInfra["Redis"] = true
			}
			if strings.Contains(lowerContent, "kafka") || strings.Contains(lowerContent, "kafkajs") {
				seenInfra["Kafka"] = true
			}
			if strings.Contains(lowerContent, "amqplib") || strings.Contains(lowerContent, "rabbitmq") {
				seenInfra["RabbitMQ"] = true
			}

		case "go.mod":
			// Frameworks
			if strings.Contains(fileContent, "gin-gonic/gin") {
				seenFrameworks["Gin"] = true
			}
			if strings.Contains(fileContent, "gofiber/fiber") {
				seenFrameworks["Fiber"] = true
			}
			if strings.Contains(fileContent, "labstack/echo") {
				seenFrameworks["Echo"] = true
			}
			if strings.Contains(fileContent, "go-chi/chi") {
				seenFrameworks["Chi"] = true
			}
			if strings.Contains(fileContent, "grpc") {
				seenFrameworks["gRPC"] = true
			}

			// Databases
			if strings.Contains(fileContent, "gorm.io/gorm") {
				seenDatabases["GORM"] = true
			}
			if strings.Contains(fileContent, "lib/pq") || strings.Contains(fileContent, "pgx") {
				seenDatabases["PostgreSQL"] = true
			}
			if strings.Contains(fileContent, "mongo-driver") {
				seenDatabases["MongoDB"] = true
			}

			// Infra
			if strings.Contains(fileContent, "redis/go-redis") {
				seenInfra["Redis"] = true
			}
			if strings.Contains(fileContent, "segmentio/kafka-go") || strings.Contains(fileContent, "confluent-kafka-go") {
				seenInfra["Kafka"] = true
			}

		case "requirements.txt", "pyproject.toml":
			if strings.Contains(fileContent, "fastapi") || strings.Contains(fileContent, "FastAPI") {
				seenFrameworks["FastAPI"] = true
			}
			if strings.Contains(fileContent, "django") || strings.Contains(fileContent, "Django") {
				seenFrameworks["Django"] = true
			}
			if strings.Contains(fileContent, "flask") || strings.Contains(fileContent, "Flask") {
				seenFrameworks["Flask"] = true
			}

			// Databases
			if strings.Contains(lowerContent, "sqlalchemy") {
				seenDatabases["SQLAlchemy"] = true
			}
			if strings.Contains(lowerContent, "psycopg2") {
				seenDatabases["PostgreSQL"] = true
			}
			if strings.Contains(lowerContent, "pymongo") {
				seenDatabases["MongoDB"] = true
			}

			// Infra
			if strings.Contains(lowerContent, "redis") {
				seenInfra["Redis"] = true
			}

			if strings.Contains(fileContent, "tensorflow") || strings.Contains(fileContent, "torch") ||
				strings.Contains(fileContent, "sklearn") || strings.Contains(fileContent, "keras") {
				s.signals.HasMLMarkers = true
			}

		case "schema.prisma":
			// Detect actual database provider from Prisma schema
			seenFrameworks["Prisma"] = true
			seenDatabases["Prisma"] = true
			if strings.Contains(lowerContent, "provider = \"postgresql\"") || strings.Contains(lowerContent, "provider = \"postgres\"") {
				seenDatabases["PostgreSQL"] = true
			}
			if strings.Contains(lowerContent, "provider = \"mysql\"") {
				seenDatabases["MySQL"] = true
			}
			if strings.Contains(lowerContent, "provider = \"mongodb\"") {
				seenDatabases["MongoDB"] = true
			}
			if strings.Contains(lowerContent, "provider = \"sqlite\"") {
				seenDatabases["SQLite"] = true
			}
			if strings.Contains(lowerContent, "provider = \"sqlserver\"") {
				seenDatabases["SQL Server"] = true
			}
			if strings.Contains(lowerContent, "provider = \"cockroachdb\"") {
				seenDatabases["CockroachDB"] = true
			}
		}
	}

	// Convert maps to slices
	for k := range seenFrameworks {
		s.signals.DetectedFrameworks = append(s.signals.DetectedFrameworks, k)
	}
	for k := range seenDatabases {
		s.signals.DetectedDatabases = append(s.signals.DetectedDatabases, k)
	}
	for k := range seenInfra {
		s.signals.DetectedInfra = append(s.signals.DetectedInfra, k)
	}
}

// ComputeSignalConfidence computes confidence vector from given signals
// Exported to allow external callers to generate confidence without scanning
func ComputeSignalConfidence(signals *FastSignals) *SignalConfidenceVector {
	confidence := &SignalConfidenceVector{}

	// Language confidence
	if signals.DominantLanguage != "" && signals.LanguagePercentage > 0.6 {
		confidence.LanguageConfidence = signals.LanguagePercentage
	} else if signals.DominantLanguage != "" {
		confidence.LanguageConfidence = 0.5
	}

	// Framework confidence
	if len(signals.DetectedFrameworks) > 0 {
		confidence.FrameworkConfidence = 0.8
	} else if signals.PackageManager != "" {
		confidence.FrameworkConfidence = 0.3
	}

	// Architecture confidence
	archScore := 0.0
	if signals.HasMicroservices {
		archScore += 0.3
	}
	if signals.HasInternalFolder && signals.HasCmdFolder {
		archScore += 0.3 // Go standard layout
	}
	if signals.HasSrcFolder {
		archScore += 0.1
	}
	if signals.HasServicesFolder {
		archScore += 0.2
	}
	if signals.HasGateway {
		archScore += 0.2
	}
	confidence.ArchitectureConfidence = min(archScore, 1.0)

	// Infrastructure confidence
	infraScore := 0.0
	if signals.HasDockerfile {
		infraScore += 0.3
	}
	if signals.HasDockerCompose {
		infraScore += 0.2
	}
	if signals.HasKubernetes {
		infraScore += 0.3
	}
	if signals.HasTerraform {
		infraScore += 0.2
	}
	confidence.InfraConfidence = min(infraScore, 1.0)

	// Test confidence
	if signals.HasTests {
		testRatio := float64(signals.TestFilesCount) / float64(max(signals.CodeFiles, 1))
		if testRatio > 0.3 {
			confidence.TestConfidence = 0.9
		} else if testRatio > 0.1 {
			confidence.TestConfidence = 0.6
		} else {
			confidence.TestConfidence = 0.3
		}
	}

	// ML confidence
	if signals.HasMLMarkers || signals.HasNotebooks {
		confidence.MLConfidence = 0.8
	}

	// Security confidence (basic)
	if signals.HasEnvExample && signals.HasLinting {
		confidence.SecurityConfidence = 0.5
	}

	return confidence
}

// computeConfidence - calculate confidence vector
func (s *SignalScanner) computeConfidence() {
	s.confidence = ComputeSignalConfidence(s.signals)
}
