import json
import random
import logging
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.core.cache import cache
from api.models import Company, JobSeekerAccount, DeveloperAccount
from api.services.email_service import send_email
from api.decorators import rate_limit_ip

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
@rate_limit_ip(5, 60, "otp_send")
def send_email_otp(request):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)
    
    try:
        body = json.loads(request.body)
        email = body.get('email')
        role = body.get('role')  # 'seeker', 'recruiter', 'developer'
        is_signup = body.get('is_signup', False)
        
        if not email or not role:
            return JsonResponse({'success': False, 'error': 'Email and role are required'}, status=400)
        
        # If signup, ensure email is not already registered
        user = get_user_by_role_and_email(role, email)
        if is_signup and user:
            return JsonResponse({'success': False, 'error': 'An account with this email already exists'}, status=400)
        
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
@rate_limit_ip(5, 60, "otp_verify")
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

        # Mark verified if user exists
        user = get_user_by_role_and_email(role, email)
        if user:
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
@rate_limit_ip(5, 60, "otp_send")
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
        email = body.get('email')  # Used to locate the user account if they exist
        
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
        key_identifier = user_email or phone
        cache_key = f"phone_otp:{role}:{key_identifier}"
        cache.set(cache_key, otp, timeout=300)  # 5 minutes

        # Normalize phone
        normalized_phone = phone.strip() if phone else ""
        if normalized_phone and not normalized_phone.startswith("+"):
            normalized_phone = normalized_phone.lstrip("0")
            if len(normalized_phone) == 10:
                normalized_phone = "+91" + normalized_phone

        # Attempt to send via real Twilio Verify SMS
        from api.services.twilio_service import send_twilio_verify_otp
        sms_sent = False
        if normalized_phone:
            try:
                res = send_twilio_verify_otp(recipient_phone=normalized_phone)
                if res.get("status") == "success":
                    sms_sent = True
            except Exception as e:
                logger.warning("Twilio Verify SMS send failed, falling back to simulated screen code: %s", e)

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
@rate_limit_ip(5, 60, "otp_verify")
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
        
        # Normalize phone
        normalized_phone = phone.strip() if phone else ""
        if normalized_phone and not normalized_phone.startswith("+"):
            normalized_phone = normalized_phone.lstrip("0")
            if len(normalized_phone) == 10:
                normalized_phone = "+91" + normalized_phone

        # Determine the cache key
        user_email = email
        if not user_email and phone:
            user = get_user_by_role_and_phone(role, phone)
            if user:
                user_email = user.email

        key_identifier = user_email or phone
        if not key_identifier:
            return JsonResponse({'success': False, 'error': 'Could not locate identifier for verification'}, status=400)

        # Attempt to verify via Twilio Verify API
        from api.services.twilio_service import check_twilio_verify_otp
        verified = False
        if normalized_phone:
            try:
                res = check_twilio_verify_otp(recipient_phone=normalized_phone, code=otp_submitted)
                if res.get("status") == "success":
                    verified = True
            except Exception as e:
                logger.warning("Twilio Verification check failed, trying fallback: %s", e)

        # Fallback to local memory cache check
        if not verified:
            cache_key = f"phone_otp:{role}:{key_identifier}"
            saved_otp = cache.get(cache_key)
            if saved_otp and otp_submitted == saved_otp:
                verified = True
                cache.delete(cache_key)

        if not verified:
            return JsonResponse({'success': False, 'error': 'Invalid or expired verification code.'}, status=400)
        
        # Look up user and mark phone as verified IF they exist
        user = get_user_by_role_and_email(role, user_email) if user_email else None
        if not user and phone:
            user = get_user_by_role_and_phone(role, phone)

        if user:
            user.phone_verified = True
            if phone and hasattr(user, 'phone'):
                user.phone = phone
            user.save()
        
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
