package analyzer

// ============================================
// PROJECT TYPE DETECTION & HELPERS
// Quick heuristic detection of project type
// before running full analysis pipeline
// ============================================

import (
	"os"
	"path/filepath"
	"strings"
)

// quickDetectProjectType performs a fast heuristic detection of project type
// by checking key files and folders WITHOUT running full analysis.
// This runs BEFORE Phase 1 to gate which parsers run.
func quickDetectProjectType(repoPath string) string {
	// Check for monorepo tools first
	monorepoFiles := []string{"lerna.json", "nx.json", "turbo.json", "rush.json", "pnpm-workspace.yaml"}
	for _, f := range monorepoFiles {
		if fileExists(filepath.Join(repoPath, f)) {
			return "fullstack"
		}
	}

	// Read root package.json for framework detection
	pkgData, pkgErr := os.ReadFile(filepath.Join(repoPath, "package.json"))
	pkgContent := ""
	if pkgErr == nil {
		pkgContent = string(pkgData)

		if strings.Contains(pkgContent, "\"workspaces\"") {
			return "fullstack"
		}
	}

	hasGoMod := fileExists(filepath.Join(repoPath, "go.mod"))

	// Detect frontend signals
	hasFrontendFramework := false
	if pkgContent != "" {
		hasFrontendFramework = strings.Contains(pkgContent, "\"react\"") ||
			strings.Contains(pkgContent, "\"vue\"") ||
			strings.Contains(pkgContent, "\"@angular/core\"") ||
			strings.Contains(pkgContent, "\"svelte\"") ||
			strings.Contains(pkgContent, "\"next\"")
	}

	// Detect backend signals from SAME package.json
	hasBackendFramework := false
	if pkgContent != "" {
		hasBackendFramework = strings.Contains(pkgContent, "\"express\"") ||
			strings.Contains(pkgContent, "\"@nestjs/core\"") ||
			strings.Contains(pkgContent, "\"fastify\"") ||
			strings.Contains(pkgContent, "\"koa\"") ||
			strings.Contains(pkgContent, "\"hapi\"")
	}

	// Detect folder structure hints
	hasComponentsDir := dirExists(filepath.Join(repoPath, "components")) ||
		dirExists(filepath.Join(repoPath, "src", "components"))
	hasPagesDir := dirExists(filepath.Join(repoPath, "pages")) ||
		dirExists(filepath.Join(repoPath, "src", "pages")) ||
		dirExists(filepath.Join(repoPath, "app"))
	hasAPIDir := dirExists(filepath.Join(repoPath, "api")) ||
		dirExists(filepath.Join(repoPath, "src", "api")) ||
		dirExists(filepath.Join(repoPath, "routes")) ||
		dirExists(filepath.Join(repoPath, "src", "routes")) ||
		dirExists(filepath.Join(repoPath, "controllers")) ||
		dirExists(filepath.Join(repoPath, "src", "controllers"))
	hasInternalDir := dirExists(filepath.Join(repoPath, "internal"))
	hasCmdDir := dirExists(filepath.Join(repoPath, "cmd"))

	// Pure Go backend
	if hasGoMod && !hasFrontendFramework {
		return "backend"
	}

	// Frontend + backend in same package.json
	if hasFrontendFramework && hasBackendFramework {
		isNextJS := strings.Contains(pkgContent, "\"next\"")
		hasExpressOnly := strings.Contains(pkgContent, "\"express\"") &&
			!strings.Contains(pkgContent, "\"@nestjs/core\"") &&
			!strings.Contains(pkgContent, "\"fastify\"")

		if isNextJS && hasExpressOnly && !hasAPIDir && !hasInternalDir {
			return "frontend"
		}
		return "fullstack"
	}

	// Pure frontend
	if hasFrontendFramework && !hasBackendFramework && !hasGoMod {
		return "frontend"
	}

	// Pure Node.js backend
	if hasBackendFramework && !hasFrontendFramework {
		return "backend"
	}

	// Go standard layout
	if hasGoMod && (hasInternalDir || hasCmdDir) {
		return "backend"
	}

	// Component-heavy = frontend
	if (hasComponentsDir || hasPagesDir) && !hasAPIDir && !hasInternalDir && !hasCmdDir {
		return "frontend"
	}

	// Backend-heavy structure
	if (hasAPIDir || hasInternalDir || hasCmdDir) && !hasComponentsDir && !hasPagesDir {
		return "backend"
	}

	return "fullstack" // Safe default
}

// ============================================
// UTILITY HELPERS
// ============================================

// appendUnique adds an item to slice if not already present
func appendUnique(slice []string, item string) []string {
	for _, s := range slice {
		if s == item {
			return slice
		}
	}
	return append(slice, item)
}

// isDatabase checks if a tech name is a database technology
func isDatabase(name string) bool {
	dbs := map[string]bool{
		"PostgreSQL": true, "MySQL": true, "MongoDB": true, "Redis": true,
		"DynamoDB": true, "Cassandra": true, "Elasticsearch": true,
		"SQLite": true, "MariaDB": true, "Firestore": true,
		"Prisma": true, "TypeORM": true, "GORM": true, "Mongoose": true,
	}
	return dbs[name]
}

// isTool checks if a tech name is a DevOps/infrastructure tool
func isTool(name string) bool {
	tools := map[string]bool{
		"Docker": true, "Docker Compose": true, "Kubernetes": true, "Helm": true,
		"AWS": true, "AWS S3": true, "Google Cloud": true, "Azure": true,
		"Terraform": true, "Pulumi": true,
		"GitHub Actions": true, "GitLab CI": true, "Jenkins": true,
		"Kafka": true, "RabbitMQ": true, "NATS": true, "AWS SQS": true,
		"Prometheus": true, "Grafana": true, "Sentry": true, "Datadog": true, "OpenTelemetry": true,
		"Supabase": true, "Firebase": true, "Vercel": true, "Netlify": true,
		"Jest": true, "Cypress": true, "Playwright": true,
	}
	return tools[name]
}

// fileExists checks if a file exists at the given path
func fileExists(path string) bool {
	info, err := os.Stat(path)
	return err == nil && !info.IsDir()
}

// dirExists checks if a directory exists at the given path
func dirExists(path string) bool {
	info, err := os.Stat(path)
	return err == nil && info.IsDir()
}
