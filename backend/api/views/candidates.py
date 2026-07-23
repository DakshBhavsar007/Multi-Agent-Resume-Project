import os
import json
import logging
import ast
import re
import uuid
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Q, F
from django.utils import timezone

from api.models import Company, Session, Candidate, JobApplication, Notification
from api.decorators import require_api_key
from models.schemas import success_response, error_response
from api.services.email_service import send_status_update_to_seeker

logger = logging.getLogger(__name__)

def _get_skill_name(s):
    if not s:
        return ""
    if isinstance(s, dict):
        return s.get("canonical_skill") or s.get("skill") or s.get("raw_skill") or s.get("name") or str(s)
    if isinstance(s, str):
        s_trimmed = s.strip()
        if s_trimmed.startswith("{") and s_trimmed.endswith("}"):
            try:
                parsed = ast.literal_eval(s_trimmed)
                if isinstance(parsed, dict):
                    return parsed.get("canonical_skill") or parsed.get("skill") or parsed.get("raw_skill") or parsed.get("name") or s_trimmed
            except Exception:
                m = re.search(r"'(?:canonical_skill|raw_skill|skill|name)':\s*'([^']+)'", s_trimmed)
                if m:
                    return m.group(1)
                m2 = re.search(r'"(?:canonical_skill|raw_skill|skill|name)":\s*"([^"]+)"', s_trimmed)
                if m2:
                    return m2.group(1)
        return s
    return str(s)

def clean_candidate_name(raw_name):
    if not raw_name:
        return "Unknown Candidate"
    # Replace file extensions
    name = re.sub(r'\.[a-zA-Z0-9]+$', '', raw_name)
    # Check if it has a pattern like '_resume_XX_name' or '_resume_name'
    match = re.search(r'_resume_(?:[0-9]+_)?([a-zA-Z_]+)$', name, re.IGNORECASE)
    if match:
        name_part = match.group(1)
        # Convert 'sara_williams' to 'Sara Williams'
        return " ".join([word.capitalize() for word in name_part.split("_") if word])
    # Fallback to general cleaning: strip UUIDs or hash-like parts
    # e.g., if it starts with 36-char uuid
    if re.match(r'^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}_', name):
        name = name[37:]
    # Replace underscores and hyphens
    name = name.replace("_", " ").replace("-", " ")
    # Capitalize words
    return " ".join([word.capitalize() for word in name.split() if word])


def _serialize_candidate_summary(c):
    match_details = c.match_details or {}
    norm_skills = c.normalized_skills or []
    raw_data = c.raw_resume_data or {}
    
    # Check if raw_resume_data contains 'parsed' key
    parsed = raw_data.get("parsed", raw_data)

    experience = parsed.get("experience", [])
    education = parsed.get("education", [])
    current_role = parsed.get("current_role")
    linkedin_url = parsed.get("linkedin_url")
    github_url = parsed.get("github_url")

    matched_set = set(s.lower() for s in match_details.get("matched_skills", []))
    missing_set = set(s.lower() for s in match_details.get("missing_skills", []))
    
    other_skills = []
    for s in norm_skills:
        name = _get_skill_name(s)
        if name and name.lower() not in matched_set and name.lower() not in missing_set:
            other_skills.append(name)

    upload_root = os.getenv("UPLOAD_DIR", "uploads")
    photo_root = os.getenv("PHOTO_DIR", "photos")
    
    photo_url = None
    if c.resume_photo_path:
        try:
            rel = os.path.relpath(c.resume_photo_path, photo_root).replace("\\", "/")
            photo_url = f"/photos/{rel}"
        except:
            photo_url = None
        
    resume_url = None
    if c.resume_file_path:
        try:
            rel = os.path.relpath(c.resume_file_path, upload_root).replace("\\", "/")
            resume_url = f"/uploads/{rel}"
        except:
            resume_url = None

    return {
        "id": str(c.id),
        "name": clean_candidate_name(c.name),
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
        "normalized_skills": [_get_skill_name(s) for s in norm_skills] if norm_skills else [],
        "current_round_index": c.current_round_index,
        "round_index": c.current_round_index,
        "raw_resume_data": parsed,
        "status": c.status,
        "source": c.source,
        "created_at": c.created_at.isoformat() if c.created_at else None
    }

