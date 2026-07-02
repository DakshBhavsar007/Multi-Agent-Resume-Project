"""
General round recommendation agent based on job title + description.
Recommends which rounds to include.
Called when company creates/edits a session.
Uses existing RotateLLMClient — no new LLM setup needed.
DOES NOT touch any existing agent.
"""
import json
import logging
from agents.llm import RotateLLMClient

logger = logging.getLogger(__name__)


class RoundRecommendationAgent:
    def __init__(self):
        self.llm = RotateLLMClient()

    def recommend(self, job_title: str, job_description: str) -> dict:
        prompt = f"""
You are a recruitment expert. Analyze this job and recommend which assessment 
rounds to include. Be practical and role-specific.

Job Title: {job_title}
Job Description: {job_description[:800]}

Rules:
- Interview round: ALWAYS include (every job needs human/AI interaction)
- MCQ/Aptitude round: include for analytical, finance, operations, data, 
  non-pure-engineering, consulting, HR, sales roles
- Coding round: include for software engineer, developer, data scientist, 
  ML engineer, DevOps, backend, frontend, fullstack roles
- Maximum 3 rounds total
- Order: MCQ first (if present), then Coding (if present), Interview last

Return ONLY valid JSON, no markdown:
{{
  "recommended_rounds": [
    {{
      "type": "mcq",
      "name": "Aptitude Round",
      "reason": "Role requires strong logical and quantitative reasoning",
      "time_limit_minutes": 30,
      "question_count": 30,
      "suggested_order": 1
    }},
    {{
      "type": "coding",
      "name": "Technical Coding Round",
      "reason": "Software engineering role requires DSA problem solving",
      "time_limit_minutes": 60,
      "problem_count": 2,
      "suggested_order": 2
    }},
    {{
      "type": "interview",
      "name": "AI Interview Round",
      "reason": "Final evaluation of communication and depth of knowledge",
      "time_limit_minutes": 25,
      "question_count": 5,
      "suggested_order": 3
    }}
  ],
  "confidence": "high",
  "reasoning": "Software engineering role — coding + interview are essential; aptitude skipped as role is purely technical"
}}
"""
        try:
            response = self.llm.chat.completions.create(
                model="gemini-2.5-flash",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                response_format={"type": "json_object"},
                timeout=15
            )
            raw = response.choices[0].message.content.strip()
            return json.loads(raw)
        except Exception as e:
            logger.error("RoundRecommendationAgent failed: %s", e)
            # Safe fallback — always at least interview
            return {
                "recommended_rounds": [
                    {
                        "type": "interview",
                        "name": "AI Interview Round",
                        "reason": "Default — all roles require interview",
                        "time_limit_minutes": 25,
                        "question_count": 5,
                        "suggested_order": 1
                    }
                ],
                "confidence": "low",
                "reasoning": "Fallback recommendation due to processing error"
            }
