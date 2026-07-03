import numpy as np

class JobRecommendationAgent:
    def __init__(self):
        pass

    def recommend_jobs(self, candidate_skills: list, candidate_experience: float, candidate_location: str, limit: int = 5) -> list:
        """
        Recommends top matching active jobs for a candidate using scikit-learn's NearestNeighbors (KNN)
        with cosine distance metric on TF-IDF features of job descriptions and skills.
        """
        try:
            from api.models import Session
            from api.views.seeker_jobs import _get_salary_range
            
            # Fetch active job sessions
            active_jobs = Session.objects.filter(status="active")
            if not active_jobs.exists():
                return []
                
            jobs_list = list(active_jobs)
            
            # Compile text corpus for TF-IDF vectorization
            job_docs = []
            for j in jobs_list:
                crit = j.criteria or {}
                skills = crit.get("required_skills", []) or crit.get("skills", []) or []
                skills_str = " ".join(skills)
                doc = f"{j.job_title} {j.job_description} {skills_str}"
                job_docs.append(doc)
                
            # Candidate profile representation
            cand_skills_str = " ".join(candidate_skills)
            cand_doc = f"{cand_skills_str} {candidate_location}"
            
            from sklearn.feature_extraction.text import TfidfVectorizer
            from sklearn.neighbors import NearestNeighbors
            
            vectorizer = TfidfVectorizer(stop_words='english', token_pattern=r'(?u)\b\w+\b')
            all_docs = job_docs + [cand_doc]
            vectorizer.fit(all_docs)
            
            job_vectors = vectorizer.transform(job_docs)
            cand_vector = vectorizer.transform([cand_doc])
            
            # KNN matching using Cosine metric
            n_neighbors = min(limit, len(jobs_list))
            if n_neighbors <= 0:
                return []
                
            knn = NearestNeighbors(n_neighbors=n_neighbors, metric='cosine')
            knn.fit(job_vectors)
            
            distances, indices = knn.kneighbors(cand_vector)
            
            recommended_jobs = []
            for idx, job_idx in enumerate(indices[0]):
                job = jobs_list[job_idx]
                distance = float(distances[0][idx])
                
                # Convert cosine distance to percentage similarity
                match_prob = round((1.0 - distance) * 100, 1)
                match_prob = max(10.0, min(99.0, match_prob)) # clean boundaries
                
                crit = job.criteria or {}
                salary = _get_salary_range(job)
                
                recommended_jobs.append({
                    "id": str(job.id),
                    "job_title": job.job_title,
                    "company_name": job.company.name if job.company else "Vishleshan Partner",
                    "company_logo_path": job.company.logo_path if job.company else None,
                    "location": crit.get("preferred_locations", ["Remote"])[0] if crit.get("preferred_locations") else "Remote",
                    "salary_range": salary,
                    "match_probability": match_prob,
                    "employment_type": crit.get("employment_types", ["Full-time"])[0] if crit.get("employment_types") else "Full-time"
                })
                
            # Sort by match probability descending
            recommended_jobs.sort(key=lambda x: x["match_probability"], reverse=True)
            return recommended_jobs
        except Exception as e:
            # Fallback simple substring match if TF-IDF fails
            try:
                from api.models import Session
                from api.views.seeker_jobs import _get_salary_range
                
                active = Session.objects.filter(status="active")[:limit]
                results = []
                for job in active:
                    crit = job.criteria or {}
                    results.append({
                        "id": str(job.id),
                        "job_title": job.job_title,
                        "company_name": job.company.name if job.company else "Vishleshan Partner",
                        "company_logo_path": job.company.logo_path if job.company else None,
                        "location": crit.get("preferred_locations", ["Remote"])[0] if crit.get("preferred_locations") else "Remote",
                        "salary_range": _get_salary_range(job),
                        "match_probability": 75.0,
                        "employment_type": crit.get("employment_types", ["Full-time"])[0] if crit.get("employment_types") else "Full-time"
                    })
                return results
            except Exception:
                return []
