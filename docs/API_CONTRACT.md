# VerifyDev Platform - CANONICAL API CONTRACT
## Version 1.0.0 | Last Updated: 2026-01-13

---

## GLOBAL STANDARDS

### Base URL
```
Production: https://api.verifydev.io
Development: http://localhost:8000
```

### Authentication
- **Mechanism**: Bearer JWT Token
- **Header**: `Authorization: Bearer <token>`
- **Token Lifetime**: Access Token = 15 minutes, Refresh Token = 7 days

### Standard Response Format
```json
{
  "success": true,
  "data": <T>,
  "message": "Optional human-readable message",
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Standard Error Format
```json
{
  "success": false,
  "message": "Error description",
  "error": {
    "code": "ERROR_CODE",
    "details": {}
  }
}
```

### Error Codes
| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Valid token but insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `CONFLICT` | 409 | Resource already exists |
| `INTERNAL_ERROR` | 500 | Server error |

---

## JWT TOKEN STRUCTURE

### User Token (Developer)
```json
{
  "userId": "uuid",
  "role": "developer",
  "githubId": "string",
  "username": "string",
  "iat": 1234567890,
  "exp": 1234567890
}
```

### Recruiter Token
```json
{
  "userId": "uuid",
  "role": "recruiter",
  "organizationId": "uuid",
  "email": "string",
  "iat": 1234567890,
  "exp": 1234567890
}
```

---

# AUTH SERVICE ENDPOINTS

## 1. GitHub OAuth Initiate
```
GET /api/v1/auth/github
Auth: NO
Role: PUBLIC
```

**Response**: HTTP 302 Redirect to GitHub OAuth

---

## 2. GitHub OAuth Callback
```
GET /api/v1/auth/github/callback
Auth: NO
Role: PUBLIC
Query: code, state
```

**Response**: HTTP 302 Redirect to frontend with tokens
```
{frontendUrl}/auth/callback?accessToken=xxx&refreshToken=xxx
```

---

## 3. Get Current User
```
GET /api/v1/auth/me
Auth: YES
Role: developer
```

**Request Headers**:
```
Authorization: Bearer <accessToken>
```

**Response 200**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "githubId": "12345",
    "username": "johndoe",
    "email": "john@example.com",
    "name": "John Doe",
    "avatarUrl": "https://...",
    "bio": "Software Engineer",
    "location": "San Francisco",
    "company": "TechCorp",
    "websiteUrl": "https://johndoe.dev",
    "githubUrl": "https://github.com/johndoe",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

**Response 401**:
```json
{
  "success": false,
  "message": "Invalid or expired token",
  "error": { "code": "UNAUTHORIZED" }
}
```

---

## 4. Refresh Token
```
POST /api/v1/auth/refresh
Auth: NO
Role: PUBLIC
```

**Request Body**:
```json
{
  "refreshToken": "string"
}
```

**Response 200**:
```json
{
  "success": true,
  "data": {
    "accessToken": "string",
    "refreshToken": "string"
  }
}
```

---

## 5. Logout
```
POST /api/v1/auth/logout
Auth: YES
Role: developer
```

**Response 200**:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## 6. Logout All Sessions
```
POST /api/v1/auth/logout-all
Auth: YES
Role: developer
```

**Response 200**:
```json
{
  "success": true,
  "message": "Logged out from all devices"
}
```

---

# USER SERVICE ENDPOINTS

## 7. Get My Profile
```
GET /api/v1/users/me
Auth: YES
Role: developer
```

**Response 200**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "username": "johndoe",
    "email": "john@example.com",
    "name": "John Doe",
    "bio": "Software Engineer",
    "avatarUrl": "https://...",
    "location": "San Francisco",
    "company": "TechCorp",
    "websiteUrl": "https://johndoe.dev",
    "githubUrl": "https://github.com/johndoe",
    "isStudent": false,
    "currentInstitution": null,
    "graduationYear": null,
    "fieldOfStudy": null,
    "onboardingCompleted": true,
    "profileCompleteness": 85,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

---

## 8. Update My Profile
```
PUT /api/v1/users/me
Auth: YES
Role: developer
```

**Request Body**:
```json
{
  "name": "string (optional)",
  "bio": "string (optional)",
  "location": "string (optional)",
  "company": "string (optional)",
  "websiteUrl": "string (optional)"
}
```

**Response 200**: Same as Get My Profile

---

## 9. Get Public Profile
```
GET /api/v1/users/u/:username
Auth: NO
Role: PUBLIC
```

**Response 200**: Same structure as Get My Profile (public fields only)

---

## 10. Sync GitHub Data
```
POST /api/v1/users/me/sync-github
Auth: YES
Role: developer
```

**Response 200**:
```json
{
  "success": true,
  "data": {
    "message": "GitHub data synced successfully"
  }
}
```

---

## 11. Get Onboarding Status
```
GET /api/v1/users/me/onboarding/status
Auth: YES
Role: developer
```

**Response 200**:
```json
{
  "success": true,
  "data": {
    "completed": false,
    "currentStep": 1,
    "steps": {
      "step1": false,
      "step2": false
    }
  }
}
```

---

## 12. Update Onboarding Step 1
```
POST /api/v1/users/me/onboarding/step/1
Auth: YES
Role: developer
```

**Request Body**:
```json
{
  "name": "string (required)",
  "bio": "string (optional)"
}
```

**Response 200**:
```json
{
  "success": true,
  "data": {
    "step": 1,
    "completed": true
  }
}
```

---

## 13. Update Onboarding Step 2
```
POST /api/v1/users/me/onboarding/step/2
Auth: YES
Role: developer
```

**Request Body**:
```json
{
  "isStudent": true,
  "currentInstitution": "string (optional)",
  "graduationYear": 2025,
  "fieldOfStudy": "string (optional)"
}
```

**Response 200**:
```json
{
  "success": true,
  "data": {
    "step": 2,
    "completed": true
  }
}
```

---

## 14. Skip Onboarding Step 2
```
POST /api/v1/users/me/onboarding/step/2/skip
Auth: YES
Role: developer
```

**Response 200**:
```json
{
  "success": true,
  "data": {
    "step": 2,
    "skipped": true
  }
}
```

---

## 15. Complete Onboarding
```
POST /api/v1/users/me/onboarding/complete
Auth: YES
Role: developer
```

**Response 200**:
```json
{
  "success": true,
  "data": {
    "completed": true,
    "user": { /* UserProfile */ }
  }
}
```

---

## 16. Get Available Repos
```
GET /api/v1/users/me/repos
Auth: YES
Role: developer
```

**Response 200**:
```json
{
  "success": true,
  "data": [
    {
      "id": 123456,
      "name": "awesome-project",
      "fullName": "johndoe/awesome-project",
      "description": "An awesome project",
      "language": "TypeScript",
      "stars": 42,
      "forks": 10,
      "url": "https://github.com/johndoe/awesome-project",
      "isPrivate": false,
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

## 17. Get My Projects
```
GET /api/v1/users/me/projects
Auth: YES
Role: developer
```

**Response 200**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "githubRepoId": 123456,
      "name": "awesome-project",
      "description": "An awesome project",
      "url": "https://github.com/johndoe/awesome-project",
      "language": "TypeScript",
      "stars": 42,
      "forks": 10,
      "analysisStatus": "COMPLETED",
      "qualityScore": 85,
      "technologies": ["TypeScript", "React", "Node.js"],
      "analyzedAt": "2024-01-01T00:00:00Z",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

## 18. Analyze Project
```
POST /api/v1/users/me/projects/analyze
Auth: YES
Role: developer
```

**Request Body**:
```json
{
  "repoId": 123456,
  "repoName": "awesome-project",
  "repoUrl": "https://github.com/johndoe/awesome-project"
}
```

**Response 202**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "awesome-project",
    "analysisStatus": "ANALYZING",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

---

## 19. Get My Skills
```
GET /api/v1/users/me/skills
Auth: YES
Role: developer
```

**Response 200**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "TypeScript",
      "category": "Language",
      "score": 85,
      "isVerified": true,
      "verifiedBy": "PROJECT_ANALYSIS",
      "evidenceCount": 5,
      "lastUsed": "2024-01-01T00:00:00Z",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

## 20. Add Manual Skill
```
POST /api/v1/skills/manual
Auth: YES
Role: developer
```

**Request Body**:
```json
{
  "name": "Python",
  "evidence": [
    {
      "url": "https://github.com/johndoe/python-project",
      "description": "Built a Python API"
    }
  ]
}
```

**Response 201**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Python",
    "category": "Language",
    "score": 50,
    "isVerified": false,
    "verifiedBy": "MANUAL",
    "evidenceCount": 1
  }
}
```

---

## 21. Get My Aura
```
GET /api/v1/users/me/aura
Auth: YES
Role: developer
```

**Response 200**:
```json
{
  "success": true,
  "data": {
    "level": 5,
    "score": 450,
    "trend": "UP",
    "rank": "top 10%",
    "breakdown": {
      "skillDiversity": 80,
      "projectQuality": 75,
      "activityConsistency": 60,
      "communityImpact": 45
    },
    "history": [
      { "date": "2024-01-01", "score": 400 },
      { "date": "2024-01-08", "score": 450 }
    ]
  }
}
```

---

## 22. Get Public Aura
```
GET /api/v1/users/u/:username/aura
Auth: NO
Role: PUBLIC
```

**Response 200**: Same as Get My Aura

---

## 23. Get Settings
```
GET /api/v1/users/settings
Auth: YES
Role: developer
```

**Response 200**:
```json
{
  "success": true,
  "data": {
    "emailNotifications": true,
    "jobAlerts": true,
    "profileVisibility": "PUBLIC",
    "showEmail": false,
    "showLocation": true
  }
}
```

---

## 24. Update Settings
```
PUT /api/v1/users/settings
Auth: YES
Role: developer
```

**Request Body**:
```json
{
  "emailNotifications": true,
  "jobAlerts": true,
  "profileVisibility": "PUBLIC",
  "showEmail": false,
  "showLocation": true
}
```

**Response 200**: Same as Get Settings

---

# JOB SERVICE ENDPOINTS

## 25. List Jobs
```
GET /api/v1/jobs
Auth: NO
Role: PUBLIC
Query: page, limit
```

**Response 200**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Senior Frontend Engineer",
      "description": "...",
      "requirements": "...",
      "responsibilities": "...",
      "type": "FULL_TIME",
      "level": "SENIOR",
      "category": "FRONTEND",
      "location": "San Francisco",
      "isRemote": true,
      "salaryMin": 150000,
      "salaryMax": 200000,
      "salaryCurrency": "USD",
      "requiredSkills": ["React", "TypeScript"],
      "preferredSkills": ["GraphQL"],
      "minAuraScore": 300,
      "status": "ACTIVE",
      "applicationsCount": 25,
      "viewsCount": 500,
      "createdAt": "2024-01-01T00:00:00Z",
      "expiresAt": "2024-02-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

## 26. Search Jobs
```
GET /api/v1/jobs/search
Auth: NO
Role: PUBLIC
Query: search, skills, type, level, category, isRemote, minSalary, location, sortBy, page, limit
```

**Response 200**: Same as List Jobs

---

## 27. Get Matched Jobs
```
GET /api/v1/jobs/matched
Auth: YES
Role: developer
Query: page, limit
```

**Response 200**: Same as List Jobs with additional match data

---

## 28. Get Recommended Jobs
```
GET /api/v1/jobs/recommended
Auth: YES
Role: developer
Query: limit
```

**Response 200**: Array of Job objects

---

## 29. Get Job Details
```
GET /api/v1/jobs/:jobId
Auth: NO
Role: PUBLIC
```

**Response 200**:
```json
{
  "success": true,
  "data": { /* Full Job object */ }
}
```

---

## 30. Get Job With Match Score
```
GET /api/v1/jobs/:jobId/match
Auth: YES (optional)
Role: developer
```

**Response 200**:
```json
{
  "success": true,
  "data": {
    /* Job object */
    "matchScore": 85,
    "matchedSkills": ["React", "TypeScript"],
    "missingSkills": ["GraphQL"]
  }
}
```

---

## 31. Check Can Apply
```
GET /api/v1/jobs/:jobId/can-apply
Auth: YES
Role: developer
```

**Response 200**:
```json
{
  "success": true,
  "data": {
    "canApply": true,
    "reason": null,
    "hasApplied": false
  }
}
```

---

## 32. Apply to Job
```
POST /api/v1/jobs/:jobId/apply
Auth: YES
Role: developer
```

**Request Body**:
```json
{
  "coverLetter": "string (optional)"
}
```

**Response 201**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "jobId": "uuid",
    "userId": "uuid",
    "status": "PENDING",
    "matchScore": 85,
    "coverLetter": "...",
    "appliedAt": "2024-01-01T00:00:00Z"
  }
}
```

---

## 33. Create Job (Recruiter)
```
POST /api/v1/jobs
Auth: YES
Role: recruiter
```

**Request Body**:
```json
{
  "title": "string (required)",
  "description": "string (required)",
  "requirements": "string (optional)",
  "responsibilities": "string (optional)",
  "type": "FULL_TIME|PART_TIME|CONTRACT|INTERNSHIP|FREELANCE",
  "level": "ENTRY|JUNIOR|MID|SENIOR|LEAD|PRINCIPAL",
  "category": "FRONTEND|BACKEND|FULLSTACK|MOBILE|DEVOPS|DATA_ENGINEERING|MACHINE_LEARNING|SECURITY|DESIGN|QA|GENERAL",
  "location": "string",
  "isRemote": true,
  "salaryMin": 100000,
  "salaryMax": 150000,
  "salaryCurrency": "USD",
  "requiredSkills": ["React", "TypeScript"],
  "preferredSkills": ["GraphQL"],
  "minAuraScore": 100,
  "expiresAt": "2024-02-01T00:00:00Z"
}
```

**Response 201**:
```json
{
  "success": true,
  "data": {
    "job": { /* Job object */ }
  }
}
```

---

## 34. Update Job (Recruiter)
```
PUT /api/v1/jobs/:jobId
Auth: YES
Role: recruiter
```

**Request Body**: Same as Create Job (all fields optional) + `status`

**Response 200**:
```json
{
  "success": true,
  "data": {
    "job": { /* Updated Job object */ }
  }
}
```

---

## 35. Delete Job (Recruiter)
```
DELETE /api/v1/jobs/:jobId
Auth: YES
Role: recruiter
```

**Response 200**:
```json
{
  "success": true,
  "message": "Job deleted successfully"
}
```

---

## 36. Get Recruiter's Jobs
```
GET /api/v1/recruiter/jobs
Auth: YES
Role: recruiter
Query: page, limit
```

**Response 200**:
```json
{
  "success": true,
  "data": {
    "jobs": [ /* Job objects */ ],
    "meta": {
      "total": 10
    }
  }
}
```

---

## 37. Get Job Analytics
```
GET /api/v1/recruiter/jobs/:jobId/analytics
Auth: YES
Role: recruiter
```

**Response 200**:
```json
{
  "success": true,
  "data": {
    "analytics": {
      "views": 500,
      "applications": 25,
      "shortlisted": 5,
      "hired": 1,
      "viewsThisWeek": 50,
      "applicationsThisWeek": 5
    }
  }
}
```

---

# APPLICATION SERVICE ENDPOINTS

## 38. Get My Applications
```
GET /api/v1/applications/my-applications
Auth: YES
Role: developer
Query: status, page, limit
```

**Response 200**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "jobId": "uuid",
      "userId": "uuid",
      "status": "PENDING",
      "matchScore": 85,
      "coverLetter": "...",
      "appliedAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z",
      "job": { /* Job summary */ }
    }
  ]
}
```

---

## 39. Get Application By ID
```
GET /api/v1/applications/:id
Auth: YES
Role: developer | recruiter
```

**Response 200**:
```json
{
  "success": true,
  "data": { /* Full Application with job details */ }
}
```

---

## 40. Withdraw Application
```
POST /api/v1/applications/:id/withdraw
Auth: YES
Role: developer
```

**Request Body**:
```json
{
  "reason": "string (optional)"
}
```

**Response 200**:
```json
{
  "success": true,
  "data": {
    "withdrawn": true
  }
}
```

---

## 41. Get Applications for Job (Recruiter)
```
GET /api/v1/applications/job/:jobId
Auth: YES
Role: recruiter
Query: status, page, limit
```

**Response 200**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "jobId": "uuid",
      "userId": "uuid",
      "status": "PENDING",
      "matchScore": 85,
      "candidateSkills": ["React", "TypeScript"],
      "candidateAura": 450,
      "appliedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

## 42. Update Application Status (Recruiter)
```
PATCH /api/v1/applications/:id/status
Auth: YES
Role: recruiter
```

**Request Body**:
```json
{
  "status": "REVIEWING|SHORTLISTED|INTERVIEW|OFFER|ACCEPTED|REJECTED",
  "notes": "string (optional)"
}
```

**Response 200**:
```json
{
  "success": true,
  "data": { /* Updated Application */ }
}
```

---

## 43. Add Recruiter Note
```
POST /api/v1/applications/:id/notes
Auth: YES
Role: recruiter
```

**Request Body**:
```json
{
  "notes": "string"
}
```

**Response 200**:
```json
{
  "success": true,
  "data": { /* Updated Application */ }
}
```

---

# MESSAGE SERVICE ENDPOINTS

## 44. Send Message
```
POST /api/v1/messages
Auth: YES
Role: developer | recruiter
```

**Request Body**:
```json
{
  "receiverId": "uuid (required)",
  "content": "string (required)",
  "subject": "string (optional)",
  "jobId": "uuid (optional)",
  "applicationId": "uuid (optional)"
}
```

**Response 201**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "senderId": "uuid",
    "receiverId": "uuid",
    "content": "...",
    "subject": "...",
    "isRead": false,
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

---

## 45. Send Bulk Message (Recruiter)
```
POST /api/v1/messages/bulk
Auth: YES
Role: recruiter
```

**Request Body**:
```json
{
  "receiverIds": ["uuid", "uuid"],
  "subject": "string (optional)",
  "content": "string (required)",
  "jobId": "uuid (optional)"
}
```

**Response 201**:
```json
{
  "success": true,
  "data": {
    "sentCount": 5,
    "messages": [ /* Message objects */ ]
  }
}
```

---

## 46. Get Inbox
```
GET /api/v1/messages/inbox
Auth: YES
Role: developer | recruiter
Query: page, limit, isRead
```

**Response 200**:
```json
{
  "success": true,
  "data": [ /* Message objects with sender info */ ],
  "pagination": { /* pagination object */ }
}
```

---

## 47. Get Sent Messages
```
GET /api/v1/messages/sent
Auth: YES
Role: developer | recruiter
Query: page, limit
```

**Response 200**: Same structure as inbox

---

## 48. Get Conversation
```
GET /api/v1/messages/conversation/:otherUserId
Auth: YES
Role: developer | recruiter
Query: jobId (optional)
```

**Response 200**:
```json
{
  "success": true,
  "data": [ /* Message objects */ ]
}
```

---

## 49. Mark Message as Read
```
POST /api/v1/messages/:id/read
Auth: YES
Role: developer | recruiter
```

**Response 200**:
```json
{
  "success": true,
  "data": { /* Updated Message */ }
}
```

---

## 50. Mark All as Read
```
POST /api/v1/messages/mark-all-read
Auth: YES
Role: developer | recruiter
```

**Response 200**:
```json
{
  "success": true,
  "data": {
    "markedCount": 5
  }
}
```

---

## 51. Get Unread Count
```
GET /api/v1/messages/unread-count
Auth: YES
Role: developer | recruiter
```

**Response 200**:
```json
{
  "success": true,
  "data": {
    "count": 5
  }
}
```

---

## 52. Delete Message
```
DELETE /api/v1/messages/:id
Auth: YES
Role: developer | recruiter
```

**Response 200**:
```json
{
  "success": true,
  "message": "Message deleted"
}
```

---

# INTERVIEW SERVICE ENDPOINTS

## 53. Schedule Interview
```
POST /api/v1/interviews
Auth: YES
Role: recruiter
```

**Request Body**:
```json
{
  "applicationId": "uuid (required)",
  "candidateId": "uuid (required)",
  "jobId": "uuid (required)",
  "type": "PHONE_SCREEN|VIDEO_CALL|TECHNICAL|HR_ROUND|FINAL_ROUND|IN_PERSON",
  "scheduledAt": "2024-01-15T10:00:00Z",
  "duration": 60,
  "location": "string (optional)",
  "meetingLink": "string (optional)",
  "notes": "string (optional)"
}
```

**Response 201**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "applicationId": "uuid",
    "candidateId": "uuid",
    "recruiterId": "uuid",
    "jobId": "uuid",
    "type": "VIDEO_CALL",
    "status": "SCHEDULED",
    "scheduledAt": "2024-01-15T10:00:00Z",
    "duration": 60,
    "meetingLink": "...",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

---

## 54. Get Interview
```
GET /api/v1/interviews/:id
Auth: YES
Role: developer | recruiter
```

**Response 200**:
```json
{
  "success": true,
  "data": { /* Interview with candidate and job details */ }
}
```

---

## 55. Get Upcoming Interviews
```
GET /api/v1/interviews/upcoming
Auth: YES
Role: developer | recruiter
Query: status, type, startDate, endDate
```

**Response 200**:
```json
{
  "success": true,
  "data": [ /* Interview objects */ ]
}
```

---

## 56. Confirm Interview
```
POST /api/v1/interviews/:id/confirm
Auth: YES
Role: developer
```

**Response 200**:
```json
{
  "success": true,
  "data": { /* Updated Interview with status: CONFIRMED */ }
}
```

---

## 57. Reschedule Interview
```
POST /api/v1/interviews/:id/reschedule
Auth: YES
Role: recruiter
```

**Request Body**:
```json
{
  "newScheduledAt": "2024-01-16T10:00:00Z",
  "reason": "string (optional)"
}
```

**Response 200**:
```json
{
  "success": true,
  "data": { /* Updated Interview */ }
}
```

---

## 58. Cancel Interview
```
POST /api/v1/interviews/:id/cancel
Auth: YES
Role: developer | recruiter
```

**Request Body**:
```json
{
  "reason": "string (required)"
}
```

**Response 200**:
```json
{
  "success": true,
  "data": { /* Updated Interview with status: CANCELLED */ }
}
```

---

## 59. Complete Interview
```
POST /api/v1/interviews/:id/complete
Auth: YES
Role: recruiter
```

**Request Body**:
```json
{
  "feedback": "string (optional)",
  "rating": 4,
  "notes": "string (optional)"
}
```

**Response 200**:
```json
{
  "success": true,
  "data": { /* Updated Interview with status: COMPLETED */ }
}
```

---

## 60. Mark No-Show
```
POST /api/v1/interviews/:id/no-show
Auth: YES
Role: recruiter
```

**Request Body**:
```json
{
  "reason": "string (optional)"
}
```

**Response 200**:
```json
{
  "success": true,
  "data": { /* Updated Interview with status: NO_SHOW */ }
}
```

---

# RECRUITER SERVICE ENDPOINTS

## 61. Register Recruiter
```
POST /api/v1/recruiters/register
Auth: NO
Role: PUBLIC
```

**Request Body**:
```json
{
  "email": "string (required)",
  "password": "string (required, min 8 chars)",
  "name": "string (required)",
  "organizationName": "string (required)",
  "organizationWebsite": "string (optional)",
  "position": "string (optional)"
}
```

**Response 201**:
```json
{
  "success": true,
  "data": {
    "recruiter": {
      "id": "uuid",
      "email": "recruiter@company.com",
      "name": "Jane Smith",
      "companyName": "TechCorp",
      "companyWebsite": "https://techcorp.com",
      "position": "HR Manager",
      "verified": false,
      "createdAt": "2024-01-01T00:00:00Z"
    },
    "accessToken": "string",
    "refreshToken": "string"
  }
}
```

---

## 62. Login Recruiter
```
POST /api/v1/recruiters/login
Auth: NO
Role: PUBLIC
```

**Request Body**:
```json
{
  "email": "string (required)",
  "password": "string (required)"
}
```

**Response 200**:
```json
{
  "success": true,
  "data": {
    "recruiter": { /* Recruiter object */ },
    "accessToken": "string",
    "refreshToken": "string"
  }
}
```

---

## 63. Refresh Recruiter Token
```
POST /api/v1/recruiters/refresh
Auth: NO
Role: PUBLIC
```

**Request Body**:
```json
{
  "refreshToken": "string"
}
```

**Response 200**:
```json
{
  "success": true,
  "data": {
    "accessToken": "string",
    "refreshToken": "string"
  }
}
```

---

## 64. Get Current Recruiter
```
GET /api/v1/recruiters/me
Auth: YES
Role: recruiter
```

**Response 200**:
```json
{
  "success": true,
  "data": { /* Recruiter object */ }
}
```

---

## 65. Update Recruiter Profile
```
PUT /api/v1/recruiters/profile
Auth: YES
Role: recruiter
```

**Request Body**:
```json
{
  "name": "string (optional)",
  "companyName": "string (optional)",
  "companyWebsite": "string (optional)",
  "companyLogo": "string (optional)",
  "position": "string (optional)"
}
```

**Response 200**:
```json
{
  "success": true,
  "data": { /* Updated Recruiter */ }
}
```

---

## 66. Logout Recruiter
```
POST /api/v1/recruiters/logout
Auth: YES
Role: recruiter
```

**Response 200**:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## 67. Get Recruiter Dashboard
```
GET /api/v1/recruiters/dashboard
Auth: YES
Role: recruiter
```

**Response 200**:
```json
{
  "success": true,
  "data": {
    "stats": {
      "activeJobs": 5,
      "totalApplications": 125,
      "newCandidates": 15,
      "shortlisted": 20
    },
    "recentApplications": [
      {
        "id": "uuid",
        "candidateName": "John Doe",
        "candidateAvatar": "...",
        "jobTitle": "Senior Frontend Engineer",
        "appliedAt": "2024-01-01T00:00:00Z",
        "matchScore": 85,
        "status": "PENDING"
      }
    ],
    "topJobs": [
      {
        "id": "uuid",
        "title": "Senior Frontend Engineer",
        "applicationCount": 25,
        "viewCount": 500
      }
    ]
  }
}
```

---

## 68. Search Candidates
```
GET /api/v1/recruiters/candidates/search
Auth: YES
Role: recruiter
Query: q, skills, minAuraScore, maxAuraScore, minExperience, maxExperience, location, isOpenToWork, page, limit
```

**Response 200**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "username": "johndoe",
      "name": "John Doe",
      "avatarUrl": "...",
      "bio": "Software Engineer",
      "location": "San Francisco",
      "githubUrl": "...",
      "auraScore": 450,
      "auraLevel": 5,
      "topSkills": [
        { "name": "React", "score": 90, "isVerified": true }
      ],
      "projectCount": 10,
      "isOpenToWork": true
    }
  ],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

---

## 69. Get Candidate Profile
```
GET /api/v1/recruiters/candidates/:userId
Auth: YES
Role: recruiter
```

**Response 200**:
```json
{
  "success": true,
  "data": { /* Candidate object */ }
}
```

---

## 70. Get Full Candidate Profile
```
GET /api/v1/recruiters/candidates/:userId/full
Auth: YES
Role: recruiter
```

**Response 200**:
```json
{
  "success": true,
  "data": {
    "candidate": {
      /* All candidate fields */
      "skills": [ /* Full skill details */ ],
      "projects": [ /* Analyzed projects */ ],
      "experience": [ /* Work history */ ],
      "education": [ /* Education */ ],
      "auraSummary": { /* Full aura breakdown */ }
    }
  }
}
```

---

## 71. Get Candidate Resume
```
GET /api/v1/recruiters/candidates/:userId/resume
Auth: YES
Role: recruiter
Query: download (optional, true for PDF)
```

**Response 200** (JSON):
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "resume": {
      "personalInfo": { /* */ },
      "summary": "...",
      "skills": [ /* */ ],
      "experience": [ /* */ ],
      "education": [ /* */ ],
      "projects": [ /* */ ]
    },
    "generatedAt": "2024-01-01T00:00:00Z"
  }
}
```

