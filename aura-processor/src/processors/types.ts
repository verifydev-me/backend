// Types for project signals received from analyzer

// Project Types
export type ProjectType = 
  | 'microservice'
  | 'monolith'
  | 'monorepo'   
  | 'library'
  | 'cli'
  | 'api'
  | 'fullstack'
  | 'frontend'
  | 'backend'
  | 'unknown';

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

  // Structure
  folderStructure: FolderAnalysis;

  // Code Quality
  codeSignals: CodeSignals;

  // Framework-Specific
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
  hasPrettier: boolean;
  hasTypeScript: boolean;
  hasMakefile: boolean;
  testFilesCount: number;
  commentDensity: number;
}

export interface ReactSignals {
  componentCount: number;
  customHooksCount: number;
  usesHooks: boolean;
  usesMemo: boolean;
  usesCallback: boolean;
  usesContext: boolean;
  usesReducer: boolean;
  usesRef: boolean;
  stateManagement: string;
  usesLazyLoading: boolean;
  usesErrorBoundary: boolean;
  usesSuspense: boolean;
  usesPortal: boolean;
  usesForwardRef: boolean;
  styleApproach: string;
  hasPropTypes: boolean;
  componentPatterns: string[];
}

export interface NodeSignals {
  framework: string;
  usesTypeScript: boolean;
  hasMiddleware: boolean;
  hasErrorHandling: boolean;
  hasValidation: boolean;
  hasAuthentication: boolean;
  hasRateLimiting: boolean;
  hasLogging: boolean;
  hasCaching: boolean;
  hasWebSocket: boolean;
  hasGraphQL: boolean;
  hasSwagger: boolean;
  databaseORM: string;
  routesCount: number;
  middlewareCount: number;
}

export interface GoSignals {
  framework: string;
  usesInterfaces: boolean;
  usesGoroutines: boolean;
  usesChannels: boolean;
  usesMutex: boolean;
  usesContext: boolean;
  usesDefer: boolean;
  errorHandlingStyle: string;
  hasTests: boolean;
  hasBenchmarks: boolean;
  testCoverage: number;
  moduleCount: number;
  packageStructure: string;
}

export interface PythonSignals {
  framework: string;
  usesTypeHints: boolean;
  usesAsyncAwait: boolean;
  usesDataclasses: boolean;
  usesPydantic: boolean;
  usesDecorators: boolean;
  usesGenerators: boolean;
  usesContextMgr: boolean;
  usesComprehensions: boolean;
  hasVirtualEnv: boolean;
  hasRequirements: boolean;
  hasPyproject: boolean;
  packageManager: string;
  testFramework: string;
  lintTools: string[];
}

export interface AdvancedPatterns {
  // Architecture Patterns
  usesCleanArch: boolean;
  usesMvc: boolean;
  usesMvvm: boolean;
  usesHexagonal: boolean;
  usesRepository: boolean;
  usesFactory: boolean;
  usesSingleton: boolean;
  usesObserver: boolean;
  usesDependencyInj: boolean;

  // Performance Patterns
  usesLazyLoading: boolean;
  usesMemoization: boolean;
  usesCaching: boolean;
  usesDebouncing: boolean;
  usesThrottling: boolean;
  usesVirtualization: boolean;
  usesCodeSplitting: boolean;

  // API Patterns
  usesRest: boolean;
  usesGraphql: boolean;
  usesWebsocket: boolean;
  usesGrpc: boolean;

  // Security Patterns
  hasInputValidation: boolean;
  hasSanitization: boolean;
  hasRateLimiting: boolean;
  hasAuth: boolean;
  hasOauth: boolean;
  hasJwt: boolean;

  // DevOps Patterns
  hasHealthCheck: boolean;
  hasGracefulShutdown: boolean;
  hasMetrics: boolean;
  hasTracing: boolean;
  hasLogging: boolean;

  // Keywords Found
  advancedKeywords: string[];
}

// Aura calculation result with full analysis
export interface AuraCalculation {
  projectScore: number;
  breakdown: {
    structure: number;      // Folder organization
    codeQuality: number;    // Best practices
    testing: number;        // Test coverage
    documentation: number;  // README, comments
    techStack: number;      // Modern frameworks/tools
    complexity: number;     // Project size/depth
  };
  skills: SkillScore[];
  improvements: string[];
  
