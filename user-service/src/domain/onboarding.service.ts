import { prisma } from '../prisma/client.js';
import { AuraService } from './aura.service.js';
import { logger } from '../utils/logger.js';
import type { Prisma } from '@prisma/client';

// ============================================
// TYPES
// ============================================

export interface OnboardingStep1Data {
  name: string;
  bio?: string;
}

export interface OnboardingStep2Data {
  isStudent: boolean;
  collegeName?: string;
  collegeYear?: number;
  branch?: string;
  cgpa?: number;
  graduationYear?: number;
}

export interface OnboardingStatus {
  complete: boolean;
  currentStep: number;
  steps: {
    step: number;
    title: string;
    completed: boolean;
  }[];
  missingFields: string[];
  percentComplete: number;
}

// ============================================
// SERVICE
// ============================================

export class OnboardingService {
  /**
   * Get current onboarding status for a user
   */
  static async getStatus(userId: string): Promise<OnboardingStatus | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        bio: true,
        isStudent: true,
        collegeName: true,
        onboardingComplete: true,
        onboardingStep: true,
        _count: {
          select: {
            projects: true,
          }
        }
      }
    });

    if (!user) return null;

    const missingFields: string[] = [];
    if (!user.name) missingFields.push('name');

    const steps = [
      { step: 1, title: 'Welcome', completed: true }, // Always completed after GitHub auth
      { step: 2, title: 'Basic Info', completed: Boolean(user.name) },
      { step: 3, title: 'Student Info', completed: user.onboardingStep >= 3 }, // Optional, skip counts as complete
      { step: 4, title: 'Add Projects', completed: user._count.projects > 0 || user.onboardingComplete },
    ];

    const completedSteps = steps.filter(s => s.completed).length;
    const percentComplete = Math.round((completedSteps / steps.length) * 100);

    return {
      complete: user.onboardingComplete,
      currentStep: user.onboardingStep,
      steps,
      missingFields,
      percentComplete,
    };
  }

  /**
   * Update Step 1: Basic Info (name, bio)
   */
  static async updateStep1(userId: string, data: OnboardingStep1Data) {
    logger.info({ userId, step: 1 }, 'Updating onboarding step 1');

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        bio: data.bio,
        onboardingStep: {
          // Only increment if currently at step 0 or 1
          set: Math.max(2, (await prisma.user.findUnique({ where: { id: userId }, select: { onboardingStep: true } }))?.onboardingStep || 0)
        },
      },
      select: {
        id: true,
        name: true,
        bio: true,
        onboardingStep: true,
      }
    });

    return user;
  }

  /**
   * Update Step 2: Student Info (optional)
   */
  static async updateStep2(userId: string, data: OnboardingStep2Data) {
    logger.info({ userId, step: 2, isStudent: data.isStudent }, 'Updating onboarding step 2');

    const updateData: Prisma.UserUpdateInput = {
      isStudent: data.isStudent,
      onboardingStep: 3,
    };

    // Only update student fields if user is a student
    if (data.isStudent) {
      updateData.collegeName = data.collegeName;
      updateData.collegeYear = data.collegeYear;
      updateData.branch = data.branch;
      updateData.cgpa = data.cgpa;
      updateData.graduationYear = data.graduationYear;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        isStudent: true,
        collegeName: true,
        collegeYear: true,
        branch: true,
        cgpa: true,
        graduationYear: true,
        onboardingStep: true,
      }
    });

    return user;
  }

  /**
   * Skip Step 2 (student info is optional)
   */
  static async skipStep2(userId: string) {
    logger.info({ userId }, 'Skipping onboarding step 2');

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        isStudent: false,
        onboardingStep: 3,
      },
      select: {
        id: true,
        onboardingStep: true,
      }
    });

    return user;
  }

  /**
   * Complete onboarding
   */
  static async complete(userId: string) {
    logger.info({ userId }, 'Completing onboarding');

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        onboardingComplete: true,
        onboardingStep: 4,
      },
      select: {
        id: true,
        onboardingComplete: true,
        onboardingStep: true,
      }
    });

    // Calculate initial aura score
    await AuraService.updateAuraScore(userId);

    // Record activity
    await prisma.activity.create({
      data: {
        userId,
        type: 'PROFILE_COMPLETE',
        description: 'Completed onboarding',
        auraPoints: 50, // Bonus for completing onboarding
      }
    });

    return user;
  }

  /**
   * Check if user needs onboarding
   */
  static async needsOnboarding(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { onboardingComplete: true }
    });

    return !user?.onboardingComplete;
  }
}

export default OnboardingService;
