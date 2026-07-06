"""
Brevo Service Wrapper
─────────────────────
Provides integration with Brevo's SMS, WhatsApp, CRM (Contacts), and Marketing Automation APIs.
"""

import os
import logging
import httpx

logger = logging.getLogger(__name__)

BREVO_API_KEY = os.getenv("BREVO_API_KEY")
BREVO_MA_KEY = os.getenv("BREVO_MA_KEY") or BREVO_API_KEY # Fallback if same key is used
SMS_SENDER = os.getenv("BREVO_SMS_SENDER", "Between")
WHATSAPP_SENDER = os.getenv("BREVO_WHATSAPP_SENDER") # E.g., "+1234567890"

# SMS and WhatsApp require paid credits on Brevo.
# Set BREVO_SMS_ENABLED=true in .env only if you have purchased SMS credits.
BREVO_SMS_ENABLED = os.getenv("BREVO_SMS_ENABLED", "false").lower() in ("true", "1", "yes")

HEADERS = {
    "accept": "application/json",
    "content-type": "application/json",
    "api-key": BREVO_API_KEY,
}

def send_sms(recipient_phone: str, message_content: str, sender_name: str = SMS_SENDER) -> dict:
    """
    Send a transactional SMS.
    recipient_phone: must include country code (e.g. "+91XXXXXXXXXX" or "91XXXXXXXXXX")
    NOTE: Requires purchased SMS credits on Brevo. Skipped if BREVO_SMS_ENABLED is false.
    """
    if not BREVO_SMS_ENABLED:
        logger.info("SMS sending skipped (BREVO_SMS_ENABLED=false). Would have sent to %s", recipient_phone)
        return {"status": "skipped", "message": "SMS not enabled (free tier). Enable with BREVO_SMS_ENABLED=true if you have SMS credits."}

    if not BREVO_API_KEY:
        logger.warning("Brevo API key not set. SMS send skipped.")
        return {"status": "error", "message": "API key not set"}

    url = "https://api.brevo.com/v3/transactionalSMS/send"
    payload = {
        "sender": sender_name[:11], # Brevo limit: 11 characters alphanumeric
        "recipient": recipient_phone,
        "content": message_content,
    }

    try:
        response = httpx.post(url, headers=HEADERS, json=payload, timeout=10.0)
        response.raise_for_status()
        return response.json()
    except Exception as exc:
        logger.error("Failed to send Brevo SMS to %s: %s", recipient_phone, exc)
        return {"status": "error", "message": str(exc)}

def send_whatsapp(contact_phone: str, text_content: str = None, template_id: int = None, sender_number: str = WHATSAPP_SENDER) -> dict:
    """
    Send a transactional WhatsApp message.
    Requires template_id for first contact. If template_id is used, text_content can be omitted.
    """
    if not BREVO_API_KEY:
        logger.warning("Brevo API key not set. WhatsApp send skipped.")
        return {"status": "error", "message": "API key not set"}

    if not sender_number:
        logger.warning("Brevo WhatsApp sender number not configured.")
        return {"status": "error", "message": "Sender number not configured"}

    url = "https://api.brevo.com/v3/whatsapp/sendMessage"
    payload = {
        "senderNumber": sender_number,
        "contactNumbers": [contact_phone],
    }

    if template_id:
        payload["templateId"] = template_id
    elif text_content:
        payload["text"] = text_content
    else:
        return {"status": "error", "message": "Either text_content or template_id must be provided"}

    try:
        response = httpx.post(url, headers=HEADERS, json=payload, timeout=10.0)
        response.raise_for_status()
        return response.json()
    except Exception as exc:
        logger.error("Failed to send Brevo WhatsApp to %s: %s", contact_phone, exc)
        return {"status": "error", "message": str(exc)}

def sync_contact(email: str, first_name: str = "", last_name: str = "", phone: str = "", list_ids: list = None, attributes: dict = None) -> dict:
    """
    Create or update a contact in Brevo CRM.
    """
    if not BREVO_API_KEY:
        logger.warning("Brevo API key not set. Contact sync skipped.")
        return {"status": "error", "message": "API key not set"}

    url = "https://api.brevo.com/v3/contacts"
    
    # Standard Brevo attributes are usually FIRSTNAME, LASTNAME, SMS
    contact_attributes = {
        "FIRSTNAME": first_name,
        "LASTNAME": last_name,
    }
    if phone:
        contact_attributes["SMS"] = phone
    
    if attributes:
        contact_attributes.update(attributes)

    payload = {
        "email": email,
        "attributes": contact_attributes,
        "updateEnabled": True, # Automatically updates contact if they already exist
    }

    if list_ids:
        payload["listIds"] = list_ids

    try:
        response = httpx.post(url, headers=HEADERS, json=payload, timeout=10.0)
        response.raise_for_status()
        return response.json()
    except Exception as exc:
        logger.error("Failed to sync contact %s in Brevo: %s", email, exc)
        return {"status": "error", "message": str(exc)}

def track_automation_event(email: str, event_name: str, properties: dict = None, event_data: dict = None) -> dict:
    """
    Track a server-side custom event for Marketing Automation workflows.
    """
    if not BREVO_MA_KEY:
        logger.warning("Brevo MA key not set. Event tracking skipped.")
        return {"status": "error", "message": "MA key not set"}

    url = "https://in-automate.brevo.com/api/v2/trackEvent"
    ma_headers = {
        "accept": "application/json",
        "content-type": "application/json",
        "ma-key": BREVO_MA_KEY,
    }

    payload = {
        "email": email,
        "event": event_name,
    }
    if properties:
        payload["properties"] = properties
    if event_data:
        payload["eventdata"] = event_data

    try:
        response = httpx.post(url, headers=ma_headers, json=payload, timeout=10.0)
        response.raise_for_status()
        return {"status": "success", "message": "Event tracked"}
    except Exception as exc:
        logger.error("Failed to track Brevo event %s for %s: %s", event_name, email, exc)
        return {"status": "error", "message": str(exc)}
