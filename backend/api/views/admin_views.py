import os
import json
import logging
from datetime import datetime, timedelta, timezone
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from jose import jwt
from api.models import Company, JobSeekerAccount, Session, SupportTicket, AdminBanLog, DeveloperAccount, AdminAuditLog, GroqApiKey, GeminiProject, AgentModelConfig, Candidate
from api.decorators import require_admin_jwt, require_admin_role, JWT_SECRET, JWT_ALGORITHM, rate_limit_ip, redis_client
from api.utils.security import encrypt_api_key, decrypt_api_key, mask_api_key
from django.utils.html import escape
from django.utils import timezone
from models.schemas import success_response, error_response
from api.services.email_service import (
    send_support_ticket_confirmation,
    send_support_admin_reply_email,
)

logger = logging.getLogger(__name__)


def log_admin_action(request, action: str, target_type: str = "", target_id: str = "", details: dict = None):
    """Helper to record server-side admin audit logs."""
    try:
        ip = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip() or request.META.get('REMOTE_ADDR', 'unknown')
        AdminAuditLog.objects.create(
            admin_email=getattr(request, 'admin_email', 'admin@between.com'),
            admin_role=getattr(request, 'admin_role', 'super_admin'),
            action=action,
            target_type=target_type,
            target_id=str(target_id),
            details=details or {},
            ip_address=ip
        )
    except Exception as e:
        logger.warning("Failed to log admin action: %s", e)


@csrf_exempt
def admin_login(request):
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        data = json.loads(request.body)
        email = (data.get("email") or "").strip().lower()
        password = data.get("password")
        if not email or not password:
            return JsonResponse(error_response("Email and password are required"), status=400)

        # Combined IP + email rate limiting
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR', 'unknown')

        redis_key = f"rl:admin_login:{ip}:{email}"
        try:
            current = redis_client.incr(redis_key)
            if current == 1:
                redis_client.expire(redis_key, 60)
            if current > 5:
                # Mask email for safe logging/debugging: show first 2 chars + domain
                parts = email.split('@') if '@' in email else [email, '']
                masked_email = parts[0][:2] + '***@' + parts[1] if parts[1] else parts[0][:2] + '***'
                return JsonResponse({
                    "success": False,
                    "error": "Too many requests. Please try again later.",
                    "data": {
                        "action": "admin_login",
                        "retry_after_seconds": redis_client.ttl(redis_key),
                        "identifier": masked_email
                    }
                }, status=429)
        except Exception as rl_err:
            logger.warning("Redis rate limit error: %s", rl_err)

        admin_email = os.getenv("ADMIN_EMAIL", "admin@between.com").strip().lower()
        admin_password = os.getenv("ADMIN_PASSWORD", "Admin@007")

        if email == admin_email and password == admin_password:
            payload = {
                "company_id": "admin",
                "email": admin_email,
                "role": "super_admin",
                "is_admin": True,
                "exp": datetime.utcnow() + timedelta(minutes=20)
            }
            token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
            return JsonResponse(success_response({
                "jwt_token": token,
                "company_id": "admin",
                "is_admin": True,
                "role": "admin",
                "name": "Between Admin",
                "email": admin_email,
                "tier": "enterprise"
            }))
        
        # Log failed attempt with structured SECURITY_ALERT prefix
        logger.warning("[SECURITY_ALERT] Failed admin login attempt from IP: %s, email: %s", ip, email)
        return JsonResponse(error_response("Invalid admin credentials"), status=401)
    except Exception as e:
        logger.error("Admin login error: %s", e)
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)

