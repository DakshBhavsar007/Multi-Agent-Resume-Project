from django.db import migrations

def seed_data(apps, schema_editor):
    SubscriptionPlan = apps.get_model('api', 'SubscriptionPlan')
    LocationLookup = apps.get_model('api', 'LocationLookup')
    MarketRegionConfig = apps.get_model('api', 'MarketRegionConfig')
    SalaryTimelineConfig = apps.get_model('api', 'SalaryTimelineConfig')
    GrowthSkillFallback = apps.get_model('api', 'GrowthSkillFallback')

    # 1. Seed Subscription Plans
    plans = [
        # Seeker Plans
        {
            "id": "seeker_free",
            "name": "Free Forever",
            "price": 0.0,
            "period": "forever",
            "currency": "USD",
            "limits": {"resumes": 1, "applications": 5},
            "features": [
                "1 dynamic AI resume builder resume",
                "Basic resume safety analysis",
                "Up to 5 job applications per month",
                "Keystroke telemetry protection (1 profile)"
            ],
            "target_portal": "seeker",
            "quota_description": "Perfect for casual seekers looking to secure their identity."
        },
        {
            "id": "seeker_pro_monthly",
            "name": "Pro Monthly",
            "price": 49.0,
            "period": "month",
            "currency": "USD",
            "limits": {"resumes": -1, "applications": -1},
            "features": [
                "Unlimited dynamic AI resumes",
                "Deep safety analysis & fraud alerts",
                "Unlimited job applications",
                "Priority matching bypass queue",
                "Comprehensive keystroke telemetry profiling (unlimited)"
            ],
            "target_portal": "seeker",
            "quota_description": "For serious candidates searching actively."
        },
        {
            "id": "seeker_pro_yearly",
            "name": "Pro Yearly",
            "price": 399.0,
            "period": "year",
            "currency": "USD",
            "limits": {"resumes": -1, "applications": -1},
            "features": [
                "Everything in Pro Monthly",
                "Save 32% compared to monthly plan",
                "Direct API access to portfolio protection scanner",
                "VIP email support & resume audit checks"
            ],
            "target_portal": "seeker",
            "quota_description": "Best value for long-term career safety."
        },
        {
            "id": "seeker_premium",
            "name": "Premium Plan",
            "price": 199.0,
            "period": "month",
            "currency": "INR",
            "limits": {"applications": -1, "drafts": -1},
            "features": [
                "Unlimited applications",
                "Unlimited resume drafts",
                "Premium templates",
                "AI resume enhancer",
                "Priority visibility"
            ],
            "target_portal": "seeker",
            "quota_description": "Premium access for job seekers."
        },
        # Recruiter Plans
        {
            "id": "recruiter_free",
            "name": "Starter Plan",
            "price": 0.0,
            "period": "forever",
            "currency": "INR",
            "limits": {"sessions": 1, "resumes": 100},
            "features": [
                "One active session",
                "Up to 100 resumes",
                "Basic AI screening",
                "Standard support"
            ],
            "target_portal": "recruiter",
            "quota_description": "Perfect for testing the platform features."
        },
        {
            "id": "recruiter_business",
            "name": "Business Plan",
            "price": 1499.0,
            "period": "month",
            "currency": "INR",
            "limits": {"sessions": 5, "resumes": 2000},
            "features": [
                "Five active sessions",
                "Up to 2,000 resumes",
                "Advanced matching",
                "API access"
            ],
            "target_portal": "recruiter",
            "quota_description": "For growing teams that need regular hiring."
        },
        {
            "id": "recruiter_enterprise",
            "name": "Enterprise Plan",
            "price": 3999.0,
            "period": "year",
            "currency": "INR",
            "limits": {"sessions": -1, "resumes": -1},
            "features": [
                "Unlimited sessions",
                "Priority VIP support",
                "Custom integrations",
                "Advanced analytics"
            ],
            "target_portal": "recruiter",
            "quota_description": "For scale recruiting demands."
        },
        # Developer Plans
        {
            "id": "developer_free",
            "name": "Free",
            "price": 0.0,
            "period": "forever",
            "currency": "USD",
            "limits": {"parses": 100, "matches": 500, "chat": 100, "safety": 0},
            "features": [
                "100 resume parses/mo",
                "500 candidate matching operations/mo",
                "100 AI chatbot queries/mo",
                "0 safety scans/mo (upgrade required)"
            ],
            "target_portal": "developer",
            "quota_description": "Free tier for personal testing."
        },
        {
            "id": "developer_starter",
            "name": "Starter",
            "price": 79.0,
            "period": "month",
            "currency": "USD",
            "limits": {"parses": 1000, "matches": 10000, "chat": 2000, "safety": 100},
            "features": [
                "1,000 resume parses/mo",
                "10,000 candidate matching operations/mo",
                "2,000 AI chatbot queries/mo",
                "100 safety scans/mo included"
            ],
            "target_portal": "developer",
            "quota_description": "Best for micro SaaS integrations."
        },
        {
            "id": "developer_business",
            "name": "Business",
            "price": 299.0,
            "period": "month",
            "currency": "USD",
            "limits": {"parses": 10000, "matches": -1, "chat": -1, "safety": 1000},
            "features": [
                "10,000 resume parses/mo",
                "Unlimited candidate matching operations/mo",
                "Unlimited AI chatbot queries/mo",
                "1,000 safety scans/mo included"
            ],
            "target_portal": "developer",
            "quota_description": "For enterprise scale APIs integration."
        }
    ]

    for p_data in plans:
        SubscriptionPlan.objects.update_or_create(
            id=p_data["id"],
            defaults=p_data
        )

    # 2. Seed Location Lookups
    locations_data = {
        "India": {
            "Gujarat": ["Ahmedabad", "Gandhinagar", "Surat", "Vadodara", "Rajkot"],
            "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Thane", "Nashik"],
            "Karnataka": ["Bengaluru", "Mysore", "Hubli", "Mangalore"],
            "Delhi": ["New Delhi", "Delhi Cantt"],
            "Telangana": ["Hyderabad", "Warangal"],
            "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai"],
            "Uttar Pradesh": ["Noida", "Lucknow", "Kanpur", "Agra"],
            "Haryana": ["Gurugram", "Faridabad", "Panipat"]
        },
        "United States": {
            "California": ["San Francisco", "Los Angeles", "San Diego", "San Jose"],
            "New York": ["New York City", "Buffalo", "Rochester"],
            "Texas": ["Austin", "Houston", "Dallas", "San Antonio"],
            "Washington": ["Seattle", "Bellevue", "Redmond"],
            "Massachusetts": ["Boston", "Cambridge", "Worcester"]
        },
        "United Kingdom": {
            "England": ["London", "Manchester", "Birmingham", "Leeds", "Bristol"],
            "Scotland": ["Edinburgh", "Glasgow", "Aberdeen"]
        },
        "Canada": {
            "Ontario": ["Toronto", "Ottawa", "Mississauga", "Hamilton"],
            "British Columbia": ["Vancouver", "Victoria", "Burnaby"],
            "Quebec": ["Montreal", "Quebec City"]
        },
        "Germany": {
            "Bavaria": ["Munich", "Nuremberg", "Augsburg"],
            "Berlin": ["Berlin"],
            "Hamburg": ["Hamburg"]
        },
        "Singapore": {
            "Central Region": ["Singapore"]
        }
    }

    for country, states in locations_data.items():
        for state, cities in states.items():
            LocationLookup.objects.update_or_create(
                country=country,
                state=state,
                defaults={"cities": cities}
            )

    # 3. Seed MarketRegionConfig
    regions = [
        {"name": "Bengaluru", "fallback_value": 450, "color_hex": "#2563EB"},
        {"name": "San Francisco", "fallback_value": 380, "color_hex": "#0F56B3"},
        {"name": "Zurich", "fallback_value": 180, "color_hex": "#22C55E"},
        {"name": "London", "fallback_value": 240, "color_hex": "#8b5cf6"}
    ]
    for r_data in regions:
        MarketRegionConfig.objects.update_or_create(
            name=r_data["name"],
            defaults=r_data
        )

    # 4. Seed SalaryTimelineConfig
    timelines = [
        {"year": "2023", "salary_k": 112, "is_projection": False},
        {"year": "2024", "salary_k": 124, "is_projection": False},
        {"year": "2025", "salary_k": 138, "is_projection": False},
        {"year": "2026 (Est)", "salary_k": 150, "is_projection": True}
    ]
    for t_data in timelines:
        SalaryTimelineConfig.objects.update_or_create(
            year=t_data["year"],
            defaults=t_data
        )

    # 5. Seed GrowthSkillFallback
    skills = [
        {
            "name": "Prompt Engineering",
            "growth_percentage": 48,
            "median_salary": 185000,
            "description": "Highest request growth this quarter"
        },
        {
            "name": "Design Systems",
            "growth_percentage": 14,
            "median_salary": 140000,
            "description": "Steady enterprise adoption indices"
        },
        {
            "name": "Rust / Go Backend",
            "growth_percentage": 22,
            "median_salary": 165000,
            "description": "High throughput performance demand"
        }
    ]
    for s_data in skills:
        GrowthSkillFallback.objects.update_or_create(
            name=s_data["name"],
            defaults=s_data
        )


def reverse_seed_data(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ('api', '0022_growthskillfallback_locationlookup_and_more'),
    ]

    operations = [
        migrations.RunPython(seed_data, reverse_seed_data),
    ]
