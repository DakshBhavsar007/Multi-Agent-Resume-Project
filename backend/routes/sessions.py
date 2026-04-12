from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from datetime import datetime

from models.database import get_db, Company, Session, Candidate, IngestJob
from models.schemas import success_response, error_response
from dependencies import verify_api_key, check_rate_limit
from agents.inference_agent import SkillInferenceAgent
from workers.celery_worker import match_all_candidates

router = APIRouter()


def verify_session_ownership(session, company):
    if str(session.company_id) != str(company.id):
        raise HTTPException(status_code=403, detail="Access denied")


class RoundSchema(BaseModel):
    name: str
    interviewer: Optional[str] = None
    order: int


class CreateSessionRequest(BaseModel):
    name: str
    job_title: str
    job_description: str
    rounds: Optional[List[RoundSchema]] = None


class UpdateSessionRequest(BaseModel):
    name: Optional[str] = None
    job_title: Optional[str] = None
    job_description: Optional[str] = None
    rounds: Optional[List[RoundSchema]] = None
    status: Optional[str] = None


class DeleteSessionRequest(BaseModel):
    delete_candidates: bool = False


class CriteriaRequest(BaseModel):
    required_skills: Optional[List[str]] = []
    nice_to_have: Optional[List[str]] = []
    preferred_locations: Optional[List[str]] = []
    min_experience: Optional[float] = 0
    min_match_score: Optional[float] = 0
    weights: Optional[Dict[str, float]] = {"skills": 0.5, "experience": 0.3, "location": 0.2}


class InferSkillsRequest(BaseModel):
    job_description: str


@router.post("/")
async def create_session(
    req: CreateSessionRequest,
    company: Company = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db)
):
    if not req.name or not req.job_title or not req.job_description:
        return error_response("name, job_title, job_description are required")

    rounds_data = [r.model_dump() for r in req.rounds] if req.rounds else []

    new_session = Session(
        company_id=company.id,
        name=req.name,
        job_title=req.job_title,
        job_description=req.job_description,
        rounds=rounds_data,
        status="active"
    )
    db.add(new_session)
    await db.commit()
    await db.refresh(new_session)

    return success_response({
        "id": str(new_session.id),
        "name": new_session.name,
        "job_title": new_session.job_title,
        "job_description": new_session.job_description,
        "rounds": new_session.rounds,
        "status": new_session.status,
        "created_at": new_session.created_at.isoformat() if new_session.created_at else None
    })


@router.get("/")
async def list_sessions(
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    company: Company = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db)
):
    query = select(Session).where(Session.company_id == company.id)
    if status:
        query = query.where(Session.status == status)

    query = query.order_by(Session.created_at.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)

    res = await db.execute(query)
    sessions = res.scalars().all()

    result = []
    for s in sessions:
        # Count candidates by status
        count_res = await db.execute(
            select(Candidate.status, func.count(Candidate.id))
            .where(Candidate.session_id == s.id)
            .group_by(Candidate.status)
        )
        status_counts = {row[0]: row[1] for row in count_res.all()}

        result.append({
            "id": str(s.id),
            "name": s.name,
            "job_title": s.job_title,
            "status": s.status,
            "rounds": s.rounds,
            "candidate_counts": status_counts,
            "total_candidates": sum(status_counts.values()),
            "hired": status_counts.get("hired", 0),
            "rejected": status_counts.get("rejected", 0),
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "updated_at": s.updated_at.isoformat() if s.updated_at else None
        })

    return success_response(result)


@router.get("/{session_id}")
async def get_session(
    session_id: str,
    company: Company = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(Session).where(Session.id == session_id))
    session = res.scalar_one_or_none()
    if not session:
        return error_response("Session not found")

    verify_session_ownership(session, company)

    # Count candidates per round (excluding hired/rejected as they have their own tabs)
    count_res = await db.execute(
        select(Candidate.current_round_index, func.count(Candidate.id))
        .where(
            Candidate.session_id == session.id,
            Candidate.status.notin_(["hired", "rejected"])
        )
        .group_by(Candidate.current_round_index)
    )
    round_counts = {str(row[0]): row[1] for row in count_res.all()}

    # Merge legacy round_index=0 into the first round
    if "0" in round_counts and session.rounds:
        first_order = str(session.rounds[0].get("order", 1))
        round_counts[first_order] = round_counts.get(first_order, 0) + round_counts.pop("0")

    # Count hired candidates
    hired_res = await db.execute(
        select(func.count(Candidate.id))
        .where(Candidate.session_id == session.id, Candidate.status == "hired")
    )
    total_hired = hired_res.scalar() or 0

    # Count rejected candidates
    rejected_res = await db.execute(
        select(func.count(Candidate.id))
        .where(Candidate.session_id == session.id, Candidate.status == "rejected")
    )
    total_rejected = rejected_res.scalar() or 0

    return success_response({
        "id": str(session.id),
        "name": session.name,
        "job_title": session.job_title,
        "job_description": session.job_description,
        "rounds": session.rounds,
        "criteria": session.criteria,
        "inferred_skills": session.inferred_skills,
        "status": session.status,
        "current_round": session.current_round_index,
        "candidate_counts_per_round": round_counts,
        "total_hired": total_hired,
        "total_rejected": total_rejected,
        "gmail_address": session.gmail_address,
        "created_at": session.created_at.isoformat() if session.created_at else None,
        "updated_at": session.updated_at.isoformat() if session.updated_at else None
    })


