# 📚 gRPC Quick Reference

> Fast reference for common gRPC operations

---

## 🚀 Quick Commands

```bash
# Generate proto code
./scripts/generate-proto.sh

# Test gRPC endpoints
./scripts/test-grpc.sh

# Run load tests
ts-node scripts/load-test.ts latency

# Start services
docker compose up -d user-service recruiter-service

# View logs
docker compose logs -f user-service
```

---

## 📝 Code Snippets

### Call gRPC from Recruiter Service

```typescript
import { searchCandidates, batchGetUsers } from './grpc/user-client';

// Search
const result = await searchCandidates({
  skills: ['React'],
  minAuraScore: 800,
  page: 1,
  limit: 20
});

// Batch get
const users = await batchGetUsers(['id1', 'id2', 'id3']);
```

### Test with grpcurl

```bash
# List services
grpcurl -plaintext localhost:50051 list

# Call method
grpcurl -plaintext \
  -d '{"user_id": "123"}' \
  localhost:50051 user.UserService/GetUser
```

---

## 🔧 Ports

| Service | HTTP | gRPC |
|---------|------|------|
| User Service | 3002 | 50051 |
| Job Service | 3004 | 50052 |
| Recruiter Service | 3005 | 50054 |

---

## 📊 Performance Comparison

```
HTTP:  150-300ms per call
gRPC:  20-50ms per call
Batch: 30ms for 5 users (vs 750ms HTTP)

Improvement: 70-85% faster ⚡
```

---

## 🐛 Quick Debug

```bash
# Check if service is running
docker compose ps user-service

# Check gRPC port
lsof -i :50051

# Test connection
grpcurl -plaintext localhost:50051 list

# View generated code
ls user-service/src/generated/
```

---

**Full Docs:** [GRPC_IMPLEMENTATION_GUIDE.md](./GRPC_IMPLEMENTATION_GUIDE.md)  
**Roadmap:** [docs/GRPC_MIGRATION_ROADMAP.md](./docs/GRPC_MIGRATION_ROADMAP.md)
