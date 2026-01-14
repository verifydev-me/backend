package intelligence

import (
	"os"
	"path/filepath"
	"strings"
)

// ============================================
// STACK-SPECIFIC ANALYZERS
// Pattern-based analysis, NOT line-by-line
// Each analyzer returns signals, not facts
// ============================================

// StackAnalyzer interface for all stack-specific analyzers
type StackAnalyzer interface {
	Analyze(repoPath string) *StackAnalysisResult
	Name() string
	EstimatedCost() int64 // milliseconds
}

// StackAnalysisResult contains analysis output
type StackAnalysisResult struct {
	Signals    []string
	Risks      []string
	Strengths  []string
	Patterns   []PatternSignal
	Confidence float64
}

// PatternSignal represents a detected pattern
type PatternSignal struct {
	Pattern    string  `json:"pattern"`
	Category   string  `json:"category"`
	Confidence float64 `json:"confidence"`
	Evidence   string  `json:"evidence"`
	IsRisk     bool    `json:"isRisk"`
}

// ============================================
// NEXT.JS / FRONTEND ANALYZER
// App Router vs Pages Router
// Server vs Client components
// SEO metadata presence
// ============================================

type NextJSAnalyzer struct {
	repoPath string
}

func NewNextJSAnalyzer() *NextJSAnalyzer {
	return &NextJSAnalyzer{}
}

func (a *NextJSAnalyzer) Name() string         { return "NextJS Frontend" }
func (a *NextJSAnalyzer) EstimatedCost() int64 { return 150 }

func (a *NextJSAnalyzer) Analyze(repoPath string) *StackAnalysisResult {
	a.repoPath = repoPath
	result := &StackAnalysisResult{}

	// Detect App Router vs Pages Router
	hasAppDir := pathExists(filepath.Join(repoPath, "app"))
	hasPagesDir := pathExists(filepath.Join(repoPath, "pages"))
	hasSrcAppDir := pathExists(filepath.Join(repoPath, "src", "app"))
	hasSrcPagesDir := pathExists(filepath.Join(repoPath, "src", "pages"))

	if hasAppDir || hasSrcAppDir {
		result.Patterns = append(result.Patterns, PatternSignal{
			Pattern:    "App Router",
			Category:   "routing",
			Confidence: 0.95,
			Evidence:   "app/ directory detected",
		})
		result.Strengths = append(result.Strengths, "Uses modern App Router (Next.js 13+)")
	} else if hasPagesDir || hasSrcPagesDir {
		result.Patterns = append(result.Patterns, PatternSignal{
			Pattern:    "Pages Router",
			Category:   "routing",
			Confidence: 0.95,
			Evidence:   "pages/ directory detected",
		})
		result.Signals = append(result.Signals, "Uses legacy Pages Router")
	}

	// Scan for component patterns
	clientComponents := 0
	serverComponents := 0
	a.walkComponents(repoPath, &clientComponents, &serverComponents)

	if clientComponents > 0 || serverComponents > 0 {
		ratio := float64(clientComponents) / float64(max(serverComponents+clientComponents, 1))
		if ratio > 0.7 {
			result.Risks = append(result.Risks, "Overuse of client components (>70%)")
			result.Patterns = append(result.Patterns, PatternSignal{
				Pattern:    "Client-heavy",
				Category:   "rendering",
				Confidence: ratio,
				Evidence:   "High ratio of 'use client' directives",
				IsRisk:     true,
			})
		} else if ratio < 0.3 {
			result.Strengths = append(result.Strengths, "Good server component usage")
		}
	}

	// Check for route groups
	if hasAppDir || hasSrcAppDir {
		appPath := filepath.Join(repoPath, "app")
		if hasSrcAppDir {
			appPath = filepath.Join(repoPath, "src", "app")
		}
		routeGroups := a.countRouteGroups(appPath)
		if routeGroups > 0 {
			result.Strengths = append(result.Strengths, "Uses route groups for organization")
			result.Patterns = append(result.Patterns, PatternSignal{
				Pattern:    "Route Groups",
				Category:   "organization",
				Confidence: 0.9,
				Evidence:   "Parenthesized folders detected",
			})
		}
	}

	// SEO metadata check
	hasSEO := a.checkSEOMetadata(repoPath)
	if !hasSEO {
		result.Risks = append(result.Risks, "Missing SEO metadata (generateMetadata or Head)")
	} else {
		result.Strengths = append(result.Strengths, "SEO metadata configured")
	}

	// Data fetching patterns
	patterns := a.checkDataFetching(repoPath)
	result.Patterns = append(result.Patterns, patterns...)

	// Calculate confidence
	confidencePoints := 0.5
	if len(result.Strengths) > 2 {
		confidencePoints += 0.2
	}
	if len(result.Risks) == 0 {
		confidencePoints += 0.2
	}
	if hasAppDir || hasSrcAppDir {
		confidencePoints += 0.1
	}

	// Cap at 1.0
	if confidencePoints > 1.0 {
		confidencePoints = 1.0
	}
	result.Confidence = confidencePoints

	return result
}

