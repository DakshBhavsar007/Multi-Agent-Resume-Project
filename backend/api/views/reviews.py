"""
Reviews & Testimonials Views
─────────────────────────────
Public endpoints for reading reviews/testimonials.
Job Seekers: Can review Companies AND Between Platform (must be verified email + phone).
Developers: Can ONLY review Between Platform (must be verified developer).
Recruiters: Can ONLY review Between Platform (must be verified email/company).
"""

import json
import logging
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Avg, Count

from api.models import Review, JobSeekerAccount, Company, DeveloperAccount
from api.views.seeker_auth import require_seeker_jwt
from api.decorators import require_developer_jwt, require_company_jwt
from models.schemas import success_response, error_response

logger = logging.getLogger(__name__)


def _extract_user_identity(request):
    auth_header = request.headers.get("Authorization", "")
    token = ""
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
    else:
        token = request.GET.get("token") or request.GET.get("jwt") or ""
    if not token or token in ["undefined", "null"]:
        return None, None
    from api.decorators import JWT_SECRET, JWT_ALGORITHM
    from jose import jwt, JWTError
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("seeker_id"):
            return str(payload["seeker_id"]), "job_seeker"
        elif payload.get("company_id"):
            return str(payload["company_id"]), "recruiter"
        elif payload.get("developer_id"):
            return str(payload["developer_id"]), "developer"
    except JWTError:
        pass
    return None, None


def _serialize_review(review, current_user_id=None, current_user_type=None):
    """Serialize a Review instance including author profile info and role badges."""
    user_type = review.user_type or "job_seeker"
    author_info = {}
    is_own = False

    if user_type == "developer" and review.developer:
        dev = review.developer
        if current_user_id and current_user_type == "developer":
            is_own = str(dev.id) == str(current_user_id)
        author_info = {
            "id": str(dev.id),
            "full_name": dev.full_name,
            "headline": "Software Developer & API Builder",
            "avatar_path": "",
            "is_verified": bool(dev.is_verified),
            "user_type": "developer",
            "role_badge": "Developer",
        }
    elif user_type == "recruiter" and review.recruiter:
        rec = review.recruiter
        if current_user_id and current_user_type == "recruiter":
            is_own = str(rec.id) == str(current_user_id)
        author_info = {
            "id": str(rec.id),
            "full_name": rec.name,
            "headline": f"Recruiter @ {rec.name}",
            "avatar_path": rec.logo_path or "",
            "is_verified": bool(rec.email_verified),
            "user_type": "recruiter",
            "role_badge": "Recruiter",
        }
    else:  # job_seeker
        seeker = review.seeker
        if seeker:
            if current_user_id and current_user_type == "job_seeker":
                is_own = str(seeker.id) == str(current_user_id)
            author_info = {
                "id": str(seeker.id),
                "full_name": seeker.full_name,
                "headline": seeker.headline or "Job Seeker",
                "avatar_path": seeker.avatar_path or "",
                "is_verified": bool(seeker.email_verified and seeker.phone_verified),
                "user_type": "job_seeker",
                "role_badge": "Job Seeker",
            }
        else:
            author_info = {
                "id": "unknown",
                "full_name": "Verified Member",
                "headline": "Platform Contributor",
                "avatar_path": "",
                "is_verified": True,
                "user_type": user_type,
                "role_badge": user_type.replace("_", " ").title(),
            }

    return {
        "id": str(review.id),
        "rating": review.rating,
        "text": review.text,
        "company_id": str(review.company_id) if review.company_id else None,
        "company_name": review.company.name if review.company else None,
        "review_type": "company" if review.company_id else "platform",
        "user_type": user_type,
        "is_featured": review.is_featured,
        "created_at": review.created_at.isoformat(),
        "updated_at": review.updated_at.isoformat(),
        "is_own": is_own,
        "author": author_info,
    }


# ── Public Endpoints ─────────────────────────────────────────────────────────

