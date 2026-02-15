package signals

import "strings"

// AnalyzeRequest - Message received from RabbitMQ
type AnalyzeRequest struct {
	ProjectID     string `json:"projectId"`
	UserID        string `json:"userId"`
	RepoURL       string `json:"repoUrl"`
	RepoName      string `json:"repoName"`
	DefaultBranch string `json:"defaultBranch"`
	// Niche - User-selected project domain for targeted analyzer routing
	// Values: WEB_FRONTEND, WEB_BACKEND, BACKEND_SYSTEMS, DEVOPS, etc.
	Niche string `json:"niche,omitempty"`
	// UserProjectType - User-specified project type for context-aware scoring
	// Values: backend, frontend, fullstack, ml, library
	UserProjectType string `json:"projectType,omitempty"`
	// GitHubToken - User's OAuth token for cloning private repos
	GitHubToken string `json:"githubToken,omitempty"`
	// BasePath - Specific subfolder to analyze (e.g. /backend)
	BasePath string `json:"basePath,omitempty"`
}

// ProjectType - Type of project detected
type ProjectType string

const (
	ProjectTypeMicroservice ProjectType = "microservice"
	ProjectTypeMonolith     ProjectType = "monolith"
	ProjectTypeMonorepo     ProjectType = "monorepo"
	ProjectTypeLibrary      ProjectType = "library"
	ProjectTypeCLI          ProjectType = "cli"
	ProjectTypeAPI          ProjectType = "api"
	ProjectTypeFullstack    ProjectType = "fullstack"
	ProjectTypeFrontend     ProjectType = "frontend"
	ProjectTypeBackend      ProjectType = "backend"
	ProjectTypeUnknown      ProjectType = "unknown"
)

// ProjectSignals - Facts extracted from code analysis
type ProjectSignals struct {
	ProjectID string `json:"projectId"`
	UserID    string `json:"userId"`
	RepoURL   string `json:"repoUrl"`

	// Project Type
	ProjectType ProjectType `json:"projectType"`

	// Tech Stack
	PrimaryLanguage string          `json:"primaryLanguage"`
	Languages       []LanguageStats `json:"languages"`
	Frameworks      []string        `json:"frameworks"`
	Databases       []string        `json:"databases"`
	Tools           []string        `json:"tools"`

	// Structure
	FolderStructure FolderAnalysis `json:"folderStructure"`

	// Code Quality Signals
	CodeSignals CodeSignals `json:"codeSignals"`

	// Framework-Specific Signals
	ReactSignals  *ReactSignals  `json:"reactSignals,omitempty"`
	NodeSignals   *NodeSignals   `json:"nodeSignals,omitempty"`
	GoSignals     *GoSignals     `json:"goSignals,omitempty"`
	PythonSignals *PythonSignals `json:"pythonSignals,omitempty"`

	// Advanced Patterns
	AdvancedPatterns *AdvancedPatterns `json:"advancedPatterns,omitempty"`

	// ============================================
	// AUTHENTICITY & FORENSICS (NEW)
	// ============================================
	GitForensics      *GitForensics      `json:"gitForensics,omitempty"`
	AuthorshipVerdict *AuthorshipVerdict `json:"authorshipVerdict,omitempty"`

	// ============================================
	// INDUSTRY-LEVEL ANALYSIS (NEW)
	// ============================================
	// Industry Analysis
	IndustryAnalysis  *IndustryAnalysis  `json:"industryAnalysis,omitempty"`
	Complexity        *ComplexityScore   `json:"complexity,omitempty"`
	ArchitectureGraph *ArchitectureGraph `json:"architectureGraph,omitempty"`

	// ============================================
	// AST DEEP ANALYSIS (Phase 1 - Multi-Language)
	// ============================================
	ASTDeepAnalysis *ASTDeepAnalysis `json:"astDeepAnalysis,omitempty"`

	// ============================================
	// TECH DEPENDENCY GRAPH (Phase 2 - Graph + Rule Engine)
	// ============================================
	TechDependencyGraph *TechDependencyGraph `json:"techDependencyGraph,omitempty"`

	// ============================================
	// AUTONOMOUS INTELLIGENCE ENGINE OUTPUT
	// ============================================
	IntelligenceVerdict *IntelligenceVerdict `json:"intelligenceVerdict,omitempty"`

	// ============================================
	// BAYESIAN CONFIDENCE ENGINE (Phase 3 - Weighted Confidence + Quality)
	// ============================================
	ConfidenceReport *ConfidenceAnalysis `json:"confidenceReport,omitempty"`

	// ============================================
	// COMPACT AI PAYLOAD (New for Gemini)
	// ============================================
	CompactOutput *CompactOutput `json:"compactOutput,omitempty"`

	// Metadata
	TotalFiles      int    `json:"totalFiles"`
	TotalLines      int    `json:"totalLines"`
	AnalyzedAt      string `json:"analyzedAt"`
	AnalysisVersion string `json:"analysisVersion"`
}

