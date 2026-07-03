import numpy as np

class ResumeQualityAgent:
    def __init__(self):
        pass

    def calculate_ats_score(self, resume_text: str, job_description: str) -> dict:
        """
        Calculates a local ATS score and keyword match statistics for a resume
        against a job description using TfidfVectorizer and LogisticRegression.
        """
        if not resume_text or not job_description:
            return {
                "score": 0.0,
                "matched_keywords": [],
                "missing_keywords": [],
                "keyword_match_percentage": 0.0,
                "details": "Missing resume or job description input."
            }
            
        try:
            from sklearn.feature_extraction.text import TfidfVectorizer
            from sklearn.linear_model import LogisticRegression
            
            # 1. Extract requirements from Job Description to build target vocabulary
            requirements = [s.strip() for s in job_description.split('.') if len(s.strip()) > 10]
            if len(requirements) < 3:
                requirements = [job_description]
                
            # Fit TF-IDF on requirements and resume
            vectorizer = TfidfVectorizer(stop_words='english', max_features=100)
            corpus = requirements + [resume_text]
            vectorizer.fit(corpus)
            
            req_vecs = vectorizer.transform(requirements)
            res_vec = vectorizer.transform([resume_text])
            
            # Analyze keyword match stats
            feature_names = vectorizer.get_feature_names_out()
            
            jd_terms = set()
            for row in req_vecs:
                non_zero = row.nonzero()[1]
                for idx in non_zero:
                    jd_terms.add(feature_names[idx])
                    
            res_terms = set()
            non_zero = res_vec.nonzero()[1]
            for idx in non_zero:
                res_terms.add(feature_names[idx])
                
            matched_keywords = list(jd_terms.intersection(res_terms))
            missing_keywords = list(jd_terms.difference(res_terms))
            
            # 2. Build local classification model
            # Positive training samples: job description sentences
            # Negative training samples: typical resume noise templates
            noise = [
                "hobbies traveling listening music watching movies reading books",
                "personal bio address phone contact detail details details",
                "lorem ipsum dolor sit amet consectetur adipiscing elit",
                "unrelated generic background details reference family hobbies"
            ]
            
            X_train = vectorizer.transform(requirements + noise)
            y_train = np.array([1] * len(requirements) + [0] * len(noise))
            
            clf = LogisticRegression(max_iter=50, random_state=42)
            clf.fit(X_train, y_train)
            
            # Predict probability of being a good match (class 1)
            clf_prob = float(clf.predict_proba(res_vec)[0][1]) * 100
            
            # Calculate simple matching stats
            keyword_score = (len(matched_keywords) / max(1, len(jd_terms))) * 100
            
            # Blend model probability and exact keyword counts (60% model, 40% math overlap)
            final_score = round(0.6 * clf_prob + 0.4 * keyword_score, 1)
            final_score = max(20.0, min(99.0, final_score)) # Keep within realistic bounds
            
            return {
                "score": final_score,
                "matched_keywords": matched_keywords[:15],
                "missing_keywords": missing_keywords[:15],
                "keyword_match_percentage": round(keyword_score, 1)
            }
        except Exception as e:
            return {
                "score": 65.0,
                "matched_keywords": [],
                "missing_keywords": [],
                "keyword_match_percentage": 50.0,
                "error": str(e)
            }
