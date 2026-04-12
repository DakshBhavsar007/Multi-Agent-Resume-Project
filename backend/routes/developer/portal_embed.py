from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import datetime, timedelta
from jose import jwt
import secrets
import os
from urllib.parse import urlparse

from models.database import get_db, DeveloperAccount, EmbedToken
from models.schemas import success_response, error_response
from dependencies import verify_developer_jwt, JWT_SECRET, JWT_ALGORITHM

router = APIRouter()


@router.get("/tokens")
async def list_embed_tokens(
    dev: DeveloperAccount = Depends(verify_developer_jwt),
    db: AsyncSession = Depends(get_db)
):
    if dev.tier not in ["business", "enterprise"]:
        return error_response("Embed widget requires Business plan or above. Please upgrade.")

    res = await db.execute(
        select(EmbedToken).where(
            EmbedToken.developer_id == dev.id,
            EmbedToken.is_active == True
        )
    )
    tokens = res.scalars().all()

    return success_response([
        {
            "id": str(t.id),
            "token": t.token,
            "allowed_domain": t.allowed_domain,
            "permissions": t.permissions,
            "is_active": t.is_active,
            "created_at": t.created_at.isoformat() if t.created_at else None
        }
        for t in tokens
    ])


class CreateEmbedTokenRequest(BaseModel):
    allowed_domain: str
    permissions: Optional[List[str]] = ["view_candidates", "chat"]


@router.post("/tokens")
async def create_embed_token(
    req: CreateEmbedTokenRequest,
    dev: DeveloperAccount = Depends(verify_developer_jwt),
    db: AsyncSession = Depends(get_db)
):
    if dev.tier not in ["business", "enterprise"]:
        return error_response("Embed widget requires Business plan or above. Please upgrade.")

    # Clean domain
    domain = req.allowed_domain.strip()
    domain = domain.replace("http://", "").replace("https://", "")
    domain = domain.rstrip("/")

    token_value = "vish_embed_" + secrets.token_urlsafe(32)

    embed_token = EmbedToken(
        developer_id=dev.id,
        token=token_value,
        allowed_domain=domain,
        permissions=req.permissions,
        is_active=True
    )
    db.add(embed_token)
    await db.commit()
    await db.refresh(embed_token)

    html_snippet = f"""<div id="vishleshan-panel"></div>
<script src="https://cdn.vishleshan.ai/embed.js"></script>
<script>
Vishleshan.init({{
  token: "{token_value}",
  container: "#vishleshan-panel",
  theme: "light"
}});
</script>"""

    return success_response({
        "id": str(embed_token.id),
        "token": token_value,
        "allowed_domain": domain,
        "permissions": req.permissions,
        "html_snippet": html_snippet
    })


@router.delete("/tokens/{token_id}")
async def revoke_embed_token(
    token_id: str,
    dev: DeveloperAccount = Depends(verify_developer_jwt),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(EmbedToken).where(
            EmbedToken.id == token_id,
            EmbedToken.developer_id == dev.id
        )
    )
    token = res.scalar_one_or_none()
    if not token:
        return error_response("Embed token not found")

    token.is_active = False
    await db.commit()

    return success_response({"message": "Embed token revoked"})


@router.get("/validate")
async def validate_embed_token(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    embed_token = request.headers.get("X-Embed-Token")
    origin = request.headers.get("Origin", "")

    if not embed_token:
        return error_response("Missing X-Embed-Token header")

    res = await db.execute(
        select(EmbedToken).where(
            EmbedToken.token == embed_token,
            EmbedToken.is_active == True
        )
    )
    token = res.scalar_one_or_none()
    if not token:
        return error_response("Invalid or revoked embed token")

    # Extract domain from origin
    if origin:
        parsed = urlparse(origin)
        request_domain = parsed.hostname or ""
    else:
        request_domain = ""

    # Validate domain
    if token.allowed_domain and token.allowed_domain not in request_domain:
        return error_response("Domain not authorized for this embed token")

    # Generate short-lived JWT (1 hour)
    payload = {
        "developer_id": str(token.developer_id),
        "embed_token_id": str(token.id),
        "permissions": token.permissions,
        "exp": datetime.utcnow() + timedelta(hours=1)
    }
    short_jwt = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

    return success_response({
        "valid": True,
        "jwt": short_jwt,
        "permissions": token.permissions,
        "expires_in": 3600
    })