// LanguageStats - Stats per language
type LanguageStats struct {
	Name       string  `json:"name"`
	Lines      int     `json:"lines"`
	Files      int     `json:"files"`
	Percentage float64 `json:"percentage"`
}

// FolderAnalysis - Folder structure signals
type FolderAnalysis struct {
	HasSrcFolder   bool `json:"hasSrcFolder"`
	HasComponents  bool `json:"hasComponents"`
	HasUtils       bool `json:"hasUtils"`
	HasTests       bool `json:"hasTests"`
	HasTypes       bool `json:"hasTypes"`
	HasConfig      bool `json:"hasConfig"`
	HasDocs        bool `json:"hasDocs"`
	HasAPI         bool `json:"hasApi"`         // api/ or routes/
	HasModels      bool `json:"hasModels"`      // models/ or entities/
	HasServices    bool `json:"hasServices"`    // services/ or domain/
	HasMiddleware  bool `json:"hasMiddleware"`  // middleware/
	HasControllers bool `json:"hasControllers"` // controllers/ or handlers/
	// New fields to match SignalScanner coverage
	HasInternal       bool     `json:"hasInternal"` // Go pattern
	HasPkg            bool     `json:"hasPkg"`      // Go pattern
	HasCmd            bool     `json:"hasCmd"`      // Go pattern
	HasGateway        bool     `json:"hasGateway"`  // Microservices
	MaxDepth          int      `json:"maxDepth"`
	TopLevelFolders   []string `json:"topLevelFolders"`
	OrganizationScore int      `json:"organizationScore"` // 0-100
}

// CodeSignals - General code quality signals
type CodeSignals struct {
	HasReadme        bool    `json:"hasReadme"`
	HasLicense       bool    `json:"hasLicense"`
	HasGitignore     bool    `json:"hasGitignore"`
	HasEnvExample    bool    `json:"hasEnvExample"`
	HasDockerfile    bool    `json:"hasDockerfile"`
	HasDockerCompose bool    `json:"hasDockerCompose"`
	HasCI            bool    `json:"hasCI"`
	HasLinting       bool    `json:"hasLinting"`
	HasPrettier      bool    `json:"hasPrettier"`
	HasTypeScript    bool    `json:"hasTypeScript"`
	HasMakefile      bool    `json:"hasMakefile"`
	TestFilesCount   int     `json:"testFilesCount"`
	CommentDensity   float64 `json:"commentDensity"` // comments per 100 lines
}

// ReactSignals - React-specific signals
type ReactSignals struct {
	ComponentCount    int      `json:"componentCount"`
	CustomHooksCount  int      `json:"customHooksCount"`
	UsesHooks         bool     `json:"usesHooks"`
	UsesMemo          bool     `json:"usesMemo"`
	UsesCallback      bool     `json:"usesCallback"`
	UsesContext       bool     `json:"usesContext"`
	UsesReducer       bool     `json:"usesReducer"`
	UsesRef           bool     `json:"usesRef"`
	StateManagement   string   `json:"stateManagement"` // redux, zustand, context, etc
	UsesLazyLoading   bool     `json:"usesLazyLoading"`
	UsesErrorBoundary bool     `json:"usesErrorBoundary"`
	UsesSuspense      bool     `json:"usesSuspense"`
	UsesPortal        bool     `json:"usesPortal"`
	UsesForwardRef    bool     `json:"usesForwardRef"`
	StyleApproach     string   `json:"styleApproach"` // css, tailwind, styled-components
	HasPropTypes      bool     `json:"hasPropTypes"`
	ComponentPatterns []string `json:"componentPatterns"` // compound, render-prop, hoc
}

// NodeSignals - Node.js specific signals
type NodeSignals struct {
	Framework         string `json:"framework"` // express, fastify, nest
	UsesTypeScript    bool   `json:"usesTypeScript"`
	HasMiddleware     bool   `json:"hasMiddleware"`
	HasErrorHandling  bool   `json:"hasErrorHandling"`
	HasValidation     bool   `json:"hasValidation"`
	HasAuthentication bool   `json:"hasAuthentication"`
	HasRateLimiting   bool   `json:"hasRateLimiting"`
	HasLogging        bool   `json:"hasLogging"`
	HasCaching        bool   `json:"hasCaching"`
	HasWebSocket      bool   `json:"hasWebSocket"`
	HasGraphQL        bool   `json:"hasGraphQL"`
	HasSwagger        bool   `json:"hasSwagger"`
	DatabaseORM       string `json:"databaseORM"` // prisma, typeorm, mongoose
	RoutesCount       int    `json:"routesCount"`
	MiddlewareCount   int    `json:"middlewareCount"`
}

