"""
Email Service
─────────────
High-quality, responsive HTML email service for Between AI platform.
Uses the SMTP configuration defined in Django settings / environment variables.
Supports HTML email templates with Between logo, clean design tokens, and strict NO-EMOJI rules.
All email & notification functions deliver full comprehensive details (job title, company name, match score, stage, test links).
"""

import os
import logging
from django.core.mail import EmailMultiAlternatives
from django.conf import settings

logger = logging.getLogger(__name__)

# Sender address — falls back to settings.DEFAULT_FROM_EMAIL
FROM_EMAIL = getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@between.indevs.in")
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://between.indevs.in")


def build_between_email_html(
    title: str,
    subtitle: str = "",
    body_content_html: str = "",
    cta_text: str = None,
    cta_url: str = None,
    badge_text: str = None
) -> str:
    """
    Renders an ultra-premium, responsive, HTML email template for Between AI.
    - Features Between branding with styled SVG logo & header.
    - Strict NO EMOJI policy — clean SVG/CSS badges & Lucide-inspired design system.
    - Tailored color palette matching light & dark theme design system.
    """
    badge_html = ""
    if badge_text:
        badge_html = f"""
        <div style="display: inline-block; background: rgba(37, 99, 235, 0.1); border: 1px solid rgba(37, 99, 235, 0.25); border-radius: 20px; padding: 4px 14px; margin-bottom: 14px;">
            <span style="font-size: 11px; font-weight: 700; color: #2563eb; text-transform: uppercase; letter-spacing: 0.8px;">{badge_text}</span>
        </div>
        """

    cta_html = ""
    if cta_text and cta_url:
        cta_html = f"""
        <div style="text-align: center; margin: 32px 0 20px;">
            <a href="{cta_url}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 14px 34px; border-radius: 12px; font-size: 14px; font-weight: 700; letter-spacing: -0.2px; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);">
                {cta_text}
            </a>
        </div>
        """

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.05);">
                    
                    <!-- Header Bar -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 32px 28px; text-align: left;">
                            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td style="vertical-align: middle;">
                                        <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                                            <tr>
                                                <td style="vertical-align: middle; padding-right: 12px;">
                                                    <div style="width: 32px; height: 32px; border-radius: 8px; background: #0f172a; padding: 3px; display: inline-block; box-sizing: border-box; vertical-align: middle;">
                                                        <svg viewBox="0 0 100 100" width="26" height="26" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                            <defs>
                                                                <linearGradient id="logo-grad-email" x1="0%" y1="100%" x2="100%" y2="0%">
                                                                    <stop offset="0%" stop-color="#38bdf8" />
                                                                    <stop offset="100%" stop-color="#2563eb" />
                                                                </linearGradient>
                                                            </defs>
                                                            <line x1="32" y1="68" x2="68" y2="32" stroke="url(#logo-grad-email)" stroke-width="14" stroke-linecap="round" />
                                                            <circle cx="32" cy="68" r="16" fill="#38bdf8" />
                                                            <circle cx="68" cy="32" r="24" fill="#2563eb" />
                                                        </svg>
                                                    </div>
                                                </td>
                                                <td style="vertical-align: middle;">
                                                    <span style="font-size: 22px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px; font-family: 'Inter', sans-serif;">Between</span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                    <td align="right" style="vertical-align: middle;">
                                        <span style="font-size: 11px; font-weight: 700; color: #94a3b8; letter-spacing: 0.5px; text-transform: uppercase;">Recruitment AI</span>
                                    </td>
                                </tr>
                            </table>
                            <div style="margin-top: 24px;">
                                {badge_html}
                                <h1 style="color: #ffffff; font-size: 22px; font-weight: 800; margin: 0 0 6px; letter-spacing: -0.4px; line-height: 1.3;">{title}</h1>
                                {f'<p style="color: #94a3b8; font-size: 13px; margin: 0; line-height: 1.5;">{subtitle}</p>' if subtitle else ''}
                            </div>
                        </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                        <td style="padding: 32px 32px 28px; background-color: #ffffff;">
                            <div style="color: #334155; font-size: 14px; line-height: 1.65;">
                                {body_content_html}
                            </div>
                            {cta_html}
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8fafc; padding: 24px 32px; border-top: 1px solid #f1f5f9; text-align: center;">
                            <p style="color: #64748b; font-size: 12px; margin: 0 0 6px; font-weight: 500;">
                                Between Technologies Private Limited &bull; AI Recruitment Intelligence Platform
                            </p>
                            <p style="color: #94a3b8; font-size: 11px; margin: 0 0 12px;">
                                Need assistance? Contact our support desk at <a href="mailto:support@between.indevs.in" style="color: #2563eb; text-decoration: none; font-weight: 600;">support@between.indevs.in</a>
                            </p>
                            <p style="color: #cbd5e1; font-size: 11px; margin: 0;">
                                &copy; 2026 Between AI. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""


def send_email(to_email: str, subject: str, html_body: str = "", text_body: str = "") -> bool:
    """
    Core helper — sends email with HTML & plain text support.
    """
    try:
        msg = EmailMultiAlternatives(
            subject=subject.strip(),
            body=text_body or "Please view this email in an HTML-capable email client.",
            from_email=FROM_EMAIL,
            to=[to_email.strip()],
        )
        if html_body:
            msg.attach_alternative(html_body, "text/html")
        msg.send(fail_silently=False)
        logger.info("Email successfully sent to %s: %s", to_email, subject)
        return True
    except Exception as exc:
        logger.warning("Email send failed to %s (%s): %s", to_email, subject, exc)
        return False