  // Full Analysis for Recruiter View
  fullAnalysis: ProjectFullAnalysis;
}

export interface ProjectFullAnalysis {
  // Structure Analysis
  folderStructure: {
    hasSrcFolder: boolean;
    hasComponents: boolean;
    hasTests: boolean;
    hasTypes: boolean;
    hasConfig: boolean;
    hasDocs: boolean;
    organizationScore: number;
    maxDepth: number;
  };
  
  // Code Quality Details
  codeQuality: {
    hasLinting: boolean;
    hasPrettier: boolean;
    hasTypeScript: boolean;
    hasDockerfile: boolean;
    hasCI: boolean;
    hasEnvExample: boolean;
    testFilesCount: number;
    commentDensity: number;
  };
  
  // Best Practices Breakdown
  bestPractices: {
    followed: string[];
    missing: string[];
    score: number; // out of 100
  };
  
  // Optimization Suggestions
  optimizations: OptimizationSuggestion[];
  
  // Framework-Specific Analysis
  frameworkAnalysis?: {
    framework: string;
    patternsDetected: string[];
    suggestions: string[];
    advancedUsage: string[];
  };
  
  // Tech Stack Summary
  techStack: {
    languages: { name: string; percentage: number }[];
    frameworks: string[];
    databases: string[];
    tools: string[];
  };

  // Project Type
  projectType?: ProjectType;

  // Advanced Patterns Summary
  advancedPatternsSummary?: {
    detected: string[];
    score: number;
  };
}

export interface OptimizationSuggestion {
  category: 'performance' | 'security' | 'structure' | 'testing' | 'documentation';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
}

export interface SkillScore {
  name: string;
  category: 'LANGUAGE' | 'FRAMEWORK' | 'DATABASE' | 'DEVOPS' | 'TOOL';
  score: number;
  evidence: string[];
}

// ============================================
// INDUSTRY-LEVEL ANALYSIS TYPES
// From the 3-Layer Deterministic Pipeline
// ============================================

export type SkillCategory = 
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
  | 'cloud'
  | 'performance';

export type SkillLevel = 'basic' | 'intermediate' | 'advanced' | 'expert';

export type ArchitectureType = 
  | 'monolith'
  | 'microservices'
  | 'monorepo'       // Frontend + Backend in one repo
  | 'serverless'
  | 'event_driven'
  | 'modular_monolith'
  | 'layered'
  | 'hexagonal'
  | 'clean_architecture';

export type CommunicationType = 
  | 'http'
  | 'rest'
  | 'graphql'
  | 'grpc'
  | 'websocket'
  | 'message_queue'
  | 'event_bus';

export interface VerifiedSkill {
  name: string;
  category: SkillCategory;
  level: SkillLevel;
  confidence: number;       // 0.0 - 1.0
  evidence: string[];       // Human-readable proof
  signals: string[];        // Underlying signals
  keywords: string[];       // Related keywords
  resumeReady: boolean;     // Safe for resume
  weight: number;           // Importance (1-10)
}

export interface SystemArchitecture {
  type: ArchitectureType;
  communication: CommunicationType[];
  gateway?: string;
  serviceCount: number;
  services?: string[];
  patterns: string[];
  engineeringLevel: string;
}

export interface IndustryAnalysis {
  // Architecture Analysis
  architecture: SystemArchitecture;

  // Verified Skills (the gold)
  verifiedSkills: VerifiedSkill[];

  // Skill Summary by Category
  skillsByCategory: Record<SkillCategory, VerifiedSkill[]>;

  // Quality Metrics
  totalSkills: number;
  highConfidenceSkills: number;  // confidence >= 0.8
  resumeReadySkills: number;
  overallScore: number;          // 0-100

  // Engineering Level
  engineeringLevel: string;

  // Raw Signals (for transparency)
  infraSignals?: {
    signals: string[];
    serviceCount: number;
    serviceNames: string[];
  };
}

// Updated ProjectSignals to include industry analysis
export interface ProjectSignalsWithIndustry extends ProjectSignals {
  industryAnalysis?: IndustryAnalysis;
}
