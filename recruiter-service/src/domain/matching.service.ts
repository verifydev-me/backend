import { logger } from '../utils/logger.js';
import type { CandidateProfile } from '../types/index.js';
import axios from 'axios';

/**
 * Match Score Breakdown
 */
export interface MatchScoreBreakdown {
  skills: number;          // 0-100 (40% weight)
  experience: number;      // 0-100 (25% weight)
  location: number;        // 0-100 (15% weight)
  aura: number;            // 0-100 (10% weight)
  availability: number;    // 0-100 (10% weight)
}

/**
 * Match Result
 */
export interface MatchResult {
  candidateId: string;
  totalScore: number;      // 0-100
  breakdown: MatchScoreBreakdown;
  matchedSkills: string[];
  missingSkills: string[];
  reasons: string[];       // Human-readable match reasons
}

/**
 * Job Requirements for Matching
 */
export interface JobRequirements {
  jobId: string;
  title?: string;
  requiredSkills: { name: string; minScore?: number; isRequired: boolean }[];
  niceToHaveSkills?: { name: string }[];
  minAuraScore?: number;
  minCoreCount?: number;
  experienceLevel?: 'ENTRY' | 'JUNIOR' | 'MID' | 'SENIOR' | 'LEAD';
  location?: string;
  locationType?: 'REMOTE' | 'ONSITE' | 'HYBRID';
  availableFrom?: Date;
}

/**
 * Candidate for Matching
 */
export interface CandidateForMatching {
  id: string;
  username: string;
  name: string;
  avatarUrl?: string;
  location?: string;
  auraScore: number;
  coreCount: number;
  isOpenToWork: boolean;
  availableFrom?: Date;
  remotePreference?: 'REMOTE_ONLY' | 'ONSITE_ONLY' | 'HYBRID' | 'FLEXIBLE';
  skills: { name: string; score: number; isVerified: boolean }[];
  preferredRoles?: string[];
  preferredLocations?: string[];
}

// User service URL
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://user-service:3002';

/**
 * Smart Matching Service
 * 
 * Calculates match scores between candidates and jobs using:
 * - Skill matching (40% weight)
 * - Experience level matching (25% weight)
 * - Location matching (15% weight)
 * - Aura score matching (10% weight)
 * - Availability matching (10% weight)
 */
export class MatchingService {
  // ==================== WEIGHTS ====================
  private static readonly WEIGHTS = {
    skills: 0.40,
    experience: 0.25,
    location: 0.15,
    aura: 0.10,
    availability: 0.10,
  };

  // Experience level to core count mapping
  private static readonly EXPERIENCE_LEVELS: Record<string, { min: number; max: number }> = {
    ENTRY: { min: 0, max: 2 },
    JUNIOR: { min: 1, max: 4 },
    MID: { min: 3, max: 7 },
    SENIOR: { min: 5, max: 12 },
    LEAD: { min: 8, max: 20 },
  };

  // ==================== MAIN MATCHING ====================

  /**
   * Calculate match score between a candidate and job requirements
   */
  static calculateMatchScore(
    candidate: CandidateForMatching,
    job: JobRequirements
  ): MatchResult {
    logger.debug({ candidateId: candidate.id, jobId: job.jobId }, 'Calculating match score');

    // Calculate individual scores
    const skillsResult = this.calculateSkillsMatch(candidate.skills, job.requiredSkills, job.niceToHaveSkills);
    const experienceScore = this.calculateExperienceMatch(candidate.coreCount, job.experienceLevel);
    const locationScore = this.calculateLocationMatch(
      candidate.location,
      candidate.remotePreference,
      candidate.preferredLocations,
      job.location,
      job.locationType
    );
    const auraScore = this.calculateAuraMatch(candidate.auraScore, job.minAuraScore);
    const availabilityScore = this.calculateAvailabilityMatch(candidate.availableFrom, job.availableFrom);

    // Build breakdown
    const breakdown: MatchScoreBreakdown = {
      skills: skillsResult.score,
      experience: experienceScore,
      location: locationScore,
      aura: auraScore,
      availability: availabilityScore,
    };

    // Calculate weighted total
    const totalScore = Math.round(
      breakdown.skills * this.WEIGHTS.skills +
      breakdown.experience * this.WEIGHTS.experience +
      breakdown.location * this.WEIGHTS.location +
      breakdown.aura * this.WEIGHTS.aura +
      breakdown.availability * this.WEIGHTS.availability
    );

    // Generate human-readable reasons
    const reasons = this.generateMatchReasons(candidate, job, breakdown, skillsResult);

    return {
      candidateId: candidate.id,
      totalScore,
      breakdown,
      matchedSkills: skillsResult.matched,
      missingSkills: skillsResult.missing,
      reasons,
    };
  }

