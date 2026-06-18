"""
Resume Enhancer Agent
─────────────────────
Takes a parsed resume JSON and an optional target job description,
then uses the LLM to:
  - Rewrite weak bullet points with stronger action verbs
  - Suggest missing skills / keywords for ATS optimization
  - Score the resume and give improvement tips
  - Return both an enhanced version and a diff of changes
"""

import json
import logging
from agents.llm import RotateLLMClient

logger = logging.getLogger(__name__)


ENHANCE_PROMPT = """
You are an expert resume coach and ATS optimization specialist.

You will receive a parsed resume in JSON format and optionally a target job description.
Your task is to enhance the resume to make it stronger, more ATS-friendly, and more impactful.

**Instructions:**
1. Rewrite weak bullet points in the experience section using strong action verbs (e.g., "Engineered", "Optimized", "Led", "Architected", "Reduced", "Increased")
2. Quantify achievements wherever possible (e.g., "Improved load time by 40%")
3. Identify missing keywords/skills that appear in the job description but not the resume
4. Suggest 3–5 concrete improvements the candidate should make
5. Give an overall ATS score (0–100) for the original resume
6. Give a predicted ATS score (0–100) for the enhanced version

**Input Resume JSON:**
{resume_json}

**Target Job Description (if provided):**
{job_description}

**Output ONLY valid JSON in this exact format:**
{{
  "ats_score_original": 65,
  "ats_score_enhanced": 84,
  "enhanced_experience": [
    {{
      "company": "Company Name",
      "role": "Role Title",
      "original_bullets": ["old bullet 1", "old bullet 2"],
      "enhanced_bullets": ["Engineered a scalable REST API serving 10K+ daily users", "Reduced page load time by 35% through lazy loading and CDN optimization"]
    }}
  ],
  "missing_keywords": ["Docker", "Kubernetes", "CI/CD"],
  "skill_gaps": ["The job requires AWS experience; add any cloud projects to your resume"],
  "improvement_tips": [
    "Add quantified metrics to at least 3 bullet points",
    "Include a 'Projects' section showcasing side projects",
    "Move your Skills section above Experience for faster ATS scanning"
  ],
  "summary_rewrite": "Results-driven Software Engineer with 3+ years building scalable web applications using React and Node.js. Proven track record of optimizing performance and delivering features that directly impact user retention."
}}
"""


class ResumeEnhancerAgent:
    """
    Enhances a parsed resume using the LLM with ATS optimization and
    bullet point rewriting.
    """

    def __init__(self):
        self.llm = RotateLLMClient()

    def enhance(self, resume_data: dict, job_description: str = "") -> dict:
        """
        Enhance a resume.

        Args:
            resume_data: Parsed resume dict (from parsing_agent output)
            job_description: Optional target job description text

        Returns:
            dict with enhancement results including ATS scores, enhanced bullets,
            missing keywords, and improvement tips.
        """
        try:
            resume_json = json.dumps(resume_data, indent=2, ensure_ascii=False)
            jd_text = job_description.strip() if job_description else "Not provided — optimize for general ATS."

            prompt = ENHANCE_PROMPT.format(
                resume_json=resume_json,
                job_description=jd_text,
            )

            raw_response = self.llm.generate(prompt)

            # Strip markdown code fences if present
            cleaned = raw_response.strip()
            if cleaned.startswith("```"):
                lines = cleaned.split("\n")
                cleaned = "\n".join(lines[1:-1]) if lines[-1].strip() == "```" else "\n".join(lines[1:])

            result = json.loads(cleaned)

            # Ensure all required keys exist with defaults
            result.setdefault("ats_score_original", 60)
            result.setdefault("ats_score_enhanced", 75)
            result.setdefault("enhanced_experience", [])
            result.setdefault("missing_keywords", [])
            result.setdefault("skill_gaps", [])
            result.setdefault("improvement_tips", [])
            result.setdefault("summary_rewrite", "")

            logger.info(
                "Resume enhanced: ATS %s → %s",
                result["ats_score_original"],
                result["ats_score_enhanced"],
            )
            return {"success": True, "data": result}

        except json.JSONDecodeError as e:
            logger.error("ResumeEnhancerAgent JSON parse error: %s", e)
            return {
                "success": False,
                "error": "Failed to parse enhancement response",
                "data": _fallback_enhancement(resume_data),
            }
        except Exception as e:
            logger.error("ResumeEnhancerAgent error: %s", e)
            return {
                "success": False,
                "error": str(e),
                "data": _fallback_enhancement(resume_data),
            }

    def quick_score(self, resume_data: dict) -> dict:
        """
        Return a quick ATS score without full enhancement (faster, used for dashboard preview).
        """
        try:
            prompt = f"""
Rate this resume for ATS compatibility on a scale of 0–100.
Return ONLY valid JSON: {{"score": 72, "verdict": "Good", "quick_tips": ["tip1", "tip2"]}}

Resume summary:
- Skills: {resume_data.get('skills', [])}
- Experience years: {resume_data.get('total_experience_years', 0)}
- Education: {resume_data.get('education', [])}
"""
            raw = self.llm.generate(prompt)
            cleaned = raw.strip().strip("```json").strip("```").strip()
            return json.loads(cleaned)
        except Exception:
            return {"score": 65, "verdict": "Average", "quick_tips": ["Add more quantified achievements"]}


def _fallback_enhancement(resume_data: dict) -> dict:
    """Return a safe fallback when LLM fails."""
    return {
        "ats_score_original": 60,
        "ats_score_enhanced": 60,
        "enhanced_experience": [],
        "missing_keywords": [],
        "skill_gaps": [],
        "improvement_tips": [
            "Add quantified metrics to your bullet points",
            "Include a professional summary at the top",
            "List your technical skills prominently",
        ],
        "summary_rewrite": "",
    }