// GoSignals - Go specific signals
type GoSignals struct {
	Framework          string  `json:"framework"` // gin, echo, fiber, chi
	UsesInterfaces     bool    `json:"usesInterfaces"`
	UsesGoroutines     bool    `json:"usesGoroutines"`
	UsesChannels       bool    `json:"usesChannels"`
	UsesMutex          bool    `json:"usesMutex"`
	UsesContext        bool    `json:"usesContext"`
	UsesDefer          bool    `json:"usesDefer"`
	ErrorHandlingStyle string  `json:"errorHandlingStyle"` // standard, pkg/errors, wrap
	HasTests           bool    `json:"hasTests"`
	HasBenchmarks      bool    `json:"hasBenchmarks"`
	TestCoverage       float64 `json:"testCoverage"`
	ModuleCount        int     `json:"moduleCount"`
	PackageStructure   string  `json:"packageStructure"` // flat, standard, clean-arch
}

// PythonSignals - Python-specific signals
type PythonSignals struct {
	Framework          string   `json:"framework"` // django, flask, fastapi
	UsesTypeHints      bool     `json:"usesTypeHints"`
	UsesAsyncAwait     bool     `json:"usesAsyncAwait"`
	UsesDataclasses    bool     `json:"usesDataclasses"`
	UsesPydantic       bool     `json:"usesPydantic"`
	UsesDecorators     bool     `json:"usesDecorators"`
	UsesGenerators     bool     `json:"usesGenerators"`
	UsesContextMgr     bool     `json:"usesContextMgr"`     // with statement
	UsesComprehensions bool     `json:"usesComprehensions"` // list/dict comprehensions
	HasVirtualEnv      bool     `json:"hasVirtualEnv"`
	HasRequirements    bool     `json:"hasRequirements"`
	HasPyproject       bool     `json:"hasPyproject"`   // pyproject.toml
	PackageManager     string   `json:"packageManager"` // pip, poetry, pipenv
	TestFramework      string   `json:"testFramework"`  // pytest, unittest
	LintTools          []string `json:"lintTools"`      // black, flake8, mypy
}

// AdvancedPatterns - Advanced patterns detected across languages
type AdvancedPatterns struct {
	// Architecture Patterns
	UsesCleanArch     bool `json:"usesCleanArch"`
	UsesMVC           bool `json:"usesMvc"`
	UsesMVVM          bool `json:"usesMvvm"`
	UsesHexagonal     bool `json:"usesHexagonal"`
	UsesRepository    bool `json:"usesRepository"`
	UsesFactory       bool `json:"usesFactory"`
	UsesSingleton     bool `json:"usesSingleton"`
	UsesObserver      bool `json:"usesObserver"`
	UsesDependencyInj bool `json:"usesDependencyInj"`

	// Performance Patterns
	UsesLazyLoading    bool `json:"usesLazyLoading"`
	UsesMemoization    bool `json:"usesMemoization"`
	UsesCaching        bool `json:"usesCaching"`
	UsesDebouncing     bool `json:"usesDebouncing"`
	UsesThrottling     bool `json:"usesThrottling"`
	UsesVirtualization bool `json:"usesVirtualization"`
	UsesCodeSplitting  bool `json:"usesCodeSplitting"`

	// API Patterns
	UsesREST      bool `json:"usesRest"`
	UsesGraphQL   bool `json:"usesGraphql"`
	UsesWebSocket bool `json:"usesWebsocket"`
	UsesgRPC      bool `json:"usesGrpc"`

	// Security Patterns
	HasInputValidation bool `json:"hasInputValidation"`
	HasSanitization    bool `json:"hasSanitization"`
	HasRateLimiting    bool `json:"hasRateLimiting"`
	HasAuth            bool `json:"hasAuth"`
	HasOAuth           bool `json:"hasOauth"`
	HasJWT             bool `json:"hasJwt"`

	// DevOps Patterns
	HasHealthCheck      bool `json:"hasHealthCheck"`
	HasGracefulShutdown bool `json:"hasGracefulShutdown"`
	HasMetrics          bool `json:"hasMetrics"`
	HasTracing          bool `json:"hasTracing"`
	HasLogging          bool `json:"hasLogging"`

	// Keywords Found
	AdvancedKeywords []string `json:"advancedKeywords"`
}

