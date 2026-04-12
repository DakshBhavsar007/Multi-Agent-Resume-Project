import os
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, or_
from datetime import datetime

from models.database import get_db, Company, Session, Candidate
from models.schemas import success_response, error_response
from dependencies import verify_api_key

router = APIRouter()


def _serialize_candidate_summary(c):
    match_details = c.match_details or {}
    norm_skills = c.normalized_skills or []
    raw_data = c.raw_resume_data or {}
    parsed = raw_data.get("parsed", raw_data)

    # Extract experience and education from the parsed resume data
    experience = parsed.get("experience", [])
    education = parsed.get("education", [])
    current_role = parsed.get("current_role")
    linkedin_url = parsed.get("linkedin_url")
    github_url = parsed.get("github_url")

    # Build other_skills from normalized skills that are not in matched/missing
    matched_set = set(s.lower() for s in match_details.get("matched_skills", []))
    missing_set = set(s.lower() for s in match_details.get("missing_skills", []))
    other_skills = [
        s.get("canonical_skill", s.get("raw_skill", ""))
        for s in norm_skills
        if s.get("canonical_skill", s.get("raw_skill", "")).lower() not in matched_set
        and s.get("canonical_skill", s.get("raw_skill", "")).lower() not in missing_set
    ]

    # Build URLs
    upload_root = os.getenv("UPLOAD_DIR", "uploads")
    photo_root = os.getenv("PHOTO_DIR", "photos")
    
    # We serve these at http://host:8000/uploads/... and /photos/...
    # But for simplicity, we return relative paths like /uploads/...
    
    photo_url = None
    if c.resume_photo_path:
        try:
            rel = os.path.relpath(c.resume_photo_path, photo_root).replace("\\", "/")
            photo_url = f"/photos/{rel}"
        except: photo_url = None
        
    resume_url = None
    if c.resume_file_path:
        try:
            rel = os.path.relpath(c.resume_file_path, upload_root).replace("\\", "/")
            resume_url = f"/uploads/{rel}"
        except: resume_url = None

    return {
        "id": str(c.id),
        "name": c.name,
        "email": c.email,
        "phone": c.phone,
        "location": c.location,
        "photo_url": photo_url,
        "resume_url": resume_url,
        "match_score": c.match_score,
        "skill_score": match_details.get("skill_score"),
        "experience_score": match_details.get("experience_score"),
        "location_score": match_details.get("location_score"),
        "matched_skills": match_details.get("matched_skills", []),
        "missing_skills": match_details.get("missing_skills", []),
        "other_skills": other_skills[:10],
        "recommendation": c.recommendation,
        "total_experience_years": c.total_experience_years,
        "experience_years": c.total_experience_years,
        "current_role": current_role,
        "linkedin_url": linkedin_url,
        "github_url": github_url,
        "experience": experience,
        "education": education,
        "normalized_skills": [s.get("canonical_skill", s) for s in norm_skills] if norm_skills else [],
        "current_round_index": c.current_round_index,
        "round_index": c.current_round_index,
        "status": c.status,
        "source": c.source,
        "created_at": c.created_at.isoformat() if c.created_at else None
    }


@router.get("/sessions/{session_id}/candidates")
async def list_candidates(
    session_id: str,
    round_index: Optional[int] = None,
    status: Optional[str] = None,
    min_score: Optional[float] = None,
    max_score: Optional[float] = None,
    location: Optional[str] = None,
    skill: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = Query("match_score"),
    sort_order: str = Query("desc"),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    company: Company = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db)
):
    query = select(Candidate).where(Candidate.session_id == session_id)

    if round_index is not None:
        # Include round_index=0 (legacy default) when querying the first round
        if round_index <= 1:
            query = query.where(Candidate.current_round_index.in_([0, round_index]))
        else:
            query = query.where(Candidate.current_round_index == round_index)
    if status:
        status_list = [s.strip() for s in status.split(",") if s.strip()]
        if len(status_list) == 1:
            query = query.where(Candidate.status == status_list[0])
        else:
            query = query.where(Candidate.status.in_(status_list))
    if min_score is not None:
        query = query.where(Candidate.match_score >= min_score)
    if max_score is not None:
        query = query.where(Candidate.match_score <= max_score)
    if location:
        query = query.where(Candidate.location.ilike(f"%{location}%"))
    if search:
        query = query.where(
            or_(
                Candidate.name.ilike(f"%{search}%"),
                Candidate.email.ilike(f"%{search}%")
            )
        )

    # Sorting
    sort_col = getattr(Candidate, sort_by, Candidate.match_score)
    if sort_order == "asc":
        query = query.order_by(sort_col.asc().nullslast())
    else:
        query = query.order_by(sort_col.desc().nullslast())

    # Pagination
    query = query.offset((page - 1) * per_page).limit(per_page)

    res = await db.execute(query)
    candidates = res.scalars().all()

    # Total count (for current filter)
    count_query = select(func.count(Candidate.id)).where(Candidate.session_id == session_id)
    total_res = await db.execute(count_query)
    total = total_res.scalar() or 0

    # Count hired and rejected for tab badges
    hired_res = await db.execute(
        select(func.count(Candidate.id)).where(
            Candidate.session_id == session_id,
            Candidate.status == "hired"
        )
    )
    total_hired = hired_res.scalar() or 0

    rejected_res = await db.execute(
        select(func.count(Candidate.id)).where(
            Candidate.session_id == session_id,
            Candidate.status == "rejected"
        )
    )
    total_rejected = rejected_res.scalar() or 0

    return success_response({
        "candidates": [_serialize_candidate_summary(c) for c in candidates],
        "total": total,
        "total_hired": total_hired,
        "total_rejected": total_rejected,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page if per_page > 0 else 0
    })


