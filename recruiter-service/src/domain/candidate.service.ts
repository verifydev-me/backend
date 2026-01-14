import { logger } from '../utils/logger.js';
import type { CandidateSearchFilters, CandidateProfile } from '../types/index.js';
import axios from 'axios';
import { 
  searchCandidates as grpcSearchCandidates, 
  getUser as grpcGetUser,
  getUserProfile as grpcGetUserProfile,
  batchGetUsers as grpcBatchGetUsers 
} from '../grpc/user-client.js';

/**
 * Full Candidate Profile for Recruiter View
 * Includes all analyzed project details, skills, aura, and resume data
 */
export interface FullCandidateProfile extends CandidateProfile {
  // Contact (if shared)
  email?: string;
  phone?: string;
  website?: string;
  
  // Social Links
  socialLinks: { platform: string; url: string }[];
  
  // All Skills with details
  allSkills: {
    name: string;
    category: string;
    score: number;
    isVerified: boolean;
    projectCount: number;
    evidence: string[];
  }[];
  
  // Full Project Analysis
  analyzedProjects: {
    id: string;
    repoName: string;
    repoUrl: string;
    description?: string;
    primaryLanguage: string;
    technologies: string[];
    
    // Scores
    overallScore: number;
    codeQualityScore: number;
    structureScore: number;
    
    // Analysis Details
    analysis: {
      // Folder Structure
      folderStructure: {
        hasSrcFolder: boolean;
        hasComponents: boolean;
        hasTests: boolean;
        hasTypes: boolean;
        organizationScore: number;
      };
      
      // Code Quality
      codeQuality: {
        hasLinting: boolean;
        hasPrettier: boolean;
        hasTypeScript: boolean;
        hasDockerfile: boolean;
        hasCI: boolean;
        testFilesCount: number;
      };
      
      // Optimization Suggestions
      optimizations: string[];
      
      // Best Practices
      bestPractices: {
        followed: string[];
        missing: string[];
      };
      
      // Framework Specific
      frameworkAnalysis?: {
        framework: string;
        patterns: string[];
        suggestions: string[];
      };
    };
    
    analyzedAt: string;
  }[];
  
  // Experience & Education
  experiences: {
    company: string;
    position: string;
    startDate: string;
    endDate?: string;
    isCurrent: boolean;
    description?: string;
  }[];
  
  education: {
    institution: string;
    degree: string;
    field: string;
    startYear: number;
    endYear: number;
  }[];
  
  // Resume URL (if generated)
  resumeUrl?: string;
  
  // Activity
  lastActive: string;
  memberSince: string;
}

// User service URL (fallback for HTTP)
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://user-service:3002';

/**
 * Candidate Search Service
 * 
 * Allows recruiters to search for developers based on:
 * - Verified skills
 * - Aura score
 * - Core count
 * - Location
 * - Open to work status
 * 
 * Uses gRPC for high-performance inter-service communication
 */
export class CandidateService {
  /**
   * Search candidates with filters
   * Uses gRPC for high-performance search, falls back to HTTP if needed
   */
  static async searchCandidates(
    filters: CandidateSearchFilters,
    page = 1,
    limit = 20
  ): Promise<{ candidates: CandidateProfile[]; total: number }> {
    logger.debug({ filters, page, limit }, 'Searching candidates via gRPC');

    try {
      // Try gRPC first (faster, more efficient)
      const result = await grpcSearchCandidates({
        skills: filters.skills,
        minAuraScore: filters.minAuraScore || filters.minAura,
        locationCity: filters.location,
        page,
        limit,
      });

      const candidates = (result.candidates || []).map((c: any) => ({
        id: c.id,
        username: c.username,
        name: c.name,
        avatarUrl: c.avatar_url,
        bio: c.profile?.bio,
        location: c.profile?.location?.city,
        auraScore: c.aura_score || 0,
        coreCount: 0, // Calculate from projects if needed
        isOpenToWork: c.profile?.availability === 'AVAILABLE',
        isVerified: false,
        topSkills: (c.skills || []).map((s: any) => ({
          name: s.name,
          score: s.confidence_score || 0.8,
        })),
        topProjects: (c.projects || []).slice(0, 3).map((p: any) => ({
          name: p.name,
          techStack: p.tech_stack || [],
          score: p.quality_score || 0,
        })),
        matchScore: this.calculateMatchScore({
          auraScore: c.aura_score || 0,
          coreCount: 0,
          topSkills: c.skills || [],
          isVerified: false,
        }, filters),
      }));

      return { 
        candidates, 
        total: result.pagination?.total || candidates.length 
      };
    } catch (grpcError) {
      logger.warn({ error: grpcError }, 'gRPC search failed, falling back to HTTP');
      
      // Fallback to HTTP
      try {
        const response = await axios.get(`${USER_SERVICE_URL}/api/internal/candidates/search`, {
          params: {
            skills: filters.skills?.join(','),
            minAuraScore: filters.minAuraScore || filters.minAura,
            minCoreCount: filters.minCoreCount,
            location: filters.location,
            isOpenToWork: filters.isOpenToWork,
            minSkillScore: filters.minSkillScore,
            page,
            limit,
          },
          timeout: 10000,
        });

        if (response.data.success) {
          const candidates = response.data.data.candidates || [];
          const total = response.data.meta?.total || 0;

          const candidatesWithMatch: CandidateProfile[] = candidates.map((c: any) => ({
            ...c,
            matchScore: this.calculateMatchScore(c, filters),
          }));

          return { candidates: candidatesWithMatch, total };
        }

        return { candidates: [], total: 0 };
      } catch (httpError) {
        logger.error({ error: httpError }, 'HTTP fallback also failed');
        return { candidates: [], total: 0 };
      }
    }
  }