func (a *NextJSAnalyzer) walkComponents(root string, client, server *int) {
	filepath.WalkDir(root, func(path string, d os.DirEntry, err error) error {
		if err != nil || d.IsDir() {
			return nil
		}
		if strings.HasSuffix(path, ".tsx") || strings.HasSuffix(path, ".jsx") {
			content, err := os.ReadFile(path)
			if err != nil {
				return nil
			}
			// Only check first 500 bytes to avoid reading entire file
			checkLen := len(content)
			if checkLen > 500 {
				checkLen = 500
			}
			contentStr := string(content[:checkLen])
			if strings.Contains(contentStr, "'use client'") || strings.Contains(contentStr, "\"use client\"") {
				*client++
			} else if strings.Contains(path, "app/") || strings.Contains(path, "app\\") {
				*server++ // In app dir, components are server by default
			}
		}
		return nil
	})
}

func (a *NextJSAnalyzer) countRouteGroups(appPath string) int {
	count := 0
	filepath.WalkDir(appPath, func(path string, d os.DirEntry, err error) error {
		if err != nil || !d.IsDir() {
			return nil
		}
		name := d.Name()
		if strings.HasPrefix(name, "(") && strings.HasSuffix(name, ")") {
			count++
		}
		return nil
	})
	return count
}

func (a *NextJSAnalyzer) checkSEOMetadata(root string) bool {
	found := false
	searchTerms := []string{"generateMetadata", "export const metadata", "<Head>", "next/head"}

	filepath.WalkDir(root, func(path string, d os.DirEntry, err error) error {
		if found || err != nil || d.IsDir() {
			return nil
		}
		if !strings.HasSuffix(path, ".tsx") && !strings.HasSuffix(path, ".jsx") {
			return nil
		}
		content, err := os.ReadFile(path)
		if err != nil {
			return nil
		}
		for _, term := range searchTerms {
			if strings.Contains(string(content), term) {
				found = true
				return filepath.SkipAll
			}
		}
		return nil
	})
	return found
}

func (a *NextJSAnalyzer) checkDataFetching(root string) []PatternSignal {
	patterns := []PatternSignal{}

	hasGetServerSideProps := false
	hasGetStaticProps := false
	hasUseEffect := false
	hasFetch := false

	filepath.WalkDir(root, func(path string, d os.DirEntry, err error) error {
		if err != nil || d.IsDir() {
			return nil
		}
		if !strings.HasSuffix(path, ".tsx") && !strings.HasSuffix(path, ".jsx") && !strings.HasSuffix(path, ".ts") {
			return nil
		}
		content, err := os.ReadFile(path)
		if err != nil {
			return nil
		}
		contentStr := string(content)
		if strings.Contains(contentStr, "getServerSideProps") {
			hasGetServerSideProps = true
		}
		if strings.Contains(contentStr, "getStaticProps") {
			hasGetStaticProps = true
		}
		if strings.Contains(contentStr, "useEffect") && strings.Contains(contentStr, "fetch") {
			hasUseEffect = true
		}
		if strings.Contains(contentStr, "async") && strings.Contains(contentStr, "fetch(") {
			hasFetch = true
		}
		return nil
	})

	if hasGetServerSideProps {
		patterns = append(patterns, PatternSignal{
			Pattern:    "SSR Data Fetching",
			Category:   "data-fetching",
			Confidence: 0.9,
			Evidence:   "getServerSideProps detected",
		})
	}
	if hasGetStaticProps {
		patterns = append(patterns, PatternSignal{
			Pattern:    "SSG Data Fetching",
			Category:   "data-fetching",
			Confidence: 0.9,
			Evidence:   "getStaticProps detected",
		})
	}
	if hasUseEffect && !hasGetServerSideProps && !hasGetStaticProps {
		patterns = append(patterns, PatternSignal{
			Pattern:    "Client-side Fetching",
			Category:   "data-fetching",
			Confidence: 0.7,
			Evidence:   "useEffect + fetch pattern",
			IsRisk:     true,
		})
	}
	if hasFetch && (hasGetServerSideProps || hasGetStaticProps) {
		patterns = append(patterns, PatternSignal{
			Pattern:    "Hybrid Data Fetching",
			Category:   "data-fetching",
			Confidence: 0.85,
			Evidence:   "Uses both server and client fetching",
		})
	}

	return patterns
}

