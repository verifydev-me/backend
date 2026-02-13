package graph

import (
	"fmt"
	"math"
	"strings"

	astengine "github.com/verifydev/project-analyzer/internal/ast"
	"github.com/verifydev/project-analyzer/pkg/signals"

	"github.com/rs/zerolog/log"
)

// ============================================
// DEPENDENCY GRAPH BUILDER
// Constructs technology graph from AST + Infra signals
// and performs graph-based skill inference
// ============================================

// Builder constructs and analyzes the technology dependency graph
type Builder struct {
	graph         *TechGraph
	stackPatterns []StackPattern
}

// NewBuilder creates a new graph builder with predefined stack patterns
func NewBuilder() *Builder {
	b := &Builder{
		graph: &TechGraph{
			Nodes: make(map[string]*TechNode),
			Edges: make([]*TechEdge, 0),
		},
	}
	b.loadStackPatterns()
	b.loadRelationshipRules()
	return b
}

// BuildFromSources constructs the graph from AST results and infra signals
func (b *Builder) BuildFromSources(astResult *astengine.ProjectASTResult, infraSignals *signals.InfrastructureSignals) *TechGraph {
	// 1. Add nodes from AST technology usage
	if astResult != nil {
		for name, usage := range astResult.TechnologyUsage {
			nodeID := normalizeID(name)
			b.graph.Nodes[nodeID] = &TechNode{
				ID:          nodeID,
				Name:        name,
				Category:    categorizeTech(name),
				SubCategory: subCategorizeTech(name),
				Weight:      usage.Intensity,
				FileCount:   usage.FileCount,
				ImportCount: usage.ImportCount,
				CallCount:   usage.CallCount,
				Evidence:    usage.Evidence,
				Sources:     []string{"ast"},
			}
		}

		// Add pattern-based nodes
		for _, file := range astResult.Files {
			for _, pattern := range file.Patterns {
				nodeID := normalizeID(pattern.Name)
				if _, exists := b.graph.Nodes[nodeID]; !exists {
					b.graph.Nodes[nodeID] = &TechNode{
						ID:           nodeID,
						Name:         pattern.Name,
						Category:     "pattern",
						SubCategory:  pattern.Type,
						Weight:       pattern.Confidence * 0.5,
						CodePatterns: 1,
						Evidence:     []string{pattern.Evidence},
						Sources:      []string{"ast_pattern"},
					}
				} else {
					b.graph.Nodes[nodeID].CodePatterns++
				}
			}
		}
	}

	// 2. Add nodes from infrastructure signals
	if infraSignals != nil {
		for _, sig := range infraSignals.Signals {
			name := infraSignalToTechName(sig)
			if name == "" {
				continue
			}

			nodeID := normalizeID(name)
			if existing, exists := b.graph.Nodes[nodeID]; exists {
				// Merge: AST + Infra both detected it = higher confidence
				existing.Sources = appendUnique(existing.Sources, "infra")
				if detail, ok := infraSignals.SignalDetails[sig]; ok {
					existing.Evidence = append(existing.Evidence, detail.Evidence...)
					// Boost weight when both AST and infra detect it
					existing.Weight = math.Min(existing.Weight+0.15, 1.0)
				}
			} else {
				confidence := 0.7
				evidence := []string{}
				if detail, ok := infraSignals.SignalDetails[sig]; ok {
					confidence = detail.Confidence
					evidence = detail.Evidence
				}

				b.graph.Nodes[nodeID] = &TechNode{
					ID:          nodeID,
					Name:        name,
					Category:    categorizeTech(name),
					SubCategory: subCategorizeTech(name),
					Weight:      confidence * 0.5,
					Evidence:    evidence,
					Sources:     []string{"infra"},
				}
			}
		}
	}

	// 3. Build edges between co-occurring technologies
	b.buildEdges(astResult)

	log.Info().
		Int("nodes", len(b.graph.Nodes)).
		Int("edges", len(b.graph.Edges)).
		Msg("[Graph] Technology graph built")

	return b.graph
}

