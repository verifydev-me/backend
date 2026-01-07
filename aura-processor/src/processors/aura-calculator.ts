import { logger } from '../utils/logger.js';
import type {
  ProjectSignals,
  AuraCalculation,
  SkillScore,
  ProjectFullAnalysis,
  OptimizationSuggestion,
  IndustryAnalysis,
  VerifiedSkill,
} from './types.js';

// Extended signals type with industry analysis
interface ProjectSignalsExtended extends ProjectSignals {
  industryAnalysis?: IndustryAnalysis;
}

/**
 * Aura Calculator
 * 
 * Converts project signals into aura scores with full analysis
 * 
 * SCORING BREAKDOWN (max 100 per project):
 * - Structure: 20 points (increased - gives credit to complex structures)
 * - Code Quality: 20 points
 * - Testing: 10 points
 * - Documentation: 10 points
 * - Tech Stack: 15 points (increased - rewards modern tech)
 * - Complexity: 10 points (increased - rewards large projects)
 * - Industry Skills: 15 points (from verified skills)
 */
export class AuraCalculator {
  calculate(signals: ProjectSignalsExtended): AuraCalculation {
    logger.debug({ projectId: signals.projectId }, 'Calculating aura');

    const breakdown = {
      structure: this.calculateStructureScore(signals),
      codeQuality: this.calculateCodeQualityScore(signals),
      testing: this.calculateTestingScore(signals),
      documentation: this.calculateDocumentationScore(signals),
      techStack: this.calculateTechStackScore(signals),
      complexity: this.calculateComplexityScore(signals),
    };

    // Calculate industry skills bonus (up to 15 points)
    const industryBonus = this.calculateIndustryBonus(signals.industryAnalysis);

    // Calculate project type bonus
    const projectTypeBonus = this.calculateProjectTypeBonus(signals);

    const projectScore =
      breakdown.structure +
      breakdown.codeQuality +
      breakdown.testing +
      breakdown.documentation +
      breakdown.techStack +
      breakdown.complexity +
      industryBonus +
      projectTypeBonus;

    const skills = this.extractSkills(signals);
    const improvements = this.generateImprovements(signals, breakdown);
    const fullAnalysis = this.generateFullAnalysis(signals, breakdown);

    // Add industry analysis to full analysis
    if (signals.industryAnalysis) {
      (fullAnalysis as any).industryAnalysis = signals.industryAnalysis;
    }

    logger.info({
      projectId: signals.projectId,
      projectScore,
      industryBonus,
      verifiedSkillCount: signals.industryAnalysis?.totalSkills || 0,
      engineeringLevel: signals.industryAnalysis?.engineeringLevel || 'unknown',
    }, '🎯 Aura calculation complete');

    return {
      projectScore: Math.min(projectScore, 100),
      breakdown,
      skills,
      improvements,
      fullAnalysis,
    };
  }

  /**
   * Calculate industry skills bonus (max 15 points)
   * This rewards production-level engineering patterns
   */
  private calculateIndustryBonus(industry?: IndustryAnalysis): number {
    if (!industry || !industry.verifiedSkills) {
      return 0;
    }

    let bonus = 0;

    // Base score from verified skills (up to 8 points)
    const highConfidenceSkills = industry.verifiedSkills.filter(
      (s: VerifiedSkill) => s.confidence >= 0.7 && s.resumeReady
    );
    bonus += Math.min(highConfidenceSkills.length * 1, 8);

    // Architecture bonus (up to 4 points)
    if (industry.architecture) {
      switch (industry.architecture.type) {
        case 'microservices':
          bonus += 4;
          break;
        case 'event_driven':
          bonus += 3;
          break;
        case 'monorepo':   
          bonus += 2;
          break;
        case 'clean_architecture':
        case 'hexagonal':
          bonus += 2;
          break;
        case 'modular_monolith':
          bonus += 1;
          break;
      }
    }

    // Engineering level bonus (up to 3 points)
    switch (industry.engineeringLevel) {
      case 'Production-grade':
        bonus += 3;
        break;
      case 'Advanced':
        bonus += 2;
        break;
      case 'Intermediate':
        bonus += 1;
        break;
    }

    return Math.min(bonus, 15);
  }

