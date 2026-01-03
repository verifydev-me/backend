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

	filepath.Walk(p.repoPath, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return nil
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

// GetPrimaryLanguage returns the most used language
func (p *FileParser) GetPrimaryLanguage(stats []signals.LanguageStats) string {
	maxLines := 0
	primary := ""
	for _, s := range stats {
		if s.Lines > maxLines {
			maxLines = s.Lines
			primary = s.Name
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
		}
	}

	analysis.TopLevelFolders = topLevelFolders
	analysis.MaxDepth = p.calculateMaxDepth(p.repoPath, 0)
	analysis.OrganizationScore = p.calculateOrganizationScore(analysis)

	return analysis
}

// AnalyzeCodeSignals checks for common code quality indicators
func (p *FileParser) AnalyzeCodeSignals() signals.CodeSignals {
	cs := signals.CodeSignals{}

	// Check root files
	files, _ := os.ReadDir(p.repoPath)
	for _, f := range files {
		name := strings.ToLower(f.Name())
		switch {
		case name == "readme.md" || name == "readme":
			cs.HasReadme = true
		case name == "license" || name == "license.md":
			cs.HasLicense = true
		case name == ".gitignore":
			cs.HasGitignore = true
		case name == ".env.example" || name == ".env.sample":
			cs.HasEnvExample = true
		case name == "dockerfile" || strings.HasPrefix(name, "dockerfile"):
			cs.HasDockerfile = true
		case name == ".eslintrc" || name == ".eslintrc.js" || name == ".eslintrc.json" || name == "eslint.config.js":
			cs.HasLinting = true
		case name == ".prettierrc" || name == ".prettierrc.js" || name == "prettier.config.js":
			cs.HasPrettier = true
		case name == "tsconfig.json":
			cs.HasTypeScript = true
		}
	}

	// Check for CI/CD
	if _, err := os.Stat(filepath.Join(p.repoPath, ".github/workflows")); err == nil {
		cs.HasCI = true
	}
	if _, err := os.Stat(filepath.Join(p.repoPath, ".gitlab-ci.yml")); err == nil {
		cs.HasCI = true
	}

	// Count test files
	filepath.Walk(p.repoPath, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return nil
		}
		name := strings.ToLower(info.Name())
		if strings.Contains(name, ".test.") || strings.Contains(name, ".spec.") || strings.HasSuffix(name, "_test.go") {
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
	mapping := map[string]string{
		".js":     "JavaScript",
		".jsx":    "JavaScript",
		".ts":     "TypeScript",
		".tsx":    "TypeScript",
		".go":     "Go",
		".py":     "Python",
		".java":   "Java",
		".rs":     "Rust",
		".rb":     "Ruby",
		".php":    "PHP",
		".cs":     "C#",
		".cpp":    "C++",
		".c":      "C",
		".swift":  "Swift",
		".kt":     "Kotlin",
		".vue":    "Vue",
		".svelte": "Svelte",
		".css":    "CSS",
		".scss":   "SCSS",
		".html":   "HTML",
		".json":   "JSON",
		".yaml":   "YAML",
		".yml":    "YAML",
	}
	return mapping[ext]
}

func (p *FileParser) calculateMaxDepth(path string, currentDepth int) int {
	maxDepth := currentDepth
	entries, err := os.ReadDir(path)
	if err != nil {
		return maxDepth
	}

	for _, entry := range entries {
		if entry.IsDir() && !strings.HasPrefix(entry.Name(), ".") &&
			entry.Name() != "node_modules" && entry.Name() != "vendor" {
			depth := p.calculateMaxDepth(filepath.Join(path, entry.Name()), currentDepth+1)
			if depth > maxDepth {
				maxDepth = depth
			}
		}
	}
	return maxDepth
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
