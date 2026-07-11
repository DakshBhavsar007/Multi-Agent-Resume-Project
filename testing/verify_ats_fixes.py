import os
import sys
import django

# Add backend directory to python path
sys.path.insert(0, r"c:\Users\parul\Desktop\Resume Project\DAIICT_Hackathon-26\backend")

# Setup Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "vishleshan_backend.settings")
django.setup()

from agents.ats_compatibility_agent import AtsCompatibilityAgent
from agents.resume_enhancer_agent import ResumeEnhancerAgent

def test_ats_scoring_engine():
    print("--- Initializing Agents ---")
    ats_agent = AtsCompatibilityAgent()
    enhancer_agent = ResumeEnhancerAgent()

    # Define a mock resume data structure
    parsed_data = {
        "personalInfo": {
            "fullName": "Jane Doe",
            "title": "Software Engineer",
            "email": "jane@example.com",
            "phone": "123-456-7890",
            "location": "San Francisco, CA"
        },
        "summary": "Experienced Software Engineer specialized in building Python APIs and React web applications.",
        "skills": ["Python", "JavaScript", "React", "SQL", "Git"],
        "experience": [
            {
                "company": "Tech Innovations Inc.",
                "title": "Backend Developer",
                "startDate": "Jan 2022",
                "endDate": "Present",
                "bullets": [
                    "Architected and implemented high-performance backend microservices using Python and Django.",
                    "Optimized SQL query performance, reducing database latency by 35% and improving throughput.",
                    "Collaborated with cross-functional team members to design robust and secure RESTful APIs."
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
                "description": "Designed and deployed a scalable backend system using Flask and Docker to manage concurrent purchases.",
                "techStack": ["Python", "Flask", "Docker", "PostgreSQL"]
            }
        ]
    }

    target_jd = """
    We are looking for a Senior Python Developer to join our team. 
    Requirements:
    - Minimum 3 years of work experience with Python development
    - Proficient in Flask, Django, Docker, and PostgreSQL database optimization
    - Experience building and architecting RESTful APIs and Microservices
    - Good knowledge of testing using pytest and CI/CD pipelines
    - Bachelor's degree in Computer Science or similar technical field
    """

    print("\n--- Running ATS Compatibility Agent ---")
    report = ats_agent.analyze(None, parsed_data, target_jd)
    
    print("\n--- Parsing & Scoring Results ---")
    print(f"Overall Calculated Score: {report['overallScore']}/100")
    
    db = report["detailed_breakdown"]
    kw_score = db["keyword_match"]["score"]
    sk_score = db["skills_match"]["score"]
    exp_score = db["experience_relevance"]["score"]
    proj_score = db["project_relevance"]["score"]
    edu_score = db["education_match"]["score"]
    fmt_score = db["ats_formatting"]["score"]
    
    print(f"Sub-Scores breakdown:")
    print(f"  - Keyword Match (35%): {kw_score}%")
    print(f"  - Skills Match (25%): {sk_score}%")
    print(f"  - Experience Relevance (15%): {exp_score}%")
    print(f"  - Project Relevance (10%): {proj_score}%")
    print(f"  - Education Match (5%): {edu_score}%")
    print(f"  - ATS Formatting (10%): {fmt_score}%")
    
    expected_overall = round(
        kw_score * 0.35 +
        sk_score * 0.25 +
        exp_score * 0.15 +
        proj_score * 0.10 +
        edu_score * 0.05 +
        fmt_score * 0.10
    )
    
    print(f"Expected Overall Score (mathematically computed): {expected_overall}")
    
    # Assert correctness of overall score calculation
    assert report["overallScore"] == expected_overall, f"Overall score mismatch! Got {report['overallScore']}, expected {expected_overall}."
    print("SUCCESS: ATS overall score calculation is mathematically correct.")
    
    # Assert presence of diagnostic reporting
    assert len(report["strengths"]) > 0, "No strengths list generated!"
    assert len(report["weaknesses"]) > 0, "No weaknesses list generated!"
    assert len(report["topSuggestions"]) > 0, "No recommendations/suggestions checklist generated!"
    print("SUCCESS: Diagnostic strengths, weaknesses, and top suggestions checklist are correctly populated.")

    # Assert presence of point explanations explaining every point awarded or deducted
    assert "explanations" in report, "No explanations list generated!"
    assert len(report["explanations"]) == 6, f"Expected 6 component explanations, got {len(report.get('explanations', []))}."
    print("SUCCESS: Component point explanations validated.")
    
    print("\n--- Running Resume AI Enhancer Agent ---")
    enhance_result = enhancer_agent.enhance(parsed_data, target_jd, live_ats_score=report["overallScore"])
    
    assert enhance_result["success"] is True, "AI enhancement request failed!"
    enhanced_data = enhance_result["data"]
    
    print(f"Original Score: {enhanced_data['ats_score_original']}")
    print(f"Enhanced Score: {enhanced_data['ats_score_enhanced']}")
    print(f"Improvement Percentage: {enhanced_data['improvement_percentage']}%")
    print(f"Keywords Added: {enhanced_data['keywords_added']}")
    print(f"Skills Improved count: {enhanced_data['skills_improved']}")
    print(f"Sections Improved: {enhanced_data['sections_improved']}")
    
    # Assert enhancement score and metadata properties
    assert enhanced_data["ats_score_enhanced"] >= enhanced_data["ats_score_original"], "Enhanced score cannot be lower than original score."
    assert "professional_summary_enhanced" in enhanced_data, "Missing enhanced summary output."
    assert "enhanced_experience" in enhanced_data, "Missing enhanced experience output."
    assert "enhanced_projects" in enhanced_data, "Missing enhanced projects output."
    
    # Check that summary has period at end
    summary_rewritten = enhanced_data["summary_rewrite"]
    if summary_rewritten:
        assert summary_rewritten.endswith("."), "Rewritten summary must end with a period!"
        
    print("SUCCESS: AI Resume Enhancement results validated successfully (no fabrication rules applied).")
    print("\nALL ATS ENGINE AND AI ENHANCEMENT VERIFICATION TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_ats_scoring_engine()
