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
  projectType?: 'backend' | 'frontend' | 'fullstack' | 'ml' | 'library';
  basePath?: string;
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
          repoDetails?.default_branch || data.defaultBranch,
          data.projectType,
          userToken, // Pass token for private repos
          data.basePath
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
        basePath: data.basePath,
      },
    });

    // Trigger analysis via RabbitMQ
    await this.triggerAnalysis(
      project.id,
      userId,
      data.githubRepoUrl,
      data.repoName,
      repoDetails?.default_branch || data.defaultBranch,
      data.projectType,
      userToken, // Pass GitHub token for private repo cloning
      data.basePath
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
      sizeKB: repo.size || 0, // Size in KB from GitHub API
      sizeMB: Math.round((repo.size || 0) / 1024), // Size in MB for UI
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
   * Get branches for a specific repo
   */
  static async getBranches(repoUrl: string, userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { githubAccessToken: true, username: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Pass token for authentication (needed for private repos)
    return GitHubService.getRepoBranches(repoUrl, user.githubAccessToken || undefined);
  }

  /**
   * Get contents of a repo (folders/files)
   */
  static async getRepoContents(repoUrl: string, path: string, userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { githubAccessToken: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return GitHubService.getRepoContents(repoUrl, path, user.githubAccessToken || undefined);
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
   * Get project by ID with full analysis and skills breakdown
   */
  static async getProject(projectId: string, userId: string) {
    // Get project with full analysis
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
      include: {
        analysis: {
          include: {
            verifiedSkills: true,
            optimizationSuggestions: true,
            reactAnalysis: true,
            infraSignals: true,
          },
        },
        user: {
          select: {
            githubAccessToken: true,
          },
        },
      },
    });

    if (!project) return null;

    const { analysis, user: projectOwner, ...projectData } = project;

    const structuredFullAnalysis = analysis ? buildStructuredFullAnalysis(analysis) : {};
    // Legacy fields removed from schema - use structured analysis directly
    const mergedFullAnalysis = mergeFullAnalysis(structuredFullAnalysis, null);
    const structuredTechStack = (structuredFullAnalysis as any)?.techStack || {};

    const languageSummary = await buildLanguageBreakdown(
      mergedFullAnalysis?.techStack?.languages,
      analysis,
      null, // legacyFullAnalysis removed
      project.githubRepoUrl,
      projectOwner?.githubAccessToken || undefined,
      project.basePath || undefined
    );

    if (!mergedFullAnalysis.techStack) {
      mergedFullAnalysis.techStack = {};
    }

    mergedFullAnalysis.techStack.languages = languageSummary.languages;
    mergedFullAnalysis.techStack.frameworks = mergedFullAnalysis.techStack.frameworks || structuredTechStack.frameworks || [];
    mergedFullAnalysis.techStack.databases = mergedFullAnalysis.techStack.databases || structuredTechStack.databases || [];
    mergedFullAnalysis.techStack.tools = mergedFullAnalysis.techStack.tools || structuredTechStack.tools || [];
    mergedFullAnalysis.techStack.infrastructure = mergedFullAnalysis.techStack.infrastructure || structuredTechStack.infrastructure || [];

    // Legacy industry analysis removed from schema

    // Get user's skills that were detected from projects
    const skills = await prisma.skill.findMany({
      where: { 
        userId,
        source: 'ANALYSIS', // Only verified/analyzed skills
      },
      orderBy: { verifiedScore: 'desc' },
    });

    // Get user's technologies
    const technologies = await prisma.technology.findMany({
      where: { userId },
      orderBy: { confidence: 'desc' },
    });

    // Build enriched response with all analysis data
    // Get verified skills from analysis if available (PREFERRED)
    const verifiedSkillsSource = (analysis?.verifiedSkills && analysis.verifiedSkills.length > 0) 
      ? analysis.verifiedSkills.map(s => ({
          name: s.name,
          category: s.category.toLowerCase(),
          level: getSkillLevel(s.confidence * 100),
          confidence: s.confidence,
          score: Math.round(s.confidence * 100),
          verifiedScore: Math.round(s.confidence * 100),
          isVerified: s.resumeReady || s.usageVerified || s.confidence >= 0.7,
          usageVerified: s.usageVerified,
          usageStrength: s.usageStrength,
          evidence: s.evidence || [],
          resumeReady: s.resumeReady,
          projectCount: 1, // Specific to this project
        }))
      : skills.map(skill => ({
          name: skill.name,
          category: skill.category.toLowerCase(),
          level: getSkillLevel(skill.verifiedScore),
          confidence: skill.verifiedScore / 100, // Convert to 0-1
          score: skill.verifiedScore,
          verifiedScore: skill.verifiedScore,
          isVerified: skill.isVerified,
          evidence: skill.evidence || [],
          resumeReady: skill.verifiedScore >= 70,
          projectCount: skill.projectCount,
        }));

    // Create skills breakdown with percentages
    const skillsBreakdown = verifiedSkillsSource;

    // Create technologies breakdown
    const techBreakdown = technologies.map(tech => ({
      name: tech.name,
      category: tech.category.toLowerCase(),
      confidence: tech.confidence / 100,
      score: tech.confidence,
      detectedFrom: tech.detectedFrom,
      resumeReady: tech.confidence >= 60,
    }));

    // Calculate industry analysis summary
    const computedIndustryAnalysis = {
      verifiedSkills: skillsBreakdown,
      skillsByCategory: groupSkillsByCategory(skillsBreakdown),
      totalSkills: skillsBreakdown.length,
      highConfidenceSkills: skillsBreakdown.filter(s => s.score >= 70).length,
      resumeReadySkills: skillsBreakdown.filter(s => s.resumeReady).length,
      overallScore: project.overallScore || project.auraContribution || 0,
      engineeringLevel: getEngineeringLevel(project.overallScore),
      technologies: techBreakdown,
    };

    const mergedIndustryAnalysis = mergeIndustryAnalysis(null, computedIndustryAnalysis);
    mergedFullAnalysis.industryAnalysis = mergedIndustryAnalysis;

    return {
      ...projectData,
      analysisId: analysis?.id ?? null,
      // Add computed fields for frontend
      repoUrl: project.githubRepoUrl,
      analysisStatus: project.analysisStatus.toLowerCase(),
      // Include detailed analysis
      fullAnalysis: mergedFullAnalysis,
      industryAnalysis: mergedIndustryAnalysis,
      languages: languageSummary.languageMap,
      metrics: {
        codeQuality: project.codeQualityScore,
        documentation: mergedFullAnalysis.codeQuality?.hasDockerfile ? 80 : Math.min(project.structureScore * 2, 60),
        testCoverage: mergedFullAnalysis.codeQuality?.testFilesCount ? Math.min(mergedFullAnalysis.codeQuality.testFilesCount * 15, 80) : 0,
        maintainability: project.structureScore,
        complexity: mergedFullAnalysis.folderStructure?.maxDepth ? Math.min(mergedFullAnalysis.folderStructure.maxDepth * 10, 100) : 30,
        activityScore: project.overallScore,
      },
    };
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
    defaultBranch?: string,
    projectType?: string,
    githubToken?: string,
    basePath?: string
  ) {
    await rabbitmqPublisher.publishAnalyzeRequest({
      projectId,
      userId,
      repoUrl,
      repoName,
      defaultBranch: defaultBranch || 'main',
      projectType,
      githubToken,
      basePath,
    });
  }
}

function buildStructuredFullAnalysis(analysis: any) {
  if (!analysis) return {};

  const base = {
    metadata: {
      analyzerVersion: analysis.analyzerVersion,
      processingTime: analysis.processingTime,
      analyzedAt: analysis.analyzedAt,
    },
    folderStructure: {
      hasSrcFolder: analysis.hasSrcFolder,
      hasComponents: analysis.hasComponents,
      hasUtils: analysis.hasUtils,
      hasTests: analysis.hasTests,
      hasTypes: analysis.hasTypes,
      hasConfig: analysis.hasConfig,
      hasDocs: analysis.hasDocs,
      hasApi: analysis.hasApi,
      hasServices: analysis.hasServices,
      hasModels: analysis.hasModels,
      hasMiddleware: analysis.hasMiddleware,
      hasControllers: analysis.hasControllers,
      organizationScore: analysis.organizationScore,
      maxDepth: analysis.maxDepth,
      topLevelFolders: analysis.topLevelFolders,
    },
    codeQuality: {
      hasReadme: analysis.hasReadme,
      hasLicense: analysis.hasLicense,
      hasGitignore: analysis.hasGitignore,
      hasEnvExample: analysis.hasEnvExample,
      hasDockerfile: analysis.hasDockerfile,
      hasDockerCompose: analysis.hasDockerCompose,
      hasCI: analysis.hasCI,
      ciPlatform: analysis.ciPlatform,
      hasLinting: analysis.hasLinting,
      hasPrettier: analysis.hasPrettier,
      hasTypeScript: analysis.hasTypeScript,
      hasMakefile: analysis.hasMakefile,
      testFilesCount: analysis.testFilesCount,
      commentDensity: analysis.commentDensity,
    },
    metrics: {
      totalLines: analysis.totalLines,
      totalFiles: analysis.totalFiles,
      primaryLanguage: analysis.primaryLanguage,
    },
    techStack: {
      languages: analysis.languages || [],
      frameworks: analysis.frameworks || [],
      databases: analysis.databases || [],
      tools: analysis.tools || [],
      infrastructure: analysis.infrastructure || [],
    },
    infraSignals: {
      signals: (analysis.infraSignals || []).map((s: any) => s.signal),
      signalDetails: (analysis.infraSignals || []).reduce((acc: any, s: any) => {
        acc[s.signal] = { signal: s.signal, confidence: s.confidence, evidence: s.evidence };
        return acc;
      }, {}),
    },
    architecture: {
      type: analysis.architectureType,
      serviceCount: analysis.serviceCount,
      hasAPIGateway: analysis.hasAPIGateway,
      hasMessageQueue: analysis.hasMessageQueue,
      hasSharedLibraries: analysis.hasSharedLibraries,
      engineeringLevel: analysis.engineeringLevel,
    },
    bestPractices: {
      followed: analysis.bestPracticesFollowed || [],
      missing: analysis.bestPracticesMissing || [],
      score: analysis.bestPracticesScore || 0,
    },
    scores: {
      structure: analysis.structureScore || 0,
      codeQuality: analysis.codeQualityScore || 0,
      testing: analysis.testingScore || 0,
      documentation: analysis.documentationScore || 0,
      techStack: analysis.techStackScore || 0,
      complexity: analysis.complexityScore || 0,
      industryBonus: analysis.industryBonus || 0,
      projectTypeBonus: analysis.projectTypeBonus || 0,
    },
    // ========== DIMENSIONAL ANALYSIS ==========
    dimensionalAnalysis: {
      fundamentalsScore: analysis.fundamentalsScore,
      fundamentalsConfidence: analysis.fundamentalsConfidence,
      engineeringDepthScore: analysis.engineeringDepthScore,
      engineeringDepthConfidence: analysis.engineeringDepthConfidence,
      productionReadinessScore: analysis.productionReadinessScore,
      productionReadinessConfidence: analysis.productionReadinessConfidence,
      testingMaturityScore: analysis.testingMaturityScore,
      testingMaturityConfidence: analysis.testingMaturityConfidence,
      architectureScore: analysis.architectureScore,
      architectureConfidence: analysis.architectureConfidence,
      infraDevOpsScore: analysis.infraDevOpsScore,
      infraDevOpsConfidence: analysis.infraDevOpsConfidence,
    },
    experienceAnalysis: {
      level: analysis.experienceLevel,
      yearRange: analysis.experienceYearRange,
      confidence: analysis.experienceConfidence,
    },
    verdict: {
      summary: analysis.verdictSummary,
      strengths: analysis.verdictStrengths || [],
      growthAreas: analysis.verdictGrowthAreas || [],
      justification: analysis.verdictJustification,
    },
    trustAnalysis: {
      level: analysis.trustLevel,
      score: analysis.trustScore,
      effortClass: analysis.effortClass,
      authenticityScore: analysis.authenticityScore,
      authenticityFlags: analysis.authenticityFlags || [],
      hasOriginalWork: analysis.hasOriginalWork,
    },
    verifiedSkills: (analysis.verifiedSkills || []).map((skill: any) => ({
      name: skill.name,
      category: skill.category,
      confidence: skill.confidence,
      auraPoints: skill.auraPoints,
      resumeReady: skill.resumeReady,
      usageVerified: skill.usageVerified,
      usageStrength: skill.usageStrength,
      evidence: skill.evidence,
      linesOfCode: skill.linesOfCode,
    })),
    optimizations: (analysis.optimizationSuggestions || []).map((opt: any) => ({
      category: opt.category,
      priority: opt.priority,
      title: opt.title,
      description: opt.description,
      impact: opt.impact,
    })),
    reactAnalysis: analysis.reactAnalysis
      ? {
          usesHooks: analysis.reactAnalysis.usesHooks,
          usesContext: analysis.reactAnalysis.usesContext,
          usesReducer: analysis.reactAnalysis.usesReducer,
          usesMemo: analysis.reactAnalysis.usesMemo,
          usesCallback: analysis.reactAnalysis.usesCallback,
          usesRef: analysis.reactAnalysis.usesRef,
          usesLazyLoading: analysis.reactAnalysis.usesLazyLoading,
          usesErrorBoundary: analysis.reactAnalysis.usesErrorBoundary,
          componentCount: analysis.reactAnalysis.componentCount,
          customHooksCount: analysis.reactAnalysis.customHooksCount,
          stateManagement: analysis.reactAnalysis.stateManagement,
          patternsDetected: analysis.reactAnalysis.patternsDetected,
          advancedUsage: analysis.reactAnalysis.advancedUsage,
          suggestions: analysis.reactAnalysis.suggestions,
        }
      : null,
  };

  return base;
}

function mergeFullAnalysis(structured: any, legacy: any) {
  if (!legacy) return structured;

  const merged: any = { ...legacy };

  merged.metadata = { ...(legacy.metadata || {}), ...(structured.metadata || {}) };
  merged.folderStructure = { ...(legacy.folderStructure || {}), ...(structured.folderStructure || {}) };
  merged.codeQuality = { ...(legacy.codeQuality || {}), ...(structured.codeQuality || {}) };
  merged.metrics = { ...(legacy.metrics || {}), ...(structured.metrics || {}) };

  const structuredTech = structured.techStack || {};
  const legacyTech = legacy.techStack || {};
  merged.techStack = {
    ...legacyTech,
    ...structuredTech,
    languages: legacyTech.languages || structuredTech.languages || [],
    frameworks: legacyTech.frameworks || structuredTech.frameworks || [],
    databases: legacyTech.databases || structuredTech.databases || [],
    tools: legacyTech.tools || structuredTech.tools || [],
    infrastructure: legacyTech.infrastructure || structuredTech.infrastructure || [],
  };

  merged.architecture = { ...(legacy.architecture || {}), ...(structured.architecture || {}) };
  merged.bestPractices = { ...(legacy.bestPractices || {}), ...(structured.bestPractices || {}) };
  merged.scores = { ...(legacy.scores || {}), ...(structured.scores || {}) };

  if (structured.verifiedSkills?.length) {
    merged.verifiedSkills = structured.verifiedSkills;
  } else {
    merged.verifiedSkills = legacy.verifiedSkills || [];
  }

  if (structured.optimizations?.length) {
    merged.optimizations = structured.optimizations;
  } else {
    merged.optimizations = legacy.optimizations || [];
  }

  merged.reactAnalysis = structured.reactAnalysis || legacy.reactAnalysis || null;

  return merged;
}

async function buildLanguageBreakdown(
  techStackLanguages: any,
  projectAnalysis: any,
  legacyFullAnalysis: any,
  repoUrl: string,
  githubToken?: string,
  basePath?: string
) {
  const normalize = (lang: any) => {
    if (!lang) return null;
    if (typeof lang === 'string') {
      return { name: lang, percentage: null as number | null };
    }
    if (typeof lang.name === 'string') {
      return {
        name: lang.name,
        percentage: typeof lang.percentage === 'number' ? lang.percentage : null,
      };
    }
    return null;
  };

  let languages: Array<{ name: string; percentage: number | null }> = [];
  let languageMap: Record<string, number> = {};

  // Prefer live GitHub language stats when available (ONLY if no subfolder analysis)
  if (repoUrl && !basePath) {
    const repoLanguages = await GitHubService.getRepoLanguages(repoUrl, githubToken);
    const totalBytes = Object.values(repoLanguages).reduce((acc, value) => acc + value, 0);

    if (totalBytes > 0) {
      languages = Object.entries(repoLanguages).map(([name, bytes]) => ({
        name,
        percentage: Number(((bytes / totalBytes) * 100).toFixed(2)),
      }));
      languageMap = Object.fromEntries(
        Object.entries(repoLanguages).map(([name, bytes]) => [name, Number(bytes)])
      );
    }
  }

  if (!languages.length) {
    const fromTechStack = Array.isArray(techStackLanguages)
      ? techStackLanguages.map(normalize).filter(Boolean)
      : [];

    const fromLegacy = Array.isArray(legacyFullAnalysis?.techStack?.languages)
      ? legacyFullAnalysis.techStack.languages.map(normalize).filter(Boolean)
      : [];

    languages = fromTechStack.length ? (fromTechStack as any) : (fromLegacy as any);

    if (!languages.length && Array.isArray(projectAnalysis?.languages) && projectAnalysis.languages.length) {
      languages = projectAnalysis.languages.map((lang: string) => normalize(lang)).filter(Boolean) as any[];
    }

    if (!languages.length && typeof projectAnalysis?.primaryLanguage === 'string' && projectAnalysis.primaryLanguage) {
      languages = [{ name: projectAnalysis.primaryLanguage, percentage: 100 }];
    }

    if (languages.length) {
      const providedTotal = languages.reduce((acc, lang) => acc + (lang?.percentage ?? 0), 0);
      if (providedTotal <= 0) {
        const equalShare = Number((100 / languages.length).toFixed(2));
        languages = languages.map(lang => ({ ...lang, percentage: equalShare }));
      } else {
        languages = languages.map(lang => ({
          ...lang,
          percentage:
            lang.percentage !== null && lang.percentage !== undefined
              ? Number(lang.percentage.toFixed(2))
              : Number(((1 / languages.length) * 100).toFixed(2)),
        }));
      }
    }
  }

  if (languages.length && Object.keys(languageMap).length === 0) {
    const totalPercentage = languages.reduce((acc, lang) => acc + (lang.percentage ?? 0), 0);
    const normalizedTotal = totalPercentage > 0 ? totalPercentage : languages.length;
    const fallbackTotalBytes = 100000;

    languages = languages.map(lang => {
      const percentage = lang.percentage ?? Number((100 / languages.length).toFixed(2));
      languageMap[lang.name] = Math.max(
        1,
        Math.round((percentage / normalizedTotal) * fallbackTotalBytes)
      );
      return { ...lang, percentage };
    });
  }

  return { languages, languageMap };
}

function mergeIndustryAnalysis(legacy: any, computed: any) {
  if (!legacy) return computed;

  const merged: any = {
    ...computed,
    ...legacy,
  };

  merged.verifiedSkills = (legacy.verifiedSkills && legacy.verifiedSkills.length > 0)
    ? legacy.verifiedSkills
    : computed.verifiedSkills;

  merged.skillsByCategory = {
    ...computed.skillsByCategory,
    ...(legacy.skillsByCategory || {}),
  };

  merged.technologies = (legacy.technologies && legacy.technologies.length > 0)
    ? legacy.technologies
    : computed.technologies;

  merged.overallScore = legacy.overallScore ?? computed.overallScore;
  merged.engineeringLevel = legacy.engineeringLevel || computed.engineeringLevel;
  merged.infraSignals = legacy.infraSignals || computed.infraSignals;

  const verifiedSkills = merged.verifiedSkills || [];
  merged.totalSkills = verifiedSkills.length;
  merged.highConfidenceSkills = legacy.highConfidenceSkills ?? verifiedSkills.filter((s: any) => (s.confidence || 0) >= 0.8).length;
  merged.resumeReadySkills = legacy.resumeReadySkills ?? verifiedSkills.filter((s: any) => s.resumeReady).length;

  return merged;
}

// Helper function to get skill level based on score
function getSkillLevel(score: number): string {
  if (score >= 90) return 'expert';
  if (score >= 70) return 'advanced';
  if (score >= 50) return 'intermediate';
  return 'basic';
}

// Helper function to group skills by category
function groupSkillsByCategory(skills: any[]): Record<string, any[]> {
  return skills.reduce((acc, skill) => {
    const category = skill.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(skill);
    return acc;
  }, {} as Record<string, any[]>);
}

// Helper function to determine engineering level based on score
function getEngineeringLevel(score: number): string {
  if (score >= 80) return 'Senior Engineer';
  if (score >= 60) return 'Mid-Level Engineer';
  if (score >= 40) return 'Junior Engineer';
  return 'Beginner';
}

export default ProjectService;

