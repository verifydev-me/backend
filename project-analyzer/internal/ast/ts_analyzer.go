package ast

import (
	"context"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	sitter "github.com/smacker/go-tree-sitter"
	"github.com/smacker/go-tree-sitter/javascript"
	"github.com/smacker/go-tree-sitter/typescript/tsx"
	"github.com/smacker/go-tree-sitter/typescript/typescript"

	"github.com/rs/zerolog/log"
)

// ============================================
// TYPESCRIPT / JAVASCRIPT AST ANALYZER
// Deep code understanding via tree-sitter
// ============================================

// TSAnalyzer performs deep AST analysis on TypeScript/JavaScript files
type TSAnalyzer struct {
	tsParser  *sitter.Parser
	tsxParser *sitter.Parser
	jsParser  *sitter.Parser
	repoPath  string
	maxFiles  int
}

// NewTSAnalyzer creates a new TypeScript/JavaScript analyzer
func NewTSAnalyzer(repoPath string) *TSAnalyzer {
	tsParser := sitter.NewParser()
	tsParser.SetLanguage(typescript.GetLanguage())

	tsxParser := sitter.NewParser()
	tsxParser.SetLanguage(tsx.GetLanguage())

	jsParser := sitter.NewParser()
	jsParser.SetLanguage(javascript.GetLanguage())

	return &TSAnalyzer{
		tsParser:  tsParser,
		tsxParser: tsxParser,
		jsParser:  jsParser,
		repoPath:  repoPath,
		maxFiles:  500, // Performance limit
	}
}

// AnalyzeProject scans all TS/JS files in the project
func (a *TSAnalyzer) AnalyzeProject() []*FileAnalysis {
	results := []*FileAnalysis{}
	fileCount := 0

	err := filepath.Walk(a.repoPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}

		// Skip directories we don't care about
		if info.IsDir() {
			dirName := info.Name()
			skipDirs := []string{"node_modules", ".git", "dist", "build", ".next", "coverage",
				"vendor", "__pycache__", ".cache", ".turbo", "out"}
			for _, skip := range skipDirs {
				if dirName == skip {
					return filepath.SkipDir
				}
			}
			return nil
		}

		// Performance limit
		if fileCount >= a.maxFiles {
			return filepath.SkipAll
		}

		// Only process TS/JS files
		ext := strings.ToLower(filepath.Ext(path))
		if ext != ".ts" && ext != ".tsx" && ext != ".js" && ext != ".jsx" {
			return nil
		}

		// Skip declaration files and config files
		baseName := filepath.Base(path)
		if strings.HasSuffix(baseName, ".d.ts") ||
			baseName == "jest.config.ts" ||
			baseName == "vite.config.ts" ||
			baseName == "next.config.js" ||
			baseName == "tailwind.config.js" ||
			baseName == "postcss.config.js" ||
			baseName == "tsconfig.json" {
			return nil
		}

		// Read file
		content, readErr := os.ReadFile(path)
		if readErr != nil {
			return nil
		}

		// Skip files > 1MB (likely generated)
		if len(content) > 1024*1024 {
			return nil
		}

		// Analyze the file
		relPath, _ := filepath.Rel(a.repoPath, path)
		analysis := a.analyzeFile(relPath, content, ext)
		if analysis != nil {
			results = append(results, analysis)
			fileCount++
		}

		return nil
	})

	if err != nil {
		log.Warn().Err(err).Msg("Error walking TS/JS files")
	}

	return results
}

