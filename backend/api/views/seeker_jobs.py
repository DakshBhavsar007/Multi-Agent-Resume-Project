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

import os
import json
import logging
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone

from api.models import Session, Candidate, JobApplication, Notification, JobSeekerAccount, SavedJob, ApplicantRoundAttempt, SessionRound
from api.views.seeker_auth import require_seeker_jwt
from api.services.email_service import (
    send_application_received_to_company,
    send_application_confirmation_to_seeker,
    send_status_update_to_seeker,
)
from models.schemas import success_response, error_response

logger = logging.getLogger(__name__)


def _parse_job_description_meta(description: str) -> dict:
    """Parses salary, location, and employment type from job description text."""
    meta = {
        "salary_range": "Competitive",
        "location": "Remote",
        "employment_type": "Full-time"
    }
    if not description:
        return meta
    
    for line in description.splitlines():
        line = line.strip()
        if not line:
            continue
        if ":" in line:
            parts = line.split(":", 1)
            key = parts[0].strip().lower()
            val = parts[1].strip()
            if not val:
                continue
            if key == "salary":
                meta["salary_range"] = val
            elif key == "location":
                meta["location"] = val
            elif key in ["type", "employment type", "employment_type"]:
                meta["employment_type"] = val
    return meta


def _get_salary_range(session) -> str:
    criteria = session.criteria or {}
    salary_min = criteria.get("salary_min")
    salary_max = criteria.get("salary_max")
    salary_currency = criteria.get("salary_currency", "USD")
    
    currency_symbols = {
        "USD": "$",
        "INR": "₹",
        "EUR": "€",
        "GBP": "£",
    }
    symbol = currency_symbols.get(salary_currency, salary_currency + " ")
    
    if salary_min is not None and salary_max is not None:
        try:
            return f"{symbol}{int(salary_min):,} - {symbol}{int(salary_max):,}"
        except (ValueError, TypeError):
            pass
    elif salary_min is not None:
        try:
            return f"{symbol}{int(salary_min):,}+"
        except (ValueError, TypeError):
            pass
            
    # Fallback to description parsing
    meta = _parse_job_description_meta(session.job_description)
    return meta["salary_range"]


def _session_to_job(session: Session, match_score=None, applied=False, is_saved=False) -> dict:
    """Serialize a Session as a public job listing."""
    meta = _parse_job_description_meta(session.job_description)
    return {
        "id": str(session.id),
        "job_title": session.job_title,
        "company_name": session.company.name if session.company else "Vishleshan Partner",
        "company_logo_path": session.company.logo_path if session.company else None,
        "job_description": session.job_description[:500] + "..." if len(session.job_description) > 500 else session.job_description,
        "full_description": session.job_description,
        "status": session.status,
        "rounds": len(session.rounds) if session.rounds else 1,
        "inferred_skills": session.inferred_skills or [],
        "created_at": session.created_at.isoformat() if session.created_at else None,
        "match_score": match_score,
        "applied": applied,
        "is_saved": is_saved,
        "applicant_count": session.applicant_count if hasattr(session, "applicant_count") else session.seeker_applications.count(),
        "salary_range": _get_salary_range(session),
        "location": meta["location"],
        "employment_type": meta["employment_type"],
    }


def _get_flat_skills(skills):
    if not skills:
        return []
    
    # If skills is a dictionary, extract the skills lists
    if isinstance(skills, dict):
        skills_list = []
        if "required_skills" in skills:
            skills_list.extend(skills["required_skills"])
        if "nice_to_have_skills" in skills:
            skills_list.extend(skills["nice_to_have_skills"])
        if "skills" in skills:
            skills_list.extend(skills["skills"])
        
        if not skills_list:
            skills_list = list(skills.keys())
        skills = skills_list

    flat = []
    for s in skills:
        if isinstance(s, dict):
            name = s.get("canonical_skill") or s.get("skill") or s.get("raw_skill") or str(s)
            if name:
                flat.append(name)
        elif isinstance(s, str):
            flat.append(s)
    return flat


