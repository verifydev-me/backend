package analyzer

// ============================================
// DEEP EVIDENCE ENRICHMENT ENGINE
// Extracts granular, pattern-based evidence from
// TechDependencyGraph clusters and graph nodes
// to produce "Developer Magnet" evidence that
// shows we ACTUALLY analyzed their code.
//
// This runs AFTER syncBayesianConfidenceToSkills()
// so all VerifiedSkills are finalized, then we
// enrich each with RichEvidence from graph data.
// ============================================

import (
	"fmt"
	"strings"

	"github.com/rs/zerolog/log"
	"github.com/verifydev/project-analyzer/pkg/signals"
)

// enrichSkillsWithDeepEvidence adds RichEvidence to every VerifiedSkill
// by mining the TechDependencyGraph clusters, nodes, and edge relationships.
// This is the "Developer Magnet" — when a dev sees "useState detected in 23 files"
// they know we ACTUALLY read their code.
func enrichSkillsWithDeepEvidence(result *signals.ProjectSignals) {
	if result.IndustryAnalysis == nil || result.TechDependencyGraph == nil {
		return
	}

	graph := result.TechDependencyGraph
	enrichedCount := 0

	for i := range result.IndustryAnalysis.VerifiedSkills {
		skill := &result.IndustryAnalysis.VerifiedSkills[i]
		normalizedName := normalizeSkillName(skill.Name)

		var rich *signals.RichEvidence

		// Dispatch to skill-specific enrichment based on normalized name
		switch normalizedName {
		case "react":
			rich = enrichReactEvidence(graph, result)
		case "express.js", "express":
			rich = enrichExpressEvidence(graph, result)
		case "next.js":
			rich = enrichNextJSEvidence(graph, result)
		case "mongodb", "mongoose":
			rich = enrichMongoEvidence(graph)
		case "postgresql", "prisma":
			rich = enrichPostgresEvidence(graph)
		case "redis":
			rich = enrichRedisEvidence(graph)
		case "docker":
			rich = enrichDockerEvidence(graph)
		case "typescript":
			rich = enrichTypeScriptEvidence(graph, result)
		case "tailwind css":
			rich = enrichTailwindEvidence(graph, result)
		case "node.js":
			rich = enrichNodeEvidence(graph, result)
		default:
			// Generic enrichment using graph node data
			rich = enrichGenericEvidence(graph, skill)
		}

		if rich != nil && (len(rich.Summary) > 0 || len(rich.Patterns) > 0) {
			skill.RichEvidence = rich

			// Also update the simple Evidence array with rich summaries
			// for backward compatibility — downstream systems that only read Evidence[]
			// will still get the improved data
			for _, summary := range rich.Summary {
				skill.Evidence = appendUniqueEvidence(skill.Evidence, summary)
			}

			enrichedCount++
		}
	}

	// Also enrich the SkillsByCategory map (it's a copy, needs re-sync)
	if enrichedCount > 0 {
		result.IndustryAnalysis.SkillsByCategory = make(map[signals.SkillCategory][]signals.VerifiedSkill)
		for _, skill := range result.IndustryAnalysis.VerifiedSkills {
			result.IndustryAnalysis.SkillsByCategory[skill.Category] = append(
				result.IndustryAnalysis.SkillsByCategory[skill.Category], skill,
			)
		}
	}

	log.Info().
		Int("enrichedSkills", enrichedCount).
		Int("totalSkills", len(result.IndustryAnalysis.VerifiedSkills)).
		Int("totalClusters", len(graph.Clusters)).
		Msg("🔬 Deep evidence enrichment complete")
}

// ============================================
// SKILL-SPECIFIC ENRICHMENT FUNCTIONS
// ============================================

