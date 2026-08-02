# Between Platform — Comprehensive Manual QA Verification Guide

This guide provides a step-by-step checklist to manually test and verify every feature of the **Between** platform.

---

## SECTION 1: Environment & Infra Sanity

### **Step 1: Backend API Health Check**
* **Tool:** Browser or Postman / curl
* **URL / Endpoint:** `GET http://127.0.0.1:8000/` or `GET http://127.0.0.1:8000/api/v1/health`
* **Steps:**
  1. Open terminal and ensure backend is running (`python manage.py runserver 8000` or `gunicorn`).
  2. Open browser or Postman and send a `GET` request to `http://127.0.0.1:8000/`.
* **Expected Result:** HTTP 200 OK returning JSON: `{"status": "ok", "app": "Vishleshan Resume Intelligence API"}`.
* **Common Failure Signs:** `ERR_CONNECTION_REFUSED` (backend django server is not running), HTTP 500 Internal Server Error (ORM or import bug).

---

### **Step 2: Frontend Web App Load**
* **Tool:** Browser (Chrome / Edge / Firefox)
* **URL:** `http://localhost:5173`
* **Steps:**
  1. Open Chrome DevTools (`F12`) -> Console tab.
  2. Navigate to `http://localhost:5173`.
* **Expected Result:** Landing page renders cleanly with dark/light navbar, video/hero background, logo cloud, and features section. **Console shows 0 unhandled errors**.
* **Common Failure Signs:** Blank screen, red console errors containing `Failed to fetch dynamically imported module` or CORS errors.

---

### **Step 3: Database & Redis Connectivity**
* **Tool:** Terminal / `psql` / `redis-cli`
* **Steps:**
  1. Test PostgreSQL connection: `python manage.py shell -c "from django.db import connection; cursor = connection.cursor(); cursor.execute('SELECT 1'); print('DB OK:', cursor.fetchone())"`
  2. Test Redis connection: `python manage.py shell -c "from api.decorators import redis_client; print('Redis PING:', redis_client.ping())"`
* **Expected Result:** Terminal outputs `DB OK: (1,)` and `Redis PING: True`.
* **Common Failure Signs:** `OperationalError: could not connect to server`, `redis.exceptions.ConnectionError`.

---

## SECTION 2: Authentication (All Roles & Methods)

### **Step 4: Recruiter Registration & Email Login**
* **Tool:** Browser
* **URL:** `http://localhost:5173/register` & `http://localhost:5173/login`
* **Test Data:** 
  * Company Name: `TechCorp Solutions`
  * Email: `recruiter_test@techcorp.com`
  * Password: `TestPassword123!`
* **Steps:**
  1. Go to `/register`, enter company details, and click **Register**.
  2. Go to `/login`, enter credentials, and click **Sign In**.
* **Expected Result:** Redirects to Recruiter Dashboard (`/dashboard`). `localStorage.getItem('vish_jwt')` contains a valid JWT token string.
* **Common Failure Signs:** `HTTP 401 Invalid Credentials`, toast notification showing `Login failed`.

---

### **Step 5: Recruiter Google OAuth Login**
* **Tool:** Browser
* **URL:** `http://localhost:5173/login`
* **Steps:**
  1. Click **Continue with Google**.
  2. Authenticate with a Google account in the popup/redirect window.
* **Expected Result:** Redirects back to `/auth/google/callback` and seamlessly into `/dashboard` with logged-in status.
* **Common Failure Signs:** `redirect_uri_mismatch`, popup blocked by browser.

---

### **Step 6: Job Seeker Registration & Login**
* **Tool:** Browser
* **URL:** `http://localhost:5173/jobs/login` & `http://localhost:5173/jobs/register`
* **Test Data:**
  * Full Name: `Alice Candidate`
  * Email: `alice_seeker@example.com`
  * Password: `SeekerPass123!`
* **Steps:**
  1. Go to `/jobs/register`, fill out form, and submit.
  2. Go to `/jobs/login`, sign in with credentials.