def _compute_match_score(seeker_skills: list, job_skills: list) -> int:
    """
    Simple set-intersection match score (0–100).
    A real implementation uses the MatchingAgent, but this is fast and dependency-free.
    """
    if not seeker_skills or not job_skills:
        return 0
    flat_seeker = _get_flat_skills(seeker_skills)
    flat_job = _get_flat_skills(job_skills)
    seeker_lower = {s.lower() for s in flat_seeker if s}
    job_lower = {s.lower() for s in flat_job if s}
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
        try:
            page = int(request.GET.get("page", 1))
            per_page = int(request.GET.get("per_page", 10))
        except ValueError:
            page = 1
            per_page = 10

        from django.db.models import Count
        sessions = Session.objects.filter(status="active").select_related("company").annotate(applicant_count=Count("seeker_applications")).order_by("-created_at")

        if q:
            sessions = sessions.filter(job_title__icontains=q)
        if location:
            sessions = sessions.filter(job_description__icontains=location)

        # Get seeker's applied session IDs
        applied_ids = set(
            str(sid) for sid in
            JobApplication.objects.filter(seeker=seeker).values_list("session_id", flat=True)
        )

        # Get seeker's saved session IDs
        saved_ids = set(
            str(sid) for sid in
            SavedJob.objects.filter(seeker=seeker).values_list("session_id", flat=True)
        )

        jobs = []
        for s in sessions[:200]:
            score = _compute_match_score(seeker.skills, s.inferred_skills)
            is_applied = str(s.id) in applied_ids
            is_saved = str(s.id) in saved_ids
            jobs.append(_session_to_job(s, match_score=score, applied=is_applied, is_saved=is_saved))

        # Sort by match score descending
        jobs.sort(key=lambda j: j["match_score"] or 0, reverse=True)

        total_jobs = len(jobs)
        start = (page - 1) * per_page
        end = start + per_page
        paginated_jobs = jobs[start:end]

        return JsonResponse(success_response({
            "jobs": paginated_jobs,
            "total": total_jobs,
            "page": page,
            "per_page": per_page,
            "total_pages": (total_jobs + per_page - 1) // per_page if per_page else 1
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

    import uuid
    try:
        uuid.UUID(str(session_id))
    except ValueError:
        return JsonResponse(error_response("Invalid job ID format"), status=400)

    try:
        seeker = request.seeker
        session = Session.objects.filter(id=session_id, status="active").first()
        if not session:
            return JsonResponse(error_response("Job not found"), status=404)

        score = _compute_match_score(seeker.skills, session.inferred_skills)
        applied = JobApplication.objects.filter(seeker=seeker, session=session).exists()
        is_saved = SavedJob.objects.filter(seeker=seeker, session=session).exists()

        # Compute skill alignment
        flat_seeker = _get_flat_skills(seeker.skills)
        seeker_lower = {s.lower(): s for s in flat_seeker if s}
        flat_job = _get_flat_skills(session.inferred_skills)
        job_skills = flat_job
        matched_skills = [s for s in job_skills if s.lower() in seeker_lower]
        missing_skills = [s for s in job_skills if s.lower() not in seeker_lower]

        job = _session_to_job(session, match_score=score, applied=applied, is_saved=is_saved)
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

    import uuid
    try:
        uuid.UUID(str(session_id))
    except ValueError:
        return JsonResponse(error_response("Invalid job ID format"), status=400)

    try:
        seeker = request.seeker

        if not seeker.resume_data:
            return JsonResponse(error_response("Please upload your resume before applying"), status=400)

        # Enforce free plan limits
        if seeker.tier != "premium":
            from django.utils import timezone
            from datetime import timedelta
            thirty_days_ago = timezone.now() - timedelta(days=30)
            app_count = JobApplication.objects.filter(seeker=seeker, applied_at__gte=thirty_days_ago).count()
            if app_count >= 3:
                return JsonResponse(error_response("You have reached the limit of 3 job applications per month on the Free Plan. Please upgrade to Premium for unlimited applications."), status=403)

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

        # Safely convert total_experience_years to float
        raw_exp_years = resume.get("total_experience_years")
        if raw_exp_years is None:
            raw_exp_years = 0.0
        try:
            total_exp = float(raw_exp_years)
        except (ValueError, TypeError):
            total_exp = 0.0

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
            total_experience_years=total_exp,
            status="new",
            source="platform_apply",
            current_round_index=session.rounds[0]["order"] if session.rounds else 0,
        )

        # Calculate match details using jobs module helper
        from api.views.jobs import _calculate_match_score
        _calculate_match_score(candidate, session)

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
            message=f"Your application to {session.company.name if session.company else 'Vishleshan Partner'} for {session.job_title} has been submitted.",
            link=f"/jobs/applications?app_id={application.id}",
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
            company_name=session.company.name if session.company else "Vishleshan Partner",
            seeker_name=seeker.full_name,
            job_title=session.job_title,
            session_id=session_id,
        )
        send_application_confirmation_to_seeker(
            seeker_email=seeker.email,
            seeker_name=seeker.full_name,
            job_title=session.job_title,
            company_name=session.company.name if session.company else "Vishleshan Partner",
        )

        return JsonResponse(success_response({
            "application_id": str(application.id),
            "status": "applied",
            "message": f"Successfully applied to {session.job_title} at {session.company.name if session.company else 'Vishleshan Partner'}",
        }), status=201)

    except Exception as e:
        logger.error("apply_job error: %s", e)
        return JsonResponse(error_response(f"Server error: {e}"), status=500)


def release_due_results_for_seeker(seeker):
    from django.utils import timezone
    from django.utils.dateparse import parse_datetime
    from django.utils.timezone import is_aware, make_aware
    from api.models import JobApplication, Notification
    from api.services.email_service import send_status_update_to_seeker
    import logging
    logger = logging.getLogger(__name__)

    apps = JobApplication.objects.filter(seeker=seeker).select_related('session', 'candidate')
    now = timezone.now()

    for app in apps:
        candidate = app.candidate
        if not candidate:
            continue
        
        session = app.session
        rounds = session.rounds or []
        
        # Recruiter status and current round
        cand_status = candidate.status  # new, forwarded, hired, rejected
        cand_round = candidate.current_round_index
        
        # Seeker status currently saved in app
        current_app_status = app.status  # applied, shortlisted, hired, rejected
        
        # Determine target seeker status based on candidate action
        status_map = {
            'hired': 'hired',
            'rejected': 'rejected',
            'forwarded': 'shortlisted',
            'new': 'applied',
        }
        target_app_status = status_map.get(cand_status, 'applied')
        
        # If the app status doesn't match target status, check if the completed round's result date has passed
        if current_app_status != target_app_status:
            # The recruiter did an action. Let's find what round they completed.
            completed_round_order = cand_round
            if cand_status == 'forwarded':
                completed_round_order = max(cand_round - 1, 1)
            
            # Find the announcement date of completed_round_order
            announcement_time = None
            for r in rounds:
                try:
                    if int(r.get("order")) == int(completed_round_order):
                        ann_date = r.get("result_announcement_date")
                        if ann_date:
                            dt = parse_datetime(ann_date)
                            if dt:
                                if not is_aware(dt):
                                    dt = make_aware(dt)
                                announcement_time = dt
                        break
                except (ValueError, TypeError):
                    continue

            # If announcement time is in the past (or not set), release it!
            if not announcement_time or now >= announcement_time:
                # Update JobApplication
                app.status = target_app_status
                app.save(update_fields=['status'])
                
                # Create in-app notification if it doesn't exist yet
                notif_exists = Notification.objects.filter(
                    seeker=seeker,
                    type='status_updated',
                    title=f'Application Update — {session.job_title}',
                    message__contains=target_app_status.title()
                ).exists()
                
                if not notif_exists:
                    Notification.objects.create(
                        seeker=seeker,
                        type='status_updated',
                        title=f'Application Update — {session.job_title}',
                        message=f'Your application at {session.company.name if session.company else "Vishleshan Partner"} has been updated to: {target_app_status.title()}.',
                        link=f'/jobs/applications?app_id={app.id}',
                    )
                    
                    # Send email
                    send_status_update_to_seeker(
                        seeker_email=seeker.email,
                        seeker_name=seeker.full_name,
                        job_title=session.job_title,
                        company_name=session.company.name if session.company else "Vishleshan Partner",
                        new_status=target_app_status,
                    )
                    logger.info(f"Released pending result on-the-fly: {target_app_status} for app {app.id}")

@csrf_exempt
@require_seeker_jwt
def my_applications(request):
    """GET /api/v1/seeker/applications — list all seeker's job applications."""
    if request.method != "GET":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        seeker = request.seeker
        # Release any results that have become due
        release_due_results_for_seeker(seeker)

        apps = JobApplication.objects.filter(seeker=seeker).select_related("session", "candidate").order_by("-applied_at")
        now = timezone.now()

        result = []
        for app in apps:
            session = app.session
            candidate = app.candidate
            
            rounds = session.rounds or []
            # Sort rounds
            sorted_rounds = sorted(rounds, key=lambda r: int(r.get("order", 1)))
            
            # Find max declared order
            max_declared_order = 0
            from django.utils.dateparse import parse_datetime
            from django.utils.timezone import is_aware, make_aware
            for r in sorted_rounds:
                ann_date = r.get("result_announcement_date")
                if ann_date:
                    try:
                        dt = parse_datetime(ann_date)
                        if dt:
                            if not is_aware(dt):
                                dt = make_aware(dt)
                            if now >= dt:
                                max_declared_order = int(r.get("order", 1))
                    except Exception:
                        pass
                else:
                    max_declared_order = int(r.get("order", 1))

            # Candidate status and round
            cand_round = candidate.current_round_index if candidate else 1
            cand_status = candidate.status if candidate else "new"

            # Dynamic visible index & status for seeker display
            visible_round_index = 1
            seeker_status = "applied"

            if cand_status == "rejected":
                if cand_round <= max_declared_order:
                    seeker_status = "rejected"
                    visible_round_index = cand_round
                else:
                    visible_round_index = min(max_declared_order + 1, len(sorted_rounds))
                    seeker_status = "shortlisted" if visible_round_index > 1 else "applied"
            elif cand_status == "hired":
                final_round_order = sorted_rounds[-1].get("order", 1) if sorted_rounds else 1
                if final_round_order <= max_declared_order:
                    seeker_status = "hired"
                    visible_round_index = final_round_order
                else:
                    visible_round_index = final_round_order
                    seeker_status = "shortlisted" if visible_round_index > 1 else "applied"
            else:
                highest_cleared_declared = min(max(cand_round - 1, 0), max_declared_order)
                if cand_round > (len(sorted_rounds) if sorted_rounds else 0):
                    visible_round_index = cand_round
                else:
                    visible_round_index = min(highest_cleared_declared + 1, len(sorted_rounds) if sorted_rounds else 1)
                seeker_status = "shortlisted" if visible_round_index > 1 else "applied"

            # Match score fallback
            match_score = candidate.match_score if candidate else None
            if match_score is None:
                match_score = _compute_match_score(seeker.skills, session.inferred_skills)

            # Format rounds
            ui_rounds = []
            for r in sorted_rounds:
                ui_rounds.append({
                    "name": r.get("name"),
                    "interviewer": r.get("interviewer"),
                    "order": r.get("order"),
                    "result_announcement_date": r.get("result_announcement_date")
                })

            # Compute offer letter URL relative path if present
            offer_letter_url = None
            if app.offer_letter_path:
                try:
                    upload_root = os.getenv("UPLOAD_DIR", "uploads")
                    rel = os.path.relpath(app.offer_letter_path, upload_root).replace("\\", "/")
                    offer_letter_url = f"/uploads/{rel}"
                except Exception:
                    offer_letter_url = None

            # Check for active proctored rounds
            test_link = None
            test_round_name = None
            if candidate:
                active_attempt = ApplicantRoundAttempt.objects.filter(
                    candidate=candidate,
                    round__round_number=candidate.current_round_index,
                    status__in=["pending", "in_progress"]
                ).select_related("round").first()
                
                if not active_attempt:
                    sr = SessionRound.objects.filter(
                        session=session,
                        round_number=candidate.current_round_index
                    ).first()
                    if sr and sr.round_type in ["mcq", "coding", "interview"]:
                        import secrets
                        from datetime import timedelta
                        token = secrets.token_urlsafe(32)
                        active_attempt, created = ApplicantRoundAttempt.objects.get_or_create(
                            candidate=candidate,
                            round=sr,
                            defaults={
                                "access_token": token,
                                "token_expires_at": timezone.now() + timedelta(days=7),
                                "status": "pending"
                            }
                        )
                
                if active_attempt and active_attempt.status in ["pending", "in_progress"]:
                    test_link = f"/test/entry?token={active_attempt.access_token}"
                    test_round_name = active_attempt.round.name

            # Calculate rejection reason if rejected
            rejection_reason = None
            if seeker_status == "rejected" and candidate:
                failed_sr = SessionRound.objects.filter(session=session, round_number=candidate.current_round_index).first()
                if failed_sr:
                    attempt = ApplicantRoundAttempt.objects.filter(candidate=candidate, round=failed_sr).first()
                    if attempt:
                        passing_threshold = failed_sr.passing_score
                        if failed_sr.round_type == "mcq" and attempt.mcq_score is not None:
                            rejection_reason = f"Scored {attempt.mcq_score}% (Passing score: {passing_threshold}%)"
                        elif failed_sr.round_type == "coding" and attempt.coding_score is not None:
                            rejection_reason = f"Scored {attempt.coding_score}% (Passing score: {passing_threshold}%)"
                        elif failed_sr.round_type == "interview" and attempt.interview_score is not None:
                            rejection_reason = f"Interview Score: {attempt.interview_score}%"
                            if attempt.interview_recommendation:
                                rejection_reason += f" - {attempt.interview_recommendation}"
                if not rejection_reason:
                    rejection_reason = f"Resume match score ({match_score}%) did not meet recruiter criteria."

            result.append({
                "id": str(app.id),
                "job_id": str(session.id),
                "job_title": session.job_title,
                "company_name": session.company.name if session.company else "Vishleshan Partner",
                "company_logo_path": None,
                "status": seeker_status,
                "accepted_terms": app.accepted_terms,
                "offer_letter_url": offer_letter_url,
                "cover_note": app.cover_note,
                "applied_at": app.applied_at.isoformat(),
                "updated_at": app.updated_at.isoformat(),
                "rounds": ui_rounds,
                "visible_round_index": visible_round_index,
                "agent_processing_status": "success",
                "match_score": match_score,
                "test_link": test_link,
                "test_round_name": test_round_name,
                "rejection_reason": rejection_reason,
                "candidate_id": str(candidate.id) if candidate else None,
            })

        return JsonResponse(success_response({
            "applications": result,
            "total": len(result),
            "server_time": timezone.now().isoformat(),
        }))
    except Exception as e:
        logger.error("my_applications error: %s", e)
        return JsonResponse(error_response(f"Server error: {e}"), status=500)

@csrf_exempt
@require_seeker_jwt
def accept_offer(request, app_id):
    if request.method not in ["POST", "PATCH"]:
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        app = JobApplication.objects.filter(id=app_id, seeker=request.seeker).first()
        if not app:
            return JsonResponse(error_response("Application not found"), status=404)
        if app.status != "hired":
            return JsonResponse(error_response("You can only accept offers for hired status"), status=400)
        
        app.accepted_terms = True
        app.save(update_fields=["accepted_terms"])

        # Automatically mark the session as completed
        session = app.session
        session.status = "completed"
        session.save(update_fields=["status"])

        return JsonResponse(success_response({"accepted": True, "company_name": app.session.company.name if app.session.company else "Vishleshan Partner"}))
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {e}"), status=500)

# ── Notifications ──────────────────────────────────────────────────────────────

@csrf_exempt
@require_seeker_jwt
def get_notifications(request):
    """GET /api/v1/seeker/notifications"""
    if request.method != "GET":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        release_due_results_for_seeker(request.seeker)
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


@csrf_exempt
@require_seeker_jwt
def save_job(request, session_id):
    """
    POST /api/v1/seeker/jobs/<session_id>/save -> Save a job
    DELETE /api/v1/seeker/jobs/<session_id>/save -> Unsave a job
    """
    if request.method not in ["POST", "DELETE"]:
        return JsonResponse(error_response("Method not allowed"), status=405)
        
    import uuid
    try:
        uuid.UUID(str(session_id))
    except ValueError:
        return JsonResponse(error_response("Invalid job ID format"), status=400)

    try:
        seeker = request.seeker
        try:
            session = Session.objects.get(id=session_id)
        except Session.DoesNotExist:
            return JsonResponse(error_response("Job session not found"), status=404)
            
        if request.method == "POST":
            saved_job, created = SavedJob.objects.get_or_create(seeker=seeker, session=session)
            return JsonResponse(success_response({"saved": True, "created": created}))
            
        elif request.method == "DELETE":
            SavedJob.objects.filter(seeker=seeker, session=session).delete()
            return JsonResponse(success_response({"saved": False}))
            
    except Exception as e:
        logger.error(f"Error in save_job view: {str(e)}", exc_info=True)
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)


