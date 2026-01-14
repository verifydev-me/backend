// ==================== gRPC CLIENT WRAPPER ====================
// Reusable gRPC client utility with connection pooling

import * as grpc from '@grpc/grpc-js';
import { logger } from './logger';

export interface GrpcClientConfig {
  address: string;
  serviceName: string;
  maxRetries?: number;
  timeout?: number;
  keepAlive?: boolean;
}

export class GrpcClient<T> {
  private client: T;
  private config: GrpcClientConfig;
  private readonly defaultTimeout = 10000; // 10 seconds

  constructor(
    serviceConstructor: new (address: string, credentials: grpc.ChannelCredentials, options?: object) => T,
    config: GrpcClientConfig
  ) {
    this.config = {
      maxRetries: 3,
      timeout: this.defaultTimeout,
      keepAlive: true,
      ...config,
    };

    const channelOptions: grpc.ChannelOptions = {
      'grpc.keepalive_time_ms': 120000, // 2 minutes
      'grpc.keepalive_timeout_ms': 20000, // 20 seconds
      'grpc.keepalive_permit_without_calls': 1,
      'grpc.http2.max_pings_without_data': 2,
      'grpc.initial_reconnect_backoff_ms': 1000,
      'grpc.max_reconnect_backoff_ms': 10000,
    };

    this.client = new serviceConstructor(
      this.config.address,
      grpc.credentials.createInsecure(),
      channelOptions
    );

    logger.info({ service: this.config.serviceName, address: this.config.address }, 'gRPC client initialized');
  }

  /**
   * Make a unary call with automatic retry and error handling
   */
  async call<TRequest, TResponse>(
    method: keyof T,
    request: TRequest,
    options?: {
      timeout?: number;
      metadata?: grpc.Metadata;
      retries?: number;
    }
  ): Promise<TResponse> {
    const timeout = options?.timeout || this.config.timeout!;
    const maxRetries = options?.retries || this.config.maxRetries!;
    const metadata = options?.metadata || new grpc.Metadata();

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.makeCall<TRequest, TResponse>(method, request, metadata, timeout);
        
        if (attempt > 0) {
          logger.info({ 
            service: this.config.serviceName, 
            method: String(method), 
            attempt 
          }, 'gRPC call succeeded after retry');
        }
        
        return result;
      } catch (error: any) {
        lastError = error;
        
        // Don't retry on certain errors
        if (this.shouldNotRetry(error)) {
          throw error;
        }

        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          logger.warn({ 
            service: this.config.serviceName, 
            method: String(method), 
            attempt, 
            delay,
            error: error.message 
          }, 'Retrying gRPC call');
          
          await this.sleep(delay);
        }
      }
    }

    logger.error({ 
      service: this.config.serviceName, 
      method: String(method), 
      error: lastError 
    }, 'gRPC call failed after all retries');
    
    throw lastError;
  }

  /**
   * Internal method to make the actual gRPC call
   */
  private makeCall<TRequest, TResponse>(
    method: keyof T,
    request: TRequest,
    metadata: grpc.Metadata,
    timeout: number
  ): Promise<TResponse> {
    return new Promise((resolve, reject) => {
      const deadline = new Date(Date.now() + timeout);
      
      (this.client as any)[method](
        request,
        metadata,
        { deadline },
        (err: grpc.ServiceError | null, response: TResponse) => {
          if (err) {
            reject(err);
          } else {
            resolve(response);
          }
        }
      );
    });
  }

  /**
   * Determine if error should not be retried
   */
  private shouldNotRetry(error: any): boolean {
    const noRetryStatuses = [
      grpc.status.INVALID_ARGUMENT,
      grpc.status.NOT_FOUND,
      grpc.status.ALREADY_EXISTS,
      grpc.status.PERMISSION_DENIED,
      grpc.status.UNAUTHENTICATED,
      grpc.status.FAILED_PRECONDITION,
    ];

    return noRetryStatuses.includes(error.code);
  }

  /**
   * Sleep utility for retry backoff
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get the underlying client instance
   */
  getClient(): T {
    return this.client;
  }

  /**
   * Close the client connection
   */
  close(): void {
    (this.client as any).close();
    logger.info({ service: this.config.serviceName }, 'gRPC client closed');
  }
}

// ==================== CLIENT POOL ====================
// Singleton pattern for reusing client connections

export class GrpcClientPool {
  private static instance: GrpcClientPool;
  private clients: Map<string, any> = new Map();

  private constructor() {}

  static getInstance(): GrpcClientPool {
    if (!GrpcClientPool.instance) {
      GrpcClientPool.instance = new GrpcClientPool();
    }
    return GrpcClientPool.instance;
  }

  getClient<T>(
    key: string,
    factory: () => GrpcClient<T>
  ): GrpcClient<T> {
    if (!this.clients.has(key)) {
      this.clients.set(key, factory());
      logger.info({ key }, 'Created new gRPC client in pool');
    }
    return this.clients.get(key);
  }

  closeAll(): void {
    this.clients.forEach((client, key) => {
      client.close();
      logger.info({ key }, 'Closed gRPC client from pool');
    });
    this.clients.clear();
  }
}
