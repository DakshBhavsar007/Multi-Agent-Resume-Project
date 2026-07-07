import json
import os
import uuid
import secrets
import logging
import subprocess
import tempfile
from datetime import timedelta
from functools import wraps

from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from api.models import (
    Session, SessionRound, Candidate, MCQQuestion, CodingProblem,
    ApplicantRoundAttempt, RoundType, JobApplication, SeekerMockAttempt
)
from api.decorators import require_api_key
from models.schemas import success_response, error_response
from agents.round_recommendation_agent import RoundRecommendationAgent
from agents.interview_agent import InterviewAgent
from openai import OpenAI

logger = logging.getLogger(__name__)

PROBLEM_CALL_MAPPING = {
    "two-sum": {
        "python": "two_sum(inp['nums'], inp['target'])",
        "javascript": "twoSum(inp.nums, inp.target)"
    },
    "valid-parentheses": {
        "python": "is_valid(inp['s'])",
        "javascript": "isValid(inp.s)"
    }
}


def require_test_token(view_func):
    @wraps(view_func)
    def _wrapped(request, *args, **kwargs):
        token = request.GET.get("token", "") or request.POST.get("token", "")
        
        if not token:
            auth_header = request.headers.get("Authorization", "")
            if auth_header and auth_header.startswith("Bearer "):
                token = auth_header.split(" ", 1)[1]

        if not token:
            try:
                body_data = json.loads(request.body)
                token = body_data.get("token", "")
            except Exception:
                pass

        if not token:
            return JsonResponse(error_response("Missing test access token"), status=401)

        attempt = ApplicantRoundAttempt.objects.filter(access_token=token).first()
        if not attempt:
            return JsonResponse(error_response("Invalid access token"), status=401)

        if attempt.token_expires_at < timezone.now():
            return JsonResponse(error_response("Test access token has expired"), status=401)

        request.attempt = attempt
        request.candidate = attempt.candidate
        request.round = attempt.round
        return view_func(request, *args, **kwargs)
    return _wrapped


# ─── COMPANY SIDE ENDPOINTS ───────────────────────────────────────────────────

@csrf_exempt
@require_api_key
def recommend_rounds(request, session_id):
    """
    POST /api/v1/sessions/<session_id>/recommend-rounds
    Job title + description from session used to generate AI round recommendations.
    """
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)

    if session_id == "new":
        try:
            data = json.loads(request.body)
            job_title = data.get("job_title", "")
            job_description = data.get("job_description", "")
        except Exception as e:
            return JsonResponse(error_response("Invalid JSON"), status=400)
        
        agent = RoundRecommendationAgent()
        recommendation = agent.recommend(job_title, job_description)
        return JsonResponse(success_response(recommendation))

    session = Session.objects.filter(id=session_id).first()
    if not session:
        return JsonResponse(error_response("Session not found"), status=404)

    # Verify ownership
    if str(session.company_id) != str(request.company.id):
        return JsonResponse(error_response("Permission denied"), status=403)

    agent = RoundRecommendationAgent()
    recommendation = agent.recommend(session.job_title, session.job_description)
    return JsonResponse(success_response(recommendation))


def generate_coding_problems_for_job(job_title, job_description):
    from agents.llm import RotateLLMClient
    from api.models import CodingProblem
    import json
    import logging
    logger = logging.getLogger(__name__)

    llm = RotateLLMClient()
    prompt = f"""
You are an expert software engineering interviewer. Generate exactly 2 programming challenges (one Easy, one Medium) tailored to the following role:
Job Title: {job_title}
Job Description: {job_description}

Provide complete programming questions that can be evaluated automatically.
For each problem, you MUST include:
1. Title
2. Slug (kebab-case, e.g. "reverse-string")
3. Difficulty ('easy' or 'medium')
4. Description (markdown explanation of the problem, input/output specifications)
5. Starter code in both Python and JavaScript. Python function names must be snake_case, JS must be camelCase.
6. At least 3 test cases for automatic evaluation.
   - Each test case must have 'input' (a dictionary of input arguments) and 'expected_output' (the expected return value).
   - Keep input arguments simple (e.g. strings, integers, arrays of integers/strings) so the execution runner can parse and run them easily.
   - Avoid complex custom objects or inputs.
7. Constraints (list of strings)
8. Examples (list of dicts with 'input' and 'output' strings)

Return ONLY valid JSON in this format:
{{
  "problems": [
    {{
      "title": "Reverse String",
      "slug": "reverse-string",
      "difficulty": "easy",
      "description": "Write a function that reverses a string...",
      "examples": [
        {{"input": "s = 'hello'", "output": "'olleh'"}}
      ],
      "constraints": [
        "1 <= s.length <= 100"
      ],
      "starter_code": {{
        "python": "def reverse_string(s):\n    pass",
        "javascript": "function reverseString(s) {{\n}}"
      }},
      "test_cases": [
        {{"input": {{"s": "hello"}}, "expected_output": "olleh"}}
      ],
      "tags": ["string"]
    }}
  ]
}}
"""
    try:
        response = llm.chat.completions.create(
            model="gemini-2.5-flash",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            response_format={"type": "json_object"},
            timeout=20
        )
        raw = response.choices[0].message.content.strip()
        data = json.loads(raw)
        
        problems_to_save = []
        for p in data.get("problems", []):
            slug = p.get("slug") or p.get("title").lower().replace(" ", "-")
            problem, created = CodingProblem.objects.get_or_create(
                slug=slug,
                defaults={
                    "title": p["title"],
                    "difficulty": p["difficulty"],
                    "description": p["description"],
                    "examples": p["examples"],
                    "constraints": p["constraints"],
                    "starter_code": p["starter_code"],
                    "test_cases": p["test_cases"],
                    "tags": p.get("tags", [])
                }
            )
            problems_to_save.append({"slug": problem.slug, "difficulty": problem.difficulty})
        return problems_to_save
    except Exception as e:
        logger.error("generate_coding_problems_for_job failed: %s", e)
        return None


def auto_progress_candidate(candidate, session, round_score):
    """
    Automatically updates candidate round progress based on score.
    Passing threshold is read from SessionRound, defaulting to 50%.
    """
    from api.models import SessionRound, ApplicantRoundAttempt
    from django.utils import timezone
    from datetime import timedelta
    import secrets
    import logging
    logger = logging.getLogger(__name__)

    rounds = session.rounds or []
    max_round = len(rounds) if rounds else 1
    
    current_sr = SessionRound.objects.filter(session=session, round_number=candidate.current_round_index).first()
    passing_threshold = current_sr.passing_score if current_sr else 50
    
    if round_score >= passing_threshold:
        if candidate.current_round_index < max_round:
            candidate.current_round_index += 1
            candidate.status = "forwarded"
            candidate.save(update_fields=['current_round_index', 'status'])
            
            # Pre-generate next round attempt proactively
            next_sr = SessionRound.objects.filter(session=session, round_number=candidate.current_round_index).first()
            if next_sr:
                token = secrets.token_urlsafe(32)
                ApplicantRoundAttempt.objects.get_or_create(
                    candidate=candidate,
                    round=next_sr,
                    defaults={
                        "access_token": token,
                        "token_expires_at": timezone.now() + timedelta(days=7),
                        "status": "pending"
                    }
                )
        else:
            candidate.status = "forwarded"
            candidate.save(update_fields=['status'])
    else:
        candidate.status = "rejected"
        candidate.save(update_fields=['status'])