  /**
   * Calculate project type bonus (max 10 points)
   * Rewards complex project architectures
   */
  private calculateProjectTypeBonus(signals: ProjectSignalsExtended): number {
    let bonus = 0;

    // Project type bonus
    switch (signals.projectType) {
      case 'microservice':
        bonus += 5;
        break;
      case 'monorepo':
        bonus += 4; // Monorepo is valuable - organized fullstack structure
        break;
      case 'fullstack':
        bonus += 4;
        break;
      case 'api':
      case 'backend':
        bonus += 3;
        break;
      case 'frontend':
        bonus += 2;
        break;
      case 'library':
      case 'cli':
        bonus += 2;
        break;
    }

    // Docker compose with multiple services
    if (signals.codeSignals?.hasDockerCompose) {
      bonus += 2;
    }

    // Multiple frameworks (e.g., React + Node.js)
    if (signals.frameworks?.length >= 2) {
      bonus += 1;
    }

    // Multiple databases
    if (signals.databases?.length >= 2) {
      bonus += 1;
    }

    // Has message queue (RabbitMQ, Kafka, etc)
    const messageQueues = ['RabbitMQ', 'Kafka', 'Redis'];
    if (signals.databases?.some(db => messageQueues.includes(db)) || 
        signals.tools?.some(t => messageQueues.includes(t))) {
      bonus += 1;
    }

    return Math.min(bonus, 10);
  }

  // Structure Score (max 20)
  private calculateStructureScore(signals: ProjectSignals): number {
    let score = 0;
    const folder = signals.folderStructure;

    // Basic structure (8 points)
    if (folder.hasSrcFolder) score += 2;
    if (folder.hasComponents) score += 1;
    if (folder.hasUtils) score += 1;
    if (folder.hasTypes) score += 2;
    if (folder.hasConfig) score += 1;
    if (folder.hasApi) score += 1;

    // Advanced structure (7 points)
    if (folder.hasServices) score += 2;
    if (folder.hasModels) score += 1;
    if (folder.hasMiddleware) score += 2;
    if (folder.hasControllers) score += 2;

    // Organization quality (5 points)
    score += Math.min(Math.round(folder.organizationScore / 20), 5);

    return Math.min(score, 20);
  }

  // Code Quality Score (max 20)
  private calculateCodeQualityScore(signals: ProjectSignals): number {
    let score = 0;
    const code = signals.codeSignals;

    if (code.hasLinting) score += 3;
    if (code.hasPrettier) score += 2;
    if (code.hasTypeScript) score += 4;
    if (code.hasGitignore) score += 1;
    if (code.hasEnvExample) score += 2;
    if (code.hasDockerfile) score += 3;
    if (code.hasDockerCompose) score += 2;
    if (code.hasCI) score += 2;
    if (code.hasMakefile) score += 1;

    return Math.min(score, 20);
  }

  // Testing Score (max 10)
  private calculateTestingScore(signals: ProjectSignals): number {
    let score = 0;
    const code = signals.codeSignals;
    const folder = signals.folderStructure;

    if (folder.hasTests) score += 3;
    if (code.testFilesCount > 0) score += 2;
    if (code.testFilesCount >= 5) score += 2;
    if (code.testFilesCount >= 10) score += 2;
    if (code.testFilesCount >= 20) score += 1;

    return Math.min(score, 10);
  }

  // Documentation Score (max 10)
  private calculateDocumentationScore(signals: ProjectSignals): number {
    let score = 0;
    const code = signals.codeSignals;
    const folder = signals.folderStructure;

    if (code.hasReadme) score += 4;
    if (code.hasLicense) score += 1;
    if (folder.hasDocs) score += 3;
    if (code.commentDensity >= 5) score += 1;
    if (code.commentDensity >= 10) score += 1;

    return Math.min(score, 10);
  }

