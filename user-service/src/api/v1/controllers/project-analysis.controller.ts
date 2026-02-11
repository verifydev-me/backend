import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../../types/index.js';
import prisma from '../../../prisma/client.js';
import { logger } from '../../../utils/logger.js';

export class ProjectAnalysisController {
  /**
   * Get detailed project analysis
   * Returns structured data from database (no more JSON fields!)
   */
  static async getDetailedAnalysis(req: AuthenticatedRequest, res: Response) {
    try {
      const { projectId } = req.params;
      const userId = req.user!.userId;

      // Verify project ownership
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          userId,
        },
        include: {
          analysis: {
            include: {
              verifiedSkills: true,
              optimizationSuggestions: true,
              reactAnalysis: true,
            }
          }, 
        },
      });

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found',
        });
      }

      if (!project.analysis) {
        return res.status(404).json({
          success: false,
          message: 'Analysis not available yet',
          hint: 'Project analysis is still in progress or failed',
        });
      }

      logger.info({ projectId, userId }, 'Detailed analysis requested');

      // Fetch raw MongoDB doc to get Phase 2/3 fields not in Prisma schema
      let rawAnalysis: any = {};
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

      const analysis = { ...project.analysis, ...rawAnalysis };

      return res.json({
        success: true,
        data: {
          project: {
            id: project.id,
            repoName: project.repoName,
            overallScore: project.overallScore,
            analysisStatus: project.analysisStatus,
            analyzedAt: project.analyzedAt,
          },
          // Structured Analysis Data
          analysis: {
            // Metadata
            metadata: {
              analyzerVersion: analysis.analyzerVersion,
              processingTime: analysis.processingTime,
              analyzedAt: analysis.analyzedAt,
            },
            // Folder Structure
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
            // Code Quality Signals
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
            // Metrics
            metrics: {
              totalLines: analysis.totalLines,
              totalFiles: analysis.totalFiles,
              primaryLanguage: analysis.primaryLanguage,
            },
            // Tech Stack
            techStack: {
              languages: analysis.languages,
              frameworks: analysis.frameworks,
              databases: analysis.databases,
              tools: analysis.tools,
              infrastructure: analysis.infrastructure,
            },
            // Architecture
            architecture: {
              type: analysis.architectureType,
              serviceCount: analysis.serviceCount,
              hasAPIGateway: analysis.hasAPIGateway,
              hasMessageQueue: analysis.hasMessageQueue,
              hasSharedLibraries: analysis.hasSharedLibraries,
              engineeringLevel: analysis.engineeringLevel,
            },
            // Best Practices
            bestPractices: {
              followed: analysis.bestPracticesFollowed,
              missing: analysis.bestPracticesMissing,
              score: analysis.bestPracticesScore,
            },
            // Scores
            scores: {
              structure: analysis.structureScore,
              codeQuality: analysis.codeQualityScore,
              testing: analysis.testingScore,
              documentation: analysis.documentationScore,
              techStack: analysis.techStackScore,
              complexity: analysis.complexityScore,
              industryBonus: analysis.industryBonus,
              projectTypeBonus: analysis.projectTypeBonus,
            },
            // Verified Skills
            verifiedSkills: analysis.verifiedSkills.map((skill: any) => ({
              name: skill.name,
              category: skill.category,
              confidence: skill.confidence,
              auraPoints: skill.auraPoints,
              resumeReady: skill.resumeReady,
              evidence: skill.evidence,
              linesOfCode: skill.linesOfCode,
              usageVerified: (skill as any).usageVerified, // NEW: Cast as any to bypass temporary TS type check if needed, or if interface isn't updated
              usageStrength: (skill as any).usageStrength, // NEW
            })),
            // Optimization Suggestions
            optimizations: analysis.optimizationSuggestions.map((opt: any) => ({
              category: opt.category,
              priority: opt.priority,
              title: opt.title,
              description: opt.description,
              impact: opt.impact,
            })),
            // React Analysis (if available)
            reactAnalysis: analysis.reactAnalysis ? {
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
            } : null,
            // ========== PHASE 2: TECH DEPENDENCY GRAPH ==========
            techDependencyGraph: analysis.graph_total_nodes ? {
              totalNodes: analysis.graph_total_nodes || 0,
              totalEdges: analysis.graph_total_edges || 0,
              graphDensity: analysis.graph_density || 0,
              detectedStacks: analysis.graph_detected_stacks || [],
              inferredSkills: analysis.graph_inferred_skills || [],
              clusters: analysis.graph_clusters || [],
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
              skillConfidences: analysis.bayesian_skill_confidences || [],
            } : undefined,
          },
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get detailed analysis');
      return res.status(500).json({
        success: false,
        message: 'Failed to get analysis',
      });
    }
  }

  /**
   * Get summary of all analyses for user (for debugging/admin)
   */
  static async getSummary(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.userId;

      const projects = await prisma.project.findMany({
        where: { userId },
        include: {
          analysis: {
            select: {
              analyzerVersion: true,
              analyzedAt: true,
              primaryLanguage: true,
              architectureType: true,
              engineeringLevel: true,
              structureScore: true,
              codeQualityScore: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.json({
        success: true,
        data: {
          total: projects.length,
          analyzed: projects.filter(p => p.analysisStatus === 'COMPLETED').length,
          projects: projects.map(p => ({
            id: p.id,
            name: p.repoName,
            status: p.analysisStatus,
            overallScore: p.overallScore,
            analysis: p.analysis ? {
              language: p.analysis.primaryLanguage,
              architecture: p.analysis.architectureType,
              level: p.analysis.engineeringLevel,
              scores: {
                structure: p.analysis.structureScore,
                codeQuality: p.analysis.codeQualityScore,
              },
              analyzedAt: p.analysis.analyzedAt,
            } : null,
          })),
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get analysis summary');
      return res.status(500).json({
        success: false,
        message: 'Failed to get summary',
      });
    }
  }

  /**
   * Get dimensional analysis for a project
   * Returns the 6-dimensional evaluation with verdicts and trust scores
   */
  static async getDimensionalAnalysis(req: AuthenticatedRequest, res: Response) {
    try {
      const { projectId } = req.params;
      const userId = req.user!.userId;

      // Verify project ownership
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          userId,
        },
        include: {
          analysis: {
            include: {
              dimensionSignals: true,
              verifiedSkills: true,
            }
          },
        },
      });

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found',
        });
      }

      if (!project.analysis) {
        return res.status(404).json({
          success: false,
          message: 'Analysis not available yet',
        });
      }

      const analysis = project.analysis;

      // Check if dimensional analysis exists (using actual schema field names)
      if (!analysis.fundamentalsScore && analysis.fundamentalsScore !== 0) {
        return res.status(404).json({
          success: false,
          message: 'Dimensional analysis not available',
          hint: 'This project was analyzed with an older version. Re-analyze to get dimensional data.',
        });
      }

      logger.info({ projectId, userId }, 'Dimensional analysis requested');

      // Build dimension matrix from stored data (using actual schema field names)
      const dimensionMatrix = {
        fundamentals: {
          score: analysis.fundamentalsScore ?? 0,
          confidence: analysis.fundamentalsConfidence ?? 0.5,
          signals: analysis.dimensionSignals
            .filter(s => s.dimension === 'FUNDAMENTALS')
            .map(s => s.signal),
        },
        engineeringDepth: {
          score: analysis.engineeringDepthScore ?? 0,
          confidence: analysis.engineeringDepthConfidence ?? 0.5,
          signals: analysis.dimensionSignals
            .filter(s => s.dimension === 'ENGINEERING_DEPTH')
            .map(s => s.signal),
        },
        productionReadiness: {
          score: analysis.productionReadinessScore ?? 0,
          confidence: analysis.productionReadinessConfidence ?? 0.5,
          signals: analysis.dimensionSignals
            .filter(s => s.dimension === 'PRODUCTION_READINESS')
            .map(s => s.signal),
        },
        testingMaturity: {
          score: analysis.testingMaturityScore ?? 0,
          confidence: analysis.testingMaturityConfidence ?? 0.5,
          signals: analysis.dimensionSignals
            .filter(s => s.dimension === 'TESTING_MATURITY')
            .map(s => s.signal),
        },
        architecture: {
          score: analysis.architectureScore ?? 0,
          confidence: analysis.architectureConfidence ?? 0.5,
          signals: analysis.dimensionSignals
            .filter(s => s.dimension === 'ARCHITECTURE')
            .map(s => s.signal),
        },
        infraDevOps: {
          score: analysis.infraDevOpsScore ?? 0,
          confidence: analysis.infraDevOpsConfidence ?? 0.5,
          signals: analysis.dimensionSignals
            .filter(s => s.dimension === 'INFRA_DEVOPS')
            .map(s => s.signal),
        },
      };

      // Build verdict from stored data
      const verdict = {
        summary: analysis.verdictSummary ?? '',
        experience: {
          level: analysis.experienceLevel ?? 'JUNIOR',
          yearRange: analysis.experienceYearRange ?? '0-1 years',
          confidence: analysis.experienceConfidence ?? 0.5,
        },
        strengths: analysis.verdictStrengths ?? [],
        growthAreas: analysis.verdictGrowthAreas ?? [],
        justification: analysis.verdictJustification ?? '',
      };

      // Build trust analysis from stored data
      const trustAnalysis = {
        level: analysis.trustLevel ?? 'MEDIUM',
        score: analysis.trustScore ?? 50,
        effort: {
          class: analysis.effortClass ?? 'MODERATE',
          estimatedHours: 0, // Not stored in current schema
          averageCommitSize: 0, // Not stored in current schema
          commitFrequency: 0, // Not stored in current schema
        },
        authenticity: {
          score: analysis.authenticityScore ?? 50,
          flags: analysis.authenticityFlags ?? [],
          hasOriginalWork: analysis.hasOriginalWork ?? false,
        },
      };

      // Calculate quick stats
      const quickStats = {
        overallScore: project.overallScore ?? 0,
        topDimension: getTopDimension(dimensionMatrix),
        experienceLevel: analysis.experienceLevel ?? 'JUNIOR',
        trustLevel: analysis.trustLevel ?? 'MEDIUM',
        skillCount: analysis.verifiedSkills.length,
      };

      return res.json({
        success: true,
        data: {
          projectId: project.id,
          projectName: project.repoName,
          analyzedAt: analysis.analyzedAt,
          dimensionMatrix,
          verdict,
          trustAnalysis,
          quickStats,
          // Include verified skills for context
          topSkills: analysis.verifiedSkills
            .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
            .slice(0, 5)
            .map(s => ({
              name: s.name,
              category: s.category,
              confidence: s.confidence,
              auraPoints: s.auraPoints,
            })),
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get dimensional analysis');
      return res.status(500).json({
        success: false,
        message: 'Failed to get dimensional analysis',
      });
    }
  }

  /**
   * Get aggregated dimensional profile for user (across all projects)
   */
  static async getUserDimensionalProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.userId;

      const projects = await prisma.project.findMany({
        where: {
          userId,
          analysisStatus: 'COMPLETED',
        },
        include: {
          analysis: {
            select: {
              fundamentalsScore: true,
              fundamentalsConfidence: true,
              engineeringDepthScore: true,
              engineeringDepthConfidence: true,
              productionReadinessScore: true,
              productionReadinessConfidence: true,
              testingMaturityScore: true,
              testingMaturityConfidence: true,
              architectureScore: true,
              architectureConfidence: true,
              infraDevOpsScore: true,
              infraDevOpsConfidence: true,
              experienceLevel: true,
              trustLevel: true,
              trustScore: true,
            },
          },
        },
      });

      // Filter projects with dimensional analysis
      const analyzedProjects = projects.filter(p => p.analysis?.fundamentalsScore != null && p.analysis.fundamentalsScore > 0);

      if (analyzedProjects.length === 0) {
        return res.json({
          success: true,
          data: {
            hasProfile: false,
            message: 'No projects with dimensional analysis found',
          },
        });
      }

      // Aggregate dimensions with confidence weighting
      const aggregated = {
        fundamentals: weightedAverage(analyzedProjects, 'fundamentalsScore', 'fundamentalsConfidence'),
        engineeringDepth: weightedAverage(analyzedProjects, 'engineeringDepthScore', 'engineeringDepthConfidence'),
        productionReadiness: weightedAverage(analyzedProjects, 'productionReadinessScore', 'productionReadinessConfidence'),
        testingMaturity: weightedAverage(analyzedProjects, 'testingMaturityScore', 'testingMaturityConfidence'),
        architecture: weightedAverage(analyzedProjects, 'architectureScore', 'architectureConfidence'),
        infraDevOps: weightedAverage(analyzedProjects, 'infraDevOpsScore', 'infraDevOpsConfidence'),
      };

      // Determine overall experience level (majority voting)
      const experienceLevels = analyzedProjects
        .map(p => p.analysis?.experienceLevel)
        .filter(Boolean);
      const overallExperience = mostCommon(experienceLevels as string[]) ?? 'JUNIOR';

      // Calculate overall trust
      const trustScores = analyzedProjects
        .map(p => p.analysis?.trustScore)
        .filter((s): s is number => s != null);
      const averageTrust = trustScores.length > 0
        ? trustScores.reduce((a, b) => a + b, 0) / trustScores.length
        : 50;

      return res.json({
        success: true,
        data: {
          hasProfile: true,
          projectCount: analyzedProjects.length,
          aggregatedDimensions: aggregated,
          overallExperienceLevel: overallExperience,
          averageTrustScore: Math.round(averageTrust),
          strongestDimension: getStrongestDimension(aggregated),
          growthDimension: getWeakestDimension(aggregated),
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get user dimensional profile');
      return res.status(500).json({
        success: false,
        message: 'Failed to get dimensional profile',
      });
    }
  }
}

// Helper functions
function getTopDimension(matrix: Record<string, { score: number; confidence: number }>): string {
  let maxScore = 0;
  let topDim = 'fundamentals';
  for (const [dim, data] of Object.entries(matrix)) {
    if (data.score > maxScore) {
      maxScore = data.score;
      topDim = dim;
    }
  }
  return topDim;
}

function getStrongestDimension(agg: Record<string, number>): string {
  let max = 0;
  let strongest = '';
  for (const [dim, score] of Object.entries(agg)) {
    if (score > max) {
      max = score;
      strongest = dim;
    }
  }
  return strongest;
}

function getWeakestDimension(agg: Record<string, number>): string {
  let min = 100;
  let weakest = '';
  for (const [dim, score] of Object.entries(agg)) {
    if (score < min) {
      min = score;
      weakest = dim;
    }
  }
  return weakest;
}

function weightedAverage(
  projects: Array<{ analysis: any }>,
  scoreField: string,
  confidenceField: string
): number {
  let totalWeight = 0;
  let weightedSum = 0;

  for (const p of projects) {
    const score = p.analysis?.[scoreField] ?? 0;
    const confidence = p.analysis?.[confidenceField] ?? 0.5;
    weightedSum += score * confidence;
    totalWeight += confidence;
  }

  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
}

function mostCommon(arr: string[]): string | undefined {
  const counts = new Map<string, number>();
  for (const item of arr) {
    counts.set(item, (counts.get(item) ?? 0) + 1);
  }
  let maxCount = 0;
  let result: string | undefined;
  for (const [item, count] of counts) {
    if (count > maxCount) {
      maxCount = count;
      result = item;
    }
  }
  return result;
}
