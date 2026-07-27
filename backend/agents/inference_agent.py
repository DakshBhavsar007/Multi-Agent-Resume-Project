import os
import json
import re
import logging
from agents.llm import RotateLLMClient

logger = logging.getLogger(__name__)

class SkillInferenceAgent:
    def __init__(self):
        self.client = RotateLLMClient(agent_name="inference_agent")

    def _pattern_fallback(self, job_description: str) -> dict:
        """Rule-based pattern extraction when LLM is unavailable or fails."""
        role = "Software Engineer"
        
        # 1. Job title extraction
        title_match = re.search(r'(?:JOB TITLE|Job Title|Role|POSITION|Title)\s*:\s*([^\n\r]+)', job_description, re.IGNORECASE)
        if title_match:
            role = title_match.group(1).strip()
        else:
            lines = [l.strip() for l in job_description.splitlines() if l.strip()]
            if lines:
                first_line = lines[0]
                if len(first_line) < 80 and not any(kw in first_line.lower() for kw in ["overview", "about", "company", "description"]):
                    role = first_line

        # 2. Salary extraction (e.g. ₹18-30 LPA or $100k-$150k)
        salary_min = None
        salary_max = None
        salary_currency = None

        lpa_match = re.search(r'(?:CTC|Salary|Package)?\s*:\s*[\u20b9Rs\.]*\s*(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)\s*(?:LPA|Lakhs|Lakh)', job_description, re.IGNORECASE)
        if not lpa_match:
            lpa_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)\s*(?:LPA|Lakhs|Lakh)', job_description, re.IGNORECASE)
        
        if lpa_match:
            salary_min = int(float(lpa_match.group(1)) * 100000)
            salary_max = int(float(lpa_match.group(2)) * 100000)
            salary_currency = "INR"
        else:
            usd_match = re.search(r'\$\s*(\d+[\d,]*)\s*(?:-|to)\s*\$\s*(\d+[\d,]*)', job_description)
            if usd_match:
                salary_min = int(usd_match.group(1).replace(",", ""))
                salary_max = int(usd_match.group(2).replace(",", ""))
                salary_currency = "USD"

        # 3. Experience extraction
        exp = 0
        exp_match = re.search(r'(\d+)\s*\+?\s*(?:years?|yrs?)\b', job_description, re.IGNORECASE)
        if exp_match:
            exp = int(exp_match.group(1))

        # 4. Common technical skills extraction
        common_skills = [
            "DevOps", "Platform Engineer", "Cloud", "Python", "Java", "React", "Node.js", "AWS", "Docker", "Kubernetes",
            "TypeScript", "JavaScript", "C++", "Golang", "PostgreSQL", "MongoDB", "Redis",
            "CI/CD", "Linux", "Terraform", "Git", "SQL", "Azure", "GCP", "Microservices"
        ]
        extracted_skills = [s for s in common_skills if re.search(r'\b' + re.escape(s) + r'\b', job_description, re.IGNORECASE)]

        return {
            "inferred_role": role,
            "seniority_level": "mid" if exp < 5 else "senior",
            "required_skills": extracted_skills[:10] if extracted_skills else ["Software Development"],
            "nice_to_have_skills": [],
            "minimum_experience_years": exp,
            "preferred_locations": [],
            "key_responsibilities": [],
            "industry": "Technology",
            "salary_min": salary_min,
            "salary_max": salary_max,
            "salary_currency": salary_currency
        }

    async def infer_from_jd(self, job_description: str) -> dict:
        system = """Expert technical recruiter. 
        Analyze job descriptions precisely.
        Return ONLY valid JSON. No markdown. No explanation.
        
        For salary extraction rules:
        - If salary is in LPA (Lakhs Per Annum), convert to yearly INR: multiply by 100000. Example: 18 LPA = 1800000 INR.
        - If salary is in USD/$ return the raw number.
        - If salary is in GBP/£ return the raw number.
        - If salary is in EUR/€ return the raw number.
        - Detect currency from symbols: ₹ or LPA or lakhs → INR, $ or USD → USD, £ or GBP → GBP, € or EUR → EUR.
        - If no salary found, return null for all salary fields."""
        
        prompt = f"""Analyze this job description. Return JSON with these exact fields:
        {{
          "inferred_role": string,
          "seniority_level": "junior"|"mid"|"senior"|"lead",
          "required_skills": [string (top 10 max)],
          "nice_to_have_skills": [string (top 5 max)],
          "minimum_experience_years": integer,
          "preferred_locations": [string],
          "key_responsibilities": [string (top 5)],
          "industry": string,
          "salary_min": number or null,
          "salary_max": number or null,
          "salary_currency": "INR"|"USD"|"GBP"|"EUR" or null
        }}
        
        Job Description:
        {job_description[:3000]}"""
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1
            )
            
            raw_content = response.choices[0].message.content.strip()
            if raw_content.startswith("```json"):
                raw_content = raw_content[7:]
            if raw_content.startswith("```"):
                raw_content = raw_content[3:]
            if raw_content.endswith("```"):
                raw_content = raw_content[:-3]
                
            return json.loads(raw_content.strip())
            
        except Exception as e:
            logger.error(f"SkillInferenceAgent LLM failed: {e}. Using pattern fallback.")
            return self._pattern_fallback(job_description)
