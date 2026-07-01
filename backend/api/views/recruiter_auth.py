import os
import json
import secrets
from datetime import datetime, timedelta, timezone
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from passlib.context import CryptContext
from jose import jwt

from api.models import Company, APIKey
from api.decorators import require_recruiter_jwt, JWT_SECRET, JWT_ALGORITHM, redis_client
from models.schemas import success_response, error_response

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

@csrf_exempt
def register(request):
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        data = json.loads(request.body)
        email = data.get("email")
        password = data.get("password")
        if not email or not password:
            return JsonResponse(error_response("Email and password are required"), status=400)

        if Company.objects.filter(email=email).exists():
            return JsonResponse(error_response("Email already registered"), status=400)

        company_name = data.get("name") or data.get("company_name") or "Unnamed Company"
        hashed_pwd = pwd_context.hash(password[:72])
        new_company = Company.objects.create(
            name=company_name,
            email=email,
            password_hash=hashed_pwd,
            tier="free"
        )

        secret = "vish_live_" + secrets.token_urlsafe(24)
        public = "vish_pub_" + secrets.token_urlsafe(24)

        new_key = APIKey.objects.create(
            company=new_company,
            key_name="Default Key",
            secret_key=secret,
            public_key=public,
            environment="production"
        )

        payload = {
            "company_id": str(new_company.id),
            "email": new_company.email,
            "tier": new_company.tier,
            "exp": datetime.utcnow() + timedelta(days=7)
        }
        token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

        return JsonResponse(success_response({
            "jwt_token": token,
            "company_id": str(new_company.id),
            "name": new_company.name,
            "email": new_company.email,
            "tier": new_company.tier,
            "logo_path": new_company.logo_path,
            "secret_key": secret,
            "api_key": public,
            "public_key": public,
            "message": "Save your secret key — shown only once"
        }))
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)

@csrf_exempt
def login(request):
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        data = json.loads(request.body)
        email = data.get("email")
        password = data.get("password")
        if not email or not password:
            return JsonResponse(error_response("Email and password are required"), status=400)

        company = Company.objects.filter(email=email).first()
        if not company:
            return JsonResponse(error_response("Invalid credentials"), status=401)

        if not pwd_context.verify(password[:72], company.password_hash):
            return JsonResponse(error_response("Invalid credentials"), status=401)

        api_key_obj = APIKey.objects.filter(company_id=company.id, is_active=True).first()
        masked_secret = None
        if api_key_obj:
            masked_secret = api_key_obj.secret_key[:12] + "••••"

        payload = {
            "company_id": str(company.id),
            "email": company.email,
            "tier": company.tier,
            "exp": datetime.utcnow() + timedelta(days=7)
        }
        token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

        return JsonResponse(success_response({
            "jwt_token": token,
            "company_id": str(company.id),
            "name": company.name,
            "email": company.email,
            "tier": company.tier,
            "logo_path": company.logo_path,
            "api_key": masked_secret
        }))
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)

@csrf_exempt
@require_recruiter_jwt
def generate_api_key(request):
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        data = {}
        if request.body:
            try:
                data = json.loads(request.body)
            except ValueError:
                pass
        
        resolved_key_name = data.get("name") or data.get("key_name") or "Unnamed Key"
        secret = "vish_live_" + secrets.token_urlsafe(24)
        public = "vish_pub_" + secrets.token_urlsafe(24)

        new_key = APIKey.objects.create(
            company=request.company,
            key_name=resolved_key_name,
            secret_key=secret,
            public_key=public,
            environment="production"
        )

        return JsonResponse(success_response({
            "id": str(new_key.id),
            "key_name": new_key.key_name,
            "secret_key": secret,
            "public_key": public,
            "message": "Save your new secret key — shown only once"
        }))
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)

@csrf_exempt
@require_recruiter_jwt
def get_api_keys(request):
    if request.method != "GET":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        keys = APIKey.objects.filter(company_id=request.company.id, is_active=True)
        result = []
        year_month = datetime.now().strftime("%Y-%m")

        for k in keys:
            this_month_calls = 0
            for action in ["parse", "match", "chat"]:
                redis_key = f"rl:{k.secret_key}:{year_month}:{action}"
                val = redis_client.get(redis_key)
                if val:
                    this_month_calls += int(val)

            result.append({
                "id": str(k.id),
                "key_name": k.key_name,
                "environment": k.environment,
                "secret_key_masked": k.secret_key[:12] + "••••••••",
                "public_key": k.public_key,
                "last_used_at": k.last_used_at.isoformat() if k.last_used_at else None,
                "created_at": k.created_at.isoformat() if k.created_at else None,
                "this_month_calls": this_month_calls
            })

        return JsonResponse(success_response(result))
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)

