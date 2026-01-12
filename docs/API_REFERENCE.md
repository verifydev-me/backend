# VerifyDev API Documentation

> Complete API Reference for all Backend Services

---

## 📋 Table of Contents

- [Auth Service](#auth-service)
- [User Service](#user-service)
- [Job Service](#job-service)
- [Recruiter Service](#recruiter-service)
- [Response Formats](#response-formats)
- [Error Codes](#error-codes)

---

## Base URL

| Environment | URL |
|-------------|-----|
| Production | `https://api.verifydev.me` |
| Development | `http://localhost:8000` |

---

## Authentication

All protected routes require a Bearer token in the Authorization header:

```
Authorization: Bearer <access_token>
```

---

# Auth Service

**Base Path:** `/api/v1/auth`  
**Internal Port:** 3001

## APIs

### 1. Initiate GitHub OAuth

```http
GET /api/v1/auth/github
```

**Access:** Public

**Description:** Starts GitHub OAuth flow. Redirects user to GitHub for authentication.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `state` | string | Optional. Include `mobile` for mobile app redirects |
| `mobile_redirect_uri` | string | Optional. Deep link for mobile (e.g., `verifydev://auth-success`) |

**Response:** Redirects to GitHub OAuth page

---

### 2. GitHub OAuth Callback

```http
GET /api/v1/auth/github/callback
```

**Access:** Public

**Description:** Handles GitHub OAuth callback. Creates user/session and returns tokens.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `code` | string | Authorization code from GitHub |
| `state` | string | State parameter from initial request |

**Response:** Redirects to frontend with tokens
```
https://verifydev.me/auth/callback?accessToken=...&refreshToken=...
```

**Creates/Updates:**
- `User` record in database
- `Session` record
- JWT tokens (access + refresh)

---

### 3. Refresh Token

```http
POST /api/v1/auth/refresh
```

**Access:** Public (requires refresh token)

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Token refreshed",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

---

### 4. Logout

```http
POST /api/v1/auth/logout
```

**Access:** Private (🔒 Requires Auth)

**Description:** Invalidates current session.

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Side Effects:**
- Sets `Session.isValid = false`

---

### 5. Logout All Devices

```http
POST /api/v1/auth/logout-all
```

**Access:** Private (🔒 Requires Auth)

**Description:** Invalidates all user sessions.

**Response:**
```json
{
  "success": true,
  "message": "Logged out from all devices"
}
```

---

### 6. Get Current User

```http
GET /api/v1/auth/me
```

**Access:** Private (🔒 Requires Auth)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "email": "john@example.com",
    "name": "John Doe",
    "avatarUrl": "https://avatars.github.com/...",
    "auraScore": 1250,
    "isVerified": true,
    "isOpenToWork": false
  }
}
```

---

## OTP Routes

**Base Path:** `/api/v1/auth/otp`

### 7. Request OTP

```http
POST /api/v1/auth/otp/request
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "type": "LOGIN"
}
```

| Type | Description |
|------|-------------|
| `SIGNUP` | New user signup |
| `LOGIN` | Login verification |
| `MOBILE_VERIFY` | Phone verification |

---

### 8. Verify OTP

```http
POST /api/v1/auth/otp/verify
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "code": "123456",
  "type": "LOGIN"
}
```

---

# User Service

**Base Path:** `/api/v1/users`, `/api/v1/projects`, `/api/v1/skills`, `/api/v1/experiences`  
**Internal Port:** 3002

## User APIs

### 1. Get My Profile

```http
GET /api/v1/users/me
```

**Access:** Private (🔒 Requires Auth)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "email": "john@example.com",
    "name": "John Doe",
    "avatarUrl": "https://...",
    "bio": "Full Stack Developer",
    "location": "Bangalore",
    "company": "TechCorp",
    "website": "https://johndoe.dev",
    "isPublic": true,
    "isOpenToWork": true,
    "isVerified": true,
    "auraScore": 1250,
    "coreCount": 3,
    "githubFollowers": 250,
    "githubRepos": 45,
    "onboardingComplete": true,
    "primaryRole": "Full Stack Engineer",
    "primaryNiche": "WEB_FULLSTACK",
    "skills": [...],
    "projects": [...]
  }
}
```

---

### 2. Update My Profile

```http
PUT /api/v1/users/me
```

**Access:** Private (🔒 Requires Auth)

**Request Body:**
```json
{
  "name": "John Doe",
  "bio": "Updated bio",
  "location": "Mumbai",
  "company": "NewCorp",
  "website": "https://newsite.com",
  "isOpenToWork": true,
  "isPublic": true
}
```

---

### 3. Sync GitHub Data

```http
POST /api/v1/users/me/sync-github
```

**Access:** Private (🔒 Requires Auth)

**Description:** Fetches latest data from GitHub API and updates user profile.

**Updates:**
- `githubFollowers`
- `githubRepos`
- `githubContributions`
- Profile info (name, bio, location, etc.)

---

### 4. Get User Settings

```http
GET /api/v1/users/settings
```

**Access:** Private (🔒 Requires Auth)

**Response:**
```json
{
  "success": true,
  "data": {
    "isPublic": true,
    "isOpenToWork": true,
    "showEmail": false,
    "showPhone": false,
    "showCgpa": false,
    "visibilityLevel": "RECRUITERS_ONLY",
    "preferredRoles": ["Backend Dev", "Full Stack"],
    "preferredLocations": ["Remote", "Bangalore"],
    "remotePreference": "FLEXIBLE"
  }
}
```

---

### 5. Update Settings

```http
PUT /api/v1/users/settings
```

**Access:** Private (🔒 Requires Auth)

**Request Body:**
```json
{
  "isOpenToWork": true,
  "showEmail": true,
  "visibilityLevel": "PUBLIC",
  "preferredRoles": ["Backend Dev"],
  "remotePreference": "REMOTE_ONLY"
}
```

---

### 6. Get My Aura

```http
GET /api/v1/users/me/aura
```

**Access:** Private (🔒 Requires Auth)

**Response:**
```json
{
  "success": true,
  "data": {
    "auraScore": 1250,
    "coreCount": 3,
    "breakdown": {
      "projects": 500,
      "skills": 300,
      "github": 450
    },
    "recentActivities": [...]
  }
}
```

---

### 7. Get Public Profile

```http
GET /api/v1/u/:username
```

**Access:** Public

**Example:** `GET /api/v1/u/johndoe`

**Response:** Same as Get My Profile (with restricted fields based on visibility settings)

---

## Project APIs

**Base Path:** `/api/v1/projects`

### 8. Get Available Repos

```http
GET /api/v1/projects/available
GET /api/v1/projects/new  # Alias
```

**Access:** Private (🔒 Requires Auth)

**Description:** Lists GitHub repos not yet added for analysis.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "my-project",
      "fullName": "johndoe/my-project",
      "url": "https://github.com/johndoe/my-project",
      "description": "A cool project",
      "language": "TypeScript",
      "stars": 25,
      "forks": 5,
      "defaultBranch": "main",
      "updatedAt": "2024-01-10T...",
      "isAlreadyAdded": false
    }
  ]
}
```

---

### 9. Add Project for Analysis

```http
POST /api/v1/projects
```

**Access:** Private (🔒 Requires Auth)

**Request Body:**
```json
{
  "repoUrl": "https://github.com/johndoe/my-project",
  "repoName": "my-project",
  "description": "Optional custom description",
  "defaultBranch": "main",
  "projectNiche": "WEB_BACKEND"
}
```

**Side Effects:**
- Creates `Project` record (status: PENDING)
- Publishes to RabbitMQ: `project.analyze.request`

**Response:**
```json
{
  "success": true,
  "message": "Project added for analysis",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "repoName": "my-project",
    "analysisStatus": "PENDING"
  }
}
```

---

### 10. Batch Add Projects

```http
POST /api/v1/projects/batch
```

**Access:** Private (🔒 Requires Auth)

**Request Body:**
```json
{
  "projects": [
    {
      "repoUrl": "https://github.com/user/project1",
      "repoName": "project1",
      "defaultBranch": "main"
    },
    {
      "repoUrl": "https://github.com/user/project2",
      "repoName": "project2"
    }
  ]
}
```

**Limit:** Max 3 projects per batch

---

### 11. Get My Projects

```http
GET /api/v1/projects
```

**Access:** Private (🔒 Requires Auth)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "repoName": "my-project",
      "description": "...",
      "analysisStatus": "COMPLETED",
      "overallScore": 85,
      "auraContribution": 150,
      "isPinned": true,
      "skills": ["TypeScript", "React", "Node.js"]
    }
  ]
}
```

