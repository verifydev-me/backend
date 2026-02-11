package ast

import (
	"context"
	"os"
	"path/filepath"
	"strings"

	sitter "github.com/smacker/go-tree-sitter"
	"github.com/smacker/go-tree-sitter/python"

	"github.com/rs/zerolog/log"
)

// ============================================
// PYTHON AST ANALYZER
// Deep analysis of Python projects via tree-sitter
// ============================================

// PythonAnalyzer performs AST analysis on Python files
type PythonAnalyzer struct {
	parser   *sitter.Parser
	repoPath string
	maxFiles int
}

// NewPythonAnalyzer creates a new Python analyzer
func NewPythonAnalyzer(repoPath string) *PythonAnalyzer {
	parser := sitter.NewParser()
	parser.SetLanguage(python.GetLanguage())

	return &PythonAnalyzer{
		parser:   parser,
		repoPath: repoPath,
		maxFiles: 500,
	}
}

// AnalyzeProject scans all Python files in the project
func (a *PythonAnalyzer) AnalyzeProject() []*FileAnalysis {
	results := []*FileAnalysis{}
	fileCount := 0

	err := filepath.Walk(a.repoPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}

		if info.IsDir() {
			dirName := info.Name()
			skipDirs := []string{".git", "__pycache__", "node_modules", "venv", ".venv",
				"env", ".env", ".tox", ".eggs", "build", "dist", "site-packages"}
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

		if !strings.HasSuffix(path, ".py") {
			return nil
		}

		// Skip migration files
		if strings.Contains(path, "/migrations/") {
			return nil
		}

		// Skip files > 1MB
		if info.Size() > 1024*1024 {
			return nil
		}

		content, readErr := os.ReadFile(path)
		if readErr != nil {
			return nil
		}

		relPath, _ := filepath.Rel(a.repoPath, path)
		analysis := a.analyzeFile(relPath, content)
		if analysis != nil {
			results = append(results, analysis)
			fileCount++
		}

		return nil
	})

	if err != nil {
		log.Warn().Err(err).Msg("Error walking Python files")
	}

	return results
}

// analyzeFile performs AST analysis on a single Python file
func (a *PythonAnalyzer) analyzeFile(filePath string, content []byte) *FileAnalysis {
	tree, err := a.parser.ParseCtx(context.Background(), nil, content)
	if err != nil {
		log.Debug().Err(err).Str("file", filePath).Msg("Failed to parse Python file")
		return nil
	}
	defer tree.Close()

	analysis := &FileAnalysis{
		FilePath:      filePath,
		Language:      "python",
		Imports:       []ImportStatement{},
		Exports:       []ExportStatement{},
		FunctionCalls: []FunctionCall{},
		Definitions:   []Definition{},
		Patterns:      []CodePattern{},
		LineCount:     int(tree.RootNode().EndPoint().Row) + 1,
	}

	rootNode := tree.RootNode()
	a.traverseNode(rootNode, content, analysis)

	// Detect Python-specific patterns
	a.detectPythonPatterns(analysis)

	return analysis
}

// traverseNode walks the Python AST
func (a *PythonAnalyzer) traverseNode(node *sitter.Node, content []byte, analysis *FileAnalysis) {
	nodeType := node.Type()

	switch nodeType {
	case "import_statement":
		// import os, sys
		imp := a.extractPythonImport(node, content)
		if imp.Source != "" {
			analysis.Imports = append(analysis.Imports, imp)
		}

	case "import_from_statement":
		// from flask import Flask
		imp := a.extractPythonFromImport(node, content)
		if imp.Source != "" {
			analysis.Imports = append(analysis.Imports, imp)
		}

	case "call":
		call := a.extractPythonCall(node, content)
		if call.Name != "" || call.FullCall != "" {
			analysis.FunctionCalls = append(analysis.FunctionCalls, call)
		}

	case "function_definition":
		def := a.extractPythonFunction(node, content)
		if def.Name != "" {
			analysis.Definitions = append(analysis.Definitions, def)
			analysis.Complexity += a.calculatePythonComplexity(node)
		}

	case "class_definition":
		def := a.extractPythonClass(node, content)
		if def.Name != "" {
			analysis.Definitions = append(analysis.Definitions, def)
		}

	case "decorated_definition":
		// Handle decorators (@app.route, @login_required)
		a.extractDecoratorPattern(node, content, analysis)
	}

	// Recurse into children
	childCount := int(node.ChildCount())
	for i := 0; i < childCount; i++ {
		child := node.Child(i)
		if child != nil {
			a.traverseNode(child, content, analysis)
		}
	}
}

