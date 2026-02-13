import prisma from '../prisma/client.js';
import { Prisma } from '@prisma/client';
import { GitHubService } from './github.service.js';
import { logger } from '../utils/logger.js';

const GITHUB_API = 'https://api.github.com';
const STATS_MAX_RETRIES = 5;
const STATS_RETRY_DELAY_MS = 2000;

// ============================================
// GIT DETAILS SERVICE
// Fetches real git data from GitHub APIs and stores in DB
// ============================================

interface ContributorData {
  login: string;
  avatarUrl: string;
  commits: number;
  additions: number;
  deletions: number;
}

interface CommitWeek {
  week: number; // Unix timestamp
  total: number;
}

function parseRepoOwner(repoUrl: string): { owner: string; repo: string } | null {
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
}

function getAuthHeaders(userToken?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'VerifyDev-App',
  };
  if (userToken) {
    headers['Authorization'] = `Bearer ${userToken}`;
  }
  return headers;
}

/**
 * Generic helper: fetch a GitHub Stats API endpoint with retry on 202.
 * GitHub returns 202 Accepted when stats are being computed — we must poll.
 */
async function fetchGitHubStatsWithRetry<T>(
  url: string,
  headers: Record<string, string>,
  label: string,
): Promise<T | null> {
  for (let attempt = 1; attempt <= STATS_MAX_RETRIES; attempt++) {
    const response = await fetch(url, { headers });

    logger.info({ url, status: response.status, attempt, label }, 'GitHub Stats API response');

    if (response.status === 200) {
      const data = await response.json();
      return data as T;
    }

    if (response.status === 202) {
      // Stats are being computed, wait and retry
      logger.info({ attempt, label }, `GitHub computing stats, retrying in ${STATS_RETRY_DELAY_MS}ms...`);
      await new Promise(resolve => setTimeout(resolve, STATS_RETRY_DELAY_MS));
      continue;
    }

    if (response.status === 204) {
      // No content — repo has no stats (e.g. empty repo)
      logger.info({ label }, 'GitHub returned 204 No Content — no stats available');
      return null;
    }

    // Any other error
    const body = await response.text().catch(() => '');
    logger.warn({ status: response.status, body: body.slice(0, 200), label }, 'GitHub Stats API error');
    return null;
  }

  logger.warn({ url, label }, `GitHub Stats API still returning 202 after ${STATS_MAX_RETRIES} retries`);
  return null;
}

export class GitDetailsService {
  /**
   * Fetch git details from GitHub APIs and save to DB
   */
  static async fetchAndSave(projectId: string, repoUrl: string, userToken?: string) {
    logger.info({ projectId, repoUrl }, 'Fetching git details from GitHub');

    const parsed = parseRepoOwner(repoUrl);
    if (!parsed) {
      throw new Error('Invalid GitHub repo URL');
    }

    const { owner, repo } = parsed;
    const headers = getAuthHeaders(userToken);

    // Fetch data in parallel from GitHub APIs
    const [repoDetails, languages, contributorStats, commitActivity] = await Promise.allSettled([
      GitHubService.getRepoDetails(repoUrl, userToken),
      GitHubService.getRepoLanguages(repoUrl, userToken),
      this.fetchContributorStats(owner, repo, headers),
      this.fetchCommitActivity(owner, repo, headers),
    ]);

    // Process results
    const repoData = repoDetails.status === 'fulfilled' ? repoDetails.value : null;
    const langData = languages.status === 'fulfilled' ? languages.value : {};
    const contribData = contributorStats.status === 'fulfilled' ? contributorStats.value : [];
    const activityData = commitActivity.status === 'fulfilled' ? commitActivity.value : [];

    logger.info({
      projectId,
      repoStatus: repoDetails.status,
      langStatus: languages.status,
      contribStatus: contributorStats.status,
      activityStatus: commitActivity.status,
      contribCount: contribData.length,
      activityWeeks: activityData.length,
    }, 'GitHub API fetch results');

    // Calculate derived fields
    const totalCommits = contribData.reduce((sum, c) => sum + c.commits, 0);
    const primaryAuthorPct = totalCommits > 0 && contribData.length > 0
      ? (Math.max(...contribData.map(c => c.commits)) / totalCommits) * 100
      : 0;

    // Get first/last commit dates from activity
    const nonEmptyWeeks = activityData.filter(w => w.total > 0);
    const firstCommitDate = nonEmptyWeeks.length > 0
      ? new Date(nonEmptyWeeks[0].week * 1000)
      : null;
    const lastCommitDate = nonEmptyWeeks.length > 0
      ? new Date(nonEmptyWeeks[nonEmptyWeeks.length - 1].week * 1000)
      : null;

    // Check if recently active (commit in last 30 days)
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const isActive = lastCommitDate ? lastCommitDate.getTime() > thirtyDaysAgo : false;

    const data = {
      projectId,
      totalCommits,
      firstCommitDate,
      lastCommitDate,
      commitFrequency: activityData as unknown as Prisma.InputJsonValue,
      totalContributors: contribData.length,
      contributors: contribData as unknown as Prisma.InputJsonValue,
      primaryAuthorPct: Math.round(primaryAuthorPct * 100) / 100,
      stars: repoData?.stargazers_count ?? 0,
      forks: repoData?.forks_count ?? 0,
      watchers: repoData?.stargazers_count ?? 0,
      openIssues: (repoData as any)?.open_issues_count ?? 0,
      repoSize: repoData?.size ?? 0,
      languageBreakdown: langData as unknown as Prisma.InputJsonValue,
      isActive,
      lastActivityDate: lastCommitDate,
      fetchedAt: new Date(),
    };

    // Upsert into DB
    const result = await prisma.projectGitDetails.upsert({
      where: { projectId },
      create: data,
      update: data,
    });

    logger.info({
      projectId,
      totalCommits,
      contributors: contribData.length,
      activityWeeks: activityData.length,
      languages: Object.keys(langData).length,
      isActive,
    }, 'Git details saved successfully');

    return result;
  }

