import prisma from '../prisma/client.js';
import type { UpdateSettingsDto, UserSettings } from '../types/index.js';
import { VisibilityLevel, RemotePreference } from '@prisma/client';

export class VisibilityService {
  /**
   * Get user settings
   */
  static async getSettings(userId: string): Promise<UserSettings | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        isPublic: true,
        isOpenToWork: true,
        email: true,
        location: true,
      },
    });

    if (!user) return null;

    return {
      isPublic: user.isPublic,
      isOpenToWork: user.isOpenToWork,
      emailNotifications: true, // Default, would be in separate settings table
      showEmail: !!user.email,
      showLocation: !!user.location,
    };
  }

  /**
   * Update user settings
   */
  static async updateSettings(
    userId: string,
    data: UpdateSettingsDto
  ): Promise<UserSettings | null> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        isPublic: data.isPublic,
        isOpenToWork: data.isOpenToWork,
        updatedAt: new Date(),
      },
    });

    return this.getSettings(userId);
  }

  /**
   * Toggle open to work status
   */
  static async toggleOpenToWork(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isOpenToWork: true },
    });

    if (!user) return false;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isOpenToWork: !user.isOpenToWork },
    });

    return updated.isOpenToWork;
  }

  /**
   * Toggle profile visibility
   */
  static async togglePublic(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isPublic: true },
    });

    if (!user) return false;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isPublic: !user.isPublic },
    });

    return updated.isPublic;
  }

  // ============== PHASE 2: JOB PORTAL VISIBILITY ==============

  /**
   * Get comprehensive visibility settings for job portal
   */
  static async getVisibilitySettings(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        // Profile visibility
        isPublic: true,
        isOpenToWork: true,
        showEmail: true,
        showPhone: true,
        showCgpa: true,
        visibilityLevel: true,
        
        // Job preferences
        preferredRoles: true,
        preferredLocations: true,
        preferredJobTypes: true,
        expectedSalaryMin: true,
        expectedSalaryMax: true,
        salaryCurrency: true,
        availableFrom: true,
        noticePeriodDays: true,
        remotePreference: true,
        
        // Highlighted content
        highlightedSkills: true,
        phone: true,
      }
    });

    if (!user) return null;

    return {
      visibility: {
        isPublic: user.isPublic,
        isOpenToWork: user.isOpenToWork,
        showEmail: user.showEmail,
        showPhone: user.showPhone,
        showCgpa: user.showCgpa,
        visibilityLevel: user.visibilityLevel,
      },
      jobPreferences: {
        preferredRoles: user.preferredRoles,
        preferredLocations: user.preferredLocations,
        preferredJobTypes: user.preferredJobTypes,
        expectedSalary: {
          min: user.expectedSalaryMin,
          max: user.expectedSalaryMax,
          currency: user.salaryCurrency,
        },
        availableFrom: user.availableFrom,
        noticePeriodDays: user.noticePeriodDays,
        remotePreference: user.remotePreference,
      },
      highlightedSkills: user.highlightedSkills,
      phone: user.phone,
    };
  }

  /**
   * Update profile visibility settings
   */
  static async updateVisibility(
    userId: string,
    data: {
      isPublic?: boolean;
      isOpenToWork?: boolean;
      showEmail?: boolean;
      showPhone?: boolean;
      showCgpa?: boolean;
      visibilityLevel?: VisibilityLevel;
      phone?: string | null;
    }
  ) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.isPublic !== undefined && { isPublic: data.isPublic }),
        ...(data.isOpenToWork !== undefined && { isOpenToWork: data.isOpenToWork }),
        ...(data.showEmail !== undefined && { showEmail: data.showEmail }),
        ...(data.showPhone !== undefined && { showPhone: data.showPhone }),
        ...(data.showCgpa !== undefined && { showCgpa: data.showCgpa }),
        ...(data.visibilityLevel && { visibilityLevel: data.visibilityLevel }),
        ...(data.phone !== undefined && { phone: data.phone }),
      },
      select: {
        isPublic: true,
        isOpenToWork: true,
        showEmail: true,
        showPhone: true,
        showCgpa: true,
        visibilityLevel: true,
        phone: true,
      }
    });
  }

  /**
   * Update job preferences
   */
  static async updateJobPreferences(
    userId: string,
    data: {
      preferredRoles?: string[];
      preferredLocations?: string[];
      preferredJobTypes?: string[];
      expectedSalaryMin?: number | null;
      expectedSalaryMax?: number | null;
      salaryCurrency?: string | null;
      availableFrom?: Date | null;
      noticePeriodDays?: number | null;
      remotePreference?: RemotePreference;
    }
  ) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.preferredRoles !== undefined && { preferredRoles: data.preferredRoles }),
        ...(data.preferredLocations !== undefined && { preferredLocations: data.preferredLocations }),
        ...(data.preferredJobTypes !== undefined && { preferredJobTypes: data.preferredJobTypes }),
        ...(data.expectedSalaryMin !== undefined && { expectedSalaryMin: data.expectedSalaryMin }),
        ...(data.expectedSalaryMax !== undefined && { expectedSalaryMax: data.expectedSalaryMax }),
        ...(data.salaryCurrency !== undefined && { salaryCurrency: data.salaryCurrency }),
        ...(data.availableFrom !== undefined && { availableFrom: data.availableFrom }),
        ...(data.noticePeriodDays !== undefined && { noticePeriodDays: data.noticePeriodDays }),
        ...(data.remotePreference && { remotePreference: data.remotePreference }),
      },
      select: {
        preferredRoles: true,
        preferredLocations: true,
        preferredJobTypes: true,
        expectedSalaryMin: true,
        expectedSalaryMax: true,
        salaryCurrency: true,
        availableFrom: true,
        noticePeriodDays: true,
        remotePreference: true,
      }
    });
  }

  /**
   * Update highlighted skills
   */
  static async updateHighlightedSkills(userId: string, skillIds: string[]) {
    // Limit to 7 highlighted skills
    if (skillIds.length > 7) {
      throw new Error('Maximum 7 skills can be highlighted');
    }

    // Reset all skills' isHighlighted to false
    await prisma.skill.updateMany({
      where: { userId },
      data: { isHighlighted: false }
    });

    // Set selected skills as highlighted
    if (skillIds.length > 0) {
      await prisma.skill.updateMany({
        where: { 
          userId,
          id: { in: skillIds }
        },
        data: { isHighlighted: true }
      });
    }

    // Get updated highlighted skills
    const highlightedSkills = await prisma.skill.findMany({
      where: { 
        userId,
        isHighlighted: true 
      },
      select: {
        id: true,
        name: true,
        category: true,
        verifiedScore: true,
        isVerified: true,
      }
    });

    // Also update user's highlightedSkills array
    const skillNames = highlightedSkills.map(s => s.name);
    await prisma.user.update({
      where: { id: userId },
      data: { highlightedSkills: skillNames }
    });

    return highlightedSkills;
  }

  /**
   * Update project visibility
   */
  static async updateProjectVisibility(
    userId: string,
    projectId: string,
    data: {
      showToRecruiters?: boolean;
      isPinned?: boolean;
      customDescription?: string | null;
    }
  ) {
    // Verify project belongs to user
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId }
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Count pinned projects if trying to pin
    if (data.isPinned === true && !project.isPinned) {
      const pinnedCount = await prisma.project.count({
        where: { userId, isPinned: true }
      });
      if (pinnedCount >= 3) {
        throw new Error('Maximum 3 projects can be pinned');
      }
    }

    return prisma.project.update({
      where: { id: projectId },
      data: {
        ...(data.showToRecruiters !== undefined && { showToRecruiters: data.showToRecruiters }),
        ...(data.isPinned !== undefined && { isPinned: data.isPinned }),
        ...(data.customDescription !== undefined && { customDescription: data.customDescription }),
      },
      select: {
        id: true,
        repoName: true,
        description: true,
        customDescription: true,
        showToRecruiters: true,
        isPinned: true,
      }
    });
  }

  /**
   * Update skill visibility
   */
  static async updateSkillVisibility(
    userId: string,
    skillId: string,
    data: {
      showToRecruiters?: boolean;
      isHighlighted?: boolean;
    }
  ) {
    // Verify skill belongs to user
    const skill = await prisma.skill.findFirst({
      where: { id: skillId, userId }
    });

    if (!skill) {
      throw new Error('Skill not found');
    }

    // Check highlighted limit
    if (data.isHighlighted === true && !skill.isHighlighted) {
      const highlightedCount = await prisma.skill.count({
        where: { userId, isHighlighted: true }
      });
      if (highlightedCount >= 7) {
        throw new Error('Maximum 7 skills can be highlighted');
      }
    }

    const updatedSkill = await prisma.skill.update({
      where: { id: skillId },
      data: {
        ...(data.showToRecruiters !== undefined && { showToRecruiters: data.showToRecruiters }),
        ...(data.isHighlighted !== undefined && { isHighlighted: data.isHighlighted }),
      },
      select: {
        id: true,
        name: true,
        category: true,
        showToRecruiters: true,
        isHighlighted: true,
        verifiedScore: true,
      }
    });

    // Update user's highlightedSkills array
    const highlightedSkills = await prisma.skill.findMany({
      where: { userId, isHighlighted: true },
      select: { name: true }
    });
    await prisma.user.update({
      where: { id: userId },
      data: { highlightedSkills: highlightedSkills.map(s => s.name) }
    });

    return updatedSkill;
  }

  /**
   * Bulk update project visibility
   */
  static async bulkUpdateProjectVisibility(
    userId: string,
    data: {
      visibleProjectIds?: string[];
      hiddenProjectIds?: string[];
      pinnedProjectIds?: string[];
    }
  ) {
    // Validate pinned limit
    if (data.pinnedProjectIds && data.pinnedProjectIds.length > 3) {
      throw new Error('Maximum 3 projects can be pinned');
    }

    // Hide projects
    if (data.hiddenProjectIds?.length) {
      await prisma.project.updateMany({
        where: { 
          userId,
          id: { in: data.hiddenProjectIds }
        },
        data: { showToRecruiters: false }
      });
    }

    // Show projects
    if (data.visibleProjectIds?.length) {
      await prisma.project.updateMany({
        where: { 
          userId,
          id: { in: data.visibleProjectIds }
        },
        data: { showToRecruiters: true }
      });
    }

    // Reset pinned and set new pinned
    if (data.pinnedProjectIds !== undefined) {
      await prisma.project.updateMany({
        where: { userId },
        data: { isPinned: false }
      });
      
      if (data.pinnedProjectIds.length > 0) {
        await prisma.project.updateMany({
          where: { 
            userId,
            id: { in: data.pinnedProjectIds }
          },
          data: { isPinned: true }
        });
      }
    }

    // Get updated projects
    return prisma.project.findMany({
      where: { userId },
      select: {
        id: true,
        repoName: true,
        showToRecruiters: true,
        isPinned: true,
      },
      orderBy: [
        { isPinned: 'desc' },
        { overallScore: 'desc' }
      ]
    });
  }
}

export default VisibilityService;