// analyzeFile performs AST analysis on a single TS/JS file
func (a *TSAnalyzer) analyzeFile(filePath string, content []byte, ext string) *FileAnalysis {
	// Choose the right parser
	var parser *sitter.Parser
	var lang string

	switch ext {
	case ".ts":
		parser = a.tsParser
		lang = "typescript"
	case ".tsx":
		parser = a.tsxParser
		lang = "tsx"
	case ".js":
		parser = a.jsParser
		lang = "javascript"
	case ".jsx":
		parser = a.tsxParser // TSX parser handles JSX too
		lang = "jsx"
	default:
		return nil
	}

	// Parse the file into AST
	tree, err := parser.ParseCtx(context.Background(), nil, content)
	if err != nil {
		log.Warn().Err(err).Str("file", filePath).Msg("Failed to parse file")
		return nil
	}
	defer tree.Close()

	analysis := &FileAnalysis{
		FilePath:      filePath,
		Language:      lang,
		Imports:       []ImportStatement{},
		Exports:       []ExportStatement{},
		FunctionCalls: []FunctionCall{},
		Definitions:   []Definition{},
		Patterns:      []CodePattern{},
		LineCount:     int(tree.RootNode().EndPoint().Row) + 1,
	}

	// Traverse the AST tree
	rootNode := tree.RootNode()
	a.traverseNode(rootNode, content, analysis)

	// Detect patterns from analysis
	a.detectPatterns(analysis)

	return analysis
}

