// ==================== USER SERVICE - gRPC IMPLEMENTATION ====================

import * as grpc from '@grpc/grpc-js';
import { PrismaClient } from '@prisma/client';
import { toGrpcError, NotFoundError, ValidationError } from '../../../shared/grpc-errors';

const prisma = new PrismaClient();

/**
 * User Service gRPC Implementation
 * Handles all user-related gRPC calls
 */
export class UserGrpcService {
  /**
   * Get user by ID
   */
  async getUser(
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ): Promise<void> {
    try {
      const { user_id, fields } = call.request;

      if (!user_id) {
        throw new ValidationError('user_id is required');
      }

      const selectFields = this.buildSelectFields(fields);

      const user = await prisma.user.findUnique({
        where: { id: user_id },
        select: selectFields,
      });

      if (!user) {
        throw new NotFoundError(`User with ID ${user_id} not found`);
      }

      callback(null, {
        user: this.toProtoUser(user),
        error: null,
      });
    } catch (error: any) {
      callback(toGrpcError(error), null);
    }
  }

  /**
   * Batch get users - optimized for multiple user fetches
   */
  async batchGetUsers(
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ): Promise<void> {
    try {
      const { user_ids, fields } = call.request;

      if (!user_ids || user_ids.length === 0) {
        throw new ValidationError('user_ids array is required and cannot be empty');
      }

      const selectFields = this.buildSelectFields(fields);

      const users = await prisma.user.findMany({
        where: { id: { in: user_ids } },
        select: selectFields,
      });

      callback(null, {
        users: users.map(user => this.toProtoUser(user)),
        error: null,
      });
    } catch (error: any) {
      callback(toGrpcError(error), null);
    }
  }

