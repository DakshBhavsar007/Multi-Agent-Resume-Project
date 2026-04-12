from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update
from datetime import datetime
import time
import asyncio

from models.database import (
    AsyncSessionLocal, DeveloperAPIKey, APIUsageLog, MonthlyUsageSummary
)


class UsageLoggerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        start = time.time()
        response = await call_next(request)
        latency = int((time.time() - start) * 1000)

        path = request.url.path
        if not path.startswith("/api/v1"):
            return response

        api_key = request.headers.get("X-API-Key", "")
        if not api_key:
            return response

        action = self._infer_action(path)

        asyncio.create_task(
            self._log_usage(api_key, path, action, response.status_code, latency)
        )

        return response

    def _infer_action(self, path: str) -> str:
        if "ingest" in path or "upload" in path:
            return "parse"
        elif "match" in path:
            return "match"
        elif "chat" in path:
            return "chat"
        elif "export" in path:
            return "export"
        else:
            return "other"

    async def _log_usage(self, api_key: str, endpoint: str,
                         action: str, status: int, latency: int):
        try:
            async with AsyncSessionLocal() as db:
                # Find key record
                res = await db.execute(
                    select(DeveloperAPIKey).where(
                        DeveloperAPIKey.secret_key == api_key,
                        DeveloperAPIKey.is_active == True
                    )
                )
                key_record = res.scalar_one_or_none()
                if not key_record:
                    return

                # Log usage
                log = APIUsageLog(
                    developer_id=key_record.developer_id,
                    api_key_id=key_record.id,
                    endpoint=endpoint,
                    action_type=action,
                    status_code=status,
                    latency_ms=latency
                )
                db.add(log)

                # Upsert monthly_usage_summary
                year_month = datetime.now().strftime("%Y-%m")
                summary_res = await db.execute(
                    select(MonthlyUsageSummary).where(
                        MonthlyUsageSummary.developer_id == key_record.developer_id,
                        MonthlyUsageSummary.year_month == year_month
                    )
                )
                summary = summary_res.scalar_one_or_none()

                if summary:
                    if action == "parse":
                        summary.parse_count = (summary.parse_count or 0) + 1
                    elif action == "match":
                        summary.match_count = (summary.match_count or 0) + 1
                    elif action == "chat":
                        summary.chat_count = (summary.chat_count or 0) + 1
                    elif action == "export":
                        summary.export_count = (summary.export_count or 0) + 1
                    summary.total_api_calls = (summary.total_api_calls or 0) + 1
                else:
                    summary = MonthlyUsageSummary(
                        developer_id=key_record.developer_id,
                        year_month=year_month,
                        parse_count=1 if action == "parse" else 0,
                        match_count=1 if action == "match" else 0,
                        chat_count=1 if action == "chat" else 0,
                        export_count=1 if action == "export" else 0,
                        total_api_calls=1
                    )
                    db.add(summary)

                await db.commit()
        except Exception:
            pass  # Never let logging crash the request
