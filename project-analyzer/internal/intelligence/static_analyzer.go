package intelligence

import (
	"go/ast"
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"strings"

	"github.com/rs/zerolog/log"
)

// ============================================
// STATIC ANALYZER - Code Quality & Correctness
// Pattern-based static analysis for Go code
// ============================================

// StaticAnalyzer performs static analysis
type StaticAnalyzer struct {
	repoPath string
	fset     *token.FileSet
}

// StaticReport contains static analysis results
type StaticReport struct {
	CodeQuality       int                `json:"codeQuality"` // 0-100
	TotalIssues       int                `json:"totalIssues"`
	ErrorIssues       int                `json:"errorIssues"`
	WarningIssues     int                `json:"warningIssues"`
	InfoIssues        int                `json:"infoIssues"`
	Suggestions       []StaticSuggestion `json:"suggestions"`
	CategoryBreakdown map[string]int     `json:"categoryBreakdown"`
	HasUnusedCode     bool               `json:"hasUnusedCode"`
	HasDeprecatedAPIs bool               `json:"hasDeprecatedAPIs"`
	HasRaceConditions bool               `json:"hasRaceConditions"`
}

// StaticSuggestion represents an actionable code improvement
type StaticSuggestion struct {
	Category    string `json:"category"`
	Severity    string `json:"severity"`
	File        string `json:"file"`
	Line        int    `json:"line"`
	Description string `json:"description"`
	Suggestion  string `json:"suggestion"`
}

// NewStaticAnalyzer creates a new static analyzer
func NewStaticAnalyzer(repoPath string) *StaticAnalyzer {
	return &StaticAnalyzer{
		repoPath: repoPath,
		fset:     token.NewFileSet(),
	}
}

// Analyze performs static analysis on the repository
func (s *StaticAnalyzer) Analyze() (*StaticReport, error) {
	log.Info().Str("path", s.repoPath).Msg("Starting static analysis")

	report := &StaticReport{
		Suggestions:       []StaticSuggestion{},
		CategoryBreakdown: make(map[string]int),
		CodeQuality:       100, // Start perfect
	}

	// Check if Go modules exist
	if !s.hasGoMod() {
		log.Info().Msg("No go.mod found, skipping static analysis")
		report.CodeQuality = 50 // Neutral score
		return report, nil
	}

	// Find all Go files
	goFiles, err := s.findGoFiles()
	if err != nil {
		log.Warn().Err(err).Msg("Failed to find Go files")
		return report, nil
	}

	if len(goFiles) == 0 {
		log.Info().Msg("No Go files found for static analysis")
		return report, nil
	}

	// Analyze each file
	for _, filePath := range goFiles {
		s.analyzeFile(filePath, report)
	}

	// Calculate code quality score
	report.CodeQuality = s.calculateQualityScore(report)

	log.Info().
		Int("totalIssues", report.TotalIssues).
		Int("quality", report.CodeQuality).
		Msg("Static analysis completed")

	return report, nil
}

// analyzeFile analyzes a single Go file using AST
func (s *StaticAnalyzer) analyzeFile(filePath string, report *StaticReport) {
	// Parse the file
	node, err := parser.ParseFile(s.fset, filePath, nil, parser.ParseComments)
	if err != nil {
		return // Skip files that don't parse
	}

	filename := filepath.Base(filePath)

	// Track declared but unused variables (simplified check)
	declaredVars := make(map[string]int) // name -> line
	usedVars := make(map[string]bool)

	// Walk the AST
	ast.Inspect(node, func(n ast.Node) bool {
		switch x := n.(type) {
		case *ast.FuncDecl:
			s.analyzeFunction(x, filename, report)

		case *ast.AssignStmt:
			// Track variable declarations
			for _, lhs := range x.Lhs {
				if ident, ok := lhs.(*ast.Ident); ok {
					if ident.Name == "_" {
						// Ignored value
						s.addSuggestion(report, "Error Handling", "warning", filename,
							s.fset.Position(x.Pos()).Line,
							"Value ignored with blank identifier",
							"Consider handling this value or removing it")
					} else if x.Tok == token.DEFINE {
						declaredVars[ident.Name] = s.fset.Position(x.Pos()).Line
					}
				}
			}

		case *ast.Ident:
			// Track variable usage
			usedVars[x.Name] = true

		case *ast.GoStmt:
			// Check goroutine patterns
			s.analyzeGoroutine(x, filename, report)

		case *ast.DeferStmt:
			// Check defer patterns
			s.analyzeDefer(x, filename, report)

		case *ast.CallExpr:
			// Check function calls
			s.analyzeCall(x, filename, report)
		}
		return true
	})

	// Check for unused variables (simplified)
	for name, line := range declaredVars {
		if !usedVars[name] && !strings.HasPrefix(name, "_") {
			s.addSuggestion(report, "Unused Code", "warning", filename, line,
				"Variable '"+name+"' may be unused",
				"Remove unused variable or use it")
			report.HasUnusedCode = true
		}
	}
}