  // Tech Stack Score (max 15 - rewards modern tech)
  private calculateTechStackScore(signals: ProjectSignals): number {
    let score = 0;

    const modernFrameworks = [
      'React', 'Next.js', 'Vue', 'Nuxt', 'Svelte',
      'NestJS', 'Fastify', 'Gin', 'Fiber', 'FastAPI',
      'Express', 'Koa', 'Echo', 'Chi', 'Django', 'Flask'
    ];

    for (const framework of signals.frameworks) {
      if (modernFrameworks.includes(framework)) {
        score += 3;
      }
    }

    const modernTools = ['Vite', 'Vitest', 'Playwright', 'Cypress', 'Jest', 'Prisma'];
    for (const tool of signals.tools) {
      if (modernTools.includes(tool)) {
        score += 1;
      }
    }

    // Databases
    if (signals.databases.length > 0) score += 2;
    if (signals.databases.length >= 2) score += 1;

    return Math.min(score, 15);
  }

  // Complexity Score (max 5)
  // Complexity Score (max 10 - rewards large, multi-language projects)
  private calculateComplexityScore(signals: ProjectSignals): number {
    let score = 0;

    // Lines of code (up to 5 points)
    if (signals.totalLines >= 500) score += 1;
    if (signals.totalLines >= 2000) score += 1;
    if (signals.totalLines >= 5000) score += 1;
    if (signals.totalLines >= 10000) score += 1;
    if (signals.totalLines >= 20000) score += 1;

    // Multi-language (up to 3 points)
    if (signals.languages.length >= 2) score += 1;
    if (signals.languages.length >= 3) score += 1;
    if (signals.languages.length >= 5) score += 1;

    // File count (up to 2 points)
    if (signals.totalFiles >= 20) score += 1;
    if (signals.totalFiles >= 50) score += 1;

    return Math.min(score, 10);
  }

  // Extract skills from signals AND industry analysis verified skills
  private extractSkills(signals: ProjectSignalsExtended): SkillScore[] {
    const skills: SkillScore[] = [];
    const addedSkillNames = new Set<string>(); // Track added skills to avoid duplicates

    // First, add verified skills from industry analysis (most accurate)
    if (signals.industryAnalysis?.verifiedSkills) {
      for (const verifiedSkill of signals.industryAnalysis.verifiedSkills) {
        // Convert IndustryAnalysis category to SkillScore category
        const category = this.mapVerifiedSkillCategory(verifiedSkill.category);
        
        skills.push({
          name: verifiedSkill.name,
          category,
          score: Math.round(verifiedSkill.confidence * 100), // Convert 0-1 to 0-100
          evidence: verifiedSkill.evidence,
        });
        addedSkillNames.add(verifiedSkill.name.toLowerCase());
      }
      
      logger.debug({
        projectId: signals.projectId,
        verifiedSkillCount: signals.industryAnalysis.verifiedSkills.length,
        skills: signals.industryAnalysis.verifiedSkills.map(s => s.name),
      }, '🔍 Added verified skills from industry analysis');
    }

    // Add primary language if not already added
    if (signals.primaryLanguage && !addedSkillNames.has(signals.primaryLanguage.toLowerCase())) {
      skills.push({
        name: signals.primaryLanguage,
        category: 'LANGUAGE',
        score: this.calculateLanguageScore(signals),
        evidence: [`Primary language with ${signals.totalLines} lines`],
      });
      addedSkillNames.add(signals.primaryLanguage.toLowerCase());
    }

    // Add frameworks from basic detection (fallback if not in verified skills)
    for (const framework of signals.frameworks) {
      if (!addedSkillNames.has(framework.toLowerCase())) {
        skills.push({
          name: framework,
          category: 'FRAMEWORK',
          score: this.calculateFrameworkScore(signals, framework),
          evidence: this.getFrameworkEvidence(signals, framework),
        });
        addedSkillNames.add(framework.toLowerCase());
      }
    }

    // Add databases from basic detection (fallback if not in verified skills)
    for (const db of signals.databases) {
      if (!addedSkillNames.has(db.toLowerCase())) {
        skills.push({
          name: db,
          category: 'DATABASE',
          score: 60,
          evidence: ['Used in project'],
        });
        addedSkillNames.add(db.toLowerCase());
      }
    }

    // Add Docker if detected and not already added
    if (signals.codeSignals.hasDockerfile && !addedSkillNames.has('docker')) {
      skills.push({
        name: 'Docker',
        category: 'DEVOPS',
        score: 70,
        evidence: ['Dockerfile present'],
      });
      addedSkillNames.add('docker');
    }

    // Add CI/CD if detected and not already added
    if (signals.codeSignals.hasCI && !addedSkillNames.has('ci/cd')) {
      skills.push({
        name: 'CI/CD',
        category: 'DEVOPS',
        score: 70,
        evidence: ['GitHub Actions or GitLab CI configured'],
      });
      addedSkillNames.add('ci/cd');
    }

    logger.info({
      projectId: signals.projectId,
      totalSkills: skills.length,
      skillNames: skills.map(s => s.name),
    }, '📊 Skills extracted');

    return skills;
  }

