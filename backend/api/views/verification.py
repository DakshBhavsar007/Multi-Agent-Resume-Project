import json
import random
import logging
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.core.cache import cache
from api.models import Company, JobSeekerAccount, DeveloperAccount
from api.services.email_service import send_email

logger = logging.getLogger(__name__)

def get_user_by_role_and_email(role, email):
    if role == 'seeker':
        return JobSeekerAccount.objects.filter(email=email).first()
    elif role == 'recruiter':
        return Company.objects.filter(email=email).first()
    elif role == 'developer':
        return DeveloperAccount.objects.filter(email=email).first()
    return None

def get_user_by_role_and_phone(role, phone):
    if role == 'seeker':
        return JobSeekerAccount.objects.filter(phone=phone).first()
    elif role == 'recruiter':
        return Company.objects.filter(phone=phone).first()
    elif role == 'developer':
        return DeveloperAccount.objects.filter(phone=phone).first()
    return None

def _build_otp_html(otp, purpose="verification"):
    """Build a branded HTML email body for OTP delivery."""
    return f"""
    <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb;">
        <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="color: #111827; font-size: 22px; font-weight: 700; margin: 0;">Verify Your Account</h2>
            <p style="color: #6b7280; font-size: 14px; margin-top: 8px;">
                Use the code below to complete your {purpose}.
            </p>
        </div>
        <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 20px; border-radius: 12px; text-align: center; border: 1px solid #e2e8f0;">
            <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #1e293b; font-family: 'SF Mono', 'Fira Code', monospace;">
                {otp}
            </span>
        </div>
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px; line-height: 1.5;">
            This code will expire in <strong>5 minutes</strong>.<br/>
            If you did not request this verification, please ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 24px 0 16px;" />
        <p style="color: #d1d5db; font-size: 11px; text-align: center; margin: 0;">
            Between AI — Vishleshan Platform
        </p>
    </div>
    """


@csrf_exempt
def send_email_otp(request):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)
    
    try:
        body = json.loads(request.body)
        email = body.get('email')
        role = body.get('role')  # 'seeker', 'recruiter', 'developer'
        
        if not email or not role:
            return JsonResponse({'success': False, 'error': 'Email and role are required'}, status=400)
        
        # Verify user exists
        user = get_user_by_role_and_email(role, email)
        if not user:
            return JsonResponse({'success': False, 'error': 'Account not found with this email'}, status=404)
        
        # Generate 6-digit OTP
        otp = str(random.randint(100000, 999999))
        cache_key = f"otp:{role}:{email}"
        cache.set(cache_key, otp, timeout=300)  # 5 minutes expiration
        
        # Send Email
        subject = "Your Verification Code — Between AI"
        text_body = f"Your verification code is: {otp}. It will expire in 5 minutes."
        html_body = _build_otp_html(otp, purpose="email verification")
        
        sent = send_email(to_email=email, subject=subject, html_body=html_body, text_body=text_body)
        if not sent:
            return JsonResponse({'success': False, 'error': 'Failed to send verification email'}, status=500)
            
        return JsonResponse({'success': True, 'data': {'message': 'Verification code sent successfully to your email.'}})
        
    except Exception as e:
        logger.error("Failed to send email OTP: %s", e)
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

@csrf_exempt
def verify_email_otp(request):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)
    
    try:
        body = json.loads(request.body)
        email = body.get('email')
        role = body.get('role')
        otp_submitted = body.get('otp')
        
        if not email or not role or not otp_submitted:
            return JsonResponse({'success': False, 'error': 'Email, role, and OTP are required'}, status=400)
        
        cache_key = f"otp:{role}:{email}"
        saved_otp = cache.get(cache_key)
        
        if not saved_otp:
            return JsonResponse({'success': False, 'error': 'Verification code has expired. Please request a new one.'}, status=400)

        if saved_otp != otp_submitted:
            return JsonResponse({'success': False, 'error': 'Invalid verification code.'}, status=400)

        # Mark verified
        user = get_user_by_role_and_email(role, email)
        if not user:
            return JsonResponse({'success': False, 'error': 'User not found'}, status=404)
        
        if role in ('seeker', 'recruiter'):
            user.email_verified = True
        elif role == 'developer':
            user.is_verified = True  # Developer uses is_verified for email
        
        user.save()
        cache.delete(cache_key)
        
        return JsonResponse({
            'success': True, 
            'data': {
                'message': 'Email verified successfully',
                'email_verified': True
            }
        })
        
    except Exception as e:
        logger.error("Failed to verify email OTP: %s", e)
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

