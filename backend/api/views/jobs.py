import os
import uuid
import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from api.models import Session, Candidate, Company, FraudScanLog
from workers.celery_worker import _parse_resume_sync, _normalize_skills_sync
from models.schemas import success_response, error_response
from agents.fraud_agent import FraudDetectionAgent
from api.views.seeker_jobs import _parse_job_description_meta, _get_salary_range

def calculate_unified_match_score(skills, total_exp_years, location, entity_id_str, session):
    """
    Unified, deterministic match score calculation (0-100) shared by:
    - Seeker Find Jobs (/jobs/search)
    - Seeker Applications (/jobs/applications)
    - Recruiter Dashboard & Candidate Profiles
    """
    from api.views.seeker_jobs import _get_flat_skills
    criteria = session.criteria or {}
    required_skills = criteria.get("required_skills", [])
    if not required_skills and session.inferred_skills:
        required_skills = session.inferred_skills

    req_lower = [r.lower().strip() for r in required_skills if r]

    flat_skills = _get_flat_skills(skills)
    cand_skill_names = {
        s.lower().strip() for s in flat_skills if s
    }
    
    matched_list = [r for r in required_skills if any(r.lower().strip() in s or s in r.lower().strip() for s in cand_skill_names)]
    missing_list = [r for r in required_skills if r.lower().strip() not in [m.lower().strip() for m in matched_list]]
    matched = len(matched_list)

    if req_lower:
        skill_score = round((matched / len(req_lower)) * 100)
    else:
        skill_score = min(95, max(60, 65 + len(cand_skill_names) * 3))

    # Experience score
    min_exp = criteria.get("min_experience", 0)
    try:
        exp_years = float(total_exp_years or 0)
    except (ValueError, TypeError):
        exp_years = 0.0
    experience_score = min(100, round((exp_years / max(min_exp, 1)) * 100)) if min_exp > 0 else (75 if exp_years >= 2 else 60)

    # Location score
    preferred_locs = criteria.get("preferred_locations", [])
    cand_location = (location or "").lower().strip()
    location_score = 100 if not preferred_locs else (100 if any(l.lower().strip() in cand_location for l in preferred_locs) else 50)

    # Hash offset variance (0 to 11%) based on entity_id_str (Seeker ID or Candidate ID)
    hash_offset = (abs(hash(str(entity_id_str))) % 12) if entity_id_str else 5

    # Weighted overall score
    weights = criteria.get("weights", {"skills": 0.5, "experience": 0.3, "location": 0.2})
    raw_score = round(
        skill_score * weights.get("skills", 0.5) + 
        experience_score * weights.get("experience", 0.3) + 
        location_score * weights.get("location", 0.2)
    )
    score = min(98, max(45, raw_score + (hash_offset if not req_lower else 0)))

    details = {
        "match_score": score,
        "skill_score": skill_score,
        "experience_score": experience_score,
        "location_score": location_score,
        "matched_skills": matched_list,
        "missing_skills": missing_list,
        "matched_count": matched,
        "total_required": len(req_lower)
    }
    return score, details


def _calculate_match_score(candidate, session):
    """Calculates and updates candidate match score synchronously against session criteria."""
    entity_id_str = str(candidate.email or candidate.id)
    if hasattr(candidate, "job_applications") and candidate.job_applications.exists():
        app = candidate.job_applications.first()
        if app.seeker_id:
            entity_id_str = str(app.seeker_id)

    score, details = calculate_unified_match_score(
        skills=candidate.normalized_skills,
        total_exp_years=candidate.total_experience_years,
        location=candidate.location,
        entity_id_str=entity_id_str,
        session=session
    )
    candidate.match_score = score
    candidate.recommendation = "Strong" if score >= 75 else ("Moderate" if score >= 50 else "Weak")
    candidate.match_details = details
    candidate.save(update_fields=["match_score", "recommendation", "match_details"])
    
    min_match_score = session.criteria.get("min_match_score", 0)
    if min_match_score > 0 and score < min_match_score:
        candidate.status = "rejected"
    return candidate.match_details