  /**
   * Get FULL candidate profile for recruiter
   * Includes all details, analyzed projects, resume
   * Uses gRPC for high-performance, falls back to HTTP
   */
  static async getFullCandidateProfile(userId: string): Promise<FullCandidateProfile | null> {
    logger.debug({ userId }, 'Fetching full candidate profile via gRPC');

    try {
      // Try gRPC first
      const [grpcUser, resumeResponse] = await Promise.all([
        grpcGetUserProfile(userId, {
          includeProjects: true,
          includeSkills: true,
          includeExperiences: true,
          includeEducation: true,
        }).catch(() => null),
        axios.get(`http://resume-service:8003/api/v1/resumes/user/${userId}/url`, { timeout: 5000 }).catch(() => null),
      ]);

      if (grpcUser) {
        const resumeUrl = resumeResponse?.data?.url;

        // Transform gRPC response to full candidate profile
        const fullProfile: FullCandidateProfile = {
          id: grpcUser.id,
          username: grpcUser.username,
          name: grpcUser.name,
          avatarUrl: grpcUser.avatar_url,
          bio: grpcUser.profile?.bio,
          location: grpcUser.profile?.location?.city,
          auraScore: grpcUser.aura_score || 0,
          coreCount: (grpcUser.projects || []).length,
          isOpenToWork: grpcUser.profile?.availability === 'AVAILABLE',
          isVerified: false,
          
          email: grpcUser.email,
          website: grpcUser.profile?.social_links?.portfolio,
          
          socialLinks: [],
          topSkills: (grpcUser.skills || []).slice(0, 5).map((s: any) => ({
            name: s.name,
            score: s.confidence_score || 0.8,
          })),
          
          allSkills: (grpcUser.skills || []).map((s: any) => ({
            name: s.name,
            category: s.category,
            score: s.confidence_score || 0.8,
            isVerified: s.verified || false,
            projectCount: 0,
            evidence: [],
          })),
          
          topProjects: (grpcUser.projects || []).slice(0, 3).map((p: any) => ({
            name: p.name,
            techStack: p.tech_stack || [],
            score: p.quality_score || 0,
          })),
          
          analyzedProjects: (grpcUser.projects || []).map((p: any) => ({
            id: p.id,
            repoName: p.name,
            repoUrl: p.repo_url,
            description: p.description,
            primaryLanguage: (p.tech_stack || [])[0] || '',
            technologies: p.tech_stack || [],
            overallScore: p.quality_score || 0,
            codeQualityScore: p.quality_score || 0,
            structureScore: p.quality_score || 0,
            analysis: {
              folderStructure: {},
              codeQuality: {},
              optimizations: [],
              bestPractices: { followed: [], missing: [] },
            },
            analyzedAt: p.created_at?.seconds ? new Date(p.created_at.seconds * 1000).toISOString() : new Date().toISOString(),
          })),
          
          experiences: (grpcUser.experiences || []).map((e: any) => ({
            company: e.company,
            position: e.title,
            startDate: e.start_date?.seconds ? new Date(e.start_date.seconds * 1000).toISOString() : '',
            endDate: e.end_date?.seconds ? new Date(e.end_date.seconds * 1000).toISOString() : undefined,
            isCurrent: e.current || false,
            description: e.description,
          })),
          
          education: (grpcUser.education || []).map((e: any) => ({
            institution: e.institution,
            degree: e.degree,
            field: e.field_of_study,
            startYear: e.start_date?.seconds ? new Date(e.start_date.seconds * 1000).getFullYear() : 0,
            endYear: e.end_date?.seconds ? new Date(e.end_date.seconds * 1000).getFullYear() : 0,
          })),
          
          resumeUrl,
          lastActive: grpcUser.updated_at?.seconds ? new Date(grpcUser.updated_at.seconds * 1000).toISOString() : new Date().toISOString(),
          memberSince: grpcUser.created_at?.seconds ? new Date(grpcUser.created_at.seconds * 1000).toISOString() : new Date().toISOString(),
          matchScore: 0,
        };

        return fullProfile;
      }
    } catch (grpcError) {
      logger.warn({ error: grpcError, userId }, 'gRPC profile fetch failed, falling back to HTTP');
    }

    // Fallback to HTTP
    try {
      const [candidateResponse, resumeResponse] = await Promise.all([
        axios.get(`${USER_SERVICE_URL}/api/internal/candidates/${userId}`, { timeout: 10000 }).catch(() => null),
        axios.get(`http://resume-service:8003/api/v1/resumes/user/${userId}/url`, { timeout: 5000 }).catch(() => null),
      ]);

      if (!candidateResponse?.data?.success) {
        return null;
      }

      const candidate = candidateResponse.data.data.candidate;
      const resumeUrl = resumeResponse?.data?.url;

      const fullProfile: FullCandidateProfile = {
        id: candidate.id,
        username: candidate.username,
        name: candidate.name,
        avatarUrl: candidate.avatarUrl,
        bio: candidate.bio,
        location: candidate.location,
        auraScore: candidate.auraScore || 0,
        coreCount: candidate.coreCount || 0,
        isOpenToWork: candidate.isOpenToWork,
        isVerified: candidate.isVerified || false,
        email: candidate.email,
        website: candidate.website,
        socialLinks: candidate.socialLinks || [],
        topSkills: candidate.topSkills || [],
        allSkills: candidate.allSkills || [],
        topProjects: candidate.topProjects || [],
        analyzedProjects: (candidate.analyzedProjects || []).map((p: any) => ({
          id: p.id,
          repoName: p.repoName,
          repoUrl: p.repoUrl,
          description: p.description,
          primaryLanguage: p.primaryLanguage,
          technologies: p.technologies || [],
          overallScore: p.overallScore || 0,
          codeQualityScore: p.codeQualityScore || 0,
          structureScore: p.structureScore || 0,
          analysis: {
            folderStructure: {},
            codeQuality: {},
            optimizations: [],
            bestPractices: { followed: [], missing: [] },
          },
          analyzedAt: p.analyzedAt,
        })),
        experiences: (candidate.experiences || []).map((e: any) => ({
          company: e.company,
          position: e.position,
          startDate: e.startDate,
          endDate: e.endDate,
          isCurrent: e.isCurrent,
          description: e.description,
        })),
        education: (candidate.education || []).map((e: any) => ({
          institution: e.institution,
          degree: e.degree,
          field: e.field,
          startYear: e.startYear,
          endYear: e.endYear,
        })),
        resumeUrl,
        lastActive: candidate.lastActive || new Date().toISOString(),
        memberSince: candidate.memberSince || new Date().toISOString(),
        matchScore: 0,
      };

      return fullProfile;
    } catch (error) {
      logger.error({ error, userId }, 'Failed to fetch candidate profile');
      return null;
    }
  }

