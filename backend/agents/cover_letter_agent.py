import os
from agents.llm import RotateLLMClient

class CoverLetterGeneratorAgent:
    def __init__(self):
        self.client = RotateLLMClient()

    def generate_cover_letter(self, seeker_name: str, seeker_skills: list, seeker_experience: list, job_title: str, job_description: str, company_name: str = "the hiring company") -> str:
        system = """You are a professional career coach.
        Write a highly tailored, persuasive cover letter.
        Align the seeker's skills and experience with the job description requirements.
        Keep it professional, authentic, and polite. Return the text of the cover letter only."""

        skills_str = ", ".join(seeker_skills) if seeker_skills else "software development"
        exp_str = str(seeker_experience)[:1500] if seeker_experience else "General experience"
        
        prompt = f"""Write a tailored cover letter for:
        Candidate Name: {seeker_name}
        Target Job Title: {job_title}
        Company: {company_name}
        
        Candidate Skills: {skills_str}
        Candidate Experience: {exp_str}
        
        Job Description:
        {job_description[:1500]}"""

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
            return f"""Dear Hiring Manager,

I am excited to apply for the {job_title} position. With my background in {skills_str}, I am confident I would be a great fit for your team.

Sincerely,
{seeker_name}"""