@csrf_exempt
@require_api_key
def create_session_rounds(request, session_id):
    """
    POST /api/v1/sessions/<session_id>/rounds
    Saves rounds configured by company and generates test attempt tokens.
    """
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)

    session = Session.objects.filter(id=session_id).first()
    if not session:
        return JsonResponse(error_response("Session not found"), status=404)

    if str(session.company_id) != str(request.company.id):
        return JsonResponse(error_response("Permission denied"), status=403)

    try:
        data = json.loads(request.body)
        rounds_list = data.get("rounds", [])
    except Exception as e:
        return JsonResponse(error_response(f"Invalid JSON: {str(e)}"), status=400)

    # Clear old rounds and attempts for this session to rebuild config
    # To be safe, we mark is_active=False or delete. Since it is a session setup phase:
    SessionRound.objects.filter(session=session).delete()

    created_rounds = []
    for idx, r in enumerate(rounds_list):
        round_type = r.get("round_type")
        name = r.get("name", f"Round {idx+1}")
        time_limit = int(r.get("time_limit_minutes", 30))

        custom_question_ids = r.get("custom_question_ids", [])
        if custom_question_ids and round_type == 'mcq':
            from api.models import MCQQuestion
            for qid in custom_question_ids:
                mq = MCQQuestion.objects.filter(id=qid).first()
                if mq:
                    if not isinstance(mq.tags, list):
                        mq.tags = []
                    if session_id not in mq.tags:
                        mq.tags.append(session_id)
                        mq.save(update_fields=['tags'])

        custom_slugs = r.get("custom_slugs", [])
        if custom_slugs and round_type == 'coding':
            from api.models import CodingProblem
            for slug in custom_slugs:
                cp = CodingProblem.objects.filter(slug=slug).first()
                if cp:
                    if not isinstance(cp.tags, list):
                        cp.tags = []
                    if session_id not in cp.tags:
                        cp.tags.append(session_id)
                        cp.save(update_fields=['tags'])

        coding_problems = r.get("coding_problems", []) if round_type == 'coding' else []
        if round_type == 'coding':
            if custom_slugs:
                coding_problems = [{"slug": slug, "difficulty": "medium"} for slug in custom_slugs]
            elif not coding_problems or len(coding_problems) <= 2:
                try:
                    custom_probs = generate_coding_problems_for_job(session.job_title, session.job_description)
                    if custom_probs:
                        coding_problems = custom_probs
                except Exception as e:
                    logger.error("Failed to generate custom coding problems: %s", e)

        # Fallback to empty list if coding_problems is None to satisfy SQLite NOT NULL constraint
        if coding_problems is None:
            coding_problems = []

        round_num = int(r.get("order")) if r.get("order") is not None else (idx + 1)

        sr = SessionRound.objects.create(
            session=session,
            round_type=round_type,
            round_number=round_num,
            name=name,
            time_limit_minutes=time_limit,
            mcq_question_count=int(r.get("mcq_question_count", 30)) if round_type == 'mcq' else 0,
            coding_problems=coding_problems,
            interview_questions=r.get("interview_questions", []) if round_type == 'interview' else [],
            passing_score=int(r.get("passing_score", 50))
        )
        created_rounds.append(sr)

    # Generate attempts for all existing candidates of this session
    candidates = Candidate.objects.filter(session=session, deleted_at__isnull=True)
    for candidate in candidates:
        for sr in created_rounds:
            # Generate unique token
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

    return JsonResponse(success_response({"message": "Rounds saved successfully"}))


@csrf_exempt
@require_api_key
def get_session_rounds(request, session_id):
    """
    GET /api/v1/sessions/<session_id>/rounds
    Gets rounds configured for a session.
    """
    session = Session.objects.filter(id=session_id).first()
    if not session:
        return JsonResponse(error_response("Session not found"), status=404)

    if str(session.company_id) != str(request.company.id):
        return JsonResponse(error_response("Permission denied"), status=403)

    rounds = SessionRound.objects.filter(session=session).order_safe() if hasattr(SessionRound.objects.filter(session=session), "order_safe") else SessionRound.objects.filter(session=session)
    data = []
    for r in rounds:
        data.append({
            "id": str(r.id),
            "round_type": r.round_type,
            "round_number": r.round_number,
            "name": r.name,
            "time_limit_minutes": r.time_limit_minutes,
            "mcq_question_count": r.mcq_question_count,
            "coding_problems": r.coding_problems,
            "interview_questions": r.interview_questions
        })
    return JsonResponse(success_response(data))


@csrf_exempt
@require_api_key
def generate_interview_questions(request, session_id, round_id):
    """
    POST /api/v1/sessions/<session_id>/rounds/<round_id>/generate-questions
    Generates AI interview questions merged with manual questions.
    """
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)

    session = Session.objects.filter(id=session_id).first()
    if not session:
        return JsonResponse(error_response("Session not found"), status=404)

    if str(session.company_id) != str(request.company.id):
        return JsonResponse(error_response("Permission denied"), status=403)

    sr = SessionRound.objects.filter(id=round_id, session=session).first()
    if not sr:
        return JsonResponse(error_response("Round not found"), status=404)

    try:
        data = json.loads(request.body)
        manual_questions = data.get("manual_questions", [])
        total_questions = int(data.get("total_questions", 5))
        candidate_id = data.get("candidate_id")
    except Exception as e:
        return JsonResponse(error_response(f"Invalid JSON: {str(e)}"), status=400)

    # Resolve candidate resume context if candidate_id is provided
    candidate_resume = {}
    if candidate_id:
        candidate = Candidate.objects.filter(id=candidate_id).first()
        if candidate:
            candidate_resume = candidate.raw_resume_data or {}

    agent = InterviewAgent()
    questions = agent.generate_questions(
        job_title=session.job_title,
        job_description=session.job_description,
        candidate_resume=candidate_resume,
        manual_questions=manual_questions,
        total_questions=total_questions
    )

    sr.interview_questions = questions
    sr.save()

    return JsonResponse(success_response(questions))


@csrf_exempt
@require_api_key
def get_applicant_results(request, session_id):
    """
    GET /api/v1/sessions/<session_id>/applicant-results
    Admin side detailed dashboard results for all candidates.
    """
    session = Session.objects.filter(id=session_id).first()
    if not session:
        return JsonResponse(error_response("Session not found"), status=404)

    if str(session.company_id) != str(request.company.id):
        return JsonResponse(error_response("Permission denied"), status=403)

    candidates = Candidate.objects.filter(session=session, deleted_at__isnull=True)
    results = []

    for c in candidates:
        attempts = ApplicantRoundAttempt.objects.filter(candidate=c)
        attempts_data = []
        overall_scores_sum = 0
        valid_scores_count = 0

        for a in attempts:
            scores = {
                "mcq": a.mcq_score,
                "coding": a.coding_score,
                "interview": a.interview_score,
                "proctoring": a.proctoring_score
            }
            primary_score = scores.get(a.round.round_type)

            if primary_score is not None:
                overall_scores_sum += primary_score
                valid_scores_count += 1

            attempts_data.append({
                "round_id": str(a.round.id),
                "round_type": a.round.round_type,
                "round_name": a.round.name,
                "status": a.status,
                "started_at": a.started_at,
                "submitted_at": a.submitted_at,
                "mcq_score": a.mcq_score,
                "mcq_answers": a.mcq_answers,
                "coding_score": a.coding_score,
                "coding_submissions": a.coding_submissions,
                "interview_score": a.interview_score,
                "interview_transcript": a.interview_transcript,
                "interview_summary": a.interview_summary,
                "interview_recommendation": a.interview_recommendation,
                "interview_hiring_likelihood": a.interview_hiring_likelihood,
                "proctoring_flags": a.proctoring_flags,
                "proctoring_score": a.proctoring_score,
                "access_token": a.access_token
            })

        avg_score = round(overall_scores_sum / valid_scores_count, 2) if valid_scores_count > 0 else None

        results.append({
            "candidate_id": str(c.id),
            "name": c.name,
            "email": c.email,
            "phone": c.phone,
            "status": c.status,
            "match_score": c.match_score,
            "recommendation": c.recommendation,
            "attempts": attempts_data,
            "overall_score": avg_score
        })

    return JsonResponse(success_response(results))