// Analyze performs graph-based analysis to infer skills and detect stacks
func (b *Builder) Analyze() *GraphAnalysisResult {
	result := &GraphAnalysisResult{
		TotalNodes: len(b.graph.Nodes),
		TotalEdges: len(b.graph.Edges),
	}

	// 1. Detect tech stacks
	result.DetectedStacks = b.detectStacks()

	// 2. Infer skills from graph connections
	result.InferredSkills = b.inferSkillsFromGraph()

	// 3. Find technology clusters
	result.Clusters = b.findClusters()

	// 4. Populate raw graph data
	result.Nodes = make([]TechNode, 0, len(b.graph.Nodes))
	for _, node := range b.graph.Nodes {
		result.Nodes = append(result.Nodes, *node)
	}

	result.Edges = make([]TechEdge, 0, len(b.graph.Edges))
	for _, edge := range b.graph.Edges {
		result.Edges = append(result.Edges, *edge)
	}

	// 4. Calculate graph metrics
	b.calculateMetrics(result)

	log.Info().
		Int("stacks", len(result.DetectedStacks)).
		Int("inferredSkills", len(result.InferredSkills)).
		Int("clusters", len(result.Clusters)).
		Msg("[Graph] Analysis complete")

	return result
}

// buildEdges creates weighted edges between technologies
func (b *Builder) buildEdges(astResult *astengine.ProjectASTResult) {
	if astResult == nil {
		return
	}

	// Co-occurrence: technologies that appear in the same file
	fileToTechs := make(map[string][]string) // file -> [tech names]

	for _, file := range astResult.Files {
		techs := []string{}
		for _, imp := range file.Imports {
			tech := ""
			switch file.Language {
			case "typescript", "tsx", "javascript", "jsx":
				if t, ok := astengine.KnownImportSignals[imp.Source]; ok {
					tech = t
				}
			case "go":
				if t, ok := astengine.GoImportSignals[imp.Source]; ok {
					tech = t
				}
			case "python":
				if t, ok := astengine.PythonImportSignals[imp.Source]; ok {
					tech = t
				}
			}
			if tech != "" {
				techs = appendUnique(techs, tech)
			}
		}
		if len(techs) > 1 {
			fileToTechs[file.FilePath] = techs
		}
	}

	// Build co-occurrence matrix
	coOccurrence := make(map[string]map[string]int) // tech1 -> tech2 -> count

	for _, techs := range fileToTechs {
		for i := 0; i < len(techs); i++ {
			for j := i + 1; j < len(techs); j++ {
				t1, t2 := techs[i], techs[j]
				if t1 > t2 {
					t1, t2 = t2, t1 // Normalize order
				}
				if coOccurrence[t1] == nil {
					coOccurrence[t1] = make(map[string]int)
				}
				coOccurrence[t1][t2]++
			}
		}
	}

	// Create edges from co-occurrences
	totalFiles := len(fileToTechs)
	if totalFiles == 0 {
		totalFiles = 1
	}

	for t1, targets := range coOccurrence {
		for t2, count := range targets {
			// Weight based on co-occurrence frequency
			weight := math.Min(float64(count)/float64(totalFiles)*3, 1.0)
			if weight < 0.1 {
				continue // Skip very weak connections
			}

			b.graph.Edges = append(b.graph.Edges, &TechEdge{
				From:       normalizeID(t1),
				To:         normalizeID(t2),
				Type:       "uses_with",
				Weight:     math.Round(weight*100) / 100,
				Evidence:   fmt.Sprintf("%s and %s co-occur in %d files", t1, t2, count),
				Confidence: math.Min(weight+0.3, 1.0),
			})
		}
	}

	// Add known dependency edges
	b.addKnownDependencies()
}

