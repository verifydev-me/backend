// ============================================
// PROJECT SIGNALS TYPES (Go Engine Match)
// ============================================

// Project Types
export type ProjectType = 
  | 'microservices'
  | 'monolith'
  | 'monorepo'   
  | 'library'
  | 'cli'
  | 'api'
  | 'fullstack'
  | 'frontend'
  | 'backend'
  | 'ml'
  | 'mobile'
  | 'unknown';

// Main signals from Go engine (matches Go `ProjectSignals` JSON tags exactly)
export interface ProjectSignals {
  projectId: string;
  userId: string;
  repoUrl: string;

  // Project Type
  projectType: ProjectType;

  // Tech Stack
  primaryLanguage: string;
  languages: LanguageStats[];
  frameworks: string[];
  databases: string[];
  tools: string[];
  infrastructure?: string[];

  // Structure
  folderStructure: FolderAnalysis;

  // Code Quality
  codeSignals: CodeSignals;

  // Framework-Specific (Go: *ReactSignals, *NodeSignals, etc.)
  reactSignals?: ReactSignals;
  nodeSignals?: NodeSignals;
  goSignals?: GoSignals;
  pythonSignals?: PythonSignals;

  // Advanced Patterns
  advancedPatterns?: AdvancedPatterns;

  // Metadata
  totalFiles: number;
  totalLines: number;
  analyzedAt: string;
  analysisVersion: string;
}

export interface LanguageStats {
  name: string;
  lines: number;
  files: number;
  percentage: number;
}

export interface FolderAnalysis {
  hasSrcFolder: boolean;
  hasComponents: boolean;
  hasUtils: boolean;
  hasTests: boolean;
  hasTypes: boolean;
  hasConfig: boolean;
  hasDocs: boolean;
  hasApi: boolean;
  hasModels: boolean;
  hasServices: boolean;
  hasMiddleware: boolean;
  hasControllers: boolean;
  hasInternal?: boolean;
  hasPkg?: boolean;
  hasCmd?: boolean;
  hasGateway?: boolean;
  maxDepth: number;
  topLevelFolders: string[];
  organizationScore: number;
}

export interface CodeSignals {
  hasReadme: boolean;
  hasLicense: boolean;
  hasGitignore: boolean;
  hasEnvExample: boolean;
  hasDockerfile: boolean;
  hasDockerCompose: boolean;
  hasCI: boolean;
  hasLinting: boolean;
  hasPrettier?: boolean;
  hasTypeScript: boolean;
  hasMakefile?: boolean;
  testFilesCount: number;
  commentDensity: number;
}

// ============================================
// FRAMEWORK-SPECIFIC SIGNALS
// Exact match of Go engine JSON output
// ============================================

// Go: ReactSignals struct (pkg/signals/types.go)
export interface ReactSignals {
  componentCount: number;        // json:"componentCount"
  customHooksCount: number;      // json:"customHooksCount"
  usesHooks: boolean;            // json:"usesHooks"
  usesMemo: boolean;             // json:"usesMemo"
  usesCallback: boolean;         // json:"usesCallback"
  usesContext: boolean;          // json:"usesContext"
  usesReducer: boolean;          // json:"usesReducer"
  usesRef: boolean;              // json:"usesRef"
  stateManagement: string;       // json:"stateManagement" — "redux", "zustand", "context", etc.
  usesLazyLoading: boolean;      // json:"usesLazyLoading"
  usesErrorBoundary: boolean;    // json:"usesErrorBoundary"
  usesSuspense: boolean;         // json:"usesSuspense"
  usesPortal: boolean;           // json:"usesPortal"
  usesForwardRef: boolean;       // json:"usesForwardRef"
  styleApproach: string;         // json:"styleApproach" — "css", "tailwind", "styled-components"
  hasPropTypes: boolean;         // json:"hasPropTypes"
  componentPatterns: string[];   // json:"componentPatterns" — ["compound", "render-prop", "hoc"]
}