* **Expected Result:** Redirects to `/jobs`. `localStorage.getItem('seeker_token')` contains seeker token.

---

### **Step 7: Job Seeker Google OAuth Login**
* **Tool:** Browser
* **URL:** `http://localhost:5173/jobs/login`
* **Steps:** Click **Google Sign In** on the Job Seeker portal login page.
* **Expected Result:** Successfully redirects into `/jobs` as logged-in job seeker.

---

### **Step 8: Developer Portal Login (GitHub OAuth)**
* **Tool:** Browser
* **URL:** `http://localhost:5173/developer/login`
* **Steps:**
  1. Navigate to `/developer/login`.
  2. Click **Sign in with GitHub**.
  3. Authorize GitHub application.
* **Expected Result:** Redirects to `/developer/portal/dashboard` showing developer API keys and usage telemetry.
* **Common Failure Signs:** `OAuth secret invalid`, `404 Not Found` on callback handler `/auth/github/callback`.

---

### **Step 9: Superadmin Login**
* **Tool:** Browser
* **URL:** `http://localhost:5173/admin/login`
* **Test Data:** Username: `admin`, Password: `SuperAdminSecretPassword123!` (or active superadmin account).
* **Steps:** Enter credentials and click **Admin Login**.
* **Expected Result:** Redirects to `/admin/dashboard` showing company ban controls, key rotation pools, and system metrics.

---

### **Step 10: SMS OTP 2FA Verification Flow**
* **Tool:** Postman / Browser
* **URL:** `POST http://127.0.0.1:8000/api/v1/auth/send-otp` & `/verify-otp`
* **Test Data:** `{"phone_number": "+919876543210"}`
* **Steps:**
  1. Trigger send OTP endpoint.
  2. Observe standard output/SMS log or enter test OTP `123456` in `/verify-otp`.
* **Expected Result:** `{"success": true, "message": "OTP verified successfully"}`.

---

### **Step 11: JWT Expiry & Refresh Observation**
* **Tool:** Browser DevTools Application / Console
* **Steps:**
  1. Log into `/dashboard`.
  2. Open DevTools Console and clear token: `localStorage.removeItem('vish_jwt')`.
  3. Refresh the page or click a menu item (e.g. `Settings`).
* **Expected Result:** App cleanly detects missing auth state and redirects to `/login`.

---

## SECTION 3: Recruiter Dashboard (`/dashboard/*`)

### **Step 12: Create a Hiring Session**
* **Tool:** Browser
* **URL:** `http://localhost:5173/dashboard/sessions/new`
* **Test Data:**
  * Job Title: `Senior Python Engineer`
  * Job Description: `Looking for a Senior Python Developer with 4+ years experience in FastAPI, Django, Redis, PostgreSQL, and React.`
* **Steps:** Click **New Session**, fill in details, select assessment rounds (MCQ + Coding + Interview), and click **Create Session**.
* **Expected Result:** Redirects to `/dashboard/sessions/:id` workspace.

---

### **Step 13: Single Resume Upload & Parsing**
* **Tool:** Browser
* **URL:** `http://localhost:5173/dashboard/sessions/:id` (Tab: **Upload Resumes**)
* **Test File:** Upload a sample PDF resume (`john_doe_resume.pdf`).
* **Steps:** Drag and drop or browse to select resume PDF, click **Upload**.
* **Expected Result:** File uploads, toast displays `Upload started!`, and candidate appears under **Candidates** tab with computed AI match score (e.g., `88% Match`).

---

### **Step 14: Bulk ZIP Resume Archive Ingestion**
* **Tool:** Browser
* **URL:** `http://localhost:5173/dashboard/sessions/:id`
* **Test File:** Upload a `.zip` archive containing 3-5 sample resume PDFs.
* **Steps:**
  1. Select ZIP upload card.
  2. If on Starter plan, click **Enterprise** badge -> verify it opens `/dashboard/settings?tab=billing`.
  3. On Enterprise session, upload ZIP file.
* **Expected Result:** Background Celery task `process_bulk_ingest_job` processes all resumes into candidate pipeline.

---

