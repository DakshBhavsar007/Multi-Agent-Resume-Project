import os
import calendar
import redis
from datetime import datetime
from functools import wraps
from django.http import JsonResponse
from django.utils import timezone
from jose import jwt, JWTError

from api.models import Company, APIKey, DeveloperAccount, DeveloperAPIKey

TIER_LIMITS = {
  "free":       {"parse": 100,   "match": 50,    "chat": 20,    "scan": 0},
  "starter":    {"parse": 1000,  "match": 500,   "chat": 200,   "scan": 100},
  "business":   {"parse": 10000, "match": -1,    "chat": -1,    "scan": 1000},
  "enterprise": {"parse": -1,    "match": -1,    "chat": -1,    "scan": -1}
}

TIER_ORDER = {"free": 0, "starter": 1, "business": 2, "enterprise": 3}

JWT_SECRET = os.getenv("JWT_SECRET", "supersecret")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
if redis_url.startswith("rediss://") and "ssl_cert_reqs" not in redis_url:
    if "?" in redis_url:
        redis_url += "&ssl_cert_reqs=none"
    else:
        redis_url += "?ssl_cert_reqs=none"

redis_client = redis.from_url(redis_url)

def verify_api_key_helper(request):
    """
    Authenticates via X-API-Key header, query param, or Bearer JWT token.
    Stashes the validated company on request.company.
    Stashes the resolved api_key object on request.company._api_key_obj for rate limits.
    """
    # 1. API Key from header or query param
    x_api_key = request.headers.get("X-API-Key", "")
    if not x_api_key:
        x_api_key = request.GET.get("x_api_key", "")
    if x_api_key:
        # Check standard recruiter keys
        api_key_obj = APIKey.objects.filter(secret_key=x_api_key, is_active=True).first()
        if not api_key_obj:
            api_key_obj = APIKey.objects.filter(public_key=x_api_key, is_active=True).first()
        if api_key_obj:
            company = Company.objects.filter(id=api_key_obj.company_id, is_active=True).first()
            if company:
                api_key_obj.last_used_at = timezone.now()
                api_key_obj.save(update_fields=['last_used_at'])
                company._api_key_obj = api_key_obj
                request.company = company
                return True

        # Check developer keys
        dev_key_obj = DeveloperAPIKey.objects.filter(secret_key=x_api_key, is_active=True).first()
        if not dev_key_obj:
            dev_key_obj = DeveloperAPIKey.objects.filter(public_key=x_api_key, is_active=True).first()
        if dev_key_obj:
            dev_acc = dev_key_obj.developer
            company, created = Company.objects.get_or_create(
                email=dev_acc.email,
                defaults={
                    "name": dev_acc.company_name,
                    "password_hash": dev_acc.password_hash,
                    "tier": dev_acc.tier,
                    "is_active": True
                }
            )
            if not created and company.tier != dev_acc.tier:
                company.tier = dev_acc.tier
                company.save(update_fields=['tier'])
            dev_key_obj.last_used_at = timezone.now()
            dev_key_obj.save(update_fields=['last_used_at'])
            company._api_key_obj = dev_key_obj
            request.company = company
            return True

    # 2. JWT Bearer token
    token = ""
    auth_header = request.headers.get("Authorization", "")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1]
    else:
        token = request.GET.get("token", "")
        if not token:
            token = request.GET.get("jwt", "")
            
    if token and token != "undefined" and token != "null":
        try:
            if redis_client.exists(f"blacklist:{token}"):
                return False
        except Exception:
            pass
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            company_id = payload.get("company_id")
            if company_id:
                company = Company.objects.filter(id=company_id, is_active=True).first()
                if company:
                    # Try to find default api key for rate-limit tracking
                    api_key_obj = APIKey.objects.filter(company_id=company.id, is_active=True).first()
                    company._api_key_obj = api_key_obj
                    request.company = company
                    return True

            developer_id = payload.get("developer_id")
            if developer_id:
                dev_acc = DeveloperAccount.objects.filter(id=developer_id).first()
                if dev_acc:
                    company, created = Company.objects.get_or_create(
                        email=dev_acc.email,
                        defaults={
                            "name": dev_acc.company_name,
                            "password_hash": dev_acc.password_hash,
                            "tier": dev_acc.tier,
                            "is_active": True
                        }
                    )
                    if not created and company.tier != dev_acc.tier:
                        company.tier = dev_acc.tier
                        company.save(update_fields=['tier'])
                    
                    # Try to find an active developer key for rate-limit tracking
                    dev_key_obj = DeveloperAPIKey.objects.filter(developer_id=dev_acc.id, is_active=True).first()
                    company._api_key_obj = dev_key_obj
                    request.company = company
                    return True
        except JWTError:
            pass

    return False