// Go: NodeSignals struct (pkg/signals/types.go)
export interface NodeSignals {
  framework: string;             // json:"framework" — "express", "fastify", "nest"
  usesTypeScript: boolean;       // json:"usesTypeScript"
  hasMiddleware: boolean;        // json:"hasMiddleware"
  hasErrorHandling: boolean;     // json:"hasErrorHandling"
  hasValidation: boolean;        // json:"hasValidation"
  hasAuthentication: boolean;    // json:"hasAuthentication"
  hasRateLimiting: boolean;      // json:"hasRateLimiting"
  hasLogging: boolean;           // json:"hasLogging"
  hasCaching: boolean;           // json:"hasCaching"
  hasWebSocket: boolean;         // json:"hasWebSocket"
  hasGraphQL: boolean;           // json:"hasGraphQL"
  hasSwagger: boolean;           // json:"hasSwagger"
  databaseORM: string;           // json:"databaseORM" — "prisma", "typeorm", "mongoose"
  routesCount: number;           // json:"routesCount"
  middlewareCount: number;       // json:"middlewareCount"
}

// Go: GoSignals struct (pkg/signals/types.go)
export interface GoSignals {
  framework: string;             // json:"framework" — "gin", "echo", "fiber", "chi"
  usesInterfaces: boolean;       // json:"usesInterfaces"
  usesGoroutines: boolean;       // json:"usesGoroutines"
  usesChannels: boolean;         // json:"usesChannels"
  usesMutex: boolean;            // json:"usesMutex"
  usesContext: boolean;          // json:"usesContext"
  usesDefer: boolean;            // json:"usesDefer"
  errorHandlingStyle: string;    // json:"errorHandlingStyle" — "standard", "pkg/errors", "wrap"
  hasTests: boolean;             // json:"hasTests"
  hasBenchmarks: boolean;        // json:"hasBenchmarks"
  testCoverage: number;          // json:"testCoverage"
  moduleCount: number;           // json:"moduleCount"
  packageStructure: string;      // json:"packageStructure" — "flat", "standard", "clean-arch"
}

// Go: PythonSignals struct (pkg/signals/types.go)
export interface PythonSignals {
  framework: string;             // json:"framework" — "django", "flask", "fastapi"
  usesTypeHints: boolean;        // json:"usesTypeHints"
  usesAsyncAwait: boolean;       // json:"usesAsyncAwait"
  usesDataclasses: boolean;      // json:"usesDataclasses"
  usesPydantic: boolean;         // json:"usesPydantic"
  usesDecorators: boolean;       // json:"usesDecorators"
  usesGenerators: boolean;       // json:"usesGenerators"
  usesContextMgr: boolean;       // json:"usesContextMgr"
  usesComprehensions: boolean;   // json:"usesComprehensions"
  hasVirtualEnv: boolean;        // json:"hasVirtualEnv"
  hasRequirements: boolean;      // json:"hasRequirements"
  hasPyproject: boolean;         // json:"hasPyproject"
  packageManager: string;        // json:"packageManager" — "pip", "poetry", "pipenv"
  testFramework: string;         // json:"testFramework" — "pytest", "unittest"
  lintTools: string[];           // json:"lintTools" — ["black", "flake8", "mypy"]
}

// Go: AdvancedPatterns struct (pkg/signals/types.go)
export interface AdvancedPatterns {
  // Architecture Patterns
  usesCleanArch: boolean;        // json:"usesCleanArch"
  usesMvc: boolean;              // json:"usesMvc"
  usesMvvm: boolean;             // json:"usesMvvm"
  usesHexagonal: boolean;        // json:"usesHexagonal"
  usesRepository: boolean;       // json:"usesRepository"
  usesFactory: boolean;          // json:"usesFactory"
  usesSingleton: boolean;        // json:"usesSingleton"
  usesObserver: boolean;         // json:"usesObserver"
  usesDependencyInj: boolean;    // json:"usesDependencyInj"

  // Performance Patterns
  usesLazyLoading: boolean;      // json:"usesLazyLoading"
  usesMemoization: boolean;      // json:"usesMemoization"
  usesCaching: boolean;          // json:"usesCaching"
  usesDebouncing: boolean;       // json:"usesDebouncing"
  usesThrottling: boolean;       // json:"usesThrottling"
  usesVirtualization: boolean;   // json:"usesVirtualization"
  usesCodeSplitting: boolean;    // json:"usesCodeSplitting"

