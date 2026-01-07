// ============================================
// LEVEL DEFINITIONS
// ============================================

export interface Level {
  name: string;
  emoji: string;
  minAura: number;
  maxAura: number;
  color: string;
  description: string;
  benefits: string[];
}

export const LEVELS: Level[] = [
  {
    name: 'Novice',
    emoji: '🌱',
    minAura: 0,
    maxAura: 100,
    color: '#9CA3AF', // Gray
    description: 'Just getting started on your coding journey',
    benefits: ['Basic profile visibility', 'Access to all jobs'],
  },
  {
    name: 'Rising',
    emoji: '⭐',
    minAura: 101,
    maxAura: 300,
    color: '#60A5FA', // Blue
    description: 'Growing developer with solid fundamentals',
    benefits: ['Increased visibility', 'Early access to new features'],
  },
  {
    name: 'Skilled',
    emoji: '🔥',
    minAura: 301,
    maxAura: 600,
    color: '#FBBF24', // Yellow/Gold
    description: 'Experienced developer with verified skills',
    benefits: ['Priority in recruiter search', 'Skill badge on profile'],
  },
  {
    name: 'Expert',
    emoji: '💎',
    minAura: 601,
    maxAura: 1000,
    color: '#A855F7', // Purple
    description: 'Highly skilled professional with quality code',
    benefits: ['Featured in top developers', 'Direct recruiter messages'],
  },
  {
    name: 'Legend',
    emoji: '👑',
    minAura: 1001,
    maxAura: Infinity,
    color: '#F59E0B', // Amber/Gold
    description: 'Elite developer with exceptional skills',
    benefits: ['Legend badge', 'Featured on homepage', 'Priority support'],
  },
];

// ============================================
// LEVEL PROCESSOR
// ============================================

export class LevelProcessor {
  /**
   * Get level for given aura score
   */
  static getLevel(auraScore: number): Level {
    for (const level of LEVELS) {
      if (auraScore >= level.minAura && auraScore <= level.maxAura) {
        return level;
      }
    }
    return LEVELS[0]; // Default to Novice
  }

  /**
   * Get level name with emoji
   */
  static getLevelDisplay(auraScore: number): string {
    const level = this.getLevel(auraScore);
    return `${level.emoji} ${level.name}`;
  }

  /**
   * Calculate progress to next level
   */
  static getProgress(auraScore: number): {
    currentLevel: Level;
    nextLevel: Level | null;
    pointsToNext: number;
    progressPercent: number;
  } {
    const currentLevel = this.getLevel(auraScore);
    const currentIndex = LEVELS.findIndex(l => l.name === currentLevel.name);
    const nextLevel = currentIndex < LEVELS.length - 1 ? LEVELS[currentIndex + 1] : null;

    if (!nextLevel) {
      return {
        currentLevel,
        nextLevel: null,
        pointsToNext: 0,
        progressPercent: 100,
      };
    }

    const pointsToNext = nextLevel.minAura - auraScore;
    const levelRange = nextLevel.minAura - currentLevel.minAura;
    const progressInLevel = auraScore - currentLevel.minAura;
    const progressPercent = Math.min(100, Math.round((progressInLevel / levelRange) * 100));

    return {
      currentLevel,
      nextLevel,
      pointsToNext,
      progressPercent,
    };
  }

  /**
   * Check if user leveled up
   */
  static checkLevelUp(oldAura: number, newAura: number): {
    leveledUp: boolean;
    oldLevel: Level;
    newLevel: Level;
  } {
    const oldLevel = this.getLevel(oldAura);
    const newLevel = this.getLevel(newAura);
    const leveledUp = newLevel.name !== oldLevel.name && newAura > oldAura;

    if (leveledUp) {
      // Level up detected
    }

    return {
      leveledUp,
      oldLevel,
      newLevel,
    };
  }

  /**
   * Get all levels with current highlighted
   */
  static getAllLevelsWithCurrent(auraScore: number): (Level & { isCurrent: boolean; isUnlocked: boolean })[] {
    const currentLevel = this.getLevel(auraScore);

    return LEVELS.map(level => ({
      ...level,
      isCurrent: level.name === currentLevel.name,
      isUnlocked: auraScore >= level.minAura,
    }));
  }

  /**
   * Get level summary for profile
   */
  static getLevelSummary(auraScore: number): {
    level: string;
    emoji: string;
    color: string;
    progress: number;
    pointsToNext: number;
    nextLevel: string | null;
    description: string;
  } {
    const progress = this.getProgress(auraScore);

    return {
      level: progress.currentLevel.name,
      emoji: progress.currentLevel.emoji,
      color: progress.currentLevel.color,
      progress: progress.progressPercent,
      pointsToNext: progress.pointsToNext,
      nextLevel: progress.nextLevel?.name || null,
      description: progress.currentLevel.description,
    };
  }
}

export default LevelProcessor;