@csrf_exempt
@require_api_key
def generate_test_links(request, session_id):
    """
    POST /api/v1/sessions/<session_id>/generate-test-links
    Generates attempts and access tokens for specific candidate(s) if not already created.
    """
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)

    session = Session.objects.filter(id=session_id).first()
    if not session:
        return JsonResponse(error_response("Session not found"), status=404)

    if str(session.company_id) != str(request.company.id):
        return JsonResponse(error_response("Permission denied"), status=403)

    try:
        data = json.loads(request.body)
        candidate_ids = data.get("candidate_ids", [])
    except Exception as e:
        return JsonResponse(error_response(f"Invalid JSON: {str(e)}"), status=400)

    rounds = SessionRound.objects.filter(session=session)
    generated = []

    for cid in candidate_ids:
        candidate = Candidate.objects.filter(id=cid, session=session).first()
        if not candidate:
            continue

        cand_links = []
        for r in rounds:
            token = secrets.token_urlsafe(32)
            attempt, created = ApplicantRoundAttempt.objects.get_or_create(
                candidate=candidate,
                round=r,
                defaults={
                    "access_token": token,
                    "token_expires_at": timezone.now() + timedelta(days=7),
                    "status": "pending"
                }
            )
            cand_links.append({
                "round_name": r.name,
                "round_type": r.round_type,
                "token": attempt.access_token,
                "link": f"/test/entry?token={attempt.access_token}"
            })
        generated.append({
            "candidate_id": str(candidate.id),
            "name": candidate.name,
            "links": cand_links
        })

    return JsonResponse(success_response(generated))


# ─── CANDIDATE SIDE ENDPOINTS ─────────────────────────────────────────────────

@csrf_exempt
def validate_test_token(request):
    """
    POST /api/v1/test/validate-token
    Validates token and returns basic context.
    """
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)

    try:
        data = json.loads(request.body)
        token = data.get("token")
    except Exception as e:
        return JsonResponse(error_response("Invalid JSON"), status=400)

    if not token:
        return JsonResponse(error_response("Token is required"), status=400)

    attempt = ApplicantRoundAttempt.objects.filter(access_token=token).first()
    if not attempt:
        return JsonResponse(error_response("Invalid test access token"), status=401)

    if attempt.token_expires_at < timezone.now():
        return JsonResponse(error_response("This test link has expired"), status=401)

    session = attempt.round.session

    # Fetch next/previous rounds for this candidate to show tab progress
    sibling_attempts = ApplicantRoundAttempt.objects.filter(candidate=attempt.candidate).order_by("round__round_number")
    sibling_rounds = []
    for sa in sibling_attempts:
        sibling_rounds.append({
            "name": sa.round.name,
            "round_type": sa.round.round_type,
            "status": sa.status,
            "token": sa.access_token
        })

    # Fetch JobApplication ID
    app = JobApplication.objects.filter(candidate=attempt.candidate).first()
    application_id = str(app.id) if app else None

    return JsonResponse(success_response({
        "valid": True,
        "round_type": attempt.round.round_type,
        "round_name": attempt.round.name,
        "round_number": attempt.round.round_number,
        "time_limit_minutes": attempt.round.time_limit_minutes,
        "candidate_name": attempt.candidate.name or "Candidate",
        "job_title": session.job_title,
        "company_name": session.company.name,
        "status": attempt.status,
        "sibling_rounds": sibling_rounds,
        "application_id": application_id
    }))


@csrf_exempt
@require_test_token
def get_mcq_questions(request):
    """
    GET /api/v1/test/mcq-questions
    Shuffles and serves MCQ questions.
    """
    attempt = request.attempt
    sr = request.round

    if attempt.status == "pending":
        attempt.status = "in_progress"
        attempt.started_at = timezone.now()
        attempt.save()

    # If served question list doesn't exist, create it
    if not attempt.mcq_questions_served:
        count = sr.mcq_question_count or 10
        # Check if session-specific custom questions exist
        session_id = str(sr.session.id)
        session_questions = list(MCQQuestion.objects.filter(tags__contains=session_id))
        
        if session_questions:
            questions = session_questions
        else:
            # Fallback to general pool questions
            questions = list(MCQQuestion.objects.exclude(tags__contains=session_id))
            if not questions:
                questions = list(MCQQuestion.objects.all())

        import random
        # Seed shuffle if seed is set
        if sr.mcq_shuffle_seed is not None:
            random.seed(sr.mcq_shuffle_seed)
        random.shuffle(questions)
        selected_questions = questions[:count]
        attempt.mcq_questions_served = [str(q.id) for q in selected_questions]
        attempt.save()

    # Return details for all served questions
    served_uuids = attempt.mcq_questions_served
    questions = MCQQuestion.objects.filter(id__in=served_uuids)
    
    # Order them as they were stored in the served list
    questions_map = {str(q.id): q for q in questions}
    ordered_questions = []
    for qid in served_uuids:
        if qid in questions_map:
            q = questions_map[qid]
            ordered_questions.append({
                "id": str(q.id),
                "category": q.category,
                "question_text": q.question_text,
                "options": q.options
            })

    return JsonResponse(success_response(ordered_questions))


@csrf_exempt
@require_test_token
def submit_mcq(request):
    """
    POST /api/v1/test/submit-mcq
    Submits and auto-scores MCQ answers.
    """
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)

    attempt = request.attempt
    try:
        data = json.loads(request.body)
        answers = data.get("answers", {})  # e.g. {"uuid": "A"}
    except Exception as e:
        return JsonResponse(error_response("Invalid JSON"), status=400)

    served_uuids = attempt.mcq_questions_served
    if not served_uuids:
        return JsonResponse(error_response("No questions served yet for this attempt"), status=400)

    questions = MCQQuestion.objects.filter(id__in=served_uuids)
    correct_count = 0
    total_count = len(served_uuids)

    for q in questions:
        submitted_option = answers.get(str(q.id))
        if submitted_option and submitted_option.strip().upper() == q.correct_option.strip().upper():
            correct_count += 1

    score = round((correct_count / total_count) * 100, 2) if total_count > 0 else 0

    attempt.mcq_answers = answers
    attempt.mcq_score = score
    attempt.submitted_at = timezone.now()
    attempt.status = "submitted"
    # Auto evaluate MCQ since it is immediate
    attempt.overall_score = score
    attempt.save()

    # Automatically evaluate candidate pipeline progression
    auto_progress_candidate(attempt.candidate, attempt.round.session, score)

    return JsonResponse(success_response({
        "score": score,
        "correct_count": correct_count,
        "total_count": total_count
    }))


@csrf_exempt
@require_test_token
def get_coding_problems(request):
    """
    GET /api/v1/test/coding-problems
    Gets details of coding problems for this round.
    """
    attempt = request.attempt
    sr = request.round

    if attempt.status == "pending":
        attempt.status = "in_progress"
        attempt.started_at = timezone.now()
        attempt.save()

    slugs = [p.get("slug") for p in sr.coding_problems if p.get("slug")]
    problems = CodingProblem.objects.filter(slug__in=slugs)
    
    data = []
    for p in problems:
        data.append({
            "slug": p.slug,
            "title": p.title,
            "difficulty": p.difficulty,
            "description": p.description,
            "examples": p.examples,
            "constraints": p.constraints,
            "starter_code": p.starter_code
        })

    return JsonResponse(success_response(data))


