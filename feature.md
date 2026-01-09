# VerifyDev 🚀

> **VerifyDev** is a developer-first platform that **verifies skills through actual code analysis**, builds professional resumes automatically, and connects verified developers with recruiters — eliminating noise and building trust.

---

## 🎯 Problem Statement

### For Developers:
- ❌ Skills on resume are **self-claimed** (no proof)
- ❌ Building resume is **time-consuming**
- ❌ Portfolio websites are **static** and don't show real skills
- ❌ Job hunting is **noisy** with irrelevant listings
- ❌ No single platform to showcase **coding + DSA skills**

### For Recruiters:
- ❌ Can't **verify** if candidate actually knows the tech
- ❌ Resumes are **generic** and look the same
- ❌ Finding right candidates is like **finding needle in haystack**
- ❌ No way to filter by **actual skill level**
- ❌ No visibility into candidate's **problem-solving ability**

---

## 💡 Solution: VerifyDev

**One platform where skills are verified from actual code, DSA profiles are synced, resumes are auto-generated, and recruiters find the right developers instantly.**

---

## 🔥 Core Features

### 1️⃣ Multi-Platform Authentication 🔐

#### Developer Login/Signup Options:
- **Email OTP** - Simple email-based authentication
- **GitHub OAuth** - One-click login with GitHub
- **Google OAuth** - Sign in with Google
- **LinkedIn OAuth** - Professional network login

> 📱 **Note:** Mobile number is NOT required for developers. Only email is needed.

#### After Signup - Platform Connection:
After successful signup, developers are directed to a **Platform Connection Page** where they can link:
- 🐙 **GitHub** - For project analysis & code verification
- 💻 **LeetCode** - For DSA skills verification
- 🧠 **GeeksforGeeks** - For competitive programming stats
- 🔗 **LinkedIn** - For professional profile sync
- 📦 **npm** - For published packages
- 🐍 **PyPI** - For Python packages
- 🎨 **CodePen** - For frontend demos
- 📝 **Dev.to** - For technical writing

---

### 2️⃣ DSA Verification System 🧮

#### LeetCode Integration:
- Total problems solved (Easy/Medium/Hard)
- Contest rating & ranking
- Streak & consistency
- Top 100 interview problems completion
- Company-wise problem completion

#### GeeksforGeeks Integration:
- Total problems solved
- Coding score
- Institute rank
- Monthly coding score

#### Combined DSA Score:
```
┌─────────────────────────────────────────────────────────┐
│              DSA VERIFICATION PROFILE                    │
├─────────────────────────────────────────────────────────┤
│  LeetCode         ████████████████░░░░  823 problems    │
│  Contest Rating   ██████████████░░░░░░  1847 (Top 15%)  │
│  GeeksforGeeks    ████████████░░░░░░░░  456 problems    │
│  Combined Score   ██████████████████░░  89/100 ✅       │
└─────────────────────────────────────────────────────────┘
```

---

### 3️⃣ Smart Resume Builder

#### Auto-Fill from Connected Platforms:
- **GitHub**: Profile picture, name, repos, contribution graph
- **LeetCode**: Problem count, contest rating
- **GeeksforGeeks**: Coding score, problem count
- **LinkedIn**: Work experience, education

#### Manual Sections:
- **Experience** - Job history, roles, duration
- **Education** - Degrees, certifications
- **Core Skills** - Self-declared skills (to be verified)
- **Projects** - Add GitHub repos for analysis

#### Resume Templates:
- 🎨 **Modern Dark Theme** - Sleek developer-focused design
- 📄 **Classic Professional** - Traditional corporate format
- 🚀 **Tech Focused** - Highlights projects & skills
- 💼 **ATS-Optimized** - Passes applicant tracking systems
- 🎯 **Minimal** - Clean, distraction-free layout

---

### 4️⃣ Project Analyzer Engine (AI-Powered) 🧠

When user adds a GitHub project, the system deeply analyzes:

#### 📁 Folder Structure Analysis
- Is it well-organized?
- Follows industry conventions?
- Proper separation of concerns?
- Clean architecture patterns?

#### 🧠 Code Quality Assessment
- Clean code practices
- Naming conventions
- Error handling patterns
- DRY principle adherence
- SOLID principles usage

#### 🔧 Tech Stack Detection
- Automatic detection from:
  - `package.json` (Node/React)
  - `go.mod` (Golang)
  - `requirements.txt` (Python)
  - `Dockerfile` / `docker-compose.yml`
  - CI/CD configs (`.github/workflows`)

#### ⚛️ Framework-Specific Analysis

**React Projects:**
- Custom hooks usage
- Memoization (useMemo, useCallback, React.memo)
- Component splitting & reusability
- State management (Redux, Zustand, Context)
- Performance optimizations
- Lazy loading implementation

**Node.js Projects:**
- API design patterns
- Error handling middleware
- Authentication implementation
- Database patterns (ORM usage)
- Security best practices

**Go Projects:**
- Goroutines & concurrency patterns
- Error handling (idiomatic Go)
- Project structure
- Interface usage
- Testing patterns

#### 📊 Best Practices Score
- Environment variables handling
- Security patterns
- Testing coverage percentage
- Git practices (commits, branches)
- Documentation quality

---

### 5️⃣ AURA Score System ⚡

The **AURA Score** is a comprehensive developer rating combining:

```
┌─────────────────────────────────────────────────────────┐
│              AURA SCORE BREAKDOWN                        │
├─────────────────────────────────────────────────────────┤
│  Code Quality      (40%)  ████████░░  32/40 points      │
│  DSA Skills        (25%)  ██████░░░░  18/25 points      │
│  Project Diversity (15%)  █████░░░░░  11/15 points      │
│  Consistency       (10%)  ████████░░   8/10 points      │
│  Community         (10%)  ██████░░░░   6/10 points      │
├─────────────────────────────────────────────────────────┤
│  TOTAL AURA SCORE         ████████░░  75/100 ⚡         │
└─────────────────────────────────────────────────────────┘
```