// enrichReactEvidence extracts React-specific patterns from graph clusters
func enrichReactEvidence(graph *signals.TechDependencyGraph, result *signals.ProjectSignals) *signals.RichEvidence {
	rich := &signals.RichEvidence{
		Summary:  []string{},
		Patterns: make(map[string]interface{}),
	}

	// 1. Built-in React Hooks from "React_hook Stack" cluster
	hookCluster := graph.FindCluster("React_hook Stack")
	if hookCluster != nil && len(hookCluster.Technologies) > 0 {
		hooks := hookCluster.Technologies
		hookDetails := make([]map[string]interface{}, 0, len(hooks))

		for _, hook := range hooks {
			node := graph.FindNodeByName(hook)
			detail := map[string]interface{}{
				"name": hook,
			}
			if node != nil {
				detail["fileCount"] = node.FileCount
				detail["weight"] = node.Weight
			}
			hookDetails = append(hookDetails, detail)
		}

		rich.Patterns["builtInHooks"] = hookDetails
		rich.Summary = append(rich.Summary,
			fmt.Sprintf("React Hooks: %s", joinWithLimit(hooks, 5)))
	}

	// 2. Custom Hooks from "Custom_hook Stack" cluster
	customCluster := graph.FindCluster("Custom_hook Stack")
	if customCluster != nil && len(customCluster.Technologies) > 0 {
		customs := customCluster.Technologies
		customDetails := make([]map[string]interface{}, 0, len(customs))

		for _, hook := range customs {
			node := graph.FindNodeByName(hook)
			detail := map[string]interface{}{
				"name": hook,
			}
			if node != nil {
				detail["fileCount"] = node.FileCount
				detail["weight"] = node.Weight
			}
			customDetails = append(customDetails, detail)
		}

		rich.Patterns["customHooks"] = customDetails
		rich.Summary = append(rich.Summary,
			fmt.Sprintf("Custom hooks: %s", joinWithLimit(customs, 4)))
	}

	// 3. State Management from graph nodes
	stateLibs := []string{}
	for _, name := range []string{"Redux", "Zustand", "Recoil", "Jotai", "MobX", "XState"} {
		if node := graph.FindNodeByName(name); node != nil {
			stateLibs = append(stateLibs, name)
		}
	}
	if len(stateLibs) > 0 {
		rich.Patterns["stateManagement"] = stateLibs
		rich.Summary = append(rich.Summary,
			fmt.Sprintf("State management: %s", strings.Join(stateLibs, ", ")))
	}

	// 4. React-specific patterns from ReactSignals
	if result.ReactSignals != nil {
		rs := result.ReactSignals
		reactPatterns := []string{}
		if rs.UsesErrorBoundary {
			reactPatterns = append(reactPatterns, "Error Boundaries")
		}
		if rs.UsesSuspense {
			reactPatterns = append(reactPatterns, "Suspense")
		}
		if rs.UsesLazyLoading {
			reactPatterns = append(reactPatterns, "Lazy Loading")
		}
		if rs.UsesForwardRef {
			reactPatterns = append(reactPatterns, "forwardRef")
		}
		if rs.UsesPortal {
			reactPatterns = append(reactPatterns, "Portals")
		}
		if len(rs.ComponentPatterns) > 0 {
			reactPatterns = append(reactPatterns, rs.ComponentPatterns...)
		}
		if len(reactPatterns) > 0 {
			rich.Patterns["advancedPatterns"] = reactPatterns
			rich.Summary = append(rich.Summary,
				fmt.Sprintf("Advanced React: %s", joinWithLimit(reactPatterns, 4)))
		}

		if rs.ComponentCount > 0 {
			rich.Patterns["componentCount"] = rs.ComponentCount
		}
		if rs.StyleApproach != "" {
			rich.Patterns["styling"] = rs.StyleApproach
		}
	}

	// 5. Compute depth based on hook diversity + patterns
	totalPatterns := 0
	if hookCluster != nil {
		totalPatterns += len(hookCluster.Technologies)
	}
	if customCluster != nil {
		totalPatterns += len(customCluster.Technologies)
	}
	rich.Depth = computeDepth(graph, "React", totalPatterns)

	return rich
}

