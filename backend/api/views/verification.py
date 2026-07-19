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
    <div style="background-color: #f8fafc; padding: 40px 16px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-height: 100%;">
        <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 20px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02); border: 1px solid #f1f5f9; overflow: hidden;">
            
            <!-- Header Accent Bar -->
            <div style="height: 6px; background: linear-gradient(90deg, #3b82f6 0%, #2563eb 100%);"></div>
            
            <div style="padding: 40px 32px 32px 32px;">
                <!-- Brand Logo/Header -->
                <div style="text-align: center; margin-bottom: 32px;">
                    <div style="display: inline-block; padding: 8px 16px; background-color: #eff6ff; border-radius: 9999px; border: 1px solid #dbeafe; margin-bottom: 16px;">
                        <span style="font-size: 13px; font-weight: 700; color: #2563eb; letter-spacing: 1px; text-transform: uppercase;">
                            Between AI
                        </span>
                    </div>
                    <h2 style="color: #0f172a; font-size: 24px; font-weight: 800; margin: 0; letter-spacing: -0.5px; line-height: 1.2;">
                        Verify your email
                    </h2>
                    <p style="color: #64748b; font-size: 14px; margin: 8px 0 0 0; line-height: 1.5;">
                        Please use the following 6-digit code to complete your {purpose}.
                    </p>
                </div>
                
                <!-- OTP Box -->
                <div style="background: #eff6ff; border: 1.5px dashed #bfdbfe; border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 32px;">
                    <div style="font-size: 38px; font-weight: 850; letter-spacing: 8px; color: #1e40af; font-family: 'SF Mono', 'Fira Code', 'Courier New', monospace; padding-left: 8px;">
                        {otp}
                    </div>
                </div>
                
                <!-- Info Text -->
                <div style="background-color: #f8fafc; border-radius: 12px; padding: 16px; border: 1px solid #f1f5f9; margin-bottom: 32px;">
                    <p style="color: #475569; font-size: 13px; margin: 0; line-height: 1.6; text-align: center;">
                        This code is valid for <strong>5 minutes</strong>. If you did not request this code, you can safely ignore this email.
                    </p>
                </div>
                
                <!-- Footer -->
                <div style="border-top: 1px solid #f1f5f9; padding-top: 24px; text-align: center;">
                    <p style="color: #94a3b8; font-size: 12px; margin: 0 0 4px 0; font-weight: 500;">
                        Securely processed by Between AI
                    </p>
                    <p style="color: #cbd5e1; font-size: 11px; margin: 0;">
                        Vishleshan Platform &copy; 2026
                    </p>
                </div>
            </div>
        </div>
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
    Attempts to send via 2Factor SMS/Voice if configured. Falls back to simulated OTP on screen for free tier.
    """
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)
    
    try:
        body = json.loads(request.body)
        phone = body.get('phone')
        role = body.get('role')
        email = body.get('email')  # Used to locate the user account if they exist
        method = body.get('method', 'sms')  # 'sms' or 'voice'
        if method not in ('sms', 'voice'):
            method = 'sms'
        
        if not role:
            return JsonResponse({'success': False, 'error': 'Role is required'}, status=400)
        
        if not phone and not email:
            return JsonResponse({'success': False, 'error': 'Phone number or email is required'}, status=400)

        # Normalize phone first for consistent rate limiting and API calls
        normalized_phone = phone.strip() if phone else ""
        if normalized_phone and not normalized_phone.startswith("+"):
            normalized_phone = normalized_phone.lstrip("0")
            if len(normalized_phone) == 10:
                normalized_phone = "+91" + normalized_phone

        if not normalized_phone:
            return JsonResponse({'success': False, 'error': 'Invalid phone number format'}, status=400)

        # Import 2Factor service functions and logging utilities
        from api.services.twofactor_service import send_otp, mask_phone
        masked = mask_phone(normalized_phone)

        # Rate Limiting: 1 request per phone number per 60 seconds
        cache_key_60s = f"phone_otp_limit_60s:{role}:{normalized_phone}"
        if cache.get(cache_key_60s):
            logger.warning("OTP request rejected due to 60s rate limit for phone: %s", masked)
            return JsonResponse({
                'success': False, 
                'error': 'Please wait 60 seconds before requesting another verification code.'
            }, status=429)

        # Rate Limiting: 5 requests per phone number per 24 hours
        cache_key_daily = f"phone_otp_limit_daily:{role}:{normalized_phone}"
        daily_count = cache.get(cache_key_daily) or 0
        if daily_count >= 5:
            logger.warning("OTP request rejected due to daily rate limit (5/day) for phone: %s", masked)
            return JsonResponse({
                'success': False, 
                'error': 'Maximum daily limit of 5 OTP requests reached for this phone number.'
            }, status=429)

        # Look up user email if missing
        user_email = email
        if not user_email and phone:
            user = get_user_by_role_and_phone(role, phone)
            if user:
                user_email = user.email

        # Attempt to send via real 2Factor SMS/Voice
        sms_sent = False
        session_id = ""
        try:
            res = send_otp(phone_number=normalized_phone, method=method)
            if res.get("success"):
                sms_sent = True
                session_id = res.get("session_id")
            else:
                logger.warning("2Factor API failed to send OTP (%s) to %s: %s", method, masked, res.get("error"))
        except Exception as e:
            logger.warning("2Factor send exception (%s), falling back to simulated screen code: %s", method, e)

        if sms_sent:
            # Store session_id in cache against phone number (with a 5 minute timeout)
            session_cache_key = f"twofactor_session:{role}:{normalized_phone}"
            cache.set(session_cache_key, session_id, timeout=300)

            # Apply Rate Limits on successful dispatch
            cache.set(cache_key_60s, True, timeout=60)
            cache.set(cache_key_daily, daily_count + 1, timeout=86400)

            logger.info("2Factor OTP verification code dispatched to %s via %s. Session ID: %s", masked, method.upper(), session_id)
            channel_name = "SMS" if method == "sms" else "Voice Call"
            return JsonResponse({
                'success': True,
                'data': {
                    'message': f'Verification code sent successfully to {normalized_phone} via {channel_name}.',
                }
            })
        
        # Fallback to simulated code on screen (free tier/no credentials/API failure)
        otp = str(random.randint(100000, 999999))
        key_identifier = user_email or phone
        cache_key = f"phone_otp:{role}:{key_identifier}"
        cache.set(cache_key, otp, timeout=300)  # 5 minutes

        # Apply Rate Limits for simulated OTP as well
        cache.set(cache_key_60s, True, timeout=60)
        cache.set(cache_key_daily, daily_count + 1, timeout=86400)

        logger.info("Fallback triggered: Simulated OTP code generated for %s (Demo code: %s)", masked, otp)
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

        # Attempt to verify via 2Factor API
        from api.services.twofactor_service import verify_otp, mask_phone
        masked = mask_phone(normalized_phone)
        
        session_cache_key = f"twofactor_session:{role}:{normalized_phone}"
        session_id = cache.get(session_cache_key)

        verified = False
        if session_id:
            try:
                res = verify_otp(session_id=session_id, otp_code=otp_submitted)
                if res.get("success"):
                    verified = True
                    cache.delete(session_cache_key)
                    logger.info("2Factor OTP verification successful for %s", masked)
                else:
                    logger.warning("2Factor OTP verification failed for %s: %s", masked, res.get("error"))
                    return JsonResponse({'success': False, 'error': res.get("error") or 'Invalid verification code.'}, status=400)
            except Exception as e:
                logger.warning("2Factor Verification check failed for %s, trying fallback: %s", masked, e)

        # Fallback to local memory cache check
        if not verified and not session_id:
            cache_key = f"phone_otp:{role}:{key_identifier}"
            saved_otp = cache.get(cache_key)
            if saved_otp and otp_submitted == saved_otp:
                verified = True
                cache.delete(cache_key)
                logger.info("Simulated OTP verification successful for %s", masked)

        if not verified:
            logger.warning("Invalid OTP verification attempt for %s", masked)
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