@csrf_exempt
def public_list_reviews(request):
    """GET /api/v1/public/reviews — list platform & company reviews with filter support."""
    if request.method != "GET":
        return JsonResponse(error_response("Method not allowed"), status=405)

    review_type = request.GET.get("type")        # "platform" or "company"
    user_type   = request.GET.get("user_type")   # "job_seeker", "developer", "recruiter"

    qs = Review.objects.all().select_related("seeker", "developer", "recruiter", "company")

    if review_type == "platform":
        qs = qs.filter(company__isnull=True)
    elif review_type == "company":
        qs = qs.filter(company__isnull=False)

    if user_type in ["job_seeker", "developer", "recruiter"]:
        qs = qs.filter(user_type=user_type)

    reviews = qs.order_by("-is_featured", "-created_at")[:50]

    current_user_id, current_user_type = _extract_user_identity(request)
    data = [_serialize_review(r, current_user_id, current_user_type) for r in reviews]

    agg = qs.aggregate(avg_rating=Avg("rating"), total=Count("id"))

    return JsonResponse(success_response({
        "reviews": data,
        "stats": {
            "avg_rating": round(agg["avg_rating"] or 0, 1),
            "total_reviews": agg["total"] or 0,
        }
    }))


@csrf_exempt
def public_company_reviews(request, company_id):
    """GET /api/v1/public/companies/<id>/reviews — list company specific reviews."""
    if request.method != "GET":
        return JsonResponse(error_response("Method not allowed"), status=405)

    company = Company.objects.filter(id=company_id).first()
    if not company:
        return JsonResponse(error_response("Company not found"), status=404)

    reviews = (
        Review.objects
        .filter(company=company)
        .select_related("seeker", "developer", "recruiter")
        .order_by("-created_at")[:50]
    )

    current_user_id, current_user_type = _extract_user_identity(request)
    data = [_serialize_review(r, current_user_id, current_user_type) for r in reviews]

    agg = Review.objects.filter(company=company).aggregate(
        avg_rating=Avg("rating"), total=Count("id")
    )

    return JsonResponse(success_response({
        "reviews": data,
        "avg_rating": round(agg["avg_rating"] or company.rating, 1),
        "total_reviews": agg["total"] or 0,
    }))


# ── Seeker Endpoints (Companies + Platform Reviews) ─────────────────────────

@csrf_exempt
@require_seeker_jwt
def seeker_reviews_root(request):
    """POST /api/v1/seeker/reviews — create/update review as verified job seeker."""
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)

    seeker = request.seeker

    # Verification gate
    if not (seeker.email_verified and seeker.phone_verified):
        return JsonResponse(
            error_response("Only verified job seekers (email + phone verified) can write reviews."),
            status=403
        )

    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return JsonResponse(error_response("Invalid JSON body"), status=400)

    rating = body.get("rating")
    text = body.get("text", "").strip()
    company_id = body.get("company_id")

    if not rating or not isinstance(rating, int) or rating < 1 or rating > 5:
        return JsonResponse(error_response("Rating must be an integer from 1 to 5"), status=400)
    if not text or len(text) < 10:
        return JsonResponse(error_response("Review text must be at least 10 characters"), status=400)
    if len(text) > 2000:
        return JsonResponse(error_response("Review text must be under 2000 characters"), status=400)

    company = None
    if company_id:
        company = Company.objects.filter(id=company_id).first()
        if not company:
            return JsonResponse(error_response("Company not found"), status=404)

    review = Review.objects.filter(seeker=seeker, company=company).first()
    if review:
        review.rating = rating
        review.text = text
        review.save()
    else:
        review = Review.objects.create(
            seeker=seeker,
            company=company,
            user_type="job_seeker",
            rating=rating,
            text=text,
        )

    return JsonResponse(success_response(_serialize_review(review, seeker.id)), status=200 if review else 201)


