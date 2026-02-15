import prisma from '../prisma/client.js';
import { rabbitmqPublisher } from '../rabbitmq/publisher.js';
import { logger } from '../utils/logger.js';
import { GitHubService } from './github.service.js';
import { GitDetailsService } from './git-details.service.js';
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
        gitDetails: true,
        user: {
          select: {
            githubAccessToken: true,
          },
        },
      },
    });

    if (!project) return null;

    const { analysis, gitDetails, user: projectOwner, ...projectData } = project;

    // Fetch raw MongoDB doc to get Phase 2/3 fields not in Prisma schema
    let rawAnalysis: any = {};
    if (analysis) {
      try {
        const rawResult: any = await prisma.$runCommandRaw({
          find: 'project_analyses',
          filter: { project_id: { $oid: projectId } },
          limit: 1,
        });
        if (rawResult?.cursor?.firstBatch?.[0]) {
          rawAnalysis = rawResult.cursor.firstBatch[0];
        }
      } catch (err) {
        logger.warn({ err, projectId }, 'Failed to fetch raw analysis fields');
      }
    }

    // Merge raw fields into analysis for buildStructuredFullAnalysis
    const enrichedAnalysis = analysis ? { ...analysis, ...rawAnalysis } : null;

    const structuredFullAnalysis = enrichedAnalysis ? buildStructuredFullAnalysis(enrichedAnalysis) : {};
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
          richEvidence: (s as any).richEvidence || (s as any).rich_evidence || null,
          resumeReady: s.resumeReady,
          projectCount: 1,
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

    // Merge bayesian confidence data INTO each skill (dedup: removes need for separate skillConfidences array)
    const bayesianSkills = rawAnalysis.bayesian_skill_confidences || [];
    const bayesianMap = new Map<string, any>();
    for (const bs of bayesianSkills) {
      if (bs.name || bs.skill) bayesianMap.set((bs.name || bs.skill).toLowerCase(), bs);
    }

    const enrichedSkills = skillsBreakdown.map((skill: any) => {
      const bayesian = bayesianMap.get(skill.name.toLowerCase());
      if (bayesian) {
        return {
          ...skill,
          bayesian: {
            prior: bayesian.prior ?? bayesian.priorConfidence,
            posterior: bayesian.posterior ?? bayesian.posteriorConfidence,
            graphBoost: bayesian.graphBoost ?? bayesian.graph_boost ?? 0,
            evidenceCount: bayesian.evidenceCount ?? bayesian.evidence_count ?? 0,
          },
        };
      }
      return skill;
    });

    // Calculate industry analysis summary
    // NOTE: skillsByCategory removed — frontend computes it from verifiedSkills
    const computedIndustryAnalysis = {
      verifiedSkills: enrichedSkills,
      totalSkills: enrichedSkills.length,
      highConfidenceSkills: enrichedSkills.filter((s: any) => s.score >= 70).length,
      resumeReadySkills: enrichedSkills.filter((s: any) => s.resumeReady).length,
      overallScore: project.overallScore || project.auraContribution || 0,
      engineeringLevel: getEngineeringLevel(project.overallScore),
      technologies: techBreakdown,
    };

    const mergedIndustryAnalysis = mergeIndustryAnalysis(null, computedIndustryAnalysis);
    // NOTE: removed mergedFullAnalysis.industryAnalysis = ... (was duplicate of top-level industryAnalysis)

    return stripNulls({
      ...projectData,
      analysisId: analysis?.id ?? null,
      // Add computed fields for frontend
      repoUrl: project.githubRepoUrl,
      analysisStatus: project.analysisStatus.toLowerCase(),
      // Include detailed analysis
      fullAnalysis: mergedFullAnalysis,
      industryAnalysis: mergedIndustryAnalysis,
      intelligenceVerdict: analysis ? {
        title: analysis.aiVerdictTitle || "Analysis Pending",
        summary: analysis.aiVerdictSummary || "AI analysis is currently processing...",
        strengths: analysis.aiVerdictStrengths || [],
        weaknesses: analysis.aiVerdictWeaknesses || [],
        hireRecommendation: (analysis.aiHireRecommendation as any) || 'NO',
        riskScore: analysis.aiRiskScore || 0,
        riskAnalysis: analysis.aiRiskAnalysis || "No risk analysis available.",
        skillsNarrative: analysis.aiSkillsNarrative || "",
        interviewQuestions: analysis.aiInterviewQuestions || [],
      } : undefined,
      // Enhanced AI Project Insight (from raw MongoDB — new dual-purpose format)
      aiInsight: rawAnalysis.ai_insight_title ? {
        projectTitle: rawAnalysis.ai_insight_title,
        projectSummary: rawAnalysis.ai_insight_summary || '',
        whatYouBuilt: rawAnalysis.ai_insight_what_you_built || '',
        techHighlights: rawAnalysis.ai_insight_tech_highlights || [],
        impressivePatterns: rawAnalysis.ai_insight_impressive_patterns || [],
        growthAreas: rawAnalysis.ai_insight_growth_areas || [],
        learningPath: rawAnalysis.ai_insight_learning_path || [],
        projectMaturity: rawAnalysis.ai_insight_project_maturity || '',
        recruiterVerdict: {
          headline: rawAnalysis.ai_recruiter_headline || '',
          recommendation: rawAnalysis.ai_recruiter_recommendation || 'LEAN_HIRE',
          confidenceLevel: rawAnalysis.ai_recruiter_confidence || '',
          oneLineSummary: rawAnalysis.ai_recruiter_summary || '',
          topStrengths: rawAnalysis.ai_recruiter_strengths || [],
          topConcerns: rawAnalysis.ai_recruiter_concerns || [],
          estimatedLevel: rawAnalysis.ai_recruiter_level || '',
          interviewFocus: rawAnalysis.ai_recruiter_interview_focus || [],
        },
      } : undefined,
      // GitHub-sourced git details
      gitDetails: gitDetails || null,
      // Complexity from structured analysis (frontend reads project.complexity)
      complexity: mergedFullAnalysis.complexity || undefined,
      languages: languageSummary.languageMap,
      metrics: {
        codeQuality: project.codeQualityScore,
        documentation: mergedFullAnalysis.codeQuality?.hasDockerfile ? 80 : Math.min(project.structureScore * 2, 60),
        testCoverage: mergedFullAnalysis.codeQuality?.testFilesCount ? Math.min(mergedFullAnalysis.codeQuality.testFilesCount * 15, 80) : 0,
        maintainability: project.structureScore,
        complexity: mergedFullAnalysis.folderStructure?.maxDepth ? Math.min(mergedFullAnalysis.folderStructure.maxDepth * 10, 100) : 30,
        activityScore: project.overallScore,
      },
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

    // Fire-and-forget: fetch git details from GitHub in parallel
    GitDetailsService.refresh(projectId).catch((err) =>
      logger.warn({ err, projectId }, 'Git details fetch failed (non-blocking)'),
    );
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
      // NOTE: signalDetails removed — was redundant ({signal, 0.8, []}) for every entry
    },
    architecture: {
      type: analysis.architectureType || analysis.architecture_type,
      serviceCount: analysis.serviceCount || analysis.service_count,
      hasAPIGateway: analysis.hasAPIGateway ?? analysis.has_gateway,
      hasMessageQueue: analysis.hasMessageQueue,
      hasSharedLibraries: analysis.hasSharedLibraries,
      engineeringLevel: analysis.engineeringLevel || analysis.engineering_level,
      communication: analysis.architecture_communication || [],
      patterns: analysis.architecture_patterns || [],
      services: analysis.architecture_service_names || [],
      gateway: analysis.architecture_gateway || null,
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
      summary: analysis.verdictSummary || analysis.dimensional_verdict_summary || null,
      strengths: analysis.verdictStrengths || analysis.dimensional_strengths || [],
      growthAreas: analysis.verdictGrowthAreas || analysis.dimensional_growth_areas || [],
      justification: analysis.verdictJustification || analysis.verdict_senior_verdict || null,
      developerLevel: analysis.verdict_developer_level || null,
      hireSignal: null, // removed — no longer generated by Go engine
      keySignals: analysis.verdict_key_signals || [],
      riskSignals: analysis.verdict_risk_signals || [],
      strengthSignals: analysis.verdict_strength_signals || [],
      projectIntent: analysis.verdict_project_intent || null,
      overallScore: analysis.verdict_overall_score || null,
      techStack: analysis.verdict_tech_stack || [],
      modulesExecuted: analysis.verdict_modules_executed || [],
      modulesSkipped: analysis.verdict_modules_skipped || [],
    },
    trustAnalysis: {
      level: analysis.trustLevel,
      score: analysis.trustScore,
      effortClass: analysis.effortClass,
      authenticityScore: analysis.authenticityScore,
      authenticityFlags: analysis.authenticityFlags || [],
      hasOriginalWork: analysis.hasOriginalWork,
    },
    // verifiedSkills REMOVED from fullAnalysis — now lives only in industryAnalysis (dedup)
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
    // ========== COMPLEXITY ==========
    complexity: (analysis.complexity_total_score != null) ? {
      totalScore: analysis.complexity_total_score || 0,
      architectureScore: analysis.complexity_architecture_score || 0,
      infrastructureScore: analysis.complexity_infrastructure_score || 0,
      codeQualityScore: analysis.complexity_code_quality_score || 0,
      scaleLabel: analysis.complexity_scale_label || 'Unknown',
    } : undefined,
    // ========== GIT SIGNALS ==========
    // gitSignals removed — git data now comes from ProjectGitDetails (GitHub API)
    // ========== PHASE 2: TECH DEPENDENCY GRAPH ==========
    techDependencyGraph: analysis.graph_total_nodes ? {
      totalNodes: analysis.graph_total_nodes || 0,
      totalEdges: analysis.graph_total_edges || 0,
      graphDensity: analysis.graph_density || 0,
      detectedStacks: analysis.graph_detected_stacks || [],
      inferredSkills: analysis.graph_inferred_skills || [],
      clusters: cleanGraphClusters(analysis.graph_clusters || []),
    } : undefined,
    // ========== PHASE 3: BAYESIAN CONFIDENCE REPORT ==========
    confidenceReport: analysis.confidence_analysis_confidence ? {
      analysisConfidence: analysis.confidence_analysis_confidence || 0,
      qualityMetrics: {
        organizationScore: analysis.quality_organization_score || 0,
        modularityScore: analysis.quality_modularity_score || 0,
        testCoverageProxy: analysis.quality_test_coverage_proxy || 0,
        testMaturity: analysis.quality_test_maturity || 'none',
        documentationScore: analysis.quality_documentation_score || 0,
        complexityScore: analysis.quality_complexity_score || 0,
        complexityLevel: analysis.quality_complexity_level || 'unknown',
        productionReadiness: analysis.quality_production_readiness || 0,
        overallQuality: analysis.quality_overall || 0,
        qualityTier: analysis.quality_tier || 'low',
      },
      evolutionSignals: {
        authorshipLevel: analysis.evolution_authorship_level || 'UNKNOWN',
        authorshipFactor: analysis.evolution_authorship_factor || 0,
        developmentPattern: analysis.evolution_development_pattern || 'unknown',
        iterationCount: analysis.evolution_iteration_count || 0,
        refactorRatio: analysis.evolution_refactor_ratio || 0,
        projectAge: analysis.evolution_project_age || 'unknown',
        maturityFactor: analysis.evolution_maturity_factor || 0,
        commitConsistency: analysis.evolution_commit_consistency || 0,
      },
      ensembleVerdict: {
        astScore: analysis.ensemble_ast_score || 0,
        graphScore: analysis.ensemble_graph_score || 0,
        infraScore: analysis.ensemble_infra_score || 0,
        intelligenceScore: analysis.ensemble_intelligence_score || 0,
        qualityScore: analysis.ensemble_quality_score || 0,
        gitScore: analysis.ensemble_git_score || 0,
        finalScore: analysis.ensemble_final_score || 0,
        confidence: analysis.ensemble_confidence || 0,
        scoreLabel: analysis.ensemble_score_label || 'Novice',
        totalSkills: analysis.ensemble_total_skills || 0,
        highConfSkills: analysis.ensemble_high_conf_skills || 0,
        resumeReadySkills: analysis.ensemble_resume_ready_skills || 0,
        topFactors: analysis.ensemble_top_factors || [],
        riskFactors: analysis.ensemble_risk_factors || [],
      },
      // skillConfidences REMOVED — merged into industryAnalysis.verifiedSkills as .bayesian (dedup)
    } : undefined,
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

  // verifiedSkills removed from fullAnalysis — now only in industryAnalysis

  if (structured.optimizations?.length) {
    merged.optimizations = structured.optimizations;
  } else {
    merged.optimizations = legacy.optimizations || [];
  }

  merged.reactAnalysis = structured.reactAnalysis || legacy.reactAnalysis || null;

  // Pass through new sections
  merged.complexity = structured.complexity || legacy.complexity || undefined;
  // gitSignals removed — now comes from ProjectGitDetails (GitHub API)
  merged.dimensionalAnalysis = { ...(legacy.dimensionalAnalysis || {}), ...(structured.dimensionalAnalysis || {}) };
  merged.experienceAnalysis = { ...(legacy.experienceAnalysis || {}), ...(structured.experienceAnalysis || {}) };
  merged.verdict = { ...(legacy.verdict || {}), ...(structured.verdict || {}) };
  merged.trustAnalysis = { ...(legacy.trustAnalysis || {}), ...(structured.trustAnalysis || {}) };
  merged.confidenceReport = structured.confidenceReport || legacy.confidenceReport || undefined;
  merged.techDependencyGraph = structured.techDependencyGraph || legacy.techDependencyGraph || undefined;

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

  // skillsByCategory removed — frontend computes from verifiedSkills

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
// groupSkillsByCategory removed — frontend computes from verifiedSkills



// Helper function to determine engineering level based on score
function getEngineeringLevel(score: number): string {
  if (score >= 80) return 'Senior Engineer';
  if (score >= 60) return 'Mid-Level Engineer';
  if (score >= 40) return 'Junior Engineer';
  return 'Beginner';
}

/**
 * Clean graph clusters — filter out function-name noise.
 * Keeps only clusters with technology-level names (not individual function names).
 */
function cleanGraphClusters(clusters: any[]): any[] {
  if (!Array.isArray(clusters)) return [];
  return clusters.map((cluster: any) => {
    if (!cluster) return cluster;
    // Filter nodes: keep entries that look like tech names, not function names
    // Function names typically: contain dots (pkg.func), are camelCase with parens, or are very long
    if (Array.isArray(cluster.nodes)) {
      cluster.nodes = cluster.nodes.filter((node: string) => {
        if (!node || typeof node !== 'string') return false;
        // Skip if looks like a function call (contains dots like "pkg.FuncName" or parens)
        if (/^[a-z]+\.[A-Z]/.test(node)) return false;
        if (node.includes('(') || node.includes(')')) return false;
        // Skip very long names (likely function signatures)
        if (node.length > 50) return false;
        return true;
      });
    }
    // Only keep clusters that still have nodes after filtering
    return cluster.nodes?.length > 0 ? cluster : null;
  }).filter(Boolean);
}

/**
 * Recursively strip null, undefined, and empty values from an object.
 * Removes: null, undefined, empty strings, empty arrays, empty objects.
 */
function stripNulls(obj: any): any {
  if (obj === null || obj === undefined) return undefined;
  if (Array.isArray(obj)) {
    const filtered = obj.map(stripNulls).filter(v => v !== undefined);
    return filtered.length > 0 ? filtered : undefined;
  }
  if (typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const cleaned = stripNulls(value);
      if (cleaned !== undefined) {
        result[key] = cleaned;
      }
    }
    return Object.keys(result).length > 0 ? result : undefined;
  }
  // Keep numbers (including 0), booleans, non-empty strings
  if (typeof obj === 'string' && obj === '') return undefined;
  return obj;
}

export default ProjectService;

