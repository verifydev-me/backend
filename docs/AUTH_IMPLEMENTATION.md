# VerifyDev Platform - Authentication Implementation Guide
## Version 1.0.0

---

## UNIFIED AUTH ARCHITECTURE

### 1. Token Structure

Both Developer and Recruiter tokens share the same JWT structure but with different claims:

```typescript
// Base JWT Claims (both roles)
interface JWTPayload {
  userId: string;        // UUID - primary identifier
  role: 'developer' | 'recruiter';
  iat: number;           // Issued at
  exp: number;           // Expiration
}

// Developer-specific claims
interface DeveloperJWTPayload extends JWTPayload {
  role: 'developer';
  githubId: string;
  username: string;
}

// Recruiter-specific claims
interface RecruiterJWTPayload extends JWTPayload {
  role: 'recruiter';
  organizationId: string;
  email: string;
}
```

### 2. Token Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                     TOKEN LIFECYCLE                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   Login/OAuth                                                │
│        │                                                     │
│        ▼                                                     │
│   ┌─────────────────┐                                        │
│   │ Generate Tokens │                                        │
│   │ - accessToken   │◄─── 15 min TTL                         │
│   │ - refreshToken  │◄─── 7 day TTL                          │
│   └────────┬────────┘                                        │
│            │                                                 │
│            ▼                                                 │
│   ┌─────────────────┐         ┌─────────────────┐            │
│   │ Frontend Store  │────────►│  localStorage   │            │
│   └────────┬────────┘         └─────────────────┘            │
│            │                                                 │
│            ▼                                                 │
│   ┌─────────────────┐                                        │
│   │  API Request    │                                        │
│   │ + Bearer Token  │                                        │
│   └────────┬────────┘                                        │
│            │                                                 │
│            ▼                                                 │
│   ┌─────────────────┐                                        │
│   │ 401 Received?   │                                        │
│   └────────┬────────┘                                        │
│       Yes  │  No                                             │
│            │   └──► Continue                                 │
│            ▼                                                 │
│   ┌─────────────────┐                                        │
│   │ Refresh Token   │                                        │
│   │ POST /refresh   │                                        │
│   └────────┬────────┘                                        │
│            │                                                 │
│       Success?                                               │
│       Yes │  No                                              │
│           │   └──► Logout User                               │
│           ▼                                                  │
│   ┌─────────────────┐                                        │
│   │ Update Tokens   │                                        │
│   │ Retry Request   │                                        │
│   └─────────────────┘                                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## MIDDLEWARE IMPLEMENTATION

### Universal Auth Middleware (Backend)

```typescript
// middleware/auth.middleware.ts

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    role: 'developer' | 'recruiter';
    githubId?: string;
    username?: string;
    organizationId?: string;
    email?: string;
  };
}

/**
 * Authenticate any role (developer or recruiter)
 */
export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authorization header required',
      error: { code: 'UNAUTHORIZED' }
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Try developer secret first
    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      // Try recruiter secret
      decoded = jwt.verify(token, process.env.RECRUITER_JWT_SECRET || process.env.JWT_SECRET!);
    }

    req.user = {
      userId: decoded.userId,
      role: decoded.role || 'developer',
      githubId: decoded.githubId,
      username: decoded.username,
      organizationId: decoded.organizationId,
      email: decoded.email,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      error: { code: 'UNAUTHORIZED' }
    });
  }
};

/**
 * Optional authentication - continue if no token, attach user if valid
 */
export const optionalAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(); // Continue without auth
  }

  const token = authHeader.split(' ')[1];

  try {
    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      decoded = jwt.verify(token, process.env.RECRUITER_JWT_SECRET || process.env.JWT_SECRET!);
    }

    req.user = {
      userId: decoded.userId,
      role: decoded.role || 'developer',
      githubId: decoded.githubId,
      username: decoded.username,
      organizationId: decoded.organizationId,
      email: decoded.email,
    };
  } catch {
    // Invalid token, continue without auth
  }

  next();
};

/**
 * Require specific role
 */
export const requireRole = (...roles: ('developer' | 'recruiter')[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: { code: 'UNAUTHORIZED' }
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}`,
        error: { code: 'FORBIDDEN' }
      });
    }

    next();
  };
};
```

---

## FRONTEND TOKEN HANDLING

### Token Selection Logic (client.ts)

```typescript
// Paths that require recruiter authentication
const RECRUITER_PATHS = [
  '/recruiters',
  '/recruiter/',
  '/candidates',
  '/interviews',
  '/templates',
];

