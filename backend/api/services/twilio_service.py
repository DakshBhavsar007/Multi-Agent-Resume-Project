"""
Twilio SMS & Verify Service Wrapper
───────────────────────────────────
Provides integration with Twilio's Programmable SMS and Verify API.
"""

import os
import logging
import httpx

logger = logging.getLogger(__name__)

# Load credentials from environment
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_VERIFY_SERVICE_SID = os.getenv("TWILIO_VERIFY_SERVICE_SID")

def send_twilio_verify_otp(recipient_phone: str) -> dict:
    """
    Send a verification OTP code using Twilio Verify API.
    """
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN or not TWILIO_VERIFY_SERVICE_SID:
        logger.warning("Twilio credentials are not fully set in environment variables.")
        return {
            "status": "error", 
            "message": "Twilio configuration is incomplete. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_VERIFY_SERVICE_SID in your .env file."
        }

    # Normalize phone number to E.164 format
    normalized_phone = recipient_phone.strip()
    if not normalized_phone.startswith("+"):
        normalized_phone = normalized_phone.lstrip("0")
        if len(normalized_phone) == 10:
            normalized_phone = "+91" + normalized_phone

    url = f"https://verify.twilio.com/v2/Services/{TWILIO_VERIFY_SERVICE_SID}/Verifications"
    data = {
        "To": normalized_phone,
        "Channel": "sms"
    }

    try:
        auth = (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        response = httpx.post(url, auth=auth, data=data, timeout=10.0)
        
        if response.status_code in (200, 201):
            res_data = response.json()
            logger.info("Successfully sent Twilio Verify SMS to %s. Status: %s", recipient_phone, res_data.get("status"))
            return {
                "status": "success",
                "sid": res_data.get("sid")
            }
        else:
            logger.error("Twilio Verify API failed with status %d: %s", response.status_code, response.text)
            try:
                err_msg = response.json().get("message", "Unknown Twilio API error")
            except Exception:
                err_msg = response.text
            return {
                "status": "error",
                "message": err_msg
            }
            
    except Exception as exc:
        logger.error("Failed to make Twilio Verify API call to %s: %s", recipient_phone, exc)
        return {
            "status": "error",
            "message": str(exc)
        }

def check_twilio_verify_otp(recipient_phone: str, code: str) -> dict:
    """
    Verify the OTP code submitted by the user using Twilio Verify API.
    """
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN or not TWILIO_VERIFY_SERVICE_SID:
        return {
            "status": "error", 
            "message": "Twilio configuration is incomplete."
        }

    # Normalize phone number to E.164 format
    normalized_phone = recipient_phone.strip()
    if not normalized_phone.startswith("+"):
        normalized_phone = normalized_phone.lstrip("0")
        if len(normalized_phone) == 10:
            normalized_phone = "+91" + normalized_phone

    url = f"https://verify.twilio.com/v2/Services/{TWILIO_VERIFY_SERVICE_SID}/VerificationCheck"
    data = {
        "To": normalized_phone,
        "Code": code.strip()
    }

    try:
        auth = (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        response = httpx.post(url, auth=auth, data=data, timeout=10.0)
        
        if response.status_code in (200, 201):
            res_data = response.json()
            if res_data.get("status") == "approved":
                logger.info("Twilio Verify SMS approved successfully for %s", recipient_phone)
                return {"status": "success", "message": "Approved"}
            else:
                logger.warning("Twilio Verify SMS check rejected for %s: %s", recipient_phone, res_data.get("status"))
                return {"status": "error", "message": "Verification code is incorrect or expired."}
        else:
            logger.error("Twilio Verify check failed with status %d: %s", response.status_code, response.text)
            try:
                err_msg = response.json().get("message", "Incorrect verification code.")
            except Exception:
                err_msg = response.text
            return {
                "status": "error",
                "message": err_msg
            }
            
    except Exception as exc:
        logger.error("Failed to check Twilio Verify code for %s: %s", recipient_phone, exc)
        return {
            "status": "error",
            "message": str(exc)
        }