### **Step 15: Google Drive & Gmail Resume Auto-Sync**
* **Tool:** Browser
* **URL:** `http://localhost:5173/dashboard/sessions/:id` -> **Upload Resumes** -> Drive/Gmail card
* **Steps:** Click **Connect Google Drive** or **Connect Gmail**.
* **Expected Result:** Google OAuth authorization prompt opens, allowing folder link configuration.

---

### **Step 16: Candidate Pipeline & AI Match Scores**
* **Tool:** Browser
* **URL:** `http://localhost:5173/dashboard/sessions/:id` (Tab: **Candidates**)
* **Steps:** Review candidate cards, filter by match score, click candidate to view normalized skills and resume breakdown.
* **Expected Result:** Displays matching score breakdown, skills radar, work history, and **Send Assessment Token** action button.

---

### **Step 17: Smart Analyzer**
* **Tool:** Browser
* **URL:** `http://localhost:5173/dashboard/smart-analyzer`
* **Steps:** Select hiring session, choose candidates to compare side-by-side, click **Run Smart Analysis**.
* **Expected Result:** Displays comparative evaluation table highlighting strengths, weaknesses, and skill gaps.

---

### **Step 18: AI Recruiter Chat Assistant**
* **Tool:** Browser
* **URL:** `http://localhost:5173/dashboard/ai-recruiter`
* **Steps:** Type prompt: `"Who is the top candidate for Python with 3+ years experience?"` and press Enter.
* **Expected Result:** AI assistant analyzes active session candidate pool and returns detailed recommendations.

---

### **Step 19: Recruiter Settings, API Keys & Razorpay Plan Upgrade**
* **Tool:** Browser
* **URL:** `http://localhost:5173/dashboard/settings?tab=billing`
* **Test Payment Data (Razorpay Test Mode):**
  * Card Number: `4111 1111 1111 1111`
  * Expiry: `12/28`
  * CVV: `123`
  * OTP: `123456`
* **Steps:**
  1. Click **Upgrade to Business** or **Upgrade to Enterprise**.
  2. Complete payment in Razorpay modal.
* **Expected Result:** Modal displays payment success, page updates active tier to **Business / Enterprise**.

---

## SECTION 4: Candidate Assessment Engine (`/test/*`)

### **Step 20: Candidate Test Entry with Access Token**
* **Tool:** Browser
* **URL:** `http://localhost:5173/test/entry?token=<token_from_candidate_table>`
* **Steps:** Enter token and click **Start Assessment**.
* **Expected Result:** Authenticates candidate attempt and loads assessment instructions.

---

### **Step 21: MCQ Technical Test Round**
* **Tool:** Browser
* **URL:** `http://localhost:5173/test/mcq`
* **Steps:** Select answers for multiple-choice questions, click **Next Question**, and click **Submit MCQ Round**.
* **Expected Result:** Answers recorded, redirects to next round (Coding).

---

### **Step 22: Sandboxed Coding Round — Python Submission**
* **Tool:** Browser
* **URL:** `http://localhost:5173/test/coding`
* **Problem:** Two Sum (Python)
* **Steps:**
  1. Select **Python** language dropdown.
  2. Paste valid Python solution:
     ```python
     def two_sum(nums, target):
         seen = {}
         for i, num in enumerate(nums):
             diff = target - num
             if diff in seen:
                 return [seen[diff], i]
             seen[num] = i
         return []
     ```
  3. Click **Run Code** / **Submit Code**.
* **Expected Result:** Execution output shows `All 3 Test Cases Passed (100%)`.

---

### **Step 23: Sandboxed Coding Round — JavaScript Submission**
* **Tool:** Browser
* **URL:** `http://localhost:5173/test/coding`
* **Problem:** Two Sum (JavaScript)
* **Steps:**
  1. Select **JavaScript** language dropdown.
  2. Paste valid JS solution:
     ```javascript
     function twoSum(nums, target) {
         const map = new Map();
         for (let i = 0; i < nums.length; i++) {
             const diff = target - nums[i];
             if (map.has(diff)) {
                 return [map.get(diff), i];
             }
             map.set(nums[i], i);
         }
         return [];
     }
     ```
  3. Click **Run Code**.
