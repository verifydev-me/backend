import { logger } from '../utils/logger.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../prisma/client.js';
import { Recruiter as PrismaRecruiter, Organization as PrismaOrganization } from '@prisma/client';

// ============================================
// TYPES
// ============================================

export interface Recruiter {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  title?: string;
  phone?: string;
  avatarUrl?: string;
  organizationId: string;
  organization: Organization;
  role: 'ADMIN' | 'RECRUITER' | 'VIEWER';
  isActive: boolean;
  createdAt: Date;
  lastLoginAt?: Date;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  website?: string;
  description?: string;
  industry?: string;
  size: 'STARTUP' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'ENTERPRISE';
  isVerified: boolean;
  createdAt: Date;
}

export interface RegisterRecruiterDto {
  email: string;
  password: string;
  name: string;
  companyName: string;
  companyWebsite?: string;
  title?: string;
  phone?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function transformOrganization(org: PrismaOrganization): Organization {
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    logo: org.logo || undefined,
    website: org.website || undefined,
    description: org.description || undefined,
    industry: org.industry || undefined,
    size: org.size as Organization['size'],
    isVerified: org.isVerified,
    createdAt: org.createdAt,
  };
}

function transformRecruiter(
  recruiter: PrismaRecruiter & { organization?: PrismaOrganization | null },
  org?: Organization
): Recruiter {
  const organization = org || (recruiter.organization ? transformOrganization(recruiter.organization) : {
    id: recruiter.organizationId,
    name: 'Unknown',
    slug: 'unknown',
    size: 'STARTUP' as const,
    isVerified: false,
    createdAt: new Date(),
  });

  return {
    id: recruiter.id,
    email: recruiter.email,
    passwordHash: recruiter.passwordHash,
    name: recruiter.name,
    title: recruiter.title || undefined,
    phone: recruiter.phone || undefined,
    avatarUrl: recruiter.avatarUrl || undefined,
    organizationId: recruiter.organizationId,
    organization,
    role: recruiter.role as Recruiter['role'],
    isActive: recruiter.isActive,
    createdAt: recruiter.createdAt,
    lastLoginAt: recruiter.lastLoginAt || undefined,
  };
}

// ============================================
// AUTH SERVICE WITH PRISMA
// ============================================

