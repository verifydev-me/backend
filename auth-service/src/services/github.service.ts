import axios from 'axios';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import type { GitHubTokenResponse, GitHubUser } from '../types/index.js';

const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_API_URL = 'https://api.github.com';

export class GitHubService {
  /**
   * Generate GitHub OAuth authorization URL
   */
  static getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      redirect_uri: env.GITHUB_CALLBACK_URL,
      scope: 'read:user user:email',
      state,
      allow_signup: 'true',
    });

    return `${GITHUB_AUTH_URL}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  static async exchangeCodeForToken(code: string): Promise<string> {
    try {
      const response = await axios.post<GitHubTokenResponse>(
        GITHUB_TOKEN_URL,
        {
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: env.GITHUB_CALLBACK_URL,
        },
        {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.data.access_token) {
        throw new Error('No access token received from GitHub');
      }

      return response.data.access_token;
    } catch (error) {
      logger.error({ error }, 'Failed to exchange code for token');
      throw new Error('GitHub authentication failed');
    }
  }

  /**
   * Fetch user profile from GitHub
   */
  static async getUserProfile(accessToken: string): Promise<GitHubUser> {
    try {
      const response = await axios.get<GitHubUser>(`${GITHUB_API_URL}/user`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      return response.data;
    } catch (error) {
      logger.error({ error }, 'Failed to fetch GitHub user profile');
      throw new Error('Failed to fetch user profile from GitHub');
    }
  }

  /**
   * Fetch user's primary email from GitHub
   */
  static async getUserEmail(accessToken: string): Promise<string | null> {
    try {
      const response = await axios.get<Array<{
        email: string;
        primary: boolean;
        verified: boolean;
      }>>(`${GITHUB_API_URL}/user/emails`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      const primaryEmail = response.data.find(
        (email) => email.primary && email.verified
      );

      return primaryEmail?.email || null;
    } catch (error) {
      logger.error({ error }, 'Failed to fetch GitHub user email');
      return null;
    }
  }

  /**
   * Fetch user's contribution count (last year)
   */
  static async getContributionCount(username: string): Promise<number> {
    try {
      // Note: This is a simplified approach
      // For accurate count, you'd use GitHub GraphQL API
      const response = await axios.get(
        `${GITHUB_API_URL}/users/${username}/events/public`,
        {
          params: { per_page: 100 },
          headers: {
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );

      // Count push events as contributions (simplified)
      const pushEvents = response.data.filter(
        (event: { type: string }) => event.type === 'PushEvent'
      );

      return pushEvents.length;
    } catch (error) {
      logger.error({ error }, 'Failed to fetch contribution count');
      return 0;
    }
  }
}

export default GitHubService;
