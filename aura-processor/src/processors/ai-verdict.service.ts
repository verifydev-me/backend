import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../utils/logger.js';

// ============================================
// AI PROJECT INSIGHT — Dual-purpose response
// Section 1: For the developer (project detail page)
// Section 2: For the recruiter (single verdict)
// ============================================

export interface GrowthArea {
  area: string;
  current: string;
  suggestion: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface RecruiterVerdict {
  headline: string;
  recommendation: 'STRONG_HIRE' | 'HIRE' | 'LEAN_HIRE' | 'NO_HIRE';
  confidenceLevel: string;
  oneLineSummary: string;
  topStrengths: string[];
  topConcerns: string[];
  estimatedLevel: string;
  interviewFocus: string[];
}

export interface AIProjectInsight {
  // ═══ FOR USER (Project Detail Page) ═══
  projectTitle: string;
  projectSummary: string;
  whatYouBuilt: string;
  techHighlights: string[];
  impressivePatterns: string[];
  growthAreas: GrowthArea[];
  learningPath: string[];
  projectMaturity: string;

  // ═══ FOR RECRUITER ═══
  recruiterVerdict: RecruiterVerdict;
}

// Legacy compat — maps new structure to old field names for DB storage
export interface AIVerdict {
  title: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  hireRecommendation: 'STRONG_HIRE' | 'HIRE' | 'MAYBE' | 'NO';
  riskScore: number;
  riskAnalysis: string;
  skillsNarrative: string;
  interviewQuestions: string[];
}

// ============================================
// SIGNAL CONTEXT — What we extract from full signals
// to build a readable prompt
// ============================================

interface SignalContext {
  projectType?: string;
  primaryLanguage?: string;
  totalFiles?: number;
  totalLines?: number;
  frameworks?: string[];
  databases?: string[];
  tools?: string[];
  infrastructure?: string[];
  scaleLabel?: string;
  architectureType?: string;
  architecturePatterns?: string[];
  serviceCount?: number;
  serviceNames?: string[];
  // Skills
  verifiedSkills?: Array<{
    name: string;
    category: string;
    confidence: number;
    resumeReady: boolean;
    usageVerified: boolean;
    evidence?: string[];
  }>;
  // Dimensions
  dimensions?: Record<string, number>;
  // Trust
  trustScore?: number;
  trustLevel?: string;
  // Experience
  experienceLevel?: string;
  experienceYearRange?: string;
  // Quality
  qualityTier?: string;
  organizationScore?: number;
  testMaturity?: string;
  // Code signals
  hasDockerfile?: boolean;
  hasCI?: boolean;
  hasTests?: boolean;
  testFilesCount?: number;
  // Strengths/risks from Go engine
  strengthSignals?: string[];
  riskSignals?: string[];
  projectIntent?: string;
  // Folder structure highlights
  topLevelFolders?: string[];
}

export class AIVerdictService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string) {
    if (!apiKey) {
      logger.warn('⚠️ GEMINI_API_KEY not found. AI verdicts will be skipped.');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  }

  /**
   * Generate project insight from full signals (not compact output).
   * Returns both the new AIProjectInsight and a legacy AIVerdict for backward compat.
   */
  async generateInsight(signals: any): Promise<{ insight: AIProjectInsight | null; legacy: AIVerdict | null }> {
    if (!this.genAI) return { insight: null, legacy: null };

    try {
      const context = this.extractContext(signals);
      const prompt = this.buildStructuredPrompt(context);

      logger.info({ pid: signals.projectId }, '🤖 Requesting AI project insight from Gemini...');

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const insight = this.parseInsightResponse(text);
      if (!insight) return { insight: null, legacy: null };

      // Map to legacy format for backward compat with existing DB fields
      const legacy = this.mapToLegacy(insight);

      return { insight, legacy };
    } catch (error) {
      logger.error({ err: error, pid: signals.projectId }, '❌ Failed to generate AI insight');
      return { insight: null, legacy: null };
    }
  }