  // ==================== SKILL MATCHING ====================

  /**
   * Calculate skill match score
   */
  private static calculateSkillsMatch(
    candidateSkills: { name: string; score: number; isVerified: boolean }[],
    requiredSkills: { name: string; minScore?: number; isRequired: boolean }[],
    niceToHaveSkills?: { name: string }[]
  ): { score: number; matched: string[]; missing: string[] } {
    if (!requiredSkills || requiredSkills.length === 0) {
      return { score: 100, matched: [], missing: [] };
    }

    const candidateSkillMap = new Map(
      candidateSkills.map(s => [s.name.toLowerCase(), s])
    );

    let matchedRequired = 0;
    let totalRequired = 0;
    const matched: string[] = [];
    const missing: string[] = [];

    // Check required skills
    for (const req of requiredSkills) {
      if (req.isRequired) {
        totalRequired++;
        const skillName = req.name.toLowerCase();
        const candidateSkill = candidateSkillMap.get(skillName);

        if (candidateSkill) {
          const minScore = req.minScore || 0;
          if (candidateSkill.score >= minScore) {
            matchedRequired++;
            matched.push(req.name);
          } else {
            missing.push(`${req.name} (low score)`);
          }
        } else {
          missing.push(req.name);
        }
      } else {
        // Nice-to-have skill in required list
        const skillName = req.name.toLowerCase();
        if (candidateSkillMap.has(skillName)) {
          matched.push(req.name);
        }
      }
    }

    // Check nice-to-have skills (bonus points)
    let niceToHaveMatches = 0;
    if (niceToHaveSkills && niceToHaveSkills.length > 0) {
      for (const skill of niceToHaveSkills) {
        if (candidateSkillMap.has(skill.name.toLowerCase())) {
          niceToHaveMatches++;
          if (!matched.includes(skill.name)) {
            matched.push(skill.name);
          }
        }
      }
    }

    // Calculate score
    let score = 0;
    if (totalRequired > 0) {
      // Base score from required skills (80% of skill score)
      score = (matchedRequired / totalRequired) * 80;
    } else {
      // No required skills specified, give full base score
      score = 80;
    }

    // Bonus from nice-to-have skills (up to 20% of skill score)
    if (niceToHaveSkills && niceToHaveSkills.length > 0) {
      const niceToHaveRatio = niceToHaveMatches / niceToHaveSkills.length;
      score += niceToHaveRatio * 20;
    } else {
      score += 20;
    }

    // Bonus for verified skills
    const verifiedSkillCount = candidateSkills.filter(s => 
      s.isVerified && matched.map(m => m.toLowerCase()).includes(s.name.toLowerCase())
    ).length;
    if (verifiedSkillCount > 0) {
      score = Math.min(100, score + verifiedSkillCount * 2);
    }

    return {
      score: Math.round(score),
      matched,
      missing,
    };
  }

  // ==================== EXPERIENCE MATCHING ====================

  /**
   * Calculate experience match based on core count
   */
  private static calculateExperienceMatch(
    coreCount: number,
    experienceLevel?: string
  ): number {
    if (!experienceLevel) {
      return 100; // No experience requirement
    }

    const level = this.EXPERIENCE_LEVELS[experienceLevel];
    if (!level) {
      return 75; // Unknown level, give decent score
    }

    if (coreCount >= level.min && coreCount <= level.max) {
      // Perfect match
      return 100;
    } else if (coreCount < level.min) {
      // Under-qualified
      const deficit = level.min - coreCount;
      return Math.max(0, 100 - deficit * 20);
    } else {
      // Over-qualified (slight penalty)
      const surplus = coreCount - level.max;
      return Math.max(60, 100 - surplus * 5);
    }
  }