@csrf_exempt
@require_recruiter_jwt
def revoke_api_key(request, key_id):
    if request.method != "DELETE":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        import uuid
        try:
            parsed_key_id = uuid.UUID(key_id)
        except ValueError:
            return JsonResponse(error_response("Invalid API Key ID format"), status=400)

        api_key_obj = APIKey.objects.filter(id=parsed_key_id, company_id=request.company.id).first()
        if not api_key_obj:
            return JsonResponse(error_response("API Key not found"), status=404)

        api_key_obj.is_active = False
        api_key_obj.save(update_fields=['is_active'])
        return JsonResponse(success_response({"message": "Key revoked"}))
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)

@csrf_exempt
@require_recruiter_jwt
def me(request):
    if request.method != "GET":
        return JsonResponse(error_response("Method not allowed"), status=405)
    return JsonResponse(success_response({
        "id": str(request.company.id),
        "name": request.company.name,
        "email": request.company.email,
        "tier": request.company.tier,
        "logo_path": request.company.logo_path,
        "industry": request.company.industry,
        "hq_location": request.company.hq_location,
        "about": request.company.about,
        "company_size": request.company.company_size,
        "founded_year": request.company.founded_year,
        "website_url": request.company.website_url,
        "created_at": request.company.created_at.isoformat() if request.company.created_at else None
    }))

@csrf_exempt
def health_check(request):
    if request.method != "GET":
        return JsonResponse(error_response("Method not allowed"), status=405)

    checks = {}

    # Check database
    try:
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        checks["database"] = {"status": "ok", "detail": "PostgreSQL connected"}
    except Exception as db_err:
        checks["database"] = {"status": "error", "detail": str(db_err)}

    # Check Redis
    try:
        if redis_client:
            redis_client.ping()
            checks["redis"] = {"status": "ok", "detail": "Redis connected"}
        else:
            checks["redis"] = {"status": "warning", "detail": "Redis client not configured"}
    except Exception as redis_err:
        checks["redis"] = {"status": "error", "detail": str(redis_err)}

    # Check LLM API keys
    try:
        import os
        llm_keys = os.getenv("LLM_API_KEYS", "")
        key_count = len([k for k in llm_keys.split(",") if k.strip()]) if llm_keys else 0
        if key_count > 0:
            checks["llm_api"] = {"status": "ok", "detail": f"{key_count} API key(s) configured"}
        else:
            checks["llm_api"] = {"status": "warning", "detail": "No LLM API keys configured"}
    except Exception as llm_err:
        checks["llm_api"] = {"status": "error", "detail": str(llm_err)}

    # Check Celery
    try:
        from workers.celery_worker import celery_app
        inspector = celery_app.control.inspect(timeout=1)
        active = inspector.active()
        if active is not None:
            checks["celery"] = {"status": "ok", "detail": f"{len(active)} worker(s) active"}
        else:
            checks["celery"] = {"status": "warning", "detail": "No workers responding"}
    except Exception as cel_err:
        checks["celery"] = {"status": "warning", "detail": f"Could not reach Celery: {str(cel_err)}"}

    all_ok = all(v["status"] == "ok" for v in checks.values())
    has_error = any(v["status"] == "error" for v in checks.values())
    overall = "ok" if all_ok else ("degraded" if not has_error else "unhealthy")

    return JsonResponse(success_response({
        "status": overall,
        "version": "1.0.0",
        "checks": checks,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }))

@csrf_exempt
def logout(request):
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)
    return JsonResponse(success_response({"message": "Successfully logged out"}))

@csrf_exempt
@require_recruiter_jwt
def change_password(request):
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        data = json.loads(request.body)
        old_password = data.get("old_password")
        new_password = data.get("new_password")
        if not old_password or not new_password:
            return JsonResponse(error_response("old_password and new_password are required"), status=400)

        company = request.company
        if not pwd_context.verify(old_password[:72], company.password_hash):
            return JsonResponse(error_response("Invalid current password"), status=401)

        company.password_hash = pwd_context.hash(new_password[:72])
        company.save(update_fields=["password_hash"])
        return JsonResponse(success_response({"message": "Password updated successfully"}))
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)