def _send(to_email: str, subject: str, message: str) -> bool:
    """Internal fallback helper."""
    return send_email(to_email=to_email, subject=subject, text_body=message)


def send_application_received_to_company(
    company_email: str,
    company_name: str,
    seeker_name: str,
    job_title: str,
    session_id: str,
    match_score: str = None,
) -> bool:
    """
    Notify a company recruiter that a new candidate application has been submitted with full details.
    """
    subject = f"New Candidate Application — {job_title}"
    title = "New Candidate Application"
    subtitle = f"Position: {job_title}"
    badge = "New Application"
    cta_url = f"{FRONTEND_URL}/dashboard/sessions/{session_id}"

    match_score_display = f"{int(match_score)}%" if (isinstance(match_score, (int, float)) and match_score > 0) else (str(match_score) if match_score else "N/A")

    body_html = f"""
    <p>Hi <strong>{company_name}</strong>,</p>
    <p>You have received a new application for the <strong>{job_title}</strong> position on Between.</p>
    
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px; margin: 20px 0;">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
                <td style="padding-bottom: 12px; width: 50%;">
                    <p style="margin: 0 0 2px; font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;">Applicant Name</p>
                    <p style="margin: 0; font-size: 16px; font-weight: 800; color: #0f172a;">{seeker_name}</p>
                </td>
                <td style="padding-bottom: 12px; width: 50%;">
                    <p style="margin: 0 0 2px; font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;">Match Score</p>
                    <p style="margin: 0; font-size: 16px; font-weight: 800; color: #059669;">{match_score_display}</p>
                </td>
            </tr>
            <tr>
                <td colspan="2">
                    <p style="margin: 0 0 2px; font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;">Target Job Role</p>
                    <p style="margin: 0; font-size: 14px; font-weight: 700; color: #2563eb;">{job_title}</p>
                </td>
            </tr>
        </table>
    </div>
    
    <p>Log in to your Between Recruiter Dashboard to review the complete profile, ATS compatibility match details, and candidate resume.</p>
    """

    text_body = f"Hi {company_name},\n\nYou have received a new application from {seeker_name} for {job_title} ({match_score_display} Match).\n\nReview application: {cta_url}\n\n— Between AI Platform"
    html_email = build_between_email_html(
        title=title,
        subtitle=subtitle,
        body_content_html=body_html,
        cta_text="Review Application",
        cta_url=cta_url,
        badge_text=badge
    )

    return send_email(to_email=company_email, subject=subject, html_body=html_email, text_body=text_body)