def require_api_key(view_func):
    """Decorator to enforce API Key or JWT authentication."""
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        if not verify_api_key_helper(request):
            return JsonResponse({
                "success": False,
                "data": None,
                "error": "Invalid or missing authentication"
            }, status=401)
        return view_func(request, *args, **kwargs)
    return _wrapped_view


def require_recruiter_jwt(view_func):
    """Decorator to enforce JWT Bearer token (recruiter dashboard)."""
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        token = ""
        auth_header = request.headers.get("Authorization", "")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
        else:
            token = request.GET.get("token", "")
            if not token:
                token = request.GET.get("jwt", "")
                
        if not token or token == "undefined" or token == "null":
            return JsonResponse({
                "success": False,
                "data": None,
                "error": "Invalid token format"
            }, status=401)
            
        try:
            if redis_client.exists(f"blacklist:{token}"):
                return JsonResponse({
                    "success": False,
                    "data": None,
                    "error": "Token has been blacklisted (logged out)"
                }, status=401)
        except Exception:
            pass

        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            company_id = payload.get("company_id")
            if not company_id:
                return JsonResponse({
                    "success": False,
                    "data": None,
                    "error": "Invalid token payload"
                }, status=401)
        except JWTError:
            return JsonResponse({
                "success": False,
                "data": None,
                "error": "Invalid or expired token"
            }, status=401)

        # Check Redis Cache for ban status
        ban_status_key = f"ban_status:recruiter:{company_id}"
        try:
            ban_cached = redis_client.get(ban_status_key)
            if ban_cached == b"true":
                return JsonResponse({
                    "success": False,
                    "data": None,
                    "error": "You are banned by admin. Please contact support."
                }, status=403)
        except Exception:
            ban_cached = None

        company = Company.objects.filter(id=company_id, is_active=True).first()
        if not company:
            return JsonResponse({
                "success": False,
                "data": None,
                "error": "Company not found or inactive"
            }, status=401)

        if company.is_banned:
            try:
                redis_client.setex(ban_status_key, 300, "true")
            except Exception:
                pass
            return JsonResponse({
                "success": False,
                "data": None,
                "error": "You are banned by admin. Please contact support."
            }, status=403)
        else:
            if ban_cached is None:
                try:
                    redis_client.setex(ban_status_key, 300, "false")
                except Exception:
                    pass

        request.company = company
        return view_func(request, *args, **kwargs)
    return _wrapped_view


def require_developer_jwt(view_func):
    """Decorator to enforce Developer JWT (developer portal)."""
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header or not auth_header.startswith("Bearer "):
            return JsonResponse({
                "success": False,
                "data": None,
                "error": "Invalid token format"
            }, status=401)
            
        token = auth_header.split(" ")[1]
        try:
            if redis_client.exists(f"blacklist:{token}"):
                return JsonResponse({
                    "success": False,
                    "data": None,
                    "error": "Token has been blacklisted (logged out)"
                }, status=401)
        except Exception:
            pass

        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            developer_id = payload.get("developer_id")
            if not developer_id:
                return JsonResponse({
                    "success": False,
                    "data": None,
                    "error": "Invalid token payload"
                }, status=401)
        except JWTError:
            return JsonResponse({
                "success": False,
                "data": None,
                "error": "Invalid or expired token"
            }, status=401)

        # Check Redis Cache for ban status
        ban_status_key = f"ban_status:developer:{developer_id}"
        try:
            ban_cached = redis_client.get(ban_status_key)
            if ban_cached == b"true":
                return JsonResponse({
                    "success": False,
                    "data": None,
                    "error": "You are banned by admin. Please contact support."
                }, status=403)
        except Exception:
            ban_cached = None

        developer = DeveloperAccount.objects.filter(id=developer_id).first()
        if not developer:
            return JsonResponse({
                "success": False,
                "data": None,
                "error": "Developer not found"
            }, status=401)

        if developer.is_banned:
            try:
                redis_client.setex(ban_status_key, 300, "true")
            except Exception:
                pass
            return JsonResponse({
                "success": False,
                "data": None,
                "error": "You are banned by admin. Please contact support."
            }, status=403)
        else:
            if ban_cached is None:
                try:
                    redis_client.setex(ban_status_key, 300, "false")
                except Exception:
                    pass

        request.developer = developer
        return view_func(request, *args, **kwargs)
    return _wrapped_view


