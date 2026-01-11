import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest, ApiResponse } from '../types/index.js';
/**
 * Authentication middleware - verifies JWT token
 * Supports both user and recruiter tokens
 * Adds user object to request if valid
 */
export declare function authenticate(req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction): Promise<void>;
/**
 * Optional authentication - doesn't require token but parses it if present
 * Supports both user and recruiter tokens
 */
export declare function optionalAuth(req: AuthenticatedRequest, _res: Response<ApiResponse>, next: NextFunction): Promise<void>;
export default authenticate;
