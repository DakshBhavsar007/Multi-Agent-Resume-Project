"""
2Factor SMS Service Wrapper
───────────────────────────
Provides integration with 2Factor's SMS OTP Gateway.
"""

import os
import logging
import httpx

logger = logging.getLogger(__name__)

# Load API key from environment
TWOFACTOR_API_KEY = os.getenv("TWOFACTOR_API_KEY")

def clean_phone_for_2factor(phone: str) -> str:
    """
    Format phone number as 91XXXXXXXXXX (without leading + or spaces)
    """
    cleaned = "".join(filter(str.isdigit, phone))
    if len(cleaned) == 10:
        cleaned = "91" + cleaned
    return cleaned

def send_2factor_otp(recipient_phone: str) -> dict:
    """
    Send OTP via 2Factor.in SMS Gateway using AUTOGEN route.
    """
    if not TWOFACTOR_API_KEY:
        logger.warning("TWOFACTOR_API_KEY is not set in environment variables.")
        return {"status": "error", "message": "2Factor API Key not configured."}

    phone = clean_phone_for_2factor(recipient_phone)
    url = f"https://2factor.in/API/V1/{TWOFACTOR_API_KEY}/SMS/{phone}/AUTOGEN"
    
    try:
        response = httpx.get(url, timeout=10.0)
        if response.status_code == 200:
            res_data = response.json()
            if res_data.get("Status") == "Success":
                logger.info("2Factor OTP triggered successfully to %s. Session Details: %s", recipient_phone, res_data.get("Details"))
                return {
                    "status": "success",
                    "session_id": res_data.get("Details")
                }
            else:
                return {
                    "status": "error",
                    "message": res_data.get("Details", "Unknown 2Factor error")
                }
        else:
            return {
                "status": "error",
                "message": f"2Factor API returned status code {response.status_code}"
            }
    except Exception as e:
        logger.error("Failed to call 2Factor Send OTP API: %s", e)
        return {"status": "error", "message": str(e)}

def verify_2factor_otp(recipient_phone: str, code: str) -> dict:
    """
    Verify OTP using 2Factor VERIFY3 endpoint (which takes phone + code directly).
    """
    if not TWOFACTOR_API_KEY:
        return {"status": "error", "message": "2Factor API Key not configured."}

    phone = clean_phone_for_2factor(recipient_phone)
    url = f"https://2factor.in/API/V1/{TWOFACTOR_API_KEY}/SMS/VERIFY3/{phone}/{code.strip()}"
    
    try:
        response = httpx.get(url, timeout=10.0)
        if response.status_code == 200:
            res_data = response.json()
            # 2Factor returns Details: "OTP Matched" when correct
            details = res_data.get("Details", "")
            if res_data.get("Status") == "Success" or "Matched" in details:
                logger.info("2Factor OTP verified successfully for %s", recipient_phone)
                return {"status": "success", "message": "OTP Verified"}
            else:
                logger.warning("2Factor OTP verification failed for %s: %s", recipient_phone, details)
                return {"status": "error", "message": details or "Invalid OTP"}
        else:
            try:
                err_msg = response.json().get("Details", "Verification failed")
            except Exception:
                err_msg = response.text
            return {"status": "error", "message": err_msg}
    except Exception as e:
        logger.error("Failed to call 2Factor Verify OTP API: %s", e)
        return {"status": "error", "message": str(e)}
