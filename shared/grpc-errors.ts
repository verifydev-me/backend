// ==================== gRPC ERROR HANDLING ====================
// Convert application errors to gRPC errors and vice versa

import * as grpc from '@grpc/grpc-js';

// Custom error types
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends Error {
  public details: Array<{ field: string; message: string }>;
  
  constructor(message: string, details?: Array<{ field: string; message: string }>) {
    super(message);
    this.name = 'ValidationError';
    this.details = details || [];
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class InternalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InternalError';
  }
}

/**
 * Convert application error to gRPC error
 */
export function toGrpcError(error: Error): grpc.ServiceError {
  let code = grpc.status.INTERNAL;
  let message = error.message || 'Internal server error';
  const metadata = new grpc.Metadata();

  if (error instanceof NotFoundError) {
    code = grpc.status.NOT_FOUND;
  } else if (error instanceof ValidationError) {
    code = grpc.status.INVALID_ARGUMENT;
    if (error.details && error.details.length > 0) {
      metadata.set('validation-errors', JSON.stringify(error.details));
    }
  } else if (error instanceof UnauthorizedError) {
    code = grpc.status.UNAUTHENTICATED;
  } else if (error instanceof ForbiddenError) {
    code = grpc.status.PERMISSION_DENIED;
  } else if (error instanceof ConflictError) {
    code = grpc.status.ALREADY_EXISTS;
  } else if (error instanceof InternalError) {
    code = grpc.status.INTERNAL;
    // Don't expose internal error details
    message = 'An internal error occurred';
  }

  const grpcError = {
    name: error.name,
    message,
    code,
    metadata,
  } as grpc.ServiceError;

  return grpcError;
}

/**
 * Convert gRPC error to application error
 */
export function fromGrpcError(error: grpc.ServiceError): Error {
  switch (error.code) {
    case grpc.status.NOT_FOUND:
      return new NotFoundError(error.message);
    
    case grpc.status.INVALID_ARGUMENT:
      const validationDetails = error.metadata?.get('validation-errors');
      const details = validationDetails ? JSON.parse(validationDetails[0] as string) : undefined;
      return new ValidationError(error.message, details);
    
    case grpc.status.UNAUTHENTICATED:
      return new UnauthorizedError(error.message);
    
    case grpc.status.PERMISSION_DENIED:
      return new ForbiddenError(error.message);
    
    case grpc.status.ALREADY_EXISTS:
      return new ConflictError(error.message);
    
    case grpc.status.INTERNAL:
    default:
      return new InternalError(error.message);
  }
}

/**
 * Error handler middleware for gRPC calls
 */
export function grpcErrorHandler<TRequest, TResponse>(
  handler: (request: TRequest) => Promise<TResponse>
): (call: grpc.ServerUnaryCall<TRequest, TResponse>, callback: grpc.sendUnaryData<TResponse>) => void {
  return async (call, callback) => {
    try {
      const response = await handler(call.request);
      callback(null, response);
    } catch (error: any) {
      const grpcError = toGrpcError(error);
      callback(grpcError, null);
    }
  };
}