* **Expected Result:** Execution output shows `All 3 Test Cases Passed (100%)`.

---

### **Step 24: AI Technical Voice & Text Interview Round**
* **Tool:** Browser (Microphone permission granted)
* **URL:** `http://localhost:5173/test/interview`
* **Steps:**
  1. Click **Start Interview**.
  2. Respond via text input or voice microphone to AI interviewer questions.
  3. Click **Finish Assessment**.
* **Expected Result:** Interview transcript recorded, completion status updated.

---

### **Step 25: Recruiter Assessment Results Review**
* **Tool:** Browser
* **URL:** `http://localhost:5173/dashboard/sessions/:id/results`
* **Steps:** Open session results page as recruiter.
* **Expected Result:** Candidate test scores (MCQ, Coding, Interview) displayed cleanly in recruiter table.

---

## SECTION 5: Job Seeker Portal (`/jobs/*`)

### **Step 26: Browse & Filter Jobs**
* **Tool:** Browser
* **URL:** `http://localhost:5173/jobs/search`
* **Steps:** Enter keyword `"Python"`, select location `"Remote"`, click **Search**.
* **Expected Result:** Returns filtered job cards.

---

### **Step 27: View Salary & Market Skill Trends**
* **Tool:** Browser
* **URL:** `http://localhost:5173/jobs/trends`
* **Steps:** View demand charts, high-growth skill tags, and salary benchmarks.
* **Expected Result:** Charts render smoothly with salary trajectory statistics.

---

### **Step 28: Company Directory & Public Profiles**
* **Tool:** Browser
* **URL:** `http://localhost:5173/jobs/companies`
* **Steps:** Click on a company card (e.g. `TechCorp Solutions`).
* **Expected Result:** Displays company profile, rating, industry details, and active job openings.

---

### **Step 29: AI Resume Builder & Text-Extractable PDF Export**
* **Tool:** Browser & PDF Reader (Adobe / Chrome PDF viewer / PyMuPDF)
* **URL:** `http://localhost:5173/resume-builder`
* **Steps:**
  1. Fill in personal information, work experience, and skills.
  2. Click **Export PDF**.
  3. Open downloaded PDF and attempt to highlight/select text.
* **Expected Result:** PDF renders with professional formatting and **text is fully selectable/extractable** (not rasterized image).

---

### **Step 30: Apply to Job & Track Application Status**
* **Tool:** Browser
* **URL:** `http://localhost:5173/jobs/search` & `/jobs/applications`
* **Steps:**
  1. Open a job detail page (`/jobs/:jobId`).
  2. Click **Apply Now**, attach resume draft, submit application.
  3. Navigate to `/jobs/applications`.
* **Expected Result:** Application status shows `Submitted / Under Review`.

---

### **Step 31: Bookmark / Save Jobs**
* **Tool:** Browser
* **URL:** `http://localhost:5173/jobs/search`
* **Steps:** Click bookmark icon on job card.
* **Expected Result:** Bookmark toggles active, job appears in saved list.

---

### **Step 32: AI Practice Mock Interview**
* **Tool:** Browser
* **URL:** `http://localhost:5173/jobs/mock-interview`
* **Steps:** Select topic `"Frontend React & JavaScript"`, answer practice questions.
* **Expected Result:** AI evaluates response and provides instant constructive feedback score.

---

### **Step 33: Job Seeker Pro Billing Upgrade**
* **Tool:** Browser
* **URL:** `http://localhost:5173/jobs/billing`
* **Steps:** Click **Upgrade to Pro**, complete test payment with Razorpay.
* **Expected Result:** Account tier updates to `Seeker Pro`.

---

## SECTION 6: Developer Portal (`/developer/portal/*`)

### **Step 34: Generate Developer API Key**
* **Tool:** Browser
* **URL:** `http://localhost:5173/developer/portal/keys`
* **Steps:** Click **Create New API Key**, enter key name `"Test Key"`, click **Generate**.
* **Expected Result:** Displays generated API Key (e.g. `dev_live_...`).

