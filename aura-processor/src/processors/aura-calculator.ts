import { logger } from '../utils/logger.js';
import type {
  ProjectSignals,
  AuraCalculation,
  SkillScore,
  ProjectFullAnalysis,
  OptimizationSuggestion,
} from './types.js';

/**
 * Aura Calculator
 * 
 * Converts project signals into aura scores with full analysis
 * 
 * SCORING BREAKDOWN (max 100 per project):
 * - Structure: 20 points
 * - Code Quality: 25 points
 * - Testing: 20 points
 * - Documentation: 15 points
 * - Tech Stack: 15 points
 * - Complexity: 5 points
 */
export class AuraCalculator {
  calculate(signals: ProjectSignals): AuraCalculation {
    logger.debug({ projectId: signals.projectId }, 'Calculating aura');

    const breakdown = {
      structure: this.calculateStructureScore(signals),
      codeQuality: this.calculateCodeQualityScore(signals),
      testing: this.calculateTestingScore(signals),
      documentation: this.calculateDocumentationScore(signals),
      techStack: this.calculateTechStackScore(signals),
      complexity: this.calculateComplexityScore(signals),
    };

    const projectScore =
      breakdown.structure +
      breakdown.codeQuality +
      breakdown.testing +
      breakdown.documentation +
      breakdown.techStack +
      breakdown.complexity;

    const skills = this.extractSkills(signals);
    const improvements = this.generateImprovements(signals, breakdown);
    const fullAnalysis = this.generateFullAnalysis(signals, breakdown);

    return {
      projectScore,
      breakdown,
      skills,
      improvements,
      fullAnalysis,
    };
  }

  // Structure Score (max 20)
  private calculateStructureScore(signals: ProjectSignals): number {
    let score = 0;
    const folder = signals.folderStructure;

    if (folder.hasSrcFolder) score += 4;
    if (folder.hasComponents) score += 3;
    if (folder.hasUtils) score += 2;
    if (folder.hasTypes) score += 3;
    if (folder.hasConfig) score += 2;

    score += Math.min(folder.organizationScore / 20, 6);

    return Math.min(score, 20);
  }

  // Code Quality Score (max 25)
  private calculateCodeQualityScore(signals: ProjectSignals): number {
    let score = 0;
    const code = signals.codeSignals;

    if (code.hasLinting) score += 5;
    if (code.hasPrettier) score += 3;
    if (code.hasTypeScript) score += 5;
    if (code.hasGitignore) score += 2;
    if (code.hasEnvExample) score += 3;
    if (code.hasDockerfile) score += 4;
    if (code.hasCI) score += 3;

    return Math.min(score, 25);
  }

  // Testing Score (max 20)
  private calculateTestingScore(signals: ProjectSignals): number {
    let score = 0;
    const code = signals.codeSignals;
    const folder = signals.folderStructure;

    if (folder.hasTests) score += 5;
    if (code.testFilesCount > 0) score += 5;
    if (code.testFilesCount >= 5) score += 3;
    if (code.testFilesCount >= 10) score += 3;
    if (code.testFilesCount >= 20) score += 4;

    return Math.min(score, 20);
  }

  // Documentation Score (max 15)
  private calculateDocumentationScore(signals: ProjectSignals): number {
    let score = 0;
    const code = signals.codeSignals;
    const folder = signals.folderStructure;

    if (code.hasReadme) score += 5;
    if (code.hasLicense) score += 2;
    if (folder.hasDocs) score += 4;
    if (code.commentDensity >= 5) score += 2;
    if (code.commentDensity >= 10) score += 2;

    return Math.min(score, 15);
  }

  // Tech Stack Score (max 15)
  private calculateTechStackScore(signals: ProjectSignals): number {
    let score = 0;

    const modernFrameworks = [
      'React', 'Next.js', 'Vue', 'Nuxt', 'Svelte',
      'NestJS', 'Fastify', 'Gin', 'Fiber', 'FastAPI'
    ];

    for (const framework of signals.frameworks) {
      if (modernFrameworks.includes(framework)) {
        score += 3;
      }
    }

    const modernTools = ['Vite', 'Vitest', 'Playwright', 'Cypress'];
    for (const tool of signals.tools) {
      if (modernTools.includes(tool)) {
        score += 2;
      }
    }

    if (signals.databases.length > 0) score += 2;

    return Math.min(score, 15);
  }

  // Complexity Score (max 5)
  private calculateComplexityScore(signals: ProjectSignals): number {
    let score = 0;

    if (signals.totalLines >= 500) score += 1;
    if (signals.totalLines >= 2000) score += 1;
    if (signals.totalLines >= 5000) score += 1;

    if (signals.languages.length >= 2) score += 1;
    if (signals.languages.length >= 4) score += 1;

    return Math.min(score, 5);
  }

  // Extract skills from signals
  private extractSkills(signals: ProjectSignals): SkillScore[] {
    const skills: SkillScore[] = [];

    if (signals.primaryLanguage) {
      skills.push({
        name: signals.primaryLanguage,
        category: 'LANGUAGE',
        score: this.calculateLanguageScore(signals),
        evidence: [`Primary language with ${signals.totalLines} lines`],
      });
    }

    for (const framework of signals.frameworks) {
      skills.push({
        name: framework,
        category: 'FRAMEWORK',
        score: this.calculateFrameworkScore(signals, framework),
        evidence: this.getFrameworkEvidence(signals, framework),
      });
    }

    for (const db of signals.databases) {
      skills.push({
        name: db,
        category: 'DATABASE',
        score: 60,
        evidence: ['Used in project'],
      });
    }

    if (signals.codeSignals.hasDockerfile) {
      skills.push({
        name: 'Docker',
        category: 'DEVOPS',
        score: 70,
        evidence: ['Dockerfile present'],
      });
    }

    if (signals.codeSignals.hasCI) {
      skills.push({
        name: 'CI/CD',
        category: 'DEVOPS',
        score: 70,
        evidence: ['GitHub Actions or GitLab CI configured'],
      });
    }

    return skills;
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

  private generateReactAnalysis(react: typeof signals.reactSignals) {
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
