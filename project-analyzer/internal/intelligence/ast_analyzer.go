package intelligence

import (
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"strings"

	"github.com/rs/zerolog/log"
)

// ============================================
// AST ANALYZER - Semantic Code Understanding
// ============================================

// ASTAnalyzer performs semantic analysis on Go code
type ASTAnalyzer struct {
	repoPath string
	fileSet  *token.FileSet
}

// ASTReport contains the results of AST analysis
type ASTReport struct {
	TotalFiles        int                 `json:"totalFiles"`
	TotalFunctions    int                 `json:"totalFunctions"`
	TotalMethods      int                 `json:"totalMethods"`
	TotalInterfaces   int                 `json:"totalInterfaces"`
	Complexity        ComplexityMetrics   `json:"complexity"`
	GoroutinePatterns GoroutineAnalysis   `json:"goroutinePatterns"`
	ErrorHandling     ErrorHandlingScore  `json:"errorHandling"`
	TypeSafety        TypeSafetyScore     `json:"typeSafety"`
	CodeOrganization  OrganizationMetrics `json:"codeOrganization"`
}

// ComplexityMetrics tracks code complexity
type ComplexityMetrics struct {
	Average      float64        `json:"average"`
	Max          int            `json:"max"`
	Total        int            `json:"total"`
	Distribution map[string]int `json:"distribution"` // simple, moderate, complex, high
	ByFunction   map[string]int `json:"-"`            // function name -> complexity
}

// GoroutineAnalysis tracks concurrency patterns
type GoroutineAnalysis struct {
	Total          int      `json:"total"`
	WithContext    int      `json:"withContext"`
	WithChannels   int      `json:"withChannels"`
	WithMutex      int      `json:"withMutex"`
	HasProperSync  bool     `json:"hasProperSync"`
	PotentialLeaks int      `json:"potentialLeaks"`
	LeakReasons    []string `json:"leakReasons,omitempty"`
}

// ErrorHandlingScore measures error handling quality
type ErrorHandlingScore struct {
	Score              int     `json:"score"` // 0-100
	TotalErrorChecks   int     `json:"totalErrorChecks"`
	IgnoredErrors      int     `json:"ignoredErrors"`
	PanicCalls         int     `json:"panicCalls"`
	ErrorReturns       int     `json:"errorReturns"`
	ErrorHandlingRatio float64 `json:"errorHandlingRatio"`
}

// TypeSafetyScore measures type safety practices
type TypeSafetyScore struct {
	Score          int `json:"score"` // 0-100
	InterfaceUsage int `json:"interfaceUsage"`
	TypeAssertions int `json:"typeAssertions"`
	UnsafeUsage    int `json:"unsafeUsage"`
	ReflectUsage   int `json:"reflectUsage"`
}

// OrganizationMetrics tracks code organization
type OrganizationMetrics struct {
	PackageCount    int     `json:"packageCount"`
	AvgFuncPerFile  float64 `json:"avgFuncPerFile"`
	AvgLinesPerFunc float64 `json:"avgLinesPerFunc"`
	LongFunctions   int     `json:"longFunctions"`  // > 50 lines
	SmallFunctions  int     `json:"smallFunctions"` // < 10 lines
}

// NewASTAnalyzer creates a new AST analyzer
func NewASTAnalyzer(repoPath string) *ASTAnalyzer {
	return &ASTAnalyzer{
		repoPath: repoPath,
		fileSet:  token.NewFileSet(),
	}
}

// Analyze performs complete AST analysis on the repository
func (a *ASTAnalyzer) Analyze() (*ASTReport, error) {
	log.Info().Str("path", a.repoPath).Msg("Starting AST analysis")

	report := &ASTReport{
		Complexity: ComplexityMetrics{
			Distribution: make(map[string]int),
			ByFunction:   make(map[string]int),
		},
	}

	// Find all Go files
	goFiles, err := a.findGoFiles()
	if err != nil {
		return nil, fmt.Errorf("failed to find Go files: %w", err)
	}

	if len(goFiles) == 0 {
		log.Warn().Msg("No Go files found for AST analysis")
		return report, nil
	}

	report.TotalFiles = len(goFiles)

	// Analyze each file
	for _, filePath := range goFiles {
		if err := a.analyzeFile(filePath, report); err != nil {
			log.Warn().Err(err).Str("file", filePath).Msg("Failed to analyze file")
			continue
		}
	}

	// Calculate final metrics
	a.calculateFinalMetrics(report)

	log.Info().
		Int("files", report.TotalFiles).
		Int("functions", report.TotalFunctions).
		Float64("avgComplexity", report.Complexity.Average).
		Msg("AST analysis completed")

	return report, nil
}