@csrf_exempt
@require_api_key
def list_candidates(request, session_id):
    if request.method != "GET":
        return JsonResponse(error_response("Method not allowed"), status=405)
        
    # Verify session ownership to prevent IDOR
    if not Session.objects.filter(id=session_id, company_id=request.company.id).exists():
        return JsonResponse(error_response("Session not found or access denied"), status=403)
        
    try:
        round_index_val = request.GET.get("round_index")
        round_index = int(round_index_val) if round_index_val is not None else None
        
        status = request.GET.get("status")
        
        min_score_val = request.GET.get("min_score")
        min_score = float(min_score_val) if min_score_val is not None else None
        
        max_score_val = request.GET.get("max_score")
        max_score = float(max_score_val) if max_score_val is not None else None
        
        location = request.GET.get("location")
        search = request.GET.get("search")
        
        sort_by = request.GET.get("sort_by", "match_score")
        sort_order = request.GET.get("sort_order", "desc")
        
        page = int(request.GET.get("page", 1))
        per_page = int(request.GET.get("per_page", 50))

        query = Candidate.objects.filter(session_id=session_id, deleted_at__isnull=True)

        if round_index is not None:
            if round_index <= 1:
                query = query.filter(current_round_index__in=[0, round_index])
            else:
                query = query.filter(current_round_index=round_index)
        
        if status:
            status_list = [s.strip() for s in status.split(",") if s.strip()]
            if len(status_list) == 1:
                query = query.filter(status=status_list[0])
            else:
                query = query.filter(status__in=status_list)
                
        if min_score is not None:
            query = query.filter(match_score__gte=min_score)
        if max_score is not None:
            query = query.filter(match_score__lte=max_score)
        if location:
            query = query.filter(location__icontains=location)
        if search:
            query = query.filter(Q(name__icontains=search) | Q(email__icontains=search))

        # Check sorting field
        if not hasattr(Candidate, sort_by):
            sort_by = "match_score"
            
        if sort_order == "asc":
            query = query.order_by(F(sort_by).asc(nulls_last=True))
        else:
            query = query.order_by(F(sort_by).desc(nulls_last=True))

        total = query.count()
        
        # Pagination
        offset = (page - 1) * per_page
        candidates = query[offset:offset+per_page]

        total_hired = Candidate.objects.filter(session_id=session_id, status="hired").count()
        total_rejected = Candidate.objects.filter(session_id=session_id, status="rejected").count()

        return JsonResponse(success_response({
            "candidates": [_serialize_candidate_summary(c) for c in candidates],
            "total": total,
            "total_hired": total_hired,
            "total_rejected": total_rejected,
            "page": page,
            "per_page": per_page,
            "pages": (total + per_page - 1) // per_page if per_page > 0 else 0
        }))
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)

@csrf_exempt
@require_api_key
def get_candidate(request, session_id, cand_id):
    """Handles GET (retrieve) and DELETE (delete) for a single candidate."""
    # Verify session ownership to prevent IDOR
    if not Session.objects.filter(id=session_id, company_id=request.company.id).exists():
        return JsonResponse(error_response("Session not found or access denied"), status=403)
        
    try:
        candidate = Candidate.objects.filter(id=cand_id, session_id=session_id, deleted_at__isnull=True).first()
        if not candidate:
            return JsonResponse(error_response("Candidate not found"), status=404)

        if request.method == "DELETE":
            candidate.deleted_at = timezone.now()
            candidate.save(update_fields=['deleted_at'])
            return JsonResponse(success_response({"message": "Candidate moved to trash"}))

        if request.method == "GET":
            parsed = candidate.raw_resume_data or {}
            inner_parsed = parsed.get("parsed", parsed)
            
            upload_root = os.getenv("UPLOAD_DIR", "uploads")
            photo_root = os.getenv("PHOTO_DIR", "photos")
            
            photo_url = None
            if candidate.resume_photo_path:
                try:
                    if candidate.resume_photo_path.startswith("http") or candidate.resume_photo_path.startswith("/photos/"):
                        photo_url = candidate.resume_photo_path
                    else:
                        rel = os.path.relpath(candidate.resume_photo_path, photo_root).replace("\\", "/")
                        photo_url = f"/photos/{rel}"
                except:
                    photo_url = None
                    
            resume_url = None
            if candidate.resume_file_path:
                try:
                    if candidate.resume_file_path.startswith("http") or candidate.resume_file_path.startswith("/uploads/"):
                        resume_url = candidate.resume_file_path
                    else:
                        rel = os.path.relpath(candidate.resume_file_path, upload_root).replace("\\", "/")
                        resume_url = f"/uploads/{rel}"
                except:
                    resume_url = None

            return JsonResponse(success_response({
                "id": str(candidate.id),
                "name": candidate.name,
                "email": candidate.email,
                "phone": candidate.phone,
                "location": candidate.location,
                "photo_url": photo_url,
                "resume_url": resume_url,
                "match_score": candidate.match_score,
                "match_details": candidate.match_details,
                "recommendation": candidate.recommendation,
                "total_experience_years": candidate.total_experience_years,
                "normalized_skills": candidate.normalized_skills,
                "raw_resume_data": inner_parsed,
                "resume_file_path": candidate.resume_file_path,
                "current_round_index": candidate.current_round_index,
                "status": candidate.status,
                "source": candidate.source,
                "created_at": candidate.created_at.isoformat() if candidate.created_at else None
            }))

        return JsonResponse(error_response("Method not allowed"), status=405)
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)

