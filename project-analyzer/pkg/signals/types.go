package signals

// AnalyzeRequest - Message received from RabbitMQ
type AnalyzeRequest struct {
	ProjectID     string `json:"projectId"`
	UserID        string `json:"userId"`
	RepoURL       string `json:"repoUrl"`
	RepoName      string `json:"repoName"`
	DefaultBranch string `json:"defaultBranch"`
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
	// INDUSTRY-LEVEL ANALYSIS (NEW)
	// ============================================
	// Industry Analysis
	IndustryAnalysis  *IndustryAnalysis  `json:"industryAnalysis,omitempty"`
	Complexity        *ComplexityScore   `json:"complexity,omitempty"`
	ArchitectureGraph *ArchitectureGraph `json:"architectureGraph,omitempty"`

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
	HasSrcFolder      bool     `json:"hasSrcFolder"`
	HasComponents     bool     `json:"hasComponents"`
	HasUtils          bool     `json:"hasUtils"`
	HasTests          bool     `json:"hasTests"`
	HasTypes          bool     `json:"hasTypes"`
	HasConfig         bool     `json:"hasConfig"`
	HasDocs           bool     `json:"hasDocs"`
	HasAPI            bool     `json:"hasApi"`         // api/ or routes/
	HasModels         bool     `json:"hasModels"`      // models/ or entities/
	HasServices       bool     `json:"hasServices"`    // services/ or domain/
	HasMiddleware     bool     `json:"hasMiddleware"`  // middleware/
	HasControllers    bool     `json:"hasControllers"` // controllers/ or handlers/
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
