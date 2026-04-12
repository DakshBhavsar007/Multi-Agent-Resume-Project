from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional
import io
import pandas as pd

from models.database import get_db, Company, Session, Candidate
from models.schemas import success_response, error_response
from dependencies import verify_api_key

router = APIRouter()


@router.get("/{session_id}/export/candidates")
async def export_candidates(
    session_id: str,
    status: str = Query("all"),
    company: Company = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db)
):
    query = select(Candidate).where(Candidate.session_id == session_id)
    if status != "all":
        query = query.where(Candidate.status == status)

    res = await db.execute(query)
    candidates = res.scalars().all()

    rows = []
    for c in candidates:
        match_details = c.match_details or {}
        norm_skills = c.normalized_skills or []
        parsed = c.raw_resume_data or {}
        parsed_data = parsed.get("parsed", {}) if isinstance(parsed, dict) else {}

        matched = ", ".join(match_details.get("matched_skills", []))
        missing = ", ".join(match_details.get("missing_skills", []))
        skills_str = ", ".join([s.get("canonical_skill", "") for s in norm_skills]) if norm_skills else ""

        education_list = parsed_data.get("education", [])
        edu_str = ", ".join([
            f"{e.get('degree', '')} - {e.get('institution', '')}"
            for e in education_list
        ]) if education_list else ""

        cert_list = parsed_data.get("certifications", [])
        cert_str = ", ".join([
            e.get("name", "") for e in cert_list
        ]) if cert_list else ""

        rounds = c.current_round_index or 0

        rows.append({
            "Name": c.name,
            "Email": c.email,
            "Phone": c.phone,
            "Location": c.location,
            "Match Score(%)": c.match_score,
            "Recommendation": c.recommendation,
            "Matched Skills": matched,
            "Missing Skills": missing,
            "Experience(years)": c.total_experience_years,
            "Education": edu_str,
            "Certifications": cert_str,
            "Status": c.status,
            "Round Reached": rounds
        })

    df = pd.DataFrame(rows)
    buf = io.StringIO()
    df.to_csv(buf, index=False)
    buf.seek(0)

    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=candidates_{session_id[:8]}.csv"
        }
    )


@router.get("/{session_id}/export/report")
async def export_report(
    session_id: str,
    company: Company = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db)
):
    # Fetch session
    sess_res = await db.execute(select(Session).where(Session.id == session_id))
    session = sess_res.scalar_one_or_none()
    if not session:
        return error_response("Session not found")

    # Fetch all candidates
    cand_res = await db.execute(
        select(Candidate).where(Candidate.session_id == session_id)
    )
    candidates = cand_res.scalars().all()

    lines = []

    # Section 1: Session summary
    lines.append("=== SESSION SUMMARY ===")
    lines.append(f"Session,{session.name}")
    lines.append(f"Job Title,{session.job_title}")
    lines.append(f"Total Candidates,{len(candidates)}")

    status_counts = {}
    for c in candidates:
        status_counts[c.status] = status_counts.get(c.status, 0) + 1
    for st, cnt in status_counts.items():
        lines.append(f"{st},{cnt}")

    avg_score = 0
    scored = [c for c in candidates if c.match_score is not None]
    if scored:
        avg_score = sum(c.match_score for c in scored) / len(scored)
    lines.append(f"Average Match Score,{round(avg_score, 1)}")
    lines.append("")

    # Section 2: Per-round breakdown
    lines.append("=== PER-ROUND BREAKDOWN ===")
    lines.append("Round,Candidates")
    round_counts = {}
    for c in candidates:
        ri = c.current_round_index or 0
        round_counts[ri] = round_counts.get(ri, 0) + 1
    for ri in sorted(round_counts.keys()):
        round_name = f"Round {ri}"
        rounds_data = session.rounds or []
        if ri < len(rounds_data):
            round_name = rounds_data[ri].get("name", round_name)
        lines.append(f"{round_name},{round_counts[ri]}")
    lines.append("")

    # Section 3: Top 10 candidates
    lines.append("=== TOP 10 CANDIDATES ===")
    lines.append("Name,Email,Match Score,Recommendation,Experience(yrs),Status")
    top10 = sorted(candidates, key=lambda c: c.match_score or 0, reverse=True)[:10]
    for c in top10:
        lines.append(
            f"{c.name},{c.email},{c.match_score},{c.recommendation},"
            f"{c.total_experience_years},{c.status}"
        )

    content = "\n".join(lines)
    buf = io.StringIO(content)

    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=report_{session_id[:8]}.csv"
        }
    )
