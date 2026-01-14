# 🔗 gRPC Implementation Guide

> **VerifyDev Microservices mein gRPC kaise implement hua hai - Complete Deep Dive**  
> **Version**: 1.0 | **Last Updated**: January 2026

---

## 🚀 New to gRPC? START HERE!

### What is gRPC? (Simple Explanation)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     REST vs gRPC - Samjho Difference                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  REST (HTTP/JSON):                                                           │
│  ─────────────────                                                           │
│  Service A ──HTTP POST──> {"userId": "123"} ──> Service B                   │
│  Service A <──HTTP 200──< {"name": "John", "email": "..."} <── Service B    │
│                                                                              │
│  Problems:                                                                   │
│  - JSON parse/stringify overhead                                             │
│  - Text-based (larger payload)                                               │
│  - New HTTP connection every time                                            │
│  - No type safety between services                                           │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  gRPC (HTTP/2 + Protocol Buffers):                                           │
│  ─────────────────────────────────                                           │
│  Service A ──binary──> [compact bytes] ──> Service B                        │
│  Service A <──binary──< [compact bytes] <── Service B                       │
│                                                                              │
│  Benefits:                                                                   │
│  ✅ 10x faster serialization (binary, not text)                              │
│  ✅ Smaller payloads (Protocol Buffers compression)                          │
│  ✅ HTTP/2 multiplexing (one connection, many requests)                      │
│  ✅ Type-safe contracts (.proto files)                                       │
│  ✅ Streaming support (real-time data)                                       │
│  ✅ Built-in keepalive & connection pooling                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Why We Use gRPC in VerifyDev

| Use Case | Before (REST) | After (gRPC) | Improvement |
|----------|---------------|--------------|-------------|
| Get 50 user profiles | 50 HTTP calls × 100ms = 5sec | 1 batch call = 200ms | **25x faster** |
| Search candidates | JSON encoding overhead | Binary protocol | **10x smaller payloads** |
| Real-time updates | Polling every 5 seconds | Server streaming | **Instant updates** |
| Connection overhead | New connection per request | HTTP/2 multiplexing | **100+ concurrent requests on 1 connection** |

---

## 📁 File Structure

```
backend/
├── proto/                            # 📜 Protocol Buffer definitions
│   ├── common/
│   │   ├── types.proto               # Shared types (Skill, Experience, Location)
│   │   └── errors.proto              # Error response format
│   ├── user/
│   │   └── user_service.proto        # UserService RPCs (6 methods)
│   └── job/
│       └── job_service.proto         # JobService RPCs (7 methods)
│
├── shared/                           # 🔧 Reusable gRPC utilities
│   ├── grpc-server.ts                # Server wrapper with keepalive config
│   ├── grpc-client.ts                # Client wrapper with retry logic
│   ├── grpc-interceptors.ts          # Logging, auth interceptors
│   └── grpc-errors.ts                # Error handling utilities
│
├── user-service/src/grpc/            # 📤 gRPC SERVER (provides services)
│   ├── server.ts                     # Starts gRPC server on port 50051
│   └── user-grpc.service.ts          # Implements UserService methods
│
└── recruiter-service/src/grpc/       # 📥 gRPC CLIENT (consumes services)
    ├── user-client.ts                # Calls UserService from recruiter
    └── migration-example.ts          # How to migrate from REST to gRPC
```

---

## 📜 Proto Files Explained

### 1. Common Types (`proto/common/types.proto`)

**Purpose:** Shared data structures used by all services

```protobuf
syntax = "proto3";
package common;

// ========== TIMESTAMPS ==========
message Timestamp {
  int64 seconds = 1;    // Unix timestamp
  int32 nanos = 2;      // Nanoseconds (for high precision)
}

// ========== PAGINATION ==========
message PaginationRequest {
  int32 page = 1;       // Page number (1-indexed)
  int32 limit = 2;      // Items per page
}

message PaginationResponse {
  int32 page = 1;
  int32 limit = 2;
  int32 total = 3;
  int32 total_pages = 4;
}

// ========== DOMAIN TYPES ==========
message Skill {
  string id = 1;
  string name = 2;              // "React", "Node.js"
  string category = 3;          // "FRAMEWORK", "DATABASE"
  int32 proficiency_level = 4;  // 1-5
  bool verified = 5;
  float confidence_score = 6;   // 0.0-1.0
}

message Location {
  string city = 1;
  string state = 2;
  string country = 3;
  string timezone = 4;
}

// ========== ENUMS ==========
enum ExperienceLevel {
  EXPERIENCE_LEVEL_UNSPECIFIED = 0;
  ENTRY = 1;
  JUNIOR = 2;
  MID = 3;
  SENIOR = 4;
  LEAD = 5;
}

enum ApplicationStatus {
  APPLICATION_STATUS_UNSPECIFIED = 0;
  PENDING = 1;
  REVIEWING = 2;
  SHORTLISTED = 3;
  INTERVIEWING = 4;
  OFFERED = 5;
  REJECTED = 6;
}
```