@csrf_exempt
@require_api_key
def candidate_action(request, session_id, cand_id):
    if request.method != "PATCH":
        return JsonResponse(error_response("Method not allowed"), status=405)
        
    # Verify session ownership to prevent IDOR
    if not Session.objects.filter(id=session_id, company_id=request.company.id).exists():
        return JsonResponse(error_response("Session not found or access denied"), status=403)
        
    try:
        session = Session.objects.filter(id=session_id, company_id=request.company.id).first()
        if not session:
            return JsonResponse(error_response("Session not found"), status=404)

        candidate = Candidate.objects.filter(id=cand_id, session_id=session_id).first()
        if not candidate:
            return JsonResponse(error_response("Candidate not found"), status=404)

        is_multipart = request.content_type.startswith('multipart/form-data') if hasattr(request, 'content_type') else request.META.get('CONTENT_TYPE', '').startswith('multipart/form-data')
        if is_multipart:
            if request.method == "PATCH":
                request.method = "POST"
                request._load_post_and_files()
                request.method = "PATCH"
            action = request.POST.get("action")
        else:
            data = json.loads(request.body)
            action = data.get("action")

        if not action:
            return JsonResponse(error_response("action is required"), status=400)

        rounds = session.rounds or []
        max_round = max([r.get("order", 1) for r in rounds]) if rounds else 1

        prior_round_order = candidate.current_round_index

        offer_letter_path = None
        if action == "forward":
            if candidate.current_round_index >= max_round:
                return JsonResponse(error_response("Already at last round"), status=400)
            candidate.current_round_index += 1
            candidate.status = "forwarded"

            # Pre-generate next round attempt proactively so they receive their test_link immediately
            from api.models import SessionRound, ApplicantRoundAttempt
            from django.utils import timezone
            from datetime import timedelta
            import secrets
            
            next_sr = SessionRound.objects.filter(session=session, round_number=candidate.current_round_index).first()
            if next_sr:
                token = secrets.token_urlsafe(32)
                ApplicantRoundAttempt.objects.get_or_create(
                    candidate=candidate,
                    round=next_sr,
                    defaults={
                        "access_token": token,
                        "token_expires_at": timezone.now() + timedelta(days=7),
                        "status": "pending"
                    }
                )

        elif action == "reject":
            candidate.status = "rejected"

        elif action == "hire":
            if rounds and candidate.current_round_index < max_round:
                return JsonResponse(error_response("Can only hire from last round"), status=400)
            candidate.status = "hired"
            
            # Save uploaded offer letter if present
            offer_file = request.FILES.get("offer_letter") or request.FILES.get("file")
            if offer_file:
                if offer_file.size > 10 * 1024 * 1024:
                    return JsonResponse(error_response("Offer letter file size must be under 10MB"), status=400)
                allowed_ext = (".pdf", ".docx", ".doc", ".txt", ".png", ".jpg", ".jpeg")
                if not offer_file.name.lower().endswith(allowed_ext):
                    return JsonResponse(error_response("Only PDF, DOCX, DOC, TXT, PNG, JPG, or JPEG offer letters are accepted"), status=400)
                
                upload_root = os.getenv("UPLOAD_DIR", "uploads")
                offer_dir = os.path.join(upload_root, "offer_letters")
                os.makedirs(offer_dir, exist_ok=True)
                
                fname = f"{uuid.uuid4()}_{offer_file.name}"
                offer_letter_path = os.path.join(offer_dir, fname)
                with open(offer_letter_path, "wb+") as f:
                    for chunk in offer_file.chunks():
                        f.write(chunk)

        else:
            return JsonResponse(error_response("Invalid action. Use: forward, reject, hire"), status=400)

        candidate.save(update_fields=['current_round_index', 'status'])

        if action == "hire":
            session = candidate.session
            session.status = "completed"
            session.save(update_fields=['status'])


        # ── Notify job seeker if this candidate came from platform apply ──────
        try:
            app = JobApplication.objects.filter(candidate=candidate).select_related('seeker').first()
            if app and app.seeker:
                seeker = app.seeker
                
                # Save offer letter path if uploaded
                if offer_letter_path:
                    app.offer_letter_path = offer_letter_path
                    app.save(update_fields=['offer_letter_path'])
                
                status_map = {
                    'hire': 'hired',
                    'reject': 'rejected',
                    'forward': 'shortlisted',
                }
                notify_status = status_map.get(action)
                if notify_status:
                    # Determine if result declaration date is in the future
                    from django.utils.dateparse import parse_datetime
                    from django.utils.timezone import is_aware, make_aware
                    
                    announcement_time = None
                    # Find completed round (order == prior_round_order)
                    for r in rounds:
                        try:
                            if int(r.get("order")) == int(prior_round_order):
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

                    if announcement_time and announcement_time > timezone.now():
                        # Schedule delayed release via Celery
                        try:
                            from workers.celery_worker import release_round_results
                            release_round_results.apply_async(
                                args=[str(app.id), notify_status],
                                eta=announcement_time
                            )
                        except Exception as cel_err:
                            logger.warning('Celery scheduling failed: %s', cel_err)
                    else:
                        # Release immediately
                        app.status = notify_status
                        app.save(update_fields=['status'])

                        # Compute rich details for notification and email
                        company_name = session.company.name if session.company else "Between Partner"
                        match_val = _calculate_match_score(seeker, session)
                        match_score_str = f"{match_val}%" if match_val else "N/A"

                        current_sr = SessionRound.objects.filter(session=session, round_number=candidate.current_round_index).first()
                        current_round_name = current_sr.name if current_sr else None

                        test_link = None
                        active_attempt = ApplicantRoundAttempt.objects.filter(
                            candidate=candidate,
                            round__round_number=candidate.current_round_index
                        ).first()
                        if active_attempt and active_attempt.access_token:
                            test_link = f"/test/entry?token={active_attempt.access_token}"

                        notif_link = test_link if test_link else f"/jobs/applications?app_id={app.id}"

                        round_note = f" ({current_round_name})" if current_round_name else ""
                        notif_msg = f"Your application for {session.job_title} at {company_name} [{match_score_str} Match] has been updated to {notify_status.title()}{round_note}. Click to view details and proceed."

                        # Create rich in-app notification
                        Notification.objects.create(
                            seeker=seeker,
                            type='status_updated',
                            title=f'{notify_status.title()}: {session.job_title} at {company_name}',
                            message=notif_msg,
                            link=notif_link,
                        )

                        # Send rich email with full details
                        send_status_update_to_seeker(
                            seeker_email=seeker.email,
                            seeker_name=seeker.full_name,
                            job_title=session.job_title,
                            company_name=company_name,
                            new_status=notify_status,
                            match_score=match_val,
                            current_round_name=current_round_name,
                            location=(session.criteria.get("location") if (isinstance(session.criteria, dict) and session.criteria.get("location")) else None),
                            test_link=test_link,
                        )
        except Exception as notify_err:
            logger.warning('Notification error for candidate action: %s', notify_err)
        # ─────────────────────────────────────────────────────────────────────

        return JsonResponse(success_response({
            "id": str(candidate.id),
            "name": candidate.name,
            "status": candidate.status,
            "current_round_index": candidate.current_round_index
        }))
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)

