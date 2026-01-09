# VerifyDev Job Portal - Complete Documentation

## Overview

VerifyDev is a developer-focused job portal with skill verification through GitHub project analysis. The system uses a **microservices architecture** with MongoDB, Redis, and RabbitMQ.

---

## Architecture

```mermaid
flowchart TB
    subgraph Frontend
        FE[React Frontend :3000]
    end
    
    subgraph Gateway
        GW[Nginx Gateway :80]
    end
    
    subgraph Services
        AUTH[Auth Service :3001]
        USER[User Service :3002]
        JOB[Job Service :3004]
        REC[Recruiter Service :3005]
        RES[Resume Service :8003]
        ANA[Analyzer Service :8001]
        AURA[Aura Processor]
    end
    
    subgraph Data
        MONGO[(MongoDB)]
        REDIS[(Redis)]
        RABBIT[(RabbitMQ)]
        MINIO[(MinIO)]
    end
    
    FE --> GW
    GW --> AUTH & USER & JOB & REC & RES
    AUTH & USER & JOB & REC --> MONGO
    AUTH & USER --> REDIS
    USER & AURA --> RABBIT
    ANA --> RABBIT
    RES --> MINIO
```

---

## Database Collections

### Shared MongoDB Database

All services now use a **single shared database** for data consistency.

| Collection | Service | Description |
|------------|---------|-------------|
| `users` | auth/user-service | Developer profiles |
| `sessions` | auth-service | Auth sessions |
| `skills` | user-service | User skills (verified/manual) |
| `projects` | user-service | GitHub projects |
| `experiences` | user-service | Work/education history |
| `recruiters` | recruiter-service | Recruiter accounts |
| `organizations` | recruiter-service | Companies |
| `jobs` | job-service | Job postings |
| `applications` | job-service | Job applications |
| `interviews` | job-service | Interview scheduling |
| `messages` | job-service | In-app messaging |
| `saved_jobs` | job-service | User bookmarked jobs |
| `saved_candidates` | recruiter-service | Recruiter saved candidates |

---

## API Endpoints

### Auth Service (Port 3001)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/auth/github` | Start GitHub OAuth |
| GET | `/v1/auth/github/callback` | OAuth callback |
| POST | `/v1/auth/logout` | Logout user |
| POST | `/v1/auth/refresh` | Refresh access token |
| GET | `/v1/auth/me` | Get current user |
| POST | `/v1/auth/otp/request-email` | Request email OTP |
| POST | `/v1/auth/otp/verify` | Verify OTP |

---

### User Service (Port 3002)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/users/me` | Get current user profile |
| PUT | `/v1/users/me` | Update profile |
| GET | `/v1/users/:username` | Get public profile |
| GET | `/v1/projects` | Get user's projects |
| POST | `/v1/projects` | Add project for analysis |
| GET | `/v1/skills` | Get user's skills |
| POST | `/v1/skills` | Add manual skill |
| GET | `/v1/experiences` | Get work/education |
| POST | `/v1/experiences` | Add experience |

---

### Job Service (Port 3004)

#### Public Job Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/jobs` | List all active jobs |
| GET | `/v1/jobs/search` | Advanced job search |
| GET | `/v1/jobs/:jobId` | Get job details |

#### Authenticated User Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/jobs/matched` | Jobs matching user skills |
| POST | `/v1/jobs/:jobId/apply` | Apply to job |
| GET | `/v1/applications` | Get my applications |
| DELETE | `/v1/applications/:id` | Withdraw application |

#### Recruiter Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/jobs` | Create job posting |
| GET | `/v1/recruiter/jobs` | Get recruiter's jobs |
| GET | `/v1/recruiter/jobs/:jobId` | Get job with stats |
| GET | `/v1/recruiter/jobs/:jobId/analytics` | Job analytics |
| GET | `/v1/recruiter/jobs/:jobId/applicants` | Job applicants |

---

### Recruiter Service (Port 3005)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/recruiters/auth/login` | Recruiter login |
| POST | `/v1/recruiters/auth/register` | Register recruiter |
| GET | `/v1/recruiters/me` | Get recruiter profile |
| GET | `/v1/candidates/search` | Search developers |
| POST | `/v1/candidates/:id/save` | Save candidate |

---

## Setup Instructions

### Prerequisites
- Docker & Docker Compose
- Node.js 20+
- MongoDB Atlas or local MongoDB

### Environment Variables

Create `.env` in root:
```env
MONGODB_CONNECTION_STRING=mongodb+srv://username:password@cluster.mongodb.net/verifydev
GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
GITHUB_TOKEN=your_personal_access_token
JWT_ACCESS_SECRET=yoursupersecretaccesskeymin32chars
JWT_REFRESH_SECRET=yoursupersecretrefreshkeymin32char
```

### Start Services

```bash
# Start all services
docker compose up --build -d

# View logs
docker compose logs -f

# Stop all
docker compose down
```

### Start Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Application Flow

### User Registration & Login
1. User clicks "Login with GitHub"
2. OAuth flow with GitHub
3. User profile created from GitHub data
4. JWT tokens issued

### Project Analysis & Aura Score
1. User adds GitHub repo URL
2. Request published to RabbitMQ
3. Analyzer service clones and analyzes repo
4. Signals published back to queue
5. Aura Processor updates user's Aura Score
6. Skills auto-detected and added

### Job Application Flow
1. User browses/searches jobs
2. Match score calculated based on skills vs requirements
3. User applies with optional cover letter
4. Application stored with snapshot of user data
5. Recruiter reviews in dashboard
6. Can schedule interview, shortlist, or reject
