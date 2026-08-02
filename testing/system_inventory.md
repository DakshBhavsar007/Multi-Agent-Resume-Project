# Between System Inventory & Verification Checklist

## 1. Third-Party Services & API Integrations

| Integration Type | Service / Provider | Package / Key Reference | Primary Usage |
| :--- | :--- | :--- | :--- |
| **Payment Gateway** | Razorpay | `razorpay==1.4.1`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Recruiter and Job Seeker plan upgrades, order creation, signature verification |
| **Email & Communications** | Brevo (Sendinblue) / SMTP | `django-anymail[brevo]`, `BREVO_API_KEY`, `MAIL_FROM` | Transactional emails, account verification, password resets, weekly digests |
| **Primary LLM** | Google Gemini API | `google-generativeai==0.8.3`, `GEMINI_API_KEY`, `GEMINI_API_KEYS` | Resume parsing, candidate scoring, AI recruiter chat, JD generation |
| **Fallback LLM** | Groq Cloud API | `GROQ_API_KEY`, `GROQ_MODEL` | Fast LLM inference fallback (`llama-3.3-70b-versatile`) |
| **Local LLM** | Ollama | `OLLAMA_BASE_URL`, `OLLAMA_MODEL` | Local offline LLM fallback (`llama3.2`, `mistral`) |
| **Vector DB & Embeddings** | ChromaDB & SentenceTransformers | `chromadb>=0.5.0`, `sentence-transformers`, `HF_SPACE_EMBEDDING_URL` | Vector similarity search for resume matching and job recommendations |
| **Code Execution Sandbox** | Piston API | `PISTON_API_URL`, `PISTON_API_KEY` | Sandboxed candidate code execution for coding test rounds |
| **Sandbox Fallback** | Wandbox API | `WANDBOX_API_URL` | Fallback code sandbox execution when Piston API requires whitelist |
| **OAuth Providers** | Google OAuth 2.0 | `google-auth`, `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` | Recruiter and Job Seeker Google social login |
| **OAuth Providers** | GitHub OAuth App | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | Developer Portal and candidate GitHub social login |
| **Cloud Storage / Ingestion** | Google Drive & Gmail APIs | `google-api-python-client` | Automatic sync of candidate resumes from linked Drive folders and Gmail inboxes |
| **ATS Integrations** | Webhooks / Mock ATS | `backend/api/services/ats_service.py` | ATS import sync (Greenhouse, Lever, Workday) |

---

## 2. Backend Modules & Components (`backend/`)

* **`api/models.py`**: Complete Django ORM relational schema definitions (38 models).
* **`api/urls.py`**: Central URL routing dispatch for Recruiter, Job Seeker, Developer, Admin, and Assessment APIs.
* **`api/middleware.py`**: Custom JWT authentication, rate limiting, request audit logging, and CORS headers.
* **`api/decorators.py`**: Redis distributed rate limiting (`acquire_piston_token_distributed`) and auth guards.
* **`api/views/`**:
  * `recruiter_auth.py`: Recruiter registration, login, profile updates, JWT generation.
  * `seeker_auth.py`: Job Seeker registration, login, profile & token management.
  * `companies.py`: Company directory, public profiles, and follower management.
  * `candidates.py`: Candidate management, upload, AI matching score calculation, status pipeline.
  * `sessions.py`: Hiring session creation, management, criteria config, round setup.
  * `round_views.py`: Candidate assessment entry, MCQ test, Coding sandbox execution, AI interview.
  * `ingest.py`: Resume bulk parsing, ZIP archive extraction, Google Drive / Gmail automated sync.
  * `parse.py`: Direct PDF/DOCX resume text extraction and structural JSON parsing.
  * `jobs.py` / `seeker_jobs.py`: Job posting, listing, search, filtering, application processing.
  * `seeker_resume.py` / `seeker_resume_builder.py`: Resume builder, section editing, AI rendering, PDF generation.
  * `recruiter_billing.py` / `seeker_billing.py`: Plan subscription orders and Razorpay webhooks.
  * `admin_views.py`: Superadmin platform metrics, company bans, API key rotation.
  * `github_auth.py` / `google_auth.py`: Third-party OAuth authentication token exchanges.
  * `verification.py`: Email & SMS 2FA code generation and verification.
  * `developer/`: Developer Portal endpoints (API keys, webhooks, usage logs, iframe embeds).
* **`agents/`**:
  * `ats_compatibility_agent.py`: Evaluates resume ATS formatting and score readability.
  * `matching_agent.py`: Computes multi-dimensional matching scores between resumes and sessions.
  * `normalization_agent.py`: Normalizes raw skill strings to canonical skill taxonomy.
  * `salary_prediction_agent.py`: Predicts salary ranges based on experience and skills.
  * `resume_pdf_renderer.py`: Generates styled PDF resumes using ReportLab.
  * `interview_agent.py` / `chatbot_agent.py`: Powers AI voice/text interactive interviews.
  * `llm.py`: Multi-provider LLM caller with automatic fallback (Gemini → Groq → Ollama).