@csrf_exempt
@require_seeker_jwt
def get_saved_jobs(request):
    """GET /api/v1/seeker/jobs/saved -> List seeker's saved jobs"""
    if request.method != "GET":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        seeker = request.seeker
        saved_jobs_qs = SavedJob.objects.filter(seeker=seeker).select_related("session", "session__company")
        
        # Get seeker's applied session IDs
        applied_ids = set(
            str(sid) for sid in
            JobApplication.objects.filter(seeker=seeker).values_list("session_id", flat=True)
        )
        
        jobs = []
        for sj in saved_jobs_qs:
            s = sj.session
            score = _compute_match_score(seeker.skills, s.inferred_skills)
            jobs.append(_session_to_job(s, match_score=score, applied=str(s.id) in applied_ids, is_saved=True))
            
        return JsonResponse(success_response({"jobs": jobs}))
    except Exception as e:
        logger.error(f"Error in get_saved_jobs: {str(e)}", exc_info=True)
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)


@csrf_exempt
@require_seeker_jwt
def generate_cover_letter(request):
    """POST /api/v1/seeker/jobs/generate-cover-letter"""
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        data = json.loads(request.body)
        job_title = data.get("job_title")
        job_description = data.get("job_description", "")
        company_name = data.get("company_name", "the hiring company")
        
        if not job_title:
            return JsonResponse(error_response("job_title is required"), status=400)
            
        seeker = request.seeker
        from agents.cover_letter_agent import CoverLetterGeneratorAgent
        agent = CoverLetterGeneratorAgent()
        
        # Pull candidate details
        seeker_skills = _get_flat_skills(seeker.skills or [])
        seeker_experience = seeker.resume_data.get("experience") or seeker.resume_data.get("work_experience") or []
        
        letter = agent.generate_cover_letter(
            seeker_name=seeker.full_name,
            seeker_skills=seeker_skills,
            seeker_experience=seeker_experience,
            job_title=job_title,
            job_description=job_description,
            company_name=company_name
        )
        
        return JsonResponse(success_response({"cover_letter": letter}))
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)

