import warnings
import numpy as np
from agents.embeddings import get_embedding_model

try:
    from sklearn.exceptions import InconsistentVersionWarning
    warnings.filterwarnings("ignore", category=InconsistentVersionWarning)
except ImportError:
    pass
warnings.filterwarnings("ignore", message=".*InconsistentVersionWarning.*")
warnings.filterwarnings("ignore", message=".*Trying to unpickle estimator.*")

class SemanticMatchingAgent:
    """
    4-Tier Hybrid Matching Architecture for Candidate-Job Matching:
    
    1. Tier 1: Vector Semantic Similarity (SentenceTransformer + Cosine Similarity > 0.72)
    2. Tier 2: Character N-Gram TF-IDF Fallback (Typo & Variant Matching > 0.60)
    3. Tier 3: Empty Skills Baseline (70%) & Seniority Experience Bonus (+2% per skill >3 yrs, max +10%)
    4. Tier 4: ML Hiring Probability Blending (80% manual weighted score + 20% ML prediction)
    """
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
        
        # Extract candidate skill list safely from normalized_skills or skills
        candidate_skills = []
        raw_skills = candidate.get("normalized_skills") or candidate.get("skills") or []
        for s in raw_skills:
            if isinstance(s, dict):
                skill_str = s.get("canonical_skill") or s.get("name") or s.get("skill") or str(s)
            else:
                skill_str = str(s)
            if skill_str and skill_str not in candidate_skills:
                candidate_skills.append(skill_str)
        
        # --- SKILL SCORE CALCULATION ---
        skill_score = 0.0
        matched = []
        missing = required[:]
        
        # Tier 3: Empty Job Skills Baseline — no required skills defined = cannot match
        if not required:
            skill_score = 0.0
            matched = []
            missing = []
        else:
            model = self._get_model()
            req_embeddings = None
            if model and required:
                try:
                    req_embeddings = model.encode(required)
                except Exception:
                    req_embeddings = None
            
            # 1. Tier 1: Vector Semantic Similarity (SentenceTransformer + Cosine Similarity > 0.72)
            matched_tier1 = []
            if model and candidate_skills and req_embeddings is not None and len(req_embeddings) > 0:
                try:
                    cand_embeddings = model.encode(candidate_skills)
                    if cand_embeddings is not None and len(cand_embeddings) > 0 and not np.all(cand_embeddings == 0):
                        from sklearn.metrics.pairwise import cosine_similarity
                        sim_matrix = cosine_similarity(cand_embeddings, req_embeddings)
                        
                        for i, req in enumerate(required):
                            sims = sim_matrix[:, i]
                            if float(np.max(sims)) > 0.72:
                                matched_tier1.append(req)
                except Exception as emb_err:
                    matched_tier1 = []
            
            # Remaining required skills to pass through Tier 2 fallback
            remaining_reqs = [r for r in required if r not in matched_tier1]
            matched_tier2 = []
            
            # 2. Tier 2: Character N-Gram TF-IDF Fallback (Typo & Variant Matching > 0.60)
            if remaining_reqs and candidate_skills:
                try:
                    from sklearn.feature_extraction.text import TfidfVectorizer
                    from sklearn.metrics.pairwise import cosine_similarity
                    
                    vectorizer = TfidfVectorizer(analyzer='char_wb', ngram_range=(3, 5))
                    vectorizer.fit(candidate_skills + remaining_reqs)
                    
                    cand_vecs = vectorizer.transform(candidate_skills)
                    req_vecs = vectorizer.transform(remaining_reqs)
                    
                    sim_matrix = cosine_similarity(cand_vecs, req_vecs)
                    for i, req in enumerate(remaining_reqs):
                        sims = sim_matrix[:, i]
                        if float(np.max(sims)) > 0.60:
                            matched_tier2.append(req)
                except Exception as tfidf_err:
                    # Substring match fallback for any remaining required skills
                    for req in remaining_reqs:
                        if any(req.lower() in cs.lower() or cs.lower() in req.lower() for cs in candidate_skills):
                            matched_tier2.append(req)
            
            matched = matched_tier1 + matched_tier2
            missing = [r for r in required if r not in matched]
            
            base = (len(matched) / len(required)) * 100.0
            
            # 3. Tier 3: Seniority Experience Bonus (+2% per matched skill with >3 yrs exp, max +10%)
            bonus = 0
            norm_skills = candidate.get("normalized_skills") or candidate.get("skills") or []
            for s in norm_skills:
                if isinstance(s, dict):
                    skill_name = str(s.get("canonical_skill") or s.get("name") or s.get("skill") or "").lower().strip()
                    yrs = s.get("years")
                else:
                    skill_name = str(s).lower().strip()
                    yrs = None
                
                if skill_name and any(skill_name == m.lower().strip() or m.lower().strip() in skill_name or skill_name in m.lower().strip() for m in matched):
                    if yrs is not None and float(yrs) > 3:
                        bonus += 2
            
            skill_score = min(100.0, base + min(bonus, 10))
        
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
            
        # --- MANUAL WEIGHTED MATCH SCORE ---
        manual_weighted_score = (
            skill_score * weights.get("skills", 0.5) +
            exp_score * weights.get("experience", 0.3) +
            loc_score * weights.get("location", 0.2)
        )
        
        # Strict matching: If there are required skills but 0 were matched, the candidate is a 0% match.
        if required and len(matched) == 0:
            manual_weighted_score = 0
            
        manual_weighted_score = round(manual_weighted_score, 1)
        
        # --- 4. Tier 4: ML Hiring Probability Blending (RandomForestClassifier) ---
        hired_probability = None
        try:
            from api.models import JobApplication
            import pandas as pd
            from sklearn.ensemble import RandomForestClassifier
            
            # Fetch completed application history
            past_apps = JobApplication.objects.filter(status__in=["hired", "rejected"])
            if past_apps.count() >= 10:
                data_list = []
                for app in past_apps:
                    cand = app.candidate
                    if cand and cand.match_details:
                        det = cand.match_details
                        s_score = det.get("skill_score", 50.0)
                        e_score = det.get("experience_score", 50.0)
                        l_score = det.get("location_score", 50.0)
                        label = 1 if app.status == "hired" else 0
                        data_list.append([s_score, e_score, l_score, label])
                
                df = pd.DataFrame(data_list, columns=["skills", "experience", "location", "label"])
                if df["label"].nunique() > 1:
                    X = df[["skills", "experience", "location"]]
                    y = df["label"]
                    clf = RandomForestClassifier(n_estimators=50, random_state=42)
                    clf.fit(X, y)
                    
                    features = [[skill_score, exp_score, loc_score]]
                    hired_probability = float(clf.predict_proba(features)[0][1]) * 100
        except Exception as ml_err:
            pass
            
        # Try offline pre-trained matching model fallback if local database training has insufficient samples
        if hired_probability is None:
            try:
                import os
                import pickle
                current_dir = os.path.dirname(os.path.abspath(__file__))
                model_path = os.path.abspath(os.path.join(current_dir, "..", "models", "matching_model.pkl"))
                
                # Download from Hugging Face if local model doesn't exist
                if not os.path.exists(model_path):
                    repo_id = os.environ.get("HF_MODEL_REPO")
                    if repo_id:
                        try:
                            from huggingface_hub import hf_hub_download
                            model_path = hf_hub_download(repo_id=repo_id, filename="matching_model.pkl")
                        except Exception as hf_err:
                            pass
                            
                if os.path.exists(model_path):
                    with open(model_path, "rb") as f:
                        clf_offline = pickle.load(f)
                    features = [[skill_score, exp_score, loc_score]]
                    hired_probability = float(clf_offline.predict_proba(features)[0][1]) * 100
            except Exception as offline_ml_err:
                pass
            
        if hired_probability is not None:
            # Blend manual weighted score with ML hiring probability (80% manual, 20% ML prediction)
            final = round(0.8 * manual_weighted_score + 0.2 * hired_probability, 1)
        else:
            final = manual_weighted_score
            
        # Strict matching: override final blended score to 0 if 0 skills matched
        if required and len(matched) == 0:
            final = 0
        
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
            "recommendation": recommendation,
            "hired_probability": round(hired_probability, 1) if hired_probability is not None else None
        }