  // Map verified skill category to SkillScore category
  private mapVerifiedSkillCategory(category: string): SkillScore['category'] {
    const categoryMap: Record<string, SkillScore['category']> = {
      'language': 'LANGUAGE',
      'framework': 'FRAMEWORK',
      'database': 'DATABASE',
      'devops': 'DEVOPS',
      'infrastructure': 'DEVOPS',
      'tool': 'TOOL',
      'library': 'FRAMEWORK',
      'messaging': 'TOOL',
      'webserver': 'DEVOPS',
      'cache': 'DATABASE',
      'search': 'DATABASE',
      'testing': 'TOOL',
    };
    return categoryMap[category.toLowerCase()] || 'TOOL';
  }

  private calculateLanguageScore(signals: ProjectSignals): number {
    let score = 50;
    if (signals.totalLines >= 1000) score += 10;
    if (signals.totalLines >= 5000) score += 10;
    if (signals.codeSignals.hasTypeScript) score += 15;
    if (signals.codeSignals.testFilesCount > 0) score += 10;
    return Math.min(score, 100);
  }

  private calculateFrameworkScore(signals: ProjectSignals, framework: string): number {
    let score = 50;

    if (framework === 'React' && signals.reactSignals) {
      const react = signals.reactSignals;
      if (react.usesHooks) score += 10;
      if (react.usesMemo || react.usesCallback) score += 10;
      if (react.customHooksCount > 0) score += 15;
      if (react.usesContext || react.usesReducer) score += 10;
      if (react.usesLazyLoading) score += 5;
    }

    return Math.min(score, 100);
  }

  private getFrameworkEvidence(signals: ProjectSignals, framework: string): string[] {
    const evidence: string[] = ['Framework detected'];

    if (framework === 'React' && signals.reactSignals) {
      const react = signals.reactSignals;
      if (react.usesHooks) evidence.push('Uses React Hooks');
      if (react.customHooksCount > 0) evidence.push(`${react.customHooksCount} custom hooks`);
      if (react.componentCount > 0) evidence.push(`${react.componentCount} components`);
      if (react.stateManagement) evidence.push(`State: ${react.stateManagement}`);
      if (react.usesMemo) evidence.push('Performance: useMemo');
      if (react.usesCallback) evidence.push('Performance: useCallback');
      if (react.usesLazyLoading) evidence.push('Lazy loading');
      if (react.usesErrorBoundary) evidence.push('Error boundaries');
    }

    return evidence;
  }