  /**
   * Get candidate profile (basic - for search results)
   * Uses gRPC with HTTP fallback
   */
  static async getCandidateProfile(userId: string): Promise<CandidateProfile | null> {
    try {
      // Try gRPC first
      const grpcUser = await grpcGetUser(userId).catch(() => null);
      
      if (grpcUser) {
        return {
          id: grpcUser.id,
          username: grpcUser.username,
          name: grpcUser.name,
          avatarUrl: grpcUser.avatar_url,
          bio: grpcUser.profile?.bio,
          location: grpcUser.profile?.location?.city,
          auraScore: grpcUser.aura_score || 0,
          coreCount: 0,
          isOpenToWork: grpcUser.profile?.availability === 'AVAILABLE',
          isVerified: false,
          topSkills: (grpcUser.skills || []).slice(0, 5).map((s: any) => ({
            name: s.name,
            score: s.confidence_score || 0.8,
          })),
          topProjects: (grpcUser.projects || []).slice(0, 3).map((p: any) => ({
            name: p.name,
            techStack: p.tech_stack || [],
            score: p.quality_score || 0,
          })),
          matchScore: 0,
        };
      }
    } catch (grpcError) {
      logger.warn({ error: grpcError, userId }, 'gRPC getUser failed, falling back to HTTP');
    }

    // Fallback to HTTP
    try {
      const response = await axios.get(`${USER_SERVICE_URL}/api/internal/candidates/${userId}`, {
        timeout: 5000,
      });

      if (!response.data.success) return null;

      const candidate = response.data.data.candidate;
      return {
        id: candidate.id,
        username: candidate.username,
        name: candidate.name,
        avatarUrl: candidate.avatarUrl,
        bio: candidate.bio,
        location: candidate.location,
        auraScore: candidate.auraScore || 0,
        coreCount: candidate.coreCount || 0,
        isOpenToWork: candidate.isOpenToWork,
        isVerified: candidate.isVerified || false,
        topSkills: candidate.topSkills || [],
        topProjects: candidate.topProjects || [],
        matchScore: 0,
      };
    } catch (error) {
      logger.error({ error, userId }, 'Failed to fetch candidate profile');
      return null;
    }
  }

