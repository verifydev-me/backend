package parser

import (
	"bufio"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/rs/zerolog/log"
	"github.com/verifydev/project-analyzer/pkg/signals"
)

// FileParser handles parsing of different file types
type FileParser struct {
	repoPath string
}

func NewFileParser(repoPath string) *FileParser {
	return &FileParser{repoPath: repoPath}
}

// GetLanguageStats calculates lines of code per language
func (p *FileParser) GetLanguageStats() []signals.LanguageStats {
	langMap := make(map[string]struct {
		lines int
		files int
	})

	const maxFiles = 10000 // Performance limit
	fileCount := 0

	filepath.Walk(p.repoPath, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return nil
		}

		// Performance: Early exit if too many files
		fileCount++
		if fileCount > maxFiles {
			log.Warn().Int("maxFiles", maxFiles).Msg("File limit reached, stopping scan")
			return filepath.SkipAll
		}

		// Skip common non-code directories
		if strings.Contains(path, "node_modules") ||
			strings.Contains(path, "vendor") ||
			strings.Contains(path, ".git") ||
			strings.Contains(path, "dist") ||
			strings.Contains(path, "build") {
			return nil
		}

		ext := strings.ToLower(filepath.Ext(path))
		lang := extToLanguage(ext)
		if lang == "" {
			return nil
		}

		lines := countLines(path)
		entry := langMap[lang]
		entry.lines += lines
		entry.files++
		langMap[lang] = entry

		return nil
	})

	// Calculate total lines
	totalLines := 0
	for _, stats := range langMap {
		totalLines += stats.lines
	}

	// Convert to slice
	var result []signals.LanguageStats
	for lang, stats := range langMap {
		percentage := 0.0
		if totalLines > 0 {
			percentage = float64(stats.lines) / float64(totalLines) * 100
		}
		result = append(result, signals.LanguageStats{
			Name:       lang,
			Lines:      stats.lines,
			Files:      stats.files,
			Percentage: percentage,
		})
	}

	return result
}

// GetPrimaryLanguage returns the most used programming language
// Excludes config files (JSON, YAML, HTML, CSS) from being primary
func (p *FileParser) GetPrimaryLanguage(stats []signals.LanguageStats) string {
	// Languages that should be considered as primary (actual code)
	codeLangs := map[string]bool{
		"TypeScript": true,
		"JavaScript": true,
		"Go":         true,
		"Python":     true,
		"Java":       true,
		"Rust":       true,
		"Ruby":       true,
		"PHP":        true,
		"C#":         true,
		"C++":        true,
		"C":          true,
		"Swift":      true,
		"Kotlin":     true,
		"Vue":        true,
		"Svelte":     true,
	}

	// Non-programming formats that should NEVER be primary
	nonCodeFormats := map[string]bool{
		"JSON":     true,
		"YAML":     true,
		"HTML":     true,
		"CSS":      true,
		"SCSS":     true,
		"Markdown": true,
		"XML":      true,
	}

	maxLines := 0
	primary := "Unknown"

	for _, s := range stats {
		// Only consider actual programming languages
		if codeLangs[s.Name] && s.Lines > maxLines {
			maxLines = s.Lines
			primary = s.Name
		}
	}

	// If no code language found, try any language that's NOT a config format
	if primary == "Unknown" && len(stats) > 0 {
		maxLines = 0 // Reset for second pass
		for _, s := range stats {
			// Never return JSON, YAML, HTML, CSS as primary
			if !nonCodeFormats[s.Name] && s.Lines > maxLines {
				maxLines = s.Lines
				primary = s.Name
			}
		}
	}

	return primary
}

