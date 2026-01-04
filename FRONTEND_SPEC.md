# VerifyDev Frontend Specification 🎨

## 📋 API Endpoints Reference

### 🔐 Auth Service (Port: 3001)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/v1/auth/github` | Initiate GitHub OAuth | Public |
| GET | `/api/v1/auth/github/callback` | OAuth callback handler | Public |
| POST | `/api/v1/auth/refresh` | Refresh access token | Public |
| POST | `/api/v1/auth/logout` | Logout current session | Private |
| POST | `/api/v1/auth/logout-all` | Logout all devices | Private |
| GET | `/api/v1/auth/me` | Get current user | Private |

### 👤 User Service (Port: 3002)

#### Private Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/users/me` | Get my profile |
| PUT | `/api/v1/users/me` | Update my profile |
| GET | `/api/v1/users/settings` | Get settings |
| PUT | `/api/v1/users/settings` | Update settings |
| GET | `/api/v1/users/me/aura` | Get my aura summary |

#### Public Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/u/:username` | Public profile |
| GET | `/api/v1/u/:username/aura` | Public aura |
| GET | `/api/v1/u/:username/projects` | Public projects |

### 📁 Project Service (Port: 3002)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/v1/projects` | Add project for analysis | Private |
| POST | `/api/v1/projects/batch` | Batch analyze (max 3) | Private |
| GET | `/api/v1/projects` | Get my projects | Private |
| GET | `/api/v1/projects/:id` | Get single project | Private |
| DELETE | `/api/v1/projects/:id` | Delete project | Private |
| POST | `/api/v1/projects/:id/analyze` | Re-analyze | Private |
| POST | `/api/v1/projects/:id/pin` | Toggle pin | Private |

### 💼 Job Service (Port: 3004)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/v1/jobs` | List jobs with filters | Public |
| GET | `/api/v1/jobs/:id` | Get job details | Public |
| GET | `/api/v1/jobs/matched` | Get matched jobs | Private |
| POST | `/api/v1/jobs/:id/apply` | Apply to job | Private |
| GET | `/api/v1/applications` | My applications | Private |
| DELETE | `/api/v1/applications/:id` | Withdraw application | Private |

### 👔 Recruiter Service (Port: 3005)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/v1/recruiter/dashboard` | Dashboard stats | Recruiter |
| GET | `/api/v1/recruiter/candidates/search` | Search candidates | Recruiter |
| GET | `/api/v1/recruiter/candidates/:id` | Candidate profile | Recruiter |
| GET | `/api/v1/recruiter/candidates/:id/full` | Full candidate data | Recruiter |
| GET | `/api/v1/recruiter/candidates/:id/resume` | Candidate resume | Recruiter |
| POST | `/api/v1/recruiter/candidates/:id/shortlist` | Shortlist | Recruiter |
| GET | `/api/v1/recruiter/shortlist` | Get shortlist | Recruiter |

### 📄 Resume Service (Port: 8003)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/v1/resumes/generate` | Generate PDF resume | Private |
| POST | `/api/v1/resumes/preview` | Preview resume HTML | Private |

---

## 🎨 Frontend Architecture

### Tech Stack
```
├── React 18 + TypeScript
├── Vite (Build tool)
├── TailwindCSS + Shadcn/UI
├── React Query (Server state)
├── Zustand (Client state)
├── React Router v6
├── Axios (HTTP client)
├── Framer Motion (Animations)
└── Recharts (Charts)
```

