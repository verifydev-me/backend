# gRPC Migration Implementation Guide

This document details the implementation of gRPC for inter-service communication between the **Recruiter Service** (Consumer) and **User Service** (Provider).

## 🚀 Overview

We have migrated high-throughput internal API calls from REST (HTTP/1.1) to gRPC (HTTP/2 + Protobuf) to improve performance and type safety.

- **Provider**: User Service (Exposes `UserService` on port `50051`)
- **Consumer**: Recruiter Service (Consumes `UserService` via Client)
- **Protocol**: Proto3
- **Transport**: HTTP/2

---

## 🛠 Implementation Details

### 1. Protocol Buffers (`/proto`)
We defined the service contract using Protocol Buffers to ensure strict typing.
- `proto/user/user_service.proto`: Defines the `GetUserProfile`, `GetBulkUsers`, and `UpdateUserAura` methods.
- `proto/common/types.proto`: Shared data structures.

### 2. Shared Library (`/shared`)
Created a robust shared library to handle gRPC boilerplate:
- **`grpc-server.ts`**: Generic gRPC server wrapper with error handling and logging.
- **`grpc-client.ts`**: Connection logic with connection pooling and fault tolerance.
- **Interceptors**: Logging and Error mapping interceptors.

### 3. User Service (Server)
- **File**: `user-service/src/grpc/user-grpc.service.ts`
- Implements the methods defined in the `.proto` file.
- Connects to Prisma/Database to fetch real data.
- Maps domain errors to gRPC Status Codes (e.g., `NOT_FOUND`).

### 4. Recruiter Service (Client)
- **File**: `recruiter-service/src/grpc/user-client.ts`
- Creates a `GrpcClientPool` to manage connections efficiently.
- Provides typed wrapper functions (e.g., `getUserProfile(id)`) for the business logic to use.

### 5. Docker Configuration
- Updated **Dockerfiles** to build from the `backend` root context to allow access to shared files.
- Updated **docker-compose.yml** to expose gRPC ports:
  - User Service: `50051`
  - Recruiter Service: `50054`

---

## 🧪 How to Test

### 1. Generate Proto Files
If you modify `.proto` files, regenerate the TypeScript code:
```bash
npm run proto:generate
```

### 2. Run Services
Start the stack with the new configuration:
```bash
docker compose up -d user-service recruiter-service
```

### 3. Verify Connectivity
Use the provided test script to check if the server is responding:
```bash
npm run test:grpc
# or
./scripts/test-grpc.sh
```

### 4. Load Testing
Run the load test to compare performance (Optional):
```bash
npm run test:load
```

---

## 📂 File Structure

```
backend/
├── proto/                  # Service Definitions
├── shared/                 # Shared gRPC Utils
├── user-service/
│   └── src/grpc/           # Server Implementation
├── recruiter-service/
│   └── src/grpc/           # Client Implementation
└── scripts/                # Generation & Test Scripts
```
