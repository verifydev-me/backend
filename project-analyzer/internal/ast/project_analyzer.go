package ast

import (
	"math"
	"strings"
	"sync"
	"time"

	"github.com/rs/zerolog/log"
)

// ============================================
// PROJECT AST ORCHESTRATOR
// Coordinates multi-language analysis and
// produces unified technology usage report
// ============================================

// ProjectAnalyzer orchestrates AST analysis across all languages
type ProjectAnalyzer struct {
	repoPath string
}

// NewProjectAnalyzer creates a new multi-language AST analyzer
func NewProjectAnalyzer(repoPath string) *ProjectAnalyzer {
	return &ProjectAnalyzer{repoPath: repoPath}
}

// Analyze runs AST analysis on all supported languages in parallel
func (p *ProjectAnalyzer) Analyze() *ProjectASTResult {
	start := time.Now()
	log.Info().Str("path", p.repoPath).Msg("[AST Engine] Starting multi-language AST analysis")

	result := &ProjectASTResult{
		Files:           []*FileAnalysis{},
		ImportGraph:     make(map[string][]string),
		TechnologyUsage: make(map[string]*TechUsage),
		Complexity: ProjectComplexity{
			Distribution: make(map[string]int),
		},
	}

	// Run all analyzers in parallel
	var wg sync.WaitGroup
	var mu sync.Mutex

	allFiles := make([][]*FileAnalysis, 3)

	// TypeScript/JavaScript
	wg.Add(1)
	go func() {
		defer wg.Done()
		tsAnalyzer := NewTSAnalyzer(p.repoPath)
		files := tsAnalyzer.AnalyzeProject()
		mu.Lock()
		allFiles[0] = files
		mu.Unlock()
		log.Info().Int("files", len(files)).Msg("[AST Engine] TS/JS analysis complete")
	}()

	// Go
	wg.Add(1)
	go func() {
		defer wg.Done()
		goAnalyzer := NewGoASTAnalyzer(p.repoPath)
		files := goAnalyzer.AnalyzeProject()
		mu.Lock()
		allFiles[1] = files
		mu.Unlock()
		log.Info().Int("files", len(files)).Msg("[AST Engine] Go analysis complete")
	}()

	// Python
	wg.Add(1)
	go func() {
		defer wg.Done()
		pyAnalyzer := NewPythonAnalyzer(p.repoPath)
		files := pyAnalyzer.AnalyzeProject()
		mu.Lock()
		allFiles[2] = files
		mu.Unlock()
		log.Info().Int("files", len(files)).Msg("[AST Engine] Python analysis complete")
	}()

	wg.Wait()

	// Merge all results
	for _, files := range allFiles {
		result.Files = append(result.Files, files...)
	}

	// Build import graph
	p.buildImportGraph(result)

	// Calculate technology usage
	p.calculateTechnologyUsage(result)

	// Calculate project-wide complexity
	p.calculateProjectComplexity(result)

	// Generate summary
	p.generateSummary(result)

	elapsed := time.Since(start)
	log.Info().
		Int("totalFiles", len(result.Files)).
		Int("technologies", len(result.TechnologyUsage)).
		Int("totalImports", result.Summary.TotalImports).
		Int("totalPatterns", result.Summary.TotalPatterns).
		Dur("elapsed", elapsed).
		Msg("[AST Engine] Multi-language analysis complete")

	return result
}

// buildImportGraph creates file -> [modules] import mapping
func (p *ProjectAnalyzer) buildImportGraph(result *ProjectASTResult) {
	for _, file := range result.Files {
		modules := []string{}
		for _, imp := range file.Imports {
			if imp.Source != "" && !imp.IsDynamic {
				modules = append(modules, imp.Source)
			}
		}
		if len(modules) > 0 {
			result.ImportGraph[file.FilePath] = modules
		}
	}
}