// addKnownDependencies adds well-known technology relationships
func (b *Builder) addKnownDependencies() {
	knownDeps := []struct {
		from, to, edgeType, evidence string
		weight                       float64
	}{
		// React ecosystem
		{"react", "react-router", "uses_with", "React apps commonly use React Router for navigation", 0.8},
		{"react", "redux", "uses_with", "Redux is a common state management for React", 0.7},
		{"react", "react-query", "uses_with", "React Query handles data fetching in React apps", 0.7},
		{"nextjs", "react", "extends", "Next.js is built on React", 0.95},

		// Backend
		{"express", "jwt", "uses_with", "Express apps commonly use JWT for auth", 0.7},
		{"nestjs", "typescript", "depends_on", "NestJS requires TypeScript", 0.95},
		{"prisma", "postgresql", "uses_with", "Prisma commonly connects to PostgreSQL", 0.7},

		// Go ecosystem
		{"gin", "gorm", "uses_with", "Gin and GORM are commonly used together", 0.7},
		{"gin", "go-concurrency", "uses_with", "Go web frameworks use goroutines", 0.8},

		// DevOps
		{"docker", "docker-compose", "extends", "Docker Compose extends Docker", 0.9},
		{"kubernetes", "docker", "depends_on", "K8s deploys Docker containers", 0.9},
		{"prometheus", "grafana", "uses_with", "Prometheus metrics displayed in Grafana", 0.85},

		// Python
		{"fastapi", "pydantic", "depends_on", "FastAPI depends on Pydantic for validation", 0.95},
		{"django", "django-rest-framework", "extends", "DRF extends Django for APIs", 0.9},
	}

	for _, dep := range knownDeps {
		fromID := normalizeID(dep.from)
		toID := normalizeID(dep.to)

		// Only add edge if both nodes exist in the graph
		if _, fromExists := b.graph.Nodes[fromID]; !fromExists {
			continue
		}
		if _, toExists := b.graph.Nodes[toID]; !toExists {
			continue
		}

		b.graph.Edges = append(b.graph.Edges, &TechEdge{
			From:       fromID,
			To:         toID,
			Type:       dep.edgeType,
			Weight:     dep.weight,
			Evidence:   dep.evidence,
			Confidence: dep.weight,
		})
	}
}

// detectStacks matches the graph against known technology stack patterns
func (b *Builder) detectStacks() []DetectedStack {
	detected := []DetectedStack{}

	for _, pattern := range b.stackPatterns {
		matched := []string{}
		missing := []string{}

		// Check required technologies
		allRequired := true
		for _, req := range pattern.Required {
			reqID := normalizeID(req)
			if _, exists := b.graph.Nodes[reqID]; exists {
				matched = append(matched, req)
			} else {
				allRequired = false
				missing = append(missing, req)
			}
		}

		// Check optional technologies
		for _, opt := range pattern.Optional {
			optID := normalizeID(opt)
			if _, exists := b.graph.Nodes[optID]; exists {
				matched = append(matched, opt)
			}
		}

		// Calculate match
		totalPossible := len(pattern.Required) + len(pattern.Optional)
		if totalPossible == 0 {
			continue
		}

		matchRatio := float64(len(matched)) / float64(totalPossible)

		// Check if meets minimum match requirement
		if len(matched) >= pattern.MinMatch && (allRequired || len(pattern.Required) == 0) {
			confidence := matchRatio * 0.6
			if allRequired {
				confidence += 0.35 // Big boost for all required being present
			}
			confidence = math.Min(confidence, 0.99)

			// Build evidence
			evidence := []string{}
			for _, m := range matched {
				if node, exists := b.graph.Nodes[normalizeID(m)]; exists {
					if len(node.Evidence) > 0 {
						evidence = append(evidence, node.Evidence[0])
					}
				}
			}

			detected = append(detected, DetectedStack{
				Pattern:    pattern,
				MatchCount: len(matched),
				Matched:    matched,
				Missing:    missing,
				Confidence: math.Round(confidence*100) / 100,
				Evidence:   evidence,
			})
		}
	}

	return detected
}

