import json
import secrets
from datetime import datetime, timedelta
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from passlib.context import CryptContext
from jose import jwt

from api.models import DeveloperAccount, DeveloperAPIKey, BillingSubscription
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
            "email": dev.email,
            "tier": dev.tier,
            "is_verified": dev.is_verified,
            "phone_verified": dev.phone_verified,
            "company_name": dev.company_name
        }))
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)
    finally:
        try:
            from api.services.brevo_service import track_automation_event
            track_automation_event(email=email, event_name="developer_login")
        except Exception:
            pass

@csrf_exempt
@require_developer_jwt
def get_me(request):
    if request.method != "GET":
        return JsonResponse(error_response("Method not allowed"), status=405)
    dev = request.developer
    return JsonResponse(success_response({
        "id": str(dev.id),
        "company_name": dev.company_name,
        "email": dev.email,
        "tier": dev.tier,
        "is_verified": dev.is_verified,
        "phone_verified": dev.phone_verified,
        "website_url": dev.website_url,
        "allowed_domains": dev.allowed_domains,
        "created_at": dev.created_at.isoformat() if dev.created_at else None
    }))

@csrf_exempt
@require_developer_jwt
def patch_me(request):
    if request.method != "PATCH":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        data = json.loads(request.body)
        dev = request.developer
        
        if "company_name" in data and data["company_name"] is not None:
            dev.company_name = data["company_name"]
        if "website_url" in data and data["website_url"] is not None:
            dev.website_url = data["website_url"]
        if "allowed_domains" in data and data["allowed_domains"] is not None:
            dev.allowed_domains = data["allowed_domains"]

        dev.save()

        return JsonResponse(success_response({
            "message": "Profile updated",
            "company_name": dev.company_name,
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
