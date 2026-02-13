# Graph-Unified Evidence Implementation Plan

Based on analyzing your actual project outputs (verifydev + socialHub), here's the EXACT implementation to fix the problems.

## 🎯 Goal

Transform this:
```json
{
  "name": "React",
  "evidence": ["Framework detected", "Hooks actively used"],
  "usageVerified": true,
  "usageStrength": 0.99
}
```

Into this:
```json
{
  "name": "React",
  "evidence": {
    "summary": ["React Hooks in 45 files", "Custom hooks: useAuth, useFetch"],
    "patterns": {
      "hooks": {
        "built_in": ["useState (23 uses)", "useEffect (18 uses)", "useContext (8 uses)"],
        "custom": ["useAuth", "useFetch", "useInfiniteQuery"]
      },
      "components": {
        "functional": 154,
        "class": 0,
        "optimized": ["React.memo in 4 files"]
      }
    },
    "micro_evidence": [
      {
        "file": "src/components/Login.tsx",
        "line": 12,
        "pattern": "useState",
        "code": "const [email, setEmail] = useState('');"
      }
    ]
  },
  "usageVerified": true,
  "usageStrength": 0.99,
  "depth": {
    "level": "advanced",
    "hook_diversity": 6,
    "pattern_count": 23
  }
}
```

---

## 📊 Step 1: Extract Pattern Details from Graph (NO CODE CHANGE)

Your graph ALREADY has this data! Look at your output:

```json
"techDependencyGraph": {
  "clusters": [
    {
      "name": "React_hook Stack",
      "technologies": ["useState", "useEffect", "useContext", "useRef", "useCallback", "useMemo"],
      "category": "react_hook",
      "strength": 0.3
    },
    {
      "name": "Custom_hook Stack",
      "technologies": ["useAuth", "useFetch", "useInfiniteQuery", ...],
      "category": "custom_hook",
      "strength": 0.3
    },
    {
      "name": "Express_route Stack",
      "technologies": ["router.get", "router.post", "app.use", "router.delete"],
      "category": "express_route",
      "strength": 0.3
    }
  ]
}
```

**This is GOLD! But it's buried in `techDependencyGraph` and never reaches `verifiedSkills.evidence`.**

---

## 🔧 Step 2: Update Evidence Aggregation (1 file change)

**File:** `internal/analyzer/enrichment.go`

**Current function (Line ~200):**
```go
func buildEvidence(skill VerifiedSkill, signals InfrastructureSignals) []string {
    evidence := []string{}
    
    // Generic evidence
    if skill.Category == "framework" {
        evidence = append(evidence, "Framework detected in configuration")
    }
    
    return evidence
}
```