* **`services/`**:
  * `piston_sandbox.py`: Isolated container code sandbox runner for Python and JavaScript.
  * `email_service.py` & `brevo_service.py`: Email template rendering and delivery.
  * `twofactor_service.py`: 2FA OTP code generation and verification.
  * `notification_service.py`: User notification dispatch.

---

## 3. Frontend Routes & Components (`frontend/src/`)

### **Public Pages**
* `/`: Landing Page
* `/login` & `/register`: Recruiter Login & Registration
* `/about`, `/contact`, `/support`, `/terms`, `/privacy`, `/refund-policy`: Public information & legal pages

### **Recruiter Dashboard (`/dashboard/*`)**
* `/dashboard`: Main Overview & Hiring Metrics
* `/dashboard/sessions`: Session List & Management
* `/dashboard/sessions/new`: Session Creation Wizard
* `/dashboard/sessions/:id`: Session Workspace (Upload Resumes, Candidate Pipeline)
* `/dashboard/sessions/:id/results`: Candidate Assessment Round Results
* `/dashboard/smart-analyzer`: Resume Batch Smart Analyzer
* `/dashboard/ai-recruiter`: AI Recruiter Chat Assistant
* `/dashboard/settings`: Account Profile, API Keys, Notifications, **Billing & Plan**

### **Job Seeker Portal (`/jobs/*`)**
* `/jobs`: Job Seeker Homepage
* `/jobs/search`: Job Search & Filters
* `/jobs/trends`: Salary & Skill Market Trends
* `/jobs/companies`: Company Directory
* `/jobs/profile`: Job Seeker Profile & Skills
* `/jobs/applications`: My Job Applications
* `/jobs/resume`: Resume Upload & ATS Score Review
* `/jobs/mock-interview`: AI Practice Mock Interview
* `/jobs/billing`: Job Seeker Pro Subscription
* `/resume-builder`: Interactive Resume Builder Landing & Editor

### **Developer Portal (`/developer/portal/*`)**
* `/developer/portal/dashboard`: Usage Overview
* `/developer/portal/keys`: API Key Generation & Management
* `/developer/portal/usage`: Request Metrics & Telemetry
* `/developer/portal/billing`: API Usage Billing
* `/developer/portal/webhooks`: Webhook Endpoint Configuration
* `/developer/portal/embed`: Widget Iframe Embed Generator
* `/developer/portal/docs`: API Documentation
* `/developer/portal/settings`: Portal Settings

### **Candidate Assessment Engine (`/test/*`)**
* `/test/entry`: Candidate Access Token Entry
* `/test/mcq`: Multiple-Choice Test Round
* `/test/coding`: Sandboxed Coding Challenge Round
* `/test/interview`: AI Voice & Text Technical Interview Round

### **Superadmin Panel (`/admin/*`)**
* `/admin/login`: Superadmin Authentication
* `/admin/dashboard`: Platform Administration, Company Ban/Unban, Key Rotations

---

## 4. Background Jobs & Scheduled Tasks

| Task Name | Runner | Schedule / Trigger | Function / Purpose |
| :--- | :--- | :--- | :--- |
| `process_bulk_ingest_job` | Celery | On Bulk Resume Upload | Asynchronously parses and normalizes ZIP archive resume batches |
| `sync_gdrive_folder` | Celery | Periodic / Scheduled | Polls connected Google Drive folders for new resume files |
| `sync_gmail_attachments` | Celery | Periodic / Scheduled | Scans connected Gmail inboxes for resume attachments |
| `dispatch_webhook_delivery` | Celery | On Event Trigger | Asynchronously dispatches signed webhooks to developer endpoints |
| `recalculate_candidate_scores` | Celery | On Criteria Update | Batch recalculates candidate match scores when job requirements change |
| `generate_weekly_digest_emails` | Celery | Weekly Cron | Sends weekly email activity digests to recruiters |

---

## 5. Environment Variables & Secret Dependencies

* **App & Security:** `APP_NAME`, `DEBUG`, `SECRET_KEY`, `JWT_SECRET`, `JWT_ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `ALLOWED_ORIGINS`
* **PostgreSQL Database:** `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `DATABASE_URL`
* **Redis & Celery:** `REDIS_URL`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_DB`
* **Vector Search & ML:** `CHROMA_HOST`, `CHROMA_PORT`, `CHROMA_COLLECTION_RESUMES`, `CHROMA_COLLECTION_JOBS`, `CHROMA_PERSIST_DIR`, `EMBEDDING_MODEL`, `EMBEDDING_DIMENSION`, `HF_SPACE_EMBEDDING_URL`
* **LLM Services:** `GEMINI_API_KEY`, `GEMINI_API_KEYS`, `GEMINI_MODEL`, `GROQ_API_KEY`, `GROQ_MODEL`, `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `OLLAMA_FALLBACK_MODEL`, `OLLAMA_TIMEOUT`
* **OAuth Authentication:** `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
* **Integrations:** `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `BREVO_API_KEY`, `MAIL_FROM`, `PISTON_API_URL`, `PISTON_API_KEY`
* **Rate Limits & Webhooks:** `RATE_LIMIT_FREE`, `RATE_LIMIT_PREMIUM`, `RATE_LIMIT_ENTERPRISE`, `WEBHOOK_SECRET`, `WEBHOOK_TIMEOUT`, `WEBHOOK_MAX_RETRIES`