// inferSkillsFromGraph uses graph structure to infer higher-level skills
func (b *Builder) inferSkillsFromGraph() []InferredSkill {
	skills := []InferredSkill{}

	// Rule 1: Full-Stack Development (frontend + backend + database)
	hasFrontend := b.hasNodeInCategory("frontend")
	hasBackend := b.hasNodeInCategory("backend")
	hasDatabase := b.hasNodeInCategory("database")

	if hasFrontend && hasBackend && hasDatabase {
		skills = append(skills, InferredSkill{
			Name:        "Full-Stack Development",
			Category:    "architecture",
			Level:       "advanced",
			Confidence:  0.90,
			Reasoning:   "Project has frontend, backend, and database technologies - indicates full-stack capability",
			BasedOn:     b.getNodesInCategories("frontend", "backend", "database"),
			Evidence:    []string{"Frontend + Backend + Database stack detected via AST import analysis"},
			ResumeReady: true,
		})
	}

	// Rule 2: API Development (backend framework + database + auth/validation)
	hasAuth := b.hasNodeByName("JWT") || b.hasNodeByName("Password Hashing") || b.hasNodeByName("Passport.js")
	if hasBackend && hasDatabase && hasAuth {
		skills = append(skills, InferredSkill{
			Name:        "RESTful API Development",
			Category:    "architecture",
			Level:       "intermediate",
			Confidence:  0.88,
			Reasoning:   "Backend framework + database + authentication = production API skills",
			BasedOn:     b.getNodesInCategories("backend", "database"),
			Evidence:    []string{"API development stack with auth detected"},
			ResumeReady: true,
		})
	}

	// Rule 3: Microservices (multiple backend techs + message queue + docker)
	hasMessageQueue := b.hasNodeByName("RabbitMQ") || b.hasNodeByName("Kafka") || b.hasNodeByName("BullMQ")
	hasDocker := b.hasNodeByName("Docker") || b.hasNodeInCategory("container")
	backendCount := b.countNodesInCategory("backend")

	if hasMessageQueue && hasDocker && backendCount >= 2 {
		skills = append(skills, InferredSkill{
			Name:        "Microservices Architecture",
			Category:    "architecture",
			Level:       "advanced",
			Confidence:  0.85,
			Reasoning:   "Message queue + Docker + multiple backend services = microservices",
			BasedOn:     b.getNodesInCategories("backend", "messaging", "container"),
			Evidence:    []string{"Microservices architecture inferred from technology graph"},
			ResumeReady: true,
		})
	}

	// Rule 4: DevOps Skills (CI/CD + Docker + monitoring)
	hasCICD := b.hasNodeByName("GitHub Actions") || b.hasNodeInCategory("cicd")
	hasMonitoring := b.hasNodeByName("Prometheus") || b.hasNodeByName("Sentry") || b.hasNodeByName("Winston Logger") || b.hasNodeByName("Pino Logger")

	if hasCICD && hasDocker {
		level := "intermediate"
		confidence := 0.82
		if hasMonitoring {
			level = "advanced"
			confidence = 0.90
		}
		skills = append(skills, InferredSkill{
			Name:        "DevOps & CI/CD",
			Category:    "devops",
			Level:       level,
			Confidence:  confidence,
			Reasoning:   "CI/CD pipeline + containerization suggests DevOps capability",
			BasedOn:     b.getNodesInCategories("cicd", "container", "observability"),
			Evidence:    []string{"DevOps stack detected via technology graph"},
			ResumeReady: confidence >= 0.80,
		})
	}

	// Rule 5: Cloud-Native (cloud services + K8s/serverless)
	hasCloud := b.hasNodeInCategory("cloud")
	hasK8s := b.hasNodeByName("Kubernetes")
	if hasCloud && (hasK8s || hasDocker) {
		skills = append(skills, InferredSkill{
			Name:        "Cloud-Native Development",
			Category:    "cloud",
			Level:       "advanced",
			Confidence:  0.85,
			Reasoning:   "Cloud services + container orchestration = cloud-native skills",
			BasedOn:     b.getNodesInCategories("cloud", "container"),
			Evidence:    []string{"Cloud-native stack detected"},
			ResumeReady: true,
		})
	}

	// Rule 6: Testing Maturity (multiple test types)
	testTechs := b.countNodesInCategory("testing")
	if testTechs >= 2 {
		level := "intermediate"
		if testTechs >= 3 {
			level = "advanced"
		}
		skills = append(skills, InferredSkill{
			Name:        "Testing & Quality Assurance",
			Category:    "testing",
			Level:       level,
			Confidence:  math.Min(0.75+float64(testTechs)*0.05, 0.95),
			Reasoning:   "Multiple testing tools/frameworks detected",
			BasedOn:     b.getNodesInCategories("testing"),
			Evidence:    []string{"Multi-layer testing strategy detected"},
			ResumeReady: true,
		})
	}

	// Rule 7: State Management (React + state lib)
	hasReact := b.hasNodeByName("React")
	hasStateLib := b.hasNodeByName("Redux") || b.hasNodeByName("Zustand") || b.hasNodeByName("Recoil") || b.hasNodeByName("Jotai") || b.hasNodeByName("MobX")
	if hasReact && hasStateLib {
		skills = append(skills, InferredSkill{
			Name:        "Advanced React State Management",
			Category:    "framework",
			Level:       "advanced",
			Confidence:  0.88,
			Reasoning:   "React + dedicated state management library = advanced frontend skills",
			BasedOn:     b.getNodesInCategories("frontend"),
			Evidence:    []string{"React with state management library detected"},
			ResumeReady: true,
		})
	}

	// Rule 8: Real-time Systems (WebSocket/Socket.IO + backend)
	hasRealtime := b.hasNodeByName("Socket.IO") || b.hasNodeByName("WebSocket")
	if hasRealtime && hasBackend {
		skills = append(skills, InferredSkill{
			Name:        "Real-time Application Development",
			Category:    "architecture",
			Level:       "advanced",
			Confidence:  0.85,
			Reasoning:   "WebSocket/Socket.IO with backend indicates real-time app skills",
			BasedOn:     []string{"Socket.IO", "WebSocket"},
			Evidence:    []string{"Real-time communication stack detected"},
			ResumeReady: true,
		})
	}

	// Rule 9: ML/AI (ML libraries)
	hasML := b.hasNodeByName("TensorFlow") || b.hasNodeByName("PyTorch") || b.hasNodeByName("Scikit-learn") || b.hasNodeByName("OpenAI") || b.hasNodeByName("LangChain")
	if hasML {
		skills = append(skills, InferredSkill{
			Name:        "Machine Learning / AI",
			Category:    "ml",
			Level:       "advanced",
			Confidence:  0.88,
			Reasoning:   "ML/AI libraries detected in codebase",
			BasedOn:     b.getNodesInCategories("ml"),
			Evidence:    []string{"ML/AI technology stack detected via AST"},
			ResumeReady: true,
		})
	}

	// Rule 10: Go Concurrency (goroutines + channels + context)
	hasConcurrency := b.hasNodeByName("Go Concurrency") || b.hasNodeByName("Sync Primitives") || b.hasNodeByName("Context")
	if hasConcurrency {
		skills = append(skills, InferredSkill{
			Name:        "Go Concurrent Programming",
			Category:    "language",
			Level:       "advanced",
			Confidence:  0.87,
			Reasoning:   "Goroutines, channels, and sync primitives indicate concurrent programming skills",
			BasedOn:     []string{"Go Concurrency", "Context", "Sync Primitives"},
			Evidence:    []string{"Go concurrency patterns detected via AST"},
			ResumeReady: true,
		})
	}

	return skills
}