// enrichExpressEvidence extracts Express.js-specific patterns
func enrichExpressEvidence(graph *signals.TechDependencyGraph, result *signals.ProjectSignals) *signals.RichEvidence {
	rich := &signals.RichEvidence{
		Summary:  []string{},
		Patterns: make(map[string]interface{}),
	}

	// 1. Route patterns from "Express_route Stack" cluster
	routeCluster := graph.FindCluster("Express_route Stack")
	if routeCluster != nil && len(routeCluster.Technologies) > 0 {
		routes := routeCluster.Technologies

		// Categorize routes by HTTP method
		routeMap := categorizeRoutes(routes)
		rich.Patterns["routes"] = routeMap
		rich.Patterns["totalEndpoints"] = len(routes)

		// Build summary
		parts := []string{}
		for method, count := range routeMap {
			if c, ok := count.(int); ok && c > 0 {
				parts = append(parts, fmt.Sprintf("%s: %d", method, c))
			}
		}
		if len(parts) > 0 {
			rich.Summary = append(rich.Summary,
				fmt.Sprintf("API endpoints: %s (total: %d)", strings.Join(parts, ", "), len(routes)))
		}
	}

	// 2. Middleware from "Express_middleware Stack" cluster
	mwCluster := graph.FindCluster("Express_middleware Stack")
	if mwCluster != nil && len(mwCluster.Technologies) > 0 {
		rich.Patterns["middleware"] = mwCluster.Technologies
		rich.Summary = append(rich.Summary,
			fmt.Sprintf("Middleware chain: %s", joinWithLimit(mwCluster.Technologies, 5)))
	}

	// 3. Node.js backend patterns from NodeSignals
	if result.NodeSignals != nil {
		ns := result.NodeSignals
		backendPatterns := []string{}
		if ns.HasMiddleware {
			backendPatterns = append(backendPatterns, "Middleware pipeline")
		}
		if ns.HasErrorHandling {
			backendPatterns = append(backendPatterns, "Error handling")
		}
		if ns.HasValidation {
			backendPatterns = append(backendPatterns, "Input validation")
		}
		if ns.HasAuthentication {
			backendPatterns = append(backendPatterns, "Authentication")
		}
		if ns.HasRateLimiting {
			backendPatterns = append(backendPatterns, "Rate limiting")
		}
		if ns.HasCaching {
			backendPatterns = append(backendPatterns, "Caching")
		}
		if ns.HasWebSocket {
			backendPatterns = append(backendPatterns, "WebSocket")
		}
		if ns.HasGraphQL {
			backendPatterns = append(backendPatterns, "GraphQL")
		}
		if ns.HasSwagger {
			backendPatterns = append(backendPatterns, "Swagger/OpenAPI")
		}
		if len(backendPatterns) > 0 {
			rich.Patterns["backendFeatures"] = backendPatterns
			rich.Summary = append(rich.Summary,
				fmt.Sprintf("Backend features: %s", joinWithLimit(backendPatterns, 5)))
		}
		if ns.DatabaseORM != "" {
			rich.Patterns["orm"] = ns.DatabaseORM
		}
	}

	totalPatterns := 0
	if routeCluster != nil {
		totalPatterns += len(routeCluster.Technologies)
	}
	if mwCluster != nil {
		totalPatterns += len(mwCluster.Technologies)
	}
	rich.Depth = computeDepth(graph, "Express", totalPatterns)

	return rich
}

// enrichNextJSEvidence extracts Next.js-specific patterns
func enrichNextJSEvidence(graph *signals.TechDependencyGraph, result *signals.ProjectSignals) *signals.RichEvidence {
	rich := &signals.RichEvidence{
		Summary:  []string{},
		Patterns: make(map[string]interface{}),
	}

	// Look for Next.js-related graph nodes
	nextFeatures := []string{}
	for _, nodeName := range []string{"next/router", "next/image", "next/head", "next/link", "next/dynamic", "getServerSideProps", "getStaticProps", "getStaticPaths"} {
		if node := graph.FindNodeByName(nodeName); node != nil {
			nextFeatures = append(nextFeatures, nodeName)
		}
	}

	if len(nextFeatures) > 0 {
		rich.Patterns["nextFeatures"] = nextFeatures
		rich.Summary = append(rich.Summary,
			fmt.Sprintf("Next.js APIs: %s", joinWithLimit(nextFeatures, 5)))
	}

	// Check rendering patterns
	renderingPatterns := []string{}
	for _, pattern := range []string{"SSR", "SSG", "ISR", "App Router", "Pages Router"} {
		for _, cluster := range graph.Clusters {
			for _, tech := range cluster.Technologies {
				if strings.Contains(strings.ToLower(tech), strings.ToLower(pattern)) {
					renderingPatterns = append(renderingPatterns, pattern)
					break
				}
			}
		}
	}
	if len(renderingPatterns) > 0 {
		rich.Patterns["renderingPatterns"] = renderingPatterns
		rich.Summary = append(rich.Summary,
			fmt.Sprintf("Rendering: %s", strings.Join(renderingPatterns, ", ")))
	}

	rich.Depth = computeDepth(graph, "Next.js", len(nextFeatures)+len(renderingPatterns))

	return rich
}