@csrf_exempt
@require_admin_jwt
def admin_dashboard(request):
    if request.method != "GET":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        # Seekers details
        seekers_qs = JobSeekerAccount.objects.all().order_by('-created_at')
        seekers_list = []
        for s in seekers_qs:
            seekers_list.append({
                "id": str(s.id),
                "name": s.full_name,
                "email": s.email,
                "tier": s.tier,
                "is_banned": s.is_banned,
                "created_at": s.created_at.isoformat() if s.created_at else None
            })

        # Recruiters details
        companies_qs = Company.objects.all().order_by('-created_at')
        companies_list = []
        for c in companies_qs:
            companies_list.append({
                "id": str(c.id),
                "name": c.name,
                "email": c.email,
                "tier": c.tier,
                "is_banned": c.is_banned,
                "created_at": c.created_at.isoformat() if c.created_at else None
            })

        # Support Tickets
        tickets_list = []
        try:
            tickets_qs = SupportTicket.objects.all().order_by('-created_at')
            for t in tickets_qs:
                seeker_banned = JobSeekerAccount.objects.filter(email=t.email, is_banned=True).exists()
                company_banned = Company.objects.filter(email=t.email, is_banned=True).exists()
                dev_banned = DeveloperAccount.objects.filter(email=t.email, is_banned=True).exists()
                is_banned = seeker_banned or company_banned or dev_banned

                msgs = getattr(t, 'messages', None) or []
                if not msgs and getattr(t, 'message', None):
                    msgs = [{
                        "sender": "user",
                        "sender_name": t.name,
                        "text": t.message,
                        "timestamp": t.created_at.isoformat() if t.created_at else timezone.now().isoformat()
                    }]

                tickets_list.append({
                    "id": str(t.id),
                    "name": t.name,
                    "email": t.email,
                    "subject": t.subject,
                    "message": t.message,
                    "status": t.status,
                    "messages": msgs,
                    "is_user_banned": is_banned,
                    "created_at": t.created_at.isoformat() if t.created_at else None
                })
        except Exception as ticket_err:
            logger.warning("Error fetching support tickets for admin dashboard: %s", ticket_err)

        stats = {
            "total_seekers": len(seekers_list),
            "total_recruiters": len(companies_list),
            "total_sessions": Session.objects.count(),
            "open_tickets": sum(1 for t in tickets_list if t["status"] == "open")
        }

        return JsonResponse(success_response({
            "stats": stats,
            "seekers": seekers_list,
            "recruiters": companies_list,
            "tickets": tickets_list
        }))
    except Exception as e:
        logger.error("Admin dashboard fetch error: %s", e)
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)

@csrf_exempt
@require_admin_jwt
def ban_unban_user(request):
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        data = json.loads(request.body)
        user_type = data.get("type")  # "seeker" or "recruiter" or "developer"
        user_id = data.get("id")
        action = data.get("action")   # "ban" or "unban"

        if not all([user_type, user_id, action]):
            return JsonResponse(error_response("Missing type, id, or action parameter"), status=400)

        should_ban = (action == "ban")

        # Load admin email to prevent self-ban
        admin_email = os.getenv("ADMIN_EMAIL", "admin@between.com").strip().lower()

        from django.db import transaction
        with transaction.atomic():
            if user_type == "seeker":
                user = JobSeekerAccount.objects.filter(id=user_id).first()
                if not user:
                    return JsonResponse(error_response("Job seeker account not found"), status=404)
                if user.email.strip().lower() == admin_email:
                    return JsonResponse(error_response("Admin cannot ban themselves"), status=400)
                user.is_banned = should_ban
                user.save(update_fields=['is_banned'])
            elif user_type == "recruiter":
                user = Company.objects.filter(id=user_id).first()
                if not user:
                    return JsonResponse(error_response("Recruiter company not found"), status=404)
                if user.email.strip().lower() == admin_email:
                    return JsonResponse(error_response("Admin cannot ban themselves"), status=400)
                user.is_banned = should_ban
                user.save(update_fields=['is_banned'])
            elif user_type == "developer":
                user = DeveloperAccount.objects.filter(id=user_id).first()
                if not user:
                    return JsonResponse(error_response("Developer account not found"), status=404)
                if user.email.strip().lower() == admin_email:
                    return JsonResponse(error_response("Admin cannot ban themselves"), status=400)
                user.is_banned = should_ban
                user.save(update_fields=['is_banned'])
            else:
                return JsonResponse(error_response("Invalid user type"), status=400)

            # NOTE: This is NOT a distributed transaction.
            # The DB save and Redis delete are sequential, independent operations:
            #   1. DB is saved inside transaction.atomic() above.
            #   2. Redis delete fires via transaction.on_commit() — only after the DB commit succeeds.
            # If Redis delete fails (network hiccup etc.), the ban still persists in DB.
            # Worst-case window: stale "false" cache serves for up to 300s TTL.
            # This is logged explicitly so monitoring can detect Redis issues.
            try:
                from api.decorators import redis_client
                cache_key = f"ban_status:{user_type}:{user_id}"
                def _clear_ban_cache():
                    try:
                        redis_client.delete(cache_key)
                    except Exception as inner_err:
                        logger.warning(
                            "[REDIS_CACHE] Failed to delete ban cache key '%s' after DB commit. "
                            "Stale cache may serve for up to 300s TTL. Error: %s",
                            cache_key, inner_err
                        )
                transaction.on_commit(_clear_ban_cache)
            except Exception as cache_err:
                logger.warning("Failed to register Redis cache clear on commit: %s", cache_err)

        # Audit Log
        AdminBanLog.objects.create(
            admin_email=getattr(request, 'admin_email', 'admin@between.com'),
            target_type=user_type,
            target_id=user_id,
            action=action
        )

        return JsonResponse(success_response({
            "message": f"Successfully {action}ned user {user_id}",
            "is_banned": should_ban
        }))
    except Exception as e:
        logger.error("Admin user action error: %s", e)
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)