# ── Developer Endpoints (Platform Reviews ONLY) ──────────────────────────────

@csrf_exempt
@require_developer_jwt
def developer_reviews_root(request):
    """POST /api/v1/developer/reviews — create/update platform review as verified developer."""
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)

    dev = request.developer

    if not dev.is_verified:
        return JsonResponse(
            error_response("Only verified developers can submit platform reviews."),
            status=403
        )

    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return JsonResponse(error_response("Invalid JSON body"), status=400)

    rating = body.get("rating")
    text = body.get("text", "").strip()
    company_id = body.get("company_id")

    if company_id:
        return JsonResponse(error_response("Developers can only submit Between platform reviews."), status=400)

    if not rating or not isinstance(rating, int) or rating < 1 or rating > 5:
        return JsonResponse(error_response("Rating must be an integer from 1 to 5"), status=400)
    if not text or len(text) < 10:
        return JsonResponse(error_response("Review text must be at least 10 characters"), status=400)

    review = Review.objects.filter(developer=dev, company__isnull=True).first()
    if review:
        review.rating = rating
        review.text = text
        review.save()
    else:
        review = Review.objects.create(
            developer=dev,
            company=None,
            user_type="developer",
            rating=rating,
            text=text,
        )

    return JsonResponse(success_response(_serialize_review(review, dev.id)), status=200 if review else 201)


# ── Recruiter Endpoints (Platform Reviews ONLY) ──────────────────────────────

@csrf_exempt
@require_company_jwt
def recruiter_reviews_root(request):
    """POST /api/v1/recruiter/reviews — create/update platform review as verified recruiter."""
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)

    recruiter = request.company

    if not recruiter.email_verified:
        return JsonResponse(
            error_response("Only verified recruiters can submit platform reviews."),
            status=403
        )

    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return JsonResponse(error_response("Invalid JSON body"), status=400)

    rating = body.get("rating")
    text = body.get("text", "").strip()
    company_id = body.get("company_id")

    if company_id:
        return JsonResponse(error_response("Recruiters can only submit Between platform reviews."), status=400)

    if not rating or not isinstance(rating, int) or rating < 1 or rating > 5:
        return JsonResponse(error_response("Rating must be an integer from 1 to 5"), status=400)
    if not text or len(text) < 10:
        return JsonResponse(error_response("Review text must be at least 10 characters"), status=400)

    review = Review.objects.filter(recruiter=recruiter, company__isnull=True).first()
    if review:
        review.rating = rating
        review.text = text
        review.save()
    else:
        review = Review.objects.create(
            recruiter=recruiter,
            company=None,
            user_type="recruiter",
            rating=rating,
            text=text,
        )

    return JsonResponse(success_response(_serialize_review(review, recruiter.id)), status=200 if review else 201)


# ── Seeker Review Detail & Public Profile ────────────────────────────────────

@csrf_exempt
@require_seeker_jwt
def seeker_review_detail(request, review_id):
    seeker = request.seeker
    review = Review.objects.filter(id=review_id).first()
    if not review:
        return JsonResponse(error_response("Review not found"), status=404)

    if str(review.seeker_id) != str(seeker.id):
        return JsonResponse(error_response("You can only modify your own reviews"), status=403)

    if request.method == "PATCH":
        try:
            body = json.loads(request.body)
        except (json.JSONDecodeError, ValueError):
            return JsonResponse(error_response("Invalid JSON body"), status=400)

        if "rating" in body:
            r = body["rating"]
            if isinstance(r, int) and 1 <= r <= 5:
                review.rating = r
        if "text" in body:
            t = body["text"].strip()
            if len(t) >= 10:
                review.text = t
        review.save()
        return JsonResponse(success_response(_serialize_review(review, seeker.id)))

    elif request.method == "DELETE":
        review.delete()
        return JsonResponse(success_response({"message": "Review deleted"}))

    return JsonResponse(error_response("Method not allowed"), status=405)


