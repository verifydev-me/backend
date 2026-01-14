// ==================== gRPC INTERCEPTORS ====================
// Middleware for logging, authentication, and monitoring

import * as grpc from '@grpc/grpc-js';
import { logger } from './logger';

/**
 * Logging interceptor - logs all gRPC calls
 */
export function loggingInterceptor(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>,
  next: () => void
): void {
  const start = Date.now();
  const method = call.getPath();
  
  logger.info({ method, request: call.request }, 'gRPC call started');

  const originalCallback = callback;
  (call as any).callback = (err: grpc.ServiceError | null, response: any) => {
    const duration = Date.now() - start;
    
    if (err) {
      logger.error({ method, duration, error: err }, 'gRPC call failed');
    } else {
      logger.info({ method, duration }, 'gRPC call completed');
    }
    
    originalCallback(err, response);
  };

  next();
}

/**
 * Request ID interceptor - adds unique ID to each request
 */
export function requestIdInterceptor(
  call: grpc.ServerUnaryCall<any, any>,
  _callback: grpc.sendUnaryData<any>,
  next: () => void
): void {
  const requestId = generateRequestId();
  const metadata = call.metadata;
  metadata.set('request-id', requestId);
  
  (call as any).requestId = requestId;
  
  next();
}

/**
 * Authentication interceptor - validates JWT tokens
 */
export function authInterceptor(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>,
  next: () => void
): void {
  const metadata = call.metadata;
  const token = metadata.get('authorization')[0];

  if (!token) {
    const error: grpc.ServiceError = {
      name: 'UNAUTHENTICATED',
      message: 'No authentication token provided',
      code: grpc.status.UNAUTHENTICATED,
      details: '',
      metadata: new grpc.Metadata(),
    };
    callback(error, null);
    return;
  }

  // TODO: Validate JWT token
  // const user = validateToken(token);
  // (call as any).user = user;

  next();
}

/**
 * Metrics interceptor - collect metrics for monitoring
 */
export class MetricsInterceptor {
  private callCounts: Map<string, number> = new Map();
  private callDurations: Map<string, number[]> = new Map();

  intercept(
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>,
    next: () => void
  ): void {
    const method = call.getPath();
    const start = Date.now();

    // Increment call count
    this.callCounts.set(method, (this.callCounts.get(method) || 0) + 1);

    const originalCallback = callback;
    (call as any).callback = (err: grpc.ServiceError | null, response: any) => {
      const duration = Date.now() - start;
      
      // Record duration
      if (!this.callDurations.has(method)) {
        this.callDurations.set(method, []);
      }
      this.callDurations.get(method)!.push(duration);

      originalCallback(err, response);
    };

    next();
  }

  getMetrics() {
    const metrics: any = {};
    
    for (const [method, count] of this.callCounts.entries()) {
      const durations = this.callDurations.get(method) || [];
      const avgDuration = durations.length > 0 
        ? durations.reduce((a, b) => a + b, 0) / durations.length 
        : 0;
      
      metrics[method] = {
        count,
        avgDuration: Math.round(avgDuration),
        p95: this.calculatePercentile(durations, 0.95),
        p99: this.calculatePercentile(durations, 0.99),
      };
    }
    
    return metrics;
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return Math.round(sorted[index]);
  }
}

// Helper function to generate request IDs
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