@csrf_exempt
@require_test_token
def run_code(request):
    """
    POST /api/v1/test/run-code
    Runs code against public test cases or custom input.
    """
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)

    try:
        data = json.loads(request.body)
        code = data.get("code")
        language = data.get("language", "").lower()
        slug = data.get("slug")
        custom_input_raw = data.get("custom_input", None)
    except Exception as e:
        return JsonResponse(error_response("Invalid JSON"), status=400)

    problem = CodingProblem.objects.filter(slug=slug).first()
    if not problem:
        return JsonResponse(error_response("Problem not found"), status=404)

    is_custom_run = False
    if custom_input_raw is not None and custom_input_raw.strip() != "":
        is_custom_run = True
        try:
            parsed_input = json.loads(custom_input_raw)
            if not isinstance(parsed_input, dict):
                parsed_input = {"input": parsed_input}
        except Exception:
            parsed_input = {"input": custom_input_raw}
        
        test_cases = [{
            "input": parsed_input,
            "expected_output": None
        }]
    else:
        test_cases = problem.test_cases

    if not test_cases:
        return JsonResponse(success_response({"all_passed": True, "results": []}))

    run_results = []
    all_passed = True
    user_stdout = ""
    user_stderr = ""
    elapsed_seconds = 0.0
    peak_memory_kb = 0

    try:
        if language == "python":
            import json as py_json
            import re
            import time
            inputs = [tc["input"] for tc in test_cases]
            inputs_json = py_json.dumps(inputs)
            
            func_name = None
            if problem.starter_code and isinstance(problem.starter_code, dict):
                match = re.search(r'def\s+([a-zA-Z0-9_]+)\s*\(', problem.starter_code.get("python", ""))
                if match:
                    func_name = match.group(1)
            
            if func_name:
                call_code = f"{func_name}(**inp)"
            else:
                call_code = PROBLEM_CALL_MAPPING.get(slug, {}).get("python", "None")

            runner_code = f"""
import json
import sys
import tracemalloc

# User submitted code
{code}

inputs = json.loads('''{inputs_json}''')
results = []
tracemalloc.start()

for idx, inp in enumerate(inputs):
    try:
        res = {call_code}
        results.append({{"success": True, "output": res}})
    except Exception as e:
        results.append({{"success": False, "error": str(e)}})

current, peak = tracemalloc.get_traced_memory()
tracemalloc.stop()

print("___TEST_RESULTS___")
print(json.dumps({{"results": results, "peak_memory_bytes": peak}}))
"""
            with tempfile.NamedTemporaryFile(suffix=".py", delete=False, mode="w", encoding="utf-8") as f:
                f.write(runner_code)
                temp_filename = f.name

            try:
                start_time = time.perf_counter()
                proc = subprocess.run(
                    ["python", temp_filename],
                    capture_output=True,
                    text=True,
                    timeout=2.5
                )
                end_time = time.perf_counter()
                elapsed_seconds = end_time - start_time
                stdout = proc.stdout
                stderr = proc.stderr

                if "___TEST_RESULTS___" in stdout:
                    parts = stdout.split("___TEST_RESULTS___")
                    user_stdout = parts[0].strip()
                    payload = py_json.loads(parts[1].strip())
                    outputs = payload.get("results", [])
                    peak_memory_kb = int(payload.get("peak_memory_bytes", 0) / 1024)

                    for idx, out in enumerate(outputs):
                        tc = test_cases[idx]
                        expected = tc.get("expected_output")
                        
                        if out.get("success"):
                            actual = out.get("output")
                            if is_custom_run:
                                run_results.append({
                                    "passed": True,
                                    "input": tc["input"],
                                    "expected": None,
                                    "actual": actual
                                })
                            else:
                                passed = (actual == expected)
                                run_results.append({
                                    "passed": passed,
                                    "input": tc["input"],
                                    "expected": expected,
                                    "actual": actual
                                })
                                if not passed:
                                    all_passed = False
                        else:
                            all_passed = False
                            run_results.append({
                                "passed": False,
                                "input": tc["input"],
                                "expected": expected,
                                "error": out.get("error")
                            })
                else:
                    all_passed = False
                    user_stderr = stderr or stdout or "Execution failed with exit code"
                    run_results.append({
                        "passed": False,
                        "error": user_stderr
                    })
            finally:
                os.remove(temp_filename)

        elif language in ["javascript", "js"]:
            import json as js_json
            import re
            import time
            inputs = [tc["input"] for tc in test_cases]
            inputs_json = js_json.dumps(inputs)
            
            func_name = None
            if problem.starter_code and isinstance(problem.starter_code, dict):
                match = re.search(r'function\s+([a-zA-Z0-9_]+)\s*\(', problem.starter_code.get("javascript", ""))
                if match:
                    func_name = match.group(1)
            
            if func_name:
                call_code = f"{func_name}(...Object.values(inp))"
            else:
                call_code = PROBLEM_CALL_MAPPING.get(slug, {}).get("javascript", "null")

            runner_code = f"""
const fs = require('fs');

# User submitted code
{code}

const inputs = JSON.parse('{inputs_json}');
const results = [];
for (let idx = 0; idx < inputs.length; idx++) {{
    const inp = inputs[idx];
    try {{
        const res = {call_code};
        results.push({{success: true, output: res}});
    }} catch (e) {{
        results.push({{success: false, error: e.message}});
    }}
}}

const peak = process.memoryUsage().rss;
console.log("___TEST_RESULTS___");
console.log(JSON.stringify({{ results: results, peak_memory_bytes: peak }}));
"""
            with tempfile.NamedTemporaryFile(suffix=".js", delete=False, mode="w", encoding="utf-8") as f:
                f.write(runner_code)
                temp_filename = f.name

            try:
                start_time = time.perf_counter()
                proc = subprocess.run(
                    ["node", temp_filename],
                    capture_output=True,
                    text=True,
                    timeout=2.5
                )
                end_time = time.perf_counter()
                elapsed_seconds = end_time - start_time
                stdout = proc.stdout
                stderr = proc.stderr

                if "___TEST_RESULTS___" in stdout:
                    parts = stdout.split("___TEST_RESULTS___")
                    user_stdout = parts[0].strip()
                    payload = js_json.loads(parts[1].strip())
                    outputs = payload.get("results", [])
                    peak_memory_kb = int(payload.get("peak_memory_bytes", 0) / 1024)

                    for idx, out in enumerate(outputs):
                        tc = test_cases[idx]
                        expected = tc.get("expected_output")

                        if out.get("success"):
                            actual = out.get("output")
                            if is_custom_run:
                                run_results.append({
                                    "passed": True,
                                    "input": tc["input"],
                                    "expected": None,
                                    "actual": actual
                                })
                            else:
                                passed = (actual == expected)
                                run_results.append({
                                    "passed": passed,
                                    "input": tc["input"],
                                    "expected": expected,
                                    "actual": actual
                                })
                                if not passed:
                                    all_passed = False
                        else:
                            all_passed = False
                            run_results.append({
                                "passed": False,
                                "input": tc["input"],
                                "expected": expected,
                                "error": out.get("error")
                            })
                else:
                    all_passed = False
                    user_stderr = stderr or stdout or "Execution failed with exit code"
                    run_results.append({
                        "passed": False,
                        "error": user_stderr
                    })
            finally:
                os.remove(temp_filename)
        else:
            return JsonResponse(error_response("Supported execution languages are Python and JavaScript"), status=400)

    except subprocess.TimeoutExpired:
        all_passed = False
        run_results = [{"passed": False, "error": "Execution Timed Out (Limit: 2.5 seconds)"}]
    except Exception as e:
        all_passed = False
        run_results = [{"passed": False, "error": f"Internal Runner Error: {str(e)}"}]

    return JsonResponse(success_response({
        "all_passed": all_passed,
        "results": run_results,
        "user_stdout": user_stdout,
        "user_stderr": user_stderr,
        "execution_time_sec": round(elapsed_seconds, 3),
        "memory_usage_kb": peak_memory_kb
    }))


