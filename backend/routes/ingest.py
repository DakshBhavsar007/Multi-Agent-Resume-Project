from fastapi import APIRouter, Depends, UploadFile, File, Form
from typing import List, Optional
import os, uuid, json, zipfile, re
from pathlib import Path
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import pandas as pd

from models.database import get_db, Company, Session, IngestJob, Candidate
from models.schemas import success_response, error_response
from dependencies import verify_api_key, check_rate_limit

# ── Tier-based limits ──────────────────────────────────────────────────────
TIER_FILE_LIMITS = {
    "free":       {"per_batch": 50,  "zip_files": 50,   "llm_enrichment": True},
    "starter":    {"per_batch": 50,  "zip_files": 50,   "llm_enrichment": True},
    "business":   {"per_batch": 200, "zip_files": 200,  "llm_enrichment": True},
    "enterprise": {"per_batch": 500, "zip_files": 500,  "llm_enrichment": True},
}

def _get_tier_limits(company):
    tier = getattr(company, 'tier', 'free') or 'free'
    return TIER_FILE_LIMITS.get(tier, TIER_FILE_LIMITS['free']), tier
from workers.celery_worker import process_resume_batch, sync_gmail_resumes, sync_gdrive_resumes
from agents.normalization_agent import SkillNormalizationAgent
from google_auth_oauthlib.flow import Flow

router = APIRouter()
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "/tmp/vishleshan/resumes")

@router.post("/upload")
async def upload_resumes(
    session_id: str = Form(...),
    files: List[UploadFile] = File(...),
    company: Company = Depends(verify_api_key),
    _rl=Depends(check_rate_limit("parse")),
    db: AsyncSession = Depends(get_db)
):
    limits, tier = _get_tier_limits(company)
    max_batch = limits["per_batch"]
    use_llm = limits["llm_enrichment"]

    if len(files) > max_batch:
        return error_response(
            f"Your '{tier}' plan allows max {max_batch} files per batch. "
            f"You uploaded {len(files)}. Upgrade at /portal/billing"
        )
        
    save_dir = f"{UPLOAD_DIR}/{session_id}"
    os.makedirs(save_dir, exist_ok=True)
    saved_paths = []
    
    for file in files:
        if not file.filename.lower().endswith((".pdf", ".docx")):
            continue
            
        fname = f"{uuid.uuid4()}_{file.filename}"
        path = f"{save_dir}/{fname}"
        content = await file.read()
        
        if len(content) > 10 * 1024 * 1024:
            continue
            
        with open(path, "wb") as f:
            f.write(content)
        saved_paths.append(path)
        
    job = IngestJob(
        session_id=session_id,
        type="upload",
        status="pending",
        total_files=len(saved_paths),
        processed_files=0,
        failed_files=0
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    
    process_resume_batch.delay(str(job.id), saved_paths, session_id, "upload", use_llm)
    
    return success_response({
        "job_id": str(job.id),
        "total_files": len(saved_paths),
        "status": "pending",
        "message": f"Processing {len(saved_paths)} resumes..."
    })

@router.post("/zip")
async def upload_zip(
    session_id: str = Form(...),
    file: UploadFile = File(...),
    company: Company = Depends(verify_api_key),
    _rl=Depends(check_rate_limit("parse")),
    db: AsyncSession = Depends(get_db)
):
    if not file.filename.lower().endswith(".zip"):
        return error_response("File must be .zip")
        
    save_dir = f"{UPLOAD_DIR}/{session_id}"
    os.makedirs(save_dir, exist_ok=True)
    
    zip_path = f"{save_dir}/{uuid.uuid4()}_{file.filename}"
    with open(zip_path, "wb") as f:
        f.write(await file.read())
        
    limits, tier = _get_tier_limits(company)
    max_zip = limits["zip_files"]
    use_llm = limits["llm_enrichment"]

    extracted = []
    with zipfile.ZipFile(zip_path, "r") as z:
        for name in z.namelist():
            if len(extracted) >= max_zip:
                break
            ext = Path(name).suffix.lower()
            if ext in [".pdf", ".docx", ".doc"]:
                z.extract(name, save_dir)
                extracted.append(f"{save_dir}/{name}")

    job = IngestJob(
        session_id=session_id,
        type="upload",
        status="pending",
        total_files=len(extracted),
        processed_files=0,
        failed_files=0
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    
    process_resume_batch.delay(str(job.id), extracted, session_id, "upload", use_llm)
    
    return success_response({
        "job_id": str(job.id),
        "total_files": len(extracted),
        "status": "pending"
    })

@router.get("/oauth/google/url")
async def get_google_oauth_url(
    type: str,
    session_id: str,
    company: Company = Depends(verify_api_key)
):
    scopes = []
    if type == "gmail":
        scopes = ["https://www.googleapis.com/auth/gmail.readonly"]
    elif type in ["gdrive", "form"]:
        scopes = ["https://www.googleapis.com/auth/drive.readonly"]
        
    client_secrets_file = os.getenv("GOOGLE_CLIENT_SECRETS_FILE", "credentials.json")
    if not os.path.exists(client_secrets_file):
         return error_response("Google OAuth not configured locally.")
         
    state = f"{type}:{session_id}"
    flow = Flow.from_client_secrets_file(
        client_secrets_file,
        scopes=scopes,
        state=state
    )
    flow.redirect_uri = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:3000/api/oauth/callback")
    
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        prompt="consent"
    )
    
    return success_response({"auth_url": auth_url})

class GoogleConnectPayload(BaseModel):
    session_id: str
    auth_code: str
    folder_url: Optional[str] = None
    
class SyncPayload(BaseModel):
    session_id: str

@router.post("/gmail/connect")
async def gmail_connect(req: GoogleConnectPayload, company: Company = Depends(verify_api_key), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Session).where(Session.id == req.session_id))
    session = res.scalar_one_or_none()
    
    session.gmail_tokens = {"token": req.auth_code} # Dummy bind
    session.gmail_address = "recruiter@vishleshan.com"
    await db.commit()
    
    return success_response({
        "connected": True,
        "gmail_address": session.gmail_address
    })

