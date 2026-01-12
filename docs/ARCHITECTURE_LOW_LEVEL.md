# Low-Level Architecture

> Detailed Technical Implementation Guide

---

## 📋 Overview

This document provides a deep dive into implementation details, code patterns, and internal service architecture.

---

## 🔧 Service Internal Architecture

### Standard Node.js Service Structure

All Node.js services (Auth, User, Job, Recruiter) follow this pattern:

```
service-name/
├── src/
│   ├── app.ts                    # Express app configuration
│   ├── server.ts                 # HTTP server startup
│   ├── api/
│   │   └── v1/
│   │       ├── controllers/      # Request handlers
│   │       └── routes/           # Route definitions
│   ├── domain/                   # Business logic services
│   ├── config/
│   │   └── env.ts                # Environment variables
│   ├── middlewares/
│   │   ├── authenticate.ts       # JWT verification
│   │   └── error-handler.ts      # Error handling
│   ├── types/
│   │   └── index.ts              # TypeScript types
│   └── utils/
│       └── logger.ts             # Pino logger
├── prisma/
│   └── schema.prisma             # Database schema
├── package.json
├── tsconfig.json
└── Dockerfile
```

---

## 🔐 Authentication Implementation

### JWT Token Structure

```typescript
// Access Token Payload
interface AccessTokenPayload {
  userId: string;      // MongoDB ObjectId
  sessionId: string;   // Session ID for revocation
  type: 'access';
  iat: number;         // Issued at
  exp: number;         // Expires in 15 minutes
}

// Refresh Token Payload
interface RefreshTokenPayload {
  userId: string;
  sessionId: string;
  type: 'refresh';
  iat: number;
  exp: number;         // Expires in 7 days
}
```

### Token Generation (auth-service)

```typescript
// auth.controller.ts
const accessToken = jwt.sign(
  {
    userId: user.id,
    sessionId: session.id,
    type: 'access'
  },
  env.JWT_ACCESS_SECRET,
  { expiresIn: '15m' }
);

const refreshToken = jwt.sign(
  {
    userId: user.id,
    sessionId: session.id,
    type: 'refresh'
  },
  env.JWT_REFRESH_SECRET,
  { expiresIn: '7d' }
);
```

### Token Verification Middleware

```typescript
// middlewares/authenticate.ts
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  // 1. Extract token
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token required' });
  }
  
  const token = authHeader.split(' ')[1];
  
  // 2. Verify token
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
    
    // 3. Check token type
    if (payload.type !== 'access') {
      return res.status(401).json({ error: 'Invalid token type' });
    }
    
    // 4. Attach user to request
    req.user = {
      userId: payload.userId,
      sessionId: payload.sessionId
    };
    
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};
```

### Session Management

```typescript
// Session stored in MongoDB
interface Session {
  id: string;
  userId: string;
  refreshToken: string;   // Hashed
  userAgent: string;      // Browser/device info
  ipAddress: string;      // Client IP
  isValid: boolean;       // False = revoked
  expiresAt: Date;
  createdAt: Date;
}

// Logout - invalidate session
await prisma.session.update({
  where: { id: sessionId },
  data: { isValid: false }
});

// Logout all - invalidate all user sessions
await prisma.session.updateMany({
  where: { userId },
  data: { isValid: false }
});
```

---

## 🗄️ Data Access Layer

### Prisma Client Usage

```typescript
// Domain service pattern
export class UserService {
  private prisma: PrismaClient;
  
  constructor() {
    this.prisma = new PrismaClient();
  }
  
  async getUserById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        skills: true,
        projects: {
          where: { analysisStatus: 'COMPLETED' }
        },
        experiences: {
          orderBy: { startDate: 'desc' }
        }
      }
    });
  }
  
  async updateProfile(userId: string, data: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        bio: data.bio,
        location: data.location,
        updatedAt: new Date()
      }
    });
  }
}
```

### Transaction Example

```typescript
// Add project and create activity in transaction
async addProject(userId: string, repo: RepoData) {
  return this.prisma.$transaction(async (tx) => {
    // Create project
    const project = await tx.project.create({
      data: {
        userId,
        githubRepoUrl: repo.url,
        repoName: repo.name,
        description: repo.description,
        analysisStatus: 'PENDING'
      }
    });
    
    // Create activity
    await tx.activity.create({
      data: {
        userId,
        type: 'PROJECT_ADDED',
        description: `Added project: ${repo.name}`,
        auraPoints: 10,
        referenceId: project.id,
        referenceType: 'project'
      }
    });
    
    return project;
  });
}
```

---

## 📨 RabbitMQ Integration

### Publisher Implementation