@router.get("/sessions/{session_id}/candidates/{cand_id}")
async def get_candidate(
    session_id: str,
    cand_id: str,
    company: Company = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(Candidate).where(
            Candidate.id == cand_id,
            Candidate.session_id == session_id
        )
    )
    candidate = res.scalar_one_or_none()
    if not candidate:
        return error_response("Candidate not found")

    parsed = candidate.raw_resume_data or {}

    return success_response({
        "id": str(candidate.id),
        "name": candidate.name,
        "email": candidate.email,
        "phone": candidate.phone,
        "location": candidate.location,
        "photo_url": candidate.resume_photo_path,
        "match_score": candidate.match_score,
        "match_details": candidate.match_details,
        "recommendation": candidate.recommendation,
        "total_experience_years": candidate.total_experience_years,
        "normalized_skills": candidate.normalized_skills,
        "raw_resume_data": parsed,
        "resume_file_path": candidate.resume_file_path,
        "current_round_index": candidate.current_round_index,
        "status": candidate.status,
        "source": candidate.source,
        "created_at": candidate.created_at.isoformat() if candidate.created_at else None
    })


class CandidateActionRequest(BaseModel):
    action: str  # "forward", "reject", "hire"


@router.patch("/sessions/{session_id}/candidates/{cand_id}/action")
async def candidate_action(
    session_id: str,
    cand_id: str,
    req: CandidateActionRequest,
    company: Company = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(Session).where(Session.id == session_id))
    session = res.scalar_one_or_none()
    if not session:
        return error_response("Session not found")

    res = await db.execute(
        select(Candidate).where(
            Candidate.id == cand_id,
            Candidate.session_id == session_id
        )
    )
    candidate = res.scalar_one_or_none()
    if not candidate:
        return error_response("Candidate not found")

    rounds = session.rounds or []
    max_round = max([r.get("order", 1) for r in rounds]) if rounds else 1

    if req.action == "forward":
        if candidate.current_round_index >= max_round:
            return error_response("Already at last round")
        candidate.current_round_index += 1
        candidate.status = "forwarded"

    elif req.action == "reject":
        candidate.status = "rejected"

    elif req.action == "hire":
        if rounds and candidate.current_round_index < max_round:
            return error_response("Can only hire from last round")
        candidate.status = "hired"

    else:
        return error_response("Invalid action. Use: forward, reject, hire")

    await db.commit()

    return success_response({
        "id": str(candidate.id),
        "name": candidate.name,
        "status": candidate.status,
        "current_round_index": candidate.current_round_index
    })


@router.delete("/sessions/{session_id}/candidates/{cand_id}")
async def delete_candidate(
    session_id: str,
    cand_id: str,
    company: Company = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(Candidate).where(
            Candidate.id == cand_id,
            Candidate.session_id == session_id
        )
    )
    candidate = res.scalar_one_or_none()
    if not candidate:
        return error_response("Candidate not found")

    await db.delete(candidate)
    await db.commit()

    return success_response({"message": "Candidate deleted"})


class BulkRejectRequest(BaseModel):
    candidate_ids: List[str]


@router.delete("/sessions/{session_id}/candidates/bulk-reject")
async def bulk_reject(
    session_id: str,
    req: BulkRejectRequest,
    company: Company = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db)
):
    rejected_count = 0
    for cid in req.candidate_ids:
        res = await db.execute(
            select(Candidate).where(
                Candidate.id == cid,
                Candidate.session_id == session_id
            )
        )
        cand = res.scalar_one_or_none()
        if cand:
            cand.status = "rejected"
            rejected_count += 1

    await db.commit()

    return success_response({"rejected_count": rejected_count})
