import os
import sys
import time
import asyncio
import json
import traceback

# Add backend directory to python path
sys.path.insert(0, r"c:\Users\parul\Desktop\Resume Project\DAIICT_Hackathon-26\backend")

# Setup Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "vishleshan_backend.settings")
import django
django.setup()
os.environ["DJANGO_ALLOW_ASYNC_UNSAFE"] = "true"

from api.models import Company, Session, Candidate, JobApplication, JobSeekerAccount
from agents.ats_compatibility_agent import AtsCompatibilityAgent
from agents.resume_enhancer_agent import ResumeEnhancerAgent
from agents.parsing_agent import ResumeParsingAgent
from agents.ats_parsing_agent import AtsParsingAgent
from agents.advanced_ats_parsing_agent import AdvancedAtsParsingAgent
from agents.normalization_agent import SkillNormalizationAgent
from agents.mcq_paper_parser_agent import MCQPaperParserAgent
from agents.matching_agent import SemanticMatchingAgent
from agents.jd_generator_agent import JobDescriptionGeneratorAgent
from agents.interview_agent import InterviewAgent
from agents.job_recommendation_agent import JobRecommendationAgent
from agents.inference_agent import SkillInferenceAgent
from agents.fraud_agent import FraudDetectionAgent
from agents.cover_letter_agent import CoverLetterGeneratorAgent
from agents.chatbot_agent import RecruiterChatbotAgent
from agents.round_recommendation_agent import RoundRecommendationAgent

# Mock resume and job data for testing
MOCK_RESUME_TEXT = """
John Doe
john.doe@example.com | +1 (123) 456-7890 | San Francisco, CA
linkedin.com/in/johndoe | github.com/johndoe

Professional Summary:
Result-oriented Software Engineer with 4 years of experience specializing in building high-performance Python backends and React frontend applications. Experienced in Docker containerization and PostgreSQL optimization.

Skills:
Python, Django, FastAPI, React, JavaScript, SQL, PostgreSQL, Docker, Git, CI/CD, HTML, CSS

Work Experience:
Software Engineer | Tech Innovations Inc. | San Francisco, CA
Jan 2022 - Present
- Designed and built scalable RESTful APIs using Python and FastAPI, improving response times by 20%.
- Integrated PostgreSQL database and optimized SQL queries, reducing page load latency by 15%.
- Maintained Frontend React dashboards with state management using Redux.

Projects:
E-Commerce Microservices Platform | github.com/johndoe/ecommerce
- Built a scalable backend utilizing FastAPI and PostgreSQL, containerized with Docker.
- Implemented user authentication and payment integration.

Education:
Bachelor of Science in Computer Science | State University | Sep 2018 - May 2022
"""

MOCK_JD_TEXT = """
We are looking for a Software Engineer to join our tech team.
Requirements:
- 3+ years of experience in Python development (Django/FastAPI).
- Proficient with databases (PostgreSQL/SQL optimization).
- Experience with frontend frameworks, especially React and JavaScript.
- Experience with Docker and containerized deployment.
- Located in San Francisco or open to Remote.
"""

MOCK_PARSED_DATA = {
    "personalInfo": {
        "fullName": "John Doe",
        "title": "Software Engineer",
        "email": "john.doe@example.com",
        "phone": "+1 (123) 456-7890",
        "location": "San Francisco, CA"
    },
    "summary": "Software Engineer with 4 years of experience specializing in building high-performance Python backends and React frontends.",
    "skills": ["Python", "Django", "FastAPI", "React", "SQL", "PostgreSQL", "Docker", "Git"],
    "experience": [
        {
            "company": "Tech Innovations Inc.",
            "title": "Software Engineer",
            "startDate": "Jan 2022",
            "endDate": "Present",
            "bullets": [
                "Designed and built scalable RESTful APIs using Python and FastAPI.",
                "Optimized PostgreSQL queries, reducing database latency by 15%."
            ]
        }
    ],
    "education": [
        {
            "school": "State University",
            "degree": "Bachelor of Science in Computer Science",
            "startDate": "Sep 2018",
            "endDate": "May 2022"
        }
    ],
    "projects": [
        {
            "name": "E-Commerce Microservices Platform",
            "description": "Built a scalable backend utilizing FastAPI and PostgreSQL, containerized with Docker."
        }
    ]
}

async def run_agent_test(name, func, *args, **kwargs):
    print(f"\nTesting {name}...")
    start_time = time.perf_counter()
    status = "Passed"
    accuracy = 100.0
    error_msg = ""
    result = None
    try:
        if asyncio.iscoroutinefunction(func):
            result = await func(*args, **kwargs)
        else:
            result = func(*args, **kwargs)
    except Exception as e:
        status = "Failed"
        accuracy = 0.0
        error_msg = f"{str(e)}\n{traceback.format_exc()}"
        print(f"Error testing {name}: {e}")
        
    duration = (time.perf_counter() - start_time) * 1000
    return {
        "name": name,
        "status": status,
        "accuracy": accuracy,
        "duration_ms": duration,
        "error": error_msg,
        "result": result
    }

