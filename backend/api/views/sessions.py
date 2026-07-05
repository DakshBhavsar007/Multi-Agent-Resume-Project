import json
from datetime import datetime
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Count
from django.utils import timezone
from asgiref.sync import async_to_sync

from api.models import Company, Session, Candidate, IngestJob
from api.decorators import require_api_key, check_rate_limit
from models.schemas import success_response, error_response
from agents.inference_agent import SkillInferenceAgent
from workers.celery_worker import match_all_candidates
from api.services.notification_service import notify_followers_of_new_job

def validate_announcement_dates(rounds):
    now_naive = datetime.now()
    for r in rounds:
        ann_date_str = r.get("result_announcement_date")
        if ann_date_str:
            try:
                clean_str = ann_date_str.split('+')[0]
                if clean_str.endswith('Z'):
                    clean_str = clean_str[:-1]
                
                dt = datetime.fromisoformat(clean_str)
                if dt.tzinfo is not None:
                    if dt < timezone.now():
                        return f"Result announcement date {ann_date_str} for round '{r.get('name')}' cannot be in the past"
                else:
                    if dt < now_naive:
                        return f"Result announcement date {ann_date_str} for round '{r.get('name')}' cannot be in the past"
            except ValueError:
                return f"Invalid date format for round '{r.get('name')}': {ann_date_str}"
    return None

def _verify_session_ownership(session, company):
    if str(session.company_id) != str(company.id):
        raise PermissionError("Access denied")

@csrf_exempt
@require_api_key
def session_root(request):
    """Handles GET /api/v1/sessions/ (list) and POST /api/v1/sessions/ (create)"""
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            name = data.get("name")
            job_title = data.get("job_title")
            job_description = data.get("job_description")
            if not name or not job_title or not job_description:
                return JsonResponse(error_response("name, job_title, job_description are required"), status=400)

            rounds_req = data.get("rounds") or []
            validation_err = validate_announcement_dates(rounds_req)
            if validation_err:
                return JsonResponse(error_response(validation_err), status=400)
            rounds_data = []
            for r in rounds_req:
                ann_date = r.get("result_announcement_date")
                rounds_data.append({
                    "name": r.get("name"),
                    "interviewer": r.get("interviewer"),
                    "order": r.get("order"),
                    "result_announcement_date": ann_date if ann_date else None
                })

            status_val = "analysis" if job_title == "Smart Analyzer Session" else "active"
            if status_val == "active":
                active_count = Session.objects.filter(company=request.company, status="active").count()
                company_tier = (request.company.tier or "free").lower()
                if company_tier == "free" and active_count >= 1:
                    return JsonResponse(error_response("Starter (Free) plan is limited to 1 active session. Please upgrade your plan for more active sessions."), status=403)
                elif company_tier == "business" and active_count >= 5:
                    return JsonResponse(error_response("Business plan is limited to 5 active sessions. Please upgrade to Enterprise plan for unlimited sessions."), status=403)

            new_session = Session.objects.create(
                company=request.company,
                name=name,
                job_title=job_title,
                job_description=job_description,
                rounds=rounds_data,
                status=status_val
            )

            if new_session.status == "active":
                notify_followers_of_new_job(new_session)

            return JsonResponse(success_response({
                "id": str(new_session.id),
                "name": new_session.name,
                "job_title": new_session.job_title,
                "job_description": new_session.job_description,
                "rounds": new_session.rounds,
                "status": new_session.status,
                "created_at": new_session.created_at.isoformat() if new_session.created_at else None
            }))
        except Exception as e:
            return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)

    elif request.method == "GET":
        try:
            status = request.GET.get("status")
            page = int(request.GET.get("page", 1))
            per_page = int(request.GET.get("per_page", 20))

            qs = Session.objects.filter(company_id=request.company.id)
            if status:
                qs = qs.filter(status=status)
            else:
                qs = qs.exclude(status="analysis")

            qs = qs.order_by("-created_at")
            
            # Pagination
            offset = (page - 1) * per_page
            sessions = qs[offset:offset+per_page]

            # Optimize candidate count N+1 query:
            session_ids = [s.id for s in sessions]
            candidate_counts_qs = Candidate.objects.filter(session_id__in=session_ids) \
                                                   .values('session_id', 'status') \
                                                   .annotate(count=Count('id'))
            
            # Group by session ID in Python
            counts_by_session = {}
            for item in candidate_counts_qs:
                sid = str(item['session_id'])
                c_status = item['status']
                c_count = item['count']
                counts_by_session.setdefault(sid, {})[c_status] = c_count

            result = []
            for s in sessions:
                sid_str = str(s.id)
                status_counts = counts_by_session.get(sid_str, {})

                result.append({
                    "id": sid_str,
                    "name": s.name,
                    "job_title": s.job_title,
                    "status": s.status,
                    "rounds": s.rounds,
                    "candidate_counts": status_counts,
                    "total_candidates": sum(status_counts.values()),
                    "hired": status_counts.get("hired", 0),
                    "rejected": status_counts.get("rejected", 0),
                    "created_at": s.created_at.isoformat() if s.created_at else None,
                    "updated_at": s.updated_at.isoformat() if s.updated_at else None
                })

            return JsonResponse(success_response(result))
        except Exception as e:
            return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)
    else:
        return JsonResponse(error_response("Method not allowed"), status=405)

