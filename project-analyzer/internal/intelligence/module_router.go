package intelligence

import (
	"sort"
)

// ============================================
// MODULE ROUTER
// Routes to ONLY required modules based on signals
// Uses cost/value model to skip low-value modules
// SAVES 30-50% CPU through intelligent routing
// ============================================

// ModuleRouter selects analysis modules based on signals
type ModuleRouter struct {
	signals         *FastSignals
	confidence      *SignalConfidenceVector
	niche           string // User-specified niche (if any)
	userProjectType string // User-specified project type: backend, frontend, fullstack, ml, library
}

// ModuleSelection contains the routing decision
type ModuleSelection struct {
	SelectedModules    []AnalysisModule
	SkippedModules     []AnalysisModule
	SkipReasons        map[AnalysisModule]string
	EstimatedTotalCost int64 // milliseconds
}

// NewModuleRouter creates a new router
func NewModuleRouter(signals *FastSignals, confidence *SignalConfidenceVector, niche, userProjectType string) *ModuleRouter {
	return &ModuleRouter{
		signals:         signals,
		confidence:      confidence,
		niche:           niche,
		userProjectType: userProjectType,
	}
}

// Route selects which modules to execute
func (r *ModuleRouter) Route() *ModuleSelection {
	selection := &ModuleSelection{
		SkipReasons: make(map[AnalysisModule]string),
	}

	// Evaluate each module
	candidates := r.getCandidateModules()

	for _, module := range candidates {
		meta := ModuleRegistry[module]
		shouldRun, reason := r.evaluateModule(module, meta)

		if shouldRun {
			selection.SelectedModules = append(selection.SelectedModules, module)
			selection.EstimatedTotalCost += meta.EstimatedCost.Milliseconds()
		} else {
			selection.SkippedModules = append(selection.SkippedModules, module)
			selection.SkipReasons[module] = reason
		}
	}

	// Sort by value (highest value first)
	r.sortByValue(selection)

	return selection
}

// getCandidateModules returns modules potentially relevant based on signals
func (r *ModuleRouter) getCandidateModules() []AnalysisModule {
	candidates := []AnalysisModule{}

	// Frontend modules
	if r.isFrontendProject() {
		for _, fw := range r.signals.DetectedFrameworks {
			switch fw {
			case "React", "Next.js":
				candidates = append(candidates, ModuleFrontendReact)
			case "Vue":
				candidates = append(candidates, ModuleFrontendVue)
			case "Angular":
				candidates = append(candidates, ModuleFrontendAngular)
			}
		}
	}

	// Backend modules - only add if this is a backend project
	if r.isBackendProject() {
		switch r.signals.DominantLanguage {
		case "Go":
			candidates = append(candidates, ModuleBackendGo)
		case "TypeScript", "JavaScript":
			candidates = append(candidates, ModuleBackendNode)
		case "Python":
			candidates = append(candidates, ModuleBackendPython)
		case "Rust":
			candidates = append(candidates, ModuleBackendRust)
		}
	}

	// Infrastructure modules
	if r.signals.HasDockerfile || r.signals.HasDockerCompose {
		candidates = append(candidates, ModuleInfraDocker)
	}
	if r.signals.HasKubernetes {
		candidates = append(candidates, ModuleInfraK8s)
	}
	if r.signals.HasTerraform {
		candidates = append(candidates, ModuleInfraTerraform)
	}

	// ML module
	if r.signals.HasMLMarkers || r.signals.HasNotebooks {
		candidates = append(candidates, ModuleMLPipeline)
	}

	// Test coverage module
	if r.signals.HasTests {
		candidates = append(candidates, ModuleTestCoverage)
	}

	// Security scan (always consider for production projects)
	if r.signals.HasDockerfile || r.signals.HasCI {
		candidates = append(candidates, ModuleSecurityScan)
	}

	// API quality (for backend projects)
	if r.isBackendProject() {
		candidates = append(candidates, ModuleAPIQuality)
	}

	return candidates
}

// evaluateModule decides if a module should run
func (r *ModuleRouter) evaluateModule(module AnalysisModule, meta ModuleMeta) (bool, string) {
	// Rule 1: Skip if expected value is below threshold
	if meta.ExpectedValue < MinValueThreshold {
		return false, "value_below_threshold"
	}

	// Rule 2: Skip if confidence is below module minimum
	relevantConfidence := r.getRelevantConfidence(module)
	if relevantConfidence < meta.MinConfidence {
		return false, "confidence_too_low"
	}

	// Rule 3: Niche-based routing
	if r.niche != "" && !r.nicheMatchesModule(module) {
		return false, "niche_mismatch"
	}

	// Rule 4: Language/framework specific exclusions
	if !r.languageMatchesModule(module) {
		return false, "language_mismatch"
	}

	return true, ""
}

