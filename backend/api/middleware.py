import time
import threading
from django.utils import timezone
from api.models import DeveloperAPIKey, APIUsageLog, MonthlyUsageSummary

class UsageLoggerMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = request.path
        if not path.startswith("/api/v1"):
            return self.get_response(request)

        api_key = request.headers.get("X-API-Key", "")
        if not api_key:
            # Check query params for key
            api_key = request.GET.get("x_api_key", "")

        if not api_key:
            return self.get_response(request)

        start = time.time()
        response = self.get_response(request)
        latency = int((time.time() - start) * 1000)

        action = self._infer_action(path)
        status_code = response.status_code

        # Run logging in a background thread to prevent blocking response latency
        threading.Thread(
            target=self._log_usage,
            args=(api_key, path, action, status_code, latency),
            daemon=True
        ).start()

        return response

    def _infer_action(self, path: str) -> str:
        if "ingest" in path or "upload" in path or "parse" in path:
            return "parse"
        elif "match" in path:
            return "match"
        elif "chat" in path:
            return "chat"
        elif "export" in path:
            return "export"
        elif "scan" in path or "protection" in path:
            return "scan"
        else:
            return "other"

    def _log_usage(self, api_key: str, endpoint: str, action: str, status: int, latency: int):
        from django.db import transaction
        from django.db import connection
        try:
            # Close connection if it was already opened, to get a fresh one in the new thread
            connection.close()
            
            # Find key record
            key_record = DeveloperAPIKey.objects.filter(secret_key=api_key, is_active=True).first()
            if not key_record:
                key_record = DeveloperAPIKey.objects.filter(public_key=api_key, is_active=True).first()
            if not key_record:
                return

            with transaction.atomic():
                # Log usage
                APIUsageLog.objects.create(
                    developer_id=key_record.developer_id,
                    api_key_id=key_record.id,
                    endpoint=endpoint,
                    action_type=action,
                    status_code=status,
                    latency_ms=latency
                )

                # Upsert monthly_usage_summary
                year_month = timezone.now().strftime("%Y-%m")
                summary = MonthlyUsageSummary.objects.filter(
                    developer_id=key_record.developer_id,
                    year_month=year_month
                ).select_for_update().first()

                if summary:
                    if action == "parse":
                        summary.parse_count = (summary.parse_count or 0) + 1
                    elif action == "match":
                        summary.match_count = (summary.match_count or 0) + 1
                    elif action == "chat":
                        summary.chat_count = (summary.chat_count or 0) + 1
                    elif action == "export":
                        summary.export_count = (summary.export_count or 0) + 1
                    elif action == "scan":
                        summary.scan_count = (summary.scan_count or 0) + 1
                    summary.total_api_calls = (summary.total_api_calls or 0) + 1
                    summary.save()
                else:
                    MonthlyUsageSummary.objects.create(
                        developer_id=key_record.developer_id,
                        year_month=year_month,
                        parse_count=1 if action == "parse" else 0,
                        match_count=1 if action == "match" else 0,
                        chat_count=1 if action == "chat" else 0,
                        export_count=1 if action == "export" else 0,
                        scan_count=1 if action == "scan" else 0,
                        total_api_calls=1
                    )
        except Exception:
            pass  # Never let logging crash or disrupt execution
        finally:
            connection.close()


import uuid
from django.conf import settings
from django.http import JsonResponse

class SecurityHeadersMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        response["X-Content-Type-Options"] = "nosniff"
        response["X-Frame-Options"] = "DENY"
        response["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' https://apis.google.com; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: https:; "
            "connect-src 'self' http://127.0.0.1:8000 https://api.between.indevs.in http://localhost:8000;"
        )
        return response


class ExceptionSanitizationMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        return self.get_response(request)

    def process_exception(self, request, exception):
        correlation_id = uuid.uuid4().hex[:8]
        logger.exception(f"[Correlation ID: {correlation_id}] Unhandled Exception: {str(exception)}")
        
        if getattr(settings, "DEBUG", False):
            return None
            
        return JsonResponse({
            "success": False,
            "data": {
                "correlation_id": correlation_id
            },
            "error": "An internal server error occurred. Please contact support."
        }, status=500)

