import { ConsumeMessage } from 'amqplib';
import { logger } from '../utils/logger.js';
import prisma from '../prisma/client.js';
import { auraCalculator } from '../processors/aura-calculator.js';
import type { ProjectSignals, SkillScore, AuraCalculation, IndustryAnalysis } from '../processors/types.js';

// ============================================
// DIMENSIONAL ANALYSIS TYPES (from Go pkg/dimensions)
// ============================================

interface DimensionScore {
  score: number;
  confidence: number;
  signals: string[];
}

interface DimensionalAnalysis {
  dimensionMatrix: {
    fundamentals: DimensionScore;
    engineeringDepth: DimensionScore;
    productionReadiness: DimensionScore;
    testingMaturity: DimensionScore;
    architecture: DimensionScore;
    infraDevOps: DimensionScore;
  };
  verdict: {
    summary: string;
    experience: {
      level: string;
      yearRange: string;
      confidence: number;
    };
    strengths: string[];
    growthAreas: string[];
    justification: string;
  };
  trustAnalysis: {
    level: string;
    score: number;
    effort: {
      class: string;
      estimatedHours: number;
      averageCommitSize: number;
      commitFrequency: number;
    };
    authenticity: {
      score: number;
      flags: string[];
      hasOriginalWork: boolean;
    };
  };
}

// ============================================
// EXTENDED SIGNALS (Go Engine Output Match)
// ============================================

interface ProjectSignalsExtended extends ProjectSignals {
  industryAnalysis?: IndustryAnalysis;
  
  // NEW: Dimensional Analysis (from Go pkg/dimensions)
  dimensionalAnalysis?: DimensionalAnalysis;
  
  // Git Forensics
  gitForensics?: {
    commitCount: number;
    firstCommitDate: string;
    lastCommitDate: string;
    largestCommitRatio: number;
    refactorCount: number;
    primaryAuthorPct: number;
    isPremium: boolean;
  };
  
  // Authorship Verdict
  authorshipVerdict?: {
    level: string;
    confidence: string;
    reasons: string[];
  };
  
  // Complexity Score
  complexity?: {
    totalScore: number;
    architectureScore: number;
    infrastructureScore: number;
    codeQualityScore: number;
    scaleLabel: string;
  };
  