@router.patch("/{session_id}")
async def update_session(
    session_id: str,
    req: UpdateSessionRequest,
    company: Company = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(Session).where(Session.id == session_id))
    session = res.scalar_one_or_none()
    if not session:
        return error_response("Session not found")

    verify_session_ownership(session, company)

    if req.name is not None:
        session.name = req.name
    if req.job_title is not None:
        session.job_title = req.job_title
    if req.job_description is not None:
        session.job_description = req.job_description
    if req.rounds is not None:
        session.rounds = [r.model_dump() for r in req.rounds]
    if req.status is not None:
        session.status = req.status

    session.updated_at = datetime.utcnow()
    await db.commit()

    return success_response({
        "message": "Session updated",
        "id": str(session.id),
        "name": session.name,
        "updated_at": session.updated_at.isoformat()
    })


@router.delete("/{session_id}")
async def delete_session(
    session_id: str,
    req: DeleteSessionRequest,
    company: Company = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(Session).where(Session.id == session_id))
    session = res.scalar_one_or_none()
    if not session:
        return error_response("Session not found")

    verify_session_ownership(session, company)

    if req.delete_candidates:
        cands = await db.execute(
            select(Candidate).where(Candidate.session_id == session.id)
        )
        for c in cands.scalars().all():
            await db.delete(c)

    session.status = "archived"
    await db.commit()

    return success_response({"message": "Session archived"})


@router.post("/{session_id}/criteria")
async def set_criteria(
    session_id: str,
    req: CriteriaRequest,
    company: Company = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(Session).where(Session.id == session_id))
    session = res.scalar_one_or_none()
    if not session:
        return error_response("Session not found")

    verify_session_ownership(session, company)

    # Validate weights
    if req.weights:
        total = sum(req.weights.values())
        if not 0.98 <= total <= 1.02:
            return error_response(f"Weights must sum to 1.0, got {total:.2f}")

    criteria = {
        "required_skills": req.required_skills,
        "nice_to_have": req.nice_to_have,
        "preferred_locations": req.preferred_locations,
        "min_experience": req.min_experience,
        "min_match_score": req.min_match_score,
        "weights": req.weights
    }
    session.criteria = criteria
    session.updated_at = datetime.utcnow()
    await db.commit()

    # Check if candidates exist for re-matching
    count_res = await db.execute(
        select(func.count(Candidate.id)).where(Candidate.session_id == session.id)
    )
    candidate_count = count_res.scalar() or 0

    if candidate_count > 0:
        job = IngestJob(
            session_id=session.id,
            type="match_all",
            status="pending",
            total_files=candidate_count
        )
        db.add(job)
        await db.commit()
        await db.refresh(job)

        match_all_candidates.delay(session_id, str(job.id))

        return success_response({
            "updated": True,
            "criteria": criteria,
            "rematching": True,
            "job_id": str(job.id)
        })

    return success_response({"updated": True, "criteria": criteria})


@router.post("/{session_id}/infer-skills")
async def infer_skills(
    session_id: str,
    req: InferSkillsRequest,
    company: Company = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(Session).where(Session.id == session_id))
    session = res.scalar_one_or_none()
    if not session:
        return error_response("Session not found")

    verify_session_ownership(session, company)

    agent = SkillInferenceAgent()
    result = await agent.infer_from_jd(req.job_description)

    session.inferred_skills = result
    session.updated_at = datetime.utcnow()
    await db.commit()

    return success_response(result)


@router.post("/{session_id}/match-all")
async def trigger_match_all(
    session_id: str,
    company: Company = Depends(verify_api_key),
    _rl=Depends(check_rate_limit("match")),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(Session).where(Session.id == session_id))
    session = res.scalar_one_or_none()
    if not session:
        return error_response("Session not found")

    verify_session_ownership(session, company)

    job = IngestJob(
        session_id=session.id,
        type="match_all",
        status="pending"
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    match_all_candidates.delay(session_id, str(job.id))

    return success_response({"job_id": str(job.id), "status": "pending"})
