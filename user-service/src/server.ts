import 'dotenv/config';

import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import prisma from './prisma/client.js';
import { startGrpcServer } from './grpc/server.js';
import type { GrpcServer } from '../../shared/grpc-server.js';

let grpcServer: GrpcServer | null = null;

async function bootstrap() {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('✅ PostgreSQL connected');

    const app = createApp();

    // Start HTTP server
    const server = app.listen(env.PORT, () => {
      logger.info(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   👤 User Service Started                                 ║
║   ───────────────────────────────────────────────────     ║
║   HTTP Port:   ${String(env.PORT).padEnd(8)}                            ║
║   gRPC Port:   ${(process.env.GRPC_PORT || '50051').padEnd(8)}                            ║
║   Environment: ${env.NODE_ENV.padEnd(15)}                 ║
║   API Version: ${env.API_VERSION}                         ║
║                                                           ║
║   Private Endpoints:                                      ║
║   • GET  /api/v1/users/me          - My profile           ║
║   • PUT  /api/v1/users/me          - Update profile       ║
║   • GET  /api/v1/users/settings    - My settings          ║
║   • PUT  /api/v1/users/settings    - Update settings      ║
║   • GET  /api/v1/users/me/aura     - My aura summary      ║
║                                                           ║
║   Public Endpoints:                                       ║
║   • GET  /api/v1/u/:username       - Public profile       ║
║   • GET  /api/v1/u/:username/aura  - Public aura          ║
║   • GET  /api/v1/u/:username/projects - Public projects   ║
║                                                           ║
║   gRPC Endpoints (Internal):                              ║
║   • GetUser          - Get user by ID                     ║
║   • BatchGetUsers    - Batch get users                    ║
║   • SearchCandidates - Search candidates                  ║
║   • GetUserProfile   - Get full user profile              ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
      `);
    });

    // Start gRPC server
    const grpcPort = parseInt(process.env.GRPC_PORT || '50051', 10);
    try {
      grpcServer = await startGrpcServer(grpcPort);
      logger.info(`✅ gRPC server running on port ${grpcPort}`);
    } catch (grpcError) {
      logger.warn({ error: grpcError }, 'gRPC server failed to start - continuing with HTTP only');
    }

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down...`);
      
      // Shutdown gRPC server first
      if (grpcServer) {
        try {
          await grpcServer.shutdown();
          logger.info('gRPC server closed');
        } catch (err) {
          logger.warn({ error: err }, 'Error closing gRPC server');
        }
      }
      
      server.close(async () => {
        await prisma.$disconnect();
        logger.info('HTTP server closed');
        process.exit(0);
      });

      setTimeout(() => {
        logger.error('Forced shutdown');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

bootstrap();

