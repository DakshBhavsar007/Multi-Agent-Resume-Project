import json
import secrets
import httpx
from datetime import datetime
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from api.models import Webhook, WebhookDeliveryLog
from api.decorators import require_developer_jwt
from models.schemas import success_response, error_response

VALID_EVENTS = [
    "resume.parsed",
    "batch.completed",
    "match.done",
    "candidate.hired",
    "candidate.rejected",
    "session.created"
]

@csrf_exempt
@require_developer_jwt
def webhooks_root(request):
    """Handles GET / (list webhooks) and POST / (create webhook)"""
    dev = request.developer
    
    if request.method == "GET":
        try:
            webhooks = Webhook.objects.filter(developer_id=dev.id)
            result = []
            for w in webhooks:
                # Get last 100 deliveries for success rate
                logs = WebhookDeliveryLog.objects.filter(webhook_id=w.id).order_by("-created_at")[:100]
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

            return JsonResponse(success_response(result))
        except Exception as e:
            return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)

    elif request.method == "POST":
        try:
            if dev.tier == "free":
                return JsonResponse(error_response("Webhooks require Starter plan or above"), status=400)

            data = json.loads(request.body)
            url = data.get("url")
            events = data.get("events", [])
            
            if not url or not events:
                return JsonResponse(error_response("url and events are required"), status=400)

            # Validate events
            invalid = [e for e in events if e not in VALID_EVENTS]
            if invalid:
                return JsonResponse(error_response(f"Invalid events: {', '.join(invalid)}. Valid: {', '.join(VALID_EVENTS)}"), status=400)

            secret = secrets.token_hex(32)

            webhook = Webhook.objects.create(
                developer=dev,
                url=url,
                events=events,
                secret=secret,
                is_active=True
            )

            return JsonResponse(success_response({
                "id": str(webhook.id),
                "url": webhook.url,
                "events": webhook.events,
                "secret": secret,
                "message": "Save your webhook secret — shown only once"
            }))
        except Exception as e:
            return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)
    else:
        return JsonResponse(error_response("Method not allowed"), status=405)

@csrf_exempt
@require_developer_jwt
def webhook_operations(request, webhook_id):
    """Handles PATCH (update) and DELETE (delete) webhook"""
    dev = request.developer
    try:
        webhook = Webhook.objects.filter(id=webhook_id, developer_id=dev.id).first()
        if not webhook:
            return JsonResponse(error_response("Webhook not found"), status=404)

        if request.method == "PATCH":
            data = json.loads(request.body)
            if "url" in data and data["url"] is not None:
                webhook.url = data["url"]
            if "events" in data and data["events"] is not None:
                invalid = [e for e in data["events"] if e not in VALID_EVENTS]
                if invalid:
                    return JsonResponse(error_response(f"Invalid events: {', '.join(invalid)}"), status=400)
                webhook.events = data["events"]
            if "is_active" in data and data["is_active"] is not None:
                webhook.is_active = data["is_active"]

            webhook.save()

            return JsonResponse(success_response({
                "id": str(webhook.id),
                "url": webhook.url,
                "events": webhook.events,
                "is_active": webhook.is_active
            }))

        elif request.method == "DELETE":
            webhook.delete()
            return JsonResponse(success_response({"message": "Webhook deleted"}))

        else:
            return JsonResponse(error_response("Method not allowed"), status=405)
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)

@csrf_exempt
@require_developer_jwt
def test_webhook(request, webhook_id):
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)
    dev = request.developer
    try:
        webhook = Webhook.objects.filter(id=webhook_id, developer_id=dev.id).first()
        if not webhook:
            return JsonResponse(error_response("Webhook not found"), status=404)

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
            with httpx.Client(timeout=10.0) as client:
                resp = client.post(webhook.url, json=test_payload)
                status_code = resp.status_code
                response_body = resp.text[:500]
        except Exception as e:
            error_msg = str(e)
            status_code = 0

        WebhookDeliveryLog.objects.create(
            webhook=webhook,
            event_type="test",
            payload=test_payload,
            status_code=status_code,
            response_body=response_body,
            error=error_msg
        )

        return JsonResponse(success_response({
            "delivered": status_code is not None and 200 <= status_code < 300,
            "status_code": status_code,
            "response_body": response_body,
            "error": error_msg
        }))
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)

@csrf_exempt
@require_developer_jwt
def webhook_logs(request, webhook_id):
    if request.method != "GET":
        return JsonResponse(error_response("Method not allowed"), status=405)
    dev = request.developer
    try:
        webhook = Webhook.objects.filter(id=webhook_id, developer_id=dev.id).first()
        if not webhook:
            return JsonResponse(error_response("Webhook not found"), status=404)

        limit = int(request.GET.get("limit", 50))
        logs = WebhookDeliveryLog.objects.filter(webhook_id=webhook.id).order_by("-created_at")[:limit]

        result = [
            {
                "id": str(l.id),
                "event_type": l.event_type,
                "status_code": l.status_code,
                "response_body": l.response_body,
                "error": l.error,
                "created_at": l.created_at.isoformat() if l.created_at else None
            }
            for l in logs
        ]

        return JsonResponse(success_response(result))
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)