@csrf_exempt
@require_admin_jwt
def resolve_support_ticket(request):
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        data = json.loads(request.body)
        ticket_id = data.get("id")
        if not ticket_id:
            return JsonResponse(error_response("Missing ticket id"), status=400)

        ticket = SupportTicket.objects.filter(id=ticket_id).first()
        if not ticket:
            return JsonResponse(error_response("Support ticket not found"), status=404)

        ticket.status = "resolved"
        ticket.resolved_at = timezone.now()
        ticket.resolved_by = getattr(request, 'admin_email', 'admin@between.com')
        ticket.save(update_fields=['status', 'resolved_at', 'resolved_by'])

        return JsonResponse(success_response({
            "message": f"Ticket #{ticket_id[:8]} marked as resolved",
            "status": "resolved"
        }))
    except Exception as e:
        logger.error("Admin resolve ticket error: %s", e)
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)

@csrf_exempt
def create_support_ticket(request):
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        data = json.loads(request.body)
        name = (data.get("name") or "").strip()
        email = (data.get("email") or "").strip().lower()
        subject = (data.get("subject") or "Account Support Inquiry").strip()
        message = (data.get("message") or "").strip()

        if not all([name, email, message]):
            return JsonResponse(error_response("Name, email, and message are required"), status=400)

        # Combined IP + email rate limiting
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR', 'unknown')

        redis_key = f"rl:create_ticket:{ip}:{email}"
        try:
            current = redis_client.incr(redis_key)
            if current == 1:
                redis_client.expire(redis_key, 60)
            if current > 5:
                # Mask email for safe logging/debugging: show first 2 chars + domain
                parts = email.split('@') if '@' in email else [email, '']
                masked_email = parts[0][:2] + '***@' + parts[1] if parts[1] else parts[0][:2] + '***'
                return JsonResponse({
                    "success": False,
                    "error": "Too many requests. Please try again later.",
                    "data": {
                        "action": "create_support_ticket",
                        "retry_after_seconds": redis_client.ttl(redis_key),
                        "identifier": masked_email
                    }
                }, status=429)
        except Exception as rl_err:
            logger.warning("Redis rate limit error: %s", rl_err)

        initial_msg = {
            "sender": "user",
            "sender_name": name,
            "text": message,
            "timestamp": timezone.now().isoformat()
        }

        ticket = SupportTicket.objects.create(
            name=name,
            email=email,
            subject=subject,
            message=message,
            status="open",
            messages=[initial_msg],
            user_email=email
        )

        # Trigger confirmation email to user
        try:
            send_support_ticket_confirmation(
                user_email=email,
                user_name=name,
                ticket_id=str(ticket.id),
                subject_text=subject,
                message_text=message
            )
        except Exception as mail_err:
            logger.warning("Support ticket confirmation email failed: %s", mail_err)

        return JsonResponse(success_response({
            "id": str(ticket.id),
            "ticket": {
                "id": str(ticket.id),
                "name": ticket.name,
                "email": ticket.email,
                "subject": ticket.subject,
                "status": ticket.status,
                "messages": ticket.messages or [],
                "created_at": ticket.created_at.isoformat()
            },
            "message": "Support ticket created successfully"
        }))
    except Exception as e:
        logger.error("Support ticket creation error: %s", e)
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)


