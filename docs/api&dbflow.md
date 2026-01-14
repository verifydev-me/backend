# 🏛️ VerifyDev System Documentation

> **Complete API Reference, Database Schema, and Service Architecture**  
> **Version**: 2.0 | **Last Updated**: January 2026

---

## 🚀 New Developer? START HERE!

> **Ye documentation padhne se pehle ye sections zaroor padho:**

### Step 1: Understand the Big Picture (15 min)
```
Read in order:
1. System Overview section      → Saari services ka overview
2. Architecture Diagram          → Kaise connected hain sab
3. Services Summary Table        → Kya karta hai kaun
```

### Step 2: Setup Local Environment (30 min)
```bash
# 1. Clone repo
git clone https://github.com/your-org/backend.git
cd backend

# 2. Copy environment file
cp .env.example .env
# Edit .env with your values (MongoDB URL, GitHub OAuth, etc.)

# 3. Start all services
docker compose up -d

# 4. Verify all running
docker compose ps
# Should show: gateway, auth-service, user-service, job-service, 
#              recruiter-service, chat-service, project-analyzer, 
#              aura-processor, mongodb, redis, rabbitmq
```

### Step 3: Test APIs (10 min)
```bash
# Health check
curl http://localhost/health

# Auth flow (opens browser)
# Visit: http://localhost/api/v1/auth/github

# After login, test protected route
curl -H "Authorization: Bearer <your_token>" \
     http://localhost/api/v1/users/me
```

### Step 4: Learning Path by Role

| Your Role | Focus Areas | Time |
|-----------|-------------|------|
| **Frontend Dev** | Chat Service WebSocket, API Endpoints, Auth Flow | 2 hours |
| **Backend Dev** | Database Schema, Service Architecture, RabbitMQ | 4 hours |
| **Full Stack** | Everything! Start with Data Flow Diagrams | 6 hours |
| **DevOps** | Docker Compose, Nginx Gateway, Service Ports | 1 hour |

---

## 📑 Quick Navigation