// AnalyzeFolderStructure analyzes the folder organization
func (p *FileParser) AnalyzeFolderStructure() signals.FolderAnalysis {
	analysis := signals.FolderAnalysis{}
	var topLevelFolders []string

	entries, err := os.ReadDir(p.repoPath)
	if err != nil {
		log.Error().Err(err).Msg("Failed to read repo directory")
		return analysis
	}

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		name := strings.ToLower(entry.Name())
		if name == ".git" {
			continue
		}

		topLevelFolders = append(topLevelFolders, entry.Name())

		switch name {
		case "src", "source", "app":
			analysis.HasSrcFolder = true
		case "components":
			analysis.HasComponents = true
		case "utils", "helpers", "lib":
			analysis.HasUtils = true
		case "tests", "test", "__tests__", "spec":
			analysis.HasTests = true
		case "types", "@types", "typings":
			analysis.HasTypes = true
		case "config", "configs", "configuration":
			analysis.HasConfig = true
		case "docs", "documentation":
			analysis.HasDocs = true
		case "api", "routes", "router":
			analysis.HasAPI = true
		case "models", "entities", "entity":
			analysis.HasModels = true
		case "services", "service", "domain":
			analysis.HasServices = true
		case "middleware", "middlewares":
			analysis.HasMiddleware = true
		case "controllers", "controller", "handlers", "handler":
			analysis.HasControllers = true
		case "internal":
			analysis.HasInternal = true
		case "pkg":
			analysis.HasPkg = true
		case "cmd":
			analysis.HasCmd = true
		case "gateway", "api-gateway":
			analysis.HasGateway = true
		}
	}

	// Also check inside src folder for nested structure
	srcPath := filepath.Join(p.repoPath, "src")
	if entries, err := os.ReadDir(srcPath); err == nil {
		for _, entry := range entries {
			if !entry.IsDir() {
				continue
			}
			name := strings.ToLower(entry.Name())
			switch name {
			case "components":
				analysis.HasComponents = true
			case "utils", "helpers", "lib":
				analysis.HasUtils = true
			case "types", "@types":
				analysis.HasTypes = true
			case "api", "routes", "router":
				analysis.HasAPI = true
			case "models", "entities":
				analysis.HasModels = true
			case "services", "service", "domain":
				analysis.HasServices = true
			case "middleware", "middlewares":
				analysis.HasMiddleware = true
			case "controllers", "controller", "handlers":
				analysis.HasControllers = true
			}
		}
	}

	// For microservices: check inside services/ directory for each service's internal structure
	servicesDir := filepath.Join(p.repoPath, "services")
	if entries, err := os.ReadDir(servicesDir); err == nil {
		for _, serviceEntry := range entries {
			if !serviceEntry.IsDir() {
				continue
			}
			// Check each service's src/ folder
			serviceSrcPath := filepath.Join(servicesDir, serviceEntry.Name(), "src")
			if srcEntries, err := os.ReadDir(serviceSrcPath); err == nil {
				for _, entry := range srcEntries {
					if !entry.IsDir() {
						continue
					}
					name := strings.ToLower(entry.Name())
					switch name {
					case "api", "routes", "router":
						analysis.HasAPI = true
					case "models", "entities":
						analysis.HasModels = true
					case "services", "service", "domain":
						analysis.HasServices = true
					case "middleware", "middlewares":
						analysis.HasMiddleware = true
					case "controllers", "controller", "handlers":
						analysis.HasControllers = true
					case "types":
						analysis.HasTypes = true
					case "config", "configs":
						analysis.HasConfig = true
					}
				}
			}
		}
	}

	analysis.TopLevelFolders = topLevelFolders
	analysis.MaxDepth = p.calculateMaxDepth(p.repoPath, 0)
	analysis.OrganizationScore = p.calculateOrganizationScore(analysis)

	return analysis
}

