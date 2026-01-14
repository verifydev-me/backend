// ==================== JOB SERVICE - USER SERVICE gRPC CLIENT ====================
// High-performance gRPC client for inter-service communication

import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';

// Proto path - works in both dev (src) and prod (dist) environments
const PROTO_PATH = process.env.NODE_ENV === 'production'
  ? path.join(process.cwd(), 'proto/user/user_service.proto')
  : path.join(__dirname, '../../../../proto/user/user_service.proto');

const PROTO_INCLUDE_DIR = process.env.NODE_ENV === 'production'
  ? path.join(process.cwd(), 'proto')
  : path.join(__dirname, '../../../../proto');

let userServiceClient: any = null;

/**
 * Initialize User Service gRPC Client
 */
export function initUserServiceClient(): any {
  if (userServiceClient) {
    return userServiceClient;
  }

  const USER_SERVICE_GRPC = process.env.USER_SERVICE_GRPC || 'user-service:50051';

  try {
    // Load proto
    const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
      includeDirs: [PROTO_INCLUDE_DIR],
    });

    const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
    const UserServiceProto = protoDescriptor.user.UserService;

    // Create client
    userServiceClient = new UserServiceProto(
      USER_SERVICE_GRPC,
      grpc.credentials.createInsecure(),
      {
        'grpc.keepalive_time_ms': 120000,
        'grpc.keepalive_timeout_ms': 20000,
        'grpc.keepalive_permit_without_calls': 1,
      }
    );

    console.log(`✅ Job Service: gRPC client connected to ${USER_SERVICE_GRPC}`);
    return userServiceClient;
  } catch (error) {
    console.warn('Failed to initialize gRPC client:', error);
    return null;
  }
}

/**
 * Get user by ID
 */
export async function getUser(userId: string, fields?: string[]): Promise<any> {
  const client = initUserServiceClient();
  if (!client) throw new Error('gRPC client not initialized');

  return new Promise((resolve, reject) => {
    client.getUser(
      { user_id: userId, fields: fields || [] },
      { deadline: new Date(Date.now() + 10000) },
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
 * Batch get users - Replaces multiple HTTP calls with single gRPC call
 */
export async function batchGetUsers(userIds: string[], fields?: string[]): Promise<any[]> {
  const client = initUserServiceClient();
  if (!client) throw new Error('gRPC client not initialized');

  return new Promise((resolve, reject) => {
    client.batchGetUsers(
      { user_ids: userIds, fields: fields || [] },
      { deadline: new Date(Date.now() + 10000) },
      (err: grpc.ServiceError | null, response: any) => {
        if (err) {
          reject(err);
        } else if (response.error) {
          reject(new Error(response.error.message));
        } else {
          resolve(response.users || []);
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
  if (!client) throw new Error('gRPC client not initialized');

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
      { deadline: new Date(Date.now() + 10000) },
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
