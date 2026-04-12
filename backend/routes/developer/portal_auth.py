from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from passlib.context import CryptContext
import secrets
from datetime import datetime, timedelta
from jose import jwt

from models.database import get_db, DeveloperAccount, DeveloperAPIKey, BillingSubscription
from models.schemas import success_response, error_response
from dependencies import verify_developer_jwt, JWT_SECRET, JWT_ALGORITHM

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class DevRegisterRequest(BaseModel):
    company_name: str
    email: str
    password: str
    website_url: Optional[str] = None
    tier: Optional[str] = "free"

class DevLoginRequest(BaseModel):
    email: str
    password: str

class DevPatchRequest(BaseModel):
    company_name: Optional[str] = None
    website_url: Optional[str] = None
    allowed_domains: Optional[List[str]] = None

@router.post("/register")
async def register(req: DevRegisterRequest, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(DeveloperAccount).where(DeveloperAccount.email == req.email))
    if res.scalar_one_or_none():
        return error_response("Email already registered")
        
    hashed_pwd = pwd_context.hash(req.password[:72])
    verification_token = secrets.token_urlsafe(32)
    
    # Auto-verify for hackathon
    new_dev = DeveloperAccount(
        company_name=req.company_name,
        email=req.email,
        password_hash=hashed_pwd,
        tier=req.tier,
        is_verified=True,
        verification_token=verification_token,
        website_url=req.website_url
    )
    db.add(new_dev)
    await db.flush()
    
    test_secret = "vish_test_" + secrets.token_urlsafe(24)
    test_public = "vish_pub_test_" + secrets.token_urlsafe(24)
    
    live_secret = "vish_live_" + secrets.token_urlsafe(24)
    live_public = "vish_pub_" + secrets.token_urlsafe(24)
    
    test_key = DeveloperAPIKey(
        developer_id=new_dev.id,
        key_name="Test Key",
        secret_key=test_secret,
        public_key=test_public,
        environment="test"
    )
    
    live_key = DeveloperAPIKey(
        developer_id=new_dev.id,
        key_name="Production Key",
        secret_key=live_secret,
        public_key=live_public,
        environment="production"
    )
    db.add(test_key)
    db.add(live_key)
    
    subscription = BillingSubscription(
        developer_id=new_dev.id,
        plan=req.tier,
        status="active"
    )
    db.add(subscription)
    
    await db.commit()
    
    payload = {
        "developer_id": str(new_dev.id),
        "email": new_dev.email,
        "tier": new_dev.tier,
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

    return success_response({
        "jwt_token": token,
        "developer_id": str(new_dev.id),
        "email": new_dev.email,
        "tier": new_dev.tier,
        "company_name": new_dev.company_name,
        "test_secret_key": test_secret,
        "test_public_key": test_public,
        "secret_key": live_secret,
        "public_key": live_public,
        "message": "Check email to verify (skip for demo)"
    })

@router.post("/login")
async def login(req: DevLoginRequest, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(DeveloperAccount).where(DeveloperAccount.email == req.email))
    dev = res.scalar_one_or_none()
    
    if not dev:
        return error_response("Invalid credentials")
        
    if not pwd_context.verify(req.password[:72], dev.password_hash):
        return error_response("Invalid credentials")
        
    # Check is_verified (skip for hackathon — always pass)
    
    payload = {
        "developer_id": str(dev.id),
        "email": dev.email,
        "tier": dev.tier,
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    return success_response({
        "jwt_token": token,
        "developer_id": str(dev.id),
        "email": dev.email,
        "tier": dev.tier,
        "company_name": dev.company_name
    })

@router.get("/me")
async def get_me(dev: DeveloperAccount = Depends(verify_developer_jwt)):
    return success_response({
        "id": str(dev.id),
        "company_name": dev.company_name,
        "email": dev.email,
        "tier": dev.tier,
        "is_verified": dev.is_verified,
        "website_url": dev.website_url,
        "allowed_domains": dev.allowed_domains,
        "created_at": dev.created_at.isoformat() if dev.created_at else None
    })

@router.patch("/me")
async def patch_me(
    req: DevPatchRequest, 
    dev: DeveloperAccount = Depends(verify_developer_jwt),
    db: AsyncSession = Depends(get_db)
):
    if req.company_name is not None:
        dev.company_name = req.company_name
    if req.website_url is not None:
        dev.website_url = req.website_url
    if req.allowed_domains is not None:
        dev.allowed_domains = req.allowed_domains
        
    await db.commit()
    
    return success_response({
        "message": "Profile updated",
        "company_name": dev.company_name,
        "website_url": dev.website_url,
        "allowed_domains": dev.allowed_domains
    })
