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
from api.services.email_service import send_welcome_email

import logging
logger = logging.getLogger(__name__)

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
        
        industry = data.get("industry")
        hq_location = data.get("hq_location")
        company_size = data.get("company_size")
        founded_year = data.get("founded_year")
        website_url = data.get("website_url")
        about = data.get("about")
        
        parsed_founded = None
        if founded_year:
            try:
                parsed_founded = int(founded_year)
            except (ValueError, TypeError):
                pass

        new_company = Company.objects.create(
            name=company_name,
            email=email,
            password_hash=hashed_pwd,
            tier="free",
            industry=industry,
            hq_location=hq_location,
            company_size=company_size,
            founded_year=parsed_founded,
            website_url=website_url,
            about=about
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

        resp = JsonResponse(success_response({
            "jwt_token": token,
            "company_id": str(new_company.id),
            "name": new_company.name,
            "email": new_company.email,
            "tier": new_company.tier,
            "email_verified": new_company.email_verified,
            "phone_verified": new_company.phone_verified,
            "logo_path": new_company.logo_path,
            "industry": new_company.industry,
            "hq_location": new_company.hq_location,
            "company_size": new_company.company_size,
            "founded_year": new_company.founded_year,
            "website_url": new_company.website_url,
            "about": new_company.about,
            "secret_key": secret,
            "api_key": public,
            "public_key": public,
            "message": "Save your secret key — shown only once"
        }))

        # Send welcome email + Brevo CRM sync (non-blocking)
        try:
            send_welcome_email(
                user_email=email,
                user_name=company_name,
                role="recruiter",
                custom_attributes={
                    "HQ_LOCATION": hq_location or "N/A",
                    "INDUSTRY": industry or "N/A",
                    "WEBSITE": website_url or "N/A"
                }
            )
        except Exception:
            logger.warning("Welcome email failed for recruiter [REDACTED]")

        return resp
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
            "email_verified": company.email_verified,
            "phone_verified": company.phone_verified,
            "logo_path": company.logo_path,
            "api_key": masked_secret
        }))
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)
    finally:
        # Track login event in Brevo (non-blocking, best-effort)
        try:
            from api.services.brevo_service import track_automation_event
            track_automation_event(email=email, event_name="recruiter_login")
        except Exception:
            pass

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
        "email_verified": request.company.email_verified,
        "phone_verified": request.company.phone_verified,
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
        gemini_keys_str = os.getenv("GEMINI_API_KEYS", "")
        gemini_keys = [k.strip() for k in gemini_keys_str.split(",") if k.strip()]
        if not gemini_keys and os.getenv("GEMINI_API_KEY"):
            gemini_keys.append(os.getenv("GEMINI_API_KEY"))
            
        openai_key = os.getenv("OPENAI_API_KEY", "")
        llm_keys_str = os.getenv("LLM_API_KEYS", "")
        llm_keys = [k.strip() for k in llm_keys_str.split(",") if k.strip()]
        
        all_keys = list(set(gemini_keys + llm_keys + ([openai_key] if openai_key else [])))
        key_count = len(all_keys)
        
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


