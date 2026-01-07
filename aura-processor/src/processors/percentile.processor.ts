import { logger } from '../utils/logger.js';

// ============================================
// PERCENTILE PROCESSOR
// ============================================

/**
 * PercentileProcessor
 * 
 * Calculates user's rank and percentile among all users.
 * Uses cached/periodic calculation for efficiency.
 */
export class PercentileProcessor {
  // Simulated aura distribution (in production, fetch from database)
  private static auraDistribution: number[] = [
    // Sample distribution of user aura scores
    25, 45, 60, 75, 90, 110, 125, 150, 175, 200,
    220, 250, 280, 310, 350, 400, 450, 500, 550, 600,
    650, 700, 750, 800, 900, 1000, 1100, 1200, 1500, 2000,
  ];

  /**
   * Calculate user's percentile rank
   */
  static calculatePercentile(userAura: number, allScores?: number[]): {
    percentile: number;
    rank: number;
    totalUsers: number;
    topPercent: string;
    badge: string;
  } {
    const scores = allScores || this.auraDistribution;
    const totalUsers = scores.length;

    // Count users with lower aura
    const belowCount = scores.filter(score => score < userAura).length;
    const percentile = Math.round((belowCount / totalUsers) * 100);

    // Calculate rank
    const sortedScores = [...scores, userAura].sort((a, b) => b - a);
    const rank = sortedScores.indexOf(userAura) + 1;

    // Format top percent
    const topPercent = percentile >= 50 
      ? `Top ${100 - percentile}%`
      : `Top ${100 - percentile}%`;

    // Generate badge based on percentile
    const badge = this.getPercentileBadge(percentile);

    logger.debug({ userAura, percentile, rank, totalUsers }, 'Calculated user percentile');

    return {
      percentile,
      rank,
      totalUsers,
      topPercent,
      badge,
    };
  }

  /**
   * Get percentile badge
   */
  static getPercentileBadge(percentile: number): string {
    if (percentile >= 99) return '🏆 Top 1%';
    if (percentile >= 95) return '🥇 Top 5%';
    if (percentile >= 90) return '🥈 Top 10%';
    if (percentile >= 75) return '🥉 Top 25%';
    if (percentile >= 50) return '⭐ Top 50%';
    return '🌱 Rising';
  }

  /**
   * Compare two users' aura scores
   */
  static compare(userAura: number, otherAura: number): {
    difference: number;
    percentDifference: number;
    isHigher: boolean;
    comparison: string;
  } {
    const difference = userAura - otherAura;
    const percentDifference = otherAura > 0 
      ? Math.round((difference / otherAura) * 100) 
      : 100;
    const isHigher = difference > 0;

    let comparison: string;
    if (difference === 0) {
      comparison = 'Same level';
    } else if (isHigher) {
      comparison = `${Math.abs(percentDifference)}% higher`;
    } else {
      comparison = `${Math.abs(percentDifference)}% lower`;
    }

    return {
      difference,
      percentDifference,
      isHigher,
      comparison,
    };
  }

  /**
   * Get leaderboard position info
   */
  static getLeaderboardInfo(userAura: number, allScores?: number[]): {
    rank: number;
    totalUsers: number;
    nearbyUsers: { rank: number; aura: number; isUser: boolean }[];
  } {
    const scores = allScores || this.auraDistribution;
    const allWithUser = [...scores, userAura];
    const sorted = allWithUser.sort((a, b) => b - a);
    
    const userRank = sorted.indexOf(userAura) + 1;
    
    // Get users around the current user's rank
    const startIndex = Math.max(0, userRank - 3);
    const endIndex = Math.min(sorted.length, userRank + 2);
    
    const nearbyUsers = sorted.slice(startIndex, endIndex).map((aura, idx) => ({
      rank: startIndex + idx + 1,
      aura,
      isUser: aura === userAura && startIndex + idx + 1 === userRank,
    }));

    return {
      rank: userRank,
      totalUsers: sorted.length,
      nearbyUsers,
    };
  }

  /**
   * Get stats summary
   */
  static getStatsSummary(allScores?: number[]): {
    totalUsers: number;
    averageAura: number;
    medianAura: number;
    topAura: number;
    distribution: { range: string; count: number; percent: number }[];
  } {
    const scores = allScores || this.auraDistribution;
    const sorted = [...scores].sort((a, b) => a - b);

    const totalUsers = scores.length;
    const averageAura = Math.round(scores.reduce((a, b) => a + b, 0) / totalUsers);
    const medianAura = sorted[Math.floor(totalUsers / 2)];
    const topAura = sorted[sorted.length - 1];

    // Distribution by ranges
    const ranges = [
      { range: '0-100', min: 0, max: 100 },
      { range: '101-300', min: 101, max: 300 },
      { range: '301-600', min: 301, max: 600 },
      { range: '601-1000', min: 601, max: 1000 },
      { range: '1000+', min: 1001, max: Infinity },
    ];

    const distribution = ranges.map(({ range, min, max }) => {
      const count = scores.filter(s => s >= min && s <= max).length;
      return {
        range,
        count,
        percent: Math.round((count / totalUsers) * 100),
      };
    });

    return {
      totalUsers,
      averageAura,
      medianAura,
      topAura,
      distribution,
    };
  }

  /**
   * Refresh distribution from database (call periodically)
   */
  static async refreshDistribution(): Promise<void> {
    // In production: fetch all user aura scores from database
    // const scores = await prisma.user.findMany({ select: { auraScore: true } });
    // this.auraDistribution = scores.map(u => u.auraScore);
    
    logger.info({}, 'Aura distribution refreshed');
  }
}

export default PercentileProcessor;