// getRelevantConfidence returns the confidence dimension relevant to a module
func (r *ModuleRouter) getRelevantConfidence(module AnalysisModule) float64 {
	switch module {
	case ModuleFrontendReact, ModuleFrontendVue, ModuleFrontendAngular:
		return r.confidence.FrameworkConfidence
	case ModuleBackendGo, ModuleBackendNode, ModuleBackendPython, ModuleBackendRust:
		return r.confidence.LanguageConfidence
	case ModuleInfraDocker, ModuleInfraK8s, ModuleInfraTerraform:
		return r.confidence.InfraConfidence
	case ModuleMLPipeline:
		return r.confidence.MLConfidence
	case ModuleTestCoverage:
		return r.confidence.TestConfidence
	case ModuleSecurityScan:
		return r.confidence.SecurityConfidence
	default:
		return r.confidence.OverallConfidence()
	}
}

// nicheMatchesModule checks if user-selected niche matches module
func (r *ModuleRouter) nicheMatchesModule(module AnalysisModule) bool {
	// Map niches to relevant modules
	nicheModules := map[string][]AnalysisModule{
		"WEB_FRONTEND": {ModuleFrontendReact, ModuleFrontendVue, ModuleFrontendAngular},
		"WEB_BACKEND":  {ModuleBackendNode, ModuleBackendPython, ModuleBackendGo},
		"WEB_FULLSTACK": {ModuleFrontendReact, ModuleFrontendVue, ModuleBackendNode,
			ModuleBackendGo, ModuleBackendPython},
		"BACKEND_SYSTEMS": {ModuleBackendGo, ModuleBackendRust, ModuleInfraDocker},
		"DEVOPS":          {ModuleInfraDocker, ModuleInfraK8s, ModuleInfraTerraform},
		"CLOUD_INFRA":     {ModuleInfraDocker, ModuleInfraK8s, ModuleInfraTerraform},
		"ML_AI":           {ModuleMLPipeline, ModuleBackendPython},
		"DISTRIBUTED":     {ModuleBackendGo, ModuleInfraDocker, ModuleInfraK8s},
	}

	if modules, ok := nicheModules[r.niche]; ok {
		for _, m := range modules {
			if m == module {
				return true
			}
		}
		return false
	}

	// No niche restriction or unknown niche - allow all
	return true
}

// languageMatchesModule checks language/module compatibility
func (r *ModuleRouter) languageMatchesModule(module AnalysisModule) bool {
	lang := r.signals.DominantLanguage

	switch module {
	case ModuleBackendGo:
		return lang == "Go"
	case ModuleBackendNode:
		return lang == "TypeScript" || lang == "JavaScript"
	case ModuleBackendPython:
		return lang == "Python"
	case ModuleBackendRust:
		return lang == "Rust"
	case ModuleFrontendReact, ModuleFrontendVue, ModuleFrontendAngular:
		return lang == "TypeScript" || lang == "JavaScript"
	}

	// Infrastructure and other modules don't have language restrictions
	return true
}

// isFrontendProject checks if this is primarily a frontend project
func (r *ModuleRouter) isFrontendProject() bool {
	// User-specified type takes priority
	if r.userProjectType == "frontend" || r.userProjectType == "fullstack" {
		return true
	}
	if r.userProjectType == "backend" || r.userProjectType == "ml" {
		return false // Explicit backend/ml skips frontend
	}
	// Fallback to signal-based detection
	if r.signals.HasComponentsFolder {
		return true
	}
	for _, fw := range r.signals.DetectedFrameworks {
		if fw == "React" || fw == "Vue" || fw == "Angular" || fw == "Next.js" {
			return true
		}
	}
	return false
}

// isBackendProject checks if this is primarily a backend project
func (r *ModuleRouter) isBackendProject() bool {
	// User-specified type takes priority
	if r.userProjectType == "backend" || r.userProjectType == "fullstack" {
		return true
	}
	if r.userProjectType == "frontend" {
		return false // Explicit frontend skips backend
	}
	// Fallback to signal-based detection
	// Go is almost always backend
	if r.signals.DominantLanguage == "Go" {
		return true
	}
	// Check for backend frameworks
	for _, fw := range r.signals.DetectedFrameworks {
		switch fw {
		case "Express", "NestJS", "Gin", "Fiber", "Echo", "Chi",
			"FastAPI", "Django", "Flask", "gRPC":
			return true
		}
	}
	// Check for API patterns
	if r.signals.HasServicesFolder || r.signals.HasGateway {
		return true
	}
	return false
}

// sortByValue sorts selected modules by expected value (highest first)
func (r *ModuleRouter) sortByValue(selection *ModuleSelection) {
	sort.Slice(selection.SelectedModules, func(i, j int) bool {
		metaI := ModuleRegistry[selection.SelectedModules[i]]
		metaJ := ModuleRegistry[selection.SelectedModules[j]]
		return metaI.ExpectedValue > metaJ.ExpectedValue
	})
}

// GetModuleNames returns human-readable names of selected modules
func (r *ModuleRouter) GetModuleNames(modules []AnalysisModule) []string {
	names := make([]string, len(modules))
	for i, m := range modules {
		if meta, ok := ModuleRegistry[m]; ok {
			names[i] = meta.Name
		} else {
			names[i] = "Unknown"
		}
	}
	return names
}