### 📁 Project Structure
```
frontend/
├── public/
│   ├── favicon.ico
│   └── assets/
├── src/
│   ├── api/                    # API layer
│   │   ├── client.ts           # Axios instance
│   │   ├── auth.api.ts
│   │   ├── user.api.ts
│   │   ├── project.api.ts
│   │   ├── job.api.ts
│   │   └── recruiter.api.ts
│   │
│   ├── components/             # Reusable components
│   │   ├── ui/                 # Base UI (Shadcn)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── skeleton.tsx
│   │   │   └── toast.tsx
│   │   │
│   │   ├── layout/             # Layout components
│   │   │   ├── Navbar.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── PageWrapper.tsx
│   │   │
│   │   ├── auth/               # Auth components
│   │   │   ├── GitHubButton.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   └── AuthProvider.tsx
│   │   │
│   │   ├── profile/            # Profile components
│   │   │   ├── ProfileCard.tsx
│   │   │   ├── AuraDisplay.tsx
│   │   │   ├── CoreBadge.tsx
│   │   │   ├── SkillsChart.tsx
│   │   │   └── SocialLinks.tsx
│   │   │
│   │   ├── projects/           # Project components
│   │   │   ├── ProjectCard.tsx
│   │   │   ├── ProjectList.tsx
│   │   │   ├── AddProjectModal.tsx
│   │   │   ├── AnalysisProgress.tsx
│   │   │   ├── ScoreBreakdown.tsx
│   │   │   └── TechStackBadges.tsx
│   │   │
│   │   ├── jobs/               # Job components
│   │   │   ├── JobCard.tsx
│   │   │   ├── JobFilters.tsx
│   │   │   ├── JobDetails.tsx
│   │   │   └── ApplicationCard.tsx
│   │   │
│   │   └── recruiter/          # Recruiter components
│   │       ├── CandidateCard.tsx
│   │       ├── SearchFilters.tsx
│   │       ├── ShortlistPanel.tsx
│   │       └── StatsCards.tsx
│   │
│   ├── pages/                  # Page components
│   │   ├── Landing.tsx
│   │   ├── Login.tsx
│   │   ├── Callback.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Profile.tsx
│   │   ├── Settings.tsx
│   │   ├── Projects.tsx
│   │   ├── ProjectDetail.tsx
│   │   ├── PublicProfile.tsx
│   │   ├── Jobs.tsx
│   │   ├── JobDetail.tsx
│   │   ├── Applications.tsx
│   │   ├── Resume.tsx
│   │   └── recruiter/
│   │       ├── RecruiterDashboard.tsx
│   │       ├── CandidateSearch.tsx
│   │       ├── CandidateProfile.tsx
│   │       └── Shortlist.tsx
│   │
│   ├── hooks/                  # Custom hooks
│   │   ├── useAuth.ts
│   │   ├── useUser.ts
│   │   ├── useProjects.ts
│   │   ├── useJobs.ts
│   │   └── useToast.ts
│   │
│   ├── store/                  # Zustand stores
│   │   ├── authStore.ts
│   │   └── uiStore.ts
│   │
│   ├── types/                  # TypeScript types
│   │   ├── user.types.ts
│   │   ├── project.types.ts
│   │   ├── job.types.ts
│   │   └── api.types.ts
│   │
│   ├── utils/                  # Utilities
│   │   ├── constants.ts
│   │   ├── formatters.ts
│   │   └── validators.ts
│   │
│   ├── styles/                 # Global styles
│   │   └── globals.css
│   │
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
│
├── .env.example
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## 📱 Pages & Components Design

### 1. Landing Page (`/`)
```
┌─────────────────────────────────────────────────────┐
│  [Logo]  Features  Pricing  Docs    [Login GitHub]  │
├─────────────────────────────────────────────────────┤
│                                                     │
│     Verify Your Skills with Code, Not Words 🚀     │
│                                                     │
│     [Animated code analysis visualization]          │
│                                                     │
│          [ Get Started with GitHub ]                │
│                                                     │
├─────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐              │
│  │ Analyze │  │ Score   │  │ Connect │              │
│  │ Code    │  │ Skills  │  │ Jobs    │              │
│  └─────────┘  └─────────┘  └─────────┘              │
├─────────────────────────────────────────────────────┤
│  [Featured Developers Showcase]                     │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐                       │
│  │Dev1│ │Dev2│ │Dev3│ │Dev4│                       │
│  └────┘ └────┘ └────┘ └────┘                       │
├─────────────────────────────────────────────────────┤
│  [How It Works Section]                             │
│  1. Connect GitHub → 2. Analyze → 3. Get Verified  │
└─────────────────────────────────────────────────────┘
```

### 2. Dashboard (`/dashboard`)
```
┌─────────────────────────────────────────────────────┐
│  [Logo]  Dashboard  Projects  Jobs    [Avatar ▼]   │
├────────────┬────────────────────────────────────────┤
│            │                                        │
│  Dashboard │  Welcome back, {name}! 👋             │
│  Projects  │                                        │
│  Jobs      │  ┌─────────────────────────────────┐  │
│  Resume    │  │  AURA SCORE                     │  │
│  Settings  │  │  ████████████░░░░  2,450 pts    │  │
│            │  │  Level: Advanced Developer       │  │
│            │  │  Top 15% globally               │  │
│            │  └─────────────────────────────────┘  │
│            │                                        │
│            │  ┌────────┐ ┌────────┐ ┌────────┐    │
│            │  │Projects│ │ Skills │ │ Cores  │    │
│            │  │   5    │ │  12    │ │   2    │    │
│            │  └────────┘ └────────┘ └────────┘    │
│            │                                        │
│            │  Recent Projects                       │
│            │  ┌─────────────────────────────────┐  │
│            │  │ 📁 project-name    ⭐ 85/100    │  │
│            │  │ React, TypeScript   Analyzed ✓  │  │
│            │  └─────────────────────────────────┘  │
│            │                                        │
│            │  Skills Overview                       │
│            │  [Radar Chart of verified skills]     │
│            │                                        │
└────────────┴────────────────────────────────────────┘
```

### 3. Projects Page (`/projects`)
```
┌─────────────────────────────────────────────────────┐
│  My Projects                    [+ Add Project]     │
├─────────────────────────────────────────────────────┤
│  Filter: [All ▼] [Analyzed ▼]   Sort: [Recent ▼]   │
├─────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────┐   │
│  │ 📌 verifydev-frontend           ⭐ 92/100   │   │
│  │ ─────────────────────────────────────────── │   │
│  │ React • TypeScript • TailwindCSS            │   │
│  │ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐       │   │
│  │ │Code  │ │Struct│ │Tests │ │Docs  │       │   │
│  │ │ 95   │ │ 88   │ │ 90   │ │ 85   │       │   │
│  │ └──────┘ └──────┘ └──────┘ └──────┘       │   │
│  │ [Re-analyze] [View Details] [🗑️]           │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ backend-api                     ⭐ 78/100   │   │
│  │ ─────────────────────────────────────────── │   │
│  │ Node.js • Express • PostgreSQL              │   │
│  │ 🔄 Analyzing... (45%)                       │   │
│  │ ████████████░░░░░░░░░░░░░░░░               │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### 4. Add Project Modal
```
┌─────────────────────────────────────────────────────┐
│  Add Project for Analysis                      [✕]  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  GitHub Repository URL                              │
│  ┌─────────────────────────────────────────────┐   │
│  │ https://github.com/username/repo            │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  Or select from your repositories:                  │
│  ┌─────────────────────────────────────────────┐   │
│  │ 🔍 Search repositories...                   │   │
│  └─────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────┐         │
│  │ ☐ awesome-project     ⭐12  TypeScript│         │
│  │ ☐ another-repo        ⭐5   Python    │         │
│  │ ☐ my-portfolio        ⭐3   React     │         │
│  └──────────────────────────────────────┘         │
│                                                     │
│  Selected: 1/3 (Free tier allows 10 total)         │
│                                                     │
│            [Cancel]  [Analyze Selected]             │
└─────────────────────────────────────────────────────┘
```

