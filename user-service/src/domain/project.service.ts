import prisma from '../prisma/client.js';
import { rabbitmqPublisher } from '../rabbitmq/publisher.js';
import { logger } from '../utils/logger.js';

export interface AddProjectDto {
  githubRepoUrl: string;
  repoName: string;
  description?: string;
  defaultBranch?: string;
}

export class ProjectService {
  /**
   * Add a project and trigger analysis
   */
  static async addProject(userId: string, data: AddProjectDto) {
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
        await this.triggerAnalysis(existing.id, userId, data.githubRepoUrl, data.repoName, data.defaultBranch);
        
        await prisma.project.update({
          where: { id: existing.id },
          data: { analysisStatus: 'PROCESSING' },
        });
      }
      return existing;
    }

    // Create new project
    const project = await prisma.project.create({
      data: {
        userId,
        githubRepoUrl: data.githubRepoUrl,
        repoName: data.repoName,
        description: data.description,
        analysisStatus: 'PROCESSING',
      },
    });

    // Trigger analysis via RabbitMQ
    await this.triggerAnalysis(
      project.id,
      userId,
      data.githubRepoUrl,
      data.repoName,
      data.defaultBranch
    );

    logger.info({ projectId: project.id, userId }, 'Project added for analysis');

    return project;
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
   * Delete project
   */
  static async deleteProject(projectId: string, userId: string) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) return null;

    await prisma.project.delete({
      where: { id: projectId },
    });

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