// ComplexityScore represents the calculated complexity metrics
type ComplexityScore struct {
	TotalScore          float64 `json:"totalScore"`          // 0-100
	ArchitectureScore   float64 `json:"architectureScore"`   // 0-100
	InfrastructureScore float64 `json:"infrastructureScore"` // 0-100
	CodeQualityScore    float64 `json:"codeQualityScore"`    // 0-100
	ScaleLabel          string  `json:"scaleLabel"`          // "Hobby", "Startup", "Enterprise"
}

// ============================================
// ARCHITECTURE GRAPH (VISUALIZATION)
// ============================================

type ArchitectureGraph struct {
	Nodes []GraphNode `json:"nodes"`
	Edges []GraphEdge `json:"edges"`
}

type GraphNode struct {
	ID         string `json:"id"`
	Label      string `json:"label"`
	Type       string `json:"type"`             // service, database, queue, gateway, frontend
	Technology string `json:"technology"`       // node, go, postgres, redis
	Parent     string `json:"parent,omitempty"` // for nested grouping
}

type GraphEdge struct {
	Source string `json:"source"`
	Target string `json:"target"`
	Type   string `json:"type"` // connection, dependency
}

// ============================================
// AUTONOMOUS INTELLIGENCE ENGINE OUTPUT
// ============================================

// IntelligenceVerdict - Recruiter-grade project assessment
type IntelligenceVerdict struct {
	// Summary
	ProjectIntentSummary string   `json:"projectIntentSummary"`
	TechStackSnapshot    []string `json:"techStackSnapshot"`

	// Scores
	ArchitectureMaturity int     `json:"architectureMaturity"` // 0-10
	OverallScore         float64 `json:"overallScore"`         // 0-100

	// Developer Assessment
	DeveloperLevel string `json:"developerLevel"` // JUNIOR/INTERMEDIATE/SENIOR/EXPERT
	ProjectIntent  string `json:"projectIntent"`  // LEARNING/HOBBY/PRODUCTION/ENTERPRISE

	// ============================================
	// DIMENSIONAL ANALYSIS (From Go Engine)
	// ============================================
	Dimensions         *DimensionalScores     `json:"dimensions,omitempty"`
	ExperienceAnalysis *ExperienceAnalysis    `json:"experienceAnalysis,omitempty"`
	TrustAnalysis      *TrustAnalysisDetailed `json:"trustAnalysis,omitempty"`
	VerdictDetailed    *VerdictDetailed       `json:"verdictDetailed,omitempty"`

	// Signals
	KeySignals      []string `json:"keySignals"`
	StrengthSignals []string `json:"strengthSignals"`
	RiskSignals     []string `json:"riskSignals"`

	// Suggestions (sorted by priority)
	Suggestions []IntelligenceSuggestion `json:"suggestions"`

	// Skills (extracted with confidence)
	ExtractedSkills []IntelligenceSkill `json:"extractedSkills"`

	// Recruiter Output
	SeniorEngineerVerdict string `json:"seniorEngineerVerdict"`

	// Metadata
	AnalysisTimeMs   int64    `json:"analysisTimeMs"`
	ModulesExecuted  []string `json:"modulesExecuted"`
	ModulesSkipped   []string `json:"modulesSkipped"`
	EarlyTermination bool     `json:"earlyTermination"`
	ExitReason       string   `json:"exitReason,omitempty"`
}

// IntelligenceSuggestion - Impact-weighted improvement suggestion
type IntelligenceSuggestion struct {
	Category    string `json:"category"`
	Message     string `json:"message"`
	ImpactScore int    `json:"impactScore"` // 1-10
	EffortScore int    `json:"effortScore"` // 1-10
	Priority    int    `json:"priority"`    // ImpactScore / EffortScore
}

// IntelligenceSkill - Extracted skill with confidence scoring
type IntelligenceSkill struct {
	Name          string   `json:"name"`
	Category      string   `json:"category"`
	Confidence    int      `json:"confidence"` // 0-100
	Evidence      []string `json:"evidence"`
	ResumeReady   bool     `json:"resumeReady"`
	UsageVerified bool     `json:"usageVerified"` // NEW: True if actual code usage is verified
	UsageStrength float64  `json:"usageStrength"` // NEW: 0.0-1.0 strength of usage evidence
}

// ============================================
// DIMENSIONAL ANALYSIS TYPES (from pkg/api)
// ============================================

type DimensionScoreData struct {
	Score      float64  `json:"score"`
	Confidence float64  `json:"confidence"`
	Signals    []string `json:"signals,omitempty"`
}

