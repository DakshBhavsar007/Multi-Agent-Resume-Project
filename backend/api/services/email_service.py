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
    Also syncs the contact details and tracks the event in Brevo CRM.
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
    email_sent = _send(seeker_email, subject, message)
    
    # Brevo CRM Integration
    try:
        from api.models import JobSeekerAccount
        seeker = JobSeekerAccount.objects.filter(email=seeker_email).first()
        phone = seeker.phone if seeker else ""
        from api.services.brevo_service import sync_contact, track_automation_event
        sync_contact(
            email=seeker_email,
            first_name=seeker_name.split()[0] if seeker_name else "",
            last_name=" ".join(seeker_name.split()[1:]) if len(seeker_name.split()) > 1 else "",
            phone=phone,
            attributes={"LATEST_APPLIED_JOB": job_title}
        )
        track_automation_event(
            email=seeker_email,
            event_name="job_applied",
            properties={"job_title": job_title, "company_name": company_name}
        )
    except Exception as err:
        logger.warning("Brevo confirmation sync/event failed: %s", err)

    return email_sent



def send_status_update_to_seeker(
    seeker_email: str,
    seeker_name: str,
    job_title: str,
    company_name: str,
    new_status: str,
) -> bool:
    """
    Notify a job seeker that their application status has changed.
    Also sends an SMS and updates their status in Brevo CRM.
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
    email_sent = _send(seeker_email, subject, message)

    # Brevo CRM / SMS / Automation Integration
    try:
        from api.models import JobSeekerAccount
        seeker = JobSeekerAccount.objects.filter(email=seeker_email).first()
        if seeker:
            from api.services.brevo_service import send_sms, sync_contact, track_automation_event
            # 1. Update contact status attributes in CRM
            sync_contact(
                email=seeker_email,
                attributes={"LATEST_APPLICATION_STATUS": new_status.title()}
            )
            
            # 2. Send SMS if phone is available
            if seeker.phone:
                status_text = {
                    "shortlisted": "shortlisted ✅",
                    "rejected": "updated (rejected)",
                    "hired": "offered 🎉"
                }.get(new_status, new_status)
                sms_msg = f"Hi {seeker_name}, your application for {job_title} at {company_name} has been {status_text}. Log in to Vishleshan to view details."
                send_sms(recipient_phone=seeker.phone, message_content=sms_msg)
                
            # 3. Track automation event
            track_automation_event(
                email=seeker_email,
                event_name="application_status_updated",
                properties={"status": new_status, "job_title": job_title, "company_name": company_name}
            )
    except Exception as err:
        logger.warning("Brevo additional status update notifications failed: %s", err)

    return email_sent



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


def send_new_job_notification_to_follower(
    seeker_email: str,
    seeker_name: str,
    company_name: str,
    job_title: str,
    session_id: str,
) -> bool:
    """
    Notify a follower of a company that a new job has been posted.
    Also sends an SMS notification if a phone number is registered.
    """
    subject = f"New Job Opening: {job_title} at {company_name}"
    message = f"""
Hi {seeker_name},

{company_name}, a company you follow, has just posted a new job opening: {job_title}.

Click here to view details and apply:
{FRONTEND_URL}/jobs/{session_id}

You are receiving this because you follow {company_name} on Between.
— Between Platform
"""
    email_sent = _send(seeker_email, subject, message)

    try:
        from api.models import JobSeekerAccount
        seeker = JobSeekerAccount.objects.filter(email=seeker_email).first()
        if seeker and seeker.phone:
            from api.services.brevo_service import send_sms
            sms_msg = f"Hi {seeker_name}, {company_name} has just posted a new role: {job_title}. Apply now: {FRONTEND_URL}/jobs/{session_id}"
            send_sms(recipient_phone=seeker.phone, message_content=sms_msg)
    except Exception as err:
        logger.warning("Brevo follower SMS notification failed: %s", err)

    return email_sent



def send_email(to_email: str, subject: str, html_body: str = "", text_body: str = "") -> bool:
    """
    Public helper — sends an email with optional HTML body.
    Used by password reset and other features.
    """
    try:
        from django.core.mail import EmailMultiAlternatives
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_body or "Please view this email in an HTML-capable client.",
            from_email=FROM_EMAIL,
            to=[to_email],
        )
        if html_body:
            msg.attach_alternative(html_body, "text/html")
        msg.send(fail_silently=False)
        logger.info("Email sent to %s: %s", to_email, subject)
        return True
    except Exception as exc:
        logger.warning("Email failed to %s (%s): %s", to_email, subject, exc)
        return False

