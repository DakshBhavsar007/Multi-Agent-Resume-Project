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
    return {
        "id": str(seeker.id),
        "full_name": seeker.full_name,
        "email": seeker.email,
        "phone": seeker.phone,
        "location": seeker.location,
        "headline": seeker.headline,
        "tier": seeker.tier,
        "has_resume": bool(seeker.resume_file_path or seeker.resume_data),
        "skills": seeker.skills,
        "created_at": seeker.created_at.isoformat() if seeker.created_at else None,
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

        seeker = JobSeekerAccount.objects.create(
            full_name=full_name,
            email=email,
            password_hash=pwd_context.hash(password[:72]),
            phone=data.get("phone", "").strip() or None,
            location=data.get("location", "").strip() or None,
            headline=data.get("headline", "").strip() or None,
            tier="free",
        )

        token = _make_seeker_token(seeker)
        return JsonResponse(success_response({
            "seeker_token": token,
            "seeker": _seeker_dict(seeker),
            "message": "Account created successfully",
        }), status=201)

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
            seeker.phone = data["phone"].strip() or None
            fields_changed.append("phone")
        if "location" in data:
            seeker.location = data["location"].strip() or None
            fields_changed.append("location")
        if "headline" in data:
            seeker.headline = data["headline"].strip() or None
            fields_changed.append("headline")

        if fields_changed:
            seeker.save(update_fields=fields_changed)

        return JsonResponse(success_response(_seeker_dict(seeker)))
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {e}"), status=500)