// extractPythonImport handles: import os, import json
func (a *PythonAnalyzer) extractPythonImport(node *sitter.Node, content []byte) ImportStatement {
	imp := ImportStatement{
		Names:     []string{},
		IsDefault: true,
		Line:      int(node.StartPoint().Row) + 1,
	}

	childCount := int(node.ChildCount())
	for i := 0; i < childCount; i++ {
		child := node.Child(i)
		if child == nil {
			continue
		}

		if child.Type() == "dotted_name" {
			name := child.Content(content)
			imp.Source = name
			imp.Names = append(imp.Names, name)
		} else if child.Type() == "aliased_import" {
			nameNode := child.ChildByFieldName("name")
			if nameNode != nil {
				name := nameNode.Content(content)
				imp.Source = name
				imp.Names = append(imp.Names, name)
			}
		}
	}

	return imp
}

// extractPythonFromImport handles: from flask import Flask, request
func (a *PythonAnalyzer) extractPythonFromImport(node *sitter.Node, content []byte) ImportStatement {
	imp := ImportStatement{
		Names: []string{},
		Line:  int(node.StartPoint().Row) + 1,
	}

	// Find module name and imported names
	childCount := int(node.ChildCount())
	foundFrom := false

	for i := 0; i < childCount; i++ {
		child := node.Child(i)
		if child == nil {
			continue
		}

		switch child.Type() {
		case "from":
			foundFrom = true

		case "dotted_name":
			if foundFrom && imp.Source == "" {
				imp.Source = child.Content(content)
			} else {
				imp.Names = append(imp.Names, child.Content(content))
			}

		case "import":
			foundFrom = false

		case "aliased_import":
			nameNode := child.ChildByFieldName("name")
			if nameNode != nil {
				imp.Names = append(imp.Names, nameNode.Content(content))
			}

		case "identifier":
			if !foundFrom {
				imp.Names = append(imp.Names, child.Content(content))
			}

		case "wildcard_import":
			imp.Names = append(imp.Names, "*")
		}
	}

	return imp
}

// extractPythonCall extracts function call information
func (a *PythonAnalyzer) extractPythonCall(node *sitter.Node, content []byte) FunctionCall {
	call := FunctionCall{
		Line: int(node.StartPoint().Row) + 1,
	}

	funcNode := node.ChildByFieldName("function")
	if funcNode == nil {
		return call
	}

	switch funcNode.Type() {
	case "identifier":
		call.Name = funcNode.Content(content)
		call.FullCall = call.Name

	case "attribute":
		// obj.method()
		objNode := funcNode.ChildByFieldName("object")
		attrNode := funcNode.ChildByFieldName("attribute")
		if objNode != nil && attrNode != nil {
			call.Receiver = objNode.Content(content)
			call.Name = attrNode.Content(content)
			call.FullCall = call.Receiver + "." + call.Name
		}
	}

	// Count arguments
	argsNode := node.ChildByFieldName("arguments")
	if argsNode != nil {
		argCount := 0
		for i := 0; i < int(argsNode.ChildCount()); i++ {
			child := argsNode.Child(i)
			if child != nil && child.Type() != "," && child.Type() != "(" && child.Type() != ")" {
				argCount++
			}
		}
		call.ArgumentCount = argCount
	}

	return call
}

