"""
Job Seeker Jobs & Applications Views
──────────────────────────────────────
Handles:
  - List public jobs (sessions with status=active)
  - Job detail with AI match score against seeker's resume
  - Apply to a job → creates Candidate + JobApplication + emails + notifications
  - List seeker's applications
  - Notifications CRUD
"""

import json
import logging
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone

from api.models import Session, Candidate, JobApplication, Notification, JobSeekerAccount
from api.views.seeker_auth import require_seeker_jwt
from api.services.email_service import (
    send_application_received_to_company,
    send_application_confirmation_to_seeker,
    send_status_update_to_seeker,
)
from models.schemas import success_response, error_response

logger = logging.getLogger(__name__)


def _session_to_job(session: Session, match_score=None, applied=False) -> dict:
    """Serialize a Session as a public job listing."""
    return {
        "id": str(session.id),
        "job_title": session.job_title,
        "company_name": session.name,
        "job_description": session.job_description[:500] + "..." if len(session.job_description) > 500 else session.job_description,
        "full_description": session.job_description,
        "status": session.status,
        "rounds": len(session.rounds) if session.rounds else 1,
        "inferred_skills": session.inferred_skills or [],
        "created_at": session.created_at.isoformat() if session.created_at else None,
        "match_score": match_score,
        "applied": applied,
        "applicant_count": session.seeker_applications.count(),
    }


def _compute_match_score(seeker_skills: list, job_skills: list) -> int:
    """
    Simple set-intersection match score (0–100).
    A real implementation uses the MatchingAgent, but this is fast and dependency-free.
    """
    if not seeker_skills or not job_skills:
        return 0
    seeker_lower = {s.lower() for s in seeker_skills}
    job_lower = {s.lower() for s in job_skills}
    intersection = seeker_lower & job_lower
    return round(len(intersection) / len(job_lower) * 100) if job_lower else 0


# ── Public (authenticated seeker) endpoints ────────────────────────────────────

@csrf_exempt
@require_seeker_jwt
def list_jobs(request):
    """GET /api/v1/seeker/jobs — list all active public job postings."""
    if request.method != "GET":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        seeker = request.seeker
        q = request.GET.get("q", "").strip().lower()
        location = request.GET.get("location", "").strip().lower()
        job_type = request.GET.get("job_type", "").strip().lower()

        sessions = Session.objects.filter(status="active").order_by("-created_at")

        if q:
            sessions = sessions.filter(job_title__icontains=q)
        if location:
            sessions = sessions.filter(job_description__icontains=location)

        # Get seeker's applied session IDs
        applied_ids = set(
            str(sid) for sid in
            JobApplication.objects.filter(seeker=seeker).values_list("session_id", flat=True)
        )

        jobs = []
        for s in sessions[:50]:
            score = _compute_match_score(seeker.skills, s.inferred_skills)
            jobs.append(_session_to_job(s, match_score=score, applied=str(s.id) in applied_ids))

        # Sort by match score descending
        jobs.sort(key=lambda j: j["match_score"] or 0, reverse=True)

        return JsonResponse(success_response({
            "jobs": jobs,
            "total": len(jobs),
        }))
    except Exception as e:
        logger.error("list_jobs error: %s", e)
        return JsonResponse(error_response(f"Server error: {e}"), status=500)


@csrf_exempt
@require_seeker_jwt
def job_detail(request, session_id):
    """GET /api/v1/seeker/jobs/<session_id> — single job detail with skill alignment."""
    if request.method != "GET":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        seeker = request.seeker
        session = Session.objects.filter(id=session_id).first()
        if not session:
            return JsonResponse(error_response("Job not found"), status=404)

        score = _compute_match_score(seeker.skills, session.inferred_skills)
        applied = JobApplication.objects.filter(seeker=seeker, session=session).exists()

        # Compute skill alignment
        seeker_lower = {s.lower(): s for s in seeker.skills}
        job_skills = session.inferred_skills or []
        matched_skills = [s for s in job_skills if s.lower() in seeker_lower]
        missing_skills = [s for s in job_skills if s.lower() not in seeker_lower]

        job = _session_to_job(session, match_score=score, applied=applied)
        job["skill_alignment"] = {
            "matched": matched_skills,
            "missing": missing_skills,
            "match_pct": score,
        }
        return JsonResponse(success_response(job))
    except Exception as e:
        logger.error("job_detail error: %s", e)
        return JsonResponse(error_response(f"Server error: {e}"), status=500)