@csrf_exempt
def public_ticket_lookup(request):
    """
    GET /api/v1/support/lookup?email=...&ticket_id=...
    Public endpoint: Anyone (guest, user, banned account) can look up ticket thread.
    """
    if request.method != "GET":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        email = (request.GET.get("email") or "").strip().lower()
        ticket_id = (request.GET.get("ticket_id") or "").strip()

        if not email and not ticket_id:
            return JsonResponse(error_response("Email or Ticket ID is required"), status=400)

        query = SupportTicket.objects.all()
        if ticket_id:
            query = query.filter(id=ticket_id)
        elif email:
            query = query.filter(email=email)

        tickets_qs = query.order_by("-created_at")
        
        target_email = email
        if not target_email and tickets_qs.exists():
            target_email = tickets_qs.first().email

        seeker_banned = JobSeekerAccount.objects.filter(email=target_email, is_banned=True).exists() if target_email else False
        company_banned = Company.objects.filter(email=target_email, is_banned=True).exists() if target_email else False
        dev_banned = DeveloperAccount.objects.filter(email=target_email, is_banned=True).exists() if target_email else False
        is_user_banned = seeker_banned or company_banned or dev_banned

        data = []
        for t in tickets_qs:
            msgs = getattr(t, 'messages', None) or []
            if not msgs and getattr(t, 'message', None):
                msgs = [{
                    "sender": "user",
                    "sender_name": t.name,
                    "text": t.message,
                    "timestamp": t.created_at.isoformat() if t.created_at else timezone.now().isoformat()
                }]
            data.append({
                "id": str(t.id),
                "name": t.name,
                "email": t.email,
                "subject": t.subject,
                "status": t.status,
                "messages": msgs,
                "is_user_banned": is_user_banned,
                "created_at": t.created_at.isoformat() if t.created_at else None
            })

        return JsonResponse(success_response({"tickets": data, "is_user_banned": is_user_banned}))
    except Exception as e:
        logger.error("Public ticket lookup error: %s", e)
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)


@csrf_exempt
def public_ticket_reply(request, ticket_id):
    """
    POST /api/v1/support/ticket/<ticket_id>/reply
    Public endpoint: User replies on a ticket thread.
    """
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        data = json.loads(request.body)
        message = (data.get("message") or "").strip()
        sender_name = (data.get("sender_name") or "").strip()

        if not message:
            return JsonResponse(error_response("Message text is required"), status=400)

        ticket = SupportTicket.objects.filter(id=ticket_id).first()
        if not ticket:
            return JsonResponse(error_response("Ticket not found"), status=404)

        current_msgs = list(ticket.messages or [])
        new_msg = {
            "sender": "user",
            "sender_name": sender_name or ticket.name,
            "text": message,
            "timestamp": timezone.now().isoformat()
        }
        current_msgs.append(new_msg)

        ticket.messages = current_msgs
        if ticket.status == "resolved":
            ticket.status = "open"  # Re-open on new reply
        ticket.save()

        return JsonResponse(success_response({"messages": ticket.messages, "status": ticket.status}))
    except Exception as e:
        logger.error("Public ticket reply error: %s", e)
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)


