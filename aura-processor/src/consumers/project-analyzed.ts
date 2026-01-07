import { ConsumeMessage } from 'amqplib';
import { logger } from '../utils/logger.js';
import prisma from '../prisma/client.js';
import { auraCalculator } from '../processors/aura-calculator.js';
import type { ProjectSignals, SkillScore, AuraCalculation, IndustryAnalysis } from '../processors/types.js';

// Extended signals with industry analysis
interface ProjectSignalsExtended extends ProjectSignals {
  industryAnalysis?: IndustryAnalysis;
}

/**
 * Handles incoming project.analyzed messages
 * 
 * Flow:
 * 1. Parse signals from message
 * 2. Calculate aura score
 * 3. Update project in database with detailed analysis
 * 4. Update/create skills
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
    hasIndustryAnalysis: !!signals.industryAnalysis,
    verifiedSkillsCount: signals.industryAnalysis?.verifiedSkills?.length || 0,
  }, '📥 Processing analyzed project');

  try {
    // Ensure required nested objects exist with defaults
    signals.folderStructure = signals.folderStructure || {
      hasSrcFolder: false,
      hasComponents: false,
      hasUtils: false,
      hasTests: false,
      hasTypes: false,
      hasConfig: false,
      hasDocs: false,
      maxDepth: 0,
      topLevelFolders: [],
      organizationScore: 0,
    };

    signals.codeSignals = signals.codeSignals || {
      hasReadme: false,
      hasLicense: false,
      hasGitignore: false,
      hasEnvExample: false,
      hasDockerfile: false,
      hasCI: false,
      hasLinting: false,
      hasPrettier: false,
      hasTypeScript: false,
      testFilesCount: 0,
      commentDensity: 0,
    };

    signals.languages = signals.languages || [];
    signals.frameworks = signals.frameworks || [];
    signals.databases = signals.databases || [];
    signals.tools = signals.tools || [];
    signals.totalLines = signals.totalLines || 0;
    signals.totalFiles = signals.totalFiles || 0;
    signals.primaryLanguage = signals.primaryLanguage || 'Unknown';
    signals.analyzedAt = signals.analyzedAt || new Date().toISOString();

    // Calculate aura
    const auraResult = auraCalculator.calculate(signals);

    logger.debug({
      projectId: signals.projectId,
      score: auraResult.projectScore,
      breakdown: auraResult.breakdown,
    }, 'Aura calculated');

    // Update project in database with full analysis data
    await updateProject(signals, auraResult);

    // Update/create skills (includes Docker, Kafka, Redis, etc. - all in one place)
    await updateSkills(signals.userId, auraResult.skills);

    // Update user's total aura
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
    throw error; // Will trigger requeue
  }
}

/**
 * Update project with full analysis results
 * Note: Some fields may not exist if migration hasn't run yet
 */
async function updateProject(
  signals: ProjectSignalsExtended,
  auraResult: AuraCalculation
): Promise<void> {
  const { projectScore, breakdown } = auraResult;

  // Basic update that works without new schema fields
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
      fullAnalysis: auraResult.fullAnalysis as any,
    },
  });
  
  logger.info({
    projectId: signals.projectId,
    score: projectScore,
    breakdown,
  }, '💾 Project updated with analysis');
}

/**
 * Update or create skills for user
 */
async function updateSkills(userId: string, skills: SkillScore[]): Promise<void> {
  logger.info({ 
    userId, 
    skillCount: skills.length,
    skillNames: skills.map(s => `${s.name} (${s.category})`),
  }, '🔧 Updating skills');
  
  for (const skill of skills) {
    await prisma.skill.upsert({
      where: {
        userId_name: {
          userId,
          name: skill.name,
        },
      },
      create: {
        userId,
        name: skill.name,
        category: skill.category,
        isVerified: skill.score >= 70, // Auto-verify if score is high
        verifiedScore: skill.score,
        projectCount: 1,
        auraContribution: Math.round(skill.score / 10),
      },
      update: {
        verifiedScore: {
          // Use max of existing and new score
          set: skill.score,
        },
        projectCount: {
          increment: 1,
        },
        isVerified: skill.score >= 70,
        auraContribution: {
          increment: Math.round(skill.score / 20),
        },
      },
    });
  }

  logger.debug({ userId, skillCount: skills.length }, 'Skills updated');
}

/**
 * Update user's total aura score
 */
async function updateUserAura(userId: string, projectScore: number): Promise<void> {
  // Get current user aura
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { auraScore: true },
  });

  if (!user) {
    logger.warn({ userId }, 'User not found for aura update');
    return;
  }

  // Add project score to user's aura (capped contribution)
  const auraContribution = Math.min(projectScore, 40); // Max 40 aura per project

  await prisma.user.update({
    where: { id: userId },
    data: {
      auraScore: {
        increment: auraContribution,
      },
    },
  });

  logger.debug({
    userId,
    previousAura: user.auraScore,
    added: auraContribution,
    newAura: user.auraScore + auraContribution,
  }, 'User aura updated');
}

/**
 * Log activity for audit trail
 */
async function logActivity(
  userId: string,
  projectId: string,
  score: number
): Promise<void> {
  await prisma.activity.create({
    data: {
      userId,
      type: 'PROJECT_ANALYZED',
      description: `Project analyzed with score ${score}`,
      auraPoints: Math.min(score, 40),
      referenceId: projectId,
      referenceType: 'project',
    },
  });
}
