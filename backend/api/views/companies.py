import json
import uuid
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from api.models import Company, Session
from api.views.seeker_auth import require_seeker_jwt
from models.schemas import success_response, error_response

def _serialize_company(company, is_following=False, active_sessions=None):
    # Get active job sessions for this company
    if active_sessions is None:
        active_sessions = Session.objects.filter(company=company, status="active")
    open_jobs = []
    for s in active_sessions:
        criteria = s.criteria or {}
        preferred_locations = criteria.get("preferred_locations", [])
        loc = preferred_locations[0] if preferred_locations else "Remote"
        open_jobs.append({
            "id": str(s.id),
            "job_title": s.job_title,
            "location": loc,
            "employment_type": "Full-time",
            "salary_range": "Competitive"
        })
        
    return {
        "id": str(company.id),
        "name": company.name,
        "email": company.email,
        "industry": company.industry or "Technology",
        "hq_location": company.hq_location or "Remote",
        "about": company.about or "This company has not provided an overview yet.",
        "rating": company.rating or 4.5,
        "company_size": company.company_size or "50-200",
        "founded_year": company.founded_year or 2020,
        "website_url": company.website_url or "https://example.com",
        "logo_path": company.logo_path,
        "openings": len(open_jobs),
        "open_jobs": open_jobs,
        "is_following": is_following
    }

# ── Public Endpoints ──────────────────────────────────────────────────────────

@csrf_exempt
def public_list_companies(request):
    """GET /api/v1/public/companies - lists all active companies."""
    if request.method != "GET":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        companies = Company.objects.filter(is_active=True).order_by("name")
        
        # Bulk fetch active sessions to avoid N+1 query
        company_ids = [c.id for c in companies]
        active_sessions_qs = Session.objects.filter(company_id__in=company_ids, status="active")
        
        sessions_by_company = {}
        for s in active_sessions_qs:
            cid_str = str(s.company_id)
            sessions_by_company.setdefault(cid_str, []).append(s)

        serialized = [_serialize_company(c, active_sessions=sessions_by_company.get(str(c.id), [])) for c in companies]
        return JsonResponse(success_response({"companies": serialized}))
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {e}"), status=500)

@csrf_exempt
def public_get_company(request, company_id):
    """GET /api/v1/public/companies/<id> - gets a single company's details."""
    if request.method != "GET":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        try:
            uuid.UUID(company_id)
        except ValueError:
            return JsonResponse(error_response("Invalid company ID format"), status=400)
            
        company = Company.objects.filter(id=company_id, is_active=True).first()
        if not company:
            return JsonResponse(error_response("Company not found"), status=404)
            
        return JsonResponse(success_response(_serialize_company(company)))
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {e}"), status=500)

# ── Seeker Endpoints ──────────────────────────────────────────────────────────

@csrf_exempt
@require_seeker_jwt
def seeker_list_companies(request):
    """GET /api/v1/seeker/companies - lists all companies with follow status."""
    if request.method != "GET":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        seeker = request.seeker
        followed = seeker.resume_data.get("followed_companies", []) if seeker.resume_data else []
        companies = Company.objects.filter(is_active=True).order_by("name")
        
        # Bulk fetch active sessions to avoid N+1 query
        company_ids = [c.id for c in companies]
        active_sessions_qs = Session.objects.filter(company_id__in=company_ids, status="active")
        
        sessions_by_company = {}
        for s in active_sessions_qs:
            cid_str = str(s.company_id)
            sessions_by_company.setdefault(cid_str, []).append(s)

        serialized = [
            _serialize_company(c, str(c.id) in followed, active_sessions=sessions_by_company.get(str(c.id), []))
            for c in companies
        ]
        return JsonResponse(success_response({"companies": serialized}))
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {e}"), status=500)

@csrf_exempt
@require_seeker_jwt
def seeker_get_company(request, company_id):
    """GET /api/v1/seeker/companies/<id> - gets details with follow status."""
    if request.method != "GET":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        try:
            uuid.UUID(company_id)
        except ValueError:
            return JsonResponse(error_response("Invalid company ID format"), status=400)
            
        company = Company.objects.filter(id=company_id, is_active=True).first()
        if not company:
            return JsonResponse(error_response("Company not found"), status=404)
            
        seeker = request.seeker
        followed = seeker.resume_data.get("followed_companies", []) if seeker.resume_data else []
        return JsonResponse(success_response(_serialize_company(company, str(company.id) in followed)))
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {e}"), status=500)

@csrf_exempt
@require_seeker_jwt
def seeker_follow_company(request, company_id):
    """
    POST /api/v1/seeker/companies/<id>/follow - follow a company.
    DELETE /api/v1/seeker/companies/<id>/follow - unfollow a company.
    """
    if request.method not in ["POST", "DELETE"]:
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        try:
            uuid.UUID(company_id)
        except ValueError:
            return JsonResponse(error_response("Invalid company ID format"), status=400)
            
        company = Company.objects.filter(id=company_id, is_active=True).first()
        if not company:
            return JsonResponse(error_response("Company not found"), status=404)
            
        seeker = request.seeker
        if not seeker.resume_data or not isinstance(seeker.resume_data, dict):
            seeker.resume_data = {}
            
        followed = seeker.resume_data.get("followed_companies", [])
        if not isinstance(followed, list):
            followed = []
            
        cid_str = str(company.id)
        if request.method == "POST":
            if cid_str not in followed:
                followed.append(cid_str)
                seeker.resume_data["followed_companies"] = followed
                seeker.save(update_fields=["resume_data"])
            msg = "Followed successfully"
        else: # DELETE
            if cid_str in followed:
                followed.remove(cid_str)
                seeker.resume_data["followed_companies"] = followed
                seeker.save(update_fields=["resume_data"])
            msg = "Unfollowed successfully"
            
        return JsonResponse(success_response({"message": msg, "is_following": request.method == "POST"}))
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {e}"), status=500)
