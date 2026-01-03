import prisma from '../prisma/client.js';
import type { UpdateSettingsDto, UserSettings } from '../types/index.js';

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
}

export default VisibilityService;