@router.post("/gmail/sync")
async def gmail_sync(req: SyncPayload, company: Company = Depends(verify_api_key), db: AsyncSession = Depends(get_db)):
    job = IngestJob(session_id=req.session_id, type="gmail", status="pending")
    db.add(job)
    await db.commit()
    await db.refresh(job)
    
    sync_gmail_resumes.delay(req.session_id, str(job.id))
    return success_response({"job_id": str(job.id), "status": "pending"})

@router.post("/gdrive/connect")
async def gdrive_connect(req: GoogleConnectPayload, company: Company = Depends(verify_api_key), db: AsyncSession = Depends(get_db)):
    match = re.search(r'/folders/([a-zA-Z0-9_-]+)', req.folder_url or "")
    folder_id = match.group(1) if match else req.folder_url
    
    res = await db.execute(select(Session).where(Session.id == req.session_id))
    session = res.scalar_one_or_none()
    
    session.gdrive_tokens = {"token": req.auth_code}
    await db.commit()
    
    return success_response({
        "connected": True,
        "folder_id": folder_id,
        "file_count": 0
    })

@router.post("/gdrive/sync")
async def gdrive_sync(req: SyncPayload, company: Company = Depends(verify_api_key), db: AsyncSession = Depends(get_db)):
    job = IngestJob(session_id=req.session_id, type="gdrive", status="pending")
    db.add(job)
    await db.commit()
    await db.refresh(job)
    
    sync_gdrive_resumes.delay(req.session_id, str(job.id))
    return success_response({"job_id": str(job.id), "status": "pending"})

@router.post("/google-form")
async def google_form(req: GoogleConnectPayload, company: Company = Depends(verify_api_key), db: AsyncSession = Depends(get_db)):
    job = IngestJob(session_id=req.session_id, type="form", status="pending")
    db.add(job)
    await db.commit()
    await db.refresh(job)
    
    return success_response({"job_id": str(job.id), "status": "pending"})

@router.post("/ats-import")
async def ats_import(
    session_id: str = Form(...),
    format: str = Form(...),
    file: UploadFile = File(...),
    company: Company = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db)
):
    content = await file.read()
    path = f"{UPLOAD_DIR}/temp_{uuid.uuid4()}.{format}"
    with open(path, "wb") as f: f.write(content)
    
    norm_agent = SkillNormalizationAgent()
    
    res_sess = await db.execute(select(Session).where(Session.id == session_id))
    session = res_sess.scalar_one_or_none()
    rounds = (session.rounds or []) if session else []
    first_round_order = rounds[0]["order"] if rounds else 0
    
    records = []
    if format == "csv":
        df = pd.read_csv(path)
        records = df.to_dict("records")
    elif format == "json":
        with open(path, "r") as f:
            records = json.load(f)
    elif format == "xlsx":
        df = pd.read_excel(path)
        records = df.to_dict("records")
        
    imported = 0
    errors = []
    
    for row in records:
        try:
            raw_skills = str(row.get("skills", "")).split(";")
            normalized = await norm_agent.normalize(raw_skills, db)
            
            cand = Candidate(
                session_id=session_id,
                name=row.get("name"),
                email=row.get("email"),
                phone=row.get("phone"),
                location=row.get("location"),
                total_experience_years=float(row.get("experience_years", 0)),
                normalized_skills=normalized,
                current_round_index=first_round_order,
                status="new",
                source="ats_import"
            )
            db.add(cand)
            imported += 1
        except Exception as e:
            errors.append(f"Row error: {str(e)}")
            
    await db.commit()
    
    return success_response({
        "imported": imported,
        "failed": len(errors),
        "errors": errors
    })

@router.get("/status/{job_id}")
async def get_job_status(job_id: str, company: Company = Depends(verify_api_key), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(IngestJob).where(IngestJob.id == job_id))
    job = res.scalar_one_or_none()
    
    if not job:
         return error_response("Job not found")
         
    total = job.total_files or 0
    processed = job.processed_files or 0
    progress = (processed / total * 100) if total > 0 else 0
    
    return success_response({
        "job_id": str(job.id),
        "status": job.status,
        "job_type": job.type,
        "total_files": total,
        "processed_files": processed,
        "failed_files": job.failed_files,
        "progress_percent": round(progress, 1),
        "error_log": job.error_log,
        "created_at": job.created_at.isoformat() if job.created_at else None,
        "completed_at": job.completed_at.isoformat() if job.completed_at else None
    })