type DimensionalScores struct {
	Fundamentals     *DimensionScoreData `json:"fundamentals,omitempty"`
	EngineeringDepth *DimensionScoreData `json:"engineeringDepth,omitempty"`
	ProductionReady  *DimensionScoreData `json:"productionReadiness,omitempty"`
	TestingMaturity  *DimensionScoreData `json:"testingMaturity,omitempty"`
	Architecture     *DimensionScoreData `json:"architecture,omitempty"`
	InfraDevOps      *DimensionScoreData `json:"infraDevOps,omitempty"`
	OverallScore     float64             `json:"overallScore,omitempty"`
	OverallBandLower int                 `json:"overallBandLower,omitempty"`
	OverallBandUpper int                 `json:"overallBandUpper,omitempty"`
}

type ExperienceAnalysis struct {
	Level           string   `json:"level"`      // JUNIOR/MID/SENIOR/STAFF/PRINCIPAL
	Confidence      float64  `json:"confidence"` // 0-1
	YearsMin        int      `json:"yearsMin"`
	YearsMax        int      `json:"yearsMax"`
	YearsEstimate   float64  `json:"yearsEstimate"`
	MatchingFactors []string `json:"matchingFactors,omitempty"`
}

type TrustAnalysisDetailed struct {
	Score             float64  `json:"score"`             // 0-100
	Level             string   `json:"level"`             // LOW/MODERATE/HIGH/VERY_HIGH
	EffortScore       float64  `json:"effortScore"`       // 0-100
	EffortClass       string   `json:"effortClass"`       // TRIVIAL/MODEST/SUBSTANTIAL/IMPRESSIVE
	AuthenticityScore float64  `json:"authenticityScore"` // 0-100
	HasOriginalWork   bool     `json:"hasOriginalWork"`   // True if authenticity score >= 60
	IsLearning        bool     `json:"isLearning"`
	LearningScore     float64  `json:"learningScore"`    // 0-100
	ConsistencyScore  float64  `json:"consistencyScore"` // 0-100
	Flags             []string `json:"flags,omitempty"`
}

type VerdictDetailed struct {
	Summary        string   `json:"summary"`
	Strengths      []string `json:"strengths"`
	GrowthAreas    []string `json:"growthAreas"`
	Cautions       []string `json:"cautions"`
	Recommendation string   `json:"recommendation"`
}

// ============================================
// AUTHENTICITY TYPES
// ============================================

type GitForensics struct {
	CommitCount        int     `json:"commitCount"`
	FirstCommitDate    string  `json:"firstCommitDate"` // string ISO format for JSON
	LastCommitDate     string  `json:"lastCommitDate"`
	LargestCommitRatio float64 `json:"largestCommitRatio"` // largest_diff_lines / total_lines
	RefactorCount      int     `json:"refactorCount"`      // Commits with "refactor", "fix", "clean"
	PrimaryAuthorPct   float64 `json:"primaryAuthorPct"`   // % of commits by top author
	IsPremiumFeature   bool    `json:"isPremium"`
}

type AuthorshipVerdict struct {
	Level      string   `json:"level"`      // "ORGANIC", "SNAPSHOT", "UNCLEAR"
	Confidence string   `json:"confidence"` // "HIGH", "MEDIUM", "LOW"
	Reasons    []string `json:"reasons"`
}

// ============================================
// ENHANCED INTELLIGENCE V3 TYPES
// ============================================

// ASTReport - from internal/intelligence/ast_analyzer.go
type ASTReport struct {
	TotalFiles        int                 `json:"totalFiles"`
	TotalFunctions    int                 `json:"totalFunctions"`
	TotalMethods      int                 `json:"totalMethods"`
	TotalInterfaces   int                 `json:"totalInterfaces"`
	Complexity        ComplexityMetrics   `json:"complexity"`
	GoroutinePatterns GoroutineAnalysis   `json:"goroutinePatterns"`
	ErrorHandling     ErrorHandlingScore  `json:"errorHandling"`
	TypeSafety        TypeSafetyScore     `json:"typeSafety"`
	CodeOrganization  OrganizationMetrics `json:"codeOrganization"`
}

type ComplexityMetrics struct {
	Average      float64        `json:"average"`
	Max          int            `json:"max"`
	Total        int            `json:"total"`
	Distribution map[string]int `json:"distribution"`
}

type GoroutineAnalysis struct {
	Total          int      `json:"total"`
	WithContext    int      `json:"withContext"`
	WithChannels   int      `json:"withChannels"`
	WithMutex      int      `json:"withMutex"`
	HasProperSync  bool     `json:"hasProperSync"`
	PotentialLeaks int      `json:"potentialLeaks"`
	LeakReasons    []string `json:"leakReasons,omitempty"`
}

