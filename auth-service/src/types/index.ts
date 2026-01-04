import { Request } from 'express';

// JWT Payload
export interface JwtPayload {
  userId: string;
  sessionId: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

// Authenticated Request
export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    sessionId: string;
  };
}

// GitHub OAuth Types
export interface GitHubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

export interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
  bio: string | null;
  location: string | null;
  company: string | null;
  blog: string | null;
  twitter_username: string | null;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
}

// Auth Response Types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: UserResponse;
    tokens: AuthTokens;
  };
  error?: {
    code: string;
    details?: unknown;
  };
}

export interface UserResponse {
  id: string;
  username: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  bio: string | null;
  auraScore: number;
  coreCount: number;
  isVerified: boolean;
  isOpenToWork: boolean;
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: {
    code: string;
    details?: unknown;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}