# delete_candidate is now handled inside get_candidate (DELETE method dispatch)

@csrf_exempt
@require_api_key
def bulk_reject(request, session_id):
    if request.method != "DELETE":
        return JsonResponse(error_response("Method not allowed"), status=405)
        
    # Verify session ownership to prevent IDOR
    if not Session.objects.filter(id=session_id, company_id=request.company.id).exists():
        return JsonResponse(error_response("Session not found or access denied"), status=403)
        
    try:
        data = json.loads(request.body)
        candidate_ids = data.get("candidate_ids", [])
        if not candidate_ids:
            return JsonResponse(error_response("candidate_ids list is required"), status=400)

        # Bulk reject candidates
        updated = Candidate.objects.filter(
            id__in=candidate_ids, 
            session_id=session_id
        ).update(status="rejected")

        return JsonResponse(success_response({"rejected_count": updated}))
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)

@csrf_exempt
@require_api_key
def list_candidates_no_session(request):
    if request.method != "GET":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        session_ids = Session.objects.filter(company_id=request.company.id).values_list('id', flat=True)
        round_index_val = request.GET.get("round_index")
        round_index = int(round_index_val) if round_index_val is not None else None
        status = request.GET.get("status")
        min_score_val = request.GET.get("min_score")
        min_score = float(min_score_val) if min_score_val is not None else None
        max_score_val = request.GET.get("max_score")
        max_score = float(max_score_val) if max_score_val is not None else None
        location = request.GET.get("location")
        search = request.GET.get("search")
        sort_by = request.GET.get("sort_by", "match_score")
        sort_order = request.GET.get("sort_order", "desc")
        page = int(request.GET.get("page", 1))
        per_page = int(request.GET.get("per_page", 50))

        query = Candidate.objects.filter(session_id__in=session_ids, deleted_at__isnull=True)

        if round_index is not None:
            if round_index <= 1:
                query = query.filter(current_round_index__in=[0, round_index])
            else:
                query = query.filter(current_round_index=round_index)
        
        if status:
            status_list = [s.strip() for s in status.split(",") if s.strip()]
            if len(status_list) == 1:
                query = query.filter(status=status_list[0])
            else:
                query = query.filter(status__in=status_list)
                
        if min_score is not None:
            query = query.filter(match_score__gte=min_score)
        if max_score is not None:
            query = query.filter(match_score__lte=max_score)
        if location:
            query = query.filter(location__icontains=location)
        if search:
            query = query.filter(Q(name__icontains=search) | Q(email__icontains=search))

        if not hasattr(Candidate, sort_by):
            sort_by = "match_score"
            
        if sort_order == "asc":
            query = query.order_by(F(sort_by).asc(nulls_last=True))
        else:
            query = query.order_by(F(sort_by).desc(nulls_last=True))

        total = query.count()
        offset = (page - 1) * per_page
        candidates = query[offset:offset+per_page]

        total_hired = Candidate.objects.filter(session_id__in=session_ids, status="hired").count()
        total_rejected = Candidate.objects.filter(session_id__in=session_ids, status="rejected").count()

        # Fallback to mock candidate if none exists in developer account, ensuring working try it buttons
        if not candidates:
            return JsonResponse(success_response({
                "candidates": [{
                    "id": "cnd_mock_12345",
                    "name": "Jane Doe",
                    "email": "jane.doe@example.com",
                    "phone": "+1-555-0199",
                    "location": "San Francisco, CA",
                    "photo_url": None,
                    "resume_url": None,
                    "match_score": 92.4,
                    "skill_score": 95,
                    "experience_score": 90,
                    "location_score": 90,
                    "matched_skills": ["Python", "Django", "React"],
                    "missing_skills": [],
                    "other_skills": ["SQL", "Docker"],
                    "recommendation": "Strong Match",
                    "total_experience_years": 4.5,
                    "experience_years": 4.5,
                    "current_role": "Software Engineer",
                    "linkedin_url": "linkedin.com/in/janedoe",
                    "github_url": "github.com/janedoe",
                    "experience": [],
                    "education": [],
                    "normalized_skills": ["Python", "Django", "React"],
                    "current_round_index": 1,
                    "round_index": 1,
                    "raw_resume_data": {},
                    "status": "new",
                    "source": "api_upload",
                    "created_at": timezone.now().isoformat()
                }],
                "total": 1,
                "total_hired": 0,
                "total_rejected": 0,
                "page": 1,
                "per_page": 50,
                "pages": 1
            }))

        return JsonResponse(success_response({
            "candidates": [_serialize_candidate_summary(c) for c in candidates],
            "total": total,
            "total_hired": total_hired,
            "total_rejected": total_rejected,
            "page": page,
            "per_page": per_page,
            "pages": (total + per_page - 1) // per_page if per_page > 0 else 0
        }))
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)

