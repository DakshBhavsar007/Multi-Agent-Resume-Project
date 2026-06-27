import os
import json
from agents.llm import RotateLLMClient

class JobDescriptionGeneratorAgent:
    def __init__(self):
        self.client = RotateLLMClient()

    def generate_jd(self, job_title: str, skills: list, experience_years: int, company_name: str = "Our Company") -> str:
        system = """You are an expert technical recruiter and copywriter.
        Write a professional, detailed, SEO-optimized job description.
        Structure it with:
        1. About the Role
        2. Key Responsibilities
        3. Required Skills & Qualifications
        4. Preferred Skills / Nice to Have
        
        Keep it clean, concise, calm, and professional. Return markdown format."""

        skills_str = ", ".join(skills) if skills else "Relevant skills"
        prompt = f"""Write a professional job description for:
        Job Title: {job_title}
        Company Name: {company_name}
        Required Experience: {experience_years} years
        Primary Skills: {skills_str}
        
        Make it engaging and structured."""

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            return f"""# {job_title}
            
We are looking for a skilled {job_title} to join our team. 

## Requirements:
- {experience_years}+ years of experience.
- Strong knowledge of: {skills_str}."""