export class RecruiterAuthService {
  /**
   * Register a new recruiter (wrapper with controller-expected return type)
   */
  static async register(data: {
    email: string;
    password: string;
    name: string;
    organizationName: string;
    organizationWebsite?: string;
    organizationType?: string;
    organizationSize?: string;
    position?: string;
  }): Promise<{
    success: boolean;
    recruiter?: Omit<Recruiter, 'passwordHash'>;
    organization?: Organization;
    tokens?: AuthTokens;
    error?: string;
    message?: string;
  }> {
    try {
      logger.info({ email: data.email, company: data.organizationName }, 'Registering new recruiter');

      // Check if email already exists
      const existingRecruiter = await prisma.recruiter.findUnique({
        where: { email: data.email.toLowerCase() },
      });

      if (existingRecruiter) {
        return { success: false, error: 'EMAIL_EXISTS', message: 'Email already registered' };
      }

      // Create or find organization
      const orgSlug = this.generateSlug(data.organizationName);
      let organization = await prisma.organization.findUnique({
        where: { slug: orgSlug },
      });

      if (!organization) {
        organization = await prisma.organization.create({
          data: {
            name: data.organizationName,
            slug: orgSlug,
            website: data.organizationWebsite,
            size: (data.organizationSize as any) || 'STARTUP',
            isVerified: false,
          },
        });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(data.password, 12);

      // Create recruiter
      const recruiter = await prisma.recruiter.create({
        data: {
          email: data.email.toLowerCase(),
          passwordHash,
          name: data.name,
          title: data.position,
          organizationId: organization.id,
          role: 'ADMIN', // First user is admin
          isActive: true,
        },
        include: { organization: true },
      });

      // Generate tokens
      const tokens = this.generateTokens(recruiter.id, recruiter.organizationId);

      logger.info({ recruiterId: recruiter.id }, 'Recruiter registered successfully');

      return {
        success: true,
        recruiter: this.sanitizeRecruiter(transformRecruiter(recruiter, transformOrganization(organization))),
        organization: transformOrganization(organization),
        tokens,
      };
    } catch (error) {
      logger.error({ error }, 'Registration failed');
      return { success: false, error: 'REGISTRATION_FAILED', message: 'Registration failed' };
    }
  }

  /**
   * Login recruiter (wrapper with controller-expected return type)
   */
  static async login(email: string, password: string): Promise<{
    success: boolean;
    recruiter?: Omit<Recruiter, 'passwordHash'>;
    organization?: Organization;
    tokens?: AuthTokens;
    error?: string;
    message?: string;
  }> {
    try {
      logger.info({ email }, 'Recruiter login attempt');

      // Find recruiter
      const recruiter = await prisma.recruiter.findUnique({
        where: { email: email.toLowerCase() },
        include: { organization: true },
      });

      if (!recruiter) {
        return { success: false, error: 'INVALID_CREDENTIALS', message: 'Invalid credentials' };
      }

      // Check password
      const isValid = await bcrypt.compare(password, recruiter.passwordHash);
      if (!isValid) {
        return { success: false, error: 'INVALID_CREDENTIALS', message: 'Invalid credentials' };
      }

      // Check if active
      if (!recruiter.isActive) {
        return { success: false, error: 'ACCOUNT_DEACTIVATED', message: 'Account is deactivated' };
      }

      // Update last login
      await prisma.recruiter.update({
        where: { id: recruiter.id },
        data: { lastLoginAt: new Date() },
      });

      // Generate tokens
      const tokens = this.generateTokens(recruiter.id, recruiter.organizationId);

      logger.info({ recruiterId: recruiter.id }, 'Recruiter logged in');

      const org = recruiter.organization ? transformOrganization(recruiter.organization) : undefined;
      return {
        success: true,
        recruiter: this.sanitizeRecruiter(transformRecruiter(recruiter, org)),
        organization: org,
        tokens,
      };
    } catch (error) {
      logger.error({ error }, 'Login failed');
      return { success: false, error: 'LOGIN_FAILED', message: 'Login failed' };
    }
  }

  /**
   * Refresh tokens (wrapper with controller-expected return type)
   */
  static async refreshTokens(refreshToken: string): Promise<{
    success: boolean;
    tokens?: AuthTokens;
    error?: string;
    message?: string;
  }> {
    try {
      const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as {
        recruiterId: string;
        organizationId: string;
        type: 'refresh';
      };

      if (decoded.type !== 'refresh') {
        return { success: false, error: 'INVALID_TOKEN', message: 'Invalid token type' };
      }

      const recruiter = await prisma.recruiter.findUnique({
        where: { id: decoded.recruiterId },
      });

      if (!recruiter || !recruiter.isActive) {
        return { success: false, error: 'INVALID_RECRUITER', message: 'Recruiter not found or inactive' };
      }

      const tokens = this.generateTokens(decoded.recruiterId, decoded.organizationId);
      return { success: true, tokens };
    } catch {
      return { success: false, error: 'INVALID_TOKEN', message: 'Invalid refresh token' };
    }
  }

  /**
   * Get recruiter with organization
   */
  static async getRecruiterWithOrganization(recruiterId: string): Promise<{
    recruiter: Omit<Recruiter, 'passwordHash'>;
    organization: Organization;
  } | null> {
    const recruiter = await prisma.recruiter.findUnique({
      where: { id: recruiterId },
      include: { organization: true },
    });

    if (!recruiter || !recruiter.organization) return null;

    const org = transformOrganization(recruiter.organization);
    return {
      recruiter: this.sanitizeRecruiter(transformRecruiter(recruiter, org)),
      organization: org,
    };
  }

  /**
   * Get recruiter by ID
   */
  static async getRecruiterById(id: string): Promise<Omit<Recruiter, 'passwordHash'> | null> {
    const recruiter = await prisma.recruiter.findUnique({
      where: { id },
      include: { organization: true },
    });

    if (!recruiter) return null;

    const org = recruiter.organization ? transformOrganization(recruiter.organization) : undefined;
    return this.sanitizeRecruiter(transformRecruiter(recruiter, org));
  }

  /**
   * Update recruiter profile (wrapper with controller-expected return type)
   */
  static async updateProfile(
    recruiterId: string,
    data: { name?: string; title?: string; phone?: string }
  ): Promise<{
    success: boolean;
    recruiter?: Omit<Recruiter, 'passwordHash'>;
    error?: string;
    message?: string;
  }> {
    try {
      const recruiter = await prisma.recruiter.update({
        where: { id: recruiterId },
        data: {
          name: data.name,
          title: data.title,
          phone: data.phone,
        },
        include: { organization: true },
      });

      const org = recruiter.organization ? transformOrganization(recruiter.organization) : undefined;
      return {
        success: true,
        recruiter: this.sanitizeRecruiter(transformRecruiter(recruiter, org)),
      };
    } catch {
      return { success: false, error: 'UPDATE_FAILED', message: 'Failed to update profile' };
    }
  }

  /**
   * Get organization details
   */
  static async getOrganization(organizationId: string): Promise<Organization | null> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    return org ? transformOrganization(org) : null;
  }

  /**
   * Update organization
   */
  static async updateOrganization(
    organizationId: string,
    data: { name?: string; description?: string; website?: string; industry?: string; size?: Organization['size'] }
  ): Promise<Organization | null> {
    try {
      const org = await prisma.organization.update({
        where: { id: organizationId },
        data: {
          name: data.name,
          description: data.description,
          website: data.website,
          industry: data.industry,
          size: data.size,
        },
      });

      return transformOrganization(org);
    } catch {
      return null;
    }
  }

  /**
   * Seed demo data for development
   */
  static async seedDemoData(): Promise<void> {
    const existingCount = await prisma.recruiter.count();
    if (existingCount > 0) {
      logger.info('Demo recruiters already exist, skipping seed');
      return;
    }

    logger.info('Seeding demo recruiter data...');

    // Create demo organization
    const demoOrg = await prisma.organization.create({
      data: {
        name: 'TechCorp',
        slug: 'techcorp',
        website: 'https://techcorp.com',
        description: 'Leading technology company',
        industry: 'Technology',
        size: 'LARGE',
        isVerified: true,
      },
    });

    // Create demo recruiter
    await prisma.recruiter.create({
      data: {
        email: 'recruiter@techcorp.com',
        passwordHash: bcrypt.hashSync('password123', 12),
        name: 'Demo Recruiter',
        title: 'Senior HR Manager',
        organizationId: demoOrg.id,
        role: 'ADMIN',
        isActive: true,
      },
    });

    logger.info('Demo recruiter data seeded');
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private static generateTokens(recruiterId: string, organizationId: string): AuthTokens {
    const accessToken = jwt.sign(
      { recruiterId, organizationId, type: 'access', role: 'recruiter' },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { recruiterId, organizationId, type: 'refresh' },
      env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutes in seconds
    };
  }

  private static generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  private static sanitizeRecruiter(recruiter: Recruiter): Omit<Recruiter, 'passwordHash'> {
    const { passwordHash, ...safe } = recruiter;
    return safe;
  }
}

// Export with both names for backward compatibility
export { RecruiterAuthService as AuthService };
export default RecruiterAuthService;