  // Intelligence Verdict
  intelligenceVerdict?: {
    projectIntentSummary: string;
    techStackSnapshot: string[];
    architectureMaturity: number;
    overallScore: number;
    developerLevel: string;
    projectIntent: string;
    keySignals: string[];
    strengthSignals: string[];
    riskSignals: string[];
    suggestions: Array<{
      category: string;
      message: string;
      impactScore: number;
      effortScore: number;
      priority: number;
    }>;
    extractedSkills: Array<{
      name: string;
      category: string;
      confidence: number;
      evidence: string[];
      resumeReady: boolean;
    }>;
    seniorEngineerVerdict: string;
    hireSignal: string;
    analysisTimeMs: number;
    modulesExecuted: string[];
    modulesSkipped: string[];
    earlyTermination: boolean;
    exitReason?: string;
    
    // NEW: Dimensional Analysis (from Go enrichVerdictWithDimensionalAnalysis)
    dimensions?: {
      fundamentals?: { score: number; confidence: number };
      engineeringDepth?: { score: number; confidence: number };
      productionReadiness?: { score: number; confidence: number };
      testingMaturity?: { score: number; confidence: number };
      architecture?: { score: number; confidence: number };
      infraDevOps?: { score: number; confidence: number };
      overallScore?: number;
      overallBandLower?: number;
      overallBandUpper?: number;
    };
    experienceAnalysis?: {
      level?: string;
      yearsMin?: number;
      yearsMax?: number;
      yearsEstimate?: string;
      confidence?: number;
    };
    trustAnalysis?: {
      score?: number;
      level?: string;
      effortScore?: number;
      effortClass?: string;
      authenticityScore?: number;
      hasOriginalWork?: boolean;
      isLearningProject?: boolean;
      isLearning?: boolean;
      learningScore?: number;
      consistencyScore?: number;
      flags?: string[];
    };
    verdictDetailed?: {
      summary?: string;
      strengths?: string[];
      growthAreas?: string[];
      cautions?: string[];
      hiringRecommendation?: string;
      recommendation?: string;
    };
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function mapEngineeringLevel(level?: string): 'BASIC' | 'INTERMEDIATE' | 'ADVANCED' | 'PRODUCTION' | undefined {
  if (!level) return undefined;
  const normalized = level.toUpperCase().replace(/-/g, '_').replace(/ /g, '_');
  if (normalized.includes('PRODUCTION')) return 'PRODUCTION';
  if (normalized.includes('ADVANCED')) return 'ADVANCED';
  if (normalized.includes('INTERMEDIATE')) return 'INTERMEDIATE';
  if (normalized.includes('BEGINNER') || normalized.includes('BASIC')) return 'BASIC';
  return undefined;
}

function mapArchitectureType(type?: string): string | undefined {
  if (!type) return undefined;
  const normalized = type.toUpperCase().replace(/-/g, '_').replace(/ /g, '_');
  const validTypes = ['MICROSERVICES', 'MONOLITH', 'MODULAR_MONOLITH', 'MONOREPO', 'EVENT_DRIVEN', 'LAYERED', 'CLEAN_ARCHITECTURE', 'HEXAGONAL', 'SERVERLESS'];
  return validTypes.includes(normalized) ? normalized : 'UNKNOWN';
}

function mapProjectType(type?: string): string {
  if (!type) return 'OTHER';
  const normalized = type.toUpperCase().replace(/-/g, '_');
  const validTypes = ['FRONTEND', 'BACKEND', 'FULLSTACK', 'MICROSERVICES', 'MONOLITH', 'MONOREPO', 'LIBRARY', 'CLI', 'API', 'MOBILE', 'ML'];
  return validTypes.includes(normalized) ? normalized : 'OTHER';
}

/**
 * Build dimensional analysis data for Prisma
 */
function buildDimensionalData(dimensional: DimensionalAnalysis) {
  const matrix = dimensional.dimensionMatrix;
  const verdict = dimensional.verdict;
  const trust = dimensional.trustAnalysis;

  return {
    // Dimension Scores
    fundamentalsScore: matrix?.fundamentals?.score ?? null,
    fundamentalsConfidence: matrix?.fundamentals?.confidence ?? null,
    engineeringDepthScore: matrix?.engineeringDepth?.score ?? null,
    engineeringDepthConfidence: matrix?.engineeringDepth?.confidence ?? null,
    productionReadinessScore: matrix?.productionReadiness?.score ?? null,
    productionReadinessConfidence: matrix?.productionReadiness?.confidence ?? null,
    testingMaturityScore: matrix?.testingMaturity?.score ?? null,
    testingMaturityConfidence: matrix?.testingMaturity?.confidence ?? null,
    architectureScore: matrix?.architecture?.score ?? null,
    architectureConfidence: matrix?.architecture?.confidence ?? null,
    infraDevOpsScore: matrix?.infraDevOps?.score ?? null,
    infraDevOpsConfidence: matrix?.infraDevOps?.confidence ?? null,

    // Verdict
    verdictSummary: verdict?.summary ?? null,
    experienceLevel: mapExperienceLevel(verdict?.experience?.level),
    experienceYearRange: verdict?.experience?.yearRange ?? null,
    experienceConfidence: verdict?.experience?.confidence ?? null,
    verdictStrengths: verdict?.strengths ?? [],
    verdictGrowthAreas: verdict?.growthAreas ?? [],
    verdictJustification: verdict?.justification ?? null,

    // Trust Analysis
    trustLevel: mapTrustLevel(trust?.level),
    trustScore: trust?.score ?? null,
    effortClass: mapEffortClass(trust?.effort?.class),
    estimatedHours: trust?.effort?.estimatedHours ?? null,
    averageCommitSize: trust?.effort?.averageCommitSize ?? null,
    commitFrequency: trust?.effort?.commitFrequency ?? null,
    authenticityScore: trust?.authenticity?.score ?? null,
    authenticityFlags: trust?.authenticity?.flags ?? [],
    hasOriginalWork: trust?.authenticity?.hasOriginalWork ?? null,
  };
}

function mapExperienceLevel(level?: string): 'INTERN' | 'JUNIOR' | 'MID_LEVEL' | 'SENIOR' | 'STAFF' | 'PRINCIPAL' | undefined {
  if (!level) return undefined;
  const normalized = level.toUpperCase().replace(/-/g, '_').replace(/ /g, '_');
  const validLevels = ['INTERN', 'JUNIOR', 'MID_LEVEL', 'SENIOR', 'STAFF', 'PRINCIPAL'];
  return validLevels.includes(normalized) ? normalized as any : undefined;
}

function mapTrustLevel(level?: string): 'UNVERIFIED' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERIFIED' | undefined {
  if (!level) return undefined;
  const normalized = level.toUpperCase();
  const validLevels = ['UNVERIFIED', 'LOW', 'MEDIUM', 'HIGH', 'VERIFIED'];
  return validLevels.includes(normalized) ? normalized as any : undefined;
}

function mapEffortClass(effortClass?: string): 'MINIMAL' | 'LOW' | 'MODERATE' | 'SIGNIFICANT' | 'SUBSTANTIAL' | 'MAJOR' | undefined {
  if (!effortClass) return undefined;
  const normalized = effortClass.toUpperCase();
  const validClasses = ['MINIMAL', 'LOW', 'MODERATE', 'SIGNIFICANT', 'SUBSTANTIAL', 'MAJOR'];
  return validClasses.includes(normalized) ? normalized as any : undefined;
}

// ============================================
// MAIN HANDLER
// ============================================

/**
 * Handles incoming project.analyzed messages from Go Engine
 * 
 * Flow:
 * 1. Parse signals from message (exact Go engine output)
 * 2. Calculate aura score
 * 3. Store ProjectAnalysis with all fields
 * 4. Store related data (skills, languages, infra signals)
 * 5. Update user's total aura
 * 6. Log activity
 */
export async function handleProjectAnalyzed(msg: ConsumeMessage): Promise<void> {
  const startTime = Date.now();

  let signals: ProjectSignalsExtended;
  
  try {
    signals = JSON.parse(msg.content.toString());
  } catch (parseError) {
    logger.error({ error: String(parseError), content: msg.content.toString().slice(0, 500) }, '❌ Failed to parse message');
    throw parseError;
  }

  // Validate required fields
  if (!signals.projectId || !signals.userId) {
    logger.error({ signals }, '❌ Missing required fields in signals');
    throw new Error('Missing projectId or userId in signals');
  }

  logger.info({
    projectId: signals.projectId,
    userId: signals.userId,
    projectType: signals.projectType,
    hasIndustryAnalysis: !!signals.industryAnalysis,
    hasIntelligenceVerdict: !!signals.intelligenceVerdict,
    hasDimensionalAnalysis: !!signals.intelligenceVerdict?.dimensions,
    skillsCount: signals.industryAnalysis?.verifiedSkills?.length || 0,
  }, '📥 Processing analyzed project');

  try {
    // Ensure nested objects exist (Go engine provides these)
    signals.folderStructure = signals.folderStructure || {} as any;
    signals.codeSignals = signals.codeSignals || {} as any;
    signals.languages = signals.languages || [];
    signals.frameworks = signals.frameworks || [];
    signals.databases = signals.databases || [];
    signals.tools = signals.tools || [];
    signals.infrastructure = signals.infrastructure || [];
    signals.totalLines = signals.totalLines || 0;
    signals.totalFiles = signals.totalFiles || 0;
    signals.primaryLanguage = signals.primaryLanguage || 'Unknown';
    signals.analyzedAt = signals.analyzedAt || new Date().toISOString();

    // Calculate aura score
    const auraResult = auraCalculator.calculate(signals);

    logger.debug({
      projectId: signals.projectId,
      score: auraResult.projectScore,
      breakdown: auraResult.breakdown,
    }, 'Aura calculated');

    // Update project and save analysis
    const projectUpdated = await updateProject(signals, auraResult);
    
    if (!projectUpdated) {
      logger.warn({ projectId: signals.projectId }, '⏭️ Project not found, skipping');
      return;
    }

    // Update user skills
    await updateSkills(signals.userId, auraResult.skills);

    // Update user aura
    await updateUserAura(signals.userId, auraResult.projectScore);

    // Log activity
    await logActivity(signals.userId, signals.projectId, auraResult.projectScore);

    const duration = Date.now() - startTime;
    logger.info({
      projectId: signals.projectId,
      score: auraResult.projectScore,
      duration: `${duration}ms`,
    }, '✅ Project aura updated');

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    logger.error({ 
      errorMessage, 
      errorStack,
      projectId: signals.projectId 
    }, '❌ Failed to process project');
    throw error;
  }
}

// ============================================
// DATABASE OPERATIONS
// ============================================

async function updateProject(
  signals: ProjectSignalsExtended,
  auraResult: AuraCalculation
): Promise<boolean> {
  const { projectScore, breakdown } = auraResult;

  try {
    // 1. Update main Project
    await prisma.project.update({
      where: { id: signals.projectId },
      data: {
        analysisStatus: 'COMPLETED',
        analyzedAt: new Date(signals.analyzedAt),
        overallScore: projectScore,
        structureScore: breakdown.structure,
        codeQualityScore: breakdown.codeQuality,
        auraContribution: projectScore,
        language: signals.primaryLanguage,
      },
    });

    // 2. SIMPLIFIED: Store only essential analysis data to avoid MongoDB pipeline limit
    // Split into: (a) Core analysis (b) Dimensional analysis (c) Relations
    
    const coreAnalysisData = {
      analyzerVersion: signals.analysisVersion || '3.0.0',
      analyzedAt: new Date(),
      
      // Scores
      overallScore: projectScore,
      structureScore: breakdown.structure,
      codeQualityScore: breakdown.codeQuality,
      testingScore: breakdown.testing || 0,
      documentationScore: breakdown.documentation || 0,
      bestPracticesScore: breakdown.bestPractices || 0,
      
      // Basic info
      primaryLanguage: signals.primaryLanguage,
      totalFiles: signals.totalFiles || 0,
      totalLines: signals.totalLines || 0,
      
      // Architecture
      architectureType: mapArchitectureType(signals.industryAnalysis?.architecture?.type) as any,
      serviceCount: signals.industryAnalysis?.architecture?.serviceCount || 0,
      engineeringLevel: mapEngineeringLevel(signals.industryAnalysis?.engineeringLevel),
      
      // Code quality basics
      hasReadme: signals.codeSignals.hasReadme,
      hasLicense: signals.codeSignals.hasLicense,
      hasDockerfile: signals.codeSignals.hasDockerfile,
      hasTypeScript: signals.codeSignals.hasTypeScript,
      testFilesCount: signals.codeSignals.testFilesCount || 0,
      
      // Folder structure basics
      hasSrcFolder: signals.folderStructure.hasSrcFolder,
      hasTests: signals.folderStructure.hasTests,
      maxDepth: signals.folderStructure.maxDepth,
      topLevelFolders: signals.folderStructure.topLevelFolders || [],
      
      // Dimensional Analysis
      ...(signals.intelligenceVerdict?.dimensions ? {
        fundamentalsScore: signals.intelligenceVerdict.dimensions.fundamentals?.score ? Math.round(signals.intelligenceVerdict.dimensions.fundamentals.score) : undefined,
        fundamentalsConfidence: signals.intelligenceVerdict.dimensions.fundamentals?.confidence,
        engineeringDepthScore: signals.intelligenceVerdict.dimensions.engineeringDepth?.score ? Math.round(signals.intelligenceVerdict.dimensions.engineeringDepth.score) : undefined,
        engineeringDepthConfidence: signals.intelligenceVerdict.dimensions.engineeringDepth?.confidence,
        productionReadinessScore: signals.intelligenceVerdict.dimensions.productionReadiness?.score ? Math.round(signals.intelligenceVerdict.dimensions.productionReadiness.score) : undefined,
        productionReadinessConfidence: signals.intelligenceVerdict.dimensions.productionReadiness?.confidence,
        testingMaturityScore: signals.intelligenceVerdict.dimensions.testingMaturity?.score ? Math.round(signals.intelligenceVerdict.dimensions.testingMaturity.score) : undefined,
        testingMaturityConfidence: signals.intelligenceVerdict.dimensions.testingMaturity?.confidence,
        architectureScore: signals.intelligenceVerdict.dimensions.architecture?.score ? Math.round(signals.intelligenceVerdict.dimensions.architecture.score) : undefined,
        architectureConfidence: signals.intelligenceVerdict.dimensions.architecture?.confidence,
        infraDevOpsScore: signals.intelligenceVerdict.dimensions.infraDevOps?.score ? Math.round(signals.intelligenceVerdict.dimensions.infraDevOps.score) : undefined,
        infraDevOpsConfidence: signals.intelligenceVerdict.dimensions.infraDevOps?.confidence,
      } : {}),
      
      // Experience & Trust
      ...(signals.intelligenceVerdict?.experienceAnalysis ? {
        experienceLevel: mapExperienceLevel(signals.intelligenceVerdict.experienceAnalysis.level),
        experienceConfidence: signals.intelligenceVerdict.experienceAnalysis.confidence,
        experienceYearRange: signals.intelligenceVerdict.experienceAnalysis.yearsEstimate,
      } : {}),
      
      ...(signals.intelligenceVerdict?.trustAnalysis ? {
        trustScore: signals.intelligenceVerdict.trustAnalysis.score ? Math.round(signals.intelligenceVerdict.trustAnalysis.score) : undefined,
        trustLevel: mapTrustLevel(signals.intelligenceVerdict.trustAnalysis.level),
        effortClass: signals.intelligenceVerdict.trustAnalysis.effortClass ? mapEffortClass(signals.intelligenceVerdict.trustAnalysis.effortClass) : undefined,
        authenticityScore: signals.intelligenceVerdict.trustAnalysis.authenticityScore ? Math.round(signals.intelligenceVerdict.trustAnalysis.authenticityScore) : undefined,
        hasOriginalWork: signals.intelligenceVerdict.trustAnalysis.hasOriginalWork,
        authenticityFlags: signals.intelligenceVerdict.trustAnalysis.flags || [],
      } : {}),
      
      // Verdict
      ...(signals.intelligenceVerdict?.verdictDetailed ? {
        verdictSummary: signals.intelligenceVerdict.verdictDetailed.summary,
        verdictStrengths: signals.intelligenceVerdict.verdictDetailed.strengths,
        verdictGrowthAreas: signals.intelligenceVerdict.verdictDetailed.growthAreas,
        verdictJustification: signals.intelligenceVerdict.verdictDetailed.cautions?.join('; '),
      } : {}),
    };

    // 3. Upsert ProjectAnalysis with MINIMAL fields
    const analysis = await prisma.projectAnalysis.upsert({
      where: { projectId: signals.projectId },
      create: { projectId: signals.projectId, ...coreAnalysisData },
      update: { ...coreAnalysisData, updatedAt: new Date() },
    });

    // 4. Store Language Stats
    if (signals.languages?.length > 0) {
      await prisma.analysisLanguageStat.deleteMany({ where: { analysisId: analysis.id } });
      await prisma.analysisLanguageStat.createMany({
        data: signals.languages.map(l => ({
          analysisId: analysis.id,
          name: l.name,
          lines: l.lines,
          files: l.files,
          percentage: l.percentage,
        })),
      });
    }

    // 5. Store Verified Skills
    if (signals.industryAnalysis?.verifiedSkills?.length) {
      await prisma.analysisVerifiedSkill.deleteMany({ where: { analysisId: analysis.id } });
      await prisma.analysisVerifiedSkill.createMany({
        data: signals.industryAnalysis.verifiedSkills.map(s => ({
          analysisId: analysis.id,
          name: s.name,
          category: String(s.category),
          level: String(s.level),
          confidence: s.confidence,
          evidence: s.evidence || [],
          keywords: s.keywords || [],
          resumeReady: s.resumeReady,
          weight: s.weight || 1,
          auraPoints: Math.round(s.confidence * 10),
          usageVerified: s.usageVerified || false, // NEW
          usageStrength: s.usageStrength || 0.0,   // NEW
        })),
      });
    }

    // 6. Store Infra Signals
    if (signals.industryAnalysis?.infraSignals?.signals?.length) {
      await prisma.analysisInfraSignal.deleteMany({ where: { analysisId: analysis.id } });
      
      const infraData = signals.industryAnalysis.infraSignals.signals.map((sig: string) => ({
        analysisId: analysis.id,
        signal: sig,
        confidence: 0.8,
        source: 'go-analyzer',
        evidence: [],
      }));
      
      await prisma.analysisInfraSignal.createMany({ data: infraData });
    }

    // 7. Store Suggestions
    if (signals.intelligenceVerdict?.suggestions?.length) {
      await prisma.analysisSuggestion.deleteMany({ where: { analysisId: analysis.id } });
      await prisma.analysisSuggestion.createMany({
        data: signals.intelligenceVerdict.suggestions.map(s => ({
          analysisId: analysis.id,
          category: s.category,
          message: s.message,
          impactScore: s.impactScore,
          effortScore: s.effortScore,
          priority: s.priority,
          evidence: '',
        })),
      });
    }

    // 8. Store Dimension Signals (optional - not all analyses have detailed signals)
    // For now, we skip storing individual dimension signals since the Go engine
    // returns aggregated scores in intelligenceVerdict.dimensions
    // Future enhancement: Extract signals from DimensionMatrix if needed
    
    logger.info({
      projectId: signals.projectId,
      projectType: signals.projectType,
      score: projectScore,
      skillsCount: signals.industryAnalysis?.verifiedSkills?.length || 0,
    }, '💾 Analysis saved');
    
    return true;
  } catch (error: any) {
    if (error.code === 'P2025') {
      logger.warn({ projectId: signals.projectId }, '⚠️ Project not found');
      return false;
    }
    throw error;
  }
}

async function updateSkills(userId: string, skills: SkillScore[]): Promise<void> {
  logger.info({ userId, skillCount: skills.length }, '🔧 Updating skills');
  
  for (const skill of skills) {
    const existingSkill = await prisma.skill.findUnique({
      where: { userId_name: { userId, name: skill.name } },
      select: { isVerified: true, verifiedScore: true },
    });

    // Hysteresis: verify at 70+, un-verify only below 50
    let shouldBeVerified: boolean;
    if (existingSkill?.isVerified) {
      shouldBeVerified = skill.score >= 50;
    } else {
      shouldBeVerified = skill.score >= 70;
    }

    await prisma.skill.upsert({
      where: { userId_name: { userId, name: skill.name } },
      create: {
        userId,
        name: skill.name,
        category: skill.category,
        isVerified: skill.score >= 70,
        verifiedScore: skill.score,
        projectCount: 1,
        auraContribution: Math.round(skill.score / 10),
      },
      update: {
        verifiedScore: { set: Math.max(skill.score, existingSkill?.verifiedScore || 0) },
        projectCount: { increment: 1 },
        isVerified: shouldBeVerified,
        auraContribution: { increment: Math.round(skill.score / 20) },
      },
    });
  }
}

async function updateUserAura(userId: string, projectScore: number): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { auraScore: true },
  });

  if (!user) {
    logger.warn({ userId }, 'User not found for aura update');
    return;
  }

  // Boosted Aura Cap: Allow up to 100 points per project (was 40)
  const auraContribution = Math.min(projectScore, 100);

  await prisma.user.update({
    where: { id: userId },
    data: { auraScore: { increment: auraContribution } },
  });

  logger.debug({
    userId,
    previousAura: user.auraScore,
    added: auraContribution,
    newAura: user.auraScore + auraContribution,
  }, 'User aura updated');
}

async function logActivity(userId: string, projectId: string, score: number): Promise<void> {
  await prisma.activity.create({
    data: {
      userId,
      type: 'PROJECT_ANALYZED',
      description: `Project analyzed with score ${score}`,
      auraPoints: Math.min(score, 100),
      referenceId: projectId,
      referenceType: 'project',
    },
  });
}