@csrf_exempt
@require_admin_jwt
def admin_ticket_reply(request):
    """
    POST /api/v1/admin/tickets/reply
    Admin endpoint: Admin posts a reply on a support ticket thread.
    """
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        data = json.loads(request.body)
        ticket_id = data.get("ticket_id")
        message = (data.get("message") or "").strip()

        if not all([ticket_id, message]):
            return JsonResponse(error_response("Missing ticket_id or message"), status=400)

        ticket = SupportTicket.objects.filter(id=ticket_id).first()
        if not ticket:
            return JsonResponse(error_response("Ticket not found"), status=404)

        current_msgs = list(ticket.messages or [])
        admin_name = getattr(request, 'admin_email', 'Admin Support')
        new_msg = {
            "sender": "admin",
            "sender_name": admin_name,
            "text": message,
            "timestamp": timezone.now().isoformat()
        }
        current_msgs.append(new_msg)

        ticket.messages = current_msgs
        ticket.save()

        # Trigger email notification to user
        try:
            send_support_admin_reply_email(
                to_email=ticket.email,
                user_name=ticket.name or "User",
                ticket_id=str(ticket.id),
                ticket_subject=ticket.subject or "Support Request",
                admin_reply_text=message
            )
        except Exception as mail_err:
            logger.warning("Failed to send support admin reply email: %s", mail_err)

        return JsonResponse(success_response({"messages": ticket.messages, "status": ticket.status}))
    except Exception as e:
        logger.error("Admin ticket reply error: %s", e)
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)


@csrf_exempt
@require_admin_jwt
def admin_unban_from_ticket(request):
    """
    POST /api/v1/admin/tickets/unban
    Admin endpoint: Unbans the user associated with a support ticket and marks ticket resolved.
    """
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        data = json.loads(request.body)
        ticket_id = data.get("ticket_id")
        if not ticket_id:
            return JsonResponse(error_response("Missing ticket_id"), status=400)

        ticket = SupportTicket.objects.filter(id=ticket_id).first()
        if not ticket:
            return JsonResponse(error_response("Ticket not found"), status=404)

        email = ticket.email
        unbanned_any = False

        # Unban across all account types
        seekers = JobSeekerAccount.objects.filter(email=email, is_banned=True)
        for s in seekers:
            s.is_banned = False
            s.save(update_fields=['is_banned'])
            unbanned_any = True

        companies = Company.objects.filter(email=email, is_banned=True)
        for c in companies:
            c.is_banned = False
            c.save(update_fields=['is_banned'])
            unbanned_any = True

        devs = DeveloperAccount.objects.filter(email=email, is_banned=True)
        for d in devs:
            d.is_banned = False
            d.save(update_fields=['is_banned'])
            unbanned_any = True

        # Append system message
        current_msgs = list(ticket.messages or [])
        system_msg = {
            "sender": "system",
            "sender_name": "System",
            "text": "User account has been successfully UNBANNED by Admin.",
            "timestamp": timezone.now().isoformat()
        }
        current_msgs.append(system_msg)

        ticket.messages = current_msgs
        ticket.status = "resolved"
        ticket.resolved_at = timezone.now()
        ticket.resolved_by = getattr(request, 'admin_email', 'admin@between.com')
        ticket.save()

        return JsonResponse(success_response({
            "message": f"User {email} has been unbanned and ticket resolved",
            "status": "resolved",
            "messages": ticket.messages
        }))
    except Exception as e:
        logger.error("Admin ticket unban error: %s", e)
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)