@csrf_exempt
@require_test_token
def submit_coding(request):
    """
    POST /api/v1/test/submit-coding
    Final submission of coding answers.
    """
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)

    attempt = request.attempt
    try:
        data = json.loads(request.body)
        submissions = data.get("submissions", [])  # [{"slug": "...", "code": "...", "language": "...", "results": [...]}]
    except Exception as e:
        return JsonResponse(error_response("Invalid JSON"), status=400)

    passed_count = 0
    for sub in submissions:
        all_passed = sub.get("all_passed", False)
        if all_passed:
            passed_count += 1

    total_problems = len(submissions)
    score = round((passed_count / total_problems) * 100, 2) if total_problems > 0 else 0

    attempt.coding_submissions = submissions
    attempt.coding_score = score
    attempt.submitted_at = timezone.now()
    attempt.status = "submitted"
    attempt.overall_score = score
    attempt.save()

    # Automatically evaluate candidate pipeline progression
    auto_progress_candidate(attempt.candidate, attempt.round.session, score)

    return JsonResponse(success_response({
        "score": score,
        "passed_count": passed_count,
        "total_problems": total_problems
    }))


@csrf_exempt
@require_test_token
def get_interview_questions(request):
    """
    GET /api/v1/test/interview-questions
    Gets interview questions pre-generated for this candidate/session.
    """
    attempt = request.attempt
    sr = request.round

    if attempt.status == "pending":
        attempt.status = "in_progress"
        attempt.started_at = timezone.now()
        attempt.save()

    # Generate questions dynamically on-demand if not already generated
    if not sr.interview_questions:
        agent = InterviewAgent()
        questions = agent.generate_questions(
            job_title=sr.session.job_title,
            job_description=sr.session.job_description,
            candidate_resume=attempt.candidate.raw_resume_data or {},
            manual_questions=[],
            total_questions=sr.mcq_question_count or 5  # default/suggested questions count
        )
        sr.interview_questions = questions
        sr.save()

    # Return questions list (only question texts and index)
    qs_served = []
    for idx, q in enumerate(sr.interview_questions):
        qs_served.append({
            "index": idx,
            "q": q.get("q")
        })

    return JsonResponse(success_response(qs_served))


@csrf_exempt
@require_test_token
def submit_interview_answer(request):
    """
    POST /api/v1/test/submit-interview-answer
    Submits a single transcribed answer and evaluates it in real-time.
    """
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)

    attempt = request.attempt
    sr = request.round

    try:
        data = json.loads(request.body)
        q_idx = int(data.get("question_index"))
        answer_text = data.get("answer_text", "")
        audio_path = data.get("audio_path", "")
    except Exception as e:
        return JsonResponse(error_response("Invalid JSON"), status=400)

    questions = sr.interview_questions
    if q_idx < 0 or q_idx >= len(questions):
        return JsonResponse(error_response("Invalid question index"), status=400)

    question_obj = questions[q_idx]
    expected_keywords = question_obj.get("expected_keywords", [])

    agent = InterviewAgent()
    eval_res = agent.evaluate_answer(
        question=question_obj.get("q"),
        expected_keywords=expected_keywords,
        answer_text=answer_text,
        job_title=sr.session.job_title
    )

    # Save to candidate attempt transcript
    transcript = attempt.interview_transcript or []
    # Replace if index already answered (e.g. retry) or append
    existing_idx = None
    for i, t in enumerate(transcript):
        if t.get("question_index") == q_idx:
            existing_idx = i
            break

    answer_record = {
        "question_index": q_idx,
        "q": question_obj.get("q"),
        "answer_text": answer_text,
        "audio_path": audio_path,
        "relevance_score": eval_res.get("relevance_score"),
        "depth_score": eval_res.get("depth_score"),
        "accuracy_score": eval_res.get("accuracy_score"),
        "keywords_hit": eval_res.get("keywords_hit", []),
        "keywords_missed": eval_res.get("keywords_missed", []),
        "feedback": eval_res.get("feedback"),
        "asked_at": timezone.now().isoformat(),  # simplified timestamps
        "answered_at": timezone.now().isoformat()
    }

    if existing_idx is not None:
        transcript[existing_idx] = answer_record
    else:
        transcript.append(answer_record)

    attempt.interview_transcript = transcript
    attempt.save()

    return JsonResponse(success_response(eval_res))


@csrf_exempt
@require_test_token
def finalize_interview(request):
    """
    POST /api/v1/test/finalize-interview
    Finalizes the interview, generating overall summary.
    """
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)

    attempt = request.attempt
    sr = request.round

    transcript = attempt.interview_transcript or []
    agent = InterviewAgent()
    summary = agent.generate_interview_summary(
        transcript=transcript,
        job_title=sr.session.job_title,
        candidate_name=attempt.candidate.name or "Candidate"
    )

    attempt.interview_score = summary.get("overall_score", 0)
    attempt.interview_summary = summary.get("detailed_summary", "")
    attempt.interview_recommendation = summary.get("recommendation", "")
    attempt.interview_hiring_likelihood = summary.get("hiring_likelihood", "")
    attempt.submitted_at = timezone.now()
    attempt.status = "submitted"
    attempt.overall_score = summary.get("overall_score", 0)
    attempt.save()

    # Recruiter review decision required: skip auto progression for interview attempts.
    cand = attempt.candidate
    rec = summary.get("recommendation", "").lower()
    score = summary.get("overall_score", 0)
    if score == 0 and ("proceed" in rec or "hire" in rec):
        score = 70.0
    # auto_progress_candidate is skipped here to let recruiter decide manually

    return JsonResponse(success_response(summary))


@csrf_exempt
@require_test_token
def transcribe_audio(request):
    """
    POST /api/v1/test/transcribe-audio
    Transcribes audio using Groq Whisper API.
    """
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)

    audio_file = request.FILES.get("audio")
    if not audio_file:
        return JsonResponse(error_response("No audio file found"), status=400)

    groq_key = os.environ.get("GROQ_API_KEY")
    if not groq_key:
        return JsonResponse(error_response("Groq API key not configured"), status=500)

    try:
        client = OpenAI(
            api_key=groq_key,
            base_url="https://api.groq.com/openai/v1"
        )
        
        # Read the file data
        file_bytes = audio_file.read()
        file_name = audio_file.name or "audio.webm"

        # Call Groq Whisper API
        transcription = client.audio.transcriptions.create(
            file=(file_name, file_bytes, "audio/webm"),
            model="whisper-large-v3-turbo",
            language="en"
        )
        
        return JsonResponse(success_response({"text": transcription.text}))
    except Exception as e:
        logger.error("Audio transcription failed: %s", e)
        return JsonResponse(error_response(f"Transcription failed: {str(e)}"), status=500)


@csrf_exempt
@require_test_token
def save_proctoring_flag(request):
    """
    POST /api/v1/test/proctoring-flag
    Appends proctoring flags in real-time.
    """
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)

    attempt = request.attempt
    try:
        data = json.loads(request.body)
        flag_type = data.get("type")
        screenshot = data.get("screenshot_base64")
    except Exception as e:
        return JsonResponse(error_response("Invalid JSON"), status=400)

    flags = attempt.proctoring_flags or []
    flags.append({
        "type": flag_type,
        "timestamp": timezone.now().isoformat(),
        "screenshot_path": screenshot
    })

    attempt.proctoring_flags = flags

    # Recalculate proctoring score
    # Starts at 100, drops by 10 per violation, min is 0
    score = max(0, 100 - (len(flags) * 10))
    attempt.proctoring_score = score
    attempt.save()

    return JsonResponse(success_response({"proctoring_score": score, "flags_count": len(flags)}))