@csrf_exempt
def list_public_jobs(request):
    """
    GET /api/v1/public/jobs
    Lists all active sessions as public job postings.
    Supports query params:
      - query: search in job title / description
      - location: search in preferred locations
    """
    if request.method != "GET":
        return JsonResponse(error_response("Method not allowed"), status=405)
        
    try:
        query = request.GET.get("query", "").strip()
        location_filter = request.GET.get("location", "").strip()
        try:
            page = int(request.GET.get("page", 1))
            per_page = int(request.GET.get("per_page", 10))
        except ValueError:
            page = 1
            per_page = 10
        
        # Only active, non-archived sessions
        qs = Session.objects.filter(status="active").select_related("company")
        
        if query:
            qs = qs.filter(job_title__icontains=query) | qs.filter(job_description__icontains=query)
            
        jobs = []
        for s in qs:
            criteria = s.criteria or {}
            preferred_locations = criteria.get("preferred_locations", [])
            
            # Simple check for location filter
            if location_filter:
                loc_match = False
                # Check criteria location list
                for loc in preferred_locations:
                    if location_filter.lower() in loc.lower():
                        loc_match = True
                        break
                # Check description text as fallback
                if not loc_match and location_filter.lower() in s.job_description.lower():
                    loc_match = True
                if not loc_match:
                    continue
            
            company_name = s.company.name if s.company else "Between Partner"
            meta = _parse_job_description_meta(s.job_description)
            
            jobs.append({
                "id": str(s.id),
                "job_title": s.job_title,
                "job_description": s.job_description,
                "company_name": company_name,
                "company_logo_path": s.company.logo_path if s.company else None,
                "required_skills": criteria.get("required_skills", []),
                "nice_to_have": criteria.get("nice_to_have", []),
                "preferred_locations": preferred_locations,
                "min_experience": criteria.get("min_experience", 0),
                "created_at": s.created_at.isoformat() if s.created_at else None,
                "salary_range": _get_salary_range(s),
                "location": meta["location"],
                "employment_type": meta["employment_type"]
            })
            
        total_jobs = len(jobs)
        start = (page - 1) * per_page
        end = start + per_page
        paginated_jobs = jobs[start:end]
        
        return JsonResponse(success_response({
            "jobs": paginated_jobs,
            "total": total_jobs,
            "page": page,
            "per_page": per_page,
            "total_pages": (total_jobs + per_page - 1) // per_page if per_page else 1
        }))
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)

@csrf_exempt
def get_public_job(request, session_id):
    """
    GET /api/v1/public/jobs/<session_id>
    Gets full description and criteria for a specific job session.
    """
    if request.method != "GET":
        return JsonResponse(error_response("Method not allowed"), status=405)
        
    try:
        try:
            uuid.UUID(session_id)
        except ValueError:
            return JsonResponse(error_response("Invalid job ID format"), status=400)
            
        s = Session.objects.filter(id=session_id, status="active").first()
        if not s:
            return JsonResponse(error_response("Job posting not found"), status=404)
            
        criteria = s.criteria or {}
        company_name = s.company.name if s.company else "Between Partner"
        meta = _parse_job_description_meta(s.job_description)
        
        return JsonResponse(success_response({
            "id": str(s.id),
            "job_title": s.job_title,
            "job_description": s.job_description,
            "company_name": company_name,
            "required_skills": criteria.get("required_skills", []),
            "nice_to_have": criteria.get("nice_to_have", []),
            "preferred_locations": criteria.get("preferred_locations", []),
            "min_experience": criteria.get("min_experience", 0),
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "salary_range": _get_salary_range(s),
            "location": meta["location"],
            "employment_type": meta["employment_type"]
        }))
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)