@csrf_exempt
@require_api_key
def session_detail(request, session_id):
    """Handles GET, PATCH, DELETE /api/v1/sessions/{session_id}"""
    try:
        session = Session.objects.filter(id=session_id).first()
        if not session:
            return JsonResponse(error_response("Session not found"), status=404)

        try:
            _verify_session_ownership(session, request.company)
        except PermissionError:
            return JsonResponse(error_response("Access denied"), status=403)

        if request.method == "GET":
            # Count candidates per round (excluding hired/rejected)
            round_counts_qs = Candidate.objects.filter(
                session_id=session.id
            ).exclude(
                status__in=["hired", "rejected"]
            ).values('current_round_index').annotate(count=Count('id'))
            round_counts = {str(item['current_round_index']): item['count'] for item in round_counts_qs}

            # Merge legacy round_index=0 into the first round
            if "0" in round_counts and session.rounds:
                first_order = str(session.rounds[0].get("order", 1))
                round_counts[first_order] = round_counts.get(first_order, 0) + round_counts.pop("0")

            total_hired = Candidate.objects.filter(session_id=session.id, status="hired").count()
            total_rejected = Candidate.objects.filter(session_id=session.id, status="rejected").count()

            # Dynamic sync dates from completed IngestJobs
            from api.models import IngestJob
            latest_gmail = IngestJob.objects.filter(session_id=session.id, type="gmail", status="done").order_by("-completed_at").first()
            latest_gdrive = IngestJob.objects.filter(session_id=session.id, type="gdrive", status="done").order_by("-completed_at").first()
            latest_gform = IngestJob.objects.filter(session_id=session.id, type="form", status="done").order_by("-completed_at").first()

            return JsonResponse(success_response({
                "id": str(session.id),
                "name": session.name,
                "job_title": session.job_title,
                "job_description": session.job_description,
                "rounds": session.rounds,
                "criteria": session.criteria,
                "inferred_skills": session.inferred_skills,
                "status": session.status,
                "current_round": session.current_round_index,
                "candidate_counts_per_round": round_counts,
                "total_hired": total_hired,
                "total_rejected": total_rejected,
                "gmail_address": session.gmail_address,
                "last_gmail_sync": latest_gmail.completed_at.isoformat() if (latest_gmail and latest_gmail.completed_at) else None,
                "last_gdrive_sync": latest_gdrive.completed_at.isoformat() if (latest_gdrive and latest_gdrive.completed_at) else None,
                "last_gform_sync": latest_gform.completed_at.isoformat() if (latest_gform and latest_gform.completed_at) else None,
                "created_at": session.created_at.isoformat() if session.created_at else None,
                "updated_at": session.updated_at.isoformat() if session.updated_at else None
            }))

        elif request.method == "PATCH":
            data = json.loads(request.body)
            was_active = (session.status == "active")
            if "name" in data and data["name"] is not None:
                session.name = data["name"]
            if "job_title" in data and data["job_title"] is not None:
                session.job_title = data["job_title"]
            if "job_description" in data and data["job_description"] is not None:
                session.job_description = data["job_description"]
            if "rounds" in data and data["rounds"] is not None:
                validation_err = validate_announcement_dates(data["rounds"])
                if validation_err:
                    return JsonResponse(error_response(validation_err), status=400)
                rounds_data = []
                for r in data["rounds"]:
                    ann_date = r.get("result_announcement_date")
                    rounds_data.append({
                        "name": r.get("name"),
                        "interviewer": r.get("interviewer"),
                        "order": r.get("order"),
                        "result_announcement_date": ann_date if ann_date else None
                    })
                session.rounds = rounds_data

                # Synchronize SessionRound database table to match updated rounds
                from api.models import SessionRound, ApplicantRoundAttempt
                import secrets
                from django.utils import timezone
                from datetime import timedelta

                # Delete existing rounds
                SessionRound.objects.filter(session=session).delete()

                # Recreate rounds matching the updated JSONField payload
                created_rounds = []
                for idx, r in enumerate(rounds_data):
                    name = r.get("name")
                    name_lower = name.lower()
                    
                    rtype = "interview"
                    if "aptitude" in name_lower or "mcq" in name_lower:
                        rtype = "mcq"
                    elif "coding" in name_lower or "technical" in name_lower or "programming" in name_lower:
                        rtype = "coding"
                    
                    time_limit = 20 if rtype == "mcq" else (45 if rtype == "coding" else 25)
                    coding_problems = []
                    if rtype == "coding":
                        coding_problems = [
                            { "slug": "two-sum", "difficulty": "easy" },
                            { "slug": "valid-parentheses", "difficulty": "easy" }
                        ]
                    
                    round_num = int(r.get("order")) if r.get("order") is not None else (idx + 1)
                    
                    sr = SessionRound.objects.create(
                        session=session,
                        round_type=rtype,
                        round_number=round_num,
                        name=name,
                        time_limit_minutes=time_limit,
                        mcq_question_count=20 if rtype == "mcq" else 0,
                        coding_problems=coding_problems,
                        passing_score=r.get("passing_score", 50) if r.get("passing_score") is not None else 50
                    )
                    created_rounds.append(sr)
                
                # Regenerate attempts for existing candidates of this session
                candidates = Candidate.objects.filter(session=session, deleted_at__isnull=True)
                for candidate in candidates:
                    for sr in created_rounds:
                        token = secrets.token_urlsafe(32)
                        ApplicantRoundAttempt.objects.get_or_create(
                            candidate=candidate,
                            round=sr,
                            defaults={
                                "access_token": token,
                                "token_expires_at": timezone.now() + timedelta(days=7),
                                "status": "pending"
                            }
                        )
            if "status" in data and data["status"] is not None:
                if data["status"] == "active" and session.status != "active":
                    active_count = Session.objects.filter(company=request.company, status="active").count()
                    company_tier = (request.company.tier or "free").lower()
                    if company_tier == "free" and active_count >= 1:
                        return JsonResponse(error_response("Starter (Free) plan is limited to 1 active session. Please upgrade your plan to activate more sessions."), status=403)
                    elif company_tier == "business" and active_count >= 5:
                        return JsonResponse(error_response("Business plan is limited to 5 active sessions. Please upgrade to Enterprise plan to activate more sessions."), status=403)
                session.status = data["status"]

            session.updated_at = timezone.now()
            session.save()

            if session.status == "active" and not was_active:
                notify_followers_of_new_job(session)

            return JsonResponse(success_response({
                "message": "Session updated",
                "id": str(session.id),
                "name": session.name,
                "updated_at": session.updated_at.isoformat()
            }))

        elif request.method == "DELETE":
            # Check delete_candidates or hard_delete flag
            data = {}
            if request.body:
                try:
                    data = json.loads(request.body)
                except ValueError:
                    pass

            hard_delete = data.get("hard_delete", False) or request.GET.get("hard", "false").lower() == "true" or request.GET.get("hard_delete", "false").lower() == "true"
            delete_candidates = data.get("delete_candidates", False)

            if hard_delete:
                session.delete()
                return JsonResponse(success_response({"message": "Session deleted"}))

            if delete_candidates:
                Candidate.objects.filter(session_id=session.id).delete()

            session.status = "archived"
            session.save(update_fields=['status'])

            return JsonResponse(success_response({"message": "Session archived"}))

        else:
            return JsonResponse(error_response("Method not allowed"), status=405)
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)