**Key Points:**
- `syntax = "proto3"` - Use Proto3 syntax (latest)
- Fields are numbered (1, 2, 3) - These IDs NEVER CHANGE for backward compatibility
- `repeated` = Array, `optional` = Can be null
- Enums start with UNSPECIFIED = 0 (always!)

---

### 2. User Service (`proto/user/user_service.proto`)

**Purpose:** Define RPC methods for user data operations

```protobuf
syntax = "proto3";
package user;

import "common/types.proto";
import "common/errors.proto";

// ========== SERVICE DEFINITION ==========
service UserService {
  // Unary RPCs (request → response)
  rpc GetUser(GetUserRequest) returns (GetUserResponse);
  rpc BatchGetUsers(BatchGetUsersRequest) returns (BatchGetUsersResponse);
  rpc SearchCandidates(SearchCandidatesRequest) returns (SearchCandidatesResponse);
  rpc GetUserProfile(GetUserProfileRequest) returns (GetUserProfileResponse);
  rpc UpdateUserProfile(UpdateUserProfileRequest) returns (UpdateUserProfileResponse);
  
  // Server Streaming RPC (request → stream of responses)
  rpc WatchUserUpdates(WatchUserRequest) returns (stream UserUpdateEvent);
}

// ========== REQUEST/RESPONSE MESSAGES ==========

// Get single user
message GetUserRequest {
  string user_id = 1;
  repeated string fields = 2;  // Optional: ["name", "email", "skills"]
}

message GetUserResponse {
  User user = 1;
  common.ErrorResponse error = 2;  // NULL if success
}

// Batch get (optimization!)
message BatchGetUsersRequest {
  repeated string user_ids = 1;  // ["id1", "id2", "id3"]
  repeated string fields = 2;
}

message BatchGetUsersResponse {
  repeated User users = 1;       // All users in one response
  common.ErrorResponse error = 2;
}

// User message (the actual data)
message User {
  string id = 1;
  string email = 2;
  string name = 3;
  string username = 4;
  string avatar_url = 5;
  int32 aura_score = 6;
  common.UserProfile profile = 7;
  repeated common.Skill skills = 8;
  repeated common.Experience experiences = 9;
}
```

**Key RPC Types:**

| Type | Pattern | Use Case |
|------|---------|----------|
| **Unary** | Request → Response | Get user, Update profile |
| **Server Streaming** | Request → Stream of Responses | Watch real-time updates |
| **Client Streaming** | Stream of Requests → Response | Upload large files |
| **Bidirectional** | Stream ↔ Stream | Chat, Live collaboration |

---

### 3. Job Service (`proto/job/job_service.proto`)

**Purpose:** Job and application operations

```protobuf
service JobService {
  // Get job details
  rpc GetJob(GetJobRequest) returns (GetJobResponse);
  
  // Get applications for a job
  rpc GetApplications(GetApplicationsRequest) returns (GetApplicationsResponse);
  
  // Update application status
  rpc UpdateApplicationStatus(UpdateApplicationStatusRequest) returns (UpdateApplicationStatusResponse);
  
  // Add recruiter notes
  rpc AddApplicationNote(AddApplicationNoteRequest) returns (AddApplicationNoteResponse);
  
  // Real-time application notifications
  rpc StreamApplicationUpdates(StreamApplicationsRequest) returns (stream ApplicationUpdateEvent);
}
```

---

## 🔧 Shared Utilities Explained

### 1. GrpcServer (`shared/grpc-server.ts`)

**Purpose:** Reusable server wrapper with production settings

