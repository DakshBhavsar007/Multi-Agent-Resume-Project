# 🏭 Vishleshan — Production Readiness Improvement Plan

> **Audit Date:** June 27, 2026  
> **Scope:** Full codebase review — backend settings, models, views, agents, middleware, frontend stores, API client, routing, dependencies.

---

## 🔴 CRITICAL — Security Vulnerabilities (Fix Immediately)

### 1. `DEBUG = True` & `ALLOWED_HOSTS = ["*"]` in Production Settings
**File:** `backend/vishleshan_backend/settings.py` (Line 13-15)

This is the **#1 most dangerous issue**. Django's DEBUG mode exposes full stack traces, database queries, and environment variables to anyone who triggers a 500 error.

```diff
- DEBUG = True
- ALLOWED_HOSTS = ["*"]
+ DEBUG = os.getenv("DEBUG", "False").lower() == "true"
+ ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")
```

---

### 2. `CORS_ALLOW_ALL_ORIGINS = True` — Wide Open CORS
**File:** `backend/vishleshan_backend/settings.py` (Line 58)

Any website on the internet can make authenticated API requests to your backend. This enables CSRF-like attacks.

```diff
- CORS_ALLOW_ALL_ORIGINS = True
+ CORS_ALLOW_ALL_ORIGINS = DEBUG  # Only in dev
+ CORS_ALLOWED_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
```

---

### 3. Hardcoded Fallback Secret Keys
**Files:** `backend/vishleshan_backend/settings.py` (Line 11) and `backend/api/decorators.py` (Line 24)

```python
SECRET_KEY = os.getenv("JWT_SECRET", "django-insecure-supersecretkey-change-this")
JWT_SECRET = os.getenv("JWT_SECRET", "supersecret")
```

If `JWT_SECRET` isn't set in the environment, **anyone can forge valid JWTs** using the default value. These fallbacks should crash the app, not silently use weak defaults.

```diff
- JWT_SECRET = os.getenv("JWT_SECRET", "supersecret")
+ JWT_SECRET = os.environ["JWT_SECRET"]  # Crash on missing — required
```

---

### 4. No Password Validation on Recruiter Registration
**File:** `backend/api/views/recruiter_auth.py` (Line 53-59)

Recruiter registration has **zero password validation** — a user could register with password `"1"`. The seeker registration has a `len >= 8` check, but recruiter and developer registration don't.

**Fix:** Add minimum password length and complexity checks:
```python
if len(password) < 8:
    return JsonResponse(error_response("Password must be at least 8 characters"), status=400)
```

---

### 5. JWT Tokens Have No Expiry Check / No Blacklisting
**File:** `backend/api/views/recruiter_auth.py` (Line 115)

- JWTs expire in **7 days** but the `logout` endpoint does nothing — it just returns `"Successfully logged out"` without invalidating the token
- No token blacklist exists — a stolen JWT is valid for the full 7 days
- Uses deprecated `datetime.utcnow()` instead of `datetime.now(timezone.utc)`

**Fix:** Implement a Redis-based token blacklist checked on every authenticated request.

---

### 6. SQLite in Production
**File:** `backend/vishleshan_backend/settings.py` (Line 38-43)

SQLite cannot handle concurrent writes (which your Celery workers produce), doesn't support real connection pooling, and locks the entire database on writes. Your README says "PostgreSQL via Supabase" but your actual config uses SQLite.

```diff
- DATABASES = {
-     'default': {
-         'ENGINE': 'django.db.backends.sqlite3',
-         'NAME': BASE_DIR / 'db.sqlite3',
-     }
- }
+ DATABASES = {
+     'default': dj_database_url.config(
+         default=f'sqlite:///{BASE_DIR / "db.sqlite3"}',
+         conn_max_age=600,
+     )
+ }
```

---

## 🟠 HIGH — Architecture & Reliability Issues

### 7. Conflicting Framework Dependencies (FastAPI + Django Simultaneously)
**File:** `backend/requirements.txt`

Your `requirements.txt` includes both **FastAPI + Uvicorn + SQLAlchemy** (lines 1-6) AND **Django** (lines 35-38). The project actually runs Django, so the FastAPI stack is dead weight that increases your attack surface and install time. Remove:

```diff
- fastapi==0.111.0
- uvicorn[standard]==0.29.0
- sqlalchemy[asyncio]>=2.0.36
- asyncpg>=0.29.0
- alembic==1.13.1
- fastapi-mail==1.4.1
- aiofiles==23.2.1
- aioredis==2.0.1
```

---

### 8. 937-Line God File: `celery_worker.py`
**File:** `backend/workers/celery_worker.py` — **937 lines, 41KB**