@csrf_exempt
@require_seeker_jwt
def apply_job(request, session_id):
    """
    POST /api/v1/seeker/jobs/<session_id>/apply
    Body: { "cover_note": "..." }  (optional)

    Flow:
      1. Validate seeker has a resume
      2. Check no duplicate application
      3. Create Candidate record in session (for ATS view)
      4. Create JobApplication record
      5. Create Notifications for seeker + company
      6. Send emails (non-blocking)
    """
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        seeker = request.seeker

        if not seeker.resume_data:
            return JsonResponse(error_response("Please upload your resume before applying"), status=400)

        session = Session.objects.filter(id=session_id, status="active").first()
        if not session:
            return JsonResponse(error_response("Job posting not found or no longer active"), status=404)

        # Duplicate check
        if JobApplication.objects.filter(seeker=seeker, session=session).exists():
            return JsonResponse(error_response("You have already applied to this job"), status=400)

        body = {}
        if request.body:
            try:
                body = json.loads(request.body)
            except Exception:
                pass
        cover_note = body.get("cover_note", "")

        # Build resume data for Candidate record
        resume = seeker.resume_data or {}

        # Create Candidate in the ATS session
        candidate = Candidate.objects.create(
            session=session,
            name=seeker.full_name,
            email=seeker.email,
            phone=seeker.phone or resume.get("phone"),
            location=seeker.location or resume.get("location"),
            resume_file_path=seeker.resume_file_path,
            raw_resume_data=resume,
            normalized_skills=seeker.skills,
            total_experience_years=float(resume.get("total_experience_years", 0)),
            status="new",
            source="platform_apply",
            current_round_index=session.rounds[0]["order"] if session.rounds else 0,
        )

        # Create JobApplication record
        application = JobApplication.objects.create(
            seeker=seeker,
            session=session,
            candidate=candidate,
            cover_note=cover_note,
            status="applied",
        )

        # Notification for seeker
        Notification.objects.create(
            seeker=seeker,
            type="general",
            title=f"Application submitted — {session.job_title}",
            message=f"Your application to {session.name} for {session.job_title} has been submitted.",
            link=f"/jobs/dashboard/applications",
        )

        # Notification for company
        Notification.objects.create(
            company=session.company,
            type="application_received",
            title=f"New applicant — {session.job_title}",
            message=f"{seeker.full_name} applied for {session.job_title}.",
            link=f"/dashboard/sessions/{session_id}",
        )

        # Send emails (non-blocking — failure won't break apply)
        send_application_received_to_company(
            company_email=session.company.email,
            company_name=session.name,
            seeker_name=seeker.full_name,
            job_title=session.job_title,
            session_id=session_id,
        )
        send_application_confirmation_to_seeker(
            seeker_email=seeker.email,
            seeker_name=seeker.full_name,
            job_title=session.job_title,
            company_name=session.name,
        )

        return JsonResponse(success_response({
            "application_id": str(application.id),
            "status": "applied",
            "message": f"Successfully applied to {session.job_title} at {session.name}",
        }), status=201)

    except Exception as e:
        logger.error("apply_job error: %s", e)
        return JsonResponse(error_response(f"Server error: {e}"), status=500)


@csrf_exempt
@require_seeker_jwt
def my_applications(request):
    """GET /api/v1/seeker/applications — list all seeker's job applications."""
    if request.method != "GET":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        seeker = request.seeker
        apps = JobApplication.objects.filter(seeker=seeker).select_related("session").order_by("-applied_at")

        result = []
        for app in apps:
            result.append({
                "id": str(app.id),
                "job_id": str(app.session.id),
                "job_title": app.session.job_title,
                "company_name": app.session.name,
                "status": app.status,
                "cover_note": app.cover_note,
                "applied_at": app.applied_at.isoformat(),
                "updated_at": app.updated_at.isoformat(),
            })

        return JsonResponse(success_response({
            "applications": result,
            "total": len(result),
        }))
    except Exception as e:
        logger.error("my_applications error: %s", e)
        return JsonResponse(error_response(f"Server error: {e}"), status=500)


# ── Notifications ──────────────────────────────────────────────────────────────

@csrf_exempt
@require_seeker_jwt
def get_notifications(request):
    """GET /api/v1/seeker/notifications"""
    if request.method != "GET":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        notifs = Notification.objects.filter(seeker=request.seeker).order_by("-created_at")[:50]
        data = [{
            "id": str(n.id),
            "type": n.type,
            "title": n.title,
            "message": n.message,
            "is_read": n.is_read,
            "link": n.link,
            "created_at": n.created_at.isoformat(),
        } for n in notifs]
        unread_count = Notification.objects.filter(seeker=request.seeker, is_read=False).count()
        return JsonResponse(success_response({"notifications": data, "unread_count": unread_count}))
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {e}"), status=500)


@csrf_exempt
@require_seeker_jwt
def mark_notification_read(request, notif_id):
    """PATCH /api/v1/seeker/notifications/<id>/read"""
    if request.method not in ["PATCH", "POST", "PUT"]:
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        notif = Notification.objects.filter(id=notif_id, seeker=request.seeker).first()
        if not notif:
            return JsonResponse(error_response("Notification not found"), status=404)
        notif.is_read = True
        notif.save(update_fields=["is_read"])
        return JsonResponse(success_response({"marked_read": True}))
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {e}"), status=500)


@csrf_exempt
@require_seeker_jwt
def mark_all_notifications_read(request):
    """POST /api/v1/seeker/notifications/read-all"""
    if request.method not in ["POST", "PATCH"]:
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        Notification.objects.filter(seeker=request.seeker, is_read=False).update(is_read=True)
        return JsonResponse(success_response({"message": "All notifications marked as read"}))
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {e}"), status=500)


# ── Company notifications (for recruiter ATS view) ─────────────────────────────

def get_company_notifications(company, limit=20):
    """Helper used by company dashboard to fetch their notifications."""
    notifs = Notification.objects.filter(company=company).order_by("-created_at")[:limit]
    return [{
        "id": str(n.id),
        "type": n.type,
        "title": n.title,
        "message": n.message,
        "is_read": n.is_read,
        "link": n.link,
        "created_at": n.created_at.isoformat(),
    } for n in notifs]
