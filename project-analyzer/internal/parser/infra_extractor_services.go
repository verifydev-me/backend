package parser

import (
	"os"
	"path/filepath"
	"strings"

	"github.com/verifydev/project-analyzer/pkg/signals"
)

// ============================================
// SERVICE STRUCTURE EXTRACTION
// ============================================

// extractServiceStructureSignals detects microservice patterns vs monorepo
func (e *InfraExtractor) extractServiceStructureSignals() {
	entries, err := os.ReadDir(e.repoPath)
	if err != nil {
		return
	}

	// First, check if this is a monorepo
	if e.isMonorepo() {
		e.signals.AddSignal(signals.SignalMonorepo, 0.95, []string{"Monorepo configuration detected (workspaces/lerna/nx/turbo)"}, "config")
	}

	servicePatterns := []string{
		"service", "svc", "api", "gateway", "worker", "processor", "consumer", "producer",
	}

	learningPatterns := []string{
		"task", "phase", "part", "chapter", "lesson", "example", "sample", "assignment", "day", "step", "tutorial",
	}

	var potentialServices []string
	var frontendFolders []string
	var backendFolders []string
	var learningFolders []string

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		name := entry.Name()
		nameLower := strings.ToLower(name)

		// Skip hidden directories
		if strings.HasPrefix(name, ".") {
			continue
		}

		// Check for learning/task folders first
		isLearning := false
		for _, lp := range learningPatterns {
			if strings.Contains(nameLower, lp) {
				learningFolders = append(learningFolders, name)
				isLearning = true
				break
			}
		}
		if isLearning {
			continue // Don't count "task-1", "phase-2" as proper microservices
		}

		// Categorize folders
		if isFrontendFolder(name) {
			frontendFolders = append(frontendFolders, name)
			continue // Don't count frontend as a service
		}

		if isBackendFolder(name) {
			backendFolders = append(backendFolders, name)
		}

		// Check for service pattern names (excluding frontend folders)
		for _, pattern := range servicePatterns {
			if strings.Contains(nameLower, pattern) {
				potentialServices = append(potentialServices, name)
				break
			}
		}

		// Check if directory has its own package.json or go.mod (independent module)
		// But NOT if it's a frontend folder
		servicePath := filepath.Join(e.repoPath, name)
		hasIndependentPackage := fileExists(filepath.Join(servicePath, "package.json")) ||
			fileExists(filepath.Join(servicePath, "go.mod")) ||
			fileExists(filepath.Join(servicePath, "Dockerfile"))

		if hasIndependentPackage && !isFrontendFolder(name) {
			if !contains(potentialServices, name) {
				potentialServices = append(potentialServices, name)
			}
		}
	}

	// Mark if frontend exists
	if len(frontendFolders) > 0 {
		e.signals.AddSignal(signals.SignalFrontendOnly, 0.85, frontendFolders, "frontend_detection")
	}

	// Mark if backend exists
	if len(backendFolders) > 0 {
		e.signals.AddSignal(signals.SignalBackendOnly, 0.85, backendFolders, "backend_detection")
	}

	// If meaningful learning folders found, treat as MultiProjectRepo not Microservices
	if len(learningFolders) > 1 {
		// Just log them as potential services but don't flag "MultipleServices" signal which triggers Microservices Architecture
		// We can add a "LearningRepo" signal if we had one, for now just avoid the False Positive.
		return
	}

	// Filter out frontend folders from potential services
	var actualBackendServices []string
	for _, svc := range potentialServices {
		if !isFrontendFolder(svc) {
			actualBackendServices = append(actualBackendServices, svc)
		}
	}

	// Case 1: It's a monorepo with frontend + backend
	if len(frontendFolders) > 0 && len(actualBackendServices) >= 1 {
		e.signals.AddSignal(signals.SignalMonorepo, 0.90,
			append(frontendFolders, actualBackendServices...),
			"monorepo_structure")
		// DON'T return early - continue to check for microservices
	}

	// Case 2: Has workspace config (monorepo tools)
	if e.isMonorepo() {
		e.signals.AddSignal(signals.SignalMonorepo, 0.90,
			actualBackendServices,
			"workspace_monorepo")
		// DON'T return early - continue to check for microservices
	}

	// Case 3: Microservices - 2+ independent backend services
	// This can COEXIST with monorepo signal (microservices in a monorepo)
	if len(actualBackendServices) >= 2 {
		e.signals.AddSignal(signals.SignalMultipleServices, 0.9, actualBackendServices, "service_dirs")
		e.signals.AddSignal(signals.SignalServiceIsolation, 0.85, actualBackendServices, "independent_services")
	}

	// Always set service count and names
	e.signals.ServiceCount = len(actualBackendServices)
	e.signals.ServiceNames = actualBackendServices
}

