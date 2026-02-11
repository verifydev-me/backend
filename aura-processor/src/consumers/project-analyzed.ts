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

function mapEffortClass(effortClass?: string): 'MINIMAL' | 'LOW' | 'MODERATE' | 'SIGNIFICANT' | 'SUBSTANTIAL' | 'MAJOR' | null {
  if (!effortClass) return null;
  const normalized = effortClass.toUpperCase();
  // Map Go's EffortClassification values to Prisma EffortClass enum
  const aliasMap: Record<string, string> = {
    'SUSPICIOUS': 'MINIMAL', // Go sends SUSPICIOUS — map to closest Prisma enum
  };
  const mapped = aliasMap[normalized] || normalized;
  const validClasses = ['MINIMAL', 'LOW', 'MODERATE', 'SIGNIFICANT', 'SUBSTANTIAL', 'MAJOR'];
  return validClasses.includes(mapped) ? mapped as any : null;
}

function formatYearRange(yearsMin?: number, yearsMax?: number, yearsEstimate?: string | number): string | null {
  if (yearsMin != null && yearsMax != null) {
    return `${yearsMin}-${yearsMax} years`;
  }
  if (yearsEstimate != null) {
    return String(yearsEstimate);
  }
  return null;
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

    // Debug: Log what we're about to send to MongoDB
    logger.debug({
      projectId: signals.projectId,
      hasFolderStructure: !!signals.folderStructure,
      folderStructureKeys: signals.folderStructure ? Object.keys(signals.folderStructure).length : 0,
      hasComponents: signals.folderStructure?.hasComponents,
      hasUtils: signals.folderStructure?.hasUtils,
      frameworks: signals.frameworks?.length,
      databases: signals.databases?.length,
      tools: signals.tools?.length,
      infrastructure: signals.infrastructure?.length,
    }, '🔍 Signals content before MongoDB update');

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

    // 2. Build analysis data — all fields in a flat object
    // NOTE: We use raw MongoDB $set via runCommandRaw to avoid
    // MongoDB Atlas's 50-stage aggregation pipeline limit (P2010 error).
    // Prisma's update/upsert generates one pipeline stage per field,
    // and this model has 90+ fields which exceeds the 50-stage limit.
    
    const now = new Date();
    const analysisFields: Record<string, any> = {
      analyzer_version: signals.analysisVersion || '3.0.0',
      analyzed_at: { $date: now.toISOString() },
      updated_at: { $date: now.toISOString() },
      
      // Scores
      overall_score: projectScore,
      structure_score: breakdown.structure,
      code_quality_score: breakdown.codeQuality,
      testing_score: breakdown.testing || 0,
      documentation_score: breakdown.documentation || 0,
      best_practices_score: breakdown.bestPractices || 0,
      
      // Basic info
      primary_language: signals.primaryLanguage,
      total_files: signals.totalFiles || 0,
      total_lines: signals.totalLines || 0,
      
      // Architecture
      service_count: signals.industryAnalysis?.architecture?.serviceCount || 0,
      
      // Code quality (ALL fields from Go CodeSignals struct)
      has_readme: signals.codeSignals.hasReadme || false,
      has_license: signals.codeSignals.hasLicense || false,
      has_gitignore: signals.codeSignals.hasGitignore || false,
      has_env_example: signals.codeSignals.hasEnvExample || false,
      has_dockerfile: signals.codeSignals.hasDockerfile || false,
      has_docker_compose: signals.codeSignals.hasDockerCompose || false,
      has_ci: signals.codeSignals.hasCI || false,
      has_linting: signals.codeSignals.hasLinting || false,
      has_prettier: signals.codeSignals.hasPrettier || false,
      has_typescript: signals.codeSignals.hasTypeScript || false,
      has_makefile: signals.codeSignals.hasMakefile || false,
      test_files_count: signals.codeSignals.testFilesCount || 0,
      comment_density: signals.codeSignals.commentDensity || 0,
      
      // Folder structure (ALL fields from Go FolderAnalysis struct)
      has_src_folder: signals.folderStructure.hasSrcFolder || false,
      has_components: signals.folderStructure.hasComponents || false,
      has_utils: signals.folderStructure.hasUtils || false,
      has_tests: signals.folderStructure.hasTests || false,
      has_types: signals.folderStructure.hasTypes || false,
      has_config: signals.folderStructure.hasConfig || false,
      has_docs: signals.folderStructure.hasDocs || false,
      has_api: signals.folderStructure.hasApi || false,
      has_models: signals.folderStructure.hasModels || false,
      has_services: signals.folderStructure.hasServices || false,
      has_middleware: signals.folderStructure.hasMiddleware || false,
      has_controllers: signals.folderStructure.hasControllers || false,
      has_internal: signals.folderStructure.hasInternal || false,
      has_pkg: signals.folderStructure.hasPkg || false,
      has_cmd: signals.folderStructure.hasCmd || false,
      has_gateway: signals.folderStructure.hasGateway || false,
      max_depth: signals.folderStructure.maxDepth || 0,
      organization_score: signals.folderStructure.organizationScore || 0,
      top_level_folders: signals.folderStructure.topLevelFolders || [],
      
      // Tech Stack arrays (from Go: Frameworks, Databases, Tools, Infrastructure)
      frameworks: signals.frameworks || [],
      databases: signals.databases || [],
      tools: signals.tools || [],
      infrastructure: signals.infrastructure || [],
    };

    // Architecture type (enum stored as string)
    const archType = mapArchitectureType(signals.industryAnalysis?.architecture?.type);
    if (archType) analysisFields.architecture_type = archType;
    
    const engLevel = mapEngineeringLevel(signals.industryAnalysis?.engineeringLevel);
    if (engLevel) analysisFields.engineering_level = engLevel;

    // Dimensional Analysis
    if (signals.intelligenceVerdict?.dimensions) {
      const dims = signals.intelligenceVerdict.dimensions;
      if (dims.fundamentals?.score != null) analysisFields.fundamentals_score = Math.round(dims.fundamentals.score);
      if (dims.fundamentals?.confidence != null) analysisFields.fundamentals_confidence = dims.fundamentals.confidence;
      if (dims.engineeringDepth?.score != null) analysisFields.engineering_depth_score = Math.round(dims.engineeringDepth.score);
      if (dims.engineeringDepth?.confidence != null) analysisFields.engineering_depth_confidence = dims.engineeringDepth.confidence;
      if (dims.productionReadiness?.score != null) analysisFields.production_readiness_score = Math.round(dims.productionReadiness.score);
      if (dims.productionReadiness?.confidence != null) analysisFields.production_readiness_confidence = dims.productionReadiness.confidence;
      if (dims.testingMaturity?.score != null) analysisFields.testing_maturity_score = Math.round(dims.testingMaturity.score);
      if (dims.testingMaturity?.confidence != null) analysisFields.testing_maturity_confidence = dims.testingMaturity.confidence;
      if (dims.architecture?.score != null) analysisFields.architecture_dimension_score = Math.round(dims.architecture.score);
      if (dims.architecture?.confidence != null) analysisFields.architecture_confidence = dims.architecture.confidence;
      if (dims.infraDevOps?.score != null) analysisFields.infra_devops_score = Math.round(dims.infraDevOps.score);
      if (dims.infraDevOps?.confidence != null) analysisFields.infra_devops_confidence = dims.infraDevOps.confidence;
    }
    
    // Experience
    if (signals.intelligenceVerdict?.experienceAnalysis) {
      const exp = signals.intelligenceVerdict.experienceAnalysis;
      const mappedLevel = mapExperienceLevel(exp.level);
      if (mappedLevel) analysisFields.experience_level = mappedLevel;
      if (exp.confidence != null) analysisFields.experience_confidence = exp.confidence;
      const yearRange = formatYearRange(exp.yearsMin, exp.yearsMax, exp.yearsEstimate);
      if (yearRange) analysisFields.experience_year_range = yearRange;
    }
    
    // Trust
    if (signals.intelligenceVerdict?.trustAnalysis) {
      const trust = signals.intelligenceVerdict.trustAnalysis;
      if (trust.score != null) analysisFields.trust_score = Math.round(trust.score);
      const tl = mapTrustLevel(trust.level);
      if (tl) analysisFields.trust_level = tl;
      const ec = mapEffortClass(trust.effortClass);
      if (ec) analysisFields.effort_class = ec;
      if (trust.authenticityScore != null) analysisFields.authenticity_score = Math.round(trust.authenticityScore);
      if (trust.hasOriginalWork != null) analysisFields.has_original_work = trust.hasOriginalWork;
      analysisFields.authenticity_flags = trust.flags || [];
    }
    
    // Verdict
    if (signals.intelligenceVerdict?.verdictDetailed) {
      const v = signals.intelligenceVerdict.verdictDetailed;
      if (v.summary) analysisFields.dimensional_verdict_summary = v.summary;
      if (v.strengths) analysisFields.dimensional_strengths = v.strengths;
      if (v.growthAreas) analysisFields.dimensional_growth_areas = v.growthAreas;
      if (v.cautions?.length) analysisFields.verdict_justification = v.cautions.join('; ');
    }

    // Complexity
    if (signals.complexity) {
      analysisFields.complexity_total_score = signals.complexity.totalScore || 0;
      analysisFields.complexity_architecture_score = signals.complexity.architectureScore || 0;
      analysisFields.complexity_infrastructure_score = signals.complexity.infrastructureScore || 0;
      analysisFields.complexity_code_quality_score = signals.complexity.codeQualityScore || 0;
      analysisFields.complexity_scale_label = signals.complexity.scaleLabel || 'Unknown';
    }

    // Git Forensics
    if (signals.gitForensics) {
      analysisFields.git_commit_count = signals.gitForensics.commitCount || 0;
      analysisFields.git_first_commit_date = signals.gitForensics.firstCommitDate || null;
      analysisFields.git_last_commit_date = signals.gitForensics.lastCommitDate || null;
      analysisFields.git_largest_commit_ratio = signals.gitForensics.largestCommitRatio || 0;
      analysisFields.git_refactor_count = signals.gitForensics.refactorCount || 0;
      analysisFields.git_primary_author_pct = signals.gitForensics.primaryAuthorPct || 0;
      analysisFields.git_is_premium_feature = signals.gitForensics.isPremium || false;
    }

    // Authorship
    if (signals.authorshipVerdict) {
      analysisFields.authorship_level = signals.authorshipVerdict.level || null;
      analysisFields.authorship_confidence = signals.authorshipVerdict.confidence || null;
      analysisFields.authorship_reasons = signals.authorshipVerdict.reasons || [];
    }

    // Intelligence Verdict top-level
    if (signals.intelligenceVerdict) {
      analysisFields.verdict_project_intent = signals.intelligenceVerdict.projectIntentSummary || '';
      analysisFields.verdict_tech_stack = signals.intelligenceVerdict.techStackSnapshot || [];
      analysisFields.verdict_arch_maturity = signals.intelligenceVerdict.architectureMaturity || 0;
      analysisFields.verdict_overall_score = signals.intelligenceVerdict.overallScore || 0;
      analysisFields.verdict_developer_level = signals.intelligenceVerdict.developerLevel || null;
      analysisFields.verdict_key_signals = signals.intelligenceVerdict.keySignals || [];
      analysisFields.verdict_strength_signals = signals.intelligenceVerdict.strengthSignals || [];
      analysisFields.verdict_risk_signals = signals.intelligenceVerdict.riskSignals || [];
      analysisFields.verdict_senior_verdict = signals.intelligenceVerdict.seniorEngineerVerdict || '';
      analysisFields.verdict_hire_signal = signals.intelligenceVerdict.hireSignal || null;
      analysisFields.verdict_analysis_time_ms = signals.intelligenceVerdict.analysisTimeMs || 0;
      analysisFields.verdict_modules_executed = signals.intelligenceVerdict.modulesExecuted || [];
      analysisFields.verdict_modules_skipped = signals.intelligenceVerdict.modulesSkipped || [];
    }

    // Architecture details
    if (signals.industryAnalysis?.architecture) {
      analysisFields.architecture_communication = signals.industryAnalysis.architecture.communication || [];
      analysisFields.architecture_patterns = signals.industryAnalysis.architecture.patterns || [];
      analysisFields.architecture_service_names = signals.industryAnalysis.architecture.services || [];
      analysisFields.architecture_gateway = signals.industryAnalysis.architecture.gateway || null;
    }

    // 3. Use raw MongoDB updateOne with $set to bypass Prisma's pipeline limit
    // MongoDB native $set is a single pipeline stage regardless of field count
    logger.debug({
      projectId: signals.projectId,
      analysisFieldsKeys: Object.keys(analysisFields).length,
      sampleFields: {
        has_components: analysisFields.has_components,
        has_utils: analysisFields.has_utils,
        frameworks: analysisFields.frameworks,
        databases: analysisFields.databases,
        tools: analysisFields.tools,
        infrastructure: analysisFields.infrastructure,
      },
    }, '💾 About to write to MongoDB with $set');

    const rawResult: any = await prisma.$runCommandRaw({
      update: 'project_analyses',
      updates: [
        {
          q: { project_id: { $oid: signals.projectId } },
          u: { $set: analysisFields, $setOnInsert: { project_id: { $oid: signals.projectId }, created_at: { $date: now.toISOString() } } },
          upsert: true,
        },
      ],
    });
    
    logger.debug({ projectId: signals.projectId, rawResult }, '✅ MongoDB update result');
    
    // Get the analysis ID for creating related records
    const analysisDoc = await prisma.projectAnalysis.findUnique({
      where: { projectId: signals.projectId },
      select: { id: true },
    });
    
    if (!analysisDoc) {
      throw new Error('Failed to create/update ProjectAnalysis');
    }
    
    const analysis = analysisDoc;

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
