import logging
from api.models import Notification, JobSeekerAccount
from api.services.email_service import send_new_job_notification_to_follower

logger = logging.getLogger(__name__)

def notify_followers_of_new_job(session):
    """
    Finds all job seekers who follow the company that posted the job (session),
    creates an in-app notification for them, and sends them an email.
    """
    try:
        company = session.company
        if not company:
            return
            
        job_title = session.job_title
        session_id = str(session.id)
        cid_str = str(company.id)
        
        # 1. Find all seekers following this company
        # We query the JSONField 'resume_data' where 'followed_companies' contains the company id.
        try:
            seekers = JobSeekerAccount.objects.filter(
                resume_data__followed_companies__contains=cid_str
            )
            # Fetch all to verify/iterate
            seekers_list = list(seekers)
        except Exception as e:
            # Fallback if DB doesn't support __contains JSON lookup properly
            logger.warning("Fast query for followed companies failed, falling back to python filter: %s", e)
            seekers_list = []
            for s in JobSeekerAccount.objects.all():
                if s.resume_data and isinstance(s.resume_data, dict):
                    followed = s.resume_data.get("followed_companies", [])
                    if isinstance(followed, list) and cid_str in followed:
                        seekers_list.append(s)
                        
        if not seekers_list:
            logger.info("No followers to notify for company %s", company.name)
            return
            
        logger.info("Notifying %d followers of new job: %s at %s", len(seekers_list), job_title, company.name)
        
        for seeker in seekers_list:
            # 2. Create in-app notification
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
                
            # 3. Send email notification
            try:
                send_new_job_notification_to_follower(
                    seeker_email=seeker.email,
                    seeker_name=seeker.full_name,
                    company_name=company.name,
                    job_title=job_title,
                    session_id=session_id
                )
            except Exception as ee:
                logger.error("Failed to send email notification to seeker %s: %s", seeker.email, ee)
                
    except Exception as e:
        logger.error("Error in notify_followers_of_new_job: %s", e)
