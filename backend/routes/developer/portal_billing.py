from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import datetime
import os
import hmac
import hashlib

from models.database import get_db, DeveloperAccount, BillingSubscription
from models.schemas import success_response, error_response
from dependencies import verify_developer_jwt

router = APIRouter()

PLAN_DETAILS = {
    "free": {
        "price_monthly": 0,
        "currency": "INR",
        "limits": {"parse": 100, "match": 50, "chat": 20, "keys": 2},
        "features": [
            "100 parses/month",
            "50 matches/month",
            "2 API keys",
            "Community support",
            "Direct upload only"
        ]
    },
    "starter": {
        "price_monthly": 2999,
        "currency": "INR",
        "limits": {"parse": 1000, "match": 500, "chat": 200, "keys": 5},
        "features": [
            "1,000 parses/month",
            "500 matches/month",
            "5 API keys",
            "Webhooks",
            "All upload methods",
            "Email support",
            "Batch processing"
        ]
    },
    "business": {
        "price_monthly": 9999,
        "currency": "INR",
        "limits": {"parse": 10000, "match": -1, "chat": -1, "keys": -1},
        "features": [
            "10,000 parses/month",
            "Unlimited matching",
            "Unlimited API keys",
            "Embed widget",
            "Priority support",
            "Custom weights",
            "Advanced analytics"
        ]
    }
}

RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")


@router.get("/plans")
async def get_plans():
    formatted_plans = []
    for plan_id, details in PLAN_DETAILS.items():
        formatted_plans.append({
            "id": plan_id,
            "name": plan_id.capitalize(),
            "price": details["price_monthly"],
            "features": details["features"]
        })
    return success_response(formatted_plans)


class SubscribeRequest(BaseModel):
    plan: str


@router.post("/subscribe")
async def subscribe(
    req: SubscribeRequest,
    dev: DeveloperAccount = Depends(verify_developer_jwt),
    db: AsyncSession = Depends(get_db)
):
    if req.plan not in PLAN_DETAILS or req.plan == "free":
        return error_response("Invalid plan. Choose starter or business")

    plan_info = PLAN_DETAILS[req.plan]
    amount = plan_info["price_monthly"] * 100  # paise

    try:
        import razorpay
        client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
        order = client.order.create({
            "amount": amount,
            "currency": "INR",
            "receipt": f"vish_{str(dev.id)[:8]}"
        })
    except Exception as e:
        return error_response(f"Payment gateway error: {str(e)}")

    return success_response({
        "order_id": order["id"],
        "amount": amount,
        "currency": "INR",
        "razorpay_key_id": RAZORPAY_KEY_ID
    })


class VerifyPaymentRequest(BaseModel):
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str
    plan: str


@router.post("/verify-payment")
async def verify_payment(
    req: VerifyPaymentRequest,
    dev: DeveloperAccount = Depends(verify_developer_jwt),
    db: AsyncSession = Depends(get_db)
):
    msg = f"{req.razorpay_order_id}|{req.razorpay_payment_id}".encode()
    expected = hmac.new(
        RAZORPAY_KEY_SECRET.encode(), msg, hashlib.sha256
    ).hexdigest()

    if expected != req.razorpay_signature:
        return error_response("Invalid payment signature")

    dev.tier = req.plan
    await db.commit()

    # Upsert billing subscription
    res = await db.execute(
        select(BillingSubscription).where(
            BillingSubscription.developer_id == dev.id
        )
    )
    sub = res.scalar_one_or_none()

    if sub:
        sub.plan = req.plan
        sub.status = "active"
        sub.payment_id = req.razorpay_payment_id
    else:
        sub = BillingSubscription(
            developer_id=dev.id,
            plan=req.plan,
            status="active",
            payment_id=req.razorpay_payment_id
        )
        db.add(sub)

    await db.commit()

    return success_response({"new_tier": req.plan, "message": "Subscription activated"})


@router.get("/current")
async def current_subscription(
    dev: DeveloperAccount = Depends(verify_developer_jwt),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(BillingSubscription).where(
            BillingSubscription.developer_id == dev.id
        )
    )
    sub = res.scalar_one_or_none()

    if not sub:
        return success_response({
            "plan": dev.tier,
            "status": "active",
            "limits": PLAN_DETAILS.get(dev.tier, PLAN_DETAILS["free"])["limits"],
            "days_remaining": None
        })

    days_remaining = None
    if sub.current_period_end:
        delta = sub.current_period_end - datetime.utcnow()
        days_remaining = max(0, delta.days)

    return success_response({
        "plan": sub.plan,
        "status": sub.status,
        "payment_id": sub.payment_id,
        "limits": PLAN_DETAILS.get(sub.plan, PLAN_DETAILS["free"])["limits"],
        "days_remaining": days_remaining,
        "created_at": sub.created_at.isoformat() if sub.created_at else None
    })