  /**
   * Legacy method — still works if called with CompactOutput
   */
  async generateVerdict(compact: any): Promise<AIVerdict | null> {
    if (!this.genAI) return null;

    try {
      const prompt = this.buildLegacyPrompt(compact);
      logger.info({ pid: compact.pid }, '🤖 Requesting AI verdict from Gemini (legacy)...');

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return this.parseLegacyResponse(text);
    } catch (error) {
      logger.error({ err: error, pid: compact.pid }, '❌ Failed to generate AI verdict');
      return null;
    }
  }

  // ════════════════════════════════════════════
  // CONTEXT EXTRACTION — Pull structured data from raw signals
  // ════════════════════════════════════════════

  private extractContext(signals: any): SignalContext {
    const industry = signals.industryAnalysis || {};
    const intelligence = signals.intelligenceVerdict || {};
    const dims = intelligence.dimensions || {};
    const trust = intelligence.trustAnalysis || {};
    const exp = intelligence.experienceAnalysis || {};
    const verdict = intelligence.verdictDetailed || {};
    const complexity = signals.complexity || {};
    const folder = signals.folderStructure || {};
    const code = signals.codeSignals || {};

    // Extract top verified skills (with code proof)
    const allSkills = (industry.verifiedSkills || []).map((s: any) => ({
      name: s.name,
      category: s.category || 'other',
      confidence: s.confidence || 0,
      resumeReady: s.resumeReady || false,
      usageVerified: s.usageVerified || false,
      evidence: (s.evidence || []).slice(0, 2),
    }));

    // Build dimensions map
    const dimensionMap: Record<string, number> = {};
    if (dims.fundamentals?.score != null) dimensionMap['Fundamentals'] = Math.round(dims.fundamentals.score);
    if (dims.engineeringDepth?.score != null) dimensionMap['Engineering Depth'] = Math.round(dims.engineeringDepth.score);
    if (dims.productionReadiness?.score != null) dimensionMap['Production Readiness'] = Math.round(dims.productionReadiness.score);
    if (dims.testingMaturity?.score != null) dimensionMap['Testing Maturity'] = Math.round(dims.testingMaturity.score);
    if (dims.architecture?.score != null) dimensionMap['Architecture'] = Math.round(dims.architecture.score);
    if (dims.infraDevOps?.score != null) dimensionMap['DevOps'] = Math.round(dims.infraDevOps.score);

    return {
      projectType: signals.projectType || industry.architecture?.type || 'unknown',
      primaryLanguage: signals.primaryLanguage || 'Unknown',
      totalFiles: signals.totalFiles || 0,
      totalLines: signals.totalLines || 0,
      frameworks: signals.frameworks || [],
      databases: signals.databases || [],
      tools: signals.tools || [],
      infrastructure: signals.infrastructure || [],
      scaleLabel: complexity.scaleLabel || '',
      architectureType: industry.architecture?.type || 'unknown',
      architecturePatterns: industry.architecture?.patterns || [],
      serviceCount: industry.architecture?.serviceCount || 0,
      serviceNames: industry.architecture?.services || [],
      verifiedSkills: allSkills,
      dimensions: Object.keys(dimensionMap).length > 0 ? dimensionMap : undefined,
      trustScore: trust.score != null ? Math.round(trust.score) : undefined,
      trustLevel: trust.level || undefined,
      experienceLevel: exp.level || undefined,
      experienceYearRange: exp.yearsEstimate || (exp.yearsMin != null && exp.yearsMax != null ? `${exp.yearsMin}-${exp.yearsMax} years` : undefined),
      qualityTier: signals.confidenceReport?.qualityMetrics?.qualityTier || undefined,
      organizationScore: folder.organizationScore || undefined,
      testMaturity: signals.confidenceReport?.qualityMetrics?.testMaturity || undefined,
      hasDockerfile: code.hasDockerfile || false,
      hasCI: code.hasCI || false,
      hasTests: (code.testFilesCount || 0) > 0,
      testFilesCount: code.testFilesCount || 0,
      strengthSignals: intelligence.strengthSignals || verdict.strengths || [],
      riskSignals: intelligence.riskSignals || verdict.cautions || [],
      projectIntent: intelligence.projectIntentSummary || '',
      topLevelFolders: folder.topLevelFolders || [],
    };
  }

  // ════════════════════════════════════════════
  // STRUCTURED PROMPT — ChatGPT-quality, human-readable output
  // ════════════════════════════════════════════

