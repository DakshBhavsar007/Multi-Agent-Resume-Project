"""
Run with: cd backend && python scripts/create_test_data.py

Creates test company, developer, session, and 15 fake candidates.
"""
import asyncio
import sys
import os
import secrets
import random
import uuid
from datetime import datetime, timedelta

# Add parent dir to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from passlib.context import CryptContext
from jose import jwt
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
JWT_SECRET = os.getenv("JWT_SECRET", "vishleshan-super-secret-key-change-me")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")


FAKE_CANDIDATES = [
    {"name": "Arjun Mehta", "email": "arjun@example.com", "phone": "+91-9876543210",
     "location": "Bangalore", "exp": 6.5,
     "skills": ["Python", "FastAPI", "PostgreSQL", "Docker", "AWS", "Redis"],
     "score": 92.5, "rec": "Strong Match", "status": "new", "round": 0},
    {"name": "Priya Sharma", "email": "priya@example.com", "phone": "+91-9876543211",
     "location": "Mumbai", "exp": 4.0,
     "skills": ["React", "TypeScript", "Node.js", "MongoDB", "Tailwind CSS"],
     "score": 85.3, "rec": "Strong Match", "status": "forwarded", "round": 1},
    {"name": "Rahul Gupta", "email": "rahul@example.com", "phone": "+91-9876543212",
     "location": "Delhi", "exp": 8.0,
     "skills": ["Java", "Spring Boot", "Kubernetes", "AWS", "PostgreSQL", "Kafka"],
     "score": 88.7, "rec": "Strong Match", "status": "forwarded", "round": 2},
    {"name": "Sneha Patel", "email": "sneha@example.com", "phone": "+91-9876543213",
     "location": "Hyderabad", "exp": 3.0,
     "skills": ["Python", "Django", "React", "MySQL", "Docker"],
     "score": 74.2, "rec": "Good Match", "status": "new", "round": 0},
    {"name": "Vikram Singh", "email": "vikram@example.com", "phone": "+91-9876543214",
     "location": "Pune", "exp": 5.5,
     "skills": ["Go", "Kubernetes", "Docker", "GCP", "Terraform", "CI/CD"],
     "score": 79.8, "rec": "Good Match", "status": "new", "round": 0},
    {"name": "Ananya Reddy", "email": "ananya@example.com", "phone": "+91-9876543215",
     "location": "Chennai", "exp": 2.0,
     "skills": ["JavaScript", "React", "HTML/CSS", "Firebase"],
     "score": 62.1, "rec": "Partial Match", "status": "new", "round": 0},
    {"name": "Karthik Nair", "email": "karthik@example.com", "phone": "+91-9876543216",
     "location": "Bangalore", "exp": 7.0,
     "skills": ["Python", "TensorFlow", "PyTorch", "NLP", "AWS", "Docker"],
     "score": 91.0, "rec": "Strong Match", "status": "forwarded", "round": 1},
    {"name": "Deepika Joshi", "email": "deepika@example.com", "phone": "+91-9876543217",
     "location": "Noida", "exp": 1.5,
     "skills": ["Python", "Flask", "SQL", "Pandas"],
     "score": 48.5, "rec": "Poor Match", "status": "rejected", "round": 0},
    {"name": "Amit Kumar", "email": "amit@example.com", "phone": "+91-9876543218",
     "location": "Kolkata", "exp": 9.0,
     "skills": ["Java", "Scala", "Apache Spark", "Kafka", "Airflow", "AWS"],
     "score": 83.6, "rec": "Strong Match", "status": "new", "round": 0},
    {"name": "Neha Verma", "email": "neha@example.com", "phone": "+91-9876543219",
     "location": "Bangalore", "exp": 4.5,
     "skills": ["React", "Next.js", "TypeScript", "GraphQL", "Tailwind CSS", "Redux"],
     "score": 87.4, "rec": "Strong Match", "status": "forwarded", "round": 1},
    {"name": "Siddharth Iyer", "email": "siddharth@example.com", "phone": "+91-9876543220",
     "location": "Hyderabad", "exp": 3.5,
     "skills": ["C++", "Python", "Machine Learning", "Computer Vision"],
     "score": 65.9, "rec": "Good Match", "status": "new", "round": 0},
    {"name": "Riya Kapoor", "email": "riya@example.com", "phone": "+91-9876543221",
     "location": "Gurgaon", "exp": 6.0,
     "skills": ["Python", "FastAPI", "React", "PostgreSQL", "Redis", "Docker", "AWS"],
     "score": 95.2, "rec": "Strong Match", "status": "hired", "round": 2},
    {"name": "Manish Tiwari", "email": "manish@example.com", "phone": "+91-9876543222",
     "location": "Jaipur", "exp": 2.5,
     "skills": ["PHP", "Laravel", "MySQL", "Vue.js"],
     "score": 42.3, "rec": "Poor Match", "status": "rejected", "round": 0},
    {"name": "Pooja Agarwal", "email": "pooja@example.com", "phone": "+91-9876543223",
     "location": "Mumbai", "exp": 5.0,
     "skills": ["Flutter", "Dart", "Firebase", "REST API", "Android", "iOS"],
     "score": 71.8, "rec": "Good Match", "status": "new", "round": 0},
    {"name": "Rohan Das", "email": "rohan@example.com", "phone": "+91-9876543224",
     "location": "Pune", "exp": 10.0,
     "skills": ["Python", "AWS", "Kubernetes", "Terraform", "Jenkins", "Ansible", "Docker"],
     "score": 89.1, "rec": "Strong Match", "status": "forwarded", "round": 2},
]


