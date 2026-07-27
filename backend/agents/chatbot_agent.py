import os
import json
from agents.llm import RotateLLMClient
from api.models import Candidate, Session, ChatHistory

class RecruiterChatbotAgent:
    def __init__(self):
        self.client = RotateLLMClient(agent_name="chatbot")

    def chat(self, message: str, session_id: str, history: list) -> dict:
        # Step 1: Fetch all candidates for session using Django ORM
        candidates = list(Candidate.objects.filter(session_id=session_id))
        
        # Step 2: Fetch session
        session = Session.objects.filter(id=session_id).first()
        
        # Step 3: Build candidate context (max 50 candidates)
        context_lines = []
        for c in candidates[:50]:
            skills = [s.get("canonical_skill", s.get("raw_skill", "")) 
                      for s in (c.normalized_skills or [])[:8] if isinstance(s, dict)]
            context_lines.append(
                f"ID:{c.id}|{c.name}|{c.location or 'N/A'}|"
                f"Score:{c.match_score or 'N/A'}%|"
                f"{c.recommendation or 'N/A'}|"
                f"Skills:{','.join(skills)}|"
                f"Exp:{c.total_experience_years}yrs|"
                f"Status:{c.status}|Round:{c.current_round_index}|"
                f"Email:{c.email or 'N/A'}"
            )
            
        system = f"""You are the official AI Assistant for the Between recruitment and talent platform.
Session: {session.name if session else 'Unknown'}
Job Title: {session.job_title if session else 'Unknown'}
Total Candidates: {len(candidates)}

CANDIDATE DATA:
{chr(10).join(context_lines)}

STRICT PLATFORM-ONLY RULES:
- SCOPE LIMIT: You are strictly an AI assistant for the Between platform and candidate analytics.
- PLATFORM & CANDIDATE QUESTIONS ONLY: Answer ONLY questions related to candidate data, applicant evaluation scores, job sessions, recruitment metrics, or features of the Between platform.
- REJECT OFF-TOPIC REQUESTS: If the user asks ANY question unrelated to candidate recruitment, job applicants, ATS evaluation, or the Between platform (such as general knowledge, world news, sports, unrelated coding homework, or creative writing), POLITELY DECLINE. State: "I am an AI assistant for the Between recruitment platform. I can only answer questions related to your candidate pool, job applications, recruitment metrics, and platform features."
- ACCURACY: Answer ONLY from candidate data provided. Never hallucinate candidates or scores.
- SPECIFICITY: Be specific with candidate names, scores, and skills.
- FORMATTING: For candidate lists, use numbered format. Keep responses concise and helpful.
- REFERENCED_IDS FOOTER: End EVERY response with a new line:
REFERENCED_IDS:[id1,id2] or REFERENCED_IDS:[]"""
        
        # Step 4: Build messages array (last 10 history)
        messages = [
            {"role": "system", "content": system},
            *history[-10:],
            {"role": "user", "content": message}
        ]
        
        # Step 5: Call gpt-4o-mini
        response = self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            max_tokens=800,
            temperature=0.3
        )
        full = response.choices[0].message.content
        
        # Step 6: Parse REFERENCED_IDS
        if "REFERENCED_IDS:" in full:
            parts = full.split("REFERENCED_IDS:")
            reply = parts[0].strip()
            try:
                ids_str = parts[1].strip()
                ids = json.loads(ids_str)
            except: 
                ids = []
        else:
            reply = full.strip()
            ids = []
            
        # Step 7: Save to chat_history table
        ChatHistory.objects.create(
            session_id=session_id,
            role="user",
            content=message,
            referenced_candidate_ids=[]
        )
        ChatHistory.objects.create(
            session_id=session_id,
            role="assistant",
            content=reply,
            referenced_candidate_ids=ids
        )
        
        return {"reply": reply, "referenced_candidates": ids}