### 5. Public Profile (`/u/:username`)
```
┌─────────────────────────────────────────────────────┐
│  [Logo]              [Login GitHub]                 │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌────────┐  John Developer                        │
│  │ Avatar │  @johndoe • San Francisco              │
│  │   ✓    │  Full Stack Developer                  │
│  └────────┘                                         │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  ⚡ AURA: 2,450    🔥 CORES: 2    ✓ VERIFIED │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ─────────── Verified Skills ───────────           │
│  ┌──────────────────────────────────────────┐      │
│  │ React ████████████░░░  92%  ✓ Verified   │      │
│  │ TypeScript █████████░░░  85%  ✓ Verified │      │
│  │ Node.js ████████░░░░░  75%  ✓ Verified   │      │
│  │ PostgreSQL ██████░░░░░░  60%  ✓ Verified │      │
│  └──────────────────────────────────────────┘      │
│                                                     │
│  ─────────── Pinned Projects ───────────           │
│  ┌────────────────┐  ┌────────────────┐           │
│  │ Project 1      │  │ Project 2      │           │
│  │ Score: 92/100  │  │ Score: 85/100  │           │
│  └────────────────┘  └────────────────┘           │
│                                                     │
│  [📥 Download Resume]  [💼 Open to Work]           │
└─────────────────────────────────────────────────────┘
```