  /**
   * Get stored git details for a project
   */
  static async getByProjectId(projectId: string) {
    return prisma.projectGitDetails.findUnique({
      where: { projectId },
    });
  }

  /**
   * Refresh git details (re-fetch from GitHub)
   */
  static async refresh(projectId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        githubRepoUrl: true,
        user: {
          select: { githubAccessToken: true },
        },
      },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    return this.fetchAndSave(
      projectId,
      project.githubRepoUrl,
      project.user.githubAccessToken || undefined,
    );
  }

  // ============================================
  // PRIVATE: GitHub API helpers
  // ============================================

  /**
   * GET /repos/{owner}/{repo}/stats/contributors
   * Returns per-contributor commit/addition/deletion counts
   * Uses retry logic for 202 responses
   */
  private static async fetchContributorStats(
    owner: string,
    repo: string,
    headers: Record<string, string>,
  ): Promise<ContributorData[]> {
    try {
      const url = `${GITHUB_API}/repos/${owner}/${repo}/stats/contributors`;
      const data = await fetchGitHubStatsWithRetry<any[]>(url, headers, 'contributors');

      if (!data || !Array.isArray(data)) {
        logger.warn({ owner, repo }, 'No contributor data returned from GitHub');
        return [];
      }

      logger.info({ owner, repo, rawCount: data.length }, 'Raw contributor data received');
      return this.mapContributors(data);
    } catch (error) {
      logger.error({ error, owner, repo }, 'Failed to fetch contributor stats');
      return [];
    }
  }

  private static mapContributors(data: any[]): ContributorData[] {
    return data
      .map(c => ({
        login: c.author?.login ?? 'unknown',
        avatarUrl: c.author?.avatar_url ?? '',
        commits: c.total ?? 0,
        additions: c.weeks?.reduce((sum: number, w: any) => sum + (w.a ?? 0), 0) ?? 0,
        deletions: c.weeks?.reduce((sum: number, w: any) => sum + (w.d ?? 0), 0) ?? 0,
      }))
      .sort((a, b) => b.commits - a.commits);
  }

  /**
   * GET /repos/{owner}/{repo}/stats/commit_activity
   * Returns weekly commit counts for the last year
   * Uses retry logic for 202 responses
   */
  private static async fetchCommitActivity(
    owner: string,
    repo: string,
    headers: Record<string, string>,
  ): Promise<CommitWeek[]> {
    try {
      const url = `${GITHUB_API}/repos/${owner}/${repo}/stats/commit_activity`;
      const data = await fetchGitHubStatsWithRetry<any[]>(url, headers, 'commit_activity');

      if (!data || !Array.isArray(data)) {
        logger.warn({ owner, repo }, 'No commit activity data returned from GitHub');
        return [];
      }

      logger.info({ owner, repo, weekCount: data.length }, 'Raw commit activity data received');
      return data.map(w => ({ week: w.week, total: w.total }));
    } catch (error) {
      logger.error({ error, owner, repo }, 'Failed to fetch commit activity');
      return [];
    }
  }
}

export default GitDetailsService;
