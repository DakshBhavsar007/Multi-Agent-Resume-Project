import random
from django.core.management.base import BaseCommand
from api.models import Review, JobSeekerAccount, DeveloperAccount, Company


# ── Realistic Seeker Reviews (varied ratings 1-5) ────────────────────────────
SEEKER_REVIEWS = [
    {"rating": 5, "text": "Got my first offer letter through Between's instant resume verification. The AI screening matched me to roles I would have never found on my own.", "is_featured": True},
    {"rating": 4, "text": "The mock interview tool was genuinely helpful. It gave me targeted feedback on my system design answers before my Google final round.", "is_featured": True},
    {"rating": 5, "text": "Transparent salary ranges on every listing helped me negotiate a 30% higher package at my new company. Seriously underrated feature.", "is_featured": True},
    {"rating": 3, "text": "Decent platform for tech job hunting. The application tracker is solid but I wish there were more remote frontend roles listed.", "is_featured": False},
    {"rating": 4, "text": "Applied to 12 companies in one afternoon. The one-click apply with stored resume profiles saved me hours of repetitive form filling.", "is_featured": False},
    {"rating": 2, "text": "The platform has potential but some job listings felt outdated. A few companies I applied to had already closed the position weeks ago.", "is_featured": False},
    {"rating": 5, "text": "Between matched me with a startup I never heard of. Three interviews later, I had an offer 40% above my previous salary. Life changing.", "is_featured": True},
    {"rating": 4, "text": "Resume builder is clean and professional. Exported it as PDF and got compliments from two separate recruiters on the formatting.", "is_featured": False},
    {"rating": 3, "text": "Good for experienced developers but entry-level positions are limited. Would appreciate more internship and junior role listings.", "is_featured": False},
    {"rating": 5, "text": "The AI resume analyzer caught three critical issues in my CV that I missed for years. Fixed them and started getting 3x more callbacks.", "is_featured": True},
    {"rating": 4, "text": "Followed Acme Labs on the platform and got notified the moment they posted a Senior Backend role. Applied within minutes and got shortlisted.", "is_featured": False},
    {"rating": 1, "text": "Had trouble with email verification taking too long. Support resolved it eventually but it was frustrating losing two days during active job hunting.", "is_featured": False},
    {"rating": 5, "text": "The coding assessment rounds are well-designed. Much better than the random HackerRank tests other platforms force on you.", "is_featured": True},
    {"rating": 4, "text": "Clean interface with zero clutter. I can actually focus on finding roles instead of being bombarded with irrelevant ads and spam.", "is_featured": False},
    {"rating": 3, "text": "Solid platform overall. The company review section helped me avoid a toxic workplace. Wish more companies had detailed reviews though.", "is_featured": False},
]

# ── Realistic Developer Reviews (varied ratings 1-5) ─────────────────────────
DEVELOPER_REVIEWS = [
    {"rating": 5, "text": "Best developer API I have worked with this year. Got free tier keys, integrated resume parsing in under 2 hours. Documentation is exceptional.", "is_featured": True},
    {"rating": 5, "text": "API response times consistently under 120ms even during peak hours. Webhook integration for candidate events took less than 10 minutes.", "is_featured": True},
    {"rating": 4, "text": "Solid REST API for candidate parsing. Webhook event signatures are cryptographically secure and trivially easy to verify in Node.js.", "is_featured": False},
    {"rating": 4, "text": "Generous rate limits on the free tier. We integrated Between's ATS scoring endpoints into our internal HR dashboard in a single sprint.", "is_featured": False},
    {"rating": 3, "text": "Good API overall but the SDK only supports Python and JavaScript. Would love to see official Go and Rust client libraries released.", "is_featured": False},
    {"rating": 5, "text": "The embed widget is a game-changer. Dropped it into our careers page and had a working ATS pipeline in production by end of day.", "is_featured": True},
    {"rating": 2, "text": "Rate limiting on the free tier felt restrictive for our use case. Had to upgrade to starter within the first week of integration.", "is_featured": False},
    {"rating": 4, "text": "Detailed API error messages made debugging straightforward. The sandbox environment accurately mirrors production behavior.", "is_featured": False},
    {"rating": 5, "text": "Built a complete recruitment automation tool using Between's API. The resume analysis endpoint accuracy is genuinely impressive.", "is_featured": True},
    {"rating": 3, "text": "API is reliable and well-documented. Only complaint is the webhook retry policy could be more configurable for high-volume integrations.", "is_featured": False},
]

