import os
import json
import logging
from datetime import datetime, timedelta, timezone
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from jose import jwt
from api.models import Company, JobSeekerAccount, Session, SupportTicket, AdminBanLog, DeveloperAccount
from api.decorators import require_admin_jwt, JWT_SECRET, JWT_ALGORITHM, rate_limit_ip, redis_client
from django.utils.html import escape
from django.utils import timezone
from models.schemas import success_response, error_response
from api.services.email_service import send_support_ticket_confirmation

logger = logging.getLogger(__name__)

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
                "role": "admin",
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
        tickets_qs = SupportTicket.objects.all().order_by('-created_at')
        tickets_list = []
        for t in tickets_qs:
            seeker_banned = JobSeekerAccount.objects.filter(email=t.email, is_banned=True).exists()
            company_banned = Company.objects.filter(email=t.email, is_banned=True).exists()
            dev_banned = DeveloperAccount.objects.filter(email=t.email, is_banned=True).exists()
            is_banned = seeker_banned or company_banned or dev_banned

            tickets_list.append({
                "id": str(t.id),
                "name": t.name,
                "email": t.email,
                "subject": t.subject,
                "message": t.message,
                "status": t.status,
                "messages": t.messages or [],
                "is_user_banned": is_banned,
                "created_at": t.created_at.isoformat() if t.created_at else None
            })

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
            msgs = t.messages or []
            if not msgs and t.message:
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
            "text": "✅ User account has been successfully UNBANNED by Admin.",
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
