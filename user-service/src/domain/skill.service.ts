import { prisma } from '../prisma/client.js';
import { SkillSource, SkillLevel, SkillCategory } from '@prisma/client';
import { logger } from '../utils/logger.js';

// ============================================
// TYPES
// ============================================

export interface AddManualSkillData {
  name: string;
  category?: SkillCategory;
  selfDeclaredLevel?: SkillLevel;
  evidence?: Array<{ label?: string; url: string; description?: string }>;
}

export interface UpdateManualSkillData {
  selfDeclaredLevel?: SkillLevel;
  category?: SkillCategory;
  evidence?: Array<{ label?: string; url: string; description?: string }>;
}

export interface SkillWithEvidence {
  id: string;
  name: string;
  category: SkillCategory;
  source: SkillSource;
  isVerified: boolean;
  verifiedScore: number;
  selfDeclaredLevel: SkillLevel;
  projectCount: number;
  evidence: unknown;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// SERVICE
// ============================================

export class SkillService {
  /**
   * Get all skills for a user
   */
  static async getUserSkills(userId: string) {
    const skills = await prisma.skill.findMany({
      where: { userId },
      orderBy: [
        { isVerified: 'desc' },
        { verifiedScore: 'desc' },
        { name: 'asc' }
      ],
      select: {
        id: true,
        name: true,
        category: true,
        source: true,
        isVerified: true,
        verifiedScore: true,
        verifiedAt: true,
        selfDeclaredLevel: true,
        projectCount: true,
        linesOfCode: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    // Group by source
    const verified = skills.filter(s => s.source === SkillSource.ANALYSIS);
    const github = skills.filter(s => s.source === SkillSource.GITHUB);
    const manual = skills.filter(s => s.source === SkillSource.MANUAL);

    return {
      skills,
      summary: {
        total: skills.length,
        verified: verified.length,
        github: github.length,
        manual: manual.length,
      },
      bySource: {
        verified,
        github,
        manual,
      }
    };
  }

  /**
   * Get skills by category
   */
  static async getSkillsByCategory(userId: string, category: SkillCategory) {
    return prisma.skill.findMany({
      where: { userId, category },
      orderBy: { verifiedScore: 'desc' },
    });
  }

  /**
   * Add a manual (unverified) skill
   */
  static async addManualSkill(userId: string, data: AddManualSkillData) {
    logger.info({ userId, skillName: data.name }, 'Adding manual skill');

    // Check if skill already exists
    const existing = await prisma.skill.findUnique({
      where: {
        userId_name: { userId, name: data.name }
      }
    });

    if (existing) {
      throw new Error('Skill already exists');
    }

    const skill = await prisma.skill.create({
      data: {
        userId,
        name: data.name,
        category: data.category || SkillCategory.OTHER,
        source: SkillSource.MANUAL,
        isVerified: false,
        verifiedScore: 0,
        selfDeclaredLevel: data.selfDeclaredLevel || SkillLevel.BEGINNER,
        evidence: data.evidence ? JSON.stringify(data.evidence) : "[]",
      }
    });

    return skill;
  }

  /**
   * Update a manual skill (only MANUAL source allowed - protected by middleware)
   */
  static async updateManualSkill(skillId: string, data: UpdateManualSkillData) {
    logger.info({ skillId }, 'Updating manual skill');

    const skill = await prisma.skill.update({
      where: { id: skillId },
      data: {
        selfDeclaredLevel: data.selfDeclaredLevel,
        category: data.category,
        evidence: data.evidence ? JSON.stringify(data.evidence) : undefined,
      }
    });

    return skill;
  }

  /**
   * Delete a manual skill (only MANUAL source allowed - protected by middleware)
   */
  static async deleteManualSkill(skillId: string) {
    logger.info({ skillId }, 'Deleting manual skill');

    await prisma.skill.delete({
      where: { id: skillId }
    });

    return { deleted: true };
  }

  /**
   * Get skill with evidence details
   */
  static async getSkillEvidence(userId: string, skillId: string): Promise<SkillWithEvidence | null> {
    const skill = await prisma.skill.findFirst({
      where: { id: skillId, userId },
      include: {
        user: {
          select: {
            projects: {
              where: {
                analysisStatus: 'COMPLETED',
              },
              select: {
                id: true,
                repoName: true,
                language: true,
                overallScore: true,
              }
            }
          }
        }
      }
    });

    if (!skill) return null;

    // Parse evidence JSON and enrich with project details
    let evidence = skill.evidence || [];
    
    // If ANALYSIS skill, find related projects
    if (skill.source === SkillSource.ANALYSIS) {
      const relatedProjects = skill.user.projects.filter(p => 
        p.language?.toLowerCase() === skill.name.toLowerCase()
      );
      evidence = {
        projectCount: skill.projectCount,
        linesOfCode: skill.linesOfCode,
        projects: relatedProjects,
      };
    }

    return {
      id: skill.id,
      name: skill.name,
      category: skill.category,
      source: skill.source,
      isVerified: skill.isVerified,
      verifiedScore: skill.verifiedScore,
      selfDeclaredLevel: skill.selfDeclaredLevel,
      projectCount: skill.projectCount,
      evidence,
      createdAt: skill.createdAt,
      updatedAt: skill.updatedAt,
    };
  }

  /**
   * Sync skills from GitHub (called during login/profile sync)
   */
  static async syncGitHubSkills(userId: string, languages: { name: string; percentage: number }[]) {
    logger.info({ userId, languageCount: languages.length }, 'Syncing GitHub skills');

    for (const lang of languages) {
      await prisma.skill.upsert({
        where: {
          userId_name: { userId, name: lang.name }
        },
        update: {
          // Don't overwrite ANALYSIS skills
          source: SkillSource.GITHUB,
        },
        create: {
          userId,
          name: lang.name,
          category: SkillCategory.LANGUAGE,
          source: SkillSource.GITHUB,
          isVerified: false,
          verifiedScore: 0,
        }
      });
    }
  }
}

export default SkillService;