// AnalyzeCodeSignals checks for common code quality indicators
// Uses recursive scanning and MULTI-LEVEL package.json analysis
func (p *FileParser) AnalyzeCodeSignals() signals.CodeSignals {
	cs := signals.CodeSignals{}

	// Recursive walk to find quality indicators anywhere in the project
	filepath.Walk(p.repoPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}

		// Skip common noise directories
		if info.IsDir() {
			name := info.Name()
			if name == "node_modules" || name == ".git" || name == "vendor" ||
				name == "__pycache__" || name == "dist" || name == "build" ||
				name == ".next" || name == "out" || name == "coverage" {
				return filepath.SkipDir
			}
			// If we find a 'tests' directory, count it as test presence
			if name == "tests" || name == "__tests__" || name == "test" || name == "spec" {
				cs.TestFilesCount += 5 // Significant bonus for dedicated test folders
			}
			return nil
		}

		name := strings.ToLower(info.Name())

		// Check ALL package.json files for dependencies
		if name == "package.json" {
			if content, err := os.ReadFile(path); err == nil {
				pkgContent := strings.ToLower(string(content))

				// Linting & Formatting
				if strings.Contains(pkgContent, "\"eslint\"") || strings.Contains(pkgContent, "eslint-config") {
					cs.HasLinting = true
				}
				if strings.Contains(pkgContent, "\"prettier\"") || strings.Contains(pkgContent, "prettier-plugin") {
					cs.HasPrettier = true
				}
				if strings.Contains(pkgContent, "\"typescript\"") || strings.Contains(pkgContent, "\"@types/") {
					cs.HasTypeScript = true
				}

				// Testing Frameworks
				if strings.Contains(pkgContent, "\"jest\"") || strings.Contains(pkgContent, "\"mocha\"") ||
					strings.Contains(pkgContent, "\"vitest\"") || strings.Contains(pkgContent, "\"cypress\"") ||
					strings.Contains(pkgContent, "\"playwright\"") || strings.Contains(pkgContent, "\"supertest\"") {
					if cs.TestFilesCount == 0 {
						cs.TestFilesCount = 1 // At least mark as having tests
					}
				}

				// CI/Hooks
				if strings.Contains(pkgContent, "\"husky\"") || strings.Contains(pkgContent, "\"lint-staged\"") {
					// Good indicator of quality, though not full CI
				}
			}
		}

		// Quality indicators - set to true if found anywhere
		switch {
		case name == "readme.md" || name == "readme":
			cs.HasReadme = true
		case name == "license" || name == "license.md":
			cs.HasLicense = true
		case name == ".gitignore":
			cs.HasGitignore = true
		case name == ".env.example" || name == ".env.sample" || name == ".env.template":
			cs.HasEnvExample = true
		case name == "dockerfile" || strings.HasPrefix(name, "dockerfile"):
			cs.HasDockerfile = true
		case name == "docker-compose.yml" || name == "docker-compose.yaml" || name == "compose.yml":
			cs.HasDockerCompose = true
		case name == ".eslintrc" || name == ".eslintrc.js" || name == ".eslintrc.json" ||
			name == "eslint.config.js" || name == "eslint.config.mjs":
			cs.HasLinting = true
		case name == ".prettierrc" || name == ".prettierrc.js" || name == "prettier.config.js":
			cs.HasPrettier = true
		case name == "tsconfig.json":
			cs.HasTypeScript = true
		case name == "makefile":
			cs.HasMakefile = true
		}

		// CI detection (files)
		rel, _ := filepath.Rel(p.repoPath, path)
		if strings.HasPrefix(rel, ".github/workflows") ||
			strings.HasPrefix(rel, ".gitlab-ci") ||
			name == "jenkinsfile" || name == ".travis.yml" ||
			name == "azure-pipelines.yml" || name == "circle.yml" {
			cs.HasCI = true
		}

		// Test file counting (Relaxed matching)
		if strings.Contains(name, ".test.") || strings.Contains(name, ".spec.") ||
			strings.HasSuffix(name, "_test.go") || strings.HasPrefix(name, "test_") ||
			strings.HasSuffix(name, "_test.py") ||
			(strings.Contains(path, "/tests/") && !info.IsDir() && (strings.HasSuffix(name, ".ts") || strings.HasSuffix(name, ".js") || strings.HasSuffix(name, ".go"))) {
			cs.TestFilesCount++
		}

		return nil
	})

	return cs
}

// Helper functions