  private buildStructuredPrompt(ctx: SignalContext): string {
    const lines: string[] = [];

    // ── ROLE & GOAL ──
    lines.push('You are a brilliant senior engineering mentor — think of yourself as the best tech lead someone could have.');
    lines.push('You are reviewing a developer\'s GitHub project. Your job is two-fold:');
    lines.push('  1. Talk to the developer like a kind, honest mentor. Be SPECIFIC, WARM, and ACTIONABLE. Like a ChatGPT conversation.');
    lines.push('  2. Give recruiters a clear, data-driven hiring signal. No fluff, just facts.');
    lines.push('');
    lines.push('CRITICAL STYLE RULES:');
    lines.push('  - Write like you\'re explaining to a friend, not writing a corporate report.');
    lines.push('  - Be SPECIFIC. Never say "good practices" — say WHAT practice and WHY it matters.');
    lines.push('  - Use short punchy sentences. Active voice. Real numbers when you have them.');
    lines.push('  - For the developer: be encouraging but brutally honest about gaps.');
    lines.push('  - Every point must be USEFUL — if it doesn\'t help them grow, cut it.');
    lines.push('');
    lines.push('═══ PROJECT DATA ═══');
    lines.push(`Language: ${ctx.primaryLanguage} | Files: ${ctx.totalFiles} | Lines: ${ctx.totalLines?.toLocaleString()} | Scale: ${ctx.scaleLabel || 'unknown'}`);

    if (ctx.scaleLabel) lines.push(`SCALE: ${ctx.scaleLabel}`);

    if (ctx.architectureType && ctx.architectureType !== 'unknown') {
      const parts = [`ARCHITECTURE: ${ctx.architectureType}`];
      if (ctx.serviceCount && ctx.serviceCount > 1) parts.push(`(${ctx.serviceCount} services: ${ctx.serviceNames?.join(', ') || 'unnamed'})`);
      if (ctx.architecturePatterns?.length) parts.push(`| Patterns: ${ctx.architecturePatterns.join(', ')}`);
      lines.push(parts.join(' '));
    }

    if (ctx.frameworks?.length) lines.push(`FRAMEWORKS: ${ctx.frameworks.join(', ')}`);
    if (ctx.databases?.length) lines.push(`DATABASES: ${ctx.databases.join(', ')}`);
    if (ctx.infrastructure?.length) lines.push(`INFRASTRUCTURE: ${ctx.infrastructure.join(', ')}`);

    // Quality context
    const qualityParts: string[] = [];
    if (ctx.qualityTier) qualityParts.push(`Quality: ${ctx.qualityTier}`);
    if (ctx.trustLevel) qualityParts.push(`Trust: ${ctx.trustLevel} (${ctx.trustScore}/100)`);
    if (ctx.organizationScore) qualityParts.push(`Organization: ${ctx.organizationScore}/100`);
    if (ctx.testMaturity) qualityParts.push(`Testing: ${ctx.testMaturity}`);
    if (qualityParts.length) lines.push(`QUALITY: ${qualityParts.join(' | ')}`);

    // Dimensions
    if (ctx.dimensions && Object.keys(ctx.dimensions).length > 0) {
      const dimStr = Object.entries(ctx.dimensions).map(([k, v]) => `${k} ${v}`).join(' | ');
      lines.push(`DIMENSIONS (0-100): ${dimStr}`);
    }

    // Experience
    if (ctx.experienceLevel) {
      lines.push(`ESTIMATED LEVEL: ${ctx.experienceLevel}${ctx.experienceYearRange ? ` (${ctx.experienceYearRange})` : ''}`);
    }

    // Skills
    if (ctx.verifiedSkills?.length) {
      const verified = ctx.verifiedSkills.filter(s => s.usageVerified);
      const resumeReady = ctx.verifiedSkills.filter(s => s.resumeReady);
      const highConf = ctx.verifiedSkills.filter(s => s.confidence >= 0.7);

      lines.push('');
      lines.push(`═══ SKILLS (${ctx.verifiedSkills.length} total, ${verified.length} code-verified, ${resumeReady.length} resume-ready) ═══`);

      // Show top skills grouped
      if (verified.length > 0) {
        lines.push(`VERIFIED (code proof): ${verified.map(s => `${s.name} (${Math.round(s.confidence * 100)}%)`).join(', ')}`);
      }
      if (highConf.length > 0) {
        const notVerified = highConf.filter(s => !s.usageVerified);
        if (notVerified.length > 0) {
          lines.push(`HIGH CONFIDENCE (from config/deps): ${notVerified.slice(0, 10).map(s => s.name).join(', ')}`);
        }
      }
    }

    // Folder structure
    if (ctx.topLevelFolders?.length) {
      lines.push(`FOLDER STRUCTURE: ${ctx.topLevelFolders.join(', ')}`);
    }

    // Code signals
    const codeFeatures: string[] = [];
    if (ctx.hasDockerfile) codeFeatures.push('Docker');
    if (ctx.hasCI) codeFeatures.push('CI/CD');
    if (ctx.hasTests) codeFeatures.push(`Tests (${ctx.testFilesCount} files)`);
    if (codeFeatures.length) lines.push(`CODE FEATURES: ${codeFeatures.join(', ')}`);

    // Intent
    if (ctx.projectIntent) lines.push(`PROJECT INTENT: ${ctx.projectIntent}`);

    // Strengths/risks from Go engine
    if (ctx.strengthSignals?.length) lines.push(`ENGINE STRENGTHS: ${ctx.strengthSignals.slice(0, 5).join(', ')}`);
    if (ctx.riskSignals?.length) lines.push(`ENGINE RISKS: ${ctx.riskSignals.slice(0, 5).join(', ')}`);

    lines.push('');
    lines.push('═══ WHAT TO WRITE ═══');
    lines.push('');
    lines.push('── projectTitle ──');
    lines.push('  5-7 words max. Make it sound like a real product, not a school project.');
    lines.push('  Pattern: "[What it does] + [core tech]" or "[Tech] + [what you accomplished]"');
    lines.push('  BAD:  "React/Next.js Prototype with Zustand and Tailwind"');
    lines.push('  GOOD: "Next.js Developer Portfolio Verification Platform" or "Full-Stack Dev Hiring Intelligence App"');
    lines.push('');
    lines.push('── projectSummary ──');
    lines.push('  2-3 sentences. Start with what the app DOES, then what\'s technically interesting about it.');
    lines.push('  Mention the engineering achievement, not just the tech list.');
    lines.push('  BAD:  "Uses TypeScript, React, Next.js, Tailwind, and Zustand."');
    lines.push('  GOOD: "A developer verification platform that analyzes GitHub repos and surfaces hiring signals. Built with Next.js App Router, it handles real-time data, complex state, and a rich UI — all in TypeScript."');
    lines.push('');
    lines.push('── whatYouBuilt ──');
    lines.push('  THIS IS THE MOST IMPORTANT FIELD. Write like a brilliant mentor talking to their student.');
    lines.push('  4-5 sentences. Be warm, specific, and inspiring. Address the developer directly ("You built...").');
    lines.push('  Paragraph 1: What is this app and what problem does it solve?');
    lines.push('  Paragraph 2: What tech choices stand out and why they show skill?');
    lines.push('  Paragraph 3: What does this project say about you as an engineer?');
    lines.push('  BAD:  "This project is a solid start! You used React/Next.js with Tailwind."');
    lines.push('  GOOD: "You built a full-stack developer intelligence platform — something genuinely complex and valuable. The fact that you reached for Zustand instead of prop-drilling, and React Query instead of raw fetch calls, shows you already think about scalability and maintainability. Your 37 custom hooks and 168 components tell me you understand component architecture deeply. The gap between this and \'production-ready\' is testing and deployment infrastructure — not skills."');
    lines.push('');
    lines.push('── techHighlights ──');
    lines.push('  Max 5 items. Each one = one specific decision + why it matters. Like bullet points in a code review.');
    lines.push('  BAD:  "TypeScript usage with a high confidence score."');
    lines.push('  GOOD: "TypeScript at 97% codebase coverage — near-complete type safety with no JavaScript leakage"');
    lines.push('  GOOD: "37 custom React hooks showing deep component abstraction skills"');
    lines.push('  GOOD: "Zustand for global state instead of Context API — a deliberate scalability choice"');
    lines.push('');
    lines.push('── impressivePatterns ──');
    lines.push('  Max 4 items. These are the "wow" moments. What shows MATURITY beyond just using the tech?');
    lines.push('  BAD:  "Adoption of TypeScript suggests strong typing knowledge."');
    lines.push('  GOOD: "168 React components with consistent abstraction demonstrates solid component design thinking"');
    lines.push('  GOOD: "Custom hook architecture (useAuthStore, useRecruiterDashboard) shows you separate concerns intentionally"');
    lines.push('  GOOD: "React Query + Zustand combo means you separate server state from client state — a senior-level distinction"');
    lines.push('');
    lines.push('── growthAreas ──');
    lines.push('  2-4 areas. Be honest but constructive. Every area needs: WHAT IS MISSING + HOW TO FIX IT + specific tools.');
    lines.push('  "current" = facts, no shame. "suggestion" = exact steps, tool names, patterns.');
    lines.push('  BAD current:  "Project currently has no tests."');
    lines.push('  GOOD current: "Zero test files in 238-file codebase — zero safety net for refactoring."');
    lines.push('  BAD suggestion: "Add tests."');
    lines.push('  GOOD suggestion: "Start with Vitest + React Testing Library. Write tests for your top 5 custom hooks first — they\'re pure functions and easiest to test. Then add Playwright for critical user flows."');
    lines.push('  impact: HIGH = blocks production readiness | MEDIUM = improves quality | LOW = nice polish');
    lines.push('');
    lines.push('── learningPath ──');
    lines.push('  3-5 steps. Ordered: most important first. Each step = one concrete action with a specific outcome.');
    lines.push('  These are the NEXT 3 things this developer should actually DO to level up.');
    lines.push('  BAD:  "Implement Jest and React Testing Library for testing."');
    lines.push('  GOOD: "Add Vitest + React Testing Library — start by testing your custom hooks, then critical components"');
    lines.push('  GOOD: "Set up GitHub Actions CI to auto-run tests on every PR — keeps quality high automatically"');
    lines.push('  GOOD: "Deploy to Vercel with preview deployments — show working URLs in your portfolio, not just code"');
    lines.push('');
    lines.push('── projectMaturity ──');
    lines.push('  1 sentence. Where does this project sit RIGHT NOW? Be specific about why.');
    lines.push('  BAD:  "This project is a prototype."');
    lines.push('  GOOD: "Strong MVP — impressive breadth of features and architecture, but zero tests and no deployment pipeline means it\'s not production-ready yet."');
    lines.push('');
    lines.push('── recruiterVerdict.headline ──');
    lines.push('  8-14 words. Make it sound like a LinkedIn recruiter wrote it.');
    lines.push('  Format: "[Seniority] [Frontend/Backend/Full-Stack] Developer — [biggest strength], [biggest gap]"');
    lines.push('  GOOD: "Junior Frontend Developer — Impressive React Architecture, Zero Testing Experience"');
    lines.push('  GOOD: "Mid-Level React Engineer — Strong State Management Skills, Needs CI/CD Exposure"');
    lines.push('');
    lines.push('── recruiterVerdict.recommendation ──');
    lines.push('  Strict data-driven criteria:');
    lines.push('  STRONG_HIRE: fundamentals >70 AND engineering depth >70 AND testing >30 AND production-ready code');
    lines.push('  HIRE: fundamentals >60 AND engineering depth >55 AND some tests OR strong architecture');
    lines.push('  LEAN_HIRE: fundamentals >50 AND real skills proven even if testing/devops are missing');
    lines.push('  NO_HIRE: fundamentals <50 OR no real skills proven OR tutorial-only code');
    lines.push('');
    lines.push('── recruiterVerdict.oneLineSummary ──');
    lines.push('  25-35 words. The single most important thing a recruiter should know. Decision-driving.');
    lines.push('  BAD:  "The candidate demonstrates proficiency with React, Next.js, TypeScript and related tools."');
    lines.push('  GOOD: "Can build complex React apps with solid architecture and state management, but has never shipped to production or written a test — ideal for a junior role with mentorship."');
    lines.push('');
    lines.push('── recruiterVerdict.topStrengths ──');
    lines.push('  Exactly 3. Include PROOF from the data. Make it scannable.');
    lines.push('  BAD:  "Strong grasp of React and Next.js"');
    lines.push('  GOOD: "React architecture mastery — 37 custom hooks and 168 components with clear separation of concerns"');
    lines.push('  GOOD: "TypeScript fluency — 97% of 238 files written in TypeScript with strict types"');
    lines.push('  GOOD: "Modern state management — correctly uses Zustand (global) + React Query (server) as separate layers"');
    lines.push('');
    lines.push('── recruiterVerdict.topConcerns ──');
    lines.push('  2-3 concerns. State the risk clearly. WHY it matters for this hire.');
    lines.push('  BAD:  "Lack of testing"');
    lines.push('  GOOD: "Zero automated tests — can\'t verify refactoring safety or catch regressions"');
    lines.push('  GOOD: "No deployment setup — unclear if they can ship code, not just write it"');
    lines.push('');
    lines.push('── recruiterVerdict.estimatedLevel ──');
    lines.push('  Junior (0-2y) | Mid-Level (2-4y) | Senior (4-8y) | Staff/Principal (8+y)');
    lines.push('  Base it on: pattern complexity, production-readiness indicators, architecture decisions, testing maturity.');
    lines.push('  Format: "Junior (1-2 years)" or "Mid-Level (2-3 years)"');
    lines.push('');
    lines.push('── recruiterVerdict.interviewFocus ──');
    lines.push('  3 topics. Make them ACTIONABLE for the interviewer. Specific, not generic.');
    lines.push('  BAD:  "Testing methodologies and best practices"');
    lines.push('  GOOD: "Testing philosophy: have they written tests before? What\'s their testing strategy?"');
    lines.push('  GOOD: "Production deployment: have they deployed anything live? Vercel, AWS, or similar?"');
    lines.push('  GOOD: "System design fundamentals: how would they scale this app to 10,000 users?"');
    lines.push('');
    lines.push('OUTPUT: Return ONLY a JSON object — no markdown, no explanation, no backticks. Just the JSON.');
    lines.push(`{
  "projectTitle": "Descriptive product-like title (5-7 words)",
  "projectSummary": "2-3 sentences: what it does + what's technically interesting",
  "whatYouBuilt": "4-5 sentence mentor-style paragraph, warm and specific, addresses developer directly",
  "techHighlights": [
    "Specific decision + why it matters (up to 5)",
    "..."
  ],
  "impressivePatterns": [
    "What shows maturity beyond just using the tech (up to 4)",
    "..."
  ],
  "growthAreas": [
    {
      "area": "1-3 word category",
      "current": "Objective facts about the gap",
      "suggestion": "Specific tools + concrete next steps",
      "impact": "HIGH"
    }
  ],
  "learningPath": [
    "Concrete actionable step with specific tools (3-5 items)",
    "..."
  ],
  "projectMaturity": "1 sentence: current maturity level + why",
  "recruiterVerdict": {
    "headline": "8-14 word recruiter-style headline",
    "recommendation": "STRONG_HIRE | HIRE | LEAN_HIRE | NO_HIRE",
    "confidenceLevel": "High/Moderate/Low + reason based on evidence",
    "oneLineSummary": "25-35 word decision-driving summary",
    "topStrengths": ["Strength + proof from data (3 items)", "...", "..."],
    "topConcerns": ["Concern + why it matters (2-3 items)", "..."],
    "estimatedLevel": "Level (X-Y years)",
    "interviewFocus": ["Specific topic to probe (3 items)", "...", "..."]
  }
}`);

    return lines.join('\n');
  }