type ErrorHandlingScore struct {
	Score              int     `json:"score"`
	TotalErrorChecks   int     `json:"totalErrorChecks"`
	IgnoredErrors      int     `json:"ignoredErrors"`
	PanicCalls         int     `json:"panicCalls"`
	ErrorReturns       int     `json:"errorReturns"`
	ErrorHandlingRatio float64 `json:"errorHandlingRatio"`
}

type TypeSafetyScore struct {
	Score          int `json:"score"`
	InterfaceUsage int `json:"interfaceUsage"`
	TypeAssertions int `json:"typeAssertions"`
	UnsafeUsage    int `json:"unsafeUsage"`
	ReflectUsage   int `json:"reflectUsage"`
}

type OrganizationMetrics struct {
	PackageCount    int     `json:"packageCount"`
	AvgFuncPerFile  float64 `json:"avgFuncPerFile"`
	AvgLinesPerFunc float64 `json:"avgLinesPerFunc"`
	LongFunctions   int     `json:"longFunctions"`
	SmallFunctions  int     `json:"smallFunctions"`
}

// ============================================
// AST DEEP ANALYSIS OUTPUT (Phase 1)
// ============================================

// ASTDeepAnalysis contains results from multi-language AST parsing
type ASTDeepAnalysis struct {
	// Summary Stats
	TotalFilesAnalyzed int `json:"totalFilesAnalyzed"`
	TotalImports       int `json:"totalImports"`
	UniqueModules      int `json:"uniqueModules"`
	TotalFunctions     int `json:"totalFunctions"`
	TotalPatterns      int `json:"totalPatterns"`

	// Technology Usage (from import analysis)
	DetectedTechnologies []ASTTechnology `json:"detectedTechnologies"`

	// Code Complexity
	AverageComplexity float64        `json:"averageComplexity"`
	MaxComplexity     int            `json:"maxComplexity"`
	ComplexityLevel   string         `json:"complexityLevel"` // "simple", "moderate", "complex", "highly_complex"
	Distribution      map[string]int `json:"distribution"`

	// Import Graph (file -> modules mapping)
	ImportGraph map[string][]string `json:"importGraph,omitempty"`

	// Detected Patterns
	Patterns []ASTPattern `json:"patterns,omitempty"`
}

// ASTTechnology represents a technology detected via AST
type ASTTechnology struct {
	Name       string   `json:"name"`
	FileCount  int      `json:"fileCount"`
	CallCount  int      `json:"callCount"`
	Intensity  float64  `json:"intensity"`  // 0.0 - 1.0
	Confidence float64  `json:"confidence"` // 0.0 - 1.0
	Evidence   []string `json:"evidence"`
}

// ASTPattern represents a code pattern detected via AST
type ASTPattern struct {
	Type       string  `json:"type"`
	Name       string  `json:"name"`
	Confidence float64 `json:"confidence"`
	Count      int     `json:"count"`
	Evidence   string  `json:"evidence"`
}

// ============================================
// TECH DEPENDENCY GRAPH OUTPUT (Phase 2)
// ============================================

// TechDependencyGraph contains the graph-based analysis results
type TechDependencyGraph struct {
	// Graph Structure
	Nodes []TechGraphNode `json:"nodes"`
	Edges []TechGraphEdge `json:"edges"`

	// Stack Detection
	DetectedStacks []DetectedTechStack `json:"detectedStacks,omitempty"`

	// Graph-Inferred Skills
	InferredSkills []GraphInferredSkill `json:"inferredSkills,omitempty"`

	// Technology Clusters
	Clusters []TechnologyCluster `json:"clusters,omitempty"`

	// Metrics
	TotalNodes     int     `json:"totalNodes"`
	TotalEdges     int     `json:"totalEdges"`
	GraphDensity   float64 `json:"graphDensity"`
	AvgNodeWeight  float64 `json:"avgNodeWeight"`
	MaxConnections int     `json:"maxConnections"`
}

// FindCluster returns a cluster by exact name, or nil if not found
func (g *TechDependencyGraph) FindCluster(name string) *TechnologyCluster {
	for i := range g.Clusters {
		if g.Clusters[i].Name == name {
			return &g.Clusters[i]
		}
	}
	return nil
}

// FindClustersByCategory returns all clusters matching a category
func (g *TechDependencyGraph) FindClustersByCategory(category string) []TechnologyCluster {
	var result []TechnologyCluster
	for _, c := range g.Clusters {
		if strings.EqualFold(c.Category, category) {
			result = append(result, c)
		}
	}
	return result
}

