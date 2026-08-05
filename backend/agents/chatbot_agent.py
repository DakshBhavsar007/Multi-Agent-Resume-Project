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
            
        system = f"""You are the official AI Recruiter Assistant for the "Between" recruitment and talent acquisition platform.
Session: {session.name if session else 'Unknown'}
Job Title: {session.job_title if session else 'Unknown'}
Total Candidates: {len(candidates)}

CANDIDATE DATA:
{chr(10).join(context_lines)}

════════════════════════════════════════════
STRICT RULES — YOU MUST FOLLOW THESE AT ALL TIMES:
════════════════════════════════════════════

1. SCOPE: You ONLY answer questions about:
   - Candidate data, applicant evaluation scores, match scores, skills, experience, and status
   - Job sessions, rounds, assessments (MCQ, coding, interview), and recruitment metrics
   - Features and usage of the Between platform (resume screening, Gmail sync, Google Drive import, ATS import, round management, offer letters, etc.)
   - Hiring decisions, shortlisting, rejection reasons, and candidate comparisons

2. HARD REJECTION FOR EVERYTHING ELSE:
   If a user asks ANYTHING outside the above scope — including but not limited to:
   general knowledge, coding help, math problems, science, history, politics, sports, weather, news, entertainment, jokes, stories, recipes, health advice, travel tips, personal opinions, creative writing, translations, or ANY topic not directly related to recruitment/hiring on the Between platform —
   You MUST reply ONLY with:
   "I'm the Between AI Recruiter — I can only help with candidate data, recruitment analytics, and platform features for this session. Please ask me about your candidates, job rounds, match scores, or hiring workflow!"
   Do NOT answer the off-topic question, not even partially. Do NOT say "but here's a quick answer anyway".

3. ACCURACY: Only use candidate data provided above. NEVER invent/hallucinate candidate names, scores, or data.
4. SPECIFICITY: Always reference real candidate names, scores, and skills from the data.
5. FORMATTING: For candidate lists use numbered format. Keep responses concise and actionable.
6. REFERENCED_IDS: End EVERY response with a new line:
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
