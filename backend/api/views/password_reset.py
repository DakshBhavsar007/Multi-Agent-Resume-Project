"""
Forgot Password / Reset Password — Shared logic for all portals
(Recruiter, Seeker, Developer)
"""
import os
import json
import secrets
import logging
from datetime import datetime, timedelta, timezone
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from passlib.context import CryptContext
from jose import jwt

from api.models import Company, JobSeekerAccount
from api.decorators import JWT_SECRET, JWT_ALGORITHM, rate_limit_ip
from api.services.email_service import send_email
from models.schemas import success_response, error_response

logger = logging.getLogger(__name__)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

RESET_TOKEN_EXPIRE_MINUTES = 30


def _make_reset_token(user_id, user_type):
    """Create a short-lived JWT for password reset."""
    payload = {
        "reset_id": str(user_id),
        "type": user_type,  # "recruiter", "seeker", "developer"
        "exp": datetime.utcnow() + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES),
        "purpose": "password_reset",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _verify_reset_token(token, expected_type):
    """Verify and decode a reset token. Returns user_id or None."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("purpose") != "password_reset":
            return None
        if payload.get("type") != expected_type:
            return None
        return payload.get("reset_id")
    except Exception:
        return None


@csrf_exempt
@rate_limit_ip(3, 3600, "password_reset")
def forgot_password_recruiter(request):
    """POST /api/v1/auth/forgot-password — Recruiter portal"""
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        data = json.loads(request.body)
        email = data.get("email", "").strip().lower()
        if not email:
            return JsonResponse(error_response("Email is required"), status=400)

        company = Company.objects.filter(email=email).first()
        if company:
            token = _make_reset_token(company.id, "recruiter")
            frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
            reset_link = f"{frontend_url}/reset-password?token={token}&type=recruiter"

            try:
                send_email(
                    to_email=email,
                    subject="Reset Your Password — Between",
                    html_body=f"""
                    <h2>Password Reset Request</h2>
                    <p>Hi {company.name},</p>
                    <p>Click the link below to reset your password. This link expires in {RESET_TOKEN_EXPIRE_MINUTES} minutes.</p>
                    <p><a href="{reset_link}" style="background:#2563eb;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;display:inline-block;">Reset Password</a></p>
                    <p>If you didn't request this, you can safely ignore this email.</p>
                    """,
                )
            except Exception as email_err:
                logger.warning("Failed to send reset email: %s", email_err)

        # Always return success to prevent email enumeration
        return JsonResponse(success_response({
            "message": "If an account exists with that email, a reset link has been sent."
        }))
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)


@csrf_exempt
@rate_limit_ip(3, 3600, "password_reset")
def reset_password_recruiter(request):
    """POST /api/v1/auth/reset-password — Recruiter portal"""
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        data = json.loads(request.body)
        token = data.get("token")
        new_password = data.get("new_password")
        if not token or not new_password:
            return JsonResponse(error_response("token and new_password are required"), status=400)

        if len(new_password) < 6:
            return JsonResponse(error_response("Password must be at least 6 characters"), status=400)

        user_id = _verify_reset_token(token, "recruiter")
        if not user_id:
            return JsonResponse(error_response("Invalid or expired reset token"), status=400)

        company = Company.objects.filter(id=user_id).first()
        if not company:
            return JsonResponse(error_response("Account not found"), status=404)

        company.password_hash = pwd_context.hash(new_password[:72])
        company.save(update_fields=["password_hash"])

        return JsonResponse(success_response({"message": "Password reset successfully. You can now log in."}))
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)


@csrf_exempt
@rate_limit_ip(3, 3600, "password_reset")
def forgot_password_seeker(request):
    """POST /api/v1/seeker/auth/forgot-password"""
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        data = json.loads(request.body)
        email = data.get("email", "").strip().lower()
        if not email:
            return JsonResponse(error_response("Email is required"), status=400)

        seeker = JobSeekerAccount.objects.filter(email=email, is_active=True).first()
        if seeker:
            token = _make_reset_token(seeker.id, "seeker")
            frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
            reset_link = f"{frontend_url}/seeker/reset-password?token={token}&type=seeker"

            try:
                send_email(
                    to_email=email,
                    subject="Reset Your Password — Between",
                    html_body=f"""
                    <h2>Password Reset Request</h2>
                    <p>Hi {seeker.full_name},</p>
                    <p>Click below to reset your password. This link expires in {RESET_TOKEN_EXPIRE_MINUTES} minutes.</p>
                    <p><a href="{reset_link}" style="background:#2563eb;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;display:inline-block;">Reset Password</a></p>
                    <p>If you didn't request this, you can safely ignore this email.</p>
                    """,
                )
            except Exception as email_err:
                logger.warning("Failed to send seeker reset email: %s", email_err)

        return JsonResponse(success_response({
            "message": "If an account exists with that email, a reset link has been sent."
        }))
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)


@csrf_exempt
@rate_limit_ip(3, 3600, "password_reset")
def reset_password_seeker(request):
    """POST /api/v1/seeker/auth/reset-password"""
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        data = json.loads(request.body)
        token = data.get("token")
        new_password = data.get("new_password")
        if not token or not new_password:
            return JsonResponse(error_response("token and new_password are required"), status=400)

        if len(new_password) < 6:
            return JsonResponse(error_response("Password must be at least 6 characters"), status=400)

        user_id = _verify_reset_token(token, "seeker")
        if not user_id:
            return JsonResponse(error_response("Invalid or expired reset token"), status=400)

        seeker = JobSeekerAccount.objects.filter(id=user_id, is_active=True).first()
        if not seeker:
            return JsonResponse(error_response("Account not found"), status=404)

        seeker.password_hash = pwd_context.hash(new_password[:72])
        seeker.save(update_fields=["password_hash"])

        return JsonResponse(success_response({"message": "Password reset successfully. You can now log in."}))
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)


@csrf_exempt
@rate_limit_ip(3, 3600, "password_reset")
def forgot_password_developer(request):
    """POST /api/developer/auth/forgot-password"""
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        data = json.loads(request.body)
        email = data.get("email", "").strip().lower()
        if not email:
            return JsonResponse(error_response("Email is required"), status=400)

        company = Company.objects.filter(email=email).first()
        if company:
            token = _make_reset_token(company.id, "developer")
            frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
            reset_link = f"{frontend_url}/developer/reset-password?token={token}&type=developer"

            try:
                send_email(
                    to_email=email,
                    subject="Reset Your Password — Between Developer Portal",
                    html_body=f"""
                    <h2>Password Reset Request</h2>
                    <p>Hi {company.name},</p>
                    <p>Click below to reset your developer portal password. This link expires in {RESET_TOKEN_EXPIRE_MINUTES} minutes.</p>
                    <p><a href="{reset_link}" style="background:#2563eb;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;display:inline-block;">Reset Password</a></p>
                    <p>If you didn't request this, you can safely ignore this email.</p>
                    """,
                )
            except Exception as email_err:
                logger.warning("Failed to send developer reset email: %s", email_err)

        return JsonResponse(success_response({
            "message": "If an account exists with that email, a reset link has been sent."
        }))
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)


@csrf_exempt
@rate_limit_ip(3, 3600, "password_reset")
def reset_password_developer(request):
    """POST /api/developer/auth/reset-password"""
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        data = json.loads(request.body)
        token = data.get("token")
        new_password = data.get("new_password")
        if not token or not new_password:
            return JsonResponse(error_response("token and new_password are required"), status=400)

        if len(new_password) < 6:
            return JsonResponse(error_response("Password must be at least 6 characters"), status=400)

        user_id = _verify_reset_token(token, "developer")
        if not user_id:
            return JsonResponse(error_response("Invalid or expired reset token"), status=400)

        company = Company.objects.filter(id=user_id).first()
        if not company:
            return JsonResponse(error_response("Account not found"), status=404)

        company.password_hash = pwd_context.hash(new_password[:72])
        company.save(update_fields=["password_hash"])

        return JsonResponse(success_response({"message": "Password reset successfully. You can now log in."}))
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)
