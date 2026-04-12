"""
Vishleshan Auth Routes  – API Key → JWT Dashboard Login
────────────────────────────────────────────────────────
POST /auth/generate-key     → create a new API key for a user
POST /auth/token-from-key   → exchange raw API key for a short-lived JWT + redirect URL
POST /auth/verify           → verify a short-lived JWT (used by the frontend callback)
"""

import os
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from models.database import get_db, Company, APIKey
from models.schemas import success_response, error_response
from auth.utils import (
    generate_api_key,
    verify_api_key as verify_api_key_bcrypt,
    create_short_jwt,
    decode_jwt,
)
from jose import JWTError

router = APIRouter()

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


# ── Request schemas ─────────────────────────────────────────────────────────

class GenerateKeyRequest(BaseModel):
    user_id: str                         # company/user UUID
    label: str = "Default Key"


class TokenFromKeyRequest(BaseModel):
    api_key: str                         # the raw "vsh_..." key


class VerifyTokenRequest(BaseModel):
    token: str                           # JWT issued by /token-from-key


# ── POST /auth/generate-key ────────────────────────────────────────────────

@router.post("/generate-key")
async def generate_key_endpoint(
    req: GenerateKeyRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new bcrypt-hashed API key for the specified user.
    The raw key is returned ONCE – it cannot be retrieved again.
    """
    # Verify user exists
    result = await db.execute(
        select(Company).where(Company.id == req.user_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        return error_response("User not found", status_code=404)

    raw_key, key_hash = generate_api_key()

    new_key = APIKey(
        company_id=user.id,
        key_name=req.label,
        secret_key=key_hash,               # store bcrypt hash
        public_key=f"vsh_pub_{raw_key[-8:]}",  # short public reference
        environment="production",
    )
    db.add(new_key)
    await db.commit()

    return success_response({
        "api_key": raw_key,                 # show ONCE
        "key_id": str(new_key.id),
        "label":  req.label,
        "message": "Save this key securely — it will NOT be shown again.",
    })


# ── POST /auth/token-from-key ──────────────────────────────────────────────

@router.post("/token-from-key")
async def token_from_key(
    req: TokenFromKeyRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Exchange a raw API key for a 15-minute JWT.

    Flow:
      1. Load all active api_keys joined with their user/company
      2. bcrypt-verify the supplied key against each hash
      3. On match → issue short JWT, update last_used_at
      4. Return {token, redirect_url} where redirect_url points to
         FRONTEND_URL/auth/verify?token=<JWT>
    """
    # Fetch all active keys (bcrypt means we must check each one)
    result = await db.execute(
        select(APIKey, Company)
        .join(Company, APIKey.company_id == Company.id)
        .where(APIKey.is_active == True)
    )
    rows = result.all()

    for api_key_obj, company in rows:
        if verify_api_key_bcrypt(req.api_key, api_key_obj.secret_key):
            # Match found — issue JWT
            token = create_short_jwt(
                user_id=str(company.id),
                email=company.email,
            )

            # Update last_used_at
            api_key_obj.last_used_at = datetime.now(timezone.utc)
            await db.commit()

            redirect_url = f"{FRONTEND_URL}/auth/verify?token={token}"

            return success_response({
                "token":        token,
                "redirect_url": redirect_url,
                "expires_in":   900,          # 15 min in seconds
                "user_id":      str(company.id),
                "email":        company.email,
            })

    return error_response("Invalid API key", status_code=401)


# ── POST /auth/verify ──────────────────────────────────────────────────────

@router.post("/verify")
async def verify_token(req: VerifyTokenRequest):
    """
    Verify a short-lived JWT issued by /token-from-key.

    Checks:
      - Signature is valid (HS256 / SECRET_KEY)
      - Token has not expired (15-min window)
      - purpose == "dashboard_login"
    """
    try:
        payload = decode_jwt(req.token)
    except JWTError as e:
        return error_response(f"Invalid or expired token: {e}", status_code=401)

    if payload.get("purpose") != "dashboard_login":
        return error_response("Token was not issued for dashboard login", status_code=403)

    return success_response({
        "user_id": payload["sub"],
        "email":   payload["email"],
        "purpose": payload["purpose"],
        "issued_at":  payload.get("iat"),
        "expires_at": payload.get("exp"),
    })
