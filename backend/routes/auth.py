from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from passlib.context import CryptContext
import secrets
from datetime import datetime, timedelta
from jose import jwt

from models.database import get_db, Company, APIKey
from models.schemas import success_response, error_response
from dependencies import verify_jwt, JWT_SECRET, JWT_ALGORITHM, redis_client

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class RegisterRequest(BaseModel):
    name: str = None
    company_name: str = None
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class KeyGenerateRequest(BaseModel):
    name: str = None
    key_name: str = None

@router.post("/register")
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Company).where(Company.email == req.email))
    if res.scalar_one_or_none():
        return error_response("Email already registered")
        
    company_name = req.name or req.company_name or "Unnamed Company"
    hashed_pwd = pwd_context.hash(req.password[:72])
    new_company = Company(
        name=company_name,
        email=req.email,
        password_hash=hashed_pwd,
        tier="free"
    )
    db.add(new_company)
    await db.flush()  # to get new_company.id
    
    secret = "vish_live_" + secrets.token_urlsafe(24)
    public = "vish_pub_" + secrets.token_urlsafe(24)
    
    new_key = APIKey(
        company_id=new_company.id,
        key_name="Default Key",
        secret_key=secret,
        public_key=public,
        environment="production"
    )
    db.add(new_key)
    await db.commit()
    
    # Generate JWT for auto-login after registration
    payload = {
        "company_id": str(new_company.id),
        "email": new_company.email,
        "tier": new_company.tier,
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    return success_response({
        "jwt_token": token,
        "company_id": str(new_company.id),
        "name": new_company.name,
        "email": new_company.email,
        "tier": new_company.tier,
        "secret_key": secret,
        "api_key": public,
        "public_key": public,
        "message": "Save your secret key — shown only once"
    })

@router.post("/login")
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Company).where(Company.email == req.email))
    company = res.scalar_one_or_none()
    if not company:
        return error_response("Invalid credentials")
        
    if not pwd_context.verify(req.password[:72], company.password_hash):
        return error_response("Invalid credentials")
        
    res_keys = await db.execute(
        select(APIKey).where(APIKey.company_id == company.id, APIKey.is_active == True)
    )
    api_key_obj = res_keys.scalars().first()
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
    
    return success_response({
        "jwt_token": token,
        "company_id": str(company.id),
        "name": company.name,
        "email": company.email,
        "tier": company.tier,
        "api_key": masked_secret
    })

@router.post("/api-keys/generate")
async def generate_api_key(
    req: KeyGenerateRequest, 
    company: Company = Depends(verify_jwt),
    db: AsyncSession = Depends(get_db)
):
    resolved_key_name = req.name or req.key_name or "Unnamed Key"
    secret = "vish_live_" + secrets.token_urlsafe(24)
    public = "vish_pub_" + secrets.token_urlsafe(24)
    
    new_key = APIKey(
        company_id=company.id,
        key_name=resolved_key_name,
        secret_key=secret,
        public_key=public,
        environment="production"
    )
    db.add(new_key)
    await db.commit()
    
    return success_response({
        "id": str(new_key.id),
        "key_name": new_key.key_name,
        "secret_key": secret,
        "public_key": public,
        "message": "Save your new secret key — shown only once"
    })

@router.get("/api-keys")
async def get_api_keys(company: Company = Depends(verify_jwt), db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(APIKey).where(APIKey.company_id == company.id, APIKey.is_active == True)
    )
    keys = res.scalars().all()
    
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
        
    return success_response(result)

@router.delete("/api-keys/{key_id}")
async def revoke_api_key(
    key_id: str,
    company: Company = Depends(verify_jwt),
    db: AsyncSession = Depends(get_db)
):
    import uuid
    try:
        parsed_key_id = uuid.UUID(key_id)
    except ValueError:
        return error_response("Invalid API Key ID format")

    res = await db.execute(
        select(APIKey).where(APIKey.id == parsed_key_id, APIKey.company_id == company.id)
    )
    api_key_obj = res.scalar_one_or_none()
    if not api_key_obj:
        return error_response("API Key not found")
        
    api_key_obj.is_active = False
    await db.commit()
    return success_response({"message": "Key revoked"})

@router.get("/me")
async def get_me(company: Company = Depends(verify_jwt)):
    return success_response({
        "id": str(company.id),
        "name": company.name,
        "email": company.email,
        "tier": company.tier,
        "created_at": company.created_at.isoformat() if company.created_at else None
    })