// FindNodeByName returns a graph node by display name, or nil if not found
func (g *TechDependencyGraph) FindNodeByName(name string) *TechGraphNode {
	lower := strings.ToLower(name)
	for i := range g.Nodes {
		if strings.ToLower(g.Nodes[i].Name) == lower {
			return &g.Nodes[i]
		}
	}
	return nil
}

// TechGraphNode represents a technology node in the dependency graph
type TechGraphNode struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Category    string   `json:"category"`
	SubCategory string   `json:"subCategory"`
	Weight      float64  `json:"weight"`
	FileCount   int      `json:"fileCount"`
	Evidence    []string `json:"evidence,omitempty"`
	Sources     []string `json:"sources"` // "ast", "infra", "config"
}

// TechGraphEdge represents a relationship between two technologies
type TechGraphEdge struct {
	From       string  `json:"from"`
	To         string  `json:"to"`
	Type       string  `json:"type"` // "depends_on", "uses_with", "extends"
	Weight     float64 `json:"weight"`
	Confidence float64 `json:"confidence"`
}

// DetectedTechStack represents a recognized technology stack
type DetectedTechStack struct {
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Category    string   `json:"category"` // "fullstack", "backend", "frontend"
	SkillLevel  string   `json:"skillLevel"`
	MatchCount  int      `json:"matchCount"`
	Matched     []string `json:"matched"`
	Missing     []string `json:"missing,omitempty"`
	Confidence  float64  `json:"confidence"`
}

// GraphInferredSkill is a skill that was inferred from graph structure
type GraphInferredSkill struct {
	Name        string   `json:"name"`
	Category    string   `json:"category"`
	Level       string   `json:"level"`
	Confidence  float64  `json:"confidence"`
	Reasoning   string   `json:"reasoning"`
	BasedOn     []string `json:"basedOn"`
	ResumeReady bool     `json:"resumeReady"`
}

// TechnologyCluster is a group of related technologies
type TechnologyCluster struct {
	Name         string   `json:"name"`
	Technologies []string `json:"technologies"`
	Category     string   `json:"category"`
	Strength     float64  `json:"strength"`
}

// ============================================
// CONFIDENCE ANALYSIS OUTPUT (Phase 3)
// ============================================

// ConfidenceAnalysis contains the Bayesian confidence engine output
type ConfidenceAnalysis struct {
	// Per-skill Bayesian posteriors
	SkillConfidences []SkillBayesianResult `json:"skillConfidences"`

	// Code quality assessment
	QualityMetrics CodeQualityMetrics `json:"qualityMetrics"`

	// Git evolution assessment
	EvolutionSignals GitEvolutionSignals `json:"evolutionSignals"`

	// Ensemble verdict
	EnsembleVerdict EnsembleResult `json:"ensembleVerdict"`

	// Overall confidence in analysis
	AnalysisConfidence float64 `json:"analysisConfidence"`
}

// SkillBayesianResult holds the Bayesian posterior for a single skill
type SkillBayesianResult struct {
	SkillName     string  `json:"skillName"`
	Category      string  `json:"category"`
	Prior         float64 `json:"prior"`
	Likelihood    float64 `json:"likelihood"`
	Posterior     float64 `json:"posterior"`
	ASTEvidence   float64 `json:"astEvidence"`
	InfraEvidence float64 `json:"infraEvidence"`
	GraphEvidence float64 `json:"graphEvidence"`
	QualityWeight float64 `json:"qualityWeight"`
	GitWeight     float64 `json:"gitWeight"`
	LowerBound    float64 `json:"lowerBound"`
	UpperBound    float64 `json:"upperBound"`
	ResumeReady   bool    `json:"resumeReady"`
	UsageVerified bool    `json:"usageVerified"`
	UsageStrength float64 `json:"usageStrength"`
}

// CodeQualityMetrics captures code quality dimensions
type CodeQualityMetrics struct {
	OrganizationScore   float64 `json:"organizationScore"`
	ModularityScore     float64 `json:"modularityScore"`
	TestCoverageProxy   float64 `json:"testCoverageProxy"`
	TestMaturity        string  `json:"testMaturity"`
	DocumentationScore  float64 `json:"documentationScore"`
	ComplexityScore     float64 `json:"complexityScore"`
	ComplexityLevel     string  `json:"complexityLevel"`
	ProductionReadiness float64 `json:"productionReadiness"`
	OverallQuality      float64 `json:"overallQuality"`
	QualityTier         string  `json:"qualityTier"`
}

