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

// Main signals from Go engine
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
// ============================================

export interface ReactSignals {
  usesHooks: boolean;
  usesContext: boolean;
  usesRedux: boolean;
  usesRouter: boolean;
  componentCount: number;
  hasCustomHooks: boolean;
  usesMemo: boolean;
  usesCallback: boolean;
  usesPortals: boolean;
  hasLazyLoading: boolean;
  usesZustand?: boolean;
  usesReactQuery?: boolean;
  hasErrorBoundaries?: boolean;
  hasSuspense?: boolean;
}

export interface NodeSignals {
  usesExpress: boolean;
  usesFastify: boolean;
  usesNestJS: boolean;
  hasMiddleware: boolean;
  hasRoutes: boolean;
  usesCluster: boolean;
  hasErrorHandler: boolean;
  usesStreams: boolean;
  hasWebSocket?: boolean;
  usesGraphQL?: boolean;
}

export interface GoSignals {
  usesGin: boolean;
  usesEcho: boolean;
  usesFiber: boolean;
  hasGoroutines: boolean;
  usesChannels: boolean;
  hasInterfaces: boolean;
  usesContext: boolean;
  hasErrorHandling: boolean;
  usesGRPC?: boolean;
  hasInternalPkg?: boolean;
}

export interface PythonSignals {
  usesDjango: boolean;
  usesFlask: boolean;
  usesFastAPI: boolean;
  hasAsyncio: boolean;
  usesTyping: boolean;
  hasTesting: boolean;
  usesVirtualenv: boolean;
  hasDocstrings: boolean;
  usesDecorators?: boolean;
  hasMLLibraries?: boolean;
}

export interface AdvancedPatterns {
  hasDI: boolean;
  hasEventSourcing: boolean;
  hasCQRS: boolean;
  usesDesignPatterns: string[];
  hasCleanArch: boolean;
  hasAPIVersioning: boolean;
  hasRateLimiting: boolean;
  hasCircuitBreaker?: boolean;
  hasSagaPattern?: boolean;
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

export type SkillCategory = 
  | 'LANGUAGE'
  | 'FRAMEWORK'
  | 'DATABASE'
  | 'DEVOPS'
  | 'TOOL'
  | 'OTHER';

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

export interface VerifiedSkill {
  name: string;
  category: SkillCategory | string;
  level: string;
  confidence: number;
  evidence: string[];
  keywords: string[];
  resumeReady: boolean;
  weight?: number;
  usageVerified?: boolean; // NEW
  usageStrength?: number;  // NEW
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