@csrf_exempt
def apply_public_job(request, session_id):
    """
    POST /api/v1/public/jobs/<session_id>/apply
    Applies for a job by uploading a resume. Parses it, creates a candidate,
    calculates the matching details, and returns them to the seeker.
    Also handles pure parsing if session_id is "parse-only".
    """
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)
        
    try:
        is_parse_only = (session_id == "parse-only")
        session = None
        
        if not is_parse_only:
            try:
                uuid.UUID(session_id)
            except ValueError:
                return JsonResponse(error_response("Invalid job ID format"), status=400)
                
            session = Session.objects.filter(id=session_id, status="active").first()
            if not session:
                return JsonResponse(error_response("Job posting not found"), status=404)
                
        resume_file = request.FILES.get("file")
        if not resume_file:
            return JsonResponse(error_response("Resume file is required"), status=400)
            
        # Optional metadata fields from frontend
        seeker_name = request.POST.get("name")
        seeker_email = request.POST.get("email")
        seeker_phone = request.POST.get("phone")
        
        # Save uploaded file to local temp
        temp_dir = os.path.join("uploads", "temp_job_seeker")
        os.makedirs(temp_dir, exist_ok=True)
        file_uuid = uuid.uuid4()
        file_ext = os.path.splitext(resume_file.name)[1]
        temp_file_name = f"{file_uuid}{file_ext}"
        temp_file_path = os.path.join(temp_dir, temp_file_name)
        
        path = default_storage.save(temp_file_path, ContentFile(resume_file.read()))
        abs_temp_path = default_storage.path(path)
        
        # Synchronously parse the resume
        parsed_res = _parse_resume_sync(abs_temp_path, skip_llm=False)
        raw_data = parsed_res.get("parsed", {})
        
        # Normalize skills
        raw_skills = raw_data.get("skills", [])
        normalized_skills = _normalize_skills_sync(raw_skills)
        
        response_data = {
            "parsed_profile": {
                "name": seeker_name or raw_data.get("name") or resume_file.name.split(".")[0],
                "email": seeker_email or raw_data.get("email"),
                "phone": seeker_phone or raw_data.get("phone"),
                "location": raw_data.get("location") or "Unknown",
                "linkedin_url": raw_data.get("linkedin_url"),
                "github_url": raw_data.get("github_url"),
                "total_experience_years": float(raw_data.get("total_experience_years") or 0.0),
                "skills": normalized_skills,
                "experience": raw_data.get("experience", []),
                "education": raw_data.get("education", [])
            }
        }
        
        if not is_parse_only:
            # Create Candidate in database under the Job Session
            rounds = session.rounds or []
            first_round_order = rounds[0]["order"] if rounds else 0
            
            # Save file permanently under the session upload folder
            permanent_dir = os.path.join("uploads", str(session.id))
            os.makedirs(permanent_dir, exist_ok=True)
            permanent_file_name = f"{uuid.uuid4()}_{resume_file.name}"
            permanent_path = os.path.join(permanent_dir, permanent_file_name)
            
            # Copy file
            with open(abs_temp_path, "rb") as f_src:
                file_content = f_src.read()
                path_perm = default_storage.save(permanent_path, ContentFile(file_content))
                abs_permanent_path = default_storage.path(path_perm)
                
            candidate = Candidate.objects.create(
                session=session,
                name=response_data["parsed_profile"]["name"],
                email=response_data["parsed_profile"]["email"],
                phone=response_data["parsed_profile"]["phone"],
                location=response_data["parsed_profile"]["location"],
                total_experience_years=response_data["parsed_profile"]["total_experience_years"],
                normalized_skills=normalized_skills,
                raw_resume_data=parsed_res,
                resume_file_path=abs_permanent_path,
                current_round_index=first_round_order,
                status="new",
                source="public_apply"
            )
            
            # Calculate match details
            match_details = _calculate_match_score(candidate, session)
            response_data["match_details"] = match_details
            response_data["candidate_id"] = str(candidate.id)
            
        # Clean up temp file
        try:
            if os.path.exists(abs_temp_path):
                os.remove(abs_temp_path)
        except Exception:
            pass
            
        return JsonResponse(success_response(response_data))
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)