def send_application_confirmation_to_seeker(
    seeker_email: str,
    seeker_name: str,
    job_title: str,
    company_name: str,
    match_score: str = None,
    location: str = None,
) -> bool:
    """
    Confirm to a job seeker that their application was submitted successfully with full details.
    """
    subject = f"Application Submitted — {job_title} at {company_name}"
    title = "Application Submitted"
    subtitle = f"{job_title} at {company_name}"
    badge = "Application Sent"
    cta_url = f"{FRONTEND_URL}/jobs/applications"

    match_score_display = f"{int(match_score)}%" if (isinstance(match_score, (int, float)) and match_score > 0) else (str(match_score) if match_score else "N/A")
    location_display = location if location else "Not specified"

    body_html = f"""
    <p>Hi <strong>{seeker_name}</strong>,</p>
    <p>Your application for <strong>{job_title}</strong> at <strong>{company_name}</strong> has been successfully submitted via Between.</p>
    
    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 14px; padding: 20px; margin: 20px 0;">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
                <td style="padding-bottom: 12px; width: 50%;">
                    <p style="margin: 0 0 2px; font-size: 11px; color: #166534; font-weight: 700; text-transform: uppercase;">Role</p>
                    <p style="margin: 0; font-size: 15px; font-weight: 800; color: #14532d;">{job_title}</p>
                </td>
                <td style="padding-bottom: 12px; width: 50%;">
                    <p style="margin: 0 0 2px; font-size: 11px; color: #166534; font-weight: 700; text-transform: uppercase;">Company</p>
                    <p style="margin: 0; font-size: 15px; font-weight: 700; color: #15803d;">{company_name}</p>
                </td>
            </tr>
            <tr>
                <td>
                    <p style="margin: 0 0 2px; font-size: 11px; color: #166534; font-weight: 700; text-transform: uppercase;">Match Score</p>
                    <p style="margin: 0; font-size: 14px; font-weight: 800; color: #15803d;">{match_score_display}</p>
                </td>
                <td>
                    <p style="margin: 0 0 2px; font-size: 11px; color: #166534; font-weight: 700; text-transform: uppercase;">Location</p>
                    <p style="margin: 0; font-size: 13px; font-weight: 600; color: #166534;">{location_display}</p>
                </td>
            </tr>
        </table>
    </div>
    
    <p>You can track real-time application stage progress, scheduled assessment rounds, and interviewer updates anytime on your Seeker Dashboard.</p>
    """

    text_body = f"Hi {seeker_name},\n\nYour application for {job_title} at {company_name} ({match_score_display} Match) has been submitted.\nLocation: {location_display}\n\nTrack applications: {cta_url}\n\n— Between AI Platform"
    html_email = build_between_email_html(
        title=title,
        subtitle=subtitle,
        body_content_html=body_html,
        cta_text="Track Applications",
        cta_url=cta_url,
        badge_text=badge
    )

    email_sent = send_email(to_email=seeker_email, subject=subject, html_body=html_email, text_body=text_body)

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
    match_score: str = None,
    current_round_name: str = None,
    previous_round_name: str = None,
    location: str = None,
    test_link: str = None,
    rejection_reason: str = None,
) -> bool:
    """
    Notify a job seeker that their application status has updated with FULL COMPREHENSIVE DETAILS.
    """
    if new_status == "shortlisted" and previous_round_name and current_round_name:
        status_body = f"Great news! Your application for <strong>{job_title}</strong> at <strong>{company_name}</strong> has been reviewed and shortlisted on <strong>{previous_round_name}</strong>. You have been selected to move forward to the next stage of recruitment: <strong>{current_round_name}</strong>."
    else:
        status_messages = {
            "shortlisted": f"Great news! Your application for {job_title} at {company_name} has been reviewed and shortlisted by the hiring team. You have been selected to move forward to the next stage of recruitment.",
            "rejected":    f"Thank you for applying for {job_title} at {company_name}. After careful review of your qualifications, the hiring team has decided to move forward with other candidates for this specific opening.",
            "hired":       f"Congratulations! An official employment offer has been extended to you for {job_title} at {company_name}. Please log in to your dashboard for onboarding details.",
        }
        status_body = status_messages.get(new_status, f"Your application status for {job_title} at {company_name} has been updated to: {new_status.title()}.")

    status_titles = {
        "shortlisted": f"Application Shortlisted: Advanced to {current_round_name}" if current_round_name else "Application Shortlisted",
        "rejected":    "Application Status Update",
        "hired":       "Offer Extended",
    }

    status_badges = {
        "shortlisted": "Shortlisted Candidate",
        "rejected":    "Application Update",
        "hired":       "Offer Extended",
    }

    title = status_titles.get(new_status, "Application Status Updated")
    badge = status_badges.get(new_status, "Status Update")
    
    if new_status == "shortlisted" and previous_round_name and current_round_name:
        subject = f"Application Shortlisted on {previous_round_name} — Advanced to {current_round_name} for {job_title}"
    else:
        subject = f"{title} — {job_title} at {company_name}"
    
    # Target CTA URL and text
    cta_url = f"{FRONTEND_URL}/jobs/applications"
    cta_text = "View Application Details"
    if test_link:
        cta_url = test_link if test_link.startswith("http") else f"{FRONTEND_URL}{test_link}"
        cta_text = "Take Assessment / Test Now"

    # Match score string
    match_score_display = "N/A"
    if match_score is not None:
        if isinstance(match_score, (int, float)) and match_score > 0:
            match_score_display = f"{int(match_score)}%"
        else:
            match_score_display = str(match_score)

    prev_round_html = f"""
    <tr>
        <td style="padding-bottom: 12px;" colspan="2">
            <p style="margin: 0 0 2px; font-size: 11px; color: #166534; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Previous Stage Cleared</p>
            <p style="margin: 0; font-size: 14px; font-weight: 700; color: #15803d;">{previous_round_name}</p>
        </td>
    </tr>
    """ if previous_round_name else ""

    round_html = f"""
    <tr>
        <td style="padding-bottom: 12px;" colspan="2">
            <p style="margin: 0 0 2px; font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Current Active Stage</p>
            <p style="margin: 0; font-size: 14px; font-weight: 700; color: #2563eb;">{current_round_name}</p>
        </td>
    </tr>
    """ if current_round_name else ""

    location_html = f"""
    <tr>
        <td style="padding-bottom: 12px;" colspan="2">
            <p style="margin: 0 0 2px; font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Location & Work Mode</p>
            <p style="margin: 0; font-size: 13px; font-weight: 600; color: #475569;">{location}</p>
        </td>
    </tr>
    """ if location else ""

    rejection_html = f"""
    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 16px; margin: 16px 0 0 0;">
        <p style="margin: 0 0 4px; font-size: 11px; color: #991b1b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Assessment Feedback / Rejection Note</p>
        <p style="margin: 0; font-size: 13px; color: #7f1d1d; line-height: 1.5;">{rejection_reason}</p>
    </div>
    """ if (new_status == "rejected" and rejection_reason) else ""

    body_html = f"""
    <p>Hi <strong>{seeker_name}</strong>,</p>
    <p>{status_body}</p>
    
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px; margin: 20px 0;">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
                <td style="padding-bottom: 14px; width: 50%;">
                    <p style="margin: 0 0 2px; font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Job Title</p>
                    <p style="margin: 0; font-size: 15px; font-weight: 800; color: #0f172a;">{job_title}</p>
                </td>
                <td style="padding-bottom: 14px; width: 50%;">
                    <p style="margin: 0 0 2px; font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Company</p>
                    <p style="margin: 0; font-size: 15px; font-weight: 700; color: #2563eb;">{company_name}</p>
                </td>
            </tr>
            <tr>
                <td style="padding-bottom: 14px;">
                    <p style="margin: 0 0 2px; font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Updated Status</p>
                    <p style="margin: 0; font-size: 14px; font-weight: 800; color: #2563eb;">{new_status.title()}</p>
                </td>
                <td style="padding-bottom: 14px;">
                    <p style="margin: 0 0 2px; font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Match Score</p>
                    <p style="margin: 0; font-size: 14px; font-weight: 800; color: #059669;">{match_score_display}</p>
                </td>
            </tr>
            {prev_round_html}
            {round_html}
            {location_html}
        </table>
        {rejection_html}
    </div>
    
    <p>Log in to your Between Seeker Dashboard to view complete application details and proceed with next steps.</p>
    """

    text_body = f"Hi {seeker_name},\n\n{status_body}\n\nJob: {job_title}\nCompany: {company_name}\nStatus: {new_status.title()}\nMatch Score: {match_score_display}\n\nView details: {cta_url}\n\n— Between AI Platform"

    html_email = build_between_email_html(
        title=title,
        subtitle=f"{job_title} at {company_name}",
        body_content_html=body_html,
        cta_text=cta_text,
        cta_url=cta_url,
        badge_text=badge
    )

    email_sent = send_email(to_email=seeker_email, subject=subject, html_body=html_email, text_body=text_body)

    # Brevo CRM / SMS Integration
    try:
        from api.models import JobSeekerAccount
        seeker = JobSeekerAccount.objects.filter(email=seeker_email).first()
        if seeker:
            from api.services.brevo_service import send_sms, sync_contact, track_automation_event
            sync_contact(
                email=seeker_email,
                attributes={"LATEST_APPLICATION_STATUS": new_status.title()}
            )
            
            if seeker.phone:
                sms_status_text = {
                    "shortlisted": "shortlisted",
                    "rejected": "updated (not moving forward)",
                    "hired": "offered"
                }.get(new_status, new_status)
                sms_msg = f"Hi {seeker_name}, your application for {job_title} at {company_name} ({match_score_display} match) status is now {sms_status_text}. Details: {cta_url}"
                send_sms(recipient_phone=seeker.phone, message_content=sms_msg)
                
            track_automation_event(
                email=seeker_email,
                event_name="application_status_updated",
                properties={"status": new_status, "job_title": job_title, "company_name": company_name}
            )
    except Exception as err:
        logger.warning("Brevo additional status update notifications failed: %s", err)

    return email_sent


