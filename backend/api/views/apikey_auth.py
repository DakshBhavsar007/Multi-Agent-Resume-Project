"""
API Key → JWT Dashboard Login views
POST /auth/generate-key     → create a new API key for a user
POST /auth/token-from-key   → exchange raw API key for short-lived JWT + redirect URL
POST /auth/verify           → verify a short-lived JWT
"""
import os
import json
from datetime import datetime, timezone
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from api.models import Company, APIKey
from auth.utils import (
    generate_api_key,
    verify_api_key as verify_api_key_bcrypt,
    create_short_jwt,
    decode_jwt,
)
from jose import JWTError
from models.schemas import success_response, error_response

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

@csrf_exempt
def generate_key_endpoint(request):
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        data = json.loads(request.body)
        user_id = data.get("user_id")
        label = data.get("label", "Default Key")
        if not user_id:
            return JsonResponse(error_response("user_id is required"), status=400)

        user = Company.objects.filter(id=user_id).first()
        if not user:
            return JsonResponse(error_response("User not found"), status=404)

        raw_key, key_hash = generate_api_key()

        new_key = APIKey.objects.create(
            company=user,
            key_name=label,
            secret_key=key_hash,
            public_key=f"vsh_pub_{raw_key[-8:]}",
            environment="production"
        )

        return JsonResponse(success_response({
            "api_key": raw_key,
            "key_id": str(new_key.id),
            "label": label,
            "message": "Save this key securely — it will NOT be shown again.",
        }))
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)


@csrf_exempt
def token_from_key(request):
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        data = json.loads(request.body)
        api_key_raw = data.get("api_key")
        if not api_key_raw:
            return JsonResponse(error_response("api_key is required"), status=400)

        # Fetch all active keys (bcrypt means we must check each one)
        active_keys = APIKey.objects.filter(is_active=True).select_related('company')

        for api_key_obj in active_keys:
            if verify_api_key_bcrypt(api_key_raw, api_key_obj.secret_key):
                company = api_key_obj.company
                if not company.is_active:
                    continue

                token = create_short_jwt(
                    user_id=str(company.id),
                    email=company.email,
                )

                api_key_obj.last_used_at = datetime.now(timezone.utc)
                api_key_obj.save(update_fields=["last_used_at"])

                redirect_url = f"{FRONTEND_URL}/auth/verify?token={token}"

                return JsonResponse(success_response({
                    "token": token,
                    "redirect_url": redirect_url,
                    "expires_in": 900,
                    "user_id": str(company.id),
                    "email": company.email,
                }))

        return JsonResponse(error_response("Invalid API key"), status=401)
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)


@csrf_exempt
def verify_token(request):
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        data = json.loads(request.body)
        token = data.get("token")
        if not token:
            return JsonResponse(error_response("token is required"), status=400)

        try:
            payload = decode_jwt(token)
        except JWTError as e:
            return JsonResponse(error_response(f"Invalid or expired token: {e}"), status=401)

        if payload.get("purpose") != "dashboard_login":
            return JsonResponse(error_response("Token was not issued for dashboard login"), status=403)

        return JsonResponse(success_response({
            "user_id": payload["sub"],
            "email": payload["email"],
            "purpose": payload["purpose"],
            "issued_at": payload.get("iat"),
            "expires_at": payload.get("exp"),
        }))
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)
