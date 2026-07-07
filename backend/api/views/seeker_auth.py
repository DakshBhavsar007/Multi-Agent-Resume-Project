"""
Job Seeker Auth Views
─────────────────────
Handles register / login / me / profile for JobSeekerAccount.
Uses a separate JWT claim ("seeker_id") so tokens don't conflict with recruiter tokens.
"""

import json
import logging
from datetime import datetime, timedelta
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from passlib.context import CryptContext
from jose import jwt, JWTError

from api.models import JobSeekerAccount
from api.decorators import JWT_SECRET, JWT_ALGORITHM
from models.schemas import success_response, error_response
from api.services.email_service import send_welcome_email

logger = logging.getLogger(__name__)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ACCESS_TOKEN_EXPIRE_DAYS = 7


def _make_seeker_token(seeker: JobSeekerAccount) -> str:
    payload = {
        "seeker_id": str(seeker.id),
        "email": seeker.email,
        "tier": seeker.tier,
        "exp": datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def require_seeker_jwt(view_func):
    """Decorator that injects request.seeker from the Authorization header."""
    from functools import wraps

    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        auth_header = request.META.get("HTTP_AUTHORIZATION", "")
        if not auth_header.startswith("Bearer "):
            return JsonResponse(error_response("Authentication required"), status=401)
        token = auth_header.split(" ", 1)[1]
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        except JWTError:
            return JsonResponse(error_response("Invalid or expired token"), status=401)

        seeker_id = payload.get("seeker_id")
        if not seeker_id:
            return JsonResponse(error_response("Invalid token type"), status=401)

        seeker = JobSeekerAccount.objects.filter(id=seeker_id, is_active=True).first()
        if not seeker:
            return JsonResponse(error_response("Account not found"), status=401)

        request.seeker = seeker
        return view_func(request, *args, **kwargs)

    return wrapper


def _seeker_dict(seeker: JobSeekerAccount) -> dict:
    import os
    resume_file_name = None
    resume_size = None
    if seeker.resume_file_path:
        try:
            resume_file_name = os.path.basename(seeker.resume_file_path)
            # Remove UUID prefix (36 chars + '_') if it exists
            if len(resume_file_name) > 37 and resume_file_name[36] == '_':
                resume_file_name = resume_file_name[37:]
            if os.path.exists(seeker.resume_file_path):
                resume_size = round(os.path.getsize(seeker.resume_file_path) / 1024, 1)
        except Exception:
            pass

    # Calculate profile strength
    strength = 0
    if seeker.full_name: strength += 10
    if seeker.email: strength += 10
    if seeker.phone: strength += 10
    if seeker.location: strength += 10
    if seeker.headline: strength += 10
    if seeker.resume_file_path: strength += 20
    if seeker.skills: strength += 10
    
    resume_data = seeker.resume_data or {}
    if resume_data.get("experience") or resume_data.get("work_experience"):
        strength += 10
    if resume_data.get("education"):
        strength += 10

    # Applications count
    applications_count = seeker.applications.count() if hasattr(seeker, "applications") else 0
    
    # Interviews count
    interviews_count = seeker.applications.filter(status="shortlisted").count() if hasattr(seeker, "applications") else 0

    hired_app = seeker.applications.filter(status="hired", accepted_terms=True).first() if hasattr(seeker, "applications") else None
    hired_by = hired_app.session.company.name if hired_app and hired_app.session.company else None

    return {
        "id": str(seeker.id),
        "full_name": seeker.full_name,
        "email": seeker.email,
        "avatar_path": seeker.avatar_path,
        "avatar_url": seeker.avatar_path,
        "phone": seeker.phone,
        "location": seeker.location,
        "headline": seeker.headline,
        "tier": seeker.tier,
        "email_verified": seeker.email_verified,
        "phone_verified": seeker.phone_verified,
        "has_resume": bool(seeker.resume_file_path or seeker.resume_data),
        "skills": seeker.skills or [],
        "resume_file_path": seeker.resume_file_path,
        "resume_file_name": resume_file_name,
        "resume_size": resume_size,
        "resume_updated_at": seeker.updated_at.isoformat() if seeker.updated_at else None,
        "resume_data": seeker.resume_data or {},
        "open_to": seeker.open_to or {},
        "profile_strength": strength,
        "applications_count": applications_count,
        "interviews_count": interviews_count,
        "hired_by": hired_by,
        "saved_jobs_count": 0,
        "created_at": seeker.created_at.isoformat() if seeker.created_at else None,
        "active_resume_draft_id": str(seeker.active_resume_draft.id) if seeker.active_resume_draft else None,
        "last_ats_score": seeker.last_ats_score,
    }


# ── Views ─────────────────────────────────────────────────────────────────────

@csrf_exempt
def register(request):
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        data = json.loads(request.body)
        email = (data.get("email") or "").strip().lower()
        password = data.get("password", "")
        full_name = (data.get("full_name") or data.get("name") or "").strip()

        if not email or not password or not full_name:
            return JsonResponse(error_response("full_name, email, and password are required"), status=400)

        if len(password) < 8:
            return JsonResponse(error_response("Password must be at least 8 characters"), status=400)

        if JobSeekerAccount.objects.filter(email=email).exists():
            return JsonResponse(error_response("An account with this email already exists"), status=400)

        skills = data.get("skills", [])
        if not isinstance(skills, list):
            skills = [s.strip() for s in str(skills).split(",") if s.strip()]

        seeker = JobSeekerAccount.objects.create(
            full_name=full_name,
            email=email,
            password_hash=pwd_context.hash(password[:72]),
            phone=data.get("phone", "").strip() or None,
            location=data.get("location", "").strip() or None,
            headline=data.get("headline", "").strip() or None,
            skills=skills,
            tier="free",
            phone_verified=data.get("phone_verified", False),
            email_verified=data.get("email_verified", False),
        )

        token = _make_seeker_token(seeker)
        resp = JsonResponse(success_response({
            "seeker_token": token,
            "seeker": _seeker_dict(seeker),
            "message": "Account created successfully",
        }), status=201)

        # Send welcome email + Brevo CRM sync (non-blocking)
        try:
            send_welcome_email(user_email=email, user_name=full_name, role="seeker")
        except Exception:
            logger.warning("Welcome email failed for seeker %s", email)

        return resp

    except json.JSONDecodeError:
        return JsonResponse(error_response("Invalid JSON body"), status=400)
    except Exception as e:
        logger.error("Seeker register error: %s", e)
        return JsonResponse(error_response(f"Server error: {e}"), status=500)


@csrf_exempt
def login(request):
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        data = json.loads(request.body)
        email = (data.get("email") or "").strip().lower()
        password = data.get("password", "")

        if not email or not password:
            return JsonResponse(error_response("Email and password are required"), status=400)

        seeker = JobSeekerAccount.objects.filter(email=email, is_active=True).first()
        if not seeker or not pwd_context.verify(password[:72], seeker.password_hash):
            return JsonResponse(error_response("Invalid email or password"), status=401)

        token = _make_seeker_token(seeker)
        return JsonResponse(success_response({
            "seeker_token": token,
            "seeker": _seeker_dict(seeker),
        }))

    except json.JSONDecodeError:
        return JsonResponse(error_response("Invalid JSON body"), status=400)
    except Exception as e:
        logger.error("Seeker login error: %s", e)
        return JsonResponse(error_response(f"Server error: {e}"), status=500)
    finally:
        try:
            from api.services.brevo_service import track_automation_event
            track_automation_event(email=email, event_name="seeker_login")
        except Exception:
            pass


@csrf_exempt
@require_seeker_jwt
def me(request):
    if request.method != "GET":
        return JsonResponse(error_response("Method not allowed"), status=405)
    return JsonResponse(success_response(_seeker_dict(request.seeker)))


@csrf_exempt
@require_seeker_jwt
def update_profile(request):
    if request.method not in ["POST", "PATCH", "PUT"]:
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        data = json.loads(request.body)
        seeker = request.seeker
        fields_changed = []

        if "full_name" in data and data["full_name"].strip():
            seeker.full_name = data["full_name"].strip()
            fields_changed.append("full_name")
        if "phone" in data:
            new_phone = data["phone"].strip() or None
            if seeker.phone != new_phone:
                seeker.phone = new_phone
                seeker.phone_verified = False
                fields_changed.append("phone")
                fields_changed.append("phone_verified")
        if "location" in data:
            seeker.location = data["location"].strip() or None
            fields_changed.append("location")
        if "headline" in data:
            seeker.headline = data["headline"].strip() or None
            fields_changed.append("headline")
        if "skills" in data:
            seeker.skills = data["skills"]
            fields_changed.append("skills")
        if "open_to" in data:
            seeker.open_to = data["open_to"]
            fields_changed.append("open_to")
        
        # Handle experience and education inside resume_data
        if "experience" in data or "education" in data:
            if not isinstance(seeker.resume_data, dict):
                seeker.resume_data = {}
            if "experience" in data:
                seeker.resume_data["experience"] = data["experience"]
            if "education" in data:
                seeker.resume_data["education"] = data["education"]
            fields_changed.append("resume_data")

        if fields_changed:
            seeker.save(update_fields=fields_changed)

        return JsonResponse(success_response(_seeker_dict(seeker)))
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {e}"), status=500)


@csrf_exempt
@require_seeker_jwt
def upload_avatar(request):
    """
    POST /api/v1/seeker/auth/upload-avatar
    Upload a seeker profile photo/avatar. Size limit: 5MB.
    """
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        import os
        import uuid
        file = request.FILES.get("file") or request.FILES.get("avatar")
        if not file:
            return JsonResponse(error_response("No file provided"), status=400)

        # 5MB size limit
        if file.size > 5 * 1024 * 1024:
            return JsonResponse(error_response("File size must be under 5 MB"), status=400)

        allowed_ext = (".png", ".jpg", ".jpeg", ".webp")
        ext = os.path.splitext(file.name.lower())[1]
        if ext not in allowed_ext:
            return JsonResponse(error_response("Only PNG, JPG, JPEG, or WEBP images are allowed"), status=400)

        seeker = request.seeker
        UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")
        seeker_dir = os.path.join(UPLOAD_DIR, "seekers", str(seeker.id))
        os.makedirs(seeker_dir, exist_ok=True)

        fname = f"avatar_{uuid.uuid4().hex}{ext}"
        file_path = os.path.join(seeker_dir, fname)
        with open(file_path, "wb+") as f:
            for chunk in file.chunks():
                f.write(chunk)

        avatar_url_path = f"/uploads/seekers/{seeker.id}/{fname}"
        seeker.avatar_path = avatar_url_path
        seeker.save(update_fields=["avatar_path"])

        return JsonResponse(success_response(_seeker_dict(seeker)))
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)