| Section | Description | Difficulty |
|---------|-------------|------------|
| [System Overview](#-system-overview) | Architecture aur services ka overview | 🟢 Easy |
| [Database Schema](#-database-schema) | Har service ka complete schema | 🟡 Medium |
| [API Endpoints](#-api-endpoints) | All REST APIs with examples | 🟢 Easy |
| [Chat Service Deep Dive](#-chat-service-deep-dive) | WebSocket, real-time messaging | 🔴 Advanced |
| [Data Flow Diagrams](#-data-flow-diagrams) | Request lifecycle explanations | 🟡 Medium |
| [Database Queries](#-database-query-examples) | Common Prisma queries | 🟡 Medium |
| [Authentication](#-authentication) | JWT tokens, OAuth flow | 🟢 Easy |
| [Debugging Guide](#-debugging-common-issues) | Common issues aur solutions | 🟡 Medium |
| [Environment Variables](#-environment-variables) | Required config | 🟢 Easy |

---


## 🏗️ System Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                VERIFYDEV ARCHITECTURE                                │
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │                          NGINX API GATEWAY (:80)                             │    │
│  │   /api/v1/auth/*    → auth-service:3001                                      │    │
│  │   /api/v1/users/*   → user-service:3002                                      │    │
│  │   /api/v1/jobs/*    → job-service:3004                                       │    │
│  │   /api/v1/recruiter/* → recruiter-service:3005                               │    │
│  │   /api/v1/chat/*    → chat-service:3006                                      │    │
│  │   /ws/chat          → chat-service:3006 (WebSocket)                          │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                        │                                             │
│        ┌──────────────┬────────────────┼────────────────┬──────────────┐            │
│        ▼              ▼                ▼                ▼              ▼            │
│  ┌──────────┐  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐        │
│  │  Auth    │  │  User    │    │   Job    │    │Recruiter │    │  Chat    │        │
│  │ Service  │  │ Service  │    │ Service  │    │ Service  │    │ Service  │        │
│  │  :3001   │  │  :3002   │    │  :3004   │    │  :3005   │    │  :3006   │        │
│  └────┬─────┘  └────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘        │
│       │             │               │               │               │               │
│       └─────────────┴───────────────┴───────────────┴───────────────┘               │
│                                      │                                               │
│                               ┌──────┴──────┐                                        │
│                               │   MongoDB   │                                        │
│                               │  (Primary)  │                                        │
│                               └─────────────┘                                        │
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │                          BACKGROUND SERVICES                                 │    │
│  │                                                                              │    │
│  │   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │    │
│  │   │   Project    │    │    Aura      │    │   Resume     │                  │    │
│  │   │  Analyzer    │───▶│  Processor   │    │   Service    │                  │    │
│  │   │  (Go:8001)   │    │  (TS:3003)   │    │  (Go:8003)   │                  │    │
│  │   └──────┬───────┘    └──────┬───────┘    └──────────────┘                  │    │
│  │          │                   │                                               │    │
│  │          └───────────────────┴───────────────────────────┐                  │    │
│  │                              ▼                           │                  │    │
│  │                       ┌─────────────┐              ┌─────┴─────┐            │    │
│  │                       │  RabbitMQ   │              │   Redis   │            │    │
│  │                       │  (Events)   │              │  (Cache)  │            │    │
│  │                       └─────────────┘              └───────────┘            │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Services Summary

| Service | Port | Technology | Purpose |
|---------|------|------------|---------|
| **auth-service** | 3001 | Node.js/TS | GitHub OAuth, JWT auth |
| **user-service** | 3002 | Node.js/TS | User profiles, skills, projects |
| **aura-processor** | 3003 | Node.js/TS | Process analyzed signals, calculate scores |
| **job-service** | 3004 | Node.js/TS | Job postings, applications |
| **recruiter-service** | 3005 | Node.js/TS | Recruiter profiles, candidate search |
| **chat-service** | 3006 | Node.js/TS | Real-time messaging (WebSocket) |
| **project-analyzer** | 8001 | Go | Analyze GitHub repos |
| **resume-service** | 8003 | Go | Generate PDF resumes |

---

## 💾 Database Schema

**Database**: MongoDB (via Prisma ORM)

### Service → Database Mapping

```
user-service      → verifydev_users (main user database)
auth-service      → verifydev_auth (sessions, tokens)
chat-service      → verifydev_chat (messages, rooms)
job-service       → verifydev_jobs (jobs, applications, recruiters)
aura-processor    → verifydev_aura (analysis results)
recruiter-service → verifydev_recruiters (separate recruiter auth)
```

---

### 👤 USER-SERVICE Schema (Main Database)

#### User Model
```prisma
model User {
  id            String   @id @default(auto()) @map("_id") @db.ObjectId
  githubId      String   @unique
  username      String   @unique
  email         String?  @unique
  name          String?
  avatarUrl     String?
  bio           String?
  location      String?
  company       String?
  
  // Student Info
  isStudent      Boolean  @default(false)
  collegeName    String?
  collegeYear    Int?             // 1, 2, 3, 4
  graduationYear Int?
  
  // Onboarding
  onboardingComplete Boolean @default(false)
  onboardingStep     Int     @default(0)  // 0-4
  
  // Visibility
  isPublic        Boolean         @default(true)
  isOpenToWork    Boolean         @default(false)
  isVerified      Boolean         @default(false)
  visibilityLevel VisibilityLevel @default(RECRUITERS_ONLY)
  
  // Job Preferences
  preferredRoles     String[]   // ["Backend Dev", "Full Stack"]
  preferredLocations String[]   // ["Remote", "Bangalore"]
  expectedSalaryMin  Int?
  expectedSalaryMax  Int?
  noticePeriodDays   Int?
  
  // AURA Score
  auraScore       Int @default(0)
  coreCount       Int @default(1)
  
  // Auto-inferred
  primaryRole     String?         // "Backend Developer"
  primaryNiche    DeveloperNiche?
  
  // Relations
  skills       Skill[]
  projects     Project[]
  experiences  Experience[]
  applications Application[]
}
```

**Key Queries:**
```javascript
// Get user with skills
await prisma.user.findUnique({
  where: { id: userId },
  include: { skills: true, projects: true }
});

// Search open-to-work developers
await prisma.user.findMany({
  where: { 
    isOpenToWork: true,
    auraScore: { gte: minScore }
  },
  orderBy: { auraScore: 'desc' }
});
```

#### Skill Model
```prisma
model Skill {
  id            String        @id
  userId        String        @db.ObjectId
  name          String        // "PostgreSQL"
  category      SkillCategory // DATABASE, FRAMEWORK, etc.
  
  // Verification
  source        SkillSource   // GITHUB, ANALYSIS, MANUAL
  isVerified    Boolean       @default(false)
  verifiedScore Int           @default(0)  // 0-100
  evidence      Json?         // ["Found in project X", "Used Prisma ORM"]
  
  // Stats
  projectCount     Int @default(0)
  linesOfCode      Int @default(0)
  auraContribution Int @default(0)
}

enum SkillSource {
  GITHUB   // Auto-detected from repos
  ANALYSIS // Verified through project analyzer (protected)
  MANUAL   // User-declared (unverified)
}
```

#### Project Model
```prisma
model Project {
  id             String @id
  userId         String @db.ObjectId
  githubRepoUrl  String
  repoName       String
  
  // Analysis
  analysisStatus AnalysisStatus // PENDING, PROCESSING, COMPLETED, FAILED
  analyzedAt     DateTime?
  basePath       String?        // For monorepo: "/backend"
  
  // Scores
  codeQualityScore Int @default(0)
  structureScore   Int @default(0)
  overallScore     Int @default(0)
  auraContribution Int @default(0)
  
  // Visibility
  isPinned         Boolean @default(false)
  showToRecruiters Boolean @default(true)
  
  // Relations
  analysis     ProjectAnalysis?
}
```

#### ProjectAnalysis Model (70+ fields)
```prisma
model ProjectAnalysis {
  id        String @id
  projectId String @unique @db.ObjectId
  
  // Folder Structure
  hasSrcFolder   Boolean @default(false)
  hasComponents  Boolean @default(false)
  hasTests       Boolean @default(false)
  hasMiddleware  Boolean @default(false)
  
  // Code Quality
  hasReadme        Boolean @default(false)
  hasDockerfile    Boolean @default(false)
  hasDockerCompose Boolean @default(false)
  hasCI            Boolean @default(false)
  
  // Tech Stack Arrays
  languages      String[]  // ["TypeScript", "Go"]
  frameworks     String[]  // ["React", "Express"]
  databases      String[]  // ["MongoDB", "Redis"]
  tools          String[]  // ["Docker", "Vite"]
  
  // Architecture
  architectureType ArchitectureType?  // MICROSERVICES, MONOLITH, etc.
  serviceCount     Int @default(0)
  
  // Dimensional Scores (0-100)
  fundamentalsScore        Int?
  engineeringDepthScore    Int?
  productionReadinessScore Int?
  testingMaturityScore     Int?
  architectureScore        Int?
  infraDevOpsScore         Int?
  
  // Verdict
  experienceLevel ExperienceLevel?  // FRESH_GRAD, JUNIOR, MID_LEVEL, SENIOR
  trustLevel      TrustLevel?       // HIGH, MEDIUM, LOW, SUSPICIOUS
  
  // Relations
  verifiedSkills AnalysisVerifiedSkill[]
}
```

---

### 💼 JOB-SERVICE Schema

#### Job Model
```prisma
model Job {
  id          String       @id
  recruiterId String       @db.ObjectId
  
  // Details
  title            String
  description      String
  requirements     String
  responsibilities String
  
  // Classification
  type     JobType         // FULL_TIME, PART_TIME, CONTRACT, INTERNSHIP
  level    ExperienceLevel // ENTRY, JUNIOR, MID, SENIOR, LEAD
  category JobCategory     // FRONTEND, BACKEND, FULLSTACK, DEVOPS, etc.
  
  // Location
  location   String
  isRemote   Boolean
  remoteType RemoteType?   // FULL_REMOTE, HYBRID, OFFICE_ONLY
  
  // Compensation
  salaryMin      Int?
  salaryMax      Int?
  salaryCurrency String @default("INR")
  showSalary     Boolean @default(true)
  
  // Skills (Simple arrays)
  requiredSkills  String[]  // ["React", "Node.js"]
  preferredSkills String[]  // ["Docker", "AWS"]
  
  // Filters
  minExperience Int?  // Years
  maxExperience Int?
  minAuraScore  Int @default(0)
  
  // Status
  status            JobStatus  // DRAFT, ACTIVE, PAUSED, CLOSED
  applicationsCount Int @default(0)
  
  // Relations
  applications Application[]
  recruiter    Recruiter
}
```

#### Application Model
```prisma
model Application {
  id     String @id
  jobId  String @db.ObjectId
  userId String // Candidate's user ID
  
  // Application Details
  coverLetter  String?
  resumeUrl    String?
  portfolioUrl String?
  
  // Candidate Snapshot (at application time)
  candidateName   String
  candidateEmail  String
  candidateAura   Int      @default(0)
  candidateSkills String[]
  
  // Status
  status ApplicationStatus // PENDING, REVIEWING, SHORTLISTED, INTERVIEW, OFFER, REJECTED
  stage  String?           // Custom workflow stage
  
  // Matching
  matchScore      Int?  // 0-100
  skillMatchScore Int?
  
  // Recruiter Feedback
  recruiterNotes String?
  rating         Int?   // 1-5 stars
  
  // Timestamps
  appliedAt     DateTime
  reviewedAt    DateTime?
  shortlistedAt DateTime?
}
```

#### Recruiter Model
```prisma
model Recruiter {
  id           String @id
  email        String @unique
  passwordHash String
  
  // Profile
  name      String
  title     String?
  phone     String?
  avatarUrl String?
  
  // Organization
  organizationName    String
  organizationWebsite String?
  organizationLogo    String?
  organizationSize    String?  // "1-10", "11-50", "51-200", "201-500", "500+"
  industry            String?
  
  // Verification
  isVerified Boolean @default(false)
  
  // Stats
  jobsPosted        Int @default(0)
  activeJobs        Int @default(0)
  totalApplications Int @default(0)
  
  // Relations
  jobs Job[]
}
```

---

### 💬 CHAT-SERVICE Schema

#### ChatRoom Model
```prisma
model ChatRoom {
  id            String  @id
  roomId        String  @unique  // "chat_{jobId}_{candidateId}"
  jobId         String? @db.ObjectId
  applicationId String? @db.ObjectId
  
  // Participants
  candidateId String @db.ObjectId
  recruiterId String @db.ObjectId
  
  // Quick Access
  candidateName String?
  recruiterName String?
  
  // Last Message (embedded)
  lastMessage  LastMessage?
  unreadCounts UnreadCount[]
  
  // Relations
  messages Message[]
  
  isActive  Boolean @default(true)
  createdAt DateTime
}

type LastMessage {
  content  String
  senderId String @db.ObjectId
  sentAt   DateTime
}

type UnreadCount {
  userId String @db.ObjectId
  count  Int    @default(0)
}
```

#### Message Model
```prisma
model Message {
  id String @id
  
  chatRoomId String   @db.ObjectId
  roomId     String   // Denormalized for easy querying
  
  senderId   String   @db.ObjectId
  senderRole Role     // CANDIDATE, RECRUITER
  senderName String?
  
  content String
  type    MessageType  // TEXT, FILE, SYSTEM
  
  metadata Json?  // { fileName, fileUrl, fileSize }
  
  readBy ReadReceipt[]
  
  deliveredAt DateTime?
  createdAt   DateTime
}

type ReadReceipt {
  userId String   @db.ObjectId
  readAt DateTime
}
```

---

## 🔌 API Endpoints

### Auth Service (`/api/v1/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/github` | Start GitHub OAuth | No |
| GET | `/github/callback` | GitHub OAuth callback | No |
| POST | `/refresh` | Refresh access token | No (needs refresh token) |
| POST | `/logout` | Logout & invalidate session | Yes |
| GET | `/me` | Get current user | Yes |

**Example: GitHub OAuth Flow**
```
1. Frontend → GET /api/v1/auth/github
2. Redirect to GitHub → User authorizes
3. GitHub → GET /api/v1/auth/github/callback?code=xxx
4. Server → Creates user, returns JWT tokens
5. Response: { accessToken, refreshToken, user }
```

---

### User Service (`/api/v1/users`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/me` | Get current user profile | Yes |
| PUT | `/me` | Update profile | Yes |
| GET | `/me/skills` | Get user's skills | Yes |
| POST | `/me/skills` | Add skill (manual) | Yes |
| DELETE | `/me/skills/:id` | Remove manual skill | Yes |
| GET | `/me/projects` | Get user's projects | Yes |
| POST | `/me/projects` | Add project for analysis | Yes |
| DELETE | `/me/projects/:id` | Remove project | Yes |
| GET | `/:username` | Get public profile | No |

**Example: Add Project for Analysis**
```http
POST /api/v1/users/me/projects
Authorization: Bearer <token>
Content-Type: application/json

{
  "githubRepoUrl": "https://github.com/user/my-project",
  "projectNiche": "BACKEND",
  "basePath": "/backend"  // Optional: for monorepos
}

Response:
{
  "success": true,
  "data": {
    "id": "65a...",
    "repoName": "my-project",
    "analysisStatus": "PENDING"
  }
}
```

---

### Job Service (`/api/v1/jobs`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | List jobs (paginated) | No |
| GET | `/:id` | Get job details | No |
| POST | `/` | Create job (recruiter) | Recruiter |
| PUT | `/:id` | Update job | Recruiter |
| DELETE | `/:id` | Delete job | Recruiter |
| POST | `/:id/apply` | Apply to job | User |
| GET | `/:id/applications` | Get applications (recruiter) | Recruiter |

**Example: Apply to Job**
```http
POST /api/v1/jobs/65a.../apply
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "coverLetter": "I am excited to apply...",
  "portfolioUrl": "https://myportfolio.com"
}

Response:
{
  "success": true,
  "data": {
    "applicationId": "65b...",
    "status": "PENDING",
    "matchScore": 78
  }
}
```

---

### Recruiter Service (`/api/v1/recruiter`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/register` | Register recruiter | No |
| POST | `/auth/login` | Login recruiter | No |
| GET | `/profile` | Get recruiter profile | Recruiter |
| PUT | `/profile` | Update profile | Recruiter |
| GET | `/jobs` | Get recruiter's jobs | Recruiter |
| GET | `/jobs/:id/applicants` | Get job applicants | Recruiter |
| POST | `/applications/:id/status` | Update application status | Recruiter |
| GET | `/candidates/search` | Search candidates | Recruiter |

**Example: Search Candidates**
```http
GET /api/v1/recruiter/candidates/search?skills=React,Node.js&minAura=500&isOpenToWork=true
Authorization: Bearer <recruiter_token>

Response:
{
  "success": true,
  "data": [
    {
      "id": "65a...",
      "name": "John Doe",
      "auraScore": 750,
      "primaryRole": "Full Stack Developer",
      "topSkills": ["React", "Node.js", "PostgreSQL"],
      "experienceLevel": "MID_LEVEL"
    }
  ],
  "pagination": { "page": 1, "total": 25 }
}
```

---

### Chat Service (`/api/v1/chat`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/rooms` | Get user's chat rooms | Yes |
| GET | `/rooms/:roomId` | Get room details | Yes |
| POST | `/rooms` | Create/get room for job | Yes |
| GET | `/rooms/:roomId/messages` | Get paginated messages | Yes |
| POST | `/rooms/:roomId/messages` | Send message (REST fallback) | Yes |
| PUT | `/rooms/:roomId/read` | Mark messages as read | Yes |

---

## 💬 Chat Service Deep Dive

### WebSocket Connection Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      WEBSOCKET CONNECTION FLOW                               │
└─────────────────────────────────────────────────────────────────────────────┘

1. CLIENT CONNECTS
   ────────────────
   const socket = io("wss://api.verifydev.com", {
     auth: { token: "Bearer <JWT>" },
     transports: ["websocket"]
   });

2. SERVER VALIDATES JWT
   ─────────────────────
   socket-server.ts → io.use() middleware
   │
   ├── Extract token from socket.handshake.auth
   ├── Verify JWT using JWT_ACCESS_SECRET
   ├── Extract { userId, role } from payload
   └── Store in socket.data.user

3. CONNECTION ESTABLISHED
   ───────────────────────
   Server emits: "connected" { userId, socketId }
   │
   └── Redis stores: user:{userId} → socketId

4. JOIN ROOM
   ──────────
   Client emits: "join_room" { roomId }
   │
   ├── Server validates access (candidate or recruiter of job)
   ├── socket.join(roomId)
   └── Server emits to room: "user_online" { userId }

5. SEND MESSAGE
   ─────────────
   Client emits: "send_message" { roomId, content, type }
   │
   ├── messageService.saveMessage()
   │   ├── Create message in MongoDB
   │   ├── Update room.lastMessage
   │   └── Increment unread for other user
   │
   ├── Server emits to room: "new_message" { message }
   │
   └── If recipient offline → notificationService.notifyOffline()
       └── Publish to RabbitMQ queue for email/push notification

6. TYPING INDICATORS
   ──────────────────
   Client emits: "typing_start" { roomId }
   Server broadcasts: "user_typing" { userId, roomId }
   
   Client emits: "typing_stop" { roomId }
   Server broadcasts: "user_stopped_typing" { userId, roomId }

7. READ RECEIPTS
   ──────────────
   Client emits: "mark_read" { roomId, messageId }
   │
   ├── messageService.markAsRead()
   │   ├── Update Message.readBy array
   │   └── Reset ChatRoom.unreadCounts for user
   │
   └── Server emits: "messages_read" { roomId, userId, upToMessageId }

8. DISCONNECT
   ───────────
   socket.on("disconnect")
   │
   ├── Remove from Redis: online:users
   ├── Broadcast to rooms: "user_offline" { userId }
   └── Cleanup socket mappings
```

### WebSocket Events Reference

#### Client → Server
```typescript
// Join a chat room
socket.emit("join_room", { roomId: "chat_jobId_candidateId" });

// Leave a chat room
socket.emit("leave_room", { roomId: "..." });

// Send a message
socket.emit("send_message", {
  roomId: "chat_...",
  content: "Hello!",
  type: "text"  // or "file"
});

// Typing indicators
socket.emit("typing_start", { roomId: "..." });
socket.emit("typing_stop", { roomId: "..." });

// Mark messages as read
socket.emit("mark_read", { roomId: "...", messageId: "..." });
```

#### Server → Client
```typescript
// Connection confirmed
socket.on("connected", ({ userId, socketId }) => {});

// Successfully joined room
socket.on("room_joined", ({ roomId, participant }) => {});

// New message received
socket.on("new_message", (message) => {
  // message = { id, roomId, senderId, content, createdAt, ... }
});

// Other user came online/offline
socket.on("user_online", ({ userId, roomId }) => {});
socket.on("user_offline", ({ userId, roomId }) => {});

// Typing indicators
socket.on("user_typing", ({ userId, roomId }) => {});
socket.on("user_stopped_typing", ({ userId, roomId }) => {});

// Read receipts
socket.on("messages_read", ({ roomId, readBy, upToMessageId }) => {});

// Errors
socket.on("error", ({ code, message }) => {});
```

### Redis Data Structures (Chat)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        REDIS KEYS                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  SET  online:users                    # All online user IDs         │
│       Members: ["userId1", "userId2", ...]                          │
│                                                                      │
│  HASH user:socket:{userId}            # User's active sockets       │
│       { socketId1: timestamp, socketId2: timestamp }                │
│                                                                      │
│  SET  room:online:{roomId}            # Online users in room        │
│       Members: ["userId1", "userId2"]                               │
│                                                                      │
│  PUB/SUB Channels:                                                  │
│       chat:messages                   # Cross-pod message sync      │
│       chat:presence                   # Online/offline events       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Message Service Functions

```typescript
// Save a new message
messageService.saveMessage({
  roomId: "chat_jobId_candidateId",
  senderId: "userId",
  senderRole: "candidate",  // or "recruiter"
  senderName: "John Doe",
  content: "Hello!",
  type: "text"
});
// → Creates Message in DB
// → Updates ChatRoom.lastMessage
// → Increments unread count for other participant

// Get paginated messages (cursor-based)
messageService.getMessages(roomId, {
  limit: 50,
  before: "lastMessageId"  // For loading older messages
});
// Returns: Message[] ordered by createdAt DESC

// Mark messages as read
messageService.markAsRead(roomId, userId, upToMessageId);
// → Updates Message.readBy array
// → Resets ChatRoom.unreadCounts for user

// Get unread count
messageService.getUnreadCount(roomId, userId);
// → Count of messages not sent by user and not in readBy
```

---

## 🔄 Data Flow Diagrams

### Project Analysis Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PROJECT ANALYSIS FLOW                                 │
└─────────────────────────────────────────────────────────────────────────────┘

1. USER ADDS PROJECT
   ──────────────────
   POST /api/v1/users/me/projects
   { githubRepoUrl: "https://github.com/user/repo" }
   │
   ▼
2. USER-SERVICE CREATES PROJECT
   ─────────────────────────────
   Project.create({ status: PENDING })
   │
   ▼
3. PUBLISH TO RABBITMQ
   ────────────────────
   Queue: project.analyze
   Payload: { projectId, userId, repoUrl, projectType, githubToken }
   │
   ▼
4. PROJECT-ANALYZER (GO) CONSUMES
   ───────────────────────────────
   ┌─────────────────────────────────────────────────────────┐
   │  a. Git Clone repo                                      │
   │  b. Parallel Extraction:                                 │
   │     - Language stats                                    │
   │     - Folder structure                                  │
   │     - Infrastructure signals (Docker, K8s, etc.)        │
   │     - Git forensics (authorship)                        │
   │  c. Inference Engine: Signals → Skills                   │
   │  d. Intelligence Pipeline: 7-stage deep analysis         │
   │  e. Verdict Generation: Score + Hire Signal             │
   └─────────────────────────────────────────────────────────┘
   │
   ▼
5. PUBLISH RESULTS TO RABBITMQ
   ────────────────────────────
   Queue: project.analyzed
   Payload: ProjectSignals (skills, scores, verdict)
   │
   ▼
6. AURA-PROCESSOR CONSUMES
   ────────────────────────
   ┌─────────────────────────────────────────────────────────┐
   │  a. Save ProjectAnalysis to DB                          │
   │  b. Update Project.status = COMPLETED                   │
   │  c. Create/Update VerifiedSkills for user               │
   │  d. Recalculate User.auraScore                          │
   │  e. Update User.primaryRole, primaryNiche               │
   └─────────────────────────────────────────────────────────┘
   │
   ▼
7. USER SEES UPDATED PROFILE
   ──────────────────────────
   Skills verified ✓
   AURA score updated ✓
   Project analysis complete ✓
```

### Job Application Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        JOB APPLICATION FLOW                                  │
└─────────────────────────────────────────────────────────────────────────────┘

1. CANDIDATE APPLIES
   ──────────────────
   POST /api/v1/jobs/:jobId/apply
   { coverLetter, portfolioUrl }
   │
   ▼
2. JOB-SERVICE VALIDATES
   ──────────────────────
   - Check job exists and is ACTIVE
   - Check user hasn't already applied
   - Fetch candidate profile from user-service
   │
   ▼
3. CREATE APPLICATION
   ───────────────────
   Application.create({
     status: PENDING,
     candidateSnapshot: { name, email, aura, skills, ... },
     matchScore: calculateMatchScore(job, candidate)
   })
   │
   ├── Increment Job.applicationsCount
   │
   ▼
4. CREATE CHAT ROOM (Lazy)
   ────────────────────────
   chat-service creates room when first message sent
   roomId: "chat_{jobId}_{candidateId}"
   │
   ▼
5. RECRUITER REVIEWS
   ──────────────────
   GET /api/v1/recruiter/jobs/:jobId/applicants
   │
   ├── View applications sorted by matchScore
   ├── View candidate profile + verified skills
   │
   ▼
6. UPDATE STATUS
   ──────────────
   POST /api/v1/recruiter/applications/:id/status
   { status: "SHORTLISTED" | "INTERVIEW" | "OFFER" | "REJECTED" }
   │
   ├── Application.status updated
   ├── Application.reviewedAt / shortlistedAt set
   │
   ▼
7. MESSAGING
   ──────────
   Recruiter/Candidate can now chat via WebSocket
   Messages stored in chat-service MongoDB
```

---

## 📊 Database Query Examples

### User Service Queries

```javascript
// Get user with all related data
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    skills: {
      where: { isVerified: true },
      orderBy: { verifiedScore: 'desc' }
    },
    projects: {
      where: { analysisStatus: 'COMPLETED' },
      include: { analysis: true }
    },
    experiences: {
      orderBy: { startDate: 'desc' }
    }
  }
});

// Search developers for recruiter
const developers = await prisma.user.findMany({
  where: {
    isOpenToWork: true,
    isPublic: true,
    auraScore: { gte: 300 },
    skills: {
      some: {
        name: { in: ['React', 'TypeScript'] },
        isVerified: true
      }
    }
  },
  orderBy: { auraScore: 'desc' },
  take: 20
});
```

### Chat Service Queries

```javascript
// Get user's chat rooms with last message
const rooms = await prisma.chatRoom.findMany({
  where: {
    OR: [
      { candidateId: userId },
      { recruiterId: userId }
    ],
    isActive: true
  },
  orderBy: { updatedAt: 'desc' }
});

// Get paginated messages (cursor-based)
const messages = await prisma.message.findMany({
  where: { roomId },
  take: 50,
  cursor: beforeMessageId ? { id: beforeMessageId } : undefined,
  skip: beforeMessageId ? 1 : 0,
  orderBy: { createdAt: 'desc' }
});

// Count unread messages
const unread = await prisma.message.count({
  where: {
    roomId,
    senderId: { not: userId },
    NOT: {
      readBy: { some: { userId } }
    }
  }
});
```

---

## 🔐 Authentication

### JWT Token Structure

```json
// Access Token (15 min expiry)
{
  "sub": "userId",
  "role": "user",  // or "recruiter"
  "iat": 1705000000,
  "exp": 1705000900
}

// Refresh Token (7 days expiry)
{
  "sub": "userId",
  "type": "refresh",
  "sessionId": "sessionId",
  "iat": 1705000000,
  "exp": 1705604800
}
```

### Auth Header Format
```
Authorization: Bearer <access_token>
```

### Token Refresh Flow
```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "<refresh_token>"
}

Response:
{
  "accessToken": "<new_access_token>",
  "refreshToken": "<new_refresh_token>"
}
```

---

## 📝 Summary Table

| Service | Schema File | Key Models | Main Purpose |
|---------|-------------|------------|--------------|
| user-service | `user-service/prisma/schema.prisma` | User, Skill, Project, ProjectAnalysis | User profiles, verified skills |
| job-service | `job-service/prisma/schema.prisma` | Job, Application, Interview, Recruiter | Jobs, applications |
| chat-service | `chat-service/prisma/schema.prisma` | ChatRoom, Message | Real-time messaging |
| auth-service | `auth-service/prisma/schema.prisma` | Session | OAuth, tokens |
| aura-processor | `aura-processor/prisma/schema.prisma` | (Uses user-service schema) | Process analysis results |

---

## 🐛 Debugging Common Issues

### Issue 1: "401 Unauthorized" on API calls

**Cause:** JWT token expired ya invalid

**Solution:**
```bash
# Check token expiry
# JWT payload mein "exp" field dekho

# Refresh token
curl -X POST http://localhost/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "<your_refresh_token>"}'
```

---

### Issue 2: Chat messages not appearing

**Debug Steps:**
```bash
# 1. Check WebSocket connection
# Browser Console mein dekho:
console.log(socket.connected);  // should be true

# 2. Check room join success
socket.on("room_joined", (data) => console.log("Joined:", data));

# 3. Check chat-service logs
docker compose logs -f chat-service | grep "error\|message"

# 4. Verify room exists in DB
# MongoDB mein check karo:
db.chatrooms.findOne({ roomId: "chat_<jobId>_<candidateId>" })
```

**Common Causes:**
- JWT token not passed in WebSocket auth
- Room doesn't exist (create with POST /api/v1/chat/rooms first)
- User not authorized for this room

---

### Issue 3: Project analysis stuck at "PROCESSING"

**Debug Steps:**
```bash
# 1. Check project-analyzer logs
docker compose logs -f project-analyzer

# 2. Check RabbitMQ queue
# Visit: http://localhost:15672 (guest/guest)
# Check queue: project.analyze

# 3. Check if message was consumed
docker compose logs project-analyzer | grep "<projectId>"

# 4. Manual retry (publish message again)
# Update project status to PENDING and re-publish
```

**Common Causes:**
- GitHub token expired (for private repos)
- Repo too large (>10000 files)
- RabbitMQ connection issue

---

### Issue 4: CORS errors in frontend

**Solution:**
```bash
# Check gateway CORS config
cat gateway/conf.d/default.conf | grep -A5 "add_header.*Access"

# Ensure your frontend origin is allowed
# Edit gateway/conf.d/default.conf:
add_header 'Access-Control-Allow-Origin' 'http://localhost:3000';
```

---

### Issue 5: MongoDB connection refused

**Debug:**
```bash
# Check MongoDB is running
docker compose ps | grep mongo

# Check connection string
echo $DATABASE_URL

# Test connection
docker compose exec mongodb mongosh --eval "db.stats()"
```

---

## 🔧 Environment Variables

### Required for ALL services

```env
# Database
DATABASE_URL=mongodb://localhost:27017/verifydev

# JWT Secrets (MUST be same across auth, user, chat, job services)
JWT_ACCESS_SECRET=your-super-secret-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-key-min-32-chars

# Redis (for chat, caching)
REDIS_URL=redis://localhost:6379
```

### Auth Service (.env)
```env
# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://localhost/api/v1/auth/github/callback

# Frontend redirect after login
FRONTEND_URL=http://localhost:3000
```

### Job Service (.env)
```env
DATABASE_URL=mongodb://localhost:27017/verifydev_jobs
JWT_ACCESS_SECRET=<same as auth>
```

### Chat Service (.env)
```env
DATABASE_URL=mongodb://localhost:27017/verifydev_chat
JWT_ACCESS_SECRET=<same as auth>
REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://localhost:5672
```

### Project Analyzer (.env)
```env
RABBITMQ_URL=amqp://localhost:5672
EXCHANGE_NAME=projects
CONSUME_QUEUE=project.analyze
PUBLISH_QUEUE=project.analyzed
```

---

## 🔄 Service Communication Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        HOW SERVICES TALK TO EACH OTHER                           │
└─────────────────────────────────────────────────────────────────────────────────┘

1. SYNC CALLS (HTTP via Gateway)
   ───────────────────────────────
   Frontend → Gateway → auth-service     (login, tokens)
   Frontend → Gateway → user-service     (profiles, skills)
   Frontend → Gateway → job-service      (jobs, applications)
   Frontend → Gateway → recruiter-service (recruiter APIs)
   Frontend → Gateway → chat-service     (REST fallback)

2. ASYNC EVENTS (RabbitMQ)
   ────────────────────────
   user-service ──publish──▶ [project.analyze] ──consume──▶ project-analyzer
   project-analyzer ──publish──▶ [project.analyzed] ──consume──▶ aura-processor
   aura-processor ──update──▶ user-service DB (skills, scores)
   chat-service ──publish──▶ [notification.queue] ──consume──▶ notification-service

3. REAL-TIME (WebSocket + Redis Pub/Sub)
   ───────────────────────────────────────
   Frontend ◀──WebSocket──▶ chat-service
   chat-service ◀──Redis Pub/Sub──▶ chat-service (for horizontal scaling)

4. SHARED DATA
   ─────────────
   auth-service → issues JWT tokens
   ALL services → validate JWT using same JWT_ACCESS_SECRET
   user-service → owns User, Skill, Project data
   job-service → owns Job, Application data (stores user snapshots)
   chat-service → owns ChatRoom, Message data (references user/job IDs)
```

---

## 📚 Related Documentation

| Document | Description |
|----------|-------------|
| [DEBUG_GUIDE.md](../project-analyzer/DEBUG_GUIDE.md) | Go Analyzer Engine debugging |
| [DEVELOPER.md](../project-analyzer/DEVELOPER.md) | Complete analyzer reference |
| [LEARNING_ROADMAP.md](../project-analyzer/LEARNING_ROADMAP.md) | 4-day learning plan |
| [chat-service/ARCHITECTURE.md](../chat-service/ARCHITECTURE.md) | Chat service deep dive |
| [README.md](../README.md) | Quick start guide |

---

## 🎯 Quick Debugging Commands

```bash
# View all service logs
docker compose logs -f

# View specific service
docker compose logs -f user-service

# Check service health
curl http://localhost/health

# Check RabbitMQ queues
curl -u guest:guest http://localhost:15672/api/queues

# Check MongoDB collections
docker compose exec mongodb mongosh verifydev_users --eval "show collections"

# Restart specific service
docker compose restart chat-service

# Check Redis keys
docker compose exec redis redis-cli KEYS "*"
```

---

*Ye documentation continuously update hoti rehti hai. Koi issue mile toh contribute karo!* 🚀