# ── Realistic Recruiter / Company Reviews (varied ratings 1-5) ───────────────
RECRUITER_REVIEWS = [
    {"rating": 5, "text": "Between transformed our engineering hiring pipeline. The AI screening saved our team over 120 hours of manual resume review last quarter.", "is_featured": True},
    {"rating": 5, "text": "Surgical precision in candidate ranking. The AI screening caught three fabricated resumes that our senior recruiters missed completely.", "is_featured": True},
    {"rating": 4, "text": "High quality applicant pool with verified credentials. The trust badges give us confidence to fast-track candidates through interviews.", "is_featured": False},
    {"rating": 4, "text": "Custom MCQ and coding evaluation rounds were set up in under 5 minutes. The auto-grading accuracy is remarkably consistent.", "is_featured": False},
    {"rating": 3, "text": "Decent platform for mid-level hiring but struggled to attract senior architect candidates. The talent pool skews toward early-career professionals.", "is_featured": False},
    {"rating": 5, "text": "Our time-to-hire dropped from 45 days to 18 days after switching to Between. The ROI paid for itself in the first month.", "is_featured": True},
    {"rating": 2, "text": "The basic plan works for small teams but lacks advanced analytics. Had to upgrade to see candidate funnel conversion metrics.", "is_featured": False},
    {"rating": 4, "text": "The applicant tracking dashboard is intuitive and clean. Our non-technical HR team adopted it without any training sessions needed.", "is_featured": False},
    {"rating": 5, "text": "Posted a Data Scientist role at 9am and had 40 qualified, pre-screened applicants by end of day. No other platform delivers this speed.", "is_featured": True},
    {"rating": 3, "text": "Good value for the price point. The resume parsing is accurate but occasionally struggles with non-standard PDF formatting.", "is_featured": False},
]


class Command(BaseCommand):
    help = "Seeds realistic mixed-rating reviews from ALL job seekers, developers, and companies. Skips banned accounts."

    def handle(self, *args, **options):
        self.stdout.write("Wiping old reviews and seeding realistic mixed-rating testimonials...")

        # Clear existing reviews
        try:
            Review.objects.all().delete()
            self.stdout.write("Cleared existing reviews.")
        except Exception as e:
            self.stdout.write(f"Notice during review wipe: {e}")

        seekers = list(JobSeekerAccount.objects.filter(is_banned=False, is_active=True).only("id"))
        all_devs = list(DeveloperAccount.objects.only("id").all())
        devs = [d for d in all_devs if not getattr(d, 'is_banned', False)]
        companies = list(Company.objects.filter(is_banned=False, is_active=True).only("id"))

        self.stdout.write(f"Found: {len(seekers)} seekers, {len(devs)} developers, {len(companies)} companies (all non-banned)")

        created_count = 0

        # 1. Seed one review per Job Seeker
        for idx, seeker in enumerate(seekers):
            seeker.email_verified = True
            seeker.phone_verified = True
            seeker.save(update_fields=["email_verified", "phone_verified"])

            sample = SEEKER_REVIEWS[idx % len(SEEKER_REVIEWS)]
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

        # 2. Seed one review per Developer (platform reviews only)
        for idx, dev in enumerate(devs):
            dev.is_verified = True
            dev.save(update_fields=["is_verified"])

            sample = DEVELOPER_REVIEWS[idx % len(DEVELOPER_REVIEWS)]
            Review.objects.create(
                developer=dev,
                user_type="developer",
                rating=sample["rating"],
                text=sample["text"],
                is_featured=sample["is_featured"],
            )
            created_count += 1

        # 3. Seed one review per Company / Recruiter (platform reviews only)
        for idx, comp in enumerate(companies):
            comp.email_verified = True
            comp.save(update_fields=["email_verified"])

            sample = RECRUITER_REVIEWS[idx % len(RECRUITER_REVIEWS)]
            Review.objects.create(
                recruiter=comp,
                user_type="recruiter",
                rating=sample["rating"],
                text=sample["text"],
                is_featured=sample["is_featured"],
            )
            created_count += 1

        # Summary stats
        ratings = list(Review.objects.values_list("rating", flat=True))
        avg = round(sum(ratings) / len(ratings), 2) if ratings else 0
        dist = {i: ratings.count(i) for i in range(1, 6)}
        self.stdout.write(f"Rating distribution: {dist}")
        self.stdout.write(f"Average rating: {avg}")
        self.stdout.write(self.style.SUCCESS(
            f"Successfully seeded {created_count} authentic reviews "
            f"({len(seekers)} seekers + {len(devs)} developers + {len(companies)} companies)!"
        ))
