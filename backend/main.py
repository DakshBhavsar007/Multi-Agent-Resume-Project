from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import time, os
from datetime import datetime

from models.database import init_db, AsyncSessionLocal
from models.schemas import success_response, error_response
from middleware.usage_logger import UsageLoggerMiddleware

# Import all routers from routes/ and routes/developer/
from routes import auth, ingest, sessions, candidates, chat, export
from routes.developer import portal_auth, portal_keys, portal_usage, portal_billing, portal_webhooks, portal_embed

# New: API Key → JWT auth flow
from auth.routes import router as apikey_auth_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[*] Starting Vishleshan API...")
    await init_db()
    try:
        from scripts.seed_data import seed_skill_taxonomy
        async with AsyncSessionLocal() as db:
            await seed_skill_taxonomy(db)
    except Exception as e:
        print(f"[!] Seed skipped: {e}")
    print("[OK] Vishleshan API Ready at http://localhost:8000")
    print("[Docs] API Docs: http://localhost:8000/docs")
    yield
    print("[*] Shutting down...")

app = FastAPI(
    title="Vishleshan API",
    description="AI-Powered ATS — Resume Parsing & Matching",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Usage logging middleware (tracks API calls per developer key)
app.add_middleware(UsageLoggerMiddleware)

@app.middleware("http")
async def add_process_time(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    response.headers["X-Process-Time"] = str(
        round((time.time()-start)*1000, 2)
    ) + "ms"
    return response

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    if isinstance(exc.detail, dict) and "success" in exc.detail:
        return JSONResponse(status_code=exc.status_code, content=exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content=error_response(str(exc.detail))
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content=error_response(str(exc))
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    import traceback
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content=error_response("Internal server error")
    )

from fastapi.staticfiles import StaticFiles

# ── Register all routers ──
routers_to_include = [
    # Recruiter Dashboard API
    (auth,       "/api/v1/auth",       ["Authentication"]),
    (ingest,     "/api/v1/ingest",     ["Resume Ingestion"]),
    (sessions,   "/api/v1/sessions",   ["Sessions"]),
    (candidates, "/api/v1",            ["Candidates"]),
    (chat,       "/api/v1/sessions",   ["AI Chatbot"]),
    (export,     "/api/v1/sessions",   ["Export"]),
    # Developer Portal API
    (portal_auth,     "/api/developer/auth",     ["Developer Portal Auth"]),
    (portal_keys,     "/api/developer/keys",     ["Portal - API Keys"]),
    (portal_usage,    "/api/developer/usage",    ["Portal - Usage"]),
    (portal_billing,  "/api/developer/billing",  ["Portal - Billing"]),
    (portal_webhooks, "/api/developer/webhooks", ["Portal - Webhooks"]),
    (portal_embed,    "/api/developer/embed",    ["Portal - Embed"]),
]

for module, prefix, tags in routers_to_include:
    router = getattr(module, "router", None)
    if router:
        app.include_router(router, prefix=prefix, tags=tags)

# New: API Key → JWT auth flow (separate from the main recruiter auth)
app.include_router(apikey_auth_router, prefix="/auth", tags=["API Key Auth"])

# ── Static Files (Resumes & Photos) ──
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")
PHOTO_DIR = os.getenv("PHOTO_DIR", "photos")

# Ensure exists
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(PHOTO_DIR, exist_ok=True)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
app.mount("/photos", StaticFiles(directory=PHOTO_DIR), name="photos")

# ── Root endpoints ──
@app.get("/health")
async def health_check():
    return success_response({
        "status": "ok",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    })

@app.get("/")
async def root():
    return success_response({
        "message": "Vishleshan API",
        "docs": "/docs",
        "health": "/health"
    })