#### Score Components:
- **Code Quality (40%)**: From project analysis - patterns, structure, best practices
- **DSA Skills (25%)**: LeetCode + GeeksforGeeks combined
- **Project Diversity (15%)**: Different tech stacks, languages
- **Consistency (10%)**: Regular commits, streak maintenance
- **Community (10%)**: Stars, forks, open source contributions

---

### 6️⃣ Verified Skills with Percentages ✅

Based on project analysis, skills are assigned verified percentages:

```
┌─────────────────────────────────────────────────────────┐
│              VERIFIED SKILL PROFILE                      │
├─────────────────────────────────────────────────────────┤
│  React.js       ████████████████░░░░  80% ✅ Verified   │
│  Node.js        ██████████████░░░░░░  70% ✅ Verified   │
│  TypeScript     ████████████░░░░░░░░  60% ✅ Verified   │
│  Go             ██████████░░░░░░░░░░  50% ✅ Verified   │
│  Docker         ████████░░░░░░░░░░░░  40% ✅ Verified   │
│  PostgreSQL     ██████░░░░░░░░░░░░░░  30% ✅ Verified   │
└─────────────────────────────────────────────────────────┘
```

**Scoring Factors:**
- Lines of code in that technology
- Best practices followed
- Code quality score
- Usage complexity (basic vs advanced patterns)
- Multiple projects using same tech = higher score

---

### 7️⃣ Auto-Generated Resume 📄

System automatically creates a professional resume with:

- **Verified Skills Badges** - Shows actual skill levels
- **Project Highlights** - Best analyzed projects
- **Code Quality Indicators** - Average code quality score
- **GitHub Stats** - Commits, PRs, contributions
- **Clean, Recruiter-Friendly Format**
- **One-Click PDF/Link Export**
- **Shareable Public Profile Link**

---

### 8️⃣ Job Discovery & Application 💼

#### For Developers:
- Browse curated job listings
- Smart matching based on verified skills
- One-click apply with auto-attached profile
- Track application status
- Get matched with jobs that fit your skill level

#### Job Filtering:
- By tech stack
- By experience level
- By location (remote/onsite)
- By salary range
- By AURA score range
- By DSA rating

---

### 9️⃣ Recruiter Dashboard 👔

#### Find Right Developers:
- Filter by **verified skills** (not self-claimed)
- Filter by **skill percentage** (e.g., React > 70%)
- Filter by **code quality score**
- Filter by **AURA score** (e.g., > 80)
- Filter by **DSA rating** (e.g., LeetCode > 1800)
- Filter by **experience level**
- Filter by **location/availability**

#### No Noise Hiring:
- See actual code quality, not just keywords
- Verified skill percentages from real projects
- Direct profile access with all analysis
- Shortlist & contact developers directly

#### Recruiter Features:
- Company profile setup
- Job posting with requirements
- Candidate matching algorithm
- Application management
- Interview scheduling (future)

---

## 💎 Pricing Tiers

### 🆓 Free (Developer)
- GitHub OAuth login
- Add up to **3 projects** for analysis
- Basic resume template
- Public profile
- Apply to jobs

### 💼 Pro (Developer) - Future
- **Unlimited projects**
- Premium resume templates
- Priority in recruiter search
- Advanced analytics
- Custom profile URL

### 🏢 Recruiter Plan - Future
- Access to verified developer pool
- Advanced search filters
- Unlimited job postings
- Analytics dashboard
- API access

---

## 🛠️ Tech Stack

### Frontend
- **React** + **Vite** (Fast, modern)
- **Tailwind CSS** (Styling)
- **Zustand/Redux** (State management)

### Backend Services
- **Go** - Project Analyzer Service (fast parsing)
- **Node.js** - User/Auth/Resume Service
- **gRPC** - Service-to-service communication

### Databases
- **PostgreSQL** - Users, resumes, jobs
- **MongoDB** - Project analysis results, logs
- **Redis** - Caching, sessions

### AI/ML
- **OpenAI/Gemini API** - Code analysis, insights
- **Custom Models** - Skill scoring algorithms

### Infrastructure
- **Nginx** - API Gateway, load balancing
- **Docker** + **Docker Compose** - Containerization
- **GitHub Actions** - CI/CD

### External APIs
- **GitHub API** - Repo access, OAuth
- **SendGrid** - Emails

---

## 🚀 Future Roadmap

### Phase 2
- [ ] Resume templates marketplace
- [ ] LinkedIn integration
- [ ] Portfolio website generator
- [ ] Chrome extension for job applications

### Phase 3
- [ ] AI-powered cover letter generator
- [ ] Interview preparation based on skills
- [ ] Skill improvement recommendations
- [ ] Learning path suggestions

### Phase 4
- [ ] Video introductions
- [ ] Coding challenges integration
- [ ] Company reviews by verified devs
- [ ] Referral system

---

## 🎯 Target Users

### Primary
- **Junior to Mid-level Developers** looking for jobs
- **Self-taught developers** who need to prove skills
- **Career switchers** entering tech

### Secondary
- **Recruiters** at tech companies
- **HR teams** at startups
- **Freelance developers** building credibility

---

## 🌟 Unique Value Proposition

> **"Don't tell recruiters you know React. Prove it with verified code analysis."**

VerifyDev is the **LinkedIn of verified developers** where skills are not self-claimed but **proven through actual code**.

---

## 📄 License

MIT License

---

### ⭐ Built for developers who want to stand out with verified skills, not just keywords.