// ============================================
// GO BACKEND ANALYZER
// Context propagation
// Goroutine patterns
// Error handling
// ============================================

type GoBackendAnalyzer struct{}

func NewGoBackendAnalyzer() *GoBackendAnalyzer {
	return &GoBackendAnalyzer{}
}

func (a *GoBackendAnalyzer) Name() string         { return "Go Backend" }
func (a *GoBackendAnalyzer) EstimatedCost() int64 { return 200 }

func (a *GoBackendAnalyzer) Analyze(repoPath string) *StackAnalysisResult {
	result := &StackAnalysisResult{}

	handlerFiles := 0
	hasContext := false
	hasCancelFunc := false
	hasGoroutines := false
	hasErrgroup := false
	hasStructuredLogging := false
	hasErrorWrapping := false

	filepath.WalkDir(repoPath, func(path string, d os.DirEntry, err error) error {
		if err != nil || d.IsDir() {
			return nil
		}
		if !strings.HasSuffix(path, ".go") || strings.HasSuffix(path, "_test.go") {
			return nil
		}

		content, err := os.ReadFile(path)
		if err != nil {
			return nil
		}
		contentStr := string(content)

		// Handler detection
		if strings.Contains(path, "handler") || strings.Contains(path, "controller") {
			handlerFiles++
		}

		// Context propagation
		if strings.Contains(contentStr, "context.Context") {
			hasContext = true
		}
		if strings.Contains(contentStr, "context.WithCancel") || strings.Contains(contentStr, "context.WithTimeout") {
			hasCancelFunc = true
		}

		// Goroutine patterns
		if strings.Contains(contentStr, "go func") {
			hasGoroutines = true
		}
		if strings.Contains(contentStr, "errgroup") || strings.Contains(contentStr, "sync.WaitGroup") {
			hasErrgroup = true
		}

		// Logging
		if strings.Contains(contentStr, "zerolog") || strings.Contains(contentStr, "zap.") || strings.Contains(contentStr, "logrus") {
			hasStructuredLogging = true
		}

		// Error handling
		if strings.Contains(contentStr, "errors.Wrap") || strings.Contains(contentStr, "fmt.Errorf") && strings.Contains(contentStr, "%w") {
			hasErrorWrapping = true
		}

		return nil
	})

	// Analyze patterns
	if handlerFiles > 0 && !hasContext {
		result.Risks = append(result.Risks, "HTTP handlers without context.Context propagation")
		result.Patterns = append(result.Patterns, PatternSignal{
			Pattern:  "Missing Context",
			Category: "concurrency",
			IsRisk:   true,
			Evidence: "Handlers found without context.Context",
		})
	}

	if hasGoroutines && !hasCancelFunc {
		result.Risks = append(result.Risks, "Goroutines without proper cancellation")
		result.Patterns = append(result.Patterns, PatternSignal{
			Pattern:  "Uncontrolled Goroutines",
			Category: "concurrency",
			IsRisk:   true,
			Evidence: "go func() without context or cancel mechanism",
		})
	}

	if hasGoroutines && hasErrgroup {
		result.Strengths = append(result.Strengths, "Uses errgroup/WaitGroup for goroutine management")
	}

	if hasStructuredLogging {
		result.Strengths = append(result.Strengths, "Structured logging implemented")
	}

	if hasErrorWrapping {
		result.Strengths = append(result.Strengths, "Error wrapping for stack traces")
	} else if handlerFiles > 2 {
		result.Risks = append(result.Risks, "No error wrapping - stack traces will be lost")
	}

	// Go standard layout check
	hasInternal := pathExists(filepath.Join(repoPath, "internal"))
	hasCmd := pathExists(filepath.Join(repoPath, "cmd"))
	hasPkg := pathExists(filepath.Join(repoPath, "pkg"))

	if hasInternal && hasCmd {
		result.Strengths = append(result.Strengths, "Follows Go standard project layout")
		result.Patterns = append(result.Patterns, PatternSignal{
			Pattern:    "Go Standard Layout",
			Category:   "architecture",
			Confidence: 0.95,
			Evidence:   "internal/ and cmd/ directories present",
		})
	}
	if hasPkg {
		result.Strengths = append(result.Strengths, "Uses pkg/ for reusable packages")
	}

	// Calculate confidence
	result.Confidence = 0.5
	if hasContext {
		result.Confidence += 0.15
	}
	if hasStructuredLogging {
		result.Confidence += 0.1
	}
	if hasInternal {
		result.Confidence += 0.15
	}
	if len(result.Risks) == 0 {
		result.Confidence += 0.1
	}

	return result
}