// enrichMongoEvidence extracts MongoDB/Mongoose-specific patterns
func enrichMongoEvidence(graph *signals.TechDependencyGraph) *signals.RichEvidence {
	rich := &signals.RichEvidence{
		Summary:  []string{},
		Patterns: make(map[string]interface{}),
	}

	// Database cluster
	dbClusters := graph.FindClustersByCategory("database")
	mongoTechs := []string{}
	for _, cluster := range dbClusters {
		for _, tech := range cluster.Technologies {
			lower := strings.ToLower(tech)
			if strings.Contains(lower, "mongo") || strings.Contains(lower, "mongoose") {
				mongoTechs = append(mongoTechs, tech)
			}
		}
	}

	if len(mongoTechs) > 0 {
		rich.Patterns["mongoFeatures"] = mongoTechs
		rich.Summary = append(rich.Summary,
			fmt.Sprintf("MongoDB ecosystem: %s", strings.Join(mongoTechs, ", ")))
	}

	// Check for Mongoose node
	if node := graph.FindNodeByName("Mongoose"); node != nil {
		rich.Summary = append(rich.Summary,
			fmt.Sprintf("Mongoose ORM detected in %d files", node.FileCount))
		rich.Patterns["orm"] = "Mongoose"
		rich.Patterns["ormFileCount"] = node.FileCount
	}

	rich.Depth = computeDepth(graph, "MongoDB", len(mongoTechs))

	return rich
}

// enrichPostgresEvidence extracts PostgreSQL/Prisma-specific patterns
func enrichPostgresEvidence(graph *signals.TechDependencyGraph) *signals.RichEvidence {
	rich := &signals.RichEvidence{
		Summary:  []string{},
		Patterns: make(map[string]interface{}),
	}

	dbClusters := graph.FindClustersByCategory("database")
	pgTechs := []string{}
	for _, cluster := range dbClusters {
		for _, tech := range cluster.Technologies {
			lower := strings.ToLower(tech)
			if strings.Contains(lower, "postgres") || strings.Contains(lower, "prisma") ||
				strings.Contains(lower, "pg") || strings.Contains(lower, "knex") ||
				strings.Contains(lower, "typeorm") || strings.Contains(lower, "sequelize") {
				pgTechs = append(pgTechs, tech)
			}
		}
	}

	if len(pgTechs) > 0 {
		rich.Patterns["postgresEcosystem"] = pgTechs
		rich.Summary = append(rich.Summary,
			fmt.Sprintf("PostgreSQL stack: %s", strings.Join(pgTechs, ", ")))
	}

	if node := graph.FindNodeByName("Prisma"); node != nil {
		rich.Summary = append(rich.Summary,
			fmt.Sprintf("Prisma ORM detected in %d files", node.FileCount))
		rich.Patterns["orm"] = "Prisma"
	}

	rich.Depth = computeDepth(graph, "PostgreSQL", len(pgTechs))

	return rich
}

// enrichRedisEvidence extracts Redis-specific patterns
func enrichRedisEvidence(graph *signals.TechDependencyGraph) *signals.RichEvidence {
	rich := &signals.RichEvidence{
		Summary:  []string{},
		Patterns: make(map[string]interface{}),
	}

	if node := graph.FindNodeByName("Redis"); node != nil {
		rich.Summary = append(rich.Summary,
			fmt.Sprintf("Redis detected in %d files (weight: %.2f)", node.FileCount, node.Weight))
		rich.Patterns["fileCount"] = node.FileCount
		rich.Patterns["weight"] = node.Weight
	}

	// Check for Redis-specific patterns in clusters
	cacheClusters := graph.FindClustersByCategory("cache")
	for _, cluster := range cacheClusters {
		rich.Patterns["cacheStack"] = cluster.Technologies
		rich.Summary = append(rich.Summary,
			fmt.Sprintf("Caching layer: %s", strings.Join(cluster.Technologies, ", ")))
	}

	rich.Depth = computeDepth(graph, "Redis", 0)

	return rich
}