  // ==================== LOCATION MATCHING ====================

  /**
   * Calculate location match
   */
  private static calculateLocationMatch(
    candidateLocation?: string,
    candidateRemotePref?: string,
    candidatePreferredLocations?: string[],
    jobLocation?: string,
    jobLocationType?: string
  ): number {
    // Remote job - check candidate's remote preference
    if (jobLocationType === 'REMOTE') {
      if (candidateRemotePref === 'ONSITE_ONLY') {
        return 30; // Mismatch
      }
      return 100; // Remote works for most
    }

    // Onsite job - check location match
    if (jobLocationType === 'ONSITE') {
      if (candidateRemotePref === 'REMOTE_ONLY') {
        return 20; // Strong mismatch
      }

      // Check if locations match
      if (jobLocation && candidateLocation) {
        if (candidateLocation.toLowerCase().includes(jobLocation.toLowerCase()) ||
            jobLocation.toLowerCase().includes(candidateLocation.toLowerCase())) {
          return 100;
        }
      }

      // Check preferred locations
      if (jobLocation && candidatePreferredLocations) {
        const matches = candidatePreferredLocations.some(loc =>
          loc.toLowerCase().includes(jobLocation.toLowerCase()) ||
          jobLocation.toLowerCase().includes(loc.toLowerCase())
        );
        if (matches) return 90;
      }

      return 50; // Location not specified or no match
    }

    // Hybrid - flexible
    if (jobLocationType === 'HYBRID') {
      if (candidateRemotePref === 'REMOTE_ONLY') {
        return 50;
      }
      if (candidateRemotePref === 'HYBRID' || candidateRemotePref === 'FLEXIBLE') {
        return 100;
      }
      return 75;
    }

    // No location type specified
    return 80;
  }

  // ==================== AURA MATCHING ====================

  /**
   * Calculate aura score match
   */
  private static calculateAuraMatch(
    candidateAura: number,
    minAuraRequired?: number
  ): number {
    if (!minAuraRequired || minAuraRequired === 0) {
      // No minimum, give score based on absolute aura
      if (candidateAura >= 500) return 100;
      if (candidateAura >= 300) return 90;
      if (candidateAura >= 150) return 75;
      if (candidateAura >= 50) return 60;
      return 40;
    }

    if (candidateAura >= minAuraRequired) {
      // Exceeds requirement
      const ratio = candidateAura / minAuraRequired;
      return Math.min(100, 80 + ratio * 10);
    } else {
      // Below requirement
      const ratio = candidateAura / minAuraRequired;
      return Math.round(ratio * 80);
    }
  }

  // ==================== AVAILABILITY MATCHING ====================

  /**
   * Calculate availability match
   */
  private static calculateAvailabilityMatch(
    candidateAvailable?: Date,
    jobStartDate?: Date
  ): number {
    if (!jobStartDate) {
      return 100; // No specific start date
    }

    if (!candidateAvailable) {
      return 70; // Unknown availability
    }

    const candidateDate = new Date(candidateAvailable);
    const jobDate = new Date(jobStartDate);

    if (candidateDate <= jobDate) {
      return 100; // Available on or before required date
    }

    // Calculate delay in weeks
    const diffDays = Math.ceil((candidateDate.getTime() - jobDate.getTime()) / (1000 * 60 * 60 * 24));
    const diffWeeks = diffDays / 7;

    if (diffWeeks <= 2) return 90;
    if (diffWeeks <= 4) return 75;
    if (diffWeeks <= 8) return 50;
    return 25;
  }

  // ==================== MATCH REASONS ====================

