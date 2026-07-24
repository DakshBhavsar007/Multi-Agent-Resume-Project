import os
import re
import logging
from django.urls import path, include, re_path
from django.views.static import serve
from django.conf import settings

logger = logging.getLogger(__name__)

def custom_serve_uploads(request, path, document_root=None, **kwargs):
    from django.http import Http404, HttpResponse
    if not document_root:
        document_root = os.getenv("UPLOAD_DIR", "uploads")
    full_path = os.path.join(document_root, path)

    if not os.path.exists(full_path):
        # Match pattern: seekers/<seeker_id>/<uuid_or_something>_active_resume.pdf
        match = re.match(r'^seekers/([a-f0-9\-]+)/.*_active_resume\.pdf$', path)
        if match:
            seeker_id = match.group(1)
            try:
                from api.models import JobSeekerAccount
                from agents.resume_pdf_renderer import render_resume_pdf
                seeker = JobSeekerAccount.objects.filter(id=seeker_id).first()
                if seeker:
                    content_to_render = None
                    if seeker.active_resume_draft and seeker.active_resume_draft.content:
                        content_to_render = seeker.active_resume_draft.content
                    elif seeker.resume_data:
                        content_to_render = seeker.resume_data
                    
                    if content_to_render:
                        os.makedirs(os.path.dirname(full_path), exist_ok=True)
                        render_resume_pdf(content_to_render, full_path)
            except Exception as e:
                logger.error("Dynamic active resume PDF regeneration failed: %s", e)
        
        # Match pattern: seekers/<seeker_id>/exports/<draft_id>_export.pdf
        match_export = re.match(r'^seekers/([a-f0-9\-]+)/exports/([a-f0-9\-]+)_export\.pdf$', path)
        if match_export:
            seeker_id = match_export.group(1)
            draft_id = match_export.group(2)
            try:
                from api.models import ResumeDraft
                from agents.resume_pdf_renderer import render_resume_pdf
                draft = ResumeDraft.objects.filter(id=draft_id, seeker_id=seeker_id).first()
                if draft and draft.content:
                    os.makedirs(os.path.dirname(full_path), exist_ok=True)
                    render_resume_pdf(draft.content, full_path)
            except Exception as e:
                logger.error("Dynamic PDF export regeneration failed: %s", e)

        # Match pattern for direct candidate upload: <session_id>/<filename>.pdf
        match_candidate = re.match(r'^([a-f0-9\-]+)/([^/]+\.pdf)$', path)
        if match_candidate:
            session_id = match_candidate.group(1)
            filename = match_candidate.group(2)
            try:
                from api.models import Candidate
                from agents.resume_pdf_renderer import render_resume_pdf
                candidate = Candidate.objects.filter(session_id=session_id, resume_file_path__icontains=filename).first()
                if candidate and candidate.raw_resume_data:
                    raw_data = candidate.raw_resume_data
                    parsed_data = raw_data.get("parsed", raw_data) if isinstance(raw_data, dict) else raw_data
                    if parsed_data:
                        os.makedirs(os.path.dirname(full_path), exist_ok=True)
                        render_resume_pdf(parsed_data, full_path)
            except Exception as e:
                logger.error("Dynamic Candidate PDF regeneration failed: %s", e)

        # Dynamic avatar reconstruction from DB base64 if file missing on disk (e.g. Render restart)
        import base64
        match_seeker_img = re.match(r'^seekers/([a-f0-9\-]+)/', path)
        if match_seeker_img:
            seeker_id = match_seeker_img.group(1)
            try:
                from api.models import JobSeekerAccount
                seeker = JobSeekerAccount.objects.filter(id=seeker_id).first()
                if seeker and seeker.avatar_path and seeker.avatar_path.startswith("data:image/"):
                    header, b64_data = seeker.avatar_path.split(";base64,", 1)
                    mime_type = header.replace("data:", "")
                    img_bytes = base64.b64decode(b64_data)
                    try:
                        os.makedirs(os.path.dirname(full_path), exist_ok=True)
                        with open(full_path, "wb+") as f:
                            f.write(img_bytes)
                    except Exception:
                        pass
                    return HttpResponse(img_bytes, content_type=mime_type)
            except Exception as e:
                logger.error("Dynamic avatar serve failed: %s", e)

        # Dynamic company logo reconstruction from DB base64 if file missing on disk
        match_company_img = re.match(r'^companies/([a-f0-9\-]+)/', path)
        if match_company_img:
            company_id = match_company_img.group(1)
            try:
                from api.models import Company
                company = Company.objects.filter(id=company_id).first()
                if company and company.logo_path and company.logo_path.startswith("data:image/"):
                    header, b64_data = company.logo_path.split(";base64,", 1)
                    mime_type = header.replace("data:", "")
                    img_bytes = base64.b64decode(b64_data)
                    try:
                        os.makedirs(os.path.dirname(full_path), exist_ok=True)
                        with open(full_path, "wb+") as f:
                            f.write(img_bytes)
                    except Exception:
                        pass
                    return HttpResponse(img_bytes, content_type=mime_type)
            except Exception as e:
                logger.error("Dynamic company logo serve failed: %s", e)

        # Fallback for missing images/logos/avatars: Return clean SVG placeholder instead of 500/404 error
        path_lower = path.lower()
        if any(ext in path_lower for ext in [".webp", ".png", ".jpg", ".jpeg", ".svg", "avatar", "logo"]):
            svg_placeholder = """<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none">
              <rect width="64" height="64" rx="32" fill="#2563EB" fill-opacity="0.1"/>
              <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="24" fill="#2563EB">B</text>
            </svg>"""
            return HttpResponse(svg_placeholder, content_type="image/svg+xml")

    try:
        return serve(request, path, document_root=document_root, **kwargs)
    except Exception as e:
        logger.warning("Upload serve failed for %s: %s", path, e)
        svg_placeholder = """<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none">
          <rect width="64" height="64" rx="32" fill="#2563EB" fill-opacity="0.1"/>
          <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="24" fill="#2563EB">B</text>
        </svg>"""
        return HttpResponse(svg_placeholder, content_type="image/svg+xml")

from django.http import JsonResponse
from django.utils import timezone

def health_check(request):
    return JsonResponse({
        "status": "healthy",
        "service": "Between AI Engine API",
        "timestamp": timezone.now().isoformat()
    }, status=200)

urlpatterns = [
    # Health checks for UptimeRobot, Render & Load Balancers
    path('health', health_check, name='root-health'),
    path('healthz', health_check, name='root-healthz'),

    # Route static/media uploads and photos
    re_path(r'^uploads/(?P<path>.*)$', custom_serve_uploads, {'document_root': os.getenv("UPLOAD_DIR", "uploads")}),
    re_path(r'^photos/(?P<path>.*)$', serve, {'document_root': os.getenv("PHOTO_DIR", "photos")}),
    
    # Route all API and authentication calls to api app
    path('', include('api.urls')),
]