// analyzeFunction checks function-level issues
func (s *StaticAnalyzer) analyzeFunction(fn *ast.FuncDecl, filename string, report *StaticReport) {
	line := s.fset.Position(fn.Pos()).Line

	// Check function length
	if fn.Body != nil {
		start := s.fset.Position(fn.Body.Lbrace).Line
		end := s.fset.Position(fn.Body.Rbrace).Line
		length := end - start

		if length > 100 {
			s.addSuggestion(report, "Maintainability", "warning", filename, line,
				"Function '"+fn.Name.Name+"' is too long ("+string(rune(length))+" lines)",
				"Consider breaking into smaller functions")
		} else if length > 50 {
			s.addSuggestion(report, "Maintainability", "info", filename, line,
				"Function '"+fn.Name.Name+"' is fairly long",
				"Consider if it can be simplified")
		}
	}

	// Check if function returns error but no error handling inside
	if fn.Type.Results != nil {
		for _, field := range fn.Type.Results.List {
			if ident, ok := field.Type.(*ast.Ident); ok {
				if ident.Name == "error" {
					// This function returns error - check if it handles errors
					hasErrCheck := false
					ast.Inspect(fn, func(n ast.Node) bool {
						if ifStmt, ok := n.(*ast.IfStmt); ok {
							if s.isErrorCheck(ifStmt) {
								hasErrCheck = true
							}
						}
						return true
					})
					if !hasErrCheck && fn.Body != nil && len(fn.Body.List) > 3 {
						s.addSuggestion(report, "Error Handling", "info", filename, line,
							"Function '"+fn.Name.Name+"' returns error but may not handle internal errors",
							"Ensure errors from called functions are properly handled")
					}
				}
			}
		}
	}
}

// analyzeGoroutine checks goroutine patterns
func (s *StaticAnalyzer) analyzeGoroutine(goStmt *ast.GoStmt, filename string, report *StaticReport) {
	line := s.fset.Position(goStmt.Pos()).Line

	// Check if goroutine uses context
	hasContext := false
	hasChannel := false
	hasWaitGroup := false

	ast.Inspect(goStmt, func(n ast.Node) bool {
		if ident, ok := n.(*ast.Ident); ok {
			name := strings.ToLower(ident.Name)
			if strings.Contains(name, "ctx") || strings.Contains(name, "context") {
				hasContext = true
			}
			if strings.Contains(name, "chan") {
				hasChannel = true
			}
			if strings.Contains(name, "wg") || strings.Contains(name, "waitgroup") {
				hasWaitGroup = true
			}
		}
		return true
	})

	if !hasContext && !hasChannel && !hasWaitGroup {
		s.addSuggestion(report, "Concurrency", "warning", filename, line,
			"Goroutine may lack proper synchronization",
			"Consider using context, channels, or WaitGroup for proper goroutine lifecycle management")
		report.HasRaceConditions = true
	}
}

// analyzeDefer checks defer patterns
func (s *StaticAnalyzer) analyzeDefer(deferStmt *ast.DeferStmt, filename string, report *StaticReport) {
	// Check for defer in loop (common mistake)
	// This is a simplified check - in real implementation, we'd track if we're in a loop
}