// extractPythonFunction extracts function definitions
func (a *PythonAnalyzer) extractPythonFunction(node *sitter.Node, content []byte) Definition {
	def := Definition{
		Type:    "function",
		Line:    int(node.StartPoint().Row) + 1,
		EndLine: int(node.EndPoint().Row) + 1,
	}

	nameNode := node.ChildByFieldName("name")
	if nameNode != nil {
		def.Name = nameNode.Content(content)
	}

	// Python uses _ prefix convention for private
	if !strings.HasPrefix(def.Name, "_") {
		def.IsExported = true
	}

	// Extract parameters
	paramsNode := node.ChildByFieldName("parameters")
	if paramsNode != nil {
		for i := 0; i < int(paramsNode.ChildCount()); i++ {
			child := paramsNode.Child(i)
			if child == nil {
				continue
			}
			if child.Type() == "identifier" {
				name := child.Content(content)
				if name != "self" && name != "cls" {
					def.Params = append(def.Params, name)
				}
			} else if child.Type() == "typed_parameter" || child.Type() == "default_parameter" {
				pNameNode := child.ChildByFieldName("name")
				if pNameNode != nil {
					name := pNameNode.Content(content)
					if name != "self" && name != "cls" {
						def.Params = append(def.Params, name)
					}
				}
			}
		}
	}

	// Check for async
	// Check parent or preceding sibling for 'async' keyword
	parent := node.Parent()
	if parent != nil {
		parentContent := parent.Content(content)
		if strings.HasPrefix(parentContent, "async ") {
			def.Type = "async_function"
		}
	}

	return def
}

// extractPythonClass extracts class definitions
func (a *PythonAnalyzer) extractPythonClass(node *sitter.Node, content []byte) Definition {
	def := Definition{
		Type:    "class",
		Line:    int(node.StartPoint().Row) + 1,
		EndLine: int(node.EndPoint().Row) + 1,
	}

	nameNode := node.ChildByFieldName("name")
	if nameNode != nil {
		def.Name = nameNode.Content(content)
	}

	if !strings.HasPrefix(def.Name, "_") {
		def.IsExported = true
	}

	return def
}

// extractDecoratorPattern detects decorator patterns like @app.route
func (a *PythonAnalyzer) extractDecoratorPattern(node *sitter.Node, content []byte, analysis *FileAnalysis) {
	childCount := int(node.ChildCount())
	for i := 0; i < childCount; i++ {
		child := node.Child(i)
		if child == nil || child.Type() != "decorator" {
			continue
		}

		decoratorContent := child.Content(content)

		// Flask/FastAPI route patterns
		if strings.Contains(decoratorContent, "app.route") ||
			strings.Contains(decoratorContent, "app.get") ||
			strings.Contains(decoratorContent, "app.post") ||
			strings.Contains(decoratorContent, "app.put") ||
			strings.Contains(decoratorContent, "app.delete") ||
			strings.Contains(decoratorContent, "router.get") ||
			strings.Contains(decoratorContent, "router.post") {

			analysis.Patterns = append(analysis.Patterns, CodePattern{
				Type:       "python_route",
				Name:       decoratorContent,
				Confidence: 0.93,
				Evidence:   "Route decorator detected: " + decoratorContent,
				Line:       int(child.StartPoint().Row) + 1,
			})
		}

		// Django patterns
		if strings.Contains(decoratorContent, "login_required") ||
			strings.Contains(decoratorContent, "permission_required") {
			analysis.Patterns = append(analysis.Patterns, CodePattern{
				Type:       "django_auth",
				Name:       decoratorContent,
				Confidence: 0.92,
				Evidence:   "Django auth decorator: " + decoratorContent,
				Line:       int(child.StartPoint().Row) + 1,
			})
		}

		// API decorators
		if strings.Contains(decoratorContent, "api_view") ||
			strings.Contains(decoratorContent, "action") {
			analysis.Patterns = append(analysis.Patterns, CodePattern{
				Type:       "drf_view",
				Name:       decoratorContent,
				Confidence: 0.91,
				Evidence:   "DRF API view decorator: " + decoratorContent,
				Line:       int(child.StartPoint().Row) + 1,
			})
		}
	}
}

