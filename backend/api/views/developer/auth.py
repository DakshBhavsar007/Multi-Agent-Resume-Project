import json
import secrets
from datetime import datetime, timedelta
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from passlib.context import CryptContext
from jose import jwt

from api.models import DeveloperAccount, DeveloperAPIKey, BillingSubscription, Company
from api.decorators import require_developer_jwt, JWT_SECRET, JWT_ALGORITHM, rate_limit_ip
from models.schemas import success_response, error_response
from api.services.email_service import send_welcome_email

import logging
logger = logging.getLogger(__name__)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

@csrf_exempt
@rate_limit_ip(5, 60, "developer_register")
def register(request):
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        data = json.loads(request.body)
        company_name = data.get("company_name")
        email = data.get("email")
        password = data.get("password")
        
        if not company_name or not email or not password:
            return JsonResponse(error_response("company_name, email, and password are required"), status=400)

        if DeveloperAccount.objects.filter(email=email).exists():
            return JsonResponse(error_response("Email already registered"), status=400)

        hashed_pwd = pwd_context.hash(password[:72])
        verification_token = secrets.token_urlsafe(32)

        new_dev = DeveloperAccount.objects.create(
            company_name=company_name,
            email=email,
            password_hash=hashed_pwd,
            tier=data.get("tier", "free"),
            is_verified=True,
            verification_token=verification_token,
            website_url=data.get("website_url")
        )

        test_secret = "vish_test_" + secrets.token_urlsafe(24)
        test_public = "vish_pub_test_" + secrets.token_urlsafe(24)
        
        live_secret = "vish_live_" + secrets.token_urlsafe(24)
        live_public = "vish_pub_" + secrets.token_urlsafe(24)

        DeveloperAPIKey.objects.create(
            developer=new_dev,
            key_name="Test Key",
            secret_key=test_secret,
            public_key=test_public,
            environment="test"
        )
        DeveloperAPIKey.objects.create(
            developer=new_dev,
            key_name="Production Key",
            secret_key=live_secret,
            public_key=live_public,
            environment="production"
        )

        BillingSubscription.objects.create(
            developer=new_dev,
            plan=new_dev.tier,
            status="active"
        )

        payload = {
            "developer_id": str(new_dev.id),
            "email": new_dev.email,
            "tier": new_dev.tier,
            "exp": datetime.utcnow() + timedelta(days=7)
        }
        token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

        resp = JsonResponse(success_response({
            "jwt_token": token,
            "developer_id": str(new_dev.id),
            "email": new_dev.email,
            "tier": new_dev.tier,
            "is_verified": new_dev.is_verified,
            "phone_verified": new_dev.phone_verified,
            "company_name": new_dev.company_name,
            "test_secret_key": test_secret,
            "test_public_key": test_public,
            "secret_key": live_secret,
            "public_key": live_public,
            "message": "Check email to verify (skip for demo)"
        }))

        # Send welcome email + Brevo CRM sync (non-blocking)
        try:
            send_welcome_email(
                user_email=email,
                user_name=company_name,
                role="developer",
                custom_attributes={
                    "WEBSITE": data.get("website_url") or "N/A"
                }
            )
        except Exception:
            logger.warning("Welcome email failed for developer [REDACTED]")

        return resp
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)

@csrf_exempt
@rate_limit_ip(5, 60, "developer_login")
def login(request):
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)
    email = None
    try:
        data = json.loads(request.body)
        email = data.get("email")
        password = data.get("password")
        if not email or not password:
            return JsonResponse(error_response("Email and password are required"), status=400)

        dev = DeveloperAccount.objects.filter(email=email).first()
        if not dev:
            return JsonResponse(error_response("Invalid credentials"), status=401)

        if not pwd_context.verify(password[:72], dev.password_hash):
            return JsonResponse(error_response("Invalid credentials"), status=401)

        comp = Company.objects.filter(email=email).first()
        if comp and getattr(comp, "is_banned", False):
            return JsonResponse(error_response("You are banned by admin. Please contact support."), status=403)

        payload = {
            "developer_id": str(dev.id),
            "email": dev.email,
            "tier": dev.tier,
            "exp": datetime.utcnow() + timedelta(days=7)
        }
        token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

        return JsonResponse(success_response({
            "jwt_token": token,
            "developer_id": str(dev.id),
            "id": str(dev.id),
            "full_name": getattr(dev, "full_name", "") or getattr(dev, "company_name", ""),
            "company_name": getattr(dev, "company_name", ""),
            "email": dev.email,
            "tier": dev.tier,
            "avatar_path": getattr(dev, "avatar_path", "") or "",
            "website_url": getattr(dev, "website_url", "") or "",
            "is_verified": getattr(dev, "is_verified", True),
            "email_verified": getattr(dev, "email_verified", True),
            "phone_verified": getattr(dev, "phone_verified", True),
        }))
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)