@csrf_exempt
@require_recruiter_jwt
def update_profile(request):
    if request.method not in ["POST", "PUT"]:
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        data = json.loads(request.body)
        name = data.get("name") or data.get("company_name")
        email = data.get("email")

        company = request.company
        if name:
            company.name = name
        if email:
            if Company.objects.filter(email=email).exclude(id=company.id).exists():
                return JsonResponse(error_response("Email already registered by another account"), status=400)
            company.email = email

        if "logo_path" in data:
            logo_val = data.get("logo_path")
            company.logo_path = logo_val if logo_val else None

        if "industry" in data:
            company.industry = data.get("industry")
        if "hq_location" in data:
            company.hq_location = data.get("hq_location")
        if "about" in data:
            company.about = data.get("about")
        if "company_size" in data:
            company.company_size = data.get("company_size")
        if "founded_year" in data:
            val = data.get("founded_year")
            try:
                company.founded_year = int(val) if val is not None and str(val).strip() != "" else None
            except (ValueError, TypeError):
                pass
        if "website_url" in data:
            company.website_url = data.get("website_url")

        company.save()
        return JsonResponse(success_response({
            "id": str(company.id),
            "name": company.name,
            "email": company.email,
            "tier": company.tier,
            "logo_path": company.logo_path,
            "industry": company.industry,
            "hq_location": company.hq_location,
            "about": company.about,
            "company_size": company.company_size,
            "founded_year": company.founded_year,
            "website_url": company.website_url,
            "created_at": company.created_at.isoformat() if company.created_at else None
        }))
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)

@csrf_exempt
@require_recruiter_jwt
def upload_logo(request):
    """
    POST /api/v1/auth/upload-logo
    Upload a company logo image. Size limit: 5MB.
    """
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        import uuid
        file = request.FILES.get("file")
        if not file:
            return JsonResponse(error_response("No file provided"), status=400)

        # 5MB size limit
        if file.size > 5 * 1024 * 1024:
            return JsonResponse(error_response("File size must be under 5 MB"), status=400)

        allowed_ext = (".png", ".jpg", ".jpeg", ".svg", ".webp")
        ext = os.path.splitext(file.name.lower())[1]
        if ext not in allowed_ext:
            return JsonResponse(error_response("Only PNG, JPG, JPEG, SVG, or WEBP images are allowed"), status=400)

        # Save to uploads/companies/{company_id}/logo_{uuid}{ext}
        company = request.company
        UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")
        company_dir = os.path.join(UPLOAD_DIR, "companies", str(company.id))
        os.makedirs(company_dir, exist_ok=True)

        fname = f"logo_{uuid.uuid4().hex}{ext}"
        file_path = os.path.join(company_dir, fname)
        with open(file_path, "wb+") as f:
            for chunk in file.chunks():
                f.write(chunk)

        # Save URL path (Django handles uploads/ path directly)
        logo_url_path = f"/uploads/companies/{company.id}/{fname}"
        company.logo_path = logo_url_path
        company.save(update_fields=["logo_path"])

        return JsonResponse(success_response({
            "logo_path": logo_url_path
        }))
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)


@csrf_exempt
@require_recruiter_jwt
def get_recruiter_notifications(request):
    """GET /api/v1/auth/notifications"""
    if request.method != "GET":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        from api.models import Notification
        notifs = Notification.objects.filter(company=request.company).order_by("-created_at")[:100]
        data = []
        for n in notifs:
            data.append({
                "id": str(n.id),
                "type": n.type,
                "title": n.title,
                "message": n.message,
                "is_read": n.is_read,
                "link": n.link,
                "created_at": n.created_at.isoformat() if n.created_at else None
            })
        return JsonResponse(success_response(data))
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)


@csrf_exempt
@require_recruiter_jwt
def mark_recruiter_notification_read(request, notif_id):
    """POST /api/v1/auth/notifications/{id}/read"""
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        from api.models import Notification
        n = Notification.objects.filter(id=notif_id, company=request.company).first()
        if not n:
            return JsonResponse(error_response("Notification not found"), status=404)
        n.is_read = True
        n.save(update_fields=["is_read"])
        return JsonResponse(success_response({"message": "Marked as read"}))
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)


@csrf_exempt
@require_recruiter_jwt
def mark_all_recruiter_notifications_read(request):
    """POST /api/v1/auth/notifications/read-all"""
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        from api.models import Notification
        Notification.objects.filter(company=request.company, is_read=False).update(is_read=True)
        return JsonResponse(success_response({"message": "All marked as read"}))
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)


