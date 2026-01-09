package parser

import (
	"bufio"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

// ============================================
// PRODUCTION SAFETY LIMITS
// ============================================
const (
	// MaxFileSizeRead prevents OOM by skipping files larger than 5MB
	MaxFileSizeRead = 5 * 1024 * 1024 // 5MB

	// MaxFilesScanned prevents runaway scanning on huge repos
	MaxFilesScanned = 10000

	// MaxFileResults prevents memory bloat from too many matches
	MaxFileResults = 500
)

// ============================================
// HELPER FUNCTIONS
// ============================================

// findFiles finds files matching patterns (with production limits)
func (e *InfraExtractor) findFiles(patterns ...string) []string {
	var results []string
	filesScanned := 0

	filepath.Walk(e.repoPath, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return nil
		}

		// PRODUCTION LIMIT: Stop after too many files
		filesScanned++
		if filesScanned > MaxFilesScanned {
			return filepath.SkipAll
		}

		// PRODUCTION LIMIT: Stop after too many results
		if len(results) >= MaxFileResults {
			return filepath.SkipAll
		}

		// Skip vendor/node_modules
		if strings.Contains(path, "node_modules") ||
			strings.Contains(path, "vendor") ||
			strings.Contains(path, ".git") {
			return filepath.SkipDir
		}

		relPath, _ := filepath.Rel(e.repoPath, path)
		for _, pattern := range patterns {
			matched, _ := filepath.Match(pattern, info.Name())
			if matched {
				results = append(results, relPath)
				break
			}
		}

		return nil
	})

	return results
}

// findCodePattern searches for regex pattern in code files (with production limits)
func (e *InfraExtractor) findCodePattern(pattern string) bool {
	regex := regexp.MustCompile(pattern)
	found := false
	filesScanned := 0

	filepath.Walk(e.repoPath, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() || found {
			return nil
		}

		// PRODUCTION LIMIT: Stop after too many files
		filesScanned++
		if filesScanned > MaxFilesScanned {
			return filepath.SkipAll
		}

		// PRODUCTION LIMIT: Skip files too large to read safely
		if info.Size() > MaxFileSizeRead {
			return nil // Skip this file, continue scanning
		}

		// Skip non-code files
		ext := strings.ToLower(filepath.Ext(path))
		codeExts := map[string]bool{
			".go": true, ".js": true, ".ts": true, ".py": true,
			".java": true, ".rs": true, ".rb": true, ".cs": true,
			".jsx": true, ".tsx": true, // Add JSX/TSX
		}
		if !codeExts[ext] {
			return nil
		}

		// Skip vendor
		if strings.Contains(path, "node_modules") ||
			strings.Contains(path, "vendor") ||
			strings.Contains(path, ".git") {
			return filepath.SkipDir
		}

		file, err := os.Open(path)
		if err != nil {
			return nil
		}
		defer file.Close()

		scanner := bufio.NewScanner(file)
		for scanner.Scan() {
			if regex.MatchString(scanner.Text()) {
				found = true
				return filepath.SkipAll
			}
		}

		return nil
	})

	return found
}

// fileExists checks if a file exists relative to the repo root or absolute
func (e *InfraExtractor) fileExists(filename string) bool {
	// If it's absolute or relative to cwd, check directly
	if filepath.IsAbs(filename) {
		return fileExists(filename)
	}
	// Check relative to repo path
	return fileExists(filepath.Join(e.repoPath, filename))
}

// directoryExists checks if a directory exists relative to repo
func (e *InfraExtractor) directoryExists(dirname string) bool {
	info, err := os.Stat(filepath.Join(e.repoPath, dirname))
	return err == nil && info.IsDir()
}

// Global helper for general use
func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

// hasFrontendFolder checks if any frontend folder exists
func (e *InfraExtractor) hasFrontendFolder() bool {
	entries, err := os.ReadDir(e.repoPath)
	if err != nil {
		return false
	}
	for _, entry := range entries {
		if entry.IsDir() && isFrontendFolder(entry.Name()) {
			return true
		}
	}
	return false
}

// isFrontendFolder checks if a folder name indicates a frontend module
func isFrontendFolder(name string) bool {
	frontendIndicators := []string{
		"frontend", "client", "web", "webapp", "web-app", "ui", "dashboard",
		"admin", "portal", "app", "mobile", "react-app", "vue-app", "angular-app",
	}
	nameLower := strings.ToLower(name)
	for _, indicator := range frontendIndicators {
		if nameLower == indicator || strings.HasSuffix(nameLower, "-"+indicator) {
			return true
		}
	}
	return false
}

// isBackendFolder checks if a folder name indicates a backend service
func isBackendFolder(name string) bool {
	backendIndicators := []string{
		"backend", "server", "api", "api-server", "service", "svc",
		"worker", "processor", "consumer", "producer", "gateway", "core",
	}
	nameLower := strings.ToLower(name)
	for _, indicator := range backendIndicators {
		if nameLower == indicator || strings.HasPrefix(nameLower, indicator+"-") ||
			strings.HasSuffix(nameLower, "-"+indicator) || strings.Contains(nameLower, "-"+indicator+"-") {
			return true
		}
	}
	return false
}

// isInfraService checks if a service name is an infrastructure component
func isInfraService(serviceName string) bool {
	infraServices := []string{
		"postgres", "postgresql", "mysql", "mariadb", "mongo", "mongodb",
		"redis", "rabbitmq", "kafka", "zookeeper", "elasticsearch", "opensearch",
		"nginx", "traefik", "envoy", "haproxy", "mailhog", "localstack",
		"minio", "vault", "consul", "etcd", "adminer", "pgadmin",
	}

	nameLower := strings.ToLower(serviceName)
	for _, svc := range infraServices {
		if strings.Contains(nameLower, svc) {
			return true
		}
	}
	return false
}

// isMonorepo checks if the project has monorepo characteristics
func (e *InfraExtractor) isMonorepo() bool {
	// 1. Check for workspace configurations
	if e.fileExists("pnpm-workspace.yaml") || e.fileExists("lerna.json") || e.fileExists("nx.json") || e.fileExists("turbo.json") {
		return true
	}

	// 2. Check package.json workspaces
	pkgPath := filepath.Join(e.repoPath, "package.json")
	if fileExists(pkgPath) {
		content, err := os.ReadFile(pkgPath)
		if err == nil {
			return strings.Contains(string(content), "\"workspaces\"")
		}
	}

	// 3. Check for specific folder structure (modules, packages, apps)
	if e.directoryExists("packages") || e.directoryExists("apps") || e.directoryExists("modules") {
		// Only if they contain something
		if entries, err := os.ReadDir(filepath.Join(e.repoPath, "packages")); err == nil && len(entries) > 0 {
			return true
		}
		if entries, err := os.ReadDir(filepath.Join(e.repoPath, "apps")); err == nil && len(entries) > 0 {
			return true
		}
	}

	return false
}
