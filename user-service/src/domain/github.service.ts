import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

const GITHUB_API = 'https://api.github.com';

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  private: boolean;
  default_branch: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  size: number; // Size in KB from GitHub API
  owner: {
    login: string;
    id: number;
  };
}

export interface GitHubBranch {
  name: string;
  protected: boolean;
}

export class GitHubService {
  /**
   * Get authorization headers - prefer user token over env token
   */
  private static getAuthHeaders(userToken?: string): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'VerifyDev-App',
    };

    // Prefer user's OAuth token (5000 req/hour) over env token (60 req/hour without auth)
    if (userToken) {
      headers['Authorization'] = `Bearer ${userToken}`;
      logger.debug('Using user OAuth token for GitHub API request');
    } else if (env.GITHUB_TOKEN) {
      headers['Authorization'] = `token ${env.GITHUB_TOKEN}`;
      logger.info('Using env GITHUB_TOKEN for API request');
    } else {
      logger.warn('⚠️ No GitHub token available - API rate limits will apply (60 req/hour). Set GITHUB_TOKEN env var!');
    }

    return headers;
  }

  /**
   * Fetch user's GitHub repos (uses stored OAuth token for better rate limits)
   * Fetches ALL repos including forks and sources
   */
  static async getUserRepos(username: string, userToken?: string): Promise<GitHubRepo[]> {
    try {
      logger.info({ username, hasToken: !!userToken }, 'Fetching GitHub repos for user');

      const headers = this.getAuthHeaders(userToken);
      const allRepos: GitHubRepo[] = [];
      let page = 1;
      const perPage = 100;

      // Fetch all pages of repos
      while (true) {
        const url = `${GITHUB_API}/users/${username}/repos?per_page=${perPage}&page=${page}&sort=updated&type=all`;
        logger.debug({ url, page }, 'GitHub API request URL');

        const response = await fetch(url, { headers });

        if (!response.ok) {
          const errorBody = await response.text();
          logger.error({
            username,
            status: response.status,
            statusText: response.statusText,
            errorBody,
            rateLimit: response.headers.get('x-ratelimit-remaining'),
            rateLimitReset: response.headers.get('x-ratelimit-reset')
          }, 'Failed to fetch GitHub repos');

          // If we got some repos before failing, return them
          if (allRepos.length > 0) break;
          return [];
        }

        const repos = (await response.json()) as GitHubRepo[];
        if (repos.length === 0) break;

        allRepos.push(...repos);

        // If less than perPage, we've reached the end
        if (repos.length < perPage) break;
        page++;

        // Safety limit - max 5 pages (500 repos)
        if (page > 5) break;
      }

      // Filter to only public repos and repos owned by this user
      const publicRepos = allRepos.filter((repo) =>
        !repo.private && repo.owner.login.toLowerCase() === username.toLowerCase()
      );

      logger.info({
        username,
        totalRepos: allRepos.length,
        publicRepos: publicRepos.length,
      }, 'GitHub repos fetched successfully');

      return publicRepos;
    } catch (error) {
      logger.error({ error, username }, 'Error fetching GitHub repos');
      return [];
    }
  }

  /**
   * Check if a user owns a specific repo
   */
  static async isRepoOwnedByUser(username: string, repoUrl: string, userToken?: string): Promise<boolean> {
    try {
      // Extract owner/repo from URL
      const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (!match) {
        return false;
      }

      const [, owner, repoName] = match;
      const cleanRepoName = repoName.replace(/\.git$/, '');

      // Check if owner matches username (case insensitive)
      if (owner.toLowerCase() !== username.toLowerCase()) {
        return false;
      }

      // Verify repo exists and is accessible
      const headers = this.getAuthHeaders(userToken);

      const response = await fetch(`${GITHUB_API}/repos/${owner}/${cleanRepoName}`, { headers });

      if (!response.ok) {
        logger.warn({ username, repoUrl, status: response.status }, 'Repo not found or not accessible');
        return false;
      }

      const repo = (await response.json()) as GitHubRepo;
      return repo.owner.login.toLowerCase() === username.toLowerCase();
    } catch (error) {
      logger.error({ error, username, repoUrl }, 'Error verifying repo ownership');
      return false;
    }
  }

  /**
   * Get repo details from GitHub
   */
  static async getRepoDetails(repoUrl: string, userToken?: string): Promise<GitHubRepo | null> {
    try {
      const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (!match) {
        return null;
      }

      const [, owner, repoName] = match;
      const cleanRepoName = repoName.replace(/\.git$/, '');

      const headers = this.getAuthHeaders(userToken);

      const response = await fetch(`${GITHUB_API}/repos/${owner}/${cleanRepoName}`, { headers });

      if (!response.ok) {
        return null;
      }

      return (await response.json()) as GitHubRepo;
    } catch (error) {
      logger.error({ error, repoUrl }, 'Error fetching repo details');
      return null;
    }
  }

  /**
   * Get language breakdown for repository
   */
  static async getRepoLanguages(repoUrl: string, userToken?: string): Promise<Record<string, number>> {
    try {
      const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (!match) {
        return {};
      }

      const [, owner, repoName] = match;
      const cleanRepoName = repoName.replace(/\.git$/, '');

      const headers = this.getAuthHeaders(userToken);
      const response = await fetch(`${GITHUB_API}/repos/${owner}/${cleanRepoName}/languages`, { headers });

      if (!response.ok) {
        logger.warn({ repoUrl, status: response.status }, 'Failed to fetch repo languages');
        return {};
      }

      return (await response.json()) as Record<string, number>;
    } catch (error) {
      logger.error({ error, repoUrl }, 'Error fetching repo languages');
      return {};
    }
  }

  /**
   * Get branches for a repository
   */
  static async getRepoBranches(repoUrl: string, userToken?: string): Promise<GitHubBranch[]> {
    try {
      const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (!match) {
        return [];
      }

      const [, owner, repoName] = match;
      const cleanRepoName = repoName.replace(/\.git$/, '');

      const headers = this.getAuthHeaders(userToken);
      const response = await fetch(`${GITHUB_API}/repos/${owner}/${cleanRepoName}/branches?per_page=30`, { headers });

      if (!response.ok) {
        logger.warn({ repoUrl, status: response.status }, 'Failed to fetch repo branches');
        return [];
      }

      return (await response.json()) as GitHubBranch[];
    } catch (error) {
      logger.error({ error, repoUrl }, 'Error fetching repo branches');
      return [];
    }
  }

  /**
   * Get contents of a repo path
   */
  static async getRepoContents(repoUrl: string, path: string = '', userToken?: string): Promise<any[]> {
    try {
      const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (!match) {
        return [];
      }

      const [, owner, repoName] = match;
      const cleanRepoName = repoName.replace(/\.git$/, '');

      const headers = this.getAuthHeaders(userToken);
      // Ensure path doesn't start with slash for API
      const cleanPath = path.startsWith('/') ? path.slice(1) : path;
      const apiUrl = `${GITHUB_API}/repos/${owner}/${cleanRepoName}/contents/${cleanPath}`;

      const response = await fetch(apiUrl, { headers });

      if (!response.ok) {
        // 404 means empty or invalid path
        if (response.status === 404) return [];
        logger.warn({ repoUrl, path, status: response.status }, 'Failed to fetch repo contents');
        return [];
      }

      const contents = await response.json();
      return Array.isArray(contents) ? contents : [contents];
    } catch (error) {
      logger.error({ error, repoUrl, path }, 'Error fetching repo contents');
      return [];
    }
  }

  /**
   * Get user's pinned repos (uses GraphQL API, no auth for public data)
   */
  static async getPinnedRepos(username: string, userToken?: string): Promise<GitHubRepo[]> {
    // For now, just return top repos sorted by stars
    try {
      const repos = await this.getUserRepos(username, userToken);
      return repos
        .sort((a, b) => b.stargazers_count - a.stargazers_count)
        .slice(0, 6);
    } catch (error) {
      logger.error({ error, username }, 'Error fetching pinned repos');
      return [];
    }
  }
  /**
   * Get user's contribution calendar (uses GraphQL API)
   */
  static async getContributionCalendar(username: string, userToken?: string): Promise<Record<string, number>> {
    try {
      const headers = this.getAuthHeaders(userToken);
      const query = `
        query($userName:String!) {
          user(login: $userName){
            contributionsCollection {
              contributionCalendar {
                weeks {
                  contributionDays {
                    contributionCount
                    date
                  }
                }
              }
            }
          }
        }
      `;

      const response = await fetch(`${GITHUB_API}/graphql`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query,
          variables: { userName: username },
        }),
      });

      if (!response.ok) {
        logger.warn({ username, status: response.status }, 'Failed to fetch GitHub contributions');
        return {};
      }

      const data: any = await response.json();
      const weeks = data?.data?.user?.contributionsCollection?.contributionCalendar?.weeks;

      if (!weeks) {
        return {};
      }

      const contributions: Record<string, number> = {};
      let totalCount = 0;

      weeks.forEach((week: any) => {
        week.contributionDays.forEach((day: any) => {
          if (day.contributionCount > 0) {
            contributions[day.date] = day.contributionCount;
            totalCount += day.contributionCount;
          }
        });
      });

      logger.info({ username, totalCount, daysWithContribs: Object.keys(contributions).length }, 'fetched GitHub contributions');
      return contributions;
    } catch (error) {
      logger.error({ error, username }, 'Error fetching GitHub contributions');
      return {};
    }
  }
}

export default GitHubService;
