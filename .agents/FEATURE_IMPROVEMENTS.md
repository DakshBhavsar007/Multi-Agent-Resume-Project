# 🚀 Vishleshan — Feature Improvements & Updates

> **Date:** June 27, 2026  
> **Focus:** New features, enhancements, and UX upgrades for both Frontend and Backend

---

## 📋 Table of Contents

- [Frontend Feature Improvements](#-frontend-feature-improvements)
  - [Job Seeker Portal](#1-job-seeker-portal)
  - [Recruiter Dashboard](#2-recruiter-dashboard)
  - [Developer Portal](#3-developer-portal)
  - [Global Frontend](#4-global-frontend-improvements)
- [Backend Feature Improvements](#-backend-feature-improvements)
  - [API & Data Layer](#5-api--data-layer)
  - [AI Agents](#6-ai-agents--intelligence)
  - [Infrastructure](#7-infrastructure--services)

---

## 🎨 FRONTEND FEATURE IMPROVEMENTS

---

### 1. Job Seeker Portal

#### 1.1 ❌ Home Page Uses Hardcoded Dummy Data — Not Real Jobs
**File:** `frontend/src/pages/user/UserHome.jsx` + `frontend/src/lib/data.js`

Your landing page imports from `data.js` which has **8 hardcoded fake jobs** (Vela, Lumen Labs, Atlas Pay, etc.) and **6 fake companies**. The "Featured Jobs" and "Top Companies" sections on the home page show this static data, NOT real jobs from your database.

**Fix:**
```javascript
// Replace this:
import { jobs, companies } from "../../lib/data";
const featured = jobs.slice(0, 4);

// With this:
const { data: featured } = useQuery({
  queryKey: ['featured-jobs'],
  queryFn: () => publicAPI.listJobs({ limit: 4, sort: 'newest' })
});
```

#### 1.2 ❌ Market Trends Page — All Data is Hardcoded
**File:** `frontend/src/pages/JobsTrendsPage.jsx`

Salary timeline, region distribution, top skills demand, hiring velocity — **everything is static hardcoded arrays**. This page has zero connection to real data.

**Fix:**
- Create a backend endpoint `GET /api/v1/analytics/trends` that aggregates real data from your sessions/candidates tables
- Calculate actual average salaries from `Session.salary_range`
- Compute real skill demand from `Candidate.normalized_skills` across all sessions
- Show actual job count by location from `Session.location`

#### 1.3 ❌ No Pagination on Job Listings
**File:** `frontend/src/pages/user/UserJobs.jsx`

All jobs are fetched at once. With 100+ job postings, this will become very slow.

**Fix:**
- Add server-side pagination: `GET /api/v1/public/jobs?page=1&per_page=20`
- Add infinite scroll or "Load More" button
- Add total count in API response: `{ jobs: [...], total: 245, page: 1 }`

#### 1.4 ❌ No Email Verification for Job Seekers
**File:** `backend/api/views/seeker_auth.py`

Job seekers can register with any email — no verification step. Fake accounts can spam applications.

**Fix:**
- Send verification email on registration
- Block login until email is verified
- Add "Resend verification email" option

#### 1.5 ❌ No "Forgot Password" Flow
**Files:** All auth views (recruiter, seeker, developer)

None of the 3 portals have a password reset mechanism. If a user forgets their password, they're permanently locked out.

**Fix:**
- Add `POST /api/v1/auth/forgot-password` → sends reset link via email
- Add `POST /api/v1/auth/reset-password` → validates token + sets new password
- Add UI pages for forgot/reset password on all 3 portals

#### 1.6 ❌ No Profile Photo Upload for Seekers
**File:** `frontend/src/pages/user/UserProfile.jsx`

The profile page has full editing for name, headline, skills, experience — but no profile photo/avatar upload. Companies see faceless candidates.

**Fix:**
- Add avatar upload in profile editor
- Store in `JobSeekerAccount.avatar_path`
- Show in application cards and company views

#### 1.7 ❌ No Notification Sound / Browser Push Notifications
**Files:** Notification system across seeker portal

Notifications only appear when users manually visit the app. No browser push notifications or sounds.

**Fix:**
- Implement Web Push API with service workers
- Add notification sound toggle in settings
- Add desktop notification permission prompt

#### 1.8 ❌ Dashboard Stats Are Not Dynamic
**File:** `frontend/src/pages/DashboardHome.jsx` (Line 73-76)

The stat card trends like "+3 this week", "+18 today", "2 ending soon" are **hardcoded strings**, not actual computed values.

```jsx
// Currently hardcoded:
<StatCard trend="+3 this week" />
<StatCard trend="+18 today" />

// Should compute from real data
```

**Fix:** Calculate actual weekly/daily deltas from `created_at` timestamps.

#### 1.9 ❌ ResumeEditor.jsx is a 2,500-Line Monolith (115KB)
**File:** `frontend/src/pages/user/ResumeEditor.jsx` — **2,516 lines, 115KB**

This is the single largest file in the entire codebase. It contains the resume form, live preview, ATS scoring, template switching, dark mode toggle, version history — everything in one file.

**Fix:** Break into sub-components:
- `components/resume-editor/PersonalInfoForm.jsx`
- `components/resume-editor/ExperienceForm.jsx`
- `components/resume-editor/EducationForm.jsx`
- `components/resume-editor/SkillsForm.jsx`
- `components/resume-editor/ATSScorePanel.jsx`
- `components/resume-editor/VersionHistory.jsx`
- `components/resume-editor/TemplateSelector.jsx`

---

### 2. Recruiter Dashboard

#### 2.1 ❌ No Real-Time Notifications for Recruiters
**File:** `frontend/src/pages/DashboardLayout.jsx`

Recruiters have no notification bell/center. When a job seeker applies, the recruiter has no way to know except by manually refreshing the sessions page.

**Fix:**
- Add notification bell in recruiter navbar
- Show unread count badge
- Backend already has `Notification` model with `company` FK — just wire up a polling endpoint or WebSocket

#### 2.2 ❌ No Candidate Comparison View
**File:** `frontend/src/pages/SessionWorkspacePage.jsx`

Recruiters can view candidates one-by-one but cannot compare 2-3 candidates side by side (skills, experience, match scores).

**Fix:**
- Add multi-select checkboxes on candidate cards
- "Compare Selected" button → opens a side-by-side comparison modal/page
- Show skill overlap, experience difference, match score comparison

#### 2.3 ❌ No Interview Scheduling / Calendar Integration
**File:** `backend/api/views/sessions.py`

Sessions have "rounds" but no way to schedule actual interview times, send calendar invites, or set reminders.

**Fix:**
- Add `interview_date`, `interview_link` fields to round model
- Google Calendar API integration for sending invites
- Email notification to candidate with meeting link

#### 2.4 ❌ No Bulk Email to Candidates
**File:** `backend/api/services/email_service.py`

Email service exists but only sends individual notifications. No way for recruiters to bulk-email shortlisted or rejected candidates.

**Fix:**
- Add `POST /api/v1/sessions/{id}/email-candidates` endpoint
- Template-based emails (rejection, shortlist, offer)
- Batch sending via Celery task

#### 2.5 ❌ No Session Analytics / Hiring Funnel Visualization
**File:** `frontend/src/pages/SessionWorkspacePage.jsx`

Session detail page shows candidates but lacks hiring funnel analytics (how many in each stage, conversion rates, time-to-hire).

**Fix:**
- Add a "Analytics" tab within session workspace
- Funnel chart: New → Shortlisted → Interviewed → Offered → Hired
- Average time per stage
- Skills distribution chart of candidates

#### 2.6 ❌ No Team/Multi-User Support for Companies
**File:** `backend/api/models.py`

Only one login per company. In reality, companies have multiple recruiters who need access.

**Fix:**
- Add `TeamMember` model (FK to Company + email + role)
- Roles: Admin, Recruiter, Viewer
- Each team member gets their own JWT
- Activity log per team member

---

### 3. Developer Portal

#### 3.1 ❌ DeveloperSettings Page is Empty
**File:** `frontend/src/pages/developer/DeveloperSettings.jsx` — **Only 7 lines**

The settings page just renders `DeveloperKeys` with a different tab prop. No actual settings functionality.

**Fix:** Add real settings:
- Account details (name, email, company)
- Change password
- Delete account
- Notification preferences
- API webhook notification settings

#### 3.2 ❌ No API Sandbox / Playground
**File:** `frontend/src/pages/developer/DeveloperDocs.jsx`

The docs page has code examples but no interactive API sandbox where developers can test requests with their key and see real responses.

**Fix:**
- Add "Try it Live" section next to each endpoint
- Pre-fill with user's test API key
- Show real request/response with timing

#### 3.3 ❌ No SDKs or Client Libraries
No downloadable SDK packages (npm/pip) for developers to integrate.

**Fix:**
- Generate a `vishleshan-js` npm package with typed methods
- Generate a `vishleshan-python` pip package
- Auto-generate from your API routes

---

### 4. Global Frontend Improvements

#### 4.1 ❌ No Dark Mode Toggle
**File:** `frontend/src/App.jsx`

The resume editor has a dark/light toggle but the main platform doesn't have a global dark mode.

**Fix:**
- Add dark mode toggle in all navbar/header components
- Use CSS variables that you already have for theming
- Persist preference in localStorage

#### 4.2 ❌ No 404 Page
**File:** `frontend/src/App.jsx` (Line 240)

```jsx
<Route path="*" element={<Navigate to="/" replace />} />
```

Invalid URLs silently redirect to home. Users get confused — they think the app is broken.

**Fix:** Create a proper 404 page with navigation options.

#### 4.3 ❌ No Loading / Error Boundaries
**File:** `frontend/src/App.jsx`

No `React.Suspense` or `ErrorBoundary` component. If any page component crashes, the entire app goes white.

**Fix:**
- Add `ErrorBoundary` wrapper with friendly error UI
- Add `Suspense` fallbacks with skeleton loading states
- Add retry button on error screens

#### 4.4 ❌ No SEO Meta Tags (Title / Description per Page)
**File:** All page components

No page has dynamic `<title>` or `<meta description>` tags. Every page shows the default "Vite App" title.

**Fix:**
- Use `react-helmet-async` or a simple `useEffect` to set page titles
- Add unique descriptions for each page
- Add Open Graph tags for social sharing

#### 4.5 ❌ No Keyboard Shortcuts
No keyboard shortcut support across the platform.

**Fix:**
- `Ctrl+K` → Global search
- `Ctrl+N` → New session (recruiter) / New resume (seeker)
- `Esc` → Close modals
- Arrow keys for navigation in lists

#### 4.6 ❌ No Accessibility (a11y) Implementation
No ARIA labels, no keyboard navigation, no screen reader support, no focus management.

**Fix:**
- Add `aria-label` to all interactive elements
- Add focus trap in modals
- Add skip-to-content links
- Test with screen reader

---

## ⚙️ BACKEND FEATURE IMPROVEMENTS

---

### 5. API & Data Layer

#### 5.1 ❌ No Pagination on Any List Endpoint
**File:** `backend/api/views/sessions.py`, `candidates.py`, `seeker_jobs.py`

All list endpoints return **every record at once**. With thousands of candidates/sessions, this will crash or timeout.

**Fix:**
```python
# Add to all list views:
page = int(request.GET.get('page', 1))
per_page = min(int(request.GET.get('per_page', 20)), 100)
offset = (page - 1) * per_page

queryset = Model.objects.all()[offset:offset + per_page]
total = Model.objects.count()

return JsonResponse(success_response({
    "items": [...],
    "total": total,
    "page": page,
    "per_page": per_page,
    "total_pages": math.ceil(total / per_page)
}))
```

#### 5.2 ❌ Email URLs are Hardcoded to localhost
**File:** `backend/api/services/email_service.py` (Line 37)

```python
http://localhost:5173/dashboard/sessions/{session_id}
```

All email links point to `localhost:5173`. In production, users will get broken links.

**Fix:**
```python
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
link = f"{frontend_url}/dashboard/sessions/{session_id}"
```

#### 5.3 ❌ No Search / Full-Text Search on Jobs
**File:** `backend/api/views/jobs.py`

Job search is basic string matching. No full-text search, no relevance ranking, no typo tolerance.

**Fix:**
- Use PostgreSQL full-text search with `SearchVector` + `SearchRank`
- Or integrate a search engine (Meilisearch / Elasticsearch)
- Add search relevance scoring

#### 5.4 ❌ No Soft Delete for Candidates
**File:** `backend/api/views/candidates.py`

Deleting a candidate does a hard `DELETE`. No way to recover accidentally deleted candidates.

**Fix:**
- Add `deleted_at` field to Candidate model
- Filter `deleted_at__isnull=True` by default
- Add "Trash" view for recruiters to restore deleted candidates

#### 5.5 ❌ No API Versioning Strategy
**Files:** `backend/api/urls.py`

Some routes use `/api/v1/`, some use `/api/developer/`, some use `/api/agents/`. No consistent versioning.

**Fix:**
- Move all routes under `/api/v1/`
- Plan `/api/v2/` for breaking changes
- Add API version header support

#### 5.6 ❌ No File Size / Type Validation on Uploads
**File:** `backend/api/views/ingest.py`

No server-side validation for uploaded resume file size or type. Users could upload 500MB videos or executable files.

**Fix:**
```python
MAX_SIZE = int(os.getenv("MAX_FILE_SIZE_MB", 10)) * 1024 * 1024
ALLOWED_TYPES = {'.pdf', '.docx', '.doc', '.txt'}

if file.size > MAX_SIZE:
    return error_response("File too large (max 10MB)")
if Path(file.name).suffix.lower() not in ALLOWED_TYPES:
    return error_response("Unsupported file type")
```

---

### 6. AI Agents & Intelligence

#### 6.1 ❌ No AI Interview Agent
Your agent system has parsing, matching, chatbot, fraud detection — but **no AI interview agent** that can conduct preliminary screening interviews.

**Fix:**
- Create `agents/interview_agent.py`
- Generate role-specific technical questions from job description
- Score candidate responses using LLM
- Provide recruiter with interview summary + recommendation

#### 6.2 ❌ No Candidate Recommendation Engine
No proactive recommendations — recruiters have to manually search.

**Fix:**
- Create `agents/recommendation_agent.py`
- When a new session is created, auto-suggest candidates from other sessions that match
- "Similar candidates" section on session page
- Weekly email digest with top matching candidates

#### 6.3 ❌ No Job Description Generator
Recruiters write job descriptions manually.

**Fix:**
- Create `agents/jd_generator_agent.py`
- Input: job title, skills, experience level
- Output: Professional, SEO-optimized job description
- Add "Generate with AI" button in New Session form

#### 6.4 ❌ No Cover Letter Generator for Seekers
Job seekers apply with optional cover notes but no AI assistance.

**Fix:**
- Create `agents/cover_letter_agent.py`
- Input: seeker resume data + job description
- Output: Tailored cover letter
- Add "Generate with AI" button on apply page

#### 6.5 ❌ No Skills Gap Analysis
No feature that tells seekers what skills they're missing for a specific job.

**Fix:**
- Compare seeker's `normalized_skills` vs job's `required_skills`
- Show "Skills you have ✅" vs "Skills to learn 📚"
- Suggest courses/certifications for missing skills

---

### 7. Infrastructure & Services

#### 7.1 ❌ No WebSocket / Real-Time Updates
All data fetching is polling-based. No real-time updates when:
- New candidate is uploaded (recruiter waits for page refresh)
- Application status changes (seeker polls manually)
- Chat messages arrive

**Fix:**
- Add Django Channels for WebSocket support
- Real-time candidate upload progress
- Live chat updates
- Instant notification delivery

#### 7.2 ❌ No File Storage Service (Using Local Disk)
**Files:** Upload handling across views

All uploaded files (resumes, logos, PDFs) are stored on local disk in `uploads/` folder. This won't work with multiple servers or containers.

**Fix:**
- Integrate cloud storage (AWS S3 / Google Cloud Storage / Cloudflare R2)
- Use presigned URLs for secure file access
- Implement file cleanup for orphaned uploads

#### 7.3 ❌ No Caching Layer for Expensive Queries
No caching anywhere in the backend. Every API call hits the database.

**Fix:**
- Cache session listings (Redis, 60s TTL)
- Cache public job listings (Redis, 5min TTL)
- Cache skill taxonomy (in-memory, loaded once)
- Cache AI agent responses for identical inputs

#### 7.4 ❌ No Health Check Dashboard / Monitoring
**File:** `backend/api/views/recruiter_auth.py` (health_check)

Health check only returns `{"status": "ok"}`. Doesn't check Redis, database, Celery, or LLM API connectivity.

**Fix:**
```python
def health_check(request):
    checks = {
        "database": check_database(),
        "redis": check_redis(),
        "celery": check_celery(),
        "llm_api": check_llm_keys(),
    }
    all_ok = all(v["status"] == "ok" for v in checks.values())
    return JsonResponse({
        "status": "ok" if all_ok else "degraded",
        "checks": checks,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
```

#### 7.5 ❌ No Export to Multiple Formats
**File:** `backend/api/views/export.py`

Export only supports CSV. No Excel, PDF summary, or JSON export options.

**Fix:**
- Add Excel export (`.xlsx`) using openpyxl (already in requirements)
- Add PDF report export with candidate summaries
- Add JSON export for API integrations

---

## 📊 Summary by Portal

| Portal | Current Features | Missing Features |
|--------|-----------------|-----------------|
| **Job Seeker** | Job search, resume builder, apply, saved jobs, notifications, profile, safety checker | Forgot password, email verification, profile photo, pagination, real data on home/trends, dark mode, push notifications, skills gap analysis, AI cover letter |
| **Recruiter** | Sessions, candidates, AI matching, chatbot, fraud detection, Gmail/Drive sync, export | Recruiter notifications, candidate comparison, interview scheduling, bulk email, funnel analytics, team members, real-time updates, JD generator |
| **Developer** | API keys, usage analytics, billing, webhooks, embed tokens, docs | Settings page, API sandbox, SDKs, better health checks |
| **Backend** | 7 AI agents, Celery workers, rate limiting, multi-key LLM rotation | Pagination, cloud storage, caching, WebSockets, AI interview agent, recommendation engine, full-text search, file validation |

---

## 🏆 Top 10 Highest-Impact Feature Additions

| # | Feature | Impact | Effort |
|---|---------|--------|--------|
| 1 | Replace hardcoded data with real API calls (home + trends) | 🔥 High — users see fake data | 3-4 hrs |
| 2 | Add pagination to all list endpoints | 🔥 High — app breaks at scale | 4-5 hrs |
| 3 | Forgot password flow (all 3 portals) | 🔥 High — users get locked out | 3-4 hrs |
| 4 | Recruiter notification bell + real-time | 🔥 High — recruiters miss applications | 4-5 hrs |
| 5 | Dynamic dashboard stats (not hardcoded) | 🔴 Medium-High — looks fake | 2 hrs |
| 6 | Proper 404 page + Error Boundaries | 🔴 Medium-High — broken UX | 1-2 hrs |
| 7 | Email verification on registration | 🔴 Medium-High — spam prevention | 3 hrs |
| 8 | SEO meta tags per page | 🟡 Medium — bad for discoverability | 1-2 hrs |
| 9 | Cloud file storage (S3/R2) | 🟡 Medium — won't scale otherwise | 3-4 hrs |
| 10 | AI Job Description Generator | 🟡 Medium — great demo feature | 3-4 hrs |

---

> **Total estimated effort for all features:** ~3-4 weeks
> 
> **Quick wins (< 2 hours each):** Items 5, 6, 8, fix email URLs, add file validation, fix `NEXT_PUBLIC` env var
