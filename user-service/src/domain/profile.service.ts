import prisma from '../prisma/client.js';
import { TaggingService } from './tagging.service.js';
import { logger } from '../utils/logger.js';
import type { UserProfile, PublicProfile, UpdateProfileDto, SkillSummary, ProjectSummary, SocialLinkSummary } from '../types/index.js';

export class ProfileService {
  /**
   * Get full user profile (for authenticated user)
   */
  static async getMyProfile(userId: string): Promise<UserProfile | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { socialLinks: true },
    });

    if (!user) return null;

    // Generate tags from skills
    const skills = await prisma.skill.findMany({ where: { userId } });
    const tags = TaggingService.generateProfileTags(skills);

    // Get LinkedIn URL from social links
    const linkedinLink = user.socialLinks?.find((l: any) => l.platform === 'LINKEDIN');

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      location: user.location,
      company: user.company,
      website: user.website,
      twitterHandle: user.twitterHandle,
      leetcodeUsername: user.leetcodeUsername,
      linkedinUrl: linkedinLink?.url || null,
      coreCount: user.coreCount,
      auraScore: user.auraScore,
      isPublic: user.isPublic,
      isOpenToWork: user.isOpenToWork,
      isVerified: user.isVerified,
      githubFollowers: user.githubFollowers,
      githubRepos: user.githubRepos,
      githubContributions: user.githubContributions,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      tags,
    };
  }

  /**
   * Update user profile
   */
  static async updateProfile(
    userId: string,
    data: UpdateProfileDto
  ): Promise<UserProfile | null> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        bio: data.bio,
        location: data.location,
        company: data.company,
        website: data.website,
        twitterHandle: data.twitterHandle,
        avatarUrl: data.avatarUrl,
        updatedAt: new Date(),
      },
    });

    // Handle LinkedIn social link upsert
    if (data.linkedinUrl !== undefined) {
      const existingLink = await prisma.socialLink.findFirst({
        where: { userId, platform: 'LINKEDIN' },
      });

      if (data.linkedinUrl && data.linkedinUrl.trim() !== '') {
        if (existingLink) {
          await prisma.socialLink.update({
            where: { id: existingLink.id },
            data: { url: data.linkedinUrl },
          });
        } else {
          await prisma.socialLink.create({
            data: {
              userId,
              platform: 'LINKEDIN',
              url: data.linkedinUrl,
            },
          });
        }
      } else if (existingLink) {
        // Empty string means remove LinkedIn link
        await prisma.socialLink.delete({
          where: { id: existingLink.id },
        });
      }
    }

    logger.info({ userId }, 'Profile updated');

    return this.getMyProfile(userId);
  }

  /**
   * Get public profile by username
   */
  static async getPublicProfile(username: string): Promise<PublicProfile | null> {
    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        skills: {
          where: { isVerified: true },
          orderBy: { verifiedScore: 'desc' },
          take: 10,
        },
        projects: {
          where: { isPublic: true },
          orderBy: { overallScore: 'desc' },
          take: 6,
        },
        socialLinks: true,
      },
    });

    if (!user || !user.isPublic) return null;

    const skills: SkillSummary[] = user.skills.map((s) => ({
      name: s.name,
      category: s.category,
      isVerified: s.isVerified,
      verifiedScore: s.verifiedScore,
      projectCount: s.projectCount,
      source: s.source,
    }));

    const projects: ProjectSummary[] = user.projects.map((p) => ({
      repoName: p.repoName,
      description: p.description,
      language: p.language,
      stars: p.stars,
      overallScore: p.overallScore,
      isPublic: p.isPublic,
    }));

    const socialLinks: SocialLinkSummary[] = user.socialLinks.map((l) => ({
      platform: l.platform,
      url: l.url,
      username: l.username,
    }));

    const tags = TaggingService.generateProfileTags(user.skills);

    return {
      username: user.username,
      name: user.name,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      location: user.location,
      coreCount: user.coreCount,
      auraScore: user.auraScore,
      isVerified: user.isVerified,
      isOpenToWork: user.isOpenToWork,
      skills,
      projects,
      socialLinks,
      tags,
    };
  }

  /**
   * Get user's projects
   */
  static async getUserProjects(username: string): Promise<ProjectSummary[]> {
    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        projects: {
          where: { isPublic: true },
          orderBy: [{ isPinned: 'desc' }, { overallScore: 'desc' }],
        },
      },
    });

    if (!user || !user.isPublic) return [];

    return user.projects.map((p) => ({
      repoName: p.repoName,
      description: p.description,
      language: p.language,
      stars: p.stars,
      overallScore: p.overallScore,
      isPublic: p.isPublic,
    }));
  }

  /**
   * Get user's skills (by userId)
   */
  static async getUserSkills(userId: string): Promise<SkillSummary[]> {
    const skills = await prisma.skill.findMany({
      where: { userId },
      orderBy: [{ isVerified: 'desc' }, { verifiedScore: 'desc' }],
    });

    return skills.map((s) => ({
      name: s.name,
      category: s.category,
      isVerified: s.isVerified,
      verifiedScore: s.verifiedScore,
      projectCount: s.projectCount,
      source: s.source,
    }));
  }

  /**
   * Calculate profile completeness (for aura)
   */
  static calculateProfileCompleteness(user: UserProfile): number {
    let score = 0;
    const weights = {
      name: 10,
      bio: 15,
      location: 5,
      company: 5,
      website: 10,
      avatarUrl: 10,
      twitterHandle: 5,
    };

    if (user.name) score += weights.name;
    if (user.bio && user.bio.length > 20) score += weights.bio;
    if (user.location) score += weights.location;
    if (user.company) score += weights.company;
    if (user.website) score += weights.website;
    if (user.avatarUrl) score += weights.avatarUrl;
    if (user.twitterHandle) score += weights.twitterHandle;

    return score; // Max 60
  }
}

export default ProfileService;