@csrf_exempt
@require_api_key
def upload_question_paper(request):
    """
    POST /api/v1/sessions/upload-question-paper
    Accepts multipart/form-data with 'file' (PDF/DOCX/TXT).
    Extracts MCQ questions or Coding problems using LLM and seeds them.
    """
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)

    try:
        uploaded_file = request.FILES.get("file")
        if not uploaded_file:
            return JsonResponse(error_response("No file uploaded"), status=400)

        filename = uploaded_file.name
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        if ext not in ["pdf", "docx", "doc", "txt"]:
            return JsonResponse(error_response("Only PDF, DOCX, and TXT files are supported"), status=400)

        file_bytes = uploaded_file.read()
        session_id = request.POST.get("session_id", None)
        category = request.POST.get("category", "general")
        round_type = request.POST.get("round_type", "mcq")

        from agents.mcq_paper_parser_agent import MCQPaperParserAgent
        agent = MCQPaperParserAgent()

        if round_type == "coding":
            problems = agent.extract_and_parse_coding(file_bytes, filename)
            if not problems:
                return JsonResponse(success_response({
                    "message": "No coding problems could be extracted from this file.",
                    "questions_extracted": 0,
                    "created_in_db": 0,
                    "slugs": [],
                    "preview": []
                }))
            result = agent.save_coding_to_db(problems, session_id)
            return JsonResponse(success_response({
                "message": f"Successfully extracted {len(problems)} coding problems",
                "questions_extracted": len(problems),
                "created_in_db": result["created"],
                "already_existed": result["skipped"],
                "slugs": result["slugs"],
                "preview": problems[:5]
            }))
        else:
            questions = agent.extract_and_parse(file_bytes, filename, category)
            if not questions:
                return JsonResponse(success_response({
                    "message": "No MCQ questions could be extracted from this file.",
                    "questions_extracted": 0,
                    "created_in_db": 0,
                    "preview": []
                }))
            result = agent.save_to_db(questions, session_id)
            return JsonResponse(success_response({
                "message": f"Successfully extracted {len(questions)} MCQ questions",
                "questions_extracted": len(questions),
                "created_in_db": result["created"],
                "already_existed": result["skipped"],
                "preview": questions[:5]
            }))
    except ValueError as ve:
        return JsonResponse(error_response(str(ve)), status=400)
    except Exception as e:
        logger.error("upload_question_paper error: %s", e)
        return JsonResponse(error_response(f"Failed to process file: {str(e)}"), status=500)


@csrf_exempt
@require_test_token
def mock_submit(request):
    """
    POST /api/v1/test/mock-submit
    Mock submit for testing purposes.
    """
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)

    attempt = request.attempt
    try:
        data = json.loads(request.body)
        score = float(data.get("score", 85.0))
    except Exception:
        score = 85.0

    attempt.status = "submitted"
    attempt.overall_score = score
    
    if attempt.round.round_type == "mcq":
        attempt.mcq_score = score
    elif attempt.round.round_type == "coding":
        attempt.coding_score = score
    elif attempt.round.round_type == "interview":
        attempt.interview_score = score
        attempt.interview_recommendation = "Proceed" if score >= 50.0 else "Reject"
        attempt.interview_summary = "Mock interview submission for testing."

    attempt.submitted_at = timezone.now()
    attempt.save()

    # Run pipeline evaluation
    auto_progress_candidate(attempt.candidate, attempt.round.session, score)

    return JsonResponse(success_response({"message": "Mock submission successful", "score": score}))


@csrf_exempt
def mock_switch_round(request):
    """
    POST /api/v1/test/mock-switch-round
    Forces a candidate to a specific round index for testing.
    """
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)

    try:
        data = json.loads(request.body)
        candidate_id = data.get("candidate_id")
        target_round_number = int(data.get("round_number", 1))
    except Exception as e:
        return JsonResponse(error_response("Invalid JSON or parameters"), status=400)

    from api.models import Candidate, SessionRound, ApplicantRoundAttempt
    from django.utils import timezone
    from datetime import timedelta
    import secrets

    candidate = Candidate.objects.filter(id=candidate_id).first()
    if not candidate:
        return JsonResponse(error_response("Candidate not found"), status=404)

    # Force round index and reset status
    candidate.current_round_index = target_round_number
    candidate.status = "forwarded"  # Reset status so they are active in pipeline
    candidate.save(update_fields=['current_round_index', 'status'])

    # Find the corresponding SessionRound
    sr = SessionRound.objects.filter(session=candidate.session, round_number=target_round_number).first()
    if sr:
        # Reset or create attempt for this round
        attempt, created = ApplicantRoundAttempt.objects.get_or_create(
            candidate=candidate,
            round=sr,
            defaults={
                "access_token": secrets.token_urlsafe(32),
                "token_expires_at": timezone.now() + timedelta(days=7),
                "status": "pending"
            }
        )
        # If it already existed, reset its status to pending so it can be retaken from scratch
        if not created:
            attempt.status = "pending"
            attempt.mcq_score = None
            attempt.coding_score = None
            attempt.interview_score = None
            attempt.overall_score = None
            attempt.submitted_at = None
            attempt.started_at = None
            attempt.save()

    return JsonResponse(success_response({"message": f"Successfully forced candidate to round {target_round_number}"}))


