"""
Job Seeker Resume Views
────────────────────────
Handles:
  - Upload resume (PDF/DOCX) → parse with existing parsing_agent → store in JobSeekerAccount
  - Enhance resume with ResumeEnhancerAgent
  - Get current resume data
"""

import os
import uuid
import logging
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from api.models import JobSeekerAccount
from api.views.seeker_auth import require_seeker_jwt
from api.services.email_service import FROM_EMAIL
from models.schemas import success_response, error_response
from agents.parsing_agent import ResumeParsingAgent
from agents.normalization_agent import SkillNormalizationAgent
from agents.resume_enhancer_agent import ResumeEnhancerAgent

logger = logging.getLogger(__name__)

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")


@csrf_exempt
@require_seeker_jwt
def upload_resume(request):
    """
    POST /api/v1/seeker/resume/upload
    Upload a PDF/DOCX resume → parse → store in seeker account.
    """
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        file = request.FILES.get("file")
        if not file:
            return JsonResponse(error_response("No file provided"), status=400)

        allowed_ext = (".pdf", ".docx", ".doc", ".txt")
        if not file.name.lower().endswith(allowed_ext):
            return JsonResponse(error_response("Only PDF, DOCX, DOC, or TXT files are accepted"), status=400)

        if file.size > 10 * 1024 * 1024:  # 10 MB
            return JsonResponse(error_response("File size must be under 10 MB"), status=400)

        # Save file
        seeker_dir = os.path.join(UPLOAD_DIR, "seekers", str(request.seeker.id))
        os.makedirs(seeker_dir, exist_ok=True)

        fname = f"{uuid.uuid4()}_{file.name}"
        file_path = os.path.join(seeker_dir, fname)
        with open(file_path, "wb+") as f:
            for chunk in file.chunks():
                f.write(chunk)

        # Parse with existing agent (synchronous)
        parser = ResumeParsingAgent()
        parsed = parser.parse(file_path)

        # Normalize skills
        raw_skills = parsed.get("skills", [])
        try:
            from asgiref.sync import async_to_sync
            norm_agent = SkillNormalizationAgent()
            normalized_skills = async_to_sync(norm_agent.normalize)(raw_skills)
        except Exception as norm_err:
            logger.warning("Skill normalization failed: %s", norm_err)
            normalized_skills = raw_skills

        # Save to seeker account
        seeker = request.seeker
        seeker.resume_file_path = file_path
        seeker.resume_data = parsed
        seeker.skills = normalized_skills

        # Auto-fill headline if empty
        if not seeker.headline and parsed.get("current_role"):
            seeker.headline = parsed["current_role"]

        seeker.save(update_fields=["resume_file_path", "resume_data", "skills", "headline"])

        return JsonResponse(success_response({
            "message": "Resume uploaded and parsed successfully",
            "parsed": {
                "name": parsed.get("name"),
                "email": parsed.get("email"),
                "skills": normalized_skills[:20],  # first 20
                "total_skills": len(normalized_skills),
                "experience_years": parsed.get("total_experience_years", 0),
                "education": parsed.get("education", []),
                "summary": parsed.get("summary", ""),
            }
        }))

    except Exception as e:
        logger.error("Resume upload error: %s", e)
        return JsonResponse(error_response(f"Server error: {e}"), status=500)


@csrf_exempt
@require_seeker_jwt
def enhance_resume(request):
    """
    POST /api/v1/seeker/resume/enhance
    Run the AI Resume Enhancer on the seeker's current resume.
    Body (optional): { "job_description": "..." }
    """
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        seeker = request.seeker

        if not seeker.resume_data:
            return JsonResponse(error_response("Please upload a resume first"), status=400)

        import json as _json
        body = {}
        if request.body:
            try:
                body = _json.loads(request.body)
            except Exception:
                pass

        job_description = body.get("job_description", "")

        enhancer = ResumeEnhancerAgent()
        result = enhancer.enhance(seeker.resume_data, job_description)

        if result["success"]:
            # Store the enhanced version
            seeker.enhanced_resume = result["data"]
            seeker.save(update_fields=["enhanced_resume"])

        return JsonResponse(success_response(result["data"]))

    except Exception as e:
        logger.error("Resume enhance error: %s", e)
        return JsonResponse(error_response(f"Server error: {e}"), status=500)


@csrf_exempt
@require_seeker_jwt
def get_resume(request):
    """
    GET /api/v1/seeker/resume
    Returns the seeker's current parsed resume and enhanced version.
    """
    if request.method != "GET":
        return JsonResponse(error_response("Method not allowed"), status=405)
    seeker = request.seeker
    return JsonResponse(success_response({
        "has_resume": bool(seeker.resume_file_path or seeker.resume_data),
        "resume_data": seeker.resume_data,
        "enhanced_resume": seeker.enhanced_resume,
        "skills": seeker.skills,
    }))