async def main():
    print("====================================================")
    print("   VISLESHAN AGENT ACCURACY TESTING SUITE           ")
    print("====================================================\n")

    # 1. Setup Temporary Django DB Objects for DB-dependent agents
    print("--- Setting up temporary DB records for evaluation ---")
    company = Company.objects.first()
    if not company:
        company = Company.objects.create(
            name="Vishleshan Accuracy Test Org",
            email="test-accuracy@vishleshan.com",
            password_hash="fake-hash"
        )
    
    seeker = JobSeekerAccount.objects.filter(email="seeker-accuracy@vishleshan.com").first()
    created_seeker = False
    if not seeker:
        seeker = JobSeekerAccount.objects.create(
            full_name="Accuracy Seeker",
            email="seeker-accuracy@vishleshan.com",
            password_hash="fake-hash",
            skills=["Python", "Django", "React", "Docker", "PostgreSQL"],
            resume_data={
                "total_experience_years": 4.0,
                "location": "San Francisco, CA"
            }
        )
        created_seeker = True

    session = Session.objects.filter(name="Accuracy Test Job").first()
    if not session:
        session = Session.objects.create(
            company=company,
            name="Accuracy Test Job",
            job_title="Software Engineer",
            job_description=MOCK_JD_TEXT,
            status="active",
            criteria={
                "required_skills": ["Python", "Django", "React", "Docker", "PostgreSQL"],
                "min_experience": 3,
                "preferred_locations": ["San Francisco", "Remote"],
                "weights": {"skills": 0.5, "experience": 0.3, "location": 0.2}
            },
            inferred_skills=["Python", "Django", "React", "Docker", "PostgreSQL"]
        )

    candidate = Candidate.objects.filter(name="John Doe Test").first()
    if not candidate:
        candidate = Candidate.objects.create(
            session=session,
            name="John Doe Test",
            email="john.doe.test@example.com",
            location="San Francisco, CA",
            total_experience_years=4.0,
            normalized_skills=[
                {"skill": "Python", "canonical_skill": "Python", "years": 4.0, "level": "expert"},
                {"skill": "Django", "canonical_skill": "Django", "years": 4.0, "level": "expert"},
                {"skill": "React", "canonical_skill": "React", "years": 2.0, "level": "intermediate"},
                {"skill": "Docker", "canonical_skill": "Docker", "years": 1.5, "level": "intermediate"},
                {"skill": "PostgreSQL", "canonical_skill": "PostgreSQL", "years": 3.0, "level": "expert"}
            ],
            match_score=94.0,
            recommendation="Strong"
        )

    # Make sure candidate is registered as a job application
    JobApplication.objects.get_or_create(
        seeker=seeker,
        session=session,
        candidate=candidate,
        status="applied"
    )

    # Create a temporary resume file for parsing_agent test
    temp_resume_path = "scratch/temp_test_resume.txt"
    with open(temp_resume_path, "w") as f:
        f.write(MOCK_RESUME_TEXT)

    results = []

    # 2. Test AtsCompatibilityAgent
    ats_comp = AtsCompatibilityAgent()
    results.append(await run_agent_test(
        "AtsCompatibilityAgent",
        ats_comp.analyze,
        None, MOCK_PARSED_DATA, MOCK_JD_TEXT
    ))
    # Validate AtsCompatibilityAgent output
    if results[-1]["status"] == "Passed":
        res = results[-1]["result"]
        if not (res.get("overallScore") is not None and "detailed_breakdown" in res):
            results[-1]["status"] = "Failed"
            results[-1]["accuracy"] = 0.0
            results[-1]["error"] = "Missing expected keys overallScore/detailed_breakdown"

    # 3. Test ResumeEnhancerAgent
    enhancer = ResumeEnhancerAgent()
    results.append(await run_agent_test(
        "ResumeEnhancerAgent",
        enhancer.enhance,
        MOCK_PARSED_DATA, MOCK_JD_TEXT, 75
    ))
    if results[-1]["status"] == "Passed":
        res = results[-1]["result"]
        if not (res.get("success") is True and "data" in res):
            results[-1]["status"] = "Failed"
            results[-1]["accuracy"] = 0.0
            results[-1]["error"] = "Enhancement failed or data missing"

    # 4. Test ResumeParsingAgent
    parser = ResumeParsingAgent()
    results.append(await run_agent_test(
        "ResumeParsingAgent",
        parser.parse,
        temp_resume_path, "txt"
    ))
    if results[-1]["status"] == "Passed":
        res = results[-1]["result"]
        if not (res.get("email") == "john.doe@example.com" or res.get("name") is not None):
            results[-1]["status"] = "Failed"
            results[-1]["accuracy"] = 50.0  # partial accuracy if parsing succeeded but fields missed
            results[-1]["error"] = "Name or email extraction missing"

    # 5. Test AtsParsingAgent
    ats_parser = AtsParsingAgent()
    results.append(await run_agent_test(
        "AtsParsingAgent",
        ats_parser.parse,
        MOCK_RESUME_TEXT
    ))
    if results[-1]["status"] == "Passed":
        res = results[-1]["result"]
        if not (res.get("personalInfo") and res.get("skills")):
            results[-1]["status"] = "Failed"
            results[-1]["accuracy"] = 0.0
            results[-1]["error"] = "Schema extraction failed"

    # 6. Test AdvancedAtsParsingAgent
    adv_parser = AdvancedAtsParsingAgent()
    results.append(await run_agent_test(
        "AdvancedAtsParsingAgent",
        adv_parser.parse,
        MOCK_RESUME_TEXT
    ))
    if results[-1]["status"] == "Passed":
        res = results[-1]["result"]
        if not (res.get("personalInfo") and res.get("skills")):
            results[-1]["status"] = "Failed"
            results[-1]["accuracy"] = 0.0
            results[-1]["error"] = "Schema extraction failed"

    # 7. Test SkillNormalizationAgent
    norm_agent = SkillNormalizationAgent()
    results.append(await run_agent_test(
        "SkillNormalizationAgent",
        norm_agent.normalize,
        ["python3", "reactjs", "postgres database"]
    ))
    if results[-1]["status"] == "Passed":
        res = results[-1]["result"]
        if not isinstance(res, list) or len(res) == 0:
            results[-1]["status"] = "Failed"
            results[-1]["accuracy"] = 0.0
            results[-1]["error"] = "Failed to normalize list"

    # 8. Test MCQPaperParserAgent
    mcq_parser = MCQPaperParserAgent()
    results.append(await run_agent_test(
        "MCQPaperParserAgent",
        mcq_parser.parse_questions_with_llm,
        "1. What is Python?\nA. Language\nB. Snake\nC. Both\nD. None\nCorrect Option: A"
    ))
    if results[-1]["status"] == "Passed":
        res = results[-1]["result"]
        if not isinstance(res, list):
            results[-1]["status"] = "Failed"
            results[-1]["accuracy"] = 0.0
            results[-1]["error"] = "Failed to parse questions"

    # 9. Test SemanticMatchingAgent
    match_agent = SemanticMatchingAgent()
    candidate_profile = {
        "normalized_skills": [
            {"canonical_skill": "Python", "years": 4.0},
            {"canonical_skill": "Django", "years": 3.0}
        ],
        "total_experience_years": 4.0,
        "location": "San Francisco, CA"
    }
    job_criteria = {
        "required_skills": ["Python", "Django"],
        "min_experience": 3,
        "preferred_locations": ["San Francisco"],
        "weights": {"skills": 0.5, "experience": 0.3, "location": 0.2}
    }
    results.append(await run_agent_test(
        "SemanticMatchingAgent",
        match_agent.match,
        candidate_profile, job_criteria
    ))
    if results[-1]["status"] == "Passed":
        res = results[-1]["result"]
        if not (res.get("match_score") is not None and "recommendation" in res):
            results[-1]["status"] = "Failed"
            results[-1]["accuracy"] = 0.0
            results[-1]["error"] = "Match result verification failed"

    # 10. Test JobDescriptionGeneratorAgent
    jd_gen = JobDescriptionGeneratorAgent()
    results.append(await run_agent_test(
        "JobDescriptionGeneratorAgent",
        jd_gen.generate_jd,
        "Python Engineer", ["Python", "Django", "FastAPI"], 3, "Vishleshan Corp"
    ))
    if results[-1]["status"] == "Passed":
        res = results[-1]["result"]
        if not (res and "Python Engineer" in res):
            results[-1]["status"] = "Failed"
            results[-1]["accuracy"] = 0.0
            results[-1]["error"] = "JD output does not contain job title"

    # 11. Test InterviewAgent
    interview_agent = InterviewAgent()
    results.append(await run_agent_test(
        "InterviewAgent",
        interview_agent.generate_questions,
        "Python Engineer", MOCK_JD_TEXT, MOCK_PARSED_DATA, [], 3
    ))
    if results[-1]["status"] == "Passed":
        res = results[-1]["result"]
        if not isinstance(res, list) or len(res) == 0:
            results[-1]["status"] = "Failed"
            results[-1]["accuracy"] = 0.0
            results[-1]["error"] = "Failed to generate interview questions"

    # 12. Test JobRecommendationAgent
    rec_agent = JobRecommendationAgent()
    results.append(await run_agent_test(
        "JobRecommendationAgent",
        rec_agent.recommend_jobs,
        ["Python", "Django"], 4.0, "San Francisco", 2
    ))
    if results[-1]["status"] == "Passed":
        res = results[-1]["result"]
        # If active jobs database is empty, the fallback substring match runs and returns list
        if not isinstance(res, list):
            results[-1]["status"] = "Failed"
            results[-1]["accuracy"] = 0.0
            results[-1]["error"] = "Recommender returned non-list value"

    # 13. Test SkillInferenceAgent
    inf_agent = SkillInferenceAgent()
    results.append(await run_agent_test(
        "SkillInferenceAgent",
        inf_agent.infer_from_jd,
        MOCK_JD_TEXT
    ))
    if results[-1]["status"] == "Passed":
        res = results[-1]["result"]
        if not (res.get("inferred_role") and "required_skills" in res):
            results[-1]["status"] = "Failed"
            results[-1]["accuracy"] = 0.0
            results[-1]["error"] = "Role inference failed"

    # 14. Test FraudDetectionAgent
    fraud_agent = FraudDetectionAgent()
    results.append(await run_agent_test(
        "FraudDetectionAgent",
        fraud_agent.analyze_resume,
        MOCK_RESUME_TEXT
    ))
    if results[-1]["status"] == "Passed":
        res = results[-1]["result"]
        if not (res.get("originality_score") is not None and "plagiarism_score" in res):
            results[-1]["status"] = "Failed"
            results[-1]["accuracy"] = 0.0
            results[-1]["error"] = "Fraud analysis keys missing"

    # 15. Test CoverLetterGeneratorAgent
    cover_agent = CoverLetterGeneratorAgent()
    results.append(await run_agent_test(
        "CoverLetterGeneratorAgent",
        cover_agent.generate_cover_letter,
        "John Doe", ["Python", "Django"], [], "Python Engineer", MOCK_JD_TEXT, "Vishleshan Corp"
    ))
    if results[-1]["status"] == "Passed":
        res = results[-1]["result"]
        if not (res and "John Doe" in res):
            results[-1]["status"] = "Failed"
            results[-1]["accuracy"] = 0.0
            results[-1]["error"] = "Generated cover letter does not contain candidate name"

    # 16. Test RecruiterChatbotAgent
    chatbot_agent = RecruiterChatbotAgent()
    results.append(await run_agent_test(
        "RecruiterChatbotAgent",
        chatbot_agent.chat,
        "Who is our top candidate?", str(session.id), []
    ))
    if results[-1]["status"] == "Passed":
        res = results[-1]["result"]
        if not (res.get("reply") and "referenced_candidates" in res):
            results[-1]["status"] = "Failed"
            results[-1]["accuracy"] = 0.0
            results[-1]["error"] = "Chatbot reply format incorrect"

    # 17. Test RoundRecommendationAgent
    round_agent = RoundRecommendationAgent()
    results.append(await run_agent_test(
        "RoundRecommendationAgent",
        round_agent.recommend,
        "Python Engineer", MOCK_JD_TEXT
    ))
    if results[-1]["status"] == "Passed":
        res = results[-1]["result"]
        if not (isinstance(res, dict) and "recommended_rounds" in res):
            results[-1]["status"] = "Failed"
            results[-1]["accuracy"] = 0.0
            results[-1]["error"] = "Round recommendations missing"

    # Clean up temporary test file
    if os.path.exists(temp_resume_path):
        os.remove(temp_resume_path)

    # Clean up DB objects if we created them
    candidate.delete()
    session.delete()
    if created_seeker:
        seeker.delete()

    # 18. Output Results Table
    print("\n" + "=" * 80)
    print(f"{'AGENT NAME':<35} | {'STATUS':<10} | {'ACCURACY':<10} | {'LATENCY':<12}")
    print("-" * 80)
    
    total_acc = 0.0
    passed_count = 0
    for r in results:
        duration_str = f"{r['duration_ms']:.1f} ms"
        accuracy_str = f"{r['accuracy']:.1f}%"
        print(f"{r['name']:<35} | {r['status']:<10} | {accuracy_str:<10} | {duration_str:<12}")
        total_acc += r['accuracy']
        if r['status'] == "Passed":
            passed_count += 1
            
    avg_accuracy = total_acc / len(results)
    print("-" * 80)
    print(f"{'OVERALL AVERAGE ACCURACY':<35} | Passed {passed_count}/{len(results)} | {avg_accuracy:.2f}%")
    print("=" * 80 + "\n")

    # If any agent failed, print details
    failed = [r for r in results if r['status'] == "Failed"]
    if failed:
        print("FAILURES DETAILS:")
        for r in failed:
            print(f"--- {r['name']} Failure ---")
            print(r['error'])
            print()

if __name__ == "__main__":
    asyncio.run(main())
