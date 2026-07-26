import random
from django.core.management.base import BaseCommand
from api.models import Review, JobSeekerAccount, DeveloperAccount, Company

# Realistic reviews with mixed ratings (5, 4, 3, 4, 5 stars)
REALISTIC_SEEKER_REVIEWS = [
    {"rating": 5, "text": "I got my first offer letter at a top tech startup through Between's instant verification feature. Highly recommended!", "is_featured": True},
    {"rating": 4, "text": "The AI mock interview practice tool gave me great feedback on my tech answers before my final round.", "is_featured": True},
    {"rating": 5, "text": "Super clean interface! Transparent salary ranges on all job listings helped me negotiate a 30% higher package.", "is_featured": True},
    {"rating": 4, "text": "Really smooth application tracking system. I received email notifications at every stage of hiring.", "is_featured": False},
    {"rating": 3, "text": "Good platform overall for tech jobs. Would love to see more remote frontend positions added in future updates.", "is_featured": False},
]

REALISTIC_DEVELOPER_REVIEWS = [
    {"rating": 5, "text": "Best website for developers! Got free API keys to build my resume analyzer project and the documentation is top notch.", "is_featured": True},
    {"rating": 5, "text": "Awesome developer experience. API response times are under 120ms and webhook integration took less than 10 minutes.", "is_featured": True},
    {"rating": 4, "text": "Robust REST API for candidate parsing. Webhook event signatures are secure and very easy to verify in Python.", "is_featured": False},
    {"rating": 4, "text": "Great rate limits on the free tier. We integrated Between's ATS scoring endpoints into our internal HR dashboard effortlessly.", "is_featured": False},
]

REALISTIC_RECRUITER_REVIEWS = [
    {"rating": 5, "text": "Between has completely transformed our engineering hiring process. The AI screening saved us over 120 hours of manual resume vetting!", "is_featured": True},
    {"rating": 5, "text": "Surgical precision in candidate ranking! Detects fraudulent experience claims instantly before we schedule interviews.", "is_featured": True},
    {"rating": 4, "text": "High quality applicant pool. The verified badges give us full confidence in candidate credentials from day one.", "is_featured": False},
    {"rating": 4, "text": "Streamlined candidate assessment rounds. We set up custom MCQ and Coding evaluations in less than 5 minutes.", "is_featured": False},
]

class Command(BaseCommand):
    help = "Seeds clean, realistic mixed-rating reviews for Job Seekers, Developers, and Recruiters."

    def handle(self, *args, **options):
        self.stdout.write("Wiping old reviews and seeding realistic mixed-rating testimonials...")

        # Clear existing reviews
        try:
            Review.objects.all().delete()
            self.stdout.write("Cleared existing reviews.")
        except Exception as e:
            self.stdout.write(f"Notice during review wipe: {e}")

        seekers = list(JobSeekerAccount.objects.only("id").all())
        devs = list(DeveloperAccount.objects.only("id").all())
        companies = list(Company.objects.only("id").all())

        created_count = 0

        # 1. Seed for Job Seekers
        for idx, seeker in enumerate(seekers):
            sample = REALISTIC_SEEKER_REVIEWS[idx % len(REALISTIC_SEEKER_REVIEWS)]
            company_target = companies[idx % len(companies)] if (companies and idx % 2 == 0) else None
            Review.objects.create(
                seeker=seeker,
                company=company_target,
                user_type="job_seeker",
                rating=sample["rating"],
                text=sample["text"],
                is_featured=sample["is_featured"],
            )
            created_count += 1

        # 2. Seed for Developers
        for idx, dev in enumerate(devs):
            sample = REALISTIC_DEVELOPER_REVIEWS[idx % len(REALISTIC_DEVELOPER_REVIEWS)]
            Review.objects.create(
                developer=dev,
                user_type="developer",
                rating=sample["rating"],
                text=sample["text"],
                is_featured=sample["is_featured"],
            )
            created_count += 1

        # 3. Seed for Recruiters / Companies
        for idx, comp in enumerate(companies):
            sample = REALISTIC_RECRUITER_REVIEWS[idx % len(REALISTIC_RECRUITER_REVIEWS)]
            Review.objects.create(
                recruiter=comp,
                user_type="recruiter",
                rating=sample["rating"],
                text=sample["text"],
                is_featured=sample["is_featured"],
            )
            created_count += 1

        self.stdout.write(self.style.SUCCESS(f"Successfully seeded {created_count} authentic mixed-rating reviews across all accounts!"))