  /**
   * Generate human-readable match reasons
   */
  private static generateMatchReasons(
    candidate: CandidateForMatching,
    job: JobRequirements,
    breakdown: MatchScoreBreakdown,
    skillsResult: { matched: string[]; missing: string[] }
  ): string[] {
    const reasons: string[] = [];

    // Skills
    if (breakdown.skills >= 80) {
      reasons.push(`✅ Strong skill match (${skillsResult.matched.length} matching skills)`);
    } else if (breakdown.skills >= 60) {
      reasons.push(`⚠️ Partial skill match (${skillsResult.missing.length} skills missing)`);
    } else if (skillsResult.missing.length > 0) {
      reasons.push(`❌ Missing key skills: ${skillsResult.missing.slice(0, 3).join(', ')}`);
    }

    // Experience
    if (breakdown.experience >= 90) {
      reasons.push(`✅ Experience level matches ${job.experienceLevel || 'requirements'}`);
    } else if (breakdown.experience >= 60) {
      reasons.push(`⚠️ Experience slightly ${candidate.coreCount < 3 ? 'below' : 'above'} expectations`);
    }

    // Aura
    if (breakdown.aura >= 80) {
      reasons.push(`⭐ High verified skill quality (${candidate.auraScore} aura)`);
    }

    // Location
    if (breakdown.location >= 90) {
      reasons.push(`📍 Location/remote preference matches`);
    } else if (breakdown.location < 50) {
      reasons.push(`📍 Location mismatch`);
    }

    // Availability
    if (breakdown.availability >= 90) {
      reasons.push(`📅 Available immediately or soon`);
    } else if (breakdown.availability < 50) {
      reasons.push(`📅 May not be available when needed`);
    }

    // Open to work bonus
    if (candidate.isOpenToWork) {
      reasons.push(`💼 Actively looking for opportunities`);
    }

    return reasons;
  }

  // ==================== BATCH MATCHING ====================

  /**
   * Find and rank candidates for a job
   */
  static async findMatchingCandidates(
    job: JobRequirements,
    limit = 50
  ): Promise<(CandidateForMatching & MatchResult)[]> {
    logger.debug({ jobId: job.jobId, limit }, 'Finding matching candidates');

    try {
      // Fetch candidates from user-service
      const response = await axios.get(`${USER_SERVICE_URL}/api/internal/candidates/search`, {
        params: {
          skills: job.requiredSkills.map(s => s.name).join(','),
          minAuraScore: job.minAuraScore || 0,
          minCoreCount: job.minCoreCount || 0,
          isOpenToWork: true,
          limit,
        },
        timeout: 10000,
      });

      if (!response.data.success) {
        return [];
      }

      const candidates: CandidateForMatching[] = response.data.data.candidates.map((c: any) => ({
        id: c.id,
        username: c.username,
        name: c.name,
        avatarUrl: c.avatarUrl,
        location: c.location,
        auraScore: c.auraScore || 0,
        coreCount: c.coreCount || 0,
        isOpenToWork: c.isOpenToWork,
        skills: (c.topSkills || []).map((s: any) => ({
          name: s.name,
          score: s.score || 0,
          isVerified: s.isVerified || false,
        })),
      }));

      // Calculate match scores and sort
      const matchedCandidates = candidates.map(candidate => {
        const matchResult = this.calculateMatchScore(candidate, job);
        return {
          ...candidate,
          ...matchResult,
        };
      });

      // Sort by match score descending
      matchedCandidates.sort((a, b) => b.totalScore - a.totalScore);

      return matchedCandidates;
    } catch (error) {
      logger.error({ error, jobId: job.jobId }, 'Failed to find matching candidates');
      return [];
    }
  }

  /**
   * Calculate match for an application
   */
  static async calculateApplicationMatch(
    candidateId: string,
    jobId: string,
    jobRequirements: JobRequirements
  ): Promise<MatchResult | null> {
    try {
      // Fetch candidate data
      const response = await axios.get(`${USER_SERVICE_URL}/api/internal/candidates/${candidateId}`, {
        timeout: 5000,
      });

      if (!response.data.success) {
        return null;
      }

      const c = response.data.data.candidate;
      const candidate: CandidateForMatching = {
        id: c.id,
        username: c.username,
        name: c.name,
        avatarUrl: c.avatarUrl,
        location: c.location,
        auraScore: c.auraScore || 0,
        coreCount: c.coreCount || 0,
        isOpenToWork: c.isOpenToWork,
        skills: (c.allSkills || c.topSkills || []).map((s: any) => ({
          name: s.name,
          score: s.score || 0,
          isVerified: s.isVerified || false,
        })),
      };

      return this.calculateMatchScore(candidate, jobRequirements);
    } catch (error) {
      logger.error({ error, candidateId, jobId }, 'Failed to calculate application match');
      return null;
    }
  }
}

export default MatchingService;
