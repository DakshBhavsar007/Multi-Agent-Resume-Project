import os
import uuid
import logging
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from asgiref.sync import async_to_sync

from api.decorators import require_api_key, check_rate_limit
from agents.parsing_agent import ResumeParsingAgent
from agents.normalization_agent import SkillNormalizationAgent
from models.schemas import success_response, error_response

logger = logging.getLogger(__name__)
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")

@csrf_exempt
@require_api_key
@check_rate_limit("parse")
def parse_resume(request):
    """
    POST /api/v1/parse
    Synchronously extracts structured data from a raw resume file.
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

        # Save to a temporary parse directory
        temp_dir = os.path.join(UPLOAD_DIR, "temp_parse")
        os.makedirs(temp_dir, exist_ok=True)

        fname = f"{uuid.uuid4()}_{file.name}"
        file_path = os.path.join(temp_dir, fname)
        with open(file_path, "wb+") as f:
            for chunk in file.chunks():
                f.write(chunk)

        # Parse with existing agent (async → sync)
        file_ext = os.path.splitext(file.name.lower())[1].lstrip(".")
        if file_ext == "doc":
            file_ext = "docx"

        parser = ResumeParsingAgent()
        result = async_to_sync(parser.parse)(file_path, file_ext)
        parsed = result.get("parsed", {})

        # Clean up temp file
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception as e:
            logger.warning("Failed to remove temporary parse file: %s", e)

        # Format skills as a list of strings if they are objects
        raw_skills = parsed.get("skills", [])
        
        def flatten_skill(s):
            """Convert skill object {skill, level, ...} or plain string to a string."""
            if isinstance(s, str):
                return s
            if isinstance(s, dict):
                return s.get("skill") or s.get("name") or str(s)
            return str(s)

        raw_skills_flat = [flatten_skill(s) for s in raw_skills if s]

        # Normalize skills
        try:
            norm_agent = SkillNormalizationAgent()
            normalized_skills = async_to_sync(norm_agent.normalize)(raw_skills_flat)
            normalized_skills = [flatten_skill(s) for s in normalized_skills if s]
        except Exception as norm_err:
            logger.warning("Skill normalization failed in parse view: %s", norm_err)
            normalized_skills = raw_skills_flat

        response_data = {
            "candidate_id": f"cnd_{uuid.uuid4().hex[:8]}",
            "status": "completed",
            "name": parsed.get("name") or file.name.rsplit('.', 1)[0],
            "skills": normalized_skills,
            "raw_parsed_data": parsed
        }

        return JsonResponse(success_response(response_data))

    except Exception as e:
        import traceback
        logger.error("Error in parse_resume view:\n%s", traceback.format_exc())
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)
