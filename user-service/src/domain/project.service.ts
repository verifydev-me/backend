import prisma from '../prisma/client.js';
import { rabbitmqPublisher } from '../rabbitmq/publisher.js';
import { logger } from '../utils/logger.js';
import { GitHubService } from './github.service.js';
import { AuraService } from './aura.service.js';

export interface AddProjectDto {
  githubRepoUrl: string;
  repoName: string;
  description?: string;
  defaultBranch?: string;
}

export class ProjectService {
  /**
   * Add a project and trigger analysis
   * Validates that the repo belongs to the user
   */
  static async addProject(userId: string, data: AddProjectDto) {
    // Get user's GitHub username and token
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, githubAccessToken: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.username) {
      throw new Error('User has no GitHub username');
    }

    const userToken = user.githubAccessToken || undefined;

    logger.info({ userId, username: user.username, repoUrl: data.githubRepoUrl, hasToken: !!userToken }, 'Adding project');

    // Validate repo ownership (pass token for API call)
    const isOwned = await GitHubService.isRepoOwnedByUser(user.username, data.githubRepoUrl, userToken);
    if (!isOwned) {
      logger.warn({ userId, username: user.username, repoUrl: data.githubRepoUrl }, 'Repo not owned by user');
      throw new Error('REPO_NOT_OWNED');
    }

    // Get repo details for additional info
    const repoDetails = await GitHubService.getRepoDetails(data.githubRepoUrl, userToken);

    // Check if project already exists
    const existing = await prisma.project.findUnique({
      where: {
        userId_githubRepoUrl: {
          userId,
          githubRepoUrl: data.githubRepoUrl,
        },
      },
    });

    if (existing) {
      // Re-trigger analysis if already exists
      if (existing.analysisStatus !== 'PROCESSING') {
        await this.triggerAnalysis(
          existing.id, 
          userId, 
          data.githubRepoUrl, 
          data.repoName, 
          repoDetails?.default_branch || data.defaultBranch
        );
        
        await prisma.project.update({
          where: { id: existing.id },
          data: { 
            analysisStatus: 'PROCESSING',
            stars: repoDetails?.stargazers_count || existing.stars,
            forks: repoDetails?.forks_count || existing.forks,
            language: repoDetails?.language || existing.language,
          },
        });
      }
      return existing;
    }

    // Create new project with GitHub data
    const project = await prisma.project.create({
      data: {
        userId,
        githubRepoUrl: data.githubRepoUrl,
        repoName: data.repoName,
        description: data.description || repoDetails?.description || undefined,
        analysisStatus: 'PROCESSING',
        stars: repoDetails?.stargazers_count || 0,
        forks: repoDetails?.forks_count || 0,
        language: repoDetails?.language || undefined,
      },
    });

    // Trigger analysis via RabbitMQ
    await this.triggerAnalysis(
      project.id,
      userId,
      data.githubRepoUrl,
      data.repoName,
      repoDetails?.default_branch || data.defaultBranch
    );

    logger.info({ projectId: project.id, userId }, 'Project added for analysis');

    return project;
  }

  /**
   * Get user's GitHub repos that can be added
   */
  static async getAvailableRepos(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, githubId: true, githubAccessToken: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.username) {
      logger.error({ userId, user }, 'User has no username set');
      throw new Error('User has no GitHub username');
    }

    logger.info({ userId, username: user.username, hasToken: !!user.githubAccessToken }, 'Fetching available repos');

    // Get user's GitHub repos (pass OAuth token for higher rate limits)
    const githubRepos = await GitHubService.getUserRepos(user.username, user.githubAccessToken || undefined);
    
    logger.info({ userId, reposFound: githubRepos.length }, 'GitHub repos fetched');
    
    // Get already added projects
    const existingProjects = await prisma.project.findMany({
      where: { userId },
      select: { githubRepoUrl: true },
    });
    
    logger.info({ userId, existingProjectsCount: existingProjects.length, existingUrls: existingProjects.map(p => p.githubRepoUrl) }, 'Existing projects fetched');
    
    const addedUrls = new Set(existingProjects.map(p => p.githubRepoUrl.toLowerCase()));

    // Mark which repos are already added
    const result = githubRepos.map(repo => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      url: repo.html_url,
      description: repo.description,
      language: repo.language,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      defaultBranch: repo.default_branch,
      isAdded: addedUrls.has(repo.html_url.toLowerCase()),
    }));
    
    logger.info({ 
      userId, 
      totalRepos: result.length, 
      addedCount: result.filter(r => r.isAdded).length 
    }, 'Available repos prepared');
    
    return result;
  }

  /**
   * Get user's projects
   */
  static async getUserProjects(userId: string) {
    return prisma.project.findMany({
      where: { userId },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * Get project by ID
   */
  static async getProject(projectId: string, userId: string) {
    return prisma.project.findFirst({
      where: { id: projectId, userId },
    });
  }

  /**
   * Delete project, reset skills, and recalculate aura
   */
  static async deleteProject(projectId: string, userId: string) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) return null;

    // Delete the project
    await prisma.project.delete({
      where: { id: projectId },
    });

    // Get remaining projects count
    const remainingProjects = await prisma.project.count({
      where: { userId },
    });

    logger.info({ projectId, userId, remainingProjects }, 'Project deleted, recalculating skills');

    // If no projects left, delete ALL skills for this user
    if (remainingProjects === 0) {
      await prisma.skill.deleteMany({
        where: { userId },
      });
      
      // Reset user aura to base (profile only)
      await prisma.user.update({
        where: { id: userId },
        data: { auraScore: 0 },
      });

      logger.info({ userId }, 'All skills deleted - no projects remaining');
    } else {
      // Recalculate skills based on remaining projects
      // Decrease project count for skills, delete those with 0 projects
      await prisma.skill.updateMany({
        where: { 
          userId,
          projectCount: { gt: 0 }
        },
        data: {
          projectCount: { decrement: 1 },
        },
      });

      // Delete skills with 0 projects
      await prisma.skill.deleteMany({
        where: {
          userId,
          projectCount: { lte: 0 },
        },
      });

      // Recalculate aura after project deletion
      try {
        await AuraService.updateAuraScore(userId);
        logger.info({ projectId, userId }, 'Aura recalculated after project deletion');
      } catch (error) {
        logger.error({ error, projectId, userId }, 'Failed to recalculate aura after project deletion');
      }
    }

    return project;
  }

  /**
   * Toggle pin status
   */
  static async togglePin(projectId: string, userId: string) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) return null;

    return prisma.project.update({
      where: { id: projectId },
      data: { isPinned: !project.isPinned },
    });
  }

  /**
   * Trigger project analysis via RabbitMQ
   */
  private static async triggerAnalysis(
    projectId: string,
    userId: string,
    repoUrl: string,
    repoName: string,
    defaultBranch?: string
  ) {
    await rabbitmqPublisher.publishAnalyzeRequest({
      projectId,
      userId,
      repoUrl,
      repoName,
      defaultBranch: defaultBranch || 'main',
    });
  }
}

export default ProjectService;

