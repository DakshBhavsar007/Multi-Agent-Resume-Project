from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from datetime import datetime, timedelta
import secrets

from models.database import get_db, DeveloperAccount, DeveloperAPIKey, APIUsageLog, MonthlyUsageSummary
from models.schemas import success_response, error_response
from dependencies import verify_developer_jwt

router = APIRouter()

TIER_KEY_LIMITS = {
    "free": 2,
    "starter": 5,
    "business": -1,
    "enterprise": -1
}


@router.get("/")
async def list_keys(
    dev: DeveloperAccount = Depends(verify_developer_jwt),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(DeveloperAPIKey).where(
            DeveloperAPIKey.developer_id == dev.id,
            DeveloperAPIKey.is_active == True
        )
    )
    keys = res.scalars().all()

    year_month = datetime.now().strftime("%Y-%m")

    test_keys = []
    production_keys = []

    for k in keys:
        usage_res = await db.execute(
            select(MonthlyUsageSummary).where(
                MonthlyUsageSummary.developer_id == dev.id,
                MonthlyUsageSummary.year_month == year_month
            )
        )
        usage = usage_res.scalar_one_or_none()
        this_month_calls = 0
        if usage:
            this_month_calls = (usage.parse_count or 0) + (usage.match_count or 0) + (usage.chat_count or 0)

        key_data = {
            "id": str(k.id),
            "key_name": k.key_name,
            "environment": k.environment,
            "secret_key_masked": k.secret_key[:12] + "••••••••",
            "public_key": k.public_key,
            "last_used_at": k.last_used_at.isoformat() if k.last_used_at else None,
            "created_at": k.created_at.isoformat() if k.created_at else None,
            "this_month_calls": this_month_calls
        }

        if k.environment == "test":
            test_keys.append(key_data)
        else:
            production_keys.append(key_data)

    return success_response({
        "test_keys": test_keys,
        "production_keys": production_keys
    })


class GenerateKeyRequest(BaseModel):
    key_name: str
    environment: str = "test"


@router.post("/generate")
async def generate_key(
    req: GenerateKeyRequest,
    dev: DeveloperAccount = Depends(verify_developer_jwt),
    db: AsyncSession = Depends(get_db)
):
    count_res = await db.execute(
        select(func.count(DeveloperAPIKey.id)).where(
            DeveloperAPIKey.developer_id == dev.id,
            DeveloperAPIKey.is_active == True
        )
    )
    current_count = count_res.scalar() or 0
    limit = TIER_KEY_LIMITS.get(dev.tier, 2)

    if limit != -1 and current_count >= limit:
        return error_response(f"Key limit reached for {dev.tier} plan")

    if req.environment == "test":
        secret = "vish_test_" + secrets.token_urlsafe(24)
    else:
        secret = "vish_live_" + secrets.token_urlsafe(24)
    public = "vish_pub_" + secrets.token_urlsafe(24)

    new_key = DeveloperAPIKey(
        developer_id=dev.id,
        key_name=req.key_name,
        secret_key=secret,
        public_key=public,
        environment=req.environment
    )
    db.add(new_key)
    await db.commit()
    await db.refresh(new_key)

    return success_response({
        "id": str(new_key.id),
        "key_name": new_key.key_name,
        "environment": new_key.environment,
        "secret_key": secret,
        "public_key": public,
        "message": "Save your secret key — shown only once"
    })


@router.post("/{key_id}/rotate")
async def rotate_key(
    key_id: str,
    dev: DeveloperAccount = Depends(verify_developer_jwt),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(DeveloperAPIKey).where(
            DeveloperAPIKey.id == key_id,
            DeveloperAPIKey.developer_id == dev.id
        )
    )
    key = res.scalar_one_or_none()
    if not key:
        return error_response("API Key not found")

    if key.environment == "test":
        new_secret = "vish_test_" + secrets.token_urlsafe(24)
    else:
        new_secret = "vish_live_" + secrets.token_urlsafe(24)

    key.secret_key = new_secret
    await db.commit()

    return success_response({
        "id": str(key.id),
        "secret_key": new_secret,
        "message": "Key rotated. Old secret is now invalid. Save this — shown only once"
    })


@router.delete("/{key_id}")
async def revoke_key(
    key_id: str,
    dev: DeveloperAccount = Depends(verify_developer_jwt),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(DeveloperAPIKey).where(
            DeveloperAPIKey.id == key_id,
            DeveloperAPIKey.developer_id == dev.id
        )
    )
    key = res.scalar_one_or_none()
    if not key:
        return error_response("API Key not found")

    key.is_active = False
    await db.commit()

    return success_response({"message": "Key revoked"})


class RenameKeyRequest(BaseModel):
    key_name: str


@router.patch("/{key_id}")
async def rename_key(
    key_id: str,
    req: RenameKeyRequest,
    dev: DeveloperAccount = Depends(verify_developer_jwt),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(DeveloperAPIKey).where(
            DeveloperAPIKey.id == key_id,
            DeveloperAPIKey.developer_id == dev.id
        )
    )
    key = res.scalar_one_or_none()
    if not key:
        return error_response("API Key not found")

    key.key_name = req.key_name
    await db.commit()

    return success_response({"message": "Key renamed", "key_name": key.key_name})


@router.get("/{key_id}/usage")
async def key_usage(
    key_id: str,
    period: str = Query("7d"),
    dev: DeveloperAccount = Depends(verify_developer_jwt),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(DeveloperAPIKey).where(
            DeveloperAPIKey.id == key_id,
            DeveloperAPIKey.developer_id == dev.id
        )
    )
    key = res.scalar_one_or_none()
    if not key:
        return error_response("API Key not found")

    days = int(period.replace("d", ""))
    cutoff = datetime.utcnow() - timedelta(days=days)

    logs_res = await db.execute(
        select(APIUsageLog).where(
            APIUsageLog.api_key_id == key.id,
            APIUsageLog.timestamp >= cutoff
        )
    )
    logs = logs_res.scalars().all()

    # Group by date
    daily = {}
    endpoint_counts = {}
    total_latency = 0
    total_calls = len(logs)

    for log in logs:
        day_str = log.timestamp.strftime("%Y-%m-%d") if log.timestamp else "unknown"
        daily[day_str] = daily.get(day_str, 0) + 1

        ep = log.endpoint or "unknown"
        endpoint_counts[ep] = endpoint_counts.get(ep, 0) + 1

        total_latency += log.latency_ms or 0

    # Top 10 endpoints
    top_endpoints = sorted(endpoint_counts.items(), key=lambda x: x[1], reverse=True)[:10]

    avg_latency = round(total_latency / total_calls, 1) if total_calls > 0 else 0

    return success_response({
        "daily_breakdown": daily,
        "total_calls": total_calls,
        "top_endpoints": [{"endpoint": ep, "count": cnt} for ep, cnt in top_endpoints],
        "avg_latency_ms": avg_latency
    })