def send_new_job_notification_to_follower(
    seeker_email: str,
    seeker_name: str,
    company_name: str,
    job_title: str,
    session_id: str,
    location: str = None,
    experience_level: str = None,
) -> bool:
    """
    Notify a follower of a company that a new job opening has been posted with full details.
    """
    subject = f"New Role Posted: {job_title} at {company_name}"
    title = "New Job Opportunity"
    subtitle = f"Posted by {company_name}"
    badge = "Company Update"
    cta_url = f"{FRONTEND_URL}/jobs/{session_id}"

    location_display = location if location else "Remote / Flexible"
    exp_display = f" • {experience_level}" if experience_level else ""

    body_html = f"""
    <p>Hi <strong>{seeker_name}</strong>,</p>
    <p><strong>{company_name}</strong>, a company you follow on Between, has just posted a new career opportunity for <strong>{job_title}</strong>.</p>
    
    <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 14px; padding: 20px; margin: 20px 0;">
        <p style="margin: 0 0 2px; font-size: 11px; color: #1e40af; font-weight: 700; text-transform: uppercase;">Job Title</p>
        <p style="margin: 0 0 10px; font-size: 17px; font-weight: 800; color: #1d4ed8;">{job_title}</p>
        
        <p style="margin: 0 0 2px; font-size: 11px; color: #1e40af; font-weight: 700; text-transform: uppercase;">Company & Location</p>
        <p style="margin: 0; font-size: 14px; font-weight: 600; color: #1e40af;">{company_name} &bull; {location_display}{exp_display}</p>
    </div>
    
    <p>Check the full job description and submit your application directly on Between.</p>
    """

    text_body = f"Hi {seeker_name},\n\n{company_name} has posted a new job: {job_title} ({location_display}).\n\nApply now: {cta_url}\n\n— Between AI Platform"
    html_email = build_between_email_html(
        title=title,
        subtitle=subtitle,
        body_content_html=body_html,
        cta_text="View Opening & Apply",
        cta_url=cta_url,
        badge_text=badge
    )

    email_sent = send_email(to_email=seeker_email, subject=subject, html_body=html_email, text_body=text_body)

    try:
        from api.models import JobSeekerAccount
        seeker = JobSeekerAccount.objects.filter(email=seeker_email).first()
        if seeker and seeker.phone:
            from api.services.brevo_service import send_sms
            sms_msg = f"Hi {seeker_name}, {company_name} has posted a new role: {job_title} ({location_display}). Apply now: {cta_url}"
            send_sms(recipient_phone=seeker.phone, message_content=sms_msg)
    except Exception as err:
        logger.warning("Brevo follower SMS notification failed: %s", err)

    return email_sent


def send_welcome_email(
    user_email: str,
    user_name: str,
    role: str,
    custom_attributes: dict = None,
) -> bool:
    """
    Send a branded welcome email to new users across all three portals.
    """
    role_labels = {
        "seeker": "Job Seeker",
        "recruiter": "Recruiter",
        "developer": "Developer",
    }
    role_label = role_labels.get(role, "User")

    role_links = {
        "seeker": f"{FRONTEND_URL}/jobs",
        "recruiter": f"{FRONTEND_URL}/dashboard",
        "developer": f"{FRONTEND_URL}/developer",
    }
    cta_link = role_links.get(role, FRONTEND_URL)

    subject = f"Welcome to Between AI, {user_name.split()[0] if user_name else 'User'}"
    title = "Welcome to Between AI"
    subtitle = f"Registration Confirmed as {role_label}"
    badge = "Welcome"

    body_html = f"""
    <p>Hi <strong>{user_name}</strong>,</p>
    <p>Welcome to Between AI — the intelligent hiring platform! Your account registration as a <strong>{role_label}</strong> is complete.</p>
    
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <p style="margin: 0 0 10px; font-size: 13px; font-weight: 700; color: #0f172a; text-transform: uppercase;">Getting Started Steps:</p>
        <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #475569; line-height: 1.8;">
            <li>Complete your profile for personalized matching</li>
            <li>Verify your email address and phone number</li>
            <li>Explore features directly from your dashboard</li>
        </ul>
    </div>
    <p style="font-size: 13px; color: #64748b;">If you have questions, our support team is available 24/7 at support@between.indevs.in.</p>
    """

    text_body = f"Hi {user_name},\n\nWelcome to Between AI! Your {role_label} account is ready.\n\nGo to dashboard: {cta_link}\n\n— Between AI Team"
    html_email = build_between_email_html(
        title=title,
        subtitle=subtitle,
        body_content_html=body_html,
        cta_text="Go to Dashboard",
        cta_url=cta_link,
        badge_text=badge
    )

    email_sent = send_email(to_email=user_email, subject=subject, html_body=html_email, text_body=text_body)

    # Brevo CRM Integration
    try:
        from api.services.brevo_service import sync_contact, track_automation_event
        first_name = user_name.split()[0] if user_name else ""
        last_name = " ".join(user_name.split()[1:]) if len(user_name.split()) > 1 else ""
        
        attributes = {"USER_ROLE": role_label, "SIGNUP_SOURCE": "direct"}
        if custom_attributes:
            attributes.update(custom_attributes)

        sync_contact(
            email=user_email,
            first_name=first_name,
            last_name=last_name,
            attributes=attributes
        )
        track_automation_event(
            email=user_email,
            event_name=f"{role}_signup",
            properties={"role": role, "name": user_name}
        )
    except Exception as err:
        logger.warning("Brevo welcome sync failed for %s: %s", user_email, err)

    return email_sent


