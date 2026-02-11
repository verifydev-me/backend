package ast

import (
	"fmt"
	goast "go/ast"
	goparser "go/parser"
	"go/token"
	"os"
	"path/filepath"
	"strings"

	"github.com/rs/zerolog/log"
)

// ============================================
// ENHANCED GO AST ANALYZER
// Now tracks imports, function calls, and patterns
// ============================================

// GoASTAnalyzer performs deep analysis on Go source files
type GoASTAnalyzer struct {
	repoPath string
	fset     *token.FileSet
	maxFiles int
}

// NewGoASTAnalyzer creates a new Go AST analyzer
func NewGoASTAnalyzer(repoPath string) *GoASTAnalyzer {
	return &GoASTAnalyzer{
		repoPath: repoPath,
		fset:     token.NewFileSet(),
		maxFiles: 500,
	}
}

// AnalyzeProject scans all Go files in the repository
func (a *GoASTAnalyzer) AnalyzeProject() []*FileAnalysis {
	results := []*FileAnalysis{}
	fileCount := 0

	err := filepath.Walk(a.repoPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}

		// Skip dirs
		if info.IsDir() {
			dirName := info.Name()
			skipDirs := []string{".git", "vendor", "node_modules", ".cache", "testdata"}
			for _, skip := range skipDirs {
				if dirName == skip {
					return filepath.SkipDir
				}
			}
			return nil
		}

		if fileCount >= a.maxFiles {
			return filepath.SkipAll
		}

		// Only Go files (include test files for coverage metrics)
		if !strings.HasSuffix(path, ".go") {
			return nil
		}

		// Skip files > 1MB
		if info.Size() > 1024*1024 {
			return nil
		}

		relPath, _ := filepath.Rel(a.repoPath, path)
		analysis := a.analyzeFile(path, relPath)
		if analysis != nil {
			results = append(results, analysis)
			fileCount++
		}

		return nil
	})

	if err != nil {
		log.Warn().Err(err).Msg("Error walking Go files")
	}

	return results
}

// analyzeFile parses and analyzes a single Go file
func (a *GoASTAnalyzer) analyzeFile(absPath, relPath string) *FileAnalysis {
	// Parse the file with comments
	node, err := goparser.ParseFile(a.fset, absPath, nil, goparser.ParseComments)
	if err != nil {
		log.Debug().Err(err).Str("file", relPath).Msg("Failed to parse Go file")
		return nil
	}

	analysis := &FileAnalysis{
		FilePath:      relPath,
		Language:      "go",
		Imports:       []ImportStatement{},
		Exports:       []ExportStatement{},
		FunctionCalls: []FunctionCall{},
		Definitions:   []Definition{},
		Patterns:      []CodePattern{},
	}

	// Count lines
	file := a.fset.File(node.Pos())
	if file != nil {
		analysis.LineCount = file.LineCount()
	}

	// Extract imports with full fidelity
	a.extractGoImports(node, analysis)

	// Walk the AST for everything else
	goast.Inspect(node, func(n goast.Node) bool {
		if n == nil {
			return false
		}

		switch x := n.(type) {
		case *goast.FuncDecl:
			a.analyzeGoFunction(x, analysis)

		case *goast.CallExpr:
			a.extractGoFunctionCall(x, analysis)

		case *goast.GoStmt:
			a.detectGoPattern(x, analysis)

		case *goast.InterfaceType:
			analysis.Patterns = append(analysis.Patterns, CodePattern{
				Type:       "go_interface",
				Name:       "interface",
				Confidence: 0.90,
				Evidence:   "Interface type declaration",
			})
		}

		return true
	})

	return analysis
}

// extractGoImports extracts all import statements from Go file
func (a *GoASTAnalyzer) extractGoImports(node *goast.File, analysis *FileAnalysis) {
	for _, imp := range node.Imports {
		importPath := strings.Trim(imp.Path.Value, `"`)

		// Determine imported name
		names := []string{}
		isDefault := false

		if imp.Name != nil {
			// Named import: import foo "github.com/bar/baz"
			names = append(names, imp.Name.Name)
			if imp.Name.Name == "." {
				isDefault = true
			}
		} else {
			// Extract the last segment as the default name
			parts := strings.Split(importPath, "/")
			if len(parts) > 0 {
				names = append(names, parts[len(parts)-1])
			}
		}

		line := 0
		pos := a.fset.Position(imp.Pos())
		line = pos.Line

		analysis.Imports = append(analysis.Imports, ImportStatement{
			Names:     names,
			Source:    importPath,
			IsDefault: isDefault,
			Line:      line,
		})
	}
}

// analyzeGoFunction analyzes a Go function declaration
func (a *GoASTAnalyzer) analyzeGoFunction(fn *goast.FuncDecl, analysis *FileAnalysis) {
	def := Definition{
		Name: fn.Name.Name,
		Type: "function",
	}

	// Method vs function
	if fn.Recv != nil {
		def.Type = "method"
	}

	// Is exported (PascalCase)
	if fn.Name.IsExported() {
		def.IsExported = true
		analysis.Exports = append(analysis.Exports, ExportStatement{
			Name: fn.Name.Name,
			Type: def.Type,
		})
	}

	// Extract parameters
	if fn.Type.Params != nil {
		for _, field := range fn.Type.Params.List {
			for _, name := range field.Names {
				def.Params = append(def.Params, name.Name)
			}
		}
	}

	// Line info
	pos := a.fset.Position(fn.Pos())
	def.Line = pos.Line
	if fn.Body != nil {
		endPos := a.fset.Position(fn.Body.End())
		def.EndLine = endPos.Line
	}

	analysis.Definitions = append(analysis.Definitions, def)

	// Calculate complexity
	complexity := a.calculateGoComplexity(fn)
	analysis.Complexity += complexity

	// Detect error handling patterns
	a.detectErrorHandling(fn, analysis)
}