@csrf_exempt
@require_admin_jwt
def admin_llm_status(request):
    """
    GET /api/v1/admin/llm-status — returns all Gemini projects, API keys usage, and Agent model configs.
    """
    if request.method != "GET":
        return JsonResponse(error_response("Method not allowed"), status=405)

    try:
        from api.models import GeminiProject, AgentModelConfig
        from agents.llm import _ensure_seeded, _get_pacific_date

        _ensure_seeded()

        projects_data = []
        for p in GeminiProject.objects.all().order_by("name"):
            key_obj = p.keys.first()
            masked_key = (key_obj.key[:8] + "..." + key_obj.key[-4:]) if (key_obj and len(key_obj.key) > 12) else "N/A"
            projects_data.append({
                "id": str(p.id),
                "name": p.name,
                "daily_limit": p.daily_limit,
                "daily_usage": p.daily_usage,
                "rpm_limit": p.rpm_limit,
                "is_active": p.is_active,
                "key_preview": masked_key,
                "last_reset": p.last_reset.isoformat() if p.last_reset else None,
            })

        agents_data = []
        for a in AgentModelConfig.objects.all().order_by("agent_name"):
            agents_data.append({
                "id": str(a.id),
                "agent_name": a.agent_name,
                "display_name": a.display_name,
                "primary_provider": a.primary_provider,
                "fallback_provider": a.fallback_provider,
                "is_active": a.is_active,
            })

        return JsonResponse(success_response({
            "pacific_date": str(_get_pacific_date()),
            "projects": projects_data,
            "agents": agents_data,
        }))
    except Exception as e:
        logger.error(f"Error fetching admin LLM status: {e}")
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)


@csrf_exempt
@require_admin_role("super_admin", "support_staff")
def admin_sessions_list(request):
    """GET /api/v1/admin/sessions — list all sessions with stats."""
    if request.method != "GET":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        sessions_qs = Session.objects.all().order_by("-created_at")
        results = []
        for s in sessions_qs:
            company = Company.objects.filter(id=s.company_id).first()
            cand_count = Candidate.objects.filter(session=s).count()
            results.append({
                "id": str(s.id),
                "title": s.title,
                "job_title": s.job_title,
                "company_name": company.name if company else "N/A",
                "status": getattr(s, "status", "active"),
                "candidate_count": cand_count,
                "rounds_count": s.rounds.count() if hasattr(s, "rounds") else 0,
                "created_at": s.created_at.isoformat() if s.created_at else None
            })
        return JsonResponse(success_response(results))
    except Exception as e:
        logger.error("Admin sessions list error: %s", e)
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)


@csrf_exempt
@require_admin_role("super_admin")
def admin_audit_logs(request):
    """GET /api/v1/admin/audit-logs — paginated admin action logs."""
    if request.method != "GET":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        page = int(request.GET.get("page", 1))
        limit = int(request.GET.get("limit", 50))
        offset = (page - 1) * limit

        logs_qs = AdminAuditLog.objects.all().order_by("-timestamp")
        total = logs_qs.count()
        logs_page = logs_qs[offset:offset + limit]

        data = []
        for l in logs_page:
            data.append({
                "id": str(l.id),
                "admin_email": l.admin_email,
                "admin_role": l.admin_role,
                "action": l.action,
                "target_type": l.target_type,
                "target_id": l.target_id,
                "details": l.details,
                "ip_address": l.ip_address,
                "timestamp": l.timestamp.isoformat() if l.timestamp else None
            })
        return JsonResponse(success_response({"total": total, "page": page, "logs": data}))
    except Exception as e:
        logger.error("Admin audit logs error: %s", e)
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)