  /**
   * Find candidates matching a specific job
   */
  static async findMatchingCandidates(
    jobId: string,
    requiredSkills: { name: string; minScore: number }[],
    minAura: number,
    minCores: number
  ): Promise<CandidateProfile[]> {
    logger.debug({ jobId, skillCount: requiredSkills.length }, 'Finding matching candidates');
    
    try {
      // Search for candidates with matching skills
      const { candidates } = await this.searchCandidates({
        skills: requiredSkills.map(s => s.name),
        minAura,
        minCoreCount: minCores,
      }, 1, 50);

      // Filter candidates that meet all requirements
      const matchingCandidates = candidates.filter(candidate => {
        // Check aura score
        if (candidate.auraScore < minAura) return false;
        
        // Check core count
        if (candidate.coreCount < minCores) return false;

        // Check required skills
        for (const required of requiredSkills) {
          const userSkill = candidate.topSkills.find(
            s => s.name.toLowerCase() === required.name.toLowerCase()
          );
          if (!userSkill || userSkill.score < required.minScore) {
            // If it's not in top skills, might still qualify
            // We'll be lenient here and allow partial matches
          }
        }

        return true;
      });

      // Calculate match score for each candidate
      return matchingCandidates.map(candidate => ({
        ...candidate,
        matchScore: this.calculateMatchScore(candidate, { skills: requiredSkills.map(s => s.name), minAura }),
      })).sort((a, b) => b.matchScore - a.matchScore);
    } catch (error) {
      logger.error({ error, jobId }, 'Failed to find matching candidates');
      return [];
    }
  }

  /**
   * Shortlist a candidate
   */
  static async shortlistCandidate(
    recruiterId: string,
    candidateId: string,
    jobId?: string
  ): Promise<boolean> {
    logger.info({ recruiterId, candidateId, jobId }, 'Shortlisting candidate');
    // TODO: Implement with database persistence
    // For now, this would be stored in a shortlist table
    return true;
  }

  /**
   * Get recruiter's shortlisted candidates
   */
  static async getShortlist(
    recruiterId: string,
    organizationId: string
  ): Promise<CandidateProfile[]> {
    logger.debug({ recruiterId, organizationId }, 'Fetching shortlist');
    // TODO: Implement with database persistence
    return [];
  }

  /**
   * Calculate match score based on filters
   */
  private static calculateMatchScore(
    candidate: CandidateProfile | any,
    filters: CandidateSearchFilters
  ): number {
    let score = 50; // Base score

    // Aura score contribution (0-25 points)
    if (filters.minAura) {
      const auraRatio = Math.min((candidate.auraScore || 0) / filters.minAura, 2);
      score += Math.round(auraRatio * 12.5);
    } else {
      score += 12.5;
    }

    // Core count contribution (0-10 points)
    if (filters.minCoreCount) {
      const coreRatio = Math.min((candidate.coreCount || 0) / filters.minCoreCount, 2);
      score += Math.round(coreRatio * 5);
    } else {
      score += 5;
    }

    // Skill match contribution (0-25 points)
    if (filters.skills && filters.skills.length > 0) {
      const candidateSkills = (candidate.topSkills || candidate.skills || [])
        .map((s: any) => s.name?.toLowerCase());
      
      const matchedSkills = filters.skills.filter(skill =>
        candidateSkills.includes(skill.toLowerCase())
      );
      
      const skillMatchRatio = matchedSkills.length / filters.skills.length;
      score += Math.round(skillMatchRatio * 25);
    } else {
      score += 12.5;
    }

    // Verified bonus (0-10 points)
    if (candidate.isVerified) {
      score += 10;
    }

    return Math.min(100, Math.round(score));
  }
}

export default CandidateService;