  // Generate improvement suggestions
  private generateImprovements(
    signals: ProjectSignals,
    _breakdown: AuraCalculation['breakdown']
  ): string[] {
    const improvements: string[] = [];

    if (!signals.codeSignals.hasReadme) {
      improvements.push('Add a README.md to document your project');
    }
    if (!signals.codeSignals.hasLinting) {
      improvements.push('Setup ESLint for consistent code style');
    }
    if (!signals.codeSignals.hasTypeScript && signals.primaryLanguage === 'JavaScript') {
      improvements.push('Migrate to TypeScript for type safety');
    }
    if (signals.codeSignals.testFilesCount === 0) {
      improvements.push('Add unit tests to improve reliability');
    }
    if (!signals.codeSignals.hasCI) {
      improvements.push('Setup GitHub Actions for CI/CD');
    }
    if (!signals.codeSignals.hasDockerfile) {
      improvements.push('Add Dockerfile for containerization');
    }
    if (!signals.folderStructure.hasTypes && signals.codeSignals.hasTypeScript) {
      improvements.push('Create types/ folder for shared types');
    }
    if (!signals.codeSignals.hasEnvExample) {
      improvements.push('Add .env.example for environment setup');
    }

    return improvements.slice(0, 5);
  }

  // Generate full analysis for recruiter view
  private generateFullAnalysis(
    signals: ProjectSignals,
    breakdown: AuraCalculation['breakdown']
  ): ProjectFullAnalysis {
    const folder = signals.folderStructure;
    const code = signals.codeSignals;

    // Build best practices
    const followed: string[] = [];
    const missing: string[] = [];

    if (code.hasTypeScript) followed.push('TypeScript for type safety');
    else if (signals.primaryLanguage === 'JavaScript') missing.push('TypeScript migration');

    if (code.hasLinting) followed.push('ESLint for code quality');
    else missing.push('ESLint setup');

    if (code.hasPrettier) followed.push('Prettier for formatting');
    else missing.push('Prettier setup');

    if (code.hasDockerfile) followed.push('Docker containerization');
    else missing.push('Docker setup');

    if (code.hasCI) followed.push('CI/CD pipeline');
    else missing.push('CI/CD setup');

    if (code.testFilesCount > 0) followed.push(`Unit testing (${code.testFilesCount} test files)`);
    else missing.push('Unit testing');

    if (code.hasEnvExample) followed.push('Environment documentation');
    else missing.push('.env.example file');

    if (code.hasReadme) followed.push('Project documentation');
    else missing.push('README.md');

    if (folder.hasSrcFolder) followed.push('Organized project structure');
    if (folder.hasTypes) followed.push('Type definitions folder');
    if (folder.hasTests) followed.push('Dedicated tests folder');

    // Calculate best practices score
    const bestPracticesScore = Math.round((followed.length / (followed.length + missing.length)) * 100);

    // Generate optimization suggestions
    const optimizations = this.generateOptimizations(signals);

    // Framework-specific analysis
    let frameworkAnalysis;
    if (signals.reactSignals) {
      frameworkAnalysis = this.generateReactAnalysis(signals.reactSignals);
    }

    return {
      folderStructure: {
        hasSrcFolder: folder.hasSrcFolder,
        hasComponents: folder.hasComponents,
        hasTests: folder.hasTests,
        hasTypes: folder.hasTypes,
        hasConfig: folder.hasConfig,
        hasDocs: folder.hasDocs,
        organizationScore: folder.organizationScore,
        maxDepth: folder.maxDepth,
      },
      codeQuality: {
        hasLinting: code.hasLinting,
        hasPrettier: code.hasPrettier,
        hasTypeScript: code.hasTypeScript,
        hasDockerfile: code.hasDockerfile,
        hasCI: code.hasCI,
        hasEnvExample: code.hasEnvExample,
        testFilesCount: code.testFilesCount,
        commentDensity: code.commentDensity,
      },
      bestPractices: {
        followed,
        missing,
        score: bestPracticesScore,
      },
      optimizations,
      frameworkAnalysis,
      techStack: {
        languages: signals.languages.map(l => ({ name: l.name, percentage: l.percentage })),
        frameworks: signals.frameworks,
        databases: signals.databases,
        tools: signals.tools,
      },
    };
  }

