import os
import json
from openai import OpenAI
from sqlalchemy.future import select
from models.database import Candidate, Session, ChatHistory

class RecruiterChatbotAgent:
    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    async def chat(self, message: str, session_id: str, history: list, db) -> dict:
        # Step 1: Fetch all candidates for session
        candidates_res = await db.execute(
            select(Candidate).where(Candidate.session_id == session_id)
        )
        candidates = candidates_res.scalars().all()
        
        # Step 2: Fetch session
        session_res = await db.execute(select(Session).where(Session.id == session_id))
        session = session_res.scalar_one_or_none()
        
        # Step 3: Build candidate context (max 50 candidates)
        context_lines = []
        for c in candidates[:50]:
            skills = [s["canonical_skill"] 
                      for s in (c.normalized_skills or [])[:8]]
            context_lines.append(
                f"ID:{c.id}|{c.name}|{c.location or 'N/A'}|"
                f"Score:{c.match_score or 'N/A'}%|"
                f"{c.recommendation or 'N/A'}|"
                f"Skills:{','.join(skills)}|"
                f"Exp:{c.total_experience_years}yrs|"
                f"Status:{c.status}|Round:{c.current_round_index}|"
                f"Email:{c.email or 'N/A'}"
            )
            
        system = f"""AI recruitment assistant for Vishleshan.
        Session: {session.name if session else 'Unknown'}
        Job: {session.job_title if session else 'Unknown'}
        Total candidates: {len(candidates)}
        
        CANDIDATE DATA:
        {chr(10).join(context_lines)}
        
        Rules:
        - Answer ONLY from candidate data above
        - Never hallucinate candidates
        - Be specific with names and scores
        - For lists: use numbered format
        - Keep responses concise and helpful
        
        End EVERY response with new line:
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
        user_msg = ChatHistory(
            session_id=session_id,
            role="user",
            content=message,
            referenced_candidate_ids=[]
        )
        assistant_msg = ChatHistory(
            session_id=session_id,
            role="assistant",
            content=reply,
            referenced_candidate_ids=ids
        )
        db.add(user_msg)
        db.add(assistant_msg)
        await db.commit()
        
        return {"reply": reply, "referenced_candidates": ids}
