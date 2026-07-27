import logging
from api.models import Notification, JobSeekerAccount
from api.services.email_service import send_new_job_notification_to_follower

logger = logging.getLogger(__name__)

def notify_followers_of_new_job(session):
    """
    Finds all active job seekers who follow the company that posted the job (session),
    creates an in-app notification for them, and sends them an email notification.
    """
    try:
        company = session.company
        if not company:
            return

        job_title = session.job_title
        session_id = str(session.id)
        cid_str = str(company.id)

        # 1. Find all seekers following this company
        seekers_list = []
        try:
            seekers = JobSeekerAccount.objects.filter(
                resume_data__followed_companies__contains=cid_str,
                is_active=True
            )
            seekers_list = list(seekers)
        except Exception as e:
            logger.warning("Fast query for followed companies failed, falling back to python filter: %s", e)

        # Fallback python iteration if ORM query returned no results or failed
        if not seekers_list:
            all_seekers = JobSeekerAccount.objects.filter(is_active=True)
            for s in all_seekers:
                if s.resume_data and isinstance(s.resume_data, dict):
                    followed = s.resume_data.get("followed_companies", [])
                    if isinstance(followed, list) and (cid_str in followed or str(company.id) in followed):
                        seekers_list.append(s)

        if not seekers_list:
            print(f"[NOTIFY FOLLOWERS] No active followers found for company {company.name} ({cid_str})", flush=True)
            return

        print(f"[NOTIFY FOLLOWERS] Sending in-app & email notifications to {len(seekers_list)} follower(s) for '{job_title}' at '{company.name}'", flush=True)

        for seeker in seekers_list:
            # 2. Create in-app notification for Job Seeker
            try:
                Notification.objects.create(
                    seeker=seeker,
                    type="new_match",
                    title=f"New job at {company.name}",
                    message=f"{company.name} just posted a new role: {job_title}. Apply now!",
                    link=f"/jobs/{session_id}"
                )
            except Exception as ne:
                logger.error("Failed to create in-app notification for seeker %s: %s", seeker.email, ne)

            # 3. Send email notification via Brevo / SMTP
            try:
                send_new_job_notification_to_follower(
                    seeker_email=seeker.email,
                    seeker_name=seeker.full_name or "Job Seeker",
                    company_name=company.name,
                    job_title=job_title,
                    session_id=session_id
                )
            except Exception as ee:
                logger.error("Failed to send email notification to seeker %s: %s", seeker.email, ee)

    except Exception as e:
        logger.error("Error in notify_followers_of_new_job: %s", e)
