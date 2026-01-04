import { Request, Response } from 'express';
import { logger } from '../../../utils/logger.js';
import type { ApiResponse, LoginDto, RegisterRecruiterDto } from '../../../types/index.js';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Note: In production, these would use a real database
// For now, this is a simple in-memory store for demo purposes
const recruiters: Map<string, any> = new Map();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  company: z.string().min(1),
  companyWebsite: z.string().url().optional(),
  position: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const JWT_SECRET = process.env.JWT_SECRET || 'recruiter-secret-key-change-in-prod';

export class AuthController {
  /**
   * POST /auth/register
   * Register a new recruiter
   */
  static async register(req: Request, res: Response<ApiResponse>): Promise<void> {
    try {
      const validation = registerSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          error: { code: 'VALIDATION_ERROR', details: validation.error.format() }
        });
        return;
      }

      const { email, password, name, company, companyWebsite, position } = validation.data;

      // Check if recruiter already exists
      const existingRecruiter = Array.from(recruiters.values()).find(r => r.email === email);
      if (existingRecruiter) {
        res.status(409).json({
          success: false,
          message: 'Email already registered',
          error: { code: 'EMAIL_EXISTS' }
        });
        return;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create recruiter
      const recruiterId = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const organizationId = `org_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const recruiter = {
        id: recruiterId,
        email,
        name,
        company,
        companyWebsite,
        position,
        organizationId,
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true,
        createdAt: new Date()
      };

      recruiters.set(recruiterId, recruiter);

      // Generate token
      const accessToken = jwt.sign(
        { recruiterId, organizationId, role: 'ADMIN' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Return without password
      const { password: _, ...recruiterData } = recruiter;

      res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: { recruiter: recruiterData, accessToken }
      });
    } catch (error) {
      logger.error({ error }, 'Registration failed');
      res.status(500).json({
        success: false,
        message: 'Registration failed',
        error: { code: 'INTERNAL_ERROR' }
      });
    }
  }

  /**
   * POST /auth/login
   * Login a recruiter
   */
  static async login(req: Request, res: Response<ApiResponse>): Promise<void> {
    try {
      const validation = loginSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          error: { code: 'VALIDATION_ERROR', details: validation.error.format() }
        });
        return;
      }

      const { email, password } = validation.data;

      // Find recruiter
      const recruiter = Array.from(recruiters.values()).find(r => r.email === email);
      if (!recruiter) {
        res.status(401).json({
          success: false,
          message: 'Invalid credentials',
          error: { code: 'INVALID_CREDENTIALS' }
        });
        return;
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, recruiter.password);
      if (!isPasswordValid) {
        res.status(401).json({
          success: false,
          message: 'Invalid credentials',
          error: { code: 'INVALID_CREDENTIALS' }
        });
        return;
      }

      // Generate token
      const accessToken = jwt.sign(
        { recruiterId: recruiter.id, organizationId: recruiter.organizationId, role: recruiter.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Update last login
      recruiter.lastLoginAt = new Date();

      // Return without password
      const { password: _, ...recruiterData } = recruiter;

      res.json({
        success: true,
        message: 'Login successful',
        data: { recruiter: recruiterData, accessToken }
      });
    } catch (error) {
      logger.error({ error }, 'Login failed');
      res.status(500).json({
        success: false,
        message: 'Login failed',
        error: { code: 'INTERNAL_ERROR' }
      });
    }
  }

  /**
   * GET /auth/me
   * Get current recruiter info
   */
  static async me(req: Request, res: Response<ApiResponse>): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          success: false,
          message: 'No token provided',
          error: { code: 'NO_TOKEN' }
        });
        return;
      }

      const token = authHeader.split(' ')[1];
      
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { recruiterId: string };
        const recruiter = recruiters.get(decoded.recruiterId);
        
        if (!recruiter) {
          res.status(401).json({
            success: false,
            message: 'Recruiter not found',
            error: { code: 'NOT_FOUND' }
          });
          return;
        }

        const { password: _, ...recruiterData } = recruiter;
        res.json({
          success: true,
          message: 'Recruiter found',
          data: recruiterData
        });
      } catch {
        res.status(401).json({
          success: false,
          message: 'Invalid token',
          error: { code: 'INVALID_TOKEN' }
        });
      }
    } catch (error) {
      logger.error({ error }, 'Failed to get current recruiter');
      res.status(500).json({
        success: false,
        message: 'Failed to get recruiter',
        error: { code: 'INTERNAL_ERROR' }
      });
    }
  }
}

export default AuthController;