// enrichDockerEvidence extracts Docker-specific patterns
func enrichDockerEvidence(graph *signals.TechDependencyGraph) *signals.RichEvidence {
	rich := &signals.RichEvidence{
		Summary:  []string{},
		Patterns: make(map[string]interface{}),
	}

	infraClusters := graph.FindClustersByCategory("devops")
	devopsTechs := []string{}
	for _, cluster := range infraClusters {
		devopsTechs = append(devopsTechs, cluster.Technologies...)
	}

	// Also check infra category
	infraClusters2 := graph.FindClustersByCategory("infrastructure")
	for _, cluster := range infraClusters2 {
		devopsTechs = append(devopsTechs, cluster.Technologies...)
	}

	if len(devopsTechs) > 0 {
		rich.Patterns["devopsStack"] = devopsTechs
		rich.Summary = append(rich.Summary,
			fmt.Sprintf("DevOps stack: %s", joinWithLimit(devopsTechs, 6)))
	}

	// Docker-specific node info
	if node := graph.FindNodeByName("Docker"); node != nil {
		rich.Patterns["dockerWeight"] = node.Weight
		rich.Patterns["dockerSources"] = node.Sources
	}
	if node := graph.FindNodeByName("Docker Compose"); node != nil {
		rich.Patterns["composeDetected"] = true
		rich.Summary = append(rich.Summary, "Docker Compose multi-service setup detected")
	}

	rich.Depth = computeDepth(graph, "Docker", len(devopsTechs))

	return rich
}

// enrichTypeScriptEvidence extracts TypeScript-specific patterns
func enrichTypeScriptEvidence(graph *signals.TechDependencyGraph, result *signals.ProjectSignals) *signals.RichEvidence {
	rich := &signals.RichEvidence{
		Summary:  []string{},
		Patterns: make(map[string]interface{}),
	}

	if node := graph.FindNodeByName("TypeScript"); node != nil {
		rich.Summary = append(rich.Summary,
			fmt.Sprintf("TypeScript used in %d files (weight: %.2f)", node.FileCount, node.Weight))
		rich.Patterns["fileCount"] = node.FileCount
		rich.Patterns["weight"] = node.Weight
	}

	// Check for TypeScript pattern cluster
	tsClusters := graph.FindClustersByCategory("language")
	for _, cluster := range tsClusters {
		for _, tech := range cluster.Technologies {
			if strings.Contains(strings.ToLower(tech), "typescript") ||
				strings.Contains(strings.ToLower(tech), "tsconfig") {
				rich.Patterns["tsFeatures"] = cluster.Technologies
				break
			}
		}
	}

	rich.Depth = computeDepth(graph, "TypeScript", 0)

	return rich
}

// enrichTailwindEvidence extracts Tailwind CSS patterns
func enrichTailwindEvidence(graph *signals.TechDependencyGraph, result *signals.ProjectSignals) *signals.RichEvidence {
	rich := &signals.RichEvidence{
		Summary:  []string{},
		Patterns: make(map[string]interface{}),
	}

	if node := graph.FindNodeByName("Tailwind CSS"); node != nil {
		rich.Summary = append(rich.Summary,
			fmt.Sprintf("Tailwind CSS used in %d files", node.FileCount))
		rich.Patterns["fileCount"] = node.FileCount
	}

	// Check styling cluster
	stylingCluster := graph.FindCluster("Styling Stack")
	if stylingCluster == nil {
		stylingCluster = graph.FindCluster("Style Stack")
	}
	if stylingCluster != nil {
		rich.Patterns["stylingStack"] = stylingCluster.Technologies
		rich.Summary = append(rich.Summary,
			fmt.Sprintf("Styling stack: %s", strings.Join(stylingCluster.Technologies, ", ")))
	}

	rich.Depth = computeDepth(graph, "Tailwind CSS", 0)

	return rich
}

// enrichNodeEvidence extracts Node.js-specific patterns
func enrichNodeEvidence(graph *signals.TechDependencyGraph, result *signals.ProjectSignals) *signals.RichEvidence {
	rich := &signals.RichEvidence{
		Summary:  []string{},
		Patterns: make(map[string]interface{}),
	}

	if node := graph.FindNodeByName("Node.js"); node != nil {
		rich.Summary = append(rich.Summary,
			fmt.Sprintf("Node.js runtime across %d files", node.FileCount))
		rich.Patterns["fileCount"] = node.FileCount
	}

	// Gather backend clusters
	backendClusters := graph.FindClustersByCategory("backend")
	backendTechs := []string{}
	for _, cluster := range backendClusters {
		backendTechs = append(backendTechs, cluster.Technologies...)
	}
	if len(backendTechs) > 0 {
		rich.Patterns["backendEcosystem"] = backendTechs
		rich.Summary = append(rich.Summary,
			fmt.Sprintf("Node.js ecosystem: %s", joinWithLimit(backendTechs, 6)))
	}

	rich.Depth = computeDepth(graph, "Node.js", len(backendTechs))

	return rich
}