  // ════════════════════════════════════════════
  // RESPONSE PARSING
  // ════════════════════════════════════════════

  private parseInsightResponse(text: string): AIProjectInsight | null {
    try {
      const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const data = JSON.parse(clean);

      // Validate required fields
      if (!data.projectTitle || !data.recruiterVerdict) {
        logger.warn('AI response missing required fields');
        return null;
      }

      return {
        projectTitle: data.projectTitle || '',
        projectSummary: data.projectSummary || '',
        whatYouBuilt: data.whatYouBuilt || '',
        techHighlights: data.techHighlights || [],
        impressivePatterns: data.impressivePatterns || [],
        growthAreas: (data.growthAreas || []).map((g: any) => ({
          area: g.area || '',
          current: g.current || '',
          suggestion: g.suggestion || '',
          impact: g.impact || 'MEDIUM',
        })),
        learningPath: data.learningPath || [],
        projectMaturity: data.projectMaturity || '',
        recruiterVerdict: {
          headline: data.recruiterVerdict.headline || '',
          recommendation: data.recruiterVerdict.recommendation || 'LEAN_HIRE',
          confidenceLevel: data.recruiterVerdict.confidenceLevel || '',
          oneLineSummary: data.recruiterVerdict.oneLineSummary || '',
          topStrengths: data.recruiterVerdict.topStrengths || [],
          topConcerns: data.recruiterVerdict.topConcerns || [],
          estimatedLevel: data.recruiterVerdict.estimatedLevel || '',
          interviewFocus: data.recruiterVerdict.interviewFocus || [],
        },
      };
    } catch (e) {
      logger.error({ text: text.slice(0, 500) }, '❌ Failed to parse AI insight JSON');
      return null;
    }
  }

