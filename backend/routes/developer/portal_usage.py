from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import Optional

from models.database import get_db, DeveloperAccount, APIUsageLog, MonthlyUsageSummary, DeveloperAPIKey
from models.schemas import success_response, error_response
from dependencies import verify_developer_jwt

router = APIRouter()

TIER_LIMITS_MAP = {
    "free": {"parse": 100, "match": 50, "chat": 20},
    "starter": {"parse": 1000, "match": 500, "chat": 200},
    "business": {"parse": 10000, "match": -1, "chat": -1},
    "enterprise": {"parse": -1, "match": -1, "chat": -1}
}


@router.get("/summary")
async def usage_summary(
    dev: DeveloperAccount = Depends(verify_developer_jwt),
    db: AsyncSession = Depends(get_db)
):
    year_month = datetime.now().strftime("%Y-%m")

    res = await db.execute(
        select(MonthlyUsageSummary).where(
            MonthlyUsageSummary.developer_id == dev.id,
            MonthlyUsageSummary.year_month == year_month
        )
    )
    summary = res.scalar_one_or_none()

    parse_count = summary.parse_count if summary else 0
    match_count = summary.match_count if summary else 0
    chat_count = summary.chat_count if summary else 0
    total_calls = (summary.total_api_calls if summary and hasattr(summary, 'total_api_calls') else 0) or (parse_count + match_count + chat_count)

    limits_map = TIER_LIMITS_MAP.get(dev.tier, TIER_LIMITS_MAP["free"])

    def calc_pct(count, limit):
        if limit == -1:
            return 0
        return min(round(count / limit * 100, 1), 100) if limit > 0 else 0

    percentages = {
        "parse": calc_pct(parse_count, limits_map["parse"]),
        "match": calc_pct(match_count, limits_map["match"]),
        "chat": calc_pct(chat_count, limits_map["chat"])
    }

    limits = {
        "parse": {"count": parse_count, "limit": limits_map["parse"]},
        "match": {"count": match_count, "limit": limits_map["match"]},
        "chat": {"count": chat_count, "limit": limits_map["chat"]}
    }

    overage = any(p > 100 for p in percentages.values())
    
    # Active keys sum
    res_keys = await db.execute(select(func.count(DeveloperAPIKey.id)).where(DeveloperAPIKey.developer_id == dev.id, DeveloperAPIKey.is_active == True))
    active_keys = res_keys.scalar() or 0

    # Avg Latency for recent
    cutoff = datetime.utcnow() - timedelta(days=30)
    res_lat = await db.execute(select(func.avg(APIUsageLog.latency_ms)).where(APIUsageLog.developer_id == dev.id, APIUsageLog.timestamp >= cutoff))
    avg_latency = float(res_lat.scalar() or 0)

    # Recent Logs
    res_logs = await db.execute(select(APIUsageLog).where(APIUsageLog.developer_id == dev.id).order_by(APIUsageLog.timestamp.desc()).limit(5))
    logs = res_logs.scalars().all()
    recent_logs = []
    
    import math
    def time_ago(dt):
        if not dt: return "unknown"
        diff = datetime.utcnow() - dt
        s = diff.total_seconds()
        if s < 60: return "just now"
        if s < 3600: return f"{math.floor(s/60)}m ago"
        if s < 86400: return f"{math.floor(s/3600)}h ago"
        return f"{math.floor(s/86400)}d ago"
        
    for log in logs:
        recent_logs.append({
            "method": "POST" if log.action_type in ("parse", "match", "chat") else "GET",
            "endpoint": log.endpoint,
            "latency_ms": log.latency_ms,
            "status": log.status_code,
            "time_ago": time_ago(log.timestamp)
        })
        
    calls_by_type = {
        "parse": parse_count,
        "match": match_count,
        "chat": chat_count,
        "export": summary.export_count if summary else 0
    }

    return success_response({
        "current_month": year_month,
        "parse_count": parse_count,
        "match_count": match_count,
        "chat_count": chat_count,
        "total_calls": total_calls,
        "limits": limits,
        "percentages": percentages,
        "overage": overage,
        "active_keys": active_keys,
        "avg_latency_ms": avg_latency,
        "calls_by_type": calls_by_type,
        "recent_logs": recent_logs
    })


