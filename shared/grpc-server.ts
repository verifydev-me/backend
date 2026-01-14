// ==================== gRPC SERVER WRAPPER ====================
// Reusable gRPC server utility for all microservices

import * as grpc from '@grpc/grpc-js';
import { logger } from './logger';

export interface GrpcServerConfig {
  port: number;
  host?: string;
  maxConnections?: number;
  keepAliveTime?: number;
  keepAliveTimeout?: number;
}

export class GrpcServer {
  private server: grpc.Server;
  private config: GrpcServerConfig;
  private serviceName: string;

  constructor(serviceName: string, config: GrpcServerConfig) {
    this.serviceName = serviceName;
    this.config = {
      host: '0.0.0.0',
      maxConnections: 100,
      keepAliveTime: 120000, // 2 minutes
      keepAliveTimeout: 20000, // 20 seconds
      ...config,
    };

    this.server = new grpc.Server({
      'grpc.max_concurrent_streams': this.config.maxConnections,
      'grpc.keepalive_time_ms': this.config.keepAliveTime,
      'grpc.keepalive_timeout_ms': this.config.keepAliveTimeout,
      'grpc.http2.min_time_between_pings_ms': 60000,
      'grpc.http2.max_pings_without_data': 2,
    });
  }

  /**
   * Add a service to the gRPC server
   */
  addService(definition: grpc.ServiceDefinition, implementation: grpc.UntypedServiceImplementation): void {
    this.server.addService(definition, implementation);
    logger.info(`Added gRPC service: ${Object.keys(definition).join(', ')}`);
  }

  /**
   * Start the gRPC server
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      const address = `${this.config.host}:${this.config.port}`;
      
      this.server.bindAsync(
        address,
        grpc.ServerCredentials.createInsecure(),
        (err, port) => {
          if (err) {
            logger.error({ err }, `Failed to start ${this.serviceName} gRPC server`);
            reject(err);
            return;
          }

          this.server.start();
          logger.info({ port, service: this.serviceName }, `✅ gRPC Server running on ${address}`);
          resolve();
        }
      );
    });
  }

  /**
   * Gracefully shutdown the server
   */
  async shutdown(): Promise<void> {
    return new Promise((resolve) => {
      logger.info({ service: this.serviceName }, 'Shutting down gRPC server...');
      
      this.server.tryShutdown((err) => {
        if (err) {
          logger.warn({ err }, 'Force shutting down gRPC server');
          this.server.forceShutdown();
        }
        
        logger.info({ service: this.serviceName }, 'gRPC server shut down successfully');
        resolve();
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.warn('Force shutting down gRPC server after timeout');
        this.server.forceShutdown();
        resolve();
      }, 10000);
    });
  }

  /**
   * Get the underlying gRPC server instance
   */
  getServer(): grpc.Server {
    return this.server;
  }
}