  // API Patterns
  usesRest: boolean;             // json:"usesRest"
  usesGraphql: boolean;          // json:"usesGraphql"
  usesWebsocket: boolean;        // json:"usesWebsocket"
  usesGrpc: boolean;             // json:"usesGrpc"

  // Security Patterns
  hasInputValidation: boolean;   // json:"hasInputValidation"
  hasSanitization: boolean;      // json:"hasSanitization"
  hasRateLimiting: boolean;      // json:"hasRateLimiting"
  hasAuth: boolean;              // json:"hasAuth"
  hasOauth: boolean;             // json:"hasOauth"
  hasJwt: boolean;               // json:"hasJwt"

  // DevOps Patterns
  hasHealthCheck: boolean;       // json:"hasHealthCheck"
  hasGracefulShutdown: boolean;  // json:"hasGracefulShutdown"
  hasMetrics: boolean;           // json:"hasMetrics"
  hasTracing: boolean;           // json:"hasTracing"
  hasLogging: boolean;           // json:"hasLogging"

  // Keywords Found
  advancedKeywords: string[];    // json:"advancedKeywords"
}

// ============================================
// AURA CALCULATION TYPES
// ============================================

export interface AuraCalculation {
  projectScore: number;
  breakdown: {
    structure: number;
    codeQuality: number;
    testing: number;
    documentation: number;
    bestPractices: number;
  };
  skills: SkillScore[];
  improvements: string[];
  fullAnalysis: FullAnalysis;
}

export interface SkillScore {
  name: string;
  score: number;
  category: SkillCategory;
  evidence: string[];
}

// Expanded to match Go engine's SkillCategory values
export type SkillCategory = 
  | 'LANGUAGE'
  | 'FRAMEWORK'
  | 'DATABASE'
  | 'DEVOPS'
  | 'TOOL'
  | 'OTHER'
  // Go engine categories (lowercase in JSON)
  | 'architecture'
  | 'infrastructure'
  | 'database'
  | 'messaging'
  | 'security'
  | 'devops'
  | 'observability'
  | 'testing'
  | 'language'
  | 'framework'
  | 'ml'
  | 'data_science'
  | 'cloud'
  | 'performance';

export interface FullAnalysis {
  summary?: string;
  strengths?: string[];
  weaknesses?: string[];
  suggestions?: string[];
  bestPractices?: {
    followed: string[];
    missing: string[];
    score?: number;
  };
}

// ============================================
// INDUSTRY ANALYSIS (Go: IndustryAnalysis)
// ============================================

export interface IndustryAnalysis {
  architecture: SystemArchitecture;
  verifiedSkills: VerifiedSkill[];
  skillsByCategory: Record<SkillCategory, VerifiedSkill[]>;
  totalSkills: number;
  highConfidenceSkills: number;
  resumeReadySkills: number;
  overallScore: number;
  engineeringLevel: string;
  infraSignals?: {
    signals: string[];
    signalDetails?: Record<string, { confidence: number; evidence: string[]; source: string }>;
    serviceCount: number;
    serviceNames: string[];
    customServiceCount?: number;
    thirdPartyServiceCount?: number;
    customServiceNames?: string[];
    thirdPartyServiceNames?: string[];
  };
}

export interface SystemArchitecture {
  type: string;
  services: string[];
  serviceCount: number;
  communication: string[];
  patterns: string[];
  gateway?: string;
}

export interface SkillDepth {
  level: string;           // "surface", "moderate", "deep", "expert"
  diversityCount: number;  // Number of distinct patterns/APIs used
  patternsUsed: number;    // Number of distinct code patterns
  fileSpread: number;      // How many files the tech spans
}

export interface RichEvidence {
  summary: string[];                      // Human-readable summaries
  patterns?: Record<string, any>;         // Detailed pattern data (hooks, routes, etc.)
  depth?: SkillDepth;                     // Depth assessment
}

export interface VerifiedSkill {
  name: string;
  category: SkillCategory | string;
  level: string;
  confidence: number;
  evidence: string[];
  richEvidence?: RichEvidence;   // NEW: Granular pattern-based evidence
  keywords: string[];
  resumeReady: boolean;
  weight?: number;
  usageVerified?: boolean;
  usageStrength?: number;
}