```typescript
// rabbitmq/publisher.ts
class RabbitMQPublisher {
  private channel: Channel | null = null;
  
  async connect() {
    const connection = await amqp.connect(RABBITMQ_URL);
    this.channel = await connection.createChannel();
    
    // Declare exchange
    await this.channel.assertExchange('project.events', 'direct', {
      durable: true
    });
    
    // Declare queue with DLX
    await this.channel.assertQueue('project.analyze.request', {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': 'project.events.dlx'
      }
    });
    
    // Bind queue to exchange
    await this.channel.bindQueue(
      'project.analyze.request',
      'project.events',
      'project.analyze.request'
    );
  }
  
  async publishAnalyzeRequest(data: AnalyzeRequest) {
    const message = Buffer.from(JSON.stringify(data));
    
    this.channel.publish(
      'project.events',
      'project.analyze.request',
      message,
      {
        persistent: true,
        contentType: 'application/json'
      }
    );
  }
}
```

### Consumer Implementation (Go)

```go
// internal/rabbitmq/consumer.go
func (c *Consumer) StartConsuming() error {
    msgs, err := c.channel.Consume(
        "project.analyze.request",
        "",     // consumer tag
        false,  // auto-ack: false for manual ack
        false,  // exclusive
        false,  // no-local
        false,  // no-wait
        nil,    // args
    )
    if err != nil {
        return err
    }
    
    for msg := range msgs {
        go func(d amqp.Delivery) {
            var request AnalyzeRequest
            if err := json.Unmarshal(d.Body, &request); err != nil {
                d.Nack(false, false)  // Don't requeue malformed messages
                return
            }
            
            // Process
            result, err := c.analyzer.Analyze(request)
            if err != nil {
                d.Nack(false, true)  // Requeue for retry
                return
            }
            
            // Publish result
            c.publisher.Publish("project.analyzed", result)
            
            // Acknowledge
            d.Ack(false)
        }(msg)
    }
    
    return nil
}
```

---

## 🌐 Gateway Configuration

### Nginx Upstream Configuration

```nginx
# gateway/nginx.conf

# Define upstreams with load balancing
upstream auth_service {
    least_conn;
    server auth-service:3001 weight=1 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

upstream user_service {
    least_conn;
    server user-service:3002 weight=1 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

upstream job_service {
    least_conn;
    server job-service:3004 weight=1 max_fails=3 fail_timeout=30s;
    keepalive 32;
}
```

### Route Proxying

```nginx
# gateway/conf.d/api.conf

location /api/v1/auth {
    # CORS headers
    add_header 'Access-Control-Allow-Origin' '$http_origin' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type';
    add_header 'Access-Control-Allow-Credentials' 'true' always;
    
    # Handle preflight
    if ($request_method = 'OPTIONS') {
        return 204;
    }
    
    # Proxy to auth service
    proxy_pass http://auth_service;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Timeouts
    proxy_connect_timeout 30s;
    proxy_send_timeout 30s;
    proxy_read_timeout 30s;
}
```

---

## 📊 Error Handling Pattern

### Controller Error Handler

```typescript
// Standard try-catch pattern
export class UserController {
  static async getMyProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const user = await userService.getUserById(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          error: { code: 'NOT_FOUND' }
        });
      }
      
      return res.json({
        success: true,
        data: user
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get profile');
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: { code: 'INTERNAL_ERROR' }
      });
    }
  }
}
```

### Global Error Handler Middleware

```typescript
// middlewares/error-handler.ts
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error({ 
    error, 
    path: req.path, 
    method: req.method 
  }, 'Unhandled error');
  
  // Prisma errors
  if (error.name === 'PrismaClientKnownRequestError') {
    return res.status(400).json({
      success: false,
      message: 'Database error',
      error: { code: 'DB_ERROR' }
    });
  }
  
  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
      error: { code: 'INVALID_TOKEN' }
    });
  }
  
  // Default
  return res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: { code: 'INTERNAL_ERROR' }
  });
};
```

---

## 🔄 Request Lifecycle

### Complete Request Flow

```
1. CLIENT REQUEST
   │
   ├─→ Gateway receives request
   │   └─→ Check rate limits
   │   └─→ Add CORS headers
   │   └─→ Route to appropriate service
   │
2. SERVICE PROCESSING
   │
   ├─→ Middleware chain
   │   ├─→ Body parser (JSON)
   │   ├─→ Request logger
   │   └─→ authenticate (if protected)
   │
   ├─→ Controller
   │   ├─→ Validate input
   │   ├─→ Call domain service
   │   └─→ Format response
   │
   ├─→ Domain Service
   │   ├─→ Business logic
   │   └─→ Database operations (Prisma)
   │
3. RESPONSE
   │
   └─→ JSON response to client
```

### Express Middleware Stack