def send_support_ticket_confirmation(user_email: str, user_name: str, ticket_id: str, subject_text: str, message_text: str) -> bool:
    """
    Send a confirmation email when a support ticket is created.
    """
    from django.utils.html import escape
    safe_name = escape(user_name)
    safe_subject = escape(subject_text)
    safe_message = escape(message_text)

    ticket_short_id = str(ticket_id)[:8]
    subject = f"[Support Ticket #{ticket_short_id}] We have received your query"
    title = "Support Ticket Received"
    subtitle = f"Reference Ticket ID: #{ticket_short_id}"
    badge = "Support Request"
    cta_url = f"{FRONTEND_URL}/support?ticket_id={ticket_id}"

    body_html = f"""
    <p>Hi <strong>{safe_name}</strong>,</p>
    <p>We have received your support query. Our admin team is reviewing your ticket and will respond as soon as possible.</p>
    
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <p style="margin: 0 0 8px; font-size: 13px; color: #334155;"><strong style="color: #64748b;">Subject:</strong> {safe_subject}</p>
        <p style="margin: 0; font-size: 13px; color: #334155;"><strong style="color: #64748b;">Message:</strong> {safe_message}</p>
    </div>
    
    <p style="font-size: 13px; color: #64748b;">You can track real-time admin replies or chat directly via the Support & Appeals Portal.</p>
    """

    text_body = f"Hi {user_name},\n\nWe have received your support ticket #{ticket_short_id}.\nSubject: {subject_text}\n\nTrack ticket: {cta_url}\n\n— Between Support Team"
    html_email = build_between_email_html(
        title=title,
        subtitle=subtitle,
        body_content_html=body_html,
        cta_text="Open Support Portal",
        cta_url=cta_url,
        badge_text=badge
    )

    return send_email(to_email=user_email, subject=subject, html_body=html_email, text_body=text_body)


# ─────────────────────────────────────────────────────────────────────────────
# S1 — Round Unlocked: Notify seeker that a new assessment round has been opened
# ─────────────────────────────────────────────────────────────────────────────

def send_round_unlocked_to_seeker(
    seeker_email: str,
    seeker_name: str,
    job_title: str,
    company_name: str,
    round_name: str,
    round_type: str,
    test_link: str = None,
    result_date: str = None,
) -> bool:
    """
    Notify a job seeker that a new assessment round has been unlocked for them.
    Triggered when a recruiter forwards them to the next round.
    """
    subject = f"New Assessment Unlocked — {round_name} for {job_title}"
    title = "Assessment Round Unlocked"
    subtitle = f"{job_title} at {company_name}"
    badge = "New Round"
    cta_url = test_link if (test_link and test_link.startswith("http")) else f"{FRONTEND_URL}{test_link}" if test_link else f"{FRONTEND_URL}/jobs/applications"
    cta_text = "Start Assessment" if test_link else "View Application"

    round_type_labels = {
        "mcq": "Multiple Choice Quiz",
        "coding": "Technical Coding Challenge",
        "interview": "AI Video Interview",
    }
    round_type_display = round_type_labels.get(round_type, round_type.title() if round_type else "Assessment")

    result_date_html = f"""
    <tr>
        <td colspan="2" style="padding-bottom: 12px;">
            <p style="margin: 0 0 2px; font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Result Announcement</p>
            <p style="margin: 0; font-size: 13px; font-weight: 600; color: #475569;">{result_date}</p>
        </td>
    </tr>
    """ if result_date else ""

    body_html = f"""
    <p>Hi <strong>{seeker_name}</strong>,</p>
    <p>Congratulations! You have been shortlisted and a new assessment round has just been unlocked for your application to <strong>{job_title}</strong> at <strong>{company_name}</strong>.</p>

    <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 14px; padding: 20px; margin: 20px 0;">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
                <td style="padding-bottom: 12px; width: 50%;">
                    <p style="margin: 0 0 2px; font-size: 11px; color: #1e40af; font-weight: 700; text-transform: uppercase;">Round Name</p>
                    <p style="margin: 0; font-size: 15px; font-weight: 800; color: #1d4ed8;">{round_name}</p>
                </td>
                <td style="padding-bottom: 12px; width: 50%;">
                    <p style="margin: 0 0 2px; font-size: 11px; color: #1e40af; font-weight: 700; text-transform: uppercase;">Round Type</p>
                    <p style="margin: 0; font-size: 13px; font-weight: 700; color: #1e40af;">{round_type_display}</p>
                </td>
            </tr>
            <tr>
                <td style="padding-bottom: 12px;">
                    <p style="margin: 0 0 2px; font-size: 11px; color: #1e40af; font-weight: 700; text-transform: uppercase;">Position</p>
                    <p style="margin: 0; font-size: 13px; font-weight: 600; color: #2563eb;">{job_title} &bull; {company_name}</p>
                </td>
            </tr>
            {result_date_html}
        </table>
    </div>

    <p>Please log in to your Between Seeker Dashboard or click the button below to start your assessment. Complete it before the deadline to stay in the running.</p>
    """

    text_body = f"Hi {seeker_name},\n\nYour new assessment round '{round_name}' for {job_title} at {company_name} has been unlocked!\n\nStart now: {cta_url}\n\n— Between AI Platform"
    html_email = build_between_email_html(
        title=title,
        subtitle=subtitle,
        body_content_html=body_html,
        cta_text=cta_text,
        cta_url=cta_url,
        badge_text=badge
    )
    return send_email(to_email=seeker_email, subject=subject, html_body=html_email, text_body=text_body)


