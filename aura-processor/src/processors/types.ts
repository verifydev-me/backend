// Types for project signals received from analyzer
export interface ProjectSignals {
  projectId: string;
  userId: string;
  repoUrl: string;

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
  hasCI: boolean;
  hasLinting: boolean;
  hasPrettier: boolean;
  hasTypeScript: boolean;
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
  databaseORM: string;
  routesCount: number;
  middlewareCount: number;
}

export interface GoSignals {
  framework: string;
  usesInterfaces: boolean;
  usesGoroutines: boolean;
  usesChannels: boolean;
  errorHandlingStyle: string;
  hasTests: boolean;
  testCoverage: number;
  moduleCount: number;
  packageStructure: string;
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