```typescript
// ==================== KEY CONFIGURATION ====================

export class GrpcServer {
  constructor(serviceName: string, config: GrpcServerConfig) {
    this.server = new grpc.Server({
      // Max concurrent streams (parallel requests)
      'grpc.max_concurrent_streams': 100,
      
      // Keepalive - detect dead connections
      'grpc.keepalive_time_ms': 120000,      // Ping every 2 minutes
      'grpc.keepalive_timeout_ms': 20000,    // Wait 20 sec for pong
      
      // HTTP/2 ping settings
      'grpc.http2.min_time_between_pings_ms': 60000,
      'grpc.http2.max_pings_without_data': 2,
    });
  }

  // Add a service implementation
  addService(definition, implementation) {
    this.server.addService(definition, implementation);
  }

  // Start listening
  async start(): Promise<void> {
    await this.server.bindAsync(
      `${this.config.host}:${this.config.port}`,
      grpc.ServerCredentials.createInsecure(),
      (err, port) => { ... }
    );
    this.server.start();
  }

  // Graceful shutdown
  async shutdown(): Promise<void> {
    this.server.tryShutdown((err) => { ... });
    // Force shutdown after 10 seconds
  }
}
```

**Why This Matters:**
- Keepalive prevents connection drops in Docker/K8s
- Max concurrent streams limits resource usage
- Graceful shutdown prevents data loss

---

### 2. GrpcClient (`shared/grpc-client.ts`)

**Purpose:** Client wrapper with retry logic and connection pooling

```typescript
// ==================== KEY FEATURES ====================

export class GrpcClient<T> {
  constructor(serviceConstructor, config: GrpcClientConfig) {
    const channelOptions = {
      // Connection keepalive
      'grpc.keepalive_time_ms': 120000,
      'grpc.keepalive_timeout_ms': 20000,
      'grpc.keepalive_permit_without_calls': 1,
      
      // Reconnection backoff (exponential)
      'grpc.initial_reconnect_backoff_ms': 1000,  // Start at 1 sec
      'grpc.max_reconnect_backoff_ms': 10000,     // Max 10 sec
    };

    this.client = new serviceConstructor(
      config.address,
      grpc.credentials.createInsecure(),
      channelOptions
    );
  }

  // Make calls with automatic retry
  async call<TRequest, TResponse>(
    method: keyof T,
    request: TRequest,
    options?: { timeout?: number; retries?: number }
  ): Promise<TResponse> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.makeCall(method, request, timeout);
      } catch (error) {
        // Don't retry client errors (NOT_FOUND, INVALID_ARGUMENT)
        if (this.shouldNotRetry(error)) throw error;
        
        // Exponential backoff before retry
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        await this.sleep(delay);
      }
    }
    throw lastError;
  }

  // Errors that should NOT be retried
  shouldNotRetry(error) {
    const noRetryStatuses = [
      grpc.status.INVALID_ARGUMENT,  // Bad request
      grpc.status.NOT_FOUND,         // Resource doesn't exist
      grpc.status.PERMISSION_DENIED, // Auth failed
      grpc.status.UNAUTHENTICATED,
    ];
    return noRetryStatuses.includes(error.code);
  }
}

// ==================== CLIENT POOL (Singleton) ====================

export class GrpcClientPool {
  private clients: Map<string, any> = new Map();

  // Get or create client (reuse connections!)
  getClient<T>(key: string, factory: () => GrpcClient<T>): GrpcClient<T> {
    if (!this.clients.has(key)) {
      this.clients.set(key, factory());
    }
    return this.clients.get(key);
  }
}
```

**Why Connection Pooling Matters:**
- Creating gRPC connections is expensive
- Pool reuses existing connections
- HTTP/2 multiplexing = 100s of requests on 1 connection

---

## 📤 Server Implementation (user-service)

### `user-service/src/grpc/server.ts`

```typescript
// 1. Load proto file
const PROTO_PATH = path.join(__dirname, '../../../../proto/user/user_service.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,         // field_name, not fieldName
  longs: String,          // BigInt → String
  enums: String,          // Enum values as strings
  defaults: true,         // Include default values
  oneofs: true,           // Include oneof information
  includeDirs: [pathToProtoDir],  // Where to find imports
});

// 2. Create server
const server = new GrpcServer('UserService', { port: 50051 });

// 3. Add service implementation
server.addService(userProto.UserService.service, {
  getUser: userService.getUser.bind(userService),
  batchGetUsers: userService.batchGetUsers.bind(userService),
  searchCandidates: userService.searchCandidates.bind(userService),
  // ... other methods
});

// 4. Start!
await server.start();
console.log('✅ gRPC Server running on port 50051');
```

### `user-service/src/grpc/user-grpc.service.ts`

