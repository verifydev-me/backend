import { ConsumeMessage } from 'amqplib';
import { logger } from '../utils/logger.js';
import prisma from '../prisma/client.js';
import { auraCalculator } from '../processors/aura-calculator.js';
import type { ProjectSignals, SkillScore } from '../processors/types.js';

/**
 * Handles incoming project.analyzed messages
 * 
 * Flow:
 * 1. Parse signals from message
 * 2. Calculate aura score
 * 3. Update project in database
 * 4. Update/create skills
 * 5. Update user's total aura
 * 6. Log activity
 */
export async function handleProjectAnalyzed(msg: ConsumeMessage): Promise<void> {
  const startTime = Date.now();

  // Parse message
  const signals: ProjectSignals = JSON.parse(msg.content.toString());

  logger.info({
    projectId: signals.projectId,
    userId: signals.userId,
  }, '📥 Processing analyzed project');

  try {
    // Calculate aura
    const auraResult = auraCalculator.calculate(signals);

    logger.debug({
      projectId: signals.projectId,
      score: auraResult.projectScore,
      breakdown: auraResult.breakdown,
    }, 'Aura calculated');

    // Update project in database
    await updateProject(signals, auraResult.projectScore, auraResult.breakdown);

    // Update/create skills
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
    logger.error({ error, projectId: signals.projectId }, '❌ Failed to process project');
    throw error; // Will trigger requeue
  }
}

/**
 * Update project with analysis results
 */
async function updateProject(
  signals: ProjectSignals,
  overallScore: number,
  breakdown: { structure: number; codeQuality: number; testing: number; documentation: number; techStack: number; complexity: number }
): Promise<void> {
  await prisma.project.update({
    where: { id: signals.projectId },
    data: {
      analysisStatus: 'COMPLETED',
      analyzedAt: new Date(signals.analyzedAt),
      overallScore,
      codeQualityScore: breakdown.codeQuality + breakdown.testing,
      structureScore: breakdown.structure,
      auraContribution: overallScore,
      language: signals.primaryLanguage,
    },
  });
}

/**
 * Update or create skills for user
 */
async function updateSkills(userId: string, skills: SkillScore[]): Promise<void> {
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
