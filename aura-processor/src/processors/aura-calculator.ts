import { logger } from '../utils/logger.js';
import type {
  ProjectSignals,
  AuraCalculation,
  SkillScore,
} from './types.js';

/**
 * Aura Calculator
 * 
 * Converts project signals into aura scores
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

    return {
      projectScore,
      breakdown,
      skills,
      improvements,
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

    // Organization score contribution
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

    // Test files count
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

    // Comment density
    if (code.commentDensity >= 5) score += 2;
    if (code.commentDensity >= 10) score += 2;

    return Math.min(score, 15);
  }

  // Tech Stack Score (max 15)
  private calculateTechStackScore(signals: ProjectSignals): number {
    let score = 0;

    // Modern frameworks
    const modernFrameworks = [
      'React', 'Next.js', 'Vue', 'Nuxt', 'Svelte',
      'NestJS', 'Fastify', 'Gin', 'Fiber', 'FastAPI'
    ];

    for (const framework of signals.frameworks) {
      if (modernFrameworks.includes(framework)) {
        score += 3;
      }
    }

    // Modern tools
    const modernTools = ['Vite', 'Vitest', 'Playwright', 'Cypress'];
    for (const tool of signals.tools) {
      if (modernTools.includes(tool)) {
        score += 2;
      }
    }

    // Database/ORM
    if (signals.databases.length > 0) score += 2;

    return Math.min(score, 15);
  }

  // Complexity Score (max 5)
  private calculateComplexityScore(signals: ProjectSignals): number {
    let score = 0;

    // Lines of code
    if (signals.totalLines >= 500) score += 1;
    if (signals.totalLines >= 2000) score += 1;
    if (signals.totalLines >= 5000) score += 1;

    // Multiple languages
    if (signals.languages.length >= 2) score += 1;
    if (signals.languages.length >= 4) score += 1;

    return Math.min(score, 5);
  }

  // Extract skills from signals
  private extractSkills(signals: ProjectSignals): SkillScore[] {
    const skills: SkillScore[] = [];

    // Primary language
    if (signals.primaryLanguage) {
      skills.push({
        name: signals.primaryLanguage,
        category: 'LANGUAGE',
        score: this.calculateLanguageScore(signals),
        evidence: [`Primary language with ${signals.totalLines} lines`],
      });
    }

    // Frameworks
    for (const framework of signals.frameworks) {
      skills.push({
        name: framework,
        category: 'FRAMEWORK',
        score: this.calculateFrameworkScore(signals, framework),
        evidence: this.getFrameworkEvidence(signals, framework),
      });
    }

    // Databases
    for (const db of signals.databases) {
      skills.push({
        name: db,
        category: 'DATABASE',
        score: 60, // Base score for using a database
        evidence: ['Used in project'],
      });
    }

    // DevOps
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
    let score = 50; // Base

    if (signals.totalLines >= 1000) score += 10;
    if (signals.totalLines >= 5000) score += 10;
    if (signals.codeSignals.hasTypeScript) score += 15;
    if (signals.codeSignals.testFilesCount > 0) score += 10;

    return Math.min(score, 100);
  }

  private calculateFrameworkScore(signals: ProjectSignals, framework: string): number {
    let score = 50; // Base

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
    const evidence: string[] = ['Framework detected in project'];

    if (framework === 'React' && signals.reactSignals) {
      const react = signals.reactSignals;
      if (react.usesHooks) evidence.push('Uses React Hooks');
      if (react.customHooksCount > 0) evidence.push(`${react.customHooksCount} custom hooks`);
      if (react.componentCount > 0) evidence.push(`${react.componentCount} components`);
      if (react.stateManagement) evidence.push(`State: ${react.stateManagement}`);
    }

    return evidence;
  }

  // Generate improvement suggestions
  private generateImprovements(
    signals: ProjectSignals,
    breakdown: AuraCalculation['breakdown']
  ): string[] {
    const improvements: string[] = [];

    if (!signals.codeSignals.hasReadme) {
      improvements.push('Add a README.md to document your project');
    }

    if (!signals.codeSignals.hasLinting) {
      improvements.push('Setup ESLint for consistent code style');
    }

    if (!signals.codeSignals.hasTypeScript && signals.primaryLanguage === 'JavaScript') {
      improvements.push('Consider migrating to TypeScript for better type safety');
    }

    if (breakdown.testing < 10) {
      improvements.push('Add unit tests to improve code reliability');
    }

    if (!signals.codeSignals.hasCI) {
      improvements.push('Setup GitHub Actions for automated testing');
    }

    if (!signals.codeSignals.hasDockerfile) {
      improvements.push('Add Dockerfile for containerized deployment');
    }

    if (!signals.folderStructure.hasTypes && signals.codeSignals.hasTypeScript) {
      improvements.push('Create a types/ folder for shared type definitions');
    }

    return improvements.slice(0, 5); // Max 5 suggestions
  }
}

export const auraCalculator = new AuraCalculator();
