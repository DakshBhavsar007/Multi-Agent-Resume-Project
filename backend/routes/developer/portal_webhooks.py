from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import datetime
import secrets
import httpx

from models.database import get_db, DeveloperAccount, Webhook, WebhookDeliveryLog
from models.schemas import success_response, error_response
from dependencies import verify_developer_jwt

router = APIRouter()

VALID_EVENTS = [
    "resume.parsed",
    "batch.completed",
    "match.done",
    "candidate.hired",
    "candidate.rejected",
    "session.created"
]


@router.get("/")
async def list_webhooks(
    dev: DeveloperAccount = Depends(verify_developer_jwt),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(Webhook).where(Webhook.developer_id == dev.id)
    )
    webhooks = res.scalars().all()

    result = []
    for w in webhooks:
        # Get last 100 deliveries for success rate
        log_res = await db.execute(
            select(WebhookDeliveryLog)
            .where(WebhookDeliveryLog.webhook_id == w.id)
            .order_by(WebhookDeliveryLog.created_at.desc())
            .limit(100)
        )
        logs = log_res.scalars().all()
        total_deliveries = len(logs)
        successful = sum(1 for l in logs if l.status_code and 200 <= l.status_code < 300)
        success_rate = round(successful / total_deliveries * 100, 1) if total_deliveries > 0 else 0

        last_status = None
        if logs:
            last_status = logs[0].status_code

        result.append({
            "id": str(w.id),
            "url": w.url,
            "events": w.events,
            "is_active": w.is_active,
            "last_delivery_status": last_status,
            "success_rate": success_rate,
            "created_at": w.created_at.isoformat() if w.created_at else None
        })

    return success_response(result)


class CreateWebhookRequest(BaseModel):
    url: str
    events: List[str]


@router.post("/")
async def create_webhook(
    req: CreateWebhookRequest,
    dev: DeveloperAccount = Depends(verify_developer_jwt),
    db: AsyncSession = Depends(get_db)
):
    if dev.tier == "free":
        return error_response("Webhooks require Starter plan or above")

    # Validate events
    invalid = [e for e in req.events if e not in VALID_EVENTS]
    if invalid:
        return error_response(f"Invalid events: {', '.join(invalid)}. Valid: {', '.join(VALID_EVENTS)}")

    secret = secrets.token_hex(32)

    webhook = Webhook(
        developer_id=dev.id,
        url=req.url,
        events=req.events,
        secret=secret,
        is_active=True
    )
    db.add(webhook)
    await db.commit()
    await db.refresh(webhook)

    return success_response({
        "id": str(webhook.id),
        "url": webhook.url,
        "events": webhook.events,
        "secret": secret,
        "message": "Save your webhook secret — shown only once"
    })


@router.delete("/{webhook_id}")
async def delete_webhook(
    webhook_id: str,
    dev: DeveloperAccount = Depends(verify_developer_jwt),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(Webhook).where(
            Webhook.id == webhook_id,
            Webhook.developer_id == dev.id
        )
    )
    webhook = res.scalar_one_or_none()
    if not webhook:
        return error_response("Webhook not found")

    await db.delete(webhook)
    await db.commit()

    return success_response({"message": "Webhook deleted"})


class UpdateWebhookRequest(BaseModel):
    url: Optional[str] = None
    events: Optional[List[str]] = None
    is_active: Optional[bool] = None


@router.patch("/{webhook_id}")
async def update_webhook(
    webhook_id: str,
    req: UpdateWebhookRequest,
    dev: DeveloperAccount = Depends(verify_developer_jwt),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(Webhook).where(
            Webhook.id == webhook_id,
            Webhook.developer_id == dev.id
        )
    )
    webhook = res.scalar_one_or_none()
    if not webhook:
        return error_response("Webhook not found")

    if req.url is not None:
        webhook.url = req.url
    if req.events is not None:
        invalid = [e for e in req.events if e not in VALID_EVENTS]
        if invalid:
            return error_response(f"Invalid events: {', '.join(invalid)}")
        webhook.events = req.events
    if req.is_active is not None:
        webhook.is_active = req.is_active

    await db.commit()

    return success_response({
        "id": str(webhook.id),
        "url": webhook.url,
        "events": webhook.events,
        "is_active": webhook.is_active
    })


@router.post("/{webhook_id}/test")
async def test_webhook(
    webhook_id: str,
    dev: DeveloperAccount = Depends(verify_developer_jwt),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(Webhook).where(
            Webhook.id == webhook_id,
            Webhook.developer_id == dev.id
        )
    )
    webhook = res.scalar_one_or_none()
    if not webhook:
        return error_response("Webhook not found")

    test_payload = {
        "event": "test",
        "timestamp": datetime.utcnow().isoformat(),
        "data": {
            "message": "This is a test webhook delivery from Vishleshan",
            "webhook_id": str(webhook.id)
        }
    }

    status_code = None
    response_body = None
    error_msg = None

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(webhook.url, json=test_payload)
            status_code = resp.status_code
            response_body = resp.text[:500]
    except Exception as e:
        error_msg = str(e)
        status_code = 0

    log = WebhookDeliveryLog(
        webhook_id=webhook.id,
        event_type="test",
        payload=test_payload,
        status_code=status_code,
        response_body=response_body,
        error=error_msg
    )
    db.add(log)
    await db.commit()

    return success_response({
        "delivered": status_code is not None and 200 <= status_code < 300,
        "status_code": status_code,
        "response_body": response_body,
        "error": error_msg
    })


@router.get("/{webhook_id}/logs")
async def webhook_logs(
    webhook_id: str,
    limit: int = Query(50, ge=1, le=200),
    dev: DeveloperAccount = Depends(verify_developer_jwt),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(Webhook).where(
            Webhook.id == webhook_id,
            Webhook.developer_id == dev.id
        )
    )
    webhook = res.scalar_one_or_none()
    if not webhook:
        return error_response("Webhook not found")

    log_res = await db.execute(
        select(WebhookDeliveryLog)
        .where(WebhookDeliveryLog.webhook_id == webhook.id)
        .order_by(WebhookDeliveryLog.created_at.desc())
        .limit(limit)
    )
    logs = log_res.scalars().all()

    return success_response([
        {
            "id": str(l.id),
            "event_type": l.event_type,
            "status_code": l.status_code,
            "response_body": l.response_body,
            "error": l.error,
            "created_at": l.created_at.isoformat() if l.created_at else None
        }
        for l in logs
    ])