---

### **Step 35: API Call via `X-API-Key` & Usage Telemetry**
* **Tool:** Postman / curl
* **Endpoint:** `GET http://127.0.0.1:8000/api/v1/developer/candidates`
* **Headers:** `X-API-Key: dev_live_...`
* **Steps:** Send request in Postman, then refresh `/developer/portal/usage` page in browser.
* **Expected Result:** API returns HTTP 200 OK, and request count increases in Developer usage graph.

---

### **Step 36: Webhook Endpoint Registration, Signing & Delivery Logs Verification**
* **Tool:** Browser + Webhook Site (`https://webhook.site`) + DevTools
* **URL:** `http://localhost:5173/developer/portal/webhooks` or `https://between.indevs.in/developer/portal/webhooks`
* **Detailed Steps:**
  1. Open `https://webhook.site` in a new browser tab and copy your unique temporary Webhook URL (e.g. `https://webhook.site/abc12345-xyz-789`).
  2. Navigate to **Developer Portal -> Webhooks** (`/developer/portal/webhooks`).
  3. Click **Create Webhook** button.
  4. Paste your Webhook URL into the **Endpoint URL** input field.
  5. Select event checkboxes: `candidate.parsed`, `match.completed`, `session.created`.
  6. Click **Create Webhook**. Save the displayed **Webhook Secret** (`whsec_...`).
  7. On the active webhook card, click the **Test Delivery** button.
  8. Click **View Logs** to open the side panel and inspect the HTTP delivery attempt (Status: `200 OK`, Timestamp, Latency).
  9. Switch to your `webhook.site` tab and verify that a live HTTP POST payload was received containing:
     * Header: `X-Between-Signature` (HMAC SHA-256 signature string)
     * Header: `Content-Type: application/json`
     * Body: `{"event": "test.delivery", "message": "This is a test webhook delivery from Vishleshan", "webhook_id": "..."}`
  10. To test deletion: Click **Delete** icon on the webhook card, confirm dialog, and verify it is removed from the active list.
* **Expected Result:** Webhooks create smoothly, test delivery returns HTTP 200 OK, delivery logs record payload status, and live requests arrive signed on `webhook.site`.

---

### **Step 37: Embed Widget Token Generation, Iframe SDK Loader & Domain Validation Test**
* **Tool:** Browser + Local HTML Test File + DevTools Console & Network Tab
* **URL:** `http://localhost:5173/developer/portal/embed` or `https://between.indevs.in/developer/portal/embed`
* **Detailed Steps:**
  1. Navigate to **Developer Portal -> Embed UI** (`/developer/portal/embed`).
  2. Click **Generate Embed Token** button.
  3. Enter **Allowed Domain**: `localhost` (or `*` to allow all origins).
  4. Check permissions checkboxes: `read`, `upload`, `chat`.
  5. Click **Generate Token**. Copy your generated token (e.g. `vish_embed_abc123...`).
  6. Switch snippet tabs (**HTML**, **React**, **Vue**) and click **Copy Snippet**. Verify the snippet copies cleanly to clipboard with `https://api.between.indevs.in/embed.js`.
  7. **Live SDK Test**: Create a local file named `test_embed.html` with the following content:
     ```html
     <!DOCTYPE html>
     <html>
     <head>
       <title>Between Embed SDK Test</title>
       <meta charset="utf-8">
     </head>
     <body style="font-family: sans-serif; padding: 40px; background: #f4f4f5;">
       <h2>Host Application Integration Test</h2>
       <div id="between-panel"></div>
       <script src="https://api.between.indevs.in/embed.js"></script>
       <script>
         Between.init({
           token: "YOUR_COPIED_EMBED_TOKEN",
           container: "#between-panel",
           theme: "light"
         });
       </script>
     </body>
     </html>
     ```
  8. Open `test_embed.html` in your browser and press `F12` to open DevTools Console & Network tab.
  9. Verify DevTools Console prints: `[Between Embed] Widget initialized successfully.`
  10. Check Network tab: Verify request `GET /api/v1/developer/embed/validate?token=YOUR_TOKEN` returns HTTP 200 OK with `valid: true` and short-lived JWT token!
  11. Verify the iframe mounts smoothly inside `#between-panel`, rendering the Between candidate upload & matching interface!
  12. **Revocation Check**: Go back to `/developer/portal/embed`, click **Revoke** on the active token, and refresh `test_embed.html`. Verify Network tab shows `HTTP 401 Invalid or revoked embed token`.