**New function:**
```go
func buildRichEvidence(skill VerifiedSkill, graph *TechDependencyGraph, astResult *ast.ProjectASTResult) map[string]interface{} {
    richEvidence := map[string]interface{}{
        "summary": []string{},
        "patterns": map[string]interface{}{},
        "depth": map[string]interface{}{},
    }
    
    // React-specific enrichment
    if skill.Name == "React" {
        reactPatterns := extractReactPatterns(graph, astResult)
        
        // Built-in hooks
        hookCluster := graph.FindCluster("React_hook Stack")
        if hookCluster != nil {
            builtInHooks := []string{}
            for _, hook := range hookCluster.Technologies {
                count := astResult.CountUsage(hook)  // New method needed
                builtInHooks = append(builtInHooks, fmt.Sprintf("%s (%d uses)", hook, count))
            }
            
            richEvidence["patterns"].(map[string]interface{})["hooks"] = map[string]interface{}{
                "built_in": builtInHooks,
                "count": len(hookCluster.Technologies),
            }
            
            richEvidence["summary"] = append(richEvidence["summary"].([]string), 
                fmt.Sprintf("React Hooks: %s", strings.Join(builtInHooks[:3], ", ")))
        }
        
        // Custom hooks
        customHookCluster := graph.FindCluster("Custom_hook Stack")
        if customHookCluster != nil {
            richEvidence["patterns"].(map[string]interface{})["custom_hooks"] = customHookCluster.Technologies
            richEvidence["summary"] = append(richEvidence["summary"].([]string),
                fmt.Sprintf("Custom hooks: %s", strings.Join(customHookCluster.Technologies[:3], ", ")))
        }
        
        // Component count
        componentCluster := graph.FindCluster("React_component Stack")
        if componentCluster != nil {
            richEvidence["patterns"].(map[string]interface{})["components"] = map[string]interface{}{
                "count": len(componentCluster.Technologies),
                "examples": componentCluster.Technologies[:5],  // First 5
            }
        }
        
        // Depth analysis
        hookDiversity := 0
        if hookCluster != nil {
            hookDiversity = len(hookCluster.Technologies)
        }
        
        richEvidence["depth"] = map[string]interface{}{
            "level": calculateSkillLevel(hookDiversity, len(customHookCluster.Technologies)),
            "hook_diversity": hookDiversity,
            "has_custom_hooks": len(customHookCluster.Technologies) > 0,
        }
    }
    
    // Express-specific enrichment
    if skill.Name == "Express.js" || skill.Name == "Express" {
        routeCluster := graph.FindCluster("Express_route Stack")
        if routeCluster != nil {
            routeTypes := categorizeRoutes(routeCluster.Technologies)
            
            richEvidence["patterns"] = map[string]interface{}{
                "routes": routeTypes,  // {"GET": 7, "POST": 5, "DELETE": 3}
                "middleware": extractMiddleware(routeCluster.Technologies),
            }
            
            totalRoutes := 0
            for _, count := range routeTypes {
                totalRoutes += count
            }
            
            richEvidence["summary"] = []string{
                fmt.Sprintf("%d API endpoints (%s)", totalRoutes, formatRouteTypes(routeTypes)),
            }
            
            richEvidence["depth"] = map[string]interface{}{
                "level": calculateAPILevel(totalRoutes, len(routeCluster.Technologies)),
                "route_count": totalRoutes,
                "has_middleware": len(extractMiddleware(routeCluster.Technologies)) > 0,
            }
        }
    }
    
    // Architecture skills (Microservices, Event-Driven)
    if skill.Category == "architecture" {
        architectureEvidence := extractArchitectureEvidence(graph, skill.Name)
        richEvidence["patterns"] = architectureEvidence.Patterns
        richEvidence["summary"] = architectureEvidence.Summary
        richEvidence["depth"] = architectureEvidence.Depth
    }
    
    return richEvidence
}

// Helper: Categorize Express routes
func categorizeRoutes(technologies []string) map[string]int {
    routes := map[string]int{
        "GET": 0,
        "POST": 0,
        "PUT": 0,
        "PATCH": 0,
        "DELETE": 0,
        "USE": 0,  // Middleware
    }
    
    for _, tech := range technologies {
        if strings.Contains(tech, ".get") {
            routes["GET"]++
        } else if strings.Contains(tech, ".post") {
            routes["POST"]++
        } else if strings.Contains(tech, ".patch") {
            routes["PATCH"]++
        } else if strings.Contains(tech, ".delete") {
            routes["DELETE"]++
        } else if strings.Contains(tech, ".use") {
            routes["USE"]++
        }
    }
    
    return routes
}

// Helper: Calculate skill level based on diversity
func calculateSkillLevel(hookDiversity, customHookCount int) string {
    if customHookCount >= 2 && hookDiversity >= 5 {
        return "expert"
    } else if hookDiversity >= 4 || customHookCount >= 1 {
        return "advanced"
    } else if hookDiversity >= 2 {
        return "intermediate"
    }
    return "basic"
}

// Helper: Calculate API complexity level
func calculateAPILevel(routeCount, middlewareCount int) string {
    score := routeCount + (middlewareCount * 2)
    
    if score >= 20 {
        return "expert"
    } else if score >= 10 {
        return "advanced"
    } else if score >= 5 {
        return "intermediate"
    }
    return "basic"
}
```

---

## 🔨 Step 3: Add Graph Cluster Lookup Methods

**File:** `internal/graph/builder.go`

Add these helper methods:

```go
// FindCluster looks up a cluster by name
func (g *TechGraph) FindCluster(name string) *TechCluster {
    for _, cluster := range g.Clusters {
        if cluster.Name == name {
            return &cluster
        }
    }
    return nil
}

// FindClustersByCategory returns all clusters matching a category
func (g *TechGraph) FindClustersByCategory(category string) []TechCluster {
    matches := []TechCluster{}
    for _, cluster := range g.Clusters {
        if cluster.Category == category {
            matches = append(matches, cluster)
        }
    }
    return matches
}
```

---

## 📝 Step 4: Update VerifiedSkill Schema

**File:** `pkg/signals/verified_skills.go`

```go
type VerifiedSkill struct {
    Name          string        `json:"name"`
    Category      SkillCategory `json:"category"`
    Confidence    float64       `json:"confidence"`
    ResumeReady   bool          `json:"resumeReady"`
    UsageVerified bool          `json:"usageVerified"`
    UsageStrength float64       `json:"usageStrength,omitempty"`
    
    // ✅ NEW: Rich evidence from graph
    Evidence      []string                `json:"evidence"`  // Keep for backward compat
    RichEvidence  map[string]interface{}  `json:"richEvidence,omitempty"`  
    
    // ✅ NEW: Skill depth metrics
    Depth         *SkillDepth             `json:"depth,omitempty"`
}

type SkillDepth struct {
    Level         string `json:"level"`  // "basic", "intermediate", "advanced", "expert"
    PatternCount  int    `json:"patternCount"`
    Diversity     int    `json:"diversity"`
    HasAdvanced   bool   `json:"hasAdvanced"`  // e.g., custom hooks, middleware
}
```