  // ════════════════════════════════════════════
  // LEGACY COMPAT — Map new format to old DB fields
  // ════════════════════════════════════════════

  private mapToLegacy(insight: AIProjectInsight): AIVerdict {
    const rv = insight.recruiterVerdict;

    // Map new recommendation to old enum
    let hireRec: 'STRONG_HIRE' | 'HIRE' | 'MAYBE' | 'NO' = 'MAYBE';
    switch (rv.recommendation) {
      case 'STRONG_HIRE': hireRec = 'STRONG_HIRE'; break;
      case 'HIRE': hireRec = 'HIRE'; break;
      case 'LEAN_HIRE': hireRec = 'MAYBE'; break;
      case 'NO_HIRE': hireRec = 'NO'; break;
    }

    return {
      title: insight.projectTitle,
      summary: insight.projectSummary,
      strengths: rv.topStrengths,
      weaknesses: rv.topConcerns,
      hireRecommendation: hireRec,
      riskScore: rv.recommendation === 'NO_HIRE' ? 80 : rv.recommendation === 'LEAN_HIRE' ? 50 : rv.recommendation === 'HIRE' ? 25 : 10,
      riskAnalysis: rv.confidenceLevel,
      skillsNarrative: insight.whatYouBuilt,
      interviewQuestions: rv.interviewFocus,
    };
  }

