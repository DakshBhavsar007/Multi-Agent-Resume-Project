import numpy as np
import os
import django

class SalaryPredictionAgent:
    def __init__(self):
        pass

    def _extract_job_features(self, skills: list, min_experience: float, location: str, currency: str) -> list:
        """Helper to convert job preferences into a standardized numerical feature vector."""
        # 1. Experience feature
        exp = float(min_experience) if min_experience is not None else 0.0
        
        # 2. Location features (Remote, SF, Bengaluru, London, Europe/other)
        loc = str(location).lower()
        is_remote = 1.0 if "remote" in loc else 0.0
        is_bengaluru = 1.0 if "bengaluru" in loc or "bangalore" in loc else 0.0
        is_sf = 1.0 if "san francisco" in loc or "sf" in loc or "california" in loc else 0.0
        is_london = 1.0 if "london" in loc or "uk" in loc else 0.0
        
        # 3. Domain group matches based on skills
        skills_str = " ".join([s.lower() for s in skills])
        has_ai_ml = 1.0 if any(x in skills_str for x in ["python", "ai", "ml", "nlp", "pytorch", "tensorflow", "llm"]) else 0.0
        has_frontend = 1.0 if any(x in skills_str for x in ["react", "typescript", "vue", "javascript", "css", "html", "next.js"]) else 0.0
        has_backend = 1.0 if any(x in skills_str for x in ["node", "go", "golang", "java", "spring", "django", "postgres", "sql"]) else 0.0
        has_devops = 1.0 if any(x in skills_str for x in ["aws", "docker", "kubernetes", "ci/cd", "devops", "cloud"]) else 0.0
        
        # Feature vector size: 9 features
        return [exp, is_remote, is_bengaluru, is_sf, is_london, has_ai_ml, has_frontend, has_backend, has_devops]

    def predict_expected_salary(self, skills: list, experience_years: float, location: str, currency: str = "USD") -> dict:
        """
        Predicts predicted min and max salary for a given set of skills, experience, and location
        using a local GradientBoostingRegressor trained dynamically on active job listings.
        """
        try:
            from api.models import Session
            
            # Fetch all active/completed jobs with specified salaries
            sessions = Session.objects.exclude(criteria__salary_min__isnull=True).exclude(criteria__salary_max__isnull=True)
            
            # Filter sessions matching target currency to train a clean local model
            sessions = [s for s in sessions if s.criteria.get("salary_currency", "USD") == currency]
            
            if len(sessions) >= 8:
                from sklearn.ensemble import GradientBoostingRegressor
                
                X = []
                y_min = []
                y_max = []
                
                for s in sessions:
                    crit = s.criteria
                    job_skills = crit.get("required_skills", []) or crit.get("skills", []) or []
                    job_exp = crit.get("min_experience", 0.0)
                    job_loc = crit.get("preferred_locations", ["Remote"])[0] if crit.get("preferred_locations") else "Remote"
                    
                    features = self._extract_job_features(job_skills, job_exp, job_loc, currency)
                    X.append(features)
                    y_min.append(float(crit.get("salary_min")))
                    y_max.append(float(crit.get("salary_max")))
                
                # Fit Min Salary Regressor
                reg_min = GradientBoostingRegressor(n_estimators=30, max_depth=3, random_state=42)
                reg_min.fit(X, y_min)
                
                # Fit Max Salary Regressor
                reg_max = GradientBoostingRegressor(n_estimators=30, max_depth=3, random_state=42)
                reg_max.fit(X, y_max)
                
                # Predict for current candidate profile
                current_features = [self._extract_job_features(skills, experience_years, location, currency)]
                pred_min = float(reg_min.predict(current_features)[0])
                pred_max = float(reg_max.predict(current_features)[0])
                
                # Ensure constraints: max >= min and round values
                pred_min = max(0.0, round(pred_min, 1))
                pred_max = max(pred_min, round(pred_max, 1))
                
                return {
                    "predicted_min": pred_min,
                    "predicted_max": pred_max,
                    "currency": currency,
                    "model_type": "GradientBoostingRegressor (Dynamic Local)",
                    "confidence": "High (Trained on local market data)"
                }
        except Exception as pred_err:
            pass
            
        # 2. Rule-based fallback if ML fails or insufficient training samples are present
        base_rates = {
            "USD": {"base": 80.0, "exp_factor": 15.0, "ai_bonus": 20.0, "sf_bonus": 30.0},
            "INR": {"base": 8.0, "exp_factor": 2.5, "ai_bonus": 5.0, "sf_bonus": 0.0},
            "GBP": {"base": 50.0, "exp_factor": 8.0, "ai_bonus": 12.0, "sf_bonus": 0.0},
            "EUR": {"base": 50.0, "exp_factor": 8.0, "ai_bonus": 12.0, "sf_bonus": 0.0},
        }
        
        rate = base_rates.get(currency, base_rates["USD"])
        
        # Calculate baseline
        val_min = rate["base"] + (float(experience_years) * rate["exp_factor"])
        
        # Add skill bonuses
        skills_str = " ".join([s.lower() for s in skills])
        if any(x in skills_str for x in ["ai", "ml", "nlp", "pytorch", "tensorflow", "llm"]):
            val_min += rate["ai_bonus"]
            
        # Add location bonuses
        loc = str(location).lower()
        if "san francisco" in loc or "sf" in loc:
            val_min += rate["sf_bonus"]
            
        val_max = val_min * 1.35
        
        return {
            "predicted_min": round(val_min, 1),
            "predicted_max": round(val_max, 1),
            "currency": currency,
            "model_type": "Statistical Baseline Rule Engine",
            "confidence": "Medium (Insufficient training data)"
        }