def execute_problem_code(problem, code, language, custom_input_raw=None):
    is_custom_run = False
    if custom_input_raw is not None and custom_input_raw.strip() != "":
        is_custom_run = True
        try:
            parsed_input = json.loads(custom_input_raw)
            if not isinstance(parsed_input, dict):
                parsed_input = {"input": parsed_input}
        except Exception:
            parsed_input = {"input": custom_input_raw}
        
        test_cases = [{
            "input": parsed_input,
            "expected_output": None
        }]
    else:
        test_cases = problem.test_cases

    if not test_cases:
        return True, [], "", "", 0.0, 0

    run_results = []
    all_passed = True
    user_stdout = ""
    user_stderr = ""
    elapsed_seconds = 0.0
    peak_memory_kb = 0

    try:
        if language == "python":
            import json as py_json
            import re
            import time
            import tempfile
            import subprocess
            import os
            inputs = [tc["input"] for tc in test_cases]
            inputs_json = py_json.dumps(inputs)
            
            func_name = None
            if problem.starter_code and isinstance(problem.starter_code, dict):
                match = re.search(r'def\s+([a-zA-Z0-9_]+)\s*\(', problem.starter_code.get("python", ""))
                if match:
                    func_name = match.group(1)
            
            if func_name:
                call_code = f"{func_name}(**inp)"
            else:
                call_code = PROBLEM_CALL_MAPPING.get(problem.slug, {}).get("python", "None")

            runner_code = f"""
import json
import sys
import tracemalloc

# User submitted code
{code}

inputs = json.loads('''{inputs_json}''')
results = []
tracemalloc.start()

for idx, inp in enumerate(inputs):
    try:
        res = {call_code}
        results.append({{"success": True, "output": res}})
    except Exception as e:
        results.append({{"success": False, "error": str(e)}})

current, peak = tracemalloc.get_traced_memory()
tracemalloc.stop()

print("___TEST_RESULTS___")
print(json.dumps({{"results": results, "peak_memory_bytes": peak}}))
"""
            with tempfile.NamedTemporaryFile(suffix=".py", delete=False, mode="w", encoding="utf-8") as f:
                f.write(runner_code)
                temp_filename = f.name

            try:
                start_time = time.perf_counter()
                proc = subprocess.run(
                    ["python", temp_filename],
                    capture_output=True,
                    text=True,
                    timeout=2.5
                )
                end_time = time.perf_counter()
                elapsed_seconds = end_time - start_time
                stdout = proc.stdout
                stderr = proc.stderr

                if "___TEST_RESULTS___" in stdout:
                    parts = stdout.split("___TEST_RESULTS___")
                    user_stdout = parts[0].strip()
                    payload = py_json.loads(parts[1].strip())
                    outputs = payload.get("results", [])
                    peak_memory_kb = int(payload.get("peak_memory_bytes", 0) / 1024)

                    for idx, out in enumerate(outputs):
                        tc = test_cases[idx]
                        expected = tc.get("expected_output")
                        
                        if out.get("success"):
                            actual = out.get("output")
                            if is_custom_run:
                                run_results.append({
                                    "passed": True,
                                    "input": tc["input"],
                                    "expected": None,
                                    "actual": actual
                                })
                            else:
                                passed = (actual == expected)
                                run_results.append({
                                    "passed": passed,
                                    "input": tc["input"],
                                    "expected": expected,
                                    "actual": actual
                                })
                                if not passed:
                                    all_passed = False
                        else:
                            all_passed = False
                            run_results.append({
                                "passed": False,
                                "input": tc["input"],
                                "expected": expected,
                                "error": out.get("error")
                            })
                else:
                    all_passed = False
                    user_stderr = stderr or stdout or "Execution failed with exit code"
                    run_results.append({
                        "passed": False,
                        "error": user_stderr
                    })
            finally:
                os.remove(temp_filename)

        elif language in ["javascript", "js"]:
            import json as js_json
            import re
            import time
            import tempfile
            import subprocess
            import os
            inputs = [tc["input"] for tc in test_cases]
            inputs_json = js_json.dumps(inputs)
            
            func_name = None
            if problem.starter_code and isinstance(problem.starter_code, dict):
                match = re.search(r'function\s+([a-zA-Z0-9_]+)\s*\(', problem.starter_code.get("javascript", ""))
                if match:
                    func_name = match.group(1)
            
            if func_name:
                call_code = f"{func_name}(...Object.values(inp))"
            else:
                call_code = PROBLEM_CALL_MAPPING.get(problem.slug, {}).get("javascript", "null")

            runner_code = f"""
const fs = require('fs');

# User submitted code
{code}

const inputs = JSON.parse('{inputs_json}');
const results = [];
for (let idx = 0; idx < inputs.length; idx++) {{
    const inp = inputs[idx];
    try {{
        const res = {call_code};
        results.push({{success: true, output: res}});
    }} catch (e) {{
        results.push({{success: false, error: e.message}});
    }}
}}

console.log("___TEST_RESULTS___");
console.log(JSON.stringify({{results: results, peak_memory_bytes: 0}}));
"""
            with tempfile.NamedTemporaryFile(suffix=".js", delete=False, mode="w", encoding="utf-8") as f:
                f.write(runner_code)
                temp_filename = f.name

            try:
                start_time = time.perf_counter()
                proc = subprocess.run(
                    ["node", temp_filename],
                    capture_output=True,
                    text=True,
                    timeout=2.5
                )
                end_time = time.perf_counter()
                elapsed_seconds = end_time - start_time
                stdout = proc.stdout
                stderr = proc.stderr

                if "___TEST_RESULTS___" in stdout:
                    parts = stdout.split("___TEST_RESULTS___")
                    user_stdout = parts[0].strip()
                    payload = js_json.loads(parts[1].strip())
                    outputs = payload.get("results", [])
                    peak_memory_kb = int(payload.get("peak_memory_bytes", 0) / 1024)

                    for idx, out in enumerate(outputs):
                        tc = test_cases[idx]
                        expected = tc.get("expected_output")

                        if out.get("success"):
                            actual = out.get("output")
                            if is_custom_run:
                                run_results.append({
                                    "passed": True,
                                    "input": tc["input"],
                                    "expected": None,
                                    "actual": actual
                                })
                            else:
                                passed = (actual == expected)
                                run_results.append({
                                    "passed": passed,
                                    "input": tc["input"],
                                    "expected": expected,
                                    "actual": actual
                                })
                                if not passed:
                                    all_passed = False
                        else:
                            all_passed = False
                            run_results.append({
                                "passed": False,
                                "input": tc["input"],
                                "expected": expected,
                                "error": out.get("error")
                            })
                else:
                    all_passed = False
                    user_stderr = stderr or stdout or "Execution failed with exit code"
                    run_results.append({
                        "passed": False,
                        "error": user_stderr
                    })
            finally:
                os.remove(temp_filename)
        else:
            raise ValueError("Supported execution languages are Python and JavaScript")

    except subprocess.TimeoutExpired:
        all_passed = False
        run_results = [{"passed": False, "error": "Execution Timed Out (Limit: 2.5 seconds)"}]
    except Exception as e:
        all_passed = False
        run_results = [{"passed": False, "error": f"Internal Runner Error: {str(e)}"}]

    return all_passed, run_results, user_stdout, user_stderr, elapsed_seconds, peak_memory_kb


def create_mock_attempt(request):
    """
    POST /api/v1/seeker/mock-interview/create
    Body: { "attempt_type": "aptitude" | "coding" | "interview" }
    """
    from api.views.seeker_auth import require_seeker_jwt
    @require_seeker_jwt
    def _inner(request):
        if request.method != "POST":
            return JsonResponse(error_response("Method not allowed"), status=405)
            
        try:
            data = json.loads(request.body)
            attempt_type = data.get("attempt_type")
        except Exception:
            return JsonResponse(error_response("Invalid JSON"), status=400)
            
        if attempt_type not in ["aptitude", "coding", "interview"]:
            return JsonResponse(error_response("Invalid attempt type"), status=400)
            
        seeker = request.seeker
        
        questions = []
        if attempt_type == "aptitude":
            # Get random MCQ questions (limit 5)
            from api.models import MCQQuestion
            mcqs = MCQQuestion.objects.all().order_by("?")[:5]
            questions = [{
                "id": str(q.id),
                "question_text": q.question_text,
                "options": q.options,
                "category": q.category,
                "correct_option": q.correct_option
            } for q in mcqs]
            if not questions:
                questions = [
                    {
                        "id": 1,
                        "question_text": "What is the time complexity of searching in a balanced Binary Search Tree?",
                        "options": ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
                        "correct_option": 1,
                        "category": "Aptitude"
                    }
                ]
                
        elif attempt_type == "coding":
            # Get random Coding Problems (limit 2)
            from api.models import CodingProblem
            problems = CodingProblem.objects.all().order_by("?")[:2]
            questions = [{
                "slug": p.slug,
                "title": p.title,
                "difficulty": p.difficulty,
                "description": p.description,
                "examples": p.examples,
                "constraints": p.constraints,
                "starter_code": p.starter_code
            } for p in problems]
            
        elif attempt_type == "interview":
            # Check active resume
            if not seeker.resume_data:
                return JsonResponse(error_response("Please upload your resume before starting the AI Interview mock."), status=400)
                
            try:
                agent = InterviewAgent()
                ai_questions = agent.generate_questions(
                    job_title="Software Engineer (Mock Practice)",
                    job_description="Standard software engineering mock interview questions covering data structures, algorithms, system design, and soft skills.",
                    candidate_resume=seeker.resume_data,
                    manual_questions=[],
                    total_questions=5
                )
                questions = [{
                    "q": q.get("q"),
                    "type": q.get("type"),
                    "source": q.get("source"),
                    "expected_keywords": q.get("expected_keywords", [])
                } for q in ai_questions]
            except Exception as e:
                logger.error("Failed to generate mock interview questions: %s", e)
                questions = [
                    {
                        "q": "Walk me through your most complex project and the biggest technical challenge you faced.",
                        "type": "project_general",
                        "source": "fallback",
                        "expected_keywords": []
                    },
                    {
                        "q": "How do you handle conflict or differing opinions within a software development team?",
                        "type": "behavioral",
                        "source": "fallback",
                        "expected_keywords": []
                    }
                ]
                
        from api.models import SeekerMockAttempt
        attempt = SeekerMockAttempt.objects.create(
            seeker=seeker,
            attempt_type=attempt_type,
            status="in_progress",
            questions=questions
        )
        
        return JsonResponse(success_response({
            "attempt_id": str(attempt.id),
            "attempt_type": attempt.attempt_type,
            "questions": attempt.questions,
            "status": attempt.status
        }))
    return _inner(request)


@csrf_exempt
def list_mock_attempts(request):
    """
    GET /api/v1/seeker/mock-interview/list
    """
    from api.views.seeker_auth import require_seeker_jwt
    @require_seeker_jwt
    def _inner(request):
        if request.method != "GET":
            return JsonResponse(error_response("Method not allowed"), status=405)
            
        seeker = request.seeker
        from api.models import SeekerMockAttempt
        attempts = SeekerMockAttempt.objects.filter(seeker=seeker).order_by("-created_at")
        
        data = [{
            "attempt_id": str(a.id),
            "attempt_type": a.attempt_type,
            "status": a.status,
            "score": a.score,
            "created_at": a.created_at.isoformat(),
            "submitted_at": a.submitted_at.isoformat() if a.submitted_at else None
        } for a in attempts]
        
        return JsonResponse(success_response({"attempts": data}))
    return _inner(request)