* **Expected Result:** Tokens generate cleanly, `embed.js` mounts the widget iframe seamlessly, domain validation passes for authorized domains, and revoking tokens blocks widget access.

---

### **Step 38: Check Developer API Usage Billing**
* **Tool:** Browser
* **URL:** `http://localhost:5173/developer/portal/billing`
* **Steps:** View monthly request quota gauge and tier limits.
* **Expected Result:** Displays current month API consumption and tier limits.

---

## SECTION 7: Superadmin Panel (`/admin/*`)

### **Step 39: Superadmin Overview Metrics**
* **Tool:** Browser
* **URL:** `http://localhost:5173/admin/dashboard`
* **Steps:** Review total registered companies, sessions, candidates, and system health metrics.
* **Expected Result:** Admin dashboard cards render cleanly.

---

### **Step 40: Company Ban & Unban Verification**
* **Tool:** Browser
* **URL:** `http://localhost:5173/admin/dashboard` (Tab: **Companies**)
* **Steps:**
  1. Find a test company and click **Ban Company**.
  2. Open another tab and attempt to log in as that company.
  3. Return to admin panel and click **Unban Company**.
* **Expected Result:** Banned company login attempt is blocked with error `Account is banned`. Unbanning restores immediate access.

---

### **Step 41: Rotate API Key Pools & Audit Logs**
* **Tool:** Browser
* **URL:** `http://localhost:5173/admin/dashboard` (Tab: **Audit Logs / LLM Keys**)
* **Steps:** View active Gemini and Groq API key rotation pools.
* **Expected Result:** Displays active key status, model configurations, and administrative audit logs.

---

## SECTION 8: Support & Reviews

### **Step 42: Submit Support Ticket**
* **Tool:** Browser
* **URL:** `http://localhost:5173/support`
* **Steps:** Enter email, subject `"Integration Question"`, message body, click **Submit Ticket**.
* **Expected Result:** Ticket created with reference ID and confirmation toast.

---

### **Step 43: Submit Candidate Review for Company/Session**
* **Tool:** Browser
* **URL:** `http://localhost:5173/jobs/companies/:companyId`
* **Steps:** Click **Write a Review**, rate star score, enter text review, click **Submit**.
* **Expected Result:** Review appears under company reviews list.

---

## SECTION 9: Cross-Cutting & Edge Case Checks

### **Step 44: Candidate List Pagination Test**
* **Tool:** Browser
* **URL:** `http://localhost:5173/dashboard/sessions/:id` (Candidate List)
* **Steps:** Navigate to session with >20 candidates, click Page `2`, `Next`, `Previous`.
* **Expected Result:** Candidate list updates dynamically without page reload.

---

### **Step 45: API Rate Limit Throttling Test**
* **Tool:** Postman / Apache Bench (`ab`) / Python Script
* **Steps:** Send 60 requests in 10 seconds to `http://127.0.0.1:8000/api/v1/sessions`.
* **Expected Result:** HTTP 429 Too Many Requests response after exceeding quota threshold (`Piston / API rate limit exceeded`).

---

### **Step 46: LLM Quota Exhaustion & Fallback Chain Simulation**
* **Tool:** Python shell
* **Steps:**
  1. Temporarily invalidate primary `GEMINI_API_KEY`.
  2. Invoke `call_llm("Summarize this resume")`.
* **Expected Result:** System logs warning, automatically fails over to **Groq Cloud API** (`llama-3.3-70b-versatile`), and returns valid response without throwing an exception to the user.