# ─────────────────────────────────────────────────────────────────────────────
# R1 — Round Completed: Notify recruiter that a candidate has submitted a round
# ─────────────────────────────────────────────────────────────────────────────

def send_round_completed_to_recruiter(
    recruiter_email: str,
    company_name: str,
    candidate_name: str,
    job_title: str,
    round_name: str,
    round_type: str,
    score: float = None,
    session_id: str = None,
) -> bool:
    """
    Notify a recruiter that a candidate has completed a round submission.
    Triggered after submit_mcq, submit_coding, or finalize_interview.
    """
    subject = f"Round Submitted — {candidate_name} completed {round_name} for {job_title}"
    title = "Candidate Round Submitted"
    subtitle = f"{round_name} — {job_title}"
    badge = "Round Complete"
    cta_url = f"{FRONTEND_URL}/dashboard/sessions/{session_id}" if session_id else f"{FRONTEND_URL}/dashboard"

    round_type_labels = {
        "mcq": "Multiple Choice Quiz",
        "coding": "Technical Coding Challenge",
        "interview": "AI Video Interview",
    }
    round_type_display = round_type_labels.get(round_type, round_type.title() if round_type else "Assessment")

    score_html = f"""
    <tr>
        <td style="padding-bottom: 12px;">
            <p style="margin: 0 0 2px; font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;">Score</p>
            <p style="margin: 0; font-size: 16px; font-weight: 800; color: #059669;">{int(score)}%</p>
        </td>
    </tr>
    """ if score is not None else ""

    body_html = f"""
    <p>Hi <strong>{company_name}</strong>,</p>
    <p>A candidate has just completed their assessment round for the <strong>{job_title}</strong> position. Their submission is ready for your review.</p>

    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px; margin: 20px 0;">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
                <td style="padding-bottom: 12px; width: 50%;">
                    <p style="margin: 0 0 2px; font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;">Candidate</p>
                    <p style="margin: 0; font-size: 16px; font-weight: 800; color: #0f172a;">{candidate_name}</p>
                </td>
                <td style="padding-bottom: 12px; width: 50%;">
                    <p style="margin: 0 0 2px; font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;">Position</p>
                    <p style="margin: 0; font-size: 14px; font-weight: 700; color: #2563eb;">{job_title}</p>
                </td>
            </tr>
            <tr>
                <td style="padding-bottom: 12px;">
                    <p style="margin: 0 0 2px; font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;">Round</p>
                    <p style="margin: 0; font-size: 14px; font-weight: 700; color: #1e293b;">{round_name} &bull; {round_type_display}</p>
                </td>
            </tr>
            {score_html}
        </table>
    </div>

    <p>Log in to your Between Recruiter Dashboard to review the full submission, scores, and decide whether to advance or reject this candidate.</p>
    """

    text_body = f"Hi {company_name},\n\n{candidate_name} has submitted their {round_name} for {job_title}.\n\nReview now: {cta_url}\n\n— Between AI Platform"
    html_email = build_between_email_html(
        title=title,
        subtitle=subtitle,
        body_content_html=body_html,
        cta_text="Review Submission",
        cta_url=cta_url,
        badge_text=badge
    )
    return send_email(to_email=recruiter_email, subject=subject, html_body=html_email, text_body=text_body)


# ─────────────────────────────────────────────────────────────────────────────
# R2 — High-Match Alert: Notify recruiter when a 80%+ match candidate applies
# ─────────────────────────────────────────────────────────────────────────────