// findClusters identifies groups of technologies used together
func (b *Builder) findClusters() []TechCluster {
	clusters := []TechCluster{}

	// Group by sub-category
	categoryNodes := make(map[string][]string)
	for _, node := range b.graph.Nodes {
		subCat := node.SubCategory
		if subCat == "" {
			subCat = node.Category
		}
		categoryNodes[subCat] = append(categoryNodes[subCat], node.Name)
	}

	for category, techs := range categoryNodes {
		if len(techs) < 2 {
			continue
		}

		// Calculate cluster strength based on edges between nodes
		strength := 0.0
		edgeCount := 0
		for _, edge := range b.graph.Edges {
			fromNode := b.graph.Nodes[edge.From]
			toNode := b.graph.Nodes[edge.To]
			if fromNode == nil || toNode == nil {
				continue
			}
			fromCat := fromNode.SubCategory
			if fromCat == "" {
				fromCat = fromNode.Category
			}
			toCat := toNode.SubCategory
			if toCat == "" {
				toCat = toNode.Category
			}
			if fromCat == category || toCat == category {
				strength += edge.Weight
				edgeCount++
			}
		}

		if edgeCount > 0 {
			strength = strength / float64(edgeCount)
		} else {
			strength = 0.3 // Default strength for co-existing but unlinked techs
		}

		clusters = append(clusters, TechCluster{
			Name:         clusterName(category),
			Technologies: techs,
			Category:     category,
			Strength:     math.Round(strength*100) / 100,
		})
	}

	return clusters
}