@csrf_exempt
def get_mock_attempt(request, attempt_id):
    """
    GET /api/v1/seeker/mock-interview/<attempt_id>
    """
    from api.views.seeker_auth import require_seeker_jwt
    @require_seeker_jwt
    def _inner(request):
        if request.method != "GET":
            return JsonResponse(error_response("Method not allowed"), status=405)
            
        seeker = request.seeker
        from api.models import SeekerMockAttempt
        attempt = SeekerMockAttempt.objects.filter(id=attempt_id, seeker=seeker).first()
        if not attempt:
            return JsonResponse(error_response("Mock attempt not found"), status=404)
            
        return JsonResponse(success_response({
            "attempt_id": str(attempt.id),
            "attempt_type": attempt.attempt_type,
            "status": attempt.status,
            "score": attempt.score,
            "questions": attempt.questions,
            "answers": attempt.answers,
            "feedback": attempt.feedback,
            "created_at": attempt.created_at.isoformat(),
            "submitted_at": attempt.submitted_at.isoformat() if attempt.submitted_at else None
        }))
    return _inner(request)


@csrf_exempt
def submit_mock_attempt(request, attempt_id):
    """
    POST /api/v1/seeker/mock-interview/<attempt_id>/submit
    """
    from api.views.seeker_auth import require_seeker_jwt
    @require_seeker_jwt
    def _inner(request):
        if request.method != "POST":
            return JsonResponse(error_response("Method not allowed"), status=405)
            
        seeker = request.seeker
        from api.models import SeekerMockAttempt
        attempt = SeekerMockAttempt.objects.filter(id=attempt_id, seeker=seeker).first()
        if not attempt:
            return JsonResponse(error_response("Mock attempt not found"), status=404)
            
        try:
            data = json.loads(request.body)
            answers = data.get("answers", {})
            transcript = data.get("transcript", [])
        except Exception:
            return JsonResponse(error_response("Invalid JSON"), status=400)
            
        attempt.answers = answers
        
        # Calculate score based on type
        score = 0.0
        feedback = {}
        
        if attempt.attempt_type == "aptitude":
            correct_count = 0
            total_count = len(attempt.questions)
            for i, q in enumerate(attempt.questions):
                ans = answers.get(str(i))
                correct_opt = q.get("correct_option")
                
                is_correct = False
                if ans is not None:
                    ans_str = str(ans).strip().upper()
                    correct_str = str(correct_opt).strip().upper()
                    if ans_str == correct_str:
                        correct_count += 1
                        is_correct = True
                    else:
                        try:
                            if int(ans) == int(correct_opt):
                                correct_count += 1
                                is_correct = True
                        except (ValueError, TypeError):
                            pass
                feedback[str(i)] = {
                    "correct": is_correct,
                    "correct_option": correct_opt,
                    "selected_option": ans
                }
            score = round((correct_count / total_count * 100) if total_count > 0 else 0.0, 2)
            attempt.score = score
            attempt.feedback = {
                "correct_count": correct_count,
                "total_count": total_count,
                "question_feedback": feedback
            }
            
        elif attempt.attempt_type == "coding":
            passed_count = 0
            total_count = len(attempt.questions)
            for i, q in enumerate(attempt.questions):
                slug = q.get("slug")
                sub_res = answers.get(slug, {})
                all_passed = sub_res.get("all_passed", False)
                if all_passed:
                    passed_count += 1
                    
                feedback[slug] = {
                    "all_passed": all_passed,
                    "results": sub_res.get("results", [])
                }
                
            score = round((passed_count / total_count * 100) if total_count > 0 else 0.0, 2)
            attempt.score = score
            attempt.feedback = {
                "passed_count": passed_count,
                "total_count": total_count,
                "problem_feedback": feedback
            }
            
        elif attempt.attempt_type == "interview":
            try:
                agent = InterviewAgent()
                summary = agent.generate_interview_summary(
                    transcript=transcript,
                    job_title="Software Engineer (Mock Practice)",
                    candidate_name=seeker.full_name or "Candidate"
                )
                score = summary.get("overall_score", 0.0)
                attempt.score = score
                attempt.feedback = summary
                attempt.answers = {"transcript": transcript}
            except Exception as e:
                logger.error("Failed to generate mock interview summary: %s", e)
                attempt.score = 50.0
                attempt.feedback = {
                    "overall_score": 50.0,
                    "strengths": ["Completed mock practice session."],
                    "weaknesses": [],
                    "recommendation": "Mock evaluation fallback.",
                    "detailed_summary": "Interview completed."
                }
                
        attempt.status = "submitted"
        attempt.submitted_at = timezone.now()
        attempt.save()
        
        return JsonResponse(success_response({
            "attempt_id": str(attempt.id),
            "status": attempt.status,
            "score": attempt.score,
            "feedback": attempt.feedback
        }))
    return _inner(request)


@csrf_exempt
def seeker_transcribe_audio(request):
    """
    POST /api/v1/seeker/mock-interview/transcribe-audio
    Transcribes audio using Groq Whisper API for seeker mock interviews.
    """
    from api.views.seeker_auth import require_seeker_jwt
    @require_seeker_jwt
    def _inner(request):
        if request.method != "POST":
            return JsonResponse(error_response("Method not allowed"), status=405)

        audio_file = request.FILES.get("audio")
        if not audio_file:
            return JsonResponse(error_response("No audio file found"), status=400)

        groq_key = os.environ.get("GROQ_API_KEY")
        if not groq_key:
            return JsonResponse(error_response("Groq API key not configured"), status=500)

        try:
            import io
            client = OpenAI(
                api_key=groq_key,
                base_url="https://api.groq.com/openai/v1"
            )
            file_bytes = audio_file.read()
            file_name = audio_file.name or "audio.webm"
            transcription = client.audio.transcriptions.create(
                file=(file_name, io.BytesIO(file_bytes)),
                model="whisper-large-v3",
                response_format="text"
            )
            return JsonResponse(success_response({"text": transcription}))
        except Exception as e:
            logger.error("Audio transcription failed: %s", e)
            return JsonResponse(error_response("Audio transcription failed. Please check network connectivity."), status=500)
    return _inner(request)


@csrf_exempt
def seeker_run_code(request):
    """
    POST /api/v1/seeker/mock-interview/run-code
    Runs seeker practice code against testcases.
    """
    from api.views.seeker_auth import require_seeker_jwt
    @require_seeker_jwt
    def _inner(request):
        if request.method != "POST":
            return JsonResponse(error_response("Method not allowed"), status=405)

        try:
            data = json.loads(request.body)
            code = data.get("code")
            language = data.get("language", "python").lower()
            slug = data.get("slug")
            custom_input_raw = data.get("custom_input", None)
        except Exception:
            return JsonResponse(error_response("Invalid JSON"), status=400)

        from api.models import CodingProblem
        problem = CodingProblem.objects.filter(slug=slug).first()
        if not problem:
            return JsonResponse(error_response("Problem not found"), status=404)

        try:
            all_passed, run_results, user_stdout, user_stderr, elapsed_seconds, peak_memory_kb = execute_problem_code(
                problem, code, language, custom_input_raw
            )
        except ValueError as ve:
            return JsonResponse(error_response(str(ve)), status=400)

        return JsonResponse(success_response({
            "all_passed": all_passed,
            "results": run_results,
            "user_stdout": user_stdout,
            "user_stderr": user_stderr,
            "execution_time_sec": round(elapsed_seconds, 3),
            "memory_usage_kb": peak_memory_kb
        }))
    return _inner(request)