import random
from django.core.management.base import BaseCommand
from api.models import Review, JobSeekerAccount, DeveloperAccount, Company

SAMPLE_TESTIMONIALS = [
    {
        "text": "Between has completely transformed our engineering hiring process. The AI screening saved us over 120 hours of manual resume vetting!",
        "rating": 5,
        "user_type": "recruiter",
        "is_featured": True,
    },
    {
        "text": "Best website for developers! Got free API keys to build my resume analyzer project and the documentation is top notch.",
        "rating": 5,
        "user_type": "developer",
        "is_featured": True,
    },
    {
        "text": "I got my first offer letter at a top tech startup through Between's instant verification feature. Highly recommended!",
        "rating": 5,
        "user_type": "job_seeker",
        "is_featured": True,
    },
    {
        "text": "Surgical precision in candidate ranking! Detects fraudulent experience claims instantly.",
        "rating": 5,
        "user_type": "recruiter",
        "is_featured": True,
    },
    {
        "text": "Awesome developer experience. API response times are super low and webhook integration took less than 10 minutes.",
        "rating": 5,
        "user_type": "developer",
        "is_featured": False,
    },
    {
        "text": "The mock interview practice tool boosted my confidence before my final technical round.",
        "rating": 5,
        "user_type": "job_seeker",
        "is_featured": False,
    },
]

class Command(BaseCommand):
    help = "Seeds initial high-quality reviews and testimonials for Job Seekers, Developers, and Recruiters."

    def handle(self, *args, **options):
        self.stdout.write("Seeding testimonials and reviews...")

        seekers = list(JobSeekerAccount.objects.only("id").all())
        devs = list(DeveloperAccount.objects.only("id").all())
        companies = list(Company.objects.only("id").all())

        created_count = 0
        for sample in SAMPLE_TESTIMONIALS:
            u_type = sample["user_type"]
            text = sample["text"]
            
            # Skip duplicate review text
            if Review.objects.filter(text=text).exists():
                continue

            seeker = random.choice(seekers) if (u_type == "job_seeker" and seekers) else None
            dev = random.choice(devs) if (u_type == "developer" and devs) else None
            recruiter = random.choice(companies) if (u_type == "recruiter" and companies) else None

            # Company review target (random company for job seekers, None for platform reviews)
            company_target = random.choice(companies) if (u_type == "job_seeker" and companies and random.random() > 0.5) else None

            Review.objects.create(
                text=text,
                rating=sample["rating"],
                user_type=u_type,
                is_featured=sample["is_featured"],
                seeker=seeker,
                developer=dev,
                recruiter=recruiter,
                company=company_target,
            )
            created_count += 1

        self.stdout.write(self.style.SUCCESS(f"Successfully seeded {created_count} reviews!"))