---

### 12. Get Single Project

```http
GET /api/v1/projects/:projectId
```

**Access:** Private (🔒 Requires Auth)

**Response:** Full project with analysis results

---

### 13. Delete Project

```http
DELETE /api/v1/projects/:projectId
```

**Access:** Private (🔒 Requires Auth)

---

### 14. Re-analyze Project

```http
POST /api/v1/projects/:projectId/analyze
```

**Access:** Private (🔒 Requires Auth)

**Side Effects:**
- Sets status to PENDING
- Re-publishes to RabbitMQ

---

### 15. Toggle Pin

```http
POST /api/v1/projects/:projectId/pin
```

**Access:** Private (🔒 Requires Auth)

---

## Skill APIs

**Base Path:** `/api/v1/skills`

### 16. Get My Skills

```http
GET /api/v1/skills
```

**Access:** Private (🔒 Requires Auth)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "name": "TypeScript",
      "category": "LANGUAGE",
      "source": "ANALYSIS",
      "isVerified": true,
      "verifiedScore": 85,
      "projectCount": 5,
      "auraContribution": 120
    },
    {
      "id": "...",
      "name": "Leadership",
      "category": "SOFT_SKILL",
      "source": "MANUAL",
      "isVerified": false,
      "selfDeclaredLevel": "ADVANCED"
    }
  ]
}
```

---

### 17. Add Manual Skill

```http
POST /api/v1/skills/manual
```

**Access:** Private (🔒 Requires Auth)

**Request Body:**
```json
{
  "name": "Project Management",
  "category": "SOFT_SKILL",
  "selfDeclaredLevel": "INTERMEDIATE"
}
```

**Note:** Manual skills are unverified. Only `source: MANUAL` skills can be edited/deleted.

---

### 18. Update Skill

```http
PUT /api/v1/skills/:id
```

**Access:** Private (🔒 Requires Auth)

**Protection:** Only MANUAL skills can be updated. ANALYSIS/GITHUB skills are protected.

---

### 19. Delete Skill

```http
DELETE /api/v1/skills/:id
```

**Access:** Private (🔒 Requires Auth)

**Protection:** Only MANUAL skills can be deleted.

---

### 20. Get Skill Evidence

```http
GET /api/v1/skills/:id/evidence
```

**Access:** Private (🔒 Requires Auth)

**Response:**
```json
{
  "success": true,
  "data": {
    "skill": {...},
    "evidence": [
      {
        "projectId": "...",
        "projectName": "my-project",
        "usage": "Primary language",
        "linesOfCode": 5000,
        "commits": 120
      }
    ]
  }
}
```

---

## Experience APIs

**Base Path:** `/api/v1/experiences`

### 21. Get Experiences

```http
GET /api/v1/experiences
```

**Access:** Private (🔒 Requires Auth)

---

### 22. Add Experience

```http
POST /api/v1/experiences
```

**Request Body:**
```json
{
  "type": "WORK",
  "title": "Senior Developer",
  "organization": "TechCorp",
  "location": "Bangalore",
  "description": "Built microservices...",
  "startDate": "2022-01-01",
  "endDate": null,
  "isCurrent": true,
  "skills": ["Node.js", "MongoDB"]
}
```

| Type | Description |
|------|-------------|
| `WORK` | Employment |
| `EDUCATION` | Degree/Course |
| `CERTIFICATION` | Certificate |
| `VOLUNTEER` | Volunteer work |

---

### 23. Update Experience

```http
PUT /api/v1/experiences/:id
```

---

### 24. Delete Experience

```http
DELETE /api/v1/experiences/:id
```

---

# Job Service

**Base Path:** `/api/v1/jobs`, `/api/v1/applications`  
**Internal Port:** 3004

## Job APIs

### 25. List Jobs

```http
GET /api/v1/jobs
```

**Access:** Public

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20) |
| `type` | string | FULL_TIME, PART_TIME, INTERNSHIP |
| `category` | string | FRONTEND, BACKEND, FULLSTACK, etc. |
| `remote` | boolean | Filter remote jobs |
| `minSalary` | number | Minimum salary |

---

### 26. Search Jobs

```http
GET /api/v1/jobs/search?q=react&location=bangalore
```

**Access:** Public

---

### 27. Get Job Details

```http
GET /api/v1/jobs/:jobId
```

**Access:** Public

---

### 28. Get Job with Match Score

```http
GET /api/v1/jobs/:jobId/details
```

**Access:** Private (🔒 Requires Auth)

**Response:** Includes personalized match score based on user's skills

---

### 29. Apply to Job

```http
POST /api/v1/jobs/:jobId/apply
```

**Access:** Private (🔒 Requires Auth)

**Request Body:**
```json
{
  "coverLetter": "I am excited to apply...",
  "resumeUrl": "https://...",
  "portfolioUrl": "https://..."
}
```

**Side Effects:**
- Creates `Application` record
- Snapshots candidate info at application time
- Calculates match score

---

### 30. Check Can Apply

```http
GET /api/v1/jobs/:jobId/can-apply
```

**Access:** Private (🔒 Requires Auth)

**Response:**
```json
{
  "success": true,
  "data": {
    "canApply": true,
    "alreadyApplied": false,
    "meetsRequirements": true,
    "matchScore": 75
  }
}
```

---

### 31. Get Matched Jobs

```http
GET /api/v1/jobs/matched
```

**Access:** Private (🔒 Requires Auth)

**Description:** Returns jobs matching user's skills and preferences, sorted by match score.

---

## Application APIs

### 32. Get My Applications

```http
GET /api/v1/applications/my-applications
```

**Access:** Private (🔒 Requires Auth)

**Query:** `?status=PENDING|REVIEWING|SHORTLISTED`

---

### 33. Get Application

```http
GET /api/v1/applications/:id
```

**Access:** Private (🔒 Requires Auth)

---

### 34. Withdraw Application

```http
POST /api/v1/applications/:id/withdraw
```

**Access:** Private (🔒 Requires Auth)

---

# Recruiter Service

**Base Path:** `/api/v1/recruiters`, `/api/v1/candidates`  
**Internal Port:** 3005

## Recruiter Auth

### 35. Recruiter Register

```http
POST /api/v1/recruiters/auth/register
```

**Request Body:**
```json
{
  "email": "recruiter@company.com",
  "password": "securepassword",
  "name": "Jane Recruiter",
  "organizationName": "TechCorp Inc",
  "industry": "Technology"
}
```

---

### 36. Recruiter Login

```http
POST /api/v1/recruiters/auth/login
```

**Request Body:**
```json
{
  "email": "recruiter@company.com",
  "password": "securepassword"
}
```

---

## Candidate Search APIs

### 37. Search Candidates

```http
GET /api/v1/candidates/search
```

**Access:** Private (🔒 Recruiter Only)

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `skills` | string | Comma-separated skills |
| `minAura` | number | Minimum Aura score |
| `minCores` | number | Minimum Core count |
| `location` | string | Location filter |
| `niche` | string | Developer niche |
| `openToWork` | boolean | Only open to work |

---

### 38. Get Candidate Profile

```http
GET /api/v1/candidates/:userId
```

**Access:** Private (🔒 Recruiter Only)

---

### 39. Get Full Candidate Profile

```http
GET /api/v1/candidates/:userId/full
```

**Access:** Private (🔒 Recruiter Only)

**Description:** Complete profile with all analyzed projects, verified skills, and detailed breakdowns.

---

### 40. Shortlist Candidate

```http
POST /api/v1/candidates/:userId/shortlist
```

**Access:** Private (🔒 Recruiter Only)

---

### 41. Get Shortlist

```http
GET /api/v1/recruiters/shortlist
```

**Access:** Private (🔒 Recruiter Only)

---

### 42. Get Suggested Candidates

```http
POST /api/v1/recruiters/jobs/:jobId/suggested-candidates
```

**Access:** Private (🔒 Recruiter Only)

**Description:** AI-matched candidates based on job requirements.

---

### 43. Calculate Match Score

```http
POST /api/v1/recruiters/candidates/:userId/match-score
```

**Access:** Private (🔒 Recruiter Only)

**Request Body:**
```json
{
  "requiredSkills": ["TypeScript", "React"],
  "preferredSkills": ["Docker", "AWS"],
  "minExperience": 2
}
```

---

# Response Formats

## Success Response

```json
{
  "success": true,
  "message": "Optional success message",
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

## Error Response

```json
{
  "success": false,
  "message": "Error description",
  "error": {
    "code": "ERROR_CODE",
    "details": { ... }
  }
}
```

---

# Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `TOKEN_EXPIRED` | 401 | Access token expired |
| `INVALID_TOKEN` | 401 | Malformed token |
| `FORBIDDEN` | 403 | Not allowed to access resource |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request body |
| `DUPLICATE_ENTRY` | 409 | Resource already exists |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 502 | Upstream service down |
| `GATEWAY_TIMEOUT` | 504 | Request timeout |

---

# Rate Limits

| Endpoint Type | Limit |
|--------------|-------|
| General API | 100 req/min |
| Auth endpoints | 20 req/min |
| Apply to job | 10 req/min |

---

> Last Updated: January 2026