```typescript
// app.ts
const app = express();

// 1. Security headers
app.use(helmet());

// 2. CORS
app.use(cors({
  origin: env.ALLOWED_ORIGINS.split(','),
  credentials: true
}));

// 3. Body parsing
app.use(express.json({ limit: '10mb' }));

// 4. Request logging
app.use(requestLogger);

// 5. Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);

// 6. 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// 7. Error handler (must be last)
app.use(errorHandler);
```

---

## 🏗️ Project Analyzer Internals

### Analysis Pipeline (Go)

```go
// internal/analyzer/analyzer.go
func (a *Analyzer) Analyze(req AnalyzeRequest) (*ProjectSignals, error) {
    // 1. Clone repository
    repoPath, err := a.gitClient.Clone(req.RepoURL, req.ProjectID, req.Branch)
    if err != nil {
        return nil, fmt.Errorf("clone failed: %w", err)
    }
    defer os.RemoveAll(repoPath)
    
    // 2. Parse files
    parser := parser.NewFileParser(repoPath)
    languageStats := parser.GetLanguageStats()
    folderAnalysis := parser.AnalyzeFolders()
    
    // 3. Extract infrastructure signals
    extractor := parser.NewInfraExtractor(repoPath, req.ProjectType)
    infraSignals := extractor.Extract()
    
    // 4. Infer skills from signals
    engine := parser.NewInferenceEngine()
    industryAnalysis := engine.InferSkills(infraSignals)
    
    // 5. Run intelligence pipeline
    pipeline := intelligence.NewPipeline(repoPath, req.Niche, req.ProjectType)
    pipelineResult := pipeline.Run()
    
    // 6. Generate final verdict
    verdictEngine := intelligence.NewVerdictEngine()
    verdict := verdictEngine.Generate(industryAnalysis, pipelineResult)
    
    // 7. Compose result
    return &ProjectSignals{
        ProjectID:      req.ProjectID,
        UserID:         req.UserID,
        Status:         "completed",
        TechStack:      infraSignals.TechStack,
        Architecture:   industryAnalysis.Architecture,
        Skills:         industryAnalysis.Skills,
        Scores:         pipelineResult.Scores,
        Verdict:        verdict,
        AnalyzedAt:     time.Now(),
    }, nil
}
```

### File Scanning Limits

```go
// internal/parser/infra_extractor_helpers.go
const (
    MaxFilesScanned = 10000     // Max files to walk
    MaxFileResults  = 500       // Max results to return
    MaxFileSizeRead = 5 << 20   // 5MB max file size
)

// Skip patterns
var skipDirs = []string{
    "node_modules",
    "vendor",
    ".git",
    "dist",
    "build",
    ".next",
    "coverage",
    "__pycache__",
    "target",      // Rust
    "bin",         // Go/C#
    "obj",         // C#
}
```

---

## 🔒 Security Implementation

### Password Hashing (Recruiter)

```typescript
// Argon2 for password hashing
import * as argon2 from 'argon2';

async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4
  });
}

async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}
```

### Skill Protection Middleware

```typescript
// Protected skills cannot be edited/deleted
export const protectVerifiedSkills = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const skillId = req.params.id;
  const skill = await prisma.skill.findUnique({
    where: { id: skillId }
  });
  
  if (!skill) {
    return res.status(404).json({ error: 'Skill not found' });
  }
  
  // Only MANUAL skills can be edited
  if (skill.source !== 'MANUAL') {
    return res.status(403).json({
      success: false,
      message: 'Verified skills cannot be modified',
      error: { code: 'SKILL_PROTECTED' }
    });
  }
  
  next();
};
```

---

## 📝 Logging

### Pino Logger Configuration

```typescript
// utils/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development' 
    ? { target: 'pino-pretty' } 
    : undefined,
  base: {
    service: process.env.SERVICE_NAME
  }
});

// Usage
logger.info({ userId, projectId }, 'Project analysis started');
logger.error({ error, userId }, 'Failed to analyze project');
```

### Request Logging Middleware

```typescript
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    logger.info({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: Date.now() - start,
      ip: req.ip
    });
  });
  
  next();
};
```

---

## 🐳 Docker Configuration

### Standard Dockerfile (Node.js)

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build
RUN npx prisma generate

# Production stage
FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./

ENV NODE_ENV=production

EXPOSE 3001

CMD ["node", "dist/server.js"]
```

### Go Dockerfile

```dockerfile
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Install git for go mod download
RUN apk add --no-cache git

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /analyzer ./cmd

# Final stage
FROM alpine:latest

RUN apk add --no-cache git

COPY --from=builder /analyzer /analyzer

ENV ENV=production

CMD ["/analyzer"]
```

---

## 🔧 Health Checks

### Express Health Endpoint

```typescript
// app.ts
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'auth-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
```

### Docker Compose Health Check

```yaml
services:
  auth-service:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
```

---

> Last Updated: January 2026