### 6. Jobs Page (`/jobs`)
```
┌─────────────────────────────────────────────────────┐
│  Job Listings                                       │
├─────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────┐   │
│  │ 🔍 Search jobs...          [Location ▼]     │   │
│  │ [Remote ▼] [Full-time ▼] [Skills ▼]         │   │
│  └─────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ 🏢 TechCorp                                 │   │
│  │ Senior React Developer       $150k-180k     │   │
│  │ Remote • Full-time                          │   │
│  │ ┌────┐┌────┐┌────┐                         │   │
│  │ │React││TS  ││Node│  85% Match ✓           │   │
│  │ └────┘└────┘└────┘                         │   │
│  │ [View Details]  [Quick Apply]               │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ 🏢 StartupXYZ                               │   │
│  │ Full Stack Engineer          $120k-150k     │   │
│  │ San Francisco • Hybrid                      │   │
│  │ 72% Match                                   │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 🎨 Design System

### Colors (Dark Theme Primary)
```css
:root {
  --bg-primary: #0a0a0a;
  --bg-secondary: #141414;
  --bg-card: #1a1a1a;
  --border: #2a2a2a;
  
  --text-primary: #ffffff;
  --text-secondary: #a1a1a1;
  --text-muted: #666666;
  
  --accent-primary: #6366f1;    /* Indigo */
  --accent-secondary: #8b5cf6;  /* Purple */
  --accent-success: #22c55e;    /* Green */
  --accent-warning: #f59e0b;    /* Amber */
  --accent-error: #ef4444;      /* Red */
  
  --gradient-primary: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  --gradient-aura: linear-gradient(135deg, #f59e0b 0%, #ef4444 50%, #8b5cf6 100%);
}
```

### Typography
```css
/* Headings: Inter */
font-family: 'Inter', system-ui, sans-serif;

/* Code: JetBrains Mono */
font-family: 'JetBrains Mono', monospace;
```

### Aura Level Colors
```
Novice (0-500):     #6b7280 (Gray)
Beginner (501-1000): #22c55e (Green)
Intermediate (1001-2000): #3b82f6 (Blue)
Advanced (2001-3500): #8b5cf6 (Purple)
Expert (3501-5000): #f59e0b (Gold)
Legend (5001+): #ef4444 (Red/Fire)
```

---

## 🔄 State Management

### Auth Store (Zustand)
```typescript
interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  login: (tokens: Tokens) => void;
  logout: () => void;
  refreshToken: () => Promise<void>;
  fetchUser: () => Promise<void>;
}
```

### UI Store
```typescript
interface UIState {
  theme: 'dark' | 'light';
  sidebarOpen: boolean;
  modals: {
    addProject: boolean;
    settings: boolean;
  };
  
  // Actions
  toggleTheme: () => void;
  toggleSidebar: () => void;
  openModal: (name: string) => void;
  closeModal: (name: string) => void;
}
```

---

## 📡 API Integration

### React Query Setup
```typescript
// Queries
useUser()           // GET /users/me
useProjects()       // GET /projects
useProject(id)      // GET /projects/:id
usePublicProfile(username)
useJobs(filters)
useApplications()

// Mutations
useAddProject()
useBatchAnalyze()
useUpdateProfile()
useApplyJob()
useTogglePin()
```

---

## 🚀 Implementation Priority

### Phase 1: Core (Week 1)
1. Project setup (Vite, TailwindCSS, Shadcn)
2. Auth flow (GitHub OAuth)
3. Dashboard page
4. Basic navigation

### Phase 2: Projects (Week 2)
1. Projects list page
2. Add project modal
3. Project detail page
4. Analysis progress

### Phase 3: Profile (Week 3)
1. User profile editing
2. Public profile page
3. Resume generation
4. Skills display

### Phase 4: Jobs (Week 4)
1. Job listings
2. Job filters
3. Applications
4. Recruiter views

### Phase 5: Polish (Week 5)
1. Animations
2. Dark/Light theme
3. Mobile responsive
4. Performance optimization