---

## 6. Flagged Dead Code & Cleanup Items

1. **Wandbox Compiler Key (`nodejs-head`):**
   * *Status:* Fixed. `WANDBOX_COMPILERS` was pointing to deprecated `nodejs-head` which returned HTTP 500. Updated to `nodejs-20.17.0`.
2. **Unused Framework Packages in `requirements.txt`:**
   * *Items:* `fastapi==0.111.0`, `uvicorn==0.29.0`, `sqlalchemy>=2.0.36`, `alembic==1.13.1`, `aioredis==2.0.1`.
   * *Note:* The backend runs on Django 5.x (`vishleshan_backend`). FastAPI and SQLAlchemy packages remain from an earlier backend prototype. `redis>=5.0` has native async support, superseding `aioredis`.
3. **Redirect URL in `PremiumBadge.jsx`:**
   * *Status:* Fixed. The locked feature overlay button was hardcoded to `/#pricing` (external landing page) instead of internal dashboard route `/dashboard/settings?tab=billing`.

---

## 7. Database Models Inventory (`api/models.py`)

1. **`Company`**: Recruiter organization profile, credentials, tier, notification settings.
2. **`APIKey`**: Recruiter API keys for direct integration.
3. **`Session`**: Hiring session / job vacancy listing with requirements and candidate pools.
4. **`Candidate`**: Applicant record with parsed resume details, skills, and match scores.
5. **`SkillTaxonomy`**: Skill dictionary and canonical mapping.
6. **`ChatHistory`**: AI Recruiter chat assistant conversation history.
7. **`IngestJob`**: Batch resume ingestion job status tracker.
8. **`DeveloperAccount`**: Developer Portal user account.
9. **`DeveloperAPIKey`**: Developer Portal API authentication keys.
10. **`APIUsageLog`**: Granular API request log per developer key.
11. **`MonthlyUsageSummary`**: Aggregated monthly API request meter.
12. **`Webhook`**: Developer registered webhook subscriber endpoints.
13. **`WebhookDeliveryLog`**: History of webhook HTTP delivery attempts and status codes.
14. **`BillingSubscription`**: Recruiter subscription billing state.
15. **`EmbedToken`**: Tokens for secure widget iframe embeds.
16. **`JobSeekerAccount`**: Candidate / Job Seeker user profile.
17. **`JobApplication`**: Candidate application to job postings.
18. **`Notification`**: User notification inbox alerts.
19. **`ResumeDraft`**: Candidate interactive resume builder state.
20. **`ResumeVersion`**: Saved versions of candidate resumes.
21. **`SavedJob`**: Candidate bookmarked job listings.
22. **`CompanyBillingSubscription`**: Detailed recruiter plan tier subscription state.
23. **`SeekerBillingSubscription`**: Job Seeker Pro plan subscription state.
24. **`SessionRound`**: Specific assessment round (MCQ, Coding, Interview) inside a session.
25. **`MCQQuestion`**: Technical multiple-choice question bank.
26. **`CodingProblem`**: Sandboxed coding problem definition, test cases, and starter code.
27. **`ApplicantRoundAttempt`**: Candidate test attempt record, score, and token access.
28. **`SeekerMockAttempt`**: Practice mock interview attempt log.
29. **`SubscriptionPlan`**: Master pricing plan tiers and feature quotas.
30. **`MarketRegionConfig`**: Geographical salary and benchmark settings.
31. **`SalaryTimelineConfig`**: Experience vs salary trajectory configuration.
32. **`GrowthSkillFallback`**: Skill growth fallbacks for missing ML data.
33. **`LocationLookup`**: Standardized location geographical dataset.
34. **`SupportTicket`**: Customer support inquiry tickets.
35. **`Review`**: Candidate feedback reviews for companies and hiring sessions.
36. **`AdminBanLog`**: Superadmin ban/unban activity audit log.
37. **`GeminiProject` / `GeminiApiKey`**: Rotation pool for Google Gemini API keys.
38. **`AgentModelConfig`**: Dynamic LLM agent model configurations.
39. **`GroqApiKey`**: Rotation pool for Groq API keys.
40. **`AdminAuditLog`**: Audit log of superadmin administrative actions.
