import axios from 'axios';
import { logger } from '../utils/logger.js';

const LEETCODE_GRAPHQL_URL = 'https://leetcode.com/graphql/';

interface LeetcodeProfile {
    username: string;
    ranking: number;
    reputation: number;
    totalSolved: number;
    easySolved: number;
    mediumSolved: number;
    hardSolved: number;
    acceptanceRate: number;
    contributionPoints: number;
    submissionCalendar: Record<string, number>; // timestamp -> count
}

interface SubmissionStats {
    difficulty: string;
    count: number;
    submissions: number;
}

export class LeetcodeService {
    /**
     * Validate that a LeetCode username exists
     */
    static async validateUsername(username: string): Promise<boolean> {
        try {
            const query = `
        query getUserProfile($username: String!) {
          matchedUser(username: $username) {
            username
          }
        }
      `;

            const response = await axios.post(
                LEETCODE_GRAPHQL_URL,
                { query, variables: { username } },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Referer': 'https://leetcode.com',
                    },
                    timeout: 10000,
                }
            );

            return !!response.data?.data?.matchedUser;
        } catch (error) {
            logger.error('LeetCode username validation failed:', error);
            return false;
        }
    }

    /**
     * Fetch full LeetCode profile stats
     */
    static async getProfile(username: string): Promise<LeetcodeProfile | null> {
        try {
            const query = `
        query getUserProfile($username: String!) {
          matchedUser(username: $username) {
            username
            profile {
              ranking
              reputation
            }
            submitStatsGlobal {
              acSubmissionNum {
                difficulty
                count
                submissions
              }
            }
            userCalendar {
              submissionCalendar
            }
          }
        }
      `;

            const response = await axios.post(
                LEETCODE_GRAPHQL_URL,
                { query, variables: { username } },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Referer': 'https://leetcode.com',
                    },
                    timeout: 15000,
                }
            );

            const user = response.data?.data?.matchedUser;
            if (!user) return null;

            const stats: SubmissionStats[] = user.submitStatsGlobal?.acSubmissionNum || [];
            const allStats = stats.find((s: SubmissionStats) => s.difficulty === 'All');
            const easyStats = stats.find((s: SubmissionStats) => s.difficulty === 'Easy');
            const mediumStats = stats.find((s: SubmissionStats) => s.difficulty === 'Medium');
            const hardStats = stats.find((s: SubmissionStats) => s.difficulty === 'Hard');

            // Parse submission calendar (JSON string -> object)
            let calendar: Record<string, number> = {};
            try {
                const calStr = user.userCalendar?.submissionCalendar;
                if (calStr) {
                    const params = JSON.parse(calStr);
                    // Convert timestamps (seconds) to YYYY-MM-DD
                    Object.keys(params).forEach(timestamp => {
                        const date = new Date(parseInt(timestamp) * 1000);
                        const dateStr = date.toISOString().split('T')[0];
                        calendar[dateStr] = params[timestamp];
                    });
                }
            } catch {
                logger.warn('Failed to parse LeetCode submission calendar');
            }

            // Calculate acceptance rate
            const totalSubmissions = allStats?.submissions || 0;
            const totalAccepted = allStats?.count || 0;
            const acceptanceRate = totalSubmissions > 0
                ? Math.round((totalAccepted / totalSubmissions) * 10000) / 100
                : 0;

            return {
                username: user.username,
                ranking: user.profile?.ranking || 0,
                reputation: user.profile?.reputation || 0,
                totalSolved: allStats?.count || 0,
                easySolved: easyStats?.count || 0,
                mediumSolved: mediumStats?.count || 0,
                hardSolved: hardStats?.count || 0,
                acceptanceRate,
                contributionPoints: user.profile?.reputation || 0,
                submissionCalendar: calendar,
            };
        } catch (error: any) {
            logger.error('Failed to fetch LeetCode profile:', error?.message);
            return null;
        }
    }
}