// calculateTechnologyUsage maps imports to known technologies and calculates usage intensity
func (p *ProjectAnalyzer) calculateTechnologyUsage(result *ProjectASTResult) {
	// Group all imports by technology
	techFiles := make(map[string]map[string]bool) // tech -> set of files
	techCalls := make(map[string]int)             // tech -> call count

	for _, file := range result.Files {
		// Check imports against known signals
		for _, imp := range file.Imports {
			tech := p.resolveTechnology(imp.Source, file.Language)
			if tech == "" {
				continue
			}

			// Track which files import this technology
			if techFiles[tech] == nil {
				techFiles[tech] = make(map[string]bool)
			}
			techFiles[tech][file.FilePath] = true

			// Count imported names as call indicators
			techCalls[tech] += len(imp.Names)
		}

		// Count function calls that reference known technologies
		for _, call := range file.FunctionCalls {
			tech := p.resolveCallToTechnology(call, file.Language)
			if tech != "" {
				techCalls[tech] += 1
			}
		}

		// Detect technologies from patterns
		for _, pattern := range file.Patterns {
			tech := p.resolvePatternToTechnology(pattern)
			if tech != "" {
				if techFiles[tech] == nil {
					techFiles[tech] = make(map[string]bool)
				}
				techFiles[tech][file.FilePath] = true
			}
		}
	}

	// Build TechUsage entries
	totalFiles := len(result.Files)
	if totalFiles == 0 {
		totalFiles = 1
	}

	for tech, files := range techFiles {
		fileCount := len(files)
		callCount := techCalls[tech]

		// Calculate intensity: combination of file spread and call frequency
		fileSpread := math.Min(float64(fileCount)/float64(totalFiles)*3, 1.0)
		callIntensity := math.Min(float64(callCount)/50.0, 1.0)
		intensity := (fileSpread * 0.4) + (callIntensity * 0.6)

		// Collect evidence
		evidence := []string{}
		for f := range files {
			if len(evidence) < 5 {
				evidence = append(evidence, "Used in "+f)
			}
		}

		result.TechnologyUsage[tech] = &TechUsage{
			Technology:  tech,
			ImportCount: callCount,
			CallCount:   techCalls[tech],
			FileCount:   fileCount,
			Intensity:   math.Round(intensity*100) / 100,
			Evidence:    evidence,
		}
	}
}

// resolveTechnology maps an import source to a known technology name
func (p *ProjectAnalyzer) resolveTechnology(source string, language string) string {
	switch language {
	case "typescript", "tsx", "javascript", "jsx":
		// Exact match first
		if tech, ok := KnownImportSignals[source]; ok {
			return tech
		}
		// Check scoped packages: @scope/package
		for pattern, tech := range KnownImportSignals {
			if strings.HasPrefix(source, pattern+"/") || source == pattern {
				return tech
			}
		}
		return ""

	case "go":
		// Check full path first
		if tech, ok := GoImportSignals[source]; ok {
			return tech
		}
		// Check prefix match for Go packages
		for pattern, tech := range GoImportSignals {
			if strings.HasPrefix(source, pattern) {
				return tech
			}
		}
		return ""

	case "python":
		// Exact match first
		if tech, ok := PythonImportSignals[source]; ok {
			return tech
		}
		// Check top-level module: "django.db" matches "django"
		parts := strings.SplitN(source, ".", 2)
		if len(parts) > 0 {
			if tech, ok := PythonImportSignals[parts[0]]; ok {
				return tech
			}
		}
		return ""
	}

	return ""
}

// resolveCallToTechnology tries to map function calls to technologies
func (p *ProjectAnalyzer) resolveCallToTechnology(call FunctionCall, language string) string {
	switch language {
	case "typescript", "tsx", "javascript", "jsx":
		// React hooks
		if _, ok := ReactHookPatterns[call.Name]; ok {
			return "React"
		}
		// Express patterns
		if call.Receiver == "app" || call.Receiver == "router" {
			lowerName := strings.ToLower(call.Name)
			if lowerName == "get" || lowerName == "post" || lowerName == "put" ||
				lowerName == "delete" || lowerName == "use" || lowerName == "listen" {
				return "Express"
			}
		}

	case "go":
		// Known Go framework calls
		switch call.Receiver {
		case "gin":
			return "Gin"
		case "fiber":
			return "Fiber"
		case "echo":
			return "Echo"
		case "chi":
			return "Chi"
		}

	case "python":
		if call.Receiver == "app" {
			lower := strings.ToLower(call.Name)
			if lower == "route" || lower == "get" || lower == "post" {
				return "Flask" // or FastAPI, heuristic
			}
		}
	}

	return ""
}

// resolvePatternToTechnology maps detected patterns to technologies
func (p *ProjectAnalyzer) resolvePatternToTechnology(pattern CodePattern) string {
	switch pattern.Type {
	case "react_hook", "react_component", "custom_hook":
		return "React"
	case "express_route":
		return "Express"
	case "python_route":
		return "Flask"
	case "django_class", "django_auth":
		return "Django"
	case "drf_view":
		return "Django REST Framework"
	case "goroutine_with_context", "goroutine_with_channel":
		return "Go Concurrency"
	case "go_error_handling":
		return "Go Error Handling"
	case "ml_ai":
		return pattern.Name
	}
	return ""
}