@csrf_exempt
@require_developer_jwt
def get_me(request):
    if request.method != "GET":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        dev = request.developer
        return JsonResponse(success_response({
            "id": str(dev.id),
            "full_name": getattr(dev, "full_name", "") or getattr(dev, "company_name", ""),
            "company_name": getattr(dev, "company_name", ""),
            "email": getattr(dev, "email", ""),
            "avatar_path": getattr(dev, "avatar_path", "") or "",
            "tier": getattr(dev, "tier", "free"),
            "is_verified": getattr(dev, "is_verified", False),
            "phone_verified": getattr(dev, "phone_verified", False),
            "website_url": getattr(dev, "website_url", "") or "",
            "allowed_domains": getattr(dev, "allowed_domains", []) or [],
            "created_at": dev.created_at.isoformat() if getattr(dev, "created_at", None) else None
        }))
    except Exception as e:
        logger.error(f"Error in developer get_me: {e}", exc_info=True)
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)

@csrf_exempt
@require_developer_jwt
def patch_me(request):
    if request.method != "PATCH":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        data = json.loads(request.body)
        dev = request.developer
        
        if "full_name" in data and data["full_name"] is not None:
            dev.full_name = data["full_name"]
        if "company_name" in data and data["company_name"] is not None:
            dev.company_name = data["company_name"]
        if "website_url" in data and data["website_url"] is not None:
            dev.website_url = data["website_url"]
        if "allowed_domains" in data and data["allowed_domains"] is not None:
            dev.allowed_domains = data["allowed_domains"]
        if "avatar_path" in data and data["avatar_path"] is not None:
            dev.avatar_path = data["avatar_path"]

        dev.save()

        return JsonResponse(success_response({
            "message": "Profile updated",
            "full_name": getattr(dev, "full_name", "") or dev.company_name,
            "company_name": dev.company_name,
            "avatar_path": getattr(dev, "avatar_path", "") or "",
            "website_url": dev.website_url,
            "allowed_domains": dev.allowed_domains
        }))
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)


@csrf_exempt
@require_developer_jwt
def delete_account(request):
    if request.method != "DELETE":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        dev = request.developer
        dev.delete()
        return JsonResponse(success_response({"message": "Developer account deleted successfully"}))
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)


@csrf_exempt
@require_developer_jwt
def upload_avatar(request):
    """
    POST /api/developer/auth/upload-avatar or /api/v1/developer/auth/upload-avatar
    Upload a developer profile photo/avatar. Size limit: 5MB.
    """
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        import os
        import uuid
        import base64
        dev = request.developer
        file = request.FILES.get("file") or request.FILES.get("avatar")
        if not file:
            return JsonResponse(error_response("No file provided"), status=400)

        if file.size > 5 * 1024 * 1024:
            return JsonResponse(error_response("File size must be under 5 MB"), status=400)

        allowed_ext = (".png", ".jpg", ".jpeg", ".webp")
        ext = os.path.splitext(file.name.lower())[1]
        if ext not in allowed_ext:
            return JsonResponse(error_response("Only PNG, JPG, JPEG, or WEBP images are allowed"), status=400)

        file_content = file.read()
        mime_type = "image/png" if ext == ".png" else "image/webp" if ext == ".webp" else "image/jpeg"
        base64_encoded = base64.b64encode(file_content).decode("utf-8")
        avatar_url_path = f"data:{mime_type};base64,{base64_encoded}"

        try:
            UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")
            dev_dir = os.path.join(UPLOAD_DIR, "developers", str(dev.id))
            os.makedirs(dev_dir, exist_ok=True)
            fname = f"avatar_{uuid.uuid4().hex}{ext}"
            file_path = os.path.join(dev_dir, fname)
            with open(file_path, "wb+") as f:
                f.write(file_content)
        except Exception:
            pass

        dev.avatar_path = avatar_url_path
        dev.save()

        return JsonResponse(success_response({
            "message": "Avatar uploaded successfully",
            "avatar_path": dev.avatar_path
        }))
    except Exception as e:
        logger.error(f"Error uploading developer avatar: {e}", exc_info=True)
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)

