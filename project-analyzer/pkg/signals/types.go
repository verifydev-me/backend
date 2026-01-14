package signals

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
	// AUTONOMOUS INTELLIGENCE ENGINE OUTPUT
	// ============================================
	IntelligenceVerdict *IntelligenceVerdict `json:"intelligenceVerdict,omitempty"`

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
	HireSignal            string `json:"hireSignal"` // STRONG_HIRE/HIRE/BORDERLINE/NO_HIRE

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