```typescript
export class UserGrpcService {
  
  // Implement GetUser RPC
  async getUser(
    call: grpc.ServerUnaryCall<GetUserRequest, GetUserResponse>,
    callback: grpc.sendUnaryData<GetUserResponse>
  ) {
    try {
      const { user_id, fields } = call.request;
      
      // Fetch from database (same as REST handler)
      const user = await prisma.user.findUnique({
        where: { id: user_id },
        select: fields.length ? this.buildSelect(fields) : undefined,
      });

      if (!user) {
        callback(null, { 
          user: null, 
          error: { code: 'NOT_FOUND', message: 'User not found' } 
        });
        return;
      }

      callback(null, { user: this.toProtoUser(user), error: null });
    } catch (error) {
      callback({
        code: grpc.status.INTERNAL,
        message: error.message,
      });
    }
  }

  // Implement BatchGetUsers RPC (50 users in 1 call!)
  async batchGetUsers(call, callback) {
    const { user_ids } = call.request;
    
    const users = await prisma.user.findMany({
      where: { id: { in: user_ids } },
    });

    callback(null, { 
      users: users.map(u => this.toProtoUser(u)),
      error: null 
    });
  }

  // Implement Server Streaming RPC
  watchUserUpdates(call: grpc.ServerWritableStream<WatchUserRequest, UserUpdateEvent>) {
    const { user_ids } = call.request;
    
    // Subscribe to Redis pub/sub for updates
    const subscriber = redisClient.subscribe('user:updates');
    
    subscriber.on('message', (channel, message) => {
      const event = JSON.parse(message);
      
      if (user_ids.includes(event.user_id)) {
        // Stream event to client
        call.write({
          user_id: event.user_id,
          event_type: event.type,
          user: event.user,
          timestamp: { seconds: Date.now() / 1000, nanos: 0 },
        });
      }
    });

    // Cleanup when client disconnects
    call.on('cancelled', () => {
      subscriber.unsubscribe();
    });
  }
}
```

---

## 📥 Client Implementation (recruiter-service)

### `recruiter-service/src/grpc/user-client.ts`

```typescript
// Initialize client (singleton pattern)
export function initUserServiceClient() {
  if (userServiceClient) return userServiceClient;

  const USER_SERVICE_GRPC = process.env.USER_SERVICE_GRPC || 'user-service:50051';

  // Load proto
  const packageDefinition = protoLoader.loadSync(PROTO_PATH, { ... });
  const UserServiceProto = protoDescriptor.user.UserService;

  // Create client with shared wrapper
  const client = new GrpcClient(UserServiceProto, {
    address: USER_SERVICE_GRPC,
    serviceName: 'UserService',
    maxRetries: 3,
    timeout: 10000,
  });

  userServiceClient = client.getClient();
  return userServiceClient;
}

// ==================== WRAPPER FUNCTIONS ====================

// Get single user
export async function getUser(userId: string): Promise<User> {
  const client = initUserServiceClient();

  return new Promise((resolve, reject) => {
    client.getUser(
      { user_id: userId },
      (err, response) => {
        if (err) reject(err);
        else if (response.error) reject(new Error(response.error.message));
        else resolve(response.user);
      }
    );
  });
}

// Batch get - THE KILLER FEATURE!
export async function batchGetUsers(userIds: string[]): Promise<User[]> {
  const client = initUserServiceClient();

  return new Promise((resolve, reject) => {
    // One call for 50 users instead of 50 HTTP calls!
    client.batchGetUsers(
      { user_ids: userIds },
      (err, response) => {
        if (err) reject(err);
        else resolve(response.users);
      }
    );
  });
}

// Search candidates
export async function searchCandidates(filters: SearchFilters) {
  const client = initUserServiceClient();

  const request = {
    skills: filters.skills,
    min_aura_score: filters.minAuraScore,
    location_city: filters.city,
    pagination: { page: 1, limit: 20 },
  };

  return new Promise((resolve, reject) => {
    client.searchCandidates(request, (err, response) => {
      if (err) reject(err);
      else resolve({
        candidates: response.candidates,
        pagination: response.pagination,
      });
    });
  });
}
```

---

## 🔄 Migration from REST to gRPC

### Before (REST - Multiple HTTP Calls)

```typescript
// recruiter-service wants to show 50 applicant details
async function getApplicantDetails(applicationIds: string[]) {
  const applicants = [];
  
  for (const id of applicationIds) {
    // 50 HTTP calls! Slow!
    const response = await fetch(`http://user-service:3002/api/v1/users/${id}`);
    const user = await response.json();
    applicants.push(user);
  }
  
  return applicants;
}
// Total time: 50 calls × 100ms = 5 seconds 😱
```

### After (gRPC - One Batch Call)

```typescript
// recruiter-service using gRPC
async function getApplicantDetails(userIds: string[]) {
  // ONE CALL for all 50 users!
  const users = await batchGetUsers(userIds);
  return users;
}
// Total time: 1 call × 200ms = 200ms 🚀
```

---

## 🐛 Debugging gRPC

### Enable Verbose Logging

```bash
# In terminal before starting service
export GRPC_VERBOSITY=DEBUG
export GRPC_TRACE=all

