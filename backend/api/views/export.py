import pandas as pd
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt

from api.models import Session, Candidate
from api.decorators import require_api_key
from models.schemas import error_response

@csrf_exempt
@require_api_key
def export_candidates(request, session_id):
    if request.method != "GET":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        status = request.GET.get("status", "all")
        
        query = Candidate.objects.filter(session_id=session_id)
        if status != "all":
            query = query.filter(status=status)

        candidates = list(query)

        rows = []
        for c in candidates:
            match_details = c.match_details or {}
            norm_skills = c.normalized_skills or []
            parsed = c.raw_resume_data or {}
            parsed_data = parsed.get("parsed", {}) if isinstance(parsed, dict) else {}

            matched = ", ".join(match_details.get("matched_skills", []))
            missing = ", ".join(match_details.get("missing_skills", []))
            skills_str = ", ".join([(s.get("canonical_skill") or str(s)) if isinstance(s, dict) else str(s) for s in norm_skills]) if norm_skills else ""

            education_list = parsed_data.get("education", [])
            edu_str = ", ".join([
                f"{e.get('degree', '')} - {e.get('institution', '')}"
                for e in education_list
            ]) if education_list else ""

            cert_list = parsed_data.get("certifications", [])
            cert_str = ", ".join([
                e.get("name", "") for e in cert_list
            ]) if cert_list else ""

            rounds = c.current_round_index or 0

            rows.append({
                "Name": c.name,
                "Email": c.email,
                "Phone": c.phone,
                "Location": c.location,
                "Match Score(%)": c.match_score,
                "Recommendation": c.recommendation,
                "Matched Skills": matched,
                "Missing Skills": missing,
                "Experience(years)": c.total_experience_years,
                "Education": edu_str,
                "Certifications": cert_str,
                "Status": c.status,
                "Round Reached": rounds
            })

        df = pd.DataFrame(rows)
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="candidates_{session_id[:8]}.csv"'
        df.to_csv(path_or_buf=response, index=False)
        return response
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)

@csrf_exempt
@require_api_key
def export_report(request, session_id):
    if request.method != "GET":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        session = Session.objects.filter(id=session_id).first()
        if not session:
            return JsonResponse(error_response("Session not found"), status=404)

        candidates = list(Candidate.objects.filter(session_id=session_id))

        lines = []

        # Section 1: Session summary
        lines.append("=== SESSION SUMMARY ===")
        lines.append(f"Session,{session.name}")
        lines.append(f"Job Title,{session.job_title}")
        lines.append(f"Total Candidates,{len(candidates)}")

        status_counts = {}
        for c in candidates:
            status_counts[c.status] = status_counts.get(c.status, 0) + 1
        for st, cnt in status_counts.items():
            lines.append(f"{st},{cnt}")

        avg_score = 0
        scored = [c for c in candidates if c.match_score is not None]
        if scored:
            avg_score = sum(c.match_score for c in scored) / len(scored)
        lines.append(f"Average Match Score,{round(avg_score, 1)}")
        lines.append("")

        # Section 2: Per-round breakdown
        lines.append("=== PER-ROUND BREAKDOWN ===")
        lines.append("Round,Candidates")
        round_counts = {}
        for c in candidates:
            ri = c.current_round_index or 0
            round_counts[ri] = round_counts.get(ri, 0) + 1
        for ri in sorted(round_counts.keys()):
            round_name = f"Round {ri}"
            rounds_data = session.rounds or []
            if ri < len(rounds_data):
                round_name = rounds_data[ri].get("name", round_name)
            lines.append(f"{round_name},{round_counts[ri]}")
        lines.append("")

        # Section 3: Top 10 candidates
        lines.append("=== TOP 10 CANDIDATES ===")
        lines.append("Name,Email,Match Score,Recommendation,Experience(yrs),Status")
        top10 = sorted(candidates, key=lambda c: c.match_score or 0, reverse=True)[:10]
        for c in top10:
            lines.append(
                f"{c.name},{c.email},{c.match_score},{c.recommendation},"
                f"{c.total_experience_years},{c.status}"
            )

        content = "\n".join(lines)
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="report_{session_id[:8]}.csv"'
        response.write(content)
        return response
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)
