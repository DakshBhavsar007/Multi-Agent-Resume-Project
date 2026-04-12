import httpx
import hmac
import hashlib
import json
from datetime import datetime
from sqlalchemy.future import select
from models.database import Webhook, WebhookDeliveryLog


class WebhookService:

    async def trigger(self, developer_id: str, event: str, data: dict, db):
        """
        Called after significant events.
        Fetches all active webhooks for developer
        where event in webhook.events.
        Delivers to each webhook URL.
        Logs all delivery attempts.
        """
        webhooks = await self._get_webhooks(developer_id, event, db)

        for webhook in webhooks:
            await self._deliver(webhook, event, data, db)

    async def _deliver(self, webhook, event, data, db):
        payload = {
            "event": event,
            "timestamp": datetime.now().isoformat(),
            "data": data
        }

        sig = hmac.new(
            webhook.secret.encode(),
            json.dumps(payload, default=str).encode(),
            hashlib.sha256
        ).hexdigest()

        success = False
        status_code = None
        response_body = None
        error_msg = None

        try:
            async with httpx.AsyncClient() as client:
                r = await client.post(
                    webhook.url,
                    json=payload,
                    headers={
                        "X-Vishleshan-Signature": f"sha256={sig}",
                        "X-Vishleshan-Event": event,
                        "Content-Type": "application/json"
                    },
                    timeout=10.0
                )
                status_code = r.status_code
                response_body = r.text[:500]
                success = r.status_code < 400
        except Exception as e:
            response_body = str(e)[:500]
            error_msg = str(e)[:500]
            success = False

        # Log to webhook_delivery_logs table
        log = WebhookDeliveryLog(
            webhook_id=webhook.id,
            event_type=event,
            payload=payload,
            status_code=status_code,
            response_body=response_body,
            error=error_msg
        )
        db.add(log)

        if not success:
            webhook.failure_count = (webhook.failure_count or 0) + 1

        webhook.last_triggered_at = datetime.utcnow()
        await db.commit()

    async def _get_webhooks(self, developer_id, event, db):
        """
        Query webhooks where developer_id matches
        AND is_active=True
        AND event in events JSONB array.
        """
        res = await db.execute(
            select(Webhook).where(
                Webhook.developer_id == developer_id,
                Webhook.is_active == True
            )
        )
        all_webhooks = res.scalars().all()

        # Filter by event presence in events JSONB list
        matched = []
        for w in all_webhooks:
            if w.events and event in w.events:
                matched.append(w)

        return matched


webhook_service = WebhookService()
