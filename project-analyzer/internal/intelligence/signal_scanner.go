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
	repoPath   string
	confidence *SignalConfidenceVector
	signals    *FastSignals
}

// FastSignals - quick extraction results
type FastSignals struct {
	// Language signals
	DominantLanguage   string   `json:"dominantLanguage"`
	LanguagePercentage float64  `json:"languagePercentage"`
	SecondaryLanguages []string `json:"secondaryLanguages"`

	// Framework fingerprints
	DetectedFrameworks []string `json:"detectedFrameworks"`
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
		case ".eslintrc", ".eslintrc.json", ".eslintrc.js", ".prettierrc":
			s.signals.HasLinting = true
		case "requirements.txt", "pyproject.toml":
			s.signals.PackageManager = "pip"
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
	// Check package.json
	if content, err := os.ReadFile(filepath.Join(s.repoPath, "package.json")); err == nil {
		s.signals.PackageManager = "npm"
		pkg := string(content)
		if strings.Contains(pkg, "\"react\"") {
			s.signals.DetectedFrameworks = append(s.signals.DetectedFrameworks, "React")
		}
		if strings.Contains(pkg, "\"vue\"") {
			s.signals.DetectedFrameworks = append(s.signals.DetectedFrameworks, "Vue")
		}
		if strings.Contains(pkg, "\"@angular/core\"") {
			s.signals.DetectedFrameworks = append(s.signals.DetectedFrameworks, "Angular")
		}
		if strings.Contains(pkg, "\"next\"") {
			s.signals.DetectedFrameworks = append(s.signals.DetectedFrameworks, "Next.js")
		}
		if strings.Contains(pkg, "\"express\"") {
			s.signals.DetectedFrameworks = append(s.signals.DetectedFrameworks, "Express")
		}
		if strings.Contains(pkg, "\"nestjs\"") || strings.Contains(pkg, "\"@nestjs/core\"") {
			s.signals.DetectedFrameworks = append(s.signals.DetectedFrameworks, "NestJS")
		}
		if strings.Contains(pkg, "\"prisma\"") || strings.Contains(pkg, "\"@prisma/client\"") {
			s.signals.DetectedFrameworks = append(s.signals.DetectedFrameworks, "Prisma")
		}
	}

	// Check go.mod
	if content, err := os.ReadFile(filepath.Join(s.repoPath, "go.mod")); err == nil {
		mod := string(content)
		if strings.Contains(mod, "gin-gonic/gin") {
			s.signals.DetectedFrameworks = append(s.signals.DetectedFrameworks, "Gin")
		}
		if strings.Contains(mod, "gofiber/fiber") {
			s.signals.DetectedFrameworks = append(s.signals.DetectedFrameworks, "Fiber")
		}
		if strings.Contains(mod, "labstack/echo") {
			s.signals.DetectedFrameworks = append(s.signals.DetectedFrameworks, "Echo")
		}
		if strings.Contains(mod, "go-chi/chi") {
			s.signals.DetectedFrameworks = append(s.signals.DetectedFrameworks, "Chi")
		}
		if strings.Contains(mod, "grpc") {
			s.signals.DetectedFrameworks = append(s.signals.DetectedFrameworks, "gRPC")
		}
	}

	// Check requirements.txt / pyproject.toml
	if content, err := os.ReadFile(filepath.Join(s.repoPath, "requirements.txt")); err == nil {
		req := string(content)
		if strings.Contains(req, "fastapi") || strings.Contains(req, "FastAPI") {
			s.signals.DetectedFrameworks = append(s.signals.DetectedFrameworks, "FastAPI")
		}
		if strings.Contains(req, "django") || strings.Contains(req, "Django") {
			s.signals.DetectedFrameworks = append(s.signals.DetectedFrameworks, "Django")
		}
		if strings.Contains(req, "flask") || strings.Contains(req, "Flask") {
			s.signals.DetectedFrameworks = append(s.signals.DetectedFrameworks, "Flask")
		}
		if strings.Contains(req, "tensorflow") || strings.Contains(req, "torch") ||
			strings.Contains(req, "sklearn") || strings.Contains(req, "keras") {
			s.signals.HasMLMarkers = true
		}
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

// Helper functions
func min(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
