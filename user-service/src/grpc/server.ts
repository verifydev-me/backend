// ==================== USER SERVICE - gRPC SERVER ====================

import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { GrpcServer } from '../../../shared/grpc-server';
import { UserGrpcService } from './user-grpc.service';

// Proto path - works in both dev (src) and prod (dist) environments
// In Docker, proto files are at /app/proto
const PROTO_PATH = process.env.NODE_ENV === 'production'
  ? path.join(process.cwd(), 'proto/user/user_service.proto')
  : path.join(__dirname, '../../../../proto/user/user_service.proto');

const PROTO_INCLUDE_DIR = process.env.NODE_ENV === 'production'
  ? path.join(process.cwd(), 'proto')
  : path.join(__dirname, '../../../../proto');


/**
 * Start the User Service gRPC server
 */
export async function startGrpcServer(port: number = 50051): Promise<GrpcServer> {
  // Load proto file
  const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
    includeDirs: [PROTO_INCLUDE_DIR],
  });

  const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
  const userProto = protoDescriptor.user;

  // Create gRPC server
  const server = new GrpcServer('UserService', { port });

  // Initialize service implementation
  const userService = new UserGrpcService();

  // Add service to server
  server.addService(userProto.UserService.service, {
    getUser: userService.getUser.bind(userService),
    batchGetUsers: userService.batchGetUsers.bind(userService),
    searchCandidates: userService.searchCandidates.bind(userService),
    getUserProfile: userService.getUserProfile.bind(userService),
    updateUserProfile: userService.updateUserProfile.bind(userService),
    watchUserUpdates: userService.watchUserUpdates.bind(userService),
  });

  // Start server
  await server.start();

  return server;
}

/**
 * Main entry point when running as standalone
 */
if (require.main === module) {
  const port = parseInt(process.env.GRPC_PORT || '50051', 10);

  startGrpcServer(port)
    .then(() => {
      console.log(`✅ User Service gRPC server is running on port ${port}`);
    })
    .catch((error) => {
      console.error('Failed to start gRPC server:', error);
      process.exit(1);
    });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully...');
    process.exit(0);
  });
}