async def create_test_data():
    from models.database import (
        Base, Company, APIKey, DeveloperAccount, DeveloperAPIKey,
        BillingSubscription, Session, Candidate
    )

    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/vishleshan")
    engine = create_async_engine(DATABASE_URL)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        # ── 1. Test Company ──
        company_pwd = pwd_context.hash("demo123")
        company = Company(
            name="Demo Company",
            email="demo@test.com",
            password_hash=company_pwd,
            tier="business"
        )
        db.add(company)
        await db.flush()

        api_secret = "vish_live_" + secrets.token_urlsafe(24)
        api_public = "vish_pub_" + secrets.token_urlsafe(24)
        api_key = APIKey(
            company_id=company.id,
            key_name="Demo Key",
            secret_key=api_secret,
            public_key=api_public,
            environment="production"
        )
        db.add(api_key)

        company_jwt = jwt.encode({
            "company_id": str(company.id),
            "email": company.email,
            "tier": company.tier,
            "exp": datetime.utcnow() + timedelta(days=30)
        }, JWT_SECRET, algorithm=JWT_ALGORITHM)

        # ── 2. Test Developer ──
        dev_pwd = pwd_context.hash("dev123")
        dev = DeveloperAccount(
            company_name="Demo Dev Corp",
            email="dev@test.com",
            password_hash=dev_pwd,
            tier="starter",
            is_verified=True
        )
        db.add(dev)
        await db.flush()

        dev_test_secret = "vish_test_" + secrets.token_urlsafe(24)
        dev_test_public = "vish_pub_test_" + secrets.token_urlsafe(24)
        dev_live_secret = "vish_live_" + secrets.token_urlsafe(24)
        dev_live_public = "vish_pub_" + secrets.token_urlsafe(24)

        db.add(DeveloperAPIKey(developer_id=dev.id, key_name="Test Key",
                               secret_key=dev_test_secret, public_key=dev_test_public, environment="test"))
        db.add(DeveloperAPIKey(developer_id=dev.id, key_name="Live Key",
                               secret_key=dev_live_secret, public_key=dev_live_public, environment="production"))
        db.add(BillingSubscription(developer_id=dev.id, plan="starter", status="active"))

        dev_jwt = jwt.encode({
            "developer_id": str(dev.id),
            "email": dev.email,
            "tier": dev.tier,
            "exp": datetime.utcnow() + timedelta(days=30)
        }, JWT_SECRET, algorithm=JWT_ALGORITHM)

        # ── 3. Test Session with 3 Rounds ──
        session = Session(
            company_id=company.id,
            name="Senior Backend Engineer Hiring",
            job_title="Senior Backend Engineer",
            job_description="Looking for an experienced backend engineer with Python, FastAPI, PostgreSQL, Docker, and AWS expertise. Must have 4+ years of experience.",
            rounds=[
                {"name": "Resume Screening", "interviewer": "HR Team", "order": 0},
                {"name": "Technical Interview", "interviewer": "CTO", "order": 1},
                {"name": "Culture Fit & Offer", "interviewer": "CEO", "order": 2}
            ],
            criteria={
                "required_skills": ["Python", "FastAPI", "PostgreSQL", "Docker", "AWS"],
                "nice_to_have": ["Redis", "Kubernetes", "CI/CD"],
                "preferred_locations": ["Bangalore", "Mumbai", "Pune"],
                "min_experience": 4,
                "min_match_score": 50,
                "weights": {"skills": 0.5, "experience": 0.3, "location": 0.2}
            },
            status="active"
        )
        db.add(session)
        await db.flush()

        # ── 4. 15 Fake Candidates ──
        for fc in FAKE_CANDIDATES:
            normalized_skills = [
                {"raw_skill": s, "canonical_skill": s, "category": "Technical",
                 "proficiency": "intermediate", "confidence": 0.9, "is_inferred": False}
                for s in fc["skills"]
            ]
            match_details = {
                "match_score": fc["score"],
                "skill_score": fc["score"] + random.uniform(-5, 5),
                "experience_score": min(100, (fc["exp"] / 4) * 100),
                "location_score": 100 if fc["location"] in ["Bangalore", "Mumbai", "Pune"] else 30,
                "matched_skills": fc["skills"][:4],
                "missing_skills": ["Kubernetes", "CI/CD"] if fc["score"] < 80 else []
            }

            cand = Candidate(
                session_id=session.id,
                name=fc["name"],
                email=fc["email"],
                phone=fc["phone"],
                location=fc["location"],
                total_experience_years=fc["exp"],
                normalized_skills=normalized_skills,
                match_score=fc["score"],
                recommendation=fc["rec"],
                match_details=match_details,
                status=fc["status"],
                current_round_index=fc["round"],
                source="test_seed"
            )
            db.add(cand)

        await db.commit()

        # ── Print Results ──
        print("\n" + "=" * 60)
        print("  ✅  VISHLESHAN TEST DATA CREATED SUCCESSFULLY")
        print("=" * 60)
        print()
        print("─── Recruiter Dashboard ───")
        print(f"  Company ID:     {company.id}")
        print(f"  Email:          demo@test.com")
        print(f"  Password:       demo123")
        print(f"  Tier:           business")
        print(f"  API Secret Key: {api_secret}")
        print(f"  API Public Key: {api_public}")
        print(f"  JWT Token:      {company_jwt[:50]}...")
        print()
        print("─── Developer Portal ───")
        print(f"  Developer ID:   {dev.id}")
        print(f"  Email:          dev@test.com")
        print(f"  Password:       dev123")
        print(f"  Tier:           starter")
        print(f"  Test Key:       {dev_test_secret}")
        print(f"  Live Key:       {dev_live_secret}")
        print(f"  JWT Token:      {dev_jwt[:50]}...")
        print()
        print("─── Test Session ───")
        print(f"  Session ID:     {session.id}")
        print(f"  Job Title:      {session.job_title}")
        print(f"  Candidates:     {len(FAKE_CANDIDATES)}")
        print(f"  Rounds:         3 (Screening → Technical → Offer)")
        print()
        print("─── Headers for API Testing ───")
        print(f'  X-API-Key: {api_secret}')
        print(f'  Authorization: Bearer {company_jwt[:50]}...')
        print()
        print("─── Quick Test ───")
        print(f'  curl http://localhost:8000/api/v1/sessions \\')
        print(f'    -H "X-API-Key: {api_secret}"')
        print("=" * 60)

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(create_test_data())