  // ════════════════════════════════════════════
  // LEGACY PROMPT — Backward compat with CompactOutput
  // ════════════════════════════════════════════

  private buildLegacyPrompt(compact: any): string {
    return `
You are a Staff Principal Engineer and Hiring Manager evaluating a candidate's code project.
Analyze the following project signal data and provide a professional, critical assessment.

PROJECT DATA (Compact JSON):
${JSON.stringify(compact)}

INSTRUCTIONS:
1. Act as a critical senior engineer. Don't be generic. Look for specific evidence in the data.
2. "Resume Ready" skills with high confidence (0.6+) and verified usage are strong signals.
3. Look at architecture patterns (microservices, clean arch) and quality tiers.
4. If the project is simple (few files), be honest but constructive.
5. Provide a "Hire Recommendation" based strictly on this project's evidence.

OUTPUT FORMAT (JSON ONLY):
{
  "title": "Short punchy title",
  "summary": "2-3 sentences executive summary.",
  "strengths": ["Specific strength 1", "Specific strength 2", "Specific strength 3"],
  "weaknesses": ["Specific weakness 1", "Specific weakness 2"],
  "hireRecommendation": "STRONG_HIRE" | "HIRE" | "MAYBE" | "NO",
  "riskScore": 0-100,
  "riskAnalysis": "One sentence on main risks.",
  "skillsNarrative": "A paragraph describing their tech stack proficiency.",
  "interviewQuestions": ["Question 1", "Question 2", "Question 3"]
}

Do not include markdown formatting. Just return the raw JSON object.
`;
  }

  private parseLegacyResponse(text: string): AIVerdict | null {
    try {
      const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const data = JSON.parse(clean);
      return data as AIVerdict;
    } catch (e) {
      logger.error({ text }, '❌ Failed to parse AI response JSON');
      return null;
    }
  }
}