# Or in code
process.env.GRPC_VERBOSITY = 'DEBUG';
```

### Common Error Codes

| Code | Name | Meaning | Solution |
|------|------|---------|----------|
| 1 | CANCELLED | Client cancelled request | Check client timeout |
| 2 | UNKNOWN | Server threw unknown error | Check server logs |
| 3 | INVALID_ARGUMENT | Bad request data | Fix request payload |
| 4 | DEADLINE_EXCEEDED | Request timed out | Increase timeout |
| 5 | NOT_FOUND | Resource doesn't exist | Check ID |
| 7 | PERMISSION_DENIED | Auth failed | Check credentials |
| 12 | UNIMPLEMENTED | Method not found | Check proto mismatch |
| 13 | INTERNAL | Server error | Check server logs |
| 14 | UNAVAILABLE | Service down | Check if service running |

### Check gRPC Connectivity

```bash
# Install grpcurl (gRPC version of curl)
brew install grpcurl  # Mac
# or
go install github.com/fullstorydev/grpcurl/cmd/grpcurl@latest

# List available services
grpcurl -plaintext localhost:50051 list

# Call a method
grpcurl -plaintext \
  -d '{"user_id": "abc123"}' \
  localhost:50051 user.UserService/GetUser
```

---

## 📊 Performance Comparison

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    BENCHMARK: REST vs gRPC                                   │
│                    (50 user profiles fetch)                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  REST (50 HTTP calls):                                                       │
│  ┌──────────────────────────────────────────────────────┐                   │
│  │████████████████████████████████████████████████████│ 5000ms              │
│  └──────────────────────────────────────────────────────┘                   │
│                                                                              │
│  gRPC (1 batch call):                                                        │
│  ┌████│                                                                      │
│  └────┘ 200ms                                                                │
│                                                                              │
│  Improvement: 25x faster! 🚀                                                 │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Payload Size (1 user):                                                      │
│                                                                              │
│  JSON:          │████████████████████│ 1.5 KB                               │
│  Protocol Buf:  │███████│ 0.5 KB                                            │
│                                                                              │
│  Improvement: 3x smaller! 📉                                                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Quick Reference

### Adding New RPC

1. **Define in .proto:**
```protobuf
service UserService {
  // Add new RPC
  rpc GetUserStats(GetUserStatsRequest) returns (GetUserStatsResponse);
}

message GetUserStatsRequest {
  string user_id = 1;
}

message GetUserStatsResponse {
  int32 total_projects = 1;
  int32 total_skills = 2;
}
```

2. **Implement in server:**
```typescript
// user-service/src/grpc/user-grpc.service.ts
async getUserStats(call, callback) {
  const { user_id } = call.request;
  const stats = await this.calculateStats(user_id);
  callback(null, stats);
}
```

3. **Add to server registration:**
```typescript
server.addService(userProto.UserService.service, {
  // ... existing methods
  getUserStats: userService.getUserStats.bind(userService),
});
```

4. **Use in client:**
```typescript
export async function getUserStats(userId: string) {
  const client = initUserServiceClient();
  return new Promise((resolve, reject) => {
    client.getUserStats({ user_id: userId }, (err, response) => {
      if (err) reject(err);
      else resolve(response);
    });
  });
}
```

---

## 📚 File Reference

| File | Purpose | Key Functions |
|------|---------|---------------|
| `proto/common/types.proto` | Shared types | Skill, Location, Pagination |
| `proto/user/user_service.proto` | User RPCs | GetUser, BatchGetUsers, SearchCandidates |
| `proto/job/job_service.proto` | Job RPCs | GetJob, GetApplications, StreamUpdates |
| `shared/grpc-server.ts` | Server wrapper | start(), shutdown(), addService() |
| `shared/grpc-client.ts` | Client wrapper | call(), retry logic, pooling |
| `user-service/src/grpc/server.ts` | User gRPC server | Starts on port 50051 |
| `user-service/src/grpc/user-grpc.service.ts` | RPC implementations | All business logic |
| `recruiter-service/src/grpc/user-client.ts` | User client | getUser(), batchGetUsers() |

---

*gRPC is powerful but requires understanding. Master this guide and you'll be able to optimize any microservice communication!* 🚀
