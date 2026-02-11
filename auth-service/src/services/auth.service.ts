import prisma from '../prisma/client.js';
import { GitHubService } from './github.service.js';
import { GoogleService } from './google.service.js';
import type { GoogleUser } from './google.service.js';
import { TokenService } from './token.service.js';
import { logger } from '../utils/logger.js';
import { TaggingService } from './tagging.service.js';
import type { AuthTokens, UserResponse, GitHubUser } from '../types/index.js';

export class AuthService {
  /**
   * Process GitHub OAuth callback - create or update user
   */
  static async processGitHubAuth(
    code: string
  ): Promise<{ user: UserResponse; tokens: AuthTokens }> {
    // Exchange code for access token
    const githubAccessToken = await GitHubService.exchangeCodeForToken(code);

    // Fetch user profile and email
    const [githubUser, primaryEmail] = await Promise.all([
      GitHubService.getUserProfile(githubAccessToken),
      GitHubService.getUserEmail(githubAccessToken),
    ]);

    // Create or update user in database (with GitHub token for API calls)
    const user = await this.upsertUser(githubUser, primaryEmail, githubAccessToken);

    // Generate JWT tokens
    const tokens = await TokenService.generateTokens(user.id);

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        userId: user.id,
        type: 'LOGIN',
        description: 'GitHub OAuth login',
        auraPoints: 1, // Small aura for logging in
      },
    });

    logger.info({ userId: user.id, username: user.username }, 'User logged in via GitHub');

    return {
      user: this.formatUserResponse(user),
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    };
  }

  /**
   * Process Google OAuth callback - create or update user
   */
  static async processGoogleAuth(
    code: string
  ): Promise<{ user: UserResponse; tokens: AuthTokens }> {
    // Exchange code for access token
    const googleAccessToken = await GoogleService.exchangeCodeForToken(code);

    // Fetch user profile
    const googleUser = await GoogleService.getUserProfile(googleAccessToken);

    // Create or update user in database
    const user = await this.upsertGoogleUser(googleUser);

    // Generate JWT tokens
    const tokens = await TokenService.generateTokens(user.id);

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        userId: user.id,
        type: 'LOGIN',
        description: 'Google OAuth login',
        auraPoints: 1,
      },
    });

    logger.info({ userId: user.id, username: user.username }, 'User logged in via Google');

    return {
      user: this.formatUserResponse(user),
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    };
  }

  /**
   * Create or update user from Google data
   */
  private static async upsertGoogleUser(googleUser: GoogleUser) {
    // Try to find by googleId first
    let existingUser = await prisma.user.findUnique({
      where: { googleId: googleUser.sub },
    });

    // If not found by googleId, try by email (link accounts)
    if (!existingUser && googleUser.email) {
      existingUser = await prisma.user.findUnique({
        where: { email: googleUser.email },
      });
    }

    const userData = {
      email: googleUser.email,
      name: googleUser.name,
      avatarUrl: googleUser.picture,
      googleId: googleUser.sub,
    };

    if (existingUser) {
      // Update existing user — link Google account
      return prisma.user.update({
        where: { id: existingUser.id },
        data: userData,
      });
    }

    // Generate a unique username from email
    const emailPrefix = googleUser.email.split('@')[0].replace(/[^a-zA-Z0-9_-]/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const username = `${emailPrefix}_${randomSuffix}`;

    // Create new user
    const newUser = await prisma.user.create({
      data: {
        ...userData,
        username,
        coreCount: 1,
        auraScore: 10, // Small bonus for signing up
      },
    });

    // Add profile complete activity for new users
    await prisma.activity.create({
      data: {
        userId: newUser.id,
        type: 'PROFILE_COMPLETE',
        description: 'Profile created via Google',
        auraPoints: 50,
      },
    });

    return newUser;
  }

  /**
   * Create or update user from GitHub data
   */
  private static async upsertUser(
    githubUser: GitHubUser,
    email: string | null,
    githubAccessToken: string
  ) {
    const existingUser = await prisma.user.findUnique({
      where: { githubId: githubUser.id.toString() },
    });

    // Calculate initial core count based on GitHub activity
    const coreCount = this.calculateInitialCoreCount(githubUser);

    const userData = {
      username: githubUser.login,
      email: email || githubUser.email,
      name: githubUser.name,
      avatarUrl: githubUser.avatar_url,
      bio: githubUser.bio,
      location: githubUser.location,
      company: githubUser.company,
      website: githubUser.blog,
      twitterHandle: githubUser.twitter_username,
      githubFollowers: githubUser.followers,
      githubRepos: githubUser.public_repos,
      githubAccessToken, // Store GitHub token for API calls
    };

    if (existingUser) {
      // Update existing user
      return prisma.user.update({
        where: { id: existingUser.id },
        data: {
          ...userData,
          // Don't overwrite core count and aura if already set
          coreCount: existingUser.coreCount || coreCount,
        },
      });
    }

    // Create new user
    const newUser = await prisma.user.create({
      data: {
        githubId: githubUser.id.toString(),
        ...userData,
        coreCount,
        auraScore: this.calculateInitialAura(githubUser),
      },
    });

    // Add profile complete activity for new users
    await prisma.activity.create({
      data: {
        userId: newUser.id,
        type: 'PROFILE_COMPLETE',
        description: 'Profile created via GitHub',
        auraPoints: 50, // Bonus for signing up
      },
    });

    return newUser;
  }

  /**
   * Calculate initial core count based on GitHub activity
   * Core 1: Beginner (< 10 repos, < 100 followers)
   * Core 2: Intermediate (10-50 repos, 100-1000 followers)
   * Core 3: Advanced (50+ repos, 1000+ followers)
   */
  private static calculateInitialCoreCount(githubUser: GitHubUser): number {
    const repoScore = githubUser.public_repos >= 50 ? 3 : githubUser.public_repos >= 10 ? 2 : 1;
    const followerScore = githubUser.followers >= 1000 ? 3 : githubUser.followers >= 100 ? 2 : 1;

    // Average of both scores
    const avgScore = (repoScore + followerScore) / 2;

    if (avgScore >= 2.5) return 3;
    if (avgScore >= 1.5) return 2;
    return 1;
  }

  /**
   * Calculate initial aura score based on GitHub stats
   */
  private static calculateInitialAura(githubUser: GitHubUser): number {
    let aura = 0;

    // Repos contribution (max 100)
    aura += Math.min(githubUser.public_repos * 2, 100);

    // Followers contribution (max 100)
    aura += Math.min(githubUser.followers, 100);

    // Account age bonus (max 50)
    const accountAge = new Date().getFullYear() - new Date(githubUser.created_at).getFullYear();
    aura += Math.min(accountAge * 10, 50);

    return aura;
  }

  /**
   * Format user for API response
   */
  private static formatUserResponse(user: {
    id: string;
    username: string;
    email: string | null;
    name: string | null;
    avatarUrl: string | null;
    bio: string | null;
    location: string | null;
    company: string | null;
    website: string | null;
    twitterHandle: string | null;
    githubFollowers: number;
    githubRepos: number;
    auraScore: number;
    coreCount: number;
    isVerified: boolean;
    isOpenToWork: boolean;
    leetcodeUsername?: string | null;
  }): UserResponse {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name || user.username,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      location: user.location,
      company: user.company,
      website: user.website,
      blog: user.website,
      twitterUsername: user.twitterHandle,
      twitter: user.twitterHandle,
      followers: user.githubFollowers || 0,
      following: 0,
      publicRepos: user.githubRepos || 0,
      auraScore: user.auraScore,
      auraLevel: this.getAuraLevel(user.auraScore),
      coreCount: user.coreCount,
      isVerified: user.isVerified,
      isOpenToWork: user.isOpenToWork,
      role: 'developer',
      leetcodeUsername: user.leetcodeUsername || null,
    };
  }

  /**
   * Get aura level from score
   */
  private static getAuraLevel(score: number): string {
    if (score >= 5000) return 'legend';
    if (score >= 2500) return 'expert';
    if (score >= 1000) return 'skilled';
    if (score >= 500) return 'rising';
    return 'novice';
  }

  /**
   * Logout - revoke session
   */
  static async logout(
    userId: string,
    sessionId: string,
    accessToken?: string
  ): Promise<void> {
    await TokenService.revokeSession(userId, sessionId, accessToken);
    logger.info({ userId }, 'User logged out');
  }

  /**
   * Logout from all devices
   */
  static async logoutAll(userId: string): Promise<void> {
    await TokenService.revokeAllSessions(userId);

    // Also invalidate all sessions in database
    await prisma.session.updateMany({
      where: { userId },
      data: { isValid: false },
    });

    logger.info({ userId }, 'User logged out from all devices');
  }

  /**
   * Get current user from token payload
   */
  static async getCurrentUser(userId: string): Promise<UserResponse | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) return null;

    // Fetch skills to generate tags
    const skills = await prisma.skill.findMany({
      where: { userId: user.id }
    });

    const tags = TaggingService.generateProfileTags(skills);

    const formattedUser = this.formatUserResponse(user);
    formattedUser.tags = tags;

    return formattedUser;
  }
}

export default AuthService;