// GitEvolutionSignals captures git history-based confidence adjustments
type GitEvolutionSignals struct {
	AuthorshipLevel    string  `json:"authorshipLevel"`
	AuthorshipFactor   float64 `json:"authorshipFactor"`
	DevelopmentPattern string  `json:"developmentPattern"`
	IterationCount     int     `json:"iterationCount"`
	RefactorRatio      float64 `json:"refactorRatio"`
	ProjectAge         string  `json:"projectAge"`
	MaturityFactor     float64 `json:"maturityFactor"`
	CommitConsistency  float64 `json:"commitConsistency"`
}

// EnsembleResult is the final combined verdict
type EnsembleResult struct {
	ASTScore          float64          `json:"astScore"`
	GraphScore        float64          `json:"graphScore"`
	InfraScore        float64          `json:"infraScore"`
	IntelligenceScore float64          `json:"intelligenceScore"`
	QualityScore      float64          `json:"qualityScore"`
	GitScore          float64          `json:"gitScore"`
	Weights           EnsembleWeightsV `json:"weights"`
	FinalScore        float64          `json:"finalScore"`
	Confidence        float64          `json:"confidence"`
	ScoreLabel        string           `json:"scoreLabel"`
	ScoreBand         [2]int           `json:"scoreBand"`
	TotalSkills       int              `json:"totalSkills"`
	HighConfSkills    int              `json:"highConfSkills"`
	ResumeReadySkills int              `json:"resumeReadySkills"`
	TopFactors        []string         `json:"topFactors"`
	RiskFactors       []string         `json:"riskFactors"`
}

// EnsembleWeightsV defines component weights for ensemble scoring
type EnsembleWeightsV struct {
	AST          float64 `json:"ast"`
	Graph        float64 `json:"graph"`
	Infra        float64 `json:"infra"`
	Intelligence float64 `json:"intelligence"`
	Quality      float64 `json:"quality"`
	Git          float64 `json:"git"`
}

// SecurityReport - from internal/intelligence/security_scanner.go
type SecurityReport struct {
	SecurityScore       int                     `json:"securityScore"`
	TotalIssues         int                     `json:"totalIssues"`
	CriticalIssues      int                     `json:"criticalIssues"`
	HighIssues          int                     `json:"highIssues"`
	MediumIssues        int                     `json:"mediumIssues"`
	LowIssues           int                     `json:"lowIssues"`
	Vulnerabilities     []SecurityVulnerability `json:"vulnerabilities"`
	CategoryBreakdown   map[string]int          `json:"categoryBreakdown"`
	HasHardcodedSecrets bool                    `json:"hasHardcodedSecrets"`
	HasSQLInjection     bool                    `json:"hasSQLInjection"`
	HasWeakCrypto       bool                    `json:"hasWeakCrypto"`
}

type SecurityVulnerability struct {
	Type        string `json:"type"`
	RuleID      string `json:"ruleId"`
	Severity    string `json:"severity"`
	Confidence  string `json:"confidence"`
	File        string `json:"file"`
	Line        int    `json:"line"`
	Code        string `json:"code,omitempty"`
	Description string `json:"description"`
	CWE         string `json:"cwe,omitempty"`
}

// StaticReport - from internal/intelligence/static_analyzer.go
type StaticReport struct {
	CodeQuality       int            `json:"codeQuality"`
	TotalIssues       int            `json:"totalIssues"`
	ErrorIssues       int            `json:"errorIssues"`
	WarningIssues     int            `json:"warningIssues"`
	InfoIssues        int            `json:"infoIssues"`
	Suggestions       []Suggestion   `json:"suggestions"`
	CategoryBreakdown map[string]int `json:"categoryBreakdown"`
	HasUnusedCode     bool           `json:"hasUnusedCode"`
	HasDeprecatedAPIs bool           `json:"hasDeprecatedAPIs"`
	HasRaceConditions bool           `json:"hasRaceConditions"`
}

type Suggestion struct {
	Category    string `json:"category"`
	Severity    string `json:"severity"`
	File        string `json:"file"`
	Line        int    `json:"line"`
	Description string `json:"description"`
	Suggestion  string `json:"suggestion"`
}

// LanguageDistribution - from internal/parser/language_detector.go
type LanguageDistribution struct {
	Primary            string             `json:"primary"`
	Languages          map[string]float64 `json:"languages"`
	TotalBytes         int64              `json:"totalBytes"`
	TotalFiles         int                `json:"totalFiles"`
	FilesByLanguage    map[string]int     `json:"filesByLanguage"`
	IsMultiLanguage    bool               `json:"isMultiLanguage"`
	HasGeneratedCode   bool               `json:"hasGeneratedCode"`
	HasVendoredCode    bool               `json:"hasVendoredCode"`
	DocumentationBytes int64              `json:"documentationBytes"`
	CodeBytes          int64              `json:"codeBytes"`
	AccuracyScore      float64            `json:"accuracyScore"`
}