// ============================================
// LEGACY TYPES (for aura-calculator compatibility)
// ============================================

export interface ProjectFullAnalysis {
  summary?: string;
  strengths?: string[];
  weaknesses?: string[];
  suggestions?: string[];
  bestPractices?: {
    followed: string[];
    missing: string[];
    score?: number;
  };
  techStack?: {
    languages?: any[];
    frameworks?: string[];
    databases?: string[];
    tools?: string[];
    infrastructure?: string[];
  };
  folderStructure?: Partial<FolderAnalysis>;
  codeQuality?: Partial<CodeSignals>;
  optimizations?: OptimizationSuggestion[];
  frameworkAnalysis?: any;
}

export interface OptimizationSuggestion {
  category: string;
  priority: number;
  title: string;
  description: string;
  impact: string;
}

// ============================================
// TECH DEPENDENCY GRAPH (Phase 2 - Go Engine)
// ============================================

export interface TechDependencyGraph {
  totalNodes: number;
  totalEdges: number;
  graphDensity: number;
  avgNodeWeight: number;
  maxConnections: number;
  nodes: TechGraphNode[];
  edges: TechGraphEdge[];
  detectedStacks: DetectedTechStack[];
  inferredSkills: GraphInferredSkill[];
  clusters: TechnologyCluster[];
}

export interface TechGraphNode {
  id: string;
  name: string;
  category: string;
  subCategory: string;
  weight: number;
  fileCount: number;
  evidence: string[];
  sources: string[];
}

export interface TechGraphEdge {
  from: string;
  to: string;
  type: string;
  weight: number;
  confidence: number;
}

export interface DetectedTechStack {
  name: string;
  description: string;
  category: string;
  skillLevel: string;
  matchCount: number;
  matched: string[];
  missing: string[];
  confidence: number;
}

export interface GraphInferredSkill {
  name: string;
  category: string;
  level: string;
  confidence: number;
  reasoning: string;
  basedOn: string[];
  resumeReady: boolean;
}

export interface TechnologyCluster {
  name: string;
  technologies: string[];
  category: string;
  strength: number;
}

// ============================================
// CONFIDENCE REPORT (Phase 3 - Bayesian Engine)
// ============================================

export interface ConfidenceReport {
  skillConfidences: SkillBayesianResult[];
  qualityMetrics: CodeQualityMetrics;
  evolutionSignals: GitEvolutionSignals;
  ensembleVerdict: EnsembleVerdict;
  analysisConfidence: number;
}

export interface SkillBayesianResult {
  skillName: string;
  category: string;
  prior: number;
  likelihood: number;
  posterior: number;
  astEvidence: number;
  infraEvidence: number;
  graphEvidence: number;
  qualityWeight: number;
  gitWeight: number;
  lowerBound: number;
  upperBound: number;
  resumeReady: boolean;
  usageVerified: boolean;
  usageStrength: number;
}

export interface CodeQualityMetrics {
  organizationScore: number;
  modularityScore: number;
  testCoverageProxy: number;
  testMaturity: string;
  documentationScore: number;
  complexityScore: number;
  complexityLevel: string;
  productionReadiness: number;
  overallQuality: number;
  qualityTier: string;
}

export interface GitEvolutionSignals {
  authorshipLevel: string;
  authorshipFactor: number;
  developmentPattern: string;
  iterationCount: number;
  refactorRatio: number;
  projectAge: string;
  maturityFactor: number;
  commitConsistency: number;
}

export interface EnsembleVerdict {
  astScore: number;
  graphScore: number;
  infraScore: number;
  intelligenceScore: number;
  qualityScore: number;
  gitScore: number;
  weights: EnsembleWeights;
  finalScore: number;
  confidence: number;
  scoreLabel: string;
  scoreBand: [number, number];
  totalSkills: number;
  highConfSkills: number;
  resumeReadySkills: number;
  topFactors: string[];
  riskFactors: string[];
}

export interface EnsembleWeights {
  ast: number;
  graph: number;
  infra: number;
  intelligence: number;
  quality: number;
  git: number;
}
