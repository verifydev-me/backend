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
   * Get user's aura summary with detailed breakdown
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

    // Calculate breakdown with details
    const profile = await ProfileService.getMyProfile(userId);
    const profileScore = profile ? ProfileService.calculateProfileCompleteness(profile) : 0;
    const profileDetails = this.getProfileBreakdownDetails(user, profileScore);

    const projectsScore = this.calculateProjectsAura(user.projects);
    const projectDetails = this.getProjectsBreakdownDetails(user.projects, projectsScore);

    const skillsScore = this.calculateSkillsAura(user.skills);
    const skillsDetails = this.getSkillsBreakdownDetails(user.skills, skillsScore);

    const activityScore = await this.calculateActivityAura(userId);
    const activityDetails = this.getActivityBreakdownDetails(activityScore);

    const githubScore = this.calculateGitHubAura(user);
    const githubDetails = this.getGitHubBreakdownDetails(user, githubScore);

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
      breakdownDetails: {
        profile: profileDetails,
        projects: projectDetails,
        skills: skillsDetails,
        activity: activityDetails,
        github: githubDetails,
      },
      level: this.getAuraLevel(total),
      percentile,
      trend,
      recentGains,
    };
  }

  /**
   * Get detailed breakdown for profile score
   */
  private static getProfileBreakdownDetails(user: any, _totalScore: number): any[] {
    return [
      { label: 'Basic Info', points: 10, earned: !!user.name && !!user.email, reason: 'Name and email set' },
      { label: 'Profile Bio', points: 10, earned: !!user.bio, reason: user.bio ? 'Bio completed' : 'Add a bio' },
      { label: 'Avatar', points: 10, earned: !!user.avatarUrl, reason: user.avatarUrl ? 'Profile picture set' : 'Add profile picture' },
      { label: 'Location', points: 10, earned: !!user.location, reason: user.location ? 'Location specified' : 'Add your location' },
      { label: 'Website/Social', points: 10, earned: !!user.blog || !!user.twitterUsername, reason: 'Social links added' },
      { label: 'Skills Listed', points: 10, earned: _totalScore >= 60, reason: 'Skills added to profile' }
    ];
  }

  /**
   * Get detailed breakdown for projects score
   */
  private static getProjectsBreakdownDetails(projects: any[], totalScore: number): any[] {
    const analyzedCount = projects.filter(p => p.analysisStatus === 'COMPLETED').length;
    const avgScore = analyzedCount > 0 
      ? Math.round(projects.filter(p => p.analysisStatus === 'COMPLETED').reduce((sum, p) => sum + (p.overallScore || 0), 0) / analyzedCount)
      : 0;
    
    // Get top scoring project
    const topProject = projects
      .filter(p => p.analysisStatus === 'COMPLETED')
      .sort((a, b) => (b.overallScore || 0) - (a.overallScore || 0))[0];
    
    const details = [
      { 
        label: `${analyzedCount} Projects Analyzed`, 
        points: totalScore, 
        earned: analyzedCount > 0, 
        reason: analyzedCount > 0 
          ? `Avg score: ${avgScore}/100 (max 50 pts each for 80+ projects)`
          : 'Analyze your GitHub projects to earn points'
      }
    ];

    if (topProject) {
      details.push({
        label: `Top: ${topProject.repoName || 'Project'}`,
        points: Math.round((topProject.overallScore || 0) * 0.5),
        earned: true,
        reason: `Score: ${topProject.overallScore}/100`
      });
    }

    return details;
  }

  /**
   * Get detailed breakdown for skills score  
   */
  private static getSkillsBreakdownDetails(skills: any[], totalScore: number): any[] {
    const verifiedCount = skills.filter(s => s.isVerified).length;
    
    return [
      {
        label: `${verifiedCount} Verified Skills`,
        points: totalScore,
        earned: verifiedCount > 0,
        reason: verifiedCount > 0
          ? `Skills verified from project analysis (0.15 pts per skill score point)`
          : 'Get skills verified by analyzing projects'
      }
    ];
  }

  /**
   * Get detailed breakdown for activity score
   */
  private static getActivityBreakdownDetails(totalScore: number): any[] {
    return [
      {
        label: 'Platform Activity',
        points: totalScore,
        earned: totalScore > 0,
        reason: `Points from logins, profile views, and engagement (max 100)`
      }
    ];
  }

  /**
   * Get detailed breakdown for GitHub score
   */
  private static getGitHubBreakdownDetails(user: any, _totalScore: number): any[] {
    const followersPoints = Math.min(Math.round((user.githubFollowers || 0) * 0.04), 40);
    const reposPoints = Math.min(user.githubRepos || 0, 30);
    const contribPoints = Math.min(Math.round((user.githubContributions || 0) * 0.1), 30);
    
    return [
      { 
        label: `${user.githubFollowers || 0} Followers`, 
        points: followersPoints, 
        earned: followersPoints > 0, 
        reason: '0.04 pts per follower (max 40)' 
      },
      { 
        label: `${user.githubRepos || 0} Public Repos`, 
        points: reposPoints, 
        earned: reposPoints > 0, 
        reason: '1 pt per repo (max 30)' 
      },
      { 
        label: `${user.githubContributions || 0} Contributions`, 
        points: contribPoints, 
        earned: contribPoints > 0, 
        reason: '0.1 pts per contribution (max 30)' 
      }
    ];
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
   * Better formula: Higher scores get more points
   */
  private static calculateProjectsAura(projects: { overallScore: number; analysisStatus: string }[]): number {
    let score = 0;

    for (const project of projects) {
      if (project.analysisStatus === 'COMPLETED') {
        // Tiered scoring - better projects get more points
        const projectScore = project.overallScore;
        
        if (projectScore >= 80) {
          // Excellent project: up to 50 aura
          score += Math.round(projectScore * 0.5);
        } else if (projectScore >= 60) {
          // Good project: up to 40 aura
          score += Math.round(projectScore * 0.4);
        } else if (projectScore >= 40) {
          // Average project: up to 30 aura
          score += Math.round(projectScore * 0.35);
        } else {
          // Below average: up to 20 aura
          score += Math.round(projectScore * 0.3);
        }
      }
    }

    return Math.min(score, 250); // Cap at 250 (increased from 200)
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
