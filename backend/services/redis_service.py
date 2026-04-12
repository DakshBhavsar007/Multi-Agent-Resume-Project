import redis
import os
import json
import calendar
from datetime import datetime


class RedisService:
    def __init__(self):
        self.client = redis.from_url(
            os.getenv("REDIS_URL", "redis://localhost:6379"),
            decode_responses=True
        )

    def ping(self) -> bool:
        try:
            return self.client.ping()
        except:
            return False

    # ── Rate limiting ──

    def get_usage(self, key: str, month: str, action: str) -> int:
        redis_key = f"rl:{key}:{month}:{action}"
        val = self.client.get(redis_key)
        return int(val) if val else 0

    def increment_usage(self, key: str, month: str, action: str) -> int:
        redis_key = f"rl:{key}:{month}:{action}"
        count = self.client.incr(redis_key)
        if count == 1:
            # Set expiry to end of month
            now = datetime.now()
            days_in_month = calendar.monthrange(now.year, now.month)[1]
            seconds_left = (days_in_month - now.day) * 86400
            self.client.expire(redis_key, max(seconds_left, 86400))
        return count

    # ── Job status caching ──

    def cache_job(self, job_id: str, data: dict, ttl: int = 300):
        self.client.setex(f"job:{job_id}", ttl, json.dumps(data, default=str))

    def get_cached_job(self, job_id: str) -> dict | None:
        val = self.client.get(f"job:{job_id}")
        return json.loads(val) if val else None

    # ── Gmail processed emails (avoid re-fetching) ──

    def mark_email_processed(self, session_id: str, msg_id: str):
        key = f"gmail:{session_id}:processed"
        self.client.sadd(key, msg_id)
        self.client.expire(key, 86400 * 30)

    def is_email_processed(self, session_id: str, msg_id: str) -> bool:
        return self.client.sismember(
            f"gmail:{session_id}:processed", msg_id
        )


redis_service = RedisService()
