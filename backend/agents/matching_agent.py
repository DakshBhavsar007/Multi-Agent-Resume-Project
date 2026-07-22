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
        skill_score = 0.0
        matched = []
        missing = required[:]
        
        if not required:
            skill_score = 70.0
            matched = candidate_skills[:5]
            missing = []
        else:
            model = self._get_model()
            req_embeddings = model.encode(required) if model else None
            
            # 1. Semantic Skill Match via sklearn.metrics.pairwise.cosine_similarity
            if model and candidate_skills and req_embeddings is not None and len(req_embeddings) > 0:
                try:
                    cand_embeddings = model.encode(candidate_skills)
                    
                    # Check if embeddings are valid (not all-zero vectors)
                    if cand_embeddings is not None and len(cand_embeddings) > 0 and not np.all(cand_embeddings == 0):
                        from sklearn.metrics.pairwise import cosine_similarity
                        
                        sim_matrix = cosine_similarity(cand_embeddings, req_embeddings)
                        matched = []
                        missing = []
                        for i, req in enumerate(required):
                            sims = sim_matrix[:, i]
                            if float(np.max(sims)) > 0.72:
                                matched.append(req)
                            else:
                                missing.append(req)
                        base = len(matched) / len(required) * 100
                        
                        # Experience bonus for matched skills
                        bonus = 0
                        for s in candidate.get("normalized_skills", []):
                            skill_name = str(s.get("canonical_skill", str(s)) if isinstance(s, dict) else str(s)).lower().strip()
                            if any(skill_name == m.lower().strip() for m in matched):
                                yrs = s.get("years") if isinstance(s, dict) else None
                                if yrs is not None and float(yrs) > 3:
                                    bonus += 2
                        skill_score = min(100.0, base + min(bonus, 10))
                except Exception as emb_err:
                    pass
            
            # 2. TfidfVectorizer Fallback if embeddings failed or model is missing
            if not matched and candidate_skills:
                try:
                    from sklearn.feature_extraction.text import TfidfVectorizer
                    from sklearn.metrics.pairwise import cosine_similarity
                    
                    # Char-level n-gram tf-idf is robust for typing errors and slight variations
                    vectorizer = TfidfVectorizer(analyzer='char_wb', ngram_range=(3, 5))
                    all_texts = candidate_skills + required
                    vectorizer.fit(all_texts)
                    
                    cand_vecs = vectorizer.transform(candidate_skills)
                    req_vecs = vectorizer.transform(required)
                    
                    sim_matrix = cosine_similarity(cand_vecs, req_vecs)
                    matched = []
                    missing = []
                    for i, req in enumerate(required):
                        sims = sim_matrix[:, i]
                        if float(np.max(sims)) > 0.60:
                            matched.append(req)
                        else:
                            missing.append(req)
                    base = len(matched) / len(required) * 100
                    skill_score = min(100.0, base)
                except Exception as tfidf_err:
                    # Simple substring match fallback
                    matched = []
                    missing = []
                    for req in required:
                        if any(req.lower() in cs.lower() or cs.lower() in req.lower() for cs in candidate_skills):
                            matched.append(req)
                        else:
                            missing.append(req)
                    base = len(matched) / len(required) * 100
                    skill_score = min(100.0, base)
        
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
        
        # --- ML HISTORICAL LEARNING ADJUSTMENT ---
        # Fetch historical hired/rejected application features to train a RandomForestClassifier
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
            final = round(0.8 * final + 0.2 * hired_probability, 1)
        
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

