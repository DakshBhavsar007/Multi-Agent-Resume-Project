import os
import calendar
from datetime import datetime
from fastapi import Header, HTTPException, Depends, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models.database import get_db, APIKey as ApiKey, Company, DeveloperAccount
from jose import jwt, JWTError
import redis as redis_sync

TIER_LIMITS = {
  "free":       {"parse": 100,   "match": 50,    "chat": 20},
  "starter":    {"parse": 1000,  "match": 500,   "chat": 200},
  "business":   {"parse": 10000, "match": -1,    "chat": -1},
  "enterprise": {"parse": -1,    "match": -1,    "chat": -1}
}

TIER_ORDER = {"free": 0, "starter": 1, "business": 2, "enterprise": 3}

redis_client = redis_sync.from_url(
  os.getenv("REDIS_URL", "redis://localhost:6379")
)

JWT_SECRET = os.getenv("JWT_SECRET", "supersecret")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

async def verify_api_key(
  request: Request,
  x_api_key: str = Header("", alias="X-API-Key"),
  authorization: str = Header(""),
  db: AsyncSession = Depends(get_db)
) -> Company:
    """
    Authenticates via X-API-Key header (secret key), query param, or Bearer JWT token.
    Routes use: company: Company = Depends(verify_api_key)
    The resolved api_key object is stashed on company._api_key_obj for rate-limit checks.
    """
    # --- Strategy 1: API Key from header or query param ---
    resolved_key = x_api_key or request.query_params.get("x_api_key", "")
    if resolved_key:
        result = await db.execute(select(ApiKey).where(ApiKey.secret_key == resolved_key))
        api_key_obj = result.scalar_one_or_none()
        if api_key_obj and api_key_obj.is_active:
            company_res = await db.execute(select(Company).where(Company.id == api_key_obj.company_id))
            company = company_res.scalar_one_or_none()
            if company and company.is_active:
                api_key_obj.last_used_at = datetime.now()
                await db.commit()
                company._api_key_obj = api_key_obj
                return company

    # --- Strategy 2: JWT Bearer token (recruiter dashboard) ---
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            company_id = payload.get("company_id")
            if company_id:
                result = await db.execute(select(Company).where(Company.id == str(company_id)))
                company = result.scalar_one_or_none()
                if company and company.is_active:
                    # Try to find default api key for rate-limit tracking
                    key_res = await db.execute(
                        select(ApiKey).where(ApiKey.company_id == company.id, ApiKey.is_active == True)
                    )
                    api_key_obj = key_res.scalars().first()
                    company._api_key_obj = api_key_obj
                    return company
        except JWTError:
            pass

    raise HTTPException(status_code=401, detail="Invalid or missing authentication")

async def verify_jwt(
  authorization: str = Header(...),
  db: AsyncSession = Depends(get_db)
) -> Company:
    """
    Strips 'Bearer ' prefix.
    Decodes JWT with JWT_SECRET.
    Returns Company record.
    Raises 401 if invalid or expired.
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid token format")
    token = authorization.split(" ")[1]
    
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        company_id = payload.get("company_id")
        if not company_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    result = await db.execute(select(Company).where(Company.id == str(company_id)))
    company = result.scalar_one_or_none()
    if not company or not company.is_active:
        raise HTTPException(status_code=401, detail="Company not found or inactive")
        
    return company

async def verify_developer_jwt(
  authorization: str = Header(...),
  db: AsyncSession = Depends(get_db)
) -> DeveloperAccount:
    """
    Same as verify_jwt but for DeveloperAccount table.
    JWT payload has developer_id field.
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid token format")
    token = authorization.split(" ")[1]
    
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        developer_id = payload.get("developer_id")
        if not developer_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    result = await db.execute(select(DeveloperAccount).where(DeveloperAccount.id == str(developer_id)))
    developer = result.scalar_one_or_none()
    if not developer:
        raise HTTPException(status_code=401, detail="Developer not found")
        
    return developer

def check_rate_limit(action: str):
    """
    Returns a FastAPI dependency function.
    Usage: Depends(check_rate_limit("parse"))
    
    Checks Redis key: rl:{secret_key}:{YYYY-MM}:{action}
    """
    def _dependency(company: Company = Depends(verify_api_key)):
        api_key = getattr(company, '_api_key_obj', None)
        if not api_key:
            return True  # No API key found, skip rate limit
        tier = company.tier or "free"
        limits = TIER_LIMITS.get(tier, TIER_LIMITS["free"])
        action_limit = limits.get(action, 0)
        
        if action_limit == -1:
            return True
            
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
            raise HTTPException(
                status_code=429,
                detail={
                    "success": False,
                    "error": f"Monthly {action} limit reached",
                    "data": {
                        "limit": action_limit,
                        "used": used - 1,
                        "tier": tier,
                        "resets_on": "first of next month",
                        "upgrade_url": "http://localhost:3001/portal/billing"
                    }
                }
            )
        return True
    return _dependency

def require_tier(minimum_tier: str):
    """
    Returns dependency that checks developer tier.
    Raises 403 if tier insufficient.
    Usage: Depends(require_tier("starter"))
    """
    def _dependency(developer: DeveloperAccount = Depends(verify_developer_jwt)):
        minimum_rank = TIER_ORDER.get(minimum_tier, 0)
        current_rank = TIER_ORDER.get(developer.tier or "free", 0)
        
        if current_rank < minimum_rank:
            raise HTTPException(status_code=403, detail="Insufficient tier level")
            
        return developer
    return _dependency