@csrf_exempt
@require_api_key
def set_criteria(request, session_id):
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        session = Session.objects.filter(id=session_id).first()
        if not session:
            return JsonResponse(error_response("Session not found"), status=404)

        try:
            _verify_session_ownership(session, request.company)
        except PermissionError:
            return JsonResponse(error_response("Access denied"), status=403)

        data = json.loads(request.body)
        weights = data.get("weights", {"skills": 0.5, "experience": 0.3, "location": 0.2})
        if weights:
            total = sum(weights.values())
            if not 0.98 <= total <= 1.02:
                return JsonResponse(error_response(f"Weights must sum to 1.0, got {total:.2f}"), status=400)

        criteria = {
            "required_skills": data.get("required_skills", []),
            "nice_to_have": data.get("nice_to_have", []),
            "preferred_locations": data.get("preferred_locations", []),
            "min_experience": data.get("min_experience", 0),
            "min_match_score": data.get("min_match_score", 0),
            "weights": weights,
            "salary_min": data.get("salary_min"),
            "salary_max": data.get("salary_max"),
            "salary_currency": data.get("salary_currency", "USD"),
        }
        session.criteria = criteria
        session.updated_at = timezone.now()
        session.save()

        candidate_count = Candidate.objects.filter(session_id=session.id).count()
        if candidate_count > 0:
            job = IngestJob.objects.create(
                session=session,
                type="match_all",
                status="pending",
                total_files=candidate_count
            )

            match_all_candidates.delay(str(session.id), str(job.id))

            return JsonResponse(success_response({
                "updated": True,
                "criteria": criteria,
                "rematching": True,
                "job_id": str(job.id)
            }))

        return JsonResponse(success_response({"updated": True, "criteria": criteria}))
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)