**Response 200** (PDF when download=true):
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="resume.pdf"
```

---

## 72. Shortlist Candidate
```
POST /api/v1/recruiters/candidates/:userId/shortlist
Auth: YES
Role: recruiter
```

**Request Body**:
```json
{
  "notes": "string (optional)",
  "tags": ["string"] (optional)
}
```

**Response 201**:
```json
{
  "success": true,
  "data": {
    "message": "Candidate shortlisted successfully"
  }
}
```

---

## 73. Get Shortlist
```
GET /api/v1/recruiters/shortlist
Auth: YES
Role: recruiter
```

**Response 200**:
```json
{
  "success": true,
  "data": {
    "candidates": [ /* Candidate objects with shortlist metadata */ ]
  }
}
```

---

# CHAT SERVICE ENDPOINTS (WebSocket)

## 74. Get Rooms
```
GET /api/v1/chat/rooms
Auth: YES
Role: developer | recruiter
```

**Response 200**:
```json
{
  "success": true,
  "data": [
    {
      "roomId": "uuid",
      "participants": [
        { "id": "uuid", "name": "John", "avatarUrl": "...", "role": "developer" }
      ],
      "jobId": "uuid",
      "lastMessage": { /* Message */ },
      "unreadCount": 2,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

## 75. Create/Get Room
```
POST /api/v1/chat/rooms
Auth: YES
Role: developer | recruiter
```

**Request Body**:
```json
{
  "participantId": "uuid",
  "jobId": "uuid (optional)"
}
```

**Response 200**:
```json
{
  "success": true,
  "data": {
    "room": { /* Room object */ }
  }
}
```

---

## 76. Get Room Messages
```
GET /api/v1/chat/rooms/:roomId/messages
Auth: YES
Role: developer | recruiter
Query: limit, before (cursor)
```

**Response 200**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "roomId": "uuid",
      "senderId": "uuid",
      "senderRole": "developer",
      "senderName": "John Doe",
      "content": "Hello!",
      "type": "text",
      "isRead": true,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

## WebSocket Events

### Client → Server
| Event | Payload |
|-------|---------|
| `join_room` | `{ roomId: string }` |
| `leave_room` | `{ roomId: string }` |
| `send_message` | `{ roomId, content, type?, metadata? }` |
| `typing_start` | `{ roomId: string }` |
| `typing_stop` | `{ roomId: string }` |
| `mark_read` | `{ roomId, messageId? }` |

### Server → Client
| Event | Payload |
|-------|---------|
| `connected` | `{ userId, role, socketId }` |
| `room_joined` | `{ roomId, room, onlineUsers }` |
| `new_message` | `{ message: Message }` |
| `user_typing` | `{ userId, roomId, isTyping }` |
| `user_online` | `{ userId, roomId }` |
| `user_offline` | `{ userId, roomId }` |
| `messages_read` | `{ roomId, readBy, upToMessageId, count }` |
| `error` | `{ code, message }` |

---

# APPLICATION STATUS ENUM (CANONICAL)

```typescript
type ApplicationStatus =
  | 'PENDING'      // Initial state after applying
  | 'REVIEWING'    // Recruiter started review
  | 'SHORTLISTED'  // Added to shortlist
  | 'INTERVIEW'    // Interview scheduled
  | 'OFFER'        // Offer extended
  | 'ACCEPTED'     // Candidate accepted offer
  | 'REJECTED'     // Application rejected
  | 'WITHDRAWN'    // Candidate withdrew
```

---

# INTERVIEW STATUS ENUM (CANONICAL)

```typescript
type InterviewStatus =
  | 'SCHEDULED'   // Initial state
  | 'CONFIRMED'   // Candidate confirmed
  | 'RESCHEDULED' // Time changed
  | 'COMPLETED'   // Interview done
  | 'CANCELLED'   // Cancelled
  | 'NO_SHOW'     // Candidate didn't show
```

---

# INTERVIEW TYPE ENUM (CANONICAL)

```typescript
type InterviewType =
  | 'PHONE_SCREEN'
  | 'VIDEO_CALL'
  | 'TECHNICAL'
  | 'HR_ROUND'
  | 'FINAL_ROUND'
  | 'IN_PERSON'
```

---

**END OF CONTRACT**