def check_rate_limit(action: str):
    """Decorator factory to check Redis API usage rate limits."""
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            # Assumes require_api_key decorator has run or we verify it now
            if not hasattr(request, 'company'):
                if not verify_api_key_helper(request):
                    return JsonResponse({
                        "success": False,
                        "data": None,
                        "error": "Invalid or missing authentication"
                    }, status=401)

            company = request.company
            api_key = getattr(company, '_api_key_obj', None)
            if not api_key:
                return view_func(request, *args, **kwargs)  # skip rate limit if no API key object stashed

            tier = company.tier or "free"
            limits = TIER_LIMITS.get(tier, TIER_LIMITS["free"])
            action_limit = limits.get(action, 0)
            
            if action_limit == -1:
                return view_func(request, *args, **kwargs)

            now = datetime.now()
            year_month = now.strftime("%Y-%m")
            redis_key = f"rl:{api_key.secret_key}:{year_month}:{action}"
            
            used = redis_client.incr(redis_key)
            
            if used == 1:
                last_day = calendar.monthrange(now.year, now.month)[1]
                end_of_month = datetime(now.year, now.month, last_day, 23, 59, 59)
                ttl = int((end_of_month - now).total_seconds())
                redis_client.expire(redis_key, ttl)
                
            if used > action_limit:
                redis_client.decr(redis_key)
                return JsonResponse({
                    "success": False,
                    "error": f"Monthly {action} limit reached",
                    "data": {
                        "limit": action_limit,
                        "used": used - 1,
                        "tier": tier,
                        "resets_on": "first of next month",
                        "upgrade_url": "/developer/portal/billing"
                    }
                }, status=429)
                
            return view_func(request, *args, **kwargs)
        return _wrapped_view
    return decorator


def require_tier(minimum_tier: str):
    """Decorator factory to enforce a minimum developer tier."""
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            if not hasattr(request, 'developer'):
                # Call developer jwt validator if not already run
                auth_header = request.headers.get("Authorization", "")
                if not auth_header or not auth_header.startswith("Bearer "):
                    return JsonResponse({"success": False, "error": "Invalid token format"}, status=401)
                token = auth_header.split(" ")[1]
                try:
                    payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
                    developer_id = payload.get("developer_id")
                    developer = DeveloperAccount.objects.filter(id=developer_id).first()
                    if not developer:
                        return JsonResponse({"success": False, "error": "Developer not found"}, status=401)
                    request.developer = developer
                except JWTError:
                    return JsonResponse({"success": False, "error": "Invalid or expired token"}, status=401)

            developer = request.developer
            minimum_rank = TIER_ORDER.get(minimum_tier, 0)
            current_rank = TIER_ORDER.get(developer.tier or "free", 0)
            
            if current_rank < minimum_rank:
                return JsonResponse({
                    "success": False,
                    "error": "Insufficient tier level"
                }, status=403)
                
            return view_func(request, *args, **kwargs)
        return _wrapped_view
    return decorator


def rate_limit_ip(limit: int, period_seconds: int, action_name: str):
    """
    Decorator to limit requests by client IP.
    Returns 429 if the request count exceeds 'limit' within 'period_seconds'.
    """
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded_for:
                ip = x_forwarded_for.split(',')[0].strip()
            else:
                ip = request.META.get('REMOTE_ADDR', 'unknown')

            redis_key = f"ip_limit:{action_name}:{ip}"
            
            try:
                current = redis_client.incr(redis_key)
                if current == 1:
                    redis_client.expire(redis_key, period_seconds)
                
                if current > limit:
                    return JsonResponse({
                        "success": False,
                        "error": "Too many requests. Please try again later.",
                        "data": {
                            "action": action_name,
                            "retry_after_seconds": redis_client.ttl(redis_key)
                        }
                    }, status=429)
            except Exception as e:
                # Fail open to avoid blocking application if Redis is temporarily offline
                print(f"[RateLimit] Redis error: {e}", flush=True)

            return view_func(request, *args, **kwargs)
        return _wrapped_view
    return decorator


def require_admin_jwt(view_func):
    """Decorator to enforce Admin JWT token."""
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        token = ""
        auth_header = request.headers.get("Authorization", "")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
        else:
            token = request.GET.get("token", "")
            if not token:
                token = request.GET.get("jwt", "")
                
        if not token or token == "undefined" or token == "null":
            return JsonResponse({
                "success": False,
                "data": None,
                "error": "Authentication required"
            }, status=401)
            
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            if not payload.get("is_admin"):
                return JsonResponse({
                    "success": False,
                    "data": None,
                    "error": "Admin access required"
                }, status=403)
            request.admin_email = payload.get("email")
        except JWTError:
            return JsonResponse({
                "success": False,
                "data": None,
                "error": "Invalid or expired token"
            }, status=401)
            
        return view_func(request, *args, **kwargs)
    return _wrapped_view


