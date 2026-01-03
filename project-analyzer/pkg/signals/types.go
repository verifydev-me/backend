package signals

// AnalyzeRequest - Message received from RabbitMQ
type AnalyzeRequest struct {
	ProjectID     string `json:"projectId"`
	UserID        string `json:"userId"`
	RepoURL       string `json:"repoUrl"`
	RepoName      string `json:"repoName"`
	DefaultBranch string `json:"defaultBranch"`
}

// ProjectSignals - Facts extracted from code analysis
type ProjectSignals struct {
	ProjectID string `json:"projectId"`
	UserID    string `json:"userId"`
	RepoURL   string `json:"repoUrl"`

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
	ReactSignals *ReactSignals `json:"reactSignals,omitempty"`
	NodeSignals  *NodeSignals  `json:"nodeSignals,omitempty"`
	GoSignals    *GoSignals    `json:"goSignals,omitempty"`

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
	MaxDepth          int      `json:"maxDepth"`
	TopLevelFolders   []string `json:"topLevelFolders"`
	OrganizationScore int      `json:"organizationScore"` // 0-100
}

// CodeSignals - General code quality signals
type CodeSignals struct {
	HasReadme      bool    `json:"hasReadme"`
	HasLicense     bool    `json:"hasLicense"`
	HasGitignore   bool    `json:"hasGitignore"`
	HasEnvExample  bool    `json:"hasEnvExample"`
	HasDockerfile  bool    `json:"hasDockerfile"`
	HasCI          bool    `json:"hasCI"`
	HasLinting     bool    `json:"hasLinting"`
	HasPrettier    bool    `json:"hasPrettier"`
	HasTypeScript  bool    `json:"hasTypeScript"`
	TestFilesCount int     `json:"testFilesCount"`
	CommentDensity float64 `json:"commentDensity"` // comments per 100 lines
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
	ErrorHandlingStyle string  `json:"errorHandlingStyle"` // standard, pkg/errors
	HasTests           bool    `json:"hasTests"`
	TestCoverage       float64 `json:"testCoverage"`
	ModuleCount        int     `json:"moduleCount"`
	PackageStructure   string  `json:"packageStructure"` // flat, standard, clean-arch
}