@csrf_exempt
def cross_portal_login(request):
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        data = json.loads(request.body)
        token = data.get("token")
        target_role = data.get("target_role")
        if not token or not target_role:
            return JsonResponse(error_response("token and target_role are required"), status=400)

        # Decode token to find email
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            email = payload.get("email")
            if not email:
                return JsonResponse(error_response("Invalid token payload"), status=400)
        except Exception as jwt_err:
            return JsonResponse(error_response(f"Invalid token: {str(jwt_err)}"), status=401)

        email = email.strip().lower()
        if target_role == "recruiter":
            company = Company.objects.filter(email=email).first()
            if not company:
                # Auto register recruiter
                company = Company.objects.create(
                    name=email.split("@")[0].capitalize(),
                    email=email,
                    password_hash=pwd_context.hash(secrets.token_urlsafe(16)),
                    tier="free"
                )
                APIKey.objects.create(
                    company=company,
                    key_name="Default Key",
                    secret_key="vish_live_" + secrets.token_urlsafe(24),
                    public_key="vish_pub_" + secrets.token_urlsafe(24),
                    environment="production"
                )
            
            api_key_obj = APIKey.objects.filter(company_id=company.id, is_active=True).first()
            masked_secret = None
            if api_key_obj:
                masked_secret = api_key_obj.secret_key[:12] + "••••"

            new_payload = {
                "company_id": str(company.id),
                "email": company.email,
                "tier": company.tier,
                "exp": datetime.utcnow() + timedelta(days=7)
            }
            new_token = jwt.encode(new_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
            return JsonResponse(success_response({
                "jwt_token": new_token,
                "company_id": str(company.id),
                "name": company.name,
                "email": company.email,
                "tier": company.tier,
                "api_key": masked_secret
            }))

        elif target_role == "developer":
            from api.models import DeveloperAccount, DeveloperAPIKey, BillingSubscription
            dev = DeveloperAccount.objects.filter(email=email).first()
            if not dev:
                # Auto register developer
                dev = DeveloperAccount.objects.create(
                    company_name=email.split("@")[0].capitalize() + " Dev",
                    email=email,
                    password_hash=pwd_context.hash(secrets.token_urlsafe(16)),
                    tier="free",
                    is_verified=True
                )
                test_secret = "vish_test_" + secrets.token_urlsafe(24)
                test_public = "vish_pub_test_" + secrets.token_urlsafe(24)
                live_secret = "vish_live_" + secrets.token_urlsafe(24)
                live_public = "vish_pub_" + secrets.token_urlsafe(24)

                DeveloperAPIKey.objects.create(
                    developer=dev,
                    key_name="Test Key",
                    secret_key=test_secret,
                    public_key=test_public,
                    environment="test"
                )
                DeveloperAPIKey.objects.create(
                    developer=dev,
                    key_name="Production Key",
                    secret_key=live_secret,
                    public_key=live_public,
                    environment="production"
                )
                BillingSubscription.objects.create(
                    developer=dev,
                    plan="free",
                    status="active"
                )
            
            new_payload = {
                "developer_id": str(dev.id),
                "email": dev.email,
                "tier": dev.tier,
                "exp": datetime.utcnow() + timedelta(days=7)
            }
            new_token = jwt.encode(new_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
            return JsonResponse(success_response({
                "jwt_token": new_token,
                "developer_id": str(dev.id),
                "email": dev.email,
                "tier": dev.tier,
                "company_name": dev.company_name
            }))

        elif target_role == "seeker":
            from api.models import JobSeekerAccount
            seeker = JobSeekerAccount.objects.filter(email=email, is_active=True).first()
            if not seeker:
                # Auto register seeker
                seeker = JobSeekerAccount.objects.create(
                    full_name=email.split("@")[0].capitalize(),
                    email=email,
                    password_hash=pwd_context.hash(secrets.token_urlsafe(16)),
                    tier="free"
                )

            new_payload = {
                "seeker_id": str(seeker.id),
                "email": seeker.email,
                "tier": seeker.tier,
                "exp": datetime.utcnow() + timedelta(days=7),
            }
            new_token = jwt.encode(new_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
            seeker_dict = {
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
            return JsonResponse(success_response({
                "seeker_token": new_token,
                "seeker": seeker_dict
            }))
        else:
            return JsonResponse(error_response("Invalid target_role"), status=400)

    except Exception as e:
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)