  /**
   * Search candidates with filters
   */
  async searchCandidates(
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ): Promise<void> {
    try {
      const {
        skills,
        min_aura_score,
        location_city,
        location_country,
        availability,
        pagination,
      } = call.request;

      const page = pagination?.page || 1;
      const limit = pagination?.limit || 20;
      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};

      if (min_aura_score) {
        where.auraScore = { gte: min_aura_score };
      }

      if (availability) {
        where.profile = {
          availability: availability,
        };
      }

      if (location_city || location_country) {
        where.profile = {
          ...where.profile,
          location: {
            ...(location_city && { city: location_city }),
            ...(location_country && { country: location_country }),
          },
        };
      }

      if (skills && skills.length > 0) {
        where.skills = {
          some: {
            name: { in: skills },
          },
        };
      }

      // Execute queries in parallel
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          include: {
            skills: true,
            projects: {
              take: 5,
              orderBy: { updatedAt: 'desc' },
            },
          },
          skip,
          take: limit,
          orderBy: { auraScore: 'desc' },
        }),
        prisma.user.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      callback(null, {
        candidates: users.map(user => this.toProtoUser(user)),
        pagination: {
          page,
          limit,
          total,
          total_pages: totalPages,
        },
        error: null,
      });
    } catch (error: any) {
      callback(toGrpcError(error), null);
    }
  }

  /**
   * Get user profile with full details
   */
  async getUserProfile(
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ): Promise<void> {
    try {
      const {
        user_id,
        include_projects,
        include_skills,
        include_experiences,
        include_education,
      } = call.request;

      if (!user_id) {
        throw new ValidationError('user_id is required');
      }

      const user = await prisma.user.findUnique({
        where: { id: user_id },
        include: {
          ...(include_skills && { skills: true }),
          ...(include_projects && {
            projects: {
              orderBy: { updatedAt: 'desc' },
            },
          }),
          ...(include_experiences && {
            experiences: {
              orderBy: { startDate: 'desc' },
            },
          }),
          ...(include_education && {
            education: {
              orderBy: { startDate: 'desc' },
            },
          }),
        },
      });

      if (!user) {
        throw new NotFoundError(`User with ID ${user_id} not found`);
      }

      callback(null, {
        user: this.toProtoUser(user),
        error: null,
      });
    } catch (error: any) {
      callback(toGrpcError(error), null);
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ): Promise<void> {
    try {
      const { user_id, profile } = call.request;

      if (!user_id) {
        throw new ValidationError('user_id is required');
      }

      // Update user profile (simplified - profile fields should be on user directly)
      const profileData = this.fromProtoProfile(profile);
      const updatedUser = await prisma.user.update({
        where: { id: user_id },
        data: profileData,
        include: {
          skills: true,
        },
      });

      callback(null, {
        user: this.toProtoUser(updatedUser),
        error: null,
      });
    } catch (error: any) {
      callback(toGrpcError(error), null);
    }
  }

  /**
   * Stream user updates (real-time)
   */
  watchUserUpdates(call: grpc.ServerWritableStream<any, any>): void {
    const { user_ids } = call.request;

    // TODO: Implement actual real-time streaming using Redis pub/sub or similar
    // For now, this is a placeholder

    call.on('cancelled', () => {
      console.log('Client cancelled stream');
    });

    // Example: Send a test event after 5 seconds
    setTimeout(() => {
      call.write({
        user_id: user_ids[0],
        event_type: 'PROFILE_UPDATED',
        timestamp: {
          seconds: Math.floor(Date.now() / 1000),
          nanos: 0,
        },
      });
    }, 5000);
  }

  // ==================== HELPER METHODS ====================

  /**
   * Build select fields from proto request
   */
  private buildSelectFields(fields?: string[]): any {
    if (!fields || fields.length === 0) {
      return {
        id: true,
        email: true,
        name: true,
        username: true,
        avatarUrl: true,
        auraScore: true,
        createdAt: true,
        updatedAt: true,
      };
    }

    const select: any = { id: true }; // Always include ID
    
    for (const field of fields) {
      select[field] = true;
    }

    return select;
  }

  /**
   * Convert Prisma user to Proto user
   */
  private toProtoUser(user: any): any {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      username: user.username,
      avatar_url: user.avatarUrl,
      aura_score: user.auraScore || 0,
      profile: user.profile ? this.toProtoProfile(user.profile) : undefined,
      skills: user.skills ? user.skills.map((s: any) => this.toProtoSkill(s)) : [],
      projects: user.projects ? user.projects.map((p: any) => this.toProtoProject(p)) : [],
      experiences: user.experiences ? user.experiences.map((e: any) => this.toProtoExperience(e)) : [],
      education: user.education ? user.education.map((e: any) => this.toProtoEducation(e)) : [],
      created_at: this.toProtoTimestamp(user.createdAt),
      updated_at: this.toProtoTimestamp(user.updatedAt),
    };
  }

  /**
   * Convert profile to Proto format
   */
  private toProtoProfile(profile: any): any {
    return {
      bio: profile.bio,
      title: profile.title,
      location: profile.location ? {
        city: profile.location.city,
        country: profile.location.country,
        state: profile.location.state,
        timezone: profile.location.timezone,
      } : undefined,
      social_links: profile.socialLinks ? {
        github: profile.socialLinks.github,
        linkedin: profile.socialLinks.linkedin,
        twitter: profile.socialLinks.twitter,
        portfolio: profile.socialLinks.portfolio,
      } : undefined,
      availability: profile.availability,
      years_of_experience: profile.yearsOfExperience,
      resume_url: profile.resumeUrl,
    };
  }

  /**
   * Convert Proto profile to Prisma format
   */
  private fromProtoProfile(profile: any): any {
    return {
      bio: profile.bio,
      title: profile.title,
      location: profile.location,
      socialLinks: profile.social_links,
      availability: profile.availability,
      yearsOfExperience: profile.years_of_experience,
      resumeUrl: profile.resume_url,
    };
  }

  /**
   * Convert skill to Proto format
   */
  private toProtoSkill(skill: any): any {
    return {
      id: skill.id,
      name: skill.name,
      category: skill.category,
      proficiency_level: skill.proficiencyLevel || 3,
      years_of_experience: skill.yearsOfExperience || 0,
      verified: skill.verified || false,
      confidence_score: skill.confidenceScore || 0.0,
    };
  }

  /**
   * Convert project to Proto format
   */
  private toProtoProject(project: any): any {
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      repo_url: project.repoUrl,
      default_branch: project.defaultBranch,
      tech_stack: project.techStack || [],
      skills_detected: project.skillsDetected || [],
      stars: project.stars || 0,
      forks: project.forks || 0,
      status: project.status,
      quality_score: project.qualityScore || 0,
      created_at: this.toProtoTimestamp(project.createdAt),
      updated_at: this.toProtoTimestamp(project.updatedAt),
    };
  }

  /**
   * Convert experience to Proto format
   */
  private toProtoExperience(exp: any): any {
    return {
      id: exp.id,
      company: exp.company,
      title: exp.title,
      description: exp.description,
      start_date: this.toProtoTimestamp(exp.startDate),
      end_date: exp.endDate ? this.toProtoTimestamp(exp.endDate) : undefined,
      current: exp.current || false,
      technologies: exp.technologies || [],
    };
  }

  /**
   * Convert education to Proto format
   */
  private toProtoEducation(edu: any): any {
    return {
      id: edu.id,
      institution: edu.institution,
      degree: edu.degree,
      field_of_study: edu.fieldOfStudy,
      start_date: this.toProtoTimestamp(edu.startDate),
      end_date: edu.endDate ? this.toProtoTimestamp(edu.endDate) : undefined,
      gpa: edu.gpa || 0,
    };
  }

  /**
   * Convert Date to Proto Timestamp
   */
  private toProtoTimestamp(date: Date): any {
    const ms = date.getTime();
    return {
      seconds: Math.floor(ms / 1000),
      nanos: (ms % 1000) * 1000000,
    };
  }
}