@csrf_exempt
@require_api_key
def get_candidate_no_session(request, cand_id):
    try:
        session_ids = Session.objects.filter(company_id=request.company.id).values_list('id', flat=True)
        
        # If candidate ID is a mock one, return the mock details directly
        if cand_id == "cnd_mock_12345":
            return JsonResponse(success_response({
                "id": "cnd_mock_12345",
                "name": "Jane Doe",
                "email": "jane.doe@example.com",
                "phone": "+1-555-0199",
                "location": "San Francisco, CA",
                "photo_url": None,
                "match_score": 92.4,
                "match_details": {"skill_score": 95, "experience_score": 90, "location_score": 90, "matched_skills": ["Python", "Django", "React"], "missing_skills": [], "recommendation": "Strong Match"},
                "recommendation": "Strong Match",
                "total_experience_years": 4.5,
                "normalized_skills": ["Python", "Django", "React"],
                "raw_resume_data": {},
                "resume_file_path": None,
                "current_round_index": 1,
                "status": "new",
                "source": "api_upload",
                "created_at": timezone.now().isoformat()
            }))

        candidate = Candidate.objects.filter(id=cand_id, session_id__in=session_ids, deleted_at__isnull=True).first()
        if not candidate:
            return JsonResponse(error_response("Candidate not found"), status=404)

        if request.method == "DELETE":
            candidate.deleted_at = timezone.now()
            candidate.save(update_fields=['deleted_at'])
            return JsonResponse(success_response({"message": "Candidate moved to trash"}))

        if request.method == "GET":
            parsed = candidate.raw_resume_data or {}
            inner_parsed = parsed.get("parsed", parsed)
            
            upload_root = os.getenv("UPLOAD_DIR", "uploads")
            photo_root = os.getenv("PHOTO_DIR", "photos")
            
            photo_url = None
            if candidate.resume_photo_path:
                try:
                    if candidate.resume_photo_path.startswith("http") or candidate.resume_photo_path.startswith("/photos/"):
                        photo_url = candidate.resume_photo_path
                    else:
                        rel = os.path.relpath(candidate.resume_photo_path, photo_root).replace("\\", "/")
                        photo_url = f"/photos/{rel}"
                except:
                    photo_url = None
                    
            resume_url = None
            if candidate.resume_file_path:
                try:
                    if candidate.resume_file_path.startswith("http") or candidate.resume_file_path.startswith("/uploads/"):
                        resume_url = candidate.resume_file_path
                    else:
                        rel = os.path.relpath(candidate.resume_file_path, upload_root).replace("\\", "/")
                        resume_url = f"/uploads/{rel}"
                except:
                    resume_url = None

            return JsonResponse(success_response({
                "id": str(candidate.id),
                "name": candidate.name,
                "email": candidate.email,
                "phone": candidate.phone,
                "location": candidate.location,
                "photo_url": photo_url,
                "resume_url": resume_url,
                "match_score": candidate.match_score,
                "match_details": candidate.match_details,
                "recommendation": candidate.recommendation,
                "total_experience_years": candidate.total_experience_years,
                "normalized_skills": candidate.normalized_skills,
                "raw_resume_data": inner_parsed,
                "resume_file_path": candidate.resume_file_path,
                "current_round_index": candidate.current_round_index,
                "status": candidate.status,
                "source": candidate.source,
                "created_at": candidate.created_at.isoformat() if candidate.created_at else None
            }))

        return JsonResponse(error_response("Method not allowed"), status=405)
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)

