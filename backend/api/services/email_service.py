"""
Email Service
─────────────
Simple Django email notifications for the Vishleshan platform.
Uses the SMTP config already in .env (MAIL_USERNAME, MAIL_PASSWORD, etc.)

For development: emails are printed to console if EMAIL_BACKEND is not configured.
"""

import os
import logging
from django.core.mail import send_mail
from django.conf import settings

logger = logging.getLogger(__name__)

# Sender address — falls back to settings.DEFAULT_FROM_EMAIL
FROM_EMAIL = getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@vishleshan.ai")
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://between.indevs.in")


def send_application_received_to_company(
    company_email: str,
    company_name: str,
    seeker_name: str,
    job_title: str,
    session_id: str,
) -> bool:
    """
    Notify a company that a new application has been received.
    """
    subject = f"New Application — {job_title}"
    message = f"""
Hi {company_name},

You have received a new application from {seeker_name} for the position of {job_title}.

Log in to your Vishleshan dashboard to review the application:
{FRONTEND_URL}/dashboard/sessions/{session_id}

— Vishleshan Platform
"""
    return _send(company_email, subject, message)


def send_application_confirmation_to_seeker(
    seeker_email: str,
    seeker_name: str,
    job_title: str,
    company_name: str,
) -> bool:
    """
    Confirm to a job seeker that their application was submitted.
    """
    subject = f"Application Submitted — {job_title} at {company_name}"
    message = f"""
Hi {seeker_name},

Your application for {job_title} at {company_name} has been successfully submitted through Vishleshan.

You can track the status of all your applications here:
{FRONTEND_URL}/jobs/dashboard/applications

Good luck!
— Vishleshan Platform
"""
    return _send(seeker_email, subject, message)


def send_status_update_to_seeker(
    seeker_email: str,
    seeker_name: str,
    job_title: str,
    company_name: str,
    new_status: str,
) -> bool:
    """
    Notify a job seeker that their application status has changed.
    """
    status_messages = {
        "shortlisted": f"Great news! You have been shortlisted for {job_title} at {company_name}. The company may reach out to you soon.",
        "rejected":    f"Thank you for applying to {job_title} at {company_name}. Unfortunately, they have decided not to move forward with your application at this time.",
        "hired":       f"Congratulations! You have been selected for {job_title} at {company_name}. Please expect further instructions from the company.",
    }

    status_labels = {
        "shortlisted": "Shortlisted ✅",
        "rejected":    "Application Update",
        "hired":       "Offer Extended 🎉",
    }

    status_body   = status_messages.get(new_status, f"Your application status has been updated to: {new_status}")
    status_label  = status_labels.get(new_status, "Application Update")
    subject = f"{status_label} — {job_title} at {company_name}"

    message = f"""
Hi {seeker_name},

{status_body}

View your applications:
{FRONTEND_URL}/jobs/dashboard/applications

— Vishleshan Platform
"""
    return _send(seeker_email, subject, message)


def _send(to_email: str, subject: str, message: str) -> bool:
    """Internal helper — sends mail and logs errors without crashing."""
    try:
        send_mail(
            subject=subject,
            message=message.strip(),
            from_email=FROM_EMAIL,
            recipient_list=[to_email],
            fail_silently=False,
        )
        logger.info("Email sent to %s: %s", to_email, subject)
        return True
    except Exception as exc:
        # Log but never crash — email failure should not block the application flow
        logger.warning("Email failed to %s (%s): %s", to_email, subject, exc)
        return False