@csrf_exempt
@require_admin_role("super_admin")
def admin_groq_keys(request):
    """GET/POST/DELETE /api/v1/admin/groq-keys — manage encrypted Groq API keys."""
    if request.method == "GET":
        try:
            keys = GroqApiKey.objects.all().order_by("-created_at")
            results = []
            for k in keys:
                dec = decrypt_api_key(k.encrypted_key)
                results.append({
                    "id": str(k.id),
                    "label": k.label,
                    "masked_key": mask_api_key(dec),
                    "is_active": k.is_active,
                    "usage_count": k.usage_count,
                    "last_used_at": k.last_used_at.isoformat() if k.last_used_at else None,
                    "created_at": k.created_at.isoformat() if k.created_at else None
                })
            return JsonResponse(success_response(results))
        except Exception as e:
            return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)

    elif request.method == "POST":
        try:
            data = json.loads(request.body)
            raw_key = (data.get("key") or "").strip()
            label = (data.get("label") or "Groq Key").strip()
            if not raw_key:
                return JsonResponse(error_response("API key string is required"), status=400)

            enc = encrypt_api_key(raw_key)
            obj = GroqApiKey.objects.create(
                encrypted_key=enc,
                label=label,
                is_active=True
            )
            log_admin_action(request, "add_groq_key", target_type="groq_key", target_id=str(obj.id), details={"label": label})

            return JsonResponse(success_response({
                "id": str(obj.id),
                "label": obj.label,
                "masked_key": mask_api_key(raw_key),
                "is_active": obj.is_active,
                "usage_count": 0
            }))
        except Exception as e:
            return JsonResponse(error_response(f"Failed to add Groq key: {str(e)}"), status=500)

    elif request.method == "DELETE":
        try:
            data = json.loads(request.body)
            key_id = data.get("id")
            if not key_id:
                return JsonResponse(error_response("Key id required"), status=400)

            k = GroqApiKey.objects.filter(id=key_id).first()
            if not k:
                return JsonResponse(error_response("Groq key not found"), status=404)

            k.is_active = False
            k.save(update_fields=["is_active"])
            log_admin_action(request, "deactivate_groq_key", target_type="groq_key", target_id=str(k.id))
            return JsonResponse(success_response({"message": "Groq API key deactivated"}))
        except Exception as e:
            return JsonResponse(error_response(f"Delete failed: {str(e)}"), status=500)

    return JsonResponse(error_response("Method not allowed"), status=405)


@csrf_exempt
@require_admin_role("super_admin")
def admin_toggle_gemini_project(request):
    """PATCH /api/v1/admin/gemini-projects — toggle active state or limits of a Gemini project."""
    if request.method != "PATCH":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        data = json.loads(request.body)
        project_id = data.get("id")
        is_active = data.get("is_active")

        project = GeminiProject.objects.filter(id=project_id).first()
        if not project:
            return JsonResponse(error_response("Gemini project not found"), status=404)

        if is_active is not None:
            project.is_active = bool(is_active)

        if "daily_limit" in data:
            project.daily_limit = int(data["daily_limit"])

        project.save()
        log_admin_action(request, "update_gemini_project", target_type="gemini_project", target_id=str(project.id), details=data)

        return JsonResponse(success_response({
            "id": str(project.id),
            "name": project.name,
            "is_active": project.is_active,
            "daily_limit": project.daily_limit
        }))
    except Exception as e:
        return JsonResponse(error_response(f"Update failed: {str(e)}"), status=500)


@csrf_exempt
@require_admin_role("super_admin")
def admin_update_agent_config(request):
    """PATCH /api/v1/admin/agent-config — update primary/fallback provider for an agent."""
    if request.method != "PATCH":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        data = json.loads(request.body)
        agent_id = data.get("id")
        agent_name = data.get("agent_name")
        primary_provider = data.get("primary_provider")
        fallback_provider = data.get("fallback_provider")

        agent = None
        if agent_id:
            agent = AgentModelConfig.objects.filter(id=agent_id).first()
        elif agent_name:
            agent = AgentModelConfig.objects.filter(agent_name=agent_name).first()

        if not agent:
            return JsonResponse(error_response("Agent config not found"), status=404)

        if primary_provider:
            agent.primary_provider = primary_provider
        if fallback_provider:
            agent.fallback_provider = fallback_provider
        if "is_active" in data:
            agent.is_active = bool(data["is_active"])

        agent.save()
        log_admin_action(request, "update_agent_config", target_type="agent_config", target_id=str(agent.id), details=data)

        return JsonResponse(success_response({
            "id": str(agent.id),
            "agent_name": agent.agent_name,
            "primary_provider": agent.primary_provider,
            "fallback_provider": agent.fallback_provider,
            "is_active": agent.is_active
        }))
    except Exception as e:
        return JsonResponse(error_response(f"Agent config update failed: {str(e)}"), status=500)


