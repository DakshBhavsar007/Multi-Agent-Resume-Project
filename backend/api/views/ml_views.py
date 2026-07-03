import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from api.decorators import require_recruiter_jwt
from api.views.seeker_auth import require_seeker_jwt
from models.schemas import success_response, error_response
from api.models import Session

from agents.salary_prediction_agent import SalaryPredictionAgent
from agents.job_recommendation_agent import JobRecommendationAgent
from agents.resume_quality_agent import ResumeQualityAgent
from agents.normalization_agent import SkillNormalizationAgent

@csrf_exempt
@require_seeker_jwt
def predict_salary_view(request):
    """POST /api/v1/seeker/predict-salary - predicts predicted salary range."""
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        data = json.loads(request.body)
        skills = data.get("skills", [])
        experience = float(data.get("experience_years", 0.0))
        location = data.get("location", "Remote")
        currency = data.get("currency", "USD")
        
        agent = SalaryPredictionAgent()
        prediction = agent.predict_expected_salary(skills, experience, location, currency)
        return JsonResponse(success_response(prediction))
    except Exception as e:
        return JsonResponse(error_response(f"Prediction failed: {e}"), status=500)

@csrf_exempt
@require_seeker_jwt
def recommend_jobs_view(request):
    """GET /api/v1/seeker/recommendations - recommends matching active jobs."""
    if request.method != "GET":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        seeker = request.seeker
        skills = seeker.skills or []
        experience = float(seeker.resume_data.get("total_experience_years", 0.0)) if isinstance(seeker.resume_data, dict) else 0.0
        location = seeker.location or "Remote"
        
        # Override params if specified in request query parameters
        limit = int(request.GET.get("limit", 5))
        
        agent = JobRecommendationAgent()
        recommendations = agent.recommend_jobs(skills, experience, location, limit)
        return JsonResponse(success_response(recommendations))
    except Exception as e:
        return JsonResponse(error_response(f"Recommendation failed: {e}"), status=500)

@csrf_exempt
def ats_score_view(request):
    """POST /api/v1/seeker/ats-score - fast local resume ATS scoring."""
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        data = json.loads(request.body)
        resume_text = data.get("resume_text", "")
        job_description = data.get("job_description", "")
        job_id = data.get("job_id")
        
        # Resolve JD from job_id if provided
        if job_id and not job_description:
            session = Session.objects.filter(id=job_id).first()
            if session:
                job_description = session.job_description
                
        if not resume_text or not job_description:
            return JsonResponse(error_response("Both resume_text and job_description or job_id are required"), status=400)
            
        agent = ResumeQualityAgent()
        result = agent.calculate_ats_score(resume_text, job_description)
        return JsonResponse(success_response(result))
    except Exception as e:
        return JsonResponse(error_response(f"ATS scoring failed: {e}"), status=500)

@csrf_exempt
@require_recruiter_jwt
def cluster_skills_view(request):
    """POST /api/v1/recruiter/cluster-skills - cluster unmapped skills using KMeans."""
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        data = json.loads(request.body)
        skills = data.get("skills", [])
        n_clusters = int(data.get("n_clusters", 5))
        
        if not skills:
            return JsonResponse(error_response("A list of skills is required"), status=400)
            
        agent = SkillNormalizationAgent()
        clusters = agent.cluster_unmapped_skills(skills, n_clusters)
        return JsonResponse(success_response(clusters))
    except Exception as e:
        return JsonResponse(error_response(f"Clustering failed: {e}"), status=500)