// traverseNode recursively walks the AST
func (a *TSAnalyzer) traverseNode(node *sitter.Node, content []byte, analysis *FileAnalysis) {
	nodeType := node.Type()

	switch nodeType {
	case "import_statement":
		imp := a.extractImport(node, content)
		if imp.Source != "" {
			analysis.Imports = append(analysis.Imports, imp)
		}

	case "export_statement":
		exp := a.extractExport(node, content)
		if exp.Name != "" || exp.IsDefault {
			analysis.Exports = append(analysis.Exports, exp)
		}

	case "call_expression":
		call := a.extractFunctionCall(node, content)
		if call.Name != "" || call.FullCall != "" {
			analysis.FunctionCalls = append(analysis.FunctionCalls, call)
		}

	case "function_declaration", "arrow_function", "method_definition":
		def := a.extractDefinition(node, content, "function")
		if def.Name != "" {
			analysis.Definitions = append(analysis.Definitions, def)
			// Calculate complexity for each function
			analysis.Complexity += a.calculateTSComplexity(node, content)
		}

	case "class_declaration":
		def := a.extractDefinition(node, content, "class")
		if def.Name != "" {
			analysis.Definitions = append(analysis.Definitions, def)
		}

	case "interface_declaration", "type_alias_declaration":
		def := a.extractDefinition(node, content, "interface")
		if def.Name != "" {
			analysis.Definitions = append(analysis.Definitions, def)
		}

	case "lexical_declaration", "variable_declaration":
		// Detect exported const components: export const Foo = () => {}
		a.extractVariableDefinition(node, content, analysis)
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

// extractImport parses import statements from AST
// Handles: import X from 'y', import { A, B } from 'y', import * as X from 'y'
func (a *TSAnalyzer) extractImport(node *sitter.Node, content []byte) ImportStatement {
	imp := ImportStatement{
		Names: []string{},
		Line:  int(node.StartPoint().Row) + 1,
	}

	childCount := int(node.ChildCount())
	for i := 0; i < childCount; i++ {
		child := node.Child(i)
		if child == nil {
			continue
		}

		switch child.Type() {
		case "import_clause":
			a.extractImportClauseNames(child, content, &imp)

		case "string", "string_fragment":
			source := child.Content(content)
			imp.Source = strings.Trim(source, `"'`+"`")

		case "identifier":
			// Default import: import React from 'react'
			imp.Names = append(imp.Names, child.Content(content))
			imp.IsDefault = true
		}
	}

	// Also try to find the source in nested string nodes
	if imp.Source == "" {
		imp.Source = a.findStringInNode(node, content)
	}

	return imp
}

// extractImportClauseNames extracts names from import clause
func (a *TSAnalyzer) extractImportClauseNames(node *sitter.Node, content []byte, imp *ImportStatement) {
	childCount := int(node.ChildCount())
	for i := 0; i < childCount; i++ {
		child := node.Child(i)
		if child == nil {
			continue
		}

		switch child.Type() {
		case "identifier":
			imp.Names = append(imp.Names, child.Content(content))
			imp.IsDefault = true

		case "named_imports":
			// { useState, useEffect }
			specCount := int(child.ChildCount())
			for j := 0; j < specCount; j++ {
				spec := child.Child(j)
				if spec != nil && spec.Type() == "import_specifier" {
					nameNode := spec.ChildByFieldName("name")
					if nameNode != nil {
						imp.Names = append(imp.Names, nameNode.Content(content))
					} else {
						// Fallback: first identifier in specifier
						for k := 0; k < int(spec.ChildCount()); k++ {
							ch := spec.Child(k)
							if ch != nil && ch.Type() == "identifier" {
								imp.Names = append(imp.Names, ch.Content(content))
								break
							}
						}
					}
				}
			}

		case "namespace_import":
			// import * as X
			for j := 0; j < int(child.ChildCount()); j++ {
				ch := child.Child(j)
				if ch != nil && ch.Type() == "identifier" {
					imp.Names = append(imp.Names, ch.Content(content))
				}
			}
		}
	}
}

// extractExport parses export statements
func (a *TSAnalyzer) extractExport(node *sitter.Node, content []byte) ExportStatement {
	exp := ExportStatement{
		Line: int(node.StartPoint().Row) + 1,
	}

	nodeContent := node.Content(content)
	if strings.Contains(nodeContent, "export default") {
		exp.IsDefault = true
		exp.Type = "default"
	}

	// Find the declaration inside export
	childCount := int(node.ChildCount())
	for i := 0; i < childCount; i++ {
		child := node.Child(i)
		if child == nil {
			continue
		}

		switch child.Type() {
		case "function_declaration":
			nameNode := child.ChildByFieldName("name")
			if nameNode != nil {
				exp.Name = nameNode.Content(content)
			}
			exp.Type = "function"

		case "class_declaration":
			nameNode := child.ChildByFieldName("name")
			if nameNode != nil {
				exp.Name = nameNode.Content(content)
			}
			exp.Type = "class"

		case "lexical_declaration":
			// export const X = ...
			for j := 0; j < int(child.ChildCount()); j++ {
				decl := child.Child(j)
				if decl != nil && decl.Type() == "variable_declarator" {
					nameNode := decl.ChildByFieldName("name")
					if nameNode != nil {
						exp.Name = nameNode.Content(content)
					}
				}
			}
			exp.Type = "variable"

		case "identifier":
			if exp.Name == "" {
				exp.Name = child.Content(content)
			}
		}
	}

	return exp
}

// extractFunctionCall parses function/method calls
func (a *TSAnalyzer) extractFunctionCall(node *sitter.Node, content []byte) FunctionCall {
	call := FunctionCall{
		Line: int(node.StartPoint().Row) + 1,
	}

	// Get the function being called
	funcNode := node.ChildByFieldName("function")
	if funcNode == nil {
		return call
	}

	switch funcNode.Type() {
	case "identifier":
		// Simple call: useState(), fetch()
		call.Name = funcNode.Content(content)
		call.FullCall = call.Name

	case "member_expression":
		// Method call: app.listen(), console.log()
		objNode := funcNode.ChildByFieldName("object")
		propNode := funcNode.ChildByFieldName("property")
		if objNode != nil && propNode != nil {
			call.Receiver = objNode.Content(content)
			call.Name = propNode.Content(content)
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

// extractDefinition extracts function/class/interface definitions
func (a *TSAnalyzer) extractDefinition(node *sitter.Node, content []byte, defType string) Definition {
	def := Definition{
		Type:    defType,
		Line:    int(node.StartPoint().Row) + 1,
		EndLine: int(node.EndPoint().Row) + 1,
	}

	nameNode := node.ChildByFieldName("name")
	if nameNode != nil {
		def.Name = nameNode.Content(content)
	}

	// Check if exported
	parent := node.Parent()
	if parent != nil && parent.Type() == "export_statement" {
		def.IsExported = true
	}

	// Extract parameters for functions
	if defType == "function" {
		paramsNode := node.ChildByFieldName("parameters")
		if paramsNode != nil {
			def.Params = a.extractParams(paramsNode, content)
		}
	}

	return def
}

// extractVariableDefinition handles variable declarations (export const Component = () => {})
func (a *TSAnalyzer) extractVariableDefinition(node *sitter.Node, content []byte, analysis *FileAnalysis) {
	childCount := int(node.ChildCount())
	for i := 0; i < childCount; i++ {
		child := node.Child(i)
		if child == nil || child.Type() != "variable_declarator" {
			continue
		}

		nameNode := child.ChildByFieldName("name")
		valueNode := child.ChildByFieldName("value")
		if nameNode == nil || valueNode == nil {
			continue
		}

		name := nameNode.Content(content)
		valueType := valueNode.Type()

		// Detect arrow function components: const MyComponent = () => {}
		if valueType == "arrow_function" || valueType == "function" {
			def := Definition{
				Name:    name,
				Type:    "function",
				Line:    int(node.StartPoint().Row) + 1,
				EndLine: int(node.EndPoint().Row) + 1,
			}

			parent := node.Parent()
			if parent != nil && parent.Type() == "export_statement" {
				def.IsExported = true
			}

			analysis.Definitions = append(analysis.Definitions, def)
		}
	}
}

// extractParams extracts parameter names
func (a *TSAnalyzer) extractParams(node *sitter.Node, content []byte) []string {
	params := []string{}
	childCount := int(node.ChildCount())
	for i := 0; i < childCount; i++ {
		child := node.Child(i)
		if child == nil {
			continue
		}

		switch child.Type() {
		case "required_parameter", "optional_parameter":
			patternNode := child.ChildByFieldName("pattern")
			if patternNode != nil {
				params = append(params, patternNode.Content(content))
			}

		case "identifier":
			params = append(params, child.Content(content))
		}
	}
	return params
}

// calculateTSComplexity calculates cyclomatic complexity of a TS/JS function
func (a *TSAnalyzer) calculateTSComplexity(node *sitter.Node, source []byte) int {
	complexity := 1 // Base complexity

	a.walkForComplexity(node, &complexity, source)

	return complexity
}

func (a *TSAnalyzer) walkForComplexity(node *sitter.Node, complexity *int, source []byte) {
	nodeType := node.Type()

	switch nodeType {
	case "if_statement":
		*complexity++
	case "for_statement", "for_in_statement", "while_statement", "do_statement":
		*complexity++
	case "switch_case":
		*complexity++
	case "catch_clause":
		*complexity++
	case "ternary_expression":
		*complexity++
	case "binary_expression":
		op := ""
		for i := 0; i < int(node.ChildCount()); i++ {
			child := node.Child(i)
			if child != nil {
				ct := child.Type()
				if ct == "&&" || ct == "||" || ct == "??" {
					op = ct
				} else if len(source) > 0 {
					content := child.Content(source)
					if content == "&&" || content == "||" {
						op = content
					}
				}
			}
		}
		if op == "&&" || op == "||" || op == "??" {
			*complexity++
		}
	}

	// Recurse into children
	childCount := int(node.ChildCount())
	for i := 0; i < childCount; i++ {
		child := node.Child(i)
		if child != nil {
			a.walkForComplexity(child, complexity, source)
		}
	}
}

// detectPatterns detects high-level code patterns from AST data
func (a *TSAnalyzer) detectPatterns(analysis *FileAnalysis) {
	// Detect React hooks
	for _, call := range analysis.FunctionCalls {
		if hookName, exists := ReactHookPatterns[call.Name]; exists {
			analysis.Patterns = append(analysis.Patterns, CodePattern{
				Type:       "react_hook",
				Name:       call.Name,
				Confidence: 0.95,
				Evidence:   "React hook " + hookName + " call detected via AST",
				Line:       call.Line,
			})
		}

		// Custom hooks: use* prefix
		if strings.HasPrefix(call.Name, "use") && len(call.Name) > 3 {
			if _, isBuiltIn := ReactHookPatterns[call.Name]; !isBuiltIn {
				analysis.Patterns = append(analysis.Patterns, CodePattern{
					Type:       "custom_hook",
					Name:       call.Name,
					Confidence: 0.90,
					Evidence:   "Custom React hook call: " + call.Name,
					Line:       call.Line,
				})
			}
		}

		// Express route patterns
		if call.Receiver != "" {
			lowerName := strings.ToLower(call.Name)
			if lowerName == "get" || lowerName == "post" || lowerName == "put" ||
				lowerName == "delete" || lowerName == "patch" || lowerName == "use" {
				if call.Receiver == "app" || call.Receiver == "router" || call.Receiver == "route" {
					analysis.Patterns = append(analysis.Patterns, CodePattern{
						Type:       "express_route",
						Name:       call.FullCall,
						Confidence: 0.92,
						Evidence:   "Express-style route handler detected: " + call.FullCall,
						Line:       call.Line,
					})
				}
			}
		}

		// API call patterns
		if call.Name == "fetch" || call.FullCall == "axios.get" || call.FullCall == "axios.post" ||
			call.FullCall == "axios.put" || call.FullCall == "axios.delete" {
			analysis.Patterns = append(analysis.Patterns, CodePattern{
				Type:       "api_call",
				Name:       call.FullCall,
				Confidence: 0.90,
				Evidence:   "HTTP API call detected: " + call.FullCall,
				Line:       call.Line,
			})
		}
	}

	// Detect React component patterns from definitions
	for _, def := range analysis.Definitions {
		if def.Type == "function" && def.IsExported {
			// PascalCase functions are likely React components
			if len(def.Name) > 0 && def.Name[0] >= 'A' && def.Name[0] <= 'Z' {
				// Check if file has React import
				hasReactImport := false
				for _, imp := range analysis.Imports {
					if imp.Source == "react" || imp.Source == "react-dom" {
						hasReactImport = true
						break
					}
				}
				if hasReactImport || analysis.Language == "tsx" || analysis.Language == "jsx" {
					analysis.Patterns = append(analysis.Patterns, CodePattern{
						Type:       "react_component",
						Name:       def.Name,
						Confidence: 0.93,
						Evidence:   "Exported PascalCase function component: " + def.Name,
						Line:       def.Line,
					})
				}
			}
		}
	}

	// Detect dynamic imports via regex fallback on original content
	// (tree-sitter may not have specific node type for dynamic imports)
	a.detectDynamicImports(analysis)
}

// detectDynamicImports finds dynamic import() calls
func (a *TSAnalyzer) detectDynamicImports(analysis *FileAnalysis) {
	for _, call := range analysis.FunctionCalls {
		if call.Name == "import" {
			analysis.Imports = append(analysis.Imports, ImportStatement{
				Names:     []string{},
				Source:    "dynamic:" + call.FullCall,
				IsDynamic: true,
				Line:      call.Line,
			})
		}
	}
}

// findStringInNode recursively searches for a string literal in child nodes
func (a *TSAnalyzer) findStringInNode(node *sitter.Node, content []byte) string {
	childCount := int(node.ChildCount())
	for i := 0; i < childCount; i++ {
		child := node.Child(i)
		if child == nil {
			continue
		}

		if child.Type() == "string" || child.Type() == "string_fragment" {
			text := child.Content(content)
			cleaned := strings.Trim(text, `"'`+"`")
			if cleaned != "" && !strings.ContainsRune(cleaned, '{') {
				return cleaned
			}
		}

		// Recurse into children
		found := a.findStringInNode(child, content)
		if found != "" {
			return found
		}
	}
	return ""
}

// dynamicImportRegex matches dynamic import patterns
var dynamicImportRegex = regexp.MustCompile(`import\s*\(\s*['"]([^'"]+)['"]\s*\)`)