  private generateOptimizations(signals: ProjectSignals): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // Performance optimizations
    if (signals.reactSignals) {
      const react = signals.reactSignals;
      if (!react.usesMemo && react.componentCount > 10) {
        suggestions.push({
          category: 'performance',
          priority: 'medium',
          title: 'Add useMemo for expensive calculations',
          description: 'Use useMemo hook to memoize expensive computations',
          impact: 'Reduces unnecessary re-renders',
        });
      }
      if (!react.usesLazyLoading) {
        suggestions.push({
          category: 'performance',
          priority: 'medium',
          title: 'Implement code splitting',
          description: 'Use React.lazy() and Suspense for route-based code splitting',
          impact: 'Faster initial load time',
        });
      }
      if (!react.usesErrorBoundary) {
        suggestions.push({
          category: 'structure',
          priority: 'high',
          title: 'Add Error Boundaries',
          description: 'Implement error boundaries to catch component errors',
          impact: 'Better error handling and UX',
        });
      }
    }

    // Security
    if (!signals.codeSignals.hasEnvExample) {
      suggestions.push({
        category: 'security',
        priority: 'high',
        title: 'Document environment variables',
        description: 'Add .env.example to document required environment variables',
        impact: 'Prevents accidental secret exposure',
      });
    }

    // Testing
    if (signals.codeSignals.testFilesCount === 0) {
      suggestions.push({
        category: 'testing',
        priority: 'high',
        title: 'Add unit tests',
        description: 'Implement unit tests for critical functionality',
        impact: 'Improved code reliability',
      });
    } else if (signals.codeSignals.testFilesCount < 5) {
      suggestions.push({
        category: 'testing',
        priority: 'medium',
        title: 'Increase test coverage',
        description: 'Add more tests for better coverage',
        impact: 'Reduced bugs in production',
      });
    }

    // Documentation
    if (!signals.folderStructure.hasDocs) {
      suggestions.push({
        category: 'documentation',
        priority: 'low',
        title: 'Add docs folder',
        description: 'Create a docs/ folder for project documentation',
        impact: 'Better project maintainability',
      });
    }

    return suggestions;
  }

  private generateReactAnalysis(react: ProjectSignals['reactSignals']) {
    if (!react) return undefined;

    const patterns: string[] = [];
    const suggestions: string[] = [];
    const advancedUsage: string[] = [];

    // Patterns detected
    if (react.usesHooks) patterns.push('React Hooks');
    if (react.customHooksCount > 0) patterns.push(`${react.customHooksCount} Custom Hooks`);
    if (react.usesContext) patterns.push('Context API');
    if (react.usesReducer) patterns.push('useReducer for state');
    if (react.stateManagement) patterns.push(`State: ${react.stateManagement}`);

    // Advanced usage
    if (react.usesMemo) advancedUsage.push('useMemo optimization');
    if (react.usesCallback) advancedUsage.push('useCallback optimization');
    if (react.usesLazyLoading) advancedUsage.push('Code splitting with lazy()');
    if (react.usesErrorBoundary) advancedUsage.push('Error boundaries');
    if (react.usesRef) advancedUsage.push('useRef for DOM/values');

    // Suggestions
    if (!react.stateManagement || react.stateManagement === 'Context') {
      suggestions.push('Consider Zustand or Jotai for complex state');
    }
    if (!react.usesMemo && react.componentCount > 5) {
      suggestions.push('Add useMemo for expensive computations');
    }
    if (!react.usesLazyLoading) {
      suggestions.push('Implement route-based code splitting');
    }

    return {
      framework: 'React',
      patternsDetected: patterns,
      suggestions,
      advancedUsage,
    };
  }
}

export const auraCalculator = new AuraCalculator();