def send_high_match_alert_to_recruiter(
    recruiter_email: str,
    company_name: str,
    seeker_name: str,
    job_title: str,
    match_score: float,
    session_id: str,
    seeker_skills: list = None,
) -> bool:
    """
    Special premium email to recruiter when a candidate with >= 80% match score applies.
    Highlights skills match and prompts urgent review.
    """
    subject = f"High-Match Candidate Alert — {seeker_name} ({int(match_score)}% Match) for {job_title}"
    title = "High-Match Candidate Applied"
    subtitle = f"{int(match_score)}% Compatibility Score — {job_title}"
    badge = "Top Candidate"
    cta_url = f"{FRONTEND_URL}/dashboard/sessions/{session_id}"

    top_skills = seeker_skills[:8] if seeker_skills else []
    skills_html = "".join([
        f'<span style="display: inline-block; background: rgba(37, 99, 235, 0.08); border: 1px solid rgba(37, 99, 235, 0.2); border-radius: 20px; padding: 3px 12px; margin: 3px; font-size: 12px; font-weight: 600; color: #1d4ed8;">{s}</span>'
        for s in top_skills
    ]) if top_skills else '<p style="color: #64748b; font-size: 13px;">Skills info available in the candidate profile.</p>'

    body_html = f"""
    <p>Hi <strong>{company_name}</strong>,</p>
    <p>A <strong>top-tier candidate</strong> just applied for the <strong>{job_title}</strong> position with an exceptional compatibility score. We recommend reviewing this candidate as a priority.</p>

    <div style="background: linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%); border: 1.5px solid #bfdbfe; border-radius: 16px; padding: 24px; margin: 20px 0;">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
                <td style="padding-bottom: 14px; width: 50%;">
                    <p style="margin: 0 0 2px; font-size: 11px; color: #1e40af; font-weight: 700; text-transform: uppercase;">Candidate</p>
                    <p style="margin: 0; font-size: 18px; font-weight: 900; color: #0f172a;">{seeker_name}</p>
                </td>
                <td style="padding-bottom: 14px; width: 50%;">
                    <p style="margin: 0 0 2px; font-size: 11px; color: #166534; font-weight: 700; text-transform: uppercase;">Match Score</p>
                    <p style="margin: 0; font-size: 28px; font-weight: 900; color: #059669;">{int(match_score)}%</p>
                </td>
            </tr>
            <tr>
                <td colspan="2" style="padding-bottom: 14px;">
                    <p style="margin: 0 0 2px; font-size: 11px; color: #1e40af; font-weight: 700; text-transform: uppercase;">Applied For</p>
                    <p style="margin: 0; font-size: 15px; font-weight: 700; color: #2563eb;">{job_title}</p>
                </td>
            </tr>
            <tr>
                <td colspan="2">
                    <p style="margin: 0 0 8px; font-size: 11px; color: #1e40af; font-weight: 700; text-transform: uppercase;">Matched Skills</p>
                    <div style="line-height: 2;">{skills_html}</div>
                </td>
            </tr>
        </table>
    </div>

    <p>This candidate's profile is highly aligned with your job requirements. Log in to review their full resume, ATS score breakdown, and take action immediately.</p>
    """

    text_body = f"Hi {company_name},\n\nHigh-Match Alert: {seeker_name} applied for {job_title} with a {int(match_score)}% match score.\n\nReview now: {cta_url}\n\n— Between AI Platform"
    html_email = build_between_email_html(
        title=title,
        subtitle=subtitle,
        body_content_html=body_html,
        cta_text="Review Top Candidate",
        cta_url=cta_url,
        badge_text=badge
    )
    return send_email(to_email=recruiter_email, subject=subject, html_body=html_email, text_body=text_body)


# ─────────────────────────────────────────────────────────────────────────────
# S2 — Round Score Result: Send seeker their assessment score after submission
# ─────────────────────────────────────────────────────────────────────────────

def send_round_score_to_seeker(
    seeker_email: str,
    seeker_name: str,
    job_title: str,
    company_name: str,
    round_name: str,
    round_type: str,
    score: float,
    correct_count: int = None,
    total_count: int = None,
    passed_count: int = None,
    total_problems: int = None,
) -> bool:
    """
    Email a job seeker their assessment score immediately after submission.
    Works for MCQ and Coding rounds (not interview, which requires manual review).
    """
    subject = f"Your Result — {round_name} for {job_title} at {company_name}"
    title = "Assessment Result"
    subtitle = f"{round_name} — {job_title} at {company_name}"
    badge = "Score Released"
    cta_url = f"{FRONTEND_URL}/jobs/applications"

    score_int = int(score)
    if score_int >= 80:
        score_color = "#059669"  # green
        score_label = "Excellent"
        result_bg = "#f0fdf4"
        result_border = "#bbf7d0"
    elif score_int >= 60:
        score_color = "#d97706"  # amber
        score_label = "Good"
        result_bg = "#fffbeb"
        result_border = "#fde68a"
    else:
        score_color = "#dc2626"  # red
        score_label = "Needs Improvement"
        result_bg = "#fef2f2"
        result_border = "#fecaca"

    # Build breakdown row based on round type
    breakdown_html = ""
    if round_type == "mcq" and correct_count is not None and total_count:
        breakdown_html = f"""
        <tr>
            <td colspan="2" style="padding-bottom: 12px;">
                <p style="margin: 0 0 2px; font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;">Questions Correct</p>
                <p style="margin: 0; font-size: 14px; font-weight: 800; color: #1e293b;">{correct_count} / {total_count}</p>
            </td>
        </tr>
        """
    elif round_type == "coding" and passed_count is not None and total_problems:
        breakdown_html = f"""
        <tr>
            <td colspan="2" style="padding-bottom: 12px;">
                <p style="margin: 0 0 2px; font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;">Problems Solved</p>
                <p style="margin: 0; font-size: 14px; font-weight: 800; color: #1e293b;">{passed_count} / {total_problems}</p>
            </td>
        </tr>
        """

    body_html = f"""
    <p>Hi <strong>{seeker_name}</strong>,</p>
    <p>Your submission for the <strong>{round_name}</strong> assessment has been evaluated. Here is your result:</p>

    <div style="background: {result_bg}; border: 1.5px solid {result_border}; border-radius: 16px; padding: 24px; margin: 20px 0; text-align: center;">
        <p style="margin: 0 0 4px; font-size: 12px; font-weight: 700; text-transform: uppercase; color: {score_color}; letter-spacing: 1px;">Your Score</p>
        <p style="margin: 0 0 4px; font-size: 52px; font-weight: 900; color: {score_color}; line-height: 1;">{score_int}%</p>
        <p style="margin: 0; font-size: 14px; font-weight: 700; color: {score_color};">{score_label}</p>
    </div>

    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px; margin: 16px 0;">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
                <td style="padding-bottom: 12px; width: 50%;">
                    <p style="margin: 0 0 2px; font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;">Round</p>
                    <p style="margin: 0; font-size: 14px; font-weight: 700; color: #1e293b;">{round_name}</p>
                </td>
                <td style="padding-bottom: 12px; width: 50%;">
                    <p style="margin: 0 0 2px; font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;">Company</p>
                    <p style="margin: 0; font-size: 14px; font-weight: 700; color: #2563eb;">{company_name}</p>
                </td>
            </tr>
            {breakdown_html}
        </table>
    </div>

    <p>Your result has been submitted to the hiring team. You can track your application status anytime from your Between Seeker Dashboard.</p>
    """

    text_body = f"Hi {seeker_name},\n\nYour {round_name} result for {job_title} at {company_name}: {score_int}% ({score_label})\n\nTrack application: {cta_url}\n\n— Between AI Platform"
    html_email = build_between_email_html(
        title=title,
        subtitle=subtitle,
        body_content_html=body_html,
        cta_text="View Application Status",
        cta_url=cta_url,
        badge_text=badge
    )
    return send_email(to_email=seeker_email, subject=subject, html_body=html_email, text_body=text_body)


