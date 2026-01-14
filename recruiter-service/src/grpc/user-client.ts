// ==================== RECRUITER SERVICE - USER SERVICE gRPC CLIENT ====================

import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { GrpcClient, GrpcClientPool } from '../../../shared/grpc-client';

const PROTO_PATH = path.join(__dirname, '../../../../proto/user/user_service.proto');

let userServiceClient: any = null;

/**
 * Initialize User Service gRPC Client
 */
export function initUserServiceClient(): any {
  if (userServiceClient) {
    return userServiceClient;
  }

  const USER_SERVICE_GRPC = process.env.USER_SERVICE_GRPC || 'user-service:50051';

  // Load proto
  const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
    includeDirs: [path.join(__dirname, '../../../../proto')],
  });

  const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
  const UserServiceProto = protoDescriptor.user.UserService;

  // Create client using shared utility
  const client = new GrpcClient(
    UserServiceProto,
    {
      address: USER_SERVICE_GRPC,
      serviceName: 'UserService',
      maxRetries: 3,
      timeout: 10000,
    }
  );

  userServiceClient = client.getClient();
  return userServiceClient;
}

/**
 * Get user by ID
 */
export async function getUser(userId: string, fields?: string[]): Promise<any> {
  const client = initUserServiceClient();

  return new Promise((resolve, reject) => {
    client.getUser(
      { user_id: userId, fields: fields || [] },
      (err: grpc.ServiceError | null, response: any) => {
        if (err) {
          reject(err);
        } else if (response.error) {
          reject(new Error(response.error.message));
        } else {
          resolve(response.user);
        }
      }
    );
  });
}

/**
 * Batch get users - Replaces multiple HTTP calls
 */
export async function batchGetUsers(userIds: string[], fields?: string[]): Promise<any[]> {
  const client = initUserServiceClient();

  return new Promise((resolve, reject) => {
    client.batchGetUsers(
      { user_ids: userIds, fields: fields || [] },
      (err: grpc.ServiceError | null, response: any) => {
        if (err) {
          reject(err);
        } else if (response.error) {
          reject(new Error(response.error.message));
        } else {
          resolve(response.users);
        }
      }
    );
  });
}

/**
 * Search candidates - Replaces /api/internal/candidates/search
 */
export async function searchCandidates(filters: {
  skills?: string[];
  minAuraScore?: number;
  locationCity?: string;
  locationCountry?: string;
  availability?: string;
  page?: number;
  limit?: number;
}): Promise<{ candidates: any[]; pagination: any }> {
  const client = initUserServiceClient();

  const request = {
    skills: filters.skills || [],
    min_aura_score: filters.minAuraScore || 0,
    location_city: filters.locationCity || '',
    location_country: filters.locationCountry || '',
    availability: filters.availability || '',
    pagination: {
      page: filters.page || 1,
      limit: filters.limit || 20,
    },
  };

  return new Promise((resolve, reject) => {
    client.searchCandidates(
      request,
      (err: grpc.ServiceError | null, response: any) => {
        if (err) {
          reject(err);
        } else if (response.error) {
          reject(new Error(response.error.message));
        } else {
          resolve({
            candidates: response.candidates,
            pagination: response.pagination,
          });
        }
      }
    );
  });
}

/**
 * Get user profile with full details
 */
export async function getUserProfile(
  userId: string,
  options?: {
    includeProjects?: boolean;
    includeSkills?: boolean;
    includeExperiences?: boolean;
    includeEducation?: boolean;
  }
): Promise<any> {
  const client = initUserServiceClient();

  const request = {
    user_id: userId,
    include_projects: options?.includeProjects ?? true,
    include_skills: options?.includeSkills ?? true,
    include_experiences: options?.includeExperiences ?? true,
    include_education: options?.includeEducation ?? true,
  };

  return new Promise((resolve, reject) => {
    client.getUserProfile(
      request,
      (err: grpc.ServiceError | null, response: any) => {
        if (err) {
          reject(err);
        } else if (response.error) {
          reject(new Error(response.error.message));
        } else {
          resolve(response.user);
        }
      }
    );
  });
}
