import { logger } from '../utils/logger.js';

// ============================================
// TYPES
// ============================================

export interface AuraSnapshot {
  date: Date;
  auraScore: number;
  level: string;
  breakdown: {
    profile: number;
    projects: number;
    skills: number;
    github: number;
    activity: number;
  };
}

export interface AuraChange {
  date: Date;
  delta: number;
  reason: string;
  source: 'PROJECT_ANALYZED' | 'SKILL_VERIFIED' | 'PROFILE_UPDATE' | 'GITHUB_SYNC' | 'ACTIVITY';
  newTotal: number;
}

export interface AuraTrend {
  direction: 'up' | 'down' | 'stable';
  weeklyChange: number;
  monthlyChange: number;
  percentChange: number;
  isGrowing: boolean;
}

// ============================================
// MOCK DATABASE
// ============================================

const historyDb: Map<string, AuraSnapshot[]> = new Map();
const changesDb: Map<string, AuraChange[]> = new Map();

// ============================================
// HISTORY PROCESSOR
// ============================================

export class HistoryProcessor {
  /**
   * Record a new aura snapshot
   */
  static async recordSnapshot(
    userId: string,
    snapshot: Omit<AuraSnapshot, 'date'>
  ): Promise<void> {
    const userHistory = historyDb.get(userId) || [];
    
    userHistory.push({
      ...snapshot,
      date: new Date(),
    });

    // Keep last 90 days of snapshots
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const filtered = userHistory.filter(s => s.date >= ninetyDaysAgo);
    historyDb.set(userId, filtered);

    logger.debug({ userId, auraScore: snapshot.auraScore }, 'Recorded aura snapshot');
  }

  /**
   * Record an aura change
   */
  static async recordChange(
    userId: string,
    change: Omit<AuraChange, 'date'>
  ): Promise<void> {
    const userChanges = changesDb.get(userId) || [];
    
    userChanges.push({
      ...change,
      date: new Date(),
    });

    // Keep last 100 changes
    if (userChanges.length > 100) {
      userChanges.shift();
    }
    
    changesDb.set(userId, userChanges);

    logger.info({ userId, delta: change.delta, reason: change.reason }, 'Recorded aura change');
  }

  /**
   * Get aura history for user
   */
  static async getHistory(
    userId: string,
    days = 30
  ): Promise<AuraSnapshot[]> {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - days);

    const history = historyDb.get(userId) || [];
    return history.filter(s => s.date >= daysAgo).sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Get recent changes
   */
  static async getRecentChanges(
    userId: string,
    limit = 10
  ): Promise<AuraChange[]> {
    const changes = changesDb.get(userId) || [];
    return changes.slice(-limit).reverse();
  }

  /**
   * Calculate trend
   */
  static async calculateTrend(userId: string): Promise<AuraTrend> {
    const history = historyDb.get(userId) || [];
    
    if (history.length < 2) {
      return {
        direction: 'stable',
        weeklyChange: 0,
        monthlyChange: 0,
        percentChange: 0,
        isGrowing: false,
      };
    }

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const latest = history[history.length - 1];
    
    // Find closest snapshot to week ago
    const weekSnapshot = history.find(s => s.date >= weekAgo) || history[0];
    const monthSnapshot = history.find(s => s.date >= monthAgo) || history[0];

    const weeklyChange = latest.auraScore - weekSnapshot.auraScore;
    const monthlyChange = latest.auraScore - monthSnapshot.auraScore;
    
    const percentChange = weekSnapshot.auraScore > 0 
      ? Math.round((weeklyChange / weekSnapshot.auraScore) * 100)
      : 0;

    let direction: AuraTrend['direction'];
    if (weeklyChange > 10) direction = 'up';
    else if (weeklyChange < -10) direction = 'down';
    else direction = 'stable';

    return {
      direction,
      weeklyChange,
      monthlyChange,
      percentChange,
      isGrowing: weeklyChange > 0,
    };
  }

  /**
   * Get summary for profile display
   */
  static async getAuraSummary(userId: string, currentAura: number): Promise<{
    current: number;
    trend: AuraTrend;
    recentChanges: AuraChange[];
    weeklyHistory: { date: string; aura: number }[];
  }> {
    const trend = await this.calculateTrend(userId);
    const recentChanges = await this.getRecentChanges(userId, 5);
    const history = await this.getHistory(userId, 7);

    // Group by day for chart
    const weeklyHistory = history.map(s => ({
      date: s.date.toISOString().split('T')[0],
      aura: s.auraScore,
    }));

    return {
      current: currentAura,
      trend,
      recentChanges,
      weeklyHistory,
    };
  }

  /**
   * Calculate gains/losses this week
   */
  static async getWeeklyGains(userId: string): Promise<{
    gained: number;
    lost: number;
    net: number;
    topGain: AuraChange | null;
  }> {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const changes = changesDb.get(userId) || [];
    const weekChanges = changes.filter(c => c.date >= weekAgo);

    let gained = 0;
    let lost = 0;
    let topGain: AuraChange | null = null;

    for (const change of weekChanges) {
      if (change.delta > 0) {
        gained += change.delta;
        if (!topGain || change.delta > topGain.delta) {
          topGain = change;
        }
      } else {
        lost += Math.abs(change.delta);
      }
    }

    return {
      gained,
      lost,
      net: gained - lost,
      topGain,
    };
  }

  /**
   * Clear old history (cleanup job)
   */
  static async cleanup(daysToKeep = 90): Promise<{ cleaned: number }> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysToKeep);

    let cleaned = 0;

    for (const [userId, history] of historyDb) {
      const filtered = history.filter(s => s.date >= cutoff);
      cleaned += history.length - filtered.length;
      historyDb.set(userId, filtered);
    }

    logger.info({ cleaned, daysToKeep }, 'Cleaned old aura history');
    return { cleaned };
  }
}

export default HistoryProcessor;
