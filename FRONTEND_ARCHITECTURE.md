# Frontend Architecture & Implementation Guide
## Project: DevVerify (Aura)

**Table of Contents**
1. [Project Vision](#project-vision)
2. [Backend Capabilities Analysis](#backend-capabilities-analysis)
3. [User Experience Strategy](#user-experience-strategy)
4. [Detailed Feature Specifications](#detailed-feature-specifications)
5. [Technical Architecture](#technical-architecture)
6. [Component Design System](#component-design-system)

---

## 1. Project Vision
DevVerify is a "Developer Reputation Platform" that moves beyond static resumes. It verifies skills through actual code analysis (GitHub), assigns a trust score ("Aura"), and connects developers with recruiters based on *verified* ability, not just claims. The frontend must reflect this: it should feel **futuristic, trustworthy, and data-rich**.

---

## 2. Backend Capabilities Analysis
Based on deep analysis of `user-service`, `project-analyzer`, `aura-processor`, `resume-service`, and `recruiter-service`, here is what the system can do:

### Verification Engine (`project-analyzer` + `aura-processor`)
- **Deep Code Analysis**: Detects languages, frameworks (React, NestJS), databases, and tools (Docker).
- **Quality Metrics**: Scores code based on Linting, Testing, Documentation, CI/CD, and Folder Structure.
- **React-Specific Analysis**: Detects Hooks, Memoization, State Management (Redux/Zustand), and Performance patterns.
- **Aura Score**: 0-1000 score composed of Code Quality, Consistency, Complexity, and Community Impact.
- **Suggestions**: AI-driven tips like "Add Dockerfile", "Use useMemo", "Setup CI/CD".

### Resume Engine (`resume-service`)
- **PDF Generation**: High-fidelity PDF generation using Headless Chrome.
- **Live Preview**: Generates HTML preview identical to the PDF.
- **Structured Data**: Auto-fills skills, projects, and stats from the verification engine.

### Recruiting Engine (`recruiter-service`)
- **Advanced Search**: Filter by Verified Skills (e.g., "React > 80% confidence"), Aura Score, Location.
- **Evidence-Based Hiring**: View "Evidence" for every skill (e.g., "React: Used in 3 projects, 5000 lines of code, uses Custom Hooks").
- **Shortlisting**: Manage candidate pipelines.

---

## 3. User Experience Strategy

### Design Aesthetic: "Cyberpunk Professional"
- **Theme**: Dark mode default. Deep blues, purples, and neon accents (Cyan/Magenta) for the "Aura".
- **Visuals**:
    - **Radar Charts**: For comparing Skill Categories (Backend vs Frontend vs DevOps).
    - **Gauges/Rings**: For the main Aura Score.
    - **Glassmorphism**: For cards and overlays to give depth.
- **Interactions**: Smooth transitions (Framer Motion). Instant feedback.

### User Personas
1.  **Developer (The Talent)**: Wants to prove their skills, improve their code, and get hired.
    - *Key Action*: Sync GitHub -> Get Score -> Optimize Profile -> Apply.
2.  **Recruiter (The Hirer)**: Wants to find *verified* talent quickly without wading through fake resumes.
    - *Key Action*: Search -> Verify Evidence -> Shortlist -> Contact.

---

## 4. Detailed Feature Specifications

### A. Developer Portal

#### 1. The Dashboard (Command Center)
- **Hero Section**: Large, animated Aura Score gauge. Level (e.g., "Expert", "Legendary").
- **Activity Feed**: Recent scans, profile views, new badges.
- **Quick Actions**: "Sync New Repo", "Update Resume", "Browse Jobs".

#### 2. Project Analysis Deep Dive
*Critical Feature* - Show off the `project-analyzer` data.
- **List View**: All imported repos with their individual scores.
- **Detail View**:
    - **Scorecard**: Breakdown of Structure, Quality, Testing, Docs.
    - **Tech Stack Detected**: Icons for React, TypeScript, Docker, etc.
    - **Improvements Checklist**: e.g., "⚠️ Missing unit tests (+10 pts)", "✅ Dockerfile present".
    - **React Analysis**: "Uses Custom Hooks", "State: Zustand".

#### 3. Verified Skills Profile
- **Skill Matrix**: Grid of skills with verification level (Unverified vs Verified).
- **Evidence Modal**: Clicking a skill (e.g., "Docker") shows *why* it's verified (e.g., "Found Dockerfile in 3 repos").
- **Manual vs Auto**: Distinct visual difference between user-claimed skills and system-verified skills.

#### 4. Resume Builder
- **Template Selector**: Choose from modern templates.
- **Real-time Preview**: Split screen editor. Left: Data controls. Right: HTML preview (from `GenerateHTML`).
- **One-Click Download**: Generates PDF via backend.

#### 5. Job Board
- **Smart Match**: "85% Match" badge on jobs based on verified skills.
- **Gap Analysis**: "You match React and Node, but missing Redis."

---

### B. Recruiter Portal

#### 1. Talent Search
- **Visual Filters**: Sliders for Min Aura Score, Min Skill Confidence.
- **Boolean Search**: "React AND (Node OR Go)".

#### 2. Candidate "X-Ray" View
- **Trust Indicators**: Highlighting verified claims vs unverified.
- **Code Samples**: Direct links to best code blocks (if public).
- **Growth Graph**: How the candidate's skills have improved over time.

---

## 5. Technical Architecture

### Frontend Stack (Recommended)
- **Framework**: React 18 + Vite (Fast dev server, optimized build).
- **Language**: TypeScript (Strict mode).
- **Styling**: Tailwind CSS (Utility-first) + `clsx`/`tailwind-merge`.
- **UI Library**: Shadcn/UI (Radix Primitives) for accessible, customizable components.
- **Icons**: Lucide React.
- **Animations**: Framer Motion.
- **Charts**: Recharts (for Radar/Area charts).

### State Management
- **Auth/Session**: `Zustand` with persistence (localStorage).
- **Server Data**: `TanStack Query (React Query)` v5.
    - *Why?* Caching, background refetching, and optimistic updates are crucial for the "Syncing GitHub" experience.

### Folder Structure
```
src/
├── api/            # Axios setup & typed API calls
├── assets/         # static files
├── components/     # Shared components
│   ├── aria/       # Design system (Buttons, Cards)
│   ├── features/   # Feature-specific (ProjectCard, SkillGraph)
│   └── layout/     # Shells (DashboardLayout, AuthLayout)
├── hooks/          # Custom hooks (useAuth, useProjects)
├── lib/            # Utilities (dates, numbers, validation)
├── pages/          # Route components
├── store/          # Global state (auth-store.ts)
└── types/          # TypeScript interfaces (sync with backend)
```

## 6. Implementation Checklist (A to Z)

### Phase 1: Foundation
- [ ] Setup Vite + TS + Tailwind.
- [ ] Implement `apiClient` with Interceptors (Handle 401 refresh logic).
- [ ] Create Auth Layout & Dashboard Layout (Sidebar/Navbar).

### Phase 2: Core Developer Features
- [ ] **GitHub OAuth Flow**: Handle redirects and token storage.
- [ ] **Dashboard Widgets**: Connect to `/api/v1/users/me/stats`.
- [ ] **Project Import**: Button to trigger `/api/v1/projects/import`.
- [ ] **Analysis View**: Visualize the JSON output from `project-analyzer`.
    - Create `ScoreGauge` component.
    - Create `TechStackIcon` mapper.

### Phase 3: Resume & Jobs
- [ ] **Resume Editor**: Form to edit profile/experience.
- [ ] **PDF Preview**: Iframe rendering `/api/v1/resume/preview`.
- [ ] **Job Feed**: Infinite scroll list of jobs.

### Phase 4: Recruiter Features
- [ ] **Search Interface**: Complex filter state management.
- [ ] **Candidate Card**: High-level summary view.
- [ ] **Shortlist Actions**: Optimistic UI updates.

