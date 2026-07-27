import os
import json
import re
import logging
from agents.llm import RotateLLMClient

logger = logging.getLogger(__name__)

class SkillInferenceAgent:
    def __init__(self):
        self.client = RotateLLMClient(agent_name="inference_agent")

    def _parse_salary(self, salary_range: str, text: str):
        search_text = f"{salary_range or ''}\n{text or ''}"
        currency = "USD"
        if "₹" in search_text or "LPA" in search_text or "lakh" in search_text.lower() or "inr" in search_text.lower():
            currency = "INR"
        elif "€" in search_text or "eur" in search_text.lower():
            currency = "EUR"
        elif "£" in search_text or "gbp" in search_text.lower():
            currency = "GBP"
        elif "$" in search_text or "usd" in search_text.lower():
            currency = "USD"

        clean = search_text.replace("–", "-").replace("—", "-").replace(" to ", "-").replace(",", "")

        # Match LPA / Lakhs pattern e.g. 18-30 LPA, 18 - 30 Lakhs, ₹18-30 LPA
        lpa = re.search(r"(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)\s*(?:LPA|L|lakhs?)", clean, re.IGNORECASE)
        if lpa:
            v1 = float(lpa.group(1))
            v2 = float(lpa.group(2))
            min_val = int(v1 * 100000) if v1 < 200 else int(v1)
            max_val = int(v2 * 100000) if v2 < 200 else int(v2)
            return min_val, max_val, "INR"

        lpa_single = re.search(r"(\d+(?:\.\d+)?)\s*(?:LPA|L|lakhs?)", clean, re.IGNORECASE)
        if lpa_single:
            v = float(lpa_single.group(1))
            val = int(v * 100000) if v < 200 else int(v)
            return val, val, "INR"

        k_match = re.search(r"(\d+(?:\.\d+)?)k\s*-\s*(\d+(?:\.\d+)?)k", clean, re.IGNORECASE)
        if k_match:
            v1 = int(float(k_match.group(1)) * 1000)
            v2 = int(float(k_match.group(2)) * 1000)
            return v1, v2, currency

        range_match = re.search(r"(?:CTC|Salary)?\s*:?\s*₹?\s*(\d+[\d\.]*)\s*-\s*₹?\s*(\d+[\d\.]*)", clean, re.IGNORECASE)
        if range_match:
            try:
                v1 = float(range_match.group(1))
                v2 = float(range_match.group(2))
                if v1 < 200 and currency == "INR":
                    v1 = v1 * 100000
                if v2 < 200 and currency == "INR":
                    v2 = v2 * 100000
                return int(v1), int(v2), currency
            except ValueError:
                pass

        return None, None, currency

    def _fallback_extract(self, job_description: str) -> dict:
        """Regex and heuristic fallback parsing when LLM fails or returns Unknown."""
        extracted_role = "Unknown"
        
        # Look for role in headers like "JOB TITLE: DevOps / Platform Engineer" or "Role: Senior Backend"
        role_patterns = [
            r"(?i)(?:job\s*title|title|role|position)\s*:\s*([^\n\r]+)",
            r"(?i)^([A-Z][A-Za-z0-9\s/&\-\.]{3,40})(?:\s+at\s+|\s+-\s+|\s*\n)"
        ]
        for pattern in role_patterns:
            match = re.search(pattern, job_description)
            if match:
                val = match.group(1).strip()
                if len(val) > 2 and len(val) < 80 and val.lower() not in ["unknown", "n/a", "job title", "overview"]:
                    extracted_role = val
                    break
        
        # Minimum experience
        min_exp = 0
        exp_match = re.search(r"(?i)(?:experience|exp)\s*:\s*(\d+)", job_description)
        if exp_match:
            min_exp = int(exp_match.group(1))
        else:
            exp_match2 = re.search(r"(?i)(\d+)\+?\s*(?:years|yrs)", job_description)
            if exp_match2:
                min_exp = int(exp_match2.group(1))

        # Preferred locations
        locations = []
        loc_match = re.search(r"(?i)(?:location|city)\s*:\s*([^\n\r]+)", job_description)
        if loc_match:
            locations = [l.strip() for l in loc_match.group(1).split(",") if l.strip()]

        # Salary / CTC
        salary_range = "Competitive"
        salary_match = re.search(r"(?i)(?:ctc|salary)\s*:\s*([^\n\r]+)", job_description)
        if salary_match:
            salary_range = salary_match.group(1).strip()

        sal_min, sal_max, sal_curr = self._parse_salary(salary_range, job_description)

        # Employment type
        emp_type = "Full-time"
        emp_match = re.search(r"(?i)(?:type|employment\s*type)\s*:\s*([^\n\r]+)", job_description)
        if emp_match:
            val = emp_match.group(1).strip()
            if "part" in val.lower():
                emp_type = "Part-time"
            elif "contract" in val.lower():
                emp_type = "Contract"
            elif "intern" in val.lower():
                emp_type = "Internship"

        # Basic tech skill keyword extraction
        common_skills = [
            "Python", "Java", "C++", "C#", "Go", "Golang", "Rust", "Node.js", "TypeScript",
            "JavaScript", "React", "Vue", "Angular", "Django", "FastAPI", "Flask",
            "Spring", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Docker", "Kubernetes",
            "AWS", "GCP", "Azure", "DevOps", "CI/CD", "Linux", "Terraform", "Ansible",
            "GraphQL", "REST", "Microservices", "Git", "SQL", "Kafka", "Elasticsearch"
        ]
        found_skills = [s for s in common_skills if re.search(r"\b" + re.escape(s) + r"\b", job_description, re.IGNORECASE)]

        return {
            "inferred_role": extracted_role,
            "seniority_level": "mid",
            "required_skills": found_skills[:10],
            "nice_to_have_skills": [],
            "minimum_experience_years": min_exp,
            "preferred_locations": locations,
            "key_responsibilities": [],
            "industry": "Technology",
            "salary_range": salary_range,
            "salary_min": sal_min,
            "salary_max": sal_max,
            "salary_currency": sal_curr,
            "employment_type": emp_type
        }

    async def infer_from_jd(self, job_description: str) -> dict:
        system = """Expert technical recruiter. 
        Analyze job descriptions precisely.
        Return ONLY valid JSON. No markdown. No explanation."""
        
        prompt = f"""Analyze this job description. Return JSON:
        {{
          "inferred_role": string (e.g. "DevOps / Platform Engineer" or extracted title),
          "seniority_level": "junior"|"mid"|"senior"|"lead",
          "required_skills": [string (top 10 max)],
          "nice_to_have_skills": [string (top 5 max)],
          "minimum_experience_years": integer,
          "preferred_locations": [string],
          "key_responsibilities": [string (top 5)],
          "industry": string,
          "salary_range": string (extract salary range, e.g. "₹18-30 LPA" or "$120k - $140k" if specified in job description, default to "Competitive"),
          "salary_min": integer or null (e.g. 1800000 for 18 LPA),
          "salary_max": integer or null (e.g. 3000000 for 30 LPA),
          "salary_currency": "INR"|"USD"|"EUR"|"GBP",
          "employment_type": "Full-time"|"Part-time"|"Contract"|"Internship" (default to "Full-time")
        }}
        
        Job Description:
        {job_description[:3000]}"""
        
        fallback = self._fallback_extract(job_description)

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2
            )
            
            raw_content = response.choices[0].message.content.strip()
            if raw_content.startswith("```json"):
                raw_content = raw_content[7:]
            if raw_content.startswith("```"):
                raw_content = raw_content[3:]
            if raw_content.endswith("```"):
                raw_content = raw_content[:-3]
                
            parsed = json.loads(raw_content.strip())
            
            # Merge regex fallback if LLM left inferred_role as Unknown/empty
            if not parsed.get("inferred_role") or parsed.get("inferred_role").lower() in ["unknown", "n/a", ""]:
                if fallback["inferred_role"] != "Unknown":
                    parsed["inferred_role"] = fallback["inferred_role"]

            if not parsed.get("required_skills") and fallback["required_skills"]:
                parsed["required_skills"] = fallback["required_skills"]

            if (parsed.get("minimum_experience_years") is None or parsed.get("minimum_experience_years") == 0) and fallback["minimum_experience_years"] > 0:
                parsed["minimum_experience_years"] = fallback["minimum_experience_years"]

            if not parsed.get("preferred_locations") and fallback["preferred_locations"]:
                parsed["preferred_locations"] = fallback["preferred_locations"]

            if (not parsed.get("salary_range") or parsed.get("salary_range") == "Competitive") and fallback["salary_range"] != "Competitive":
                parsed["salary_range"] = fallback["salary_range"]

            if parsed.get("salary_min") is None and fallback["salary_min"] is not None:
                parsed["salary_min"] = fallback["salary_min"]
            if parsed.get("salary_max") is None and fallback["salary_max"] is not None:
                parsed["salary_max"] = fallback["salary_max"]
            if not parsed.get("salary_currency") and fallback["salary_currency"]:
                parsed["salary_currency"] = fallback["salary_currency"]

            return parsed
            
        except Exception as e:
            logger.error("SkillInferenceAgent error, returning fallback: %s", e)
            return fallback
