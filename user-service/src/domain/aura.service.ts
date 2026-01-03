import prisma from '../prisma/client.js';
import { logger } from '../utils/logger.js';
import { ProfileService } from './profile.service.js';
import type { AuraSummary, AuraGain } from '../types/index.js';

/**
 * Aura System - User reputation based on verified skills, projects, and activity
 * 
 * AURA BREAKDOWN:
 * - Profile (max 60): Profile completeness
 * - Projects (max 200): From analyzed projects
 * - Skills (max 150): From verified skills
 * - Activity (max 100): Platform engagement
 * - GitHub (max 100): Followers, repos, contributions
 * 
 * LEVELS:
 * - Novice: 0-100
 * - Rising: 101-250
 * - Skilled: 251-400
 * - Expert: 401-500
 * - Legend: 501+
 */
export class AuraService {
  /**
   * Get user's aura summary
   */
  static async getAuraSummary(userId: string): Promise<AuraSummary | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        skills: true,
        projects: true,
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!user) return null;

    // Calculate breakdown
    const profile = await ProfileService.getMyProfile(userId);
    const profileScore = profile ? ProfileService.calculateProfileCompleteness(profile) : 0;

    const projectsScore = this.calculateProjectsAura(user.projects);
    const skillsScore = this.calculateSkillsAura(user.skills);
    const activityScore = await this.calculateActivityAura(userId);
    const githubScore = this.calculateGitHubAura(user);

    const total = profileScore + projectsScore + skillsScore + activityScore + githubScore;

    // Get recent gains
    const recentGains: AuraGain[] = user.activities
      .filter((a) => a.auraPoints > 0)
      .map((a) => ({
        type: a.type,
        points: a.auraPoints,
        description: a.description || '',
        date: a.createdAt,
      }));

    // Calculate percentile (simplified - would need all users for accurate calc)
    const totalUsers = await prisma.user.count();
    const usersBelow = await prisma.user.count({
      where: { auraScore: { lt: total } },
    });
    const percentile = Math.round((usersBelow / totalUsers) * 100);

    // Determine trend
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentActivity = await prisma.activity.aggregate({
      where: { userId, createdAt: { gte: weekAgo } },
      _sum: { auraPoints: true },
    });
    const trend = (recentActivity._sum.auraPoints || 0) > 10 ? 'up' : 
                  (recentActivity._sum.auraPoints || 0) < 0 ? 'down' : 'stable';

    return {
      total,
      breakdown: {
        profile: profileScore,
        projects: projectsScore,
        skills: skillsScore,
        activity: activityScore,
        github: githubScore,
      },
      level: this.getAuraLevel(total),
      percentile,
      trend,
      recentGains,
    };
  }

  /**
   * Get public aura summary (by username)
   */
  static async getPublicAura(username: string): Promise<Omit<AuraSummary, 'recentGains'> | null> {
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user || !user.isPublic) return null;

    const summary = await this.getAuraSummary(user.id);
    if (!summary) return null;

    // Remove recent gains for public view
    const { recentGains, ...publicSummary } = summary;
    return publicSummary;
  }

  /**
   * Calculate aura from projects
   */
  private static calculateProjectsAura(projects: { overallScore: number; analysisStatus: string }[]): number {
    let score = 0;

    for (const project of projects) {
      if (project.analysisStatus === 'COMPLETED') {
        // Each completed project adds up to 40 aura based on score
        score += Math.round(project.overallScore * 0.4);
      }
    }

    return Math.min(score, 200); // Cap at 200
  }

  /**
   * Calculate aura from skills
   */
  private static calculateSkillsAura(skills: { isVerified: boolean; verifiedScore: number }[]): number {
    let score = 0;

    for (const skill of skills) {
      if (skill.isVerified) {
        // Each verified skill adds up to 15 aura based on score
        score += Math.round(skill.verifiedScore * 0.15);
      }
    }

    return Math.min(score, 150); // Cap at 150
  }

  /**
   * Calculate aura from activity
   */
  private static async calculateActivityAura(userId: string): Promise<number> {
    const result = await prisma.activity.aggregate({
      where: { userId },
      _sum: { auraPoints: true },
    });

    return Math.min(result._sum.auraPoints || 0, 100); // Cap at 100
  }

  /**
   * Calculate aura from GitHub stats
   */
  private static calculateGitHubAura(user: { githubFollowers: number; githubRepos: number; githubContributions: number }): number {
    let score = 0;

    // Followers (max 40)
    score += Math.min(Math.round(user.githubFollowers * 0.04), 40);

    // Repos (max 30)
    score += Math.min(user.githubRepos, 30);

    // Contributions (max 30)
    score += Math.min(Math.round(user.githubContributions * 0.1), 30);

    return Math.min(score, 100); // Cap at 100
  }

  /**
   * Get aura level based on score
   */
  private static getAuraLevel(score: number): AuraSummary['level'] {
    if (score <= 100) return 'Novice';
    if (score <= 250) return 'Rising';
    if (score <= 400) return 'Skilled';
    if (score <= 500) return 'Expert';
    return 'Legend';
  }

  /**
   * Update user's cached aura score
   */
  static async updateAuraScore(userId: string): Promise<number> {
    const summary = await this.getAuraSummary(userId);
    if (!summary) return 0;

    await prisma.user.update({
      where: { id: userId },
      data: { auraScore: summary.total },
    });

    logger.info({ userId, auraScore: summary.total }, 'Aura score updated');

    return summary.total;
  }

  /**
   * Add aura activity
   */
  static async addActivity(
    userId: string,
    type: 'PROFILE_COMPLETE' | 'PROJECT_ADDED' | 'PROJECT_ANALYZED' | 'SKILL_VERIFIED' | 'LOGIN' | 'RESUME_GENERATED' | 'PROFILE_VIEWED',
    description: string,
    points: number
  ): Promise<void> {
    await prisma.activity.create({
      data: {
        userId,
        type,
        description,
        auraPoints: points,
      },
    });

    // Update cached aura score
    await this.updateAuraScore(userId);
  }
}

export default AuraService;