# ─────────────────────────────────────────────────────────────────────────────
# R4 — Parse Quota Warning: Notify recruiter when 80% of monthly parse quota is used
# ─────────────────────────────────────────────────────────────────────────────

def send_parse_quota_warning_to_recruiter(
    recruiter_email: str,
    company_name: str,
    used: int,
    limit: int,
    tier: str,
    resets_on: str = "first of next month",
) -> bool:
    """
    Warn a recruiter that they have consumed 80% or more of their monthly parse quota.
    Triggered inside the check_rate_limit decorator after incrementing Redis counter.
    """
    subject = f"Parse Quota Warning — {used}/{limit} parses used this month"
    title = "Monthly Parse Quota Warning"
    subtitle = f"You have used {used} of {limit} resume parses ({int((used/limit)*100)}%)"
    badge = "Quota Alert"
    cta_url = f"{FRONTEND_URL}/dashboard/settings?tab=billing"

    percent_used = int((used / limit) * 100) if limit > 0 else 0
    remaining = limit - used
    bar_width = min(percent_used, 100)
    bar_color = "#dc2626" if percent_used >= 90 else "#d97706"

    body_html = f"""
    <p>Hi <strong>{company_name}</strong>,</p>
    <p>You have used <strong>{percent_used}%</strong> of your monthly resume parse quota on the <strong>{tier.title()}</strong> plan. Only <strong>{remaining} parses</strong> remain before your limit is reached.</p>

    <div style="background: #fffbeb; border: 1.5px solid #fde68a; border-radius: 14px; padding: 20px; margin: 20px 0;">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
                <td style="padding-bottom: 14px; width: 50%;">
                    <p style="margin: 0 0 2px; font-size: 11px; color: #92400e; font-weight: 700; text-transform: uppercase;">Parses Used</p>
                    <p style="margin: 0; font-size: 22px; font-weight: 900; color: #b45309;">{used}</p>
                </td>
                <td style="padding-bottom: 14px; width: 50%;">
                    <p style="margin: 0 0 2px; font-size: 11px; color: #92400e; font-weight: 700; text-transform: uppercase;">Monthly Limit</p>
                    <p style="margin: 0; font-size: 22px; font-weight: 900; color: #92400e;">{limit}</p>
                </td>
            </tr>
            <tr>
                <td colspan="2" style="padding-bottom: 8px;">
                    <p style="margin: 0 0 6px; font-size: 11px; color: #92400e; font-weight: 700; text-transform: uppercase;">Usage</p>
                    <div style="background: #fef3c7; border-radius: 999px; height: 10px; overflow: hidden;">
                        <div style="background: {bar_color}; width: {bar_width}%; height: 100%; border-radius: 999px;"></div>
                    </div>
                    <p style="margin: 6px 0 0; font-size: 12px; color: #78350f; font-weight: 600;">{percent_used}% used &bull; Resets {resets_on}</p>
                </td>
            </tr>
            <tr>
                <td colspan="2" style="padding-top: 8px;">
                    <p style="margin: 0 0 2px; font-size: 11px; color: #92400e; font-weight: 700; text-transform: uppercase;">Current Plan</p>
                    <p style="margin: 0; font-size: 14px; font-weight: 700; color: #b45309;">{tier.title()} Plan</p>
                </td>
            </tr>
        </table>
    </div>

    <p>To avoid disruption to your hiring workflow, consider upgrading your plan for higher monthly parse limits and additional features.</p>
    """

    text_body = f"Hi {company_name},\n\nWarning: You have used {used}/{limit} ({percent_used}%) of your monthly parse quota on the {tier.title()} plan.\n\nUpgrade plan: {cta_url}\n\n— Between AI Platform"
    html_email = build_between_email_html(
        title=title,
        subtitle=subtitle,
        body_content_html=body_html,
        cta_text="Upgrade Plan",
        cta_url=cta_url,
        badge_text=badge
    )
    return send_email(to_email=recruiter_email, subject=subject, html_body=html_email, text_body=text_body)