// calculateMetrics computes graph-level statistics
func (b *Builder) calculateMetrics(result *GraphAnalysisResult) {
	n := len(b.graph.Nodes)
	if n <= 1 {
		return
	}

	// Density = 2 * edges / (nodes * (nodes - 1))
	maxEdges := float64(n * (n - 1) / 2)
	if maxEdges > 0 {
		result.Density = math.Round(float64(len(b.graph.Edges))/maxEdges*100) / 100
	}

	// Average node weight
	totalWeight := 0.0
	for _, node := range b.graph.Nodes {
		totalWeight += node.Weight
	}
	result.AvgNodeWeight = math.Round(totalWeight/float64(n)*100) / 100

	// Most connected node
	connectionCount := make(map[string]int)
	for _, edge := range b.graph.Edges {
		connectionCount[edge.From]++
		connectionCount[edge.To]++
	}
	maxConn := 0
	for _, count := range connectionCount {
		if count > maxConn {
			maxConn = count
		}
	}
	result.MaxConnections = maxConn
}

// ============================================
// HELPER METHODS
// ============================================

func (b *Builder) hasNodeByName(name string) bool {
	id := normalizeID(name)
	_, exists := b.graph.Nodes[id]
	return exists
}

func (b *Builder) hasNodeInCategory(category string) bool {
	for _, node := range b.graph.Nodes {
		if node.SubCategory == category || node.Category == category {
			return true
		}
	}
	return false
}

func (b *Builder) countNodesInCategory(category string) int {
	count := 0
	for _, node := range b.graph.Nodes {
		if node.SubCategory == category || node.Category == category {
			count++
		}
	}
	return count
}

func (b *Builder) getNodesInCategories(categories ...string) []string {
	names := []string{}
	catSet := make(map[string]bool)
	for _, c := range categories {
		catSet[c] = true
	}
	for _, node := range b.graph.Nodes {
		if catSet[node.SubCategory] || catSet[node.Category] {
			names = append(names, node.Name)
		}
	}
	return names
}

func normalizeID(name string) string {
	id := strings.ToLower(name)
	id = strings.ReplaceAll(id, " ", "-")
	id = strings.ReplaceAll(id, "/", "-")
	id = strings.ReplaceAll(id, ".", "-")
	id = strings.ReplaceAll(id, "(", "")
	id = strings.ReplaceAll(id, ")", "")
	id = strings.ReplaceAll(id, "&", "and")
	return id
}

func appendUnique(slice []string, item string) []string {
	for _, s := range slice {
		if s == item {
			return slice
		}
	}
	return append(slice, item)
}

func clusterName(category string) string {
	names := map[string]string{
		"frontend":      "Frontend Technologies",
		"backend":       "Backend Technologies",
		"database":      "Database Layer",
		"messaging":     "Messaging & Queues",
		"devops":        "DevOps & Infrastructure",
		"testing":       "Testing Tools",
		"cloud":         "Cloud Services",
		"observability": "Observability Stack",
		"security":      "Security Components",
		"ml":            "ML/AI Stack",
		"container":     "Containerization",
	}
	if name, ok := names[category]; ok {
		return name
	}
	return strings.Title(category) + " Stack" //nolint:staticcheck
}