This single file contains all Celery task definitions, PDF parsing, text extraction, OCR, AI processing, matching logic, and more. This is unmaintainable and untestable. Split into:
- `workers/tasks/parse.py` — Resume parsing tasks
- `workers/tasks/match.py` — Matching pipeline tasks
- `workers/tasks/notify.py` — Notification tasks
- `workers/text_extraction.py` — PDF/DOCX extraction utilities

---

### 9. Thread-Based Background Logging in Middleware (Race Conditions)
**File:** `backend/api/middleware.py` (Line 31-35)

```python
threading.Thread(target=self._log_usage, ..., daemon=True).start()
```

Spawning a raw thread per API request is problematic:
- No thread pool / limit — under load, this creates thousands of threads
- SQLite + threads = database locks and `OperationalError: database is locked`
- `connection.close()` hacks suggest you've already hit issues

**Fix:** Use `select_for_update()` in the main thread or move to a Celery task.

---

### 10. Silent Exception Swallowing Everywhere
**Files:** Multiple files across `backend/api/views/`

Found **100+ instances** of `except Exception` that return `f"Server error: {str(e)}"` to the client. In production, this:
- Leaks internal error details to attackers (SQL errors, file paths, etc.)
- Makes debugging impossible (no logging, no Sentry, no error tracking)

```diff
  except Exception as e:
-     return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)
+     logger.exception("Unexpected error in %s", request.path)
+     return JsonResponse(error_response("Internal server error"), status=500)
```

---

### 11. Zero Test Coverage
No test files found anywhere in the project. For production readiness you need at minimum:
- Unit tests for auth flows (registration, login, JWT validation)
- Unit tests for agent parsing logic
- Integration tests for critical API endpoints
- End-to-end tests for key user flows

---

### 12. No Dockerfile / docker-compose
Your README claims "Docker-ready" but no Docker files exist. Create:
- `Dockerfile` for the Django backend
- `docker-compose.yml` orchestrating Django + Redis + PostgreSQL + Celery worker

---

## 🟡 MEDIUM — Operational & Performance Issues

### 13. No Logging Configuration
**File:** `backend/vishleshan_backend/settings.py`

No `LOGGING` dict in settings. All `logger.error()` calls in your agents and views go nowhere. Add structured logging:

```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{asctime} {levelname} {name} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
}
```

---

### 14. No `STATIC_ROOT` / `collectstatic` Setup
**File:** `backend/vishleshan_backend/settings.py` (Line 52)

Only `STATIC_URL` is set — no `STATIC_ROOT`. Django's `collectstatic` will fail, so static file serving won't work in production (e.g., behind Nginx/Gunicorn).

```diff
  STATIC_URL = 'static/'
+ STATIC_ROOT = BASE_DIR / 'staticfiles'
```

---

### 15. No Input Validation / Serializer Layer
All your views do raw `json.loads(request.body)` with manual `data.get()` calls. There's no validation of data types, lengths, or formats. Consider Django REST Framework serializers or at minimum a validation utility.

---

### 16. Missing Database Indexes
**File:** `backend/api/models.py`

Several fields that are frequently queried lack `db_index=True`:
- `Candidate.status` — filtered heavily in listing views
- `APIKey.secret_key` — looked up on every authenticated request
- `DeveloperAPIKey.secret_key` — same
- `JobApplication.status` — filtered in seeker views
- `Notification.is_read` — queried for unread counts

```diff
- status = models.CharField(max_length=50, default="new")
+ status = models.CharField(max_length=50, default="new", db_index=True)
```

---

### 17. No CSRF Protection
**Files:** Every view uses `@csrf_exempt`

All views are blanket-exempt from CSRF. While this is common for API-only backends using JWT, you should use Django's `SessionMiddleware` + CSRF for any cookie-based auth, or document the security model clearly.

---

### 18. API Key Stored & Compared in Plaintext
**File:** `backend/api/decorators.py` (Line 44)

```python
api_key_obj = APIKey.objects.filter(secret_key=x_api_key, is_active=True).first()
```

API keys are stored in plain text and compared directly. Production practice is to hash API keys (like passwords) and only store/compare hashes.

---

## 🔵 LOW — Code Quality & Maintainability

### 19. Frontend `process.env.NEXT_PUBLIC_API_URL` — Wrong Framework Reference
**File:** `frontend/src/lib/api.js` (Line 1)

```javascript
const BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1"
```

Your project uses **Vite**, not Next.js. Vite uses `import.meta.env.VITE_*` prefix, not `process.env.NEXT_PUBLIC_*`. This env variable will **never** be read — you're always using the hardcoded fallback.

```diff
- const BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1"
+ const BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/v1"
```

---

