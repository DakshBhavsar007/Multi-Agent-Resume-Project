"""
Reviews & Testimonials Views
─────────────────────────────
Public endpoints for reading reviews/testimonials.
Seeker-authenticated endpoints for CRUD on own reviews.
Only verified seekers (email+phone) can create reviews.
"""

import json
import logging
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Avg, Count

from api.models import Review, JobSeekerAccount, Company
from api.views.seeker_auth import require_seeker_jwt
from models.schemas import success_response, error_response

logger = logging.getLogger(__name__)


def _serialize_review(review, current_seeker_id=None):
    """Serialize a Review instance including author profile info."""
    seeker = review.seeker
    is_verified = bool(seeker.email_verified and seeker.phone_verified)
    return {
        "id": str(review.id),
        "rating": review.rating,
        "text": review.text,
        "company_id": str(review.company_id) if review.company_id else None,
        "company_name": review.company.name if review.company else None,
        "is_featured": review.is_featured,
        "created_at": review.created_at.isoformat(),
        "updated_at": review.updated_at.isoformat(),
        "is_own": str(seeker.id) == str(current_seeker_id) if current_seeker_id else False,
        "author": {
            "id": str(seeker.id),
            "full_name": seeker.full_name,
            "headline": seeker.headline or "",
            "avatar_path": seeker.avatar_path or "",
            "is_verified": is_verified,
        },
    }


# ── Public Endpoints ─────────────────────────────────────────────────────────

@csrf_exempt
def public_list_reviews(request):
    """GET /api/v1/public/reviews — list platform & company reviews."""
    if request.method != "GET":
        return JsonResponse(error_response("Method not allowed"), status=405)

    reviews = (
        Review.objects
        .all()
        .select_related("seeker", "company")
        .order_by("-is_featured", "-created_at")[:30]
    )

    current_seeker_id = _extract_seeker_id(request)
    data = [_serialize_review(r, current_seeker_id) for r in reviews]

    agg = Review.objects.aggregate(
        avg_rating=Avg("rating"), total=Count("id")
    )

    return JsonResponse(success_response({
        "reviews": data,
        "stats": {
            "avg_rating": round(agg["avg_rating"] or 0, 1),
            "total_reviews": agg["total"] or 0,
        }
    }))


@csrf_exempt
def public_company_reviews(request, company_id):
    """GET /api/v1/public/companies/<id>/reviews — list company reviews."""
    if request.method != "GET":
        return JsonResponse(error_response("Method not allowed"), status=405)

    company = Company.objects.filter(id=company_id).first()
    if not company:
        return JsonResponse(error_response("Company not found"), status=404)

    reviews = (
        Review.objects
        .filter(company=company)
        .select_related("seeker")
        .order_by("-created_at")[:50]
    )

    current_seeker_id = _extract_seeker_id(request)
    data = [_serialize_review(r, current_seeker_id) for r in reviews]

    agg = Review.objects.filter(company=company).aggregate(
        avg_rating=Avg("rating"), total=Count("id")
    )

    return JsonResponse(success_response({
        "reviews": data,
        "avg_rating": round(agg["avg_rating"] or company.rating, 1),
        "total_reviews": agg["total"] or 0,
    }))


# ── Seeker Endpoints ──────────────────────────────────────────────────────────

@csrf_exempt
@require_seeker_jwt
def seeker_reviews_root(request):
    """POST /api/v1/seeker/reviews — create a review."""
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)

    seeker = request.seeker

    # Verification gate: only verified seekers can write reviews
    if not (seeker.email_verified and seeker.phone_verified):
        return JsonResponse(
            error_response("You must verify both email and phone to write reviews. Complete verification in your profile settings."),
            status=403
        )

    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return JsonResponse(error_response("Invalid JSON body"), status=400)

    rating = body.get("rating")
    text = body.get("text", "").strip()
    company_id = body.get("company_id")  # null for platform review

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

    # Check uniqueness or update existing
    review = Review.objects.filter(seeker=seeker, company=company).first()
    if review:
        review.rating = rating
        review.text = text
        review.save()
    else:
        review = Review.objects.create(
            seeker=seeker,
            company=company,
            rating=rating,
            text=text,
        )

    return JsonResponse(success_response(_serialize_review(review, seeker.id)), status=200 if review else 201)


