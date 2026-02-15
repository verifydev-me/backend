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
  // STRUCTURED PROMPT — Human-readable, token-efficient
  // ════════════════════════════════════════════

  private buildStructuredPrompt(ctx: SignalContext): string {
    const lines: string[] = [];

    lines.push('You are a world-class Staff Engineer reviewing a developer\'s project.');
    lines.push('Your job: give the developer USEFUL insight about their project AND give a recruiter a clear verdict.');
    lines.push('');
    lines.push('═══ PROJECT CONTEXT ═══');
    lines.push(`TYPE: ${ctx.projectType} | ${ctx.primaryLanguage} | ${ctx.totalFiles} files | ${ctx.totalLines?.toLocaleString()} lines`);

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
    lines.push('═══ YOUR TASK ═══');
    lines.push('Generate a JSON response with TWO sections:');
    lines.push('1. Developer-facing insights (they will see this on their project page)');
    lines.push('2. Recruiter verdict (recruiters will see this when evaluating candidates)');
    lines.push('');
    lines.push('RULES:');
    lines.push('- Be SPECIFIC to THIS project. Reference actual tech, patterns, and numbers.');
    lines.push('- For "whatYouBuilt": Write like you\'re explaining this project to the developer in plain English. Be warm and insightful.');
    lines.push('- For "techHighlights": Focus on what makes this project technically interesting.');
    lines.push('- For "impressivePatterns": Call out specific good engineering decisions you see.');
    lines.push('- For "growthAreas": Be constructive. Give actionable suggestions with impact.');
    lines.push('- For "learningPath": Suggest 3-5 concrete next steps to level up this project.');
    lines.push('- For "recruiterVerdict": Be honest and data-driven. Base recommendation strictly on evidence.');
    lines.push('- Do NOT be generic. Do NOT pad with filler.');
    lines.push('');
    lines.push('OUTPUT FORMAT (JSON ONLY, no markdown):');
    lines.push(`{
  "projectTitle": "Short punchy title for this project",
  "projectSummary": "2-3 sentences about the engineering quality",
  "whatYouBuilt": "A warm, insightful paragraph explaining what this project is and what it demonstrates",
  "techHighlights": ["Specific tech highlight 1", "Specific tech highlight 2", "...max 5"],
  "impressivePatterns": ["Specific good pattern 1", "Specific good pattern 2", "...max 4"],
  "growthAreas": [
    {
      "area": "Area name",
      "current": "What the current state is",
      "suggestion": "Specific actionable suggestion",
      "impact": "HIGH" | "MEDIUM" | "LOW"
    }
  ],
  "learningPath": ["Concrete step 1", "Concrete step 2", "...3-5 items"],
  "projectMaturity": "One sentence: where this project sits on the maturity spectrum",
  "recruiterVerdict": {
    "headline": "One-line headline for recruiters",
    "recommendation": "STRONG_HIRE" | "HIRE" | "LEAN_HIRE" | "NO_HIRE",
    "confidenceLevel": "How confident in this assessment and why",
    "oneLineSummary": "Single sentence TL;DR for the recruiter",
    "topStrengths": ["Max 3 strengths"],
    "topConcerns": ["Max 3 concerns"],
    "estimatedLevel": "Junior/Mid/Senior/Staff + estimated years",
    "interviewFocus": ["Question area 1", "Question area 2", "Question area 3"]
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