// analyzeFile analyzes a single Go file
func (a *ASTAnalyzer) analyzeFile(filePath string, report *ASTReport) error {
	// Parse the file
	node, err := parser.ParseFile(a.fileSet, filePath, nil, parser.ParseComments)
	if err != nil {
		return fmt.Errorf("parse error: %w", err)
	}

	// Track packages
	if node.Name != nil {
		report.CodeOrganization.PackageCount++
	}

	// Walk the AST
	ast.Inspect(node, func(n ast.Node) bool {
		switch x := n.(type) {
		case *ast.FuncDecl:
			a.analyzeFunction(x, report)
		case *ast.InterfaceType:
			report.TotalInterfaces++
			report.TypeSafety.InterfaceUsage++
		case *ast.TypeAssertExpr:
			report.TypeSafety.TypeAssertions++
		case *ast.GoStmt:
			a.analyzeGoroutine(x, report)
		case *ast.CallExpr:
			a.analyzeCallExpr(x, report)
		}
		return true
	})

	return nil
}

// analyzeFunction analyzes a function declaration
func (a *ASTAnalyzer) analyzeFunction(fn *ast.FuncDecl, report *ASTReport) {
	if fn.Recv != nil {
		report.TotalMethods++
	} else {
		report.TotalFunctions++
	}

	// Calculate cyclomatic complexity
	complexity := a.calculateComplexity(fn)
	report.Complexity.Total += complexity

	funcName := fn.Name.Name
	if fn.Recv != nil {
		funcName = "method_" + funcName
	}
	report.Complexity.ByFunction[funcName] = complexity

	// Classify complexity
	switch {
	case complexity <= 5:
		report.Complexity.Distribution["simple"]++
	case complexity <= 10:
		report.Complexity.Distribution["moderate"]++
	case complexity <= 20:
		report.Complexity.Distribution["complex"]++
	default:
		report.Complexity.Distribution["high"]++
	}

	// Check function length
	if fn.Body != nil {
		start := a.fileSet.Position(fn.Body.Lbrace).Line
		end := a.fileSet.Position(fn.Body.Rbrace).Line
		lines := end - start

		if lines > 50 {
			report.CodeOrganization.LongFunctions++
		} else if lines < 10 {
			report.CodeOrganization.SmallFunctions++
		}
	}

	// Analyze error handling
	a.analyzeErrorHandlingInFunc(fn, report)
}

// calculateComplexity calculates cyclomatic complexity of a function
func (a *ASTAnalyzer) calculateComplexity(fn *ast.FuncDecl) int {
	complexity := 1 // Base complexity

	ast.Inspect(fn, func(n ast.Node) bool {
		switch n.(type) {
		case *ast.IfStmt:
			complexity++
		case *ast.ForStmt, *ast.RangeStmt:
			complexity++
		case *ast.CaseClause:
			complexity++
		case *ast.CommClause:
			complexity++
		case *ast.BinaryExpr:
			// Count logical operators (&&, ||)
			if binExpr, ok := n.(*ast.BinaryExpr); ok {
				if binExpr.Op == token.LAND || binExpr.Op == token.LOR {
					complexity++
				}
			}
		}
		return true
	})

	return complexity
}

// analyzeGoroutine analyzes goroutine usage
func (a *ASTAnalyzer) analyzeGoroutine(goStmt *ast.GoStmt, report *ASTReport) {
	report.GoroutinePatterns.Total++

	// Check if goroutine uses context
	hasContext := false
	hasChannel := false
	hasMutex := false

	ast.Inspect(goStmt, func(n ast.Node) bool {
		if ident, ok := n.(*ast.Ident); ok {
			name := strings.ToLower(ident.Name)
			if strings.Contains(name, "context") || strings.Contains(name, "ctx") {
				hasContext = true
			}
			if strings.Contains(name, "chan") || strings.Contains(name, "channel") {
				hasChannel = true
			}
			if strings.Contains(name, "mutex") || strings.Contains(name, "lock") {
				hasMutex = true
			}
		}
		return true
	})

	if hasContext {
		report.GoroutinePatterns.WithContext++
	}
	if hasChannel {
		report.GoroutinePatterns.WithChannels++
	}
	if hasMutex {
		report.GoroutinePatterns.WithMutex++
	}

	// Potential leak detection (heuristic)
	if !hasContext && !hasChannel {
		report.GoroutinePatterns.PotentialLeaks++
		report.GoroutinePatterns.LeakReasons = append(
			report.GoroutinePatterns.LeakReasons,
			"Goroutine without context or channel for cancellation",
		)
	}
}

// analyzeCallExpr analyzes function calls
func (a *ASTAnalyzer) analyzeCallExpr(call *ast.CallExpr, report *ASTReport) {
	if ident, ok := call.Fun.(*ast.Ident); ok {
		switch ident.Name {
		case "panic", "recover":
			report.ErrorHandling.PanicCalls++
		}
	}

	// Check for unsafe usage
	if sel, ok := call.Fun.(*ast.SelectorExpr); ok {
		if x, ok := sel.X.(*ast.Ident); ok {
			if x.Name == "unsafe" {
				report.TypeSafety.UnsafeUsage++
			}
			if x.Name == "reflect" {
				report.TypeSafety.ReflectUsage++
			}
		}
	}
}

