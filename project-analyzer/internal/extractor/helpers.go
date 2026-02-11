package extractor

import (
	"bufio"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/verifydev/project-analyzer/internal/debug"
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
// IMPROVEMENT: Priority scanning - checks important dirs first
func (e *InfraExtractor) findFiles(patterns ...string) []string {
	defer debug.Profile("findFiles:" + strings.Join(patterns, ","))()

	var results []string
	filesScanned := 0
	visited := make(map[string]bool) // Prevent duplicate scanning

	// PRIORITY DIRECTORIES - scan these first for better accuracy
	priorityDirs := []string{
		"src", "internal", "pkg", "cmd", "app", "apps",
		"lib", "core", "modules", "services", "api",
		"backend", "frontend", "server", "client",
		"handlers", "controllers", "routes", "middleware",
	}

	// Debug: Log scan start with root files
	debug.LogScanStart(patterns, e.repoPath)

	// Helper to scan a directory
	scanDir := func(baseDir string) {
		targetPath := filepath.Join(e.repoPath, baseDir)
		if _, err := os.Stat(targetPath); os.IsNotExist(err) {
			return
		}

		filepath.Walk(targetPath, func(path string, info os.FileInfo, err error) error {
			if err != nil || info.IsDir() {
				return nil
			}

			// Mark as visited
			visited[path] = true

			// PRODUCTION LIMIT: Stop after too many files
			filesScanned++
			if filesScanned > MaxFilesScanned {
				return filepath.SkipAll
			}

			// PRODUCTION LIMIT: Stop after too many results
			if len(results) >= MaxFileResults {
				return filepath.SkipAll
			}

			// Skip build artifacts (for files, just skip this file)
			if shouldSkipPath(path) {
				return nil
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
	}

	// Phase 1: Scan priority directories first
	for _, dir := range priorityDirs {
		if filesScanned > MaxFilesScanned || len(results) >= MaxFileResults {
			break
		}
		scanDir(dir)
	}

	// Phase 2: Scan remaining files in root (not already visited)
	filepath.Walk(e.repoPath, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return nil
		}

		// Skip if already visited in priority scan
		if visited[path] {
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

		// Skip build artifacts (for FILES, just skip this file; for dirs, SkipDir)
		if shouldSkipPath(path) {
			debug.LogFileSkip(path, "build artifact")
			return nil
		}

		relPath, _ := filepath.Rel(e.repoPath, path)
		for _, pattern := range patterns {
			matched, _ := filepath.Match(pattern, info.Name())
			if matched {
				debug.LogFileFound(relPath, pattern)
				results = append(results, relPath)
				break
			}
		}

		return nil
	})

	debug.LogScan(strings.Join(patterns, ","), len(results), e.repoPath)

	return results
}

// shouldSkipPath returns true if the path should be skipped (build artifacts, vendor, etc.)
// This checks for DIRECTORY names in the path, not substrings of filenames
func shouldSkipPath(path string) bool {
	// Skip directories that are build artifacts or dependencies
	skipDirs := []string{
		"/node_modules/", "/vendor/", "/.git/",
		"/dist/", "/build/", "/.next/", "/coverage/",
		"/.output/", "/__pycache__/", "/.cache/",
		"/target/", "/bin/", "/obj/",
	}

	// Normalize path separators for consistent matching
	normalizedPath := "/" + strings.ReplaceAll(path, "\\", "/") + "/"

	for _, pattern := range skipDirs {
		if strings.Contains(normalizedPath, pattern) {
			return true
		}
	}
	return false
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

// ============================================
// PHASE 0: EARLY EXIT HELPER FUNCTIONS
// ============================================

// isEmptyRepo checks if the repository is empty or contains no files
func (e *InfraExtractor) isEmptyRepo() bool {
	entries, err := os.ReadDir(e.repoPath)
	if err != nil {
		return true // If we can't read, treat as empty
	}

	// Check if there are any non-hidden files/folders
	for _, entry := range entries {
		name := entry.Name()
		// Skip hidden files/folders except .github
		if strings.HasPrefix(name, ".") && name != ".github" {
			continue
		}
		// Found at least one non-hidden entry
		return false
	}

	return true // Only hidden files found or empty
}

// isBinaryOnlyRepo checks if the repository contains only binary/compiled files
func (e *InfraExtractor) isBinaryOnlyRepo() bool {
	hasSourceCode := false
	hasBinaryFiles := false
	filesChecked := 0

	// Source code extensions
	sourceExts := map[string]bool{
		".go": true, ".js": true, ".ts": true, ".py": true,
		".java": true, ".rs": true, ".rb": true, ".cs": true,
		".jsx": true, ".tsx": true, ".vue": true, ".svelte": true,
		".php": true, ".swift": true, ".kt": true, ".scala": true,
		".c": true, ".cpp": true, ".h": true, ".hpp": true,
		".sh": true, ".bash": true, ".zsh": true,
	}

	// Binary extensions
	binaryExts := map[string]bool{
		".exe": true, ".dll": true, ".so": true, ".dylib": true,
		".jar": true, ".war": true, ".class": true,
		".o": true, ".a": true, ".lib": true,
		".pyc": true, ".pyo": true,
		".wasm": true, ".bin": true,
	}

	filepath.Walk(e.repoPath, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return nil
		}

		filesChecked++
		if filesChecked > 500 {
			return filepath.SkipAll // Early exit after checking enough files
		}

		// Skip vendor/node_modules
		if shouldSkipPath(path) {
			return filepath.SkipDir
		}

		ext := strings.ToLower(filepath.Ext(path))
		if sourceExts[ext] {
			hasSourceCode = true
			return filepath.SkipAll // Found source, exit early
		}
		if binaryExts[ext] {
			hasBinaryFiles = true
		}

		return nil
	})

	// Binary-only if we have binaries but no source code
	return hasBinaryFiles && !hasSourceCode
}