// analyzeCall checks function call patterns
func (s *StaticAnalyzer) analyzeCall(call *ast.CallExpr, filename string, report *StaticReport) {
	line := s.fset.Position(call.Pos()).Line

	// Check for deprecated APIs
	if sel, ok := call.Fun.(*ast.SelectorExpr); ok {
		deprecatedAPIs := map[string]string{
			"ioutil.ReadAll":   "Use io.ReadAll instead (Go 1.16+)",
			"ioutil.ReadFile":  "Use os.ReadFile instead (Go 1.16+)",
			"ioutil.WriteFile": "Use os.WriteFile instead (Go 1.16+)",
			"ioutil.TempDir":   "Use os.MkdirTemp instead (Go 1.16+)",
			"ioutil.TempFile":  "Use os.CreateTemp instead (Go 1.16+)",
			"ioutil.ReadDir":   "Use os.ReadDir instead (Go 1.16+)",
			"ioutil.NopCloser": "Use io.NopCloser instead (Go 1.16+)",
			"ioutil.Discard":   "Use io.Discard instead (Go 1.16+)",
		}

		if x, ok := sel.X.(*ast.Ident); ok {
			fullName := x.Name + "." + sel.Sel.Name
			if suggestion, deprecated := deprecatedAPIs[fullName]; deprecated {
				s.addSuggestion(report, "Deprecated APIs", "warning", filename, line,
					"Using deprecated API: "+fullName,
					suggestion)
				report.HasDeprecatedAPIs = true
			}
		}
	}

	// Check for panic usage
	if ident, ok := call.Fun.(*ast.Ident); ok {
		if ident.Name == "panic" {
			s.addSuggestion(report, "Error Handling", "warning", filename, line,
				"Using panic() for error handling",
				"Consider returning errors instead of panicking")
		}
	}
}

// isErrorCheck checks if an if statement is an error check
func (s *StaticAnalyzer) isErrorCheck(ifStmt *ast.IfStmt) bool {
	if binExpr, ok := ifStmt.Cond.(*ast.BinaryExpr); ok {
		if binExpr.Op == token.NEQ {
			if ident, ok := binExpr.Y.(*ast.Ident); ok {
				if ident.Name == "nil" {
					if x, ok := binExpr.X.(*ast.Ident); ok {
						if strings.Contains(strings.ToLower(x.Name), "err") {
							return true
						}
					}
				}
			}
		}
	}
	return false
}

// addSuggestion adds a suggestion to the report
func (s *StaticAnalyzer) addSuggestion(report *StaticReport, category, severity, file string, line int, desc, suggestion string) {
	report.TotalIssues++
	report.CategoryBreakdown[category]++

	switch severity {
	case "error":
		report.ErrorIssues++
	case "warning":
		report.WarningIssues++
	case "info":
		report.InfoIssues++
	}

	// Limit suggestions to top 50
	if len(report.Suggestions) < 50 {
		report.Suggestions = append(report.Suggestions, StaticSuggestion{
			Category:    category,
			Severity:    severity,
			File:        file,
			Line:        line,
			Description: desc,
			Suggestion:  suggestion,
		})
	}
}

// calculateQualityScore calculates overall code quality score
func (s *StaticAnalyzer) calculateQualityScore(report *StaticReport) int {
	score := 100

	// Deduct points based on severity
	score -= report.ErrorIssues * 10
	score -= report.WarningIssues * 3
	score -= report.InfoIssues * 1

	// Extra penalties for specific issues
	if report.HasUnusedCode {
		score -= 5
	}
	if report.HasDeprecatedAPIs {
		score -= 10
	}
	if report.HasRaceConditions {
		score -= 15
	}

	// Ensure score is in valid range
	if score < 0 {
		score = 0
	}
	if score > 100 {
		score = 100
	}

	return score
}

// findGoFiles finds all Go files in the repository
func (s *StaticAnalyzer) findGoFiles() ([]string, error) {
	var goFiles []string

	err := filepath.Walk(s.repoPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}

		// Skip vendor, .git, and test files
		if strings.Contains(path, "/vendor/") ||
			strings.Contains(path, "/.git/") {
			if info.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}

		// Only Go files (excluding test files for cleaner analysis)
		if !info.IsDir() && strings.HasSuffix(path, ".go") && !strings.HasSuffix(path, "_test.go") {
			goFiles = append(goFiles, path)
		}

		return nil
	})

	return goFiles, err
}

// hasGoMod checks if go.mod exists
func (s *StaticAnalyzer) hasGoMod() bool {
	goModPath := filepath.Join(s.repoPath, "go.mod")
	_, err := os.Stat(goModPath)
	return err == nil
}