@csrf_exempt
@require_seeker_jwt
def seeker_review_detail(request, review_id):
    """
    PATCH /api/v1/seeker/reviews/<id> — edit own review.
    DELETE /api/v1/seeker/reviews/<id> — delete own review.
    """
    seeker = request.seeker
    review = Review.objects.filter(id=review_id).select_related("seeker", "company").first()
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
            if not isinstance(r, int) or r < 1 or r > 5:
                return JsonResponse(error_response("Rating must be an integer from 1 to 5"), status=400)
            review.rating = r

        if "text" in body:
            t = body["text"].strip()
            if len(t) < 10:
                return JsonResponse(error_response("Review text must be at least 10 characters"), status=400)
            if len(t) > 2000:
                return JsonResponse(error_response("Review text must be under 2000 characters"), status=400)
            review.text = t

        review.save()
        return JsonResponse(success_response(_serialize_review(review, seeker.id)))

    elif request.method == "DELETE":
        review.delete()
        return JsonResponse(success_response({"deleted": True}))

    return JsonResponse(error_response("Method not allowed"), status=405)


@csrf_exempt
@require_seeker_jwt
def seeker_my_reviews(request):
    """GET /api/v1/seeker/reviews/mine — get current seeker's own reviews."""
    if request.method != "GET":
        return JsonResponse(error_response("Method not allowed"), status=405)

    reviews = (
        Review.objects
        .filter(seeker=request.seeker)
        .select_related("seeker", "company")
        .order_by("-created_at")
    )

    data = [_serialize_review(r, request.seeker.id) for r in reviews]
    return JsonResponse(success_response({"reviews": data}))


# ── Public Seeker Profile ─────────────────────────────────────────────────────

@csrf_exempt
def public_seeker_profile(request, seeker_id):
    """GET /api/v1/public/seekers/<id>/profile — limited public profile for review author links."""
    if request.method != "GET":
        return JsonResponse(error_response("Method not allowed"), status=405)

    seeker = JobSeekerAccount.objects.filter(id=seeker_id, is_active=True).first()
    if not seeker:
        return JsonResponse(error_response("Profile not found"), status=404)

    is_verified = bool(seeker.email_verified and seeker.phone_verified)

    # Get their reviews
    reviews = (
        Review.objects
        .filter(seeker=seeker)
        .select_related("company")
        .order_by("-created_at")[:10]
    )

    reviews_data = []
    for r in reviews:
        reviews_data.append({
            "id": str(r.id),
            "rating": r.rating,
            "text": r.text,
            "company_id": str(r.company_id) if r.company_id else None,
            "company_name": r.company.name if r.company else "Platform Review",
            "created_at": r.created_at.isoformat(),
        })

    return JsonResponse(success_response({
        "id": str(seeker.id),
        "full_name": seeker.full_name,
        "headline": seeker.headline or "",
        "avatar_path": seeker.avatar_path or "",
        "location": seeker.location or "",
        "skills": (seeker.skills or [])[:15],
        "is_verified": is_verified,
        "created_at": seeker.created_at.isoformat(),
        "reviews": reviews_data,
    }))


# ── Helper ────────────────────────────────────────────────────────────────────

def _extract_seeker_id(request):
    """Try to extract seeker ID from JWT without enforcing auth."""
    from jose import jwt, JWTError
    from api.decorators import JWT_SECRET, JWT_ALGORITHM
    auth_header = request.META.get("HTTP_AUTHORIZATION", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload.get("seeker_id")
    except (JWTError, Exception):
        return None