---

## 🔄 Step 5: Update Enrichment Pipeline

**File:** `internal/analyzer/enrichment.go` (modify existing `enrichVerifiedSkills` function)

```go
func enrichVerifiedSkills(skills []VerifiedSkill, graph *TechDependencyGraph, astResult *ast.ProjectASTResult) {
    for i := range skills {
        skill := &skills[i]
        
        // Build rich evidence from graph clusters
        skill.RichEvidence = buildRichEvidence(*skill, graph, astResult)
        
        // Extract depth metrics
        if depthData, ok := skill.RichEvidence["depth"].(map[string]interface{}); ok {
            skill.Depth = &SkillDepth{
                Level:        depthData["level"].(string),
                PatternCount: depthData["pattern_count"].(int),
                HasAdvanced:  depthData["has_advanced"].(bool),
            }
        }
        
        // Update usage verification from graph cluster strength
        if cluster := graph.FindClusterContainingTech(skill.Name); cluster != nil {
            if cluster.Strength > 0.3 {
                skill.UsageVerified = true
                skill.UsageStrength = cluster.Strength
            }
        }
        
        // Backward compat: Keep simple evidence array
        if summaries, ok := skill.RichEvidence["summary"].([]string); ok {
            skill.Evidence = summaries
        }
    }
}

// Helper: Find cluster containing a technology
func (g *TechGraph) FindClusterContainingTech(techName string) *TechCluster {
    for _, cluster := range g.Clusters {
        for _, tech := range cluster.Technologies {
            if strings.EqualFold(tech, techName) {
                return &cluster
            }
        }
    }
    return nil
}
```

---

## 📤 Step 6: Update Output Schema (Prisma + TypeScript)

**File:** `aura-processor/src/processors/types.ts`

```typescript
interface VerifiedSkill {
  name: string;
  category: string;
  confidence: number;
  resumeReady: boolean;
  usageVerified: boolean;
  usageStrength?: number;
  
  // Legacy
  evidence: string[];
  
  // ✅ NEW: Rich evidence
  richEvidence?: {
    summary: string[];
    patterns: Record<string, any>;
    depth?: {
      level: 'basic' | 'intermediate' | 'advanced' | 'expert';
      pattern_count: number;
      diversity: number;
      has_advanced: boolean;
    };
  };
}
```

---

## 🎨 Step 7: Frontend Display

**File:** `frontend/components/SkillCard.tsx` (new component)

```tsx
interface SkillCardProps {
  skill: VerifiedSkill;
}

export function SkillCard({ skill }: SkillCardProps) {
  const { richEvidence, depth } = skill;
  
  return (
    <Card>
      <h3>{skill.name} {depth && <Badge>{depth.level}</Badge>}</h3>
      
      {/* Summary */}
      {richEvidence?.summary.map(sum => (
        <p key={sum}>{sum}</p>
      ))}
      
      {/* React-specific patterns */}
      {richEvidence?.patterns?.hooks && (
        <div>
          <h4>🎯 Hooks Mastery</h4>
          <ul>
            {richEvidence.patterns.hooks.built_in?.map(hook => (
              <li key={hook}>{hook}</li>
            ))}
          </ul>
          
          {richEvidence.patterns.custom_hooks && (
            <>
              <h5>Custom Hooks:</h5>
              <div className="flex gap-2">
                {richEvidence.patterns.custom_hooks.slice(0, 5).map(hook => (
                  <Badge key={hook}>{hook}</Badge>
                ))}
              </div>
            </>
          )}
        </div>
      )}
      
      {/* Express-specific patterns */}
      {richEvidence?.patterns?.routes && (
        <div>
          <h4>📡 API Endpoints</h4>
          <ul>
            {Object.entries(richEvidence.patterns.routes).map(([method, count]) => (
              <li key={method}>{method}: {count} routes</li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Depth visualization */}
      {depth && (
        <div className="mt-4">
          <span>Skill Depth: {depth.pattern_count} patterns detected</span>
          <ProgressBar value={depth.diversity * 10} />
        </div>
      )}
    </Card>
  );
}
```

---

## 📈 Expected Output After Implementation

### For verifydev (React project):