func countLines(path string) int {
	file, err := os.Open(path)
	if err != nil {
		return 0
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	lines := 0
	for scanner.Scan() {
		lines++
	}
	return lines
}

func extToLanguage(ext string) string {
	// Only return actual programming languages - NOT config formats
	// JSON, YAML, XML are config files and should NOT be counted as languages
	mapping := map[string]string{
		".js":     "JavaScript",
		".jsx":    "JavaScript",
		".mjs":    "JavaScript",
		".cjs":    "JavaScript",
		".ts":     "TypeScript",
		".tsx":    "TypeScript",
		".mts":    "TypeScript",
		".go":     "Go",
		".py":     "Python",
		".java":   "Java",
		".rs":     "Rust",
		".rb":     "Ruby",
		".php":    "PHP",
		".cs":     "C#",
		".cpp":    "C++",
		".cc":     "C++",
		".cxx":    "C++",
		".c":      "C",
		".h":      "C",
		".hpp":    "C++",
		".swift":  "Swift",
		".kt":     "Kotlin",
		".vue":    "Vue",
		".svelte": "Svelte",
		// CSS/HTML are still useful for frontend detection but not as primary
		".css":  "CSS",
		".scss": "SCSS",
		".sass": "SCSS",
		".less": "CSS",
		".html": "HTML",
		".htm":  "HTML",
		// DO NOT include JSON, YAML, XML - they are config formats NOT languages
	}
	return mapping[ext]
}

func (p *FileParser) calculateMaxDepth(path string, currentDepth int) int {
	const maxDepth = 15 // Performance limit
	if currentDepth >= maxDepth {
		return currentDepth
	}

	maxDepthFound := currentDepth
	entries, err := os.ReadDir(path)
	if err != nil {
		return maxDepthFound
	}

	for _, entry := range entries {
		if entry.IsDir() && !strings.HasPrefix(entry.Name(), ".") &&
			entry.Name() != "node_modules" && entry.Name() != "vendor" {
			depth := p.calculateMaxDepth(filepath.Join(path, entry.Name()), currentDepth+1)
			if depth > maxDepthFound {
				maxDepthFound = depth
			}
		}
	}
	return maxDepthFound
}

func (p *FileParser) calculateOrganizationScore(analysis signals.FolderAnalysis) int {
	score := 0

	if analysis.HasSrcFolder {
		score += 20
	}
	if analysis.HasComponents {
		score += 15
	}
	if analysis.HasUtils {
		score += 10
	}
	if analysis.HasTests {
		score += 20
	}
	if analysis.HasTypes {
		score += 15
	}
	if analysis.HasConfig {
		score += 10
	}
	if analysis.HasDocs {
		score += 10
	}

	return score
}

// AnalyzeReact analyzes React-specific patterns
func (p *FileParser) AnalyzeReact() *signals.ReactSignals {
	rs := &signals.ReactSignals{}

	filepath.Walk(p.repoPath, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return nil
		}

		ext := filepath.Ext(path)
		if ext != ".jsx" && ext != ".tsx" && ext != ".js" && ext != ".ts" {
			return nil
		}

		content, err := os.ReadFile(path)
		if err != nil {
			return nil
		}
		text := string(content)

		// Component detection
		if strings.Contains(path, "components") || isReactComponent(text) {
			rs.ComponentCount++
		}

		// Custom hooks
		if regexp.MustCompile(`export\s+(const|function)\s+use[A-Z]`).MatchString(text) {
			rs.CustomHooksCount++
		}

		// Hook usage
		if strings.Contains(text, "useState") || strings.Contains(text, "useEffect") {
			rs.UsesHooks = true
		}
		if strings.Contains(text, "useMemo") {
			rs.UsesMemo = true
		}
		if strings.Contains(text, "useCallback") {
			rs.UsesCallback = true
		}
		if strings.Contains(text, "useContext") {
			rs.UsesContext = true
		}
		if strings.Contains(text, "useReducer") {
			rs.UsesReducer = true
		}
		if strings.Contains(text, "useRef") {
			rs.UsesRef = true
		}
		if strings.Contains(text, "React.lazy") || strings.Contains(text, "lazy(") {
			rs.UsesLazyLoading = true
		}
		if strings.Contains(text, "ErrorBoundary") {
			rs.UsesErrorBoundary = true
		}

		return nil
	})

	// Detect state management
	if p.fileContains("package.json", "redux") {
		rs.StateManagement = "Redux"
	} else if p.fileContains("package.json", "zustand") {
		rs.StateManagement = "Zustand"
	} else if p.fileContains("package.json", "recoil") {
		rs.StateManagement = "Recoil"
	} else if p.fileContains("package.json", "jotai") {
		rs.StateManagement = "Jotai"
	} else if rs.UsesContext {
		rs.StateManagement = "Context"
	}

	// Detect styling
	if p.fileContains("package.json", "tailwindcss") {
		rs.StyleApproach = "Tailwind"
	} else if p.fileContains("package.json", "styled-components") {
		rs.StyleApproach = "Styled Components"
	} else if p.fileContains("package.json", "@emotion") {
		rs.StyleApproach = "Emotion"
	} else {
		rs.StyleApproach = "CSS/SCSS"
	}

	if rs.ComponentCount == 0 {
		return nil // Not a React project
	}

	return rs
}

func isReactComponent(content string) bool {
	return strings.Contains(content, "React.Component") ||
		strings.Contains(content, "extends Component") ||
		regexp.MustCompile(`(const|function|export)\s+\w+\s*[=:]?\s*(props|\(\))?\s*=>\s*[\({]`).MatchString(content) ||
		strings.Contains(content, "return (") && strings.Contains(content, "<")
}

func (p *FileParser) fileContains(filename, substr string) bool {
	content, err := os.ReadFile(filepath.Join(p.repoPath, filename))
	if err != nil {
		return false
	}
	return strings.Contains(strings.ToLower(string(content)), strings.ToLower(substr))
}

// fileExists checks if a file exists at the given path (standalone helper)
func fileExists(path string) bool {
	info, err := os.Stat(path)
	return err == nil && !info.IsDir()
}