// calculatePythonComplexity calculates cyclomatic complexity for Python functions
func (a *PythonAnalyzer) calculatePythonComplexity(node *sitter.Node) int {
	complexity := 1
	a.walkPythonForComplexity(node, &complexity)
	return complexity
}

func (a *PythonAnalyzer) walkPythonForComplexity(node *sitter.Node, complexity *int) {
	nodeType := node.Type()

	switch nodeType {
	case "if_statement", "elif_clause":
		*complexity++
	case "for_statement", "while_statement":
		*complexity++
	case "except_clause":
		*complexity++
	case "with_statement":
		// with statements add implicit try/except
		*complexity++
	case "conditional_expression":
		// Ternary: x if condition else y
		*complexity++
	case "boolean_operator":
		*complexity++
	case "list_comprehension", "set_comprehension", "dictionary_comprehension":
		*complexity++
	}

	childCount := int(node.ChildCount())
	for i := 0; i < childCount; i++ {
		child := node.Child(i)
		if child != nil {
			a.walkPythonForComplexity(child, complexity)
		}
	}
}

// detectPythonPatterns detects Python-specific patterns from collected data
func (a *PythonAnalyzer) detectPythonPatterns(analysis *FileAnalysis) {
	// Detect Django class-based views
	for _, def := range analysis.Definitions {
		if def.Type == "class" {
			lower := strings.ToLower(def.Name)
			if strings.HasSuffix(lower, "view") || strings.HasSuffix(lower, "viewset") ||
				strings.HasSuffix(lower, "serializer") || strings.HasSuffix(lower, "model") {
				analysis.Patterns = append(analysis.Patterns, CodePattern{
					Type:       "django_class",
					Name:       def.Name,
					Confidence: 0.88,
					Evidence:   "Django-style class: " + def.Name,
					Line:       def.Line,
				})
			}
		}
	}

	// Detect async patterns
	for _, def := range analysis.Definitions {
		if def.Type == "async_function" {
			analysis.Patterns = append(analysis.Patterns, CodePattern{
				Type:       "python_async",
				Name:       def.Name,
				Confidence: 0.90,
				Evidence:   "Async function: " + def.Name,
				Line:       def.Line,
			})
		}
	}

	// Detect test patterns
	for _, def := range analysis.Definitions {
		if strings.HasPrefix(def.Name, "test_") || strings.HasPrefix(def.Name, "Test") {
			analysis.Patterns = append(analysis.Patterns, CodePattern{
				Type:       "python_test",
				Name:       def.Name,
				Confidence: 0.95,
				Evidence:   "Python test function/class: " + def.Name,
				Line:       def.Line,
			})
		}
	}

	// Detect ML/AI patterns from imports
	for _, imp := range analysis.Imports {
		if _, exists := PythonImportSignals[imp.Source]; exists {
			tech := PythonImportSignals[imp.Source]
			if tech == "TensorFlow" || tech == "PyTorch" || tech == "Scikit-learn" ||
				tech == "Pandas" || tech == "NumPy" || tech == "Keras" ||
				tech == "Hugging Face" || tech == "OpenAI" || tech == "LangChain" {
				analysis.Patterns = append(analysis.Patterns, CodePattern{
					Type:       "ml_ai",
					Name:       tech,
					Confidence: 0.94,
					Evidence:   "ML/AI library imported: " + imp.Source,
					Line:       imp.Line,
				})
			}
		}
	}
}