// extractGoFunctionCall extracts function call information
func (a *GoASTAnalyzer) extractGoFunctionCall(call *goast.CallExpr, analysis *FileAnalysis) {
	fc := FunctionCall{}

	pos := a.fset.Position(call.Pos())
	fc.Line = pos.Line
	fc.ArgumentCount = len(call.Args)

	switch fn := call.Fun.(type) {
	case *goast.Ident:
		// Simple call: fmt.Println, make, len
		fc.Name = fn.Name
		fc.FullCall = fn.Name

	case *goast.SelectorExpr:
		// Method/package call: http.ListenAndServe, gin.Default
		if x, ok := fn.X.(*goast.Ident); ok {
			fc.Receiver = x.Name
			fc.Name = fn.Sel.Name
			fc.FullCall = x.Name + "." + fn.Sel.Name
		}
	}

	if fc.Name != "" {
		analysis.FunctionCalls = append(analysis.FunctionCalls, fc)
	}
}

// calculateGoComplexity calculates cyclomatic complexity for a Go function
func (a *GoASTAnalyzer) calculateGoComplexity(fn *goast.FuncDecl) int {
	complexity := 1

	goast.Inspect(fn, func(n goast.Node) bool {
		switch x := n.(type) {
		case *goast.IfStmt:
			complexity++
		case *goast.ForStmt, *goast.RangeStmt:
			complexity++
		case *goast.CaseClause:
			if x.List != nil { // exclude default case
				complexity++
			}
		case *goast.CommClause:
			complexity++
		case *goast.BinaryExpr:
			if x.Op == token.LAND || x.Op == token.LOR {
				complexity++
			}
		}
		return true
	})

	return complexity
}

// detectGoPattern detects Go-specific patterns
func (a *GoASTAnalyzer) detectGoPattern(goStmt *goast.GoStmt, analysis *FileAnalysis) {
	// Goroutine detected
	hasContext := false
	hasChannel := false

	goast.Inspect(goStmt, func(n goast.Node) bool {
		if ident, ok := n.(*goast.Ident); ok {
			lower := strings.ToLower(ident.Name)
			if strings.Contains(lower, "ctx") || strings.Contains(lower, "context") {
				hasContext = true
			}
			if strings.Contains(lower, "chan") {
				hasChannel = true
			}
		}
		return true
	})

	patternName := "goroutine"
	confidence := 0.85
	evidence := "Goroutine usage detected"

	if hasContext {
		patternName = "goroutine_with_context"
		confidence = 0.92
		evidence = "Goroutine with context cancellation (production pattern)"
	} else if hasChannel {
		patternName = "goroutine_with_channel"
		confidence = 0.90
		evidence = "Goroutine with channel synchronization"
	} else {
		evidence = "Goroutine without explicit sync (potential leak)"
		confidence = 0.75
	}

	pos := a.fset.Position(goStmt.Pos())
	analysis.Patterns = append(analysis.Patterns, CodePattern{
		Type:       patternName,
		Name:       "go func()",
		Confidence: confidence,
		Evidence:   evidence,
		Line:       pos.Line,
	})
}

// detectErrorHandling tracks error handling patterns in Go code
func (a *GoASTAnalyzer) detectErrorHandling(fn *goast.FuncDecl, analysis *FileAnalysis) {
	// Check if function returns error
	returnsError := false
	if fn.Type.Results != nil {
		for _, field := range fn.Type.Results.List {
			if ident, ok := field.Type.(*goast.Ident); ok {
				if ident.Name == "error" {
					returnsError = true
				}
			}
		}
	}

	// Count error checks inside function
	errorChecks := 0
	ignoredErrors := 0

	goast.Inspect(fn, func(n goast.Node) bool {
		// Check for if err != nil
		if ifStmt, ok := n.(*goast.IfStmt); ok {
			if binExpr, ok := ifStmt.Cond.(*goast.BinaryExpr); ok {
				if binExpr.Op == token.NEQ {
					if ident, ok := binExpr.X.(*goast.Ident); ok {
						if strings.Contains(strings.ToLower(ident.Name), "err") {
							errorChecks++
						}
					}
				}
			}
		}

		// Check for ignored errors (_ = )
		if assign, ok := n.(*goast.AssignStmt); ok {
			for _, lhs := range assign.Lhs {
				if ident, ok := lhs.(*goast.Ident); ok {
					if ident.Name == "_" {
						ignoredErrors++
					}
				}
			}
		}

		return true
	})

	// Generate pattern based on error handling quality
	if returnsError || errorChecks > 0 {
		ratio := 0.0
		if returnsError && errorChecks > 0 {
			ratio = 1.0
		}

		confidence := 0.80
		evidence := "Basic error handling"

		if errorChecks > 3 && ignoredErrors == 0 {
			confidence = 0.95
			evidence = fmt.Sprintf("Thorough error handling: %d checks, 0 ignored", errorChecks)
		} else if ignoredErrors > 0 {
			confidence = 0.60
			evidence = fmt.Sprintf("Error handling present but %d errors ignored", ignoredErrors)
		}

		_ = ratio // used for future scoring

		analysis.Patterns = append(analysis.Patterns, CodePattern{
			Type:       "go_error_handling",
			Name:       fn.Name.Name,
			Confidence: confidence,
			Evidence:   evidence,
		})
	}
}