@csrf_exempt
def send_phone_otp(request):
    """
    Send phone verification OTP.
    Attempts to send via Brevo SMS if enabled. Falls back to simulated OTP on screen for free tier.
    """
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)
    
    try:
        body = json.loads(request.body)
        phone = body.get('phone')
        role = body.get('role')
        email = body.get('email')  # Used to locate the user account
        
        if not role:
            return JsonResponse({'success': False, 'error': 'Role is required'}, status=400)
        
        if not phone and not email:
            return JsonResponse({'success': False, 'error': 'Phone number or email is required'}, status=400)

        # Look up user email if missing
        user_email = email
        if not user_email and phone:
            user = get_user_by_role_and_phone(role, phone)
            if user:
                user_email = user.email

        # Generate 6-digit OTP
        otp = str(random.randint(100000, 999999))
        
        # Cache key is keyed on email if available, else phone
        cache_key = f"phone_otp:{role}:{user_email or phone}"
        cache.set(cache_key, otp, timeout=300)  # 5 minutes

        # Normalize phone
        normalized_phone = phone.strip() if phone else ""
        if normalized_phone and not normalized_phone.startswith("+"):
            normalized_phone = normalized_phone.lstrip("0")
            if len(normalized_phone) == 10:
                normalized_phone = "+91" + normalized_phone

        # Attempt to send via real Brevo SMS if enabled
        from api.services.brevo_service import send_sms
        sms_sent = False
        if normalized_phone:
            try:
                sms_msg = f"Your Between AI verification code is: {otp}. Valid for 5 minutes."
                res = send_sms(recipient_phone=normalized_phone, message_content=sms_msg)
                if res.get("status") not in ("error", "skipped") and "messageId" in res:
                    sms_sent = True
            except Exception as e:
                logger.warning("Brevo SMS send failed, falling back to simulated screen code: %s", e)

        if sms_sent:
            return JsonResponse({
                'success': True,
                'data': {
                    'message': f'Verification code sent successfully to {normalized_phone} via SMS.',
                }
            })
        
        # Fallback to simulated code on screen (free tier/no credits)
        return JsonResponse({
            'success': True,
            'data': {
                'message': f'Simulated OTP sent to your phone. (Demo code: {otp})',
            }
        })
        
    except Exception as e:
        logger.error("Failed to send phone OTP: %s", e)
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

@csrf_exempt
def verify_phone_otp(request):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)
    
    try:
        body = json.loads(request.body)
        phone = body.get('phone')
        email = body.get('email')
        role = body.get('role')
        otp_submitted = body.get('otp')
        
        if not role or not otp_submitted:
            return JsonResponse({'success': False, 'error': 'Role and OTP are required'}, status=400)
        if not phone and not email:
            return JsonResponse({'success': False, 'error': 'Phone or email is required'}, status=400)
        
        # Determine the cache key (keyed on email)
        user_email = email
        if not user_email and phone:
            user = get_user_by_role_and_phone(role, phone)
            if user:
                user_email = user.email

        if not user_email:
            return JsonResponse({'success': False, 'error': 'Could not locate account'}, status=404)

        cache_key = f"phone_otp:{role}:{user_email or phone}"
        saved_otp = cache.get(cache_key)

        if not saved_otp:
            return JsonResponse({'success': False, 'error': 'Verification code has expired. Please request a new one.'}, status=400)
        
        if otp_submitted != saved_otp:
            return JsonResponse({'success': False, 'error': 'Invalid verification code.'}, status=400)
        
        # Look up user and mark phone as verified
        user = get_user_by_role_and_email(role, user_email)
        if not user:
            return JsonResponse({'success': False, 'error': 'User account not found'}, status=404)
        
        user.phone_verified = True
        if phone and hasattr(user, 'phone'):
            user.phone = phone
        user.save()
        cache.delete(cache_key)
        
        return JsonResponse({
            'success': True,
            'data': {
                'message': 'Phone number verified successfully',
                'phone_verified': True
            }
        })
        
    except Exception as e:
        logger.error("Failed to verify phone OTP: %s", e)
        return JsonResponse({'success': False, 'error': str(e)}, status=500)