// Request interceptor - select correct token
apiClient.interceptors.request.use((config) => {
  const url = config.url || '';
  
  // Check if this is a recruiter-specific endpoint
  const isRecruiterPath = RECRUITER_PATHS.some(path => url.includes(path));
  
  const recruiterToken = useRecruiterStore.getState().accessToken;
  const userToken = useAuthStore.getState().accessToken;
  
  // Use recruiter token ONLY for recruiter paths
  let token = null;
  if (isRecruiterPath && recruiterToken) {
    token = recruiterToken;
  } else if (userToken) {
    token = userToken;
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
});
```

---

## ROLE-BASED ACCESS CONTROL MATRIX

| Endpoint Pattern | Developer | Recruiter | Public |
|------------------|-----------|-----------|--------|
| `/api/v1/auth/*` | ✅ | ❌ | ✅ (login/register) |
| `/api/v1/users/me/*` | ✅ | ❌ | ❌ |
| `/api/v1/users/u/*` | ✅ | ✅ | ✅ |
| `/api/v1/jobs` (GET) | ✅ | ✅ | ✅ |
| `/api/v1/jobs` (POST) | ❌ | ✅ | ❌ |
| `/api/v1/jobs/:id/apply` | ✅ | ❌ | ❌ |
| `/api/v1/applications/my-*` | ✅ | ❌ | ❌ |
| `/api/v1/applications/job/*` | ❌ | ✅ | ❌ |
| `/api/v1/recruiters/*` | ❌ | ✅ | ✅ (login/register) |
| `/api/v1/recruiter/jobs/*` | ❌ | ✅ | ❌ |
| `/api/v1/messages/*` | ✅ | ✅ | ❌ |
| `/api/v1/interviews/*` | ✅ | ✅ | ❌ |
| `/api/v1/chat/*` | ✅ | ✅ | ❌ |

---

## MULTI-ROLE USER HANDLING

A user CAN be both a Developer and a Recruiter (different accounts):

### Scenario: Same Browser, Both Roles

```
localStorage:
├── auth-storage (Developer)
│   ├── accessToken: "eyJ..."
│   └── refreshToken: "eyJ..."
│
└── recruiter-storage (Recruiter)
    ├── accessToken: "eyJ..."
    └── refreshToken: "eyJ..."
```

### Token Selection Rules:

1. **Recruiter paths** (`/recruiters`, `/candidates`, etc.): Use `recruiter-storage.accessToken`
2. **All other paths**: Use `auth-storage.accessToken`
3. **No token available**: Request proceeds without auth (backend decides if allowed)

### Frontend Implementation:

```typescript
// In client.ts interceptor
const isRecruiterPath = RECRUITER_PATHS.some(path => url.includes(path));

if (isRecruiterPath && recruiterToken) {
  token = recruiterToken;
} else if (userToken) {
  token = userToken;
}
```

---

## ERROR HANDLING

### Standard Auth Errors

| HTTP Code | Error Code | When |
|-----------|------------|------|
| 401 | `UNAUTHORIZED` | No token, invalid token, expired token |
| 403 | `FORBIDDEN` | Valid token but wrong role |
| 400 | `VALIDATION_ERROR` | Invalid refresh token format |

### Error Response Format

```json
{
  "success": false,
  "message": "Human-readable error message",
  "error": {
    "code": "ERROR_CODE"
  }
}
```

---

## JWT SECRET CONFIGURATION

### Environment Variables Required

```env
# Developer authentication (auth-service)
JWT_SECRET=your-developer-jwt-secret
JWT_REFRESH_SECRET=your-developer-refresh-secret

# Recruiter authentication (recruiter-service)
# Falls back to JWT_SECRET if not set
RECRUITER_JWT_SECRET=your-recruiter-jwt-secret
RECRUITER_REFRESH_SECRET=your-recruiter-refresh-secret
```

### Token Generation

```typescript
// Developer token
const accessToken = jwt.sign(
  { userId, role: 'developer', githubId, username },
  process.env.JWT_SECRET,
  { expiresIn: '15m' }
);

// Recruiter token
const accessToken = jwt.sign(
  { userId, role: 'recruiter', organizationId, email },
  process.env.RECRUITER_JWT_SECRET || process.env.JWT_SECRET,
  { expiresIn: '15m' }
);
```

---

## CHECKLIST: Auth Implementation

- [x] JWT tokens include `role` claim
- [x] Frontend stores separate tokens for developer/recruiter
- [x] API client selects correct token based on path
- [x] Token refresh implemented for both roles
- [x] Backend middleware validates token and extracts role
- [x] Role-based route protection implemented
- [x] Error responses follow standard format
- [x] Logout clears correct token store

---

**END OF DOCUMENT**