@csrf_exempt
@require_api_key
def infer_skills(request, session_id):
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        session = Session.objects.filter(id=session_id).first()
        if not session:
            return JsonResponse(error_response("Session not found"), status=404)

        try:
            _verify_session_ownership(session, request.company)
        except PermissionError:
            return JsonResponse(error_response("Access denied"), status=403)

        data = json.loads(request.body)
        job_description = data.get("job_description")
        if not job_description:
            return JsonResponse(error_response("job_description is required"), status=400)

        agent = SkillInferenceAgent()
        # Call the async agent function in a synchronous context using async_to_sync
        result = async_to_sync(agent.infer_from_jd)(job_description)

        session.inferred_skills = result
        session.updated_at = timezone.now()
        session.save()

        return JsonResponse(success_response(result))
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)

@csrf_exempt
@require_api_key
@check_rate_limit("match")
def trigger_match_all(request, session_id):
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        session = Session.objects.filter(id=session_id).first()
        if not session:
            return JsonResponse(error_response("Session not found"), status=404)

        try:
            _verify_session_ownership(session, request.company)
        except PermissionError:
            return JsonResponse(error_response("Access denied"), status=403)

        job = IngestJob.objects.create(
            session=session,
            type="match_all",
            status="pending"
        )

        match_all_candidates.delay(str(session.id), str(job.id))

        return JsonResponse(success_response({"job_id": str(job.id), "status": "pending"}))
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)


@csrf_exempt
@require_api_key
def generate_jd(request):
    """POST /api/v1/sessions/generate-jd"""
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        data = json.loads(request.body)
        job_title = data.get("job_title")
        skills = data.get("skills", [])
        experience_years = data.get("experience_years", 3)
        company_name = request.company.name if request.company else "Our Company"
        
        if not job_title:
            return JsonResponse(error_response("job_title is required"), status=400)
            
        from agents.jd_generator_agent import JobDescriptionGeneratorAgent
        agent = JobDescriptionGeneratorAgent()
        jd_text = agent.generate_jd(job_title, skills, experience_years, company_name)
        
        return JsonResponse(success_response({"job_description": jd_text}))
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)