// analyzeErrorHandlingInFunc analyzes error handling patterns
func (a *ASTAnalyzer) analyzeErrorHandlingInFunc(fn *ast.FuncDecl, report *ASTReport) {
	// Check if function returns error
	if fn.Type.Results != nil {
		for _, field := range fn.Type.Results.List {
			if ident, ok := field.Type.(*ast.Ident); ok {
				if ident.Name == "error" {
					report.ErrorHandling.ErrorReturns++
				}
			}
		}
	}

	// Count error checks (if err != nil)
	ast.Inspect(fn, func(n ast.Node) bool {
		if ifStmt, ok := n.(*ast.IfStmt); ok {
			if a.isErrorCheck(ifStmt) {
				report.ErrorHandling.TotalErrorChecks++
			}
		}

		// Check for ignored errors (_ = )
		if assign, ok := n.(*ast.AssignStmt); ok {
			for _, lhs := range assign.Lhs {
				if ident, ok := lhs.(*ast.Ident); ok {
					if ident.Name == "_" {
						report.ErrorHandling.IgnoredErrors++
					}
				}
			}
		}

		return true
	})
}

// isErrorCheck checks if an if statement is an error check
func (a *ASTAnalyzer) isErrorCheck(ifStmt *ast.IfStmt) bool {
	if binExpr, ok := ifStmt.Cond.(*ast.BinaryExpr); ok {
		if binExpr.Op == token.NEQ {
			// Check if comparing to nil
			if ident, ok := binExpr.Y.(*ast.Ident); ok {
				if ident.Name == "nil" {
					// Check if left side contains "err"
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

// calculateFinalMetrics calculates aggregate metrics
func (a *ASTAnalyzer) calculateFinalMetrics(report *ASTReport) {
	// Average complexity
	totalFuncs := report.TotalFunctions + report.TotalMethods
	if totalFuncs > 0 {
		report.Complexity.Average = float64(report.Complexity.Total) / float64(totalFuncs)
		report.CodeOrganization.AvgFuncPerFile = float64(totalFuncs) / float64(report.TotalFiles)
	}

	// Find max complexity
	for _, complexity := range report.Complexity.ByFunction {
		if complexity > report.Complexity.Max {
			report.Complexity.Max = complexity
		}
	}

	// Error handling score
	if report.ErrorHandling.ErrorReturns > 0 {
		ratio := float64(report.ErrorHandling.TotalErrorChecks) / float64(report.ErrorHandling.ErrorReturns)
		report.ErrorHandling.ErrorHandlingRatio = ratio

		score := 100
		// Penalize for ignored errors
		score -= report.ErrorHandling.IgnoredErrors * 5
		// Penalize for panic usage
		score -= report.ErrorHandling.PanicCalls * 10
		// Reward for error checks
		if ratio > 0.8 {
			score += 10
		}

		if score < 0 {
			score = 0
		}
		if score > 100 {
			score = 100
		}
		report.ErrorHandling.Score = score
	}

	// Type safety score
	score := 100
	score -= report.TypeSafety.UnsafeUsage * 15
	score -= report.TypeSafety.TypeAssertions * 2

	// Reward interface usage (cap at 20)
	interfaceBonus := report.TypeSafety.InterfaceUsage * 5
	if interfaceBonus > 20 {
		interfaceBonus = 20
	}
	score += interfaceBonus

	if score < 0 {
		score = 0
	}

	if score > 100 {
		score = 100
	}
	report.TypeSafety.Score = score

	// Goroutine synchronization check
	if report.GoroutinePatterns.Total > 0 {
		syncCount := report.GoroutinePatterns.WithContext +
			report.GoroutinePatterns.WithChannels +
			report.GoroutinePatterns.WithMutex

		if float64(syncCount)/float64(report.GoroutinePatterns.Total) > 0.7 {
			report.GoroutinePatterns.HasProperSync = true
		}
	}
}

// findGoFiles finds all Go files in the repository
func (a *ASTAnalyzer) findGoFiles() ([]string, error) {
	var goFiles []string

	err := filepath.Walk(a.repoPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Skip vendor and test files
		if strings.Contains(path, "/vendor/") || strings.Contains(path, "/.git/") {
			if info.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}

		// Only include Go files (excluding test files for cleaner analysis)
		if !info.IsDir() && strings.HasSuffix(path, ".go") && !strings.HasSuffix(path, "_test.go") {
			goFiles = append(goFiles, path)
		}

		return nil
	})

	return goFiles, err
}