// ============================================
// NODE BACKEND ANALYZER
// Async patterns
// Error handling
// Middleware chains
// ============================================

type NodeBackendAnalyzer struct{}

func NewNodeBackendAnalyzer() *NodeBackendAnalyzer {
	return &NodeBackendAnalyzer{}
}

func (a *NodeBackendAnalyzer) Name() string         { return "Node Backend" }
func (a *NodeBackendAnalyzer) EstimatedCost() int64 { return 180 }

func (a *NodeBackendAnalyzer) Analyze(repoPath string) *StackAnalysisResult {
	result := &StackAnalysisResult{}

	hasAsyncAwait := false
	hasCallback := false
	hasTryCatch := false
	hasMiddleware := false
	hasValidation := false
	hasRateLimiting := false

	filepath.WalkDir(repoPath, func(path string, d os.DirEntry, err error) error {
		if err != nil || d.IsDir() {
			return nil
		}
		if !strings.HasSuffix(path, ".ts") && !strings.HasSuffix(path, ".js") {
			return nil
		}
		if strings.Contains(path, "node_modules") {
			return filepath.SkipDir
		}

		content, err := os.ReadFile(path)
		if err != nil {
			return nil
		}
		contentStr := string(content)

		if strings.Contains(contentStr, "async") && strings.Contains(contentStr, "await") {
			hasAsyncAwait = true
		}
		if strings.Contains(contentStr, "callback") || strings.Contains(contentStr, ".then(") {
			hasCallback = true
		}
		if strings.Contains(contentStr, "try {") && strings.Contains(contentStr, "catch") {
			hasTryCatch = true
		}
		if strings.Contains(contentStr, "middleware") || strings.Contains(contentStr, ".use(") {
			hasMiddleware = true
		}
		if strings.Contains(contentStr, "validate") || strings.Contains(contentStr, "Joi") || strings.Contains(contentStr, "zod") {
			hasValidation = true
		}
		if strings.Contains(contentStr, "rateLimit") || strings.Contains(contentStr, "rate-limit") {
			hasRateLimiting = true
		}

		return nil
	})

	if hasAsyncAwait {
		result.Strengths = append(result.Strengths, "Uses modern async/await patterns")
	}
	if hasCallback && !hasAsyncAwait {
		result.Risks = append(result.Risks, "Callback-based code - consider migrating to async/await")
	}
	if !hasTryCatch {
		result.Risks = append(result.Risks, "Missing try/catch blocks - unhandled promise rejections risk")
	}
	if hasMiddleware {
		result.Strengths = append(result.Strengths, "Middleware architecture for cross-cutting concerns")
	}
	if hasValidation {
		result.Strengths = append(result.Strengths, "Input validation implemented")
	} else {
		result.Risks = append(result.Risks, "No input validation detected")
	}
	if hasRateLimiting {
		result.Strengths = append(result.Strengths, "Rate limiting configured")
	}

	result.Confidence = 0.6
	if hasAsyncAwait && hasTryCatch {
		result.Confidence += 0.2
	}
	if hasValidation {
		result.Confidence += 0.1
	}

	return result
}

// ============================================
// HELPERS
// ============================================

func pathExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}