@router.get("/timeline")
async def usage_timeline(
    days: int = Query(30, ge=1, le=365),
    action_type: Optional[str] = None,
    dev: DeveloperAccount = Depends(verify_developer_jwt),
    db: AsyncSession = Depends(get_db)
):
    cutoff = datetime.utcnow() - timedelta(days=days)

    query = select(APIUsageLog).where(
        APIUsageLog.developer_id == dev.id,
        APIUsageLog.timestamp >= cutoff
    )
    if action_type:
        query = query.where(APIUsageLog.action_type == action_type)

    res = await db.execute(query)
    logs = res.scalars().all()

    # Group by date and action
    daily_data = {}
    for log in logs:
        day_str = log.timestamp.strftime("%Y-%m-%d") if log.timestamp else "unknown"
        if day_str not in daily_data:
            daily_data[day_str] = {"parse": 0, "match": 0, "chat": 0, "total": 0}
        action = log.action_type or "other"
        if action in daily_data[day_str]:
            daily_data[day_str][action] += 1
        daily_data[day_str]["total"] += 1

    # Fill missing dates with zeros
    timeline = []
    current = datetime.utcnow() - timedelta(days=days)
    while current <= datetime.utcnow():
        day_str = current.strftime("%Y-%m-%d")
        entry = daily_data.get(day_str, {"parse": 0, "match": 0, "chat": 0, "total": 0})
        timeline.append({"date": day_str, **entry})
        current += timedelta(days=1)

    return success_response({"timeline": timeline})


@router.get("/endpoints")
async def usage_endpoints(
    period: str = Query("30d"),
    dev: DeveloperAccount = Depends(verify_developer_jwt),
    db: AsyncSession = Depends(get_db)
):
    days = int(period.replace("d", ""))
    cutoff = datetime.utcnow() - timedelta(days=days)

    res = await db.execute(
        select(APIUsageLog).where(
            APIUsageLog.developer_id == dev.id,
            APIUsageLog.timestamp >= cutoff
        )
    )
    logs = res.scalars().all()

    endpoint_data = {}
    for log in logs:
        ep = log.endpoint or "unknown"
        if ep not in endpoint_data:
            endpoint_data[ep] = {"count": 0, "total_latency": 0, "errors": 0}
        endpoint_data[ep]["count"] += 1
        endpoint_data[ep]["total_latency"] += log.latency_ms or 0
        status = log.status_code or 200
        if status >= 400:
            endpoint_data[ep]["errors"] += 1

    endpoints = []
    for ep, data in sorted(endpoint_data.items(), key=lambda x: x[1]["count"], reverse=True)[:10]:
        avg_latency = round(data["total_latency"] / data["count"], 1) if data["count"] > 0 else 0
        error_rate = round(data["errors"] / data["count"] * 100, 1) if data["count"] > 0 else 0
        endpoints.append({
            "endpoint": ep,
            "count": data["count"],
            "avg_latency_ms": avg_latency,
            "error_rate": error_rate
        })

    return success_response({"endpoints": endpoints})


@router.get("/history")
async def usage_history(
    months: int = Query(6, ge=1, le=24),
    dev: DeveloperAccount = Depends(verify_developer_jwt),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(MonthlyUsageSummary)
        .where(MonthlyUsageSummary.developer_id == dev.id)
        .order_by(MonthlyUsageSummary.year_month.desc())
        .limit(months)
    )
    rows = res.scalars().all()

    result = []
    for r in rows:
        result.append({
            "year_month": r.year_month,
            "parse": r.parse_count or 0,
            "match": r.match_count or 0,
            "chat": r.chat_count or 0,
            "total": (r.parse_count or 0) + (r.match_count or 0) + (r.chat_count or 0)
        })

    return success_response({"months": result})