@csrf_exempt
@require_seeker_jwt
def seeker_my_reviews(request):
    seeker = request.seeker
    reviews = Review.objects.filter(seeker=seeker).select_related("company").order_by("-created_at")
    data = [_serialize_review(r, seeker.id) for r in reviews]
    return JsonResponse(success_response(data))


@csrf_exempt
def public_seeker_profile(request, seeker_id):
    if request.method != "GET":
        return JsonResponse(error_response("Method not allowed"), status=405)

    seeker = JobSeekerAccount.objects.filter(id=seeker_id).first()
    if not seeker:
        return JsonResponse(error_response("Seeker profile not found"), status=404)

    is_verified = bool(seeker.email_verified and seeker.phone_verified)
    user_reviews = Review.objects.filter(seeker=seeker).select_related("company").order_by("-created_at")

    current_user_id, current_user_type = _extract_user_identity(request)
    reviews_data = [_serialize_review(r, current_user_id, current_user_type) for r in user_reviews]

    profile_data = {
        "id": str(seeker.id),
        "full_name": seeker.full_name,
        "headline": seeker.headline or "Job Seeker",
        "avatar_path": seeker.avatar_path or "",
        "location": seeker.location or "",
        "is_verified": is_verified,
        "email_verified": seeker.email_verified,
        "phone_verified": seeker.phone_verified,
        "skills": seeker.skills or [],
        "reviews": reviews_data,
        "total_reviews": len(reviews_data),
        "joined_date": seeker.created_at.strftime("%B %Y"),
    }

    return JsonResponse(success_response(profile_data))


# ── Developer & Recruiter Review Detail (PATCH / DELETE) ─────────────────────

@csrf_exempt
@require_developer_jwt
def developer_review_detail(request, review_id):
    dev = request.developer
    review = Review.objects.filter(id=review_id).first()
    if not review:
        return JsonResponse(error_response("Review not found"), status=404)

    if str(review.developer_id) != str(dev.id):
        return JsonResponse(error_response("You can only modify your own reviews"), status=403)

    if request.method == "PATCH":
        try:
            body = json.loads(request.body)
        except (json.JSONDecodeError, ValueError):
            return JsonResponse(error_response("Invalid JSON body"), status=400)

        if "rating" in body:
            r = body["rating"]
            if isinstance(r, int) and 1 <= r <= 5:
                review.rating = r
        if "text" in body:
            t = body["text"].strip()
            if len(t) >= 10:
                review.text = t
        review.save()
        return JsonResponse(success_response(_serialize_review(review, dev.id, "developer")))

    elif request.method == "DELETE":
        review.delete()
        return JsonResponse(success_response({"message": "Review deleted"}))

    return JsonResponse(error_response("Method not allowed"), status=405)


@csrf_exempt
@require_company_jwt
def recruiter_review_detail(request, review_id):
    recruiter = request.company
    review = Review.objects.filter(id=review_id).first()
    if not review:
        return JsonResponse(error_response("Review not found"), status=404)

    if str(review.recruiter_id) != str(recruiter.id):
        return JsonResponse(error_response("You can only modify your own reviews"), status=403)

    if request.method == "PATCH":
        try:
            body = json.loads(request.body)
        except (json.JSONDecodeError, ValueError):
            return JsonResponse(error_response("Invalid JSON body"), status=400)

        if "rating" in body:
            r = body["rating"]
            if isinstance(r, int) and 1 <= r <= 5:
                review.rating = r
        if "text" in body:
            t = body["text"].strip()
            if len(t) >= 10:
                review.text = t
        review.save()
        return JsonResponse(success_response(_serialize_review(review, recruiter.id, "recruiter")))

    elif request.method == "DELETE":
        review.delete()
        return JsonResponse(success_response({"message": "Review deleted"}))

    return JsonResponse(error_response("Method not allowed"), status=405)