```json
{
  "name": "React",
  "category": "framework",
  "confidence": 0.782,
  "usageVerified": true,
  "usageStrength": 0.99,
  "evidence": [
    "React Hooks: useState (23 uses), useEffect (18 uses), useContext (8 uses)",
    "Custom hooks: useAuth, useFetch, useInfiniteQuery",
    "154 components detected"
  ],
  "richEvidence": {
    "summary": [
      "React Hooks: useState, useEffect, useContext, useCallback, useMemo, useRef",
      "Custom hooks: useAuth, useFetch, useInfiniteQuery"
    ],
    "patterns": {
      "hooks": {
        "built_in": ["useState (23 uses)", "useEffect (18 uses)", "useContext (8 uses)", "useCallback", "useMemo", "useRef"],
        "count": 6
      },
      "custom_hooks": ["useAuth", "useFetch", "useInfiniteQuery", "useAuthStore", "useRecruiterStore"],
      "components": {
        "count": 154,
        "examples": ["Login", "Dashboard", "Profile", "Settings", "Projects"]
      }
    },
    "depth": {
      "level": "expert",
      "hook_diversity": 6,
      "has_custom_hooks": true,
      "pattern_count": 160
    }
  },
  "depth": {
    "level": "expert",
    "patternCount": 160,
    "diversity": 6,
    "hasAdvanced": true
  }
}
```

### For socialHub (Express project):

```json
{
  "name": "Express.js",
  "category": "framework",
  "confidence": 0.797,
  "usageVerified": true,
  "usageStrength": 0.99,
  "evidence": [
    "14 API endpoints (GET: 7, POST: 5, DELETE: 2)",
    "3 middleware layers detected"
  ],
  "richEvidence": {
    "summary": [
      "14 API endpoints (GET: 7, POST: 5, DELETE: 2)",
      "3 middleware layers"
    ],
    "patterns": {
      "routes": {
        "GET": 7,
        "POST": 5,
        "DELETE": 2
      },
      "middleware": ["router.use", "app.use"]
    },
    "depth": {
      "level": "advanced",
      "route_count": 14,
      "has_middleware": true
    }
  }
}
```

---

## 🚀 Implementation Status — ✅ COMPLETED (2026-02-12)

### ✅ Core Changes (All Done)
1. ✅ Added `FindCluster()`, `FindClustersByCategory()`, `FindNodeByName()` to `pkg/signals/types.go`
2. ✅ Added `SkillDepth` and `RichEvidence` types to `pkg/signals/verified_skills.go`
3. ✅ Updated `VerifiedSkill` struct with `RichEvidence *RichEvidence` field
4. ✅ Created `internal/analyzer/deep_evidence.go` (~500 lines) with:
   - React enricher (hooks, custom hooks, state management, advanced patterns, component count)
   - Express.js enricher (routes by HTTP method, middleware, backend features)
   - Next.js enricher (rendering patterns, Next.js APIs)
   - MongoDB/PostgreSQL/Redis enricher (ORM details, ecosystem, file counts)
   - Docker enricher (DevOps stack, Docker Compose detection)
   - TypeScript/Tailwind/Node.js enrichers
   - Generic enricher (graph node fileCount, weight, sources)
   - Depth computation (surface → moderate → deep → expert)
5. ✅ Wired `enrichSkillsWithDeepEvidence()` into pipeline in `analyzer.go` (Phase 6)
6. ✅ Updated TypeScript interfaces in `aura-processor/src/processors/types.ts`
7. ✅ Updated `ENGINE.md` with Phase 6 documentation

### 🔜 Next Steps
- [ ] Test with verifydev project (verify React hook evidence appears)
- [ ] Test with socialHub project (verify Express route evidence appears)
- [ ] Create frontend `SkillCard` component to display rich evidence
- [ ] Expand evidence extractors for: Kafka, WebSocket, gRPC, GraphQL
- [ ] Add architecture pattern extraction (microservices, event-driven)

---

## 💡 Why This Works

1. **No Architecture Overhaul**: Uses existing graph clusters
2. **Backward Compatible**: Keeps `evidence: string[]` for old consumers
3. **Developer-Focused**: Shows actual code patterns they used
4. **Recruiter-Friendly**: Depth metrics enable filtering ("expert React devs")
5. **Elasticsearch-Ready**: `depth.level`, `patternsUsed` are searchable fields

---

## 🎯 Success Metrics

**Before:**
```
Evidence: "Framework detected in configuration" 😴
```

**After:**
```
Evidence: "React Hooks: useState, useEffect, useContext, useCallback, useMemo, useRef"
          "Custom hooks: useAuth, useFetch, useInfiniteQuery and 2 more"
          "Advanced React: Error Boundaries, Suspense, Lazy Loading"
Developer thinks: "WOW, they READ my components!" 🤩
```