@csrf_exempt
def dynamic_data(request):
    if request.method != "GET":
        return JsonResponse(error_response("Method not allowed"), status=405)
        
    locations = {
        "India": {
            "Gujarat": ["Ahmedabad", "Gandhinagar", "Surat", "Vadodara", "Rajkot"],
            "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Thane", "Nashik"],
            "Karnataka": ["Bengaluru", "Mysore", "Hubli", "Mangalore"],
            "Delhi": ["New Delhi", "Delhi Cantt"],
            "Telangana": ["Hyderabad", "Warangal"],
            "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai"],
            "Uttar Pradesh": ["Noida", "Lucknow", "Kanpur", "Agra"],
            "Haryana": ["Gurugram", "Faridabad", "Panipat"]
        },
        "United States": {
            "California": ["San Francisco", "Los Angeles", "San Diego", "San Jose"],
            "New York": ["New York City", "Buffalo", "Rochester"],
            "Texas": ["Austin", "Houston", "Dallas", "San Antonio"],
            "Washington": ["Seattle", "Bellevue", "Redmond"],
            "Massachusetts": ["Boston", "Cambridge", "Worcester"]
        },
        "United Kingdom": {
            "England": ["London", "Manchester", "Birmingham", "Leeds", "Bristol"],
            "Scotland": ["Edinburgh", "Glasgow", "Aberdeen"]
        },
        "Canada": {
            "Ontario": ["Toronto", "Ottawa", "Mississauga", "Hamilton"],
            "British Columbia": ["Vancouver", "Victoria", "Burnaby"],
            "Quebec": ["Montreal", "Quebec City"]
        },
        "Germany": {
            "Bavaria": ["Munich", "Nuremberg", "Augsburg"],
            "Berlin": ["Berlin"],
            "Hamburg": ["Hamburg"]
        },
        "Singapore": {
            "Central Region": ["Singapore"]
        }
    }
    
    seeker_plans = {
        "free": {
            "name": "Free Forever",
            "price": "0",
            "period": "forever",
            "features": [
                "1 dynamic AI resume builder resume",
                "Basic resume safety analysis",
                "Up to 5 job applications per month",
                "Keystroke telemetry protection (1 profile)"
            ],
            "quota_description": "Perfect for casual seekers looking to secure their identity."
        },
        "pro_monthly": {
            "name": "Pro Monthly",
            "price": "49",
            "period": "month",
            "features": [
                "Unlimited dynamic AI resumes",
                "Deep safety analysis & fraud alerts",
                "Unlimited job applications",
                "Priority matching bypass queue",
                "Comprehensive keystroke telemetry profiling (unlimited)"
            ],
            "quota_description": "For serious candidates searching actively."
        },
        "pro_yearly": {
            "name": "Pro Yearly",
            "price": "399",
            "period": "year",
            "features": [
                "Everything in Pro Monthly",
                "Save 32% compared to monthly plan",
                "Direct API access to portfolio protection scanner",
                "VIP email support & resume audit checks"
            ],
            "quota_description": "Best value for long-term career safety."
        }
    }
    
    developer_plans = {
        "free": {
            "name": "Free",
            "price": "0",
            "features": [
                "100 resume parses/mo",
                "500 candidate matching operations/mo",
                "100 AI chatbot queries/mo",
                "0 safety scans/mo (upgrade required)"
            ],
            "limits": {
                "parses": 100,
                "matches": 500,
                "chat": 100,
                "safety": 0
            }
        },
        "starter": {
            "name": "Starter",
            "price": "79",
            "features": [
                "1,000 resume parses/mo",
                "10,000 candidate matching operations/mo",
                "2,000 AI chatbot queries/mo",
                "100 safety scans/mo included"
            ],
            "limits": {
                "parses": 1000,
                "matches": 10000,
                "chat": 2000,
                "safety": 100
            }
        },
        "business": {
            "name": "Business",
            "price": "299",
            "features": [
                "10,000 resume parses/mo",
                "Unlimited candidate matching operations/mo",
                "Unlimited AI chatbot queries/mo",
                "1,000 safety scans/mo included"
            ],
            "limits": {
                "parses": 10000,
                "matches": -1,
                "chat": -1,
                "safety": 1000
            }
        }
    }
    
    docs_structure = {
        "sections": [
            { "id": "getting-started", "title": "Getting Started" },
            { "id": "authentication", "title": "Authentication" },
            { "id": "sessions", "title": "Sessions" },
            { 
                "id": "resume-ingestion", 
                "title": "Resume Ingestion", 
                "sub": [
                    { "id": "file-upload", "title": "File Upload" },
                    { "id": "gmail-sync", "title": "Gmail Sync" },
                    { "id": "google-drive", "title": "Google Drive" },
                    { "id": "ats-import", "title": "ATS Import" }
                ]
            },
            { "id": "candidates", "title": "Candidates" },
            { "id": "candidate-clustering", "title": "Candidate Clustering" },
            { "id": "job-matching", "title": "Job Matching" },
            { "id": "ai-chatbot", "title": "AI Chatbot" },
            { "id": "fraud-detection", "title": "Fraud Detection" },
            { "id": "webhooks", "title": "Webhooks" },
            { "id": "rate-limits", "title": "Rate Limits & Errors" },
            { "id": "sdks", "title": "SDKs & Examples" }
        ],
        "sdks": [
            { "lang": "Python", "pkg": "between-py", "icon": "🐍", "install": "pip install between-py" },
            { "lang": "JavaScript", "pkg": "between-js", "icon": "🟨", "install": "npm install between-js" },
            { "lang": "Go", "pkg": "go-between", "icon": "🐹", "install": "go get between.indevs.in/go-between" }
        ],
        "templates": {
            "match_request": "curl -X POST \"https://api.between.indevs.in/api/v1/match\" \\\n  -H \"X-API-Key: YOUR_KEY\" \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\n    \"job_title\": \"Senior React Developer\",\n    \"job_description\": \"5+ years React, TypeScript...\",\n    \"top_k\": 5\n  }'",
            "match_response": "{\n  \"success\": true,\n  \"data\": {\n    \"matches\": [\n      {\n        \"candidate_id\": \"cnd_12345\",\n        \"name\": \"Jane Doe\",\n        \"match_score\": 94.2,\n        \"matched_skills\": [\"React\",\"TypeScript\"]\n      }\n    ]\n  }\n}",
            "chat_request": "curl -X POST \"https://api.between.indevs.in/api/v1/chat\" \\\n  -H \"X-API-Key: YOUR_KEY\" \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\n    \"message\": \"Find React devs with 3+ years experience\",\n    \"session_id\": \"ses_abc123\"\n  }'",
            "chat_response": "{\n  \"success\": true,\n  \"data\": {\n    \"answer\": \"Found 3 matching candidates.\",\n    \"candidates\": [\n      {\"candidate_id\": \"cnd_12345\", \"name\": \"Jane Doe\"}\n    ],\n    \"tokens_used\": 180\n  }\n}"
        }
    }
    
    return JsonResponse(success_response({
        "locations": locations,
        "seeker_plans": seeker_plans,
        "developer_plans": developer_plans,
        "docs": docs_structure
    }))


@csrf_exempt
@require_recruiter_jwt
def delete_account(request):
    if request.method != "DELETE":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        company = request.company
        company.delete()
        return JsonResponse(success_response({"message": "Recruiter account deleted successfully"}))
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)