@csrf_exempt
def scan_job_safety_public(request, session_id):
    """
    POST /api/v1/public/jobs/<session_id>/safety-check
    Retrieves or generates a safety/originality analysis for a public job posting,
    visible to job seekers.
    """
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)

    try:
        try:
            uuid.UUID(session_id)
        except ValueError:
            return JsonResponse(error_response("Invalid job ID format"), status=400)

        session = Session.objects.filter(id=session_id, status="active").first()
        if not session:
            return JsonResponse(error_response("Job posting not found"), status=404)

        log_name = f"Job: {session.job_title}"
        log = FraudScanLog.objects.filter(candidate_name=log_name, role="Job Posting").order_by("-created_at").first()

        if not log or (session.updated_at and log.created_at and session.updated_at > log.created_at):
            agent = FraudDetectionAgent()
            pref_loc = "Remote"
            if session.criteria and session.criteria.get("preferred_locations"):
                pref_loc = ", ".join(session.criteria.get("preferred_locations"))
                
            analysis = agent.analyze_job(session.job_title, session.job_description, {
                "location": pref_loc,
                "company_name": session.company.name if session.company else "Unknown Company",
                "company_email": session.company.email if session.company else "Unknown Email",
                "company_website": session.company.website_url if session.company else "Unknown Website",
                "company_industry": session.company.industry if session.company else "Unknown",
                "company_hq": session.company.hq_location if session.company else "Unknown",
                "salary_min": session.criteria.get("salary_min") if (session.criteria and "salary_min" in session.criteria) else None,
                "salary_max": session.criteria.get("salary_max") if (session.criteria and "salary_max" in session.criteria) else None,
                "salary_currency": session.criteria.get("salary_currency", "USD") if (session.criteria and "salary_currency" in session.criteria) else "USD"
            })
            
            originality = analysis.get("originality_score", 95)
            ai_prob = analysis.get("ai_probability", 10)
            plagiarism = analysis.get("plagiarism_score", 5)
            
            status_str = analysis.get("status") or "Verified Clean"
            if originality < 70 or plagiarism > 30 or analysis.get("ats_manipulation_detected", False):
                status_str = "Suspicious Listing"

            if log:
                log.delete()

            log = FraudScanLog.objects.create(
                company=session.company,
                candidate_name=log_name,
                role="Job Posting",
                location=pref_loc,
                originality_score=originality,
                ai_probability=ai_prob,
                plagiarism_score=plagiarism,
                status=status_str,
                portfolios=analysis.get("manipulation_flags", []) or ["Safety Audit Checked"],
                detailed_checks=analysis.get("detailed_checks", {})
            )

        # Derive backward-compatible risk level and verified company if not stored
        detailed_checks = log.detailed_checks or {}
        risk_level = detailed_checks.get("risk_level")
        if not risk_level:
            if log.originality_score < 60:
                risk_level = "High"
            elif log.originality_score < 80:
                risk_level = "Medium"
            else:
                risk_level = "Low"

        verified_company = detailed_checks.get("verified_company")
        if not verified_company:
            verified_company = "Yes" if log.originality_score >= 70 else "No"

        return JsonResponse(success_response({
            "id": str(log.id),
            "job_title": session.job_title,
            "company_name": session.company.name if session.company else "Between Partner",
            "originality_score": log.originality_score,
            "ai_probability": log.ai_probability,
            "plagiarism_score": log.plagiarism_score,
            "status": log.status,
            "risk_level": risk_level,
            "verified_company": verified_company,
            "flags": log.portfolios,
            "detailed_checks": detailed_checks,
            "created_at": log.created_at.isoformat()
        }))

    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)

@csrf_exempt
def scan_safety_arbitrary_public(request):
    """
    POST /api/v1/public/jobs/scan-safety
    Scans any job description pasted by a job seeker.
    """
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)

    try:
        try:
            data = json.loads(request.body)
        except Exception:
            data = request.POST

        url_val = data.get("url", "").strip()
        job_title = data.get("job_title", "").strip()
        job_description = data.get("job_description", "").strip()
        company_name = data.get("company_name", "").strip() or "Unknown Company"

        if url_val and "linkedin.com" in url_val.lower():
            from api.services.linkedin_scraper import fetch_linkedin_job_details
            details = fetch_linkedin_job_details(url_val)
            job_title = details.get("job_title")
            job_description = details.get("job_description")
            company_name = details.get("company_name", company_name)

        if not job_title or not job_description:
            return JsonResponse(error_response("Job title and description are required"), status=400)

        agent = FraudDetectionAgent()
        analysis = agent.analyze_job(job_title, job_description, {
            "company_name": company_name
        })

        originality = analysis.get("originality_score", 95)
        ai_prob = analysis.get("ai_probability", 10)
        plagiarism = analysis.get("plagiarism_score", 5)

        status_str = analysis.get("status") or "Verified Clean"
        if originality < 70 or plagiarism > 30 or analysis.get("ats_manipulation_detected", False):
            status_str = "Suspicious Listing"

        flags = analysis.get("manipulation_flags", []) or ["Safety Audit Checked"]
        if url_val and "linkedin.com" in url_val.lower():
            flags = [f"Source: LinkedIn"] + [f for f in flags if f != "Safety Audit Checked"]

        return JsonResponse(success_response({
            "job_title": job_title,
            "company_name": company_name,
            "originality_score": originality,
            "ai_probability": ai_prob,
            "plagiarism_score": plagiarism,
            "status": status_str,
            "risk_level": analysis.get("risk_level", "Low"),
            "verified_company": analysis.get("verified_company", "Yes"),
            "flags": flags,
            "detailed_checks": analysis.get("detailed_checks", {}),
            "summary": analysis.get("summary", "Safety report generated successfully.")
        }))

    except Exception as e:
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)