// enrichGenericEvidence extracts evidence for any skill using graph node data
func enrichGenericEvidence(graph *signals.TechDependencyGraph, skill *signals.VerifiedSkill) *signals.RichEvidence {
	rich := &signals.RichEvidence{
		Summary:  []string{},
		Patterns: make(map[string]interface{}),
	}

	// Try to find the node by skill name
	node := graph.FindNodeByName(skill.Name)
	if node == nil {
		return nil // No graph data for this skill
	}

	if node.FileCount > 0 {
		rich.Summary = append(rich.Summary,
			fmt.Sprintf("%s detected in %d files", skill.Name, node.FileCount))
		rich.Patterns["fileCount"] = node.FileCount
	}
	if node.Weight > 0 {
		rich.Patterns["weight"] = node.Weight
	}
	if len(node.Sources) > 0 {
		rich.Patterns["detectionSources"] = node.Sources
	}
	if len(node.Evidence) > 0 {
		rich.Patterns["evidence"] = node.Evidence
	}

	rich.Depth = computeDepth(graph, skill.Name, 0)

	return rich
}

// ============================================
// HELPER FUNCTIONS
// ============================================

// computeDepth determines skill depth based on graph node data and pattern count
func computeDepth(graph *signals.TechDependencyGraph, skillName string, patternCount int) *signals.SkillDepth {
	depth := &signals.SkillDepth{
		Level:        "surface",
		PatternsUsed: patternCount,
	}

	// Find the node to get file count
	node := graph.FindNodeByName(skillName)
	if node != nil {
		depth.FileSpread = node.FileCount

		// Count edges (connections) to this node for diversity
		edgeCount := 0
		for _, edge := range graph.Edges {
			normalizedID := strings.ToLower(strings.ReplaceAll(skillName, " ", "_"))
			if edge.From == normalizedID || edge.To == normalizedID ||
				edge.From == node.ID || edge.To == node.ID {
				edgeCount++
			}
		}
		depth.DiversityCount = edgeCount
	}

	// Determine depth level
	switch {
	case patternCount >= 8 || (depth.FileSpread >= 15 && depth.DiversityCount >= 5):
		depth.Level = "expert"
	case patternCount >= 4 || (depth.FileSpread >= 8 && depth.DiversityCount >= 3):
		depth.Level = "deep"
	case patternCount >= 2 || depth.FileSpread >= 3:
		depth.Level = "moderate"
	default:
		depth.Level = "surface"
	}

	return depth
}

// categorizeRoutes splits Express routes by HTTP method
func categorizeRoutes(routes []string) map[string]interface{} {
	result := map[string]interface{}{
		"GET":     0,
		"POST":    0,
		"PUT":     0,
		"PATCH":   0,
		"DELETE":  0,
		"USE":     0,
		"unknown": 0,
	}

	for _, route := range routes {
		lower := strings.ToLower(route)
		found := false
		for _, method := range []string{"get", "post", "put", "patch", "delete", "use"} {
			if strings.Contains(lower, method) {
				key := strings.ToUpper(method)
				if v, ok := result[key].(int); ok {
					result[key] = v + 1
				}
				found = true
				break
			}
		}
		if !found {
			if v, ok := result["unknown"].(int); ok {
				result["unknown"] = v + 1
			}
		}
	}

	// Remove zero entries for cleanliness
	for key, val := range result {
		if v, ok := val.(int); ok && v == 0 {
			delete(result, key)
		}
	}

	return result
}

// joinWithLimit joins strings with comma, limiting to `limit` items, adding "and N more"
func joinWithLimit(items []string, limit int) string {
	if len(items) <= limit {
		return strings.Join(items, ", ")
	}
	truncated := items[:limit]
	return fmt.Sprintf("%s and %d more", strings.Join(truncated, ", "), len(items)-limit)
}

// appendUniqueEvidence adds an evidence string if not already present
func appendUniqueEvidence(existing []string, newEvidence string) []string {
	for _, e := range existing {
		if e == newEvidence {
			return existing
		}
	}
	return append(existing, newEvidence)
}