@csrf_exempt
@require_api_key
def candidate_clusters(request, session_id):
    """
    GET /api/v1/sessions/<session_id>/candidate-clusters
    Clusters session candidates based on their skills, experience descriptions, and summaries.
    Uses TF-IDF Vectorizer and KMeans clustering from scikit-learn.
    """
    if request.method != "GET":
        return JsonResponse(error_response("Method not allowed"), status=405)

    # Verify session ownership to prevent IDOR
    if not Session.objects.filter(id=session_id, company_id=request.company.id).exists():
        return JsonResponse(error_response("Session not found or access denied"), status=403)

    try:
        # Verify session exists
        session = Session.objects.filter(id=session_id, company_id=request.company.id).first()
        if not session:
            return JsonResponse(error_response("Session not found"), status=404)

        # Get all non-deleted candidates for this session
        candidates = Candidate.objects.filter(session_id=session_id, deleted_at__isnull=True)
        cand_count = candidates.count()

        if cand_count < 3:
            return JsonResponse(success_response({
                "message": "At least 3 candidates are required to perform clustering analysis.",
                "clusters": []
            }))

        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.cluster import KMeans

        text_list = []
        candidates_info = []

        for c in candidates:
            # 1. Normalize/collect skills
            skills_list = []
            for s in (c.normalized_skills or []):
                if isinstance(s, dict):
                    skills_list.append(s.get("canonical_skill") or s.get("skill") or s.get("raw_skill") or "")
                else:
                    skills_list.append(str(s))
            skills_str = " ".join([sk for sk in skills_list if sk])

            # 2. Extract professional summary
            parsed = c.raw_resume_data or {}
            inner_parsed = parsed.get("parsed", parsed)
            summary = inner_parsed.get("professional_summary") or inner_parsed.get("summary") or ""

            # 3. Extract experience descriptions and roles
            experience_roles = []
            for exp in inner_parsed.get("experience", []):
                role = exp.get("role") or exp.get("title") or ""
                desc = exp.get("description") or ""
                experience_roles.append(f"{role} {desc}")
            exp_str = " ".join(experience_roles)

            # Combine everything into a text profile
            profile_text = f"{skills_str} {summary} {exp_str}".strip()
            
            # If candidate profile text is empty, fallback to candidate name and default skills
            if not profile_text:
                profile_text = f"candidate {c.name or ''}"

            text_list.append(profile_text)
            
            # Collect short info for response serialization
            candidates_info.append({
                "id": str(c.id),
                "name": clean_candidate_name(c.name),
                "email": c.email,
                "match_score": c.match_score,
                "recommendation": c.recommendation,
                "skills": [s for s in skills_list if s][:5],
                "total_experience_years": c.total_experience_years
            })

        # Apply TF-IDF Vectorizer
        vectorizer = TfidfVectorizer(stop_words='english', min_df=1)
        tfidf_matrix = vectorizer.fit_transform(text_list)

        # Number of clusters (dynamically set to 3, capped by candidate count)
        n_clusters = min(3, cand_count)
        
        # Fit KMeans clustering
        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init='auto')
        kmeans.fit(tfidf_matrix)

        # Get feature words and centroids to name each cluster
        order_centroids = kmeans.cluster_centers_.argsort()[:, ::-1]
        terms = vectorizer.get_feature_names_out()
        
        cluster_names = {}
        for i in range(n_clusters):
            # Extract top 3-4 feature words
            top_words = []
            for ind in order_centroids[i]:
                word = terms[ind]
                # Filter out numbers and common names/unwanted terms
                if not word.isdigit() and len(word) > 2:
                    top_words.append(word)
                if len(top_words) >= 3:
                    break
            cluster_names[i] = ", ".join(top_words).title() if top_words else f"Segment {i+1}"

        # Group candidates by predicted labels
        clusters_data = []
        for cluster_idx in range(n_clusters):
            cands_in_cluster = [
                candidates_info[idx] 
                for idx, label in enumerate(kmeans.labels_) 
                if label == cluster_idx
            ]
            clusters_data.append({
                "cluster_id": cluster_idx,
                "cluster_name": cluster_names[cluster_idx],
                "candidates": cands_in_cluster,
                "count": len(cands_in_cluster)
            })

        return JsonResponse(success_response({
            "message": "Clustering analysis completed successfully.",
            "clusters": clusters_data
        }))

    except Exception as e:
        logger.error(f"Error in candidate clustering: {str(e)}", exc_info=True)
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)