// extractDeepServiceSignals scans nested service folders for dependencies
func (e *InfraExtractor) extractDeepServiceSignals() {
	// 1. Scan specific "service" containers (nested pattern)
	serviceFolders := []string{
		"services", "apps", "packages", "libs", "modules",
		"backend", "microservices",
	}

	for _, folder := range serviceFolders {
		folderPath := filepath.Join(e.repoPath, folder)
		if !fileExists(folderPath) {
			continue
		}

		entries, err := os.ReadDir(folderPath)
		if err != nil {
			continue
		}

		for _, entry := range entries {
			if !entry.IsDir() {
				continue
			}
			e.analyzeServiceFolder(folderPath, entry.Name())
		}
	}

	// 2. Scan Root-Level Services (e.g., auth-service, user-service)
	rootEntries, err := os.ReadDir(e.repoPath)
	if err == nil {
		for _, entry := range rootEntries {
			if !entry.IsDir() {
				continue
			}

			// Skip common non-service folders
			name := entry.Name()
			if strings.HasPrefix(name, ".") || name == "node_modules" || name == "dist" || name == "build" || name == "vendor" {
				continue
			}

			// Check if this looks like a service (has package.json, go.mod, or Dockerfile)
			isService := false
			checkPath := filepath.Join(e.repoPath, name)

			if fileExists(filepath.Join(checkPath, "package.json")) ||
				fileExists(filepath.Join(checkPath, "go.mod")) ||
				fileExists(filepath.Join(checkPath, "requirements.txt")) ||
				fileExists(filepath.Join(checkPath, "pom.xml")) ||
				fileExists(filepath.Join(checkPath, "Dockerfile")) {
				isService = true
			}

			if isService {
				// Don't re-scan if it was already caught in step 1 (unlikely given naming)
				e.analyzeServiceFolder(e.repoPath, name)
			}
		}
	}

	// 3. Scan Gateway specifically
	gatewayPath := filepath.Join(e.repoPath, "gateway")
	if fileExists(gatewayPath) {
		e.scanGateway(gatewayPath)
		e.analyzeServiceFolder(e.repoPath, "gateway") // Also scan as a generic service
	} else {
		// Try "api-gateway"
		gatewayPath = filepath.Join(e.repoPath, "api-gateway")
		if fileExists(gatewayPath) {
			e.scanGateway(gatewayPath)
			e.analyzeServiceFolder(e.repoPath, "api-gateway")
		}
	}
}

// analyzeServiceFolder scans a specific service folder for all tech
func (e *InfraExtractor) analyzeServiceFolder(parentPath, serviceName string) {
	servicePath := filepath.Join(parentPath, serviceName)

	e.scanServicePackageJSON(servicePath, serviceName)
	e.scanServiceGoMod(servicePath, serviceName)
	e.scanServicePython(servicePath, serviceName)
	e.scanServiceDockerfile(servicePath, serviceName)
	e.scanServicePrisma(servicePath, serviceName)
}
