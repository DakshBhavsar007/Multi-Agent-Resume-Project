import os
import sys
import django
from datetime import datetime, timedelta
from django.utils import timezone

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'vishleshan_backend.settings')
django.setup()

from api.models import Company, Session, Candidate, JobSeekerAccount, JobApplication, Notification
from api.views.seeker_jobs import release_due_results_for_seeker

def run_tests():
    print("--- Starting Backend Delayed Results Verification ---")
    
    # 1. Setup mock data
    company = Company.objects.first()
    if not company:
        company = Company.objects.create(name="Test Company", email="test@company.com", password="password")
        
    seeker = JobSeekerAccount.objects.first()
    if not seeker:
        seeker = JobSeekerAccount.objects.create(
            full_name="Test Seeker",
            email="seeker@test.com",
            password_hash="hash",
            skills=["Python", "Django"]
        )

    # Clean previous test sessions
    Session.objects.filter(name="Verification Session").delete()

    # Future date and past date
    future_date = (timezone.now() + timedelta(hours=2)).isoformat()
    past_date = (timezone.now() - timedelta(hours=2)).isoformat()

    print(f"Creating session with future announcement date ({future_date}) and past announcement date ({past_date})...")

    # 2. Create test session
    session = Session.objects.create(
        company=company,
        name="Verification Session",
        job_title="Full Stack Developer",
        job_description="Python, React skills required.",
        rounds=[
            {"id": 1, "name": "Screening Round", "interviewer": "Alice", "order": 1, "result_announcement_date": past_date},
            {"id": 2, "name": "Technical Round", "interviewer": "Bob", "order": 2, "result_announcement_date": future_date}
        ]
    )

    candidate = Candidate.objects.create(
        session=session,
        name=seeker.full_name,
        email=seeker.email,
        current_round_index=1,
        status="new"
    )

    app = JobApplication.objects.create(
        seeker=seeker,
        session=session,
        candidate=candidate,
        status="applied"
    )

    print("Initial Application Status:", app.status)
    assert app.status == "applied", "Should start with status 'applied'"

    # 3. Simulate recruiter moving candidate to Technical round (Round 2)
    # The completed round is Round 1. The result declaration date of Round 1 is in the PAST.
    # Therefore, the status should update immediately!
    print("Moving candidate to Technical Round (completed Round 1, whose results are declared/past)...")
    candidate.current_round_index = 2
    candidate.status = "forwarded"
    candidate.save()

    # Run on-the-fly release check
    release_due_results_for_seeker(seeker)
    app.refresh_from_db()
    print("Application Status after Round 1 release:", app.status)
    assert app.status == "shortlisted", "Should be 'shortlisted' since Round 1 results are declared"
    
    notif = Notification.objects.filter(seeker=seeker, type="status_updated").first()
    assert notif is not None, "Notification should be generated for Round 1 release"
    print("Notification generated successfully:", notif.message)

    # 4. Now simulate recruiter rejecting the candidate in Round 2 (Technical Round)
    # The completed round is Round 2. The result declaration date is in the FUTURE.
    # Therefore, the status should NOT update to 'rejected' yet!
    print("Rejecting candidate in Technical Round (completed Round 2, whose results are in the FUTURE)...")
    candidate.status = "rejected"
    candidate.current_round_index = 2
    candidate.save()

    # Run on-the-fly release check
    app.refresh_from_db()
    # It should still be 'shortlisted' (since Round 2 results are not declared yet)
    release_due_results_for_seeker(seeker)
    app.refresh_from_db()
    print("Application Status before Round 2 release date:", app.status)
    assert app.status == "shortlisted", "Should remain 'shortlisted' because Round 2 results are in the future"

    # 5. Now update the session round to make the announcement date in the PAST
    print("Simulating passage of time by setting Round 2 results date to past...")
    session.rounds[1]["result_announcement_date"] = past_date
    session.save()

    # Run on-the-fly release check
    release_due_results_for_seeker(seeker)
    app.refresh_from_db()
    print("Application Status after Round 2 release date passes:", app.status)
    assert app.status == "rejected", "Should update to 'rejected' now that declaration date has passed"

    # 6. Test offer acceptance
    print("Testing offer acceptance workflow...")
    # Set candidate status to hired
    candidate.status = "hired"
    candidate.save()
    
    # Check that offer is not visible/accepted until declared
    session.rounds[1]["result_announcement_date"] = future_date
    session.save()
    app.status = "shortlisted"
    app.save()
    
    release_due_results_for_seeker(seeker)
    app.refresh_from_db()
    assert app.status == "shortlisted", "Hired status should not be released yet"

    # Make declaration date in past
    session.rounds[1]["result_announcement_date"] = past_date
    session.save()
    
    release_due_results_for_seeker(seeker)
    app.refresh_from_db()
    print("Application Status after hired released:", app.status)
    assert app.status == "hired", "Should be 'hired'"
    assert app.accepted_terms is False, "Should start with accepted_terms=False"

    # Simulate Seeker Accepting Offer
    print("Simulating seeker accepting offer...")
    app.accepted_terms = True
    app.save()
    
    # Check seeker dict profile response
    from api.views.seeker_auth import _seeker_dict
    seeker_dict = _seeker_dict(seeker)
    print("Hired By Company Name in Seeker Profile:", seeker_dict.get("hired_by"))
    assert seeker_dict.get("hired_by") == "Verification Session", "Seeker profile should show hired by company name"

    # Cleanup
    Session.objects.filter(name="Verification Session").delete()
    print("--- All Backend Tests Passed Successfully! ---")

if __name__ == "__main__":
    run_tests()