// calculateProjectComplexity computes project-wide complexity metrics
func (p *ProjectAnalyzer) calculateProjectComplexity(result *ProjectASTResult) {
	totalComplexity := 0
	totalFunctions := 0
	maxComplexity := 0
	maxFunc := ""

	for _, file := range result.Files {
		totalComplexity += file.Complexity
		totalFunctions += len(file.Definitions)

		// Track per-function max
		for _, def := range file.Definitions {
			if def.Type == "function" || def.Type == "method" || def.Type == "async_function" {
				// Rough estimate: complexity contribution is proportional to lines
				funcLines := def.EndLine - def.Line
				if funcLines <= 0 {
					funcLines = 1
				}
				// Use lines as proxy for max complexity detection
				if funcLines > maxComplexity {
					maxComplexity = funcLines
					maxFunc = file.FilePath + ":" + def.Name
				}
			}
		}
	}

	if totalFunctions > 0 {
		result.Complexity.AveragePerFunction = math.Round(float64(totalComplexity)/float64(totalFunctions)*100) / 100
	}
	result.Complexity.MaxComplexity = maxComplexity
	result.Complexity.MaxComplexityFunc = maxFunc
	result.Complexity.TotalFunctions = totalFunctions

	// Distribution
	for _, file := range result.Files {
		switch {
		case file.Complexity <= 5:
			result.Complexity.Distribution["simple"]++
		case file.Complexity <= 15:
			result.Complexity.Distribution["moderate"]++
		case file.Complexity <= 30:
			result.Complexity.Distribution["complex"]++
		default:
			result.Complexity.Distribution["critical"]++
		}
	}
}

// generateSummary creates aggregate summary
func (p *ProjectAnalyzer) generateSummary(result *ProjectASTResult) {
	uniqueModules := make(map[string]bool)

	for _, file := range result.Files {
		result.Summary.TotalImports += len(file.Imports)
		result.Summary.TotalCalls += len(file.FunctionCalls)
		result.Summary.TotalPatterns += len(file.Patterns)
		result.Summary.TotalExports += len(file.Exports)
		result.Summary.TotalFunctions += len(file.Definitions)

		for _, imp := range file.Imports {
			uniqueModules[imp.Source] = true
		}
	}

	result.Summary.TotalFiles = len(result.Files)
	result.Summary.UniqueModules = len(uniqueModules)
}

// ============================================
// PUBLIC HELPER METHODS
// For use by other packages
// ============================================

// GetTechConfidence returns the AST-based confidence for a specific technology
func (r *ProjectASTResult) GetTechConfidence(techName string) float64 {
	usage, exists := r.TechnologyUsage[techName]
	if !exists {
		return 0
	}

	// Base confidence from usage intensity
	confidence := 0.5 + (usage.Intensity * 0.45)

	// Boost for high file count
	if usage.FileCount >= 10 {
		confidence = math.Min(confidence+0.05, 0.99)
	}

	// Boost for high call count
	if usage.CallCount >= 20 {
		confidence = math.Min(confidence+0.05, 0.99)
	}

	return math.Round(confidence*100) / 100
}

// GetDetectedTechnologies returns list of all technologies detected via AST
func (r *ProjectASTResult) GetDetectedTechnologies() []string {
	techs := []string{}
	for tech := range r.TechnologyUsage {
		techs = append(techs, tech)
	}
	return techs
}

// GetTechEvidence returns evidence strings for a technology
func (r *ProjectASTResult) GetTechEvidence(techName string) []string {
	usage, exists := r.TechnologyUsage[techName]
	if !exists {
		return nil
	}
	return usage.Evidence
}

// HasTechnology checks if a technology was detected
func (r *ProjectASTResult) HasTechnology(techName string) bool {
	_, exists := r.TechnologyUsage[techName]
	return exists
}

// GetPatternsByType returns all patterns of a given type
func (r *ProjectASTResult) GetPatternsByType(patternType string) []CodePattern {
	patterns := []CodePattern{}
	for _, file := range r.Files {
		for _, pattern := range file.Patterns {
			if pattern.Type == patternType {
				patterns = append(patterns, pattern)
			}
		}
	}
	return patterns
}

// GetComplexityLevel returns a human-readable complexity assessment
func (r *ProjectASTResult) GetComplexityLevel() string {
	avg := r.Complexity.AveragePerFunction
	switch {
	case avg <= 3:
		return "simple"
	case avg <= 8:
		return "moderate"
	case avg <= 15:
		return "complex"
	default:
		return "highly_complex"
	}
}
