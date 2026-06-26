import numpy as np
from agents.embeddings import get_embedding_model

class SemanticMatchingAgent:
    def __init__(self):
        pass

    def _get_model(self):
        return get_embedding_model()

    async def match(self, candidate: dict, criteria: dict) -> dict:
        weights = criteria.get("weights", {"skills": 0.5, "experience": 0.3, "location": 0.2})
        required = criteria.get("required_skills", [])
        nice_to_have = criteria.get("nice_to_have", [])
        min_exp = criteria.get("min_experience", 0)
        preferred_locs = criteria.get("preferred_locations", [])
        
        candidate_skills = [
            s.get("canonical_skill", str(s)) if isinstance(s, dict) else str(s)
            for s in candidate.get("normalized_skills", [])
        ]
        
        # --- SKILL SCORE ---
        if not required:
            skill_score = 70.0
            matched = candidate_skills[:5]
            missing = []
        else:
            model = self._get_model()
            req_embeddings = model.encode(required)
            if candidate_skills:
                cand_embeddings = model.encode(candidate_skills)
                matched = []
                missing = []
                for i, req in enumerate(required):
                    sims = np.dot(cand_embeddings, req_embeddings[i]) / (
                        np.linalg.norm(cand_embeddings, axis=1) * np.linalg.norm(req_embeddings[i]) + 1e-8
                    )
                    if float(np.max(sims)) > 0.72:
                        matched.append(req)
                    else:
                        missing.append(req)
                base = len(matched) / len(required) * 100
                
                # Experience bonus for matched skills
                bonus = 0
                for s in candidate.get("normalized_skills", []):
                    skill_name = s.get("canonical_skill", str(s)) if isinstance(s, dict) else str(s)
                    if skill_name in matched:
                        yrs = s.get("years") if isinstance(s, dict) else None
                        if yrs is not None and float(yrs) > 3:
                            bonus += 2
                skill_score = min(100.0, base + min(bonus, 10))
            else:
                skill_score = 0.0
                matched = []
                missing = required[:]
        
        # --- EXPERIENCE SCORE ---
        cand_exp = candidate.get("total_experience_years", 0)
        if min_exp <= 0: 
            exp_score = 100.0
        else: 
            exp_score = min(100.0, (float(cand_exp) / float(min_exp)) * 100)
        
        # --- LOCATION SCORE ---
        if not preferred_locs: 
            loc_score = 100.0
        else:
            cand_loc = (candidate.get("location") or "").lower()
            loc_score = 100.0 if any(
                l.lower() in cand_loc for l in preferred_locs
            ) else 30.0
            
        # --- FINAL SCORE ---
        final = (
            skill_score * weights.get("skills", 0.5) +
            exp_score * weights.get("experience", 0.3) +
            loc_score * weights.get("location", 0.2)
        )
        final = round(final, 1)
        
        recommendation = (
            "Strong Match" if final >= 80 else
            "Good Match" if final >= 65 else
            "Partial Match" if final >= 50 else
            "Poor Match"
        )
        
        return {
            "match_score": final,
            "skill_score": round(skill_score, 1),
            "experience_score": round(exp_score, 1),
            "location_score": round(loc_score, 1),
            "matched_skills": matched,
            "missing_skills": missing,
            "recommendation": recommendation
        }