### 20. `localStorage.clear()` on Logout — Nuclear Option
**Files:** `frontend/src/stores/authStore.js` (Line 28) and `frontend/src/lib/api.js` (Line 31)

`localStorage.clear()` wipes **all** localStorage keys — including seeker tokens, developer tokens, and any third-party data. Use targeted `removeItem()` calls instead.

```diff
- localStorage.clear()
+ localStorage.removeItem("vish_jwt")
+ localStorage.removeItem("vish_api_key")
+ localStorage.removeItem("vish_company")
+ localStorage.removeItem("vishleshan_user")
```

---

### 21. Debug Endpoint in Production Routes
**File:** `backend/api/urls.py` (Line 192)

```python
path('api/debug/project-relevance', seeker_resume_builder.debug_project_relevance, ...),
```

Debug endpoints should never exist in production. Gate behind `DEBUG` setting:
```python
if settings.DEBUG:
    urlpatterns += [
        path('api/debug/project-relevance', ...),
    ]
```

---

### 22. Large Page Components (50-65KB JSX Files)
Several page files are extremely large and hard to maintain:
- `frontend/src/pages/SessionWorkspacePage.jsx` — **65KB**
- `frontend/src/pages/FraudDetectionPage.jsx` — **58KB**
- `backend/api/views/seeker_resume_builder.py` — **48KB**
- `backend/api/views/seeker_jobs.py` — **37KB**

Break these into smaller, focused sub-components and utility modules.

---

### 23. Missing Environment Variable Validation on Startup
No startup checks verify that required env vars (`JWT_SECRET`, `GEMINI_API_KEYS`, `REDIS_URL`) are actually set. The app silently falls back to insecure defaults.

**Fix:** Add a startup check in `settings.py` or `apps.py`:
```python
REQUIRED_ENV_VARS = ["JWT_SECRET", "REDIS_URL", "GEMINI_API_KEYS"]
missing = [v for v in REQUIRED_ENV_VARS if not os.getenv(v)]
if missing and not DEBUG:
    raise ImproperlyConfigured(f"Missing required env vars: {', '.join(missing)}")
```

---

### 24. No Rate Limiting on Auth Endpoints
Login and registration endpoints have no brute-force protection. Add rate limiting (e.g., 5 attempts per IP per minute) to prevent credential stuffing attacks.

---

## 📋 Summary Priority Matrix

| # | Priority | Issue | Effort |
|---|----------|-------|--------|
| 1 | 🔴 P0 | `DEBUG=True` + `ALLOWED_HOSTS=*` | 5 min |
| 2 | 🔴 P0 | CORS wide open | 5 min |
| 3 | 🔴 P0 | Hardcoded JWT secret fallback | 10 min |
| 4 | 🔴 P0 | No password validation on recruiter/dev signup | 15 min |
| 5 | 🔴 P0 | Switch SQLite → PostgreSQL | 30 min |
| 6 | 🔴 P0 | JWT blacklisting / logout fix | 1 hr |
| 7 | 🟠 P1 | Remove dead FastAPI dependencies | 10 min |
| 8 | 🟠 P1 | Add logging config | 20 min |
| 9 | 🟠 P1 | Stop leaking error details to clients | 1-2 hrs |
| 10 | 🟠 P1 | Fix Vite env var (`NEXT_PUBLIC` → `VITE_`) | 5 min |
| 11 | 🟠 P1 | Remove debug endpoint | 5 min |
| 12 | 🟠 P1 | Add database indexes | 30 min |
| 13 | 🟡 P2 | Add test suite (unit + integration) | 2-3 days |
| 14 | 🟡 P2 | Create Dockerfile + docker-compose | 2-3 hrs |
| 15 | 🟡 P2 | Split god files (celery_worker, views) | 1 day |
| 16 | 🟡 P2 | Replace thread-per-request logging | 2 hrs |
| 17 | 🟡 P2 | Hash API keys instead of plaintext | 3 hrs |
| 18 | 🟡 P2 | Add `STATIC_ROOT` config | 5 min |
| 19 | 🔵 P3 | Add input validation / serializers | 2-3 days |
| 20 | 🔵 P3 | Auth rate limiting (brute-force) | 2 hrs |
| 21 | 🔵 P3 | Fix `localStorage.clear()` | 15 min |
| 22 | 🔵 P3 | Break large JSX components | 1-2 days |
| 23 | 🔵 P3 | Add env var validation on startup | 20 min |
| 24 | 🔵 P3 | CSRF protection documentation | 30 min |

---

> **Total estimated effort:** ~7-10 days for full production readiness
> 
> **Quick wins (< 1 hour):** Items 1, 2, 3, 4, 7, 10, 11, 18, 21, 23 — can be done in a single sitting
